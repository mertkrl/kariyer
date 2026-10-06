import type { Candidate } from '../../game/types';
import type { CandidateDetails } from '../../game/data/candidateDetails';
import { followUpVerdict } from '../../game/data/interviewExtras';
import { caseVerdict, DEFENSE_THRESHOLD, evidenceStrength } from '../../game/interview';
import { NotesList, type Note } from './InterviewParts';
import { LEAD, leadView } from './interviewModel';
import styles from '../FinalRoundScreen.module.css';

/*
 * Odadaki kişinin dosyası, konuşmanın yanında: bilgiler, anlaşılan maaş, onun hakkındaki
 * notların ve ekip liderinin duyduklarından çıkardığı.
 */
export interface DossierProps {
  candidate: Candidate;
  details: CandidateDetails;
  selectedId: string;
  /** Onu mülakata çağırdığın gün (0: senin çağırdıklarından değil). */
  invitedOn: number;
  agreed: Record<string, number | null>;
  notes: Note[];
  onRemoveNote: (text: string) => void;
  leadHeard: boolean;
  fit: number;
  followUsed: boolean;
  caseAsked: boolean;
  forbiddenAsked: boolean;
  hakanChoice: 'protect' | 'silent' | null;
}

export function Dossier({ candidate, details, selectedId, invitedOn, agreed, notes, onRemoveNote, leadHeard, fit, followUsed, caseAsked, forbiddenAsked, hakanChoice }: DossierProps) {
  return (
      <aside className={styles.dossier} aria-label="Aday dosyası">
        <h3>Dosya</h3>
        <dl className={styles.facts}>
          <dt>Deneyim</dt>
          <dd>{candidate.experience}</dd>
          <dt>Maaş beklentisi</dt>
          <dd>{candidate.salary}</dd>
          {selectedId in agreed && (
            <>
              <dt>Anlaşılan</dt>
              <dd>{agreed[selectedId] === null ? 'Anlaşılamadı' : `${agreed[selectedId]?.toLocaleString('tr-TR')} TL`}</dd>
            </>
          )}
          <dt>Son görev</dt>
          <dd>{details.workHistory[0].title}</dd>
          <dt>Konum</dt>
          <dd>{details.location}</dd>
          <dt>Dil</dt>
          <dd>{details.languages}</dd>
          {invitedOn > 0 && (
            <>
              <dt>Mülakata çağrılma</dt>
              <dd>{invitedOn}. gün</dd>
            </>
          )}
        </dl>
        <h3>Öne çıkanlar</h3>
        <ul className={styles.highlights}>
          {details.highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
        <h3>Notlarım</h3>
        <EvidenceMeter strength={evidenceStrength(notes.map((n) => n.tag))} />
        <NotesList notes={notes} onRemove={onRemoveNote} />
        <h3>{LEAD}'ın notu</h3>
        {leadHeard ? (
          <div className={styles.leadNote} role="status">
            <p>"{leadView(selectedId, fit)}"</p>
            {followUsed && <p>"{followUpVerdict(selectedId, fit)}"</p>}
            {caseAsked && <p>"{caseVerdict(selectedId)}"</p>}
            {forbiddenAsked && <small>Sonra alçak sesle: "O soruyu sormasaydın keşke."</small>}
            {hakanChoice === 'protect' && <small>Sonra alçak sesle: "Araya girmen iyiydi."</small>}
            {hakanChoice === 'silent' && <small>Sonra alçak sesle: "Hakan Bey o soruyu sorunca bir şey demedin."</small>}
          </div>
        ) : (
          <p className={styles.leadEmpty}>İlk cevaptan sonra ekip liderinin görüşü burada görünür.</p>
        )}
      </aside>
  );
}

/**
 * Bu kişi hakkındaki notlarının kurulun önünde ne kadar taşıyacağı. Kural, hâlâ işe
 * yarayabileceği yerde: somut +2, genel +1, belirsiz 0, dikkat −1; en iyi üçü sayılır.
 */
function EvidenceMeter({ strength }: { strength: number }) {
  const enough = strength >= DEFENSE_THRESHOLD;
  const pct = Math.max(0, Math.min(1, strength / DEFENSE_THRESHOLD)) * 100;
  return (
    <div className={`${styles.meter} ${enough ? styles.meterOk : ''}`}>
      <div className={styles.meterHead}>
        <span>Kurulda kanıt gücü</span>
        <b className="mono">
          {Math.max(0, strength)}/{DEFENSE_THRESHOLD}
          {enough ? ' ✓' : ''}
        </b>
      </div>
      <div className={styles.meterTrack} role="meter" aria-label="Kurulda kanıt gücü" aria-valuemin={0} aria-valuemax={DEFENSE_THRESHOLD} aria-valuenow={Math.max(0, strength)}>
        <i style={{ width: `${pct}%` }} />
      </div>
      <small>Önerini kurulda notlarınla savunursun: somut +2 · genel +1 · belirsiz 0 · dikkat −1 (en iyi üçü sayılır).</small>
    </div>
  );
}
