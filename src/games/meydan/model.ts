/*
 * Meydan Islahı'nın veri modeli. Bir meydan, karşıdan bakılan bir sokak cephesidir: binaların
 * biçimi (kat, pencere, çatı) meydana aittir ve değişmez; oyuncu yalnızca binaların renklerini ve
 * cepheye asılan her şeyi (tabelalar, klimalar, antenler, kablolar) değiştirir. Tasarım bu yüzden
 * yalnızca boyaları ve öğeleri taşır; tarayıcıdaki taslak `sanitize` ile bilinen alanlara indirgenir.
 */

export const W = 1200;
export const H = 700;
/** Kaldırımın üst çizgisi: binalar buraya oturur. */
export const GROUND = 560;
export const GRID = 4;
export const MAX_ITEMS = 120;
const MAX_TEXT = 40;

export type PlaceId = 'bakirkoy' | 'besiktas' | 'eminonu' | 'mecidiyekoy';
export type SignKind = 'pano' | 'bayrak' | 'kutu' | 'tente' | 'folyo' | 'afis';
export type JunkKind = 'klima' | 'anten' | 'kablo';
export type ItemKind = SignKind | JunkKind;
/** Çatı: düz teras, kornişli, kiremit kırma çatı ya da tek katlı dükkânların sac sundurması. */
export type Roof = 'duz' | 'kornis' | 'kirma' | 'sundurma';
/** Cephenin mimarisi: 70'lerin apartmanı, cumbalı apartman, tuğla, eski kâgir bina ya da cam giydirme. */
export type Facade = 'apartman' | 'cumba' | 'tugla' | 'tas' | 'cam';

/** Binanın meydana ait, değişmeyen biçimi. */
export interface BuildingShape {
  id: string;
  name: string;
  x: number;
  w: number;
  /** Zemin kat hariç kat sayısı; tek katlı dükkânda 0. */
  floors: number;
  floorH: number;
  groundH: number;
  /** Her kattaki pencere sayısı. */
  cols: number;
  balcony: boolean;
  roof: Roof;
  facade: Facade;
  /** Çatıda geri çekilmiş çatı katı. */
  penthouse?: boolean;
}

/** Oyuncunun değiştirdiği boyalar. */
export interface Paint {
  id: string;
  wall: string;
  /** Doğrama, korniş ve kat silmeleri. */
  trim: string;
  /** Zemin kattaki dükkân kaplaması. */
  shop: string;
}

export interface Item {
  id: string;
  kind: ItemKind;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  /** Yazı rengi; tentede çizgilerin rengi. */
  color: string;
  text: string;
}

export interface Design {
  v: 1;
  place: PlaceId;
  paints: Paint[];
  items: Item[];
}

export interface Place {
  id: PlaceId;
  title: string;
  district: string;
  blurb: string;
  buildings: BuildingShape[];
  /** Meydanın bugünkü hâli: oyun buradan başlar, karşılaştırma buna göre yapılır. */
  original: Design;
}

export const ITEM_KINDS: Record<ItemKind, { label: string; hint: string; junk: boolean; base: Omit<Item, 'id' | 'kind' | 'x' | 'y'> }> = {
  pano: { label: 'Pano tabela', hint: 'Vitrinin üstünde yatay', junk: false, base: { w: 200, h: 36, fill: '#2f3b45', color: '#f1ebe0', text: 'DÜKKÂN' } },
  bayrak: { label: 'Bayrak tabela', hint: 'Cepheden dik çıkan', junk: false, base: { w: 32, h: 110, fill: '#2f3b45', color: '#f1ebe0', text: 'OTEL' } },
  kutu: { label: 'Işıklı kutu', hint: 'Arkadan aydınlatmalı', junk: false, base: { w: 110, h: 40, fill: '#1f1f1f', color: '#f2c94c', text: 'KUTU' } },
  tente: { label: 'Tente', hint: 'Vitrini gölgeleyen bez', junk: false, base: { w: 150, h: 34, fill: '#7a2e2e', color: '#f1ebe0', text: '' } },
  folyo: { label: 'Cam folyo', hint: 'Vitrin camına yapışık', junk: false, base: { w: 120, h: 50, fill: '#00a2e8', color: '#ffffff', text: 'İNDİRİM' } },
  afis: { label: 'Vinil afiş', hint: 'Cepheye iple asılı', junk: false, base: { w: 140, h: 80, fill: '#ffffff', color: '#d50000', text: 'KİRALIK' } },
  klima: { label: 'Klima', hint: 'Dış ünite', junk: true, base: { w: 48, h: 34, fill: '#e9e8e2', color: '#8a8a84', text: '' } },
  anten: { label: 'Çanak anten', hint: 'Çatıda ya da balkonda', junk: true, base: { w: 36, h: 40, fill: '#e3e3de', color: '#6d6d68', text: '' } },
  kablo: { label: 'Kablo', hint: 'Binadan binaya sarkan', junk: true, base: { w: 200, h: 26, fill: '#1e1e1e', color: '#1e1e1e', text: '' } },
};

export const SIGN_KINDS: SignKind[] = ['pano', 'bayrak', 'kutu', 'tente', 'folyo', 'afis'];
export const isJunk = (kind: ItemKind) => ITEM_KINDS[kind].junk;

/** Cephe ve tabela için hazır renkler: İstanbul cephelerinin sakin tonları ve birkaç koyu tabela rengi. */
export const SWATCHES = ['#f1ebe0', '#e8d9b5', '#d9b77e', '#c98f6b', '#b5654a', '#a9b9a4', '#9fb3c2', '#8c8c88', '#5f6b73', '#2f3b45', '#2f4a3a', '#7a2e2e', '#6b4f3a', '#1f1f1f', '#ffffff'];

export const snap = (v: number) => Math.round(v / GRID) * GRID;

let seq = 0;
const newId = () => `m${Date.now().toString(36)}${(seq++).toString(36)}`;

export function makeItem(kind: ItemKind, at: Partial<Item> = {}): Item {
  const base = ITEM_KINDS[kind].base;
  return { ...base, x: 0, y: 0, ...at, kind, id: at.id ?? newId() };
}

// meydanın çizimi değişince eski taslaklar yeni binalara oturmaz: anahtar sürümle değişir
export const draftKey = (place: PlaceId) => `meydan:taslak:v2:${place}`;

/** Bir binanın üst kenarı (çatısız). */
export const topOf = (b: BuildingShape) => GROUND - b.groundH - b.floors * b.floorH;

/** Ortası binanın genişliği içinde kalan öğeler: "bu cepheyi temizle" bunları söker. */
export function itemsOn(items: Item[], b: BuildingShape): Item[] {
  return items.filter((it) => {
    const cx = it.x + it.w / 2;
    return cx >= b.x && cx < b.x + b.w;
  });
}

export function withoutJunk(d: Design): Design {
  return { ...d, items: d.items.filter((it) => !isJunk(it.kind)) };
}

/** Meydanda kullanılan farklı renklerin sayısı: cephe, doğrama, dükkân ve tabelalar. */
export function colorCount(d: Design): number {
  const set = new Set<string>();
  for (const p of d.paints) [p.wall, p.trim, p.shop].forEach((c) => set.add(c));
  for (const it of d.items) if (!isJunk(it.kind)) set.add(it.fill);
  return set.size;
}

const HEX = /^#[0-9a-f]{6}$/i;
const color = (v: unknown, fallback: string) => (typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : fallback);
const num = (v: unknown, min: number, max: number, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback);
// eslint-disable-next-line no-control-regex
const text = (v: unknown, fallback: string) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, MAX_TEXT) : fallback);

/**
 * Tarayıcıdan okunan taslağı meydanın biçimine oturtur: bilinmeyen bina ve öğe türleri atılır,
 * eksik boyalar meydanın bugünkü hâlinden gelir, sayılar ve renkler sınırlanır.
 */
export function sanitize(raw: unknown, place: Place): Design | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r.v !== 1 || r.place !== place.id) return null;
  const given = Array.isArray(r.paints) ? (r.paints as Record<string, unknown>[]) : [];
  const paints = place.original.paints.map((def) => {
    const p = given.find((g) => g && typeof g === 'object' && g.id === def.id);
    return p ? { id: def.id, wall: color(p.wall, def.wall), trim: color(p.trim, def.trim), shop: color(p.shop, def.shop) } : def;
  });
  const seen = new Set<string>();
  const items: Item[] = [];
  for (const raw of Array.isArray(r.items) ? r.items.slice(0, MAX_ITEMS) : []) {
    if (!raw || typeof raw !== 'object') continue;
    const it = raw as Record<string, unknown>;
    const kind = it.kind as ItemKind;
    if (typeof kind !== 'string' || !Object.hasOwn(ITEM_KINDS, kind)) continue;
    const base = ITEM_KINDS[kind].base;
    let id = typeof it.id === 'string' && /^[\w-]{1,32}$/.test(it.id) ? it.id : newId();
    if (seen.has(id)) id = newId();
    seen.add(id);
    items.push({
      id,
      kind,
      x: num(it.x, -W, W, 0),
      y: num(it.y, -H, H, 0),
      w: num(it.w, GRID * 2, W, base.w),
      h: num(it.h, GRID * 2, H, base.h),
      fill: color(it.fill, base.fill),
      color: color(it.color, base.color),
      text: text(it.text, base.text),
    });
  }
  return { v: 1, place: place.id, paints, items };
}

/** Paylaşılan kartın özeti: meydanın bugünkü hâliyle oyuncunun hâli arasındaki fark ve bir unvan. */
export function makeover(original: Design, d: Design) {
  const signs = (x: Design) => x.items.filter((it) => !isJunk(it.kind)).length;
  const junk = (x: Design) => x.items.filter((it) => isJunk(it.kind)).length;
  const r = { signsBefore: signs(original), signsAfter: signs(d), junkRemoved: Math.max(0, junk(original) - junk(d)), colorsBefore: colorCount(original), colorsAfter: colorCount(d) };
  const same = JSON.stringify(original.paints) === JSON.stringify(d.paints) && JSON.stringify(original.items) === JSON.stringify(d.items);
  const allJunk = junk(d) === 0 && junk(original) > 0;
  let title: string;
  let note: string;
  if (same) [title, note] = ['Dokunulmamış Meydan', 'Hiçbir şeye dokunmadın. Belediye bunu da bir proje olarak açılışa çıkarır.'];
  else if (r.signsAfter > r.signsBefore) [title, note] = ['Tabela Cenneti', 'Meydanın asıl sorunu tabela azlığıymış. Sen çözdün.'];
  else if (allJunk && r.signsAfter <= r.signsBefore * 0.6 && r.colorsAfter < r.colorsBefore) [title, note] = ['Şehir Plancısı', 'Klimalar gitti, tabelalar hizaya girdi, renkler barıştı. Meydan nefes alıyor.'];
  else if (allJunk) [title, note] = ['Klima Avcısı', 'Cephelerde tek bir dış ünite kalmadı. Yazın kimin serinleyeceği ayrı bir konu.'];
  else [title, note] = ['Rötuşçu', 'Birkaç dokunuş yaptın. Esnaf yine de tabelasının küçüldüğünü söylüyor.'];
  return { ...r, title, note };
}
