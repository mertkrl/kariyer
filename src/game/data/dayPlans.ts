/*
 * Weather shapes each workday: a storm makes the servis late. (Calendar items that simply ate
 * the clock — meetings, the cake, the fire drill — were cut: the day is short enough.)
 */

export interface CalendarItem {
  /** Workday minute it happens. */
  at: number;
  /** Game minutes it takes from you. */
  minutes: number;
  icon: string;
  title: string;
  /** Shown as a toast when it happens. */
  text: string;
  /** Not in the morning memo — it just happens. */
  surprise?: boolean;
}

export interface DayPlan {
  weather: { icon: string; text: string };
  /** You start the day late by this many minutes. */
  lateStart?: { minutes: number; text: string };
  calendar: CalendarItem[];
}

export const DAY_PLANS: DayPlan[] = [
  {
    weather: { icon: '☀️', text: 'Güneşli, 14°C. Trafik her pazartesiki gibi.' },
    calendar: [],
  },
  {
    weather: { icon: '🌬️', text: 'Poyraz, 9°C. Vapur seferlerinde aksama var.' },
    calendar: [],
  },
  {
    weather: { icon: '🌧️', text: 'Sağanak, 8°C. Servisler gecikmeli.' },
    calendar: [],
  },
  {
    weather: { icon: '❄️', text: 'Kar yağışı, -1°C. Yollar kaygan.' },
    calendar: [],
  },
  {
    weather: { icon: '🌤️', text: 'Parçalı bulutlu, 6°C. Kar dindi.' },
    calendar: [],
  },
];
