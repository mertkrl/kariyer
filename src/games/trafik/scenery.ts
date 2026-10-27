import type { Junction } from './junction';
import { SIDEWALK, type Dir } from './model';
import { rng } from './sim';

/*
 * Kavşağın çevresi: dört köşedeki adalar (kaldırım ve parseller), sokağa bitişik nizam dizilmiş
 * apartmanlar, köşe binaları, ara sıra bir park ya da otopark, kaldırım ağaçları, direkler ve
 * babalar. Yalnızca veri: tohumdan aynı mahalle çıkar, çizimi paint.ts yapar.
 */

export const WORLD = 240;

export interface Block {
  /** Ada dikdörtgeni ve yola bakan iç köşesi. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  cx: number;
  cy: number;
  sx: number;
  sy: number;
  /** Köşesi kavisli mi (iki yanında da yol var). */
  round: boolean;
  /** Hangi kenarları yola bakar: dikey yol (x = cx) ve yatay yol (y = cy). */
  vRoad: boolean;
  hRoad: boolean;
}

export type Roof = 'flat' | 'tile';

export interface Building {
  x: number;
  y: number;
  w: number;
  d: number;
  floors: number;
  color: string;
  roof: Roof;
  /** Zemin katta dükkân: tabela ve tente rengi. */
  shop?: { name: string; awning: string };
  /** Çatıdaki eşyalar, binanın içinde 0–1 konumlarla. */
  tanks: [number, number][];
  solar: [number, number][];
  dishes: [number, number][];
  /** Düz çatının kaplaması: beton, mıcır, membran. */
  slab: string;
  /** Balkon düzeni: her kaç pencerede bir balkon. */
  balcony: number;
  seed: number;
}

export interface Lot {
  kind: 'park' | 'parking';
  x: number;
  y: number;
  w: number;
  d: number;
}

export interface Scenery {
  blocks: Block[];
  buildings: Building[];
  lots: Lot[];
  trees: { x: number; y: number; r: number; tone: number }[];
  lamps: { x: number; y: number; a: number }[];
  bollards: [number, number][];
}

const FACADES = ['#e9dcc3', '#efe6d2', '#e7c9a9', '#d9c7a6', '#f1ece0', '#cfd4d2', '#e3b9a0', '#ecd9a9', '#d7d0c3', '#e8d2c4', '#c9cfc0', '#f3e3c3'];
const SHOPS = ['ECZANE', 'BAKKAL', 'FIRIN', 'KUAFÖR', 'EMLAK', 'BÜFE', 'LOKANTA', 'OPTİK', 'TERZİ', 'ÇAY OCAĞI', 'KIRTASİYE', 'MANAV', 'BERBER', 'KASAP', 'PASTANE', 'TEKEL'];
const AWNINGS = ['#b8432f', '#2f6b4f', '#2b4f7a', '#c48a1c', '#7a3b5c', '#3f6f7a', '#a65a2a', '#5a5f2a'];

/** Kolun bir yanındaki yarı genişlik: `side` +1 ise x ya da y'nin artı yanı. */
function legSide(j: Junction, d: Dir, side: number) {
  const g = j.legs[d];
  if (!g) return 0;
  const axis = d === 'N' || d === 'S' ? 0 : 1;
  return g.rin[axis] * side > 0 ? g.inW : g.outW;
}

export function makeScenery(j: Junction, seed: number): Scenery {
  const rand = rng(seed * 7 + 3);
  const pick = <T>(a: T[]) => a[Math.floor(rand() * a.length)];
  const blocks: Block[] = [];
  const buildings: Building[] = [];
  const lots: Lot[] = [];
  const trees: Scenery['trees'] = [];
  const lamps: Scenery['lamps'] = [];
  const bollards: [number, number][] = [];

  for (const sy of [-1, 1])
    for (const sx of [-1, 1]) {
      const v: Dir = sy < 0 ? 'N' : 'S';
      const h: Dir = sx > 0 ? 'E' : 'W';
      const vRoad = !!j.legs[v];
      const hRoad = !!j.legs[h];
      const cx = sx * legSide(j, v, sx);
      const cy = sy * legSide(j, h, sy);
      blocks.push({ x0: Math.min(cx, sx * WORLD), x1: Math.max(cx, sx * WORLD), y0: Math.min(cy, sy * WORLD), y1: Math.max(cy, sy * WORLD), cx, cy, sx, sy, round: vRoad && hRoad, vRoad, hRoad });
    }

  for (const b of blocks) {
    const { sx, sy } = b;
    const fx = b.cx + sx * (b.vRoad ? SIDEWALK : 0);
    const fy = b.cy + sy * (b.hRoad ? SIDEWALK : 0);
    // bina: yerel koordinatta (yola uzaklık) verilir, dünyaya çevrilir
    const put = (u0: number, v0: number, w: number, d: number, extra: Partial<Building> = {}) => {
      const xa = fx + sx * u0;
      const xb = fx + sx * (u0 + w);
      const ya = fy + sy * v0;
      const yb = fy + sy * (v0 + d);
      const floors = extra.floors ?? 4 + Math.floor(rand() * 5);
      const roof: Roof = rand() < 0.38 ? 'tile' : 'flat';
      const n = Math.max(1, Math.floor((w * d) / 120));
      const spots = (k: number) => Array.from({ length: k }, () => [0.15 + rand() * 0.7, 0.15 + rand() * 0.7] as [number, number]);
      buildings.push({
        x: Math.min(xa, xb),
        y: Math.min(ya, yb),
        w,
        d,
        floors,
        color: pick(FACADES),
        roof,
        tanks: roof === 'flat' ? spots(1 + Math.floor(rand() * n)) : [],
        solar: roof === 'flat' && rand() < 0.7 ? spots(1 + Math.floor(rand() * 2)) : [],
        dishes: spots(Math.floor(rand() * 3)),
        slab: pick(['#b9b4aa', '#a8a59e', '#c4bdae', '#9c9a95', '#b3a894', '#8f9396']),
        balcony: 1 + Math.floor(rand() * 3),
        seed: Math.floor(rand() * 1e6),
        ...extra,
      });
    };
    const shop = () => (rand() < 0.75 ? { name: pick(SHOPS), awning: pick(AWNINGS) } : undefined);
    const depth = () => 12 + Math.floor(rand() * 4);
    // köşe binası: iki yola da bakar, zemini dükkân
    const cornerW = 16 + rand() * 5;
    const cornerD = 15 + rand() * 4;
    put(1, 1, cornerW, cornerD, { floors: 6 + Math.floor(rand() * 3), shop: { name: pick(SHOPS), awning: pick(AWNINGS) } });
    // dikey yol boyunca (adanın yola bakan dik kenarı): v ekseninde dizilir
    if (b.vRoad) {
      let v0 = 1 + cornerD + 1;
      while (v0 < WORLD - 20) {
        const r = rand();
        if (r < 0.08) {
          lots.push({ kind: 'park', x: Math.min(fx + sx * 1, fx + sx * 25), y: Math.min(fy + sy * v0, fy + sy * (v0 + 24)), w: 24, d: 24 });
          v0 += 26;
          continue;
        }
        const w = 11 + Math.floor(rand() * 8);
        put(1 + rand() * 1.5, v0, depth(), w, { shop: shop() });
        v0 += w + (rand() < 0.3 ? 2 + rand() * 2 : 0.4);
      }
    }
    if (b.hRoad) {
      let u0 = 1 + cornerW + 1;
      while (u0 < WORLD - 20) {
        const r = rand();
        if (r < 0.07) {
          lots.push({ kind: rand() < 0.5 ? 'park' : 'parking', x: Math.min(fx + sx * u0, fx + sx * (u0 + 26)), y: Math.min(fy + sy * 1, fy + sy * 23), w: 26, d: 22 });
          u0 += 28;
          continue;
        }
        const w = 11 + Math.floor(rand() * 8);
        put(u0, 1 + rand() * 1.5, w, depth(), { shop: shop() });
        u0 += w + (rand() < 0.3 ? 2 + rand() * 2 : 0.4);
      }
    }
    // arka sıra: avlunun ardında bir sıra daha (çoğu ekran dışında kalır)
    for (let v0 = 36; v0 < WORLD - 20; v0 += 22 + rand() * 6)
      for (let u0 = 36; u0 < WORLD - 20; u0 += 20 + rand() * 6) if (rand() < 0.7) put(u0, v0, 13 + rand() * 5, 13 + rand() * 4);

    // kaldırım ağaçları ve aydınlatma direkleri: kaldırımın yola yakın yanında
    const near = 14;
    if (b.vRoad)
      for (let v0 = near; v0 < WORLD; v0 += 8 + rand() * 4) {
        const y = b.cy + sy * v0;
        const x = b.cx + sx * 1.6;
        if (rand() < 0.75) trees.push({ x, y, r: 2.2 + rand() * 1.4, tone: rand() });
        if (Math.floor(v0 / 9) % 3 === 0) lamps.push({ x: b.cx + sx * 0.7, y: y + 3, a: sx > 0 ? Math.PI : 0 });
      }
    if (b.hRoad)
      for (let u0 = near; u0 < WORLD; u0 += 8 + rand() * 4) {
        const x = b.cx + sx * u0;
        const y = b.cy + sy * 1.6;
        if (rand() < 0.75) trees.push({ x, y, r: 2.2 + rand() * 1.4, tone: rand() });
        if (Math.floor(u0 / 9) % 3 === 0) lamps.push({ x: x + 3, y: b.cy + sy * 0.7, a: sy > 0 ? -Math.PI / 2 : Math.PI / 2 });
      }
    // köşede kaldırıma araç çıkmasın diye babalar
    if (b.round)
      for (let k = 0; k < 5; k++) {
        const a = (k / 4) * (Math.PI / 2);
        bollards.push([b.cx + sx * (7 - Math.cos(a) * 6.3), b.cy + sy * (7 - Math.sin(a) * 6.3)]);
      }
  }
  for (const l of lots)
    if (l.kind === 'park') for (let k = 0; k < 6; k++) trees.push({ x: l.x + 3 + rand() * (l.w - 6), y: l.y + 3 + rand() * (l.d - 6), r: 2.6 + rand() * 1.8, tone: rand() });
  return { blocks, buildings, lots, trees, lamps, bollards };
}
