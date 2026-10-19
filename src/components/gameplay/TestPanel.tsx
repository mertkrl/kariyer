import { APTITUDE_CUTOFF, aptitudeNote, type AptitudeResult } from '../../game/events/aptitude';
import styles from './TestPanel.module.css';

/**
 * Perşembe CV'nin üstündeki test şeridi: yalnızca puan. Rengi eşiğe göre, ince göstergede 70'te bir çentik.
 */
export function TestPanel({ id, result }: { id: string; result: AptitudeResult }) {
  const below = result.score < APTITUDE_CUTOFF;
  const note = aptitudeNote(id);
  return (
    <section className={`${styles.strip} ${below ? styles.below : ''}`} aria-label={`Genel Yetenek ve Uyum puanı ${result.score}, eşik ${APTITUDE_CUTOFF}`}>
      <span className={styles.label}>Genel Yetenek ve Uyum</span>
      <span className={styles.gauge} aria-hidden="true">
        <i className={styles.fill} style={{ width: `${result.score}%` }} />
        <i className={styles.cut} style={{ left: `${APTITUDE_CUTOFF}%` }} />
      </span>
      <b className={`${styles.score} mono`}>
        {result.score}
        <small>/100</small>
      </b>
      {note && (
        <span className={styles.flag} title={note} aria-label={note}>
          ⚑
        </span>
      )}
    </section>
  );
}
