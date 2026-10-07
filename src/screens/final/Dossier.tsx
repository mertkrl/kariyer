import type { Candidate } from '../../game/types';
import type { CandidateDetails } from '../../game/data/candidateDetails';
import { followUpVerdict } from '../../game/data/interviewExtras';
import { caseVerdict } from '../../game/events/interview';
import { LEAD, leadView } from './interviewModel';
import { APTITUDE_CUTOFF } from '../../game/events/aptitude';
import styles from './Dossier.module.css';

/*
 * Odadaki kişinin dosyası, konuşmanın yanında: bilgiler, anlaşılan maaş ve ekip liderinin duyduklarından çıkardığı.
 */
export interface DossierProps {
  candidate: Candidate;
  details: CandidateDetails;
  selectedId: string;
  /** Onu mülakata çağırdığın gün (0: senin çağırdıklarından değil). */
  invitedOn: number;
  agreed: Record<string, number | null>;
  leadHeard: boolean;
  fit: number;
  /** Genel Yetenek ve Uyum Değerlendirmesi puanı. */
  testScore: number;
  followUsed: boolean;
  caseAsked: boolean;
}

export function Dossier({ candidate, details, selectedId, invitedOn, agreed, leadHeard, fit, testScore, followUsed, caseAsked }: DossierProps) {
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
          <dt>Test puanı</dt>
          <dd className={testScore < APTITUDE_CUTOFF ? styles.below : undefined}>
            {testScore} · eşik {APTITUDE_CUTOFF}
          </dd>
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
        <h3>{LEAD}'ın notu</h3>
        {leadHeard ? (
          <div className={styles.leadNote} role="status">
            <p>"{leadView(selectedId, fit)}"</p>
            {followUsed && <p>"{followUpVerdict(selectedId, fit)}"</p>}
            {caseAsked && <p>"{caseVerdict(selectedId)}"</p>}
          </div>
        ) : (
          <p className={styles.leadEmpty}>Teknik bölümden sonra ekip liderinin görüşü burada görünür.</p>
        )}
      </aside>
  );
}
