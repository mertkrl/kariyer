import { isBasic } from './catalog';
import { DAILY, MADE, RIVAL_DAY, VILLAGERS, rng, type CustomerType, type Memories, type Product } from './data';
import type { Outcome, Stock } from './week';

/*
 * Dükkânı zorlayan dış baskılar ve itibarın yeni kuralları:
 * - İtibar 80'in üstünde zor yükselir; çok kazıklanan köylü bunu kahvede anlatır, aynı tipten iki
 *   köylü de duyar (kin bırakır).
 * - Temel gıdada köylü fiyatı bilir, pahalılığa az katlanır; zincir market açılınca (RIVAL_DAY) daha da az.
 * - Bazı günler köye seyyar satıcı gelir: müşteri azalır.
 * - Toptancı Kemal bazen gelmez ya da malın yarısını getirir.
 * - Rafta sınırlı göz var: tükenen bir malı geri getirmek için yer açmak gerekir.
 * - Vergi memuru bir gün gelir: kasaya atılan, Z raporuna girmeyen paranın cezasını keser.
 * - Veresiyesi yazılmayan dört gün küser; borcunu ödeyen sadık müşteri olur.
 * Saf mantıktır, test edilebilir.
 */

/** İtibar bunun üstündeyken kazanç yarıya iner: tavana yaklaşmak emek ister. */
export const REP_HIGH = 80;

/** İtibara bir değişiklik ekler: 0–100 arası; 80'in üstünde artış yarıya iner. */
export function addRep(rep: number, delta: number): number {
  const d = delta > 0 && rep >= REP_HIGH ? Math.floor(delta / 2) : delta;
  return Math.max(0, Math.min(100, rep + d));
}

/**
 * Kazıklanan köylü kahvede anlatır: aynı tipten (ya da yoksa rastgele) iki köylü duyar, birer kin
 * biriktirir. Turistler ve misafirler konuşulmaz.
 */
export function spreadGossip(m: Memories, who: string, seed: number, day: number): { memories: Memories; told: string[] } {
  const from = VILLAGERS.find((v) => v.id === who);
  if (!from || from.type === 'turist' || from.guest) return { memories: m, told: [] };
  const r = rng(seed * 131 + day * 7 + who.length);
  const pool = VILLAGERS.filter((v) => v.id !== who && !v.guest && !v.passerby && v.type !== 'turist');
  const same = pool.filter((v) => v.type === from.type);
  const list = [...(same.length >= 2 ? same : pool)];
  const told: string[] = [];
  const out = { ...m };
  for (let k = 0; k < 2 && list.length; k++) {
    const v = list.splice(Math.floor(r() * list.length), 1)[0];
    const cur = out[v.id] ?? { visits: 0, grudge: 0, happy: 0 };
    out[v.id] = { ...cur, grudge: cur.grudge + 1, heard: true };
    told.push(v.name);
  }
  return { memories: out, told };
}

/** Temel gıdada köylünün katlanacağı en yüksek fiyat (market fiyatına oran): ekmeğin, yağın fiyatını bilir. */
export const STAPLE_CAP = 1.06;
/** Kasabaya zincir market açılınca temel gıdada katlanılan tavan. */
export const STAPLE_CAP_RIVAL = 1.03;

/**
 * Sepetteki temel gıdanın payı kadar tavan daralır: temel gıdada köylü fiyatı bilir, ancak biraz
 * fazlasına razı olur (zincir marketten sonra daha da az); öteki malda kendi tavanı geçerlidir.
 */
export function rivalOf(c: CustomerType, day: number, items: readonly Product[], at = (p: Product) => p.market): CustomerType {
  const total = items.reduce((s, p) => s + at(p), 0);
  if (!total) return c;
  const share = items.filter((p) => isBasic(p.id)).reduce((s, p) => s + at(p), 0) / total;
  if (!share) return c;
  const cap = Math.min(c.ceiling, day >= RIVAL_DAY ? STAPLE_CAP_RIVAL : STAPLE_CAP);
  return { ...c, ceiling: Math.max(1.02, Math.round((cap * share + c.ceiling * (1 - share)) * 100) / 100) };
}

/** Sepetin çoğu temel gıdaysa köylü pazarlık etmez: fiyat tavanı aşarsa gider. */
export const firmOf = (items: readonly Product[]) => items.length > 0 && items.filter((p) => isBasic(p.id)).length * 2 >= items.length;

/** Kasabadaki market açıldıktan sonra kapıdan girerken söylenenler. */
const RIVAL_LINES = [
  'Kasabaya zincir market açılmış, ekmek orada daha ucuzmuş diyorlar.',
  'Damadım marketten aldı, yağ orada epey ucuz. Sen ne diyorsun?',
  'Marketin broşürü kapıya atılmış, bak bakalım fiyatlarına.',
];
export const rivalLine = (day: number, who: string) => (day >= RIVAL_DAY && (day + who.length) % 4 === 0 ? RIVAL_LINES[(day + who.length) % RIVAL_LINES.length] : null);


// --- toptancı ---

export type Supply = 'ok' | 'absent' | 'partial';

/** Kemal'in sabahı: 3. günden sonra ara sıra gelmez ya da malın yarısını getirir. Ekmek fırından gelir, hep gelir. */
export function supplyOn(seed: number, day: number): Supply {
  if (day < 3) return 'ok';
  const x = rng(seed * 83 + day * 41 + 9)();
  return x < 0.07 ? 'absent' : x < 0.17 ? 'partial' : 'ok';
}

/** Gelen sipariş: gelmediyse yalnızca ekmek, yarımsa her malın yarısı (aşağı yuvarlı). */
export function applySupply(order: Stock, s: Supply): Stock {
  if (s === 'ok') return order;
  return Object.fromEntries(Object.entries(order).map(([id, n]) => [id, id === 'ekmek' ? n : s === 'absent' ? 0 : Math.floor(n / 2)]));
}

export const SUPPLY_NOTE: Record<Exclude<Supply, 'ok'>, string> = {
  absent: '🚚 Kemal bu sabah gelmedi: yol kapalıymış. Yalnızca fırının ekmeği geldi.',
  partial: '🚚 Kemal malın yarısını getirebildi: "Depoda kalmamış, yarın tamamlarım."',
};

// --- raf ---

/** Raftaki göz sayısı: bu kadar çeşit mal aynı anda durur (ekmek, sakız, tost ve sandviç hariç). */
export const SHELF_SLOTS = 40;

const counted = (id: string) => id !== 'ekmek' && id !== 'sakiz' && !MADE.includes(id) && !DAILY.includes(id);

/** Rafta (ya da yolda) duran çeşitler: rafta olan ve siparişle gelecek olan. */
export function kindsOf(stock: Stock, order: Stock = {}): number {
  const ids = new Set([...Object.entries(stock), ...Object.entries(order)].filter(([id, n]) => n > 0 && counted(id)).map(([id]) => id));
  return ids.size;
}

/** Bu mal sipariş edilebilir mi: rafta zaten varsa evet; yoksa boş göz olmalı. */
// temel gıdanın rafta yeri hep ayrılmıştır: tükense de geri söylenir
export const canStock = (id: string, stock: Stock, order: Stock) => !counted(id) || isBasic(id) || (stock[id] ?? 0) > 0 || (order[id] ?? 0) > 0 || kindsOf(stock, order) < SHELF_SLOTS;

// --- vergi denetimi ---

export const AUDITOR = 'vergi';

/** Vergi memurunun geleceği gün: her oyunda bir kez, 12 ile 25 arası. */
export const auditDay = (seed: number) => 12 + Math.floor(rng(seed * 113 + 3)() * 14);

/** Denetim: Z raporuna girmeyen para (kasaya atılan hediyeler) bulunursa iki katı artı ceza. */
export function settleAudit(hidden: number, priceIndex = 1): Outcome {
  if (hidden <= 0) return { cash: 0, rep: 1, ethics: 1, mood: 'happy', line: 'Z raporlarıyla kasa birbirini tutuyor. Kolay gelsin, temiz iş.', verdict: 'Vergi denetiminden temiz çıktın.' };
  const fine = Math.round(hidden * 2 + 450 * priceIndex);
  return {
    cash: -fine,
    rep: -2,
    ethics: -1,
    mood: 'grumble',
    line: `Kasada Z raporunda olmayan ${hidden} ₺ var. Kayıt dışı para: ${fine} ₺ ceza yazıyorum.`,
    verdict: `Vergi memuru kayıt dışı ${hidden} ₺ buldu, ${fine} ₺ ceza ödedin.`,
  };
}

// --- veresiye ---

/** Veresiyesi yazılmayan köylü bu kadar gün dükkâna gelmez. */
export const SULK_DAYS = 4;

/** Veresiye reddedildi: köylü birkaç gün küser. */
export function sulk(m: Memories, who: string, day: number): Memories {
  const cur = m[who] ?? { visits: 0, grudge: 0, happy: 0 };
  return { ...m, [who]: { ...cur, sulk: day + SULK_DAYS } };
}

/** Borcunu ödeyen köylü sadık müşteri olur: her gün uğrar, pazarlık etmez, biraz fazlasına katlanır. */
export function befriend(m: Memories, who: string): Memories {
  const cur = m[who] ?? { visits: 0, grudge: 0, happy: 0 };
  return { ...m, [who]: { ...cur, loyal: (cur.loyal ?? 0) + 1, grudge: Math.max(0, cur.grudge - 1) } };
}
