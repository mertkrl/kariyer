import { clonePlan, signal, stepController } from './controller';
import { buildJunction, clash, crossPoint, exitOf, pose, yields, type Junction } from './junction';
import {
  ACCEL,
  AMBER,
  BRAKE,
  CAR_COLORS,
  CRASH_CLEAR,
  DIR_NAME,
  DT,
  GAP,
  GAP_ACCEPT,
  HARD_BRAKE,
  HEADWAY,
  legOf,
  moveName,
  PED_COLORS,
  PED_PATIENCE,
  PED_V,
  TURN_V,
  turnOf,
  type Car,
  type Controller,
  type Crash,
  type Dir,
  type Kind,
  type LevelSpec,
  type LogLine,
  type Ped,
  type Plan,
  type Turn,
} from './model';

/*
 * Kavşağın simülasyonu: 0,1 saniyelik adımlarla kontrolör, araçlar ve yayalar. Araçlar önlerindeki
 * araca ya da duruş noktasına göre hızlanıp yavaşlar (akıllı sürücü modeli). Duruş noktaları:
 * kırmızı ve sarıda duruş çizgisi, sola dönüşte karşıdan gelen akım, geçitteki yaya, kutudaki
 * kaza. Sarıda duramayacak kadar yakın olan geçer; bazı sürücüler kırmızının ilk anını da kollar,
 * bu yüzden tüm kırmızı süresi kısaysa kutuda çarpışma olur. Yaya ışığı beklemeyi uzun bulursa
 * kırmızıda geçer.
 */

export interface Sim {
  spec: LevelSpec;
  j: Junction;
  plan: Plan;
  ctl: Controller;
  t: number;
  cars: Car[];
  peds: Ped[];
  /** Haritaya giremeyen, kolun gerisinde bekleyen araçların istek anları. */
  backlog: Record<string, number[]>;
  acc: Record<string, number>;
  pedAcc: Partial<Record<Dir, number>>;
  nextId: number;
  delivered: number;
  delay: number;
  /** Varan araçların harekete göre gecikmesi. */
  byMove: Record<string, { n: number; sum: number }>;
  pedDone: number;
  pedWait: number;
  jay: number;
  crashes: Crash[];
  ambulance: { delay: number; late: boolean }[];
  nextEvent: number;
  done: boolean;
  jammed: Dir | null;
  log: LogLine[];
  rand: () => number;
}

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const say = (s: Sim, text: string, tone: LogLine['tone'] = 'info') => {
  s.log.unshift({ t: s.t, text, tone });
  if (s.log.length > 12) s.log.length = 12;
};

export function createSim(spec: LevelSpec): Sim {
  const j = buildJunction(spec.legs);
  return {
    spec,
    j,
    plan: clonePlan(spec.plan),
    ctl: { phase: 0, t: 0, stage: 'green', hold: false, next: null, cut: false },
    t: 0,
    cars: [],
    peds: [],
    backlog: {},
    acc: {},
    pedAcc: {},
    nextId: 1,
    delivered: 0,
    delay: 0,
    byMove: {},
    pedDone: 0,
    pedWait: 0,
    jay: 0,
    crashes: [],
    ambulance: [],
    nextEvent: 0,
    done: false,
    jammed: null,
    log: [],
    rand: rng(spec.seed),
  };
}

const rateAt = (r: number | [number, number][], t: number) => {
  if (typeof r === 'number') return r;
  if (t <= r[0][0]) return r[0][1];
  for (let i = 1; i < r.length; i++)
    if (t <= r[i][0]) {
      const [t0, v0] = r[i - 1];
      const [t1, v1] = r[i];
      return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
    }
  return r[r.length - 1][1];
};

export const speedOf = (s: Sim, d: Dir) => (s.spec.legs[d]?.v ?? 13.9) * (s.spec.rain ? 0.85 : 1);

/* ───────────── Araçlar ───────────── */

const KINDS: { kind: Kind; p: number; len: number }[] = [
  { kind: 'car', p: 0.66, len: 4.4 },
  { kind: 'taxi', p: 0.14, len: 4.6 },
  { kind: 'dolmus', p: 0.09, len: 6.6 },
  { kind: 'truck', p: 0.07, len: 7.2 },
  { kind: 'bus', p: 0.04, len: 12 },
];
const LEN: Record<Kind, number> = { car: 4.4, taxi: 4.6, dolmus: 6.6, truck: 7.2, bus: 12, ambulance: 6.2 };

function pickLane(s: Sim, mv: `${Dir}.${Turn}`) {
  const leg = s.j.legs[legOf(mv)]!;
  const t = turnOf(mv);
  let best = -1;
  let bestQ = Infinity;
  leg.spec.lanes.forEach((l, i) => {
    if (!l.includes(t)) return;
    // kuyruk kısa olan şerit; ortak şeritte biraz daha cesaretsiz
    const q = s.cars.filter((c) => legOf(c.mv) === leg.dir && c.lane === i && c.s < c.path.stop).length + (l.length > 1 ? 0.5 : 0) + s.rand() * 0.8;
    if (q < bestQ) {
      bestQ = q;
      best = i;
    }
  });
  return best;
}

function spawn(s: Sim, mv: `${Dir}.${Turn}`, born: number, kind?: Kind): boolean {
  const lane = pickLane(s, mv);
  const path = s.j.paths.get(`${mv}:${lane}`);
  if (!path) return true;
  // şeridin başı dolu: araç kolun gerisinde bekler
  const tail = s.cars.reduce((m, c) => (legOf(c.mv) === legOf(mv) && c.lane === lane && c.s < path.stop ? Math.min(m, c.s - c.len) : m), Infinity);
  if (tail < 2) return false;
  let k: Kind = kind ?? 'car';
  if (!kind) {
    let r = s.rand();
    for (const x of KINDS) {
      if (r < x.p) {
        k = x.kind;
        break;
      }
      r -= x.p;
    }
  }
  const v0 = speedOf(s, legOf(mv));
  const v = Math.min(v0, Number.isFinite(tail) ? Math.max(0, tail - 4) : v0);
  s.cars.push({
    id: s.nextId++,
    kind: k,
    mv,
    lane,
    exitLane: 0,
    path,
    s: 0,
    v,
    len: LEN[k],
    color: Math.floor(s.rand() * CAR_COLORS.length),
    born,
    free: path.len / v0 + (turnOf(mv) === 'T' ? 1 : 3),
    waited: 0,
    bold: s.rand() < (k === 'dolmus' || k === 'taxi' ? 0.35 : 0.12) * (s.spec.bold ?? 1),
    braking: false,
  });
  return true;
}

/** Kutudaki iki aracın gövdeleri çakışıyor mu: orta noktalar arası uzaklık. */
const center = (c: Car) => pose(c.path, c.s - c.len / 2);

/** Duran ya da yavaş bir aracın `d` metreyi alması: hızlanarak, en çok `vmax` ile. */
function timeTo(d: number, v: number, a: number, vmax: number) {
  if (d <= 0) return 0;
  const tUp = (vmax - v) / a;
  const dUp = v * tUp + 0.5 * a * tUp * tUp;
  if (d <= dUp) return (-v + Math.sqrt(v * v + 2 * a * d)) / a;
  return tUp + (d - dUp) / vmax;
}

/**
 * Sola dönen, karşıdan gelen akımda kutuyu boşaltacak kadar boşluk var mı: kendi kutudan çıkış
 * süresine pay eklenir, karşıdakinin çakışma yerine varış süresiyle kıyaslanır.
 */
function canGoLeft(s: Sim, c: Car) {
  const mine = timeTo(c.path.boxOut - c.s, c.v, ACCEL * 0.8, TURN_V) + 1;
  for (const o of s.cars) {
    if (o === c || !yields(c.mv, o.mv) || o.s >= o.path.boxOut - 2 || o.crashed !== undefined) continue;
    // kutunun içinde ilerleyen: bekle; kutuda duran (o da tıkanmış) beklenmez
    if (o.s > o.path.stop + 0.3) {
      if (o.v > 0.5) return false;
      continue;
    }
    const sig = signal(s, o.mv);
    const comes = sig === 'green' || o.amber === 'go';
    if (!comes) continue;
    const theirs = timeTo(o.path.stop - o.s + 6, o.v, ACCEL, speedOf(s, legOf(o.mv)));
    if (theirs < Math.max(GAP_ACCEPT, mine)) return false;
  }
  return true;
}

function pedBlocks(s: Sim, x: Car['path']['cross'][number]) {
  const g = s.j.legs[x.leg]!;
  const width = g.inW + g.outW + 2;
  const me = x.at * width;
  for (const p of s.peds) {
    if (p.leg !== x.leg || !p.walking) continue;
    const at = p.t * width;
    const d = (me - at) * p.dir;
    // yaya aracın geçeceği yere geliyor ya da tam önünde
    if (Math.abs(d) < 3 || (d > 0 && d < 4 + p.speed * 4)) return true;
  }
  return false;
}

function obstacle(s: Sim, c: Car): { gap: number; v: number } {
  let gap = Infinity;
  let vl = 0;
  const ahead = (g: number, v: number) => {
    if (g < gap) {
      gap = g;
      vl = v;
    }
  };
  const p = c.path;
  const before = c.s < p.stop + 0.2;
  // önündeki araçlar: aynı gelen şerit, aynı yol, aynı giden şerit
  const exitLeg = exitOf(legOf(c.mv), turnOf(c.mv) as Turn);
  for (const o of s.cars) {
    if (o === c) continue;
    let g = Infinity;
    if (o.path === p) {
      if (o.s > c.s) g = o.s - o.len - c.s;
    } else if (before && legOf(o.mv) === legOf(c.mv) && o.lane === c.lane && o.s > c.s) {
      // aynı şeritten başka yöne giden: kutuya girene kadar önümde; kutunun ortasında bekleyen
      // sola dönen ortak şeridi tıkar
      if (o.s < o.path.stop + 0.2 || o.s - o.len < p.stop + 5) g = o.s - o.len - c.s;
      else if (o.s < o.path.boxOut && turnOf(o.mv) === 'L' && o.v < 1.5) g = p.stop - c.s - 0.3;
    } else if (o.s > o.path.boxOut - 1 && exitOf(legOf(o.mv), turnOf(o.mv) as Turn) === exitLeg && o.path.pts[o.path.pts.length - 1][0] === p.pts[p.pts.length - 1][0] && o.path.pts[o.path.pts.length - 1][1] === p.pts[p.pts.length - 1][1]) {
      const mine = c.s - p.boxOut;
      const theirs = o.s - o.path.boxOut;
      if (theirs > mine) g = theirs - o.len - mine;
    }
    if (g < Infinity) ahead(g, o.crashed ? 0 : o.v);
  }
  const stopAt = (x: number) => ahead(x - c.s - 0.3, 0);
  if (before) {
    const sig = signal(s, c.mv);
    const dist = p.stop - c.s;
    if (sig === 'green') c.amber = undefined;
    else if (sig === 'amber') {
      if (!c.amber) {
        const need = (c.v * c.v) / (2 * BRAKE);
        c.amber = dist < need * 0.95 || (c.bold && dist < c.v * (AMBER - s.ctl.t)) ? 'go' : 'stop';
      }
      if (c.amber === 'stop') stopAt(p.stop);
    } else if (c.amber !== 'go' || c.v < 3 || dist > c.v * (c.bold ? 1.2 : 0.6) + 1) {
      c.amber = 'stop';
      stopAt(p.stop);
    }
    // kutuda kaza varsa girmez; çizgide duran, önünden geçen kutuda kalmış aracı bekler (hızla
    // gelen bakmaz: tüm kırmızı kısaysa çarpışma buradan çıkar)
    // her sürücü bakmaz: aceleci olan ve dalgın her beş kişiden biri yeşili görünce basar
    const look = c.v < 2 && dist < 4 && !c.bold && c.id % 5 !== 0;
    if (s.cars.some((o) => (o.crashed !== undefined || (look && o.s > o.path.stop && o.s - o.len < o.path.boxOut && legOf(o.mv) !== legOf(c.mv) && clash(o.mv, c.mv) !== 'none')) && p.box.some(([x, y]) => Math.hypot(center(o)[0] - x, center(o)[1] - y) < 3.5))) stopAt(p.stop);
  }
  // sola dönen karşıdan geleni bekler: biri kutunun ortasına çıkar, arkadaki çizgide kalır
  if (turnOf(c.mv) === 'L' && c.s < p.wait && !canGoLeft(s, c)) {
    const inside = s.cars.some((o) => o !== c && o.path === p && o.s > p.stop && o.s < p.boxOut);
    stopAt(before && inside ? p.stop : p.wait);
  }
  for (const x of p.cross) if (c.s < x.s0 && x.s0 - c.s < 30 && pedBlocks(s, x)) stopAt(x.s0 - 0.8);
  return { gap, v: vl };
}

function stepCar(s: Sim, c: Car) {
  if (c.crashed !== undefined) {
    c.v = 0;
    return;
  }
  const p = c.path;
  const turn = turnOf(c.mv);
  let v0 = speedOf(s, legOf(c.mv)) * (c.kind === 'bus' || c.kind === 'truck' ? 0.85 : 1);
  if (turn !== 'T') {
    if (c.s < p.stop) v0 = Math.min(v0, Math.sqrt(TURN_V * TURN_V + 2 * 1.6 * (p.stop - c.s)));
    else if (c.s < p.boxOut) v0 = Math.min(v0, TURN_V);
  }
  const { gap, v: vl } = obstacle(s, c);
  const rain = s.spec.rain ? 1.35 : 1;
  const a0 = c.kind === 'bus' || c.kind === 'truck' ? ACCEL * 0.6 : ACCEL;
  let a = a0 * (1 - Math.pow(c.v / v0, 4));
  if (gap < Infinity) {
    const star = GAP + c.v * HEADWAY * rain + (c.v * (c.v - vl)) / (2 * Math.sqrt(a0 * BRAKE));
    a -= a0 * Math.pow(Math.max(0, star) / Math.max(0.1, gap), 2);
  }
  a = Math.max(-HARD_BRAKE / rain, a);
  c.braking = a < -0.6 || c.v < 0.5;
  c.v = Math.max(0, c.v + a * DT);
  if (gap < 0.05 && c.v < 1) c.v = 0;
  const was = c.s;
  c.s += c.v * DT;
  if (was < p.stop && c.s >= p.stop) c.entry = signal(s, c.mv);
  if (c.v < 1.2) c.waited += DT;
}

/** Gövdenin önden arkaya birkaç noktası: uzun araçta daha çok. */
function body(c: Car): [number, number][] {
  const n = c.len > 8 ? 5 : 3;
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const [x, y] = pose(c.path, c.s - 0.6 - ((c.len - 1.2) * i) / (n - 1));
    out.push([x, y]);
  }
  return out;
}

function checkCrashes(s: Sim) {
  const { x0, x1, y0, y1 } = s.j.box;
  const inside = ([x, y]: [number, number]) => x > x0 - 1.5 && x < x1 + 1.5 && y > y0 - 1.5 && y < y1 + 1.5;
  const inBox = s.cars.filter((c) => c.s > c.path.stop - 1 && c.s - c.len < c.path.boxOut + 1);
  const bodies = new Map(inBox.map((c) => [c, body(c)]));
  for (let i = 0; i < inBox.length; i++)
    for (let k = i + 1; k < inBox.length; k++) {
      const a = inBox[i];
      const b = inBox[k];
      if (legOf(a.mv) === legOf(b.mv) || clash(a.mv, b.mv) === 'none') continue;
      if (a.crashed !== undefined && b.crashed !== undefined) continue;
      if (a.v < 0.5 && b.v < 0.5) continue;
      let hit: [number, number] | null = null;
      for (const pa of bodies.get(a)!)
        for (const pb of bodies.get(b)!) if (!hit && Math.hypot(pa[0] - pb[0], pa[1] - pb[1]) < 1.7 && (inside(pa) || inside(pb))) hit = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2];
      if (!hit) continue;
      a.crashed ??= s.t;
      b.crashed ??= s.t;
      s.crashes.push({ at: s.t, x: hit[0], y: hit[1], cars: [a.id, b.id] });
      const late = [a, b].find((c) => c.entry && c.entry !== 'green');
      const left = [a, b].find((c) => turnOf(c.mv) === 'L');
      const stuck = [a, b].find((c) => c.entry === 'green' && signal(s, c.mv) === 'red');
      if (stuck && !late) say(s, `Kaza! Kutuda kalan ${KIND_NAME[stuck.kind]} (${moveName(stuck.mv)}) çıkamadan çapraz yön yeşile döndü. Bu genişlikte kavşakta tüm kırmızı uzun olmalı.`, 'bad');
      else if (late) say(s, `Kaza! ${moveName(late.mv)} giden ${KIND_NAME[late.kind]} ${late.entry === 'red' ? 'kırmızıda' : 'sarının sonunda'} kutuya girdi, ${moveName(late === a ? b.mv : a.mv)} yeşilde kalkanla çarpıştı. Tüm kırmızı yetmedi.`, 'bad');
      else if (left) say(s, `Kaza! ${moveName(left.mv)} dönen ${KIND_NAME[left.kind]} karşıdan geleni yanlış kolladı.`, 'bad');
      else say(s, `Kaza! ${moveName(a.mv)} ile ${moveName(b.mv)} kutuda çarpıştı.`, 'bad');
    }
  for (const p of s.peds) {
    if (!p.walking || p.hit) continue;
    const g = s.j.legs[p.leg]!;
    const [px, py] = crossPoint(g, p.t, p.side);
    for (const c of s.cars) {
      if (c.v < 2 || c.crashed !== undefined || !c.path.cross.some((x) => x.leg === p.leg && c.s > x.s0 - 1 && c.s - c.len < x.s1)) continue;
      // yalnızca aracın önü çarpar; yayalar yanından geçen aracın gövdesine yürümez
      if (!body(c).slice(0, 2).some(([x, y]) => Math.hypot(x - px, y - py) < 1.4)) continue;
      p.hit = true;
      p.since = s.t;
      c.crashed = s.t;
      s.crashes.push({ at: s.t, x: px, y: py, cars: [c.id], ped: true });
      say(s, `${DIR_NAME[p.leg]} geçidinde yayaya çarpıldı! ${p.jay ? 'Kırmızıda geçen yaya, sabrı tükenmişti.' : 'Yaya yeşilde yoldaydı.'} Ambulans çağrıldı.`, 'bad');
      break;
    }
  }
}

const KIND_NAME: Record<Kind, string> = { car: 'otomobil', taxi: 'taksi', dolmus: 'dolmuş', truck: 'kamyonet', bus: 'otobüs', ambulance: 'ambulans' };

/* ───────────── Yayalar ───────────── */

function stepPeds(s: Sim) {
  for (const d of s.spec.peds) {
    const g = s.j.legs[d.leg];
    if (!g?.crosswalk) continue;
    s.pedAcc[d.leg] = (s.pedAcc[d.leg] ?? 0) + (rateAt(d.rate, s.t) / 60) * DT * (0.4 + s.rand() * 1.2);
    while ((s.pedAcc[d.leg] ?? 0) >= 1) {
      s.pedAcc[d.leg]! -= 1;
      const dir = s.rand() < 0.5 ? 1 : -1;
      if (s.peds.filter((p) => p.leg === d.leg && p.dir === dir && !p.walking).length > 24) continue;
      s.peds.push({ id: s.nextId++, leg: d.leg, dir, t: dir > 0 ? -0.01 - s.rand() * 0.03 : 1.01 + s.rand() * 0.03, walking: false, speed: PED_V * (0.95 + s.rand() * 0.45), side: (s.rand() - 0.5) * 3, since: s.t, color: Math.floor(s.rand() * PED_COLORS.length) });
    }
  }
  let jayWave = false;
  for (const p of s.peds) {
    const g = s.j.legs[p.leg]!;
    const width = g.inW + g.outW + 2;
    if (p.hit) continue;
    if (!p.walking) {
      const sig = signal(s, `${p.leg}.P`);
      // yaya da bakar: geçide girmek üzere olan araç varsa kaldırımda bekler
      const clear = (secs: number) => !s.cars.some((c) => c.v > 1.5 && c.path.cross.some((x) => x.leg === p.leg && c.s - c.len < x.s1 && x.s0 - c.s < c.v * secs + 3));
      if (sig === 'green') {
        if (s.rand() < 0.25 && clear(1.5)) start(s, p);
      } else if (sig === 'red' && s.t - p.since > PED_PATIENCE * (0.7 + ((p.id * 37) % 60) / 100)) {
        // sabrı tükenen yaya, araçlar uzaktaysa kırmızıda geçer
        if (clear(3)) {
          start(s, p);
          p.jay = true;
          s.jay++;
          jayWave = true;
        }
      }
      continue;
    }
    // önündeki bir buçuk metrede araç gövdesi varsa durur
    const [ax, ay] = crossPoint(g, p.t + (p.dir * 1.5) / width, p.side);
    if (s.cars.some((c) => c.path.cross.some((x) => x.leg === p.leg && c.s > x.s0 && c.s - c.len < x.s1) && body(c).some(([x, y]) => Math.hypot(x - ax, y - ay) < 1.5))) continue;
    p.t += (p.dir * p.speed * DT) / width;
  }
  if (jayWave && !s.log.some((l) => l.text.includes('kırmızıda') && s.t - l.t < 20)) say(s, 'Yayalar beklemekten sıkıldı, kırmızıda karşıya geçiyor.', 'bad');
  s.peds = s.peds.filter((p) => {
    const gone = p.walking && (p.t > 1.04 || p.t < -0.04);
    if (gone) s.pedDone++;
    return !gone && !(p.hit && s.t - p.since > CRASH_CLEAR);
  });
}

function start(s: Sim, p: Ped) {
  p.walking = true;
  s.pedWait += s.t - p.since;
  p.since = s.t;
}

/* ───────────── Adım ───────────── */

export function step(s: Sim) {
  if (s.done) return;
  s.t += DT;
  stepController(s);

  for (; s.nextEvent < s.spec.events.length && s.spec.events[s.nextEvent].at <= s.t; s.nextEvent++) {
    const e = s.spec.events[s.nextEvent];
    if (e.kind === 'note') say(s, e.text);
    else if (e.kind === 'ambulance') {
      (s.backlog[`amb:${e.mv}`] ??= []).push(s.t);
      say(s, e.text, 'bad');
    } else (s.backlog[`bus:${e.mv}`] ??= []).push(s.t);
  }

  for (const d of s.spec.demand) {
    s.acc[d.mv] = (s.acc[d.mv] ?? 0) + (rateAt(d.rate, s.t) / 60) * DT * (0.5 + s.rand());
    while (s.acc[d.mv] >= 1) {
      s.acc[d.mv] -= 1;
      (s.backlog[d.mv] ??= []).push(s.t);
    }
  }
  for (const [key, list] of Object.entries(s.backlog)) {
    if (!list.length) continue;
    const special = key.startsWith('amb:') ? 'ambulance' : key.startsWith('bus:') ? 'bus' : undefined;
    const mv = (special ? key.slice(4) : key) as `${Dir}.${Turn}`;
    if (spawn(s, mv, list[0], special)) list.shift();
  }

  for (const c of s.cars) stepCar(s, c);
  checkCrashes(s);
  stepPeds(s);

  s.cars = s.cars.filter((c) => {
    if (c.crashed !== undefined) return s.t - c.crashed < CRASH_CLEAR;
    if (c.s < c.path.len) return true;
    s.delivered++;
    const d = Math.max(0, s.t - c.born - c.free);
    s.delay += d;
    const m = (s.byMove[c.mv] ??= { n: 0, sum: 0 });
    m.n++;
    m.sum += d;
    if (c.kind === 'ambulance') {
      s.ambulance.push({ delay: d, late: d > 25 });
      say(s, d > 25 ? `Ambulans kavşakta ${Math.round(d)} saniye kaybetti.` : 'Ambulans kavşağı beklemeden geçti.', d > 25 ? 'bad' : 'good');
    }
    return false;
  });

  // kuyruk kolun başına dayandıysa ve gerisi birikiyorsa kavşak kilitlenir
  for (const d of Object.keys(s.j.legs) as Dir[]) {
    const n = Object.entries(s.backlog).reduce((m, [k, l]) => (k.replace(/^(amb|bus):/, '')[0] === d ? m + l.length : m), 0);
    if (n >= 28) {
      s.jammed = d;
      s.done = true;
      say(s, `${s.spec.legs[d]!.name} kolu kilitlendi: kuyruk bir önceki kavşağa dayandı.`, 'bad');
    }
  }
  if (s.t >= s.spec.duration) s.done = true;
}

export function run(s: Sim, seconds = s.spec.duration) {
  const end = s.t + seconds;
  while (s.t < end - 1e-6 && !s.done) step(s);
  return s;
}

export { applyPlan, planIssues, setHold, signal, skipTo, walkTime } from './controller';
export { avgDelay, avgPedWait, backlogOf, delays, los, queueOf, report, type Report } from './score';
