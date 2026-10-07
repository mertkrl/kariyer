/*
 * Haftanın müziği: hangi aşamada hangi parça. Üç parça da oyunun kendi sentezleyicisiyle üretilir
 * (scripts/generate-*-music.mjs) ve aynı sazları paylaşır; haftanın gerginliği parçalar arasında
 * yumuşak geçişlerle yükselir, Cuma akşamı çözülür.
 *
 * - calm:    "odak", Fa majör, 66 BPM. Pazartesi ve Salı mesaisi.
 * - tense:   "ofis noir", Re minör, 84 BPM, saat tıkıyla. Çarşamba (toplantı, yağmur), Perşembe
 *            (sistem çöktü) ve Cuma'nın mülakatları.
 * - resolve: "karar", Si bemol majör, 58 BPM. Hakan Bey kapıdayken, annenle telefonda ve sonda.
 */
import type { GamePhase } from '../game/types';

export type MusicTrack = 'calm' | 'tense' | 'resolve';

const base = typeof import.meta.env?.BASE_URL === 'string' ? import.meta.env.BASE_URL : './';

export const MUSIC_TRACKS: Record<MusicTrack, { src: string; loopSeconds: number }> = {
  calm: { src: `${base}audio/theme-calm.m4a`, loopSeconds: (60 / 66) * 4 * 32 },
  tense: { src: `${base}audio/theme-tense.m4a`, loopSeconds: (60 / 84) * 4 * 16 },
  resolve: { src: `${base}audio/theme-resolve.m4a`, loopSeconds: (60 / 58) * 4 * 16 },
};

/** Gergin günler: Çarşamba ve Perşembe (0'dan sayılır). */
const TENSE_DAYS = new Set([2, 3]);

/** Bu aşamada ve günde çalması gereken parça; null: aşamanın müziği yok ya da önceki parça sürer. */
export function trackFor(phase: GamePhase, dayIndex: number): MusicTrack | null {
  switch (phase) {
    case 'gameplay':
      return TENSE_DAYS.has(dayIndex) ? 'tense' : 'calm';
    case 'finalRound':
      return 'tense';
    case 'offer':
    case 'weekend':
    case 'final':
      return 'resolve';
    // gün sonu, o günün parçasıyla kapanır; giriş ekranları sessizdir
    default:
      return null;
  }
}
