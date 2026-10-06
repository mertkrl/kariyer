import { useGameStore, isOnBreak, lineupFor, readingOf, TEAM_LATE_DAY, TEAM_LATE_END } from '../../game/store';
import { NEIGHBOUR_ID, candidateOf } from '../../game/data/candidates';
import { days } from '../../game/data/days';
import { Button } from '../ui/Button';
import { wasConsidered } from '../../game/engine/scoring';
import styles from '../../screens/GameplayScreen.module.css';

/*
 * The portal's left column: the manager's note for the day, today's queue with the time spent
 * on each file, and the way out of the day (or back to the rejection notices). It reads what
 * it shows from the store itself, so the rest of the screen doesn't carry it around.
 */

function formatTime(totalSeconds: number) {
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${mm}:${ss < 10 ? '0' : ''}${ss}`;
}

interface Props {
  /** The notices screen is tucked away (the player went back to the files). */
  mailsHidden: boolean;
  onShowMails: () => void;
  editingMails: boolean;
  onEditMails: () => void;
}

export function QueueSidebar({ mailsHidden, onShowMails, editingMails, onEditMails }: Props) {
  const currentDayIndex = useGameStore((s) => s.currentDayIndex);
  const lineups = useGameStore((s) => s.lineups);
  const decisions = useGameStore((s) => s.decisions);
  const openedIds = useGameStore((s) => s.openedIds);
  const timeSpent = useGameStore((s) => s.timeSpent);
  const readThrough = useGameStore((s) => s.readThrough);
  const referenceChecks = useGameStore((s) => s.referenceChecks);
  const currentCandidateId = useGameStore((s) => s.currentCandidateId);
  const selectCandidate = useGameStore((s) => s.selectCandidate);
  const finishDay = useGameStore((s) => s.finishDay);
  const plannedRejections = useGameStore((s) => s.plannedRejections);
  const rejectionMailsSent = useGameStore((s) => s.rejectionMailsSent);
  // only whether it matters, not the minute: the column doesn't redraw with the clock
  const onBreak = useGameStore((s) => isOnBreak(s));
  const stayingLate = useGameStore((s) => s.currentDayIndex === TEAM_LATE_DAY && s.workdayMinutes < TEAM_LATE_END);

  const day = days[currentDayIndex];
  const lineup = lineupFor({ currentDayIndex, lineups });
  const todaysRejects = lineup.filter((id) => decisions[id] === 'reject');
  const pendingMails = !rejectionMailsSent && todaysRejects.some((id) => !plannedRejections[id]);
  const plannedCount = Object.keys(plannedRejections).length;
  const open = lineup.filter((id) => !decisions[id]).length;

  return (
    <div className={styles.sidebar}>
      <div className={styles.ruleNote} data-tour="rule">
        <div className={styles.ruleLabel}>İK Müdüründen Not</div>
        <div className={styles.ruleText}>"{day.ruleText}"</div>
      </div>
      <div className={styles.queueBox} data-tour="queue">
        <div className={styles.queueLabel}>Adaylar</div>
        <div className={styles.queueList}>
          {lineup.map((id) => {
            const c = candidateOf(id);
            const isSelected = id === currentCandidateId;
            const isOpened = openedIds.includes(id);
            const isDecided = !!decisions[id];
            return (
              <button
                key={id}
                className={`${styles.queueItem} ${isSelected ? styles.queueItemSelected : ''} ${
                  decisions[id] === 'approve' ? styles.queueApproved : decisions[id] === 'reject' ? styles.queueRejected : ''
                }`}
                onClick={() => selectCandidate(id)}
                disabled={onBreak}
                aria-current={isSelected ? 'true' : undefined}
              >
                <span className={styles.queueAvatar} style={{ background: c.color, opacity: isOpened ? 1 : 0.5 }} />
                <span className={styles.queueName}>
                  {c.name}
                  {id === NEIGHBOUR_ID && <em className={styles.queueTag}>Tavsiye</em>}
                </span>
                {/* the visible column is a glance (a time, a dash); a screen reader hears it in words */}
                <span className="sr-only">
                  {decisions[id] === 'approve' ? ', mülakata çağrıldı' : decisions[id] === 'reject' ? ', reddedildi' : isOpened ? ', açıldı' : ', henüz açılmadı'}
                </span>
                <span className={`${styles.queueTime} mono`}>
                  <span aria-hidden="true">{isOpened ? (isDecided ? `⏱ ${formatTime(timeSpent[id] ?? 0)}` : formatTime(timeSpent[id] ?? 0)) : '—'}</span>
                  {wasConsidered(readingOf({ timeSpent, readThrough, referenceChecks }, id)) && (
                    <span className={styles.queueRead} title="Dosyayı okudun">
                      {' '}✓<span className="sr-only">okundu</span>
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {!open && pendingMails && mailsHidden ? (
        <Button variant="gold" onClick={onShowMails}>
          Ret bildirimleri ({todaysRejects.length}) →
        </Button>
      ) : (
        <>
          {!open && !pendingMails && plannedCount > 0 && !rejectionMailsSent && !editingMails && (
            <button className={styles.outboxNote} onClick={onEditMails}>
              ✉ {plannedCount} bildirim giden kutusunda · 17:00 <span>Düzenle</span>
            </button>
          )}
          <DayFinish
            decided={lineup.length - open}
            total={lineup.length}
            blocker={open ? `${open} dosya açık` : pendingMails ? 'Ret bildirimleri bekliyor' : stayingLate ? "Ekipçe 19:00'a kadar kalınıyor" : null}
            onFinish={finishDay}
          />
        </>
      )}
    </div>
  );
}

/** The end of the day: how far the queue is, what still stands in the way, and the button. */
function DayFinish({ decided, total, blocker, onFinish }: { decided: number; total: number; blocker: string | null; onFinish: () => void }) {
  const ready = blocker === null;
  const pct = total ? Math.round((decided / total) * 100) : 100;
  return (
    <div className={`${styles.finishCard} ${ready ? styles.finishReady : ''}`} data-tour="finish">
      <div className={styles.finishHead}>
        <span>Günün dosyaları</span>
        <span className="mono">
          {decided}/{total}
        </span>
      </div>
      <div className={styles.finishTrack} role="progressbar" aria-label="Karar verilen dosyalar" aria-valuenow={decided} aria-valuemin={0} aria-valuemax={total}>
        <i style={{ width: `${pct}%` }} />
      </div>
      <button className={styles.finishButton} onClick={onFinish} disabled={!ready} aria-describedby="finish-state">
        {ready ? 'Günü Bitir →' : 'Günü Bitir'}
      </button>
      <div id="finish-state" className={styles.finishState}>
        {ready ? '✓ Bütün dosyalar kapandı' : blocker}
      </div>
    </div>
  );
}
