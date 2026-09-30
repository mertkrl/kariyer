import { useEffect, useState } from 'react';

/** Counts from 0 to `value` with an ease-out, once. */
export function CountUp({ value, duration = 1200, format = (n: number) => n.toLocaleString('tr-TR') }: { value: number; duration?: number; format?: (n: number) => string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(value * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{format(Math.round(shown))}</>;
}
