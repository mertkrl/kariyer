import type { ReactNode, Ref } from 'react';
import { replyText, type ManagerRequest, type PhoneMessage, type ThreadId } from '../../game/day/manager';
import { formatClock } from '../../game/lib/time';
import styles from './ChatThread.module.css';

const DAY_NAMES = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];

/** Bir mesaj; sohbet yeni bir güne geçince üstünde gün etiketiyle. */
function MessageRow({ m, newDay, children }: { m: PhoneMessage; newDay: boolean; children: ReactNode }) {
  return (
    <>
      {newDay && m.day !== undefined && <div className={styles.dayDivider}>{DAY_NAMES[m.day]}</div>}
      {children}
    </>
  );
}

/** Açık bir konuşma: mesajlar, "yazıyor" balonu, hızlı cevaplar ve müdürün bekleyen ricası. */
export function ChatThread({
  ref,
  thread,
  messages,
  typing,
  quick,
  pending,
  stance,
  onQuickReply,
  onAnswer,
}: {
  ref: Ref<HTMLDivElement>;
  thread: ThreadId;
  messages: PhoneMessage[];
  typing: boolean;
  quick?: PhoneMessage;
  pending?: ManagerRequest;
  stance: { refusals: number; complies: number };
  onQuickReply: (messageId: number, replyIndex: number) => void;
  onAnswer: (requestId: string, answer: 'comply' | 'refuse') => void;
}) {
  return (
    <>
      <div className={styles.messages} ref={ref} aria-live="polite">
        {messages.length === 0 && <div className={styles.empty}>Mesaj yok. Şimdilik.</div>}
        {messages.map((m, i) => (
          <MessageRow key={m.id} m={m} newDay={i === 0 || (messages[i - 1].day ?? 0) !== (m.day ?? 0)}>
            <div className={`${styles.bubble} ${m.from === 'me' ? `${styles.mine} ${styles.sent}` : styles.theirs}`}>
              {m.sender && <span className={styles.sender}>{m.sender}</span>}
              {m.text}
              <span className={`${styles.time} mono`}>
                {formatClock(m.at)}
                {m.from === 'me' && <span className={styles.ticks}> ✓✓</span>}
              </span>
            </div>
          </MessageRow>
        ))}
        {typing && (
          <div className={`${styles.bubble} ${styles.theirs} ${styles.typingBubble}`} aria-label="yazıyor">
            <i />
            <i />
            <i />
          </div>
        )}
      </div>
      {quick && (
        <div className={styles.replies}>
          <span className={styles.replyHint}>{thread === 'manager' ? 'Müdür cevabını bekliyor' : 'Cevap vermek sana kalmış'}</span>
          {quick.replies!.map((r, i) => (
            <button key={r.text} className={`${styles.replyComply} ${styles.replyChip}`} style={{ animationDelay: `${i * 70}ms` }} onClick={() => onQuickReply(quick.id, i)}>
              {r.text}
            </button>
          ))}
        </div>
      )}
      {pending && (
        <div className={styles.replies}>
          <button className={styles.replyComply} onClick={() => onAnswer(pending.id, 'comply')}>
            {replyText('comply', stance)}
          </button>
          <button className={styles.replyRefuse} onClick={() => onAnswer(pending.id, 'refuse')}>
            {replyText('refuse', stance)}
          </button>
        </div>
      )}
    </>
  );
}
