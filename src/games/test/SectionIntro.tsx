import { useEffect, useRef, useState } from 'react';
import type { SectionBriefing } from './data/briefings';
import { QuestionWidget } from './widgets/QuestionWidgets';
import styles from './TestGame.module.css';
import si from './SectionIntro.module.css';

/*
 * Bölüm girişi, iki adım: önce tanıtım (amaç, yönerge, soru sayısı, süre), sonra puanlanmayan
 * bir örnek soru ve açıklaması. Her şey ciddi; şaka bölümün asıl sorularıyla başlar.
 */
export function SectionIntro({ no, of, title, questions, seconds, brief, onStart }: { no: number; of: number; title: string; questions: number; seconds: number; brief: SectionBriefing; onStart: () => void }) {
  const [step, setStep] = useState<'about' | 'practice'>('about');
  const [picked, setPicked] = useState<number | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), [step]);
  const p = brief.practice;
  const right = p.answer === null || picked === p.answer;

  return (
    <main className={styles.page}>
      <ol className={si.steps} aria-label="Bölümler">
        {Array.from({ length: of }, (_, i) => (
          <li key={i} className={i < no - 1 ? si.stepDone : i === no - 1 ? si.stepNow : undefined}>
            {i < no - 1 ? '✓' : i + 1}
          </li>
        ))}
      </ol>
      <section className={styles.card}>
        <p className={styles.eyebrow}>
          Bölüm {no} / {of} · {step === 'about' ? 'Tanıtım' : 'Örnek soru'}
        </p>
        <h1 ref={heading} tabIndex={-1} className={styles.h1}>
          {step === 'about' ? title : 'Örnek soru'}
        </h1>

        {step === 'about' ? (
          <>
            <p className={styles.lead}>{brief.purpose}</p>
            <div className={si.facts}>
              <span>
                <b>{questions}</b> soru
              </span>
              <span>
                <b>{Math.round(seconds / 60)}</b> dakika
              </span>
              <span>
                <b>1</b> örnek soru
              </span>
            </div>
            <ul className={si.rules}>
              {brief.rules.map((r) => (
                <li key={r}>{r}</li>
              ))}
              <li>Süre, örnek sorudan sonra “Bölüme başla” dediğinizde başlar. İlerideki sorulara atlanamaz; bölüm içinde geçtiğiniz sorulara dönebilirsiniz, biten bölümlere dönemezsiniz.</li>
            </ul>
            <div className={si.end}>
              <button className={`${styles.primary} ${styles.big}`} onClick={() => setStep('practice')}>
                Örnek soruya geç →
              </button>
            </div>
          </>
        ) : (
          <>
            <p className={si.note}>Bu soru puanlanmaz. Soru tipini tanımanız için hazırlanmıştır.</p>
            <h2 className={si.prompt}>{p.prompt}</h2>
            {p.figure && <p className={`${si.figure} mono`}>{p.figure}</p>}
            <QuestionWidget q={{ id: `practice-${brief.id}`, kind: 'sözel', prompt: p.prompt, options: p.options, answer: p.answer ?? 0, sensible: 0, why: '' }} selected={picked} onAnswer={setPicked} />
            {picked !== null && (
              <p className={`${si.feedback} ${right ? si.ok : si.bad}`} role="status">
                <b>{p.answer === null ? 'Teşekkürler.' : right ? 'Doğru.' : `Doğru cevap: ${'ABCD'[p.answer]}.`}</b> {p.explain}
              </p>
            )}
            <div className={si.row}>
              <span className={si.hint}>{picked === null ? 'Devam etmek için bir şık işaretleyin.' : 'Hazır olduğunuzda bölüm başlayacak.'}</span>
              <button className={`${styles.primary} ${styles.big}`} disabled={picked === null} onClick={onStart}>
                Bölüme başla →
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
