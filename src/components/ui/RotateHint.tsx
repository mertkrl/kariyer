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
 * The desk, the computer and the meeting are laid out for a landscape screen. On a phone held
 * upright this covers them and asks to turn it; CSS decides when (portrait and narrow), so the
 * hint goes away by itself as soon as the phone is turned. It can be waved off for the session.
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
