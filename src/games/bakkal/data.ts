/*
 * Köy Bakkalı: oyuncu fiyatı kafasına göre söyler. Her ürünün gizli bir market fiyatı (M) ve
 * bakkalın toptancıdan aldığı maliyeti (K) vardır; her müşterinin de M'nin üstünde razı olduğu
 * gizli bir tavanı. M'ye kadar müşteri sevinerek alır, tavana kadar söylenerek alır, tavanı
 * aşınca pazarlık eder, ikinci kez aşınca gider. Oyuncu tepkilerden fiyatları bulur.
 *
 * Köyün kendisi de oyunda: müşteriler adı olan, geri gelen köylülerdir ve geçen seferi hatırlar;
 * bazen birkaç şey birden ister, bazen veresiye yazdırır. Her günün havası ve bir köy olayı vardır;
 * tezgâhtaki kedi de ara sıra raftan bir şey düşürür.
 * Bu dosya saf mantıktır: rastgelelik tohumlu, test edilebilir.
 */

export interface Product {
  id: string;
  name: string;
  emoji: string;
  /** Gizli market fiyatı (TL). */
  market: number;
  /** Toptancı maliyeti (TL): bunun altı zarar. */
  cost: number;
}

export const PRODUCTS: Product[] = [
  { id: 'ekmek', name: 'Ekmek', emoji: '🍞', market: 15, cost: 10 },
  { id: 'sut', name: 'Süt (1 lt)', emoji: '🥛', market: 40, cost: 30 },
  { id: 'yumurta', name: "Yumurta (10'lu)", emoji: '🥚', market: 85, cost: 62 },
  { id: 'meyvesuyu', name: 'Meyve suyu', emoji: '🧃', market: 50, cost: 35 },
  { id: 'cay', name: 'Çay (500 g)', emoji: '🍵', market: 120, cost: 90 },
  { id: 'seker', name: 'Toz şeker (1 kg)', emoji: '🧂', market: 45, cost: 34 },
  { id: 'cikolata', name: 'Çikolata', emoji: '🍫', market: 25, cost: 16 },
  { id: 'sabun', name: 'Sabun', emoji: '🧼', market: 30, cost: 20 },
  { id: 'makarna', name: 'Makarna', emoji: '🍝', market: 20, cost: 13 },
  { id: 'peynir', name: 'Beyaz peynir (500 g)', emoji: '🧀', market: 160, cost: 120 },
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
];

export const typeOf = (id: string) => CUSTOMERS.find((c) => c.id === id)!;

/** Köyün tanıdık yüzleri: her biri bir müşteri tipindendir; borcunu ödeme olasılığı farklıdır. */
export interface Villager {
  id: string;
  name: string;
  type: string;
  /** Veresiye borcunu ertesi günlerde ödeme olasılığı (0: hiç veresiye istemez). */
  pays: number;
}

export const VILLAGERS: Villager[] = [
  { id: 'ayse', name: 'Ayşe Teyze', type: 'teyze', pays: 0.95 },
  { id: 'fatma', name: 'Fatma Teyze', type: 'teyze', pays: 0.75 },
  { id: 'hasan', name: 'Muhtar Hasan', type: 'muhtar', pays: 0.9 },
  { id: 'riza', name: 'Rıza Amca', type: 'ciftci', pays: 0.55 },
  { id: 'mehmet', name: 'Mehmet Abi', type: 'ciftci', pays: 0.8 },
  { id: 'ali', name: 'Küçük Ali', type: 'cocuk', pays: 0.5 },
  { id: 'elif', name: 'Küçük Elif', type: 'cocuk', pays: 0.7 },
  { id: 'hatice', name: 'Hatice Nine', type: 'teyze', pays: 0.9 },
  { id: 'zehra', name: 'Zehra Teyze', type: 'teyze', pays: 0.65 },
  { id: 'osman', name: 'Osman Emmi', type: 'ciftci', pays: 0.7 },
  { id: 'ismail', name: 'İsmail Amca', type: 'ciftci', pays: 0.85 },
  { id: 'imam', name: 'İmam Yusuf', type: 'muhtar', pays: 0.95 },
  { id: 'emre', name: 'Küçük Emre', type: 'cocuk', pays: 0.6 },
  { id: 'selin', name: 'Turist Selin', type: 'turist', pays: 0 },
  { id: 'can', name: 'Turist Can', type: 'turist', pays: 0 },
  { id: 'turist', name: 'Şehirli turist', type: 'turist', pays: 0 },
];

export const DAYS = 5;
export const START_REPUTATION = 60;
/** Bu gün sabah zam gelir: o günden sonra market fiyatı ve maliyet artar. */
export const HIKE_DAY = 3;
export const HIKE = 1.1;
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

/** O günün market fiyatı ve maliyeti (zamdan sonra artar, yukarı yuvarlanır). */
export function priceOn(p: Product, day: number): { market: number; cost: number } {
  if (day < HIKE_DAY) return { market: p.market, cost: p.cost };
  return { market: Math.ceil(p.market * HIKE), cost: Math.ceil(p.cost * HIKE) };
}

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

/** Her günün köy olayı. Zam günü (HIKE_DAY) fiyatları da değiştirir. */
export const EVENTS: Record<number, VillageEvent> = {
  1: { title: 'Kepenk açılışı', text: 'Hacı Emmi hacca gitti, dükkân sana emanet. Köy yeni bakkalı merak ediyor.' },
  2: { title: 'Düğün var!', text: 'Muhtarın kızı evleniyor. Herkes şeker, çay ve meyve suyu peşinde; kesesi de biraz bol.', ceiling: 0.1, favor: ['seker', 'cay', 'meyvesuyu'] },
  3: { title: 'Zam geldi!', text: 'Toptancı fiyatları %10 arttı. Defterdeki eski fiyatlar artık tutmayabilir.' },
  4: { title: 'Kasabada zincir market açıldı', text: 'Köylüler fiyat karşılaştırmaya başladı: kimse fazla para vermek istemiyor.', ceiling: -0.1 },
  5: { title: 'Pazar günü', text: 'Köy pazarı kuruldu, yollar kalabalık. Bugün dükkâna daha çok kişi uğrar.', crowd: 2 },
};

/** İtibara, havaya ve olaya göre günün müşteri sayısı: 3 ile 12 arası. */
export function customersFor(reputation: number, day = 1, weather: Weather = 'sunny'): number {
  const base = 4 + Math.round(reputation / 16) + WEATHER[weather].crowd + (EVENTS[day]?.crowd ?? 0);
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

/** Hafızaya bir ziyaret işler: söylenmek ve gitmek kin, sevinmek sadakat bırakır. Turist unutur. */
export function remember(m: Memories, who: string, mood: Mood): Memories {
  if (VILLAGERS.find((v) => v.id === who)?.type === 'turist') return m;
  const cur = m[who] ?? EMPTY;
  return {
    ...m,
    [who]: {
      visits: cur.visits + 1,
      grudge: cur.grudge + (mood === 'leave' ? 2 : mood === 'grumble' ? 1 : 0),
      happy: cur.happy + (mood === 'happy' ? 1 : 0),
    },
  };
}

/**
 * Müşterinin o günkü etkin tipi: köy olayı tavanı oynatır, kin tavanı düşürür, sadakat biraz
 * yükseltir. Tavan market fiyatının altına inmez.
 */
export function effectiveType(c: CustomerType, day: number, mem?: Memory): CustomerType {
  const m = mem ?? EMPTY;
  const ceiling = c.ceiling + (EVENTS[day]?.ceiling ?? 0) - 0.05 * Math.min(m.grudge, 4) + 0.02 * Math.min(m.happy, 3);
  return { ...c, ceiling: Math.max(1.02, Math.round(ceiling * 100) / 100) };
}

/** Kapıdan girerken söylenen söz: geçen seferi hatırlar. */
export function greetingFor(v: Villager, mem?: Memory): string {
  if (v.type === 'turist') return 'Merhaba, buralı değilim de…';
  if (!mem || mem.visits === 0) return v.type === 'cocuk' ? 'Abi, annem gönderdi.' : 'Hayırlı işler, yeni bakkal sen misin?';
  if (mem.grudge >= 2) return 'Geçen sefer kazıkladın beni, bu sefer gözüm üstünde!';
  if (mem.grudge > mem.happy) return 'Yine ben geldim. Bu sefer insaflı ol.';
  if (mem.happy > 0) return 'Senin fiyatların iyi, yine geldim!';
  return 'Ben yine geldim.';
}

// --- günün müşterileri ---

export interface Visit {
  villager: Villager;
  customer: CustomerType;
  /** İstenen ürünler: bir, iki ya da üç tane. */
  items: Product[];
  /** Satış olursa veresiye yazdırmak ister mi. */
  credit: boolean;
  /** Bu müşteri gelince kedi raftan bir şey düşürür mü (düşen ürün). */
  cat?: Product;
}

/**
 * Günün müşterileri: tohumdan; sayı itibara, havaya ve olaya göre. Her köylü günde en fazla bir
 * kez gelir: kim geleceği köy karıştırılarak seçilir, tanıdıklar başka günlerde yine uğrar.
 */
export function dayVisits(seed: number, day: number, reputation: number, weather: Weather = weatherOn(seed, day)): Visit[] {
  const r = rng(seed * 31 + day);
  const favor = EVENTS[day]?.favor;
  const village = [...VILLAGERS];
  for (let i = village.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [village[i], village[j]] = [village[j], village[i]];
  }
  return village.slice(0, customersFor(reputation, day, weather)).map((villager) => {
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
    const cat = r() < 0.1 ? PRODUCTS[Math.floor(r() * PRODUCTS.length)] : undefined;
    return { villager, customer, items, credit, cat };
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
    // tavana yaklaştıkça daha çok söylenir
    const over = (price - market) / Math.max(1, ceiling - market);
    return { mood: 'grumble', sold: price, rep: over > 0.6 ? -2 : -1 };
  }
  if (second) return { mood: 'leave', rep: -3 };
  const offer = Math.max(5, Math.floor((market + (ceiling - market) * 0.4) / 5) * 5);
  return { mood: 'counter', offer: Math.min(offer, ceiling), rep: 0 };
}

const LINES: Record<Mood, string[]> = {
  happy: ['Ooo ucuzmuş, ver bakalım!', 'Allah bereket versin evladım.', 'Şehirde bunun iki katı!', 'Hemen alıyorum, fikrini değiştirme.'],
  grumble: ['Pahalı ama neyse, ver…', 'Geçen hafta daha ucuzdu bu.', 'Hmm… peki, ver bakalım.', 'Sen de iyice açtın ağzını.'],
  counter: ['Olmaz o kadar! {offer} lira olur mu?', 'Yok yok, {offer} veririm, o kadar.', 'Aşağı in biraz, {offer} lira de alayım.'],
  leave: ['Kasabadan alırım ben, sağ ol!', 'Bu köyde vicdan kalmamış.', 'Bir daha gelmem buraya!'],
};

export function lineFor(mood: Mood, i: number, offer?: number): string {
  const list = LINES[mood];
  return list[i % list.length].replace('{offer}', String(offer ?? ''));
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
}

/**
 * Gün sonunda veresiyeler: o günden önce yazılmış her açık borç, borçlunun ödeme olasılığıyla
 * kapanır. Ödenenlere ödendiği gün yazılır.
 */
export function settleDebts(debts: Debt[], seed: number, day: number): Debt[] {
  const r = rng(seed * 17 + day * 101);
  return debts.map((d) => {
    if (d.paid || d.day >= day) return d;
    const v = VILLAGERS.find((x) => x.id === d.who);
    return r() < (v?.pays ?? 0) ? { ...d, paid: day } : d;
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

/** Bir ürünün defterinden çıkarılan bilinen aralık (yalnızca zamdan beri olan tek ürünlük kayıtlar). */
export function knownRange(log: LogEntry[], product: string, day: number) {
  const since = day >= HIKE_DAY ? HIKE_DAY : 1;
  const rows = log.filter((l) => l.product === product && !l.basket && l.day >= since);
  const happy = rows.filter((l) => l.mood === 'happy').map((l) => l.price);
  const grumble = rows.filter((l) => l.mood === 'grumble').map((l) => l.price);
  return {
    /** Market fiyatı en az bu (sevinerek alınan en yüksek fiyat). */
    atLeast: happy.length ? Math.max(...happy) : undefined,
    /** Market fiyatı bundan düşük (söylenerek alınan en düşük fiyat). */
    below: grumble.length ? Math.min(...grumble) : undefined,
  };
}

export const profitOf = (sold: number, cost: number) => sold - cost;

/** Hafta sonu unvanı. */
export function titleFor(profit: number, reputation: number): { title: string; note: string } {
  if (reputation < 35) return { title: 'Köyün Kurdu', note: 'Kasa dolu ama selam veren yok. Muhtar seni kahvede konuşuyor.' };
  if (profit < 0) return { title: 'Hayırsever Bakkal', note: 'Köy seni çok seviyor. Toptancı daha az.' };
  if (reputation >= 75 && profit >= 600) return { title: 'Efsane Bakkal', note: 'Hem kasa hem gönül dolu. Köy düğününde baş köşe senin.' };
  if (profit >= 600) return { title: 'Kurnaz Esnaf', note: 'Fiyatların kokusunu alıyorsun. Biraz gönül de al.' };
  if (reputation >= 75) return { title: 'Gönüllerin Bakkalı', note: 'Herkes senden alıyor. Fiyatlara biraz daha cesur bak.' };
  return { title: 'Çırak Bakkal', note: 'Defteri dikkatli tut, gelecek hafta daha iyisi olur.' };
}
