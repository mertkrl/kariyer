import { audioEngine, type PourSound } from '../../audio/audioEngine';

/*
 * Physically-modelled Turkish tea pour for the break room.
 *
 * Glass: tulip profile (half-width by height), treated as a solid of revolution so the level
 * rises faster through the narrow waist. Volume is normalised: 1 = "full" (86% of the glass).
 *
 * Pour: first the demlik lifts off the kettle and pours strong brew (concentration 1), then the
 * kettle tilts and tops up with hot water (concentration 0). The brew amount is chosen so the
 * mix lands on "tavşan kanı" (≈0.42) whatever was left in the glass. Each stream is a ballistic
 * parabola; its width follows continuity (w ∝ 1/√speed) so it thins as it falls. Liquid only
 * counts once it reaches the surface; the impact throws droplets, rings and foam.
 */

// ── Glass geometry (glass-local units: origin at the bottom centre, y up is negative) ──

export const GLASS_HEIGHT = 120;
export const FULL_HEIGHT = GLASS_HEIGHT * 0.86;

const GLASS_PROFILE: [number, number][] = [
  [0, 18],
  [10, 23],
  [25, 26],
  [40, 25],
  [55, 21],
  [70, 18],
  [85, 19],
  [100, 24],
  [120, 28],
];

export function glassHalfWidth(height: number) {
  for (let i = 1; i < GLASS_PROFILE.length; i++) {
    const [h1, w1] = GLASS_PROFILE[i];
    const [h0, w0] = GLASS_PROFILE[i - 1];
    if (height <= h1) return w0 + ((Math.max(0, height) - h0) / (h1 - h0)) * (w1 - w0);
  }
  return 28;
}

// Cumulative volume table: V(h) = ∫ π r(h)² dh, normalised so V(FULL_HEIGHT) = 1.
const STEPS = 240;
const VOLUME_TABLE: number[] = (() => {
  const table = [0];
  let acc = 0;
  for (let i = 1; i <= STEPS; i++) {
    const h = (i / STEPS) * FULL_HEIGHT;
    const r = glassHalfWidth(h - FULL_HEIGHT / STEPS / 2);
    acc += Math.PI * r * r * (FULL_HEIGHT / STEPS);
    table.push(acc);
  }
  return table.map((v) => v / acc);
})();

/** Liquid height (glass units) for a normalised volume 0–1. */
export function heightForVolume(volume: number) {
  const v = Math.max(0, Math.min(1, volume));
  let lo = 0;
  let hi = STEPS;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (VOLUME_TABLE[mid] < v) lo = mid;
    else hi = mid;
  }
  const span = VOLUME_TABLE[hi] - VOLUME_TABLE[lo] || 1;
  return ((lo + (v - VOLUME_TABLE[lo]) / span) / STEPS) * FULL_HEIGHT;
}

// ── Colour of the brew by concentration ─────────────────────────────────────

const COLOR_STOPS: [number, [number, number, number]][] = [
  [0, [226, 236, 238]],
  [0.12, [222, 150, 70]],
  [0.25, [206, 96, 32]],
  [0.42, [168, 48, 14]],
  [0.7, [96, 19, 6]],
  [1, [44, 9, 3]],
];

function mix(c: number): [number, number, number] {
  const x = Math.max(0, Math.min(1, c));
  for (let i = 1; i < COLOR_STOPS.length; i++) {
    const [c1, rgb1] = COLOR_STOPS[i];
    const [c0, rgb0] = COLOR_STOPS[i - 1];
    if (x <= c1) {
      const t = (x - c0) / (c1 - c0);
      return [0, 1, 2].map((k) => rgb0[k] + (rgb1[k] - rgb0[k]) * t) as [number, number, number];
    }
  }
  return COLOR_STOPS[COLOR_STOPS.length - 1][1];
}

const rgb = ([r, g, b]: [number, number, number], k = 1) =>
  `rgb(${Math.round(Math.min(255, r * k))}, ${Math.round(Math.min(255, g * k))}, ${Math.round(Math.min(255, b * k))})`;

export interface TeaColors {
  edge: string;
  mid: string;
  surface: string;
  opacity: number;
}

export function teaColors(concentration: number): TeaColors {
  const base = mix(concentration);
  return {
    edge: rgb(base, 0.72),
    mid: rgb(base, 1.12),
    surface: rgb(base, 1.18),
    opacity: 0.5 + 0.45 * Math.min(1, concentration / 0.2),
  };
}

export const TAVSAN_KANI = 0.42;

// ── Pour animation ───────────────────────────────────────────────────────────

/** Scene position of the kettle group's origin and the glass origin. */
const KETTLE_ORIGIN = { x: 1100, y: 480 };
const GLASS_ORIGIN = { x: 990, y: 586 };

interface Vessel {
  /** Spout tip and rotation pivot, kettle-local. */
  tip: { x: number; y: number };
  pivot: { x: number; y: number };
  /** Tilt at full pour (deg, negative = spout down) and where the tip should end up (scene). */
  angle: number;
  target: { x: number; y: number };
  rate: number; // normalised volume per second
  width: number; // stream width at the spout
  color: string;
  highlight: string;
  sound: 'brew' | 'water';
}

const DEMLIK: Vessel = {
  tip: { x: -62, y: -126 },
  pivot: { x: 0, y: -74 },
  angle: -40,
  target: { x: 1016, y: 394 },
  rate: 0.45,
  width: 3.2,
  color: 'rgba(70, 14, 5, 0.95)',
  highlight: 'rgba(255, 190, 150, 0.45)',
  sound: 'brew',
};

const KETTLE: Vessel = {
  tip: { x: -74, y: -50 },
  pivot: { x: 0, y: -34 },
  angle: -30,
  target: { x: 1022, y: 404 },
  rate: 0.8,
  width: 4.6,
  color: 'rgba(222, 236, 241, 0.72)',
  highlight: 'rgba(255, 255, 255, 0.8)',
  sound: 'water',
};

const GRAVITY = 1600; // px/s² in scene units — tuned so the fall reads as real at this scale
const LIFT_TIME = 0.5;
const RETURN_TIME = 0.45;

function rotate(p: { x: number; y: number }, c: { x: number; y: number }, deg: number) {
  const a = (deg * Math.PI) / 180;
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return { x: c.x + dx * Math.cos(a) - dy * Math.sin(a), y: c.y + dx * Math.sin(a) + dy * Math.cos(a) };
}

/** Translation (kettle-local) that puts the rotated tip on the target point. */
function poseOffset(v: Vessel) {
  const tip = rotate(v.tip, v.pivot, v.angle);
  return { x: v.target.x - KETTLE_ORIGIN.x - tip.x, y: v.target.y - KETTLE_ORIGIN.y - tip.y };
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export interface PourElements {
  demlik: SVGGElement;
  kettle: SVGGElement;
  stream: SVGPathElement;
  streamHighlight: SVGPathElement;
  streamHead: SVGCircleElement;
  fill: SVGRectElement;
  surface: SVGEllipseElement;
  stops: [SVGStopElement, SVGStopElement, SVGStopElement];
  /** Pools of circles/ellipses inside the glass clip for splash, rings and foam. */
  droplets: SVGCircleElement[];
  rings: SVGEllipseElement[];
  foam: SVGCircleElement[];
}

interface Stage {
  vessel: Vessel;
  volume: number;
  concentration: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  r: number;
}

export interface PourPlan {
  startVolume: number;
  startConcentration: number;
  stages: Stage[];
}

/** Brew first (enough to land on tavşan kanı), then water to the brim. */
export function planPour(volume: number, concentration: number): PourPlan {
  const room = 1 - volume;
  let brew = Math.max(0, Math.min(room, TAVSAN_KANI - volume * concentration));
  if (brew < 0.04) brew = 0;
  let water = room - brew;
  if (water < 0.03) water = 0;
  const stages: Stage[] = [];
  if (brew > 0) stages.push({ vessel: DEMLIK, volume: brew, concentration: 1 });
  if (water > 0) stages.push({ vessel: KETTLE, volume: water, concentration: 0 });
  return { startVolume: volume, startConcentration: concentration, stages };
}

export function runPour(
  plan: PourPlan,
  el: PourElements,
  callbacks: {
    onStage: (kind: 'brew' | 'water') => void;
    onDone: (volume: number, concentration: number) => void;
  },
): () => void {
  let volume = plan.startVolume;
  let concentration = plan.startConcentration;
  let stageIndex = 0;
  let stagePoured = 0;
  let stageStart = performance.now() / 1000;
  let last = stageStart;
  let raf = 0;
  let sound: PourSound | null = null;
  let ringTimer = 0;
  let foamTimer = 0;
  const droplets: Particle[] = [];
  const rings: Particle[] = [];
  const foam: Particle[] = [];

  callbacks.onStage(plan.stages[0].vessel.sound);

  function applyLiquid(wobble: number) {
    const h = heightForVolume(volume);
    const colors = teaColors(concentration);
    el.fill.style.transform = `scaleY(${h / GLASS_HEIGHT})`;
    el.fill.style.opacity = String(colors.opacity);
    el.surface.style.transform = `translateY(${-h}px) scale(${glassHalfWidth(h) / 28}, ${1 + wobble})`;
    el.surface.style.opacity = volume > 0.005 ? '1' : '0';
    el.surface.setAttribute('fill', colors.surface);
    el.stops[0].setAttribute('stop-color', colors.edge);
    el.stops[1].setAttribute('stop-color', colors.mid);
    el.stops[2].setAttribute('stop-color', colors.edge);
    return h;
  }

  function hideStream() {
    el.stream.setAttribute('d', '');
    el.streamHighlight.setAttribute('d', '');
    el.streamHead.setAttribute('r', '0');
  }

  function updateParticles(dt: number, surfaceY: number, hw: number) {
    droplets.forEach((p, i) => {
      p.age += dt;
      p.vy += GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const node = el.droplets[i];
      if (!node) return;
      const alive = p.age < p.life && p.y <= surfaceY + 1;
      node.setAttribute('cx', p.x.toFixed(2));
      node.setAttribute('cy', p.y.toFixed(2));
      node.setAttribute('r', alive ? p.r.toFixed(2) : '0');
    });
    rings.forEach((p, i) => {
      p.age += dt;
      const node = el.rings[i];
      if (!node) return;
      const t = p.age / p.life;
      const rx = Math.min(hw, 3 + t * hw);
      node.setAttribute('cx', p.x.toFixed(2));
      node.setAttribute('cy', surfaceY.toFixed(2));
      node.setAttribute('rx', t < 1 ? rx.toFixed(2) : '0');
      node.setAttribute('ry', t < 1 ? (rx * 0.16).toFixed(2) : '0');
      node.style.opacity = String(Math.max(0, 0.7 * (1 - t)));
    });
    foam.forEach((p, i) => {
      p.age += dt;
      p.x += p.vx * dt;
      p.vx *= Math.exp(-2.5 * dt);
      p.x = Math.max(-hw + 2, Math.min(hw - 2, p.x));
      const node = el.foam[i];
      if (!node) return;
      const t = p.age / p.life;
      node.setAttribute('cx', p.x.toFixed(2));
      node.setAttribute('cy', (surfaceY + p.y).toFixed(2));
      node.setAttribute('r', t < 1 ? (p.r * (1 - t * 0.5)).toFixed(2) : '0');
      node.style.opacity = String(Math.max(0, 0.85 * (1 - t)));
    });
  }

  function spawn(pool: Particle[], max: number, p: Particle) {
    if (pool.length < max) pool.push(p);
    else {
      const oldest = pool.reduce((a, b, i) => (b.age / b.life > pool[a].age / pool[a].life ? i : a), 0);
      pool[oldest] = p;
    }
  }

  function frame(nowMs: number) {
    const now = nowMs / 1000;
    const realDt = now - last;
    const dt = Math.min(0.034, realDt); // particles only — liquid volume uses real time
    last = now;
    const stage = plan.stages[stageIndex];
    const v = stage.vessel;
    const t = now - stageStart;
    const flowDuration = stage.volume / v.rate;
    const flowStart = LIFT_TIME * 0.85;
    const flowEnd = flowStart + flowDuration;

    // Pose: lift + tilt in, hold (tilting a little further as the pot empties), return.
    let p: number;
    if (t < LIFT_TIME) p = ease(t / LIFT_TIME);
    else if (t < LIFT_TIME + flowDuration) p = 1 + 0.08 * ((t - LIFT_TIME) / flowDuration);
    else p = Math.max(0, 1 - ease((t - LIFT_TIME - flowDuration) / RETURN_TIME));
    const offset = poseOffset(v);
    const pose = `translate(${(offset.x * Math.min(p, 1)).toFixed(2)} ${(offset.y * Math.min(p, 1)).toFixed(2)}) rotate(${(v.angle * p).toFixed(2)} ${v.pivot.x} ${v.pivot.y})`;
    if (v === DEMLIK) {
      el.demlik.setAttribute('transform', pose);
      el.kettle.setAttribute('transform', '');
    } else {
      el.kettle.setAttribute('transform', pose);
      el.demlik.setAttribute('transform', '');
    }

    // Spout tip in glass-local coordinates
    const tipLocal = rotate(v.tip, v.pivot, v.angle * p);
    const tip = {
      x: KETTLE_ORIGIN.x + offset.x * Math.min(p, 1) + tipLocal.x - GLASS_ORIGIN.x,
      y: KETTLE_ORIGIN.y + offset.y * Math.min(p, 1) + tipLocal.y - GLASS_ORIGIN.y,
    };

    const h = heightForVolume(volume);
    const surfaceY = -h;

    // Ballistic stream aimed a little off-centre, so it lands inside the glass
    const vy0 = 30;
    const drop = Math.max(4, surfaceY - tip.y);
    const aHit = (-vy0 + Math.sqrt(vy0 * vy0 + 2 * GRAVITY * drop)) / GRAVITY;
    const landX = 5;
    const vx = (landX - tip.x) / aHit;
    const headAge = t - flowStart;
    const tailAge = Math.max(0, t - flowEnd);
    const attached = headAge >= aHit && tailAge < aHit;

    if (headAge > 0 && tailAge < aHit) {
      const a0 = tailAge;
      const a1 = Math.min(headAge, aHit);
      const s0 = Math.hypot(vx, vy0);
      const left: string[] = [];
      const right: string[] = [];
      const hi: string[] = [];
      const n = 16;
      let headX = 0;
      let headY = 0;
      let headW = 0;
      for (let i = 0; i <= n; i++) {
        const a = a0 + ((a1 - a0) * i) / n;
        const x = tip.x + vx * a;
        const y = tip.y + vy0 * a + 0.5 * GRAVITY * a * a;
        const vvy = vy0 + GRAVITY * a;
        const speed = Math.hypot(vx, vvy);
        const w = Math.max(0.9, v.width * Math.sqrt(s0 / speed)) * (tailAge > 0 ? 0.8 : 1);
        const nx = -vvy / speed;
        const ny = vx / speed;
        left.push(`${(x + (nx * w) / 2).toFixed(2)},${(y + (ny * w) / 2).toFixed(2)}`);
        right.unshift(`${(x - (nx * w) / 2).toFixed(2)},${(y - (ny * w) / 2).toFixed(2)}`);
        hi.push(`${(x + nx * w * 0.22).toFixed(2)},${(y + ny * w * 0.22).toFixed(2)}`);
        headX = x;
        headY = y;
        headW = w;
      }
      el.stream.setAttribute('d', `M${left.join(' L')} L${right.join(' L')} Z`);
      el.stream.setAttribute('fill', v.color);
      el.streamHighlight.setAttribute('d', `M${hi.join(' L')}`);
      el.streamHighlight.setAttribute('stroke', v.highlight);
      // Leading drop while the stream is still falling
      if (!attached && headAge < aHit) {
        el.streamHead.setAttribute('cx', headX.toFixed(2));
        el.streamHead.setAttribute('cy', headY.toFixed(2));
        el.streamHead.setAttribute('r', (headW * 0.7).toFixed(2));
        el.streamHead.setAttribute('fill', v.color);
      } else {
        el.streamHead.setAttribute('r', '0');
      }
    } else {
      hideStream();
    }

    // Liquid arrives at the surface
    let wobble = 0;
    if (attached) {
      const dv = Math.min(v.rate * realDt, stage.volume - stagePoured);
      if (dv > 0) {
        stagePoured += dv;
        concentration = (volume * concentration + dv * stage.concentration) / (volume + dv);
        volume += dv;
      }
      wobble = 0.22 * Math.sin(now * 38);

      // Sound follows the air column above the liquid
      if (!sound) sound = audioEngine.startPour(v.sound);
      sound.setFill(heightForVolume(volume) / GLASS_HEIGHT);

      // Splash, rings and foam at the impact point
      const impactX = landX + (Math.random() - 0.5) * 2;
      const splashes = Math.random() < 0.9 ? 2 : 1;
      for (let i = 0; i < splashes; i++) {
        spawn(droplets, el.droplets.length, {
          x: impactX,
          y: surfaceY - 1,
          vx: (Math.random() - 0.5) * 140,
          vy: -(70 + Math.random() * 110) * (v === KETTLE ? 1.2 : 0.9),
          age: 0,
          life: 0.45,
          r: 0.6 + Math.random() * 0.9,
        });
      }
      ringTimer -= dt;
      if (ringTimer <= 0) {
        ringTimer = 0.13;
        spawn(rings, el.rings.length, { x: impactX, y: 0, vx: 0, vy: 0, age: 0, life: 0.55, r: 0 });
      }
      foamTimer -= dt;
      if (foamTimer <= 0) {
        foamTimer = v === KETTLE ? 0.09 : 0.16;
        spawn(foam, el.foam.length, {
          x: impactX,
          y: (Math.random() - 0.5) * 2,
          vx: (Math.random() - 0.5) * 60,
          vy: 0,
          age: 0,
          life: 1.4 + Math.random() * 0.8,
          r: 0.8 + Math.random() * 1.2,
        });
      }
    } else if (sound && tailAge >= aHit) {
      sound.stop();
      sound = null;
    }

    const hNow = applyLiquid(wobble);
    updateParticles(dt, -hNow, glassHalfWidth(hNow));

    // Stage complete once the pot is back down
    if (t >= LIFT_TIME + flowDuration + RETURN_TIME && tailAge >= aHit) {
      // Whatever was still in the air when the stream detached lands now.
      const rest = stage.volume - stagePoured;
      if (rest > 0) {
        concentration = (volume * concentration + rest * stage.concentration) / (volume + rest);
        volume += rest;
      }
      stageIndex++;
      if (stageIndex >= plan.stages.length) {
        hideStream();
        el.demlik.setAttribute('transform', '');
        el.kettle.setAttribute('transform', '');
        // Let the foam and rings finish, then hand the final state back to React.
        const settleUntil = now + 1.2;
        const settle = (ms: number) => {
          const tt = ms / 1000;
          const d = Math.min(0.034, tt - last);
          last = tt;
          const hh = applyLiquid(0);
          updateParticles(d, -hh, glassHalfWidth(hh));
          if (tt < settleUntil) raf = requestAnimationFrame(settle);
          else callbacks.onDone(volume, concentration);
        };
        raf = requestAnimationFrame(settle);
        return;
      }
      stageStart = now;
      stagePoured = 0;
      callbacks.onStage(plan.stages[stageIndex].vessel.sound);
    }
    raf = requestAnimationFrame(frame);
  }

  raf = requestAnimationFrame(frame);
  return () => {
    cancelAnimationFrame(raf);
    sound?.stop();
  };
}
