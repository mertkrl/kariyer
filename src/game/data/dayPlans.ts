/*
 * Hava her iş gününü biçimlendirir: fırtına servisi geciktirir. (Yalnızca saati yiyen takvim
 * öğeleri, yani toplantılar, pasta ve yangın tatbikatı çıkarıldı: gün zaten yeterince kısa.)
 */

export interface CalendarItem {
  /** Olduğu mesai dakikası. */
  at: number;
  /** Senden aldığı oyun dakikası. */
  minutes: number;
  icon: string;
  title: string;
  /** Olduğu anda bildirim olarak gösterilir. */
  text: string;
  /** Sabah memosunda yok: kendiliğinden olur. */
  surprise?: boolean;
}

export interface DayPlan {
  weather: { icon: string; text: string };
  /** Güne bu kadar dakika geç başlarsın. */
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
