import { useGameStore, isOnBreak, lineupFor, readingOf, TEAM_LATE_DAY, TEAM_LATE_END } from '../../game/store/store';
import { NEIGHBOUR_ID, candidateOf } from '../../game/data/candidates';
import { Button } from '../ui/Button';
import { wasConsidered } from '../../game/engine/scoring';
import styles from '../../screens/GameplayScreen.module.css';
import own from './QueueSidebar.module.css';

/** Kuyrukta her dosyanın bir bakışlık durumu: rengi tek başına taşımaz, sözcükle de söyler. */
type QueueStatus = 'new' | 'opened' | 'reading' | 'approve' | 'reject';
const STATUS_LABEL: Record<QueueStatus, string> = {
  new: 'Okunmadı',
  opened: 'Açıldı',
  reading: 'Önünde',
  approve: '✓ Mülakata çağrıldı',
  reject: '✕ Reddedildi',
};

/*
 * Portalın sol sütunu: müdürün günün notu, her dosyaya harcanan süreyle bugünün kuyruğu ve
 * günden çıkış yolu (ya da ret bildirimlerine geri dönüş). Gösterdiğini store'dan kendisi okur;
 * böylece ekranın geri kalanı onu taşımak zorunda kalmaz.
 */

function formatTime(totalSeconds: number) {
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${mm}:${ss < 10 ? '0' : ''}${ss}`;
}

interface Props {
  /** Bildirimler ekranı bir kenara kaldırılmış (oyuncu dosyalara geri döndü). */
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
  // dakikanın kendisi değil yalnızca önemli olup olmadığı: sütun saatle birlikte yeniden çizilmez
  const onBreak = useGameStore((s) => isOnBreak(s));
  const stayingLate = useGameStore((s) => s.currentDayIndex === TEAM_LATE_DAY && s.workdayMinutes < TEAM_LATE_END);

  const lineup = lineupFor({ currentDayIndex, lineups });
  // her gün onay mülakata davettir
  const todaysRejects = lineup.filter((id) => decisions[id] === 'reject');
  const pendingMails = !rejectionMailsSent && todaysRejects.some((id) => !plannedRejections[id]);
  const plannedCount = Object.keys(plannedRejections).length;
  const open = lineup.filter((id) => !decisions[id]).length;

  return (
    <div className={styles.sidebar}>
      <div className={styles.queueBox} data-tour="queue">
        <div className={own.queueLabel}>Adaylar</div>
        <div className={styles.queueList}>
          {lineup.map((id) => {
            const c = candidateOf(id);
            const isSelected = id === currentCandidateId;
            const isOpened = openedIds.includes(id);
            const isDecided = !!decisions[id];
            const status: QueueStatus = decisions[id] ?? (isSelected ? 'reading' : isOpened ? 'opened' : 'new');
            return (
              <button
                key={id}
                className={`${styles.queueItem} ${isSelected ? own.queueItemSelected : ''} ${
                  decisions[id] === 'approve' ? own.queueApproved : decisions[id] === 'reject' ? own.queueRejected : ''
                }`}
                onClick={() => selectCandidate(id)}
                disabled={onBreak}
                aria-current={isSelected ? 'true' : undefined}
              >
                <span className={own.queueAvatar} style={{ background: c.color, opacity: isOpened ? 1 : 0.5 }} />
                <span className={own.queueText}>
                  <span className={own.queueName}>
                    {c.name}
                    {id === NEIGHBOUR_ID && <em className={own.queueTag}>Tavsiye</em>}
                  </span>
                  <span className={`${own.queueStatus} ${own[`status_${status}`]}`} aria-hidden="true">
                    {STATUS_LABEL[status]}
                  </span>
                </span>
                {/* görünen sütun bir bakışlıktır (bir süre, bir çizgi); ekran okuyucu onu sözcüklerle duyar */}
                <span className="sr-only">
                  {decisions[id] === 'approve' ? ', mülakata çağrıldı' : decisions[id] === 'reject' ? ', reddedildi' : isOpened ? ', açıldı' : ', henüz açılmadı'}
                </span>
                <span className={`${own.queueTime} mono`}>
                  <span aria-hidden="true">{isOpened ? (isDecided ? `⏱ ${formatTime(timeSpent[id] ?? 0)}` : formatTime(timeSpent[id] ?? 0)) : '—'}</span>
                  {wasConsidered(readingOf({ timeSpent, readThrough, referenceChecks }, id)) && (
                    <span className={own.queueRead} title="Dosyayı okudun">
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
            <button className={own.outboxNote} onClick={onEditMails}>
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

/** Günün sonu: kuyruğun ne kadar ilerlediği, hâlâ neyin engel olduğu ve düğme. */
function DayFinish({ decided, total, blocker, onFinish }: { decided: number; total: number; blocker: string | null; onFinish: () => void }) {
  const ready = blocker === null;
  const pct = total ? Math.round((decided / total) * 100) : 100;
  return (
    <div className={`${own.finishCard} ${ready ? own.finishReady : ''}`} data-tour="finish">
      <div className={own.finishRow}>
        <span>Dosyalar</span>
        <div className={own.finishTrack} role="progressbar" aria-label="Karar verilen dosyalar" aria-valuenow={decided} aria-valuemin={0} aria-valuemax={total}>
          <i style={{ width: `${pct}%` }} />
        </div>
        <span className="mono">
          {decided}/{total}
        </span>
      </div>
      <button className={own.finishButton} onClick={onFinish} disabled={!ready} title={blocker ?? undefined}>
        {ready ? 'Günü Bitir →' : `Günü Bitir · ${blocker}`}
      </button>
    </div>
  );
}
