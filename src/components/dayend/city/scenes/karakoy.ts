import {
  H,
  PAD,
  W,
  clouds,
  drawLayer,
  glow,
  glowRect,
  gull,
  hillTown,
  makeDrops,
  makeLayer,
  makeRng,
  mosque,
  range,
  reflections,
  rgba,
  snow,
  vGradient,
  type Cam,
  type Reflection,
  type RGB,
} from '../kit';
import { project, type Persp } from '../traffic';
import type { CityScene } from '../scene';

/*
 * Karaköy, 17:45 — snow, from the ferry pier, looking across the Golden Horn at Galata Bridge.
 * Composed after a real photograph from this spot: the bridge runs from big on the right to
 * small on the left in true perspective; its lower level of fish restaurants is a long band of
 * gold, lamp posts line the upper deck; Yeni Cami glows at the far end, with
 * Süleymaniye on the hill above; the dark water throws everything back in broken gold.
 */

const P: Persp = { vpx: 820, vpy: 474, f: 900, camH: 3 };
// Bridge axis (world metres): near end at Karaköy (right), far end at Eminönü (left).
const NEAR = { X: 34, Z: 36 };
const FAR = { X: -340, Z: 620 };
const LEN = Math.hypot(FAR.X - NEAR.X, FAR.Z - NEAR.Z);
// the side of the bridge that faces us
const SX = -(FAR.Z - NEAR.Z) / LEN;
const SZ = (FAR.X - NEAR.X) / LEN;
const HALF = 20;
const DECK = 8.5;
const RAIL = DECK + 1.1;
const LOW = [1.3, 5.2] as const;
const BAY = 6;
const SODIUM: RGB = [255, 186, 110];
const WARM: RGB = [255, 200, 130];
const WATER_Y = P.vpy + 3;
const S0 = -0.022; // the bridge runs on past the right edge of the frame
const SHOP_LIGHT: RGB[] = [
  [255, 196, 118],
  [255, 214, 150],
  [255, 228, 186],
  [255, 176, 104],
  [255, 206, 140],
  [255, 168, 128],
];

const at = (s: number, off = HALF, Y = 0) => {
  const X = NEAR.X + (FAR.X - NEAR.X) * s + SX * off;
  const Z = NEAR.Z + (FAR.Z - NEAR.Z) * s + SZ * off;
  return project(P, X, Y, Z);
};
// sample positions along the bridge at even world spacing
const along = (step: number, from = S0 * LEN) => {
  const out: number[] = [];
  for (let d = from; d <= LEN; d += step) out.push(d / LEN);
  return out;
};

type Pt = readonly [number, number, number];
const quad = (g: CanvasRenderingContext2D, pts: Pt[]) => {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath();
  g.fill();
};
/** A band along the whole bridge face between two heights. */
const band = (g: CanvasRenderingContext2D, y0: number, y1: number, off = HALF, s0 = S0, s1 = 1) =>
  quad(g, [at(s0, off, y0), at(s1, off, y0), at(s1, off, y1), at(s0, off, y1)]);

const streaks = new Map<string, HTMLCanvasElement>();
/** A soft horizontal dash of light: flat bright core, feathered ends — one broken ripple of reflection. */
function streak(c: RGB) {
  const key = c.join();
  let s = streaks.get(key);
  if (s) return s;
  s = document.createElement('canvas');
  s.width = 64;
  s.height = 12;
  const g = s.getContext('2d')!;
  const gx = g.createLinearGradient(0, 0, 64, 0);
  gx.addColorStop(0, rgba(c, 0));
  gx.addColorStop(0.25, rgba(c, 0.9));
  gx.addColorStop(0.5, rgba([255, (c[1] + 255) / 2, (c[2] + 200) / 2], 1));
  gx.addColorStop(0.75, rgba(c, 0.9));
  gx.addColorStop(1, rgba(c, 0));
  g.fillStyle = gx;
  g.fillRect(0, 0, 64, 12);
  g.globalCompositeOperation = 'destination-in';
  const gy = g.createLinearGradient(0, 0, 0, 12);
  gy.addColorStop(0, 'rgba(0,0,0,0)');
  gy.addColorStop(0.5, 'rgba(0,0,0,1)');
  gy.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gy;
  g.fillRect(0, 0, 64, 12);
  streaks.set(key, s);
  return s;
}
const dash = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: RGB, a: number) => {
  if (a < 0.02 || w < 0.5) return;
  g.globalAlpha = a > 1 ? 1 : a;
  g.drawImage(streak(c), x - w / 2, y - h / 2, w, h);
  g.globalAlpha = 1;
};

export function karakoyScene(): CityScene {
  const r = makeRng(1453);
  const flakes = makeDrops(r, 1000);
  const bays = along(BAY).map((s) => ({ s, c: SHOP_LIGHT[Math.floor(r() * SHOP_LIGHT.length)], a: range(r, 0.75, 1), seed: r() * 10 }));
  const lamps = along(26, 6);
  const gulls = Array.from({ length: 9 }, () => ({ cx: range(r, 600, 1500), cy: range(r, 180, 380), rad: range(r, 60, 200), sp: range(r, 0.2, 0.45), ph: range(r, 0, 6), s: range(r, 0.8, 1.3) }));
  let refl: Reflection[] = [];
  let skyL: HTMLCanvasElement;
  let cityL: HTMLCanvasElement;
  let bridgeL: HTMLCanvasElement;
  let railL: HTMLCanvasElement;
  let pierL: HTMLCanvasElement;
  let cloudL: HTMLCanvasElement;
  let lastDt = 1 / 60;

  return {
    caption: 'Karaköy İskelesi · Kar yağıyor — Galata Köprüsü, son vapur.',
    build(px) {
      const rb = makeRng(8);
      skyL = makeLayer(px, (g) => {
        // blue hour under snow clouds, the city's sodium glow along the horizon
        g.fillStyle = vGradient(g, -PAD, WATER_Y, [
          [0, '#0c162c'],
          [0.4, '#1b2d4c'],
          [0.78, '#34496e'],
          [1, '#5e6584'],
        ]);
        g.fillRect(-PAD, -PAD, W + PAD * 2, WATER_Y + PAD);
        g.globalCompositeOperation = 'lighter';
        glowRect(g, 500, 450, 1500, 200, [255, 150, 90], 0.16);
        glowRect(g, 300, 420, 700, 160, [255, 170, 110], 0.12);
        g.globalCompositeOperation = 'source-over';
      });
      cloudL = makeLayer(px, (g) => {
        const rc = makeRng(2);
        clouds(g, rc, { y0: -100, y1: 220, n: 26, w0: 340, w1: 700, flat: 0.28, color: [26, 36, 58], alpha: 0.7, lit: [130, 116, 126], litAlpha: 0.2, blur: 22 });
        clouds(g, rc, { y0: 200, y1: 340, n: 14, w0: 240, w1: 480, flat: 0.22, color: [66, 78, 108], alpha: 0.35, lit: [190, 150, 130], litAlpha: 0.2, blur: 16 });
      });
      cityL = makeLayer(px, (g) => {
        // the historic peninsula beyond the bridge, snow on its roofs
        const hill = hillTown(g, rb, {
          ridge: [
            [-PAD, 404],
            [120, 372],
            [300, 352],
            [480, 342],
            [620, 356],
            [760, 392],
            [900, 428],
            [1040, 452],
            [1200, 466],
          ],
          bottom: () => WATER_Y,
          x0: -PAD,
          x1: 1200,
          fill: '#131829',
          house: [46, 46, 62],
          density: 1.2,
          warm: 0.9,
          haze: [90, 98, 130],
          hazeA: 0.4,
          size: 0.6,
          snow: true,
        });
        // Karaköy's waterfront on the right, mostly hidden behind the bridge's near end
        hillTown(g, rb, {
          ridge: [
            [1200, 466],
            [1330, 424],
            [1460, 398],
            [W + PAD, 386],
          ],
          bottom: () => WATER_Y,
          x0: 1200,
          x1: W + PAD,
          fill: '#151a2a',
          house: [52, 48, 60],
          density: 1,
          warm: 0.8,
          haze: [110, 118, 150],
          hazeA: 0.45,
          size: 0.85,
          snow: true,
        });
        // Süleymaniye crowning the hill, Yeni Cami at the water by the bridge's far end
        mosque(g, 520, 352, 0.9, { stone: [168, 160, 170], lit: [255, 210, 150], litA: 0.85, minarets: 4, windows: true, minaretH: 118, snow: true });
        mosque(g, 300, WATER_Y - 6, 0.82, { stone: [176, 164, 160], lit: [255, 206, 146], litA: 0.95, minarets: 2, windows: true, minaretH: 104, snow: true });
        // Eminönü quay
        g.fillStyle = '#0e111c';
        g.fillRect(-PAD, WATER_Y - 6, 520, 8);
        // water
        g.fillStyle = vGradient(g, WATER_Y, H + PAD, [
          [0, '#26304a'],
          [0.08, '#131a2d'],
          [0.5, '#0a0f1c'],
          [1, '#04060c'],
        ]);
        g.fillRect(-PAD, WATER_Y, W + PAD * 2, H - WATER_Y + PAD);
        // choppy surface: short dark and light strokes that widen towards us
        for (let i = 0; i < 1300; i++) {
          const y = range(rb, WATER_Y + 1, H + PAD);
          const d = (y - WATER_Y) / (H - WATER_Y);
          g.fillStyle = rb() < 0.45 ? `rgba(140,160,210,${0.03 + d * 0.05})` : `rgba(0,0,6,${0.14 + d * 0.16})`;
          g.fillRect(range(rb, -PAD, W + PAD), y, range(rb, 8, 60) * (0.2 + d * 1.4), 0.6 + d * 2.2);
        }
        refl = hill
          .filter((l) => l.y > WATER_Y - 70 && rb() < 0.5)
          .slice(0, 180)
          .map((l) => ({ x: l.x, y: WATER_Y + 2, c: l.c, a: 0.4, w: 2.5, len: 30 + rb() * 50, seed: rb() * 10 }));
        refl.push({ x: 300, y: WATER_Y + 2, c: WARM, a: 0.55, w: 28, len: 150, seed: 2 });
      });

      bridgeL = makeLayer(px, (g) => {
        // underside and the low quay the restaurants stand on
        g.fillStyle = '#090a10';
        band(g, 0.2, LOW[0] + 0.1);
        // restaurant bays: glass fronts lit from inside, dark columns between them
        for (const b of bays) {
          const s0 = b.s - (BAY - 0.7) / LEN;
          const s1 = b.s;
          const bot0 = at(s0, HALF - 1.2, LOW[0]);
          const top0 = at(s0, HALF - 1.2, LOW[1]);
          const k = bot0[2];
          const gr = g.createLinearGradient(0, top0[1], 0, bot0[1]);
          gr.addColorStop(0, rgba(b.c, b.a));
          gr.addColorStop(0.55, rgba([b.c[0], b.c[1] * 0.86, b.c[2] * 0.72], b.a));
          gr.addColorStop(1, rgba([b.c[0] * 0.7, b.c[1] * 0.45, b.c[2] * 0.3], b.a));
          g.fillStyle = gr;
          band(g, LOW[0], LOW[1], HALF - 1.2, s0, s1);
          if (k < 2) continue;
          // what's inside: the counter and a row of hanging lamps (no one at the tables in this snow)
          g.fillStyle = 'rgba(70,34,20,0.55)';
          band(g, LOW[0], LOW[0] + 1, HALF - 1.2, s0, s1);
          for (let i = 0; i < 3; i++) {
            const p = at(s0 + ((i + 0.5) * (BAY - 0.7)) / 3 / LEN, HALF - 1.4, LOW[1] - 1.25);
            g.fillStyle = 'rgba(255,236,190,0.85)';
            g.beginPath();
            g.ellipse(p[0], p[1], k * 0.12, k * 0.08, 0, 0, Math.PI * 2);
            g.fill();
          }
          // mullions and transom
          g.fillStyle = 'rgba(30,20,18,0.8)';
          for (let i = 1; i < 3; i++) band(g, LOW[0], LOW[1], HALF - 1.2, s0 + (i * (BAY - 0.7)) / 3 / LEN - 0.06 / LEN, s0 + (i * (BAY - 0.7)) / 3 / LEN + 0.06 / LEN);
          band(g, LOW[1] - 0.95, LOW[1] - 0.85, HALF - 1.2, s0, s1);
        }
        // columns between bays
        g.fillStyle = '#121320';
        for (const b of bays) band(g, LOW[0], LOW[1], HALF - 1.1, b.s, b.s + 0.7 / LEN);
        // awnings and the sign band with the restaurants' names
        g.fillStyle = '#1a1417';
        band(g, LOW[1], LOW[1] + 0.5, HALF - 0.6);
        g.fillStyle = '#15171f';
        band(g, LOW[1] + 0.5, LOW[1] + 1.3, HALF - 0.4);
        for (const b of bays) {
          const s0 = b.s - (BAY - 1.6) / LEN;
          const p0 = at(s0, HALF - 0.4, LOW[1] + 0.75);
          const p1 = at(b.s - 1.2 / LEN, HALF - 0.4, LOW[1] + 0.75);
          const k = p0[2];
          if (k < 1.6 || rb() < 0.3) continue;
          g.fillStyle = rb() < 0.75 ? 'rgba(255,240,210,0.85)' : rb() < 0.5 ? 'rgba(120,200,255,0.8)' : 'rgba(255,110,90,0.8)';
          const n = 4 + Math.floor(rb() * 5);
          for (let i = 0; i < n; i++) {
            const t0 = (i + 0.1) / n;
            const x = p0[0] + (p1[0] - p0[0]) * t0;
            const y = p0[1] + (p1[1] - p0[1]) * t0;
            g.fillRect(x, y - k * 0.2, Math.max(0.6, ((p1[0] - p0[0]) / n) * 0.7), Math.max(0.6, k * 0.34));
          }
        }
        g.globalCompositeOperation = 'lighter';
        for (const b of bays) {
          for (let i = 0; i < 2; i++) {
            const p = at(b.s - ((i + 0.5) * BAY) / 2 / LEN, HALF - 0.8, LOW[1] - 0.1);
            glow(g, p[0], p[1], Math.max(2, p[2] * 0.9), [255, 226, 180], 0.7, true);
          }
        }
        g.globalCompositeOperation = 'source-over';
        // the upper deck's steel fascia
        const fg = g.createLinearGradient(0, at(0, HALF, DECK)[1], 0, at(0, HALF, LOW[1] + 1.3)[1]);
        fg.addColorStop(0, '#2a2f40');
        fg.addColorStop(1, '#171a26');
        g.fillStyle = fg;
        band(g, LOW[1] + 1.3, DECK);
        g.fillStyle = 'rgba(160,170,200,0.25)';
        band(g, DECK - 0.15, DECK);
      });

      railL = makeLayer(px, (g) => {
        // the parapet along the deck, snow along its top
        g.fillStyle = 'rgba(20,23,34,0.96)';
        band(g, DECK, DECK + 0.25);
        band(g, RAIL - 0.2, RAIL);
        g.strokeStyle = 'rgba(28,31,44,0.95)';
        for (const s of along(1.4)) {
          const b = at(s, HALF, DECK + 0.2);
          const t = at(s, HALF, RAIL - 0.2);
          if (b[2] < 1.4) break;
          g.lineWidth = Math.max(0.5, b[2] * 0.06);
          g.beginPath();
          g.moveTo(b[0], b[1]);
          g.lineTo(t[0], t[1]);
          g.stroke();
        }
        g.fillStyle = 'rgba(20,23,34,0.6)';
        band(g, DECK + 0.25, RAIL - 0.2, HALF, 0.55, 1);
        g.fillStyle = 'rgba(238,242,250,0.92)';
        band(g, RAIL, RAIL + 0.16);
      });

      pierL = makeLayer(px, (g) => {
        // the floating pier we stand on: snowy deck, tyre fenders, railing, the pier's sign
        g.fillStyle = vGradient(g, 820, H + PAD, [
          [0, '#8f98b2'],
          [0.3, '#5e6682'],
          [1, '#262b3e'],
        ]);
        g.beginPath();
        g.moveTo(1030, H + PAD);
        g.lineTo(1150, 830);
        g.lineTo(W + PAD, 816);
        g.lineTo(W + PAD, H + PAD);
        g.fill();
        g.fillStyle = '#10121a';
        g.beginPath();
        g.moveTo(1150, 830);
        g.lineTo(W + PAD, 816);
        g.lineTo(W + PAD, 838);
        g.lineTo(1146, 850);
        g.fill();
        g.fillStyle = '#050608';
        for (let x = 1160; x < W + PAD; x += 42) {
          g.beginPath();
          g.ellipse(x, 846 - (x - 1150) * 0.013, 13, 9, 0, 0, Math.PI * 2);
          g.fill();
        }
        for (let i = 0; i < 200; i++) {
          const y = range(rb, 836, H + PAD);
          g.fillStyle = rb() < 0.6 ? 'rgba(255,255,255,0.5)' : 'rgba(30,34,50,0.35)';
          g.fillRect(range(rb, 1090 - (y - 830) * 0.6 + 60, W + PAD), y, range(rb, 4, 24), 1.3);
        }
        // railing along the edge
        g.strokeStyle = '#0c0e15';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(1160, 792);
        g.lineTo(W + PAD, 778);
        g.stroke();
        g.lineWidth = 2;
        for (let x = 1170; x < W + PAD; x += 36) {
          const y = 792 - (x - 1160) * 0.0265;
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x, y + 38);
          g.stroke();
        }
        g.strokeStyle = 'rgba(238,242,250,0.85)';
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(1160, 790);
        g.lineTo(W + PAD, 776);
        g.stroke();
        // lamp post and the yellow pier sign
        g.strokeStyle = '#0d0f16';
        g.lineWidth = 5;
        g.beginPath();
        g.moveTo(1520, 830);
        g.lineTo(1520, 640);
        g.stroke();
        g.fillStyle = '#0d0f16';
        g.fillRect(1508, 628, 24, 14);
        g.fillStyle = 'rgba(240,244,252,0.9)';
        g.fillRect(1506, 625, 28, 4);
        g.fillStyle = '#0d0f16';
        g.fillRect(1316, 716, 4, 110);
        g.fillRect(1466, 712, 4, 110);
        g.fillStyle = '#e8b925';
        g.fillRect(1306, 688, 174, 38);
        g.fillStyle = 'rgba(240,244,252,0.92)';
        g.fillRect(1304, 684, 178, 5);
        g.fillStyle = '#1a1712';
        g.font = '800 25px system-ui, -apple-system, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('KARAKÖY', 1393, 709);
      });
    },
    update(dt) {
      lastDt = dt;
    },
    draw(g, t, cam: Cam) {
      drawLayer(g, skyL, cam, 0.15);
      const off = (t * 3) % (W + PAD * 2);
      g.save();
      g.translate(cam.x * 0.2, cam.y * 0.2);
      g.drawImage(cloudL, -PAD + off, -PAD, W + PAD * 2, H + PAD * 2);
      g.drawImage(cloudL, -PAD + off - (W + PAD * 2), -PAD, W + PAD * 2, H + PAD * 2);
      g.restore();

      g.save();
      g.translate(cam.x * 0.5, cam.y * 0.5);
      g.drawImage(cityL, -PAD, -PAD, W + PAD * 2, H + PAD * 2);
      g.globalCompositeOperation = 'lighter';
      const breathe = 0.88 + Math.sin(t * 0.6) * 0.06;
      glow(g, 520, 300, 130, WARM, 0.2 * breathe);
      glow(g, 300, 430, 120, WARM, 0.32 * breathe);
      reflections(g, refl, t);
      g.globalCompositeOperation = 'source-over';
      g.restore();

      g.save();
      g.translate(cam.x, cam.y);
      // the last ferry of the evening crossing in front of Eminönü
      const ft = (t / 110 + 0.1) % 1;
      const fp = project(P, -420 - ft * 640, 0, 560);
      g.globalAlpha = Math.min(1, ft * 12);
      ferry(g, fp[0], fp[1], fp[2] * 0.3, t);
      g.globalAlpha = 1;

      g.drawImage(bridgeL, -PAD, -PAD, W + PAD * 2, H + PAD * 2);
      g.drawImage(railL, -PAD, -PAD, W + PAD * 2, H + PAD * 2);
      // lamp posts on the upper deck
      g.strokeStyle = '#1c202d';
      for (const s of lamps) {
        const b = at(s, HALF - 0.5, RAIL);
        const tp = at(s, HALF - 0.5, DECK + 8);
        g.lineWidth = Math.max(0.8, b[2] * 0.16);
        g.beginPath();
        g.moveTo(b[0], b[1]);
        g.lineTo(tp[0], tp[1]);
        g.stroke();
        g.fillStyle = 'rgba(236,241,250,0.85)';
        g.fillRect(tp[0] - b[2] * 0.3, tp[1] - b[2] * 0.2, b[2] * 0.6, Math.max(1, b[2] * 0.1));
      }

      g.globalCompositeOperation = 'lighter';
      // the restaurant band spills gold onto the water: broken, wobbling streaks
      for (const b of bays) {
        const sm = b.s - BAY / 2 / LEN;
        const m = at(sm, HALF - 1.2, 3.3);
        const k = m[2];
        if (m[0] < -200 || m[0] > W + 200) continue;
        const w0 = Math.abs(at(b.s - BAY / LEN, HALF, 0)[0] - at(b.s, HALF, 0)[0]);
        glow(g, m[0], m[1], Math.max(6, k * 3.4), b.c, 0.26);
        const y0 = at(sm, HALF, -LOW[0] * 0.6)[1];
        const y1 = at(sm, HALF, -LOW[1] * 1.9)[1];
        glowRect(g, m[0], (y0 + y1) / 2, w0 * 1.2, (y1 - y0) * 1.1, b.c, 0.16);
        const rows = Math.max(3, Math.min(18, Math.round((y1 - y0) / Math.max(1.6, k * 0.34))));
        for (let j = 0; j < rows; j++) {
          const f = j / rows;
          const yy = y0 + (y1 - y0) * f;
          const wob = Math.sin(t * 1.7 + b.seed + j * 1.1) * w0 * 0.22 + Math.sin(t * 0.9 + j * 2.3 + b.seed * 2) * w0 * 0.12;
          const a = b.a * (0.95 - f * 0.75) * (0.35 + 0.65 * Math.max(0, Math.sin(t * 2.2 + b.seed * 3 + j * 1.9)));
          dash(g, m[0] + wob, yy, w0 * (0.55 + 0.35 * Math.sin(b.seed * 4 + j * 2.1)), Math.max(1.2, k * 0.28), b.c, a);
        }
      }
      // lamp heads: white-hot cores with a starburst, and their columns on the water
      for (const s of lamps) {
        const tp = at(s, HALF - 0.5, DECK + 7.9);
        const k = tp[2];
        glow(g, tp[0], tp[1], Math.max(4, k * 1.2), [255, 238, 204], 1, true);
        glow(g, tp[0], tp[1], Math.max(10, k * 5), SODIUM, 0.3);
        glowRect(g, tp[0], tp[1], Math.max(12, k * 8), Math.max(1, k * 0.12), [255, 232, 196], 0.5);
        glowRect(g, tp[0], tp[1], Math.max(1, k * 0.12), Math.max(10, k * 6), [255, 232, 196], 0.36);
        const wy0 = at(s, HALF - 0.5, -LOW[1])[1];
        const wy1 = at(s, HALF - 0.5, -(DECK + 7.9))[1];
        for (let j = 0; j < 7; j++) {
          const yy = wy0 + ((wy1 - wy0) * j) / 7;
          dash(g, tp[0] + Math.sin(t * 2 + s * 40 + j) * k * 0.5, yy, Math.max(3, k * 1.1), Math.max(1, k * 0.22), SODIUM, (0.7 - j * 0.08) * (0.5 + 0.5 * Math.sin(t * 3 + j + s * 90)));
        }
      }
      g.globalCompositeOperation = 'source-over';

      // gulls in the lamplight
      for (const b of gulls) {
        const a = t * b.sp + b.ph;
        gull(g, b.cx + Math.cos(a) * b.rad, b.cy + Math.sin(a) * b.rad * 0.3, b.s, t * 7 + b.ph, 'rgba(236,238,246,0.8)');
      }

      // our pier
      g.drawImage(pierL, -PAD, -PAD, W + PAD * 2, H + PAD * 2);
      g.globalCompositeOperation = 'lighter';
      glow(g, 1520, 636, 14, [255, 226, 180], 1, true);
      glow(g, 1520, 636, 90, SODIUM, 0.22);
      glowRect(g, 1480, 860, 300, 60, SODIUM, 0.2);
      glowRect(g, 1393, 706, 220, 60, [255, 200, 90], 0.12);
      g.globalCompositeOperation = 'source-over';
      g.restore();

      snow(g, flakes, lastDt, t, 0.9);
      // cold mist hanging over the water
      g.fillStyle = vGradient(g, 380, 560, [
        [0, 'rgba(120,130,160,0)'],
        [0.5, 'rgba(120,130,160,0.1)'],
        [1, 'rgba(120,130,160,0)'],
      ]);
      g.fillRect(0, 0, W, H);
    },
  };
}

/** A Şehir Hatları ferry side-on at night: dark hull, black band, two decks of warm windows, cream funnel with a black top. */
function ferry(g: CanvasRenderingContext2D, x: number, y: number, s: number, t: number) {
  if (s < 0.08 || x < -300) return;
  const fade = g.globalAlpha;
  g.save();
  g.translate(x, y + Math.sin(t * 0.8) * s);
  g.scale(s, s);
  g.scale(-1, 1);
  g.fillStyle = '#9b978d';
  g.beginPath();
  g.moveTo(-110, -2);
  g.lineTo(118, -2);
  g.quadraticCurveTo(130, 6, 120, 20);
  g.lineTo(-104, 20);
  g.quadraticCurveTo(-120, 8, -110, -2);
  g.fill();
  g.fillStyle = '#0d1018';
  g.fillRect(-106, 14, 222, 7);
  g.fillStyle = '#8e897e';
  g.fillRect(-92, -24, 190, 22);
  g.fillStyle = '#827d72';
  g.fillRect(-64, -37, 128, 13);
  g.fillStyle = 'rgba(220,224,232,0.8)';
  g.fillRect(-95, -27, 196, 3);
  g.fillStyle = '#b89440';
  g.fillRect(96, -58, 3, 34);
  g.fillStyle = '#b8ad92';
  g.fillRect(-10, -62, 20, 26);
  g.fillStyle = '#0d1018';
  g.fillRect(-10, -62, 20, 6);
  g.fillStyle = '#ffd08e';
  for (let i = 0; i < 18; i++) g.fillRect(-98 + i * 12, 2, 7, 8);
  for (let i = 0; i < 14; i++) g.fillRect(-86 + i * 13, -19, 8, 10);
  g.globalCompositeOperation = 'lighter';
  glowRect(g, 0, -6, 320, 60, [255, 190, 120], 0.22 * fade);
  for (let i = 0; i < 18; i += 2) dash(g, -94 + i * 12 + Math.sin(t * 2 + i) * 3, 30 + (i % 4) * 6, 22, 5, [255, 190, 120], 0.5 * fade);
  glow(g, 118, 2, 10, [255, 240, 210], 0.9 * fade, true);
  glow(g, 98, -58, 6, [255, 90, 80], 0.8 * fade, true);
  g.globalCompositeOperation = 'source-over';
  g.restore();
}
