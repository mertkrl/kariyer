import type { ReactElement } from 'react';
import type { StoryState } from '../../game/store';
import { CakePlate, Envelope, Umbrella } from './DeskExtrasArt';
import { BIRTHDAY_DAY, RAINY_DAY, THURSDAY, WEDNESDAY } from '../../game/weekdays';

/*
 * The desk remembers the week. Things turn up because of the calendar (the birthday cake plate,
 * a wet umbrella against the water cooler) and because of you (the
 * final notice for a bill you didn't pay, the manager's note). The plate and the notices go once
 * you've dealt with them. Each one has a thought behind it.
 */

export interface DeskExtra {
  id: string;
  /** Stage position and size. */
  box: [number, number, number, number];
  label: string;
  thought: string;
  art?: ReactElement;
  /** A paper post-it (drawn like the rent note), stuck on the monitor's bezel. */
  /** Clicking it clears it off the desk for good. */
  clears?: boolean;
}

interface Ctx {
  dayIndex: number;
  story: StoryState;
  /** Already thrown away / put in your bag. */
  cleared: string[];
}

/** What's on the desk today besides the usual. */
export function deskExtras({ dayIndex, story, cleared }: Ctx): DeskExtra[] {
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
  // unpaid bills leave a final notice on the desk; read it and it goes back in your bag
  if (story.bills.fatura === 'skipped' && dayIndex >= WEDNESDAY) {
    out.push({
      id: 'bill',
      box: [520, 716, 140, 80],
      label: 'Zarf: SON İHTAR',
      thought: 'Elektrik faturası: son ihtar. Okuyup çantana koydun.',
      art: <Envelope paid={false} />,
      clears: true,
    });
  }
  if (story.bills.kart === 'skipped' && dayIndex >= THURSDAY) {
    out.push({
      id: 'bank',
      box: [4, 606, 130, 80],
      label: 'Banka ihtarı',
      thought: 'Bankadan ihtar: "Kartınız kullanıma kapatılmıştır." Okuyup çantana koydun.',
      art: <Envelope paid={false} />,
      clears: true,
    });
  }
   return out.filter((e) => !cleared.includes(e.id));
}

/** Old coffee rings: one more every day. */
export const COFFEE_RINGS: [number, number, number][] = [
  [1120, 690, 34],
  [455, 742, 30],
  [1320, 700, 32],
  [880, 736, 28],
];
