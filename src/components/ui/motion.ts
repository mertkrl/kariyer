/*
 * Oyuncu sisteminde hareketi azaltmayı seçtiyse true. CSS tarafı global.css'teki medya sorgusuyla
 * kendiliğinden durur; requestAnimationFrame ile çizilen her sahne ve sayaç bunu sorar ve hareket
 * yerine son hâli gösterir (tests/motion.test.ts bunu denetler).
 */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}
