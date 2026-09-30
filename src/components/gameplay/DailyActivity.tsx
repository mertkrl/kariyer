import type { Candidate, Decision } from '../../game/types';
import type { DecisionLogEntry } from '../../game/store';
import { formatClock } from '../../game/time';
import { CommuteScene } from './CommuteScene';
import { BREAK_END_MIN, BREAK_START_MIN, WORKDAY_END_MIN } from '../../game/time';
import styles from './DailyActivity.module.css';

interface DailyActivityProps {
  candidateIds: string[];
  candidates: Record<string, Candidate>;
  decisions: Record<string, Decision>;
  decisionLog: DecisionLogEntry[];
  timeSpent: Record<string, number>;
  currentCandidateId: string | null;
  className?: string;
  workdayMinutes: number;
}

function formatDuration(totalSeconds: number) {
  const mm = Math.floor(totalSeconds / 60);
  const ss = Math.round(totalSeconds % 60);
  return `${mm}:${ss < 10 ? '0' : ''}${ss}`;
}

/** "Bugünün İşlemleri" — progress, tallies and a live activity log for the current workday. */
export function DailyActivity({
  candidateIds,
  candidates,
  decisions,
  decisionLog,
  timeSpent,
  currentCandidateId,
  className,
  workdayMinutes,
}: DailyActivityProps) {
  const total = candidateIds.length;
  const approved = candidateIds.filter((id) => decisions[id] === 'approve').length;
  const rejected = candidateIds.filter((id) => decisions[id] === 'reject').length;
  const done = approved + rejected;
  const pending = total - done;

  const decidedTimes = candidateIds.filter((id) => decisions[id]).map((id) => timeSpent[id] ?? 0);
  const avg = decidedTimes.length ? decidedTimes.reduce((a, b) => a + b, 0) / decidedTimes.length : null;

  const recent = [...decisionLog].reverse();

  // Pace: where you "should" be by now if the files were spread evenly over working hours.
  const workMinutes = WORKDAY_END_MIN - (BREAK_END_MIN - BREAK_START_MIN);
  const worked =
    workdayMinutes <= BREAK_START_MIN
      ? workdayMinutes
      : workdayMinutes >= BREAK_END_MIN
        ? workdayMinutes - (BREAK_END_MIN - BREAK_START_MIN)
        : BREAK_START_MIN;
  const expected = (total * worked) / workMinutes;
  const pace = Math.round(done - expected);
  const paceText = pace > 0 ? `${pace} dosya öndesin` : pace < 0 ? `${-pace} dosya geridesin` : 'tam zamanında';

  return (
    <section className={`${styles.box} ${className ?? ''}`} aria-label="Bugünün işlemleri">
      <CommuteScene dayIndex={0} title="Bugünün İşlemleri" progress={`${done}/${total}`} />

      <div className={styles.segments} role="img" aria-label={`${done} / ${total} aday sonuçlandı`}>
        {candidateIds.map((id) => {
          const d = decisions[id];
          return (
            <span
              key={id}
              title={`${candidates[id].name}: ${d === 'approve' ? 'mülakatta' : d === 'reject' ? 'reddedildi' : 'bekliyor'}`}
              className={`${styles.segment} ${d === 'approve' ? styles.segApprove : d === 'reject' ? styles.segReject : ''} ${
                id === currentCandidateId && !d ? styles.segActive : ''
              }`}
            />
          );
        })}
      </div>

      <div className={styles.tiles}>
        <div className={`${styles.tile} ${styles.tileApprove}`}>
          <span className={`${styles.tileValue} mono`}>{approved}</span>
          <span className={styles.tileLabel}>Mülakat</span>
        </div>
        <div className={`${styles.tile} ${styles.tileReject}`}>
          <span className={`${styles.tileValue} mono`}>{rejected}</span>
          <span className={styles.tileLabel}>Ret</span>
        </div>
        <div className={`${styles.tile} ${styles.tilePending}`}>
          <span className={`${styles.tileValue} mono`}>{pending}</span>
          <span className={styles.tileLabel}>Bekleyen</span>
        </div>
      </div>

      <div className={styles.metrics}>
        <div className={styles.metric}>
          <span>Ort. karar süresi</span>
          <span className="mono">{avg === null ? '—' : formatDuration(avg)}</span>
        </div>
        <div className={styles.metric}>
          <span>Tempo</span>
          <span className={`mono ${pace < 0 ? styles.paceBehind : pace > 0 ? styles.paceAhead : ''}`}>{paceText}</span>
        </div>
      </div>

      <div className={styles.logHead}>
        <span>Son İşlemler</span>
        {recent.length > 0 && <span className="mono">{recent.length}</span>}
      </div>
      {recent.length === 0 ? (
        <div className={styles.empty}>Henüz bir karar verilmedi.</div>
      ) : (
        <ol className={styles.log} aria-live="polite">
          {recent.map((entry, i) => {
            const c = candidates[entry.id];
            const approve = entry.decision === 'approve';
            return (
              <li key={`${entry.id}-${entry.at}`} className={`${styles.logItem} ${i === 0 ? styles.logItemNew : ''}`}>
                <span className={styles.logAvatar} style={{ background: c.color }}>
                  {c.initials}
                </span>
                <span className={styles.logText}>
                  <span className={styles.logName}>{c.name}</span>
                  <span className={`${styles.logAction} ${approve ? styles.actionApprove : styles.actionReject}`}>
                    {approve ? 'Mülakata çağrıldı' : 'Reddedildi'}
                  </span>
                </span>
                <span className={`${styles.logTime} mono`}>{formatClock(entry.at)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
