import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { PhoneMessage, ThreadId } from '../../game/manager';
import type { Mail } from '../../game/mail';
import styles from './NotificationStack.module.css';

/*
 * Notifications rise from the thing that made them: texts and mail above your mobile, the
 * landline's ringing and missed calls above the desk phone. At the computer they all come in
 * bottom-right. Tapping one opens the conversation on the right, where phone and calls open.
 *
 * Kept quiet on purpose: one toast at a time (a newer one replaces it). Muted group chats never
 * pop up — they only bump the unread badge on the phone.
 */

const SENDER: Record<ThreadId, string> = { manager: 'Hakan Bey', mom: 'Annem', office: 'Ofis', zehra: 'Bilinmeyen Numara', ayse: 'Ayşe', birthday: 'Emre\'ye Sürpriz' };
/** Group chats are named for the group; the person who wrote goes in front of the line. */
const GROUP_NAME: Partial<Record<ThreadId, string>> = { office: 'Ofis Ekibi', birthday: 'Emre\'ye Sürpriz 🎂' };
const LIFETIME_MS = 5000;

interface Note {
  key: string;
  kind: 'message' | 'mail';
  title: string;
  text: string;
  thread?: ThreadId;
  /** Who wrote it, when it came into a group. */
  sender?: string;
  group?: boolean;
}

interface Props {
  style: CSSProperties;
  /** Where the landline's notifications go (defaults to the same place as the rest). */
  callStyle?: CSSProperties;
  messages: PhoneMessage[];
  mails: Mail[];
  ringing: { caller: string; line: string } | null;
  notice: string | null;
  noticeKind?: 'missed' | 'overtime' | 'scheduled' | 'sent';
  onPickUp: () => void;
  onOpenThread: (thread: ThreadId) => void;
  onOpenMail: () => void;
  onClearNotice: () => void;
  /** Group chats you muted. */
  muted?: ThreadId[];
  /** Where the outbox notice goes instead: centred on the CV, level with the candidate's name. */
  mailNoticeStyle?: CSSProperties;
}

export function NotificationStack({ style, callStyle, messages, mails, ringing, notice, noticeKind, onPickUp, onOpenThread, onOpenMail, onClearNotice, muted = [], mailNoticeStyle }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [seenMessages, setSeenMessages] = useState(messages.length);
  const [seenMails, setSeenMails] = useState(mails.length);

  // new texts and new mail become notifications (derived during render, no effect round-trip)
  if (messages.length !== seenMessages) {
    setSeenMessages(messages.length);
    const fresh = messages.slice(seenMessages).filter((m) => m.from === 'them' && !muted.includes(m.thread));
    if (messages.length > seenMessages && fresh.length)
      setNotes((n) => [...n, ...fresh.map((m) => {
          const group = GROUP_NAME[m.thread];
          return group
            ? { key: `m${m.id}`, kind: 'message' as const, title: group, sender: m.sender, group: true, text: m.text, thread: m.thread }
            : { key: `m${m.id}`, kind: 'message' as const, title: m.sender ?? SENDER[m.thread], text: m.text, thread: m.thread };
        })].slice(-1));
  }
  if (mails.length !== seenMails) {
    setSeenMails(mails.length);
    if (mails.length > seenMails) {
      const fresh = mails.slice(0, mails.length - seenMails);
      setNotes((n) => [...n, ...fresh.map((m) => ({ key: `e${m.id}`, kind: 'mail' as const, title: m.from, text: m.subject }))].slice(-1));
    }
  }

  useEffect(() => {
    if (!notice) return;
    // the scheduling notice has more to say, so it stays a little longer
    const id = window.setTimeout(onClearNotice, noticeKind === 'scheduled' ? LIFETIME_MS * 1.8 : LIFETIME_MS);
    return () => window.clearTimeout(id);
  }, [notice, noticeKind, onClearNotice]);

  const dismiss = (key: string) => setNotes((n) => n.filter((x) => x.key !== key));

  const mailNotice = noticeKind === 'scheduled' || noticeKind === 'sent';
  const noticeNote = notice && (
    <div className={`${styles.note} ${mailNotice ? styles.scheduled : styles.missed}`} role="status">
      <b>{{ overtime: '⏰ Fazla mesai', missed: '☎ Cevapsız çağrı', scheduled: '✉ Gönderim planlandı · 17:00', sent: '✉ Bildirimler gönderildi' }[noticeKind ?? 'missed']}</b>
      <span>{notice}</span>
    </div>
  );
  const centred = mailNotice && mailNoticeStyle;

  const callNotes = (
    <>
      {!centred && noticeNote}
      {ringing && (
        <button className={`${styles.note} ${styles.ring}`} onClick={onPickUp}>
          <b>☎ {ringing.caller} arıyor</b>
          <span>{ringing.line} · açmak için tıkla</span>
        </button>
      )}
    </>
  );

  return (
    <>
      <div className={styles.stack} style={style} aria-live="polite">
        {(ringing ? [] : notes).map((n) => (
          <Toast
            key={n.key}
            note={n}
            onDone={() => dismiss(n.key)}
            onOpen={() => {
              dismiss(n.key);
              if (n.kind === 'mail') onOpenMail();
              else if (n.thread) onOpenThread(n.thread);
            }}
          />
        ))}
        {!callStyle && callNotes}
      </div>
      {callStyle && (
        <div className={styles.stack} style={callStyle} aria-live="polite">
          {callNotes}
        </div>
      )}
      {centred && (
        <div className={`${styles.stack} ${styles.centred}`} style={mailNoticeStyle} aria-live="polite">
          {noticeNote}
        </div>
      )}
    </>
  );
}

function Toast({ note, onDone, onOpen }: { note: Note; onDone: () => void; onOpen: () => void }) {
  // the parent re-renders every game tick; keep the timer from restarting with it
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    const id = window.setTimeout(() => done.current(), LIFETIME_MS);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <button className={`${styles.note} ${note.kind === 'mail' ? styles.mail : ''}`} onClick={onOpen}>
      <span className={styles.app}>
        {note.kind === 'mail' ? <MailGlyph /> : <MessageGlyph />}
        <em>{note.kind === 'mail' ? 'E-posta' : 'Mesajlar'}</em>
        <time>şimdi</time>
      </span>
      <b>{note.title}</b>
      <span className={styles.body}>
        {note.sender && <strong>{note.sender}: </strong>}
        {note.text.length > 96 ? `${note.text.slice(0, 94)}…` : note.text}
      </span>
    </button>
  );
}

function MessageGlyph() {
  return (
    <svg className={styles.glyph} viewBox="0 0 20 20" aria-hidden="true">
      <rect width="20" height="20" rx="5" fill="#34c759" />
      <path d="M10 4.6c-3.3 0-6 2.1-6 4.8 0 1.5.8 2.8 2.1 3.7l-.5 2.3 2.5-1.4c.6.1 1.2.2 1.9.2 3.3 0 6-2.2 6-4.8S13.3 4.6 10 4.6z" fill="#fff" />
    </svg>
  );
}

function MailGlyph() {
  return (
    <svg className={styles.glyph} viewBox="0 0 20 20" aria-hidden="true">
      <rect width="20" height="20" rx="5" fill="#2f7ce0" />
      <rect x="4" y="6" width="12" height="8.5" rx="1.5" fill="#fff" />
      <path d="M4.6 6.8 10 10.8l5.4-4" fill="none" stroke="#2f7ce0" strokeWidth="1.3" />
    </svg>
  );
}
