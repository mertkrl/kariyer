/** Sahnenin ortak boyalarına (SceneDefs) başvuru: `url(#meydan-…)`. */
export const url = (id: string) => `url(#meydan-${id})`;

/** Aynı bina ve pencere için hep aynı "rastgele" sayı: perdeler, ışıklar her çizimde aynı kalır. */
export function rnd(seed: string, i: number): number {
  let h = 2166136261;
  const s = `${seed}:${i}`;
  for (let k = 0; k < s.length; k++) {
    h ^= s.charCodeAt(k);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}
