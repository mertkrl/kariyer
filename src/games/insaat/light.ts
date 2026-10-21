import { dayPhase } from './data';
import { mix } from './geo';

/* Günün ışığı: gökyüzü renkleri ve gece karanlığı, gerçek saate göre. */

/** Gökyüzünün üst ve alt rengi günün evresine göre: [evre, üst, alt]. */
const SKY: [number, string, string][] = [
  [0, '#9cc6e3', '#f4d9b0'],
  [0.4, '#7fb6dd', '#e6eef0'],
  [0.64, '#7d8fbf', '#f2b07a'],
  [0.74, '#1a2140', '#3a3556'],
  [0.92, '#141a33', '#2b2c4a'],
  [0.98, '#5a6aa0', '#e9b48a'],
  [1, '#9cc6e3', '#f4d9b0'],
];

export function skyAt(p: number) {
  let i = 0;
  while (i + 1 < SKY.length && SKY[i + 1][0] <= p) i++;
  const [a, top, bottom] = SKY[i];
  const [b, top2, bottom2] = SKY[Math.min(SKY.length - 1, i + 1)];
  const k = b === a ? 0 : (p - a) / (b - a);
  return { top: mix(top, top2, k), bottom: mix(bottom, bottom2, k) };
}

/** Karanlık oranı (0 gündüz, 0.55 gece): sahnenin üstüne serilen gece katmanının opaklığı. */
export function darkAt(t: number) {
  const p = dayPhase(t);
  if (p < 0.64) return 0;
  if (p < 0.75) return ((p - 0.64) / 0.11) * 0.55;
  if (p < 0.92) return 0.55;
  if (p < 0.99) return (1 - (p - 0.92) / 0.07) * 0.55;
  return 0;
}

/** Günün ışık tonu: sabah sıcak, öğle nötr, akşam turuncu; sahnenin üstüne ince bir renk katmanı. */
export function tintAt(p: number): { color: string; opacity: number } {
  if (p < 0.12) return { color: '#ffc58a', opacity: 0.12 * (1 - p / 0.12) + 0.03 };
  if (p < 0.5) return { color: '#fff4dc', opacity: 0.03 };
  if (p < 0.72) return { color: '#ff9a55', opacity: ((p - 0.5) / 0.22) * 0.16 };
  return { color: '#3d4f8a', opacity: 0.1 };
}
