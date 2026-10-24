import { dailyNote } from './daily';

/** Başlığın yanındaki sarı yapışkan not: tarih ve günün notu. Stili Salon verir. */
export function DailyNote({ now, className }: { now: Date; className: string }) {
  return (
    <aside className={className} aria-label="Günün notu">
      <small className="mono">{now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })}</small>
      <span>{dailyNote(now)}</span>
    </aside>
  );
}
