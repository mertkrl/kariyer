import { along } from './roadMarks';
import { applyView, bounds, type View } from './paint';
import type { Junction } from './junction';
import { rng } from './sim';
import { WORLD, type Scenery } from './scenery';

/*
 * Arabaların üstündeki katman: ağaç taçları ve aydınlatma direklerinin başları.
 */

/** Arabaların üstünde kalan katman: ağaç taçları ve aydınlatma direklerinin başları. */
export function paintCanopy(j: Junction, sc: Scenery, v: View, seed: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = v.w;
  cv.height = v.h;
  const ctx = cv.getContext('2d')!;
  applyView(ctx, v);
  const B = bounds(v, 6);
  const r = rng(seed * 31 + 7);
  const trees = [...sc.trees];
  // refüj ağaçları
  for (const g of Object.values(j.legs))
    if (g.half >= 1.5)
      for (let s = g.cw1 + 14; s < WORLD; s += 11 + r() * 4) {
        const p = along(g, s, 0);
        trees.push({ x: p[0], y: p[1], r: 1.8 + r() * 0.8, tone: r() });
      }
  for (const t of trees) {
    if (t.x < B.x0 || t.x > B.x1 || t.y < B.y0 || t.y > B.y1) continue;
    ctx.fillStyle = 'rgba(20,24,18,0.25)';
    ctx.beginPath();
    ctx.ellipse(t.x + t.r * 0.45, t.y + t.r * 0.3, t.r, t.r * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    const base = t.tone < 0.33 ? [70, 110, 52] : t.tone < 0.66 ? [86, 124, 60] : [62, 98, 58];
    const g = ctx.createRadialGradient(t.x - t.r * 0.3, t.y - t.r * 0.35, t.r * 0.1, t.x, t.y, t.r);
    g.addColorStop(0, `rgb(${base[0] + 40},${base[1] + 40},${base[2] + 25})`);
    g.addColorStop(1, `rgb(${base[0] - 20},${base[1] - 25},${base[2] - 15})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + t.tone;
      const rr = t.r * (0.55 + 0.1 * Math.sin(k * 2.3 + t.tone * 9));
      ctx.moveTo(t.x + Math.cos(a) * rr * 0.6 + rr * 0.55, t.y + Math.sin(a) * rr * 0.6);
      ctx.arc(t.x + Math.cos(a) * rr * 0.6, t.y + Math.sin(a) * rr * 0.6, rr * 0.55, 0, Math.PI * 2);
    }
    ctx.arc(t.x, t.y, t.r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const l of sc.lamps) {
    if (l.x < B.x0 || l.x > B.x1 || l.y < B.y0 || l.y > B.y1) continue;
    ctx.strokeStyle = '#55585e';
    ctx.lineWidth = 0.14;
    ctx.beginPath();
    ctx.moveTo(l.x, l.y);
    ctx.lineTo(l.x + Math.cos(l.a) * 1.8, l.y + Math.sin(l.a) * 1.8);
    ctx.stroke();
    ctx.fillStyle = '#3a3d42';
    ctx.beginPath();
    ctx.arc(l.x, l.y, 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d9d6c8';
    ctx.beginPath();
    ctx.ellipse(l.x + Math.cos(l.a) * 1.9, l.y + Math.sin(l.a) * 1.9, 0.45, 0.22, l.a, 0, Math.PI * 2);
    ctx.fill();
  }
  return cv;
}

/** Sokak lambalarının yeri: akşam ışık havuzu için. */
export function lampHeads(sc: Scenery) {
  return sc.lamps.map((l) => [l.x + Math.cos(l.a) * 1.9, l.y + Math.sin(l.a) * 1.9] as [number, number]);
}
