import type { LegGeo } from './junction';
import { rng } from './sim';

/*
 * Zeminin fırçaları: asfalt ve kaldırım dokusu, kolun boyunca bant ve çizgi, şeritteki yön okları.
 */

/** Yol boyası: şerit çizgileri ve oklar. */
export const PAINT = 'rgba(240,238,230,0.92)';

export function noiseTile(seed: number, base: [number, number, number], spread: number, size = 96) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const x = c.getContext('2d')!;
  const img = x.createImageData(size, size);
  const r = rng(seed);
  for (let i = 0; i < size * size; i++) {
    const n = (r() - 0.5) * spread + (r() < 0.02 ? (r() - 0.5) * spread * 3 : 0);
    img.data[i * 4] = base[0] + n;
    img.data[i * 4 + 1] = base[1] + n;
    img.data[i * 4 + 2] = base[2] + n;
    img.data[i * 4 + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return c;
}


export const along = (g: LegGeo, s: number, lat: number): [number, number] => [g.u[0] * s + g.rout[0] * lat, g.u[1] * s + g.rout[1] * lat];

/** Kolun bir dikdörtgen bandı: s0–s1 boyunca, enine lat0–lat1 (giden yarı artı). */
export function band(ctx: CanvasRenderingContext2D, g: LegGeo, s0: number, s1: number, lat0: number, lat1: number) {
  const a = along(g, s0, lat0);
  const b = along(g, s1, lat0);
  const c = along(g, s1, lat1);
  const d = along(g, s0, lat1);
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.lineTo(c[0], c[1]);
  ctx.lineTo(d[0], d[1]);
  ctx.closePath();
}

export function line(ctx: CanvasRenderingContext2D, g: LegGeo, s0: number, s1: number, lat: number, w: number, dash?: number[]) {
  const a = along(g, s0, lat);
  const b = along(g, s1, lat);
  ctx.setLineDash(dash ?? []);
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  ctx.setLineDash([]);
}

/** Şerit oku: yerel çerçevede (x ileri, y sağa), metre. */
export function arrow(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, moves: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.strokeStyle = PAINT;
  ctx.fillStyle = PAINT;
  ctx.lineWidth = 0.32;
  ctx.lineCap = 'butt';
  const head = (hx: number, hy: number, a: number) => {
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0.95, 0);
    ctx.lineTo(0, -0.55);
    ctx.lineTo(0, 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  ctx.beginPath();
  ctx.moveTo(-2.6, 0);
  ctx.lineTo(moves.includes('T') ? 0.9 : -0.1, 0);
  ctx.stroke();
  if (moves.includes('T')) head(0.9, 0, 0);
  for (const [t, sgn] of [
    ['L', -1],
    ['R', 1],
  ] as const) {
    if (!moves.includes(t)) continue;
    ctx.beginPath();
    ctx.moveTo(-0.6, 0);
    ctx.quadraticCurveTo(0.3, 0, 0.35, sgn * 0.75);
    ctx.stroke();
    head(0.35, sgn * 0.75, (sgn * Math.PI) / 2);
  }
  ctx.restore();
}
