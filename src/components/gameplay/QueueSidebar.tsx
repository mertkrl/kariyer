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
              >
                <span className={styles.queueAvatar} style={{ background: c.color, opacity: isOpened ? 1 : 0.5 }} />
                <span className={styles.queueName}>
                  {c.name}
                  {id === NEIGHBOUR_ID && <em className={styles.queueTag}>Tavsiye</em>}
                </span>
                <span className={`${styles.queueTime} mono`}>
                  {isOpened ? (isDecided ? `⏱ ${formatTime(timeSpent[id] ?? 0)}` : formatTime(timeSpent[id] ?? 0)) : '—'}
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
          <Button
            variant="ghost"
            data-tour="finish"
            onClick={finishDay}
            disabled={open > 0 || pendingMails || stayingLate}
            title={open ? `${open} dosya açık: günü bitirmeden önce hepsine karar ver.` : stayingLate ? "Bugün ekipçe 19:00'a kadar kalınıyor." : 'Tüm dosyalar kapandı.'}
          >
            {open ? `Günü Bitir · ${open} dosya açık` : pendingMails ? 'Günü Bitir · bildirimler bekliyor' : 'Günü Bitir'}
          </Button>
        </>
      )}
    </div>
  );
}
