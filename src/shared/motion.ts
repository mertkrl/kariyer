/*
 * Hareket azaltılsın mı: oyuncu sisteminde seçtiyse ya da Ayarlar'dan "Azalt"ı seçtiyse true. CSS
 * tarafı global.css'teki medya sorgusuyla ve <html data-motion="reduce"> ile kendiliğinden durur;
 * requestAnimationFrame ile çizilen her sahne ve sayaç bunu sorar ve hareket yerine son hâli
 * gösterir (tests/motion.test.ts bunu denetler).
 */

import { readText, removeKey, writeText } from './storage';
const KEY = 'kariyerweb-motion';

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  if (document.documentElement.dataset.motion === 'reduce') return true;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/** Ayarlar'daki tercih: true ise sistem ne derse desin hareket azaltılır. */
export function loadMotionReduced(): boolean {
  return readText(KEY) === 'reduce';
}

/** Ayarlar'dan seçilince saklanır; açılışta yalnızca uygulanır, "Verilerimi sil" sonrası anahtar geri yazılmasın. */
export function applyMotionReduced(reduce: boolean, persist = true) {
  if (reduce) document.documentElement.dataset.motion = 'reduce';
  else delete document.documentElement.dataset.motion;
  if (!persist) return;
  if (reduce) writeText(KEY, 'reduce');
  else removeKey(KEY);
}
