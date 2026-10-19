/*
 * Hareket azaltılsın mı: oyuncu sisteminde seçtiyse ya da Ayarlar'dan "Azalt"ı seçtiyse true. CSS
 * tarafı global.css'teki medya sorgusuyla ve <html data-motion="reduce"> ile kendiliğinden durur;
 * requestAnimationFrame ile çizilen her sahne ve sayaç bunu sorar ve hareket yerine son hâli
 * gösterir (tests/motion.test.ts bunu denetler).
 */
const KEY = 'kariyerweb-motion';

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  if (document.documentElement.dataset.motion === 'reduce') return true;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/** Ayarlar'daki tercih: true ise sistem ne derse desin hareket azaltılır. */
export function loadMotionReduced(): boolean {
  try {
    return window.localStorage.getItem(KEY) === 'reduce';
  } catch {
    return false;
  }
}

/** Ayarlar'dan seçilince saklanır; açılışta yalnızca uygulanır, "Verilerimi sil" sonrası anahtar geri yazılmasın. */
export function applyMotionReduced(reduce: boolean, persist = true) {
  if (reduce) document.documentElement.dataset.motion = 'reduce';
  else delete document.documentElement.dataset.motion;
  if (!persist) return;
  try {
    if (reduce) window.localStorage.setItem(KEY, 'reduce');
    else window.localStorage.removeItem(KEY);
  } catch {
    // private mode: the choice still applies for this session
  }
}
