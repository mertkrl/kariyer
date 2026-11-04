import { mulberry32 } from '../../shared/random';
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
export const PRICE: Record<Material, number> = { soil: 10, gravel: 22, asphalt: 100 };

/** Sıcak asfalt bu sıcaklığın altına inince donar. */
export const SET_HEAT = 60;

export const PACKED = 1;
export const WET = 2;
/** Suya doymuş toprak: silindirle sıkışmaz, çamur gibi pompalar. */
export const SOAKED = 4;
/** Yapıştırıcı (bitüm emülsiyonu) sürülmüş yüz: üstüne dökülen asfalt buna yapışır. */
export const TACK = 8;
/** Moloz: çukurun dibinde ve kesilen kenarda kalan kırık parça; dolgudan önce alınmalı. */
export const RUBBLE = 16;
/** Sıkışıp hacim kaybetmiş: yerinden oynayıp yeniden sıkışsa da ikinci kez küçülmez. */
export const SHRUNK = 32;

/** Bir hücre 2,5 cm: eski asfalt 4 hücre (10 cm), eski temel 6 hücre (15 cm). */
export const CM_PER_CELL = 2.5;
/** Isıdan °C: kamyondan 160 °C iner, 78 °C'nin altında sıkışmaz, 61 °C'de katılaşır. */
export const tempC = (heat: number) => Math.round(30 + heat * 0.51);

/** Kesme makinesi kırık kenarın en çok bu kadar gerisinden keser (hücre); ötesi sağlam yolu söker. */
export const SAW_REACH = 10;
/** Bir kesimin bedeli ve bir hücre yapıştırıcının bedeli (₺). */
export const SAW_PRICE = 750;
export const TACK_PRICE = 27;

/** Günün havası ve yoldan geçen araçlar: trafik günleri (traffic.ts) bunları kullanır. */
export type Weather = 'sun' | 'rain' | 'snow';
export type VehicleKind = 'car' | 'dolmus' | 'bus' | 'truck';

export interface LevelSpec {
  id: string;
  /** Kenarlar sabah ekipçe kesilmiş gelir (rehberli ilk iş). */
  precut?: boolean;
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
  /** Tramvay rayı: yolun bu sütunları arasına saçılan malzeme seferi durdurur. */
  rail?: [number, number];
}

export interface Roller {
  x: number;
  /** Tamburun oturduğu yüzey satırı: çukura inince ROAD'dan büyük olur. */
  y: number;
  target: number;
  blocked: boolean;
  /** Hız (hücre/adım, işaretli): silindir birkaç ton, ivmelenir ve frenler. */
  v: number;
  /** Titreşim: açıkken derine ve hızlı sıkıştırır; durunca sıcak asfaltı çukurlaştırır. */
  vibe: boolean;
  /** Durduğu adım sayısı: sıcak asfaltta duran tambur iz bırakır. */
  idle: number;
}

export interface World {
  spec: LevelSpec;
  cells: Uint8Array;
  heat: Uint8Array;
  /** Sıkışma (0–100): her silindir geçişi artırır; DENSE'i bulunca PACKED olur. */
  dens: Uint8Array;
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
  /** Asfalt kesme makinesinin iki yandaki kesim sütunu (kesilmediyse null). */
  cuts: { left: number | null; right: number | null };
  /** Püskürtülen yapıştırıcı (hücre). */
  tackUsed: number;
  /** Parası ödenip kürekle atılan ya da silindirin yoldan dışarı ittiği malzemenin bedeli (₺). */
  wasted: number;
}

export { mulberry32 };

export const idx = (x: number, y: number) => y * W + x;
export const loose = (c: Cell) => c === SOIL || c === GRAVEL || c === HOT || c === SET;
export const movable = (c: Cell) => c === SOIL || c === GRAVEL || c === HOT || c === WATER;
export const sinkable = (c: Cell) => c === EMPTY || c === WATER;

/** Atılan hücrenin bedeli: oyuncunun döktüğü malzeme (moloz ve su bedava). */
export function lose(w: World, i: number) {
  const c = w.cells[i];
  if (c === SOIL && w.flags[i] & RUBBLE) return;
  const p = c === SOIL ? PRICE.soil : c === GRAVEL ? PRICE.gravel : c === HOT || c === SET ? PRICE.asphalt : 0;
  if (p) {
    w.wasted += p;
    if (w.wasted >= WASTE_WARN) w.events.add('waste');
  }
}

/** Boşa giden malzeme bu tutarı geçince muhtar söyler (₺). */
export const WASTE_WARN = 2000;

/** Yolu kurar, ortasına çukuru açar; çukurun dibine moloz, istenirse su koyar. */
export function createWorld(spec: LevelSpec): World {
  const rng = mulberry32(spec.seed);
  const n = W * H;
  const w: World = {
    spec,
    cells: new Uint8Array(n),
    heat: new Uint8Array(n),
    dens: new Uint8Array(n),
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
    cuts: { left: null, right: null },
    tackUsed: 0,
    wasted: 0,
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
      if (y > ROAD + 2) {
        w.cells[idx(x, y)] = SOIL;
        w.flags[idx(x, y)] = RUBBLE;
      }
    }
  }
  // kırık kenarlar: eski asfaltın ağzı birkaç hücre içeri sarkar ya da kopar
  for (const [x, dir] of [
    [w.hole[0] - 1, -1],
    [w.hole[1] + 1, 1],
  ] as const) {
    for (let k = 0; k < 3; k++) if (rng() < 0.5) w.cells[idx(x + dir * k, ROAD)] = EMPTY;
  }

  if (spec.precut)
    for (const side of [-1, 1]) {
      const edge = side < 0 ? w.hole[0] : w.hole[1];
      for (let d = 1; d <= SAW_REACH; d++) if (sawCut(w, edge + side * d) === 'ok') break;
    }

  if (spec.waterTop !== undefined) {
    for (let y = ROAD + spec.waterTop; y < H; y++)
      for (let x = w.hole[0]; x <= w.hole[1]; x++) if (w.cells[idx(x, y)] === EMPTY) w.cells[idx(x, y)] = WATER;
  }
  return w;
}

export function swap(w: World, i: number, j: number) {
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
  // yerinden oynayan malzemenin sıkışması bozulur
  w.dens[i] = 0;
  w.dens[j] = 0;
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

export function clear(w: World, i: number) {
  w.cells[i] = EMPTY;
  w.heat[i] = 0;
  w.vel[i] = 0;
  w.hvel[i] = 0;
  w.flags[i] = 0;
  w.dens[i] = 0;
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

export type SawResult = 'ok' | 'done' | 'far' | 'cracked' | 'inside';

/**
 * Asfalt kesme makinesi: kırık kenarın gerisinden eski asfaltı dik keser. Kesimle çukur arasında
 * kalan kırık asfalt sökülür, molozu çukura düşer; çukur kesime kadar genişler ve kenar dimdik
 * olur. Kesilmeyen kenar kırık kalır, yeni asfalt ona yapışmaz: suyu ilk orası alır.
 * - kesim sağlam asfaltta olmalı: kırık bölgede kesilirse kenar yine kırık kalır;
 * - kırık kenardan en çok SAW_REACH hücre geride: daha uzağı boşa sağlam yolu söker.
 */
export function sawCut(w: World, cx: number): SawResult {
  const x = Math.round(cx);
  const [h0, h1] = w.hole;
  const side = x < (h0 + h1) / 2 ? 'left' : 'right';
  if (w.cuts[side] !== null) return 'done';
  if (x < 0 || x >= W) return 'far';
  const dist = side === 'left' ? h0 - x : x - h1;
  if (dist < 1) return 'inside';
  if (dist > SAW_REACH) return 'far';
  // kesimin dışında kalan yol sağlam olmalı: kesim sütunu ve ardındaki üç sütun bütün asfalt
  const out = side === 'left' ? -1 : 1;
  for (let k = 0; k < 4; k++)
    for (let y = ROAD; y < ROAD + 4; y++) if (w.cells[idx(x + out * k, y)] !== OLD) return 'cracked';
  const from = side === 'left' ? x + 1 : h1 + 1;
  const to = side === 'left' ? h0 - 1 : x - 1;
  for (let c = from; c <= to; c++)
    for (let y = ROAD; y < ROAD + 4; y++) {
      const i = idx(c, y);
      if (w.cells[i] !== OLD) continue;
      w.cells[i] = SOIL;
      w.flags[i] = RUBBLE;
      w.heat[i] = 0;
    }
  w.cuts[side] = x;
  w.hole = side === 'left' ? [x + 1, h1] : [h0, x - 1];
  return 'ok';
}
