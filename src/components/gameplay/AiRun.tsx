import { useEffect, useState } from 'react';
import type { Candidate } from '../../game/types';
import { AD_KEYWORDS, aiScore, atsReport } from '../../game/ats';
import styles from './AiRun.module.css';
import { prefersReducedMotion } from '../ui/motion';

/*
 * Yapay zekâ işte ve sonucu, yapay zekâ kutusunun içinde. Çalışırken bir eleme sisteminin gerçekte
 * geçtiği adımlar (ayrıştır, çıkar, eşleştir, puanla, sırala) bir ilerleme çubuğu ve akan bir
 * günlükle tek tek işaretlenir; bitince 100 üzerinden bir puan bir kadranda sayarak yükselir.
 * Adımlar CV üzerindeki taramayla aynı süreye göre zamanlanır.
 */

/** Her adımın başladığı an, çalışmanın payı olarak. */
const STEP_AT = [0, 0.2, 0.42, 0.64, 0.84];

function stepsFor(c: Candidate, applications: number) {
  const ats = atsReport(c, applications);
  const pct = Math.round((ats.matched.length / AD_KEYWORDS.length) * 100);
  return [
    { label: 'Belge ayrıştırılıyor', log: `parse  ${ats.parsed}/8 alan · ${ats.parseNote}` },
    { label: 'Alanlar çıkarılıyor', log: `ner    deneyim="${c.experience}" · unvan="${ats.title}"` },
    { label: 'Anahtar kelime eşleşmesi', log: `match  ${ats.matched.length}/${AD_KEYWORDS.length} · ATS %${pct}` },
    { label: 'Model puanlaması', log: 'score  tavsiye-modeli v3.2 · 41 özellik' },
    { label: 'Sıralama', log: `rank   #${ats.rank} / ${ats.of}` },
  ];
}

export function AnalysisRun({ candidate, applications, durationMs }: { candidate: Candidate; applications: number; durationMs: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const id = window.setInterval(() => setElapsed(Math.min(1, (performance.now() - start) / durationMs)), 80);
    return () => window.clearInterval(id);
  }, [durationMs]);

  const steps = stepsFor(candidate, applications);
  const current = STEP_AT.reduce((at, t, i) => (elapsed >= t ? i : at), 0);

  return (
    <div className={styles.run} aria-live="polite">
      <div className={styles.progressHead}>
        <span>{steps[current].label}…</span>
        <span className="mono">%{Math.round(elapsed * 100)}</span>
      </div>
      <div className={styles.track}>
        <i style={{ width: `${elapsed * 100}%` }} />
      </div>
      <ol className={styles.steps}>
        {steps.map((s, i) => (
          <li key={s.label} className={i < current ? styles.done : i === current ? styles.active : styles.waiting}>
            <span className={styles.mark} aria-hidden="true" />
            {s.label}
          </li>
        ))}
      </ol>
      <pre className={`${styles.log} mono`} aria-hidden="true">
        {steps
          .slice(0, current + 1)
          .slice(-3)
          .map((s) => `› ${s.log}`)
          .join('\n')}
        <span className={styles.caret} />
      </pre>
    </div>
  );
}

const VERDICT_NAME: Record<Candidate['verdict'], string> = {
  priority: 'Öncelikli',
  review: 'Ek inceleme',
  low: 'Düşük öncelik',
  out: 'Değerlendirme dışı',
};

/** Sonuç: kadranda puan, karar ve tam rapora giden yol. */
export function ScoreDial({ candidate, reportOpen, onToggleReport }: { candidate: Candidate; reportOpen: boolean; onToggleReport: () => void }) {
  const score = aiScore(candidate);
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? score : 0));
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 900);
      setShown(Math.round(score * (1 - (1 - t) ** 3)));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const tone = score >= 75 ? styles.high : score >= 50 ? styles.mid : styles.low;
  const R = 21;
  const C = 2 * Math.PI * R;
  return (
    <div className={`${styles.result} ${tone}`}>
      <svg className={styles.dial} viewBox="0 0 52 52" role="img" aria-label={`Uygunluk puanı ${score} / 100`}>
        <circle className={styles.dialTrack} cx="26" cy="26" r={R} />
        <circle className={styles.dialValue} cx="26" cy="26" r={R} strokeDasharray={C} strokeDashoffset={C * (1 - shown / 100)} />
        <text x="26" y="29.5" textAnchor="middle" className={styles.dialText}>
          {shown}
        </text>
      </svg>
      <div className={styles.resultText}>
        <span className={styles.resultLabel}>Uygunluk puanı · 100 üzerinden</span>
        <b>{VERDICT_NAME[candidate.verdict]}</b>
        <button type="button" className={styles.reportButton} onClick={onToggleReport} aria-expanded={reportOpen}>
          {reportOpen ? 'Raporu kapat' : 'Raporu aç →'}
        </button>
      </div>
    </div>
  );
}
