/*
 * Sen İK'sin'in haftasının müziği: hangi aşamada, hangi günde hangi parça. Parçaların kendisi
 * (dosya, döngü) ortak ses motorunda: src/shared/audio/musicPlan.ts.
 */
import type { GamePhase } from '../game/types';
import type { MusicTrack } from '../../../shared/audio/musicPlan';

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
