import { useState } from 'react';
import type { Decision } from '../../game/types';
import { SALARY_CAP, useGameStore, type Finalist } from '../../game/store/store';
import { candidateOf } from '../../game/data/candidates';
import { INTERVIEWER, panelRows, panelVerdict } from '../../game/events/panel';
import { Button } from '../../components/ui/Button';
import { LEAD } from './interviewModel';
import styles from '../FinalRoundScreen.module.css';
import own from './HireModal.module.css';
import { avatarStyle } from '../../components/ui/avatarStyle';

/*
 * Gün sonu kurulu: Hakan Bey, Ümit ve sen. Her adayın üç puanı yan yana durur (görüşmeyi yapanın,
 * Ümit'in teknik puanı, Hakan Bey'in uyum puanı); toplamı en yüksek ve bütçeye sığan aday işe
 * alınır. Kimin nasıl puanladığı tabloda görünür: Hakan Bey'in sütunu da.
 */
export interface HireModalProps {
  pool: Finalist[];
  pastRequests: { candidateId: string; want: Decision }[];
  /** Senin görüştüğün adaylara puan kartından verdiğin ortalama. */
  myScores: Record<string, number | null>;
  /** Başkalarının görüşmelerinde odadaydın: verdiğin puanlar. */
  sitIn: Record<string, number | null>;
  /** Yapılandırılmış mülakat: Hakan Bey'in uyum sütunu yok. */
  structured: boolean;
  /** Rahatlatılmadığı için vakada takılan heyecanlı adaylar. */
  rattled?: ReadonlySet<string>;
  agreed: Record<string, number | null>;
  onClose: () => void;
  /** Kurulun kararını imzala: işe alınan ve senin en yüksek puan verdiğin aday. */
  onConfirm: (decided: string, recommended: string) => void;
}

/** Bir puan: iyi, orta ya da düşük diye renklenir. */
function Score({ n }: { n: number | null }) {
  if (n === null) return <span className={own.muted}>—</span>;
  return <span className={`${own.score} mono ${n >= 4 ? own.scoreHigh : n <= 2 ? own.scoreLow : ''}`}>{fmt(n)}</span>;
}

const fmt = (n: number | null) => (n === null ? '—' : n.toLocaleString('tr-TR', { maximumFractionDigits: 1, minimumFractionDigits: 1 }));

/** Piyasada bu seviyedeki bir geliştiricinin alt sınırı: altında isteyene bunu önerebilirsin. */
const FAIR_PAY = 38_000;

export function HireModal({ pool, pastRequests, myScores, sitIn, structured, agreed, rattled = new Set(), onClose, onConfirm }: HireModalProps) {
  const closeHiring = useGameStore((s) => s.closeHiring);
  const [step, setStep] = useState<'table' | 'close'>('table');
  const [fair, setFair] = useState<boolean | null>(null);
  const [personal, setPersonal] = useState<boolean | null>(null);
  const rows = panelRows(pool, pastRequests, myScores, agreed, structured, sitIn, rattled).sort((a, b) => b.total - a.total);
  const decided = panelVerdict(rows);
  const winner = candidateOf(decided);
  // senin önerin: kendi görüştüklerin arasında en yüksek puanı verdiğin (yoksa kurulun kararı)
  const mine = rows.filter((r) => r.owner === 'you' && r.interviewer !== null).sort((a, b) => (b.interviewer ?? 0) - (a.interviewer ?? 0));
  const recommended = mine[0]?.id ?? decided;
  const yourPickLost = mine.length > 0 && recommended !== decided;
  const winnerPay = rows.find((r) => r.id === decided)?.pay ?? null;
  const needsOffer = winnerPay !== null && winnerPay < FAIR_PAY;
  return (
    <div className={own.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="panel-title">
      <div className={`${own.modal} ${own.modalWide}`}>
        <h2 id="panel-title">Kurul · gün sonu değerlendirmesi</h2>
        <p className={own.panelBudget}>
          Her adayın puanları: seninki, {LEAD.split(' ')[0]}'in puanı, Hakan Bey'in uyum puanı ve adayı getirenin puanı. Ortalaması en yüksek ve bütçeye ({SALARY_CAP.toLocaleString('tr-TR')} TL/ay) sığan aday işe alınır.
        </p>
        <div className={own.compare}>
          <table>
            <thead>
              <tr>
                <th>Aday</th>
                <th>Getiren</th>
                <th className={own.num}>Getiren</th>
                <th className={own.num}>{LEAD.split(' ')[0]}</th>
                <th className={own.num}>Hakan Bey</th>
                <th className={own.num}>Sen</th>
                <th>Ortalama</th>
                <th className={own.num}>Maaş</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={r.id === decided ? own.rowWinner : !r.affordable ? own.rowOut : undefined}>
                  <td>
                    <span className={own.who}>
                      <span className={styles.avatar} style={avatarStyle(candidateOf(r.id).color)}>
                        {candidateOf(r.id).initials}
                      </span>
                      <span>
                        {candidateOf(r.id).name}
                        {r.id === decided && <small className={own.winnerTag}>Kurul kararı</small>}
                      </span>
                    </span>
                  </td>
                  <td className={own.muted}>{r.owner === 'you' ? 'Sen' : INTERVIEWER[r.owner].name.split(' ')[0]}</td>
                  <td className={own.num}>{r.owner === 'you' ? <span className={own.muted}>—</span> : <Score n={r.interviewer} />}</td>
                  <td className={own.num}>
                    <Score n={r.tech} />
                    {rattled.has(r.id) && <span title="Heyecandan Ümit'in sorusunda takıldı"> ⚡</span>}
                  </td>
                  <td className={own.num}>{r.owner === 'hakan' ? <span className={own.muted}>getiren</span> : <Score n={r.hakan} />}</td>
                  <td className={own.num}>
                    <Score n={r.owner === 'you' ? r.interviewer : r.you} />
                  </td>
                  <td>
                    <span className={own.total}>
                      <span className={own.totalBar}>
                        <i style={{ width: `${(r.total / 5) * 100}%` }} />
                      </span>
                      <b className="mono">{fmt(r.total)}</b>
                    </span>
                  </td>
                  <td className={`${own.num} mono`}>
                    {r.pay === null ? '—' : r.pay.toLocaleString('tr-TR')}
                    {!r.affordable && <small className={own.overBudget}>bütçe dışı</small>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {step === 'table' ? (
          <>
            {rattled.size > 0 && <p className={own.compareGap}>⚡ Rahatlatılmayan heyecanlı adaylar Ümit'in sorusunda takıldı; Ümit puanlarını birer kırdı.</p>}
            <div className={own.panelVotes}>
              <p className={own.panelResult}>
                Kurul kararı: <b>{winner.name}</b>
                {yourPickLost && ` · senin en yüksek puan verdiğin ${candidateOf(recommended).name.split(' ')[0]} toplamda geride kaldı.`}
              </p>
            </div>
            <div className={own.modalActions}>
              <Button variant="ghost" onClick={onClose}>
                Görüşmelere dön
              </Button>
              <Button variant="gold" sound="click" onClick={() => setStep('close')}>
                Teklif ve kapanış →
              </Button>
            </div>
          </>
        ) : (
          <>
            <h3 className={own.closeTitle}>Teklif · {winner.name}</h3>
            {winnerPay !== null && winnerPay < FAIR_PAY ? (
              <div className={own.closeOptions}>
                <button className={`${own.closeOption} ${fair === false ? own.closeOn : ''}`} onClick={() => setFair(false)}>
                  <b>Beklentisini teklif et · {winnerPay.toLocaleString('tr-TR')} TL</b>
                  <span>Bütçeye en uygunu. Kendisi bu rakamı istedi.</span>
                </button>
                <button className={`${own.closeOption} ${fair === true ? own.closeOn : ''}`} onClick={() => setFair(true)}>
                  <b>Piyasa değerini teklif et · {FAIR_PAY.toLocaleString('tr-TR')} TL</b>
                  <span>Bu işin karşılığı bu. Hakan Bey bütçeye bakıp kaşlarını çatar.</span>
                </button>
              </div>
            ) : (
              <p className={own.closeNote}>Anlaşılan rakam: {winnerPay === null ? '—' : `${winnerPay.toLocaleString('tr-TR')} TL`}. Pazarlık görüşmede yapıldı.</p>
            )}
            <h3 className={own.closeTitle}>Elenen {rows.length - 1} aday</h3>
            <div className={own.closeOptions}>
              <button className={`${own.closeOption} ${personal === false ? own.closeOn : ''}`} onClick={() => setPersonal(false)}>
                <b>Standart ret e-postası</b>
                <span>"Değerlendirme sürecimiz sonucunda başka bir adayla ilerlemeye karar verdik."</span>
              </button>
              <button className={`${own.closeOption} ${personal === true ? own.closeOn : ''}`} onClick={() => setPersonal(true)}>
                <b>Her birine kısa, kişisel bir not</b>
                <span>Görüşmede neyi güçlü bulduğunu tek cümleyle yaz. Akşamın yarım saati gider.</span>
              </button>
            </div>
            <p>Diğer adaylar için süreç burada biter. Bu karar geri alınamaz.</p>
            <div className={own.modalActions}>
              <Button variant="ghost" onClick={() => setStep('table')}>
                ← Tabloya dön
              </Button>
              <Button
                variant="gold"
                sound="none"
                disabled={personal === null || (needsOffer && fair === null)}
                onClick={() => {
                  closeHiring(Boolean(fair), Boolean(personal));
                  onConfirm(decided, recommended);
                }}
              >
                Kurul kararını imzala
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
