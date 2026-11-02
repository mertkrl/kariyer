import type { Junction } from './junction';
import { OBL_X, OBL_Y } from './facade';
import { CITY, SIDE_W, SIDE_WALK, SIDEWALK, type City, type Dir, type Landmark, type LevelSpec, type SideStreet } from './model';
import { rng } from './sim';

/*
 * Kavşağın çevresi: dört köşedeki adalar (kaldırım ve parseller), sokağa bitişik nizam dizilmiş
 * apartmanlar, köşe binaları, ara sıra bir park ya da otopark, kaldırım ağaçları, direkler ve
 * babalar. Yalnızca veri: tohumdan aynı mahalle çıkar, çizimi paint.ts yapar.
 */

export const WORLD = CITY;

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
  /** Köşedeki simge yapı: cami, köşk ya da plaza kendi çizimiyle. */
  landmark?: Landmark;
}

export interface Lot {
  kind: 'park' | 'parking';
  x: number;
  y: number;
  w: number;
  d: number;
}

/** Ara sokağın kapladığı yer: yol ve iki yanındaki kaldırım, ana yolun kenarından sokağın sonuna. */
export interface Street {
  x: SideStreet;
  /** Dünyadaki dikdörtgen (kaldırımlar dahil). */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Ana yolun kenarı (kolun enine, m) ve sokağın boyu. */
  edge: number;
  depth: number;
  /** Sokağın ana yoldan uzaklaşan birim yönü. */
  out: [number, number];
}

export function streetOf(j: Junction, x: SideStreet, sea?: City['sea']): Street {
  const g = j.legs[x.leg]!;
  const out = x.side === 1 ? g.rin : g.rout;
  const edge = x.side === 1 ? g.inW : g.outW;
  // denize doğru giden sokak sahil yoluna kadar
  const shore = sea && Math.sign(out[1]) === (sea.dir === 'S' ? 1 : -1) ? sea.at - 12 - edge : WORLD;
  const depth = Math.min(x.short ? 46 : WORLD, shore);
  const h = SIDE_W / 2 + SIDE_WALK;
  const pts = [
    [x.at - h, edge],
    [x.at + h, edge + depth],
  ].map(([a, l]) => [g.u[0] * a + out[0] * l, g.u[1] * a + out[1] * l]);
  return { x, x0: Math.min(pts[0][0], pts[1][0]), x1: Math.max(pts[0][0], pts[1][0]), y0: Math.min(pts[0][1], pts[1][1]), y1: Math.max(pts[0][1], pts[1][1]), edge, depth, out };
}

/**
 * Arka sokak: ana yola değmeyen, mahallenin içinden geçen yol (yalnızca görüntü; içinde ışıksız
 * akan araçlar çizilir). Ara sokaklarla kesişip mahalleyi ızgaraya böler.
 */
export interface Road {
  /** Ekseni: dikey yolda x, yatayda y. */
  at: number;
  vertical: boolean;
  /** Boyunca uzanış (dikeyde y, yatayda x). */
  from: number;
  to: number;
}

/** Yolun kaldırımlarıyla kapladığı dikdörtgen. */
export const roadRect = (r: Road) => {
  const h = SIDE_W / 2 + SIDE_WALK;
  const [a0, a1] = [Math.min(r.from, r.to), Math.max(r.from, r.to)];
  return r.vertical ? { x0: r.at - h, x1: r.at + h, y0: a0, y1: a1 } : { x0: a0, x1: a1, y0: r.at - h, y1: r.at + h };
};

export interface Scenery {
  blocks: Block[];
  roads: Road[];
  /** Kıyı: kavşaktan kuzeye ya da güneye bu kadar metrede deniz başlar. */
  sea?: City['sea'];
  /** Işıksız ara sokaklar: binalar, ağaçlar ve parklar bunların üstüne düşmez. */
  streets: Street[];
  buildings: Building[];
  lots: Lot[];
  trees: { x: number; y: number; r: number; tone: number; street?: boolean }[];
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

/**
 * `reach`: komşu kavşağa doğru mahallenin bittiği uzaklık (m). İki kavşak arasındaki adalar ortada
 * buluşur; binalar oraya kadar dizilir, öbür yarıyı komşunun mahallesi doldurur.
 */
export function makeScenery(j: Junction, seed: number, marks: LevelSpec['landmarks'] = [], reach: { W?: number; E?: number } = {}, sides: SideStreet[] = [], city: City = {}): Scenery {
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
      const xr = sx > 0 ? (reach.E ?? WORLD) : (reach.W ?? WORLD);
      blocks.push({ x0: Math.min(cx, sx * xr), x1: Math.max(cx, sx * xr), y0: Math.min(cy, sy * WORLD), y1: Math.max(cy, sy * WORLD), cx, cy, sx, sy, round: vRoad && hRoad, vRoad, hRoad });
    }

  for (const b of blocks) {
    const { sx, sy } = b;
    const fx = b.cx + sx * (b.vRoad ? SIDEWALK : 0);
    // adanın yola paralel (x) boyu: binalar bu kadar uzağa dizilir
    const span = (sx > 0 ? b.x1 : -b.x0) - Math.abs(fx);
    const fy = b.cy + sy * (b.hRoad ? SIDEWALK : 0);
    // bina: yerel koordinatta (yola uzaklık) verilir, dünyaya çevrilir
    const put = (u0: number, v0: number, w: number, d: number, extra: Partial<Building> = {}) => {
      let floors = extra.floors ?? 4 + Math.floor(rand() * 5);
      // eğik bakışta çatı kuzeye kayar: yolun güneyindeki bina yolu örtmesin. Önce kat
      // azaltılır (en az beş), yetmezse bina yoldan geri çekilir.
      if (sy > 0 && b.hRoad) {
        const room = (n: number) => fy + v0 - (n * 3 + 0.8) * OBL_Y - (b.cy + 1.2);
        while (floors > 5 && room(floors) < 0) floors--;
        if (room(floors) < 0) v0 += -room(floors);
      }
      const xa = fx + sx * u0;
      const xb = fx + sx * (u0 + w);
      const ya = fy + sy * v0;
      const yb = fy + sy * (v0 + d);
      const roof: Roof = rand() < 0.38 ? 'tile' : 'flat';
      const n = Math.max(1, Math.floor((w * d) / 120));
      const spots = (k: number) => Array.from({ length: k }, () => [0.15 + rand() * 0.7, 0.15 + rand() * 0.7] as [number, number]);
      buildings.push({
        x: Math.min(xa, xb),
        y: Math.min(ya, yb),
        w,
        d,
        color: pick(FACADES),
        roof,
        tanks: roof === 'flat' ? spots(1 + Math.floor(rand() * n)) : [],
        solar: roof === 'flat' && rand() < 0.7 ? spots(1 + Math.floor(rand() * 2)) : [],
        dishes: spots(Math.floor(rand() * 3)),
        slab: pick(['#b9b4aa', '#a8a59e', '#c4bdae', '#9c9a95', '#b3a894', '#8f9396']),
        balcony: 1 + Math.floor(rand() * 3),
        seed: Math.floor(rand() * 1e6),
        ...extra,
        floors,
      });
      return v0;
    };
    const shop = () => (rand() < 0.75 ? { name: pick(SHOPS), awning: pick(AWNINGS) } : undefined);
    const depth = () => 12 + Math.floor(rand() * 4);
    // köşe binası: iki yola da bakar, zemini dükkân; bölüm isterse simge yapı
    const corner = `${sy < 0 ? 'N' : 'S'}${sx > 0 ? 'E' : 'W'}`;
    const mark = marks.find((m) => m.corner === corner)?.kind;
    const cornerW = mark === 'cami' || mark === 'kosk' ? 26 : 16 + rand() * 5;
    const cornerD = mark === 'cami' || mark === 'kosk' ? 22 : 15 + rand() * 4;
    const markExtra: Partial<Building> =
      mark === 'cami'
        ? { landmark: 'cami', floors: 3, color: '#ebe4d4', roof: 'flat', tanks: [], solar: [], dishes: [] }
        : mark === 'kosk'
          ? { landmark: 'kosk', floors: 3, color: '#f4efe3', roof: 'tile', tanks: [], solar: [], dishes: [], balcony: 9 }
          : mark === 'dugun'
            ? { floors: 3, color: '#efe1c8', shop: { name: 'DÜĞÜN SALONU', awning: '#b8902a' }, tanks: [], dishes: [] }
            : mark === 'plaza'
              ? { landmark: 'plaza', floors: sy < 0 ? 16 : 5, color: '#8fa8b6', roof: 'flat', solar: [], dishes: [], balcony: 99 }
              : { floors: 6 + Math.floor(rand() * 3), shop: { name: pick(SHOPS), awning: pick(AWNINGS) } };
    // park köşesi: bina yerine ağaçlı bir park (çocuk trafik eğitim parkındaki gibi)
    const shift =
      mark === 'park'
        ? (lots.push({ kind: 'park', x: Math.min(fx + sx, fx + sx * (1 + cornerW)), y: Math.min(fy + sy, fy + sy * (1 + cornerD)), w: cornerW, d: cornerD }), 0)
        : put(1, 1, cornerW, cornerD, markExtra) - 1;
    // dikey yol boyunca (adanın yola bakan dik kenarı): v ekseninde dizilir
    if (b.vRoad) {
      let v0 = 1 + cornerD + 1 + shift;
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
      while (u0 < span - 20) {
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
      for (let u0 = 36; u0 < span - 20; u0 += 20 + rand() * 6)
        if (rand() < 0.7) {
          // iş merkezinde arka sıraların bir kısmı cam cepheli plaza
          const tower = city.towers && v0 > 60 && rand() < 0.4;
          put(
            u0,
            v0,
            13 + rand() * 5,
            13 + rand() * 4,
            tower ? { floors: 10 + Math.floor(rand() * 14), color: pick(['#8fa8b6', '#9fb3c0', '#6f8796', '#a7b6bd', '#7d93a3']), roof: 'flat', tanks: [], solar: [], dishes: [], balcony: 99 } : {},
          );
        }

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
      for (let u0 = near; u0 < span; u0 += 8 + rand() * 4) {
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
  // ara sokakların üstüne düşen bina, park, ağaç ve direk kalkar (sokak boyunca kendi ağaçları dikilir)
  const sea = city.sea;
  const sy0 = sea ? (sea.dir === 'S' ? 1 : -1) : 0;
  /** Kıyının ötesi (biraz payla): orada bina, ağaç, yol yok. */
  const wet = (y: number, pad = 14) => !!sea && y * sy0 > sea.at - pad;
  const streets = sides.map((x) => streetOf(j, x, sea));
  // arka sokaklar: ana yoldan 70 m içeride başlar. Yatay olanlar her kavşakta aynı yerde (komşu
  // kavşağın mahallesinde sürsün), dikeyler tohumdan; ara sokağa çok yakın olan atlanır.
  const roads: Road[] = [];
  const near = (v: number, list: number[]) => list.some((x) => Math.abs(x - v) < 40);
  const sideX = sides.filter((x) => x.leg === 'E' || x.leg === 'W').map((x) => j.legs[x.leg]!.u[0] * x.at);
  const sideY = sides.filter((x) => x.leg === 'N' || x.leg === 'S').map((x) => j.legs[x.leg]!.u[1] * x.at);
  for (const b of blocks) {
    const { sx, sy } = b;
    const xr = sx > 0 ? b.x1 : -b.x0;
    // denize bakan yanda arka sokaklar sahil yolunda biter; sahil yolu kıyı boyunca uzanır
    const end = sea && sy === sy0 ? sea.at - 14 : WORLD;
    for (let y = 150; y < end - 40; y += 140) if (!near(sy * y, sideY)) roads.push({ at: sy * y, vertical: false, from: b.cx + sx * 70, to: sx * xr });
    for (let x = 120 + rand() * 50; x < xr - 50; x += 120 + rand() * 60) if (!near(sx * x, sideX)) roads.push({ at: sx * x, vertical: true, from: b.cy + sy * 70, to: sy * end });
    if (sea && sy === sy0) roads.push({ at: sy * (sea.at - 8), vertical: false, from: b.cx, to: sx * xr });
  }
  const rects = [...streets, ...roads.map(roadRect)];
  const hits = (x0: number, y0: number, x1: number, y1: number, pad = 1) => rects.some((t) => x0 < t.x1 + pad && x1 > t.x0 - pad && y0 < t.y1 + pad && y1 > t.y0 - pad);
  const free = <T extends { x: number; y: number }>(p: T) => !hits(p.x, p.y, p.x, p.y, 0.5);
  for (const t of streets) {
    const side = SIDE_W / 2 + SIDE_WALK - 0.8;
    for (let d = 14; d < t.depth - 4; d += 9 + rand() * 5)
      for (const sgn of [-1, 1]) {
        if (rand() < 0.35) continue;
        const g = j.legs[t.x.leg]!;
        trees.push({ x: g.u[0] * (t.x.at + sgn * side) + t.out[0] * (t.edge + d), y: g.u[1] * (t.x.at + sgn * side) + t.out[1] * (t.edge + d), r: 1.8 + rand() * 1.2, tone: rand(), street: true });
      }
  }
  return {
    blocks,
    streets,
    roads,
    // eğik bakışta çatı kuzeydoğuya kayar: çatısı sokağa taşan bina da kalkar
    buildings: buildings.filter((b) => !hits(b.x, b.y - b.floors * 3 * OBL_Y, b.x + b.w + b.floors * 3 * OBL_X, b.y + b.d) && !wet(b.y) && !wet(b.y + b.d)),
    lots: lots.filter((l) => !hits(l.x, l.y, l.x + l.w, l.y + l.d) && !wet(l.y) && !wet(l.y + l.d)),
    trees: trees.filter((t) => (t.street || free(t)) && !wet(t.y, 10)),
    lamps: lamps.filter((l) => free(l) && !wet(l.y, 10)),
    sea,
    bollards,
  };
}
