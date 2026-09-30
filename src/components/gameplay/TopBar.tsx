import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { WORKDAY_END_MIN, formatClock } from '../../game/time';
import { SoundToggle } from '../ui/SoundToggle';
import { SettingsIcon } from '../ui/ControlIcons';
import styles from './TopBar.module.css';

interface MeterProps {
  label: string;
  value: number;
  color: string;
  icon: string;
}

/** Stat meter that flashes a floating "+3 / −2" whenever the value moves. */
function Meter({ label, value, color, icon }: MeterProps) {
  const previous = useRef(value);
  const [delta, setDelta] = useState<{ amount: number; key: number } | null>(null);

  useEffect(() => {
    const diff = value - previous.current;
    previous.current = value;
    if (diff !== 0) setDelta((d) => ({ amount: diff, key: (d?.key ?? 0) + 1 }));
  }, [value]);

  return (
    <div className={styles.meter} style={{ '--meter': color } as CSSProperties}>
      <div className={styles.meterHead}>
        <span className={styles.meterIcon} aria-hidden="true">
          {icon}
        </span>
        <span className={styles.meterLabel}>{label}</span>
        <span className={`${styles.meterValue} mono`}>{Math.round(value)}</span>
        {delta && (
          <span
            key={delta.key}
            className={`${styles.delta} ${delta.amount > 0 ? styles.deltaUp : styles.deltaDown} mono`}
          >
            {delta.amount > 0 ? '+' : '−'}
            {Math.abs(Math.round(delta.amount))}
          </span>
        )}
      </div>
      <div className={styles.meterTrack}>
        <div className={styles.meterFill} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
        {[25, 50, 75].map((t) => (
          <span key={t} className={styles.meterTick} style={{ left: `${t}%` }} />
        ))}
      </div>
    </div>
  );
}

interface TopBarProps {
  day: number;
  dayCount: number;
  dayName: string;
  /** 1-based day of the interview (final) round, marked in the week strip. */
  interviewDay: number;
  workdayMinutes: number;
  onBreak: boolean;
  /** Past 17:00 with files still open. */
  overtime: boolean;
  performans: number;
  vicdan: number;
  /** Bank balance (TL). */
  money?: number;
  paused: boolean;
  onSettings: () => void;
  hard?: boolean;
  /** At the computer: a way back to the desk. */
  onDesk?: () => void;
}

export function TopBar({ day, dayCount, dayName, interviewDay, workdayMinutes, onBreak, overtime, performans, vicdan, paused, onSettings, hard, onDesk }: TopBarProps) {
  const lastHour = !overtime && workdayMinutes >= WORKDAY_END_MIN - 60;
  const status = paused ? 'Duraklatıldı' : onBreak ? 'Mola' : overtime ? 'Fazla mesai' : 'Mesai';

  return (
    <header className={styles.bar}>
      {/* back to the desk (at the computer) + the week */}
      <div className={styles.left}>
        {onDesk && (
          <>
            <button className={styles.deskButton} onClick={onDesk} title="Masaya dön (Esc)">
              <span aria-hidden="true">←</span>
              <span className={styles.brandText}>
                <strong>Masaya dön</strong>
                <span>Esc</span>
              </span>
            </button>
            <span className={styles.sep} />
          </>
        )}
        <div className={styles.day}>
          <div className={styles.dayTop}>
            <span className={`${styles.dayNumber} mono`}>
              Gün {day}
              <span className={styles.dayOf}>/{dayCount}</span>
            </span>
            <span className={styles.dayName}>{dayName}</span>
            {hard && <span className={styles.hardChip}>ZOR</span>}
          </div>
          <div className={styles.week} aria-label={`Hafta ilerlemesi: ${day}. gün`}>
            {Array.from({ length: dayCount }).map((_, i) => {
              const n = i + 1;
              return (
                <span
                  key={n}
                  className={`${styles.weekStep} ${n < day ? styles.weekDone : n === day ? styles.weekNow : ''} ${n === interviewDay ? styles.weekInterview : ''}`}
                  title={n === interviewDay ? 'Mülakat günü' : `${n}. gün`}
                >
                  {n === interviewDay ? '★' : ''}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* the clock: time, and whether you're on shift, on break or staying late */}
      <div className={styles.center}>
        <div className={`${styles.clock} ${lastHour || overtime ? styles.clockUrgent : ''} ${onBreak ? styles.clockBreak : ''}`}>
          <span className={`${styles.clockTime} mono`}>{formatClock(workdayMinutes)}</span>
          <span className={styles.clockStatus}>
            <span className={styles.clockDot} />
            {status}
          </span>
        </div>
      </div>

      {/* you: how the week is judging you, and what's left in the account */}
      <div className={styles.right}>
        <Meter label="Performans" value={performans} color="#5b8fc2" icon="▲" />
        <Meter label="Vicdan" value={vicdan} color="#4f8a7e" icon="♥" />
        <span className={styles.sep} />
        <span className={styles.sep} />
        <div className={styles.controls}>
          <SoundToggle variant="inline" />
          <button className={styles.iconButton} onClick={onSettings} aria-label="Ayarlar" title="Ayarlar (Esc)">
            <SettingsIcon className={styles.iconGlyph} />
          </button>
        </div>
      </div>
    </header>
  );
}
