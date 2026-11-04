import { PAPER_H, PAPER_W } from './paperTextures';

/*
 * Kâğıt fırtınasının fiziği: her sayfanın durumu ve nasıl hareket ettiği. Canvas yok, DOM yok;
 * çizici (paperRender.ts) bunun ürettiğini çizer, testler de doğrudan adım adım ilerletir.
 */

export interface Point {
  x: number;
  y: number;
}

export interface ClearZone {
  halfWidth: number;
  above: number;
  below: number;
}

export const G = 1500; // px/s², masaya doğru yerçekimi
export const CAMERA = 1500; // kameranın masadan yüksekliği (px): perspektifi belirler
export const LIGHT = norm(-0.38, -0.55, 0.74);

function norm(x: number, y: number, z: number): [number, number, number] {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
}
const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const approach = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export interface Sheet {
  tex: number;
  glitch: boolean;
  state: 'wait' | 'fly' | 'glide' | 'landed' | 'gone';
  spawn: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  a: number;
  b: number;
  wYaw: number;
  wa: number;
  wb: number;
  // süzülme (düşen yaprak)
  phase: number;
  omega: number;
  ampA: number;
  ampB: number;
  swayX: number;
  swayY: number;
  sway: number;
  fall: number;
  restA: number;
  restB: number;
  tx: number;
  ty: number;
  lands: boolean;
  landedAt: number;
  // "in" modunun yolu
  life: number;
  r0: number;
  th0: number;
  swirl: number;
  z0: number;
  pan: number;
  absorbed: boolean;
}

export function makeIn(origin: Point, vw: number, vh: number, count: number, spread: number): Sheet[] {
  const radius = Math.hypot(vw, vh) * 0.62;
  return Array.from({ length: count }, (_, i) => {
    const th = Math.random() * Math.PI * 2;
    const sx = vw / 2 + Math.cos(th) * radius;
    const sy = vh / 2 + Math.sin(th) * radius;
    return blank({
      tex: i,
      spawn: (i / count) * spread + rand(0, 0.1),
      life: rand(0.9, 1.35),
      r0: Math.hypot(sx - origin.x, sy - origin.y),
      th0: Math.atan2(sy - origin.y, sx - origin.x),
      swirl: rand(0.9, 2) * (Math.random() < 0.5 ? -1 : 1),
      z0: rand(120, 520),
      yaw: rand(-Math.PI, Math.PI),
      a: rand(-0.6, 0.6),
      b: rand(-0.6, 0.6),
      wYaw: rand(-7, 7),
      wa: rand(-9, 9),
      wb: rand(-7, 7),
      pan: clamp((sx - vw / 2) / (vw / 2), -1, 1),
    });
  });
}

export function makeOut(origin: Point, vw: number, vh: number, count: number, chaotic: boolean, clear: ClearZone): Sheet[] {
  const landers = Math.round(count * (chaotic ? 0.74 : 0.68));
  return Array.from({ length: count }, (_, i) => {
    const lands = i < landers;
    let tx = 0;
    let ty = 0;
    if (lands) {
      // masanın her yeri, çekirdeğin ve arayüzünün çevresindeki alan hariç
      for (let k = 0; k < 40; k++) {
        tx = rand(30, vw - 30);
        ty = rand(40, vh - 30);
        const inClear = Math.abs(tx - origin.x) < clear.halfWidth + 30 && ty > origin.y - clear.above && ty < origin.y + clear.below;
        if (!inClear) break;
      }
    } else {
      const ang = Math.random() * Math.PI * 2;
      tx = origin.x + Math.cos(ang) * vw;
      ty = origin.y + Math.sin(ang) * vh;
    }
    const dx = tx - origin.x;
    const dy = ty - origin.y;
    const dist = Math.hypot(dx, dy) || 1;
    const hSpeed = lands ? clamp(dist * 1.35 + 140, 260, 1500) : rand(1400, 2100);
    const tumble = chaotic ? 1.6 : 1;
    return blank({
      tex: i,
      glitch: chaotic && Math.random() < 0.35,
      spawn: chaotic ? rand(0, 0.28) : Math.pow(Math.random(), 1.6) * 0.42,
      x: origin.x + rand(-10, 10),
      y: origin.y + rand(-10, 10),
      z: 70,
      vx: (dx / dist) * hSpeed,
      vy: (dy / dist) * hSpeed,
      vz: rand(380, 760),
      yaw: rand(-Math.PI, Math.PI),
      a: rand(-0.4, 0.4),
      b: rand(-0.4, 0.4),
      wYaw: rand(-8, 8) * tumble,
      wa: rand(-14, 14) * tumble,
      wb: rand(-11, 11) * tumble,
      omega: rand(2.6, 3.8),
      ampA: rand(0.35, 0.7),
      ampB: rand(0.25, 0.55),
      sway: rand(90, 170),
      fall: lands ? rand(95, 140) : rand(180, 240),
      tx,
      ty,
      lands,
      pan: clamp(dx / (vw / 2), -1, 1),
    });
  });
}

function blank(p: Partial<Sheet>): Sheet {
  return {
    tex: 0,
    glitch: false,
    state: 'wait',
    spawn: 0,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: 0,
    a: 0,
    b: 0,
    wYaw: 0,
    wa: 0,
    wb: 0,
    phase: 0,
    omega: 3,
    ampA: 0.5,
    ampB: 0.4,
    swayX: 1,
    swayY: 0,
    sway: 120,
    fall: 110,
    restA: 0,
    restB: 0,
    tx: 0,
    ty: 0,
    lands: true,
    landedAt: 0,
    life: 1,
    r0: 0,
    th0: 0,
    swirl: 1,
    z0: 0,
    pan: 0,
    absorbed: false,
    ...p,
  };
}

/** Bir sayfanın dünya uzayındaki köşeleri (sol üst, sağ üst, sol alt) ve normali. */
export function pose(s: Sheet, shrink = 1) {
  const ca = Math.cos(s.a);
  const sa = Math.sin(s.a);
  const cb = Math.cos(s.b);
  const sb = Math.sin(s.b);
  const cy = Math.cos(s.yaw);
  const sy = Math.sin(s.yaw);
  const tf = (lx: number, ly: number): [number, number, number] => {
    const x1 = lx * cb + ly * sa * sb;
    const y1 = ly * ca;
    const z1 = -lx * sb + ly * sa * cb;
    return [s.x + (x1 * cy - y1 * sy) * shrink, s.y + (x1 * sy + y1 * cy) * shrink, s.z + z1 * shrink];
  };
  const hw = PAPER_W / 2;
  const hh = PAPER_H / 2;
  const nx0 = ca * sb;
  const ny0 = -sa;
  const n: [number, number, number] = [nx0 * cy - ny0 * sy, nx0 * sy + ny0 * cy, ca * cb];
  return { tl: tf(-hw, -hh), tr: tf(hw, -hh), bl: tf(-hw, hh), n };
}

/** "out" sayfasını dt kadar ilerletir. Masaya değdiği adımda true döner. */
export function stepOut(s: Sheet, t: number, dt: number, vw: number, vh: number): boolean {
  let landedNow = false;
  if (s.state === 'wait') {
    if (t < s.spawn) return false;
    s.state = 'fly';
  }
  if (s.state === 'fly') {
    const sp = Math.hypot(s.vx, s.vy, s.vz) || 1;
    const { n: nrm } = pose(s);
    const vn = Math.abs((s.vx * nrm[0] + s.vy * nrm[1] + s.vz * nrm[2]) / sp);
    const c = 0.00055 + 0.0026 * vn;
    s.vx -= c * sp * s.vx * dt;
    s.vy -= c * sp * s.vy * dt;
    s.vz -= (c * sp * s.vz + G) * dt;
    s.yaw += s.wYaw * dt;
    s.a += s.wa * dt;
    s.b += s.wb * dt;
    const spin = Math.exp(-0.7 * dt);
    s.wYaw *= spin;
    s.wa *= spin;
    s.wb *= spin;
    if (s.vz < 0 && (Math.hypot(s.vx, s.vy) < 380 || s.z < 110)) {
      // takla atmaktan süzülmeye: daha yakın düz yüzüne doğru yerleşir
      s.state = 'glide';
      s.a = wrap(s.a);
      s.b = wrap(s.b);
      // sayfaların çoğu havayı yakalayınca yüzü yukarı döner; birkaçı sırt üstü düşer
      const faceDown = Math.abs(s.a) > 2.5 && Math.random() < 0.5;
      s.restA = faceDown ? Math.PI * Math.sign(s.a) : 0;
      if (!faceDown && Math.abs(s.a) > Math.PI / 2) s.a -= Math.PI * 2 * Math.sign(s.a) * (Math.abs(s.a) > Math.PI ? 1 : 0);
      s.restB = 0;
      const d = Math.hypot(s.vx, s.vy) || 1;
      s.swayX = s.vx / d;
      s.swayY = s.vy / d;
      s.phase = Math.random() * Math.PI * 2;
    }
  } else if (s.state === 'glide') {
    s.phase += s.omega * dt;
    const sw = Math.sin(s.phase);
    const toA = s.restA + s.ampA * sw;
    const toB = s.restB + s.ampB * Math.sin(s.phase * 0.8 + 1.3);
    s.a += (toA - s.a) * approach(5, dt);
    s.b += (toB - s.b) * approach(5, dt);
    // sarkaç: salınım boyunca yana süzül, en hızlı salınımın ortasında düş
    const steer = s.lands ? 1.3 : 0;
    const txv = s.swayX * s.sway * Math.cos(s.phase) + clamp((s.tx - s.x) * steer, -170, 170) + (s.lands ? 0 : s.swayX * 160);
    const tyv = s.swayY * s.sway * Math.cos(s.phase) + clamp((s.ty - s.y) * steer, -170, 170) + (s.lands ? 0 : s.swayY * 160);
    s.vx += (txv - s.vx) * approach(3.5, dt);
    s.vy += (tyv - s.vy) * approach(3.5, dt);
    s.vz += (-s.fall * (0.3 + 1.4 * sw * sw) - s.vz) * approach(4, dt);
    s.yaw += s.wYaw * dt;
    s.wYaw *= Math.exp(-1.2 * dt);
    if (s.z <= 0) {
      s.z = 0;
      s.vz = 0;
      s.state = 'landed';
      s.landedAt = t;
      landedNow = true;
    }
  } else if (s.state === 'landed') {
    const f = Math.exp(-9 * dt);
    s.vx *= f;
    s.vy *= f;
    s.wYaw *= Math.exp(-6 * dt);
    s.yaw += s.wYaw * dt;
    s.a += (s.restA - s.a) * approach(16, dt);
    s.b += (0 - s.b) * approach(16, dt);
  }
  s.x += s.vx * dt;
  s.y += s.vy * dt;
  s.z = s.state === 'landed' ? 0 : s.z + s.vz * dt;
  if (s.x < -300 || s.x > vw + 300 || s.y < -300 || s.y > vh + 300) s.state = 'gone';
  return landedNow;
}

/**
 * "in" sayfasını t anında sarmalı üzerine yerleştirir. Nasıl çizileceğini döndürür; doğmadan
 * önce 'waiting', çekirdeğe ulaştığı karede 'absorbed'.
 */
export function stepIn(s: Sheet, t: number, o: Point): { shrink: number; fade: number } | 'waiting' | 'absorbed' {
  const u = (t - s.spawn) / s.life;
  if (u < 0) return 'waiting';
  if (u >= 1) {
  s.absorbed = true;
  return 'absorbed';
  }
  const e = Math.pow(u, 1.7);
  const r = s.r0 * (1 - e);
  const th = s.th0 + s.swirl * e;
  const prevX = s.x;
  const prevY = s.y;
  s.x = o.x + Math.cos(th) * r;
  s.y = o.y + Math.sin(th) * r;
  s.vx = (s.x - prevX) * 60;
  s.vy = (s.y - prevY) * 60;
  s.z = 50 + (s.z0 - 50) * Math.pow(1 - e, 1.4);
  s.yaw = s.yaw + s.wYaw / 60;
  s.a = Math.sin(u * 5 + s.wa) * 0.9;
  s.b = Math.cos(u * 4 + s.wb) * 0.7;
  return { shrink: clamp(r / 90, 0.05, 1), fade: Math.min(1, u / 0.06) * clamp(r / 22, 0, 1) };
}
