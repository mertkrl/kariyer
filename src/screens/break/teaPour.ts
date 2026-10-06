import { audioEngine, type PourSound } from '../../audio/audioEngine';

/*
 * Mola odası için fiziğe dayalı Türk çayı dökme.
 *
 * Bardak: ince belli profil (yüksekliğe göre yarı genişlik), dönel bir cisim olarak ele alınır;
 * böylece seviye dar belde daha hızlı yükselir. Hacim normalleştirilmiştir: 1 = "dolu"
 * (bardağın %86'sı).
 *
 * Dökme: önce demlik çaydanlığın üstünden kalkar ve koyu demi döker (yoğunluk 1), sonra
 * çaydanlık eğilip sıcak suyla tamamlar (yoğunluk 0). Dem miktarı, bardakta ne kalmış olursa
 * olsun karışım "tavşan kanı"na (≈0.42) denk gelecek şekilde seçilir. Her akış balistik bir
 * paraboldür; genişliği süreklilik ilkesine uyar (w ∝ 1/√hız), düştükçe incelir. Sıvı ancak
 * yüzeye ulaşınca sayılır; çarpma damlacıklar, halkalar ve köpük çıkarır.
 */

// ── Bardak geometrisi (bardağa göre birimler: başlangıç alt ortada, yukarı y negatif) ──

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

// Birikimli hacim tablosu: V(h) = ∫ π r(h)² dh, V(FULL_HEIGHT) = 1 olacak şekilde normalleştirilmiş.
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

/** Normalleştirilmiş 0–1 hacim için sıvı yüksekliği (bardak birimi). */
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

// ── Yoğunluğa göre demin rengi ──────────────────────────────────────────────

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

// ── Dökme animasyonu ────────────────────────────────────────────────────────

/** Çaydanlık grubunun başlangıç noktasının ve bardağın sahnedeki konumu. */
const KETTLE_ORIGIN = { x: 1100, y: 480 };
const GLASS_ORIGIN = { x: 990, y: 586 };

interface Vessel {
  /** Emzik ucu ve dönme ekseni, çaydanlığa göre. */
  tip: { x: number; y: number };
  pivot: { x: number; y: number };
  /** Tam dökmede eğim (derece, negatif = emzik aşağı) ve ucun varması gereken yer (sahne). */
  angle: number;
  target: { x: number; y: number };
  rate: number; // saniyedeki normalleştirilmiş hacim
  width: number; // emzikteki akış genişliği
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

const GRAVITY = 1600; // sahne biriminde px/s²: düşüş bu ölçekte gerçek görünsün diye ayarlandı
const LIFT_TIME = 0.5;
const RETURN_TIME = 0.45;

function rotate(p: { x: number; y: number }, c: { x: number; y: number }, deg: number) {
  const a = (deg * Math.PI) / 180;
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return { x: c.x + dx * Math.cos(a) - dy * Math.sin(a), y: c.y + dx * Math.sin(a) + dy * Math.cos(a) };
}

/** Dönmüş ucu hedef noktaya getiren öteleme (çaydanlığa göre). */
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
  /** Sıçrama, halkalar ve köpük için bardak kırpma alanının içindeki daire/elips havuzları. */
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

/** Önce dem (tavşan kanına yetecek kadar), sonra ağzına kadar su. */
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
    const dt = Math.min(0.034, realDt); // yalnızca parçacıklar; sıvı hacmi gerçek zamanı kullanır
    last = now;
    const stage = plan.stages[stageIndex];
    const v = stage.vessel;
    const t = now - stageStart;
    const flowDuration = stage.volume / v.rate;
    const flowStart = LIFT_TIME * 0.85;
    const flowEnd = flowStart + flowDuration;

    // Duruş: kalk + eğil, bekle (demlik boşaldıkça biraz daha eğil), geri dön.
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

    // Emzik ucu, bardağa göre koordinatlarda
    const tipLocal = rotate(v.tip, v.pivot, v.angle * p);
    const tip = {
      x: KETTLE_ORIGIN.x + offset.x * Math.min(p, 1) + tipLocal.x - GLASS_ORIGIN.x,
      y: KETTLE_ORIGIN.y + offset.y * Math.min(p, 1) + tipLocal.y - GLASS_ORIGIN.y,
    };

    const h = heightForVolume(volume);
    const surfaceY = -h;

    // Bardağın içine düşsün diye merkezden biraz kaydırılarak nişan alınmış balistik akış
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
      // Akış hâlâ düşerken öndeki damla
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

    // Sıvı yüzeye ulaşır
    let wobble = 0;
    if (attached) {
      const dv = Math.min(v.rate * realDt, stage.volume - stagePoured);
      if (dv > 0) {
        stagePoured += dv;
        concentration = (volume * concentration + dv * stage.concentration) / (volume + dv);
        volume += dv;
      }
      wobble = 0.22 * Math.sin(now * 38);

      // Ses, sıvının üstündeki hava sütununu izler
      if (!sound) sound = audioEngine.startPour(v.sound);
      sound.setFill(heightForVolume(volume) / GLASS_HEIGHT);

      // Çarpma noktasında sıçrama, halkalar ve köpük
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

    // Demlik yerine inince aşama tamamdır
    if (t >= LIFT_TIME + flowDuration + RETURN_TIME && tailAge >= aHit) {
      // Akış koptuğunda havada olan ne varsa şimdi iner.
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
        // Köpük ve halkalar bitsin, sonra son durumu React'e geri ver.
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
