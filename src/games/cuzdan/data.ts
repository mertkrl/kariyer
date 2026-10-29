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
  { id: 'makarna', name: 'Makarna', unit: '500 g makarna', emoji: '🍝', cat: 'market', prices: row(0.5, 0.7, 1, 1.25, 1.5, 2, 3, 9, 30) },
  { id: 'pirinc', name: 'Pirinç', unit: '1 kg baldo pirinç', emoji: '🍚', cat: 'market', prices: row(1.5, 2.2, 3, 3.8, 5, 6, 9, 28, 80) },
  { id: 'un', name: 'Un', unit: '5 kg un', emoji: '🌾', cat: 'market', prices: row(3, 4.5, 6, 8, 12, 15, 22, 90, 200) },
  { id: 'muz', name: 'Muz', unit: '1 kg muz', emoji: '🍌', cat: 'market', prices: row(2, 2.75, 3.5, 4.5, 6, 8, 12, 25, 90) },
  { id: 'tavuk', name: 'Tavuk', unit: '1 kg bütün tavuk', emoji: '🍗', cat: 'market', prices: row(2.5, 3.5, 5, 6.5, 10, 12, 17, 55, 170) },
  { id: 'peynir', name: 'Beyaz peynir', unit: '1 kg beyaz peynir', emoji: '🧀', cat: 'market', prices: row(5, 7, 10, 13, 20, 25, 35, 110, 400) },
  { id: 'dismacunu', name: 'Diş macunu', unit: '1 diş macunu (100 ml)', emoji: '🪥', cat: 'market', prices: row(1.5, 2, 3, 4, 6, 8, 12, 35, 110) },
  { id: 'deterjan', name: 'Deterjan', unit: '3 kg toz çamaşır deterjanı', emoji: '🧺', cat: 'market', prices: row(6, 8, 11, 15, 22, 28, 40, 120, 350) },
  { id: 'cay', name: 'Çay', unit: '1 bardak çay (kahvehane)', emoji: '🍵', cat: 'disari', prices: row(0.25, 0.4, 0.6, 1, 1.5, 2, 2.5, 6, 25) },
  { id: 'gazete', name: 'Gazete', unit: '1 gazete', emoji: '📰', cat: 'disari', prices: row(0.25, 0.4, 0.6, 1, 1.25, 1.75, 2.5, 5, 20) },
  { id: 'ayran', name: 'Ayran', unit: '1 ayran', emoji: '🥛', cat: 'disari', prices: row(0.4, 0.6, 0.9, 1.25, 1.75, 2.25, 3, 7.5, 30) },
  { id: 'dondurma', name: 'Dondurma', unit: '1 külah dondurma', emoji: '🍦', cat: 'disari', prices: row(0.5, 0.75, 1, 1.5, 2, 2.5, 4, 10, 45) },
  { id: 'kahve', name: 'Türk kahvesi', unit: '1 Türk kahvesi (kafede)', emoji: '☕', cat: 'disari', prices: row(1.5, 2, 3, 4, 6, 8, 12, 30, 120) },
  { id: 'lahmacun', name: 'Lahmacun', unit: '1 lahmacun', emoji: '🫓', cat: 'disari', prices: row(1, 1.5, 2.5, 3.5, 5, 7, 10, 30, 120) },
  { id: 'tost', name: 'Tost', unit: '1 karışık tost', emoji: '🥪', cat: 'disari', prices: row(1, 1.5, 2.5, 3.5, 5, 7, 10, 30, 120) },
  { id: 'doner', name: 'Döner', unit: '1 yarım ekmek döner', emoji: '🌯', cat: 'disari', prices: row(1.5, 2.5, 4, 5.5, 8, 12, 15, 50, 220) },
  { id: 'berber', name: 'Berber', unit: '1 erkek saç tıraşı', emoji: '💈', cat: 'disari', prices: row(5, 8, 10, 15, 25, 30, 50, 150, 500) },
  { id: 'sinema', name: 'Sinema', unit: '1 sinema bileti', emoji: '🎬', cat: 'disari', prices: row(6, 9, 11, 15, 18, 22, 30, 70, 300) },
  { id: 'kitap', name: 'Roman', unit: '1 roman (yeni baskı)', emoji: '📕', cat: 'disari', prices: row(7, 10, 14, 16, 22, 27, 35, 90, 350) },
  { id: 'otobus', name: 'Otobüs', unit: '1 otobüs bileti (İstanbul)', emoji: '🚌', cat: 'ulasim', prices: row(0.75, 1.3, 1.5, 1.95, 2.6, 2.6, 3.5, 7.5, 35) },
  { id: 'vapur', name: 'Vapur', unit: '1 şehir hatları vapuru', emoji: '⛴️', cat: 'ulasim', prices: row(0.75, 1.3, 1.5, 1.95, 2.6, 2.6, 3.5, 7.5, 35) },
  { id: 'elektrik', name: 'Elektrik', unit: '100 kWh elektrik (konut)', emoji: '💡', cat: 'ulasim', prices: row(14, 16, 26, 30, 44, 55, 70, 180, 330) },
  { id: 'benzin', name: 'Benzin', unit: '1 litre benzin', emoji: '⛽', cat: 'ulasim', prices: row(1.75, 2.65, 3.4, 4.55, 4.6, 6.4, 6.7, 24, 62) },
  { id: 'tup', name: 'Tüp gaz', unit: '12 kg tüp gaz', emoji: '🔥', cat: 'ulasim', prices: row(16, 26, 40, 60, 75, 115, 160, 400, 1150) },
  { id: 'bisiklet', name: 'Bisiklet', unit: '1 şehir bisikleti', emoji: '🚲', cat: 'buyuk', prices: row(100, 150, 200, 250, 400, 600, 900, 3000, 9000) },
  { id: 'buzdolabi', name: 'Buzdolabı', unit: '1 buzdolabı (orta segment)', emoji: '🧊', cat: 'buyuk', prices: row(500, 700, 900, 1100, 1600, 2500, 4000, 12000, 35000) },
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

/*
 * Dönemin rafı: yalnızca belli yıllarda anlamı olan ürünler. Zaman Bakkalı'nda o yılın rafında
 * çıkar, oyunun öbür masalarına girmez. `now` null ise ürün bugün yok (fişte "artık yok" yazar).
 * Fiyatlar yaklaşık; `soldOut` yıllarında rafta "Tükendi" yazar.
 */
export interface EraItem {
  id: string;
  name: string;
  unit: string;
  emoji: string;
  /** Rafın üstündeki küçük dönem etiketi: "Salgın", "Yeni teknoloji"… */
  tag: string;
  prices: Partial<Record<Year, number>>;
  now: number | null;
  /** Bugün yerine ne var: "artık herkesin cebinde" gibi. */
  nowNote?: string;
  soldOut?: Year[];
}

export const ERA_ITEMS: EraItem[] = [
  { id: 'kaset', name: 'Kaset', unit: '1 albüm kaseti', emoji: '📼', tag: 'Kaset → CD', prices: { 2002: 4, 2005: 6 }, now: null, nowNote: 'kasetçalar kalmadı' },
  { id: 'disket', name: 'Disket', unit: '10\'lu 1,44 MB disket', emoji: '💾', tag: 'Çevirmeli günler', prices: { 2002: 5, 2005: 5 }, now: null, nowNote: 'bir fotoğraf bile sığmaz' },
  { id: 'usb', name: 'USB bellek', unit: '1 GB USB bellek', emoji: '🔌', tag: 'Yeni teknoloji', prices: { 2005: 60, 2009: 15 }, now: null, nowNote: '1 GB artık satılmıyor' },
  { id: 'netbook', name: 'Netbook', unit: '1 netbook (10 inç)', emoji: '💻', tag: 'Yeni teknoloji', prices: { 2009: 700, 2012: 650 }, now: null, nowNote: 'yerini tabletler aldı' },
  { id: 'spinner', name: 'Fidget spinner', unit: '1 fidget spinner', emoji: '🌀', tag: 'Moda', prices: { 2018: 10 }, now: 60 },
  { id: 'termometre', name: 'Ateş ölçer', unit: '1 temassız ateş ölçer', emoji: '🌡️', tag: 'Salgın', prices: { 2020: 150, 2022: 120 }, now: 500 },
  { id: 'halkekmek', name: 'Halk ekmek', unit: '1 halk ekmek (250 g)', emoji: '🥖', tag: 'Kuyruk', prices: { 2022: 2.5 }, now: 10 },
  { id: 'telkart', name: 'Telefon kartı', unit: '100 kontörlük telefon kartı', emoji: '☎️', tag: 'Ankesörlü telefon', prices: { 2002: 3, 2005: 5, 2009: 6 }, now: null, nowNote: 'ankesörlü telefonlar kalktı' },
  { id: 'netkafe', name: 'İnternet kafe', unit: '1 saat internet kafe', emoji: '🖥️', tag: 'Çevirmeli günler', prices: { 2002: 1, 2005: 1.25, 2009: 1.5, 2012: 2 }, now: null, nowNote: 'internet artık herkesin cebinde' },
  { id: 'cd', name: 'Müzik CD\'si', unit: '1 albüm CD\'si', emoji: '💿', tag: 'Kaset → CD', prices: { 2002: 8, 2005: 12, 2009: 15 }, now: null, nowNote: 'yerini müzik uygulamaları aldı' },
  { id: 'dvd', name: 'Film DVD\'si', unit: '1 orijinal film DVD\'si', emoji: '📀', tag: 'Video kulübü', prices: { 2005: 15, 2009: 20, 2012: 25 }, now: null, nowNote: 'yerini dizi-film platformları aldı' },
  { id: 'mp3', name: 'MP3 çalar', unit: '1 GB MP3 çalar', emoji: '🎧', tag: 'Yeni teknoloji', prices: { 2005: 90, 2009: 60 }, now: null, nowNote: 'telefonun içine girdi' },
  { id: 'akilli', name: 'Akıllı telefon', unit: '1 akıllı telefon (orta seviye)', emoji: '📱', tag: 'Yeni teknoloji', prices: { 2012: 700, 2016: 1500, 2018: 2500, 2020: 4500, 2022: 9000 }, now: 25000 },
  { id: 'selfie', name: 'Selfie çubuğu', unit: '1 selfie çubuğu', emoji: '🤳', tag: 'Moda', prices: { 2016: 15, 2018: 18 }, now: 150 },
  { id: 'dolar', name: 'Dolar', unit: '1 Amerikan doları (döviz bürosu)', emoji: '💵', tag: 'Kur krizi', prices: { 2018: 4.83, 2022: 16.5 }, now: 46 },
  { id: 'maske', name: 'Maske', unit: '10\'lu cerrahi maske', emoji: '😷', tag: 'Salgın', prices: { 2020: 12, 2022: 10 }, now: 40 },
  { id: 'kolonya', name: 'Kolonya', unit: '400 ml limon kolonyası', emoji: '🍋', tag: 'Salgın', prices: { 2020: 25, 2022: 45 }, now: 150 },
  { id: 'dezenfektan', name: 'Dezenfektan', unit: '500 ml el dezenfektanı', emoji: '🧴', tag: 'Salgın', prices: { 2020: 30, 2022: 40 }, now: 120 },
  { id: 'maya', name: 'Kuru maya', unit: '1 paket kuru maya', emoji: '🍞', tag: 'Evde ekmek', prices: { 2020: 1 }, now: 15, soldOut: [2020] },
];

/** Satış sınırı: o yıl bir üründen sepete en çok kaç tane konur (2022'de ayçiçek yağı kuyrukları). */
export const LIMITS: Partial<Record<Year, Record<string, number>>> = {
  2022: { yag: 2 },
  2020: { kolonya: 1, dezenfektan: 1 },
};

/** Yılın manşeti ve haberleri: Zaman Bakkalı'nın bandında ve saat değişince Haberci'de. */
export const EVENTS: Record<Year, { headline: string; news: string[] }> = {
  2002: { headline: '2001 krizinin ertesi: maaşlar eridi, cüzdanlar milyonlarla dolu.', news: ['Kriz indirimi: her şey 1 milyondan başlıyor', 'Telefon kartı bitti mi? Bakkalda var', 'İnternet kafede saati 1 milyon'] },
  2005: { headline: 'Altı sıfır atıldı: 1.000.000 TL artık 1 YTL.', news: ['Eski paralar bankalarda YTL\'ye çevriliyor', 'Kuruş geri döndü: 5, 10, 25, 50 Ykr', 'Fiyat etiketlerinde iki para birimi birden'] },
  2009: { headline: 'YTL\'nin "Y"si düştü; küresel kriz kapıda.', news: ['Para yine TL oldu, YTL banknotlar tedavülde', 'Otomobilde ÖTV indirimi: kampanya fiyatları', 'İşsizlik artıyor, kredi kartı borçları da'] },
  2012: { headline: 'Akıllı telefon çağı: herkes ekranına eğildi.', news: ['Kartla ödeme her yerde, bozuk para azalıyor', 'Dolar 1,80: ithal ürünler hâlâ uygun', 'Online alışveriş patlıyor: kapıda ödeme var'] },
  2016: { headline: 'Dolar ilk kez 3 lirayı geçti.', news: ['Selfie çubuğu kapış kapış', 'Döviz bürolarında yoğunluk', 'Mobil uygulamadan market siparişi yaygınlaşıyor'] },
  2018: { headline: 'Kur krizi: dolar bir yaz günü 7 lirayı gördü.', news: ['Etiketler dolara endeksli güncelleniyor', 'Döviz bürolarında kuyruk', 'İthal ürünlerde fiyatlar bir gecede değişti'] },
  2020: { headline: 'Salgın yılı: maske, kolonya, evden çalışma.', news: ['Maske takmak zorunlu', 'Kolonya ve dezenfektan kişi başı 1 adet', 'Herkes evde ekmek yapıyor: maya tükendi', 'Market saatleri 10.00–20.00'] },
  2022: { headline: 'Enflasyon %85\'i gördü; etiketler her hafta değişti.', news: ['Ayçiçek yağına sınır: kişi başı 2 şişe', 'Ekmeğe zam, simite zam, çaya zam', 'Halk ekmek kuyrukları uzuyor'] },
};
