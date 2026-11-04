import { clamp, glow, glowRect, mix, pick, range, rgba, scale, type RGB, type Rng } from './kit';

/*
 * Perspektifte akşam trafiği. Her şerit kapalı bir döngüdür (uzak uçtan çıkan arabalar kameranın
 * arkasından geri girer); araçlar öndeki arabayı Akıllı Sürücü Modeli ile izler, böylece dur-kalk
 * dalgaları, fren lambası dalgalanmaları ve kırmızı ışıktaki kuyruklar kendiliğinden oluşur. Yakın
 * araçlar gölgeli 3B kutular (gövde + kabin), uzaktakiler yalnızca ışıkları olarak çizilir.
 */

export interface Persp {
  vpx: number;
  vpy: number;
  f: number;
  camH: number;
}

export function project(p: Persp, X: number, Y: number, Z: number): [number, number, number] {
  const k = p.f / Z;
  return [p.vpx + X * k, p.vpy + (p.camH - Y) * k, k];
}

export interface LanePoint {
  X: number;
  Z: number;
  /** Zemin düzleminde birim hareket yönü. */
  dx: number;
  dz: number;
}

export type VKind = 'car' | 'taxi' | 'van' | 'bus' | 'metrobus' | 'servis';

export interface Vehicle {
  u: number;
  v: number;
  v0: number;
  acc: number;
  len: number;
  wid: number;
  hgt: number;
  kind: VKind;
  body: RGB;
  brake: number;
  dwell: number;
  served: boolean;
}

export interface Lane {
  at: (u: number) => LanePoint;
  length: number;
  /** Yol yüzeyinin yüksekliği (ör. bir köprü tabliyesi). */
  Y: number;
  vehicles: Vehicle[];
  /** Şerit boyunca otobüs durağı (u) ve otobüslerin orada ne kadar beklediği. */
  stopAt?: number;
  dwell?: number;
  /** Durma çizgisi (u) ve ışığın bu şerit için kırmızı olup olmadığı. */
  signalAt?: number;
  red?: () => boolean;
  /** Dörtlüleri yanıp sönerek park etmiş (kaldırımdaki servis sırası). */
  hazard?: boolean;
}

export function straightLane(X: number, zNear: number, zFar: number, dir: 1 | -1, Y = 0): Lane {
  const L = zFar - zNear;
  return {
    length: L,
    Y,
    vehicles: [],
    at: dir > 0 ? (u) => ({ X, Z: zNear + u, dx: 0, dz: 1 }) : (u) => ({ X, Z: zFar - u, dx: 0, dz: -1 }),
  };
}

const DIMS: Record<VKind, { len: number; wid: number; hgt: number }> = {
  car: { len: 4.5, wid: 1.8, hgt: 1.45 },
  taxi: { len: 4.6, wid: 1.8, hgt: 1.5 },
  van: { len: 5.3, wid: 2, hgt: 2.3 },
  bus: { len: 12, wid: 2.55, hgt: 3.1 },
  metrobus: { len: 18.5, wid: 2.55, hgt: 3.25 },
  servis: { len: 8.4, wid: 2.3, hgt: 2.85 },
};

const PAINT: RGB[] = [
  [205, 206, 210],
  [28, 28, 32],
  [118, 124, 134],
  [150, 22, 26],
  [26, 44, 88],
  [236, 236, 236],
  [58, 66, 60],
  [150, 150, 156],
  [90, 60, 40],
];

export function populate(lane: Lane, r: Rng, o: { spacing: [number, number]; v0: [number, number]; taxi?: number; van?: number; bus?: number; servis?: number; only?: VKind }) {
  const vs: Vehicle[] = [];
  let u = range(r, 0, 6);
  while (u < lane.length - 12) {
    const roll = r();
    const kind: VKind = o.only ?? (r() < (o.servis ?? 0) ? 'servis' : roll < (o.bus ?? 0) ? 'bus' : roll < (o.bus ?? 0) + (o.van ?? 0.08) ? 'van' : roll < (o.bus ?? 0) + (o.van ?? 0.08) + (o.taxi ?? 0.12) ? 'taxi' : 'car');
    const d = DIMS[kind];
    const v0 = range(r, o.v0[0], o.v0[1]);
    const body: RGB = kind === 'taxi' ? [236, 184, 20] : kind === 'metrobus' ? [196, 30, 36] : kind === 'bus' ? [205, 60, 40] : kind === 'servis' ? [236, 236, 230] : pick(r, PAINT);
    vs.push({ u: u + d.len, v: v0 * range(r, 0.2, 0.7), v0, acc: 0, ...d, kind, body, brake: 0, dwell: 0, served: false });
    u += d.len + range(r, o.spacing[0], o.spacing[1]);
  }
  lane.vehicles = vs;
}

/** Döngülü bir şeritte Akıllı Sürücü Modeli'nin bir adımı. */
export function stepLane(lane: Lane, dt: number) {
  const vs = lane.vehicles;
  const n = vs.length;
  const L = lane.length;
  const red = lane.red?.() ?? false;
  for (let i = 0; i < n; i++) {
    const me = vs[i];
    if (me.dwell > 0) {
      me.dwell -= dt;
      me.v = 0;
      me.acc = 0;
      continue;
    }
    const lead = vs[(i + 1) % n];
    let gap = n > 1 ? ((lead.u - lead.len - me.u + L) % L) : 1e4;
    let dv = me.v - lead.v;
    if (red && lane.signalAt !== undefined) {
      const d = lane.signalAt - me.u;
      // Yalnızca duracak yer varsa dur; kavşağın içinde asla sert fren yapma.
      if (d > 0.3 && d < 80 && d < gap && (d > me.v * 0.9 || me.v < 1)) {
        gap = d;
        dv = me.v;
      }
    }
    if (lane.stopAt !== undefined && !me.served && (me.kind === 'bus' || me.kind === 'metrobus')) {
      const d = lane.stopAt - me.u;
      // Model öndekiyle her zaman 2 m pay bırakır; bu yüzden sanal engel durağın 2 m ötesinde durur,
      // yoksa otobüs durağın gerisinde durur ve kapılarını hiç açmazdı.
      if (d > -1 && d < 110 && d + 2 < gap) {
        gap = Math.max(0.05, d + 2);
        dv = me.v;
        if (d < 1.2 && me.v < 0.8) {
          me.dwell = lane.dwell ?? 8;
          me.served = true;
        }
      }
    }
    const a = me.kind === 'metrobus' || me.kind === 'bus' || me.kind === 'servis' ? 0.9 : 1.4;
    const b = 2.4;
    const s0 = 2;
    const T = 1.15;
    const sStar = s0 + Math.max(0, me.v * T + (me.v * dv) / (2 * Math.sqrt(a * b)));
    me.acc = Math.max(-8, a * (1 - (me.v / me.v0) ** 4 - (sStar / Math.max(gap, 0.2)) ** 2));
  }
  for (const me of vs) {
    if (me.dwell > 0) {
      me.brake += (1 - me.brake) * Math.min(1, dt * 6);
      continue;
    }
    me.v = Math.max(0, me.v + me.acc * dt);
    const nu = me.u + me.v * dt;
    if (nu >= L) {
      me.u = nu - L;
      me.served = false;
    } else me.u = nu;
    const target = me.acc < -0.5 || me.v < 0.4 ? 1 : 0;
    me.brake += (target - me.brake) * Math.min(1, dt * 7);
  }
}

/** Rastgele duraksama (bir sürücü telefonuna bakar) sıkışıklık dalgalarını tetikler. */
export function jostle(lanes: Lane[], dt: number, rate: number) {
  for (const lane of lanes) {
    if (Math.random() > rate * dt) continue;
    const v = lane.vehicles[Math.floor(Math.random() * lane.vehicles.length)];
    if (v && v.kind !== 'metrobus') v.v *= 0.35;
  }
}

export interface TrafficLook {
  ambient: RGB;
  ambientA: number;
  wet?: boolean;
  /** Işıkların pusa karıştığı mesafe (m). */
  haze?: number;
  headColor?: RGB;
  /** Işık boyutlarını ölçekler: uzak sahnelerin okunmak için daha büyük parıltılara ihtiyacı var. */
  boost?: number;
}

const HEAD: RGB = [255, 242, 220];
const TAIL: RGB = [255, 34, 26];
const GLASS: RGB = [22, 27, 36];
const CABIN: RGB = [255, 214, 160];

interface Item {
  lane: Lane;
  v: Vehicle;
  pt: LanePoint;
}

function shade(c: RGB, f: number, o: TrafficLook): RGB {
  return mix(scale(c, f), o.ambient, o.ambientA);
}

/**
 * Z'si [zMin, zMax] aralığındaki bütün araçları çizer. Uzak araçlar yalnızca ışık çiftleridir
 * (eklemeli); yakınlar arkalarındaki ışıkları düzgünce gizlesin diye ressam sırasıyla gövde alır.
 */
export function drawTraffic(g: CanvasRenderingContext2D, p: Persp, lanes: Lane[], o: TrafficLook, zMin: number, zMax: number, bodyK = 3.2, near = 2.5) {
  const items: Item[] = [];
  for (const lane of lanes) {
    for (const v of lane.vehicles) {
      const pt = lane.at(v.u);
      const zc = pt.Z - pt.dz * v.len * 0.5;
      // yakın düzlemin arkasına uzanan her şey sonsuza izdüşürdü
      const zNear = Math.min(pt.Z, pt.Z - pt.dz * v.len) - v.wid;
      if (zc < zMin || zc > zMax || zNear < near) continue;
      items.push({ lane, v, pt });
    }
  }
  items.sort((a, b) => b.pt.Z - a.pt.Z);

  // 1. geçiş: uzak ışıklar, kırmızı ve beyaz parlayan bir nehir.
  g.globalCompositeOperation = 'lighter';
  for (const it of items) {
    const k = p.f / it.pt.Z;
    if (k >= bodyK) continue;
    lights(g, p, it, o, k, false);
  }
  // 2. geçiş: yakın araçlar arkadan öne.
  for (const it of items) {
    const k = p.f / it.pt.Z;
    if (k < bodyK) continue;
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    body(g, p, it, o);
    g.globalCompositeOperation = 'lighter';
    lights(g, p, it, o, k, true);
  }
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
}

function lights(g: CanvasRenderingContext2D, p: Persp, { lane, v, pt }: Item, o: TrafficLook, k: number, near: boolean) {
  const approach = pt.dz * 1 < 0 || (pt.dz === 0 && pt.dx < 0);
  const rx = pt.dz;
  const rz = -pt.dx;
  const along = approach ? 0 : -v.len;
  const cx = pt.X + pt.dx * along;
  const cz = pt.Z + pt.dz * along;
  const hazeF = o.haze ? 0.3 + 0.7 * Math.exp(-pt.Z / o.haze) : 1;
  const side = v.wid / 2 - (approach ? 0.36 : 0.26);
  const big = v.kind === 'metrobus' || v.kind === 'bus' || v.kind === 'servis';
  const y = lane.Y + (approach ? 0.66 : big ? 1 : 0.86);
  const col = approach ? (o.headColor ?? HEAD) : TAIL;
  const brake = approach ? 0 : v.brake;
  const boost = o.boost ?? 1;
  const baseR = (approach ? clamp(k * 0.55, 1.2, 70) : clamp(k * 0.28, 0.9, 34) * (1 + brake * 0.55)) * boost;
  const a = (approach ? 0.95 : 0.55 + brake * 0.45) * hazeF;
  if (k * v.wid < 3) {
    const [x, yy] = project(p, cx, y, cz);
    glow(g, x, yy, baseR * 1.4, col, a, approach);
    if (o.wet) reflect(g, p, x, yy, cx, cz, lane.Y, baseR, col, a);
    return;
  }
  for (const s of [-1, 1]) {
    const X = cx + rx * side * s;
    const Z = cz + rz * side * s;
    const [x, yy, kk] = project(p, X, y, Z);
    glow(g, x, yy, baseR, col, a, approach);
    if (near && approach && kk > 9) glowRect(g, x, yy, baseR * 6, baseR * 0.22, col, 0.28);
    if (o.wet) reflect(g, p, x, yy, X, Z, lane.Y, baseR, col, a);
  }
  if (near && approach) {
    // arabanın önünde asfalta düşen ışık havuzu
    const [x, yy, kk] = project(p, cx + pt.dx * 5, lane.Y, cz + pt.dz * 5);
    glowRect(g, x, yy, kk * 5, kk * 1.6, [255, 232, 200], 0.16 * hazeF);
  }
  if (near && !approach && brake > 0.5 && !big) {
    const [x, yy] = project(p, cx, lane.Y + v.hgt - 0.12, cz);
    glow(g, x, yy, baseR * 0.55, TAIL, 0.7 * brake);
  }
  if (v.kind === 'taxi') {
    const [x, yy] = project(p, pt.X - pt.dx * v.len * 0.5, lane.Y + v.hgt + 0.18, pt.Z - pt.dz * v.len * 0.5);
    glow(g, x, yy, clamp(k * 0.35, 1, 26), [255, 214, 90], 0.8 * hazeF);
  }
  if (near && (v.kind === 'metrobus' || v.kind === 'bus') && approach) {
    const [x, yy] = project(p, cx, lane.Y + v.hgt - 0.2, cz);
    glowRect(g, x, yy, k * 1.6, k * 0.35, [255, 150, 40], 0.7);
  }
  if (v.kind === 'servis') {
    // bize bakan uçta turuncu LED "SERVİS" tabelası
    const [x, yy] = project(p, cx, lane.Y + v.hgt - 0.25, cz);
    glowRect(g, x, yy, Math.max(4, k * 1.5), Math.max(1.5, k * 0.32), [255, 140, 30], 0.85 * hazeF);
    if (k > 7) {
      g.globalAlpha = 0.95 * hazeF;
      g.fillStyle = '#ffae4a';
      g.font = `800 ${k * 0.26}px "JetBrains Mono", monospace`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('SERVİS', x, yy);
      g.textAlign = 'left';
      g.globalAlpha = 1;
    }
    if (lane.hazard && Math.sin(performance.now() / 260) > 0) {
      for (const s of [-1, 1]) {
        const [hx, hy] = project(p, cx + rx * (v.wid / 2 - 0.1) * s, lane.Y + 0.9, cz + rz * (v.wid / 2 - 0.1) * s);
        glow(g, hx, hy, Math.max(2, k * 0.45), [255, 170, 40], 0.95, true);
        if (o.wet) reflect(g, p, hx, hy, cx + rx * (v.wid / 2) * s, cz + rz * (v.wid / 2) * s, lane.Y, Math.max(2, k * 0.35), [255, 170, 40], 0.8);
      }
    }
  }
}

function reflect(g: CanvasRenderingContext2D, p: Persp, x: number, y: number, X: number, Z: number, roadY: number, r: number, c: RGB, a: number) {
  const [, yG] = project(p, X, roadY, Z);
  const len = (yG - y) * 4 + r * 3;
  glowRect(g, x, yG + len * 0.45, r * 1.2, len, c, a * 0.4);
}

function body(g: CanvasRenderingContext2D, p: Persp, { lane, v, pt }: Item, o: TrafficLook) {
  const fx = pt.dx;
  const fz = pt.dz;
  const rx = fz;
  const rz = -fx;
  const Y0 = lane.Y;
  const P = (along: number, side: number, y: number) => project(p, pt.X + fx * along + rx * side, Y0 + y, pt.Z + fz * along + rz * side);
  const camX = 0;
  const camY = p.camH;
  const w = v.wid / 2;

  // yumuşak temas gölgesi
  const sh = [P(0.3, -w - 0.2, 0), P(0.3, w + 0.2, 0), P(-v.len - 0.3, w + 0.2, 0), P(-v.len - 0.3, -w - 0.2, 0)];
  g.fillStyle = 'rgba(0,0,0,0.38)';
  poly(g, sh);

  const box = (a0: number, a1: number, s0: number, s1: number, y0: number, y1: number, cSide: RGB, cTop: RGB, cEnd: RGB, cBack: RGB) => {
    // kamera konumundan yüzlerin görünürlüğü
    const cx = pt.X + fx * (a0 + a1) * 0.5;
    const cz = pt.Z + fz * (a0 + a1) * 0.5;
    const toCam = (nx: number, ny: number, nz: number, fxp: number, fyp: number, fzp: number) => nx * (camX - fxp) + ny * (camY - fyp) + nz * (0 - fzp) > 0;
    const faces: [boolean, [number, number, number][], RGB][] = [];
    // ön uç (boyunca = a0), normal = ileri
    faces.push([toCam(fx, 0, fz, pt.X + fx * a0, Y0 + (y0 + y1) / 2, pt.Z + fz * a0), [P(a0, s0, y0), P(a0, s1, y0), P(a0, s1, y1), P(a0, s0, y1)], cEnd]);
    faces.push([toCam(-fx, 0, -fz, pt.X + fx * a1, Y0 + (y0 + y1) / 2, pt.Z + fz * a1), [P(a1, s0, y0), P(a1, s1, y0), P(a1, s1, y1), P(a1, s0, y1)], cBack]);
    faces.push([toCam(rx, 0, rz, cx + rx * s1, Y0 + (y0 + y1) / 2, cz + rz * s1), [P(a0, s1, y0), P(a1, s1, y0), P(a1, s1, y1), P(a0, s1, y1)], cSide]);
    faces.push([toCam(-rx, 0, -rz, cx + rx * s0, Y0 + (y0 + y1) / 2, cz + rz * s0), [P(a0, s0, y0), P(a1, s0, y0), P(a1, s0, y1), P(a0, s0, y1)], cSide]);
    faces.push([camY > Y0 + y1, [P(a0, s0, y1), P(a0, s1, y1), P(a1, s1, y1), P(a1, s0, y1)], cTop]);
    for (const [vis, pts, c] of faces) {
      if (!vis) continue;
      g.fillStyle = rgba(c);
      poly(g, pts);
    }
    return faces;
  };

  // bize bakan yandaki bir tekerlek, düzgün kısalsın diye yanın kendi düzleminde çizilir
  const wheel = (along: number, s: number, r: number) => {
    const ring = (rr: number) => Array.from({ length: 12 }, (_, i) => P(along + Math.cos((i / 12) * Math.PI * 2) * rr, s, r + Math.sin((i / 12) * Math.PI * 2) * rr));
    g.fillStyle = 'rgba(8,8,10,0.96)';
    poly(g, ring(r));
    g.fillStyle = rgba(shade([150, 154, 160], 0.55, o));
    poly(g, ring(r * 0.55));
    g.fillStyle = 'rgba(20,20,24,0.9)';
    poly(g, ring(r * 0.18));
  };
  const sideStrip = (a0: number, a1: number, s: number, y0: number, y1: number, fill: string) => {
    g.fillStyle = fill;
    poly(g, [P(a0, s, y0), P(a1, s, y0), P(a1, s, y1), P(a0, s, y1)]);
  };

  if (v.kind === 'bus' || v.kind === 'metrobus' || v.kind === 'servis') {
    const servis = v.kind === 'servis';
    const side = shade(v.body, servis ? 0.36 : 0.42, o);
    const faces = box(0, -v.len, -w, w, 0.35, v.hgt, side, shade([170, 172, 178], 0.55, o), shade(v.body, 0.5, o), shade(v.body, 0.5, o));
    // çatıdaki klima üniteleri
    if (faces[4][0]) {
      g.fillStyle = rgba(shade([200, 200, 205], 0.5, o));
      for (const a of [-2.2, -v.len + 3]) poly(g, [P(a, -0.7, v.hgt + 0.25), P(a, 0.7, v.hgt + 0.25), P(a - 1.6, 0.7, v.hgt + 0.25), P(a - 1.6, -0.7, v.hgt + 0.25)]);
    }
    // ışıklı iç mekân: görünen her yüzde, yolcularla dolu bir pencere şeridi;
    // servis hariç: onun koyu filmli camı sokağın yansımasından başka bir şey göstermez
    const band = (pts: [number, number, number][]) => {
      g.fillStyle = servis ? rgba(shade([30, 34, 44], 1, o), 0.97) : rgba(CABIN, 0.9);
      poly(g, pts);
      if (servis) {
        const [a, b, c, d] = pts;
        const lerpP = (u: [number, number, number], v: [number, number, number], f: number): [number, number, number] => [u[0] + (v[0] - u[0]) * f, u[1] + (v[1] - u[1]) * f, u[2]];
        g.fillStyle = 'rgba(190,200,225,0.1)';
        poly(g, [lerpP(a, d, 0.72), lerpP(b, c, 0.72), c, d]);
        g.fillStyle = 'rgba(255,170,120,0.05)';
        poly(g, [a, b, lerpP(b, c, 0.25), lerpP(a, d, 0.25)]);
      }
    };
    const [frontVis, backVis, rightVis, leftVis] = faces.map((f) => f[0]);
    const y0 = servis ? 1.05 : 1.15;
    const y1 = servis ? 2.3 : 2.6;
    const endGlass = (a: number) => band([P(a, -w + 0.15, y0 - 0.1), P(a, w - 0.15, y0 - 0.1), P(a, w - 0.15, y1 + 0.3), P(a, -w + 0.15, y1 + 0.3)]);
    if (frontVis) {
      endGlass(0);
      if (!servis) {
        // ön camın üstünde hattın LED tabelası
        g.fillStyle = 'rgba(12,10,8,0.95)';
        poly(g, [P(0, -w + 0.3, y1 + 0.38), P(0, w - 0.3, y1 + 0.38), P(0, w - 0.3, y1 + 0.68), P(0, -w + 0.3, y1 + 0.68)]);
        g.fillStyle = 'rgba(255,160,40,0.92)';
        poly(g, [P(0, -w + 0.45, y1 + 0.45), P(0, w - 0.45, y1 + 0.45), P(0, w - 0.45, y1 + 0.61), P(0, -w + 0.45, y1 + 0.61)]);
      }
    }
    if (backVis) endGlass(-v.len);
    for (const [vis, s] of [
      [rightVis, w],
      [leftVis, -w],
    ] as const) {
      if (!vis) continue;
      band([P(-0.8, s, y0), P(-v.len + 0.6, s, y0), P(-v.len + 0.6, s, y1), P(-0.8, s, y1)]);
      // pencere kayıtları: uzun bir otobüs tek ışıklı şerit değil, bir dizi camdır
      if (!servis) for (let a = -2.4; a > -v.len + 1.2; a -= 1.55) sideStrip(a, a - 0.12, s, y0, y1, 'rgba(18,18,22,0.72)');
      if (v.kind === 'metrobus') {
        // körük: kıvrımlarıyla koyu bir körük
        sideStrip(-v.len / 2 + 0.45, -v.len / 2 - 0.45, s, 0.35, v.hgt, 'rgba(20,20,24,0.95)');
        for (let k2 = -0.3; k2 <= 0.31; k2 += 0.15) sideStrip(-v.len / 2 + k2, -v.len / 2 + k2 - 0.04, s, 0.4, v.hgt - 0.05, 'rgba(70,70,78,0.7)');
      }
      // tekerlekler: ön aks, arka aks(lar)
      const axles = v.kind === 'metrobus' ? [-2.6, -v.len / 2 - 2.2, -v.len + 2.4] : [-2.4, -v.len + 2.8];
      for (const a of axles) wheel(a, s, 0.5);
      // şerit: otobüslerde beyaz, serviste şirketin mavi bandı
      g.fillStyle = servis ? 'rgba(40,80,150,0.75)' : 'rgba(235,235,235,0.55)';
      poly(g, [P(-0.2, s, 0.8), P(-v.len + 0.2, s, 0.8), P(-v.len + 0.2, s, 0.95), P(-0.2, s, 0.95)]);
    }
    return;
  }

  const lowerTop = v.kind === 'van' ? 1.1 : 0.92;
  const lower = box(0, -v.len, -w, w, 0.28, lowerTop, shade(v.body, 0.3, o), shade(v.body, 0.44, o), shade(v.body, 0.38, o), shade(v.body, 0.38, o));
  // bize bakan uçtaki ayrıntılar: tampon, plaka, ızgara
  const [, , kk] = P(0, 0, 0.5);
  if (kk > 6) {
    const endA = lower[0][0] ? 0 : lower[1][0] ? -v.len : null;
    if (endA !== null) {
      g.fillStyle = 'rgba(8,8,10,0.75)';
      poly(g, [P(endA, -w, 0.28), P(endA, w, 0.28), P(endA, w, 0.4), P(endA, -w, 0.4)]);
      g.fillStyle = 'rgba(225,225,215,0.85)';
      poly(g, [P(endA, -0.26, 0.42), P(endA, 0.26, 0.42), P(endA, 0.26, 0.54), P(endA, -0.26, 0.54)]);
      if (endA === 0) {
        g.fillStyle = 'rgba(10,10,12,0.8)';
        poly(g, [P(0, -0.45, 0.58), P(0, 0.45, 0.58), P(0, 0.45, 0.76), P(0, -0.45, 0.76)]);
      } else {
        g.fillStyle = 'rgba(120,10,10,0.9)';
        for (const s2 of [-1, 1]) poly(g, [P(endA, s2 * (w - 0.08), 0.74), P(endA, s2 * (w - 0.55), 0.74), P(endA, s2 * (w - 0.55), 0.92), P(endA, s2 * (w - 0.08), 0.92)]);
      }
    }
  }
  // bize bakan yan: omuz çizgisini yakalayan bir ışık ve tekerlekler
  for (const [vis, s] of [
    [lower[2][0], w],
    [lower[3][0], -w],
  ] as const) {
    if (!vis) continue;
    sideStrip(-0.25, -v.len + 0.25, s, lowerTop - 0.14, lowerTop - 0.08, rgba(shade(mix(v.body, [255, 255, 255], 0.35), 0.75, o), 0.8));
    const r0 = v.kind === 'van' ? 0.36 : 0.32;
    wheel(-v.len * 0.18, s, r0);
    wheel(-v.len * 0.8, s, r0);
  }
  const glass = mix(GLASS, o.ambient, o.ambientA * 0.8);
  if (v.kind === 'van') {
    box(-0.9, -v.len, -w * 0.97, w * 0.97, lowerTop, v.hgt, shade(v.body, 0.4, o), shade(v.body, 0.66, o), glass, shade(v.body, 0.45, o));
  } else {
    const cabin = box(-v.len * 0.26, -v.len * 0.78, -w * 0.86, w * 0.86, lowerTop, v.hgt, glass, shade(v.body, 0.4, o), glass, glass);
    // pencereler arasındaki dikmeler, gövde renginde
    for (const [vis, s] of [
      [cabin[2][0], w * 0.86],
      [cabin[3][0], -w * 0.86],
    ] as const) {
      if (!vis) continue;
      const pillar = rgba(shade(v.body, 0.34, o));
      for (const a of [-v.len * 0.26, -v.len * 0.52, -v.len * 0.78]) sideStrip(a + 0.06, a - 0.06, s, lowerTop, v.hgt, pillar);
    }
  }
  if (v.kind === 'taxi') {
    const a = -v.len * 0.52;
    box(a + 0.3, a - 0.3, -0.35, 0.35, v.hgt, v.hgt + 0.22, [230, 200, 120], [255, 230, 150], [255, 236, 170], [255, 236, 170]);
  }
}

function poly(g: CanvasRenderingContext2D, pts: [number, number, number][]) {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath();
  g.fill();
}

