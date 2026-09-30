import type { ReactElement } from 'react';
import type { StoryState } from '../../game/store';
import { CakePlate, Envelope, Scarf, Umbrella } from './DeskExtrasArt';

/*
 * The desk remembers the week. Things turn up because of the calendar (the birthday cake plate,
 * a wet umbrella against the water cooler, a scarf on the partition) and because of you (the
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
  note?: { color: string; lines: string[]; rot: number };
  /** Clicking it clears it off the desk for good. */
  clears?: boolean;
}

interface Ctx {
  dayIndex: number;
  story: StoryState;
  performans: number;
  /** Already thrown away / put in your bag. */
  cleared: string[];
}

/** What's on the desk today besides the usual. */
export function deskExtras({ dayIndex, story, performans, cleared }: Ctx): DeskExtra[] {
  const out: DeskExtra[] = [];
  if (dayIndex >= 2) {
    out.push({
      id: 'cake',
      box: [352, 500, 130, 70],
      label: 'Pasta tabağı',
      thought: dayIndex === 2 ? 'Dünkü doğum günü pastasından kalan tabak. Mutfaktaki çöpe attın.' : 'İki gündür duran tabak. Krema kurumuştu. Çöpe attın.',
      art: <CakePlate stale={dayIndex > 2} />,
      clears: true,
    });
  }
  if (dayIndex === 2) {
    out.push({ id: 'umbrella', box: [1784, 420, 64, 210], label: 'Islak şemsiye', thought: 'Şemsiyeni sebilin yanına dayadın. Altında küçük bir su birikintisi oluştu.', art: <Umbrella /> });
  }
  if (dayIndex === 3) {
    out.push({ id: 'scarf', box: [1146, 352, 160, 130], label: 'Atkı', thought: 'Karda yürüyüp geldin. Atkın hâlâ soğuk ve ıslak.', art: <Scarf /> });
  }
  // unpaid bills leave a final notice on the desk; read it and it goes back in your bag
  if (story.bills.fatura === 'skipped' && dayIndex >= 2) {
    out.push({
      id: 'bill',
      box: [520, 716, 140, 80],
      label: 'Zarf: SON İHTAR',
      thought: 'Elektrik faturası: son ihtar. Okuyup çantana koydun.',
      art: <Envelope paid={false} />,
      clears: true,
    });
  }
  if (story.bills.kart === 'skipped' && dayIndex >= 3) {
    out.push({
      id: 'bank',
      box: [4, 606, 130, 80],
      label: 'Banka ihtarı',
      thought: 'Bankadan ihtar: "Kartınız kullanıma kapatılmıştır." Okuyup çantana koydun.',
      art: <Envelope paid={false} />,
      clears: true,
    });
  }
  // his note on your monitor — but no "well done" the morning after you went against him
  const wentAgainst = story.managerDay.defied.length > 0;
  if (dayIndex >= 1 && (performans < 45 || (performans > 60 && !wentAgainst))) {
    const low = performans < 45;
    out.push({
      id: 'manager-note',
      box: [836, 78, 126, 96],
      label: 'Hakan Bey\'in notu',
      thought: low ? 'Sabah monitörüne yapıştırılmış not: "Uğra bir. — H.K." Uğramadın. Uğramak istemiyorsun.' : 'Sabah monitörüne yapıştırılmış not: "Aferin, böyle devam. — H.K." Neden bu kadar rahatsız etti?',
      note: { color: low ? 'linear-gradient(180deg, #f2a291 0%, #f6b5a6 100%)' : 'linear-gradient(180deg, #a7d9b0 0%, #bfe5c5 100%)', lines: low ? ['Uğra bir.', '— H.K.'] : ['Aferin,', 'böyle devam.', '— H.K.'], rot: low ? -4 : 3 },
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
