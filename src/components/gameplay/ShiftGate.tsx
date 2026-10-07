import { useGameStore, approvalQuota, lineupFor } from '../../game/store/store';
import { days } from '../../game/data/days';
import { formatClock } from '../../game/lib/time';
import { audioEngine } from '../../audio/audioEngine';
import styles from './ShiftGate.module.css';

/** Saat başlamadan önce portalın üstündeki kart: gün, kuyruk, "Mesaiye Başla". */
export function ShiftGate() {
  const currentDayIndex = useGameStore((s) => s.currentDayIndex);
  const workdayMinutes = useGameStore((s) => s.workdayMinutes);
  const lateReason = useGameStore((s) => s.lateReason);
  const lineups = useGameStore((s) => s.lineups);
  const dailyLimit = useGameStore((s) => approvalQuota(s).dailyLimit);
  const startShift = useGameStore((s) => s.startShift);
  const day = days[currentDayIndex];
  const lineupSize = lineupFor({ currentDayIndex, lineups }).length;
  return (
    <div className={styles.shiftGate}>
      <div className={styles.shiftCard}>
        <div className={styles.shiftEyebrow}>
          {day.dayName} · Gün {day.day}
        </div>
        <div className={`${styles.shiftClock} mono`}>{formatClock(workdayMinutes)}</div>
        <p>
          {lateReason && (
            <>
              {lateReason}
              <br />
            </>
          )}
          Kuyrukta bugün <b>{lineupSize} dosya</b> var. Mülakat kontenjanı: <b>{dailyLimit}</b> aday.
          <br />
          Mesaiyi başlattığında saat işlemeye başlar.
        </p>
        <button
          className={styles.shiftButton}
          onClick={() => {
            audioEngine.playUi('connect');
            startShift();
          }}
        >
          Mesaiye Başla
        </button>
      </div>
    </div>
  );
}
