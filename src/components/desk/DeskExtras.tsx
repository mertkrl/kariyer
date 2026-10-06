import type { ReactElement } from 'react';
import { CakePlate, Umbrella } from './DeskExtrasArt';
import { BIRTHDAY_DAY, RAINY_DAY } from '../../game/weekdays';

/*
 * Masa haftayı hatırlar. Takvim yüzünden bir şeyler ortaya çıkar (doğum günü pastasının tabağı,
 * sebile dayalı ıslak bir şemsiye). Tabak, onunla ilgilenince gider. Her birinin arkasında bir
 * düşünce var.
 */

export interface DeskExtra {
  id: string;
  /** Sahnedeki konumu ve boyutu. */
  box: [number, number, number, number];
  label: string;
  thought: string;
  art?: ReactElement;
  /** Tıklamak onu masadan kalıcı olarak kaldırır. */
  clears?: boolean;
}

interface Ctx {
  dayIndex: number;
  /** Zaten atılmış / çantana konmuş. */
  cleared: string[];
}

/** Bugün masada her zamankilerin dışında duranlar. */
export function deskExtras({ dayIndex, cleared }: Ctx): DeskExtra[] {
  const out: DeskExtra[] = [];
  if (dayIndex > BIRTHDAY_DAY) {
    out.push({
      id: 'cake',
      box: [352, 500, 130, 70],
      label: 'Pasta tabağı',
      thought: dayIndex === BIRTHDAY_DAY + 1 ? 'Dünkü doğum günü pastasından kalan tabak. Mutfaktaki çöpe attın.' : 'İki gündür duran tabak. Krema kurumuştu. Çöpe attın.',
      art: <CakePlate stale={dayIndex > BIRTHDAY_DAY + 1} />,
      clears: true,
    });
  }
  if (dayIndex === RAINY_DAY) {
    out.push({ id: 'umbrella', box: [1784, 420, 64, 210], label: 'Islak şemsiye', thought: 'Şemsiyeni sebilin yanına dayadın. Altında küçük bir su birikintisi oluştu.', art: <Umbrella /> });
  }
  return out.filter((e) => !cleared.includes(e.id));
}

/** Eski kahve halkaları: her gün bir tane daha. */
export const COFFEE_RINGS: [number, number, number][] = [
  [1120, 690, 34],
  [455, 742, 30],
  [1320, 700, 32],
  [880, 736, 28],
];
