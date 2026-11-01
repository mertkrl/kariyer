import { ALL_YEARS, CPI, ERA_ITEMS, ITEMS, MIN_WAGE, NOW, USD, YEARS, isOldLira, type AnyYear, type Item, type Year } from './data';

/*
 * Cüzdan Zamanı'nın saf hesapları: para biçimi, çalışma dakikası, puanlar ve dört masanın turları.
 * Ekrandan bağımsızdır; testler doğrudan buradan okur.
 */

/** Ayda çalışılan saat (haftada 45 saat). */
export const MONTH_HOURS = 225;
export const GUESS_ROUNDS = 8;
export const QUICK_ROUNDS = 10;

export type Mode = 'gecmis' | 'ucuz' | 'makine';

/** Dönemin parasıyla yazım: 2005 öncesi "250.000 TL", 2005–2008 "1,25 YTL", sonrası "4,50 TL". */
export function money(tl: number, year: AnyYear): string {
  if (isOldLira(year)) return `${Math.round(tl * 1_000_000).toLocaleString('tr-TR')} TL`;
  const digits = tl < 100 && Math.round(tl * 100) % 100 !== 0 ? 2 : 0;
  return `${tl.toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${year >= 2005 && year < 2009 ? 'YTL' : 'TL'}`;
}

/** Bugünkü para, kısa: "17,50 ₺". */
export const tl = (n: number) => `${n.toLocaleString('tr-TR', { minimumFractionDigits: n < 100 && n % 1 ? 2 : 0, maximumFractionDigits: n < 100 ? 2 : 0 })} ₺`;

/** Bu fiyat için asgari ücretle kaç dakika çalışmak gerekir. */
export const workMinutes = (price: number, year: AnyYear) => (price / (MIN_WAGE[year] / MONTH_HOURS)) * 60;

export function duration(min: number): string {
  if (min < 1) return `${Math.max(1, Math.round(min * 60))} sn`;
  if (min < 60) return `${Math.round(min)} dk`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h} sa ${m} dk` : `${h} sa`;
}

export const dollars = (price: number, year: AnyYear) => price / USD[year];

/** Bugünkü fiyat geçmiştekinin kaç katı. */
export const multiple = (item: Item, year: Year) => item.prices[NOW] / item.prices[year];

/** Aynı dönemde genel fiyatlar (TÜFE) kaç kat arttı. */
export const cpiMultiple = (year: AnyYear) => CPI[NOW] / CPI[year];

/**
 * Fiyatın enflasyona göre seyri: 1'den büyükse ürün genel fiyatlardan hızlı pahalandı.
 * Örn. 1,5 = enflasyondan %50 hızlı.
 */
export const realChange = (item: Item, year: Year) => multiple(item, year) / cpiMultiple(year);

/** "enflasyondan %48 hızlı" / "enflasyonla aynı" / "enflasyondan %20 yavaş" */
export function vsInflation(r: number): string {
  if (r > 1.08) return `enflasyondan %${Math.round((r - 1) * 100)} hızlı`;
  if (r < 0.92) return `enflasyondan %${Math.round((1 - r) * 100)} yavaş`;
  return 'enflasyonla aşağı yukarı aynı';
}

export const times = (k: number) => `${k.toLocaleString('tr-TR', { maximumFractionDigits: k < 10 ? 1 : 0 })} kat`;

export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function shuffle<T>(xs: readonly T[], r: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── geçmiş fiyatı tahmin ─────────────────────────────────────────

/**
 * Tahmin puanı (0–100): oran üzerinden; tam isabet 100, 2,5 kat sapma ve ötesi 0.
 * Oran kullanılır ki 25 kuruşluk simitte 10 kuruş ile 98 liralık altında 10 kuruş aynı sayılmasın.
 */
export function guessScore(guess: number, actual: number): number {
  if (!(guess > 0)) return 0;
  const err = Math.abs(Math.log(guess / actual));
  return Math.round(Math.max(0, 1 - err / Math.log(2.5)) * 100);
}

/** Dönemin parasında elle söylenebilecek bir tutar: 2002'de 5.000 liralık, sonra 5 kuruşluk adımlar. */
export function niceRound(v: number, year: AnyYear): number {
  const step = isOldLira(year) ? (v < 1 ? 0.005 : v < 10 ? 0.05 : 0.5) : v < 10 ? 0.05 : v < 100 ? 0.5 : v < 1000 ? 5 : 50;
  return Math.max(step, Math.round(v / step) * step);
}

export interface GuessRound {
  item: Item;
  year: Year;
  /** Kaydırıcının uçları (TL): cevap ortada değil, her tur başka yerde durur. */
  lo: number;
  hi: number;
}

/** Her ürün en çok bir kez, yıllar dağınık; kaydırıcı cevabın 4–7 kat altından üstüne uzanır. */
export function makeGuessRounds(seed: number, n = GUESS_ROUNDS): GuessRound[] {
  const r = rng(seed);
  const items = shuffle(ITEMS, r).slice(0, n);
  const years = shuffle(YEARS, r);
  return items.map((item, i) => {
    const year = years[i % years.length];
    const p = item.prices[year];
    return { item, year, lo: p / (4 + r() * 3), hi: p * (4 + r() * 3) };
  });
}

/** Kaydırıcı logaritmiktir: 0–1 arası konum ↔ tutar. */
export const sliderValue = (t: number, lo: number, hi: number) => lo * (hi / lo) ** t;
export const sliderPos = (v: number, lo: number, hi: number) => Math.log(v / lo) / Math.log(hi / lo);

/** Tahmin puanının rengi: yeşil, altın ya da kırmızı. */
export const toneOf = (score: number): 'good' | 'mid' | 'bad' => (score >= 70 ? 'good' : score >= 30 ? 'mid' : 'bad');

// ── hangisi ucuz ─────────────────────────────────────────────────

export interface Pick {
  item: Item;
  year: AnyYear;
}

export interface CheaperRound {
  /** same: aynı yıl, fiyatlar kapalı; work: farklı yıllar, fiyatlar açık, asgari ücretle hangisi ucuz. */
  kind: 'same' | 'work';
  a: Pick;
  b: Pick;
}

/** Turun ölçtüğü şey: aynı yılda fiyat, farklı yıllarda çalışma dakikası. */
export const cost = (round: CheaperRound, p: Pick) => (round.kind === 'same' ? p.item.prices[p.year] : workMinutes(p.item.prices[p.year], p.year));

export const cheaperSide = (round: CheaperRound): 'a' | 'b' => (cost(round, round.a) <= cost(round, round.b) ? 'a' : 'b');

/** Fark %35 ile 5 kat arası: yazı tura da olmasın, benzinle çikolata kadar bariz de. */
export function makeCheaperRounds(seed: number, n = QUICK_ROUNDS): CheaperRound[] {
  const r = rng(seed);
  const out: CheaperRound[] = [];
  const seen = new Set<string>();
  for (let guard = 0; out.length < n && guard < 5000; guard++) {
    const kind = out.length % 2 === 0 ? 'same' : 'work';
    const [i1, i2] = shuffle(ITEMS, r);
    const y1 = ALL_YEARS[Math.floor(r() * ALL_YEARS.length)];
    let y2 = kind === 'same' ? y1 : ALL_YEARS[Math.floor(r() * ALL_YEARS.length)];
    if (kind === 'work' && y2 === y1) y2 = ALL_YEARS[(ALL_YEARS.indexOf(y1) + 3) % ALL_YEARS.length];
    const round: CheaperRound = { kind, a: { item: i1, year: y1 }, b: { item: kind === 'work' && r() < 0.6 ? i1 : i2, year: y2 } };
    const ca = cost(round, round.a);
    const cb = cost(round, round.b);
    const key = [round.a.item.id, round.a.year, round.b.item.id, round.b.year].join();
    const ratio = Math.max(ca, cb) / Math.min(ca, cb);
    if (ratio < 1.35 || ratio > 5 || seen.has(key)) continue;
    seen.add(key);
    out.push(round);
  }
  return out;
}

// ── ortak puan ───────────────────────────────────────────────────

/** Hızlı masalarda doğru cevap 100, üst üste bildikçe tura 20'şer (en çok 100) bonus. */
export const quickPoints = (streak: number) => 100 + Math.min(streak - 1, 5) * 20;
/** Masanın başarı oranı: tahminde puanın tavana oranı, hızlı masalarda doğru sayısının tura oranı (seri bonusu unvanı zorlaştırmasın). */
export function successOf(mode: Exclude<Mode, 'makine'>, log: { score: number; ok?: boolean }[], max: number): number {
  if (!log.length) return 0;
  if (mode === 'gecmis') return log.reduce((a, r) => a + r.score, 0) / max;
  return log.filter((r) => r.ok).length / log.length;
}

export const quickMax = (n: number) => Array.from({ length: n }, (_, i) => quickPoints(i + 1)).reduce((s, x) => s + x, 0);

const TITLES: Record<Exclude<Mode, 'makine'>, [number, string, string][]> = {
  gecmis: [
    [0.8, 'Merkez Bankası Arşivcisi', 'Eski fiyatları senden iyi hatırlayan yok. Fişleri saklıyor musun yoksa?'],
    [0.6, 'Mahallenin Hafızası', 'Bakkal defteri gibi kafan var; kuruşu kuruşuna değilse de yakın.'],
    [0.4, 'Nostalji Hesapçısı', '"Eskiden şu kadardı" diyorsun, yarısında haklısın.'],
    [0.2, '"Eskiden Her Şey Ucuzdu" Amca', 'Ucuz olduğunu biliyorsun da ne kadar ucuz olduğunu unutmuşsun.'],
    [0, 'Yeni Nesil', 'Eski lirayı hiç görmemiş gibisin. Bir milyonluk banknot sana ne diyor?'],
  ],
  ucuz: [
    [0.8, 'Pazarlık Ustası', 'Etiketi değil, emeği tartıyorsun. Hangi yılda neyin ucuz olduğu cebinde.'],
    [0.6, 'Akıllı Alışverişçi', 'Çoğunu bildin; bir iki kez enflasyon seni kandırdı.'],
    [0.4, 'İndirim Avcısı', 'Bazen etikete aldandın. Sıfırlar göz yanıltır.'],
    [0, 'Kasada Şaşıran', 'Ucuz sandığın pahalı, pahalı sandığın ucuz çıktı. Fişe iyi bak.'],
  ],
};

/** Unvan başarı oranından (0–1) gelir: tahmin masasında puan, hızlı masalarda isabet oranı. */
export function titleFor(mode: Exclude<Mode, 'makine'>, p: number): { title: string; note: string } {
  const [, title, note] = TITLES[mode].find(([min]) => p >= min) ?? TITLES[mode][TITLES[mode].length - 1];
  return { title, note };
}

// ── zaman makinesi cüzdanı ───────────────────────────────────────

export type Basket = Record<string, number>;

/** Cebe konan para: o yılın asgari ücretinin `share`'de biri (varsayılan onda bir), yuvarlak bir sayıya çekilmiş. */
export function walletFor(year: Year, share = 10): number {
  const raw = MIN_WAGE[year] / share;
  const step = raw < 20 ? 1 : raw < 100 ? 5 : 10;
  return Math.max(step, Math.round(raw / step) * step);
}

/** Bir ürünün o yılki fiyatı; dönem ürünlerinde o yıl yoksa (ya da bugün yoksa) null. */
export function priceIn(id: string, year: AnyYear): number | null {
  const it = ITEMS.find((i) => i.id === id);
  if (it) return it.prices[year];
  const e = ERA_ITEMS.find((i) => i.id === id);
  if (!e) return null;
  return year === NOW ? e.now : (e.prices[year as Year] ?? null);
}

/** Sepetin tutarı; o yıl bulunmayan (bugün satılmayan) ürünler hesaba girmez. */
export const basketCost = (b: Basket, year: AnyYear) => Object.entries(b).reduce((s, [id, n]) => s + n * (priceIn(id, year) ?? 0), 0);

export const basketCount = (b: Basket) => Object.values(b).reduce((s, n) => s + n, 0);

/** Aynı nominal parayla bugün ne alınır: en ucuzdan başlayarak doldurulur. */
export function sameMoneyToday(budget: number): { item: Item; count: number }[] {
  let left = budget;
  const out: { item: Item; count: number }[] = [];
  for (const item of [...ITEMS].sort((a, b) => a.prices[NOW] - b.prices[NOW])) {
    const n = Math.floor(left / item.prices[NOW]);
    if (n > 0) {
      out.push({ item, count: n });
      left -= n * item.prices[NOW];
    }
  }
  return out;
}

/** Bugünün en ucuz ürününün ne kadarı alınır: "bir ekmeğin %8'i" gibi. */
export function fractionToday(budget: number): { item: Item; share: number } {
  const cheapest = [...ITEMS].sort((a, b) => a.prices[NOW] - b.prices[NOW])[0];
  return { item: cheapest, share: budget / cheapest.prices[NOW] };
}

// ── Cüzdan TL: yıla bağlı masalar ────────────────────────────────

/**
 * Oyunun açıldığı yıl: altı sıfırın atıldığı 2005. Milyonlu eski lira kafa karıştırmasın diye
 * oyuncu YTL ile başlar; 2002'ye saati geri alarak gider.
 */
export const START_YEAR = 2005;

/** Ekranın dönemi: saat geri alınınca işletim sistemi de o yıla döner. */
export type Theme = 'luna' | 'glass' | 'flat';
export const themeOf = (year: AnyYear): Theme => (year < 2007 ? 'luna' : year < 2015 ? 'glass' : 'flat');

/** Kimin cebiyle oynanır: cüzdan o yılın asgari ücretinin `share`'de biridir. */
export interface Persona {
  id: string;
  avatar: string;
  name: string;
  role: string;
  purse: string;
  share: number;
  /** "Senin maaşın": bugünkü aylık net maaş (₺); varsa cüzdan her yıl bunun enflasyonla karşılığıdır. */
  salary?: number;
}

export const PERSONAS: Persona[] = [
  { id: 'ayse', avatar: '👷', name: 'Ayşe', role: 'asgari ücretli', purse: 'cebinde maaşının onda biri', share: 10 },
  { id: 'can', avatar: '🎒', name: 'Can', role: 'lise öğrencisi', purse: 'haftalık harçlık', share: 40 },
  { id: 'nuri', avatar: '👴', name: 'Nuri Amca', role: 'emekli', purse: 'pazar parası', share: 6 },
];

/** Bugünkü maaşın o yıldaki karşılığı: aynı alım gücü, TÜFE'ye göre geri çekilir. */
export const salaryIn = (salary: number, year: AnyYear) => (salary * CPI[year]) / CPI[NOW];

/** Bir fiyat, senin maaşınla o yıl kaç dakikalık emek: maaş o yıla TÜFE ile taşınır. */
export const myMinutes = (price: number, year: AnyYear, salary: number) => (price / (salaryIn(salary, year) / MONTH_HOURS)) * 60;

/** Emek dakikası: maaşlı kişide kendi maaşıyla, ötekilerde asgari ücretle. */
export const laborMinutes = (price: number, year: AnyYear, p?: Persona) => (p?.salary ? myMinutes(price, year, p.salary) : workMinutes(price, year));

/** Cüzdandaki para: maaşlı kişide o yılki maaş karşılığı (yuvarlak), ötekilerde asgari ücretin bir payı. */
export function walletOf(year: Year, p: Persona): number {
  if (!p.salary) return walletFor(year, p.share);
  const raw = salaryIn(p.salary, year);
  const step = raw < 100 ? 1 : raw < 1000 ? 5 : 10;
  return Math.max(step, Math.round(raw / step) * step);
}

/**
 * Maaşının yıllar boyunca karşılığı: o yılki tutarı, o yılın asgari ücretinin kaç katı ettiği ve
 * kaç ekmek aldığı. Alım gücü TÜFE'ye göre sabit tutulur; değişen, asgari ücrete ve ekmeğe göre yerin.
 */
export function salaryTable(salary: number) {
  const bread = ITEMS.find((i) => i.id === 'ekmek')!;
  return ALL_YEARS.map((year) => {
    const amount = salaryIn(salary, year);
    return { year, amount, wages: amount / MIN_WAGE[year], breads: Math.floor(amount / bread.prices[year]) };
  });
}

export function salaryPersona(salary: number): Persona {
  return { id: `maas-${salary}`, avatar: '💼', name: 'Sen', role: 'kendi maaşın', purse: 'aylık maaşının karşılığı', share: MIN_WAGE[NOW] / salary, salary };
}

/** Özel kullanıcı: 2005 cüzdanı elle yazılır, `share` o yılın asgari ücretine oranından gelir. */
export function customPersona(budget2005: number): Persona {
  return { id: `ozel-${budget2005}`, avatar: '✏️', name: 'Özel', role: 'kendi bütçesi', purse: 'cüzdan', share: MIN_WAGE[START_YEAR] / budget2005 };
}

/** Geçmişi Bil, saatin gösterdiği yıl için: her ürün bir kez, kaydırıcı cevabın 3–6 kat altından üstüne. */
export function makeGuessRoundsFor(seed: number, year: Year, n = GUESS_ROUNDS): GuessRound[] {
  const r = rng(seed);
  return shuffle(ITEMS, r)
    .slice(0, n)
    .map((item) => {
      const p = item.prices[year];
      return { item, year, lo: p / (3 + r() * 3), hi: p * (3 + r() * 3) };
    });
}

/** Hangisi Ucuz?, saatin gösterdiği yıl için: iki ürün, fiyatlar kapalı, fark %35 ile 8 kat arası. */
export function makeSameYearRounds(seed: number, year: Year, n = QUICK_ROUNDS): CheaperRound[] {
  const r = rng(seed);
  const pairs: CheaperRound[] = [];
  for (let i = 0; i < ITEMS.length; i++)
    for (let j = i + 1; j < ITEMS.length; j++) {
      const [a, b] = [ITEMS[i], ITEMS[j]];
      const ratio = Math.max(a.prices[year], b.prices[year]) / Math.min(a.prices[year], b.prices[year]);
      if (ratio >= 1.35 && ratio <= 8) pairs.push(r() < 0.5 ? { kind: 'same', a: { item: a, year }, b: { item: b, year } } : { kind: 'same', a: { item: b, year }, b: { item: a, year } });
    }
  return shuffle(pairs, r).slice(0, n);
}


/** Bir turun karnedeki satırı. */
export interface RoundLog {
  label: string;
  detail: string;
  score: number;
  ok?: boolean;
}
