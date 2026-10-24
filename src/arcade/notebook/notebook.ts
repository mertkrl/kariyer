import { GAMES } from '../games';
import type { GameRoute } from '../slugs';

/*
 * Defterin konuştuğu şeyler, saf işlevler: günün dosyası (her gün başka bir oyun kalemle halkaya
 * alınır) ve saate göre ton (mesai, akşam, gece, hafta sonu). Günün notu daily.ts'te. Aynı gün
 * aynı dosya gelir; testler tarihi verir.
 */

/** Takvim günü sırası: yerel tarihe göre, saat farkı günü kaydırmaz. */
export const dayIndex = (d: Date) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);

/** Günün dosyası: oyunlar sırayla, her gün bir tane. */
export const dayGame = (d: Date): GameRoute => GAMES[dayIndex(d) % GAMES.length].route;

export type Tone = 'work' | 'evening' | 'night' | 'weekend';

export function toneOf(d: Date): Tone {
  const h = d.getHours();
  if (h >= 22 || h < 6) return 'night';
  const weekend = d.getDay() === 0 || d.getDay() === 6;
  if (weekend) return 'weekend';
  return h >= 9 && h < 18 ? 'work' : 'evening';
}

/** Tona göre başlığın altındaki el yazısı ve dolabın yanındaki not. */
export const TONE_LINES: Record<Tone, { sub: string; shelf: string }> = {
  work: { sub: 'sekmeyi küçült! patron arkanda olabilir', shelf: 'Esc: patron geliyor' },
  evening: { sub: 'mesai bitti. sayfa senin.', shelf: 'bunları oyna →' },
  night: { sub: 'uyku nedir? bir oyun daha.', shelf: 'sessizce oyna →' },
  weekend: { sub: 'hafta sonu! defter de tatilde.', shelf: 'tadını çıkar →' },
};
