export const WORK_START_HOUR = 8;

export const BREAK_START_MIN = 4 * 60; // 12:00 — 4 hours after 08:00
export const BREAK_END_MIN = 5 * 60; // 13:00 — 1 hour lunch break
export const WORKDAY_END_MIN = 9 * 60; // 17:00 — 9 hours after 08:00
/** Files still open at 17:00 keep you until 20:00 (unpaid). */
export const OVERTIME_END_MIN = 12 * 60; // 20:00

export const MINUTES_PER_TICK = 1.3; // in-game minutes per real second — a full workday (540 min) takes ~7 min real time

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
