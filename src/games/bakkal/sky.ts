import type { Weather } from './data';

/*
 * Sahnenin ışığı: kapı camındaki gökyüzü ve odanın kararması, günün saatine ve havaya göre.
 */

/** Gökyüzü renkleri (üst, orta, ufuk) saate göre: sabah pembe, öğlen mavi, akşam turuncu, gece mor. */
const SKY: [number, [string, string, string]][] = [
  [8, ['#f2b99a', '#f7dcc2', '#f3ecd2']],
  [11, ['#6fb3e0', '#cfe8f5', '#f3ecd2']],
  [15, ['#78b0da', '#dde6d0', '#f3e2c0']],
  [17.5, ['#e98a52', '#f5c27a', '#f3d9a8']],
  [19, ['#3b3a6b', '#8a6a8e', '#d9a07a']],
  [21, ['#141a35', '#2a2f55', '#4a4060']],
];

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
function mix(a: string, b: string, t: number) {
  const x = hex(a);
  const y = hex(b);
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

/** Saat ve havaya göre gökyüzü; bulut, yağmur ve kar gri bir perde çeker. */
export function skyAt(hour: number, weather: Weather): [string, string, string] {
  let i = SKY.findIndex(([h]) => h > hour);
  if (i <= 0) i = i === 0 ? 1 : SKY.length - 1;
  const [h0, c0] = SKY[i - 1];
  const [h1, c1] = SKY[i];
  const t = Math.max(0, Math.min(1, (hour - h0) / (h1 - h0)));
  const grey = { sunny: 0, cloudy: 0.45, rain: 0.65, snow: 0.55 }[weather];
  return c0.map((c, k) => mix(mix(c, c1[k], t), weather === 'snow' ? '#cfd6dc' : '#8f99a1', grey)) as [string, string, string];
}

/** Odanın karanlığı: öğlen aydınlık, akşam ve kötü havada kararır. */
export function darknessAt(hour: number, weather: Weather): number {
  const time = hour < 10 ? (10 - hour) * 0.05 : hour > 16 ? Math.min(0.42, (hour - 16) * 0.1) : 0;
  return Math.min(0.55, time + { sunny: 0, cloudy: 0.06, rain: 0.13, snow: 0.05 }[weather]);
}
