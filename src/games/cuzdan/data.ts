/*
 * Cüzdan Zamanı'nın fiyat defteri. Fiyatlar bugünkü TL cinsinden (2005 öncesi eski lira
 * milyonla çarpılarak gösterilir) ve yaklaşıktır: İstanbul ortalaması, haber arşivleri, TÜİK/İTO
 * serileri ve belediye tarifelerinden derlendi. Semte, markaya ve aya göre değişir; oyun
 * kesin rakam değil, büyüklük hissi vermek için yapıldı.
 */

export const YEARS = [2002, 2005, 2009, 2012, 2016, 2018, 2020, 2022] as const;
export type Year = (typeof YEARS)[number];
/** Bugün: karşılaştırmanın yapıldığı yıl. */
export const NOW = 2026;
export type AnyYear = Year | typeof NOW;
export const ALL_YEARS: readonly AnyYear[] = [...YEARS, NOW];

export type Category = 'market' | 'disari' | 'ulasim' | 'buyuk';

export const CATEGORY_LABEL: Record<Category, string> = {
  market: 'Market',
  disari: 'Dışarıda',
  ulasim: 'Ulaşım ve ev',
  buyuk: 'Büyük alımlar',
};

export interface Item {
  id: string;
  name: string;
  /** Birimiyle kısa ad, ör. "1 ekmek (250 g)". */
  unit: string;
  emoji: string;
  cat: Category;
  prices: Record<AnyYear, number>;
}

/** Yıllar sırasıyla: 2002, 2005, 2009, 2012, 2016, 2018, 2020, 2022, 2026. */
const row = (...v: [number, number, number, number, number, number, number, number, number]): Record<AnyYear, number> =>
  Object.fromEntries(ALL_YEARS.map((y, i) => [y, v[i]])) as Record<AnyYear, number>;

/*
 * Yıl ortası, İstanbul. Ekmek ve otobüs belediye tarifelerinden, benzin akaryakıt fiyat
 * arşivlerinden, altın ons fiyatı × dolar kurundan, gıda TÜİK madde fiyatları ve market
 * broşürlerinden, sıfır otomobil orta sınıf bir sedanın liste fiyatından. 2026 değerleri
 * yılın ilk yarısının tahminidir.
 */
export const ITEMS: Item[] = [
  { id: 'ekmek', name: 'Ekmek', unit: '1 ekmek (250 g)', emoji: '🍞', cat: 'market', prices: row(0.25, 0.4, 0.6, 0.75, 1, 1.25, 1.5, 4, 17.5) },
  { id: 'simit', name: 'Simit', unit: '1 simit', emoji: '🥯', cat: 'market', prices: row(0.25, 0.4, 0.6, 1, 1.25, 1.75, 2.5, 5, 20) },
  { id: 'su', name: 'Su', unit: '0,5 litre pet su', emoji: '💧', cat: 'market', prices: row(0.25, 0.35, 0.45, 0.6, 0.75, 1, 1.25, 3, 12) },
  { id: 'cikolata', name: 'Çikolata', unit: '1 küçük çikolata', emoji: '🍫', cat: 'market', prices: row(0.3, 0.45, 0.65, 1, 1.5, 2, 2.75, 7.5, 30) },
  { id: 'domates', name: 'Domates', unit: '1 kg domates', emoji: '🍅', cat: 'market', prices: row(0.65, 0.95, 1.5, 1.85, 2.5, 3.5, 5, 12, 40) },
  { id: 'seker', name: 'Şeker', unit: '1 kg toz şeker', emoji: '🧂', cat: 'market', prices: row(1.05, 1.55, 2.2, 2.85, 4.1, 4.5, 6.2, 20, 45) },
  { id: 'sut', name: 'Süt', unit: '1 litre süt', emoji: '🥛', cat: 'market', prices: row(0.85, 1.35, 1.9, 2.35, 3.2, 4, 5.5, 17, 50) },
  { id: 'kola', name: 'Kola', unit: '1 litre kola', emoji: '🥤', cat: 'market', prices: row(0.85, 1.25, 1.6, 2.25, 3, 4, 5.5, 17, 50) },
  { id: 'yumurta', name: 'Yumurta', unit: '10 yumurta', emoji: '🥚', cat: 'market', prices: row(1.1, 1.7, 2.8, 3.4, 4.5, 5.5, 8.5, 25, 65) },
  { id: 'yag', name: 'Ayçiçek yağı', unit: '1 litre ayçiçek yağı', emoji: '🫗', cat: 'market', prices: row(1.75, 2.3, 3.45, 3.9, 5, 6.5, 12, 40, 90) },
  { id: 'kiyma', name: 'Kıyma', unit: '1 kg dana kıyma', emoji: '🥩', cat: 'market', prices: row(7.5, 10.5, 16, 23, 38, 50, 60, 200, 750) },
  { id: 'cay', name: 'Çay', unit: '1 bardak çay (kahvehane)', emoji: '🍵', cat: 'disari', prices: row(0.25, 0.4, 0.6, 1, 1.5, 2, 2.5, 6, 25) },
  { id: 'gazete', name: 'Gazete', unit: '1 gazete', emoji: '📰', cat: 'disari', prices: row(0.25, 0.4, 0.6, 1, 1.25, 1.75, 2.5, 5, 20) },
  { id: 'ayran', name: 'Ayran', unit: '1 ayran', emoji: '🥛', cat: 'disari', prices: row(0.4, 0.6, 0.9, 1.25, 1.75, 2.25, 3, 7.5, 30) },
  { id: 'tost', name: 'Tost', unit: '1 karışık tost', emoji: '🥪', cat: 'disari', prices: row(1, 1.5, 2.5, 3.5, 5, 7, 10, 30, 120) },
  { id: 'doner', name: 'Döner', unit: '1 yarım ekmek döner', emoji: '🌯', cat: 'disari', prices: row(1.5, 2.5, 4, 5.5, 8, 12, 15, 50, 220) },
  { id: 'sinema', name: 'Sinema', unit: '1 sinema bileti', emoji: '🎬', cat: 'disari', prices: row(6, 9, 11, 15, 18, 22, 30, 70, 300) },
  { id: 'kitap', name: 'Roman', unit: '1 roman (yeni baskı)', emoji: '📕', cat: 'disari', prices: row(7, 10, 14, 16, 22, 27, 35, 90, 350) },
  { id: 'otobus', name: 'Otobüs', unit: '1 otobüs bileti (İstanbul)', emoji: '🚌', cat: 'ulasim', prices: row(0.75, 1.3, 1.5, 1.95, 2.6, 2.6, 3.5, 7.5, 35) },
  { id: 'benzin', name: 'Benzin', unit: '1 litre benzin', emoji: '⛽', cat: 'ulasim', prices: row(1.75, 2.65, 3.4, 4.55, 4.6, 6.4, 6.7, 24, 62) },
  { id: 'tup', name: 'Tüp gaz', unit: '12 kg tüp gaz', emoji: '🔥', cat: 'ulasim', prices: row(16, 26, 40, 60, 75, 115, 160, 400, 1150) },
  { id: 'altin', name: 'Gram altın', unit: '1 gram altın', emoji: '🪙', cat: 'buyuk', prices: row(15, 19, 48, 96, 121, 195, 420, 960, 5800) },
  { id: 'araba', name: 'Sıfır otomobil', unit: '1 sıfır otomobil (orta sınıf)', emoji: '🚗', cat: 'buyuk', prices: row(15000, 22000, 30000, 38000, 55000, 110000, 180000, 500000, 1350000) },
];

/**
 * Tüketici fiyat endeksi (TÜİK, 2003=100), yıllık ortalama, yaklaşık; 2026 ilk yarı tahmini.
 * Bir fiyatın "enflasyondan hızlı mı yavaş mı" arttığı buna bölünerek bulunur.
 */
export const CPI: Record<AnyYear, number> = row(80, 117.6, 163.4, 205.6, 280, 362.1, 468.2, 1040, 4300);

/** Net asgari ücret (aylık, yılın ilk yarısı). */
export const MIN_WAGE: Record<AnyYear, number> = row(184, 350, 527, 701, 1300, 1603, 2324, 4253, 28075);
/** Dolar kuru (yıl ortalaması, yaklaşık). */
export const USD: Record<AnyYear, number> = row(1.51, 1.34, 1.55, 1.79, 3.02, 4.83, 7.0, 16.5, 46);

/** Yılın küçük bir hatırası: tur kartının altında yazar. */
export const YEAR_NOTE: Record<AnyYear, string> = {
  2002: 'Krizin ertesi yıl. Cüzdanda milyonlar, cepte bozukluk yok.',
  2005: 'Altı sıfır atıldı: 1.000.000 TL artık 1 YTL.',
  2009: 'YTL\'nin "Y"si düştü, para yine TL oldu.',
  2012: 'Kartla ödeme yaygınlaşıyor, bozuk para azalıyor.',
  2016: 'Dolar ilk kez 3 lirayı geçti.',
  2018: 'Kur krizi: dolar bir yaz gününde 7 lirayı gördü.',
  2020: 'Salgın yılı: maske, kolonya, evden çalışma.',
  2022: 'Enflasyon %85\'i gördü, etiketler her hafta değişti.',
  2026: 'Bugün.',
};

/** 2005 öncesi: ekranda eski lira (milyonlu) gösterilir. */
export const isOldLira = (y: AnyYear) => y < 2005;

/** Her yılın damga rengi: dönemin banknotlarından esinli; beyaz yazı hepsinde okunur. */
export const YEAR_COLOR: Record<AnyYear, string> = {
  2002: '#8e3553',
  2005: '#35618c',
  2009: '#7a5626',
  2012: '#2c6656',
  2016: '#5f4785',
  2018: '#2f5f7a',
  2020: '#9c3b2b',
  2022: '#8a4b1f',
  2026: '#1d4636',
};
