/*
 * Oyunların ortak tohumlu rastgeleliği. Aynı tohum her tarayıcıda aynı diziyi verir; kayıtlar,
 * "günün kavşağı" ve paylaşılan bağlantılar buna dayanır. Bu yüzden algoritmalar değişmez: değişirse
 * eski tohumlar başka bir dünya üretir.
 */

/** mulberry32: 32 bitlik tohumdan [0, 1) aralığında sayı akışı. Kesirli ya da eksi tohum 32 bite kırpılır. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Bir sayıdan [0, 1) aralığında sabit bir sayı (sin tabanlı "hash"): sahnelerde her çizimde aynı
 * çıkması gereken küçük süsler için (panjur rengi, damla yeri). Akış değil, tek değer.
 */
export function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
