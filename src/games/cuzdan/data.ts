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
const BASE_ITEMS: Item[] = [
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

/*
 * Geniş raf: elle tutulmuş arşiv satırlarından sonra gelen yüzlerce gündelik ürün. Bugünkü fiyat
 * yaklaşık bir İstanbul ortalamasıdır; geçmiş yıllar TÜFE ile geriye çekilir. `k` ürünün
 * enflasyona göre seyridir: 1'den büyükse ürün genel fiyatlardan hızlı pahalanmıştır (geçmişte
 * daha ucuzdu), küçükse yavaş (teknoloji ürünleri gibi). Kesin değil, büyüklük hissi.
 */
const CPI_ROW = [80, 117.6, 163.4, 205.6, 280, 362.1, 468.2, 1040, 4300];
function tidy(v: number): number {
  const step = v < 1 ? 0.05 : v < 10 ? 0.25 : v < 100 ? 1 : v < 1000 ? 5 : v < 10000 ? 50 : 500;
  return Math.max(step, Math.round(v / step) * step);
}
function est(now: number, k: number): Record<AnyYear, number> {
  const v = CPI_ROW.map((c, i) => (i === 8 ? now : tidy(now * (c / 4300) ** k)));
  return row(...(v as [number, number, number, number, number, number, number, number, number]));
}
type Raw = [id: string, name: string, unit: string, emoji: string, cat: Category, now: number, k: number];
const RAW: Raw[] = [
  // market: kahvaltılık
  ['zeytin', 'Siyah zeytin', '1 kg siyah zeytin', '🫒', 'market', 320, 1.03],
  ['bal', 'Çiçek balı', '850 g çiçek balı', '🍯', 'market', 450, 1.0],
  ['recel', 'Reçel', '380 g vişne reçeli', '🍒', 'market', 110, 1.0],
  ['tereyag', 'Tereyağı', '250 g tereyağı', '🧈', 'market', 220, 1.05],
  ['kasar', 'Kaşar peyniri', '1 kg kaşar peyniri', '🧀', 'market', 520, 1.04],
  ['sucuk', 'Sucuk', '1 kg kangal sucuk', '🌭', 'market', 900, 1.06],
  ['salam', 'Salam', '200 g dilim salam', '🥓', 'market', 140, 1.02],
  ['yogurt', 'Yoğurt', '1 kg kova yoğurt', '🥣', 'market', 85, 1.02],
  ['kaymak', 'Kaymak', '200 g kaymak', '🥛', 'market', 160, 1.03],
  ['tahin', 'Tahin', '300 g tahin', '🥜', 'market', 130, 1.04],
  ['pekmez', 'Üzüm pekmezi', '700 g üzüm pekmezi', '🍇', 'market', 150, 1.0],
  ['helva', 'Tahin helvası', '500 g tahin helvası', '🍬', 'market', 160, 1.02],
  ['findikkrem', 'Fındık kreması', '350 g kakaolu fındık kreması', '🌰', 'market', 140, 1.03],
  ['corn', 'Mısır gevreği', '400 g mısır gevreği', '🥣', 'market', 120, 0.98],
  ['cayk', 'Kuru çay', '1 kg siyah çay', '🫖', 'market', 300, 1.0],
  ['nescafe', 'Hazır kahve', '100 g hazır kahve', '☕', 'market', 260, 0.97],
  ['turkkahve', 'Türk kahvesi paketi', '100 g Türk kahvesi', '🫘', 'market', 90, 1.0],
  // market: bakliyat, kuru gıda
  ['mercimek', 'Kırmızı mercimek', '1 kg kırmızı mercimek', '🫘', 'market', 70, 1.02],
  ['nohut', 'Nohut', '1 kg nohut', '🫘', 'market', 80, 1.02],
  ['fasulye', 'Kuru fasulye', '1 kg kuru fasulye', '🫘', 'market', 110, 1.04],
  ['bulgur', 'Bulgur', '1 kg pilavlık bulgur', '🌾', 'market', 45, 1.0],
  ['salca', 'Domates salçası', '830 g domates salçası', '🥫', 'market', 95, 1.02],
  ['ton', 'Ton balığı', '3\'lü ton balığı konservesi', '🐟', 'market', 180, 1.0],
  ['tuz', 'Tuz', '750 g sofra tuzu', '🧂', 'market', 15, 0.95],
  ['biber', 'Pul biber', '100 g pul biber', '🌶️', 'market', 60, 1.0],
  ['zeytinyagi', 'Zeytinyağı', '1 litre sızma zeytinyağı', '🫒', 'market', 420, 1.1],
  ['margarin', 'Margarin', '250 g paket margarin', '🧈', 'market', 45, 1.0],
  ['irmik', 'İrmik', '500 g irmik', '🌾', 'market', 30, 1.0],
  ['sehriye', 'Şehriye', '500 g arpa şehriye', '🍜', 'market', 30, 1.0],
  ['noodle', 'Hazır noodle', '1 paket hazır noodle', '🍜', 'market', 20, 0.98],
  ['corba', 'Hazır çorba', '1 paket hazır çorba', '🥣', 'market', 25, 0.98],
  ['puding', 'Puding', '1 paket kakaolu puding', '🍮', 'market', 30, 0.98],
  ['kekun', 'Kek karışımı', '1 paket kek karışımı', '🧁', 'market', 55, 1.0],
  ['kakao', 'Kakao', '100 g kakao', '🍫', 'market', 70, 1.05],
  ['vanilya', 'Vanilin', '5\'li vanilin', '🍦', 'market', 15, 0.95],
  // market: meyve sebze
  ['patates', 'Patates', '1 kg patates', '🥔', 'market', 25, 1.0],
  ['sogan', 'Kuru soğan', '1 kg kuru soğan', '🧅', 'market', 22, 1.0],
  ['sarimsak', 'Sarımsak', '1 kg sarımsak', '🧄', 'market', 200, 1.08],
  ['salatalik', 'Salatalık', '1 kg salatalık', '🥒', 'market', 35, 1.0],
  ['biberyesil', 'Sivri biber', '1 kg sivri biber', '🫑', 'market', 60, 1.02],
  ['patlican', 'Patlıcan', '1 kg patlıcan', '🍆', 'market', 45, 1.0],
  ['havuc', 'Havuç', '1 kg havuç', '🥕', 'market', 25, 0.98],
  ['marul', 'Marul', '1 adet marul', '🥬', 'market', 25, 0.98],
  ['limon', 'Limon', '1 kg limon', '🍋', 'market', 50, 1.0],
  ['portakal', 'Portakal', '1 kg portakal', '🍊', 'market', 40, 0.98],
  ['elma', 'Elma', '1 kg elma', '🍎', 'market', 45, 1.0],
  ['armut', 'Armut', '1 kg armut', '🍐', 'market', 60, 1.0],
  ['cilek', 'Çilek', '1 kg çilek', '🍓', 'market', 120, 1.02],
  ['kiraz', 'Kiraz', '1 kg kiraz', '🍒', 'market', 180, 1.05],
  ['karpuz', 'Karpuz', '1 kg karpuz', '🍉', 'market', 15, 0.98],
  ['uzum', 'Üzüm', '1 kg çekirdeksiz üzüm', '🍇', 'market', 70, 1.0],
  ['seftali', 'Şeftali', '1 kg şeftali', '🍑', 'market', 75, 1.0],
  ['avokado', 'Avokado', '1 adet avokado', '🥑', 'market', 40, 0.9],
  ['ananas', 'Ananas', '1 adet ananas', '🍍', 'market', 160, 0.95],
  ['kivi', 'Kivi', '1 kg kivi', '🥝', 'market', 90, 0.95],
  ['mantar', 'Mantar', '400 g kültür mantarı', '🍄', 'market', 55, 1.0],
  ['misir', 'Mısır', '1 adet haşlanmış mısır (sokakta)', '🌽', 'disari', 40, 1.02],
  ['brokoli', 'Brokoli', '1 kg brokoli', '🥦', 'market', 80, 0.97],
  // market: et, balık
  ['kusbasi', 'Kuşbaşı', '1 kg dana kuşbaşı', '🥩', 'market', 850, 1.06],
  ['kofte', 'Köfte', '1 kg hazır köfte', '🍖', 'market', 700, 1.06],
  ['hamsi', 'Hamsi', '1 kg hamsi', '🐟', 'market', 180, 1.08],
  ['levrek', 'Levrek', '1 kg çiftlik levreği', '🐠', 'market', 350, 1.0],
  ['karides', 'Karides', '500 g dondurulmuş karides', '🦐', 'market', 400, 0.98],
  ['tavukgogus', 'Tavuk göğsü', '1 kg tavuk göğsü', '🍗', 'market', 260, 1.05],
  ['sosis', 'Sosis', '500 g piliç sosis', '🌭', 'market', 110, 1.02],
  // market: atıştırmalık, içecek
  ['cips', 'Cips', '1 büyük paket cips', '🥔', 'market', 65, 1.0],
  ['biskuvi', 'Bisküvi', '1 paket bisküvi', '🍪', 'market', 25, 1.0],
  ['gofret', 'Gofret', '1 gofret', '🧇', 'market', 15, 1.0],
  ['sakiz', 'Sakız', '1 paket sakız', '🍬', 'market', 20, 1.0],
  ['lokum', 'Lokum', '500 g lokum', '🍬', 'market', 180, 1.0],
  ['kuruyemis', 'Karışık kuruyemiş', '500 g karışık kuruyemiş', '🥜', 'market', 350, 1.04],
  ['cekirdek', 'Ay çekirdeği', '180 g ay çekirdeği', '🌻', 'market', 40, 1.02],
  ['findik', 'Fındık', '1 kg iç fındık', '🌰', 'market', 650, 1.02],
  ['meyvesuyu', 'Meyve suyu', '1 litre meyve suyu', '🧃', 'market', 55, 0.98],
  ['soda', 'Maden suyu', '6\'lı maden suyu', '🫧', 'market', 60, 1.0],
  ['gazoz', 'Gazoz', '1 litre gazoz', '🍾', 'market', 35, 1.0],
  ['damacana', 'Damacana su', '19 litre damacana su', '🚰', 'market', 120, 1.02],
  ['enerji', 'Enerji içeceği', '1 kutu enerji içeceği', '⚡', 'market', 55, 0.95],
  ['buzlu', 'Soğuk çay', '1 litre soğuk çay', '🧊', 'market', 45, 1.0],
  ['dondurmakutu', 'Kutu dondurma', '1 litre kutu dondurma', '🍨', 'market', 150, 1.0],
  // market: temizlik, bakım
  ['sampuan', 'Şampuan', '500 ml şampuan', '🧴', 'market', 120, 0.98],
  ['sabun', 'Sabun', '4\'lü kalıp sabun', '🧼', 'market', 75, 1.0],
  ['tuvaletk', 'Tuvalet kâğıdı', '32\'li tuvalet kâğıdı', '🧻', 'market', 260, 1.02],
  ['pecete', 'Peçete', '100\'lü kâğıt peçete', '🧻', 'market', 30, 1.0],
  ['bulasik', 'Bulaşık deterjanı', '1 litre bulaşık deterjanı', '🫧', 'market', 75, 1.0],
  ['camasirsuyu', 'Çamaşır suyu', '3,5 litre çamaşır suyu', '🧴', 'market', 90, 1.0],
  ['dis', 'Diş fırçası', '1 diş fırçası', '🪥', 'market', 60, 0.98],
  ['tiras', 'Tıraş bıçağı', '4\'lü tıraş bıçağı', '🪒', 'market', 220, 0.97],
  ['bez', 'Bebek bezi', '40\'lı bebek bezi', '👶', 'market', 380, 1.03],
  ['mama', 'Kedi maması', '1,5 kg kuru kedi maması', '🐈', 'market', 420, 1.02],
  ['ampul', 'Ampul', '1 LED ampul', '💡', 'market', 60, 0.85],
  ['pil', 'Pil', '4\'lü kalem pil', '🔋', 'market', 110, 0.95],
  ['copposeti', 'Çöp poşeti', '1 rulo çöp poşeti', '🗑️', 'market', 40, 1.0],
  ['kibrit', 'Kibrit', '10\'lu kibrit', '🔥', 'market', 15, 1.0],
  ['krem', 'El kremi', '75 ml el kremi', '🧴', 'market', 90, 0.98],
  ['parfum', 'Parfüm', '100 ml parfüm (orta segment)', '🌸', 'market', 1800, 0.98],
  ['ilac', 'Ağrı kesici', '1 kutu ağrı kesici', '💊', 'market', 70, 0.92],
  // dışarıda: yeme içme
  ['kumpir', 'Kumpir', '1 kumpir', '🥔', 'disari', 220, 1.05],
  ['pide', 'Kıymalı pide', '1 kıymalı pide', '🫓', 'disari', 280, 1.05],
  ['iskender', 'İskender', '1 porsiyon İskender', '🍖', 'disari', 550, 1.08],
  ['adana', 'Adana kebap', '1 porsiyon Adana kebap', '🍢', 'disari', 450, 1.07],
  ['midye', 'Midye dolma', '1 midye dolma', '🦪', 'disari', 15, 1.08],
  ['kokorec', 'Kokoreç', '1 yarım ekmek kokoreç', '🥖', 'disari', 250, 1.08],
  ['balikekmek', 'Balık ekmek', '1 balık ekmek', '🐟', 'disari', 200, 1.05],
  ['hamburger', 'Hamburger menü', '1 hamburger menü', '🍔', 'disari', 350, 1.0],
  ['pizza', 'Pizza', '1 orta boy pizza (paket)', '🍕', 'disari', 400, 1.0],
  ['borek', 'Su böreği', '1 porsiyon su böreği', '🥧', 'disari', 120, 1.04],
  ['pogaca', 'Poğaça', '1 poğaça', '🥐', 'disari', 25, 1.03],
  ['acma', 'Açma', '1 açma', '🥐', 'disari', 25, 1.03],
  ['baklava', 'Baklava', '1 kg fıstıklı baklava', '🍯', 'disari', 1500, 1.08],
  ['sutlac', 'Sütlaç', '1 porsiyon sütlaç', '🍮', 'disari', 120, 1.04],
  ['kunefe', 'Künefe', '1 porsiyon künefe', '🧀', 'disari', 220, 1.05],
  ['salep', 'Salep', '1 bardak salep', '🥛', 'disari', 90, 1.04],
  ['boza', 'Boza', '1 bardak boza', '🍶', 'disari', 70, 1.02],
  ['limonata', 'Limonata', '1 bardak limonata', '🍋', 'disari', 90, 1.02],
  ['latte', 'Latte', '1 latte (zincir kafe)', '🧋', 'disari', 170, 0.95],
  ['kahvalti', 'Serpme kahvaltı', '1 kişilik serpme kahvaltı', '🍳', 'disari', 750, 1.1],
  ['mercimekc', 'Mercimek çorbası', '1 kâse mercimek çorbası', '🍲', 'disari', 100, 1.04],
  ['ev', 'Ev yemeği', '1 tabak esnaf lokantası yemeği', '🍛', 'disari', 180, 1.04],
  ['kestane', 'Kestane', '100 g kebap kestane (sokakta)', '🌰', 'disari', 100, 1.06],
  ['pamuk', 'Pamuk şeker', '1 pamuk şeker', '🍭', 'disari', 40, 1.02],
  ['waffle', 'Waffle', '1 waffle', '🧇', 'disari', 250, 0.98],
  // dışarıda: hizmet, eğlence
  ['kuafor', 'Kuaför', '1 kadın fön', '💇', 'disari', 400, 1.05],
  ['konser', 'Konser', '1 konser bileti', '🎤', 'disari', 1200, 1.08],
  ['mac', 'Maç bileti', '1 futbol maçı bileti (kale arkası)', '⚽', 'disari', 900, 1.08],
  ['tiyatro', 'Tiyatro', '1 tiyatro bileti', '🎭', 'disari', 450, 1.02],
  ['muze', 'Müze', '1 müze giriş bileti', '🏛️', 'disari', 600, 1.15],
  ['lunapark', 'Lunapark', '1 lunapark jetonu', '🎡', 'disari', 100, 1.04],
  ['bowling', 'Bowling', '1 oyun bowling', '🎳', 'disari', 250, 1.0],
  ['dergi', 'Dergi', '1 aylık dergi', '📖', 'disari', 120, 1.0],
  ['defter', 'Defter', '1 spiralli defter', '📓', 'disari', 60, 1.0],
  ['kalem', 'Tükenmez kalem', '1 tükenmez kalem', '🖊️', 'disari', 20, 0.98],
  ['cicek', 'Çiçek', '1 buket çiçek', '💐', 'disari', 450, 1.03],
  ['loto', 'Piyango bileti', '1 çeyrek piyango bileti', '🎟️', 'disari', 200, 1.05],
  ['oto', 'Oto yıkama', '1 iç dış oto yıkama', '🧽', 'disari', 400, 1.04],
  ['kuru', 'Kuru temizleme', '1 takım elbise kuru temizleme', '👔', 'disari', 350, 1.04],
  ['ayakkabi', 'Ayakkabı tamiri', '1 pençe taban', '👞', 'disari', 400, 1.05],
  ['veteriner', 'Veteriner', '1 veteriner muayenesi', '🐕', 'disari', 1000, 1.06],
  ['doktor', 'Özel muayene', '1 özel hastane muayenesi', '🩺', 'disari', 2000, 1.08],
  ['dishekimi', 'Diş dolgusu', '1 diş dolgusu (özel)', '🦷', 'disari', 3000, 1.05],
  ['gozluk', 'Gözlük', '1 numaralı gözlük', '👓', 'disari', 3500, 1.0],
  ['spor', 'Spor salonu', '1 aylık spor salonu üyeliği', '🏋️', 'disari', 2000, 1.05],
  ['otopark', 'Otopark', '1 saat otopark', '🅿️', 'disari', 100, 1.08],
  // ulaşım ve ev
  ['taksi', 'Taksi', '5 km taksi yolculuğu', '🚕', 'ulasim', 250, 1.05],
  ['dolmus', 'Dolmuş', '1 dolmuş yolculuğu', '🚐', 'ulasim', 35, 1.02],
  ['metro', 'Metro', '1 metro bileti', '🚇', 'ulasim', 35, 1.02],
  ['ucak', 'Uçak bileti', '1 İstanbul–Ankara uçak bileti', '✈️', 'ulasim', 2000, 0.85],
  ['otobusbilet', 'Şehirlerarası otobüs', '1 İstanbul–Ankara otobüs bileti', '🚍', 'ulasim', 800, 0.98],
  ['tren', 'Hızlı tren', '1 İstanbul–Ankara hızlı tren bileti', '🚄', 'ulasim', 700, 0.95],
  ['motorin', 'Motorin', '1 litre motorin', '⛽', 'ulasim', 63, 1.05],
  ['lpg', 'LPG', '1 litre otogaz', '⛽', 'ulasim', 30, 1.0],
  ['kopru', 'Köprü geçişi', '1 Boğaz köprüsü geçişi', '🌉', 'ulasim', 60, 1.03],
  ['su_fatura', 'Su faturası', '10 m³ şebeke suyu', '🚿', 'ulasim', 300, 1.0],
  ['dogalgaz', 'Doğalgaz', '100 m³ doğalgaz', '🔥', 'ulasim', 900, 0.95],
  ['internet', 'Ev interneti', '1 aylık ev interneti', '🌐', 'ulasim', 500, 0.9],
  ['faturatel', 'Cep telefonu faturası', '1 aylık cep telefonu paketi', '📶', 'ulasim', 400, 0.9],
  ['kira', 'Kira', '2+1 dairede 1 aylık kira (İstanbul)', '🏠', 'ulasim', 25000, 1.15],
  ['aidat', 'Aidat', '1 aylık apartman aidatı', '🏢', 'ulasim', 1500, 1.05],
  ['kombi', 'Kombi bakımı', '1 kombi bakımı', '🔧', 'ulasim', 1500, 1.05],
  ['tesisatci', 'Tesisatçı', '1 tesisatçı çağırma', '🪠', 'ulasim', 1000, 1.05],
  ['boya', 'Boya', '15 litre iç cephe boyası', '🎨', 'ulasim', 2200, 1.02],
  ['kargo', 'Kargo', '1 küçük koli kargo', '📦', 'ulasim', 150, 1.0],
  ['pul', 'Mektup pulu', '1 yurt içi mektup pulu', '✉️', 'ulasim', 30, 1.02],
  ['ehliyet', 'Ehliyet kursu', '1 ehliyet kursu', '🪪', 'ulasim', 25000, 1.06],
  ['pasaport', 'Pasaport harcı', '10 yıllık pasaport harcı', '🛂', 'ulasim', 9000, 1.05],
  ['kasko', 'Trafik sigortası', '1 yıllık trafik sigortası', '🛡️', 'ulasim', 9000, 1.05],
  // büyük alımlar
  ['camasirm', 'Çamaşır makinesi', '1 çamaşır makinesi', '🫧', 'buyuk', 22000, 0.97],
  ['bulasikm', 'Bulaşık makinesi', '1 bulaşık makinesi', '🍽️', 'buyuk', 20000, 0.97],
  ['tv', 'Televizyon', '1 televizyon (orta segment)', '📺', 'buyuk', 20000, 0.8],
  ['laptop', 'Dizüstü bilgisayar', '1 dizüstü bilgisayar (orta seviye)', '💻', 'buyuk', 35000, 0.85],
  ['firin', 'Fırın', '1 ankastre fırın', '♨️', 'buyuk', 15000, 0.98],
  ['supurge', 'Elektrikli süpürge', '1 elektrikli süpürge', '🌪️', 'buyuk', 7000, 0.95],
  ['klima', 'Klima', '1 klima (12.000 BTU)', '❄️', 'buyuk', 30000, 0.95],
  ['kanepe', 'Koltuk takımı', '1 koltuk takımı', '🛋️', 'buyuk', 45000, 1.03],
  ['yatak', 'Yatak', '1 çift kişilik yatak', '🛏️', 'buyuk', 15000, 1.0],
  ['hali', 'Halı', '1 salon halısı', '🧶', 'buyuk', 8000, 1.0],
  ['takim', 'Takım elbise', '1 takım elbise', '🤵', 'buyuk', 6000, 1.0],
  ['mont', 'Mont', '1 kışlık mont', '🧥', 'buyuk', 3500, 1.0],
  ['kot', 'Kot pantolon', '1 kot pantolon', '👖', 'buyuk', 1200, 0.97],
  ['tisort', 'Tişört', '1 basic tişört', '👕', 'buyuk', 350, 0.95],
  ['spor_ayakkabi', 'Spor ayakkabı', '1 çift spor ayakkabı', '👟', 'buyuk', 3500, 1.0],
  ['saat', 'Kol saati', '1 kol saati (orta segment)', '⌚', 'buyuk', 4000, 0.97],
  ['ceyrek', 'Çeyrek altın', '1 çeyrek altın', '🪙', 'buyuk', 9600, 1.17],
  ['bilezik', 'Bilezik', '1 adet 22 ayar bilezik (10 g)', '💍', 'buyuk', 62000, 1.17],
  ['motosiklet', 'Motosiklet', '1 küçük motosiklet (125 cc)', '🛵', 'buyuk', 70000, 1.0],
  ['ikinciel', 'İkinci el otomobil', '1 on yaşında ikinci el otomobil', '🚙', 'buyuk', 700000, 1.12],
  ['daire', 'Daire', '2+1 daire (İstanbul, orta semt)', '🏘️', 'buyuk', 6000000, 1.15],
  ['tatil', 'Yaz tatili', '1 hafta her şey dahil otel (2 kişi)', '🏖️', 'buyuk', 50000, 1.08],
  ['dugun', 'Düğün salonu', '1 düğün salonu kirası', '💒', 'buyuk', 150000, 1.1],
  ['konsol', 'Oyun konsolu', '1 oyun konsolu', '🎮', 'buyuk', 25000, 0.9],
  ['tablet', 'Tablet', '1 tablet (orta seviye)', '📲', 'buyuk', 12000, 0.85],
  ['kulaklik', 'Kulaklık', '1 kablosuz kulaklık', '🎧', 'buyuk', 2500, 0.85],
  ['fotomakine', 'Fotoğraf makinesi', '1 fotoğraf makinesi', '📷', 'buyuk', 30000, 0.85],
  ['gitar', 'Gitar', '1 klasik gitar', '🎸', 'buyuk', 4000, 0.98],
  ['okul', 'Okul çantası', '1 okul çantası', '🎒', 'buyuk', 1200, 1.0],
  ['universite', 'Özel üniversite', '1 yıl özel üniversite', '🎓', 'buyuk', 600000, 1.06],
];
export const ITEMS: Item[] = [
  ...BASE_ITEMS,
  ...RAW.map(([id, name, unit, emoji, cat, now, k]) => ({ id, name, unit, emoji, cat, prices: est(now, k) })),
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
  { id: 'kontor', name: 'Kontör', unit: '50 kontör yükleme kartı', emoji: '📟', tag: 'Kontörlü hat', prices: { 2002: 5, 2005: 7, 2009: 10 }, now: null, nowNote: 'artık paket alınıyor' },
  { id: 'tuslu', name: 'Tuşlu telefon', unit: '1 tuşlu cep telefonu', emoji: '📞', tag: 'Yeni teknoloji', prices: { 2002: 250, 2005: 200, 2009: 120 }, now: 1200 },
  { id: 'walkman', name: 'Walkman', unit: '1 kasetçalar walkman', emoji: '📻', tag: 'Kaset → CD', prices: { 2002: 40 }, now: null, nowNote: 'müzik telefona taşındı' },
  { id: 'filmrulo', name: 'Fotoğraf filmi', unit: '36 pozluk fotoğraf filmi', emoji: '🎞️', tag: 'Banyo ettir', prices: { 2002: 4, 2005: 5 }, now: 450 },
  { id: 'banyo', name: 'Fotoğraf banyosu', unit: '36 poz fotoğraf baskısı', emoji: '🖼️', tag: 'Banyo ettir', prices: { 2002: 8, 2005: 10, 2009: 12 }, now: 600 },
  { id: 'vcd', name: 'VCD film', unit: '1 VCD film', emoji: '💿', tag: 'Video kulübü', prices: { 2002: 5, 2005: 6 }, now: null, nowNote: 'VCD oynatıcı kalmadı' },
  { id: 'atari', name: 'Atari kaseti', unit: '1 oyun kaseti', emoji: '🕹️', tag: 'Atari salonu', prices: { 2002: 6 }, now: null, nowNote: 'oyunlar indiriliyor' },
  { id: 'jeton', name: 'Atari jetonu', unit: '1 atari salonu jetonu', emoji: '🪙', tag: 'Atari salonu', prices: { 2002: 0.25, 2005: 0.5 }, now: null, nowNote: 'salonlar kapandı' },
  { id: 'crt', name: 'Tüplü televizyon', unit: '1 tüplü televizyon (72 cm)', emoji: '📺', tag: 'Ev', prices: { 2002: 400, 2005: 450 }, now: null, nowNote: 'ince ekranlar geldi' },
  { id: 'modem', name: 'Çevirmeli modem', unit: '1 adet 56k modem', emoji: '📠', tag: 'Çevirmeli günler', prices: { 2002: 60 }, now: null, nowNote: 'fiber geldi' },
  { id: 'adsl', name: 'ADSL', unit: '1 aylık 1 Mbit ADSL', emoji: '🌐', tag: 'Hızlı internet', prices: { 2005: 60, 2009: 40 }, now: null, nowNote: 'fiber ve 5G çağı' },
  { id: 'msnpc', name: 'Web kamerası', unit: '1 web kamerası', emoji: '📹', tag: 'MSN günleri', prices: { 2005: 40, 2009: 30 }, now: 900 },
  { id: 'kamera', name: 'Dijital kamera', unit: '1 dijital fotoğraf makinesi (8 MP)', emoji: '📷', tag: 'Yeni teknoloji', prices: { 2005: 450, 2009: 350 }, now: null, nowNote: 'telefon kamerası yetiyor' },
  { id: 'tablo', name: 'GPS cihazı', unit: '1 araç GPS cihazı', emoji: '🗺️', tag: 'Yeni teknoloji', prices: { 2009: 350, 2012: 250 }, now: null, nowNote: 'harita telefonda' },
  { id: 'blackberry', name: 'Klavyeli telefon', unit: '1 klavyeli akıllı telefon', emoji: '⌨️', tag: 'Yeni teknoloji', prices: { 2009: 900, 2012: 800 }, now: null, nowNote: 'dokunmatik kazandı' },
  { id: '3dgozluk', name: '3D gözlük', unit: '1 sinema 3D gözlüğü', emoji: '🥽', tag: '3D sineması', prices: { 2009: 3, 2012: 3 }, now: null, nowNote: 'moda geçti' },
  { id: 'kilif', name: 'Telefon kılıfı', unit: '1 silikon telefon kılıfı', emoji: '📱', tag: 'Aksesuar', prices: { 2012: 15, 2016: 20, 2018: 25 }, now: 250 },
  { id: 'powerbank', name: 'Taşınabilir şarj', unit: '1 taşınabilir şarj (10.000 mAh)', emoji: '🔋', tag: 'Yeni teknoloji', prices: { 2016: 60, 2018: 80, 2020: 120, 2022: 300 }, now: 900 },
  { id: 'pokemon', name: 'Mobil oyun parası', unit: '1 paket oyun içi para', emoji: '👾', tag: 'Mobil oyun çılgınlığı', prices: { 2016: 10, 2018: 15 }, now: 120 },
  { id: 'slime', name: 'Slaym', unit: '1 kutu slaym', emoji: '🟢', tag: 'Moda', prices: { 2018: 8, 2020: 12 }, now: 80 },
  { id: 'unicorn', name: 'Unicorn çanta', unit: '1 unicorn desenli çocuk çantası', emoji: '🦄', tag: 'Moda', prices: { 2018: 60 }, now: 600 },
  { id: 'zoom', name: 'Kulaklıklı mikrofon', unit: '1 kulaklıklı mikrofon', emoji: '🎙️', tag: 'Evden çalışma', prices: { 2020: 150, 2022: 300 }, now: 900 },
  { id: 'eldiven', name: 'Tek kullanımlık eldiven', unit: '100\'lü eldiven', emoji: '🧤', tag: 'Salgın', prices: { 2020: 35 }, now: 120 },
  { id: 'puzzle', name: 'Yapboz', unit: '1000 parça yapboz', emoji: '🧩', tag: 'Evde kal', prices: { 2020: 60 }, now: 450, soldOut: [2020] },
  { id: 'unk', name: 'Ekmek unu', unit: '1 kg ekmeklik un', emoji: '🌾', tag: 'Evde ekmek', prices: { 2020: 5 }, now: 40 },
  { id: 'altinyag', name: 'Ayçiçek yağı 5 L', unit: '5 litre ayçiçek yağı', emoji: '🛢️', tag: 'Kuyruk', prices: { 2022: 180 }, now: 420 },
  { id: 'euro', name: 'Euro', unit: '1 euro (döviz bürosu)', emoji: '💶', tag: 'Kur krizi', prices: { 2018: 5.6, 2022: 17.5 }, now: 50 },
  { id: 'elscooter', name: 'Kiralık scooter', unit: '10 dakika elektrikli scooter', emoji: '🛴', tag: 'Yeni ulaşım', prices: { 2020: 10, 2022: 25 }, now: 80 },
  { id: 'kripto', name: 'Kripto kart', unit: '1 kripto para hediye kartı', emoji: '🪙', tag: 'Kripto çılgınlığı', prices: { 2022: 100 }, now: 100 },
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
