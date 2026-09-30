/*
 * Small canvas toolkit for the day-end city scenes: a 1600×900 virtual stage, pre-rendered
 * static layers with parallax, cached light sprites (every light in the city is an additive
 * glow), seeded randomness, and silhouettes (walkers, gulls, mosques, towers).
 */

export const W = 1600;
export const H = 900;
/** Extra margin rendered around every layer so the camera can drift without showing edges. */
export const PAD = 90;

export type RGB = readonly [number, number, number];
export type Rng = () => number;

export const rgba = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
export const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const scale = (c: RGB, f: number): RGB => [c[0] * f, c[1] * f, c[2] * f];
export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function makeRng(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const range = (r: Rng, a: number, b: number) => a + (b - a) * r();
export const pick = <T,>(r: Rng, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];

export function hsl(h: number, s: number, l: number): RGB {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
  };
  return [f(0), f(8), f(4)];
}

/** Piecewise-linear y(x) through points sorted by x. */
export function polyY(pts: readonly (readonly [number, number])[], x: number) {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return pts[pts.length - 1][1];
}

/** Smooth closed/open path through points (Catmull-Rom). */
export function smoothPath(g: CanvasRenderingContext2D, pts: readonly (readonly [number, number])[], close = false) {
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    g.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  if (close) g.closePath();
}

export interface Cam {
  x: number;
  y: number;
}

/** A pre-rendered layer covering the stage plus PAD on every side. */
export function makeLayer(px: number, draw: (g: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.ceil((W + PAD * 2) * px);
  c.height = Math.ceil((H + PAD * 2) * px);
  const g = c.getContext('2d')!;
  g.setTransform(px, 0, 0, px, PAD * px, PAD * px);
  draw(g);
  return c;
}

export function drawLayer(g: CanvasRenderingContext2D, layer: HTMLCanvasElement, cam: Cam, depth: number, alpha = 1) {
  g.globalAlpha = alpha;
  g.drawImage(layer, -PAD + cam.x * depth, -PAD + cam.y * depth, W + PAD * 2, H + PAD * 2);
  g.globalAlpha = 1;
}

export function vGradient(g: CanvasRenderingContext2D, y0: number, y1: number, stops: [number, string][]) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  return gr;
}

/* ── Light sprites ─────────────────────────────────────────────────────────── */

const sprites = new Map<string, HTMLCanvasElement>();

/** Radial glow sprite; `hot` adds a white-hot core like a real lamp or headlight. */
export function glowSprite(c: RGB, hot = false): HTMLCanvasElement {
  const key = `${c[0] | 0},${c[1] | 0},${c[2] | 0}${hot ? 'h' : ''}`;
  let s = sprites.get(key);
  if (s) return s;
  s = document.createElement('canvas');
  s.width = s.height = 128;
  const g = s.getContext('2d')!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  if (hot) {
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.06, rgba(mix(c, [255, 255, 255], 0.5), 1));
    gr.addColorStop(0.16, rgba(c, 0.5));
    gr.addColorStop(0.42, rgba(c, 0.12));
    gr.addColorStop(1, rgba(c, 0));
  } else {
    gr.addColorStop(0, rgba(c, 1));
    gr.addColorStop(0.22, rgba(c, 0.4));
    gr.addColorStop(0.55, rgba(c, 0.08));
    gr.addColorStop(1, rgba(c, 0));
  }
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  sprites.set(key, s);
  return s;
}

/** Additive glow; the caller sets globalCompositeOperation = 'lighter'. */
export function glow(g: CanvasRenderingContext2D, x: number, y: number, r: number, c: RGB, a = 1, hot = false) {
  if (r < 0.3 || a < 0.01) return;
  g.globalAlpha = a > 1 ? 1 : a;
  g.drawImage(glowSprite(c, hot), x - r, y - r, r * 2, r * 2);
  g.globalAlpha = 1;
}

/** Stretched glow: reflections on water / wet asphalt, lens streaks, light pools. */
export function glowRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: RGB, a = 1) {
  if (w < 0.3 || h < 0.3 || a < 0.01) return;
  g.globalAlpha = a > 1 ? 1 : a;
  g.drawImage(glowSprite(c), x - w / 2, y - h / 2, w, h);
  g.globalAlpha = 1;
}

/* ── Sky & atmosphere ──────────────────────────────────────────────────────── */

export function stars(g: CanvasRenderingContext2D, r: Rng, n: number, y1: number, alpha: number) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(255,255,255,${(alpha * (0.3 + r() * 0.7)).toFixed(2)})`;
    const s = r() < 0.1 ? 1.6 : 1;
    g.fillRect(range(r, -PAD, W + PAD), range(r, -PAD, y1) * (0.4 + r() * 0.6), s, s);
  }
}

export interface CloudOpts {
  y0: number;
  y1: number;
  n: number;
  w0: number;
  w1: number;
  flat: number;
  color: RGB;
  alpha: number;
  lit?: RGB;
  litAlpha?: number;
  blur: number;
}

/**
 * Soft cloud banks; lit from below by the sunset or the city's orange glow. The layer tiles
 * seamlessly (scenes scroll two copies side by side): every puff is also drawn one layer-width
 * to the left and right, so nothing is cut where the copies meet.
 */
export function clouds(g: CanvasRenderingContext2D, r: Rng, o: CloudOpts) {
  const span = W + PAD * 2;
  // softness comes from each puff's own falloff (a blur filter would fade the layer's edges)
  const soft = 1 + o.blur / 40;
  const puff = (px: number, py: number, rx: number, ry: number, c: RGB, a: number) => {
    for (const dx of [-span, 0, span]) {
      g.save();
      g.translate(px + dx, py);
      g.scale(rx * soft, ry * soft);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
      gr.addColorStop(0, rgba(c, a));
      gr.addColorStop(0.55, rgba(c, a * 0.75));
      gr.addColorStop(1, rgba(c, 0));
      g.fillStyle = gr;
      g.beginPath();
      g.arc(0, 0, 1, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  };
  for (let i = 0; i < o.n; i++) {
    const cx = range(r, -PAD, W + PAD);
    const cy = range(r, o.y0, o.y1);
    const w = range(r, o.w0, o.w1);
    for (let k = 0; k < 9; k++) {
      const px = cx + (r() - 0.5) * w;
      const py = cy + (r() - 0.5) * w * o.flat * 0.4;
      const rx = w * range(r, 0.14, 0.3);
      const ry = rx * o.flat * range(r, 0.7, 1.2);
      puff(px, py, rx, ry, o.color, o.alpha * range(r, 0.5, 1));
      if (o.lit) puff(px, py + ry * 0.45, rx * 0.85, ry * 0.45, o.lit, (o.litAlpha ?? 0.5) * range(r, 0.4, 1));
    }
  }
}

/* ── City pieces ───────────────────────────────────────────────────────────── */

export interface Light {
  x: number;
  y: number;
  c: RGB;
  a: number;
  r: number;
}

const WARM: RGB[] = [
  [255, 200, 130],
  [255, 214, 160],
  [255, 180, 110],
  [255, 226, 180],
];
const COOL: RGB[] = [
  [210, 230, 255],
  [190, 215, 255],
  [235, 240, 255],
];

/**
 * A hillside town at dusk, packed like Istanbul: rows of apartment blocks climbing the slope,
 * far rows small and hazy, near rows bigger with window grids, dark tree clumps in between.
 * Returns a sample of the lit windows so the scene can reflect them in the water.
 */
export function hillTown(
  g: CanvasRenderingContext2D,
  r: Rng,
  o: {
    ridge: readonly (readonly [number, number])[];
    bottom: (x: number) => number;
    x0: number;
    x1: number;
    fill: string;
    house: RGB;
    density: number;
    warm?: number;
    haze?: RGB;
    hazeA?: number;
    size?: number;
    /** Snow on every roof. */
    snow?: boolean;
  },
): Light[] {
  g.save();
  g.beginPath();
  g.moveTo(o.x0, o.bottom(o.x0));
  for (let x = o.x0; x <= o.x1; x += 6) g.lineTo(x, polyY(o.ridge, x));
  g.lineTo(o.x1, polyY(o.ridge, o.x1));
  for (let x = o.x1; x >= o.x0; x -= 6) g.lineTo(x, o.bottom(x));
  g.closePath();
  g.fillStyle = o.fill;
  g.fill();
  g.beginPath();
  g.moveTo(o.x0, o.bottom(o.x0));
  for (let x = o.x0; x <= o.x1; x += 6) g.lineTo(x, polyY(o.ridge, x) - 16);
  g.lineTo(o.x1, polyY(o.ridge, o.x1) - 16);
  for (let x = o.x1; x >= o.x0; x -= 6) g.lineTo(x, o.bottom(x));
  g.closePath();
  g.clip();
  const lights: Light[] = [];
  const top = Math.min(...o.ridge.map((p) => p[1]));
  let bot = 0;
  for (let x = o.x0; x <= o.x1; x += 20) bot = Math.max(bot, o.bottom(x));
  const size = o.size ?? 1;
  const haze = o.haze ?? [120, 100, 120];
  // rows from the ridge (far) down to the shore (near), so near blocks overlap far ones
  for (let y = top - 6; y < bot + 20; ) {
    const d = Math.min(1, Math.max(0, (y - top) / Math.max(1, bot - top)));
    const s = size * (0.45 + d * 1.6);
    for (let x = o.x0 - 10; x < o.x1 + 10; ) {
      const ridgeY = polyY(o.ridge, x);
      const w = s * range(r, 7, 15);
      if (y > ridgeY - 6 && y < o.bottom(x) + 4) {
        if (r() < 0.1) {
          // trees
          g.fillStyle = rgba([22, 26, 30], 0.9);
          g.beginPath();
          g.ellipse(x + w / 2, y + s * 2, w * 0.7, s * range(r, 3, 5), 0, 0, Math.PI * 2);
          g.fill();
        } else if (r() < 0.8 * o.density) {
          const h = s * range(r, 6, 15) * (r() < 0.08 ? 2 : 1);
          const hz = (1 - d) * (o.hazeA ?? 0.3) * 0.7;
          const tone = scale(o.house, range(r, 0.6, 1.05));
          g.fillStyle = rgba(mix(tone, haze, hz));
          g.fillRect(x, y - h, w, h);
          g.fillStyle = rgba(mix(scale(tone, 1.5), haze, hz), 0.55);
          g.fillRect(x, y - h, w, Math.max(0.6, s * 0.45));
          if (o.snow) {
            g.fillStyle = rgba(mix([226, 232, 244], haze, hz * 0.6), 0.9);
            g.fillRect(x - s * 0.3, y - h - s * 0.9, w + s * 0.6, Math.max(0.8, s * 1.2));
          }
          // windows
          const cols = Math.max(1, Math.round(w / (s * 2.6)));
          const rows = Math.max(1, Math.round(h / (s * 3)));
          const ww = Math.max(0.8, s * 1.1);
          const wh = Math.max(0.7, s * 1.2);
          for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
              if (r() > 0.3) continue;
              const c = r() < (o.warm ?? 0.8) ? pick(r, WARM) : pick(r, COOL);
              const a = range(r, 0.5, 1) * (0.55 + d * 0.45);
              const wx = x + ((i + 0.5) * w) / cols - ww / 2;
              const wy = y - h + ((j + 0.55) * h) / rows - wh / 2;
              g.fillStyle = rgba(c, a);
              g.fillRect(wx, wy, ww, wh);
              if (lights.length < 3000 && r() < 0.35) lights.push({ x: wx + ww / 2, y: wy + wh / 2, c, a, r: ww });
            }
          }
        }
      }
      x += w + s * range(r, 1, 5);
    }
    y += s * range(r, 4, 6.5);
  }
  // street lamps strung along the winding streets
  for (let k = 0; k < Math.round((o.x1 - o.x0) / 60); k++) {
    let x = range(r, o.x0, o.x1);
    let y = range(r, top, bot);
    const dir = r() < 0.5 ? 1 : -1;
    for (let i = 0; i < 26; i++) {
      x += dir * range(r, 5, 9);
      y += range(r, -2, 3.5);
      if (y < polyY(o.ridge, x) || y > o.bottom(x)) continue;
      g.fillStyle = 'rgba(255,170,90,0.9)';
      g.fillRect(x, y, 1.6, 1.6);
      if (lights.length < 3000 && r() < 0.4) lights.push({ x, y, c: [255, 170, 90], a: 0.9, r: 1.6 });
    }
  }
  // atmospheric haze towards the ridge
  g.fillStyle = vGradient(g, top - 10, top + (bot - top) * 0.55, [
    [0, rgba(haze, (o.hazeA ?? 0.3) * 0.9)],
    [1, rgba(haze, 0)],
  ]);
  g.fillRect(o.x0 - 10, top - 20, o.x1 - o.x0 + 20, bot - top + 40);
  g.restore();
  return lights;
}

/** A modern tower with a glass curtain wall and lit office floors. Returns its roof point. */
export function tower(
  g: CanvasRenderingContext2D,
  r: Rng,
  x: number,
  baseY: number,
  w: number,
  h: number,
  o: { body: RGB; lit?: number; warm?: number; crown?: 'flat' | 'slant' | 'spire' | 'pyramid' | 'step'; haze?: number; floor?: number },
) {
  const top = baseY - h;
  const edge = scale(o.body, 1.35);
  const gr = g.createLinearGradient(x, 0, x + w, 0);
  gr.addColorStop(0, rgba(scale(o.body, 0.75)));
  gr.addColorStop(0.55, rgba(o.body));
  gr.addColorStop(1, rgba(edge));
  g.fillStyle = gr;
  g.beginPath();
  if (o.crown === 'slant') {
    g.moveTo(x, baseY);
    g.lineTo(x, top + w * 0.5);
    g.lineTo(x + w, top);
    g.lineTo(x + w, baseY);
  } else if (o.crown === 'pyramid') {
    g.moveTo(x, baseY);
    g.lineTo(x, top + w * 0.35);
    g.lineTo(x + w / 2, top - w * 0.25);
    g.lineTo(x + w, top + w * 0.35);
    g.lineTo(x + w, baseY);
  } else if (o.crown === 'step') {
    g.moveTo(x, baseY);
    g.lineTo(x, top + h * 0.12);
    g.lineTo(x + w * 0.15, top + h * 0.12);
    g.lineTo(x + w * 0.15, top);
    g.lineTo(x + w * 0.85, top);
    g.lineTo(x + w * 0.85, top + h * 0.12);
    g.lineTo(x + w, top + h * 0.12);
    g.lineTo(x + w, baseY);
  } else {
    g.rect(x, top, w, h);
  }
  g.closePath();
  g.fill();
  g.save();
  g.clip();
  // floors
  const floorH = o.floor ?? Math.max(3, w / 9);
  const cols = Math.max(2, Math.round(w / 5));
  for (let fy = top + floorH; fy < baseY - 2; fy += floorH) {
    const floorLit = r() < (o.lit ?? 0.5);
    for (let c = 0; c < cols; c++) {
      if (!floorLit && r() > 0.12) continue;
      if (floorLit && r() < 0.18) continue;
      const col = r() < (o.warm ?? 0.35) ? pick(r, WARM) : pick(r, COOL);
      g.fillStyle = rgba(col, range(r, 0.35, 0.85));
      g.fillRect(x + (c * w) / cols + 0.8, fy - floorH * 0.72, w / cols - 1.4, floorH * 0.55);
    }
  }
  // glass reflection sheen
  const sheen = g.createLinearGradient(x, top, x + w, baseY);
  sheen.addColorStop(0, 'rgba(255,255,255,0.08)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
  sheen.addColorStop(1, 'rgba(255,255,255,0.04)');
  g.fillStyle = sheen;
  g.fillRect(x, top - w, w, h + w);
  if (o.haze) {
    g.fillStyle = `rgba(120,110,140,${o.haze})`;
    g.fillRect(x, top - w, w, h + w);
  }
  g.restore();
  if (o.crown === 'spire') {
    g.strokeStyle = rgba(edge);
    g.lineWidth = Math.max(1, w * 0.04);
    g.beginPath();
    g.moveTo(x + w / 2, top);
    g.lineTo(x + w / 2, top - h * 0.14);
    g.stroke();
    return { x: x + w / 2, y: top - h * 0.14 };
  }
  return { x: x + w / 2, y: o.crown === 'pyramid' ? top - w * 0.25 : top };
}

/** Floodlit Ottoman mosque silhouette — dome, semi-domes, minarets with balconies. */
export function mosque(
  g: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  s: number,
  o: { stone: RGB; lit: RGB; litA: number; minarets: 2 | 4; windows?: boolean; minaretH?: number; snow?: boolean },
) {
  const body = g.createLinearGradient(0, baseY - 90 * s, 0, baseY);
  body.addColorStop(0, rgba(o.stone));
  body.addColorStop(1, rgba(mix(o.stone, o.lit, o.litA)));
  // lead domes: rounded shading, lit from the floodlights below
  const dome = g.createRadialGradient(x - 14 * s, baseY - 84 * s, 4 * s, x, baseY - 60 * s, 46 * s);
  dome.addColorStop(0, rgba(mix(scale(o.stone, 1.05), o.lit, o.litA * 0.5)));
  dome.addColorStop(0.6, rgba(scale(o.stone, 0.7)));
  dome.addColorStop(1, rgba(mix(scale(o.stone, 0.55), o.lit, o.litA * 0.6)));
  const snowCap = (cx: number, cy: number, rx: number, ry: number) => {
    if (!o.snow) return;
    g.save();
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, 0, Math.PI, 0);
    g.clip();
    const sg = g.createLinearGradient(0, cy - ry, 0, cy - ry * 0.35);
    sg.addColorStop(0, 'rgba(240,244,252,0.95)');
    sg.addColorStop(1, 'rgba(220,228,242,0.0)');
    g.fillStyle = sg;
    g.fillRect(cx - rx, cy - ry, rx * 2, ry * 0.75);
    g.restore();
  };
  const mh = (o.minaretH ?? 120) * s;
  const minaretXs = o.minarets === 4 ? [-92, -70, 70, 92] : [-72, 72];
  // minarets behind
  for (const mx of minaretXs) {
    const cx = x + mx * s;
    const h = Math.abs(mx) > 80 ? mh * 0.82 : mh;
    g.fillStyle = body;
    g.fillRect(cx - 3 * s, baseY - h, 6 * s, h);
    g.fillStyle = rgba(mix(o.stone, o.lit, o.litA * 0.8));
    for (const f of [0.55, 0.75, 0.9].slice(0, Math.abs(mx) > 80 ? 2 : 3)) g.fillRect(cx - 5 * s, baseY - h * f, 10 * s, 2.2 * s);
    g.fillStyle = rgba(scale(o.stone, 0.6));
    g.beginPath();
    g.moveTo(cx - 3.6 * s, baseY - h);
    g.lineTo(cx, baseY - h - 22 * s);
    g.lineTo(cx + 3.6 * s, baseY - h);
    g.fill();
    if (o.snow) {
      g.fillStyle = 'rgba(236,241,250,0.9)';
      g.beginPath();
      g.moveTo(cx - 1.6 * s, baseY - h - 12 * s);
      g.lineTo(cx, baseY - h - 22 * s);
      g.lineTo(cx + 1.6 * s, baseY - h - 12 * s);
      g.fill();
      for (const f of [0.55, 0.75, 0.9]) g.fillRect(cx - 5 * s, baseY - h * f - 1 * s, 10 * s, 1 * s);
    }
  }
  // base block
  g.fillStyle = body;
  g.fillRect(x - 62 * s, baseY - 44 * s, 124 * s, 44 * s);
  // semi-domes and corner domes
  g.fillStyle = dome;
  for (const [dx, rx, ry, by] of [
    [-40, 22, 17, 44],
    [40, 22, 17, 44],
    [-56, 8, 7, 44],
    [56, 8, 7, 44],
  ] as const) {
    g.beginPath();
    g.ellipse(x + dx * s, baseY - by * s, rx * s, ry * s, 0, Math.PI, 0);
    g.fill();
    snowCap(x + dx * s, baseY - by * s, rx * s, ry * s);
  }
  // drum + main dome
  g.fillStyle = body;
  g.fillRect(x - 30 * s, baseY - 58 * s, 60 * s, 16 * s);
  g.fillStyle = dome;
  g.beginPath();
  g.ellipse(x, baseY - 58 * s, 34 * s, 32 * s, 0, Math.PI, 0);
  g.fill();
  snowCap(x, baseY - 58 * s, 34 * s, 32 * s);
  if (o.snow) {
    g.fillStyle = 'rgba(236,241,250,0.85)';
    g.fillRect(x - 62 * s, baseY - 45.5 * s, 124 * s, 1.6 * s);
  }
  g.strokeStyle = rgba(mix(o.stone, o.lit, o.litA));
  g.lineWidth = 1.4 * s;
  g.beginPath();
  g.moveTo(x, baseY - 90 * s);
  g.lineTo(x, baseY - 100 * s);
  g.stroke();
  if (o.windows) {
    g.fillStyle = rgba([255, 214, 150], 0.85);
    for (let i = -5; i <= 5; i++) {
      g.fillRect(x + i * 10 * s - 2 * s, baseY - 30 * s, 4 * s, 9 * s);
      if (Math.abs(i) < 3) g.fillRect(x + i * 10 * s - 1.5 * s, baseY - 54 * s, 3 * s, 7 * s);
    }
  }
}

/** Galata Tower: stone cylinder, lit gallery, conical cap. */
export function galata(g: CanvasRenderingContext2D, x: number, baseY: number, s: number) {
  const stone = g.createLinearGradient(x - 13 * s, 0, x + 13 * s, 0);
  stone.addColorStop(0, '#6d5a4a');
  stone.addColorStop(0.5, '#d7b88f');
  stone.addColorStop(1, '#7a6250');
  g.fillStyle = stone;
  g.beginPath();
  g.moveTo(x - 14 * s, baseY);
  g.lineTo(x - 12 * s, baseY - 120 * s);
  g.lineTo(x + 12 * s, baseY - 120 * s);
  g.lineTo(x + 14 * s, baseY);
  g.fill();
  g.fillStyle = 'rgba(40,30,24,0.55)';
  for (let i = 0; i < 4; i++) g.fillRect(x - 2 * s, baseY - (30 + i * 24) * s, 4 * s, 7 * s);
  g.fillStyle = '#5a4a3d';
  g.fillRect(x - 15 * s, baseY - 124 * s, 30 * s, 4 * s);
  g.fillStyle = '#ffd89a';
  g.fillRect(x - 13 * s, baseY - 138 * s, 26 * s, 14 * s);
  g.fillStyle = 'rgba(60,40,30,0.8)';
  for (let i = -2; i <= 2; i++) g.fillRect(x + i * 5 * s - 0.8 * s, baseY - 138 * s, 1.6 * s, 14 * s);
  g.fillStyle = '#3d4552';
  g.beginPath();
  g.moveTo(x - 15 * s, baseY - 138 * s);
  g.lineTo(x, baseY - 182 * s);
  g.lineTo(x + 15 * s, baseY - 138 * s);
  g.fill();
}

/** Snow settled on Galata Tower's cone and gallery. */
export function galataSnow(g: CanvasRenderingContext2D, x: number, baseY: number, s: number) {
  g.fillStyle = 'rgba(236,241,250,0.92)';
  g.beginPath();
  g.moveTo(x - 9 * s, baseY - 156 * s);
  g.lineTo(x, baseY - 182 * s);
  g.lineTo(x + 6 * s, baseY - 160 * s);
  g.lineTo(x + 2 * s, baseY - 158 * s);
  g.closePath();
  g.fill();
  g.fillRect(x - 15 * s, baseY - 125 * s, 30 * s, 1.5 * s);
}

/* ── People ────────────────────────────────────────────────────────────────── */

export interface WalkerLook {
  color: string;
  rim?: string;
  umbrella?: string | null;
  bag?: 0 | 1 | 2 | 3;
  coat?: number;
  phone?: boolean;
}

/**
 * A walking silhouette, feet at (x, y), height h. `phase` drives the gait.
 * `facing` side = profile walking along x (dir ±1); front/back = walking towards/away.
 */
export function walker(g: CanvasRenderingContext2D, x: number, y: number, h: number, phase: number, dir: 1 | -1, look: WalkerLook, facing: 'side' | 'front' = 'side', stand = false) {
  const sw = stand ? 0 : Math.sin(phase);
  const bob = stand ? 0 : Math.abs(Math.cos(phase)) * h * 0.014;
  const legL = h * 0.47;
  const hipY = y - legL + bob;
  const shY = hipY - h * 0.3;
  const draw = (color: string, off: number) => {
    g.fillStyle = color;
    g.strokeStyle = color;
    g.lineCap = 'round';
    if (facing === 'side') {
      g.lineWidth = h * 0.075;
      for (const s of [1, -1]) {
        const a = sw * 0.42 * s;
        g.beginPath();
        g.moveTo(x + off, hipY);
        g.lineTo(x + off + Math.sin(a) * legL * dir, hipY + Math.cos(a) * legL - bob);
        g.stroke();
      }
      // coat / torso
      const coat = look.coat ?? 0.12;
      g.beginPath();
      g.moveTo(x + off - h * 0.06 * dir, shY);
      g.lineTo(x + off + h * 0.07 * dir, shY);
      g.lineTo(x + off + h * 0.08 * dir, hipY + h * coat);
      g.lineTo(x + off - h * 0.08 * dir, hipY + h * coat);
      g.closePath();
      g.fill();
      // arms
      g.lineWidth = h * 0.05;
      if (look.umbrella) {
        g.beginPath();
        g.moveTo(x + off, shY + h * 0.04);
        g.lineTo(x + off + h * 0.12 * dir, shY - h * 0.06);
        g.stroke();
      } else {
        const a = -sw * 0.5;
        g.beginPath();
        g.moveTo(x + off, shY + h * 0.03);
        g.lineTo(x + off + Math.sin(a) * h * 0.3 * dir, shY + h * 0.03 + Math.cos(a) * h * 0.3);
        g.stroke();
        if (look.bag === 1) g.fillRect(x + off + Math.sin(a) * h * 0.3 * dir - h * 0.06, shY + h * 0.03 + Math.cos(a) * h * 0.3, h * 0.12, h * 0.09);
      }
      if (look.bag === 2) g.fillRect(x + off - h * 0.16 * dir - (dir < 0 ? -h * 0.02 : h * 0.02), shY + h * 0.02, h * 0.1 * 1, h * 0.17);
      // head
      g.beginPath();
      g.arc(x + off + h * 0.01 * dir, shY - h * 0.085, h * 0.063, 0, Math.PI * 2);
      g.fill();
    } else {
      // front / back: legs alternate, arms by the sides
      g.lineWidth = h * 0.07;
      for (const s of [1, -1]) {
        const lift = Math.max(0, sw * s) * h * 0.05;
        g.beginPath();
        g.moveTo(x + off + s * h * 0.04, hipY);
        g.lineTo(x + off + s * h * 0.05, y - lift);
        g.stroke();
      }
      g.beginPath();
      g.moveTo(x + off - h * 0.1, shY);
      g.lineTo(x + off + h * 0.1, shY);
      g.lineTo(x + off + h * 0.11, hipY + h * (look.coat ?? 0.12));
      g.lineTo(x + off - h * 0.11, hipY + h * (look.coat ?? 0.12));
      g.closePath();
      g.fill();
      g.lineWidth = h * 0.045;
      for (const s of [1, -1]) {
        if (look.umbrella && s === 1) continue;
        g.beginPath();
        g.moveTo(x + off + s * h * 0.11, shY + h * 0.03);
        g.lineTo(x + off + s * h * 0.13, shY + h * (0.3 + sw * s * 0.03));
        g.stroke();
      }
      g.beginPath();
      g.arc(x + off, shY - h * 0.085, h * 0.063, 0, Math.PI * 2);
      g.fill();
    }
  };
  if (look.rim) draw(look.rim, dir * -Math.max(0.6, h * 0.008));
  draw(look.color, 0);
  if (look.umbrella) {
    const ux = x + (facing === 'side' ? h * 0.12 * dir : h * 0.1);
    const uy = shY - h * 0.2;
    const ur = h * 0.36;
    g.strokeStyle = look.color;
    g.lineWidth = Math.max(1, h * 0.012);
    g.beginPath();
    g.moveTo(ux, shY - h * 0.02);
    g.lineTo(ux, uy);
    g.stroke();
    g.fillStyle = look.umbrella;
    g.beginPath();
    g.moveTo(ux - ur, uy + ur * 0.12);
    g.quadraticCurveTo(ux - ur * 0.9, uy - ur * 0.62, ux, uy - ur * 0.66);
    g.quadraticCurveTo(ux + ur * 0.9, uy - ur * 0.62, ux + ur, uy + ur * 0.12);
    for (let i = 4; i >= 0; i--) {
      const x0 = ux - ur + (ur * 2 * i) / 4;
      const x1 = ux - ur + (ur * 2 * (i + 1)) / 4;
      if (i < 4) g.quadraticCurveTo((x0 + x1) / 2, uy + ur * 0.02, x0, uy + ur * 0.12);
    }
    g.closePath();
    g.fill();
    if (look.rim) {
      g.strokeStyle = look.rim;
      g.lineWidth = Math.max(0.8, h * 0.008);
      g.beginPath();
      g.moveTo(ux - ur * 0.9, uy - ur * 0.1);
      g.quadraticCurveTo(ux - ur * 0.7, uy - ur * 0.6, ux, uy - ur * 0.66);
      g.stroke();
    }
  }
}

/** A crowd walking left/right on a band of the stage, drawn back to front. */
export interface Pedestrian {
  x: number;
  y: number;
  h: number;
  v: number;
  dir: 1 | -1;
  phase: number;
  look: WalkerLook;
}

export function stepCrowd(ps: Pedestrian[], dt: number, x0: number, x1: number) {
  for (const p of ps) {
    // v is a walking speed in m/s; a walker's height h stands for ~1.7 m.
    p.x += p.v * p.dir * dt * (p.h / 1.7);
    p.phase += dt * p.v * 4.2;
    if (p.dir > 0 && p.x > x1) p.x = x0;
    if (p.dir < 0 && p.x < x0) p.x = x1;
  }
}

export function drawCrowd(g: CanvasRenderingContext2D, ps: Pedestrian[]) {
  for (const p of ps) walker(g, p.x, p.y, p.h, p.phase, p.dir, p.look);
}

/* ── Birds ─────────────────────────────────────────────────────────────────── */

export function gull(g: CanvasRenderingContext2D, x: number, y: number, s: number, flap: number, color: string) {
  const tip = -Math.sin(flap) * 5 * s;
  g.strokeStyle = color;
  g.lineWidth = Math.max(1, 1.6 * s);
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x - 12 * s, y + tip);
  g.quadraticCurveTo(x - 6 * s, y - 4 * s - tip * 0.3, x, y);
  g.quadraticCurveTo(x + 6 * s, y - 4 * s - tip * 0.3, x + 12 * s, y + tip);
  g.stroke();
}

/* ── Weather ───────────────────────────────────────────────────────────────── */

export interface Drop {
  x: number;
  y: number;
  z: number;
  v: number;
}

export function makeDrops(r: Rng, n: number): Drop[] {
  return Array.from({ length: n }, () => ({ x: range(r, -100, W + 100), y: range(r, -100, H), z: range(r, 0.25, 1), v: range(r, 0.8, 1.2) }));
}

/** Rain streaks in three depth buckets, slanted by the wind. */
export function rain(g: CanvasRenderingContext2D, drops: Drop[], dt: number, wind: number, color: RGB, alpha: number) {
  for (const d of drops) {
    d.y += (900 + d.z * 900) * d.v * dt;
    d.x += wind * d.z * dt * 900;
    if (d.y > H + 20) {
      d.y = -40 - Math.random() * 60;
      d.x = Math.random() * (W + 200) - 100;
    }
  }
  for (const [lo, hi, lw, a] of [
    [0, 0.5, 0.8, 0.22],
    [0.5, 0.8, 1.2, 0.3],
    [0.8, 1.01, 1.8, 0.38],
  ] as const) {
    g.strokeStyle = rgba(color, a * alpha);
    g.lineWidth = lw;
    g.beginPath();
    for (const d of drops) {
      if (d.z < lo || d.z >= hi) continue;
      const len = 14 + d.z * 26;
      g.moveTo(d.x, d.y);
      g.lineTo(d.x - wind * len, d.y - len);
    }
    g.stroke();
  }
}

/** Snowflakes with depth of field: near flakes are big and soft, far ones are pinpoints. */
export function snow(g: CanvasRenderingContext2D, flakes: Drop[], dt: number, t: number, alpha: number) {
  const sprite = glowSprite([255, 255, 255]);
  for (const f of flakes) {
    f.y += (18 + f.z * 70) * f.v * dt;
    f.x += (Math.sin(t * 0.7 + f.v * 20) * 14 + 10) * f.z * dt;
    if (f.y > H + 20) {
      f.y = -20;
      f.x = Math.random() * (W + 200) - 100;
    }
    const r = f.z < 0.85 ? 1 + f.z * 3.2 : 6 + (f.z - 0.85) * 60;
    g.globalAlpha = alpha * (f.z < 0.85 ? 0.35 + f.z * 0.6 : 0.35);
    g.drawImage(sprite, f.x - r, f.y - r, r * 2, r * 2);
  }
  g.globalAlpha = 1;
}

/* ── Water ─────────────────────────────────────────────────────────────────── */

export interface Reflection {
  x: number;
  y: number;
  c: RGB;
  a: number;
  w: number;
  len: number;
  seed: number;
}

/** Shimmering light columns on water: broken, wobbling dashes that fade with distance from shore. */
export function reflections(g: CanvasRenderingContext2D, items: Reflection[], t: number) {
  for (const it of items) {
    const n = Math.max(2, Math.round(it.len / 5));
    const sprite = glowSprite(it.c);
    for (let j = 0; j < n; j++) {
      const yy = it.y + j * 5 + 2;
      const wob = Math.sin(t * 1.6 + it.seed + j * 0.9) * it.w * 0.45 + Math.sin(t * 0.8 + j * 2.3 + it.seed * 2) * it.w * 0.25;
      const a = it.a * (1 - j / n) * (0.45 + 0.55 * Math.max(0, Math.sin(t * 2.4 + it.seed * 3 + j * 1.7)));
      if (a < 0.02) continue;
      g.globalAlpha = a;
      g.drawImage(sprite, it.x + wob - it.w, yy - 2, it.w * 2, 4);
    }
  }
  g.globalAlpha = 1;
}
