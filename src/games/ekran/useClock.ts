import { useEffect, useState } from 'react';

/** Canlı önizlemenin saati: açıkken saniyenin dörtte birinde bir ilerler, kapalıyken durur. */
export function useClock(running: boolean) {
  const [seconds, setSeconds] = useState(0);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const t = performance.now();
      // arka plandan dönünce akış sıçramasın
      const dt = Math.min(0.5, (t - last) / 1000);
      last = t;
      setSeconds((s) => s + dt);
      setNow(new Date());
    }, 250);
    return () => window.clearInterval(id);
  }, [running]);
  return { seconds, now };
}
