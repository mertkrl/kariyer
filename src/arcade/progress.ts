import { GAMES } from './games';
import type { GameRoute } from './slugs';

/*
 * Salonun defteri neyi hatırlar: hangi oyun bitirildi ve sonucu ne çıktı. Yalnızca bu tarayıcıda,
 * sitenin önekiyle tutulur ("Verilerimi sil" onu da siler); hiçbir yere gönderilmez. Oyunlar
 * bitince `markPlayed` çağırır. Bozuk ya da yabancı bir kayıt sessizce boş sayılır.
 */

export const PROGRESS_KEY = 'kariyerweb-defter';

export interface Progress {
  played: Partial<Record<GameRoute, { result: string; at: number }>>;
}

const empty = (): Progress => ({ played: {} });

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Kayıttan yalnızca bilinen alanlar ve doğru tipte değerler geçer. */
export function parseProgress(raw: string | null, routes: readonly string[]): Progress {
  const out = empty();
  try {
    const data: unknown = raw ? JSON.parse(raw) : null;
    if (!isRecord(data)) return out;
    if (isRecord(data.played))
      for (const r of routes) {
        const p = data.played[r];
        if (isRecord(p) && typeof p.result === 'string' && typeof p.at === 'number') out.played[r as GameRoute] = { result: p.result.slice(0, 60), at: p.at };
      }
  } catch {
    // bozuk kayıt: boş defter
  }
  return out;
}

/** Bir oyunu bitirmek: saf, eski kaydı değiştirmez. */
export function withPlayed(p: Progress, route: GameRoute, result: string, now: number): Progress {
  return { ...p, played: { ...p.played, [route]: { result: result.slice(0, 60), at: now } } };
}

// ── tarayıcıdaki kayıt ───────────────────────────────────────────

const ROUTES = GAMES.map((g) => g.route);

export function loadProgress(): Progress {
  try {
    return parseProgress(localStorage.getItem(PROGRESS_KEY), ROUTES);
  } catch {
    return empty();
  }
}

function store(p: Progress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    // gizli pencere: bu oturumluk
  }
}

/** Oyun bitti: deftere tik ve sonucu yazılır. */
export function markPlayed(route: GameRoute, result: string) {
  store(withPlayed(loadProgress(), route, result, Date.now()));
}
