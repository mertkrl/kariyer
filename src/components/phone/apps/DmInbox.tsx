import { useState } from 'react';
import { audioEngine } from '../../../audio/audioEngine';
import type { DmKind } from '../../../game/store';
import { answerBack, openerFor, repliesFor, type DmCandidate } from './candidateDms';
import styles from './DmInbox.module.css';

/*
 * Kariyergram direct messages. Rejected candidates land in "Mesaj İstekleri"; open one and
 * decide: tell them the truth (policy says you mustn't), send the corporate template, or
 * delete it. Answered ones move to your chats with their reply.
 */

interface Props {
  dms: DmCandidate[];
  minutes: number;
  handled: Record<string, DmKind>;
  onAnswer: (id: string, kind: DmKind) => void;
  onClose: () => void;
}

export function DmInbox({ dms, minutes, handled, onAnswer, onClose }: Props) {
  const requests = dms.filter((d) => !handled[d.id]);
  const chats = dms.filter((d) => handled[d.id] && handled[d.id] !== 'ignore');
  const [tab, setTab] = useState<'requests' | 'chats'>(requests.length ? 'requests' : 'chats');
  const [openId, setOpenId] = useState<string | null>(null);
  const [typing, setTyping] = useState<Record<string, boolean>>({});
  const open = dms.find((d) => d.id === openId) ?? null;

  function answer(c: DmCandidate, kind: DmKind) {
    onAnswer(c.id, kind);
    audioEngine.playUi(kind === 'ignore' ? 'click' : 'confirm');
    if (kind === 'ignore') {
      setOpenId(null);
      return;
    }
    setTyping((t) => ({ ...t, [c.id]: true }));
    window.setTimeout(() => {
      setTyping((t) => ({ ...t, [c.id]: false }));
      audioEngine.playPhoneBuzz();
    }, 2200);
  }

  const ago = (c: DmCandidate) => {
    const m = Math.max(1, Math.round(minutes - c.at - c.delay));
    return m < 60 ? `${m} dk` : `${Math.floor(m / 60)} sa`;
  };

  if (open) {
    const kind = handled[open.id];
    const replies = repliesFor(open);
    return (
      <div className={styles.inbox}>
        <div className={styles.head}>
          <button className={styles.back} onClick={() => setOpenId(null)} aria-label="Geri">
            ‹
          </button>
          <span className={styles.avatar} style={{ background: open.color }}>
            {open.initials}
          </span>
          <span className={styles.who}>
            <b>{open.name}</b>
            <small>{open.role} adayı · {kind ? 'sohbet' : 'mesaj isteği'}</small>
          </span>
        </div>
        <div className={styles.thread}>
          <div className={styles.dayTag}>Bugün</div>
          <div className={`${styles.bubble} ${styles.theirs}`}>{openerFor(open)}</div>
          {kind && kind !== 'ignore' && (
            <div className={`${styles.bubble} ${styles.mine} ${styles.sent}`}>
              {replies[kind]}
              <span className={styles.seen}>{typing[open.id] ? 'Görüldü' : '✓✓'}</span>
            </div>
          )}
          {kind && kind !== 'ignore' && typing[open.id] && (
            <div className={`${styles.bubble} ${styles.theirs} ${styles.typing}`}>
              <i />
              <i />
              <i />
            </div>
          )}
          {kind && kind !== 'ignore' && !typing[open.id] && <div className={`${styles.bubble} ${styles.theirs} ${styles.arrived}`}>{answerBack(open, kind)}</div>}
        </div>
        {!kind && (
          <div className={styles.decide}>
            <div className={styles.request}>
              <span className={styles.requestAvatar} style={{ background: open.color }}>
                {open.initials}
              </span>
              <span>
                <b>{open.name.split(' ')[0]}</b> seni takip etmiyor · mesaj isteği
                <small>Cevap verirsen "Görüldü" bilgisi gider.</small>
              </span>
            </div>
            <div className={styles.draftLabel}>Cevap taslakları</div>
            <button className={`${styles.draft} ${styles.honest}`} onClick={() => answer(open, 'honest')}>
              <span className={styles.draftHead}>
                <HonestIcon />
                <b>Dürüstçe cevap ver</b>
              </span>
              <span className={styles.preview}>
                <span>{replies.honest}</span>
              </span>
            </button>
            <button className={`${styles.draft} ${styles.template}`} onClick={() => answer(open, 'template')}>
              <span className={styles.draftHead}>
                <TemplateIcon />
                <b>Kurumsal şablonu gönder</b>
              </span>
              <span className={styles.preview}>
                <span>{replies.template}</span>
              </span>
            </button>
            <button className={styles.ignore} onClick={() => answer(open, 'ignore')}>
              <TrashIcon />
              Sil
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.inbox}>
      <div className={styles.head}>
        <button className={styles.back} onClick={onClose} aria-label="Geri">
          ‹
        </button>
        <span className={styles.who}>
          <b>Mesajlar</b>
          <small>Kariyergram</small>
        </span>
      </div>
      <div className={styles.tabs}>
        <button className={tab === 'chats' ? styles.tabOn : undefined} onClick={() => setTab('chats')}>
          Sohbetler
        </button>
        <button className={tab === 'requests' ? styles.tabOn : undefined} onClick={() => setTab('requests')}>
          İstekler {requests.length > 0 && <span className={styles.count}>{requests.length}</span>}
        </button>
      </div>
      <div className={styles.list}>
        {(tab === 'requests' ? requests : chats).map((c) => (
          <button key={c.id} className={styles.row} onClick={() => setOpenId(c.id)}>
            <span className={styles.avatar} style={{ background: c.color }}>
              {c.initials}
            </span>
            <span className={styles.rowText}>
              <b>{c.name}</b>
              <small>{tab === 'requests' ? openerFor(c) : handled[c.id] === 'honest' ? 'Sen: Merhaba, kararı ben verdim…' : 'Sen: Değerlendirme sürecine dair…'}</small>
            </span>
            <span className={styles.ago}>{ago(c)}</span>
            {tab === 'requests' && <span className={styles.dot} />}
          </button>
        ))}
        {tab === 'requests' && requests.length === 0 && <div className={styles.empty}>Mesaj isteği yok. Şimdilik.</div>}
        {tab === 'chats' && chats.length === 0 && <div className={styles.empty}>Henüz kimseyle yazışmadın.</div>}
      </div>
    </div>
  );
}

/* small hand-drawn icons for the reply drafts */
function HonestIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 28 28" aria-hidden="true">
      <circle cx="14" cy="14" r="14" fill="#efe8ff" />
      <path d="M7 9.5a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3h-4.5L10 20.5v-3a3 3 0 0 1-3-3z" fill="#fff" stroke="#7c5cd6" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M11 10.5h6M11 13.5h4" stroke="#7c5cd6" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function TemplateIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 28 28" aria-hidden="true">
      <circle cx="14" cy="14" r="14" fill="#eef0f2" />
      <path d="M9 6.5h7.5l3.5 3.5v11.5H9z" fill="#fff" stroke="#6b7480" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M16.5 6.5V10H20" fill="none" stroke="#6b7480" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M11.5 12.5h5M11.5 15h5M11.5 17.5h3" stroke="#aab1ba" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="18.5" cy="19" r="2.6" fill="#c9a227" opacity="0.85" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className={styles.trash} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
