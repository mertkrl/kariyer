import { useCallback, useRef } from 'react';

/**
 * İmlecin konumunu bir öğenin CSS değişkenlerine yazar (--mx, --my: yüzde; --px, --py: -1…1).
 * Yeniden çizim yok, döngü yok: ışık, paralaks ve eğim CSS'te hesaplanır. `viewport`: konum öğeye
 * göre değil pencereye göre (ekrana sabitlenmiş arka plan katmanları için).
 */
export function usePointerVars<T extends HTMLElement>(viewport = false) {
  const ref = useRef<T>(null);
  const onPointerMove = useCallback((e: { clientX: number; clientY: number }) => {
    const el = ref.current;
    if (!el) return;
    const r = viewport ? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight } : el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
    el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    el.style.setProperty('--px', (x * 2 - 1).toFixed(3));
    el.style.setProperty('--py', (y * 2 - 1).toFixed(3));
  }, [viewport]);
  return [ref, onPointerMove] as const;
}
