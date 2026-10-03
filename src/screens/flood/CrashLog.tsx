import { useEffect, useState } from 'react';
import styles from './CrashLog.module.css';

/*
 * Thursday's crash, the way a real one looks from the outside: the screening service's log
 * scrolling past — warnings, then timeouts and retries, then the fatal line — while the screen
 * tears and flickers, and at the end goes dark for a moment with nothing on the wire.
 */

/** The log lines and when (share of the run) each appears. */
const LINES: [number, 'info' | 'warn' | 'err' | 'fatal', string][] = [
  [0.0, 'info', 'ats-ranker  batch 4/12 · 1.418 belge sırada'],
  [0.08, 'warn', 'worker-3    heap %94 · GC 1.840 ms'],
  [0.16, 'warn', 'model-api   p95 gecikme 8.2 s (eşik 2 s)'],
  [0.26, 'err', 'ats-ranker  model-server-02: zaman aşımı (30000 ms)'],
  [0.33, 'warn', 'ats-ranker  yeniden deneniyor (1/3)…'],
  [0.41, 'err', 'ats-ranker  yeniden deneniyor (2/3)… başarısız'],
  [0.49, 'err', 'ats-ranker  yeniden deneniyor (3/3)… başarısız'],
  [0.57, 'fatal', 'worker-3    OutOfMemoryError: bellek sınırı aşıldı'],
  [0.63, 'err', 'gateway     model-server-02:8443 bağlantıyı reddetti'],
  [0.69, 'fatal', 'supervisor  ats-ranker durdu (çıkış kodu 137)'],
  [0.74, 'err', 'gateway     503 Service Unavailable'],
];

export function CrashLog({ durationMs }: { durationMs: number }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const id = window.setInterval(() => setT(Math.min(1, (performance.now() - start) / durationMs)), 60);
    return () => window.clearInterval(id);
  }, [durationMs]);

  const shown = LINES.filter(([at]) => t >= at);
  const stamp = (at: number) => {
    const ms = Math.round(at * durationMs);
    return `17:42:${String(8 + Math.floor(ms / 1000)).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
  };
  // the last stretch: the screen loses its signal
  const dark = t >= 0.82;

  return (
    <div className={`${styles.wrap} ${t >= 0.5 ? styles.tearing : ''} ${dark ? styles.dark : ''}`} aria-live="polite">
      {!dark && (
        <pre className={`${styles.log} mono`}>
          {shown.slice(-8).map(([at, level, text]) => (
            <span key={at} className={styles[level]}>
              {stamp(at)} {level.toUpperCase().padEnd(5)} {text}
              {'\n'}
            </span>
          ))}
          <span className={styles.caret} />
        </pre>
      )}
      {dark && (
        <div className={`${styles.noSignal} mono`}>
          <span>SİNYAL YOK</span>
          <small>ats-ranker · bağlantı kesildi</small>
        </div>
      )}
      <div className={styles.scan} aria-hidden="true" />
    </div>
  );
}
