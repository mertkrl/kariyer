/*
 * Gün sonu şehir sahneleri için küçük canvas araç takımı: 1600×900 sanal sahne, paralakslı önceden
 * çizilmiş sabit katmanlar, önbelleğe alınmış ışık sprite'ları (şehirdeki her ışık eklemeli bir
 * parıltıdır), tohumlu rastgelelik ve geri kalanın üstüne kurulduğu çizim yardımcıları.
 */

export const W = 1600;
export const H = 900;
/** Kamera kenarları göstermeden kayabilsin diye her katmanın çevresine çizilen ek pay. */
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

/** x'e göre sıralı noktalardan geçen parçalı doğrusal y(x). */
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

/** Noktalardan geçen yumuşak kapalı/açık yol (Catmull-Rom). */
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

/** Sahneyi ve her yanında PAD kadar payı kaplayan önceden çizilmiş bir katman. */
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

/* ── Işık sprite'ları ──────────────────────────────────────────────────────── */

const sprites = new Map<string, HTMLCanvasElement>();

/** Radyal parıltı sprite'ı; `hot` gerçek bir lamba ya da far gibi beyaz sıcak bir çekirdek ekler. */
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

/** Eklemeli parıltı; çağıran globalCompositeOperation = 'lighter' ayarlar. */
export function glow(g: CanvasRenderingContext2D, x: number, y: number, r: number, c: RGB, a = 1, hot = false) {
  if (r < 0.3 || a < 0.01) return;
  g.globalAlpha = a > 1 ? 1 : a;
  g.drawImage(glowSprite(c, hot), x - r, y - r, r * 2, r * 2);
  g.globalAlpha = 1;
}

/** Gerilmiş parıltı: suda / ıslak asfaltta yansımalar, mercek çizgileri, ışık havuzları. */
export function glowRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: RGB, a = 1) {
  if (w < 0.3 || h < 0.3 || a < 0.01) return;
  g.globalAlpha = a > 1 ? 1 : a;
  g.drawImage(glowSprite(c), x - w / 2, y - h / 2, w, h);
  g.globalAlpha = 1;
}

/* ── Gökyüzü ve atmosfer ───────────────────────────────────────────────────── */

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
 * Yumuşak bulut kümeleri; gün batımıyla ya da şehrin turuncu parıltısıyla alttan aydınlanmış.
 * Katman kesintisiz döşenir (sahneler iki kopyayı yan yana kaydırır): her öbek bir katman genişliği
 * solda ve sağda da çizilir, böylece kopyaların buluştuğu yerde hiçbir şey kesilmez.
 */
export function clouds(g: CanvasRenderingContext2D, r: Rng, o: CloudOpts) {
  const span = W + PAD * 2;
  // yumuşaklık her öbeğin kendi azalmasından gelir (bulanıklık filtresi katmanın kenarlarını soldururdu)
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
