import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/fonts.css';
import '../../styles/global.css';
import { EXAM_QUESTIONS } from './data/questions';
import { QuestionWidget } from './widgets/QuestionWidgets';
import styles from './TestGame.module.css';
import ex from './Exam.module.css';

/*
 * Geliştirme aracı, oyunun parçası değil: UyumMetre'nin bütün sorularını sınav kartıyla alt alta
 * çizer; telefon genişliğinde her etkileşimli türü tek tek denemek için. Yalnızca geliştirme
 * sunucusunda `scripts/test-gallery/index.html` adresinde açılır. `?t=swipe` gibi bir türe süzer.
 */

const only = new URLSearchParams(window.location.search).get('t');
const list = EXAM_QUESTIONS.filter((q) => !only || (only === 'plain' ? !q.widget : q.widget?.type === only));

export function Card({ i }: { i: number }) {
  const q = list[i];
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <section className={ex.question} style={{ marginBottom: 16 }} id={q.id}>
      <div className={ex.qHead}>
        <span className={ex.qMeta}>
          {q.id} · {q.widget?.type ?? 'düz'}
        </span>
        <span className={ex.qKind}>{q.kind}</span>
      </div>
      <h2 className={ex.prompt}>{q.prompt}</h2>
      {q.figure && <p className={`${ex.figure} mono`}>{q.figure}</p>}
      <QuestionWidget q={q} selected={picked} onAnswer={setPicked} />
      <p className={ex.hint}>Cevap: {picked === null ? '—' : `${picked} · ${q.options[picked]}${picked === q.answer ? ' (anahtar)' : picked === q.sensible ? ' (sağduyu)' : ''}`}</p>
    </section>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className={styles.app}>
      <main className={styles.page}>
        <p className={styles.eyebrow}>
          {list.length} soru{only ? ` · ${only}` : ''}
        </p>
        {list.map((q, i) => (
          <Card key={q.id} i={i} />
        ))}
      </main>
    </div>
  </StrictMode>,
);
