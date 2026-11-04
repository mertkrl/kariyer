export const WORK_START_HOUR = 8;

export const BREAK_START_MIN = 4 * 60; // 12:00, 08:00'den 4 saat sonra
export const BREAK_END_MIN = 5 * 60; // 13:00, 1 saatlik öğle arası
export const WORKDAY_END_MIN = 9 * 60; // 17:00, 08:00'den 9 saat sonra
/** 17:00'de hâlâ açık olan dosyalar seni 20:00'ye kadar tutar (ücretsiz). */
export const OVERTIME_END_MIN = 12 * 60; // 20:00

export const MINUTES_PER_TICK = 1.3; // gerçek saniye başına oyun dakikası: tam bir iş günü (540 dk) gerçekte ~7 dk sürer

export function isBreakTime(workdayMinutes: number): boolean {
  return workdayMinutes >= BREAK_START_MIN && workdayMinutes < BREAK_END_MIN;
}

export function formatClock(workdayMinutes: number): string {
  const clamped = Math.min(workdayMinutes, OVERTIME_END_MIN);
  const totalMinutes = WORK_START_HOUR * 60 + clamped;
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = Math.floor(totalMinutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
