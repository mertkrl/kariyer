import { Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  GROUP_THREADS,
  TONE_STATUS,
  managerTone,
  replyText,
  type ManagerRequest,
  type PhoneMessage,
  type ThreadId,
} from '../../game/manager';
import { formatClock } from '../../game/time';
import { AppIcon, type IconId } from './AppIcons';
import { PromotionGame } from './apps/PromotionGame';
import type { SocialAuthor } from './apps/SocialApp';
import type { DmCandidate } from './apps/candidateDms';
import type { DmKind } from '../../game/store';
import { useDialog } from '../ui/useDialog';
import styles from './Phone.module.css';

/*
 * The desk phone. In the right column it sits locked (clock + notification cards); clicking it
 * picks it up into a full phone you can actually use: WhatsApp-style chats (contacts list →
 * conversation), and a few time-wasting apps. The workday clock keeps running meanwhile.
 */

// The two big apps load when the phone is first picked up, not with the workday screen.
const loadSocial = () => import('./apps/SocialApp');
const loadTraffic = () => import('./apps/TrafficApp');
const SocialApp = lazy(() => loadSocial().then((m) => ({ default: m.SocialApp })));
const TrafficApp = lazy(() => loadTraffic().then((m) => ({ default: m.TrafficApp })));

type Screen = { kind: 'home' } | { kind: 'chats' } | { kind: 'chat'; thread: ThreadId } | { kind: 'app'; app: AppId };
type AppId = 'terfi' | 'social' | 'traffic';

interface Contact {
  name: string;
  avatar: string;
  color: string;
}

const CONTACTS: Record<ThreadId, Contact> = {
  manager: { name: 'Hakan Bey', avatar: 'HB', color: '#c9a227' },
  mom: { name: 'Annem ❤️', avatar: '👩', color: '#e8b4a8' },
  office: { name: 'Ofis Ekibi 🏢', avatar: '👥', color: '#7fa7c9' },
  zehra: { name: 'Bilinmeyen Numara', avatar: '?', color: '#5c6470' },
  ayse: { name: 'Ayşe', avatar: 'A', color: '#6f8fa3' },
  birthday: { name: 'Emre\'ye Sürpriz 🎂', avatar: '🎂', color: '#e0a458' },
};

/** Chats that only appear once someone has written in them. */
const LATE_THREADS: ThreadId[] = ['zehra', 'ayse', 'birthday'];
const sumUnread = (u: Record<ThreadId, number>) => Object.values(u).reduce((a, b) => a + b, 0);

const APPS: { id: AppId | 'chats'; label: string }[] = [
  { id: 'chats', label: 'Mesajlar' },
  { id: 'terfi', label: 'Terfi' },
  { id: 'social', label: 'Kariyergram' },
  { id: 'traffic', label: 'Trafik' },
];

/** The two apps kept in the dock at the bottom of the home screen. */
const DOCK: (AppId | 'chats')[] = ['chats', 'social'];

/** The colour each screen puts behind the status bar. */
const STATUS_THEME: Record<AppId, StatusTheme> = { terfi: 'dark', social: 'light', traffic: 'light' };

interface PhoneProps {
  messages: PhoneMessage[];
  requests: ManagerRequest[];
  unread: Record<ThreadId, number>;
  stance: { refusals: number; complies: number };
  clock: string;
  dayName: string;
  onAnswer: (requestId: string, answer: 'comply' | 'refuse') => void;
  onQuickReply: (messageId: number, replyIndex: number) => void;
  onRead: (thread: ThreadId) => void;
  /** Workday minute (traffic app) and weather slowdown. */
  minutes: number;
  weatherPenalty: number;
  /** Candidates you rejected today — they show up on social media. */
  rejectedAuthors: SocialAuthor[];
  echoes?: (SocialAuthor & { id: string; text: string })[];
  /** Today's index — Kariyergram shows that day's posts. */
  dayIndex: number;
  /** Today's rejected candidates (they may DM you) and how you answered. */
  dmCandidates: DmCandidate[];
  dmHandled: Record<string, DmKind>;
  onDm: (id: string, kind: DmKind) => void;
  /** Group chats you muted, and the switch. */
  muted?: ThreadId[];
  onToggleMute?: (thread: ThreadId) => void;
  /** Someone is typing back in this chat. */
  typing?: ThreadId | null;
}

const DAY_NAMES = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];

/** A message, with a day label above it when the chat moves on to a new day. */
function MessageRow({ m, newDay, children }: { m: PhoneMessage; newDay: boolean; children: ReactNode }) {
  return (
    <>
      {newDay && m.day !== undefined && <div className={styles.dayDivider}>{DAY_NAMES[m.day]}</div>}
      {children}
    </>
  );
}

/** The mute switch: a bell, struck through when the group is muted. */
function BellIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M12 3.5c-3 0-5.2 2.3-5.2 5.4v3.6L5 15.6v1h14v-1l-1.8-3.1V8.9c0-3.1-2.2-5.4-5.2-5.4Z" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" />
      <path d="M10 18.6a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
      {muted && <path d="M4 4 20 20" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />}
    </svg>
  );
}

/** What the status bar sits on: the wallpaper, a light app, a dark app, or the chats' green bar. */
type StatusTheme = 'wallpaper' | 'light' | 'dark' | 'chat';

function StatusBar({ clock, theme }: { clock: string; theme: StatusTheme }) {
  return (
    <div className={`${styles.status} ${styles[`status_${theme}`]}`}>
      <span className={styles.statusTime}>{clock}</span>
      <span className={styles.statusIcons} aria-hidden="true">
        <span className={styles.signal}>
          <i />
          <i />
          <i />
          <i />
        </span>
        <svg className={styles.wifi} viewBox="0 0 16 12">
          <path d="M8 11.2 5.6 8.6a3.4 3.4 0 0 1 4.8 0L8 11.2Z" fill="currentColor" />
          <path d="M3.6 6.6a6.2 6.2 0 0 1 8.8 0l-1.2 1.3a4.5 4.5 0 0 0-6.4 0L3.6 6.6Z" fill="currentColor" />
          <path d="M1.4 4.3a9.4 9.4 0 0 1 13.2 0l-1.2 1.3a7.7 7.7 0 0 0-10.8 0L1.4 4.3Z" fill="currentColor" />
        </svg>
        <span className={styles.batteryPct}>{BATTERY}</span>
        <span className={styles.battery} />
      </span>
    </div>
  );
}

/** A phone at work is never quite full. */
const BATTERY = '64';

/** Locked phone in the right column: clock + the latest unread notifications. */
export function PhoneDock(props: PhoneProps & { onOpen: () => void }) {
  const { messages, unread, clock, dayName, onOpen } = props;
  const shakeRef = useRef<HTMLButtonElement>(null);
  const lastCount = useRef(messages.length);
  const totalUnread = sumUnread(unread);

  useEffect(() => {
    const incoming = messages.length > lastCount.current && messages[messages.length - 1]?.from === 'them';
    lastCount.current = messages.length;
    if (incoming) {
      shakeRef.current?.animate(
        [
          { transform: 'translateX(0) rotate(0)' },
          { transform: 'translateX(-3px) rotate(-1.5deg)' },
          { transform: 'translateX(3px) rotate(1.5deg)' },
          { transform: 'translateX(-2px) rotate(-1deg)' },
          { transform: 'translateX(0) rotate(0)' },
        ],
        { duration: 380, iterations: 2 },
      );
    }
  }, [messages]);

  const notifications = (Object.keys(unread) as ThreadId[])
    .filter((t) => unread[t] > 0)
    .map((t) => ({ thread: t, last: [...messages].reverse().find((m) => m.thread === t && m.from === 'them') }))
    .filter((n) => n.last);

  return (
    <button className={styles.dock} ref={shakeRef} onClick={onOpen} aria-label={`Telefonu aç${totalUnread ? `, ${totalUnread} okunmamış mesaj` : ''}`}>
      <div className={styles.lock}>
        <div className={styles.notch} />
        <StatusBar clock={clock} theme="wallpaper" />
        <div className={styles.lockClock}>
          <span className="mono">{clock}</span>
          <small>{dayName}</small>
        </div>
        <div className={styles.lockNotes}>
          {notifications.slice(0, 2).map(({ thread, last }) => (
            <div key={thread} className={styles.lockNote}>
              <span className={styles.lockAvatar} style={{ background: CONTACTS[thread].color }}>
                {CONTACTS[thread].avatar}
              </span>
              <span className={styles.lockText}>
                <strong>
                  {CONTACTS[thread].name}
                  {unread[thread] > 1 && ` (${unread[thread]})`}
                </strong>
                <span>{last!.sender ? `${last!.sender}: ` : ''}{last!.text}</span>
              </span>
            </div>
          ))}
          {notifications.length === 0 && <div className={styles.lockEmpty}>Bildirim yok</div>}
        </div>
        <div className={styles.lockHint}>Telefonu açmak için dokun</div>
      </div>
    </button>
  );
}

/** The picked-up phone. */
/** `thread` opens the phone straight into that conversation (tapping a notification). */
export function PhoneOverlay(props: PhoneProps & { onClose: () => void; thread?: ThreadId | null }) {
  const { messages, requests, unread, stance, clock, onAnswer, onQuickReply, onRead, onClose, minutes, weatherPenalty, rejectedAuthors, echoes, dayIndex, dmCandidates, dmHandled, onDm, muted = [], onToggleMute, typing } = props;
  const dms = dmCandidates.filter((d) => minutes - d.at >= d.delay);
  const dmPending = dms.filter((d) => !dmHandled[d.id]).length;
  const [screen, setScreen] = useState<Screen>(props.thread ? { kind: 'chat', thread: props.thread } : { kind: 'home' });
  const chatRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    void loadSocial();
    void loadTraffic();
  }, []);
  const tone = managerTone(stance.refusals);

  const device = useDialog<HTMLDivElement>(onClose);

  const thread = screen.kind === 'chat' ? screen.thread : null;
  const threadMessages = thread ? messages.filter((m) => m.thread === thread) : [];

  // Reading a chat clears its badge; keep it cleared while new messages arrive.
  useEffect(() => {
    if (thread && unread[thread] > 0) onRead(thread);
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [thread, unread, onRead, threadMessages.length]);

  const pending = thread === 'manager' ? requests.find((r) => r.answer === null) : undefined;
  // Mom / office: the latest unanswered message with quick replies (answering is optional).
  // Any chat: the latest unanswered message with quick replies (with the manager, only when no request is pending).
  const quick = thread && !pending ? [...threadMessages].reverse().find((m) => m.replies && !m.answered && !m.expired) : undefined;
  const totalUnread = sumUnread(unread);

  function header(title: string, subtitle?: string, avatar?: ReactNode, action?: ReactNode) {
    return (
      <div className={styles.appHeader}>
        <button className={styles.back} onClick={() => setScreen(screen.kind === 'chat' ? { kind: 'chats' } : { kind: 'home' })} aria-label="Geri">
          ‹
        </button>
        {avatar}
        <span className={styles.appTitle}>
          <strong>{title}</strong>
          {subtitle && <span>{subtitle}</span>}
        </span>
        {action}
      </div>
    );
  }

  let body: ReactNode;
  if (screen.kind === 'home') {
    const icon = (app: (typeof APPS)[number], inDock = false) => (
      <button
        key={app.id}
        className={styles.appIcon}
        onClick={() => setScreen(app.id === 'chats' ? { kind: 'chats' } : { kind: 'app', app: app.id })}
        aria-label={app.label}
      >
        <span className={styles.appGlyph}>
          <AppIcon id={app.id as IconId} />
          {app.id === 'chats' && totalUnread > 0 && <span className={styles.appBadge}>{totalUnread}</span>}
          {app.id === 'social' && dmPending > 0 && <span className={styles.appBadge}>{dmPending}</span>}
        </span>
        {!inDock && <span className={styles.appLabel}>{app.label}</span>}
      </button>
    );
    body = (
      <div className={styles.home}>
        <div className={styles.widget}>
          <span className={styles.widgetDay}>{props.dayName}</span>
          <strong className={styles.widgetTime}>{clock}</strong>
          <span className={styles.widgetNote}>Tavrinsa Labs · mesai 08:00–17:00</span>
        </div>
        <div className={styles.appGrid}>{APPS.filter((a) => !DOCK.includes(a.id)).map((a) => icon(a))}</div>
        <div className={styles.pageDots} aria-hidden="true">
          <i className={styles.pageDotOn} />
          <i />
        </div>
        <div className={styles.dockBar}>{APPS.filter((a) => DOCK.includes(a.id)).map((a) => icon(a, true))}</div>
      </div>
    );
  } else if (screen.kind === 'chats') {
    body = (
      <>
        {header('Mesajlar')}
        <div className={styles.chatList}>
          {(Object.keys(CONTACTS) as ThreadId[])
            // Zehra, Ayşe's private chat and the birthday group show up once someone has written
            .filter((t) => !LATE_THREADS.includes(t) || messages.some((m) => m.thread === t))
            .map((t) => {
            const last = [...messages].reverse().find((m) => m.thread === t);
            const c = CONTACTS[t];
            return (
              <button key={t} className={styles.chatRow} onClick={() => setScreen({ kind: 'chat', thread: t })}>
                <span className={styles.rowAvatar} style={{ background: c.color }}>
                  {c.avatar}
                </span>
                <span className={styles.rowText}>
                  <strong>
                    {c.name} {t === 'manager' && <span title="Müdürün havası">{TONE_STATUS[tone].mood}</span>}
                    {muted.includes(t) && <span title="Sessizde"> 🔕</span>}
                  </strong>
                  <span>{last ? `${last.from === 'me' ? 'Sen: ' : last.sender ? `${last.sender}: ` : ''}${last.text}` : 'Henüz mesaj yok'}</span>
                </span>
                <span className={styles.rowMeta}>
                  {last && <span className="mono">{formatClock(last.at)}</span>}
                  {unread[t] > 0 && <span className={styles.rowBadge}>{unread[t]}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </>
    );
  } else if (screen.kind === 'chat') {
    const c = CONTACTS[screen.thread];
    body = (
      <>
        {header(
          c.name,
          screen.thread === 'manager'
            ? `İK Müdürü · ${TONE_STATUS[tone].status}`
            : screen.thread === 'office'
              ? 'Ayşe, Emre, Selin, sen'
              : screen.thread === 'zehra'
                ? 'Zehra K. · senden önceki İK uzmanı'
                : screen.thread === 'birthday'
                  ? 'Ayşe, Selin, Nurten, sen'
                  : screen.thread === 'ayse'
                    ? 'İK uzmanı'
                    : 'çevrimiçi',
          <span className={styles.rowAvatar} style={{ background: c.color }}>
            {c.avatar}
          </span>,
          GROUP_THREADS.includes(screen.thread) && onToggleMute ? (
            <button className={styles.muteButton} onClick={() => onToggleMute(screen.thread)} title={muted.includes(screen.thread) ? 'Bildirimleri aç' : 'Sessize al'}>
              <BellIcon muted={muted.includes(screen.thread)} />
            </button>
          ) : undefined,
        )}
        <div className={styles.messages} ref={chatRef} aria-live="polite">
          {threadMessages.length === 0 && <div className={styles.empty}>Mesaj yok. Şimdilik.</div>}
          {threadMessages.map((m, i) => (
            <MessageRow key={m.id} m={m} newDay={i === 0 || (threadMessages[i - 1].day ?? 0) !== (m.day ?? 0)}>
            <div key={m.id} className={`${styles.bubble} ${m.from === 'me' ? `${styles.mine} ${styles.sent}` : styles.theirs}`}>
              {m.sender && <span className={styles.sender}>{m.sender}</span>}
              {m.text}
              <span className={`${styles.time} mono`}>
                {formatClock(m.at)}
                {m.from === 'me' && <span className={styles.ticks}> ✓✓</span>}
              </span>
            </div>
            </MessageRow>
          ))}
          {typing === thread && (
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
  } else {
    // the app owns the whole screen; the home indicator at the bottom takes you back
    body = (
      <>
        <div className={styles.appBody}>
          {screen.app === 'terfi' && <PromotionGame />}
          <Suspense fallback={null}>
            {screen.app === 'social' && <SocialApp rejected={rejectedAuthors} echoes={echoes} dayIndex={dayIndex} dms={dms} dmHandled={dmHandled} onDm={onDm} minutes={minutes} />}
            {screen.app === 'traffic' && <TrafficApp minutes={minutes} weatherPenalty={weatherPenalty} />}
          </Suspense>
        </div>
      </>
    );
  }

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="Telefon">
      <div className={styles.device} ref={device} onClick={(e) => e.stopPropagation()}>
        {/* One display clips everything (status bar, app, home indicator) to the rounded glass. */}
        <div className={`${styles.display} ${screen.kind === 'home' ? styles.displayHome : ''}`}>
          <div className={styles.notch} />
          <StatusBar clock={clock} theme={screen.kind === 'home' ? 'wallpaper' : screen.kind === 'app' ? STATUS_THEME[screen.app] : 'chat'} />
          <div className={styles.screen}>{body}</div>
          <button
            className={styles.homeBar}
            onClick={() => (screen.kind === 'home' ? onClose() : setScreen({ kind: 'home' }))}
            aria-label={screen.kind === 'home' ? 'Telefonu bırak' : 'Ana ekran'}
          />
        </div>
      </div>
      <div className={styles.overlayHint}>Alttaki çizgi: ana ekran</div>
    </div>
  );
}
