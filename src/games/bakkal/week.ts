import { MADE, PRODUCTS, SANDWICH, VILLAGERS, customerOf, factorOn, priceOn, rng, type Mood, type Product, type Visit } from './data';
import { AUDITOR, auditDay } from './pressure';

/*
 * Dükkânın defterle, vicdanla, rafla ve kasayla ilgili kuralları. Saf mantıktır, test edilebilir.
 *
 * Eski hesaplar: Şükrü Amca'nın defterindeki eski veresiyelerin sahipleri hafta boyunca gelir.
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

// --- Şükrü Amca'nın eski veresiyeleri ---

export interface OldDebt {
  /** Borçlu köylü (köyde olmayan kişide yok). */
  who?: string;
  name: string;
  what: string;
  date: string;
  amount: number;
  /** Üstü çizilip düzeltilmiş eski tutar. */
  was?: number;
  /** Şükrü Amca ödendi diye çizmiş. */
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
  { who: 'durmus', name: 'Çoban Durmuş', what: 'tuz, kibrit, çay', date: '26 Eyl.', amount: 135, paid: false, page: 2 },
  { who: 'cemal', name: 'Kahveci Cemal', what: 'şeker 5 kg', date: '1 Eki.', amount: 175, paid: true, note: 'ödendi', page: 2 },
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
  /** Cebindeki para: fazlası istenirse en çok bu kadarını verebilir. */
  wallet?: number;
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
  7: [{ who: 'ali', kind: 'check' }],
  9: [{ who: 'hatice', kind: 'pay' }],
  12: [{ who: 'osman', kind: 'check' }],
  14: [{ who: 'durmus', kind: 'check' }],
  16: [{ who: 'kerem', kind: 'pay', remembers: 50 }],
  18: [{ who: 'cemal', kind: 'check' }],
  20: [{ who: 'emine', kind: 'check' }],
  25: [{ who: 'mehmet', kind: 'check' }],
};

/** İlaç parası isteyen nine bu gün gelir. */
export const LOAN_DAY = 4;
export const LOAN = 150;
/** Ninenin oğlu borcu bu gün akşamı gönderir. */
export const LOAN_BACK = LOAN_DAY + 5;
const LOANER = 'nazmiye';

/** Hesap görmeye gelenin cebindeki para: borcunun biraz üstü; borcu yoksa yine de birkaç kuruş. */
export const walletFor = (owed: number) => (owed > 0 ? Math.ceil((owed * 1.25) / 10) * 10 : 80);

export function accountsOn(day: number): { who: string; account: Account }[] {
  return (SCHEDULE[day] ?? []).map(({ who, kind, honest, remembers }) => {
    const owed = owedBy(who);
    return { who, account: { kind, owed, honest, remembers, wallet: walletFor(owed) } };
  });
}

export function accountAsk(a: Account): string {
  if (a.kind === 'check') return 'Şükrü Amca\'ya borcum kalmış mıydı? Defterine bir bak hele.';
  if (a.kind === 'claim') return `Defterde bana ${a.owed} lira borç yazılıdır ama ben onu ödedim! Şükrü Amca çizmeyi unutmuş, sen çiziver.`;
  if (a.remembers) return `Şükrü Amca'ya borcum vardı, getirdim. Ben ${a.remembers} lira diye hatırlıyorum ama defterde ne yazıyorsa o.`;
  return "Şükrü Amca'ya borcum vardı, getirdim. Ne kadardı? Defterde yazar.";
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
      ? { cash: 0, rep: 2, ethics: 1, mood: 'happy', line: "Sağ ol, sözüme güvendin. Şükrü Amca'ya selam söyle.", verdict: `${name}: gerçekten ödemişti; inanmakla iyi ettin.` }
      : { cash: 0, rep: 0, ethics: 0, mood: 'happy', line: 'Eyvallah! Sen anlayışlı adamsın.', verdict: `${name}: ödememişti; inandın, ${owed} ₺ gitti.` };
  }
  // borç soran ziyarette inan / üstüne git cevabı olmaz; bir şey değişmez
  if (answer === 'believe' || answer === 'insist') return { cash: 0, rep: 0, ethics: 0, mood: 'grumble', line: '' };
  // fazlası istenirse müşteri gitmez: söylenir ama cebinde ne varsa verir
  const wallet = a.wallet ?? walletFor(owed);
  const given = typeof answer === 'number' ? Math.min(answer, wallet) : 0;
  const all = typeof answer === 'number' && answer > wallet ? ` Cebimde ${wallet} lira var, hepsi bu.` : '';
  if (owed === 0) {
    if (answer === 'none') return { cash: 0, rep: 2, ethics: 0, mood: 'happy', line: 'Biliyordum, ödemiştim. Sağ ol evladım, defterin temiz.', verdict: `${name}: borcu yoktu; doğru söyledin.` };
    return { cash: given, rep: -3, ethics: -2, mood: 'grumble', line: `Ben onu ödemiştim ama… madem defterde yazıyor diyorsun, al şu ${given} lirayı.${all}`, verdict: `${name}: borcu yoktu; ödenmiş borç için ${given} ₺ aldın.` };
  }
  if (answer === 'none') return { cash: 0, rep: 1, ethics: 0, mood: 'happy', line: 'Yok mu? Şükrü Amca unutmuş demek… Sağ ol!', verdict: `${name}: ${owed} ₺ borçluydu; "borcun yok" dedin.` };
  if (answer === owed) return { cash: owed, rep: 2, ethics: 0, mood: 'happy', line: 'Kuruşu kuruşuna. Helal olsun, al bakalım.', verdict: `${name}: borcunu tam ödedi, ${owed} ₺.` };
  if (answer < owed) return { cash: answer, rep: 1, ethics: 0, mood: 'happy', line: 'Ooo, o kadar mıydı? Al bakalım!', verdict: `${name}: ${owed} ₺ borçluydu; ${answer} ₺ aldın.` };
  return { cash: given, rep: -3, ethics: -2, mood: 'grumble', line: `O kadar değildi, ${owed} lira diye biliyordum… neyse, al ${given} lira.${all}`, verdict: `${name}: ${owed} ₺ borçluydu; fazlasını istedin, ${given} ₺ verdi.` };
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
  return { villager, customer: customerOf(villager), items: [], credit: false, ...extra };
};

/** Her oyunun beşte birinde bir hayırsever gelir, defterdeki bütün veresiyeyi öder. */
export const CHARITY_CHANCE = 0.2;
export const CHARITY = 'rustem';
export const ZABITA = 'zabita';

/** Hayırseverin geleceği gün (8 ile 27 arası) ya da bu oyunda gelmeyecekse null. */
export function charityDay(seed: number): number | null {
  const r = rng(seed * 97 + 5);
  return r() < CHARITY_CHANCE ? 8 + Math.floor(r() * 20) : null;
}

/** Bayat mal satan dükkâna zabıtanın kestiği ceza: tane başına, fiyatlarla zamlanır. */
export const fineFor = (n: number, day: number) => Math.round((300 + 150 * Math.max(1, n)) * priceIndex(day));

export interface DayExtras {
  seed?: number;
  /** Dün kaç bayat mal satıldı: varsa zabıta gelir. */
  staleSold?: number;
}

/**
 * Günün müşterilerine haftanın olaylarını katar: eski hesabını görmeye gelenler ve ilaç parası
 * isteyen nine araya girer (aynı köylü o gün ayrıca alışverişe gelmez). Çift günlerin ilk çocuğu
 * parası eksik çıkan çocuk, tek günlerin (ilk gün hariç) ilk turisti üstünü unutan turisttir.
 */
export function weekDay(visits: Visit[], day: number, { seed = 0, staleSold = 0 }: DayExtras = {}): Visit[] {
  const r = rng(seed * 43 + day * 29 + 3);
  const extra = accountsOn(day).map(({ who, account }) => special(who, { account }));
  if (day === LOAN_DAY) extra.push(special(LOANER, { dilemma: 'loan' }));
  if (charityDay(seed) === day) extra.push(special(CHARITY, { charity: true }));
  if (staleSold > 0) extra.push(special(ZABITA, { fine: staleSold }));
  if (auditDay(seed) === day) extra.push(special(AUDITOR, { audit: true }));
  const ids = new Set(extra.map((v) => v.villager.id));
  const rest = visits.filter((v) => !ids.has(v.villager.id));
  // ikilem o günün rastgele bir çocuğuna ya da turistine düşer
  const tag = (type: string, dilemma: Dilemma) => {
    const at = rest.map((v, i) => (v.customer.id === type ? i : -1)).filter((i) => i >= 0);
    if (!at.length) return;
    const i = at[Math.floor(r() * at.length)];
    rest[i] = { ...rest[i], dilemma, credit: false };
  };
  if (day % 2 === 0) tag('cocuk', 'short');
  else if (day > 1) tag('turist', 'change');
  // özel ziyaretler günün rastgele saatlerinde kapıdan girer
  extra.forEach((v) => rest.splice(Math.floor(r() * (rest.length + 1)), 0, v));
  return rest;
}

// --- raf ve kasa ---

export type Stock = Record<string, number>;

/**
 * Şükrü Amca'nın bıraktığı kasa ve mal: rafta her maldan biraz var, boş göz yok. Temel gıda
 * açılış gününe ancak yeter, öteki maldan birer tane. Dükkân gidince boşalır: oyuncu ilk akşamdan
 * kendi parasıyla mal almak zorundadır; emanet malı satıp geçinmek yetmez.
 */
export const START_CASH = 750;
const BASIC_START: Stock = { ekmek: 14, sut: 5, yumurta: 4, un: 3, seker: 4, tuz: 4, yag: 4, makarna: 5, pirinc: 4, cay: 4, salca: 5, mercimek: 3, bulgur: 4, peynir: 3, yogurt: 4, sabun: 3, deterjan: 3, kibrit: 4 };
export const START_STOCK: Stock = {
  ...Object.fromEntries(PRODUCTS.filter((p) => !MADE.includes(p.id)).map((p) => [p.id, 1])),
  ...BASIC_START,
  sakiz: 30,
};
/** Raftaki malın o günkü alış fiyatıyla değeri (sakız hariç). */
export const stockValue = (stock: Stock, day: number) => PRODUCTS.reduce((s, p) => s + (stock[p.id] ?? 0) * priceOn(p, day).cost, 0);

/**
 * Şükrü Amca'nın emaneti: açılıştaki kasa ve raftaki mal. Oyun sonunda dükkânın değeri (kasa,
 * raftaki mal, açık veresiye) bununla karşılaştırılır: malı satıp yerine koymayan kasayı doldurur
 * ama emaneti eritir.
 */
export const START_WORTH = START_CASH + stockValue(START_STOCK, 1);

/** Gece bozulan mallar ve bir gecede bozulan payları. */
/**
 * Bir gecede bayatlayan ya da bozulan payı (raftaki taze maldan): kalan ekmeğin üçte biri ertesi
 * güne bayat kalır; süt on günde, yoğurt iki haftada, peynir, kaşar, tereyağı bir ayda, yumurta kırk günde
 * bozulur. Pay, aşağı yukarı malın raf ömrünün tersidir.
 */
export const SPOIL: Stock = { ekmek: 0.3, sut: 0.09, yogurt: 0.07, yumurta: 0.025, peynir: 0.03, kasar: 0.03, tereyag: 0.03, sucuk: 0.02 };
export const SHELF_MAX = 20;
export const BREAD_MAX = 30;
export const BREAD_DEFAULT = 12;
export const TAX_EVERY = 7;
/** Şükrü Amca bir ay sonra, bu günün akşamı memleketten döner: dükkânı geri alır, karne verilir. */
export const RETURN_DAY = 30;

/** Sepetin rafta olan ve kalmamış ürünleri. */
/** Mal verilebilir mi: raftaki mal stoktaysa; tost her zaman; sandviç ekmek varsa (ekmek arası). */
export const inStock = (id: string, stock: Stock) => (MADE.includes(id) ? !SANDWICH.includes(id) || (stock.ekmek ?? 0) > 0 : (stock[id] ?? 0) > 0);

export function split(items: Product[], stock: Stock) {
  return { have: items.filter((p) => inStock(p.id, stock)), missing: items.filter((p) => !inStock(p.id, stock)) };
}

/** Tezgâhta hazırlanan tost ve sandviçlerin malzeme parası (o günün fiyatıyla). */
export const madeCost = (items: Product[], day: number) => items.filter((p) => MADE.includes(p.id)).reduce((s, p) => s + priceOn(p, day).cost, 0);

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

/** Kemal'in toptan indirimi: büyük siparişte malın tamamına yüzde beş ya da on. */
export const BULK: { from: number; rate: number }[] = [
  { from: 3000, rate: 0.1 },
  { from: 1500, rate: 0.05 },
];
export const bulkRate = (total: number) => BULK.find((b) => total >= b.from)?.rate ?? 0;
export const bulkDiscount = (total: number) => Math.round(total * bulkRate(total));

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

/**
 * Gece bayatlayan ve bozulan mal atılmaz, rafta bayat olarak işaretlenir: atıp atmamak oyuncunun
 * kararıdır. Her gece taze malın bir payı (SPOIL) bayatlar ya da bozulur: ekmeğin yarısı, tost ve
 * sandviçin üçte biri, sütün, yoğurdun, peynirin azı. `old`: raftaki bayat adet (stoğun içindedir).
 */
export function rot(stock: Stock, old: Stock, r: () => number = () => 0.5, only?: readonly string[]): { old: Stock; spoiled: Stock } {
  const next: Stock = { ...old };
  const spoiled: Stock = {};
  // `only`: yalnızca bu mallar bozulabilir (ilk gece Şükrü Amca'nın malı tazedir, yalnız ekmek bayatlar)
  Object.entries(SPOIL).filter(([id]) => !only || only.includes(id)).forEach(([id, rate]) => {
    const fresh = (stock[id] ?? 0) - (old[id] ?? 0);
    const n = Math.min(fresh, Math.floor(fresh * rate + r()));
    if (n > 0) {
      spoiled[id] = n;
      next[id] = (old[id] ?? 0) + n;
    }
  });
  Object.keys(next).forEach((id) => !next[id] && delete next[id]);
  return { old: next, spoiled };
}

/** Sabah: atılmasına karar verilen bayat mal raftan iner; tutulan bayat kalır. */
export function discard(stock: Stock, old: Stock, keep: Record<string, boolean>): { stock: Stock; old: Stock; thrown: Stock } {
  const s = { ...stock };
  const o: Stock = {};
  const thrown: Stock = {};
  Object.entries(old).forEach(([id, n]) => {
    if (keep[id]) o[id] = n;
    else {
      thrown[id] = n;
      s[id] = Math.max(0, (s[id] ?? 0) - n);
    }
  });
  return { stock: s, old: o, thrown };
}

/**
 * Satış rafta bayat varken: müşteri raftan rastgele bir tane alır; bayatın raftaki payı kadar
 * olasılıkla eline bayatı geçer. Satılan mal stoktan, bayatsa bayat sayısından da düşer.
 */
export function handOver(stock: Stock, old: Stock, items: Product[], r: () => number): { stock: Stock; old: Stock; stale: Product[] } {
  const s = { ...stock };
  const o = { ...old };
  const stale: Product[] = [];
  items.forEach((p) => {
    // tost tezgâhta yapılır, raftan bir şey eksilmez; sandviç dükkânın ekmeğinden yapılır
    if (MADE.includes(p.id) && !SANDWICH.includes(p.id)) return;
    const id = MADE.includes(p.id) ? 'ekmek' : p.id;
    const have = s[id] ?? 0;
    if (have <= 0) return;
    if ((o[id] ?? 0) > 0 && r() < (o[id] ?? 0) / have) {
      o[id] -= 1;
      if (!o[id]) delete o[id];
      stale.push(p);
    }
    s[id] = have - 1;
  });
  return { stock: s, old: o, stale };
}

/**
 * Akşam kahvede dükkânın fiyatları konuşulur: günün satışlarında fiyatın market fiyatına oranının
 * ortalaması. Pahalıysa itibar düşer, insaflıysa biraz artar.
 */
export function priceTalk(ratios: readonly number[]): { rep: number; line: string } | null {
  if (!ratios.length) return null;
  const avg = ratios.reduce((s, x) => s + x, 0) / ratios.length;
  if (avg > 1.22) return { rep: -6, line: 'Kahvede "yeni bakkal kazıkçı" diyorlar: fiyatların çok pahalı bulunuyor.' };
  if (avg > 1.14) return { rep: -4, line: 'Kahvede "yeni bakkal pahalı" diye konuşuluyor.' };
  if (avg > 1.07) return { rep: -2, line: 'Kahvede fiyatların biraz tuzlu bulunuyor.' };
  if (avg <= 1) return { rep: 1, line: 'Kahvede "yeni bakkal insaflı" diyorlar.' };
  return null;
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
  /** Hayırseverin ödediği veresiyeler. */
  charity: number;
  /** Zabıtanın bayat mal cezası. */
  fine: number;
  /** Tezgâhta hazırlanan tost ve sandviçin malzemesi. */
  bufe: number;
  /** Fişle geri alınan malın parası. */
  refund: number;
  /** Paketlerin içinden çıkan para hediyesi. */
  gift: number;
}

export const EMPTY_FLOW: Flow = { sales: 0, rounding: 0, accounts: 0, collected: 0, loan: 0, wholesale: 0, bakery: 0, power: 0, tax: 0, charity: 0, fine: 0, bufe: 0, refund: 0, gift: 0 };

/** Köyün fiyat endeksi: ürünlerin ilk güne göre ortalama pahalanması. */
export const priceIndex = (day: number) => PRODUCTS.reduce((s, p) => s + factorOn(p, day), 0) / PRODUCTS.length;

/**
 * Günün sabit giderleri: elektrik ve buzdolabı her gün, vergi ile dükkânın kirası haftada bir.
 * Giderler fiyatlarla birlikte zamlanır: geç günlerde de kasa kendiliğinden dolmaz.
 */
/** Elektrik ve buzdolabının günlük, vergi ile kiranın haftalık tutarı (ilk günün fiyatıyla). */
export const POWER = 175;
export const RENT = 1150;
/** Ayın ortasında muhtarlık aidatı: köy yolu ve çeşme için (ilk günün fiyatıyla). */
export const AIDAT = 600;
export const AIDAT_DAY = 15;

export function expensesOn(day: number) {
  const f = priceIndex(day);
  return { power: Math.round(POWER * f), tax: (day % TAX_EVERY === 0 ? Math.round(RENT * f) : 0) + (day === AIDAT_DAY ? Math.round(AIDAT * f) : 0) };
}

// --- para üstü: bozukluk ve sakız ---

/** Sakız: kasanın yanındaki kavanozda; para üstündeki küsurat yerine tanesi 1 ₺ sayılır. */
export const GUM = 'sakiz';
export const GUM_PACK = 10;
/** Bir paket (10 sakız) toptancıdan 6 ₺: sakızla verilen her lira kasada biraz kalır. */
export const GUM_PACK_COST = 6;
export const GUM_MAX = 60;
/** Her sabah bankadan bozdurulan bozukluk (₺): 5 liranın altındaki para üstü bununla verilir. */
export const COINS_DAILY = 40;

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
