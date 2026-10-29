/*
 * Köy Bakkalı: oyuncu fiyatı kafasına göre söyler. Her ürünün gizli bir market fiyatı (M) ve
 * bakkalın toptancıdan aldığı maliyeti (K) vardır; her müşterinin de M'nin üstünde razı olduğu
 * gizli bir tavanı. Fiyatlar her gün biraz artar; her ürünün kendi zam hızı ve kendi zam
 * sıçramaları vardır (çaya ara ara büyük zam gelir, süt her gün azar azar pahalanır). M'ye kadar müşteri sevinerek alır, tavana kadar söylenerek alır, tavanı
 * aşınca pazarlık eder, ikinci kez aşınca gider. Oyuncu tepkilerden fiyatları bulur.
 *
 * Köyün kendisi de oyunda: müşteriler adı olan, geri gelen köylülerdir ve geçen seferi hatırlar;
 * bazen birkaç şey birden ister, bazen veresiye yazdırır. Her günün havası ve bir köy olayı vardır.
 * Tezgâhtaki kedi yalnızca uyur.
 * Bu dosya saf mantıktır: rastgelelik tohumlu, test edilebilir.
 */

import type { Account, Dilemma } from './week';

export interface Product {
  id: string;
  name: string;
  emoji: string;
  /** Gizli market fiyatı (TL). */
  market: number;
  /** Toptancı maliyeti (TL): bunun altı zarar. */
  cost: number;
  /** Günlük sessiz zam (0,01 = günde %1). */
  drift: number;
  /** Zam sıçraması: ilk gün `first`, sonra her `every` günde bir `step` kadar. */
  step?: number;
  every?: number;
  first?: number;
}

export const PRODUCTS: Product[] = [
  { id: 'ekmek', name: 'Ekmek', emoji: '🍞', market: 15, cost: 10, drift: 0.004, step: 0.15, every: 12, first: 9 },
  { id: 'sut', name: 'Süt (1 lt)', emoji: '🥛', market: 42, cost: 31, drift: 0.012 },
  { id: 'yumurta', name: "Yumurta (10'lu)", emoji: '🥚', market: 87, cost: 63, drift: 0.006, step: 0.12, every: 7, first: 4 },
  { id: 'meyvesuyu', name: 'Meyve suyu', emoji: '🧃', market: 50, cost: 35, drift: 0.005, step: 0.08, every: 10, first: 6 },
  { id: 'cay', name: 'Çay (500 g)', emoji: '🍵', market: 123, cost: 91, drift: 0, step: 0.18, every: 8, first: 3 },
  { id: 'seker', name: 'Toz şeker (1 kg)', emoji: '🧂', market: 46, cost: 34, drift: 0.014 },
  { id: 'cikolata', name: 'Çikolata', emoji: '🍫', market: 27, cost: 17, drift: 0.008, step: 0.1, every: 9, first: 5 },
  { id: 'sabun', name: 'Sabun', emoji: '🧼', market: 30, cost: 20, drift: 0.003, step: 0.1, every: 15, first: 8 },
  { id: 'makarna', name: 'Makarna', emoji: '🍝', market: 20, cost: 13, drift: 0.007, step: 0.1, every: 11, first: 7 },
  { id: 'peynir', name: 'Beyaz peynir (500 g)', emoji: '🧀', market: 163, cost: 121, drift: 0.016, step: 0.1, every: 14, first: 10 },
];

export interface CustomerType {
  id: string;
  name: string;
  emoji: string;
  /** Sahnedeki gövde rengi. */
  color: string;
  /** Tavan = market × bu çarpan. */
  ceiling: number;
  /** Bu tip ucuz fiyata ne kadar sevinir (itibar etkisi çarpanı). */
  gossip: number;
  /** Bu tip hangi ürünleri ister (boşsa hepsi). */
  wants?: string[];
}

export const CUSTOMERS: CustomerType[] = [
  { id: 'teyze', name: 'Emekli teyze', emoji: '👵', color: '#8e6fa8', ceiling: 1.1, gossip: 2 },
  { id: 'muhtar', name: 'Muhtar', emoji: '👨🏻‍🦳', color: '#4f5d73', ceiling: 1.5, gossip: 1.5 },
  { id: 'ciftci', name: 'Çiftçi', emoji: '👨‍🌾', color: '#5f8a4c', ceiling: 1.25, gossip: 1 },
  { id: 'turist', name: 'Şehirli turist', emoji: '🧑‍💼', color: '#2f6fb5', ceiling: 1.6, gossip: 0.3 },
  { id: 'cocuk', name: 'Çocuk', emoji: '🧒', color: '#e0703a', ceiling: 1.15, gossip: 1, wants: ['cikolata', 'meyvesuyu', 'ekmek', 'makarna'] },
  { id: 'genc', name: 'Genç', emoji: '🧑', color: '#3d7f8c', ceiling: 1.2, gossip: 0.8, wants: ['cikolata', 'meyvesuyu', 'makarna', 'ekmek', 'sut', 'sabun'] },
  { id: 'ogretmen', name: 'Öğretmen', emoji: '👩‍🏫', color: '#7a5c3e', ceiling: 1.3, gossip: 1.3 },
  { id: 'coban', name: 'Çoban', emoji: '🐑', color: '#6b5a3a', ceiling: 1.15, gossip: 0.6, wants: ['ekmek', 'peynir', 'cay', 'seker', 'makarna'] },
  { id: 'gelin', name: 'Genç gelin', emoji: '👰', color: '#b0567a', ceiling: 1.2, gossip: 1.6 },
  { id: 'emekli', name: 'Emekli amca', emoji: '👴', color: '#6d6a5f', ceiling: 1.1, gossip: 1.8 },
];

export const typeOf = (id: string) => CUSTOMERS.find((c) => c.id === id)!;

/**
 * Köylünün görünüşü: giysi rengi ve tipinin varsayılanını değiştiren ayrıntılar. Aynı tipten iki
 * köylü sahnede birbirine benzemesin diye her birinin kendi başörtüsü, şapkası, bıyığı vardır.
 */
export interface Look {
  outfit: string;
  skin?: string;
  /** Saç rengi (başörtüsü ya da şapka yoksa görünür). */
  hair?: string;
  /** Başörtüsü rengi. */
  scarf?: string;
  hat?: 'kasket' | 'takke' | 'bere' | 'sapka' | 'kep';
  hatColor?: string;
  glasses?: boolean;
  sunglasses?: boolean;
  mustache?: string;
  beard?: string;
  /** Uzun saç ya da at kuyruğu. */
  long?: boolean;
}

/** Köyün tanıdık yüzleri: her biri bir müşteri tipindendir; borcunu ödeme olasılığı farklıdır. */
export interface Villager {
  id: string;
  name: string;
  type: string;
  /** Veresiye borcunu ertesi günlerde ödeme olasılığı (0: hiç veresiye istemez). */
  pays: number;
  look: Look;
}

export const VILLAGERS: Villager[] = [
  { id: 'ayse', name: 'Ayşe Teyze', type: 'teyze', pays: 0.95, look: { outfit: '#8e6fa8', scarf: '#c46b6b' } },
  { id: 'fatma', name: 'Fatma Teyze', type: 'teyze', pays: 0.75, look: { outfit: '#5a7a9a', scarf: '#e3d9c4', glasses: true } },
  { id: 'hatice', name: 'Hatice Nine', type: 'teyze', pays: 0.9, look: { outfit: '#4a4a52', scarf: '#f2efe6', glasses: true, skin: '#e2b896' } },
  { id: 'zehra', name: 'Zehra Teyze', type: 'teyze', pays: 0.65, look: { outfit: '#a0663e', scarf: '#6f9a4f' } },
  { id: 'emine', name: 'Emine Teyze', type: 'teyze', pays: 0.85, look: { outfit: '#3f6d6a', scarf: '#a77bc4' } },
  { id: 'nazmiye', name: 'Nazmiye Nine', type: 'teyze', pays: 0.8, look: { outfit: '#2f2f38', scarf: '#3b3b44', skin: '#dcb08e' } },
  { id: 'hasan', name: 'Muhtar Hasan', type: 'muhtar', pays: 0.9, look: { outfit: '#4f5d73', hair: '#d6d6d6', mustache: '#d6d6d6' } },
  { id: 'imam', name: 'İmam Yusuf', type: 'muhtar', pays: 0.95, look: { outfit: '#5c6a5a', hat: 'takke', hatColor: '#f4f1e8', beard: '#5a4a3a' } },
  { id: 'riza', name: 'Rıza Amca', type: 'ciftci', pays: 0.55, look: { outfit: '#5f8a4c', hat: 'kasket', hatColor: '#5a6650', mustache: '#3a2a1a' } },
  { id: 'mehmet', name: 'Mehmet Abi', type: 'ciftci', pays: 0.8, look: { outfit: '#2f6a8a', hat: 'kasket', hatColor: '#3c3c3c', mustache: '#2a1d14' } },
  { id: 'osman', name: 'Osman Emmi', type: 'ciftci', pays: 0.7, look: { outfit: '#7a6a4a', hat: 'kasket', hatColor: '#6a5a44', beard: '#bdb6a8' } },
  { id: 'ismail', name: 'İsmail Amca', type: 'ciftci', pays: 0.85, look: { outfit: '#8a4a3a', hair: '#9a948a', mustache: '#6a645a' } },
  { id: 'kadir', name: 'Traktörcü Kadir', type: 'ciftci', pays: 0.6, look: { outfit: '#c25b2a', hat: 'kep', hatColor: '#2e5d9a', beard: '#2a1d14' } },
  { id: 'ali', name: 'Küçük Ali', type: 'cocuk', pays: 0.5, look: { outfit: '#e0703a', hat: 'kep', hatColor: '#e0b13a', hair: '#2a1d14' } },
  { id: 'elif', name: 'Küçük Elif', type: 'cocuk', pays: 0.7, look: { outfit: '#d65a8a', hair: '#6a3a1a', long: true } },
  { id: 'emre', name: 'Küçük Emre', type: 'cocuk', pays: 0.6, look: { outfit: '#3a7ac0', hat: 'bere', hatColor: '#c0392b' } },
  { id: 'zeynep', name: 'Küçük Zeynep', type: 'cocuk', pays: 0.65, look: { outfit: '#f0b43a', hair: '#2a1d14', long: true, glasses: true } },
  { id: 'kerem', name: 'Üniversiteli Kerem', type: 'genc', pays: 0.45, look: { outfit: '#3d7f8c', hair: '#1d1612', glasses: true } },
  { id: 'busra', name: 'Büşra', type: 'genc', pays: 0.6, look: { outfit: '#9a5ab0', hair: '#4a2a14', long: true } },
  { id: 'murat', name: 'Motorcu Murat', type: 'genc', pays: 0.35, look: { outfit: '#2a2a2a', hat: 'bere', hatColor: '#4a4a4a', mustache: '#1d1612' } },
  { id: 'selma', name: 'Selma Öğretmen', type: 'ogretmen', pays: 0.95, look: { outfit: '#7a5c3e', hair: '#5a3a22', long: true, glasses: true } },
  { id: 'burak', name: 'Burak Öğretmen', type: 'ogretmen', pays: 0.9, look: { outfit: '#4a5a7a', hair: '#2a1d14', beard: '#2a1d14', glasses: true } },
  { id: 'veli', name: 'Çoban Veli', type: 'coban', pays: 0.6, look: { outfit: '#6b5a3a', hat: 'sapka', hatColor: '#4a3a24', beard: '#3a2a1a', skin: '#b98260' } },
  { id: 'durmus', name: 'Çoban Durmuş', type: 'coban', pays: 0.5, look: { outfit: '#55603f', hat: 'kasket', hatColor: '#2f2f2f', mustache: '#8a8478', skin: '#b98260' } },
  { id: 'sevgi', name: 'Gelin Sevgi', type: 'gelin', pays: 0.85, look: { outfit: '#b0567a', scarf: '#f0c24a' } },
  { id: 'merve', name: 'Gelin Merve', type: 'gelin', pays: 0.75, look: { outfit: '#4a8a6a', scarf: '#e8a4b8' } },
  { id: 'huseyin', name: 'Emekli Hüseyin', type: 'emekli', pays: 0.9, look: { outfit: '#6d6a5f', hair: '#e6e6e6', mustache: '#e6e6e6', glasses: true } },
  { id: 'cemal', name: 'Kahveci Cemal', type: 'emekli', pays: 0.7, look: { outfit: '#8a3a3a', hat: 'kasket', hatColor: '#5a5a5a', mustache: '#9a9a9a' } },
  { id: 'selin', name: 'Turist Selin', type: 'turist', pays: 0, look: { outfit: '#2f6fb5', hair: '#c9a04a', long: true, sunglasses: true } },
  { id: 'can', name: 'Turist Can', type: 'turist', pays: 0, look: { outfit: '#e0e0d8', hat: 'sapka', hatColor: '#d9c08a', sunglasses: true } },
  { id: 'turist', name: 'Şehirli turist', type: 'turist', pays: 0, look: { outfit: '#4a4a52', hair: '#2a1d14', glasses: true } },
  { id: 'jonas', name: 'Bisikletli Jonas', type: 'turist', pays: 0, look: { outfit: '#d9a72a', hair: '#e8d08a', beard: '#c9a04a', skin: '#f3d6c2' } },
];

export const START_REPUTATION = 60;
/** Köy unutur: itibar her sabah başlangıç değerine doğru bu kadar döner. */
export const REP_DRIFT = 3;
export const forget = (rep: number) => rep + Math.sign(START_REPUTATION - rep) * Math.min(REP_DRIFT, Math.abs(START_REPUTATION - rep));
/** Dükkânın açık olduğu saatler: ilk müşteri açılışta, son müşteri kapanıştan önce gelir. */
export const OPEN_HOUR = 8;
export const CLOSE_HOUR = 19;

/** Tohumlu rastgele sayı (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** O güne kadar gelen zam sıçramalarının sayısı. */
const jumps = (p: Product, day: number) => (p.step && p.every && p.first && day >= p.first ? Math.floor((day - p.first) / p.every) + 1 : 0);

/** Ürünün ilk güne göre pahalanma çarpanı: günlük sessiz zam ve zam sıçramaları. */
export const factorOn = (p: Product, day: number) => (1 + p.drift) ** (Math.max(1, day) - 1) * (1 + (p.step ?? 0)) ** jumps(p, day);

/** O günün market fiyatı ve maliyeti; maliyet market fiyatının altında kalır. */
export function priceOn(p: Product, day: number): { market: number; cost: number } {
  const f = factorOn(p, day);
  const market = Math.round(p.market * f);
  return { market, cost: Math.min(market - 1, Math.round(p.cost * f)) };
}

/** Bu gün zam sıçraması gelen ürünler (radyo bir gün önceden haber verir). */
export const hikesOn = (day: number) => PRODUCTS.filter((p) => jumps(p, day) > jumps(p, day - 1));

/** Sepetin toplam market fiyatı ve maliyeti. */
export function basketOn(items: Product[], day: number) {
  return items.reduce(
    (s, p) => {
      const x = priceOn(p, day);
      return { market: s.market + x.market, cost: s.cost + x.cost };
    },
    { market: 0, cost: 0 },
  );
}

export const ceilingOf = (market: number, c: { ceiling: number }) => Math.round(market * c.ceiling);

// --- hava ve köy olayları ---

export type Weather = 'sunny' | 'cloudy' | 'rain' | 'snow';

export const WEATHER: Record<Weather, { label: string; crowd: number }> = {
  sunny: { label: '☀️ Güneşli', crowd: 0 },
  cloudy: { label: '☁️ Bulutlu', crowd: 0 },
  rain: { label: '🌧 Yağmurlu', crowd: -2 },
  snow: { label: '❄️ Karlı', crowd: -3 },
};

/** Günün havası: ilk gün hep güneşli, sonra tohumdan. */
export function weatherOn(seed: number, day: number): Weather {
  if (day === 1) return 'sunny';
  const x = rng(seed * 7 + day * 13)();
  return x < 0.45 ? 'sunny' : x < 0.72 ? 'cloudy' : x < 0.93 ? 'rain' : 'snow';
}

export interface VillageEvent {
  title: string;
  text: string;
  /** Tavan çarpanına eklenir. */
  ceiling?: number;
  /** Günün müşteri sayısına eklenir. */
  crowd?: number;
  /** Bu ürünler o gün daha çok istenir. */
  favor?: string[];
}

/** İlk günün olayı: yeni bakkalın açılışı. */
export const OPENING: VillageEvent = { title: 'Kepenk açılışı', text: 'Hacı Emmi hacca gitti, dükkân sana emanet. Köy yeni bakkalı merak ediyor.' };

/** Sonraki günlerin olayları tohumdan seçilir; sıradan gün daha sık çıkar. */
export const EVENT_POOL: VillageEvent[] = [
  { title: 'Sıradan bir gün', text: 'Köyde hayat akıp gidiyor.' },
  { title: 'Sıradan bir gün', text: 'Köyde hayat akıp gidiyor.' },
  { title: 'Düğün var!', text: 'Herkes şeker, çay ve meyve suyu peşinde; kese açık, pahalıya da alırlar.', ceiling: 0.15, favor: ['seker', 'cay', 'meyvesuyu'] },
  { title: 'Kasabada indirim', text: 'Zincir market kampanya yapıyor: kimse fazla para vermek istemiyor.', ceiling: -0.1 },
  { title: 'Pazar günü', text: 'Köy pazarı kuruldu, yollar kalabalık.', crowd: 2 },
  { title: 'Hasat zamanı', text: 'Tarladan para geldi, çiftçinin eli rahat.', ceiling: 0.05, crowd: 1, favor: ['ekmek', 'peynir', 'cay'] },
  { title: 'Okullar açıldı', text: 'Çocuklar beslenme peşinde.', crowd: 1, favor: ['cikolata', 'meyvesuyu', 'makarna'] },
  { title: 'Cenaze var', text: 'Köyde helva kavruluyor, çay demleniyor.', crowd: -1, favor: ['cay', 'seker'] },
  { title: 'Bayram', text: 'Gurbetçiler köye döndü, kapı kapı bayram ziyareti: dükkân kalabalık, herkes çikolata, şeker peşinde.', ceiling: 0.05, crowd: 2, favor: ['cikolata', 'seker'] },
  { title: 'Yayla göçü', text: 'Köyün yarısı yaylaya çıktı.', crowd: -2 },
];

export function eventOn(seed: number, day: number): VillageEvent {
  if (day <= 1) return OPENING;
  return EVENT_POOL[Math.floor(rng(seed * 53 + day * 7)() * EVENT_POOL.length)];
}

/** İtibara, havaya ve olaya göre günün müşteri sayısı: 3 ile 12 arası. */
export function customersFor(reputation: number, event?: VillageEvent, weather: Weather = 'sunny'): number {
  const base = 4 + Math.round(reputation / 16) + WEATHER[weather].crowd + (event?.crowd ?? 0);
  return Math.max(3, Math.min(12, base));
}

// --- müşteri hafızası ---

/** Köylünün dükkânla geçmişi: kaç kez geldi, ne kadar kazıklandı, kaç kez sevindi. */
export interface Memory {
  visits: number;
  grudge: number;
  happy: number;
}

export type Memories = Record<string, Memory>;

const EMPTY: Memory = { visits: 0, grudge: 0, happy: 0 };

/** Hafızaya bir ziyaret işler: söylenmek ve gitmek kin, sevinmek sadakat bırakır ve bir kini sildirir. Turist unutur. */
// `mild`: market fiyatına yakın söylenme kin bırakmaz
export function remember(m: Memories, who: string, mood: Mood, mild = false): Memories {
  if (VILLAGERS.find((v) => v.id === who)?.type === 'turist') return m;
  const cur = m[who] ?? EMPTY;
  return {
    ...m,
    [who]: {
      visits: cur.visits + 1,
      grudge: Math.max(0, cur.grudge + (mood === 'leave' ? 2 : mood === 'grumble' && !mild ? 1 : mood === 'happy' ? -1 : 0)),
      happy: cur.happy + (mood === 'happy' ? 1 : 0),
    },
  };
}

/**
 * Müşterinin o günkü etkin tipi: köy olayı tavanı oynatır, kin tavanı düşürür, sadakat biraz
 * yükseltir. Tavan market fiyatının altına inmez.
 */
export function effectiveType(c: CustomerType, event?: VillageEvent, mem?: Memory): CustomerType {
  const m = mem ?? EMPTY;
  const ceiling = c.ceiling + (event?.ceiling ?? 0) - 0.05 * Math.min(m.grudge, 4) + 0.02 * Math.min(m.happy, 3);
  return { ...c, ceiling: Math.max(1.02, Math.round(ceiling * 100) / 100) };
}

/** İlk gelişte söylenen söz: tipine göre; olmayan tip köylünün genel selamını verir. */
const FIRST: Record<string, string> = {
  cocuk: 'Abi, annem gönderdi.',
  genc: 'Selam! Hacı Emmi hacca mı gitti, doğru mu?',
  ogretmen: 'Günaydın, okula giderken uğradım.',
  coban: 'Sürüyü yamaçta bıraktım, çabuk olalım.',
  gelin: 'Kolay gelsin, kaynanam gönderdi.',
  emekli: 'Kahveden geliyorum, seni konuşuyorlar.',
};

/** Kapıdan girerken söylenen söz: geçen seferi hatırlar. Çocuk annesinin ağzından konuşur. */
export function greetingFor(v: Villager, mem?: Memory): string {
  if (v.type === 'turist') return 'Merhaba, buralı değilim de…';
  const kid = v.type === 'cocuk';
  if (!mem || mem.visits === 0) return FIRST[v.type] ?? 'Hayırlı işler, yeni bakkal sen misin?';
  if (mem.grudge >= 2) return kid ? 'Annem geçen sefer "çok pahalı almışsın" diye kızdı.' : 'Geçen sefer kazıkladın beni, bu sefer gözüm üstünde!';
  if (mem.grudge > mem.happy) return kid ? 'Yine ben geldim. Bu sefer ucuz olsun ama.' : 'Yine ben geldim. Bu sefer insaflı ol.';
  if (mem.happy > 0) return kid ? 'Abi, annem senin dükkânı sevdi!' : 'Senin fiyatların iyi, yine geldim!';
  return kid ? 'Yine ben geldim abi.' : 'Ben yine geldim.';
}

// --- günün müşterileri ---

export interface Visit {
  villager: Villager;
  customer: CustomerType;
  /** İstenen ürünler: bir, iki ya da üç tane (eski hesap ve borç isteyen ziyarette boş). */
  items: Product[];
  /** Satış olursa veresiye yazdırmak ister mi. */
  credit: boolean;
  /** Alışveriş değil, Hacı Emmi'nin defterindeki eski hesabı görmeye geldi (week.ts). */
  account?: Account;
  /** Bu ziyarette bir ikilem çıkar (week.ts). */
  dilemma?: Dilemma;
}

/**
 * Günün müşterileri: tohumdan; sayı itibara, havaya ve olaya göre. Her köylü günde en fazla bir
 * kez gelir: kim geleceği köy karıştırılarak seçilir, tanıdıklar başka günlerde yine uğrar.
 */
export function dayVisits(seed: number, day: number, reputation: number, weather: Weather = weatherOn(seed, day)): Visit[] {
  const r = rng(seed * 31 + day);
  const event = eventOn(seed, day);
  const favor = event.favor;
  const village = [...VILLAGERS];
  for (let i = village.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [village[i], village[j]] = [village[j], village[i]];
  }
  return village.slice(0, customersFor(reputation, event, weather)).map((villager) => {
    const customer = typeOf(villager.type);
    let pool = customer.wants ? PRODUCTS.filter((p) => customer.wants!.includes(p.id)) : PRODUCTS;
    // olay günü istenen ürünler havuza bir kez daha girer: daha sık çıkar
    if (favor && !customer.wants) pool = [...pool, ...PRODUCTS.filter((p) => favor.includes(p.id))];
    const x = r();
    const count = customer.wants ? 1 : x < 0.6 ? 1 : x < 0.88 ? 2 : 3;
    const items: Product[] = [];
    while (items.length < count) {
      const p = pool[Math.floor(r() * pool.length)];
      if (!items.includes(p)) items.push(p);
    }
    const credit = villager.pays > 0 && r() < 0.22;
    return { villager, customer, items, credit };
  });
}

/** Müşterinin dükkâna girdiği saat (ondalık): açılıştan kapanışa eşit aralıkla. */
export function hourOf(idx: number, total: number): number {
  return OPEN_HOUR + ((CLOSE_HOUR - OPEN_HOUR) * idx) / Math.max(1, total);
}

export const clockText = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`;

// --- tepki ---

export type Mood = 'happy' | 'grumble' | 'counter' | 'leave';

export interface Reaction {
  mood: Mood;
  /** Satıldıysa satış fiyatı. */
  sold?: number;
  /** Pazarlıkta müşterinin karşı teklifi. */
  offer?: number;
  /** İtibar değişimi. */
  rep: number;
  /** Market fiyatına yakın söylendi: itibar düşmez, kin kalmaz. */
  mild?: boolean;
}

/**
 * Müşterinin tepkisi. `second`: pazarlıktan sonraki son fiyat; bu kez tavanı aşarsa müşteri gider.
 * Karşı teklif market ile tavan arasında, tavanın altında kalır: oyuncuya ipucu verir.
 */
export function react(price: number, market: number, c: { ceiling: number; gossip: number }, second = false): Reaction {
  const ceiling = ceilingOf(market, c);
  if (price <= market) {
    // ucuz satış köyde konuşulur; çok ucuzsa daha çok
    const cheap = price <= market * 0.85 ? 2 : 1;
    return { mood: 'happy', sold: price, rep: Math.round(cheap * c.gossip) };
  }
  if (price <= ceiling) {
    // tavana yaklaştıkça daha çok söylenir; market fiyatına yakınsa söylenir ama kin tutmaz.
    // eşik karşı teklifin (aralığın %40'ı) altında: teklifi kabul etmek bedava olmasın
    const over = (price - market) / Math.max(1, ceiling - market);
    if (over <= 0.3) return { mood: 'grumble', sold: price, rep: 0, mild: true };
    return { mood: 'grumble', sold: price, rep: over > 0.7 ? -2 : -1 };
  }
  if (second) return { mood: 'leave', rep: -3 };
  const offer = Math.max(5, Math.floor((market + (ceiling - market) * 0.4) / 5) * 5);
  return { mood: 'counter', offer: Math.min(offer, ceiling), rep: 0 };
}

/**
 * Tepki sözleri müşteri tipine göre: teyze "evladım" der, çocuk annesinin verdiği parayı sayar,
 * turist şehirle karşılaştırır. Muhtar tipinde imam da var: sözler makama değil yaşa göredir.
 */
const LINES: Record<string, Record<Mood, string[]>> = {
  teyze: {
    happy: ['Ooo ucuzmuş, ver bakalım!', 'Allah bereket versin evladım.', 'Hacı Emmi bile bu kadar ucuz vermezdi.', 'Eline sağlık, al şu parayı.'],
    grumble: ['Pahalı ama neyse, ver…', 'Hacı Emmi daha ucuz verirdi bunu.', 'Hmm… peki, ver bakalım.', 'Emekli maaşıyla zor ama ver.'],
    counter: ['Olmaz o kadar evladım! {offer} lira olur mu?', 'Yok yok, {offer} veririm, o kadar.', 'Biraz in aşağı, {offer} lira olsun.'],
    leave: ['Kasabadan alırım ben, sağ ol!', 'Bu köyde vicdan kalmamış.', 'Hacı Emmi dönsün, ondan alırım.'],
  },
  muhtar: {
    happy: ['Hayırlı satışlar, bereketli olsun.', 'Güzel fiyat, kahvede söylerim.', 'Böyle esnaf az kaldı.', 'Hakkını helal et, al bakalım.'],
    grumble: ['Biraz tuzlu ama hayırlı olsun.', 'Pahalı… neyse, ver.', 'Hacı Emmi daha insaflıydı.', 'Bu fiyatı kahvede konuşurlar, haberin olsun.'],
    counter: ['Gel şunu {offer} yapalım, ikimiz de kazanalım.', '{offer} lira, son sözüm.', 'Olmaz öyle, {offer} veririm.'],
    leave: ['Bu fiyatla olmaz, kusura bakma.', 'Esnaflık böyle olmaz evladım.', 'Bir düşün bakalım. Hayırlı işler.'],
  },
  ciftci: {
    happy: ['Ooo ucuzmuş, ver bakalım!', 'Bereketli olsun, hemen alıyorum.', 'Kasabada bunun iki katı!', 'Hemen alıyorum, fikrini değiştirme.'],
    grumble: ['Pahalı ama neyse, ver…', 'Mazot zamlandı, bu da zamlandı…', 'Hmm… peki, ver bakalım.', 'Biz mahsulü yok pahasına veriyoruz, sen pahalı satıyorsun.'],
    counter: ['Olmaz o kadar! {offer} lira olur mu?', 'Yok yok, {offer} veririm, o kadar.', 'Aşağı in biraz, {offer} lira de alayım.'],
    leave: ['Traktörle kasabaya inerim, oradan alırım.', 'Bu fiyata almam, sağ ol.', 'Bir daha gelmem buraya!'],
  },
  cocuk: {
    happy: ['Yaşasın, param yetti!', 'Teşekkürler abi!', 'Üstü bende kalıyor, annem izin verdi!', 'Hemen alıyorum!'],
    grumble: ['Annemin verdiği para zor yetti…', 'Iıı… pahalıymış ama tamam.', 'Harçlığımın hepsi gitti.', 'Peki… ver.'],
    counter: ['Annem {offer} lira verdi, o kadar param var.', 'Cebimde {offer} lira var, olur mu?', '{offer} lira yapsan? Lütfen abi!'],
    leave: ['Bu kadar param yok, annem kızar.', 'Annem "pahalıysa alma" dedi. Hoşça kal!', 'Ben gidip anneme sorayım…'],
  },
  genc: {
    happy: ['Süper, şehirde bunun iki katı!', 'Eyvallah abi!', 'Bu fiyata iki tane alırdım ama param yok.', 'Tamamdır, hemen alıyorum.'],
    grumble: ['Biraz pahalı ama neyse.', 'Hmm… tamam, ver.', 'Harçlığın yarısı gitti.', 'İnternette daha ucuzdu ama olsun.'],
    counter: ['{offer} yapsan? Öğrenciyim abi.', 'Abi {offer} olmaz mı?', '{offer} lira vereyim, tamam mı?'],
    leave: ['Kasabaya motorla inerim, oradan alırım.', 'Bu fiyata olmaz abi, kusura bakma.', 'Pas geçiyorum, sağ ol.'],
  },
  ogretmen: {
    happy: ['Ne güzel, teşekkür ederim.', 'Uygun fiyat, velilere de söylerim.', "Hacı Emmi'den bile ucuz!", 'Eline sağlık.'],
    grumble: ['Biraz yüksek ama alayım.', 'Hmm, peki.', 'Öğretmen maaşıyla zor ama olsun.', 'Geçen ay daha ucuzdu sanki.'],
    counter: ['{offer} lira olsa nasıl olur?', 'Hesapladım, {offer} lira makul.', 'Bunu {offer} liraya verebilir misiniz?'],
    leave: ['Kusura bakmayın, bu fiyata almayayım.', 'Kasabadan alırım, teşekkürler.', 'Biraz fazla oldu, başka zaman.'],
  },
  coban: {
    happy: ['Bereket versin.', 'İyi fiyat, al şunu.', 'Sürüye dönmeden iyi oldu.', 'Hah, buna eyvallah.'],
    grumble: ['Pahalı… ver gitsin.', 'Kuzu fiyatı düştü, seninki artmış.', 'Hmm… ver.', 'Yaylada bunu satan yok, mecburum.'],
    counter: ['{offer} lira, fazlası yok cebimde.', '{offer} der misin?', 'Gel {offer} olsun.'],
    leave: ['Bu fiyata almam, idare ederim.', 'Sağlıcakla kal.', 'Sürü bekler, başka sefere.'],
  },
  gelin: {
    happy: ['Kaynanam çok sevinecek!', 'Ay, ne uygun, teşekkürler.', 'Hemen alayım.', 'Sağ olun, bereketli olsun.'],
    grumble: ['Kaynanam "pahalı almışsın" diyecek…', 'Biraz pahalı ama neyse.', 'Hmm, peki.', 'Geçen sefer daha ucuzdu bu.'],
    counter: ['{offer} lira olsa? Kaynanam ancak o kadar verdi.', '{offer} olur mu?', 'Biraz insaf, {offer} diyelim.'],
    leave: ['Kaynanam kızar, almayayım.', 'Kasabaya inen olursa ona söylerim.', 'Kusura bakmayın, olmaz.'],
  },
  emekli: {
    happy: ['Aferin evlat, kahvede söyleyeceğim.', 'Eski fiyat bu, hayırlı olsun.', 'Ooo, emekliye uygun.', 'Allah bereket versin.'],
    grumble: ['Emekli maaşı bunu kaldırmaz ama ver.', 'Kahvede konuşacağız bu fiyatı.', 'Hmm… ver bakalım.', 'Bizim zamanımızda bunun parasıyla bir çuval alınırdı.'],
    counter: ['{offer} lira, emekliye bu kadar.', 'Gel {offer} yap, dua edeyim.', '{offer} veririm, o da çok.'],
    leave: ['Kahvede herkese anlatacağım bunu!', 'Bu fiyata almam, kusura bakma.', 'Hacı Emmi dönsün, ondan alırım.'],
  },
  turist: {
    happy: ['Harika, şehirde bunun iki katı!', 'Ne kadar uygun, teşekkürler!', 'Köy fiyatları bir başka.', 'Hemen alıyorum.'],
    grumble: ['Biraz pahalı ama tatildeyiz, olsun.', 'Hmm, peki.', 'Şehir fiyatı gibi ama neyse.', 'Olur, alalım.'],
    counter: ['Biraz indirim olmaz mı? {offer} lira diyelim.', '{offer} liraya olur mu?', 'Pazarlık yapılıyor sanırım: {offer}?'],
    leave: ['Yolda bir market vardı, oraya bakarız.', 'Bu fiyata olmaz, kusura bakmayın.', 'Turist fiyatı herhalde, sağ olun.'],
  },
};

export function lineFor(mood: Mood, i: number, offer?: number, type = 'ciftci'): string {
  const list = (LINES[type] ?? LINES.ciftci)[mood];
  return list[i % list.length].replace('{offer}', String(offer ?? ''));
}

/** Veresiye isteği ve cevaba verilen karşılık: herkes kendi parasının geleceği yeri söyler. */
const CREDIT: Record<string, Record<'ask' | 'yes' | 'no', string>> = {
  teyze: { ask: 'Ama bir ricam var: deftere yazar mısın? Maaş yatınca getiririm.', yes: 'Allah razı olsun evladım, maaş yatınca getiririm!', no: 'Peki peki, al paranı… Hacı Emmi yazardı ama.' },
  muhtar: { ask: 'Yanımda nakit kalmadı, deftere yaz, akşama gönderirim.', yes: 'Sağ ol, akşama gönderirim.', no: 'Peki, al bakalım. Hacı Emmi bana güvenirdi ama.' },
  ciftci: { ask: 'Deftere yazar mısın? Mahsul parası gelince getiririm.', yes: 'Eksik olma, mahsulü satınca getiririm!', no: 'Peki, al… Hacı Emmi yazardı ama.' },
  cocuk: { ask: 'Annem "deftere yazdır" dedi, babam akşam getirecekmiş.', yes: 'Tamam, babama söylerim!', no: 'Ama annem öyle dedi… Peki, cebimdeki parayla ödeyeyim.' },
  genc: { ask: 'Harçlık hafta sonu yatıyor, deftere yazar mısın?', yes: 'Sağ ol abi, hafta sonu getiririm!', no: 'Tamam tamam, nakit vereyim o zaman.' },
  ogretmen: { ask: 'Maaş on beşinde yatıyor, deftere yazabilir misiniz?', yes: 'Çok teşekkür ederim, maaş yatınca ilk iş getiririm.', no: 'Haklısınız, peşin vereyim.' },
  coban: { ask: 'Kuzular satılınca öderim, deftere yaz.', yes: 'Eyvallah, kuzu parasıyla gelirim.', no: 'Peki… al bakalım.' },
  gelin: { ask: 'Eşim akşam getirir, deftere yazar mısınız?', yes: 'Sağ olun, akşam eşim uğrar.', no: 'Peki, kaynanamın verdiğinden vereyim.' },
  emekli: { ask: 'Maaş yatınca öderim, yaz deftere.', yes: 'Eksik olma evlat, maaş günü buradayım.', no: 'Hacı Emmi olsa yazardı… neyse, al.' },
};

export function creditLine(type: string, part: 'ask' | 'yes' | 'no'): string {
  return (CREDIT[type] ?? CREDIT.ciftci)[part];
}

/** Ürün listesini konuşma diliyle söyler: "bir ekmek, bir süt bir de çay". */
export function sayItems(items: Product[]): string {
  const names = items.map((p) => p.name.replace(/ \(.*\)$/, '').toLocaleLowerCase('tr-TR'));
  if (names.length === 1) return `bir ${names[0]}`;
  return `${names
    .slice(0, -1)
    .map((n) => `bir ${n}`)
    .join(', ')} bir de ${names[names.length - 1]}`;
}

// --- veresiye ---

export interface Debt {
  who: string;
  name: string;
  amount: number;
  /** Malın toptancı maliyeti: borç batarsa zarar budur. */
  cost: number;
  day: number;
  /** Ödendiyse ödendiği gün. */
  paid?: number;
  /** Vadesi geçip battıysa battığı gün: mal gitti, para gelmeyecek. */
  lost?: number;
}

/** Veresiyenin vadesi: bu kadar gün içinde ödenmeyen borç batar. */
export const DEBT_DAYS = 7;
/** Bir akşam borcunu getirme olasılığı: köylünün ödeme huyu × bu pay. */
const PAY_CHANCE = 0.35;

/**
 * Gün sonunda veresiyeler: o günden önce yazılmış her açık borç, borçlunun ödeme huyuna göre bir
 * olasılıkla kapanır. Vadesi (DEBT_DAYS) dolan borç batar: huyu kötü olanın borcu çoğu zaman batar.
 */
export function settleDebts(debts: Debt[], seed: number, day: number): Debt[] {
  const r = rng(seed * 17 + day * 101);
  return debts.map((d) => {
    if (d.paid || d.lost || d.day >= day) return d;
    const v = VILLAGERS.find((x) => x.id === d.who);
    if (r() < (v?.pays ?? 0) * PAY_CHANCE) return { ...d, paid: day };
    return day - d.day >= DEBT_DAYS ? { ...d, lost: day } : d;
  });
}

// --- defter ---

/** Defter kaydı: oyuncunun o ürün için gördüğü tepkiler. Sepet satışları ürüne bağlanmaz. */
export interface LogEntry {
  product: string;
  day: number;
  price: number;
  mood: Mood;
  customer: string;
  /** Birden çok ürünlük sepetse ürünlerin adları. */
  basket?: string[];
}

export const profitOf = (sold: number, cost: number) => sold - cost;

/** Lira yazımı: "1.250 ₺". */
export const tl = (n: number) => `${n.toLocaleString('tr-TR')} ₺`;

/** Dükkân kapanınca verilen unvan: kaç gün dayandığına ve köydeki itibara göre. */
export function titleFor(days: number, reputation: number): { title: string; note: string } {
  if (reputation < 35) return { title: 'Köyün Kurdu', note: 'Selam veren kalmadı. Muhtar seni kahvede konuşuyor.' };
  if (days >= 30) return reputation >= 70 ? { title: 'Efsane Bakkal', note: 'Hem kasa hem gönül dolu. Köy düğününde baş köşe senin.' } : { title: 'Kurnaz Esnaf', note: 'Fiyatların kokusunu alıyorsun. Biraz gönül de al.' };
  if (days >= 14) return reputation >= 70 ? { title: 'Gönüllerin Bakkalı', note: 'Herkes senden alıyor. Zamları biraz daha yakından izle.' } : { title: 'Usta Bakkal', note: 'İki haftayı devirdin. Defteri tutan kazanır.' };
  if (days >= 7) return { title: 'Kalfa Bakkal', note: 'Bir haftayı çıkardın. Zamlar hızlanınca fiyatları da hızlandır.' };
  return { title: 'Çırak Bakkal', note: 'Kasa çabuk eridi. Siparişi az ver, fiyatı zamla birlikte yükselt.' };
}
