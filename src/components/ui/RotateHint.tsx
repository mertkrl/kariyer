import { useState } from 'react';
import styles from './RotateHint.module.css';

const DISMISSED_KEY = 'kariyerweb-rotate-dismissed';

function readDismissed() {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Masa, bilgisayar ve toplantı yatay ekran için yerleştirilmiştir. Dik tutulan bir telefonda bu
 * onların üstünü kaplar ve çevrilmesini ister; ne zaman olacağına CSS karar verir (dikey ve dar),
 * böylece ipucu telefon çevrilir çevrilmez kendiliğinden kaybolur. Oturum boyunca geçilebilir.
 */
export function RotateHint() {
  const [dismissed, setDismissed] = useState(readDismissed);
  if (dismissed) return null;
  return (
    <div className={styles.hint} role="dialog" aria-modal="true" aria-labelledby="rotate-title">
      <div className={styles.phone} aria-hidden="true" />
      <h2 id="rotate-title">Telefonunu yan çevir</h2>
      <p>Masan, bilgisayarın ve toplantı odası yatay ekran için tasarlandı. Yan çevirince oyun kaldığı yerden sürer.</p>
      <button
        className={styles.dismiss}
        onClick={() => {
          try {
            sessionStorage.setItem(DISMISSED_KEY, '1');
          } catch {
            // the hint just comes back next time
          }
          setDismissed(true);
        }}
      >
        Yine de dik devam et
      </button>
    </div>
  );
}
