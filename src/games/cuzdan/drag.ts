import type { PointerEvent as ReactPointerEvent } from 'react';

/** Pencerelerin sürüklenmesi: düğmelerden tutulmaz, telefonda (alt alta dizilince) hiç sürüklenmez. */
export interface Pos {
  x: number;
  y: number;
}

export function startDrag(e: ReactPointerEvent, pos: Pos, onMove: (p: Pos) => void) {
  if ((e.target as HTMLElement).closest('button, input, textarea, a, [data-nodrag]') || window.matchMedia('(max-width: 760px)').matches) return;
  e.preventDefault();
  const sx = e.clientX - pos.x;
  const sy = e.clientY - pos.y;
  const move = (ev: PointerEvent) => onMove({ x: ev.clientX - sx, y: Math.max(0, ev.clientY - sy) });
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

export interface Size {
  w: number;
  h: number;
}

/** Sağ alt köşeden boyutlandırma: en az 260×160, fare bırakılınca biter. */
export function startResize(e: ReactPointerEvent, from: Size, onSize: (s: Size) => void) {
  e.preventDefault();
  e.stopPropagation();
  const sx = e.clientX;
  const sy = e.clientY;
  const move = (ev: PointerEvent) => onSize({ w: Math.max(260, from.w + ev.clientX - sx), h: Math.max(160, from.h + ev.clientY - sy) });
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}
