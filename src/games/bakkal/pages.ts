import { PRODUCTS } from './data';
import { OLD_DEBTS } from './week';

/*
 * Şükrü Amca'nın defteri: yıllardır tezgâhta duran, kullanılmış bir defter. İç kapak, eski ve yeni
 * veresiyeler (kayıtlar week.ts'te; borçlular ilk günlerde hesap görmeye gelir), bir yıl önceki
 * tek bir toptancı fişinin dökümü; sonda oyuncuya kalan boş sayfalar. Şükrü Amca'nın el yazısı
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

// --- Şükrü Amca'nın yazdıkları ---

/** Şükrü Amca'nın bir satırı: kenarda tarih, solda yazı, sağda tutar. */
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

/**
 * Geçen yılın etiketleri: Şükrü Amca'nın bir yıl önce sattığı fiyatlar, yalnızca birkaç temel mal.
 * Kemal bugünkü alışı söyler; oyuncu ikisinden Şükrü Amca'nın kâr payını, zamla birlikte bugünkü
 * satış fiyatını kendisi çıkarır.
 */
export const LAST_YEAR = ['ekmek', 'sut', 'yumurta', 'cay', 'seker', 'makarna', 'un', 'peynir', 'sabun', 'kibrit'];
/** Bir yılda fiyatlar aşağı yukarı bu kadara indirilir (geçen yıl = bugün × LAST_YEAR_SHARE). */
export const LAST_YEAR_SHARE = 0.62;

/** Geçen yılın satış fiyatı: ilk günkü market fiyatının bir kesri, tam liraya yuvarlanır. Bazı satırlar okunmaz. */
const labels = (smudged: string[] = []): Written[] =>
  PRODUCTS.filter((p) => LAST_YEAR.includes(p.id)).map((p) => ({ text: p.name, amount: `${Math.round(p.market * LAST_YEAR_SHARE)} ₺`, smudge: smudged.includes(p.id) }));

/** Veresiye sayfası: Şükrü Amca'nın eski borç kayıtları (week.ts); ödenenlerin üstü çizili. */
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
      { text: 'ŞÜKRÜ AMCA BAKKALİYE', big: true },
      { text: '' },
      { text: "Yukarıkavak köyü · 1987'den beri" },
      { text: 'Bulan getirsin, çay benden.' },
      { text: 'Şükrü Amca, telefon 2 10 44', smudge: true },
    ],
  },
  { id: 'veresiye1', title: 'Veresiye', stain: true, written: debts(1) },
  { id: 'veresiye2', title: 'Veresiye', written: debts(2) },
  {
    id: 'fiyatlar',
    title: 'Etiketler · geçen yıl',
    stain: true,
    written: [
      { date: 'geçen güz', text: 'Dükkânın satış fiyatları', smudge: true },
      ...labels(['yumurta', 'peynir']),
      { text: 'Etiketi alışa bakıp koyarım; kimseyi kazıklamam.', note: 'Ş.A.' },
      { text: 'Büyük malda az kâr, ufak malda biraz fazla.' },
    ],
  },
  ...[1, 2, 3, 4, 5, 6, 7, 8].map(blank),
];

export type PageId = string;
export type Pages = Record<PageId, Page>;

export const EMPTY_PAGES: Pages = Object.fromEntries(BOOK.map((p) => [p.id, BLANK]));

/** Veresiye isteyen müşteri gelince defter bu sayfada açılır. */
export const CREDIT_PAGE = BOOK.findIndex((p) => p.id === 'veresiye2');
/** Şükrü Amca'nın geçen yılki etiket fiyatlarının sayfası: tanıtım defteri burada açar. */
export const PRICE_PAGE = BOOK.findIndex((p) => p.id === 'fiyatlar');
