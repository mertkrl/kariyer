import type { PhoneMessage, ThreadId } from '../../game/day/manager';
import { formatClock } from '../../game/lib/time';
import { avatarStyle } from '../ui/avatarStyle';
import { CONTACTS, LATE_THREADS } from './phoneShared';
import styles from './Phone.module.css';
import own from './ChatList.module.css';

/** Sohbet listesi: her kişinin son mesajı ve okunmamış sayısı. */
export function ChatList({ messages, unread, muted, toneMood, onOpen }: { messages: PhoneMessage[]; unread: Record<ThreadId, number>; muted: ThreadId[]; toneMood: string; onOpen: (thread: ThreadId) => void }) {
  return (
    <div className={own.chatList}>
      {(Object.keys(CONTACTS) as ThreadId[])
        // Ayşe'nin özel sohbeti ve doğum günü grubu biri yazınca görünür
        .filter((t) => !LATE_THREADS.includes(t) || messages.some((m) => m.thread === t))
        .map((t) => {
          const last = [...messages].reverse().find((m) => m.thread === t);
          const c = CONTACTS[t];
          return (
            <button key={t} className={styles.chatRow} onClick={() => onOpen(t)}>
              <span className={styles.rowAvatar} style={avatarStyle(c.color)}>
                {c.avatar}
              </span>
              <span className={own.rowText}>
                <strong>
                  {c.name} {t === 'manager' && <span title="Müdürün havası">{toneMood}</span>}
                  {muted.includes(t) && <span title="Sessizde"> 🔕</span>}
                </strong>
                <span>{last ? `${last.from === 'me' ? 'Sen: ' : last.sender ? `${last.sender}: ` : ''}${last.text}` : 'Henüz mesaj yok'}</span>
              </span>
              <span className={own.rowMeta}>
                {last && <span className="mono">{formatClock(last.at)}</span>}
                {unread[t] > 0 && <span className={own.rowBadge}>{unread[t]}</span>}
              </span>
            </button>
          );
        })}
    </div>
  );
}
