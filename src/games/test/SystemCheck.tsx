import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../components/ui/motion';
import base from './TestGame.module.css';
import styles from './SystemCheck.module.css';

/*
 * Sınav öncesi "sistem kontrolü": adımlar sırayla döner ve her biri kurumsal bir sonuç verir.
 * Hiçbir şey gerçekten açılmaz ya da ölçülmez; kamera kutusu yalnızca bir çizimdir. Adımlar hızlı
 * döner (toplam iki saniyeyi biraz geçer), oyuncu beklemekten sıkılmasın.
 */

const STEPS: { label: string; result: string; warn?: boolean }[] = [
  { label: 'Kamera bağlanıyor…', result: 'Bağlandı (sanırız)' },
  { label: 'Ortam ışığı ölçülüyor…', result: 'Yetersiz. Motivasyonunuzla telafi ediniz.', warn: true },
  { label: 'Yüz ifadesi analiz ediliyor…', result: 'Yüzünüz %73 profesyonel.' },
  { label: 'Mikrofon test ediliyor…', result: 'Sessizliğiniz kaydedildi.' },
  { label: 'Arka plan taranıyor…', result: 'Bir bitki tespit edildi. Bitki aday değildir.' },
  { label: 'Sekme kilidi etkinleştiriliyor…', result: 'Etkin. Kaçış yok.' },
];

const STEP_MS = 380;

export function SystemCheck({ onReady }: { onReady: () => void }) {
  const fast = prefersReducedMotion();
  const [done, setDone] = useState(fast ? STEPS.length : 0);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (done >= STEPS.length) {
      button.current?.focus();
      return;
    }
    const id = window.setTimeout(() => setDone((n) => n + 1), STEP_MS);
    return () => window.clearTimeout(id);
  }, [done]);
  const ready = done >= STEPS.length;

  return (
    <main className={base.page}>
      <section className={`${base.card} ${styles.check}`}>
        <div className={styles.cam} aria-hidden="true">
          <span className={styles.rec}>● REC</span>
          <span className={styles.frame} />
          <span className={styles.camNote}>Görüntü önizlemesi temsilîdir</span>
        </div>
        <div>
          <p className={base.eyebrow}>Sistem kontrolü</p>
          <h1 className={styles.title}>Sınav ortamınız hazırlanıyor</h1>
          <ol className={styles.steps} aria-live="polite">
            {STEPS.map((s, i) => {
              const state = i < done ? 'done' : i === done ? 'now' : 'wait';
              return (
                <li key={s.label} className={styles[state]}>
                  <span className={styles.icon} aria-hidden="true">
                    {state === 'done' ? (s.warn ? '!' : '✓') : state === 'now' ? '' : '·'}
                  </span>
                  <span>
                    {s.label.replace('…', '')}
                    {/* sonuç satırının yeri baştan ayrılır: kart adım adım uzamaz */}
                    <small className={`${s.warn ? styles.warnText : ''} ${state === 'done' ? '' : styles.pending}`} aria-hidden={state !== 'done'}>
                      {s.result}
                    </small>
                  </span>
                </li>
              );
            })}
          </ol>
          <button ref={button} className={base.primary} disabled={!ready} onClick={onReady}>
            {ready ? 'Sınava başla' : 'Kontrol ediliyor…'}
          </button>
        </div>
      </section>
    </main>
  );
}
