import { PRODUCTS } from './data';
import { OLD_DEBTS } from './week';

/*
 * Hacı Emmi'nin defteri: yıllardır tezgâhta duran, kullanılmış bir defter. İç kapak, eski ve yeni
 * veresiyeler (kayıtlar week.ts'te; borçlular ilk günlerde hesap görmeye gelir), bir yıl önceki
 * tek bir toptancı fişinin dökümü; sonda oyuncuya kalan boş sayfalar. Hacı Emmi'nin el yazısı
 * sabittir ve yer yer okunmaz.
 * Oyuncu her sayfaya yalnızca kalemle yazar, silgiyle siler; her sayfanın kendi geri al / ileri al
 * geçmişi vardır.
 */

// --- oyuncunun mürekkebi ---

/** Bir kalem ya da silgi darbesi: sayfadaki noktalar (x, y, x, y, …) CSS pikseli olarak. */
export interface Stroke {
  erase: boolean;
  pts: number[];
}

/** Sayfa: çizilmiş darbeler ve geri al / ileri al için önceki ve sonraki hâller. */
export interface Page {
  strokes: Stroke[];
  past: Stroke[][];
  future: Stroke[][];
}

const BLANK: Page = { strokes: [], past: [], future: [] };

/** Yeni darbe: geçmişe eklenir, ileri al geçmişi silinir. */
export const addStroke = (p: Page, s: Stroke): Page => ({ strokes: [...p.strokes, s], past: [...p.past, p.strokes], future: [] });

/** Sayfayı temizler: o da geri alınabilir. Boş sayfada bir şey yapmaz. */
export const clearPage = (p: Page): Page => (p.strokes.length ? { strokes: [], past: [...p.past, p.strokes], future: [] } : p);

export const undo = (p: Page): Page => (p.past.length ? { strokes: p.past[p.past.length - 1], past: p.past.slice(0, -1), future: [p.strokes, ...p.future] } : p);

export const redo = (p: Page): Page => (p.future.length ? { strokes: p.future[0], past: [...p.past, p.strokes], future: p.future.slice(1) } : p);

// --- Hacı Emmi'nin yazdıkları ---

/** Hacı Emmi'nin bir satırı: kenarda tarih, solda yazı, sağda tutar. */
export interface Written {
  date?: string;
  text: string;
  amount?: string;
  /** Üstü çizilmiş tutar; yanına yenisi yazılmış. */
  was?: string;
  /** Üstü çizili satır (ödendi, iptal). */
  struck?: boolean;
  /** Kırmızı kalemle düşülmüş kısa not. */
  note?: string;
  /** Silik, lekeli ya da aceleyle karalanmış: okunması güç. */
  smudge?: boolean;
  /** Büyük, ortalanmış başlık satırı (iç kapak). */
  big?: boolean;
}

export interface PageSpec {
  id: string;
  /** Sayfanın sağ üstündeki başlık; boş sayfada yok. */
  title?: string;
  written: Written[];
  /** Kâğıtta çay bardağı lekesi. */
  stain?: boolean;
}

/** Eski toptancı fiyatı: ilk günkü maliyetin bir kesri, tam liraya yuvarlanır. Bazı satırlar okunmaz. */
const bought = (share: number, smudged: string[] = []): Written[] =>
  PRODUCTS.map((p) => ({ text: p.name, amount: `${Math.round(p.cost * share)} ₺`, smudge: smudged.includes(p.id) }));

/** Veresiye sayfası: Hacı Emmi'nin eski borç kayıtları (week.ts); ödenenlerin üstü çizili. */
const debts = (page: 1 | 2): Written[] =>
  OLD_DEBTS.filter((d) => d.page === page).map((d) => ({
    date: d.date,
    text: `${d.name} · ${d.what}`,
    amount: `${d.amount} ₺`,
    was: d.was ? String(d.was) : undefined,
    struck: d.paid,
    note: d.note,
    smudge: d.smudge,
  }));

const blank = (n: number): PageSpec => ({ id: `bos${n}`, written: [] });

export const BOOK: PageSpec[] = [
  {
    id: 'kapak',
    written: [
      { text: 'HACI EMMİ BAKKALİYE', big: true },
      { text: 'Defter No: 7', big: true },
      { text: '' },
      { text: "Yukarıkavak köyü · 1987'den beri" },
      { text: 'Bulan getirsin, çay benden.' },
      { text: 'Hacı Emmi, telefon 2 10 44', smudge: true },
    ],
  },
  { id: 'veresiye1', title: 'Veresiye', stain: true, written: debts(1) },
  { id: 'veresiye2', title: 'Veresiye', written: debts(2) },
  {
    id: 'toptanci',
    title: 'Toptancı · eski fiş',
    stain: true,
    written: [
      { date: '1 yıl önce', text: 'Kasaba toptancısı, fiş 1204 · birim alış', smudge: true },
      ...bought(0.55, ['yumurta', 'peynir']),
      { text: 'Satışa alışın üstüne üçte bir koy, ufak şeylerde yarısı.', note: 'H.E.' },
    ],
  },
  ...[1, 2, 3, 4, 5, 6, 7, 8].map(blank),
];

export type PageId = string;
export type Pages = Record<PageId, Page>;

export const EMPTY_PAGES: Pages = Object.fromEntries(BOOK.map((p) => [p.id, BLANK]));

/** Veresiye isteyen müşteri gelince defter bu sayfada açılır. */
export const CREDIT_PAGE = BOOK.findIndex((p) => p.id === 'veresiye2');
