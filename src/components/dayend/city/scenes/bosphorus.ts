import { H, PAD, W, polyY, range } from '../kit';
import type { Persp } from '../traffic';

/*
 * The Bosphorus below the 15 Temmuz bridge, as geometry: the two coastlines, which screen
 * points are water, the vapur's crossing between Beylerbeyi and Ortaköy, and the small boats
 * that drift without running aground. No drawing — bridge.ts paints it, tests step it.
 */

export const P: Persp = { vpx: 800, vpy: 400, f: 900, camH: 110 };

// Coastlines (screen space): Europe on the left, Asia on the right, water in between.
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

/** Screen point over open water (not on either shore or the quay)? */
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

/** Perspective size of something floating at screen height y (the horizon is at P.vpy). */
export const depthScale = (y: number) => 0.5 + (y - P.vpy) / 400;

/* ── the vapur's route ── */

/** Piers (where the hull's middle berths): Beylerbeyi on the Asian side, Ortaköy below the mosque. */
const PIER_ASIA = { x: 1420, y: 592 };
const PIER_EURO = { x: 720, y: 694 };
const FERRY_CYCLE = 150;
/** Half the drawn ferry's length at scale 1 (the hull runs from -72 to 80). */
export const FERRY_HALF = 80;

/** Where the vapur is at time t: berthed, or crossing with an eased start and stop. */
export function ferryAt(t: number) {
  const u = (t / FERRY_CYCLE + 0.08) % 1;
  // 0–0.1 berthed in Asia, 0.1–0.5 crossing west, 0.5–0.6 berthed at Ortaköy, 0.6–1 crossing east
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
  // a slight arc downstream rather than a ruler-straight line
  const x = PIER_ASIA.x + (PIER_EURO.x - PIER_ASIA.x) * e;
  const y = PIER_ASIA.y + (PIER_EURO.y - PIER_ASIA.y) * e + Math.sin(e * Math.PI) * 26;
  return { x, y, s: depthScale(y), dir, moving };
}

/* ── small boats ── */

export interface SmallBoat {
  x: number;
  y: number;
  /** Screen speed along x (sign is the heading). */
  v: number;
  len: number;
  kind: 0 | 1;
}

/** A boat's hull, bow to stern, is all over water. */
export function boatAfloat(x: number, y: number, len: number) {
  const s = depthScale(y);
  return isWater(x - len * s, y) && isWater(x + len * s, y) && isWater(x, y + 4 * s);
}

/** Motorboats and fishing boats, placed only where there is water around their whole hull. */
export function spawnBoats(r: () => number): SmallBoat[] {
  const boats: SmallBoat[] = [];
  for (let tries = 0; boats.length < 6 && tries < 2000; tries++) {
    const b: SmallBoat = { x: range(r, 560, 1560), y: range(r, 450, 820), v: (r() < 0.5 ? -1 : 1) * range(r, 6, 16), len: range(r, 9, 15), kind: r() < 0.6 ? 0 : 1 };
    if (boatAfloat(b.x, b.y, b.len + 8)) boats.push(b);
  }
  return boats;
}

/** Move a boat on; before its bow would touch a shore, it comes about. */
export function stepBoat(b: SmallBoat, dt: number) {
  const nx = b.x + b.v * dt * depthScale(b.y);
  if (boatAfloat(nx + Math.sign(b.v) * 8, b.y, b.len)) b.x = nx;
  else b.v = -b.v;
}
