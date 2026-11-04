import { H, HOT, PACKED, ROAD, RUBBLE, SET_HEAT, SOIL, TACK, W, WATER, WET, idx, readColumn, surfaceAt, type Column, type World, loose, clear, type VehicleKind, type Weather } from './model';
import { bondOf, costOf } from './tools';

/*
 * Yol trafiğe açılınca: araçlar geçer, zayıf yama oturur ya da çöker; günün havası, araçların yükü
 * ve işin karnesi (Report).
 */

export interface Report {
  /** Trafik geçtikten sonraki yüzey, tüm yol boyunca. */
  profile: number[];
  bumps: number;
  dips: number;
  thin: number;
  noGravel: number;
  unpacked: number;
  wet: number;
  spill: number;
  /** Çıplak toprak/mıcır kalan sütun: üstünde asfalt yok. */
  bare: number;
  /** Asfaltın altındaki taşıyıcı katta toprak olan sütun: yol gövdesine toprak konmaz, mıcır konur. */
  soilBase: number;
  /** Tramvay rayının üstünde kalan gevşek malzeme (hücre). */
  rail: number;
  /** Dolmuşun gömüldüğü sütun: boş kalan çukurun ağzı; geçebildiyse -1. */
  stuck: number;
  /** Günler: her havanın sonunda kaç sütun çökmüştü. */
  phases: PhaseResult[];
  /** Trafiğe açıldığında soğumamış asfalt sütunu. */
  hot: number;
  /** Kesme makinesiyle düzeltilmeyen kırık kenar (0–2). */
  uncut: number;
  /** Yapıştırıcı sürülmemiş kesim kenarı (0–2). */
  unbonded: number;
  /** Altına yapıştırıcı sürülmemiş asfalt sütunu. */
  untacked: number;
  /** Dolgunun altında kalan moloz (hücre). */
  rubble: number;
  /** Puanı düşürenler, büyükten küçüğe: fişteki "Neden bu puan?" listesi. */
  reasons: { label: string; points: number }[];
  roughness: number;
  cost: number;
  score: number;
}

/** Trafiğe açılış senaryosu: üç gün, her gün başka hava, her gün birkaç araç geçer. */
export const TRAFFIC: { weather: Weather; label: string; vehicles: VehicleKind[] }[] = [
  { weather: 'sun', label: 'Güneşli gün', vehicles: ['car', 'dolmus', 'bus'] },
  { weather: 'rain', label: 'Sağanak yağmur', vehicles: ['dolmus', 'car', 'truck'] },
  { weather: 'snow', label: 'Kar ve gece donu', vehicles: ['bus', 'car', 'truck'] },
];

/** Aracın dingil yükü, otomobile göre: yama hasarı ağır araçla büyür. */
export const LOAD: Record<VehicleKind, number> = { car: 0.5, dolmus: 0.8, bus: 1.5, truck: 1.9 };

export interface PhaseResult {
  weather: Weather;
  label: string;
  /** O günün sonunda çökmüş sütun sayısı. */
  dips: number;
}

interface TrafficCol {
  x: number;
  col: Column;
  /** Taşıyıcı tabakaya karışan toprağın ağırlığı (0–1): bkz. soilIntrusion. */
  soilBase: number;
  /** Her gün o günün araçlarıyla oturacak hücre sayısı. */
  sink: [number, number, number];
  /** Henüz uygulanmamış oturma kesri. */
  owed: number;
}

/** Trafiğe açılmış yolun durumu: arayüz araç araç ilerletir, testler tek seferde. */
export interface Traffic {
  cols: TrafficCol[];
  before: number[];
  stuck: number;
  phases: PhaseResult[];
  /** Trafiğe açıldığında hâlâ sıcak olan asfalt sütunu. */
  hot: number;
}

/**
 * Yolu trafiğe açar ve her sütunun hava hava ne kadar oturacağını hesaplar. Yol mühendisliğindeki
 * gibi:
 * - güneşli günde sıkışmamış dolgu tekerin altında hacminin üçte biri kadar oturur, sulu asfalt
 *   dağılır, asfaltsız toprakta teker iz açar;
 * - yağmurda su asfaltsız, ince ya da sıkışmamış yamadan içeri sızar: toprak çamurlaşır, alttaki
 *   toprak taban yumuşar, mıcırsız asfalt tabanından oyulur;
 * - donda yamaya sızmış su donup genleşir, çözülünce boşluk bırakır: ince asfalt kırılıp kopar,
 *   asfaltın altındaki toprak kabarıp çöker.
 * İyi sıkıştırılmış, mıcır tabanlı, yeterince kalın bir yama üç günden de sağlam çıkar.
 */
export function startTraffic(w: World): Traffic {
  const [h0, h1] = w.hole;
  const before = Array.from({ length: W }, (_, x) => surfaceAt(w, x));
  const cols: TrafficCol[] = [];
  let hotCols = 0;
  const bond = bondOf(w);
  // kırık ya da yapışmamış kenar: donda su kenardan girer, yama kenarından kopar
  const weakLeft = w.cuts.left === null || !bond.left;
  const weakRight = w.cuts.right === null || !bond.right;
  for (let x = h0; x <= h1; x++) {
    const col = readColumn(w, x);
    const edge = (weakLeft && x - h0 < 3) || (weakRight && h1 - x < 3);
    let rubble = 0;
    for (let y = col.surface; y < H; y++) if (w.cells[idx(x, y)] === SOIL && w.flags[idx(x, y)] & RUBBLE) rubble++;
    const under = col.asphalt > 0 ? w.flags[idx(x, Math.min(H - 1, col.surface + col.asphalt))] : TACK;
    const loosePatch = col.asphalt > 0 && !(under & TACK);
    const soilBase = soilIntrusion(w, x, col.surface);
    const bare = col.asphalt === 0 && col.surface < H;
    const thin = col.asphalt > 0 && col.asphalt < 3;
    const noGravel = col.asphalt > 0 && col.asphalt < FULL_DEPTH && !col.gravel;
    const loose = col.unpacked > 3;
    // soğumadan trafiğe açılan asfalt teker altında ezilir, iz (tekerlek izi oluğu) yapar
    let hot = 0;
    for (let y = col.surface; y < col.surface + col.asphalt; y++) if (w.cells[idx(x, y)] === HOT && w.heat[idx(x, y)] > TRAFFIC_HEAT) hot++;
    if (hot > 0) hotCols++;
    // moloz dolgunun altında boşluk bırakır: teker geçince oturur
    const sun = col.unpacked * 0.35 + col.wet * 0.6 + (bare ? 2 : 0) + hot * 0.6 + rubble * 0.25;
    const rain = (bare ? 3 : 0) + (loose ? col.unpacked * 0.12 : 0) + (thin ? 1 : 0) + soilBase + (noGravel ? 1 : 0) + (col.wet > 0 ? 1 : 0) + (edge ? 0.8 : 0);
    const snow = (thin ? 2 : 0) + (bare ? 1 : 0) + soilBase * 1.5 + (col.wet > 0 ? 1.5 : 0) + (loose ? 1 : 0) + (edge ? 1.6 : 0) + (loosePatch ? 0.5 : 0);
    cols.push({ x, col, soilBase, sink: [sun, rain, snow], owed: 0 });
  }
  if (hotCols > 0) w.events.add('hotTraffic');
  return { cols, before, stuck: findPit(w), phases: [], hot: hotCols };
}

/**
 * Tekerden geniş, yol hizasından 4 hücre derin bir çukur var mı: araç içine gömülür. Trafik
 * sırasında da bakılır; yama çökerse sıradaki araç oraya düşer ve yol kapanır. Çukurun ilk
 * sütununu, yoksa -1 döner.
 */
export function findPit(w: World) {
  for (let x = w.hole[0] - 2, run = 0; x <= w.hole[1] + 2; x++) {
    run = surfaceAt(w, x) > ROAD + 4 ? run + 1 : 0;
    if (run >= 6) return x - 5;
  }
  return -1;
}

/** Bir araç yamanın üstünden geçer: o günün oturmasından kendi yükü kadarını uygular. */
export function passVehicle(w: World, t: Traffic, day: number, kind: VehicleKind) {
  const total = TRAFFIC[day].vehicles.reduce((s, v) => s + LOAD[v], 0);
  const share = LOAD[kind] / total;
  for (const c of t.cols) {
    c.owed += c.sink[day] * share;
    const n = Math.floor(c.owed + 1e-6);
    if (n <= 0) continue;
    c.owed -= n;
    // ilk gün yalnızca gevşek dolgu oturur; yağmur ve don sıkışmış tabakayı da bozar
    settle(w, c.x, surfaceAt(w, c.x), n, day > 0);
  }
}

/** Günün sonu: çökmüş sütunlar sayılır. */
export function endDay(w: World, t: Traffic, day: number) {
  // o günün artık kesirleri de oturur
  for (const c of t.cols) {
    const n = Math.round(c.owed);
    c.owed = 0;
    if (n > 0) settle(w, c.x, surfaceAt(w, c.x), n, day > 0);
  }
  let dips = 0;
  for (const c of t.cols) if (surfaceAt(w, c.x) > ROAD + 1) dips++;
  t.phases.push({ weather: TRAFFIC[day].weather, label: TRAFFIC[day].label, dips });
}

/** Tramvay rayının üstüne saçılan gevşek malzeme. */
export function railSpill(w: World): number {
  if (!w.spec.rail) return 0;
  let n = 0;
  for (let x = w.spec.rail[0]; x <= w.spec.rail[1]; x++) for (let y = ROAD - 6; y < ROAD; y++) if (loose(w.cells[idx(x, y)])) n++;
  return n;
}

/** Trafik ve hava geçtikten sonra yamayı puanlar. `budget` verilirse ödenek aşımı puandan düşer. */
export function gradeTraffic(w: World, t: Traffic, budget = Infinity): Report {
  const [h0, h1] = w.hole;
  let bumps = 0;
  let dips = 0;
  let thin = 0;
  let noGravel = 0;
  let unpacked = 0;
  let wet = 0;
  let bare = 0;
  let soilBase = 0;
  let soilWeight = 0;
  for (const { x, col, soilBase: sb } of t.cols) {
    const after = surfaceAt(w, x);
    if (after < ROAD - 1) bumps++;
    if (after > ROAD + 1) dips++;
    if (col.asphalt === 0) bare++;
    if (sb >= 0.5) soilBase++;
    soilWeight += sb;
    if (col.surface <= ROAD + 1 && col.asphalt < 3) thin++;
    // tam derinlik asfalt (FULL_DEPTH hücreden kalın) kendi başına taşıyıcıdır, mıcır istemez
    if (col.asphalt > 0 && col.asphalt < FULL_DEPTH && !col.gravel) noGravel++;
    if (col.unpacked > 3) unpacked++;
    if (col.wet > 0) wet++;
  }
  // yamanın dışına, yolun üstüne saçılan
  let spill = 0;
  for (let x = 0; x < W; x++) {
    if (x >= h0 && x <= h1) continue;
    for (let y = 0; y < ROAD; y++) if (loose(w.cells[idx(x, y)])) spill++;
  }
  const rail = railSpill(w);
  const profile = Array.from({ length: W }, (_, x) => surfaceAt(w, x));
  let roughness = 0;
  for (let x = Math.max(1, h0 - 4); x <= Math.min(W - 1, h1 + 4); x++) roughness += Math.abs(profile[x] - profile[x - 1]);
  const cost = costOf(w);
  const n = h1 - h0 + 1;
  const bond = bondOf(w);
  const uncut = (w.cuts.left === null ? 1 : 0) + (w.cuts.right === null ? 1 : 0);
  const unbonded = (bond.left ? 0 : 1) + (bond.right ? 0 : 1);
  let rubble = 0;
  for (let x = h0; x <= h1; x++) for (let y = ROAD; y < H; y++) if (w.cells[idx(x, y)] === SOIL && w.flags[idx(x, y)] & RUBBLE) rubble++;
  // gerçek yama sırası: kenar kesilmeli, moloz alınmalı, kenar ve taban yapıştırılmalı
  // gerçek yama sırası: kenar kesilmeli, moloz alınmalı, kenar ve taban yapıştırılmalı
  const parts: [string, number][] = [
    ['Yama çöktü, oturdu', (dips / n) * 70],
    ['Dolgu sıkışmadı', (unpacked / n) * 40],
    ['Tümsek kaldı', (bumps / n) * 30],
    ['Asfalt ince kaldı', (thin / n) * 30],
    ['Asfaltsız yer kaldı', (bare / n) * 30],
    ['Asfalt soğumadan trafiğe açıldı', (t.hot / n) * 20],
    ['Suya asfalt döküldü', (wet / n) * 20],
    ['İlk 30 cm\'de toprak var', (soilWeight / n) * 15],
    ['Asfaltın altında mıcır yok', (noGravel / n) * 15],
    ['Kenar kesilmedi', uncut * 6],
    ['Kenara yapıştırıcı sürülmedi', unbonded * 5],
    ['Tabana yapıştırıcı sürülmedi', bond.cols ? (bond.untacked / bond.cols) * 12 : 0],
    ['Molozun üstüne dolgu yapıldı', Math.min(12, rubble / 3)],
    ['Yola malzeme saçıldı', Math.min(10, spill / 20)],
    ['Yüzey dalgalı', Math.min(15, Math.max(0, roughness - 8) / 2)],
  ];
  const penalty = parts.reduce((s, [, p]) => s + p, 0);
  // ödenek aşımı: her %10 aşım 5 puan, en çok 30
  const overrun = budget > 0 && cost > budget ? Math.min(30, ((cost - budget) / budget) * 50) : 0;
  parts.push(['Ödenek aşıldı', overrun]);
  let score = Math.max(0, Math.min(100, Math.round(100 - penalty - overrun)));
  const cap = (limit: number, label: string) => {
    if (score > limit) parts.push([label, score - limit]);
    score = Math.min(score, limit);
  };
  // raya dökülen tramvayı durdurur: sefer iptali yamanın kendisinden ağır sayılır
  if (rail > 3) cap(45, 'Tramvay rayına malzeme saçıldı');
  if (t.stuck >= 0) cap(5, 'Araç çukura gömüldü, yol kapandı');
  // açık kalmış yer: yan yana beş sütun yol hizasından 7,5 cm'den derin. Kontrol mühendisi
  // dolmamış yamayı teslim almaz; su da en önce oradan girer. Birkaç sütunluk oturma çökme
  // cezasıyla zaten ödenir, tavana takılmaz.
  for (let x = h0, run = 0; x <= h1; x++) {
    run = profile[x] > ROAD + OPEN_DEPTH ? run + 1 : 0;
    if (run >= OPEN_RUN) {
      cap(40, 'Açık yer kaldı: çukur dolmamış');
      break;
    }
  }
  const reasons = parts
    .map(([label, p]) => ({ label, points: Math.round(p) }))
    .filter((r) => r.points >= 1)
    .sort((a, b) => b.points - a.points);
  return { profile, bumps, dips, thin, noGravel, unpacked, wet, spill, bare, soilBase, rail, stuck: t.stuck, phases: t.phases, hot: t.hot, uncut, unbonded, untacked: bond.untacked, rubble, reasons, roughness, cost, score };
}

/** Açık kalmış yerin derinliği (hücre) ve kaç sütun yan yana olunca puanın kesildiği. */
const OPEN_DEPTH = 3;
const OPEN_RUN = 5;

/**
 * Taşıyıcı tabakada toprak: asfalt ve mıcır yol hizasından en az 30 cm (BASE_DEPTH) inmeli,
 * altı toprak olabilir. Toprak bu bölgeye ne kadar girdiyse o kadar zararlı: 2,5 cm'lik taşma
 * hafif, 10 cm ve üstü tam (1). Kar ve yağmurda bu ağırlıkla oturur.
 */
export function soilIntrusion(w: World, x: number, surface = surfaceAt(w, x)) {
  for (let y = surface; y < Math.min(H, ROAD + BASE_DEPTH); y++) if (w.cells[idx(x, y)] === SOIL) return Math.min(1, (ROAD + BASE_DEPTH - y) / 4);
  return 0;
}

/** Trafiği bütün günleriyle bir anda geçirir: çöken yamaya gelen araç gömülür, yol kapanır. */
export function runTraffic(w: World, t: Traffic) {
  for (let day = 0; day < TRAFFIC.length && t.stuck < 0; day++) {
    for (const v of TRAFFIC[day].vehicles) {
      t.stuck = findPit(w);
      if (t.stuck >= 0) break;
      passVehicle(w, t, day, v);
    }
    endDay(w, t, day);
  }
}

/** Bütün senaryoyu tek seferde oynatır: her gün her araç geçer, sonra puanlanır. */
export function openToTraffic(w: World, budget = Infinity): Report {
  const t = startTraffic(w);
  runTraffic(w, t);
  return gradeTraffic(w, t, budget);
}

/** Asfalt bu sıcaklığın üstündeyken trafiğe açılırsa iz yapar (SET_HEAT donma noktası). */
export const TRAFFIC_HEAT = SET_HEAT + 10;

/** Bu kalınlıktan (hücre) kalın asfalt tam derinlik yama sayılır. */
const FULL_DEPTH = 10;

/** Asfalt ve mıcır temelin yol hizasından derinliği (hücre): bunun altı dolgu, toprak olabilir. */
export const BASE_DEPTH = 12;

/** Sütunun gevşek kısmı `sink` hücre oturur (`any`: sıkışmış hücreler de): alttan sıkışmamış hücreler eksilir, üstü aşağı iner. */
function settle(w: World, x: number, top: number, sink: number, any = false) {
  if (sink <= 0 || top >= H) return;
  let bottom = top;
  while (bottom + 1 < H && (loose(w.cells[idx(x, bottom + 1)]) || w.cells[idx(x, bottom + 1)] === WATER)) bottom++;
  type C = { c: number; h: number; f: number; s: number };
  const stack: C[] = [];
  for (let y = top; y <= bottom; y++) {
    const i = idx(x, y);
    stack.push({ c: w.cells[i], h: w.heat[i], f: w.flags[i], s: w.shade[i] });
  }
  let left = Math.min(sink, stack.length);
  // önce su, sonra sulu asfalt, sonra sıkışmamış dolgu gider
  // hava hasarında (any) sıkışmış tabaka da bozulur
  const picks = [(e: C) => e.c === WATER, (e: C) => (e.f & WET) !== 0, (e: C) => !(e.f & PACKED)];
  if (any) picks.push(() => true);
  for (const pick of picks) {
    for (let k = stack.length - 1; k >= 0 && left > 0; k--) {
      if (pick(stack[k])) {
        stack.splice(k, 1);
        left--;
      }
    }
  }
  for (let y = top; y <= bottom; y++) clear(w, idx(x, y));
  for (let k = 0; k < stack.length; k++) {
    const i = idx(x, bottom - (stack.length - 1 - k));
    const e = stack[k];
    w.cells[i] = e.c;
    w.heat[i] = e.h;
    w.flags[i] = e.f;
    w.shade[i] = e.s;
  }
}
