import { GAMES } from './games';
import type { GameRoute } from './slugs';
import { readText, writeJson } from '../shared/storage';

/*
 * Salonun defteri neyi hatırlar: hangi oyun bitirildi ve sonucu ne çıktı. Yalnızca bu tarayıcıda,
 * sitenin önekiyle tutulur ("Verilerimi sil" onu da siler); hiçbir yere gönderilmez. Oyunlar
 * bitince `markPlayed` çağırır. Bozuk ya da yabancı bir kayıt sessizce boş sayılır.
 */

export const PROGRESS_KEY = 'kariyerweb-defter';

/**
 * Bir oyunun defterdeki sonucu. Bütün oyunlarda aynı biçim: ileride bir paylaşım kartı ya da
 * (isteğe bağlı) skor tablosu gelirse bu şema gönderilir (docs/backend.md).
 */
export interface GameResult {
  /** Oyunun verdiği unvan ya da cümle ("Mahallenin Bakkalı"), en çok 60 karakter. */
  result: string;
  /** Bitirildiği an (ms). */
  at: number;
  /** Oyunun kendi ölçeğinde sayısal sonuç, varsa (puan, kasa, yıldız). */
  score?: number;
  /** Kaç kez bitirildi; ilk sürüm kayıtlarında yok sayılır ve 1 kabul edilir. */
  plays: number;
}

/** Defterin biçim sürümü: alan eklenince artar, parseProgress eskisini okumaya devam eder. */
export const PROGRESS_VERSION = 2;

export interface Progress {
  v: number;
  played: Partial<Record<GameRoute, GameResult>>;
}

const empty = (): Progress => ({ v: PROGRESS_VERSION, played: {} });

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
        if (!isRecord(p) || typeof p.result !== 'string' || typeof p.at !== 'number') continue;
        const score = typeof p.score === 'number' && Number.isFinite(p.score) ? p.score : undefined;
        const plays = Number.isInteger(p.plays) && (p.plays as number) > 0 ? (p.plays as number) : 1;
        out.played[r as GameRoute] = { result: p.result.slice(0, 60), at: p.at, plays, ...(score === undefined ? {} : { score }) };
      }
  } catch {
    // bozuk kayıt: boş defter
  }
  return out;
}

/** Bir oyunu bitirmek: saf, eski kaydı değiştirmez. Puan verilmezse önceki puan korunmaz (yeni sonuç). */
export function withPlayed(p: Progress, route: GameRoute, result: string, now: number, score?: number): Progress {
  const plays = (p.played[route]?.plays ?? 0) + 1;
  const entry: GameResult = { result: result.slice(0, 60), at: now, plays, ...(score === undefined || !Number.isFinite(score) ? {} : { score }) };
  return { v: PROGRESS_VERSION, played: { ...p.played, [route]: entry } };
}

// ── tarayıcıdaki kayıt ───────────────────────────────────────────

const ROUTES = GAMES.map((g) => g.route);

export function loadProgress(): Progress {
  return parseProgress(readText(PROGRESS_KEY), ROUTES);
}

const store = (p: Progress) => writeJson(PROGRESS_KEY, p);

/** Oyun bitti: deftere tik ve sonucu (varsa sayısal puanıyla) yazılır. */
export function markPlayed(route: GameRoute, result: string, score?: number) {
  store(withPlayed(loadProgress(), route, result, Date.now(), score));
}
