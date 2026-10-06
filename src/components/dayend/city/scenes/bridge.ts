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
import { drawTraffic, jostle, populate, project, stepLane, type Lane } from '../traffic';
import type { CityScene } from '../scene';
import { ASIA_COAST, EURO_COAST, P, euroBottom, ferryAt, isWater, spawnBoats, stepBoat } from './bosphorus';
import { boat, ferry } from './bosphorusBoats';

/*
 * Ortaköy, 17:10: caminin üstündeki yamaçtan gün batımında 15 Temmuz Şehitler Köprüsü. Avrupa →
 * Asya şeritleri kesintisiz bir fren lambası nehri (herkes Anadolu yakasındaki evine gidiyor), öbür
 * yön akıyor. Köprünün LED'leri renk değiştirir, bir vapur geçer, martılar suyun üstünde asılı durur
 * ve aşağıdaki boş sahil yolunda lambalar yanar.
 */

// Dünya metresinde köprü ekseni: yakın (Avrupa) kule N → uzak (Asya) kule F.
const N = { X: -170, Z: 260 };
const F = { X: 546, Z: 1060 };
const SPAN = Math.hypot(F.X - N.X, F.Z - N.Z);
const AX = (F.X - N.X) / SPAN;
const AZ = (F.Z - N.Z) / SPAN;
// eksen yönünün sağ tarafı (kameraya doğru)
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
  // Avrupa → Asya (bizden uzağa, tabliyenin sağı = kamera tarafı): kilitli
  for (const off of [2.4, 5.9, 9.4]) {
    const l = lane(off, 1);
    populate(l, r, { spacing: [2.6, 6], v0: [4, 7.5], taxi: 0.16, bus: 0.03, van: 0.1 });
    lanes.push(l);
  }
  // Asya → Avrupa: akıyor
  for (const off of [-2.4, -5.9, -9.4]) {
    const l = lane(off, -1);
    populate(l, r, { spacing: [14, 32], v0: [14, 19], taxi: 0.14 });
    lanes.push(l);
  }
  for (let i = 0; i < 700; i++) {
    for (const l of lanes) stepLane(l, 0.05);
    jostle(lanes, 0.05, 0.8);
  }

  // sahil yolları (Çırağan / Beylerbeyi): kıyı boyunca far ve stop lambası akıntıları
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
        // uzak tepelerin ardına, tam Boğaz'ın üstüne batan güneş
        g.globalCompositeOperation = 'lighter';
        glow(g, 770, 398, 520, [255, 120, 60], 0.35);
        glow(g, 770, 398, 220, [255, 170, 90], 0.55);
        glowRect(g, 770, 396, 1400, 90, [255, 150, 90], 0.3);
        g.globalCompositeOperation = 'source-over';
        g.fillStyle = '#ffe2a6';
        g.beginPath();
        g.arc(770, 400, 26, Math.PI, 0);
        g.fill();
        // uzak kuzey tepeleri + pusun içinde FSM köprüsü
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
        // gün batımını yansıtan Boğaz
        g.fillStyle = vGradient(g, P.vpy, H + PAD, [
          [0, '#f0a068'],
          [0.08, '#b86a74'],
          [0.3, '#5a3f66'],
          [0.7, '#241f3e'],
          [1, '#101226'],
        ]);
        g.fillRect(-PAD, P.vpy, W + PAD * 2, H - P.vpy + PAD);
        // suyun üstünde güneş yolu
        g.globalCompositeOperation = 'lighter';
        glowRect(g, 770, 470, 90, 160, [255, 160, 90], 0.35);
        g.globalCompositeOperation = 'source-over';
        // dalgacıklar
        for (let i = 0; i < 700; i++) {
          const y = range(rb, P.vpy + 4, H + PAD);
          const d = (y - P.vpy) / (H - P.vpy);
          g.fillStyle = rb() < 0.5 ? `rgba(255,190,150,${0.05 + d * 0.05})` : `rgba(10,10,30,${0.1 + d * 0.1})`;
          g.fillRect(range(rb, -PAD, W + PAD), y, range(rb, 10, 60) * (0.3 + d), 0.8 + d * 1.2);
        }
        // Avrupa: Ortaköy / Beşiktaş / Etiler yamacı
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
        // Asya: Beylerbeyi / Çamlıca
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
        // taş rıhtımlar son ışığı yakalar
        g.strokeStyle = 'rgba(255,190,150,0.35)';
        g.lineWidth = 1.4;
        g.beginPath();
        EURO_COAST.slice(1).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.stroke();
        g.beginPath();
        ASIA_COAST.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.stroke();
        // Çamlıca kulesi
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
        // yansıyan kıyı ışıkları
        // suya yakın ışıklar üstüne parıldayan sütunlar düşürür
        refl = [
          ...euro.filter((l) => l.x > 470 && euroBottom(l.x) - l.y < 40).map((l) => ({ ...l, shore: euroBottom(l.x) })),
          ...asia.filter((l) => polyY(ASIA_COAST, l.x) - l.y < 40).map((l) => ({ ...l, shore: polyY(ASIA_COAST, l.x) })),
        ]
          .filter((l) => l.a > 0.5 && rb() < 0.7)
          .slice(0, 320)
          .map((l) => ({ x: l.x, y: l.shore + 2, c: l.c, a: 0.5, w: 4, len: 30 + rb() * 90, seed: rb() * 10 }));
        // sahildeki Ortaköy camisi + rıhtım
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
        // uzak kule ayakları, uzak kablo, sonra tabliye
        g.strokeStyle = 'rgba(62,52,70,0.95)';
        drawLeg(g, 0, -17);
        drawLeg(g, 1, -17);
        drawCable(g, -15.5, 2.2);
        // tabliye: alt yüz kaplaması (kamera tarafı) + yol yüzeyi
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
        // enine kirişler
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
        // sahil yolu lambaları
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
      // güneş pırıltısı
      for (let i = 0; i < 70; i++) {
        const y = 410 + ((i * 37.7 + t * 9) % 240);
        const spread = 16 + (y - 410) * 0.55;
        const x = 770 + Math.sin(i * 12.9 + Math.floor(t * 3 + i)) * spread;
        const a = 0.2 + 0.5 * Math.max(0, Math.sin(t * 5 + i * 3.1));
        glowRect(g, x, y, 10 + (y - 410) * 0.12, 2, [255, 200, 140], a);
      }
      g.globalCompositeOperation = 'source-over';

      // sahil yolları ve küçük tekneler
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

      // Beylerbeyi–Ortaköy vapuru: geçiyor, yanaşıyor, geri geçiyor
      const f = ferryAt(t);
      ferry(g, f.x, f.y, f.s, f.dir, f.moving, t);

      g.drawImage(bridgeBack, -PAD, -PAD, W + PAD * 2, H + PAD * 2);
      drawTraffic(g, P, lanes, { ambient: [255, 150, 110], ambientA: 0.18, haze: 2400, boost: 3 }, 50, 3000, 5);
      g.drawImage(bridgeFront, -PAD, -PAD, W + PAD * 2, H + PAD * 2);

      // kablolarda ve kaplamada LED gösterisi
      g.globalCompositeOperation = 'lighter';
      for (let s = -0.18; s < 1.2; s += 0.025) {
        const c = hsl((t * 30 + s * 240) % 360, 0.85, 0.62);
        const cy = cableY(s);
        const [x, y, k] = pa(s, 15.5, cy);
        glow(g, x, y, Math.max(2.4, k * 2.2), c, 0.8);
        const [dx, dy, dk] = pa(s, 16.6, DECK - 2);
        glow(g, dx, dy, Math.max(2, dk * 1.8), c, 0.55);
        // Boğaz'daki ayna görüntüleri: aynı nokta su çizgisinin altında
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
      // cami projektörleri
      glowRect(g, 420, 815, 260, 110, [255, 190, 120], 0.25);
      g.globalCompositeOperation = 'source-over';

      // martılar
      for (const b of gulls) gull(g, b.x, b.y + Math.sin(t * 0.8 + b.bob) * 10, b.s, t * 6 + b.ph, 'rgba(30,20,34,0.85)');

      // sahil yolu lambaları
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
