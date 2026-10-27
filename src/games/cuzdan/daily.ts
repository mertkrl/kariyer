import { ITEMS, YEARS, type Item, type Year } from './data';
import { money, niceRound, rng } from './model';

/*
 * Günün Sepeti: herkese aynı gün aynı beş soru. Tohum tarihten gelir, bu yüzden arkadaşınla aynı
 * sepeti çözersin ve sonuçları kıyaslayabilirsin. Her soruda bir ürün, bir yıl ve dört fiyat
 * şıkkı; biri doğru, üçü dönemin parasıyla yazılmış yakın tuzaklar. Günde bir kez oynanır; sonuç
 * ve seri bu tarayıcıda tutulur ("Verilerimi sil" siler).
 */

export const DAILY_ROUNDS = 5;
/** Günün Sepeti'nin 1 numaralı günü. */
const EPOCH = Date.UTC(2026, 9, 1);
export const DAILY_KEY = 'kariyerweb-cuzdan-gunluk';

/** Yerel takvim gününe göre sıra numarası: 1 Ekim 2026 = #1. */
export function dayNumber(d: Date): number {
  return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EPOCH) / 86400000) + 1;
}

export interface DailyRound {
  item: Item;
  year: Year;
  /** Artan sırada dört fiyat; biri doğru. */
  options: number[];
  answer: number;
}

const FACTORS = [0.35, 0.5, 0.65, 1.5, 2, 3];

export function makeDaily(day: number): DailyRound[] {
  const r = rng(day * 7919 + 13);
  const pool = [...ITEMS];
  const out: DailyRound[] = [];
  while (out.length < DAILY_ROUNDS) {
    const item = pool.splice(Math.floor(r() * pool.length), 1)[0];
    const year = YEARS[Math.floor(r() * YEARS.length)];
    const answer = item.prices[year];
    const seen = new Set([money(answer, year)]);
    const options = [answer];
    for (const f of [...FACTORS].sort(() => r() - 0.5)) {
      const v = niceRound(answer * f, year);
      if (seen.has(money(v, year))) continue;
      seen.add(money(v, year));
      options.push(v);
      if (options.length === 4) break;
    }
    out.push({ item, year, options: options.sort((a, b) => a - b), answer });
  }
  return out;
}

export interface DailyState {
  day: number;
  /** Seçilen şıkların sırası (her tur için). */
  picks: number[];
  /** Üst üste oynanan gün sayısı ve son oynanan gün. */
  streak: number;
  last: number;
}

export function loadDaily(): DailyState | null {
  try {
    const v = JSON.parse(localStorage.getItem(DAILY_KEY) ?? 'null') as DailyState | null;
    return v && typeof v.day === 'number' && Array.isArray(v.picks) ? v : null;
  } catch {
    return null;
  }
}

export function saveDaily(s: DailyState) {
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify(s));
  } catch {
    // gizli pencere: bu oturumluk
  }
}

/** Bugün bitirilince seri: dün de oynandıysa bir artar, yoksa 1'den başlar. */
export const nextStreak = (prev: DailyState | null, day: number) => (prev && prev.last === day - 1 ? prev.streak + 1 : prev && prev.last === day ? prev.streak : 1);

export function dailyShare(day: number, rounds: DailyRound[], picks: number[]): string {
  const hits = rounds.filter((r, i) => r.options[picks[i]] === r.answer).length;
  const grid = rounds.map((r, i) => (r.options[picks[i]] === r.answer ? '🟩' : '🟥')).join('');
  return `Cüzdan TL · Günün Sepeti #${day} · ${hits}/${DAILY_ROUNDS}\n${grid}`;
}
