import { W, H, type RGB, type Rng, rgba, range, glowSprite } from './paint';

/** Gün sonu sahneleri için hava ve su: yağmur, kar ve denize yansıyan ışık. */

/* ── Hava ───────────────────────────────────────────────────────────────────── */

export interface Drop {
  x: number;
  y: number;
  z: number;
  v: number;
}

export function makeDrops(r: Rng, n: number): Drop[] {
  return Array.from({ length: n }, () => ({ x: range(r, -100, W + 100), y: range(r, -100, H), z: range(r, 0.25, 1), v: range(r, 0.8, 1.2) }));
}

/** Rüzgârla eğilmiş, üç derinlik kümesinde yağmur çizgileri. */
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

/** Alan derinlikli kar taneleri: yakın taneler büyük ve yumuşak, uzaktakiler iğne ucu. */
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

/* ── Su ─────────────────────────────────────────────────────────────────────── */

export interface Reflection {
  x: number;
  y: number;
  c: RGB;
  a: number;
  w: number;
  len: number;
  seed: number;
}

/** Suda parıldayan ışık sütunları: kıyıdan uzaklaştıkça solan, kırık, titreyen çizgiler. */
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
