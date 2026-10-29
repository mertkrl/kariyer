import { useEffect, useState, type PointerEvent as ReactPointerEvent } from 'react';

/*
 * Ekranda serbest duran pencereler (defter, hesap makinesi): başlığından tutulup sürüklenir,
 * istenirse sağ alt köşesinden büyütülüp küçültülür. Yeri ve boyu kapanıp açılınca hatırlanır.
 * Kenarlardan tamamen dışarı kaçamaz: en az bir tutamak ekranda kalır.
 */

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const remembered = new Map<string, Box>();

const MIN = { w: 300, h: 360 };

function fit(b: Box): Box {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.max(MIN.w, Math.min(b.w, vw - 16));
  const h = Math.max(MIN.h, Math.min(b.h, vh - 16));
  return { w, h, x: Math.max(80 - w, Math.min(b.x, vw - 80)), y: Math.max(0, Math.min(b.y, vh - 48)) };
}

export function useFloating(key: string, initial: () => Box) {
  const [box, setBox] = useState(() => fit(remembered.get(key) ?? initial()));
  useEffect(() => {
    remembered.set(key, box);
  }, [key, box]);

  const grab = (mode: 'move' | 'size') => (e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    // başlıktaki düğmeler sürüklemeyi başlatmaz
    if (mode === 'move' && (e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    const sx = e.clientX;
    const sy = e.clientY;
    const b0 = box;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      setBox(fit(mode === 'move' ? { ...b0, x: b0.x + dx, y: b0.y + dy } : { ...b0, w: b0.w + dx, h: b0.h + dy }));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  return { box, onMove: grab('move'), onResize: grab('size') };
}
