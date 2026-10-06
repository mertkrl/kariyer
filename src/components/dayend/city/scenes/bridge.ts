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
  hsl,
  makeLayer,
  makeRng,
  mosque,
  polyY,
  range,
  reflections,
  smoothPath,
  stars,
  vGradient,
  type Cam,
  type Reflection,
} from '../kit';
import { drawTraffic, jostle, populate, project, stepLane, type Lane, type Persp } from '../traffic';
import type { CityScene } from '../scene';

/*
 * Ortaköy, 17:10 — the 15 Temmuz Şehitler Köprüsü at sunset, seen from the hillside above the
 * mosque. The Europe → Asia lanes are a solid river of brake lights (everyone going home to the
 * Anatolian side), the other way flows. The bridge's LEDs cycle colours, a vapur crosses, gulls
 * hang over the water and the lamps come on along the empty promenade below.
 */

const P: Persp = { vpx: 800, vpy: 400, f: 900, camH: 110 };
// Bridge axis in world metres: near (European) tower N → far (Asian) tower F.
const N = { X: -170, Z: 260 };
const F = { X: 546, Z: 1060 };
const SPAN = Math.hypot(F.X - N.X, F.Z - N.Z);
const AX = (F.X - N.X) / SPAN;
const AZ = (F.Z - N.Z) / SPAN;
// right-hand side of the axis direction (towards the camera)
const RX = AZ;
const RZ = -AX;
const DECK = 64;
const TOWER = 165;
const S0 = -0.2;
const S1 = 1.62;

const axis = (s: number, off = 0) => ({ X: N.X + (F.X - N.X) * s + RX * off, Z: N.Z + (F.Z - N.Z) * s + RZ * off });
const cableY = (s: number) => {
  if (s < 0) return 66 + (TOWER - 66) * Math.pow(Math.max(0, (s + 0.2) / 0.2), 1.7);
  if (s > 1) return 66 + (TOWER - 66) * Math.pow(Math.max(0, (1.22 - s) / 0.22), 1.7);
  return TOWER - 4 * (TOWER - 70) * s * (1 - s);
};

// Coastlines (screen space): Europe on the left, Asia on the right, water in between.
const EURO_COAST: [number, number][] = [
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
const ASIA_COAST: [number, number][] = [
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

export function bridgeScene(): CityScene {
  const r = makeRng(1973);
  const lane = (off: number, dir: 1 | -1): Lane => {
    const L = (S1 - S0) * SPAN;
    const at =
      dir > 0
        ? (u: number) => {
            const p = axis(S0 + u / SPAN, off);
            return { ...p, dx: AX, dz: AZ };
          }
        : (u: number) => {
            const p = axis(S1 - u / SPAN, off);
            return { ...p, dx: -AX, dz: -AZ };
          };
    return { at, length: L, Y: DECK + 0.3, vehicles: [] };
  };
  const lanes: Lane[] = [];
  // Europe → Asia (away from us, right side of the deck = camera side): jammed
  for (const off of [2.4, 5.9, 9.4]) {
    const l = lane(off, 1);
    populate(l, r, { spacing: [2.6, 6], v0: [4, 7.5], taxi: 0.16, bus: 0.03, van: 0.1 });
    lanes.push(l);
  }
  // Asia → Europe: moving
  for (const off of [-2.4, -5.9, -9.4]) {
    const l = lane(off, -1);
    populate(l, r, { spacing: [14, 32], v0: [14, 19], taxi: 0.14 });
    lanes.push(l);
  }
  for (let i = 0; i < 700; i++) {
    for (const l of lanes) stepLane(l, 0.05);
    jostle(lanes, 0.05, 0.8);
  }

  // coastal roads (Çırağan / Beylerbeyi): streams of head- and tail-lights along the shore
  const roads = [
    { pts: EURO_COAST.slice(1).map(([x, y]) => [x - 9, y - 4] as [number, number]), cars: [] as { u: number; v: number; dir: 1 | -1 }[] },
    { pts: ASIA_COAST.map(([x, y]) => [x, y - 6] as [number, number]), cars: [] as { u: number; v: number; dir: 1 | -1 }[] },
  ];
  for (const rd of roads) {
    for (let i = 0; i < 70; i++) rd.cars.push({ u: r(), v: range(r, 0.006, 0.014), dir: r() < 0.5 ? 1 : -1 });
  }
  const boats = spawnBoats(r);

  const gulls = Array.from({ length: 9 }, () => ({ x: range(r, 0, W), y: range(r, 120, 520), s: range(r, 0.8, 1.6), v: range(r, 14, 30), ph: range(r, 0, 6), bob: range(r, 0, 6) }));

  let refl: Reflection[] = [];
  const beacons: { x: number; y: number; ph: number }[] = [];
  let skyL: HTMLCanvasElement;
  let landL: HTMLCanvasElement;
  let bridgeBack: HTMLCanvasElement;
  let bridgeFront: HTMLCanvasElement;
  let cloudL: HTMLCanvasElement;
  let fg: HTMLCanvasElement;

  const pr = (X: number, Y: number, Z: number) => project(P, X, Y, Z);
  const pa = (s: number, off: number, Y: number) => {
    const a = axis(s, off);
    return pr(a.X, Y, a.Z);
  };

  const drawCable = (g: CanvasRenderingContext2D, off: number, width: number) => {
    g.beginPath();
    for (let s = S0; s <= 1.22; s += 0.01) {
      const [x, y] = pa(s, off, cableY(s));
      if (s === S0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.lineWidth = width;
    g.stroke();
    g.lineWidth = 0.7;
    g.beginPath();
    for (let s = -0.18; s < 1.2; s += 18 / SPAN) {
      if (Math.abs(s) < 0.01 || Math.abs(s - 1) < 0.01) continue;
      const [x0, y0] = pa(s, off, cableY(s));
      const [x1, y1] = pa(s, off, DECK + 1);
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
    }
    g.stroke();
  };
  const drawLeg = (g: CanvasRenderingContext2D, s: number, off: number) => {
    const a = axis(s, off);
    const [x0, y0, k] = pr(a.X, 0, a.Z);
    const [, y1] = pr(a.X, TOWER + 4, a.Z);
    const gr = g.createLinearGradient(0, y1, 0, y0);
    gr.addColorStop(0, '#3b3548');
    gr.addColorStop(0.6, '#5a4a5c');
    gr.addColorStop(1, '#2c2632');
    g.fillStyle = gr;
    g.fillRect(x0 - 3.2 * k, y1, 6.4 * k, y0 - y1);
  };

  return {
    caption: 'Ortaköy · 15 Temmuz Şehitler Köprüsü — Anadolu yakasına dönüş başladı.',
    build(px) {
      const rb = makeRng(11);
      beacons.length = 0;
      skyL = makeLayer(px, (g) => {
        g.fillStyle = vGradient(g, -PAD, P.vpy + 10, [
          [0, '#141c3a'],
          [0.3, '#2c2f5c'],
          [0.52, '#6a4570'],
          [0.72, '#c9606a'],
          [0.88, '#f39a5c'],
          [1, '#ffc37a'],
        ]);
        g.fillRect(-PAD, -PAD, W + PAD * 2, P.vpy + PAD + 12);
        stars(g, rb, 60, 160, 0.5);
        // sun sinking behind the far hills, right on the Bosphorus
        g.globalCompositeOperation = 'lighter';
        glow(g, 770, 398, 520, [255, 120, 60], 0.35);
        glow(g, 770, 398, 220, [255, 170, 90], 0.55);
        glowRect(g, 770, 396, 1400, 90, [255, 150, 90], 0.3);
        g.globalCompositeOperation = 'source-over';
        g.fillStyle = '#ffe2a6';
        g.beginPath();
        g.arc(770, 400, 26, Math.PI, 0);
        g.fill();
        // far northern hills + the FSM bridge in the haze
        g.fillStyle = '#6b4a66';
        g.beginPath();
        smoothPath(g, [
          [560, 410],
          [640, 396],
          [720, 399],
          [800, 393],
          [880, 398],
          [960, 408],
        ]);
        g.lineTo(960, 412);
        g.lineTo(560, 412);
        g.fill();
        g.strokeStyle = 'rgba(80,50,74,0.9)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(700, 398);
        g.lineTo(700, 384);
        g.moveTo(820, 396);
        g.lineTo(820, 383);
        g.moveTo(680, 398);
        g.quadraticCurveTo(760, 398, 840, 397);
        g.stroke();
      });
      cloudL = makeLayer(px, (g) => {
        const rc = makeRng(3);
        clouds(g, rc, { y0: 40, y1: 220, n: 18, w0: 260, w1: 560, flat: 0.18, color: [80, 58, 96], alpha: 0.4, lit: [255, 140, 110], litAlpha: 0.4, blur: 12 });
        clouds(g, rc, { y0: 250, y1: 360, n: 12, w0: 200, w1: 420, flat: 0.16, color: [150, 80, 100], alpha: 0.3, lit: [255, 180, 120], litAlpha: 0.5, blur: 9 });
      });
      landL = makeLayer(px, (g) => {
        // the Bosphorus, reflecting the sunset
        g.fillStyle = vGradient(g, P.vpy, H + PAD, [
          [0, '#f0a068'],
          [0.08, '#b86a74'],
          [0.3, '#5a3f66'],
          [0.7, '#241f3e'],
          [1, '#101226'],
        ]);
        g.fillRect(-PAD, P.vpy, W + PAD * 2, H - P.vpy + PAD);
        // sun path on the water
        g.globalCompositeOperation = 'lighter';
        glowRect(g, 770, 470, 90, 160, [255, 160, 90], 0.35);
        g.globalCompositeOperation = 'source-over';
        // ripples
        for (let i = 0; i < 700; i++) {
          const y = range(rb, P.vpy + 4, H + PAD);
          const d = (y - P.vpy) / (H - P.vpy);
          g.fillStyle = rb() < 0.5 ? `rgba(255,190,150,${0.05 + d * 0.05})` : `rgba(10,10,30,${0.1 + d * 0.1})`;
          g.fillRect(range(rb, -PAD, W + PAD), y, range(rb, 10, 60) * (0.3 + d), 0.8 + d * 1.2);
        }
        // Europe: Ortaköy / Beşiktaş / Etiler hillside
        const euro = hillTown(g, rb, {
          ridge: [
            [-PAD, 250],
            [120, 270],
            [300, 300],
            [480, 350],
            [620, 392],
            [705, 404],
          ],
          bottom: euroBottom,
          x0: -PAD,
          x1: 705,
          fill: '#1b1624',
          house: [44, 36, 50],
          density: 1,
          warm: 0.85,
          haze: [240, 150, 120],
          hazeA: 0.4,
        });
        // Asia: Beylerbeyi / Çamlıca
        const asia = hillTown(g, rb, {
          ridge: [
            [838, 402],
            [1000, 372],
            [1200, 330],
            [1420, 300],
            [1520, 292],
            [W + PAD, 300],
          ],
          bottom: (x) => polyY(ASIA_COAST, x),
          x0: 838,
          x1: W + PAD,
          fill: '#1e1828',
          house: [46, 38, 54],
          density: 1,
          warm: 0.8,
          haze: [240, 160, 130],
          hazeA: 0.45,
        });
        // stone quays catch the last light
        g.strokeStyle = 'rgba(255,190,150,0.35)';
        g.lineWidth = 1.4;
        g.beginPath();
        EURO_COAST.slice(1).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.stroke();
        g.beginPath();
        ASIA_COAST.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.stroke();
        // Çamlıca tower
        g.fillStyle = '#231b2c';
        g.beginPath();
        g.moveTo(1484, 300);
        g.lineTo(1492, 150);
        g.lineTo(1500, 150);
        g.lineTo(1508, 300);
        g.fill();
        g.fillRect(1486, 172, 20, 14);
        g.fillRect(1494, 96, 4, 56);
        beacons.push({ x: 1496, y: 96, ph: 0 }, { x: 1496, y: 176, ph: 1.4 });
        // shoreline lights reflected
        // lights close to the water throw shimmering columns across it
        refl = [
          ...euro.filter((l) => l.x > 470 && euroBottom(l.x) - l.y < 40).map((l) => ({ ...l, shore: euroBottom(l.x) })),
          ...asia.filter((l) => polyY(ASIA_COAST, l.x) - l.y < 40).map((l) => ({ ...l, shore: polyY(ASIA_COAST, l.x) })),
        ]
          .filter((l) => l.a > 0.5 && rb() < 0.7)
          .slice(0, 320)
          .map((l) => ({ x: l.x, y: l.shore + 2, c: l.c, a: 0.5, w: 4, len: 30 + rb() * 90, seed: rb() * 10 }));
        // Ortaköy mosque on the waterfront + quay
        g.fillStyle = '#1c1622';
        g.beginPath();
        smoothPath(g, [
          [-PAD, 840],
          [200, 836],
          [400, 846],
          [470, 858],
          [520, 880],
          [560, 910],
        ]);
        g.lineTo(560, H + PAD);
        g.lineTo(-PAD, H + PAD);
        g.fill();
        mosque(g, 420, 842, 0.95, { stone: [150, 128, 132], lit: [255, 214, 160], litA: 0.75, minarets: 2, windows: true, minaretH: 118 });
      });
      bridgeBack = makeLayer(px, (g) => {
        // far tower legs, far cable, then the deck
        g.strokeStyle = 'rgba(62,52,70,0.95)';
        drawLeg(g, 0, -17);
        drawLeg(g, 1, -17);
        drawCable(g, -15.5, 2.2);
        // deck: underside fascia (camera side) + road surface
        const a0 = pa(S0, 16.5, DECK);
        const a1 = pa(1.4, 16.5, DECK);
        const b0 = pa(S0, -16.5, DECK);
        const b1 = pa(1.4, -16.5, DECK);
        g.fillStyle = '#3c3444';
        g.beginPath();
        g.moveTo(a0[0], a0[1]);
        g.lineTo(a1[0], a1[1]);
        g.lineTo(b1[0], b1[1]);
        g.lineTo(b0[0], b0[1]);
        g.closePath();
        g.fill();
        g.strokeStyle = 'rgba(240,230,210,0.35)';
        g.lineWidth = 0.8;
        for (const off of [0, 4.1, 7.6, -4.1, -7.6]) {
          const p0 = pa(S0, off, DECK + 0.1);
          const p1 = pa(1.4, off, DECK + 0.1);
          g.setLineDash(off === 0 ? [] : [6, 10]);
          g.beginPath();
          g.moveTo(p0[0], p0[1]);
          g.lineTo(p1[0], p1[1]);
          g.stroke();
        }
        g.setLineDash([]);
        const f0 = pa(S0, 16.5, DECK - 4);
        const f1 = pa(1.4, 16.5, DECK - 4);
        g.fillStyle = '#231d29';
        g.beginPath();
        g.moveTo(a0[0], a0[1]);
        g.lineTo(a1[0], a1[1]);
        g.lineTo(f1[0], f1[1]);
        g.lineTo(f0[0], f0[1]);
        g.closePath();
        g.fill();
      });
      bridgeFront = makeLayer(px, (g) => {
        g.strokeStyle = 'rgba(70,58,78,0.98)';
        drawCable(g, 15.5, 3);
        drawLeg(g, 0, 17);
        drawLeg(g, 1, 17);
        // cross beams
        g.strokeStyle = '#40354a';
        for (const s of [0, 1]) {
          for (const Y of [TOWER - 4, 118]) {
            const [x0, y0, k] = pa(s, -17, Y);
            const [x1, y1] = pa(s, 17, Y);
            g.lineWidth = 3.4 * k;
            g.beginPath();
            g.moveTo(x0, y0);
            g.lineTo(x1, y1);
            g.stroke();
          }
          const [bx, by] = pa(s, 17, TOWER + 4);
          beacons.push({ x: bx, y: by, ph: s * 2 });
        }
      });
      fg = makeLayer(px, (g) => {
        // promenade lamps
        g.strokeStyle = '#0d0b10';
        g.lineWidth = 3;
        for (let x = 30; x < 540; x += 120) {
          g.beginPath();
          g.moveTo(x, 900);
          g.lineTo(x, 760);
          g.stroke();
          g.fillStyle = '#0d0b10';
          g.fillRect(x - 6, 752, 12, 10);
        }
      });
    },
    update(dt) {
      for (const l of lanes) stepLane(l, dt);
      jostle(lanes, dt, 0.4);
      for (const b of gulls) {
        b.x += b.v * dt;
        if (b.x > W + PAD) b.x = -PAD;
      }
      for (const rd of roads) for (const c of rd.cars) c.u = (c.u + c.v * c.dir * dt + 1) % 1;
      for (const b of boats) stepBoat(b, dt);
    },
    draw(g, t, cam: Cam) {
      drawLayer(g, skyL, cam, 0.2);
      const off = (t * 4) % (W + PAD * 2);
      g.save();
      g.translate(cam.x * 0.25, cam.y * 0.25);
      g.drawImage(cloudL, -PAD + off, -PAD, W + PAD * 2, H + PAD * 2);
      g.drawImage(cloudL, -PAD + off - (W + PAD * 2), -PAD, W + PAD * 2, H + PAD * 2);
      g.restore();

      g.save();
      g.translate(cam.x, cam.y);
      g.drawImage(landL, -PAD, -PAD, W + PAD * 2, H + PAD * 2);
      g.globalCompositeOperation = 'lighter';
      reflections(g, refl, t);
      // sun glitter
      for (let i = 0; i < 70; i++) {
        const y = 410 + ((i * 37.7 + t * 9) % 240);
        const spread = 16 + (y - 410) * 0.55;
        const x = 770 + Math.sin(i * 12.9 + Math.floor(t * 3 + i)) * spread;
        const a = 0.2 + 0.5 * Math.max(0, Math.sin(t * 5 + i * 3.1));
        glowRect(g, x, y, 10 + (y - 410) * 0.12, 2, [255, 200, 140], a);
      }
      g.globalCompositeOperation = 'source-over';

      // shore roads and small boats
      g.globalCompositeOperation = 'lighter';
      for (const rd of roads) {
        const segs = rd.pts.length - 1;
        for (const c of rd.cars) {
          const f = c.u * segs;
          const i = Math.min(segs - 1, Math.floor(f));
          const a = rd.pts[i];
          const b = rd.pts[i + 1];
          const x = a[0] + (b[0] - a[0]) * (f - i);
          const y = a[1] + (b[1] - a[1]) * (f - i) + (c.dir > 0 ? 0 : 2);
          const near = Math.max(0.6, (y - 400) / 260);
          glow(g, x, y, 2.6 * near, c.dir > 0 ? [255, 236, 210] : [255, 40, 30], 0.85, c.dir > 0);
          if (isWater(x, y + 14)) glowRect(g, x, y + 18 * near, 2 * near, 26 * near, c.dir > 0 ? [255, 220, 180] : [255, 60, 40], 0.22);
        }
      }
      g.globalCompositeOperation = 'source-over';
      for (const b of boats) boat(g, b, t);

      // the Beylerbeyi – Ortaköy vapur: crossing, berthing, crossing back
      const f = ferryAt(t);
      ferry(g, f.x, f.y, f.s, f.dir, f.moving, t);

      g.drawImage(bridgeBack, -PAD, -PAD, W + PAD * 2, H + PAD * 2);
      drawTraffic(g, P, lanes, { ambient: [255, 150, 110], ambientA: 0.18, haze: 2400, boost: 3 }, 50, 3000, 5);
      g.drawImage(bridgeFront, -PAD, -PAD, W + PAD * 2, H + PAD * 2);

      // LED show on the cables and fascia
      g.globalCompositeOperation = 'lighter';
      for (let s = -0.18; s < 1.2; s += 0.025) {
        const c = hsl((t * 30 + s * 240) % 360, 0.85, 0.62);
        const cy = cableY(s);
        const [x, y, k] = pa(s, 15.5, cy);
        glow(g, x, y, Math.max(2.4, k * 2.2), c, 0.8);
        const [dx, dy, dk] = pa(s, 16.6, DECK - 2);
        glow(g, dx, dy, Math.max(2, dk * 1.8), c, 0.55);
        // mirror images on the Bosphorus: the same point below the waterline
        const [rx, ry, rk] = pa(s, 16.6, -(DECK - 2));
        if (isWater(rx, ry)) {
          const wob = Math.sin(t * 2 + s * 40) * rk * 1.5;
          glowRect(g, rx + wob, ry, Math.max(3, rk * 2.4), Math.max(14, rk * 26), c, 0.28);
        }
        const [ux, uy, uk] = pa(s, 15.5, -cy);
        if (isWater(ux, uy)) glowRect(g, ux - Math.sin(t * 1.7 + s * 30) * uk, uy, Math.max(2, uk * 1.6), Math.max(10, uk * 16), c, 0.18);
      }
      for (const b of beacons) {
        const on = Math.sin(t * 2 + b.ph) > 0.5;
        glow(g, b.x, b.y, on ? 10 : 4, [255, 40, 30], on ? 1 : 0.3, on);
      }
      // mosque floodlights
      glowRect(g, 420, 815, 260, 110, [255, 190, 120], 0.25);
      g.globalCompositeOperation = 'source-over';

      // gulls
      for (const b of gulls) gull(g, b.x, b.y + Math.sin(t * 0.8 + b.bob) * 10, b.s, t * 6 + b.ph, 'rgba(30,20,34,0.85)');

      // promenade lamps
      g.drawImage(fg, -PAD, -PAD, W + PAD * 2, H + PAD * 2);
      g.globalCompositeOperation = 'lighter';
      for (let x = 30; x < 540; x += 120) {
        glow(g, x, 760, 26, [255, 190, 120], 0.9, true);
        glowRect(g, x, 880, 160, 40, [255, 170, 110], 0.18);
      }
      g.globalCompositeOperation = 'source-over';
      g.restore();
    },
  };
}

/** Screen point over open water (not on either shore or the quay)? */
export function isWater(x: number, y: number) {
  if (y < P.vpy + 3 || y > H + PAD) return false;
  if (y < polyY(ASIA_COAST, x)) return false;
  if (x < 560 && y > 830) return false;
  const coast = EURO_COAST.slice(1).sort((a, b) => a[1] - b[1]).map(([cx, cy]) => [cy, cx] as [number, number]);
  return x > polyY(coast, y);
}

function euroBottom(x: number) {
  return x < 470 ? 836 : polyY(EURO_COAST.slice(1).sort((p, q) => p[0] - q[0]), x);
}

/** Perspective size of something floating at screen height y (the horizon is at P.vpy). */
const depthScale = (y: number) => 0.5 + (y - P.vpy) / 400;

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

function boat(g: CanvasRenderingContext2D, b: SmallBoat, t: number) {
  const s = depthScale(b.y);
  const dir = Math.sign(b.v) || 1;
  const L = b.len * s;
  const bob = Math.sin(t * 1.3 + b.x * 0.05) * 0.6 * s;
  g.save();
  g.translate(b.x, b.y + bob);
  g.scale(dir, 1);
  // wake: two pale lines opening out behind
  g.strokeStyle = `rgba(255,220,200,${0.18 + 0.1 * Math.sin(t * 3)})`;
  g.lineWidth = Math.max(0.6, s);
  g.beginPath();
  g.moveTo(-L, 0.5 * s);
  g.lineTo(-L * 4, -2 * s);
  g.moveTo(-L, 1.5 * s);
  g.lineTo(-L * 4, 4 * s);
  g.stroke();
  // hull and cabin
  g.fillStyle = b.kind ? '#2d3c5a' : '#d9d2c8';
  g.beginPath();
  g.moveTo(-L, -1.5 * s);
  g.lineTo(L * 0.7, -1.5 * s);
  g.lineTo(L, -3 * s);
  g.lineTo(L * 0.8, 1.5 * s);
  g.lineTo(-L * 0.95, 1.5 * s);
  g.closePath();
  g.fill();
  g.fillStyle = b.kind ? '#cfc6b8' : '#efe8dc';
  g.fillRect(-L * 0.5, -5 * s, L * 0.6, 3.5 * s);
  g.globalCompositeOperation = 'lighter';
  glow(g, -L * 0.2, -3.4 * s, 2.6 * s, [255, 214, 150], 0.7);
  // navigation lights: a white masthead, green to starboard / red to port as seen from the side
  glow(g, L * 0.1, -8 * s, 2.2 * s, [255, 240, 220], 0.9, true);
  glow(g, L * 0.75, -2.5 * s, 1.8 * s, dir > 0 ? [60, 255, 120] : [255, 50, 40], 0.9);
  glowRect(g, 0, 14 * s, 2.4 * s, 24 * s, [255, 220, 170], 0.18);
  g.globalCompositeOperation = 'source-over';
  g.restore();
}

/** A Şehir Hatları vapur side-on at dusk: dark hull, cream upper works, two rows of warm windows. */
function ferry(g: CanvasRenderingContext2D, x: number, y: number, s: number, dir: 1 | -1, moving: boolean, t: number) {
  const sway = Math.sin(t * 0.9) * 1.2 * s;
  g.save();
  g.translate(x, y + sway);
  g.scale(s * dir, s);
  g.globalCompositeOperation = 'lighter';
  if (moving) {
    // wake behind the stern and the bow wave
    glowRect(g, -170, 20, 220, 10, [255, 210, 180], 0.22);
    g.strokeStyle = 'rgba(255,225,205,0.35)';
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(-72, 18);
    g.lineTo(-260, 10);
    g.moveTo(-72, 22);
    g.lineTo(-260, 32);
    g.moveTo(80, 18);
    g.quadraticCurveTo(88, 24, 74, 26);
    g.stroke();
  }
  g.globalCompositeOperation = 'source-over';
  // hull: black below, a white band, a raked bow at +x
  g.fillStyle = '#16181f';
  g.beginPath();
  g.moveTo(-72, 8);
  g.lineTo(80, 8);
  g.lineTo(72, 22);
  g.lineTo(-66, 22);
  g.quadraticCurveTo(-72, 18, -72, 8);
  g.fill();
  g.fillStyle = '#ece6da';
  g.fillRect(-72, 2, 150, 7);
  // main deck house and windows
  g.fillStyle = '#e4ddcf';
  g.fillRect(-60, -14, 124, 16);
  g.fillStyle = '#ffd08a';
  for (let i = 0; i < 15; i++) g.fillRect(-56 + i * 8, -10, 5, 7);
  // upper deck, its windows, the wheelhouse forward
  g.fillStyle = '#ddd5c6';
  g.fillRect(-44, -28, 92, 14);
  g.fillStyle = '#f6c47c';
  for (let i = 0; i < 10; i++) g.fillRect(-40 + i * 8, -25, 5, 6);
  g.fillStyle = '#e8e1d3';
  g.fillRect(34, -38, 16, 10);
  g.fillStyle = '#2b3442';
  g.fillRect(36, -36, 12, 4);
  // railing on the top deck
  g.strokeStyle = 'rgba(240,235,225,0.7)';
  g.lineWidth = 0.8;
  g.beginPath();
  g.moveTo(-44, -32);
  g.lineTo(32, -32);
  for (let i = -44; i <= 32; i += 6) {
    g.moveTo(i, -32);
    g.lineTo(i, -28);
  }
  g.stroke();
  // funnel: cream with a black top
  g.fillStyle = '#d9c38f';
  g.beginPath();
  g.moveTo(-8, -28);
  g.lineTo(-6, -50);
  g.lineTo(8, -50);
  g.lineTo(8, -28);
  g.fill();
  g.fillStyle = '#121212';
  g.fillRect(-6, -54, 14, 6);
  // mast with its white light, the flag at the stern
  g.strokeStyle = '#d8d2c4';
  g.beginPath();
  g.moveTo(52, -38);
  g.lineTo(52, -58);
  g.stroke();
  g.fillStyle = '#c8202a';
  g.fillRect(-74, -6, 7, 5);
  g.globalCompositeOperation = 'lighter';
  glow(g, 52, -59, 4, [255, 245, 225], 0.95, true);
  glow(g, 76, -2, 3, [60, 255, 120], 0.8);
  glowRect(g, 0, -6, 190, 34, [255, 190, 120], 0.22);
  // the windows' reflection broken up by the swell
  for (let i = 0; i < 15; i++) glowRect(g, -54 + i * 8, 34 + Math.sin(t * 3 + i) * 2, 5, 22, [255, 190, 120], 0.16);
  g.globalCompositeOperation = 'source-over';
  g.restore();
}
