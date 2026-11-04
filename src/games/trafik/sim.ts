import { checkCrashes, stepCar } from './driving';
import { stepSides, ghostPath, sideStreets } from './sides';
import { queueOf } from './score';
import { clonePlan, stepController } from './controller';
import { addIncident, stepFault, stepIncidents } from './incidentSim';
import { stepPeds } from './peds';
import { buildJunction, exitOf, inPoint, pose, type Junction } from './junction';
import { CITY, CAR_COLORS, DETOUR, DT, JAM, legOf, moveOfKey, DIFFICULTY, turnOf, type Car, type Controller, type Crash, type Difficulty, type Dir, type Event as SimEvent, type Incident, type Kind, type LevelSpec, type LogLine, type Ped, type Plan, type SideCar, type SideStreet, type Turn } from './model';

/*
 * Kavşağın simülasyonu: 0,1 saniyelik adımlarla kontrolör, araçlar ve yayalar. Araçlar önlerindeki
 * araca ya da duruş noktasına göre hızlanıp yavaşlar (akıllı sürücü modeli). Duruş noktaları:
 * kırmızı ve sarıda duruş çizgisi, sola dönüşte karşıdan gelen akım, geçitteki yaya, kutudaki
 * kaza. Sarıda duramayacak kadar yakın olan geçer; bazı sürücüler kırmızının ilk anını da kollar,
 * bu yüzden tüm kırmızı süresi kısaysa kutuda çarpışma olur. Yaya ışığı beklemeyi uzun bulursa
 * kırmızıda geçer. Kontrolör arızalanınca kavşak "dur, bak, geç" işler: herkes çizgide durur, kutu
 * boşalınca sıradaki karşılıklı kol çiftine birkaç saniyelik geçiş hakkı verilir.
 *
 * Kollarda ışıksız ara sokaklar var: kolun talebinin bir kısmı kolun ucundan değil sokaktan gelir;
 * sokaktaki sürücü ağızda durup bakar, şeritte yeterli boşluk bulunca sağa dönüp katılır. Kavşaktan
 * çıkanların bir kısmı da yolda sağa sapıp sokağa girer.
 */

/**
 * Ağızdaki kural, oyuncu değiştirir. "yield": yol ver levhası; uzun bekleyen sürücü sabrını yitirip
 * küçük boşluğa dalar (arkadaki sert fren yapar, hızlıysa çarpar). "stop": dur levhası; herkes tam
 * durup uzun bakar, araya giren olmaz ama sokak yavaş boşalır. "closed": sokağın ağzı kapalı; oradan
 * çıkacak sürücüler başka sokaklardan dolaşır (her biri sapma gecikmesi yer).
 */
export type SideRule = 'yield' | 'stop' | 'closed';

/** Ara sokak ve ağzında ana yola çıkmayı bekleyenler. */
export interface Side extends SideStreet {
  queue: SideCar[];
  acc: number;
  rule: SideRule;
}

/** Uzun bekleyen sürücünün sabrı tükenir: bu kadar saniyeden sonra küçük boşluğa dalar. */
export const CUT_IN = 25;

export function setSideRule(s: Sim, i: number, rule: SideRule) {
  const x = s.sides[i];
  if (!x || x.rule === rule) return;
  x.rule = rule;
  const where = `${x.name} (${s.spec.legs[x.leg]!.name} yolu)`;
  say(s, rule === 'closed' ? `${where} ağzı kapatıldı: oradan çıkacaklar başka sokaklardan dolaşacak.` : rule === 'stop' ? `${where} ağzına DUR levhası kondu: sürücüler tam durup bakacak.` : `${where} ağzı yeniden YOL VER: sürücüler boşluk kollayıp katılacak.`, rule === 'closed' ? 'info' : 'good');
}

/**
 * Simülasyondan çıkmış aracın kalan yolu, şehrin kenarına kadar yalnızca çizilir: ara sokağa sapan
 * ya da kolun ucunu geçip ana yolun uzantısında giden.
 */
export interface Ghost {
  id: number;
  kind: Kind;
  color: number;
  len: number;
  pts: [number, number][];
  cum: number[];
  d: number;
  v: number;
  /** Ara sokağa saptı (sağ sinyal verir). */
  side: boolean;
}

const ghost = (c: Car, pts: [number, number][], d: number, v: number, side: boolean): Ghost => {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { id: c.id, kind: c.kind, color: c.color, len: c.len, pts, cum, d, v, side };
};

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
  /** Çift sıra park: kol bu ana kadar yavaş akar. */
  slow: Partial<Record<Dir, number>>;
  /** Kolun sürücülerinin son söylendiği an ve kaçıncı laf. */
  grumble: Partial<Record<Dir, number>>;
  grumbles: number;
  /** Düğün konvoyunun kapattığı kol: bu ana kadar. */
  block: Partial<Record<Dir, number>>;
  /** Çekici çalışırken polisin kapattığı giden şeritler: o kola dönecek olan çizgide bekler. */
  closeOut: Partial<Record<Dir, boolean>>;
  /** Zorluk: talebin, cesur sürücülerin ve geçer notun çarpanı. */
  diff: Difficulty;
  /** Ağdaki kimliği ve adı. */
  node: string;
  name: string;
  /** Komşu kavşağa bağlanan kollar: çıkan araç oranın bu koluna geçer. */
  links: Partial<Record<Dir, { sim: Sim; leg: Dir }>>;
  /** Oyuncunun kapattığı kollar: trafik öbür yollara çevrilir. */
  closed: Partial<Record<Dir, boolean>>;
  /** Kapalı yol yüzünden ara sokaklara sapan araç ve son haber. */
  detour: number;
  detourSaid: number;
  /** Ağdan (komşuya değil, dışarı) çıkan araç. */
  exited: number;
  /** Yol çalışmasında açık koldan işçilerin yanından geçen araç. */
  workHits: number;
  incidents: Incident[];
  /** Arızalanacak hareket: koldaki ilk uygun araç durur. */
  breakNext: { mv: `${Dir}.${Turn}`; sec: number; text: string }[];
  /** Makam konvoyu: kaç araç, kaçı kavşakta durdu, konvoy kaza yaptı mı. */
  vip: { n: number; stopped: number; crash: boolean; passed: number };
  /** Kontrolör arızası bu ana kadar sürer (0: sağlam). */
  fault: number;
  /** Arızada geçiş hakkı olan kol ve bitişi; sıra kollar arasında döner. */
  turn: { leg: Dir | null; until: number; last: Dir | null };
  /** Bölümün ortasında başlayan yağmur. */
  wet: boolean;
  /** Sayım: harekete göre gelen araçların anları (son 90 saniye). */
  counts: Record<string, number[]>;
  /** Işıksız ara sokaklar ve sokağa sapıp giden araçlar. */
  sides: Side[];
  ghosts: Ghost[];
  /** Ara sokaktan sabrı tükenip araya giren sürücü. */
  cutIns: number;
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

export const say = (s: Sim, text: string, tone: LogLine['tone'] = 'info', horn = false) => {
  s.log.unshift({ t: s.t, text, tone, ...(horn ? { horn } : {}) });
  if (s.log.length > 12) s.log.length = 12;
};

export function createSim(spec: LevelSpec, diff: Difficulty = 'normal'): Sim {
  const j = buildJunction(spec.legs);
  const s: Sim = {
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
    slow: {},
    grumble: {},
    grumbles: 0,
    block: {},
    closeOut: {},
    diff,
    node: spec.id,
    name: spec.id,
    links: {},
    closed: {},
    detour: 0,
    detourSaid: -99,
    exited: 0,
    workHits: 0,
    incidents: [],
    breakNext: [],
    vip: { n: 0, stopped: 0, crash: false, passed: 0 },
    fault: 0,
    turn: { leg: null, until: 0, last: null },
    wet: !!spec.rain,
    counts: {},
    sides: sideStreets(j, spec.seed).map((x) => ({ ...x, queue: [], acc: 0, rule: 'yield' as SideRule })),
    cutIns: 0,
    ghosts: [],
  };
  prefill(s);
  return s;
}

/**
 * Vardiya boş yolla başlamaz: kolların uzak yarısında, talebe göre aralıklı araçlar yola çıkmış
 * olarak durur (doğuşları geçmişte, gecikmeleri yok). Yollar uzun olduğundan ilk araçlar böylece
 * kavşağa hemen gelir.
 */
function prefill(s: Sim) {
  for (const d of s.spec.demand) {
    const v0 = speedOf(s, legOf(d.mv));
    const g = s.j.legs[legOf(d.mv)]!;
    const span = g.len - g.stop - 40;
    const n = Math.floor(((rateAt(d.rate, 0) * DIFFICULTY[s.diff].demand) / 60) * (span / v0));
    for (let i = 0; i < n; i++) {
      const at = (span * (i + s.rand())) / n;
      const lane = pickLane(s, d.mv);
      const path = s.j.paths.get(`${d.mv}:${lane}`);
      if (!path || s.cars.some((c) => legOf(c.mv) === legOf(d.mv) && c.lane === lane && Math.abs(c.s - at) < 12)) continue;
      addCar(s, d.mv, lane, path, 0, pickKind(s), at, v0, Math.floor(s.rand() * CAR_COLORS.length));
    }
  }
}

/** Sayım kaydı: araç kolun gerisine geldi. */
export function count(s: Sim, mv: string) {
  const l = (s.counts[mv] ??= []);
  l.push(s.t);
  if (l.length > 8 && s.t - l[0] > 90) s.counts[mv] = l.filter((t) => s.t - t <= 90);
}

export const rateAt = (r: number | [number, number][], t: number) => {
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

export const speedOf = (s: Sim, d: Dir) => (s.spec.legs[d]?.v ?? 13.9) * (s.wet ? 0.85 : 1) * ((s.slow[d] ?? 0) > s.t ? 0.4 : 1);

/* ───────────── Araçlar ───────────── */

const KINDS: { kind: Kind; p: number; len: number }[] = [
  { kind: 'car', p: 0.66, len: 4.4 },
  { kind: 'taxi', p: 0.14, len: 4.6 },
  { kind: 'dolmus', p: 0.09, len: 6.6 },
  { kind: 'truck', p: 0.07, len: 7.2 },
  { kind: 'bus', p: 0.04, len: 12 },
];
export const LEN: Record<Kind, number> = { car: 4.4, taxi: 4.6, dolmus: 6.6, truck: 7.2, bus: 12, ambulance: 6.2, vip: 5.2, police: 4.8 };

/** Kol açık mı: oyuncu kapatmadıysa ve düğün kolu kesmiyorsa. */
export const legOpen = (s: Sim, d: Dir) => !s.closed[d];

/** Bu koldan gelen araç bu yöne dönebilir mi: hareket var ve çıkacağı kol açık. */
const canTurn = (s: Sim, d: Dir, t: Turn) => s.j.moves.includes(`${d}.${t}`) && legOpen(s, exitOf(d, t));

/**
 * Koldan gelen araca yön seçer: `prefer` açıksa o, değilse paylara göre öbür açık yönlerden biri
 * (trafik çevirme). Hiçbiri açık değilse null: araç ara sokaklara sapar.
 */
export function route(s: Sim, d: Dir, prefer?: Turn): Turn | null {
  if (prefer && canTurn(s, d, prefer)) return prefer;
  const split = s.spec.legs[d]?.split ?? { L: 0.2, T: 0.6, R: 0.2 };
  const opts = (['L', 'T', 'R'] as Turn[]).filter((t) => canTurn(s, d, t) && t !== prefer);
  if (!opts.length) return null;
  const sum = opts.reduce((m, t) => m + (split[t] ?? 0.05), 0);
  let r = s.rand() * sum;
  for (const t of opts) {
    r -= split[t] ?? 0.05;
    if (r <= 0) return t;
  }
  return opts[opts.length - 1];
}

/** Kapalı yol yüzünden sapan araç: gecikmesi yazılır, kavşağa gelmez. */
export function divert(s: Sim, mv: `${Dir}.${Turn}`, born: number) {
  s.detour++;
  const m = (s.byMove[mv] ??= { n: 0, sum: 0 });
  m.n++;
  m.sum += DETOUR + (s.t - born);
  s.delay += DETOUR;
  if (s.t - s.detourSaid > 25) {
    s.detourSaid = s.t;
    say(s, `${s.spec.legs[legOf(mv)]!.name} tarafından gelenler kapalı yol yüzünden ara sokaklara sapıyor: her biri ${DETOUR} saniye kaybediyor.`, 'bad', true);
  }
}

/** Yol çalışması sürerken açık koldan araç geçti: işçiler tehlikede. */
function workHit(s: Sim) {
  s.workHits++;
  if (!s.log.some((l) => l.text.startsWith('Yol çalışması:') && s.t - l.t < 15)) say(s, 'Yol çalışması: işçilerin yanından araç geçiyor! Kolu Yollar panelinden kapat.', 'bad', true);
}

/** Komşu kavşağa geçen araç: oranın kolunda yön seçer ve oranın kuyruğuna girer. */
function transfer(c: Car, to: { sim: Sim; leg: Dir }) {
  const t = to.sim;
  const special = c.kind === 'ambulance' ? 'amb:' : c.kind === 'vip' ? 'vip:' : c.kind === 'police' ? 'pol:' : c.kind === 'bus' ? 'bus:' : '';
  // konvoy ve ambulans yolunu değiştirmez: yönü önceden bellidir (düz)
  const turn = special && special !== 'bus:' ? route(t, to.leg, 'T') : route(t, to.leg);
  if (!turn) return divert(t, `${to.leg}.T`, t.t);
  if (special === 'vip:' || special === 'pol:') t.vip.n++;
  else count(t, `${to.leg}.${turn}`);
  (t.backlog[`${special}${to.leg}.${turn}`] ??= []).push(t.t);
}

/** Komşuya çıkan yol dolu mu: oranın bu kolda bekleyen aracı var. */
export function linkFull(s: Sim, d: Dir) {
  const to = s.links[d];
  if (!to) return false;
  return Object.entries(to.sim.backlog).some(([k, l]) => l.length > 0 && moveOfKey(k)[0] === to.leg);
}

export function pickLane(s: Sim, mv: `${Dir}.${Turn}`, kind?: Kind) {
  const leg = s.j.legs[legOf(mv)]!;
  const t = turnOf(mv);
  let best = -1;
  let bestQ = Infinity;
  leg.spec.lanes.forEach((l, i) => {
    if (!l.includes(t)) return;
    // kuyruk kısa olan şerit; ortak şeritte biraz daha cesaretsiz
    const q = s.cars.filter((c) => legOf(c.mv) === leg.dir && c.lane === i && c.s < c.path.stop).length + (l.length > 1 ? 0.5 : 0) + s.rand() * 0.8 + ((kind === 'vip' || kind === 'police') && l.includes('L') && t !== 'L' ? 50 : 0);
    if (q < bestQ) {
      bestQ = q;
      best = i;
    }
  });
  return best;
}

function spawn(s: Sim, mv: `${Dir}.${Turn}`, born: number, kind?: Kind): boolean {
  const lane = pickLane(s, mv, kind);
  const path = s.j.paths.get(`${mv}:${lane}`);
  if (!path) return true;
  const v0 = speedOf(s, legOf(mv));
  // ambulans ve konvoy kavşağa 150 m kala yola çıkar: uzun yolda vardiya bitmeden geçebilsin
  const g = s.j.legs[legOf(mv)]!;
  const near = Math.max(0, g.len - g.stop - 150);
  if (kind && kind !== 'bus' && near > 0 && !s.cars.some((c) => legOf(c.mv) === legOf(mv) && c.lane === lane && c.s < path.stop && c.s > near - 25 && c.s - c.len < near + 8)) {
    addCar(s, mv, lane, path, born, kind, near, v0, Math.floor(s.rand() * CAR_COLORS.length));
    return true;
  }
  // şeridin başı dolu: araç kolun gerisinde bekler
  const tail = s.cars.reduce((m, c) => (legOf(c.mv) === legOf(mv) && c.lane === lane && c.s < path.stop ? Math.min(m, c.s - c.len) : m), Infinity);
  if (tail < 2) return false;
  const v = Math.min(v0, Number.isFinite(tail) ? Math.max(0, tail - 4) : v0);
  addCar(s, mv, lane, path, born, kind ?? pickKind(s), 0, v, Math.floor(s.rand() * CAR_COLORS.length));
  return true;
}

export function pickKind(s: Sim): Kind {
  let r = s.rand();
  for (const x of KINDS) {
    if (r < x.p) return x.kind;
    r -= x.p;
  }
  return 'car';
}

/** Yola araç koyar: kolun ucundan (`at` 0) ya da ara sokağın ağzından. Kimi sonra sokağa sapar. */
export function addCar(s: Sim, mv: `${Dir}.${Turn}`, lane: number, path: Car['path'], born: number, k: Kind, at: number, v: number, color: number, id = s.nextId++): Car {
  const v0 = speedOf(s, legOf(mv));
  const exitLeg = exitOf(legOf(mv), turnOf(mv) as Turn);
  let out: number | undefined;
  // kavşaktan çıkıp yolda sağa sapan: komşuya giden yolda değil (o araç komşunun kuyruğuna girer)
  if (!s.links[exitLeg] && (k === 'car' || k === 'taxi' || k === 'dolmus' || k === 'truck')) {
    const e = s.j.legs[exitLeg]!;
    for (const x of s.sides) if (x.leg === exitLeg && x.side === -1 && s.rand() < 0.2) {
      out = path.len - (e.len - (x.at - 6));
      break;
    }
  }
  const car: Car = {
    id,
    kind: k,
    mv,
    lane,
    exitLane: 0,
    path,
    s: at,
    v,
    len: LEN[k],
    color,
    born,
    free: ((out ?? path.len) - at) / v0 + (turnOf(mv) === 'T' ? 1 : 3),
    waited: 0,
    bold: s.rand() < (k === 'dolmus' || k === 'taxi' ? 0.35 : 0.12) * (s.spec.bold ?? 1) * DIFFICULTY[s.diff].bold,
    braking: false,
    ...(out !== undefined ? { out } : {}),
  };
  s.cars.push(car);
  return car;
}

/* ───────────── Adım ───────────── */

/** Bir olayı hemen başlatır: bölümün takvimi bunu çağırır. */
export function fire(s: Sim, e: SimEvent) {
  if (e.kind === 'note') say(s, e.text);
  else if (e.kind === 'ambulance') {
    (s.backlog[`amb:${e.mv}`] ??= []).push(s.t);
    say(s, e.text, 'bad');
  } else if (e.kind === 'convoy') {
    for (let k = 0; k < e.n; k++) (s.backlog[e.mv] ??= []).push(s.t);
    say(s, e.text, 'bad', true);
  } else if (e.kind === 'courier') {
    // kurye kolun başında belirir: yer yoksa gelmez
    if (spawn(s, e.mv, s.t, 'car')) s.cars[s.cars.length - 1].bold = true;
    say(s, e.text, 'bad');
  } else if (e.kind === 'parked') {
    s.slow[e.leg] = s.t + e.sec;
    const g = s.j.legs[e.leg]!;
    const [x, y] = inPoint(g, g.spec.lanes.length - 1, g.stop + 40);
    addIncident(s, 'parked', x, y, e.text, e.sec, [], e.leg);
    say(s, e.text, 'bad', true);
  } else if (e.kind === 'breakdown') {
    s.breakNext.push({ mv: e.mv, sec: e.sec ?? 120, text: e.text });
  } else if (e.kind === 'wedding') {
    s.block[e.leg] = s.t + e.sec;
    const g = s.j.legs[e.leg]!;
    const [x, y]: [number, number] = [g.u[0] * (g.stop + 24), g.u[1] * (g.stop + 24)];
    addIncident(s, 'wedding', x, y, e.text, e.sec, [], e.leg);
    say(s, e.text, 'bad', true);
  } else if (e.kind === 'motorcade') {
    s.vip.n += e.n + 1;
    // önde polis, ardında makam araçları: anahtarlar bu sırayla açılır, polis önce çıkar
    (s.backlog[`pol:${e.mv}`] ??= []).push(s.t);
    for (let k = 0; k < e.n; k++) (s.backlog[`vip:${e.mv}`] ??= []).push(s.t);
    say(s, e.text, 'bad');
  } else if (e.kind === 'roadwork') {
    const g = s.j.legs[e.leg]!;
    const [x, y]: [number, number] = [g.u[0] * (g.stop + 30), g.u[1] * (g.stop + 30)];
    addIncident(s, 'roadwork', x, y, e.text, e.sec, [], e.leg);
    s.slow[e.leg] = s.t + e.sec;
    say(s, e.text, 'bad', true);
  } else if (e.kind === 'fault') {
    // ekip onarana kadar sürer; çağrılmazsa `sec` sonra başkası ihbar eder
    s.fault = Infinity;
    // kontrolör dolabı kavşağın bir köşesinde
    const { x1, y1 } = s.j.box;
    addIncident(s, 'fault', x1 + 3, y1 + 3, e.text, e.sec, []);
    say(s, e.text, 'bad', true);
  } else if (e.kind === 'rain') {
    s.wet = true;
    say(s, e.text, 'bad');
  } else (s.backlog[`bus:${e.mv}`] ??= []).push(s.t);
}

/** Bekleyen sürücülerin lafları: sırayla döner. */
const DRIVER_LINES = ['Yeşil ne zaman yanacak?', 'Abi bu ışık bozuk mu?', 'Düüüüüt! 📢', 'Üç dakikadır buradayım, işe geç kaldım!', 'Kim ayarladı bu ışığı ya?', 'Bir yeşil de bize!', 'Polis yok mu burada?'];

export function step(s: Sim) {
  if (s.done) return;
  s.t += DT;
  stepController(s);

  for (; s.nextEvent < s.spec.events.length && s.spec.events[s.nextEvent].at <= s.t; s.nextEvent++) fire(s, s.spec.events[s.nextEvent]);

  for (const d of s.spec.demand) {
    s.acc[d.mv] = (s.acc[d.mv] ?? 0) + ((rateAt(d.rate, s.t) * DIFFICULTY[s.diff].demand) / 60) * DT * (0.5 + s.rand());
    while (s.acc[d.mv] >= 1) {
      s.acc[d.mv] -= 1;
      count(s, d.mv);
      // talebin bir kısmı kolun ucundan değil ara sokaktan gelir
      const from = s.sides.filter((x) => x.side === 1 && x.leg === legOf(d.mv) && x.rule !== 'closed');
      if (from.length && s.rand() < 0.28) {
        const k = pickKind(s);
        from[Math.floor(s.rand() * from.length)].queue.push({ mv: d.mv, born: s.t, kind: k === 'bus' ? 'car' : k, color: Math.floor(s.rand() * CAR_COLORS.length), id: s.nextId++ });
      } else (s.backlog[d.mv] ??= []).push(s.t);
    }
  }
  for (const [key, list] of Object.entries(s.backlog)) {
    if (!list.length) continue;
    const pre = key.slice(0, 4);
    const special = pre === 'amb:' ? 'ambulance' : pre === 'bus:' ? 'bus' : pre === 'vip:' ? 'vip' : pre === 'pol:' ? 'police' : undefined;
    const mv = moveOfKey(key);
    const leg = legOf(mv);
    // kapalı yol: dış koldan gelen ara sokaklara sapar; kapalı kola dönecek olan öbür yöne çevrilir
    if (special !== 'vip' && special !== 'police' && special !== 'ambulance') {
      if (!legOpen(s, leg) && !s.links[leg]) {
        for (const b of list.splice(0)) divert(s, mv, b);
        continue;
      }
      if (!legOpen(s, exitOf(leg, turnOf(mv) as Turn))) {
        const t = route(s, leg, turnOf(mv) as Turn);
        for (const b of list.splice(0)) {
          if (t) (s.backlog[`${special ? pre : ''}${leg}.${t}`] ??= []).push(b);
          else divert(s, mv, b);
        }
        continue;
      }
    }
    if (spawn(s, mv, list[0], special)) {
      list.shift();
      // yol çalışması sürerken açık koldan giren araç işçilerin yanından geçer
      if (s.incidents.some((i) => i.kind === 'roadwork' && i.cleared === undefined && i.leg === leg && legOpen(s, leg))) workHit(s);
    }
  }

  stepSides(s);
  stepFault(s);
  for (const c of s.cars) stepCar(s, c);
  checkCrashes(s);
  stepIncidents(s);
  stepPeds(s);

  // konvoy kavşağı kutudan çıkınca geçmiş sayılır: uzun yolun ucuna varmayı beklemez
  for (const c of s.cars) if ((c.kind === 'vip' || c.kind === 'police') && !c.passed && c.s > c.path.boxOut + 5) vipPassed(s, c);

  s.cars = s.cars.filter((c) => {
    if (c.crashed !== undefined || c.broken) return true;
    const sideOut = c.out !== undefined && c.s >= c.out;
    if (c.s < c.path.len && !sideOut) return true;
    const exitLeg = exitOf(legOf(c.mv), turnOf(c.mv) as Turn);
    const link = s.links[exitLeg];
    if (sideOut) {
      // ara sokağa saptı: kalan yolu yalnızca çizilir
      const g = s.j.legs[exitLeg]!;
      const x = s.sides.find((y) => y.leg === exitLeg && y.side === -1 && Math.abs(c.path.len - (g.len - (y.at - 6)) - c.out!) < 0.01);
      if (x) {
        const [fx, fy] = pose(c.path, c.s - c.len / 2);
        s.ghosts.push(ghost(c, ghostPath(g, [fx, fy], x.at), 8, 6, true));
      }
      s.exited++;
    } else if (link) transfer(c, link);
    else {
      // kolun ucunu geçen: ana yolun uzantısında şehrin kenarına kadar gider
      const g = s.j.legs[exitLeg]!;
      const [ex, ey] = pose(c.path, c.path.len);
      const back = c.path.len - 10;
      const [bx, by] = pose(c.path, back);
      s.ghosts.push(ghost(c, [[bx, by], [ex + g.u[0] * (CITY - g.len), ey + g.u[1] * (CITY - g.len)]], 10 + (c.s - c.path.len), Math.max(c.v, 9), false));
      s.exited++;
    }
    if (s.incidents.some((i) => i.kind === 'roadwork' && i.cleared === undefined && i.leg === exitLeg && legOpen(s, exitLeg))) workHit(s);
    if (c.kind === 'vip' || c.kind === 'police') {
      if (!c.passed) vipPassed(s, c);
      return false;
    }
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

  // sürücü sesleri: bir kolda en uzun bekleyiş 45 saniyeyi aşınca söylenirler (kol başına 25 saniyede bir)
  if (Math.floor(s.t) !== Math.floor(s.t - DT))
    for (const d of Object.keys(s.j.legs) as Dir[]) {
      if (s.t - (s.grumble[d] ?? -99) < 25) continue;
      if (queueOf(s, d).wait < 45) continue;
      s.grumble[d] = s.t;
      say(s, `${s.spec.legs[d]!.name} kolundan: “${DRIVER_LINES[s.grumbles++ % DRIVER_LINES.length]}”`, 'bad', true);
    }

  // kuyruk kolun başına dayandıysa ve gerisi birikiyorsa kavşak kilitlenir
  for (const d of Object.keys(s.j.legs) as Dir[]) {
    if (s.links[d]) continue;
    const n = Object.entries(s.backlog).reduce((m, [k, l]) => (moveOfKey(k)[0] === d ? m + l.length : m), 0);
    if (n >= JAM) {
      s.jammed = d;
      s.done = true;
      say(s, `${s.spec.legs[d]!.name} kolu kilitlendi: kuyruk bir önceki kavşağa dayandı.`, 'bad');
    }
  }
  if (s.t >= s.spec.duration) s.done = true;
}

function vipPassed(s: Sim, c: Car) {
  c.passed = true;
  s.vip.passed++;
  if (c.waited > 2) s.vip.stopped++;
  if (s.vip.passed === s.vip.n) say(s, s.vip.stopped ? `Konvoy kavşaktan geçti ama ${s.vip.stopped} araç durmak zorunda kaldı. Koruma amiri telsizden söyleniyor.` : 'Konvoy kavşaktan durmadan geçti. Telsizden “Teşekkürler merkez.”', s.vip.stopped ? 'bad' : 'good');
}

export function run(s: Sim, seconds = s.spec.duration) {
  const end = s.t + seconds;
  while (s.t < end - 1e-6 && !s.done) step(s);
  return s;
}

export { applyPlan, setHold, signal, skipTo, walkTime } from './controller';
export { breakdownNow, dispatch, INCIDENT_NAME, incidentStatus } from './incidentSim';
export { avgDelay, avgPedWait, backlogOf, delays, los, queueOf, report, type Report } from './score';
