import { useEffect, useRef } from 'react';
import { PAPER_H, PAPER_W, SHADOW_PAD, paperTextures } from './paperTextures';
import styles from './PaperStorm.module.css';

/*
 * Real-time paper simulation for the application-flood screen, drawn on one canvas.
 *
 * Every sheet is a thin plate in 3D above the desk (the screen): it has a height, a velocity and
 * an orientation (yaw + two tilts). The camera looks straight down with perspective, so sheets
 * that fly high come closer and grow; a directional light shades them by their tilt and casts a
 * shadow on the desk that drifts away and softens with height.
 *
 * mode "in"  — CVs are sucked into the AI core: a tightening, accelerating vortex from beyond the
 *              screen edges; they tumble, lose height and vanish into the core.
 * mode "out" — the core blasts rejected CVs out. Launch: ballistic with gravity and orientation-
 *              dependent air drag (edge-on slices through the air, broadside brakes hard), while
 *              tumbling. Once slow and falling, a sheet flutters down like a leaf — a pendulum
 *              sway of its tilts driving a side-to-side glide. It lands, slides, flattens, and
 *              gets stamped. Sheets pile up on each other; about a third sail off-screen.
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

const G = 1500; // px/s², gravity towards the desk
const CAMERA = 1500; // camera height above the desk (px) — sets the perspective
const LIGHT = norm(-0.38, -0.55, 0.74);

function norm(x: number, y: number, z: number): [number, number, number] {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
}
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const approach = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

interface Sheet {
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
  // glide (falling leaf)
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
  // "in" mode path
  life: number;
  r0: number;
  th0: number;
  swirl: number;
  z0: number;
  pan: number;
  absorbed: boolean;
}

interface PaperStormProps {
  mode: 'in' | 'out';
  origin: Point;
  count: number;
  /** "in": seconds over which the CVs keep arriving. */
  window?: number;
  chaotic?: boolean;
  clear?: ClearZone;
  onAbsorb?: (pan: number) => void;
  onLaunch?: (papers: { pan: number; delay: number }[]) => void;
  onLand?: (pan: number, index: number) => void;
}

function makeIn(origin: Point, vw: number, vh: number, count: number, spread: number): Sheet[] {
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

function makeOut(origin: Point, vw: number, vh: number, count: number, chaotic: boolean, clear: ClearZone): Sheet[] {
  const landers = Math.round(count * (chaotic ? 0.74 : 0.68));
  return Array.from({ length: count }, (_, i) => {
    const lands = i < landers;
    let tx = 0;
    let ty = 0;
    if (lands) {
      // anywhere on the desk except the zone around the core and its UI
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

/** Corners (TL, TR, BL) and normal of a sheet in world space. */
function pose(s: Sheet, shrink = 1) {
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

export function PaperStorm({ mode, origin, count, window: spawnWindow = 1.8, chaotic = false, clear = { halfWidth: 0, above: 0, below: 0 }, onAbsorb, onLaunch, onLand }: PaperStormProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const callbacks = useRef({ onAbsorb, onLaunch, onLand });
  useEffect(() => {
    callbacks.current = { onAbsorb, onLaunch, onLand };
  });
  // The core's position is captured at mount; a resize mid-flight must not restart the simulation.
  const setup = useRef({ origin, count, spawnWindow, chaotic, clear, mode });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const g: CanvasRenderingContext2D = ctx;
    const { origin: o, count: n, spawnWindow: win, chaotic: chaos, clear: cz, mode: m } = setup.current;
    const tex = paperTextures();
    let vw = window.innerWidth;
    let vh = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = () => {
      vw = window.innerWidth;
      vh = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(vw * dpr);
      canvas.height = Math.round(vh * dpr);
    };
    size();
    window.addEventListener('resize', size);

    const sheets = m === 'in' ? makeIn(o, vw, vh, n, win) : makeOut(o, vw, vh, n, chaos, cz);
    if (m === 'out') callbacks.current.onLaunch?.(sheets.map((s) => ({ pan: s.pan, delay: s.spawn })));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let landings = 0;

    const project = (p: [number, number, number]) => {
      const k = CAMERA / Math.max(200, CAMERA - p[2]);
      return [vw / 2 + (p[0] - vw / 2) * k, vh / 2 + (p[1] - vh / 2) * k] as const;
    };

    const affine = (tl: readonly [number, number], tr: readonly [number, number], bl: readonly [number, number]) => {
      g.setTransform(((tr[0] - tl[0]) / PAPER_W) * dpr, ((tr[1] - tl[1]) / PAPER_W) * dpr, ((bl[0] - tl[0]) / PAPER_H) * dpr, ((bl[1] - tl[1]) / PAPER_H) * dpr, tl[0] * dpr, tl[1] * dpr);
    };

    function drawShadow(s: Sheet, shrink: number, fade: number) {
      const { tl, tr, bl } = pose(s, shrink);
      const drop = (p: [number, number, number]): [number, number, number] => [p[0] - (p[2] * LIGHT[0]) / LIGHT[2], p[1] - (p[2] * LIGHT[1]) / LIGHT[2], 0];
      const h = Math.max(0, s.z);
      const sprite = h < 25 ? tex.shadows[0] : h < 170 ? tex.shadows[1] : tex.shadows[2];
      affine(project(drop(tl)), project(drop(tr)), project(drop(bl)));
      g.globalAlpha = (0.3 * (1 - Math.min(1, h / 900)) + 0.06) * fade;
      g.drawImage(sprite, -SHADOW_PAD, -SHADOW_PAD, PAPER_W + SHADOW_PAD * 2, PAPER_H + SHADOW_PAD * 2);
    }

    function drawSheet(s: Sheet, shrink: number, fade: number, t: number) {
      const { tl, tr, bl, n: nrm } = pose(s, shrink);
      const ptl = project(tl);
      const ptr = project(tr);
      const pbl = project(bl);
      const pbr = [ptr[0] + pbl[0] - ptl[0], ptr[1] + pbl[1] - ptl[1]] as const;
      const area = (ptr[0] - ptl[0]) * (pbl[1] - ptl[1]) - (ptr[1] - ptl[1]) * (pbl[0] - ptl[0]);
      const faceUp = nrm[2] >= 0;
      // brightness from the light, specular glint when the sheet catches it
      const nl = (faceUp ? 1 : -1) * (nrm[0] * LIGHT[0] + nrm[1] * LIGHT[1] + nrm[2] * LIGHT[2]);
      const bright = 0.6 + 0.4 * Math.max(0, nl);
      const hx = LIGHT[0];
      const hy = LIGHT[1];
      const hz = LIGHT[2] + 1;
      const hl = Math.hypot(hx, hy, hz);
      const spec = Math.pow(Math.max(0, (faceUp ? 1 : -1) * (nrm[0] * hx + nrm[1] * hy + nrm[2] * hz) / hl), 30);

      if (Math.abs(area) < 6) {
        // edge-on: just the paper's edge catching the light
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.globalAlpha = 0.8 * fade;
        g.strokeStyle = '#f3efe6';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(ptl[0], ptl[1]);
        g.lineTo(pbr[0], pbr[1]);
        g.stroke();
        return;
      }
      // motion blur for fast sheets
      const speed = Math.hypot(s.vx, s.vy);
      if (s.state === 'fly' && speed > 900) {
        const k = 0.014;
        affine([ptl[0] - s.vx * k, ptl[1] - s.vy * k], [ptr[0] - s.vx * k, ptr[1] - s.vy * k], [pbl[0] - s.vx * k, pbl[1] - s.vy * k]);
        g.globalAlpha = 0.22 * fade;
        g.drawImage(faceUp ? (s.glitch ? tex.glitch : tex.fronts[s.tex % tex.fronts.length]) : tex.back, 0, 0, PAPER_W, PAPER_H);
      }
      affine(ptl, ptr, pbl);
      g.globalAlpha = fade;
      g.drawImage(faceUp ? (s.glitch ? tex.glitch : tex.fronts[s.tex % tex.fronts.length]) : tex.back, 0, 0, PAPER_W, PAPER_H);
      // stamp once it has landed face up
      if (s.state === 'landed' && faceUp) {
        const k = clamp((t - s.landedAt - 0.15) / 0.22, 0, 1);
        if (k > 0) {
          const back = 1 + 1.7 * (k - 1) ** 3 + 0.7 * (k - 1) ** 2;
          const sc = 1.9 - 0.9 * back;
          const w = 40 * sc * 0.95;
          const h = 16 * sc * 0.95;
          g.globalAlpha = k * 0.9 * fade;
          g.drawImage(s.glitch ? tex.stampError : tex.stamp, PAPER_W / 2 - w / 2, PAPER_H * 0.56 - h / 2, w, h);
        }
      }
      // shading pass over the sheet
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.beginPath();
      g.moveTo(ptl[0], ptl[1]);
      g.lineTo(ptr[0], ptr[1]);
      g.lineTo(pbr[0], pbr[1]);
      g.lineTo(pbl[0], pbl[1]);
      g.closePath();
      g.globalAlpha = (1 - bright) * fade;
      g.fillStyle = '#1b160f';
      g.fill();
      if (spec > 0.02) {
        g.globalAlpha = spec * 0.45 * fade;
        g.fillStyle = '#ffffff';
        g.fill();
      }
      g.globalAlpha = 0.18 * fade;
      g.strokeStyle = '#8a8272';
      g.lineWidth = 0.5;
      g.stroke();
    }

    function stepOut(s: Sheet, t: number, dt: number) {
      if (s.state === 'wait') {
        if (t < s.spawn) return;
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
          // from tumbling to fluttering: settle towards the nearer flat side
          s.state = 'glide';
          s.a = wrap(s.a);
          s.b = wrap(s.b);
          // most sheets flip face-up as they catch the air; a few land on their back
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
        // pendulum: glide sideways along the swing, drop fastest mid-swing
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
          callbacks.current.onLand?.(clamp((s.x - vw / 2) / (vw / 2), -1, 1), landings++);
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
    }

    function frameOut(t: number, dt: number) {
      let alive = false;
      for (const s of sheets) {
        if (s.state === 'gone') continue;
        // two substeps keep the fast launches stable
        stepOut(s, t, dt / 2);
        stepOut(s, t, dt / 2);
        const st = s.state as Sheet['state'];
        if (st !== 'gone' && (st !== 'landed' || t - s.landedAt < 0.8)) alive = true;
      }
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, canvas!.width, canvas!.height);
      const live = sheets.filter((s) => s.state !== 'gone' && s.state !== 'wait');
      // landed first (in landing order), then airborne sheets low to high
      live.sort((p, q) => (p.state === 'landed' ? (q.state === 'landed' ? p.landedAt - q.landedAt : -1) : q.state === 'landed' ? 1 : p.z - q.z));
      for (const s of live) drawShadow(s, 1, 1);
      for (const s of live) {
        const emerge = s.state === 'fly' ? clamp((t - s.spawn) / 0.12, 0.25, 1) : 1;
        drawSheet(s, emerge, 1, t);
      }
      g.globalAlpha = 1;
      return alive;
    }

    function frameIn(t: number) {
      let alive = false;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, canvas!.width, canvas!.height);
      const drawList: { s: Sheet; shrink: number; fade: number }[] = [];
      for (const s of sheets) {
        if (s.absorbed) continue;
        const u = (t - s.spawn) / s.life;
        if (u < 0) {
          alive = true;
          continue;
        }
        if (u >= 1) {
          s.absorbed = true;
          callbacks.current.onAbsorb?.(s.pan);
          continue;
        }
        alive = true;
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
        const shrink = clamp(r / 90, 0.05, 1);
        const fade = Math.min(1, u / 0.06) * clamp(r / 22, 0, 1);
        drawList.push({ s, shrink, fade });
      }
      drawList.sort((p, q) => p.s.z - q.s.z);
      for (const d of drawList) drawShadow(d.s, d.shrink, d.fade);
      for (const d of drawList) drawSheet(d.s, d.shrink, d.fade, t);
      g.globalAlpha = 1;
      return alive;
    }

    if (reduced) {
      if (m === 'out') {
        for (const s of sheets) {
          if (!s.lands) continue;
          s.state = 'landed';
          s.x = s.tx;
          s.y = s.ty;
          s.z = 0;
          s.a = 0;
          s.b = 0;
          s.landedAt = -1;
        }
        frameOut(1, 0);
      }
      return () => window.removeEventListener('resize', size);
    }

    let raf = 0;
    let start = 0;
    let last = 0;
    const frame = (now: number) => {
      if (!start) start = last = now;
      const t = (now - start) / 1000;
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const alive = m === 'out' ? frameOut(t, dt) : frameIn(t);
      if (alive) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', size);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.layer} aria-hidden="true" />;
}
