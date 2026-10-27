import { inPoint, type Junction, type LegGeo } from './junction';
import { LANE_W, SIDEWALK } from './model';
import { rng } from './sim';
import { building, OBL_X, OBL_Y } from './facade';
import { WORLD, type Scenery } from './scenery';

/*
 * Kavşağın sabit katmanları: bir kez ekran boyunda çizilir, her karede altına (zemin) ve üstüne
 * (ağaç taçları) basılır. Zemin: dokulu asfalt, teker izleri, yamalar, rögarlar; kavisli
 * bordürlü kaldırımlar, kilitli parke, sarı hissedilebilir yüzey; şerit çizgileri, oklar, duruş
 * çizgisi, zebra; refüj; park ve otopark; apartmanların gölgesi, yan ve ön cepheleri (pencere,
 * balkon, klima, dükkân camı, tente, tabela) ve çatıları (su deposu, güneş paneli, çanak anten,
 * kiremit).
 */

export interface View {
  k: number;
  cx: number;
  cy: number;
  w: number;
  h: number;
}

export const applyView = (ctx: CanvasRenderingContext2D, v: View) => ctx.setTransform(v.k, 0, 0, v.k, v.w / 2 - v.cx * v.k, v.h / 2 - v.cy * v.k);

/** Görünen dünya dikdörtgeni (metre). */
export const bounds = (v: View, pad = 0) => ({ x0: v.cx - v.w / 2 / v.k - pad, x1: v.cx + v.w / 2 / v.k + pad, y0: v.cy - v.h / 2 / v.k - pad, y1: v.cy + v.h / 2 / v.k + pad });

const COURT = '#b8b2a3';
const PAINT = 'rgba(240,238,230,0.92)';

function noiseTile(seed: number, base: [number, number, number], spread: number, size = 96) {
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


const along = (g: LegGeo, s: number, lat: number): [number, number] => [g.u[0] * s + g.rout[0] * lat, g.u[1] * s + g.rout[1] * lat];

/** Kolun bir dikdörtgen bandı: s0–s1 boyunca, enine lat0–lat1 (giden yarı artı). */
function band(ctx: CanvasRenderingContext2D, g: LegGeo, s0: number, s1: number, lat0: number, lat1: number) {
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

function line(ctx: CanvasRenderingContext2D, g: LegGeo, s0: number, s1: number, lat: number, w: number, dash?: number[]) {
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
function arrow(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, moves: string) {
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

export function paintGround(j: Junction, sc: Scenery, v: View, dusk: number, seed: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = v.w;
  cv.height = v.h;
  const ctx = cv.getContext('2d')!;
  const B = bounds(v, 4);
  const r = rng(seed * 13 + 5);

  // asfalt: gürültü dokusu ekran pikselinde
  ctx.fillStyle = ctx.createPattern(noiseTile(seed, [75, 77, 82], 16), 'repeat')!;
  ctx.fillRect(0, 0, v.w, v.h);
  applyView(ctx, v);

  // teker izleri ve duruş çizgisi önündeki yağ lekeleri
  for (const g of Object.values(j.legs)) {
    const lanes = [...g.spec.lanes.map((_, i) => -(g.half + (i + 0.5) * LANE_W)), ...Array.from({ length: g.spec.out }, (_, i) => g.half + (i + 0.5) * LANE_W)];
    ctx.strokeStyle = 'rgba(28,29,33,0.16)';
    for (const lat of lanes) {
      line(ctx, g, g.edge, WORLD, lat - 0.8, 0.55);
      line(ctx, g, g.edge, WORLD, lat + 0.8, 0.55);
    }
    ctx.fillStyle = 'rgba(20,20,24,0.22)';
    g.spec.lanes.forEach((_, i) => {
      const [x, y] = inPoint(g, i, g.stop + 3.2);
      ctx.beginPath();
      ctx.ellipse(x, y, g.u[0] ? 1.6 : 0.55, g.u[0] ? 0.55 : 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    // yama: eski kazı izleri
    for (let k = 0; k < 3; k++) {
      const s0 = g.stop + 10 + r() * 80;
      const lat = (r() - 0.5) * (g.inW + g.outW);
      ctx.fillStyle = r() < 0.5 ? 'rgba(30,31,35,0.35)' : 'rgba(110,110,112,0.18)';
      band(ctx, g, s0, s0 + 2 + r() * 6, lat, lat + 1.5 + r() * 3);
      ctx.fill();
    }
  }
  // kutuda rögar kapakları
  ctx.strokeStyle = 'rgba(25,25,28,0.7)';
  ctx.lineWidth = 0.12;
  for (let k = 0; k < 2; k++) {
    const x = j.box.x0 + 2 + r() * (j.box.x1 - j.box.x0 - 4);
    const y = j.box.y0 + 2 + r() * (j.box.y1 - j.box.y0 - 4);
    ctx.fillStyle = '#3c3d40';
    ctx.beginPath();
    ctx.arc(x, y, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // adalar: kavisli bordür, kaldırım, avlu
  const paving = ctx.createPattern(noiseTile(seed + 1, [203, 197, 184], 10, 64), 'repeat')!;
  for (const b of sc.blocks) {
    const R = b.round ? 7 : 0;
    const { cx, cy, sx, sy } = b;
    const path = new Path2D();
    path.moveTo(cx + sx * R, cy);
    path.lineTo(sx * WORLD, cy);
    path.lineTo(sx * WORLD, sy * WORLD);
    path.lineTo(cx, sy * WORLD);
    path.lineTo(cx, cy + sy * R);
    if (R) path.arcTo(cx, cy, cx + sx * R, cy, R);
    path.closePath();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = paving;
    applyView(ctx, v);
    ctx.fill(path);
    ctx.clip(path);
    // kilitli parke derzleri
    ctx.strokeStyle = 'rgba(120,112,98,0.22)';
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    for (let x = Math.floor(Math.max(B.x0, -WORLD)); x < Math.min(B.x1, WORLD); x += 0.6) {
      ctx.moveTo(x, B.y0);
      ctx.lineTo(x, B.y1);
    }
    for (let y = Math.floor(Math.max(B.y0, -WORLD)); y < Math.min(B.y1, WORLD); y += 1.2) {
      ctx.moveTo(B.x0, y);
      ctx.lineTo(B.x1, y);
    }
    ctx.stroke();
    // avlu: kaldırımın gerisi
    const fx = cx + sx * (b.vRoad ? SIDEWALK : 0);
    const fy = cy + sy * (b.hRoad ? SIDEWALK : 0);
    ctx.fillStyle = COURT;
    ctx.fillRect(Math.min(fx, sx * WORLD), Math.min(fy, sy * WORLD), WORLD, WORLD);
    // avluda çimen parçaları
    ctx.fillStyle = 'rgba(112,140,78,0.55)';
    for (let k = 0; k < 18; k++) {
      const gx = fx + sx * (18 + r() * 120);
      const gy = fy + sy * (18 + r() * 120);
      ctx.fillRect(gx, gy, 3 + r() * 5, 2 + r() * 4);
    }
    ctx.restore();
    ctx.strokeStyle = '#7d7a73';
    ctx.lineWidth = 0.55;
    ctx.stroke(path);
    ctx.strokeStyle = '#e4e0d7';
    ctx.lineWidth = 0.28;
    ctx.stroke(path);
  }

  // refüjler, şerit çizgileri, oklar, zebra
  for (const g of Object.values(j.legs)) {
    const nIn = g.spec.lanes.length;
    ctx.strokeStyle = PAINT;
    ctx.fillStyle = PAINT;
    if (g.half > 0) {
      const s0 = g.crosswalk ? g.cw1 + 1.2 : g.edge + 1;
      const nose = new Path2D();
      const w = g.half - 0.25;
      const a = along(g, s0 + w, -w);
      const b = along(g, WORLD, -w);
      const c = along(g, WORLD, w);
      const d = along(g, s0 + w, w);
      const m = along(g, s0 + w, 0);
      nose.moveTo(a[0], a[1]);
      nose.lineTo(b[0], b[1]);
      nose.lineTo(c[0], c[1]);
      nose.lineTo(d[0], d[1]);
      const ang = Math.atan2(g.u[1], g.u[0]);
      nose.arc(m[0], m[1], w, ang + Math.PI / 2, ang + (Math.PI * 3) / 2);
      ctx.fillStyle = '#d2cdc2';
      ctx.fill(nose);
      ctx.strokeStyle = '#8a867e';
      ctx.lineWidth = 0.2;
      ctx.stroke(nose);
      ctx.fillStyle = '#6d8a4b';
      band(ctx, g, s0 + w + 1.2, WORLD, -w + 0.45, w - 0.45);
      ctx.fill();
      ctx.fillStyle = 'rgba(60,85,40,0.6)';
      for (let s = s0 + 5; s < WORLD; s += 2.6) {
        const p = along(g, s, (r() - 0.5) * (w - 0.8));
        ctx.beginPath();
        ctx.arc(p[0], p[1], 0.35 + r() * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = PAINT;
      ctx.fillStyle = PAINT;
    } else {
      // ortada çift düz çizgi
      line(ctx, g, g.stop, WORLD, -0.18, 0.16);
      line(ctx, g, g.stop, WORLD, 0.18, 0.16);
    }
    // gelen şeritler arası: kesikli, duruş çizgisine yakın düz
    for (let i = 1; i < nIn; i++) {
      const lat = -(g.half + i * LANE_W);
      line(ctx, g, g.stop, g.stop + 24, lat, 0.16);
      line(ctx, g, g.stop + 24, WORLD, lat, 0.15, [3, 6]);
    }
    for (let i = 1; i < g.spec.out; i++) line(ctx, g, g.cw1 + 1, WORLD, g.half + i * LANE_W, 0.15, [3, 6]);
    // kaldırım kenarı çizgisi
    ctx.strokeStyle = 'rgba(240,238,230,0.55)';
    line(ctx, g, g.stop, WORLD, -g.inW + 0.3, 0.12);
    line(ctx, g, g.cw1, WORLD, g.outW - 0.3, 0.12);
    ctx.strokeStyle = PAINT;
    // duruş çizgisi
    band(ctx, g, g.stop - 0.25, g.stop + 0.25, -g.inW + 0.2, -g.half);
    ctx.fill();
    // oklar
    g.spec.lanes.forEach((l, i) => {
      const ang = Math.atan2(-g.u[1], -g.u[0]);
      for (const ds of [6, 30]) {
        const [x, y] = inPoint(g, i, g.stop + ds);
        arrow(ctx, x, y, ang, l);
      }
    });
    // zebra: çizgiler trafiğe paralel
    if (g.crosswalk) {
      for (let lat = -g.inW + 0.25; lat < g.outW - 0.3; lat += 1) {
        band(ctx, g, g.cw0, g.cw1, lat, lat + 0.5);
        ctx.fill();
      }
      // kaldırım uçlarında sarı hissedilebilir yüzey
      ctx.fillStyle = '#d9b43a';
      band(ctx, g, g.cw0 + 0.4, g.cw1 - 0.4, -g.inW - 1.6, -g.inW - 0.5);
      ctx.fill();
      band(ctx, g, g.cw0 + 0.4, g.cw1 - 0.4, g.outW + 0.5, g.outW + 1.6);
      ctx.fill();
      ctx.fillStyle = PAINT;
    }
  }

  // park ve otopark
  for (const l of sc.lots) {
    if (l.x > B.x1 || l.x + l.w < B.x0 || l.y > B.y1 || l.y + l.d < B.y0) continue;
    if (l.kind === 'park') {
      ctx.fillStyle = '#7e9a58';
      ctx.fillRect(l.x, l.y, l.w, l.d);
      ctx.strokeStyle = '#d9cfb6';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(l.x, l.y + l.d / 2);
      ctx.quadraticCurveTo(l.x + l.w / 2, l.y + l.d * 0.2, l.x + l.w, l.y + l.d * 0.6);
      ctx.stroke();
      ctx.fillStyle = '#8a6a44';
      ctx.fillRect(l.x + l.w * 0.4, l.y + l.d * 0.32, 1.6, 0.5);
    } else {
      ctx.fillStyle = '#55575b';
      ctx.fillRect(l.x, l.y, l.w, l.d);
      ctx.strokeStyle = PAINT;
      ctx.lineWidth = 0.1;
      for (let x = l.x + 1; x < l.x + l.w - 2.4; x += 2.6) {
        for (const yy of [l.y + 1, l.y + l.d - 6]) {
          ctx.strokeRect(x, yy, 2.6, 5);
          if (r() < 0.7) {
            ctx.fillStyle = ['#d8d6cf', '#9aa0a8', '#2a2c31', '#7a2a22', '#3a5578'][Math.floor(r() * 5)];
            ctx.beginPath();
            ctx.roundRect(x + 0.4, yy + 0.4, 1.8, 4.2, 0.5);
            ctx.fill();
            ctx.fillStyle = 'rgba(30,38,48,0.7)';
            ctx.fillRect(x + 0.6, yy + 1.2, 1.4, 0.9);
          }
        }
      }
    }
  }

  // babalar
  ctx.fillStyle = '#3d3f43';
  for (const [x, y] of sc.bollards) {
    ctx.beginPath();
    ctx.arc(x, y, 0.16, 0, Math.PI * 2);
    ctx.fill();
  }

  // binalar: önce gölgeler, sonra kuzeyden güneye
  const vis = sc.buildings.filter((b) => {
    const H = b.floors * 3;
    return b.x - 2 < B.x1 && b.x + b.w + H * OBL_X + 8 > B.x0 && b.y - H * OBL_Y - 2 < B.y1 && b.y + b.d + 10 > B.y0;
  });
  ctx.fillStyle = 'rgba(25,22,30,0.28)';
  for (const b of vis) {
    const H = b.floors * 3;
    const ox = H * 0.32;
    const oy = H * 0.18;
    ctx.beginPath();
    ctx.moveTo(b.x + b.w, b.y);
    ctx.lineTo(b.x + b.w + ox, b.y + oy);
    ctx.lineTo(b.x + b.w + ox, b.y + b.d + oy);
    ctx.lineTo(b.x + ox, b.y + b.d + oy);
    ctx.lineTo(b.x, b.y + b.d);
    ctx.lineTo(b.x + b.w, b.y + b.d);
    ctx.closePath();
    ctx.fill();
  }
  vis.sort((a, b) => a.y + a.d - (b.y + b.d) || b.x - a.x);
  for (const b of vis) building(ctx, b, dusk);
  return cv;
}

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

