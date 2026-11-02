import { queueOf } from './score';
import { clonePlan, faulty, signal, stepController } from './controller';
import { buildJunction, clash, crossPoint, exitOf, inPoint, outPoint, pose, yields, type Junction, type LegGeo } from './junction';
import {
  ACCEL,
  amberAt,
  CITY,
  BRAKE,
  CAR_COLORS,
  CRASH_CLEAR,
  DETOUR,
  DIR_NAME,
  DT,
  GAP,
  GAP_ACCEPT,
  HARD_BRAKE,
  HEADWAY,
  JAM,
  legOf,
  moveOfKey,
  moveName,
  PED_COLORS,
  PED_PATIENCE,
  PED_V,
  SIDE_GAP,
  SIDE_LOOK,
  SIDE_W,
  TEAM_READY,
  TEAM_V,
  TOW_LOAD,
  TOW_V,
  DIFFICULTY,
  TURN_V,
  turnOf,
  type Car,
  type Controller,
  type Crash,
  type Difficulty,
  type Dir,
  type Event as SimEvent,
  type Incident,
  type IncidentKind,
  type Kind,
  type LevelSpec,
  type LogLine,
  type Ped,
  type Plan,
  type SideCar,
  type SideStreet,
  type Turn,
} from './model';

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
const CUT_IN = 25;

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

const STREETS = ['Gül', 'Lale', 'Menekşe', 'Papatya', 'Çınar', 'Ihlamur', 'Akasya', 'Söğüt', 'Kavak', 'Nane', 'Fesleğen', 'Zambak', 'Yasemin', 'Defne', 'Erik', 'Dut', 'Leylak', 'Badem', 'Nar', 'Ayva'];

/**
 * Kolların ara sokakları, tohumdan: her kolda en çok iki tane, birbirinden en az 55 m uzak. Kimi iki
 * yana geçen sokak (dört yol ağzı), kimi yalnızca bir yanda; kimi kısa çıkmaz. Komşuya bağlanan
 * kolda (boyu verilmiş) iki kavşağın ortasına kadar.
 */
export function sideStreets(j: Junction, seed: number): SideStreet[] {
  const r = rng(seed * 31 + 7);
  const out: SideStreet[] = [];
  let k = Math.floor(r() * STREETS.length);
  for (const g of Object.values(j.legs)) {
    const hi = g.len - (g.spec.len !== undefined ? 14 : 40);
    let at = g.stop + 34 + r() * 30;
    let n = 0;
    while (at < hi && n < 2) {
      if (r() < 0.8) {
        const x = r();
        const sides: (1 | -1)[] = x < 0.4 ? [1, -1] : x < 0.72 ? [1] : [-1];
        const name = `${STREETS[k++ % STREETS.length]} Sk.`;
        const short = r() < 0.25;
        for (const side of sides) out.push({ leg: g.dir, at: Math.round(at), side, name, short });
        n++;
      }
      at += 55 + r() * 50;
    }
  }
  return out;
}

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
function count(s: Sim, mv: string) {
  const l = (s.counts[mv] ??= []);
  l.push(s.t);
  if (l.length > 8 && s.t - l[0] > 90) s.counts[mv] = l.filter((t) => s.t - t <= 90);
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

export const speedOf = (s: Sim, d: Dir) => (s.spec.legs[d]?.v ?? 13.9) * (s.wet ? 0.85 : 1) * ((s.slow[d] ?? 0) > s.t ? 0.4 : 1);

/* ───────────── Araçlar ───────────── */

const KINDS: { kind: Kind; p: number; len: number }[] = [
  { kind: 'car', p: 0.66, len: 4.4 },
  { kind: 'taxi', p: 0.14, len: 4.6 },
  { kind: 'dolmus', p: 0.09, len: 6.6 },
  { kind: 'truck', p: 0.07, len: 7.2 },
  { kind: 'bus', p: 0.04, len: 12 },
];
const LEN: Record<Kind, number> = { car: 4.4, taxi: 4.6, dolmus: 6.6, truck: 7.2, bus: 12, ambulance: 6.2, vip: 5.2, police: 4.8 };

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
function divert(s: Sim, mv: `${Dir}.${Turn}`, born: number) {
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

function pickLane(s: Sim, mv: `${Dir}.${Turn}`, kind?: Kind) {
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

function pickKind(s: Sim): Kind {
  let r = s.rand();
  for (const x of KINDS) {
    if (r < x.p) return x.kind;
    r -= x.p;
  }
  return 'car';
}

/** Yola araç koyar: kolun ucundan (`at` 0) ya da ara sokağın ağzından. Kimi sonra sokağa sapar. */
function addCar(s: Sim, mv: `${Dir}.${Turn}`, lane: number, path: Car['path'], born: number, k: Kind, at: number, v: number, color: number, id = s.nextId++): Car {
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

/* ───────────── Ara sokaklar ───────────── */

/** Ara sokağın ağzında, ana yola bakan sıradaki aracın duruşu (sokakta `k`. sırada). */
export function sidePose(s: Sim, x: Side | SideStreet, k: number, len = 4.4): [number, number, number] {
  const g = s.j.legs[x.leg]!;
  // sokaktan çıkan sağ şeritte: kavşağa yakın yarı
  const along = x.at - SIDE_W / 4;
  const lat = g.inW + 0.8 + len / 2 + k * 6.6;
  return [g.u[0] * along + g.rin[0] * lat, g.u[1] * along + g.rin[1] * lat, Math.atan2(g.rout[1], g.rout[0])];
}

/** Sokağa sapan aracın yolu: giden şeritten sağa kıvrılıp sokağın sağ şeridinde uzaklaşır. */
function ghostPath(g: LegGeo, from: [number, number], at: number): [number, number][] {
  const along = at - SIDE_W / 4;
  const a0 = from[0] * g.u[0] + from[1] * g.u[1];
  const l0 = from[0] * g.rout[0] + from[1] * g.rout[1];
  const pt = (a: number, l: number): [number, number] => [g.u[0] * a + g.rout[0] * l, g.u[1] * a + g.rout[1] * l];
  const pts: [number, number][] = [pt(a0 - 8, l0)];
  // dörtte bir eğri: şeritten sokağın şeridine
  const l1 = g.outW + 3;
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const a = (1 - t) * (1 - t) * a0 + 2 * (1 - t) * t * along + t * t * along;
    const l = (1 - t) * (1 - t) * l0 + 2 * (1 - t) * t * l0 + t * t * l1;
    pts.push(pt(a, l));
  }
  pts.push(pt(along, g.outW + 60));
  return pts;
}

function stepSides(s: Sim) {
  for (const x of s.sides) {
    if (x.side !== 1) continue;
    const g = s.j.legs[x.leg]!;
    // komşuya bağlanan koldaki sokağın kendi küçük talebi (kolun ucundan gelen talep yok)
    if (s.links[x.leg]) {
      x.acc += (1.2 * DIFFICULTY[s.diff].demand * DT * (0.5 + s.rand())) / 60;
      if (x.acc >= 1) {
        x.acc -= 1;
        const t = route(s, x.leg);
        if (t) {
          const k = pickKind(s);
          x.queue.push({ mv: `${x.leg}.${t}`, born: s.t, kind: k === 'bus' ? 'car' : k, color: Math.floor(s.rand() * CAR_COLORS.length), id: s.nextId++ });
          count(s, `${x.leg}.${t}`);
        }
      }
    }
    const head = x.queue[0];
    if (!head) continue;
    // kapalı kol ya da kapalı ağız: sokaktakiler başka sokaklardan dolaşır
    if (!legOpen(s, x.leg) || x.rule === 'closed') {
      for (const c of x.queue.splice(0)) divert(s, c.mv, c.born);
      continue;
    }
    if (!legOpen(s, exitOf(x.leg, turnOf(head.mv) as Turn))) {
      const t = route(s, x.leg, turnOf(head.mv) as Turn);
      if (!t) {
        x.queue.shift();
        divert(s, head.mv, head.born);
        continue;
      }
      head.mv = `${x.leg}.${t}`;
    }
    head.head ??= s.t;
    const stop = x.rule === 'stop';
    if (s.t - head.head < SIDE_LOOK * (stop ? 2.5 : 1)) continue;
    // sabrı tükenen sürücü (yalnızca yol ver levhasında) küçük boşluğa dalar
    const rash = !stop && s.t - head.head > CUT_IN;
    const turn = turnOf(head.mv);
    const curb = g.spec.lanes.length - 1;
    const lane = g.spec.lanes[curb].includes(turn) ? curb : pickLane(s, head.mv);
    const path = s.j.paths.get(`${head.mv}:${lane}`);
    if (!path) {
      x.queue.shift();
      continue;
    }
    const len = LEN[head.kind];
    // ağızdan sağa dönünce şeritteki yeri: burnu sokağın biraz berisinde
    const at = g.len - (x.at - SIDE_W / 4 - 3);
    let ok = true;
    // arkadan gelen en yakın araç: araya girişin bedelini o öder
    let behind: Car | null = null;
    for (const c of s.cars) {
      if (legOf(c.mv) !== x.leg || c.lane !== lane || c.s > c.path.stop + 1) continue;
      if (c.s >= at - 0.5) {
        if (c.s - c.len - at < 3.5) ok = false;
      } else {
        const gap = at - len - c.s;
        if (gap < (rash ? 1.5 + c.v * 0.9 : 3 + c.v * SIDE_GAP * (stop ? 1.4 : 1))) ok = false;
        if (!behind || c.s > behind.s) behind = c;
      }
      if (!ok) break;
    }
    if (!ok) continue;
    x.queue.shift();
    const [px, py, pa] = sidePose(s, x, 0, len);
    const car = addCar(s, head.mv, lane, path, head.born, head.kind, at, 2.5, head.color, head.id);
    car.enter = { x: px, y: py, a: pa, s: at };
    const tight = behind && at - len - behind.s < 3 + behind.v * SIDE_GAP;
    if (rash && behind && tight) {
      s.cutIns++;
      // hızlı gelen duramaz: arkadan çarpar ve şerit kapanır
      if (behind.v > 7 && at - len - behind.s < behind.v * 0.7 && s.rand() < 0.4) {
        car.crashed = s.t;
        behind.crashed = s.t;
        const [hx, hy] = pose(path, at - len);
        s.crashes.push({ at: s.t, x: hx, y: hy, cars: [car.id, behind.id] });
        addIncident(s, 'crash', hx, hy, `${x.name} ağzında kaza: sokaktan dalan ${KIND_NAME[car.kind]} ile arkadan gelen ${KIND_NAME[behind.kind]}.`, CRASH_CLEAR, [car.id, behind.id], x.leg);
        say(s, `Kaza! ${x.name}’ta ${Math.round(s.t - head.head)} saniye bekleyen sürücü sabredemeyip araya daldı, arkadan gelen duramadı. Ağza DUR levhası koy ya da ana yolun kuyruğunu erit.`, 'bad', true);
      } else say(s, `${x.name}’ta ${Math.round(s.t - head.head)} saniye bekleyen sürücü sabredemedi, araya daldı: arkadaki sert fren yaptı.`, 'bad', true);
    }
  }
  for (const gh of s.ghosts) gh.d += gh.v * DT;
  s.ghosts = s.ghosts.filter((gh) => gh.d < gh.cum[gh.cum.length - 1]);
}

/** Kolun ara sokaklarında ana yola çıkmayı bekleyen araçlar. */
export const sideQueue = (s: Sim, d: Dir) => s.sides.filter((x) => x.leg === d).flatMap((x) => x.queue);

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
    if (p.leg !== x.leg || !p.walking || p.hit) continue;
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
  const vip = c.kind === 'vip' || c.kind === 'police' || c.kind === 'ambulance';
  // düğün konvoyu kolu kapattı: gelen, halayın gerisinde; o kola dönecek olan çizgide bekler
  if ((s.block[legOf(c.mv)] ?? 0) > s.t && c.s < p.stop - 22) stopAt(p.stop - 26);
  if (before && !vip && ((s.block[exitLeg] ?? 0) > s.t || s.closeOut[exitLeg])) stopAt(p.stop);
  // komşu kavşağa giden yol doldu: yolun ucunda durur, arkası kuyruk olur
  if (c.s > p.boxOut && linkFull(s, exitLeg)) stopAt(p.len - 0.5);
  // çıkışı tıkalıysa kutuya girmez (kavşağı kilitlemesin): çıkışın başında duran araç var
  if (before && !vip && s.cars.some((o) => o !== c && o.s > o.path.boxOut && o.s < o.path.boxOut + 12 && o.v < 1 && exitOf(legOf(o.mv), turnOf(o.mv) as Turn) === exitLeg)) stopAt(p.stop);
  if (before && (c.kind === 'vip' || c.kind === 'police')) {
    // konvoy ışığa bakmaz; yalnızca kutuda kaza varsa durur
    if (s.cars.some((o) => o.crashed !== undefined && p.box.some(([x, y]) => Math.hypot(center(o)[0] - x, center(o)[1] - y) < 3.5))) stopAt(p.stop);
  } else if (before && faulty(s)) {
    // arıza: dur, bak, geç; geçiş hakkını stepFault verir
    if (c.amber !== 'go') stopAt(p.stop);
  } else if (before) {
    const sig = signal(s, c.mv);
    const dist = p.stop - c.s;
    if (sig === 'green') c.amber = undefined;
    else if (sig === 'amber') {
      if (!c.amber) {
        const need = (c.v * c.v) / (2 * BRAKE);
        c.amber = dist < need * 0.95 || (c.bold && dist < c.v * (amberAt(s.plan, s.ctl.phase) - s.ctl.t)) ? 'go' : 'stop';
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
  // ara sokağın ağzını tıkamaz: kuyruk ağıza dayanınca, sokakta bekleyen varsa ağzın berisinde durur
  if (before && c.v < 4)
    for (const x of s.sides) {
      if (x.side !== 1 || x.leg !== legOf(c.mv) || !x.queue[0]?.head || s.t - x.queue[0].head < 4) continue;
      const mouth = s.j.legs[x.leg]!.len - (x.at + SIDE_W / 2 + 1);
      if (c.s < mouth && mouth - c.s < 12) stopAt(mouth);
    }
  return { gap, v: vl };
}

function stepCar(s: Sim, c: Car) {
  if (c.crashed !== undefined || c.broken) {
    c.v = 0;
    return;
  }
  const p = c.path;
  // sıradaki arıza: kolun ortasında, duruş çizgisine varmadan
  const bk = s.breakNext.findIndex((b) => b.mv === c.mv);
  if (bk >= 0 && c.kind !== 'ambulance' && c.kind !== 'vip' && c.kind !== 'police' && c.s > p.stop - 70 && c.s < p.stop - 12) {
    const b = s.breakNext.splice(bk, 1)[0];
    c.broken = true;
    c.v = 0;
    const [x, y] = pose(p, c.s - c.len / 2);
    addIncident(s, 'breakdown', x, y, b.text, b.sec, [c.id], legOf(c.mv));
    say(s, b.text, 'bad', true);
    return;
  }
  const turn = turnOf(c.mv);
  let v0 = speedOf(s, legOf(c.mv)) * (c.kind === 'bus' || c.kind === 'truck' ? 0.85 : 1);
  if (turn !== 'T') {
    if (c.s < p.stop) v0 = Math.min(v0, Math.sqrt(TURN_V * TURN_V + 2 * 1.6 * (p.stop - c.s)));
    else if (c.s < p.boxOut) v0 = Math.min(v0, TURN_V);
  }
  const { gap, v: vl } = obstacle(s, c);
  const rain = s.wet ? 1.35 : 1;
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
  if (c.v < 1.2 && (c.kind !== 'vip' && c.kind !== 'police' ? true : c.s > p.stop - 40)) c.waited += DT;
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
      if ([a, b].some((c) => c.kind === 'vip' || c.kind === 'police')) {
        s.vip.crash = true;
        say(s, 'Konvoy aracına çarpıldı! Koruma ekibi araçtan indi, kavşak karıştı.', 'bad');
      }
      const near = s.incidents.find((i) => i.kind === 'crash' && i.cleared === undefined && Math.hypot(i.x - hit![0], i.y - hit![1]) < 6);
      if (near) near.cars.push(a.id, b.id);
      else addIncident(s, 'crash', hit[0], hit[1], `Kavşağın ortasında kaza: ${KIND_NAME[a.kind]} ile ${KIND_NAME[b.kind]}.`, CRASH_CLEAR, [a.id, b.id]);
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
      addIncident(s, 'crash', px, py, `${DIR_NAME[p.leg]} geçidinde yayaya çarpıldı.`, CRASH_CLEAR, [c.id]);
      say(s, `${DIR_NAME[p.leg]} geçidinde yayaya çarpıldı! ${p.jay ? 'Kırmızıda geçen yaya, sabrı tükenmişti.' : 'Yaya yeşilde yoldaydı.'} Ambulans çağrıldı.`, 'bad');
      break;
    }
  }
}

const KIND_NAME: Record<Kind, string> = { car: 'otomobil', taxi: 'taksi', dolmus: 'dolmuş', truck: 'kamyonet', bus: 'otobüs', ambulance: 'ambulans', vip: 'makam aracı', police: 'polis aracı' };

/* ───────────── Olaylar ve trafik ekipleri ───────────── */

function addIncident(s: Sim, kind: IncidentKind, x: number, y: number, text: string, sec: number, cars: number[], leg?: Dir) {
  s.incidents.push({ id: s.nextId++, kind, at: s.t, x, y, leg, text, cars, until: s.t + sec });
}

/** Olayın kalkması: araçlar çekilir, kol yeniden akar. */
function clearIncident(s: Sim, i: Incident, byTeam: boolean) {
  i.cleared = s.t;
  const ids = new Set(i.cars);
  s.cars = s.cars.filter((c) => !ids.has(c.id));
  if (i.kind === 'parked' && i.leg) s.slow[i.leg] = 0;
  if (i.kind === 'wedding' && i.leg) s.block[i.leg] = 0;
  if (i.kind === 'crash') for (const p of s.peds) if (p.hit && Math.hypot(crossPoint(s.j.legs[p.leg]!, p.t, p.side)[0] - i.x, crossPoint(s.j.legs[p.leg]!, p.t, p.side)[1] - i.y) < 6) p.since = -999;
  if (i.kind === 'fault') {
    // onarılan kontrolör tüm kırmızıyla açılır: kutuda dur-bak-geç ile kalan araç çıksın
    s.fault = 0;
    s.turn.leg = null;
    s.ctl.stage = 'allred';
    s.ctl.t = -2;
    s.ctl.hold = false;
    s.ctl.cut = false;
  }
  const what =
    i.kind === 'crash'
      ? 'Kaza yeri temizlendi, araçlar çekiciye yüklendi.'
      : i.kind === 'breakdown'
        ? 'Arızalı araç çekildi, şerit açıldı.'
        : i.kind === 'parked'
          ? 'Çift sıra park eden araç kaldırıldı, sürücüsüne ceza yazıldı.'
          : i.kind === 'fault'
            ? 'Hüseyin usta kontrolör dolabını kapattı: “Sigorta atmış, değiştirdim.” Işıklar yeniden çalışıyor.'
            : 'Düğün konvoyu ikna edildi: “Gelin hanıma sağlık, yol açılsın.” Kol açıldı.';
  say(s, byTeam ? `${i.kind === 'fault' ? 'Elektrik ekibi' : 'Trafik ekibi'}: ${what}` : `${what} (Ekip çağrılmadığı için ${Math.round(s.t - i.at)} saniye sürdü.)`, byTeam ? 'good' : 'info');
}

/** Ekibin geleceği kol: olayın kolu ya da olaya en yakın kol. */
function teamLeg(s: Sim, i: Incident) {
  const legs = Object.values(s.j.legs);
  return (i.leg && s.j.legs[i.leg]) || legs.reduce((m, l) => (Math.hypot(l.u[0] * 30 - i.x, l.u[1] * 30 - i.y) < Math.hypot(m.u[0] * 30 - i.x, m.u[1] * 30 - i.y) ? l : m));
}

const pathLen = (pts: [number, number][]) => pts.reduce((m, p, k) => (k ? m + Math.hypot(p[0] - pts[k - 1][0], p[1] - pts[k - 1][1]) : 0), 0);

/** Polis motosikleti: kolun ortasındaki çizgiden (şeritlerin arasından) olayın yanına. */
function motoRoute(i: Incident, g: LegGeo): [number, number][] {
  const mid = (d: number): [number, number] => [g.u[0] * d, g.u[1] * d];
  const along = i.x * g.u[0] + i.y * g.u[1];
  const stopAt = Math.max(g.edge, Math.min(140, along + 4));
  const side: [number, number] = [i.x - g.u[0] * along, i.y - g.u[1] * along];
  const near: [number, number] = [g.u[0] * stopAt + side[0] * 0.4, g.u[1] * stopAt + side[1] * 0.4];
  return [mid(150), mid(stopAt), near];
}

/** Çekici: kolun kapatılan giden şeridinden (araçlara karşı değil, boşaltılmış şeritten) olaya. */
function towRoute(i: Incident, g: LegGeo): [number, number][] {
  const along = i.x * g.u[0] + i.y * g.u[1];
  const sTo = Math.max(g.edge, Math.min(140, along + 6));
  const a = outPoint(g, 0, 150);
  const b = outPoint(g, 0, sTo);
  const dx = i.x - b[0];
  const dy = i.y - b[1];
  const d = Math.hypot(dx, dy) || 1;
  return [a, b, [i.x - (dx / d) * 4, i.y - (dy / d) * 4]];
}

/** "Trafik ekiplerine bildir": polis yola çıkar; gerekirse ardından çekici gelir. */
export function dispatch(s: Sim, id: number, auto = false) {
  const i = s.incidents.find((x) => x.id === id);
  if (!i || i.team || i.cleared !== undefined || i.kind === 'roadwork') return;
  const g = teamLeg(s, i);
  const moto = motoRoute(i, g);
  const arrive = s.t + TEAM_READY + pathLen(moto) / TEAM_V;
  const tow = i.kind !== 'wedding' && i.kind !== 'fault';
  const color = s.cars.find((c) => i.cars.includes(c.id))?.color;
  i.team = { sent: s.t, arrive, fix: tow ? Infinity : arrive + (i.kind === 'fault' ? 12 : 9), leg: g.dir, moto, ...(tow ? { tow: { path: towRoute(i, g), color } } : {}), ...(auto ? { auto } : {}) };
  say(
    s,
    auto
      ? `${INCIDENT_NAME[i.kind]} için başka bir sürücü 155’i aradı; ekip ancak şimdi yola çıktı.`
      : i.kind === 'fault'
        ? `Merkez: “Elektrik ekibi yönlendirildi, Hüseyin usta ${Math.round(arrive - s.t)} saniyeye orada. O gelene kadar kavşak dur-bak-geç işler.”`
        : `Merkez: “${INCIDENT_NAME[i.kind]} için trafik polisi yönlendirildi, ${Math.round(arrive - s.t)} saniyeye orada.${tow ? ' Ardından çekici gelecek.' : ''}”`,
    auto ? 'bad' : 'good',
  );
}

/** Olay kartındaki durum: ekip ve çekici nerede. */
export function incidentStatus(sim: Sim, i: Incident) {
  const team = i.team;
  const sec = (x: number) => Math.max(0, Math.ceil(x - sim.t));
  if (i.cleared !== undefined) return 'Çözüldü';
  if (i.kind === 'roadwork') return `${i.leg && sim.closed[i.leg] ? 'Kol kapalı, ekip güvende' : 'Kol açık: kapat!'} · ${sec(i.until)} sn`;
  if (!team) return `Kendiliğinden kalkması ~${sec(i.until)} sn`;
  if (sim.t < team.arrive) return `${i.kind === 'fault' ? 'Elektrik ekibi' : 'Polis'} yolda · ${sec(team.arrive)} sn`;
  const tow = team.tow;
  if (!tow) return i.kind === 'fault' ? `Usta onarıyor · ${sec(team.fix)} sn` : `Polis ikna ediyor · ${sec(team.fix)} sn`;
  if (tow.start === undefined) return 'Polis şeridi boşaltıyor';
  return `Çekici yolda · ${sec(tow.arrive!)} sn`;
}

export const INCIDENT_NAME: Record<IncidentKind, string> = { crash: 'Kaza', breakdown: 'Arızalı araç', parked: 'Çift sıra park', wedding: 'Düğün konvoyu', roadwork: 'Yol çalışması', fault: 'Sinyal arızası' };

/**
 * Arızada geçiş sırası: karşılıklı iki kol (kuzey-güney, doğu-batı) birlikte geçer, sola dönen
 * karşıdan geleni kollar. Kutuda öbür çiftten hareket eden araç yokken, çizgide bekleyeni olan
 * sıradaki çifte dört saniyelik geçiş hakkı verilir.
 */
function stepFault(s: Sim) {
  if (!faulty(s)) return;
  const tr = s.turn;
  const pair = (d: Dir): Dir[] => (d === 'N' || d === 'S' ? ['N', 'S'] : ['E', 'W']);
  const atLine = (c: Car) => c.s < c.path.stop && c.path.stop - c.s < 3.5 && c.v < 0.6 && c.crashed === undefined && !c.broken;
  // sola dönen, karşıda çizgide bekleyen ya da kutuda ilerleyen varken kalkmaz
  const opp = (d: Dir) => pair(d).find((x) => x !== d)!;
  const oppBusy = (d: Dir) => s.cars.some((o) => legOf(o.mv) === opp(d) && o.crashed === undefined && (atLine(o) || (o.amber === 'go' && o.s - o.len < o.path.boxOut + 1)));
  const release = (d: Dir) => {
    for (const c of s.cars) if (pair(d).includes(legOf(c.mv)) && atLine(c) && (turnOf(c.mv) !== 'L' || !oppBusy(legOf(c.mv)))) c.amber = 'go';
  };
  if (tr.leg && s.t < tr.until) return release(tr.leg);
  tr.leg = null;
  const order: Dir[] = (['N', 'E'] as Dir[]).filter((d) => pair(d).some((x) => s.j.legs[x]));
  const from = tr.last ? order.indexOf(tr.last) + 1 : 0;
  for (let k = 0; k < order.length; k++) {
    const d = order[(from + k) % order.length];
    if (!s.cars.some((c) => pair(d).includes(legOf(c.mv)) && atLine(c))) continue;
    // kutuda araç varsa (ilerleyen de, çıkışı dolu diye duran da) beklenir
    if (s.cars.some((c) => c.crashed === undefined && (c.s > c.path.stop - 0.5 || c.amber === 'go') && c.s - c.len < c.path.boxOut + 1)) return;
    tr.leg = d;
    tr.last = d;
    tr.until = s.t + 3;
    return release(d);
  }
}

function stepIncidents(s: Sim) {
  for (const i of s.incidents) {
    const team = i.team;
    // yol çalışması ekip beklemez: süresi dolunca biter
    if (i.kind === 'roadwork') {
      if (i.cleared === undefined && s.t >= i.until) {
        i.cleared = s.t;
        if (i.leg) s.slow[i.leg] = 0;
        say(s, `Yol çalışması bitti: ${s.spec.legs[i.leg!]!.name} kolunu yeniden açabilirsin.`, 'good');
      }
      continue;
    }
    if (!team) {
      // ekip çağrılmazsa olay uzun süre yolda kalır, sonunda başkası ihbar eder
      if (s.t >= i.until) dispatch(s, i.id, true);
      continue;
    }
    if (s.t < team.arrive) continue;
    const tow = team.tow;
    if (!tow) {
      if (i.cleared === undefined && s.t >= team.fix) clearIncident(s, i, !team.auto);
      continue;
    }
    // polis vardı: çekicinin gireceği giden şeridi kapatır, şerit boşalınca çekici yola çıkar
    s.closeOut[team.leg] = true;
    if (tow.start === undefined) {
      const busy = s.cars.some((c) => exitOf(legOf(c.mv), turnOf(c.mv) as Turn) === team.leg && c.s > c.path.boxOut - 2 && c.crashed === undefined && !i.cars.includes(c.id));
      if (!busy || s.t - team.arrive > 20) {
        tow.start = s.t;
        tow.arrive = s.t + pathLen(tow.path) / TOW_V;
        say(s, 'Polis şeridi kapattı; çekici boşalan şeritten geliyor.', 'info');
      }
    } else if (i.cleared === undefined && s.t >= tow.arrive!) {
      clearIncident(s, i, !team.auto);
      tow.leave = s.t + TOW_LOAD;
      tow.done = tow.leave + pathLen(tow.path) / TOW_V;
    } else if (tow.done !== undefined && s.t >= tow.done && s.closeOut[team.leg]) {
      // çekici çıktı: şerit açılır (aynı kolda başka bir çekici çalışmıyorsa)
      if (!s.incidents.some((o) => o !== i && o.team?.leg === team.leg && o.team.tow && o.team.tow.done === undefined && s.t >= o.team.arrive)) delete s.closeOut[team.leg];
    }
  }
  // biten olaylar, çekici de çekildikten sonra listeden düşer
  s.incidents = s.incidents.filter((i) => i.cleared === undefined || s.t - i.cleared < 8 || (i.team?.tow?.done ?? 0) > s.t);
}

/** Deneme için: kolda hemen bir arıza çıkarır. */
export function breakdownNow(s: Sim, mv: `${Dir}.${Turn}`, text: string, sec = 150) {
  if (!s.breakNext.some((b) => b.mv === mv)) s.breakNext.push({ mv, sec, text });
}

/* ───────────── Yayalar ───────────── */

function stepPeds(s: Sim) {
  for (const d of s.spec.peds) {
    const g = s.j.legs[d.leg];
    if (!g?.crosswalk) continue;
    s.pedAcc[d.leg] = (s.pedAcc[d.leg] ?? 0) + ((rateAt(d.rate, s.t) * DIFFICULTY[s.diff].demand) / 60) * DT * (0.4 + s.rand() * 1.2);
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
    // önü kesik kalan yaya birkaç saniye sonra aracın çevresinden dolaşır (kutu kilitlenmesin)
    if (s.cars.some((c) => c.path.cross.some((x) => x.leg === p.leg && c.s > x.s0 && c.s - c.len < x.s1) && body(c).some(([x, y]) => Math.hypot(x - ax, y - ay) < 1.5))) {
      p.stuck = (p.stuck ?? 0) + DT;
      if (p.stuck < 4) continue;
    } else p.stuck = 0;
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
export { avgDelay, avgPedWait, backlogOf, delays, los, queueOf, report, type Report } from './score';
