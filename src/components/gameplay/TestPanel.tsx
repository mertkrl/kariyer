import { APTITUDE_QUESTIONS } from '../../game/data/aptitudeTest';
import { APTITUDE_CUTOFF, aptitudeNote, type AptitudeResult } from '../../game/events/aptitude';
import styles from './TestPanel.module.css';

/**
 * Perşembe CV'nin üstündeki test şeridi: tek satır. Puan, eşiğe göre yeri (70'te çizgi) ve cevap
 * dağılımı; ayrıntısı Değerlendirme uygulamasında. CV'yi aşağı itmesin diye kısa tutulur.
 */
export function TestPanel({ id, result }: { id: string; result: AptitudeResult }) {
  const below = result.score < APTITUDE_CUTOFF;
  const wrong = APTITUDE_QUESTIONS.length - result.correct - result.timedOut;
  const note = aptitudeNote(id);
  return (
    <section className={`${styles.strip} ${below ? styles.below : ''}`} aria-label="Genel Yetenek ve Uyum Değerlendirmesi">
      <span className={styles.label}>Genel Yetenek ve Uyum</span>
      <b className={`${styles.score} mono`}>{result.score}</b>
      <span className={styles.scale} aria-hidden="true">
        <i className={styles.fill} style={{ width: `${result.score}%` }} />
        <i className={styles.cut} style={{ left: `${APTITUDE_CUTOFF}%` }} />
      </span>
      <span className={styles.pill}>{below ? `eşik ${APTITUDE_CUTOFF} altı` : `eşik ${APTITUDE_CUTOFF} geçti`}</span>
      <span className={`${styles.counts} mono`}>
        {result.correct}✓ · {wrong}✗ · {result.timedOut} boş
      </span>
      {note && (
        <span className={styles.flag} title={note} aria-label={note}>
          ⚑
        </span>
      )}
    </section>
  );
}
