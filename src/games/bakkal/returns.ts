import { MADE, PRODUCTS, REGULARS, VILLAGERS, rng, type Product, type Villager } from './data';
import type { Outcome } from './week';

/*
 * Satış kayıtları, iade ve paketten çıkan hediye. Her satış kasaya bir satır olarak yazılır; çekmecede
 * her günün tek bir gün sonu Z raporu durur, o günün bütün satırlarıyla. Ara sıra biri bir malı geri
 * getirir: oyuncu Z raporlarına bakıp gerçek mi oyun mu anlamaya çalışır (ReturnKind). Karar
 * oyuncunundur: gerçek iadeyi geri çevirmek köyü küstürür, sahte iadeyi almak kasayı boşaltır.
 *
 * Bir de bazı paketli malların içinden kampanya parası çıkar: kasaya mı atılır, müşteriye mi verilir?
 * Saf mantıktır, test edilebilir.
 */

export interface Receipt {
  no: number;
  day: number;
  who: string;
  name: string;
  items: { id: string; name: string }[];
  total: number;
  /** Veresiye satış: fiş kesildi ama para deftere yazıldı. */
  credit?: boolean;
  /** İade alındıysa hangi gün. */
  returnedOn?: number;
}

/** Çekmecede tutulan en çok fiş: eskiler atılır. */
export const DRAWER_MAX = 80;

export function addReceipt(list: Receipt[], r: Omit<Receipt, 'no'>): Receipt[] {
  const no = (list[list.length - 1]?.no ?? 0) + 1;
  return [...list, { ...r, no }].slice(-DRAWER_MAX);
}

/**
 * İadenin türü: gerçek iade ya da oyuncunun Z raporlarından yakalayabileceği dört oyun.
 * - real: fişi var, söylediği para fişteki kadar.
 * - inflated: malı gerçekten buradan almış ama ödediğinden fazlasını istiyor.
 * - elsewhere: dükkândan alışveriş etmiş ama bu malı almamış; mal kasabadaki marketten.
 * - never: Z raporlarında adına hiç alışveriş yok.
 * - double: bu fişin iadesi daha önce alınmış, aynı malı yine getiriyor.
 */
export type ReturnKind = 'real' | 'inflated' | 'elsewhere' | 'never' | 'double';

export interface ReturnAsk {
  kind: ReturnKind;
  product: Product;
  /** Müşterinin geri istediği para. */
  price: number;
  /** Fişte gerçekte ödenen (gerçek ve şişirilmiş iadede). */
  paid?: number;
  reason: string;
  /** Mal rafa geri konabilir mi (bozuksa çöpe gider). */
  restock: boolean;
  /** İlgili fiş: gerçek, şişirilmiş ve ikinci kez iadede var. */
  receipt?: number;
}

const REASONS: { text: string; restock: boolean }[] = [
  { text: 'Açtım, bozuk çıktı. Kokmuş evladım.', restock: false },
  { text: 'Yanlış almışım, gelin başka marka istemiş.', restock: true },
  { text: 'Fazla almışım, ağzını bile açmadım.', restock: true },
  { text: 'Tarihi geçmiş, bakmadan almışım.', restock: false },
];

/** İade günü: ilk günden sonra, aşağı yukarı üç günde bir. */
const RETURN_CHANCE = 0.35;
/** İadenin türlerinin payı: yarısı gerçek, gerisi oyuncunun yakalayacağı oyunlar. */
const KIND_SHARE: [ReturnKind, number][] = [
  ['real', 0.5],
  ['inflated', 0.15],
  ['elsewhere', 0.15],
  ['never', 0.1],
  ['double', 0.1],
];
/** İade yalnızca son birkaç günün fişiyle olur. */
const RETURN_WINDOW = 5;

const productOf = (id: string) => PRODUCTS.find((p) => p.id === id);
/** Fişteki malın payı: birden çok mallı fişte para, malların market fiyatına göre bölünür. */
function shareOf(rc: Receipt, product: Product) {
  const all = rc.items.map((i) => productOf(i.id)?.market ?? 0);
  return Math.max(1, Math.round((rc.total * product.market) / Math.max(1, all.reduce((s, m) => s + m, 0))));
}

/**
 * Bugün iade getiren biri var mı, varsa kim, ne getiriyor. Yalnızca dünden önceki fişlere bakar:
 * gün içinde kesilen fişler bugünkü sırayı değiştirmez. Seçilen tür kurulamıyorsa (ör. henüz iadesi
 * alınmış fiş yoksa) gerçek iadeye döner.
 */
export function planReturn(receipts: readonly Receipt[], seed: number, day: number): { villager: Villager; ask: ReturnAsk } | null {
  if (day < 2) return null;
  const r = rng(seed * 71 + day * 17 + 5);
  if (r() > RETURN_CHANCE) return null;
  const past = receipts.filter((x) => x.day < day);
  const recent = past.filter((x) => x.day >= day - RETURN_WINDOW && x.items.some((i) => !MADE.includes(i.id)));
  const open = recent.filter((x) => x.returnedOn === undefined);
  const villagerOf = (id: string) => VILLAGERS.find((v) => v.id === id);
  const goodsOf = (rc: Receipt) => rc.items.filter((i) => !MADE.includes(i.id)).map((i) => productOf(i.id)).filter((p): p is Product => !!p);
  const pick = <T,>(list: readonly T[]) => list[Math.floor(r() * list.length)];
  const reason = pick(REASONS);

  let x = r();
  const kind = KIND_SHARE.find(([, w]) => (x -= w) < 0)?.[0] ?? 'real';

  const fromReceipt = (rc: Receipt, k: ReturnKind) => {
    const villager = villagerOf(rc.who);
    const goods = goodsOf(rc);
    if (!villager || !goods.length) return null;
    const product = pick(goods);
    const paid = shareOf(rc, product);
    // şişirilen iade ödenenin üçte biri kadar fazla, beşe yuvarlı
    const price = k === 'inflated' ? Math.max(paid + 5, Math.ceil((paid * 1.35) / 5) * 5) : paid;
    return { villager, ask: { kind: k, product, price, paid, reason: reason.text, restock: reason.restock, receipt: rc.no } };
  };

  if (kind === 'double') {
    const done = recent.filter((rc) => rc.returnedOn !== undefined && rc.returnedOn < day);
    if (done.length) return fromReceipt(pick(done), 'double');
  }
  if (kind === 'elsewhere') {
    // dükkândan alışveriş etmiş biri, almadığı bir malı getirir
    const buyers = [...new Set(recent.map((rc) => rc.who))].map(villagerOf).filter((v): v is Villager => !!v && !v.guest);
    const villager = buyers.length ? pick(buyers) : null;
    if (villager) {
      const had = new Set(past.filter((rc) => rc.who === villager.id).flatMap((rc) => rc.items.map((i) => i.id)));
      const goods = PRODUCTS.filter((p) => !MADE.includes(p.id) && p.id !== 'ekmek' && !had.has(p.id));
      const product = pick(goods);
      return { villager, ask: { kind: 'elsewhere', product, price: Math.round((product.market * 1.1) / 5) * 5, reason: reason.text, restock: true } };
    }
  }
  if (kind === 'never') {
    // Z raporlarında hiç adı geçmeyen biri
    const strangers = REGULARS.filter((v) => !past.some((rc) => rc.who === v.id));
    if (strangers.length) {
      const villager = pick(strangers);
      const product = pick(PRODUCTS.filter((p) => !MADE.includes(p.id) && p.id !== 'ekmek'));
      return { villager, ask: { kind: 'never', product, price: Math.round((product.market * 1.1) / 5) * 5, reason: reason.text, restock: true } };
    }
  }
  if (!open.length) return null;
  return fromReceipt(pick(open), kind === 'inflated' ? 'inflated' : 'real');
}

export const returnLine = (ask: ReturnAsk) => `${ask.reason} ${ask.product.name} için ${ask.price} lira geri verir misin?`;

/** İade kararı. `accept`: istenen parayı geri vermek. */
export function settleReturn(ask: ReturnAsk, accept: boolean, name: string): Outcome {
  if (ask.kind === 'real')
    return accept
      ? { cash: -ask.price, rep: 2, ethics: 1, mood: 'happy', line: 'Sağ ol evladım, esnaf dediğin böyle olur.' }
      : { cash: 0, rep: -3, ethics: -1, mood: 'leave', line: 'Buradan aldım diyorum! Gün sonu fişine bak, yazıyordur. Bir daha gelmem.', verdict: `${name}'in gerçek iadesini geri çevirdin.` };
  if (accept) return { cash: -ask.price, rep: 0, ethics: 0, mood: 'happy', line: 'Hayırlı işler… (sırıtarak çıktı)' };
  // şişirilmiş iadede malı gerçekten buradan almış: fişteki kadarı verilir
  if (ask.kind === 'inflated') return { cash: -(ask.paid ?? 0), rep: 0, ethics: 0, mood: 'grumble', line: 'Hıh… fişte o kadar yazıyorsa o kadar ver bari.' };
  const caught: Record<Exclude<ReturnKind, 'real' | 'inflated'>, string> = {
    elsewhere: 'Peki… kasabadaki marketten almışım galiba.',
    never: 'Peki peki… başka bakkaldan almış olabilirim.',
    double: 'Ha… geçen sefer iade etmiş miydim? Unutmuşum.',
  };
  return { cash: 0, rep: 1, ethics: 0, mood: 'grumble', line: caught[ask.kind] };
}

/** Karardan sonra oyuncuya gerçeğin ne olduğu: Z raporunda ne yazıyordu. */
export function revealOf(ask: ReturnAsk, name: string, receipts: readonly Receipt[]): string {
  const rc = receipts.find((x) => x.no === ask.receipt);
  const at = rc ? `${rc.day}. gün` : '';
  switch (ask.kind) {
    case 'real':
      return `🧾 Gerçek iade: ${at} Z raporunda ${name} ${ask.product.name.replace(/ \(.*\)$/, '').toLocaleLowerCase('tr-TR')} almış, ${ask.price} ₺ ödemiş.`;
    case 'inflated':
      return `🧾 Fazla istedi: ${at} Z raporunda ${ask.paid} ₺ yazıyordu, ${ask.price} ₺ istedi.`;
    case 'elsewhere':
      return `🧾 Başka yerden almış: ${name} dükkândan alışveriş etmiş ama ${ask.product.name.replace(/ \(.*\)$/, '').toLocaleLowerCase('tr-TR')} hiç almamış.`;
    case 'never':
      return `🧾 Hiç almamış: Z raporlarında ${name} adına tek alışveriş yok.`;
    case 'double':
      return `🧾 İkinci kez iade: bu malın iadesi ${rc?.returnedOn ?? '?'}. gün zaten alınmıştı.`;
  }
}

// --- paketten çıkan hediye ---

/** İçinden kampanya parası çıkabilen paketli mallar. */
export const GIFT_GOODS = ['cips', 'cikolata', 'biskuvi', 'kraker', 'gazoz', 'meyvesuyu'];
const GIFT_CHANCE = 0.15;
const GIFT_AMOUNTS = [50, 100, 200];

/** Satılan paketlerden birinin içinden para çıkar mı; çıkarsa ne kadar, hangi maldan. */
export function giftIn(items: readonly Product[], seed: number): { amount: number; product: Product } | null {
  const packs = items.filter((p) => GIFT_GOODS.includes(p.id));
  if (!packs.length) return null;
  const r = rng(seed);
  if (r() > GIFT_CHANCE) return null;
  return { amount: GIFT_AMOUNTS[Math.floor(r() * GIFT_AMOUNTS.length)], product: packs[Math.floor(r() * packs.length)] };
}

/** Hediye kararı. `keep`: parayı kasaya atmak; değilse müşteriye verilir. */
export function settleGift(amount: number, keep: boolean, name: string): Outcome {
  if (keep) return { cash: amount, rep: 0, ethics: -1, mood: 'happy', line: 'Hayırlı işler! (Bir şey fark etmeden çıktı.)', verdict: `${name}'in paketinden çıkan ${amount} ₺'yi kasaya attın.` };
  return { cash: 0, rep: 3, ethics: 1, mood: 'happy', line: 'Vay! Bu benim mi şimdi? Allah razı olsun, dürüst adamsın.', verdict: `${name}'in paketinden çıkan ${amount} ₺'yi sahibine verdin.` };
}

// --- gün sonu Z raporu ---

export interface SellerRow {
  id: string;
  name: string;
  emoji: string;
  /** Kaç fişte geçti. */
  count: number;
  /** Bu maldan kasaya giren (fişteki payı, market fiyatına göre bölünmüş). */
  revenue: number;
}

/** Günün fişlerinden çok satanlar: adede, eşitse kazandırdığına göre sıralı. */
export function bestSellers(receipts: readonly Receipt[], day: number): SellerRow[] {
  const rows = new Map<string, SellerRow>();
  for (const rc of receipts) {
    if (rc.day !== day) continue;
    const goods = rc.items.map((i) => PRODUCTS.find((p) => p.id === i.id)).filter((p): p is Product => !!p);
    const sum = goods.reduce((s, p) => s + p.market, 0) || 1;
    for (const p of goods) {
      const row = rows.get(p.id) ?? { id: p.id, name: p.name, emoji: p.emoji, count: 0, revenue: 0 };
      row.count += 1;
      row.revenue += (rc.total * p.market) / sum;
      rows.set(p.id, row);
    }
  }
  return [...rows.values()].map((r) => ({ ...r, revenue: Math.round(r.revenue) })).sort((a, b) => b.count - a.count || b.revenue - a.revenue);
}
