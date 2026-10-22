/*
 * Yama Ekibi'nin fiziği: yolun yandan kesiti, hücre hücre bir kum dünyası. Toprak ve mıcır kum
 * gibi akıp yığılır, sıcak asfalt bal gibi yayılıp soğudukça donar, su çukurda birikip yolun
 * iki ucundan akar gider. Silindir yol hizasının üstünde kalanı önüne katar, altını sıkıştırır.
 * Burada DOM yok: her şey saf veri, testler aynı adımları Node'da çalıştırır.
 */

export const W = 240;
export const H = 135;
/** Yol yüzeyinin satırı: bunun üstü hava, altı yolun gövdesi. */
export const ROAD = 80;
/** Silindirin genişliği (hücre). */
export const ROLLER_W = 16;
/** Bir saniyedeki adım sayısı. */
export const TICKS_PER_SEC = 60;

export const EMPTY = 0;
/** Yolun altındaki yerli toprak: kıpırdamaz, kürekle de kazılmaz. */
export const GROUND = 1;
/** Eski yolun mıcır tabanı: kıpırdamaz. */
export const BASE = 2;
/** Eski asfalt: kıpırdamaz. */
export const OLD = 3;
export const SOIL = 4;
export const GRAVEL = 5;
/** Sıcak asfalt: akar, soğur, donar. */
export const HOT = 6;
/** Donmuş yeni asfalt. */
export const SET = 7;
export const WATER = 8;

export type Cell = number;
export type Material = 'soil' | 'gravel' | 'asphalt';
export const MATERIAL_CELL: Record<Material, Cell> = { soil: SOIL, gravel: GRAVEL, asphalt: HOT };
/** Bir hücrenin bedeli (₺). */
export const PRICE: Record<Material, number> = { soil: 40, gravel: 95, asphalt: 280 };

/** Sıcak asfalt bu sıcaklığın altına inince donar. */
export const SET_HEAT = 60;

export const PACKED = 1;
export const WET = 2;

export interface LevelSpec {
  id: string;
  seed: number;
  /** Çukurun ortası, yarı genişliği ve en derin yeri (hücre). */
  center: number;
  half: number;
  depth: number;
  /** Çukurun içindeki su (ROAD'dan aşağı kaç satır boş kalır). */
  waterTop?: number;
  /** Yağmur kaç saniye sürer. */
  rainSec?: number;
  /** Açılış töreni: bu saniyede yol kendiliğinden trafiğe açılır. */
  deadlineSec?: number;
}

export interface Roller {
  x: number;
  target: number;
  blocked: boolean;
}

export interface World {
  spec: LevelSpec;
  cells: Uint8Array;
  heat: Uint8Array;
  flags: Uint8Array;
  shade: Uint8Array;
  stamp: Uint8Array;
  /** Çukurun açıldığı sütunlar: [ilk, son]. */
  hole: [number, number];
  tick: number;
  rng: () => number;
  used: Record<Material, number>;
  roller: Roller | null;
  /** Bir kez olan şeyler; arayüz muhtarın lafına çevirir. */
  events: Set<string>;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const idx = (x: number, y: number) => y * W + x;
const loose = (c: Cell) => c === SOIL || c === GRAVEL || c === HOT || c === SET;
const movable = (c: Cell) => c === SOIL || c === GRAVEL || c === HOT || c === WATER;
const sinkable = (c: Cell) => c === EMPTY || c === WATER;

/** Yolu kurar, ortasına çukuru açar; çukurun dibine moloz, istenirse su koyar. */
export function createWorld(spec: LevelSpec): World {
  const rng = mulberry32(spec.seed);
  const n = W * H;
  const w: World = {
    spec,
    cells: new Uint8Array(n),
    heat: new Uint8Array(n),
    flags: new Uint8Array(n),
    shade: new Uint8Array(n),
    stamp: new Uint8Array(n),
    hole: [spec.center - spec.half, spec.center + spec.half],
    tick: 0,
    rng,
    used: { soil: 0, gravel: 0, asphalt: 0 },
    roller: null,
    events: new Set(),
  };
  for (let i = 0; i < n; i++) w.shade[i] = (rng() * 256) | 0;
  for (let y = ROAD; y < H; y++) for (let x = 0; x < W; x++) w.cells[idx(x, y)] = y < ROAD + 4 ? OLD : y < ROAD + 10 ? BASE : GROUND;

  // çukur: kenarları kırık, dibi dalgalı
  let wobble = 0;
  for (let x = w.hole[0]; x <= w.hole[1]; x++) {
    const u = (x - spec.center) / spec.half;
    wobble += (rng() - 0.5) * 1.6;
    wobble *= 0.85;
    const d = Math.max(3, Math.round(spec.depth * Math.pow(Math.max(0, 1 - u * u), 0.6) + wobble));
    for (let y = ROAD; y < ROAD + d && y < H - 2; y++) w.cells[idx(x, y)] = EMPTY;
    // dipte kalan moloz: biraz gevşek toprak
    const rubble = Math.round(rng() * 2);
    for (let k = 0; k < rubble; k++) {
      const y = ROAD + d - 1 - k;
      if (y > ROAD + 2) w.cells[idx(x, y)] = SOIL;
    }
  }
  // kırık kenarlar: eski asfaltın ağzı birkaç hücre içeri sarkar ya da kopar
  for (const [x, dir] of [
    [w.hole[0] - 1, -1],
    [w.hole[1] + 1, 1],
  ] as const) {
    for (let k = 0; k < 3; k++) if (rng() < 0.5) w.cells[idx(x + dir * k, ROAD)] = EMPTY;
  }

  if (spec.waterTop !== undefined) {
    for (let y = ROAD + spec.waterTop; y < H; y++)
      for (let x = w.hole[0]; x <= w.hole[1]; x++) if (w.cells[idx(x, y)] === EMPTY) w.cells[idx(x, y)] = WATER;
  }
  return w;
}

function swap(w: World, i: number, j: number) {
  const { cells, heat, flags, shade } = w;
  const c = cells[i];
  cells[i] = cells[j];
  cells[j] = c;
  const h = heat[i];
  heat[i] = heat[j];
  heat[j] = h;
  // yer değiştiren şey artık sıkışmış değildir
  const f = flags[i] & ~PACKED;
  flags[i] = flags[j] & ~PACKED;
  flags[j] = f;
  const s = shade[i];
  shade[i] = shade[j];
  shade[j] = s;
  w.stamp[j] = w.tick & 255;
}

function clear(w: World, i: number) {
  w.cells[i] = EMPTY;
  w.heat[i] = 0;
  w.flags[i] = 0;
}

function grain(w: World, x: number, i: number, slide: number) {
  const { cells } = w;
  const below = i + W;
  if (sinkable(cells[below])) return swap(w, i, below);
  if (w.flags[i] & PACKED) return;
  if (w.rng() > slide) return;
  const d = w.rng() < 0.5 ? -1 : 1;
  for (const dx of [d, -d]) {
    const nx = x + dx;
    if (nx < 0 || nx >= W) continue;
    if (sinkable(cells[below + dx]) && sinkable(cells[i + dx])) return swap(w, i, below + dx);
  }
}

function water(w: World, x: number, i: number) {
  const { cells } = w;
  const below = i + W;
  if (cells[below] === EMPTY) return swap(w, i, below);
  const d = w.rng() < 0.5 ? -1 : 1;
  for (const dx of [d, -d]) {
    const nx = x + dx;
    if (nx < 0 || nx >= W) return clear(w, i); // yolun ucundan akıp gider
    if (cells[below + dx] === EMPTY) return swap(w, i, below + dx);
  }
  for (const dx of [d, -d]) {
    for (let k = 1; k <= 3; k++) {
      const nx = x + dx * k;
      if (nx < 0 || nx >= W) return clear(w, i);
      if (cells[i + dx * k] !== EMPTY) break;
      if (k === 3 || cells[below + dx * k] === EMPTY) return swap(w, i, i + dx * k);
    }
  }
}

function asphalt(w: World, x: number, y: number, i: number) {
  const { cells, heat, flags } = w;
  // soğuma: havaya bakan yüz daha çabuk soğur, suya değen bir anda soğur ve sulanır
  let cool = w.rng() < 0.3 ? 1 : 0;
  if (y > 0 && cells[i - W] === EMPTY && w.rng() < 0.3) cool++;
  const touchesWater = cells[i + W] === WATER || (y > 0 && cells[i - W] === WATER) || (x > 0 && cells[i - 1] === WATER) || (x < W - 1 && cells[i + 1] === WATER);
  if (touchesWater) {
    cool += 6;
    if (!(flags[i] & WET)) {
      flags[i] |= WET;
      w.events.add('wet');
    }
  }
  heat[i] = Math.max(0, heat[i] - cool);
  if (heat[i] < SET_HEAT) {
    cells[i] = SET;
    return;
  }
  const below = i + W;
  if (sinkable(cells[below])) return swap(w, i, below);
  if (flags[i] & PACKED) return;
  const d = w.rng() < 0.5 ? -1 : 1;
  if (w.rng() < 0.6) {
    for (const dx of [d, -d]) {
      const nx = x + dx;
      if (nx < 0 || nx >= W) continue;
      if (sinkable(cells[below + dx]) && sinkable(cells[i + dx])) return swap(w, i, below + dx);
    }
  }
  // sıcakken yayılır: sıcaklık düştükçe ağırlaşır
  const flow = ((heat[i] - 90) / 165) * 0.5;
  if (flow > 0 && w.rng() < flow) {
    const nx = x + d;
    if (nx >= 0 && nx < W && cells[i + d] === EMPTY) return swap(w, i, i + d);
  }
}

/** Dünyayı bir adım ilerletir: aşağıdan yukarı tarar, yönü her adımda değişir. */
export function step(w: World) {
  w.tick++;
  const t = w.tick & 255;
  const ltr = (w.tick & 1) === 0;
  const { cells, stamp } = w;
  for (let y = H - 2; y >= 0; y--) {
    for (let k = 0; k < W; k++) {
      const x = ltr ? k : W - 1 - k;
      const i = y * W + x;
      const c = cells[i];
      if (c < SOIL || c === SET || stamp[i] === t) continue;
      if (c === WATER) water(w, x, i);
      else if (c === HOT) asphalt(w, x, y, i);
      else grain(w, x, i, c === SOIL ? 0.8 : 0.45);
    }
  }
  rain(w);
  moveRoller(w);
}

export const raining = (w: World) => w.tick < (w.spec.rainSec ?? 0) * TICKS_PER_SEC;

function rain(w: World) {
  if (!raining(w)) return;
  for (let k = 0; k < 3; k++) {
    if (w.rng() < 0.5) continue;
    const i = idx((w.rng() * W) | 0, 0);
    if (w.cells[i] === EMPTY) w.cells[i] = WATER;
  }
}

/** İmlecin çevresine malzeme döker: yalnızca boş hücrelere, adım başına birkaç hücre. */
export function pour(w: World, mat: Material, cx: number, cy: number, radius = 3, count = 5) {
  let placed = 0;
  for (let k = 0; k < count * 3 && placed < count; k++) {
    const a = w.rng() * Math.PI * 2;
    const r = Math.sqrt(w.rng()) * radius;
    const x = Math.round(cx + Math.cos(a) * r);
    const y = Math.round(cy + Math.sin(a) * r);
    if (x < 0 || x >= W || y < 0 || y >= H) continue;
    const i = idx(x, y);
    if (w.cells[i] !== EMPTY) continue;
    w.cells[i] = MATERIAL_CELL[mat];
    w.heat[i] = mat === 'asphalt' ? 255 : 0;
    w.flags[i] = 0;
    placed++;
  }
  w.used[mat] += placed;
  return placed;
}

/** Kürek: gevşek her şeyi alır; donmuş asfaltı ancak kazmayla, yavaş yavaş. Eski yola dokunmaz. */
export function dig(w: World, cx: number, cy: number, radius = 4) {
  let removed = 0;
  for (let y = Math.max(0, Math.round(cy - radius)); y <= Math.min(H - 1, Math.round(cy + radius)); y++) {
    for (let x = Math.max(0, Math.round(cx - radius)); x <= Math.min(W - 1, Math.round(cx + radius)); x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > radius * radius) continue;
      const i = idx(x, y);
      const c = w.cells[i];
      if (movable(c) || (c === SET && w.rng() < 0.12)) {
        clear(w, i);
        removed++;
      }
    }
  }
  return removed;
}

/** Su motoru: çevresindeki suyu çeker. */
export function pump(w: World, cx: number, cy: number, radius = 6) {
  let removed = 0;
  for (let y = Math.max(0, Math.round(cy - radius)); y <= Math.min(H - 1, Math.round(cy + radius)); y++) {
    for (let x = Math.max(0, Math.round(cx - radius)); x <= Math.min(W - 1, Math.round(cx + radius)); x++) {
      const i = idx(x, y);
      if (w.cells[i] === WATER && (x - cx) ** 2 + (y - cy) ** 2 <= radius * radius) {
        clear(w, i);
        removed++;
      }
    }
  }
  return removed;
}

/** Silindiri yola indirir ya da hedefini değiştirir. */
export function driveRoller(w: World, target: number) {
  const t = Math.max(0, Math.min(W - ROLLER_W, target));
  if (!w.roller) w.roller = { x: t < W / 2 ? 0 : W - ROLLER_W, target: t, blocked: false };
  else w.roller.target = t;
}

const ROLLER_SPEED = 0.35;

function moveRoller(w: World) {
  const r = w.roller;
  if (!r) return;
  const dir = Math.sign(r.target - r.x);
  r.blocked = false;
  if (dir !== 0) {
    const next = Math.abs(r.target - r.x) < ROLLER_SPEED ? r.target : r.x + dir * ROLLER_SPEED;
    // önüne gelen sütunda yol hizasının üstünde donmuş asfalt varsa çıkamaz
    const lead = dir > 0 ? Math.floor(next) + ROLLER_W - 1 : Math.floor(next);
    if (lead !== (dir > 0 ? Math.floor(r.x) + ROLLER_W - 1 : Math.floor(r.x)) && hasSetAbove(w, lead)) {
      r.blocked = true;
      r.target = r.x;
      w.events.add('blocked');
    } else r.x = next;
  }
  const x0 = Math.floor(r.x);
  const front = dir < 0 ? x0 - 1 : x0 + ROLLER_W;
  for (let x = x0; x < x0 + ROLLER_W; x++) {
    for (let y = 0; y < ROAD; y++) {
      const i = idx(x, y);
      if (movable(w.cells[i]) || w.cells[i] === SET) shove(w, i, front, y);
    }
    // yol hizasına kadar dolu sütunu sıkıştırır; çukurda kalan sütuna değmez
    if (w.cells[idx(x, ROAD)] === EMPTY || w.cells[idx(x, ROAD)] === WATER) continue;
    for (let y = ROAD; y < H; y++) {
      const i = idx(x, y);
      const c = w.cells[i];
      if (c === SOIL || c === GRAVEL || c === HOT) w.flags[i] |= PACKED;
      else if (c !== SET) break;
    }
  }
}

/** Silindir ince donmuş tabakayı ezer geçer; üç hücreyi bulan donmuş tümsekte durur. */
const CRUSH = 2;

function hasSetAbove(w: World, x: number) {
  if (x < 0 || x >= W) return false;
  let n = 0;
  for (let y = 0; y < ROAD; y++) if (w.cells[idx(x, y)] === SET) n++;
  return n > CRUSH;
}

/** Silindirin altında kalanı önündeki sütuna, boş bulduğu ilk yere iter; yolun dışına iterse gider. */
function shove(w: World, i: number, fx: number, y: number) {
  if (fx < 0 || fx >= W) {
    clear(w, i);
    return;
  }
  for (let yy = y; yy >= 0; yy--) {
    const j = idx(fx, yy);
    if (w.cells[j] === EMPTY) {
      swap(w, i, j);
      return;
    }
  }
  clear(w, i);
}

/** Bir sütunun yüzeyi: yukarıdan inince rastlanan ilk katı hücrenin satırı (su sayılmaz). */
export function surfaceAt(w: World, x: number) {
  for (let y = 0; y < H; y++) {
    const c = w.cells[idx(x, y)];
    if (c !== EMPTY && c !== WATER) return y;
  }
  return H;
}

export interface Column {
  x: number;
  surface: number;
  asphalt: number;
  gravel: boolean;
  unpacked: number;
  wet: number;
}

/** Yamanın bir sütununu üstten aşağı okur: asfalt kalınlığı, altında mıcır var mı, sıkışmamış dolgu, sulu asfalt. */
export function readColumn(w: World, x: number): Column {
  const surface = surfaceAt(w, x);
  let y = surface;
  let asphalt = 0;
  let wet = 0;
  while (y < H && (w.cells[idx(x, y)] === HOT || w.cells[idx(x, y)] === SET)) {
    if (w.flags[idx(x, y)] & WET) wet++;
    asphalt++;
    y++;
  }
  const under = y < H ? w.cells[idx(x, y)] : GROUND;
  // eski yolun kendisi de sağlam bir yataktır
  const gravel = under === GRAVEL || under === BASE || under === OLD;
  let unpacked = 0;
  for (let yy = surface; yy < H; yy++) {
    const i = idx(x, yy);
    const c = w.cells[i];
    if (!loose(c) && c !== WATER) break;
    if (c === WATER) unpacked += 2; // altta kalan su: en kötüsü
    else if (!(w.flags[i] & PACKED)) unpacked++;
    if (c !== WATER && w.flags[i] & WET && yy >= y) wet++;
  }
  return { x, surface, asphalt, gravel, unpacked, wet };
}

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
  roughness: number;
  cost: number;
  score: number;
}

/**
 * Yolu trafiğe açar: sıkışmamış dolgu oturur, sulu asfalt dağılır. Dünyayı değiştirir (araba
 * oturmuş yolun üstünden geçer), sonra yamayı puanlar.
 */
export function openToTraffic(w: World): Report {
  const [h0, h1] = w.hole;
  let bumps = 0;
  let dips = 0;
  let thin = 0;
  let noGravel = 0;
  let unpacked = 0;
  let wet = 0;
  for (let x = h0; x <= h1; x++) {
    const col = readColumn(w, x);
    const sink = Math.round(col.unpacked * 0.25 + col.wet * 0.6);
    settle(w, x, col.surface, sink);
    const after = surfaceAt(w, x);
    if (after < ROAD - 1) bumps++;
    if (after > ROAD + 1) dips++;
    if (col.surface <= ROAD + 1 && col.asphalt < 3) thin++;
    if (col.asphalt > 0 && !col.gravel) noGravel++;
    if (col.unpacked > 3) unpacked++;
    if (col.wet > 0) wet++;
  }
  // yamanın dışına, yolun üstüne saçılan
  let spill = 0;
  for (let x = 0; x < W; x++) {
    if (x >= h0 && x <= h1) continue;
    for (let y = 0; y < ROAD; y++) if (loose(w.cells[idx(x, y)])) spill++;
  }
  const profile = Array.from({ length: W }, (_, x) => surfaceAt(w, x));
  let roughness = 0;
  for (let x = Math.max(1, h0 - 4); x <= Math.min(W - 1, h1 + 4); x++) roughness += Math.abs(profile[x] - profile[x - 1]);
  const cost = (Object.keys(w.used) as Material[]).reduce((s, m) => s + w.used[m] * PRICE[m], 0);
  const n = h1 - h0 + 1;
  const penalty = (bumps / n) * 30 + (dips / n) * 35 + (thin / n) * 15 + (noGravel / n) * 15 + (wet / n) * 20 + Math.min(10, spill / 20) + Math.min(15, Math.max(0, roughness - 8) / 2);
  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));
  return { profile, bumps, dips, thin, noGravel, unpacked, wet, spill, roughness, cost, score };
}

/** Sütunun gevşek kısmı `sink` hücre oturur: alttan sıkışmamış hücreler eksilir, üstü aşağı iner. */
function settle(w: World, x: number, top: number, sink: number) {
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
  for (const pick of [(e: C) => e.c === WATER, (e: C) => (e.f & WET) !== 0, (e: C) => !(e.f & PACKED)]) {
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

/** Çukurun yol hizasına kadar hacmi: ödenek ve kaba tahmin için. */
export function holeVolume(w: World) {
  let v = 0;
  for (let x = w.hole[0]; x <= w.hole[1]; x++) for (let y = ROAD; y < H; y++) if (w.cells[idx(x, y)] === EMPTY || w.cells[idx(x, y)] === WATER) v++;
  return v;
}
