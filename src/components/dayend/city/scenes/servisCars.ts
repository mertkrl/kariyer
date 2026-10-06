import { glow, glowRect, pick, range, rgba, type RGB, type Rng } from '../kit';
import { BW, KC } from './servisLayout';

/** The lane beside the servis: the cars stuck next to you, and how each is drawn side-on. */

export type VKind = 'car' | 'taxi' | 'servis' | 'van';

export interface Car {
  rx: number;
  v: number;
  kind: VKind;
  len: number;
  body: RGB;
  brake: number;
}

const PAINT: RGB[] = [
  [205, 206, 210],
  [30, 30, 34],
  [118, 124, 134],
  [150, 22, 26],
  [26, 44, 88],
  [90, 60, 40],
];

/** The next lane, bumper to bumper; positions are relative to us (m, positive = ahead). */
export function makeCars(r: Rng): Car[] {
  const cars: Car[] = [];
  for (let x = -38; x < 42; ) {
    const roll = r();
    const kind: VKind = roll < 0.35 ? 'servis' : roll < 0.55 ? 'taxi' : roll < 0.65 ? 'van' : 'car';
    const len = kind === 'servis' ? 8.4 : kind === 'van' ? 5.2 : 4.5;
    cars.push({ rx: x + len / 2, v: 0, kind, len, body: kind === 'servis' ? [234, 234, 228] : kind === 'taxi' ? [236, 184, 20] : pick(r, PAINT), brake: 1 });
    x += len + range(r, 1.2, 2.6);
  }
  return cars;
}

export function sideCar(g: CanvasRenderingContext2D, c: Car, t: number) {
  // front of the car points left (ahead); rear on the right
  const x = BW / 2 - c.rx * KC - (c.len * KC) / 2;
  const len = c.len * KC;
  const ground = 158;
  if (x > BW + 10 || x + len < -10) return;
  const shade = (f: number) => rgba([c.body[0] * f, c.body[1] * f, c.body[2] * f]);
  if (c.kind === 'servis' || c.kind === 'van') {
    const h = (c.kind === 'servis' ? 2.85 : 2.2) * KC;
    g.fillStyle = shade(0.5);
    g.beginPath();
    g.roundRect(x, ground - h, len, h - 6, [10, 5, 3, 3]);
    g.fill();
    // dark tinted window band: nothing inside shows, only the street reflected in it
    g.fillStyle = c.kind === 'servis' ? '#161a22' : '#1a1f28';
    g.fillRect(x + 12, ground - h + 8, len - 22, h * 0.36);
    if (c.kind === 'servis') {
      g.fillStyle = 'rgba(190,200,225,0.12)';
      g.fillRect(x + 12, ground - h + 8, len - 22, h * 0.09);
      g.fillStyle = 'rgba(255,170,120,0.07)';
      g.fillRect(x + 12, ground - h + 8 + h * 0.27, len - 22, h * 0.09);
      g.fillStyle = 'rgba(8,9,12,0.9)';
      for (let px = x + 12 + (len - 22) / 3; px < x + len - 12; px += (len - 22) / 3) g.fillRect(px, ground - h + 8, 2.5, h * 0.36);
      g.fillStyle = 'rgba(40,80,150,0.8)';
      g.fillRect(x + 4, ground - h * 0.42, len - 8, 3);
      g.fillStyle = '#121216';
      g.fillRect(x + 6, ground - h + 1, 40, 7);
      g.fillStyle = '#ffae4a';
      g.font = '800 5.5px monospace';
      g.textBaseline = 'middle';
      g.fillText('SERVİS', x + 9, ground - h + 4.6);
    }
  } else {
    // sedan profile: body + cabin
    g.fillStyle = shade(0.42);
    g.beginPath();
    g.moveTo(x + 4, ground - 8);
    g.lineTo(x + 2, ground - 20);
    g.quadraticCurveTo(x + 6, ground - 26, x + len * 0.22, ground - 27);
    g.lineTo(x + len * 0.34, ground - 40);
    g.lineTo(x + len * 0.72, ground - 41);
    g.lineTo(x + len * 0.88, ground - 28);
    g.quadraticCurveTo(x + len - 2, ground - 26, x + len - 2, ground - 16);
    g.lineTo(x + len - 4, ground - 8);
    g.closePath();
    g.fill();
    g.fillStyle = '#141922';
    g.beginPath();
    g.moveTo(x + len * 0.36, ground - 37);
    g.lineTo(x + len * 0.52, ground - 38);
    g.lineTo(x + len * 0.52, ground - 28);
    g.lineTo(x + len * 0.27, ground - 28);
    g.closePath();
    g.moveTo(x + len * 0.55, ground - 38);
    g.lineTo(x + len * 0.7, ground - 38);
    g.lineTo(x + len * 0.83, ground - 28);
    g.lineTo(x + len * 0.55, ground - 28);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.12)';
    g.fillRect(x + 6, ground - 24, len - 12, 1.2);
    if (c.kind === 'taxi') {
      g.fillStyle = '#ffe08a';
      g.fillRect(x + len * 0.45, ground - 45, 14, 4);
    }
  }
  // wheels
  g.fillStyle = '#0b0b0e';
  for (const wx of [x + len * 0.18, x + len * 0.8]) {
    g.beginPath();
    g.arc(wx, ground - 4, 7, 0, Math.PI * 2);
    g.fill();
  }
  // lights: tail (right end), head (left end)
  g.globalCompositeOperation = 'lighter';
  const tail = 0.55 + c.brake * 0.45;
  glow(g, x + len - 2, ground - 20, 6 + c.brake * 6, [255, 34, 26], tail, true);
  glowRect(g, x + len - 2, ground + 4, 10, 24, [255, 40, 30], 0.35 * tail);
  glow(g, x + 3, ground - 18, 8, [255, 240, 220], 0.9, true);
  glowRect(g, x - 30, ground - 4, 80, 10, [255, 230, 200], 0.18);
  if (c.kind === 'taxi') glow(g, x + len * 0.45 + 7, ground - 43, 8, [255, 214, 90], 0.7);
  if (c.kind === 'servis' || c.kind === 'van') {
    if (Math.sin(t * 5 + c.rx) > 0) glow(g, x + len - 3, ground - 30, 7, [255, 170, 40], 0.9, true);
  }
  g.globalCompositeOperation = 'source-over';
}
