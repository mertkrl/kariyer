import { H, PAD, W, polyY, range } from '../kit';
import type { Persp } from '../traffic';

/*
 * 15 Temmuz köprüsünün altındaki Boğaz, geometri olarak: iki kıyı çizgisi, ekranın hangi
 * noktalarının su olduğu, vapurun Beylerbeyi ile Ortaköy arasındaki geçişi ve karaya oturmadan
 * süzülen küçük tekneler. Çizim yok: bridge.ts boyar, testler adım adım ilerletir.
 */

export const P: Persp = { vpx: 800, vpy: 400, f: 900, camH: 110 };

// Kıyı çizgileri (ekran uzayı): solda Avrupa, sağda Asya, arada su.
export const EURO_COAST: [number, number][] = [
  [560, 910],
  [470, 820],
  [498, 778],
  [512, 768],
  [540, 700],
  [560, 672],
  [576, 662],
  [610, 560],
  [628, 538],
  [642, 526],
  [660, 470],
  [684, 440],
  [700, 404],
];
export const ASIA_COAST: [number, number][] = [
  [840, 402],
  [930, 414],
  [1000, 430],
  [1080, 446],
  [1110, 444],
  [1160, 470],
  [1260, 492],
  [1300, 490],
  [1360, 520],
  [1460, 546],
  [1560, 580],
  [W + PAD, 610],
];

/** Ekrandaki nokta açık suyun üstünde mi (iki kıyıda ya da rıhtımda değil)? */
export function isWater(x: number, y: number) {
  if (y < P.vpy + 3 || y > H + PAD) return false;
  if (y < polyY(ASIA_COAST, x)) return false;
  if (x < 560 && y > 830) return false;
  const coast = EURO_COAST.slice(1).sort((a, b) => a[1] - b[1]).map(([cx, cy]) => [cy, cx] as [number, number]);
  return x > polyY(coast, y);
}

export function euroBottom(x: number) {
  return x < 470 ? 836 : polyY(EURO_COAST.slice(1).sort((p, q) => p[0] - q[0]), x);
}

/** Ekran yüksekliği y'de yüzen bir şeyin perspektif boyutu (ufuk P.vpy'de). */
export const depthScale = (y: number) => 0.5 + (y - P.vpy) / 400;

/* ── vapurun rotası ── */

/** İskeleler (teknenin ortasının yanaştığı yer): Asya yakasında Beylerbeyi, caminin altında Ortaköy. */
const PIER_ASIA = { x: 1420, y: 592 };
const PIER_EURO = { x: 720, y: 694 };
const FERRY_CYCLE = 150;
/** Çizilen vapurun 1 ölçeğindeki boyunun yarısı (tekne -72'den 80'e uzanır). */
export const FERRY_HALF = 80;

/** t anında vapurun nerede olduğu: yanaşmış ya da yumuşak kalkış ve duruşla geçiyor. */
export function ferryAt(t: number) {
  const u = (t / FERRY_CYCLE + 0.08) % 1;
  // 0–0.1 Asya'da yanaşık, 0.1–0.5 batıya geçiş, 0.5–0.6 Ortaköy'de yanaşık, 0.6–1 doğuya geçiş
  let k: number;
  let dir: 1 | -1;
  let moving = true;
  if (u < 0.1) {
    k = 0;
    dir = -1;
    moving = false;
  } else if (u < 0.5) {
    k = (u - 0.1) / 0.4;
    dir = -1;
  } else if (u < 0.6) {
    k = 1;
    dir = 1;
    moving = false;
  } else {
    k = 1 - (u - 0.6) / 0.4;
    dir = 1;
  }
  const e = k * k * (3 - 2 * k);
  // cetvel gibi düz bir çizgi yerine akıntı yönünde hafif bir kavis
  const x = PIER_ASIA.x + (PIER_EURO.x - PIER_ASIA.x) * e;
  const y = PIER_ASIA.y + (PIER_EURO.y - PIER_ASIA.y) * e + Math.sin(e * Math.PI) * 26;
  return { x, y, s: depthScale(y), dir, moving };
}

/* ── küçük tekneler ── */

export interface SmallBoat {
  x: number;
  y: number;
  /** x boyunca ekran hızı (işareti yönüdür). */
  v: number;
  len: number;
  kind: 0 | 1;
}

/** Bir teknenin baştan kıça bütün gövdesi suyun üstünde. */
export function boatAfloat(x: number, y: number, len: number) {
  const s = depthScale(y);
  return isWater(x - len * s, y) && isWater(x + len * s, y) && isWater(x, y + 4 * s);
}

/** Motorlu ve balıkçı tekneleri, yalnızca bütün gövdelerinin çevresinde su olan yerlere yerleştirilir. */
export function spawnBoats(r: () => number): SmallBoat[] {
  const boats: SmallBoat[] = [];
  for (let tries = 0; boats.length < 6 && tries < 2000; tries++) {
    const b: SmallBoat = { x: range(r, 560, 1560), y: range(r, 450, 820), v: (r() < 0.5 ? -1 : 1) * range(r, 6, 16), len: range(r, 9, 15), kind: r() < 0.6 ? 0 : 1 };
    if (boatAfloat(b.x, b.y, b.len + 8)) boats.push(b);
  }
  return boats;
}

/** Bir tekneyi ilerlet; pruvası bir kıyıya değmeden önce geri döner. */
export function stepBoat(b: SmallBoat, dt: number) {
  const nx = b.x + b.v * dt * depthScale(b.y);
  if (boatAfloat(nx + Math.sign(b.v) * 8, b.y, b.len)) b.x = nx;
  else b.v = -b.v;
}
