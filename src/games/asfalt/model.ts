/*
 * Yama Ekibi'nin fiziği: yolun yandan kesiti, hücre hücre bir kum dünyası. Toprak ve mıcır kum
 * gibi akıp yığılır, sıcak asfalt bal gibi yayılıp soğudukça donar, su çukurda birikip yolun
 * iki ucundan akar gider. Silindir yol hizasının üstünde kalanı önüne katar, altını sıkıştırır.
 * Düşen her şey yerçekimiyle hızlanır, sert düşen tane yere çarpınca yana savrulur; sıcak
 * asfalt ısısını komşularına ve soğuk zemine iletir, su kendi seviyesini bulana dek yayılır.
 * Burada DOM yok: her şey saf veri, testler aynı adımları Node'da çalıştırır.
 */

export const W = 320;
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

/** Yerçekimi (hücre/adım²) ve düşüşün son hızı (hücre/adım). */
const GRAVITY = 0.12;
const MAX_FALL = 5;

export const PACKED = 1;
export const WET = 2;
/** Suya doymuş toprak: silindirle sıkışmaz, çamur gibi pompalar. */
export const SOAKED = 4;

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
  /** Soğuk hava (0–1): asfalt her adımda bu olasılıkla fazladan soğur; kışın çabuk donar. */
  cold?: number;
}

export interface Roller {
  x: number;
  /** Tamburun oturduğu yüzey satırı: çukura inince ROAD'dan büyük olur. */
  y: number;
  target: number;
  blocked: boolean;
}

export interface World {
  spec: LevelSpec;
  cells: Uint8Array;
  heat: Uint8Array;
  /** Düşüş hızı (hücre/adım): durunca sıfırlanır. */
  vel: Float32Array;
  /** Yatay hız (hücre/adım, işaretli): yuvarlanan tane sürtünmeyle yavaşlar. */
  hvel: Float32Array;
  flags: Uint8Array;
  shade: Uint8Array;
  stamp: Uint8Array;
  /** Çukurun açıldığı sütunlar: [ilk, son]. */
  hole: [number, number];
  tick: number;
  rng: () => number;
  used: Record<Material, number>;
  roller: Roller | null;
  /** Trafik senaryosunda günün havası: yağmurda dünyaya gerçekten yağmur yağar. */
  weather: Weather | null;
  /** Sütun başına biriken sıkışma hacim kaybı (hücre kesri). */
  shrink: Float32Array;
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
    vel: new Float32Array(n),
    hvel: new Float32Array(n),
    flags: new Uint8Array(n),
    shade: new Uint8Array(n),
    stamp: new Uint8Array(n),
    hole: [spec.center - spec.half, spec.center + spec.half],
    tick: 0,
    rng,
    used: { soil: 0, gravel: 0, asphalt: 0 },
    roller: null,
    weather: null,
    shrink: new Float32Array(W),
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
  const v = w.vel[i];
  w.vel[i] = w.vel[j];
  w.vel[j] = v;
  const hv = w.hvel[i];
  w.hvel[i] = w.hvel[j];
  w.hvel[j] = hv;
  const s = shade[i];
  shade[i] = shade[j];
  shade[j] = s;
  w.stamp[j] = w.tick & 255;
}

function clear(w: World, i: number) {
  w.cells[i] = EMPTY;
  w.heat[i] = 0;
  w.vel[i] = 0;
  w.hvel[i] = 0;
  w.flags[i] = 0;
}

/**
 * Yerçekimi: hücre hızlanarak düşer, bir adımda hızı kadar hücre iner. Düştüyse yeni yerini,
 * duruyorsa -1 döner; durunca çarpma hızını `impact`e yazar.
 */
let impact = 0;
function fall(w: World, i: number, through: (c: Cell) => boolean): number {
  const { cells } = w;
  const v = Math.min(MAX_FALL, w.vel[i] + GRAVITY);
  const n = Math.max(1, v | 0);
  let j = i;
  for (let k = 0; k < n && j + W < cells.length && through(cells[j + W]); k++) {
    swap(w, j, j + W);
    j += W;
  }
  if (j !== i) {
    w.vel[j] = v;
    return j;
  }
  impact = w.vel[i];
  w.vel[i] = 0;
  return -1;
}

/**
 * Taneli malzeme. Yığılma açısı malzemeye göre: kuru toprak yapışkandır, ancak iki hücrelik
 * bir boşluğa dökülür (dik yamaç); mıcır yuvarlaktır, tek hücrelik boşluğa bile kayar (yayvan
 * yamaç); ıslanan toprak çamurlaşıp mıcır gibi akar. Kayan tane hız kazanır, düz yerde
 * sürtünmeyle yavaşlayarak bir süre daha yuvarlanır; sert düşen tane yana savrulur.
 */
function grain(w: World, x: number, i: number, cohesive: boolean) {
  const { cells, hvel } = w;
  const below = i + W;
  if (fall(w, i, sinkable) >= 0) return;
  if (w.flags[i] & PACKED) {
    hvel[i] = 0;
    return;
  }
  const wet = (w.flags[i] & SOAKED) !== 0 || (x > 0 && cells[i - 1] === WATER) || (x < W - 1 && cells[i + 1] === WATER) || (i >= W && cells[i - W] === WATER);
  const sticky = cohesive && !wet;
  // çarpınca yatay hız kazanır: yere sert düşen tane rastgele bir yana fırlar
  if (impact > 2) hvel[i] += (w.rng() < 0.5 ? -1 : 1) * impact * (sticky ? 0.12 : 0.3);
  const pref = hvel[i] !== 0 ? Math.sign(hvel[i]) : w.rng() < 0.5 ? -1 : 1;
  for (const dx of [pref, -pref]) {
    const nx = x + dx;
    if (nx < 0 || nx >= W) continue;
    if (!sinkable(cells[i + dx]) || !sinkable(cells[below + dx])) continue;
    const deep = below + W + dx < cells.length && sinkable(cells[below + W + dx]);
    if (sticky && !deep && Math.abs(hvel[i]) < 0.5) continue;
    swap(w, i, below + dx);
    const j = below + dx;
    hvel[j] = hvel[j] * 0.8 + dx * (sticky ? 0.25 : 0.45);
    w.vel[j] = Math.max(w.vel[j], impact * 0.3);
    return;
  }
  // düz yerde yuvarlanma: hız bitene ya da bir engele çarpana dek
  const v = hvel[i];
  if (Math.abs(v) > 0.3) {
    const dx = Math.sign(v);
    const nx = x + dx;
    hvel[i] = v * (sticky ? 0.35 : 0.7);
    if (nx >= 0 && nx < W && sinkable(cells[i + dx]) && w.rng() < Math.abs(v)) swap(w, i, i + dx);
    return;
  }
  hvel[i] = 0;
}

const SPREAD = 6;

function water(w: World, x: number, i: number) {
  const { cells } = w;
  const below = i + W;
  if (fall(w, i, (c) => c === EMPTY) >= 0) return;
  // geçirgenlik: mıcırın boşluklarından su süzülüp gider; toprak suyu emer ve doyar
  const under = cells[below];
  if (under === GRAVEL && w.rng() < 0.04) return clear(w, i);
  if (under === SOIL && w.rng() < 0.015) {
    w.flags[below] |= SOAKED;
    w.flags[below] &= ~PACKED;
    return clear(w, i);
  }
  const d = w.rng() < 0.5 ? -1 : 1;
  for (const dx of [d, -d]) {
    const nx = x + dx;
    if (nx < 0 || nx >= W) return clear(w, i); // yolun ucundan akıp gider
    if (cells[below + dx] === EMPTY) return swap(w, i, below + dx);
  }
  for (const dx of [d, -d]) {
    // su yatayda hızlı yayılır: yüzeyi düzleşene dek kenara akar
    for (let k = 1; k <= SPREAD; k++) {
      const nx = x + dx * k;
      if (nx < 0 || nx >= W) return clear(w, i);
      if (cells[i + dx * k] !== EMPTY) {
        if (k > 1) return swap(w, i, i + dx * (k - 1));
        break;
      }
      if (k === SPREAD || cells[below + dx * k] === EMPTY) return swap(w, i, i + dx * k);
    }
  }
}

function asphalt(w: World, x: number, y: number, i: number) {
  const { cells, heat, flags } = w;
  // soğuma: havaya bakan yüz daha çabuk soğur, suya değen bir anda soğur ve sulanır
  let cool = w.rng() < 0.12 ? 1 : 0;
  if (w.spec.cold && w.rng() < w.spec.cold) cool++;
  if (y > 0 && cells[i - W] === EMPTY && w.rng() < 0.15) cool++;
  const touchesWater = cells[i + W] === WATER || (y > 0 && cells[i - W] === WATER) || (x > 0 && cells[i - 1] === WATER) || (x < W - 1 && cells[i + 1] === WATER);
  if (touchesWater) {
    cool += 6;
    if (!(flags[i] & WET)) {
      flags[i] |= WET;
      w.events.add('wet');
    }
  }
  // ısı iletimi: soğuk zemine değen yüz ısı kaybeder, sıcak komşuyla ısı paylaşılır
  for (const j of [i + W, i - 1, i + 1]) {
    if (j < 0 || j >= cells.length) continue;
    const c = cells[j];
    if (c === HOT || c === SET) {
      // ısı sıcaktan soğuğa akar, toplamı korunur (donmuş komşu ısıyı yalnızca alır)
      const t = Math.trunc((heat[j] - heat[i]) / 8);
      heat[i] += t;
      if (c === HOT) heat[j] -= t;
      else if (t < 0) heat[j] = Math.min(SET_HEAT - 1, heat[j] - t);
    } else if (c !== EMPTY && c !== WATER && w.rng() < 0.1) cool++;
  }
  heat[i] = Math.max(0, heat[i] - cool);
  if (heat[i] < SET_HEAT) {
    cells[i] = SET;
    return;
  }
  const below = i + W;
  if (fall(w, i, sinkable) >= 0) return;
  if (flags[i] & PACKED) return;
  const d = w.rng() < 0.5 ? -1 : 1;
  if (impact > 2 || w.rng() < 0.6) {
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
      else grain(w, x, i, c === SOIL);
    }
  }
  rain(w);
  moveRoller(w);
}

export const raining = (w: World) => w.tick < (w.spec.rainSec ?? 0) * TICKS_PER_SEC;

function rain(w: World) {
  // trafik senaryosunun sağanağı işin yağmurundan sert yağar
  const storm = w.weather === 'rain';
  if (!storm && !raining(w)) return;
  for (let k = 0; k < (storm ? 7 : 3); k++) {
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
  if (!w.roller) w.roller = { x: t < W / 2 ? 0 : W - ROLLER_W, y: ROAD, target: t, blocked: false };
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
  // tambur altındaki en yüksek noktaya oturur: çukur tamburdan genişse içine iner, yerçekimiyle
  const ground = rollerGround(w, x0);
  r.y = ground > r.y ? Math.min(ground, r.y + 0.6) : ground;
  for (let x = x0; x < x0 + ROLLER_W; x++) {
    // tamburun önüne katılan: yol hizasından OVERFILL hücreden yüksekte kalan her şey
    for (let y = 0; y < ROAD - OVERFILL; y++) {
      const i = idx(x, y);
      if (movable(w.cells[i]) || w.cells[i] === SET) shove(w, i, front, y);
    }
    // tamburun değmediği, daha derinde kalan sütun sıkışmaz
    if (surfaceAt(w, x) <= r.y + REACH) compact(w, x);
    // sıkıştıktan sonra hâlâ yol hizasının üstünde kalan gevşek fazlalık tamburla düzlenir;
    // donmuş asfalt itilmez, tümsek olarak kalır
    for (let y = ROAD - OVERFILL; y < ROAD; y++) {
      const i = idx(x, y);
      if (movable(w.cells[i])) shove(w, i, front, y);
    }
  }
}

/**
 * Silindir sütunu sıkıştırır, ama gerçekteki gibi:
 * - yalnızca yüzeyden COMPACT_DEPTH hücre derine işler; kalın dolgu tek seferde sıkışmaz,
 *   katman katman serilip her kat silindirlenmelidir;
 * - gevşek malzeme sıkışınca hacim kaybeder (SHRINK): yüzey alçalır, bu yüzden yol hizasının
 *   biraz üstüne kadar fazla dökülür;
 * - asfalt yalnızca sıcakken (COMPACT_HEAT üstü) sıkışır; soğumuş asfalt silindirle düzelmez.
 */
function compact(w: World, x: number) {
  const top = surfaceAt(w, x);
  if (top >= H) return;
  let loss = 0;
  for (let y = top; y < Math.min(H, top + COMPACT_DEPTH); y++) {
    const i = idx(x, y);
    const c = w.cells[i];
    if (c !== SOIL && c !== GRAVEL && c !== HOT && c !== SET) break;
    if (w.flags[i] & PACKED) continue;
    if (c === SET || (c === HOT && w.heat[i] < COMPACT_HEAT)) continue;
    // suya doymuş toprak sıkışmaz: su kurumadan silindir boşa döner
    if (w.flags[i] & SOAKED) continue;
    w.flags[i] |= PACKED;
    loss += SHRINK[c];
  }
  w.shrink[x] += loss;
  // biriken hacim kaybı bir hücreyi bulunca sütunun tepesinden bir hücre eksilir
  while (w.shrink[x] >= 1) {
    w.shrink[x] -= 1;
    const t = surfaceAt(w, x);
    if (t >= H) break;
    const i = idx(x, t);
    if (w.cells[i] !== SOIL && w.cells[i] !== GRAVEL && w.cells[i] !== HOT) break;
    // tepedeki hücre gider, altındaki sıkışmış hücrelere dokunulmaz
    clear(w, i);
  }
}

/** Tamburun ezdiği fazla dolgu yüksekliği (hücre) ve sıkıştırma derinliği. */
const OVERFILL = 3;
const COMPACT_DEPTH = 10;
/** Asfalt bu sıcaklığın altında sıkışmaz (SET_HEAT donma, 255 serim sıcaklığı). */
export const COMPACT_HEAT = 95;
/** Sıkışınca hacim kaybı: gevşek dolgu ve sıcak karışım. */
const SHRINK: Record<number, number> = { [SOIL]: 0.22, [GRAVEL]: 0.15, [HOT]: 0.2 };

/** Titreşimli tambur, oturduğu noktadan bu kadar derindeki çukurluğu da sıkıştırır (hücre). */
const REACH = 3;

/** Tamburun altındaki en yüksek yüzey (su sayılmaz); yol hizasının üstündeki fazlalık sayılmaz, onu tambur ezer. */
export function rollerGround(w: World, x0: number) {
  let g = H - 1;
  for (let x = Math.max(0, x0); x < Math.min(W, x0 + ROLLER_W); x++) g = Math.min(g, surfaceAt(w, x));
  return Math.max(ROAD, g);
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
  /** Çıplak toprak/mıcır kalan sütun: üstünde asfalt yok. */
  bare: number;
  /** Asfaltın altındaki taşıyıcı katta toprak olan sütun: yol gövdesine toprak konmaz, mıcır konur. */
  soilBase: number;
  /** Dolmuşun gömüldüğü sütun: boş kalan çukurun ağzı; geçebildiyse -1. */
  stuck: number;
  /** Günler: her havanın sonunda kaç sütun çökmüştü. */
  phases: PhaseResult[];
  /** Trafiğe açıldığında soğumamış asfalt sütunu. */
  hot: number;
  roughness: number;
  cost: number;
  score: number;
}

export type Weather = 'sun' | 'rain' | 'snow';
export type VehicleKind = 'car' | 'dolmus' | 'bus' | 'truck';

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
  soilBase: boolean;
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
  for (let x = h0; x <= h1; x++) {
    const col = readColumn(w, x);
    let soilBase = false;
    for (let y = col.surface; y < Math.min(H, ROAD + BASE_DEPTH); y++)
      if (w.cells[idx(x, y)] === SOIL) {
        soilBase = true;
        break;
      }
    const bare = col.asphalt === 0 && col.surface < H;
    const thin = col.asphalt > 0 && col.asphalt < 3;
    const noGravel = col.asphalt > 0 && col.asphalt < FULL_DEPTH && !col.gravel;
    const loose = col.unpacked > 3;
    // soğumadan trafiğe açılan asfalt teker altında ezilir, iz (tekerlek izi oluğu) yapar
    let hot = 0;
    for (let y = col.surface; y < col.surface + col.asphalt; y++) if (w.cells[idx(x, y)] === HOT && w.heat[idx(x, y)] > TRAFFIC_HEAT) hot++;
    if (hot > 0) hotCols++;
    const sun = col.unpacked * 0.35 + col.wet * 0.6 + (bare ? 2 : 0) + hot * 0.6;
    const rain = (bare ? 3 : 0) + (loose ? col.unpacked * 0.12 : 0) + (thin ? 1 : 0) + (soilBase ? 1 : 0) + (noGravel ? 1 : 0) + (col.wet > 0 ? 1 : 0);
    const snow = (thin ? 2 : 0) + (bare ? 1 : 0) + (soilBase ? 1.5 : 0) + (col.wet > 0 ? 1.5 : 0) + (loose ? 1 : 0);
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
  for (const { x, col, soilBase: sb } of t.cols) {
    const after = surfaceAt(w, x);
    if (after < ROAD - 1) bumps++;
    if (after > ROAD + 1) dips++;
    if (col.asphalt === 0) bare++;
    if (sb) soilBase++;
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
  const profile = Array.from({ length: W }, (_, x) => surfaceAt(w, x));
  let roughness = 0;
  for (let x = Math.max(1, h0 - 4); x <= Math.min(W - 1, h1 + 4); x++) roughness += Math.abs(profile[x] - profile[x - 1]);
  const cost = (Object.keys(w.used) as Material[]).reduce((s, m) => s + w.used[m] * PRICE[m], 0);
  const n = h1 - h0 + 1;
  const penalty = (bumps / n) * 30 + (dips / n) * 70 + (t.hot / n) * 20 + (thin / n) * 30 + (bare / n) * 30 + (unpacked / n) * 40 + (soilBase / n) * 15 + (noGravel / n) * 15 + (wet / n) * 20 + Math.min(10, spill / 20) + Math.min(15, Math.max(0, roughness - 8) / 2);
  // ödenek aşımı: her %10 aşım 5 puan, en çok 30
  const overrun = budget > 0 && cost > budget ? Math.min(30, ((cost - budget) / budget) * 50) : 0;
  let score = Math.max(0, Math.min(100, Math.round(100 - penalty - overrun)));
  if (t.stuck >= 0) score = Math.min(score, 5);
  // açık kalmış yer: yan yana üç sütun yol hizasından belirgin derinde. Kontrol mühendisi
  // dolmamış yamayı teslim almaz; su da en önce oradan girer.
  for (let x = h0, run = 0; x <= h1; x++) {
    run = profile[x] > ROAD + 2 ? run + 1 : 0;
    if (run >= 3) {
      score = Math.min(score, 40);
      break;
    }
  }
  return { profile, bumps, dips, thin, noGravel, unpacked, wet, spill, bare, soilBase, stuck: t.stuck, phases: t.phases, hot: t.hot, roughness, cost, score };
}

/** Bütün senaryoyu tek seferde oynatır: her gün her araç geçer, sonra puanlanır. */
export function openToTraffic(w: World, budget = Infinity): Report {
  const t = startTraffic(w);
  for (let day = 0; day < TRAFFIC.length && t.stuck < 0; day++) {
    for (const v of TRAFFIC[day].vehicles) {
      // çöken yamaya gelen araç gömülür, yol kapanır
      t.stuck = findPit(w);
      if (t.stuck >= 0) break;
      passVehicle(w, t, day, v);
    }
    endDay(w, t, day);
  }
  return gradeTraffic(w, t, budget);
}

/** Asfalt bu sıcaklığın üstündeyken trafiğe açılırsa iz yapar (SET_HEAT donma noktası). */
const TRAFFIC_HEAT = SET_HEAT + 10;

/** Bu kalınlıktan (hücre) kalın asfalt tam derinlik yama sayılır. */
const FULL_DEPTH = 10;

/** Asfalt ve mıcır temelin yol hizasından derinliği (hücre): bunun altı dolgu, toprak olabilir. */
const BASE_DEPTH = 12;

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

/** Çukurun yol hizasına kadar hacmi: ödenek ve kaba tahmin için. */
export function holeVolume(w: World) {
  let v = 0;
  for (let x = w.hole[0]; x <= w.hole[1]; x++) for (let y = ROAD; y < H; y++) if (w.cells[idx(x, y)] === EMPTY || w.cells[idx(x, y)] === WATER) v++;
  return v;
}
