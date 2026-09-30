import { useState } from 'react';
import { lineupFor, useGameStore, TEAM_LATE_DAY, TEAM_LATE_END } from '../../game/store';
import { days } from '../../game/data/days';
import { candidateOf } from '../../game/data/candidates';
import { MEETING_AT, MEETING_DAY, MEETING_MINUTES } from '../../game/meeting';
import { BREAK_END_MIN, BREAK_START_MIN, WORKDAY_END_MIN, formatClock } from '../../game/time';
import type { Decision } from '../../game/types';
import styles from './CalendarApp.module.css';

/*
 * The work calendar: this week, Monday to Friday, 08:00–20:00. The fixed things (the working
 * day, lunch, Wednesday's online meeting, Friday's interviews, Thursday's late evening once it
 * is announced) and whatever today added. Pick a day to see its files: today's queue with where
 * each file stands, the decisions of the days behind you, and Friday's interview list.
 */

const START = 0; // 08:00
const END = 12 * 60; // 20:00
const HOUR_PX = 30;
const y = (minute: number) => ((minute - START) / 60) * HOUR_PX;

interface CalEvent {
  at: number;
  end: number;
  title: string;
  place?: string;
  kind: 'meeting' | 'interview' | 'late' | 'lunch' | 'personal';
}

/** Friday's interviews: a morning and an afternoon block. */
const INTERVIEWS: [number, number][] = [
  [60, 240],
  [300, 480],
];

export function CalendarApp() {
  const dayIndex = useGameStore((s) => s.currentDayIndex);
  const minutes = useGameStore((s) => s.workdayMinutes);
  const lineups = useGameStore((s) => s.lineups);
  const decisions = useGameStore((s) => s.decisions);
  const weekLog = useGameStore((s) => s.weekLog);
  const finalists = useGameStore((s) => s.finalists);
  const extraFiles = useGameStore((s) => s.extraFiles);
  const dayEvents = useGameStore((s) => s.dayEvents);
  const [selected, setSelected] = useState(dayIndex);

  const eventsFor = (d: number): CalEvent[] => {
    const out: CalEvent[] = [];
    if (!days[d].final) out.push({ at: BREAK_START_MIN, end: BREAK_END_MIN, title: 'Öğle arası', kind: 'lunch' });
    if (d === MEETING_DAY) out.push({ at: MEETING_AT, end: MEETING_AT + MEETING_MINUTES, title: 'Haftalık İK toplantısı', place: 'Görüntülü görüşme', kind: 'meeting' });
    // announced on Thursday afternoon; it isn't in anyone's calendar before that
    if (d === TEAM_LATE_DAY && dayIndex >= TEAM_LATE_DAY) out.push({ at: WORKDAY_END_MIN, end: TEAM_LATE_END, title: 'Ekipçe geç mesai', place: 'Sistem arızası · yemek şirketten', kind: 'late' });
    if (days[d].final) {
      out.push({ at: INTERVIEWS[0][0], end: INTERVIEWS[0][1], title: 'Final mülakatları', place: 'Toplantı odası · Levent Arslan, Hakan Kaya', kind: 'interview' });
      out.push({ at: INTERVIEWS[1][0], end: INTERVIEWS[1][1], title: 'Final mülakatları', place: 'Toplantı odası · karar toplantısı', kind: 'interview' });
    }
    if (d === dayIndex)
      for (const e of dayEvents)
        if (e.kind === 'calendar' && e.text) out.push({ at: e.at, end: e.at + (e.minutes ?? 15), title: e.text, kind: 'personal' });
    return out.sort((a, b) => a.at - b.at);
  };

  const hours = Array.from({ length: (END - START) / 60 + 1 }, (_, i) => START + i * 60);

  return (
    <div className={styles.app}>
      <section className={styles.week} aria-label="Bu hafta">
        <header className={styles.weekHead}>
          <b>Takvim</b>
          <span>Hafta 39 · {days[0].dayName} – {days[days.length - 1].dayName}</span>
        </header>
        <div className={styles.grid}>
          <div className={styles.hours} style={{ height: y(END) }}>
            {hours.map((h) => (
              <span key={h} style={{ top: y(h) }}>
                {formatClock(h)}
              </span>
            ))}
          </div>
          {days.map((day, d) => (
            <button
              key={day.day}
              className={`${styles.col} ${d === selected ? styles.colSelected : ''} ${d === dayIndex ? styles.colToday : ''} ${d < dayIndex ? styles.colPast : ''}`}
              onClick={() => setSelected(d)}
              aria-pressed={d === selected}
            >
              <span className={styles.colHead}>
                {day.dayName}
                {d === dayIndex && <em>Bugün</em>}
              </span>
              <span className={styles.colBody} style={{ height: y(END) }}>
                {hours.map((h) => (
                  <i key={h} className={styles.hourLine} style={{ top: y(h) }} />
                ))}
                {/* the working day */}
                <i className={styles.workBand} style={{ top: y(0), height: y(WORKDAY_END_MIN) }} />
                {eventsFor(d).map((e, i) => (
                  <span key={i} className={`${styles.event} ${styles[e.kind]}`} style={{ top: y(e.at), height: Math.max(16, y(e.end) - y(e.at)) }} title={`${formatClock(e.at)}–${formatClock(e.end)} · ${e.title}`}>
                    <b>{e.title}</b>
                    {y(e.end) - y(e.at) > 26 && <small>{formatClock(e.at)}</small>}
                  </span>
                ))}
                {d === dayIndex && <i className={styles.now} style={{ top: y(Math.min(END, minutes)) }} />}
              </span>
            </button>
          ))}
        </div>
      </section>

      <DayDetail
        d={selected}
        today={dayIndex}
        events={eventsFor(selected)}
        lineup={lineupFor({ currentDayIndex: selected, lineups })}
        decisions={selected === dayIndex ? decisions : Object.fromEntries(weekLog.filter((e) => e.day === selected).map((e) => [e.id, e.decision]))}
        extra={extraFiles[selected] ?? []}
        finalists={finalists.map((f) => f.id)}
      />
    </div>
  );
}

function DayDetail({ d, today, events, lineup, decisions, extra, finalists }: { d: number; today: number; events: CalEvent[]; lineup: string[]; decisions: Record<string, Decision>; extra: string[]; finalists: string[] }) {
  const day = days[d];
  const status = (id: string) => (decisions[id] === 'approve' ? 'Mülakatta' : decisions[id] === 'reject' ? 'Reddedildi' : 'Açık');
  return (
    <aside className={styles.detail} aria-label={`${day.dayName} ayrıntıları`}>
      <h3>
        {day.dayName} <small>Gün {day.day}</small>
      </h3>

      <h4>Etkinlikler</h4>
      {events.filter((e) => e.kind !== 'lunch').length === 0 ? (
        <p className={styles.empty}>Mesai dışında bir etkinlik yok.</p>
      ) : (
        <ul className={styles.agenda}>
          {events
            .filter((e) => e.kind !== 'lunch')
            .map((e, i) => (
              <li key={i} className={styles[e.kind]}>
                <span className="mono">
                  {formatClock(e.at)}–{formatClock(e.end)}
                </span>
                <span>
                  <b>{e.title}</b>
                  {e.place && <small>{e.place}</small>}
                </span>
              </li>
            ))}
        </ul>
      )}

      <h4>{day.final ? 'Mülakat listesi' : 'Günün adayları'}</h4>
      {day.final ? (
        finalists.length ? (
          <ul className={styles.people}>
            {finalists.map((id) => (
              <li key={id}>
                <span className={styles.dot} style={{ background: candidateOf(id).color }} />
                {candidateOf(id).name}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>Henüz mülakata çağrılan aday yok.</p>
        )
      ) : d > today ? (
        <p className={styles.empty}>Başvurular o sabah portala düşer.</p>
      ) : (
        <ul className={styles.people}>
          {lineup.map((id) => (
            <li key={id}>
              <span className={styles.dot} style={{ background: candidateOf(id).color }} />
              <span className={styles.personName}>
                {candidateOf(id).name}
                {extra.includes(id) && <em>Ek dosya</em>}
              </span>
              <span className={`${styles.status} ${styles['s_' + (decisions[id] ?? 'open')]}`}>{status(id)}</span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
