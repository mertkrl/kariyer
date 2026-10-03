import { useEffect, useState, type ReactNode } from 'react';
import { inbox, type Mail } from '../../game/mail';
import { formatClock } from '../../game/time';
import { audioEngine } from '../../audio/audioEngine';
import { PLAYER } from '../../game/player';
import { CalendarApp } from './CalendarApp';
import styles from './PcDesktop.module.css';
import { REPLY_BACK, replyAuthor, type ReplyBack } from '../../game/rejectionMails';

/*
 * The work computer. A desktop like any office PC: a wallpaper nobody chose, the recruitment
 * portal, the company mail, a spreadsheet that won't open and a recycle bin someone emptied in
 * a hurry. Apps open maximised; the taskbar keeps the clock.
 */

export type PcApp = 'portal' | 'mail' | 'calendar';

const TITLES: Record<PcApp, string> = { portal: 'İşe Alım Portalı — İK Sistemi v4.2', mail: 'E-posta', calendar: 'Takvim — Defne Aral' };

interface PcDesktopProps {
  app: PcApp | null;
  onOpen: (app: PcApp) => void;
  onClose: () => void;
  /** The recruitment portal's contents (the candidate screen). */
  portal: ReactNode;
  dayIndex: number;
  minutes: number;
  mailRead: string[];
  onReadMail: (id: string) => void;
  /** Write back to a candidate's reply. */
  onAnswerMail?: (mailId: string, kind: ReplyBack) => void;
  /** Mail written during this playthrough. */
  extraMails?: Mail[];
  /** A recall mail you have to write: to whom, and the send action. */
  /** Who is on the interview list right now (for the list attached to Hakan Bey's mail). */
  finalistNames?: string[];
  /** Before the shift starts: point at the portal, where the day begins. */
  beckonPortal?: boolean;
}

const DAY_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum'];

export function PcDesktop({ app, onOpen, onClose, portal, dayIndex, minutes, mailRead, onReadMail, onAnswerMail, extraMails, finalistNames = [], beckonPortal = false }: PcDesktopProps) {
  const mails = inbox(dayIndex, minutes, extraMails);
  const unread = mails.filter((m) => (m.folder ?? 'inbox') === 'inbox' && !mailRead.includes(m.id)).length;
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const open = (a: PcApp) => {
    audioEngine.playUi('click');
    onOpen(a);
  };

  return (
    <div className={styles.pc}>
      <div className={styles.wallpaper}>
        <div className={styles.wallLogo}>
          TAVRINSA<span>LABS</span>
        </div>
        <div className={styles.wallMotto}>İnsan önce gelir.</div>
      </div>

      <div className={styles.icons}>
        <button className={`${styles.icon} ${beckonPortal && !app ? styles.beckon : ''}`} onClick={() => open('portal')}>
          <span className={`${styles.glyph} ${styles.glyphPortal}`}>İK</span>
          <span className={styles.iconLabel}>İşe Alım Portalı</span>
        </button>
        <button className={styles.icon} onClick={() => open('mail')}>
          <span className={`${styles.glyph} ${styles.glyphMail}`}>
            ✉{unread > 0 && <i className={styles.badge}>{unread}</i>}
          </span>
          <span className={styles.iconLabel}>E-posta</span>
        </button>
        <button className={styles.icon} onClick={() => open('calendar')}>
          <span className={`${styles.glyph} ${styles.glyphCalendar}`}>
            <CalendarGlyph day={dayIndex} />
          </span>
          <span className={styles.iconLabel}>Takvim</span>
        </button>
        <button className={styles.icon} onClick={() => setToast('Excel: "Lisansınızın süresi doldu. Lütfen BT yöneticinize başvurun."')}>
          <span className={`${styles.glyph} ${styles.glyphSheet}`}>X</span>
          <span className={styles.iconLabel}>Adaylar_FINAL_v7.xlsx</span>
        </button>
        <button className={styles.icon} onClick={() => setToast('Geri Dönüşüm Kutusu boş. Biri, senden önce, çok aceleyle boşaltmış.')}>
          <span className={`${styles.glyph} ${styles.glyphBin}`}>
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6" />
            </svg>
          </span>
          <span className={styles.iconLabel}>Geri Dönüşüm Kutusu</span>
        </button>
      </div>

      {app && (
        <div className={styles.window} role="dialog" aria-label={TITLES[app]}>
          <div className={styles.titleBar}>
            <span className={`${styles.miniGlyph} ${app === 'portal' ? styles.glyphPortal : app === 'mail' ? styles.glyphMail : styles.glyphCalendar}`}>{app === 'portal' ? 'İK' : app === 'mail' ? '✉' : '▦'}</span>
            <span className={styles.title}>{app === 'mail' ? `E-posta — Gelen Kutusu (${unread})` : TITLES[app]}</span>
            <span className={styles.winButtons}>
              <button onClick={onClose} aria-label="Simge durumuna küçült">
                —
              </button>
              <button aria-label="Ekranı kapla" disabled>
                ▢
              </button>
              <button className={styles.winClose} onClick={onClose} aria-label="Kapat">
                ✕
              </button>
            </span>
          </div>
          <div className={styles.windowBody}>{app === 'portal' ? portal : app === 'calendar' ? <CalendarApp /> : <MailApp mails={mails} read={mailRead} onRead={onReadMail} onAnswer={onAnswerMail} answered={new Set((extraMails ?? []).filter((m) => m.id.startsWith('answer-')).map((m) => m.id.slice(7)))} finalistNames={finalistNames} />}</div>
        </div>
      )}

      {toast && <div className={styles.toast}>{toast}</div>}

      <div className={styles.taskbar}>
        <span className={styles.start}>◆</span>
        <button className={`${styles.task} ${app === 'portal' ? styles.taskOn : ''}`} onClick={() => (app === 'portal' ? onClose() : open('portal'))}>
          <span className={`${styles.miniGlyph} ${styles.glyphPortal}`}>İK</span> Portal
        </button>
        <button className={`${styles.task} ${app === 'mail' ? styles.taskOn : ''}`} onClick={() => (app === 'mail' ? onClose() : open('mail'))}>
          <span className={`${styles.miniGlyph} ${styles.glyphMail}`}>✉</span> E-posta
          {unread > 0 && <i className={styles.taskBadge}>{unread}</i>}
        </button>
        <button className={`${styles.task} ${app === 'calendar' ? styles.taskOn : ''}`} onClick={() => (app === 'calendar' ? onClose() : open('calendar'))}>
          <span className={`${styles.miniGlyph} ${styles.glyphCalendar}`}>▦</span> Takvim
        </button>
        <span className={styles.tray}>
          <span>📶</span>
          <span className="mono">
            {formatClock(minutes)}
            <small>{DAY_SHORT[dayIndex] ?? ''}</small>
          </span>
        </span>
      </div>
    </div>
  );
}

/** The calendar's desktop icon: a tear-off page showing the weekday. */
function CalendarGlyph({ day }: { day: number }) {
  return (
    <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true">
      <rect x="4" y="6" width="32" height="30" rx="5" fill="#fff" />
      <path d="M4 11a5 5 0 0 1 5-5h22a5 5 0 0 1 5 5v4H4z" fill="#d64550" />
      <text x="20" y="31" textAnchor="middle" fontSize="15" fontWeight="800" fill="#22201c" fontFamily="var(--font-body)">
        {day + 21}
      </text>
    </svg>
  );
}

function MailApp({ mails, read, onRead, onAnswer, answered, finalistNames }: { mails: Mail[]; read: string[]; onRead: (id: string) => void; onAnswer?: (mailId: string, kind: ReplyBack) => void; answered: Set<string>; finalistNames: string[] }) {
  const [folder, setFolder] = useState<'inbox' | 'outbox' | 'sent'>('inbox');
  const received = mails.filter((m) => (m.folder ?? 'inbox') === 'inbox');
  const outbox = mails.filter((m) => m.folder === 'outbox');
  const sent = mails.filter((m) => m.folder === 'sent');
  const byFolder = { inbox: received, outbox, sent };
  const shown = byFolder[folder];
  const [openId, setOpenId] = useState<string | null>(received[0]?.id ?? null);
  const current = shown.find((m) => m.id === openId) ?? null;
  const unreadIn = received.filter((m) => !read.includes(m.id)).length;
  useEffect(() => {
    if (current && !read.includes(current.id)) onRead(current.id);
  }, [current, read, onRead]);

  return (
    <div className={styles.mail}>
      <nav className={styles.folders} aria-label="Klasörler">
        <div className={styles.account}>
          <Initials name={PLAYER.name} />
          <span>
            <b>{PLAYER.name}</b>
            <small>{PLAYER.address}</small>
          </span>
        </div>
        {(
          [
            ['inbox', 'Gelen Kutusu', unreadIn],
            ['outbox', 'Giden Kutusu', outbox.length],
            ['sent', 'Gönderilenler', sent.length],
          ] as const
        ).map(([id, label, n]) => (
          <button
            key={id}
            className={`${styles.folder} ${folder === id ? styles.folderOn : ''}`}
            onClick={() => {
              setFolder(id);
              setOpenId(byFolder[id][0]?.id ?? null);
            }}
          >
            <FolderIcon kind={id} />
            {label}
            {n > 0 && <span className={`${styles.folderCount} ${id === 'inbox' ? styles.folderUnread : ''}`}>{n}</span>}
          </button>
        ))}
      </nav>
      <div className={styles.listPane}>
        <div className={styles.listHead}>
          <b>{{ inbox: 'Gelen Kutusu', outbox: 'Giden Kutusu', sent: 'Gönderilenler' }[folder]}</b>
          <span className="mono">{shown.length} ileti</span>
        </div>
        <ul className={styles.mailList}>
          {shown.map((m) => {
            const mine = m.folder === 'sent' || m.folder === 'outbox';
            const who = mine ? (m.to ?? m.from) : m.from;
            return (
              <li key={m.id}>
                <button
                  className={`${styles.mailRow} ${m.id === openId ? styles.mailRowOn : ''} ${mine || read.includes(m.id) ? '' : styles.mailUnread}`}
                  onClick={() => setOpenId(m.id)}
                >
                  <Initials name={who} />
                  <span className={styles.rowText}>
                    <span className={styles.mailFrom}>
                      {m.important && <b className={styles.flag}>!</b>}
                      <span className={styles.rowName}>{mine ? `Kime: ${who}` : who}</span>
                      <small className="mono">{m.folder === 'outbox' ? '⏱ 17:00' : `${DAY_SHORT[m.day]} ${formatClock(m.at)}`}</small>
                    </span>
                    <span className={styles.mailSubject}>{m.subject}</span>
                    <span className={styles.snippet}>{snippet(m.body)}</span>
                  </span>
                </button>
              </li>
            );
          })}
          {shown.length === 0 && (
            <li className={styles.listEmpty}>{{ inbox: 'Gelen kutusu boş.', outbox: 'Gönderilmeyi bekleyen ileti yok.', sent: 'Henüz gönderilmiş ileti yok.' }[folder]}</li>
          )}
        </ul>
      </div>
      <article className={styles.reader}>
        {current ? (
          <>
            <h3>{current.subject}</h3>
            <div className={styles.readerMeta}>
              <Initials name={(current.folder === 'sent' || current.folder === 'outbox') ? PLAYER.name : current.from} />
              <span className={styles.metaLines}>
                <span>
                  <b>{current.folder === 'sent' || current.folder === 'outbox' ? PLAYER.name : current.from}</b> &lt;{current.folder === 'sent' || current.folder === 'outbox' ? PLAYER.address : current.address}&gt;
                </span>
                <small>Kime: {current.folder === 'sent' || current.folder === 'outbox' ? `${current.to} <${current.address}>` : PLAYER.address}</small>
              </span>
              <span className="mono">{current.folder === 'outbox' ? `Planlandı · ${DAY_SHORT[current.day]} 17:00` : `${DAY_SHORT[current.day]} ${formatClock(current.at)}`}</span>
            </div>
            <pre className={styles.readerBody}>{current.body}</pre>
            {current.reply && onAnswer && replyAuthor(current.id) && (
              <div className={styles.replyBack}>
                {answered.has(current.id) ? (
                  <p className={styles.replyDone}>✓ Yanıtın gönderildi · Gönderilenler'de</p>
                ) : (
                  <>
                    <div className={styles.replyLabel}>Yanıtla</div>
                    <div className={styles.replyOptions}>
                      {REPLY_BACK.map((o) => (
                        <button key={o.kind} className={styles.replyOption} onClick={() => onAnswer(current.id, o.kind)}>
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            {current.attachment && (
              <div className={styles.attachment}>
                <div className={styles.attachmentName}>📎 {current.attachment.name}</div>
                {current.attachment.kind === 'finalists' ? (
                  finalistNames.length ? (
                    <ol>
                      {finalistNames.map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ol>
                  ) : (
                    <p>Liste henüz boş.</p>
                  )
                ) : (
                  <ol>
                    <li>Sizi bu işe en uygun kılan, somut ve ölçülebilir bir başarınız?</li>
                    <li>Yaptığınız bir hata ve ondan ne öğrendiğiniz?</li>
                    <li>İlk 90 günde neyi değiştirirdiniz?</li>
                    <li className={styles.attachmentFlag}>Evlilik ve çocuk planınız var mı?</li>
                    <li className={styles.attachmentFlag}>Emekliliğinize kaç yıl kaldı?</li>
                    <li className={styles.attachmentFlag}>Memleketiniz neresi, aileniz ne iş yapıyor?</li>
                  </ol>
                )}
              </div>
            )}
          </>
        ) : (
          <p className={styles.readerEmpty}>Okumak için bir ileti seç.</p>
        )}
      </article>
    </div>
  );
}

const AVATAR_COLORS = ['#4c7fb0', '#3f6b63', '#b3766b', '#7c6a8c', '#c9a227', '#6fa37a', '#a8402f', '#5d6f86'];

/** A round avatar with one or two initials that always fit. */
function Initials({ name }: { name: string }) {
  const clean = name.replace(/[^\p{L}\s]/gu, ' ').trim();
  const letters = clean
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toLocaleUpperCase('tr'))
    .join('');
  const color = AVATAR_COLORS[[...name].reduce((n, ch) => n + ch.charCodeAt(0), 0) % AVATAR_COLORS.length];
  return (
    <span className={styles.initials} style={{ background: color }} aria-hidden="true">
      {letters || '?'}
    </span>
  );
}

function FolderIcon({ kind }: { kind: 'inbox' | 'outbox' | 'sent' }) {
  return (
    <svg className={styles.folderIcon} viewBox="0 0 20 20" aria-hidden="true">
      {kind === 'inbox' && <path d="M3 11 5 4h10l2 7v5H3zM3 11h4l1 2h4l1-2h4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />}
      {kind === 'outbox' && <path d="M10 3a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM10 6v4l3 2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />}
      {kind === 'sent' && <path d="M3 10 17 3l-4 14-3-6zM10 11l7-8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />}
    </svg>
  );
}

const snippet = (body: string) => body.replace(/\s+/g, ' ').slice(0, 90);
