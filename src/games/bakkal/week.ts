import { PRODUCTS, VILLAGERS, factorOn, priceOn, typeOf, type Mood, type Product, type Visit } from './data';

/*
 * Dükkânın defterle, vicdanla, rafla ve kasayla ilgili kuralları. Saf mantıktır, test edilebilir.
 *
 * Eski hesaplar: Hacı Emmi'nin defterindeki eski veresiyelerin sahipleri hafta boyunca gelir.
 * Kimi borcunu ödemeye gelir ve ne kadar olduğunu sorar, kimi borcu kalıp kalmadığını sorar,
 * kimi de "ben ödemiştim, çizmeyi unutmuş" der. Doğru cevap defterdedir; oyun söylemez.
 *
 * İkilemler: parası eksik çıkan çocuk, üstünü almadan çıkan turist, ilaç parası isteyen nine.
 * Kararlar kasayı ve itibarı oynatır, hafta sonunda "esnaf ahlakı" olarak karneye yazılır.
 *
 * Raf ve kasa: her üründen sınırlı mal vardır, biten satılamaz. Her akşam fırına ekmek, toptancı
 * Kemal'e mal söylenir; ertesi sabah gelir, parası kasadan o günün fiyatıyla peşin ödenir (para
 * yetmezse yetmeyen mal geri gider). Akşam kalan
 * ekmek bayatlar, süt, yumurta ve peynirin bir kısmı gece bozulur. Elektrik her gün, vergi haftada
 * bir kasadan çıkar. Gün sonunda kasa eksiye düşerse dükkân batar: oyun o zaman biter.
 */

// --- Hacı Emmi'nin eski veresiyeleri ---

export interface OldDebt {
  /** Borçlu köylü (köyde olmayan kişide yok). */
  who?: string;
  name: string;
  what: string;
  date: string;
  amount: number;
  /** Üstü çizilip düzeltilmiş eski tutar. */
  was?: number;
  /** Hacı Emmi ödendi diye çizmiş. */
  paid: boolean;
  note?: string;
  /** Okunması güç. */
  smudge?: boolean;
  /** Defterin hangi veresiye sayfasında. */
  page: 1 | 2;
}

export const OLD_DEBTS: OldDebt[] = [
  { who: 'nazmiye', name: 'Nazmiye Nine', what: 'gaz yağı, kibrit', date: '4 Şub.', amount: 60, paid: true, note: 'ödendi', page: 1 },
  { who: 'veli', name: 'Çoban Veli', what: '3 ekmek, peynir', date: '17 Şub.', amount: 150, paid: true, note: 'ödendi', page: 1 },
  { who: 'riza', name: 'Rıza Amca', what: 'gübre parası', date: '2 Mar.', amount: 400, paid: false, smudge: true, page: 1 },
  { who: 'murat', name: 'Motorcu Murat', what: 'sigara, kola', date: '9 Mar.', amount: 95, paid: false, note: 'gelmedi!', page: 1 },
  { who: 'hasan', name: 'Muhtar', what: 'bayrak, çay', date: '21 Mar.', amount: 220, paid: true, note: 'ödendi', page: 1 },
  { who: 'emine', name: 'Emine Teyze', what: 'un 10 kg', date: '3 Nis.', amount: 290, paid: true, page: 1 },
  { who: 'kadir', name: 'Kadir', what: 'mazot bidonu', date: '19 Nis.', amount: 180, paid: false, note: 'sağlam adam', smudge: true, page: 1 },
  { who: 'osman', name: 'Osman Emmi', what: '10 kg un, yağ', date: '2 May.', amount: 340, paid: true, note: 'ödendi', page: 1 },
  { who: 'fatma', name: 'Fatma Teyze', what: 'şeker, çay', date: '19 May.', amount: 210, paid: false, page: 1 },
  { who: 'riza', name: 'Rıza Amca', what: 'yağ, salça, makarna', date: '6 Haz.', amount: 385, paid: false, note: 'hasatta', page: 1 },
  { who: 'mehmet', name: 'Mehmet Abi', what: '2 paket çay', date: '28 Haz.', amount: 180, paid: true, note: 'ödendi', page: 1 },
  { who: 'zehra', name: 'Zehra Teyze', what: 'peynir, yumurta', date: '11 Tem.', amount: 245, was: 210, paid: false, page: 1 },
  { who: 'ali', name: "Ali'nin annesi", what: 'süt, ekmek', date: '3 Ağu.', amount: 95, paid: false, page: 2 },
  { name: 'Bekçi Nuri', what: '15 ekmek', date: '20 Ağu.', amount: 150, paid: true, note: 'ödendi', page: 2 },
  { who: 'hatice', name: 'Hatice Nine', what: 'sabun, deterjan', date: '9 Eyl.', amount: 120, paid: false, page: 2 },
  { who: 'kerem', name: 'Kerem (üniversiteli)', what: 'makarna', date: '22 Eyl.', amount: 60, paid: false, smudge: true, page: 2 },
];

/** Köylünün defterdeki açık borcu: çizilmemiş satırlarının toplamı. */
export const owedBy = (who: string) => OLD_DEBTS.filter((d) => d.who === who && !d.paid).reduce((s, d) => s + d.amount, 0);

// --- eski hesap ziyaretleri ---

export type AccountKind = 'pay' | 'check' | 'claim';

export interface Account {
  kind: AccountKind;
  /** Defterde gerçekten yazan açık borç. */
  owed: number;
  /** "Ödemiştim" diyen doğru mu söylüyor. */
  honest?: boolean;
  /** Müşterinin yanlış hatırladığı tutar. */
  remembers?: number;
}

/**
 * Eski hesaplar: hangi gün kim, ne için gelir. İlk hafta sık, sonra seyrek: defter ilk haftadan
 * sonra da açılır, kalan borçlular ve "borcum var mıydı" diye soranlar ara ara uğrar.
 */
const SCHEDULE: Record<number, { who: string; kind: AccountKind; honest?: boolean; remembers?: number }[]> = {
  1: [{ who: 'fatma', kind: 'pay' }],
  2: [
    { who: 'nazmiye', kind: 'check' },
    { who: 'zehra', kind: 'pay', remembers: 210 },
  ],
  3: [{ who: 'murat', kind: 'claim', honest: false }],
  4: [{ who: 'riza', kind: 'pay', remembers: 385 }],
  5: [{ who: 'kadir', kind: 'claim', honest: true }],
  9: [{ who: 'hatice', kind: 'pay' }],
  12: [{ who: 'osman', kind: 'check' }],
  16: [{ who: 'kerem', kind: 'pay', remembers: 50 }],
  20: [{ who: 'emine', kind: 'check' }],
  25: [{ who: 'mehmet', kind: 'check' }],
};

/** İlaç parası isteyen nine bu gün gelir. */
export const LOAN_DAY = 4;
export const LOAN = 100;
/** Ninenin oğlu borcu bu gün akşamı gönderir. */
export const LOAN_BACK = LOAN_DAY + 5;
const LOANER = 'nazmiye';

export function accountsOn(day: number): { who: string; account: Account }[] {
  return (SCHEDULE[day] ?? []).map(({ who, kind, honest, remembers }) => ({ who, account: { kind, owed: kind === 'check' ? 0 : owedBy(who), honest, remembers } }));
}

export function accountAsk(a: Account): string {
  if (a.kind === 'check') return 'Hacı Emmi\'ye borcum kalmış mıydı? Defterine bir bak hele.';
  if (a.kind === 'claim') return `Defterde bana ${a.owed} lira borç yazılıdır ama ben onu ödedim! Hacı Emmi çizmeyi unutmuş, sen çiziver.`;
  if (a.remembers) return `Hacı Emmi'ye borcum vardı, getirdim. Ben ${a.remembers} lira diye hatırlıyorum ama defterde ne yazıyorsa o.`;
  return "Hacı Emmi'ye borcum vardı, getirdim. Ne kadardı? Defterde yazar.";
}

/** Oyuncunun cevabı: kasaya girilen tutar, "borcu yok", ya da iddiaya inanmak / üstüne gitmek. */
export type Answer = number | 'none' | 'believe' | 'insist';

export interface Outcome {
  /** Kasaya giren (eksi: çıkan) para. */
  cash: number;
  rep: number;
  ethics: number;
  mood: Mood;
  line: string;
  /** Hafta sonu karnesine düşülen not. */
  verdict?: string;
}

export function settleAccount(a: Account, name: string, answer: Answer): Outcome {
  const owed = a.owed;
  if (a.kind === 'claim') {
    if (answer === 'insist')
      return a.honest
        ? { cash: 0, rep: -5, ethics: -1, mood: 'leave', line: 'Bana yalancı mı diyorsun? Bir daha bu dükkâna adım atmam!', verdict: `${name}: gerçekten ödemişti; üstüne gidip küstürdün.` }
        : { cash: owed, rep: 1, ethics: 0, mood: 'grumble', line: 'Peki peki… al şu parayı. Defteri iyi tutuyorsun bakıyorum.', verdict: `${name}: ödememişti; defter seni haklı çıkardı (+${owed} ₺).` };
    return a.honest
      ? { cash: 0, rep: 2, ethics: 1, mood: 'happy', line: "Sağ ol, sözüme güvendin. Hacı Emmi'ye selam söyle.", verdict: `${name}: gerçekten ödemişti; inanmakla iyi ettin.` }
      : { cash: 0, rep: 0, ethics: 0, mood: 'happy', line: 'Eyvallah! Sen anlayışlı adamsın.', verdict: `${name}: ödememişti; inandın, ${owed} ₺ gitti.` };
  }
  // borç soran ziyarette inan / üstüne git cevabı olmaz; bir şey değişmez
  if (answer === 'believe' || answer === 'insist') return { cash: 0, rep: 0, ethics: 0, mood: 'grumble', line: '' };
  if (owed === 0) {
    if (answer === 'none') return { cash: 0, rep: 2, ethics: 0, mood: 'happy', line: 'Biliyordum, ödemiştim. Sağ ol evladım, defterin temiz.', verdict: `${name}: borcu yoktu; doğru söyledin.` };
    return { cash: 0, rep: -4, ethics: -2, mood: 'leave', line: 'Ben onu ödedim! Defterde çizili olacak, iyi bak bir daha.', verdict: `${name}: borcu yoktu; ödenmiş borcu istedin.` };
  }
  if (answer === 'none') return { cash: 0, rep: 1, ethics: 0, mood: 'happy', line: 'Yok mu? Hacı Emmi unutmuş demek… Sağ ol!', verdict: `${name}: ${owed} ₺ borçluydu; "borcun yok" dedin.` };
  if (answer === owed) return { cash: owed, rep: 2, ethics: 0, mood: 'happy', line: 'Kuruşu kuruşuna. Helal olsun, al bakalım.', verdict: `${name}: borcunu tam ödedi, ${owed} ₺.` };
  if (answer < owed) return { cash: answer, rep: 1, ethics: 0, mood: 'happy', line: 'Ooo, o kadar mıydı? Al bakalım!', verdict: `${name}: ${owed} ₺ borçluydu; ${answer} ₺ aldın.` };
  return { cash: owed, rep: -3, ethics: -2, mood: 'grumble', line: `O kadar değildi! ${owed} lira, fazlasını vermem.`, verdict: `${name}: borcundan fazlasını istedin; ${owed} ₺ verdi, söylendi.` };
}

// --- ikilemler ---

export type Dilemma = 'short' | 'change' | 'loan';

/** Çocuğun eksik çıkan parası: satışın beşte biri kadar, beşe yuvarlanır. */
// küçük satışta da çocuğun elinde para kalır: eksik hiçbir zaman satışın tamamı olmaz
export const shortBy = (sold: number) => Math.max(1, Math.min(sold - 1, Math.max(5, Math.round((sold * 0.2) / 5) * 5)));
/** Turistin uzattığı banknot: tutarın rahatça üstünde. */
export const billFor = (sold: number) => [50, 100, 200, 500, 1000].find((b) => b >= sold * 1.6) ?? Math.ceil((sold * 2) / 100) * 100;

export function dilemmaAsk(kind: Dilemma, sold = 0): string {
  if (kind === 'short') return `Abi… annemin verdiği paraya baktım, ${shortBy(sold)} lira eksik çıktı.`;
  if (kind === 'change') return `${billFor(sold)} liralık banknotu bıraktı, üstünü almadan kapıdan çıktı!`;
  return `Evladım, torunum hastalandı, ilacın parası yetmedi. ${LOAN} lira verebilir misin? Oğlum birkaç güne gönderir.`;
}

/** İkilemde verilen karar. `kind` olan şeyi yapmaktır: eksiği saymamak, üstünü vermek, borç vermek. */
export function settleDilemma(kind: Dilemma, kindly: boolean, sold = 0): Outcome {
  if (kind === 'short')
    return kindly
      ? { cash: sold - shortBy(sold), rep: 1, ethics: 2, mood: 'happy', line: 'Sağ ol abi! Annem çok sevinecek.', verdict: 'Parası eksik çıkan çocuğa eksiği saymadın.' }
      : { cash: 0, rep: -2, ethics: -2, mood: 'leave', line: 'Peki… eve gidip annemden isteyeyim.', verdict: 'Parası eksik çıkan çocuğu eli boş gönderdin.' };
  if (kind === 'change')
    return kindly
      ? { cash: sold, rep: 2, ethics: 2, mood: 'happy', line: 'Ah, çok teşekkürler! Böyle dürüstlük kalmamış.', verdict: 'Üstünü unutan turistin arkasından koşup parasını verdin.' }
      : { cash: billFor(sold), rep: -3, ethics: -3, mood: 'leave', line: '(Turist çoktan yola koyuldu. Kapının önündeki kahvede gören oldu.)', verdict: `Turistin unuttuğu ${billFor(sold) - sold} ₺ üstü kasaya attın.` };
  return kindly
    ? { cash: -LOAN, rep: 3, ethics: 3, mood: 'happy', line: 'Allah razı olsun evladım. Oğlum birkaç güne gönderir, söz.', verdict: `Nazmiye Nine'ye ilaç için ${LOAN} ₺ verdin.` }
    : { cash: 0, rep: -1, ethics: -1, mood: 'grumble', line: 'Haklısın evladım, senin de kazancın bu… Allah yardımcın olsun.', verdict: 'İlaç parası isteyen Nazmiye Nine\'yi geri çevirdin.' };
}

export function ethicsTitle(score: number): string {
  if (score >= 6) return 'Altın kalpli';
  if (score >= 2) return 'Dürüst esnaf';
  if (score >= -2) return 'Hesabını bilen';
  return 'Gözü kasada';
}

// --- günün sırası ---

const special = (who: string, extra: Partial<Visit>): Visit => {
  const villager = VILLAGERS.find((v) => v.id === who)!;
  return { villager, customer: typeOf(villager.type), items: [], credit: false, ...extra };
};

/**
 * Günün müşterilerine haftanın olaylarını katar: eski hesabını görmeye gelenler ve ilaç parası
 * isteyen nine araya girer (aynı köylü o gün ayrıca alışverişe gelmez). Çift günlerin ilk çocuğu
 * parası eksik çıkan çocuk, tek günlerin (ilk gün hariç) ilk turisti üstünü unutan turisttir.
 */
export function weekDay(visits: Visit[], day: number): Visit[] {
  const extra = accountsOn(day).map(({ who, account }) => special(who, { account }));
  if (day === LOAN_DAY) extra.push(special(LOANER, { dilemma: 'loan' }));
  const ids = new Set(extra.map((v) => v.villager.id));
  const rest = visits.filter((v) => !ids.has(v.villager.id));
  const tag = (type: string, dilemma: Dilemma) => {
    const i = rest.findIndex((v) => v.customer.id === type);
    if (i >= 0) rest[i] = { ...rest[i], dilemma, credit: false };
  };
  if (day % 2 === 0) tag('cocuk', 'short');
  else if (day > 1) tag('turist', 'change');
  extra.forEach((v, i) => rest.splice(Math.min(rest.length, 1 + i * 3), 0, v));
  return rest;
}

// --- raf ve kasa ---

export type Stock = Record<string, number>;

/** Hacı Emmi'nin bıraktığı kasa ve mal: bir iki günlük mal; sonrası siparişe kalır. */
export const START_CASH = 1000;
export const START_STOCK: Stock = { ekmek: 8, sut: 6, yumurta: 5, meyvesuyu: 6, cay: 5, seker: 5, cikolata: 7, sabun: 5, makarna: 6, peynir: 4, sakiz: 30 };
/** Gece bozulan mallar ve bir gecede bozulan payları. */
export const SPOIL: Stock = { sut: 0.3, yumurta: 0.12, peynir: 0.12 };
export const SHELF_MAX = 12;
export const BREAD_MAX = 20;
export const BREAD_DEFAULT = 5;
export const TAX_EVERY = 7;
/** Hacı Emmi hacdan bu günün akşamı döner: dükkânı geri alır, karne verilir. */
export const RETURN_DAY = 40;

/** Sepetin rafta olan ve kalmamış ürünleri. */
export function split(items: Product[], stock: Stock) {
  return { have: items.filter((p) => (stock[p.id] ?? 0) > 0), missing: items.filter((p) => !((stock[p.id] ?? 0) > 0)) };
}

/** Satılan mal raftan düşer. */
export const take = (stock: Stock, items: Product[]): Stock => {
  const s = { ...stock };
  items.forEach((p) => (s[p.id] = Math.max(0, (s[p.id] ?? 0) - 1)));
  return s;
};

/** Sabah: dünkü ekmek bayatlamış gider, fırından yenisi gelir; toptancının malı rafa dizilir. */
export function morning(stock: Stock, bread: number, order: Stock = {}): Stock {
  const s: Stock = { ...stock, ekmek: Math.max(0, Math.min(BREAD_MAX, bread)) };
  Object.entries(order).forEach(([id, n]) => id !== 'ekmek' && (s[id] = Math.min(id === GUM ? GUM_MAX : SHELF_MAX, (s[id] ?? 0) + Math.max(0, n))));
  return s;
}

const cost = (id: string, day: number) => priceOn(PRODUCTS.find((p) => p.id === id)!, day).cost;

/** Sabah gelen malın ve ekmeğin kasadan çıkan parası, o günün maliyetiyle. */
export const orderCost = (order: Stock, day: number) => Object.entries(order).reduce((s, [id, n]) => s + Math.max(0, n) * cost(id, day), 0);

/**
 * Peşin teslim: sabah fırıncı ve toptancı, kasadaki para yettiği kadar mal bırakır; yetmeyeni geri
 * götürür. Kasa bu yüzden sipariş yüzünden eksiye düşmez; eksiye ancak giderler düşürür.
 */
export function deliver(order: Stock, cash: number, day: number): { delivered: Stock; cost: number; short: boolean } {
  const delivered: Stock = {};
  let left = Math.max(0, cash);
  let short = false;
  for (const p of PRODUCTS) {
    const want = Math.max(0, order[p.id] ?? 0);
    if (!want) continue;
    const c = cost(p.id, day);
    const n = Math.min(want, Math.floor(left / c));
    if (n < want) short = true;
    if (n > 0) delivered[p.id] = n;
    left -= n * c;
  }
  // sakız paketle gelir; rafa değil kasanın yanındaki kavanoza
  const packs = Math.max(0, order[GUM] ?? 0);
  const got = Math.min(packs, Math.floor(left / GUM_PACK_COST));
  if (got < packs) short = true;
  if (got > 0) delivered[GUM] = got * GUM_PACK;
  left -= got * GUM_PACK_COST;
  return { delivered, cost: Math.max(0, cash) - left, short };
}

/**
 * Gece bozulan mal: süt çabuk, yumurta ve peynir yavaş. `r` küsuratı zarla yuvarlar: az mal da
 * bozulabilir (4 yumurtanın bozulma payı 0,48: yarı yarıya biri bozulur). Verilmezse en yakına yuvarlanır.
 */
export function spoil(stock: Stock, r: () => number = () => 0.5): { stock: Stock; spoiled: Stock } {
  const spoiled: Stock = {};
  const s = { ...stock };
  Object.entries(SPOIL).forEach(([id, rate]) => {
    const n = Math.floor((s[id] ?? 0) * rate + r());
    if (n > 0) {
      spoiled[id] = n;
      s[id] -= n;
    }
  });
  return { stock: s, spoiled };
}

/** Günün kasa defteri: kasaya girenler (artı) ve çıkanlar (eksi), kalem kalem. */
export interface Flow {
  sales: number;
  /** Küsuratı 5 liraya yuvarlarken verilen fazla para üstü. */
  rounding: number;
  accounts: number;
  collected: number;
  loan: number;
  wholesale: number;
  bakery: number;
  power: number;
  tax: number;
}

export const EMPTY_FLOW: Flow = { sales: 0, rounding: 0, accounts: 0, collected: 0, loan: 0, wholesale: 0, bakery: 0, power: 0, tax: 0 };

/** Köyün fiyat endeksi: ürünlerin ilk güne göre ortalama pahalanması. */
export const priceIndex = (day: number) => PRODUCTS.reduce((s, p) => s + factorOn(p, day), 0) / PRODUCTS.length;

/**
 * Günün sabit giderleri: elektrik ve buzdolabı her gün, vergi ile dükkânın kirası haftada bir.
 * Giderler fiyatlarla birlikte zamlanır: geç günlerde de kasa kendiliğinden dolmaz.
 */
export function expensesOn(day: number) {
  const f = priceIndex(day);
  return { power: Math.round(35 * f), tax: day % TAX_EVERY === 0 ? Math.round(300 * f) : 0 };
}

// --- para üstü: bozukluk ve sakız ---

/** Sakız: kasanın yanındaki kavanozda; para üstündeki küsurat yerine tanesi 1 ₺ sayılır. */
export const GUM = 'sakiz';
export const GUM_PACK = 10;
/** Bir paket (10 sakız) toptancıdan 6 ₺: sakızla verilen her lira kasada biraz kalır. */
export const GUM_PACK_COST = 6;
export const GUM_MAX = 60;
/** Her sabah bankadan bozdurulan bozukluk (₺): 5 liranın altındaki para üstü bununla verilir. */
export const COINS_DAILY = 30;

const BILLS = [5, 10, 20, 50, 100, 200, 500, 1000];

/**
 * Müşterinin uzattığı para: tutarı karşılayan en küçük banknot; ara sıra (tohumdan) bir büyüğü.
 * Para üstünün 5'e bölünmeyen kısmı küsurattır: ya bozuklukla ya sakızla verilir.
 */
export function payment(price: number, seed: number) {
  const i = BILLS.findIndex((b) => b >= price);
  // en büyük banknottan pahalıysa birkaç bin liralık deste uzatır
  if (i < 0) {
    const bill = Math.ceil(price / 1000) * 1000;
    return { bill, change: bill - price, odd: (bill - price) % 5 };
  }
  const bill = seed % 3 === 0 && i + 1 < BILLS.length ? BILLS[i + 1] : BILLS[i];
  const change = Math.max(0, bill - price);
  return { bill, change, odd: change % 5 };
}

export type ChangeWay = 'coins' | 'gum' | 'round';

/** Küsuratın nasıl verildiğine göre müşterinin tepkisi: çocuk sakıza sevinir, okumuş şehirli söylenir. */
export function settleChange(way: ChangeWay, odd: number, type: string): Outcome {
  if (way === 'coins') return { cash: 0, rep: 0, ethics: 0, mood: 'happy', line: 'Sağ ol, kolay gelsin.' };
  if (way === 'round') return { cash: -(5 - odd), rep: 1, ethics: 0, mood: 'happy', line: 'Ooo, fazla verdin galiba! Sağ ol.' };
  if (type === 'cocuk') return { cash: 0, rep: 1, ethics: 0, mood: 'happy', line: 'Yaşasın, sakız!' };
  if (type === 'turist' || type === 'ogretmen' || type === 'genc') return { cash: 0, rep: -1, ethics: 0, mood: 'grumble', line: odd > 2 ? `${odd} sakız mı? Para üstü bu mu şimdi…` : 'Sakız mı? Peki…' };
  return { cash: 0, rep: 0, ethics: 0, mood: odd > 3 ? 'grumble' : 'happy', line: odd > 3 ? `${odd} tane sakızı ne yapayım evladım?` : 'Eh, sakız da olur.' };
}
