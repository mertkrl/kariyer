import { useState } from 'react';
import type { Candidate } from '../../game/types';
import type { Decision } from '../../game/types';
import { SALARY_CAP, panelDecision, type Finalist } from '../../game/store';
import { NEPHEW_ID, candidateOf } from '../../game/data/candidates';
import { hakanTarget } from '../../game/data/interviewExtras';
import { average, defenseHolds, DEFENSE_THRESHOLD, scoreGap, type Scores } from '../../game/interview';
import { accusative } from '../../game/turkish';
import { Button } from '../../components/ui/Button';
import { audioEngine } from '../../audio/audioEngine';
import { EvidencePicker, type Note } from './InterviewParts';
import { LEAD, leadBacks } from './interviewModel';
import styles from '../FinalRoundScreen.module.css';
import { avatarStyle } from '../../components/ui/avatarStyle';

/*
 * Recommending someone: the room side by side, how the panel votes, and — when it would hire
 * someone else — your case to the team lead, made from the notes you took. Which notes you put
 * forward and how that went belong to this one sitting, so they live here.
 */
export interface HireModalProps {
  candidate: Candidate;
  pool: Finalist[];
  scores: Record<string, Scores>;
  agreed: Record<string, number | null>;
  notes: Record<string, Note[]>;
  pastRequests: { candidateId: string; want: Decision }[];
  fit: number;
  onClose: () => void;
  /** Sign the panel's decision; `convinced`: you argued the team lead round. */
  onConfirm: (convinced: boolean) => void;
}

export function HireModal({ candidate, pool, scores, agreed, notes, pastRequests, fit, onClose, onConfirm }: HireModalProps) {
  const selectedId = candidate.id;
  const poolIds = pool.map((f) => f.id);
  const [evidence, setEvidence] = useState<string[]>([]);
  const [defense, setDefense] = useState<{ id: string; holds: boolean; score: number } | null>(null);
  const convinced = defense?.id === selectedId && defense.holds;
  return (
      <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="confirm-hire">
        <div className={styles.modal}>
          <span className={`${styles.avatar} ${styles.avatarLarge}`} style={avatarStyle(candidate.color)}>
            {candidate.initials}
          </span>
          <h2 id="confirm-hire">Önerin: {candidate.name}</h2>
          <Comparison
            pool={poolIds}
            scores={scores}
            agreed={agreed}
            notes={notes}
            gap={scoreGap(scores, (id) => hakanTarget(id, candidateOf(id).age))}
          />
          {(() => {
            // you recommend; the panel votes — Levent can be argued round, with your notes
            const convinced = defense?.id === selectedId && defense.holds;
            const panel = panelDecision(selectedId, pool, pastRequests, { agreed, convinced });
            // only worth arguing when the panel would otherwise hire someone else
            const contested = panel.hired !== selectedId && panel.lead !== selectedId && !panel.overBudget && !convinced;
            const first = (id: string) => candidateOf(id).name.split(' ')[0];
            return (
              <div className={styles.panelVotes}>
                <p>
                  <b>{LEAD}:</b>{' '}
                  {panel.lead === selectedId
                    ? leadBacks(selectedId, fit)
                      ? '"Katılıyorum. Ekibe iyi gelir."'
                      : '"Aralarında en iyisi bu, katılıyorum."'
                    : panel.overBudget
                      ? `"${first(selectedId)} bütçeyi aşıyor. Tavanın içinde en iyisi ${first(panel.lead)}."`
                      : `"Ben ${accusative(first(panel.lead))} tercih ederim. Cevapları daha somuttu."`}
                </p>
                <p>
                  <b>Hakan Bey:</b>{' '}
                  {panel.his === selectedId
                    ? '"Bütçe onaylı. İmzalıyorum."'
                    : panel.his === NEPHEW_ID
                      ? '"Ben Okan\'dan yanayım. Uzun vadeli uyum önemli."'
                      : `"Ben ${accusative(first(panel.his))} daha uygun buluyorum."`}
                </p>
                <p className={styles.panelBudget}>Bütçe tavanı: {SALARY_CAP.toLocaleString('tr-TR')} TL/ay · üç oy ayrı düşerse karar ekip liderinin.</p>
                {(contested || defense?.id === selectedId) && (
                  <div className={styles.defense}>
                    <p className={styles.defenseTitle}>Önerini savun: {LEAD}'a notlarından en fazla üç kanıt göster.</p>
                    {defense?.id === selectedId ? (
                      <p className={defense.holds ? styles.defenseWon : styles.defenseLost}>
                        {defense.holds
                          ? `${LEAD}: "Haklısın, bunları ben de duydum. Fikrimi değiştiriyorum."`
                          : `${LEAD}: "Bunlar beni ikna etmedi. Somut bir şey göremiyorum."`}
                      </p>
                    ) : (
                      <>
                        <EvidencePicker
                          notes={notes[selectedId] ?? []}
                          picked={evidence}
                          onToggle={(t) => setEvidence((p) => (p.includes(t) ? p.filter((x) => x !== t) : p.length < 3 ? [...p, t] : p))}
                        />
                        <Button
                          variant="ghost"
                          disabled={evidence.length === 0}
                          onClick={() => {
                            const picked = (notes[selectedId] ?? []).filter((n) => evidence.includes(n.text)).map((n) => n.tag);
                            const mineAvg = average(scores[selectedId]);
                            const top = mineAvg !== null && poolIds.every((id) => id === selectedId || (average(scores[id]) ?? 0) <= mineAvg);
                            const result = defenseHolds(selectedId, picked, top);
                            audioEngine.playUi(result.holds ? 'confirm' : 'click');
                            setDefense({ id: selectedId, ...result });
                          }}
                        >
                          Kurula sun
                        </Button>
                        <small className={styles.defenseHint}>Somut notlar ağır basar, belirsiz olanlar sayılmaz; puan kartında en yüksek puanı ona verdiysen o da kanıttır (eşik {DEFENSE_THRESHOLD}).</small>
                      </>
                    )}
                  </div>
                )}
                <p className={styles.panelResult}>
                  Kurul kararı: <b>{candidateOf(panel.hired).name}</b>
                  {panel.hired !== selectedId && ' — önerin kabul edilmedi.'}
                </p>
              </div>
            );
          })()}
          <p>Diğer adaylar için süreç burada biter. Bu karar geri alınamaz.</p>
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={onClose}>
              Vazgeç
            </Button>
            <Button variant="gold" sound="none" onClick={() => onConfirm(convinced)}>
              Kurul Kararını Onayla
            </Button>
          </div>
        </div>
      </div>
  );
}

/** The room side by side before you recommend: your scores, the pay agreed, how much you noted. */
function Comparison({ pool, scores, agreed, notes, gap }: { pool: string[]; scores: Record<string, Scores>; agreed: Record<string, number | null>; notes: Record<string, Note[]>; gap: number | null }) {
  const rows = pool.map((id) => ({ id, avg: average(scores[id]), pay: agreed[id], noted: notes[id]?.length ?? 0 })).sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));
  return (
    <div className={styles.compare}>
      <table>
        <thead>
          <tr>
            <th>Aday</th>
            <th>Puan kartın</th>
            <th>Maaş</th>
            <th>Not</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{candidateOf(r.id).name}</td>
              <td className="mono">{r.avg === null ? '—' : r.avg.toFixed(1)}</td>
              <td className="mono">{r.pay === undefined ? '—' : r.pay === null ? 'anlaşılamadı' : r.pay.toLocaleString('tr-TR')}</td>
              <td className="mono">{r.noted}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {gap !== null && (
        <p className={styles.compareGap}>
          ⚠ Hakan Bey'in listesindeki soruların hedeflediği adaylara (kadınlar, 40 yaş üstü) verdiğin puanların ortalaması diğerlerinden {gap.toLocaleString('tr-TR')} puan düşük.
        </p>
      )}
    </div>
  );
}
