import {
  H,
  PAD,
  W,
  clouds,
  drawLayer,
  glow,
  glowRect,
  hillTown,
  hsl,
  makeLayer,
  makeRng,
  range,
  rgba,
  tower,
  vGradient,
  type Cam,
  type RGB,
} from '../kit';
import { drawTraffic, jostle, populate, project, stepLane, straightLane, type Lane, type Persp } from '../traffic';
import type { CityScene } from '../scene';

/*
 * Zincirlikuyu, 17:20 — looking down the E-5 from the metrobüs overpass. Four lanes crawling
 * east towards the bridge (a river of brake lights), four lanes of headlights coming the other
 * way, red metrobüses sliding past the jam and stopping at the packed station below you.
 */

const P: Persp = { vpx: 800, vpy: 452, f: 950, camH: 9.5 };
const Z0 = 16;
const Z1 = 1300;
const STATION: [number, number] = [22, 72];
const SODIUM: RGB = [255, 172, 88];

export function e5Scene(): CityScene {
  const r = makeRng(1905);
  const lanes: Lane[] = [];
  for (const X of [-8.2, -11.7, -15.2, -18.7]) {
    const l = straightLane(X, 2, Z1, -1);
    populate(l, r, { spacing: [12, 26], v0: [12, 15.5], taxi: 0.14 });
    lanes.push(l);
  }
  for (const X of [8.2, 11.7, 15.2, 18.7]) {
    const l = straightLane(X, 2, Z1, 1);
    populate(l, r, { spacing: [3.2, 7], v0: [6, 9.5], taxi: 0.14, bus: 0.03 });
    lanes.push(l);
  }
  const busIn = straightLane(-3, 2, Z1, -1);
  populate(busIn, r, { spacing: [120, 170], v0: [12, 14], only: 'metrobus' });
  busIn.stopAt = Z1 - 34;
  busIn.dwell = 7;
  const busOut = straightLane(3, 2, Z1, 1);
  populate(busOut, r, { spacing: [120, 170], v0: [12, 14], only: 'metrobus' });
  busOut.stopAt = 52 - 2;
  busOut.dwell = 7;
  lanes.push(busIn, busOut);
  // Let the traffic settle into its jam before the first frame.
  for (let i = 0; i < 600; i++) {
    for (const l of lanes) stepLane(l, 0.05);
    jostle(lanes, 0.05, 0.6);
  }

  const beacons: { x: number; y: number; ph: number }[] = [];
  let sky: HTMLCanvasElement;
  let cloudLayer: HTMLCanvasElement;
  let road: HTMLCanvasElement;
  let lampGlow: HTMLCanvasElement;
  let rail: HTMLCanvasElement;
  let station: HTMLCanvasElement;

  const pr = (X: number, Y: number, Z: number) => project(P, X, Y, Z);
  const quad = (g: CanvasRenderingContext2D, X0: number, X1: number, Y: number, z0: number, z1: number) => {
    const a = pr(X0, Y, z0);
    const b = pr(X1, Y, z0);
    const c = pr(X1, Y, z1);
    const d = pr(X0, Y, z1);
    g.beginPath();
    g.moveTo(a[0], a[1]);
    g.lineTo(b[0], b[1]);
    g.lineTo(c[0], c[1]);
    g.lineTo(d[0], d[1]);
    g.closePath();
    g.fill();
  };
  const wall = (g: CanvasRenderingContext2D, X: number, Y0: number, Y1: number, z0: number, z1: number) => {
    const a = pr(X, Y0, z0);
    const b = pr(X, Y1, z0);
    const c = pr(X, Y1, z1);
    const d = pr(X, Y0, z1);
    g.beginPath();
    g.moveTo(a[0], a[1]);
    g.lineTo(b[0], b[1]);
    g.lineTo(c[0], c[1]);
    g.lineTo(d[0], d[1]);
    g.closePath();
    g.fill();
  };

  return {
    caption: 'Zincirlikuyu · E-5 — köprü yönü kilit, metrobüs tıklım tıklım.',
    build(px) {
      const rb = makeRng(77);
      beacons.length = 0;
      sky = makeLayer(px, (g) => {
        g.fillStyle = vGradient(g, -PAD, P.vpy + 4, [
          [0, '#0f1426'],
          [0.35, '#232641'],
          [0.62, '#46384f'],
          [0.84, '#8a5559'],
          [1, '#c98462'],
        ]);
        g.fillRect(-PAD, -PAD, W + PAD * 2, P.vpy + PAD + 6);
        // Asian shore far away, with the bridge at the end of the road
        hillTown(g, rb, {
          ridge: [
            [-PAD, 438],
            [400, 432],
            [760, 440],
            [1000, 428],
            [W + PAD, 436],
          ],
          bottom: () => P.vpy + 2,
          x0: -PAD,
          x1: W + PAD,
          fill: '#3b2f40',
          house: [70, 56, 72],
          density: 1.4,
          haze: [200, 130, 110],
          hazeA: 0.4,
        });
        g.strokeStyle = 'rgba(30,24,36,0.9)';
        g.lineWidth = 2.2;
        for (const x of [728, 872]) {
          g.beginPath();
          g.moveTo(x, P.vpy);
          g.lineTo(x, 392);
          g.stroke();
        }
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(640, 432);
        g.quadraticCurveTo(700, 400, 728, 393);
        g.quadraticCurveTo(800, 432, 872, 393);
        g.quadraticCurveTo(900, 400, 960, 432);
        g.stroke();
        g.fillStyle = 'rgba(30,24,36,0.9)';
        g.fillRect(620, 430, 360, 2.5);
        // Levent: the towers on the left
        const left: [number, number, number, 'flat' | 'slant' | 'spire' | 'pyramid' | 'step'][] = [
          [30, 58, 250, 'step'],
          [110, 62, 330, 'flat'],
          [196, 50, 290, 'pyramid'],
          [262, 70, 450, 'slant'],
          [350, 56, 360, 'pyramid'],
          [420, 52, 320, 'pyramid'],
          [484, 64, 270, 'spire'],
          [560, 46, 190, 'flat'],
        ];
        for (const [x, w, h, crown] of left) {
          const top = tower(g, rb, x, P.vpy + 4, w, h, { body: [44, 50, 72], lit: 0.55, warm: 0.3, crown, haze: 0.05 });
          beacons.push({ ...top, ph: rb() * 6 });
        }
        for (let x = -PAD; x < 700; x += range(rb, 26, 50)) tower(g, rb, x, P.vpy + 4, range(rb, 24, 46), range(rb, 50, 140), { body: [50, 46, 66], lit: 0.4, warm: 0.6, haze: 0.12 });
        // Etiler / Akatlar on the right: mid-rise, warmer
        for (let x = 960; x < W + PAD; x += range(rb, 22, 44)) tower(g, rb, x, P.vpy + 4, range(rb, 22, 40), range(rb, 40, 170), { body: [56, 48, 64], lit: 0.45, warm: 0.75, haze: 0.14 });
        for (const [x, w, h] of [
          [1090, 70, 250],
          [1240, 54, 300],
          [1420, 66, 220],
        ] as const) {
          const top = tower(g, rb, x, P.vpy + 4, w, h, { body: [42, 48, 70], lit: 0.5, crown: 'flat' });
          beacons.push({ ...top, ph: rb() * 6 });
        }
        // haze band where the city meets the sky
        g.fillStyle = vGradient(g, 300, P.vpy + 6, [
          [0, 'rgba(210,140,110,0)'],
          [1, 'rgba(210,140,110,0.35)'],
        ]);
        g.fillRect(-PAD, 300, W + PAD * 2, P.vpy - 294);
      });
      cloudLayer = makeLayer(px, (g) => {
        const rc = makeRng(5);
        clouds(g, rc, { y0: -40, y1: 250, n: 22, w0: 260, w1: 520, flat: 0.32, color: [44, 40, 62], alpha: 0.55, lit: [190, 110, 90], litAlpha: 0.28, blur: 14 });
        clouds(g, rc, { y0: 230, y1: 360, n: 14, w0: 200, w1: 380, flat: 0.25, color: [92, 64, 82], alpha: 0.35, lit: [230, 150, 110], litAlpha: 0.3, blur: 10 });
      });
      road = makeLayer(px, (g) => {
        // everything below the horizon
        g.fillStyle = vGradient(g, P.vpy, H + PAD, [
          [0, '#3a3140'],
          [0.25, '#1c1b22'],
          [1, '#0d0d11'],
        ]);
        g.fillRect(-PAD, P.vpy, W + PAD * 2, H - P.vpy + PAD);
        // asphalt
        g.fillStyle = vGradient(g, P.vpy, H, [
          [0, '#4a3f48'],
          [0.2, '#2b2930'],
          [1, '#1b1b20'],
        ]);
        quad(g, -21, 21, 0, Z0 - 10, Z1);
        // metrobüs lanes: red asphalt
        g.fillStyle = 'rgba(120,34,34,0.45)';
        quad(g, -4.4, -1.6, 0.01, Z0 - 10, Z1);
        quad(g, 1.6, 4.4, 0.01, Z0 - 10, Z1);
        // lane markings
        g.fillStyle = 'rgba(230,226,215,0.55)';
        for (const X of [-9.95, -13.45, -16.95, 9.95, 13.45, 16.95]) {
          for (let z = Z0 - 6; z < 700; z += 12) quad(g, X - 0.08, X + 0.08, 0.02, z, z + 3.5);
        }
        g.fillStyle = 'rgba(236,200,90,0.55)';
        for (const X of [-6.6, 6.6, -20.6, 20.6]) quad(g, X - 0.1, X + 0.1, 0.02, Z0 - 10, Z1);
        // New Jersey barriers either side of the busway
        for (const X of [-4.6, -6.35, 4.6, 6.35]) {
          g.fillStyle = '#5b5560';
          quad(g, X - 0.22, X + 0.22, 0.9, Z0 - 10, Z1);
          g.fillStyle = '#35323a';
          wall(g, X + (X < 0 ? 0.3 : -0.3), 0, 0.9, Z0 - 10, Z1);
        }
        // platform
        g.fillStyle = '#4a4650';
        quad(g, -1.55, 1.55, 0.3, STATION[0], STATION[1]);
        g.fillStyle = 'rgba(236,200,90,0.6)';
        quad(g, -1.55, -1.4, 0.31, STATION[0], STATION[1]);
        quad(g, 1.4, 1.55, 0.31, STATION[0], STATION[1]);
        // retaining walls + the cemetery's cypresses on the right
        g.fillStyle = '#211d25';
        wall(g, -23, 0, 7, Z0 - 10, Z1);
        g.fillStyle = '#1a171d';
        wall(g, 23, 0, 3, Z0 - 10, Z1);
        g.fillStyle = '#0b0d0c';
        for (let z = 30; z < 900; z *= 1.09) {
          for (const X of [27, 33, 40]) {
            const h = range(rb, 9, 17);
            const [x0, yb, k] = pr(X + range(rb, -1, 1), 3, z);
            const w = 1.6 * k;
            g.beginPath();
            g.moveTo(x0 - w, yb);
            g.quadraticCurveTo(x0 - w * 0.9, yb - h * k * 0.6, x0, yb - h * k);
            g.quadraticCurveTo(x0 + w * 0.9, yb - h * k * 0.6, x0 + w, yb);
            g.fill();
          }
        }
        // street-light poles on the busway barriers
        g.strokeStyle = '#2a2830';
        for (let z = 30; z < 900; z += 38) {
          for (const X of [-5.45, 5.45]) {
            const [xb, yb, k] = pr(X, 0.9, z);
            const [, yt] = pr(X, 11, z);
            const [xa, ya] = pr(X + (X < 0 ? -2.4 : 2.4), 11.3, z);
            g.lineWidth = Math.max(0.6, 0.22 * k);
            g.beginPath();
            g.moveTo(xb, yb);
            g.lineTo(xb, yt);
            g.lineTo(xa, ya);
            g.stroke();
          }
        }
        // overhead gantry over the oncoming lanes
        const gz = 88;
        g.strokeStyle = '#2d2b31';
        for (const X of [-6.9, -21]) {
          const [xb, yb, k] = pr(X, 0, gz);
          const [, yt] = pr(X, 7.4, gz);
          g.lineWidth = 0.35 * k;
          g.beginPath();
          g.moveTo(xb, yb);
          g.lineTo(xb, yt);
          g.stroke();
        }
        const [gx0, gy0, gk] = pr(-20.5, 7.4, gz);
        const [gx1, gy1] = pr(-7.4, 5.2, gz);
        g.fillStyle = '#1f6b3d';
        g.fillRect(gx0, gy0, gx1 - gx0, gy1 - gy0);
        g.strokeStyle = 'rgba(255,255,255,0.8)';
        g.lineWidth = Math.max(1, gk * 0.08);
        g.strokeRect(gx0 + gk * 0.2, gy0 + gk * 0.2, gx1 - gx0 - gk * 0.4, gy1 - gy0 - gk * 0.4);
        g.fillStyle = '#f4f4ee';
        g.font = `700 ${gk * 0.62}px "Work Sans", sans-serif`;
        g.textBaseline = 'middle';
        g.fillText('↑ MECİDİYEKÖY · ŞİŞLİ', gx0 + gk * 0.6, gy0 + (gy1 - gy0) * 0.34);
        g.font = `600 ${gk * 0.5}px "Work Sans", sans-serif`;
        g.fillText('↗ BEŞİKTAŞ   E-5', gx0 + gk * 0.6, gy0 + (gy1 - gy0) * 0.72);
      });
      // the station canopy and its name board sit in front of the buses at the platform
      station = makeLayer(px, (g) => {
        // station canopy + name board
        g.fillStyle = 'rgba(190,205,220,0.13)';
        quad(g, -1.9, 1.9, 3.7, STATION[0], STATION[1]);
        g.strokeStyle = 'rgba(40,40,48,0.9)';
        for (let z = STATION[0]; z <= STATION[1]; z += 10) {
          for (const X of [-1.7, 1.7]) {
            const [xb, yb, k] = pr(X, 0.3, z);
            const [, yt] = pr(X, 3.7, z);
            g.lineWidth = 0.14 * k;
            g.beginPath();
            g.moveTo(xb, yb);
            g.lineTo(xb, yt);
            g.stroke();
          }
        }
        const [sx0, sy0, sk] = pr(-1.9, 4.5, STATION[0]);
        const [sx1, sy1] = pr(1.9, 3.7, STATION[0]);
        g.fillStyle = '#1d4f9a';
        g.fillRect(sx0, sy0, sx1 - sx0, sy1 - sy0);
        g.fillStyle = '#ffffff';
        g.font = `800 ${sk * 0.42}px "Work Sans", sans-serif`;
        g.textAlign = 'center';
        g.fillText('ZİNCİRLİKUYU', (sx0 + sx1) / 2, (sy0 + sy1) / 2 + 1);
        g.textAlign = 'left';
      });
      lampGlow = makeLayer(px, (g) => {
        g.globalCompositeOperation = 'lighter';
        for (let z = 30; z < 900; z += 38) {
          for (const X of [-5.45, 5.45]) {
            const lx = X + (X < 0 ? -2.4 : 2.4);
            const [x, y, k] = pr(lx, 11.2, z);
            glow(g, x, y, Math.max(3, k * 2.4), SODIUM, 0.9, true);
            const [gx, gy, gk] = pr(lx, 0, z);
            glowRect(g, gx, gy, gk * 16, gk * 5, SODIUM, 0.16);
          }
        }
        const [sx, sy, sk] = pr(0, 4.1, STATION[0]);
        glowRect(g, sx, sy, sk * 6, sk * 2, [120, 170, 255], 0.35);
        const [cx, cy, ck] = pr(0, 3.6, (STATION[0] + STATION[1]) / 2);
        glowRect(g, cx, cy + ck * 2, ck * 8, ck * 5, [220, 235, 255], 0.14);
      });
      rail = makeLayer(px, (g) => {
        g.fillStyle = vGradient(g, 850, H + PAD, [
          [0, '#141318'],
          [1, '#050506'],
        ]);
        g.fillRect(-PAD, 872, W + PAD * 2, 200);
        g.fillStyle = '#1c1b21';
        g.fillRect(-PAD, 842, W + PAD * 2, 8);
        g.fillStyle = 'rgba(255,170,110,0.25)';
        g.fillRect(-PAD, 842, W + PAD * 2, 1.5);
        g.fillStyle = '#121116';
        for (let x = -PAD; x < W + PAD; x += 22) g.fillRect(x, 848, 3, 30);
      });
    },
    update(dt) {
      for (const l of lanes) stepLane(l, dt);
      jostle(lanes, dt, 0.35);
    },
    draw(g, t, cam: Cam) {
      drawLayer(g, sky, cam, 0.35);
      // clouds drift slowly to the right
      const off = (t * 5) % (W + PAD * 2);
      g.save();
      g.translate(cam.x * 0.15, cam.y * 0.15);
      g.drawImage(cloudLayer, -PAD + off, -PAD, W + PAD * 2, H + PAD * 2);
      g.drawImage(cloudLayer, -PAD + off - (W + PAD * 2), -PAD, W + PAD * 2, H + PAD * 2);
      g.restore();
      // aviation lights + bridge LEDs
      g.globalCompositeOperation = 'lighter';
      g.save();
      g.translate(cam.x * 0.35, cam.y * 0.35);
      for (const b of beacons) {
        const on = Math.sin(t * 2.2 + b.ph) > 0.55;
        glow(g, b.x, b.y - 3, on ? 9 : 4, [255, 40, 30], on ? 0.95 : 0.25, on);
      }
      for (let i = 0; i < 18; i++) {
        const x = 640 + i * 20;
        glow(g, x, 430, 3.2, hsl((t * 40 + i * 20) % 360, 0.9, 0.6), 0.8);
      }
      g.restore();
      g.globalCompositeOperation = 'source-over';

      g.save();
      g.translate(cam.x, cam.y);
      g.drawImage(road, -PAD, -PAD, W + PAD * 2, H + PAD * 2);
      g.globalCompositeOperation = 'lighter';
      g.drawImage(lampGlow, -PAD, -PAD, W + PAD * 2, H + PAD * 2);
      g.globalCompositeOperation = 'source-over';
      const look = { ambient: [150, 90, 60] as const, ambientA: 0.12, haze: 900 };
      drawTraffic(g, P, lanes, look, STATION[0], Z1);
      g.drawImage(station, -PAD, -PAD, W + PAD * 2, H + PAD * 2);
      drawTraffic(g, P, lanes, look, 7, STATION[0]);
      g.restore();

      drawLayer(g, rail, cam, 1.15);

      // warm city haze on top of everything distant
      g.fillStyle = rgba([200, 120, 90], 0.06);
      g.fillRect(0, 0, W, H);
    },
  };
}
