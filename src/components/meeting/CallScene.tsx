import { useEffect, useRef, useState } from 'react';
import { SPEAKERS, type Board, type ChatMessage, type Speaker, type TeamStats } from '../../game/events/meeting';
import { Dashboard } from './Dashboard';
import styles from './MeetingRoom.module.css';

/*
 * Görüntülü görüşme olarak Çarşamba toplantısı: ortada Selin'in paylaştığı ve konuşmayı izleyen
 * rapor, diğer herkes yanda yalnızca adlarını gösteren karelerde. Konuşanın adı yanar.
 */

type Person = Exclude<Speaker, 'room'>;

/** Her birinin nereden bağlandığı (üstüne gelince gösterilir). */
const PLACES: Record<Person, string> = {
  hakan: 'Genel Müdürlük',
  selin: 'Ofis · 4. kat',
  ayse: 'Ofis · İK',
  emre: 'Ofis · İK',
  levent: 'Evden',
  you: 'Ofis · İK',
};

const ORDER: Person[] = ['hakan', 'selin', 'ayse', 'emre', 'levent', 'you'];

function Tile({ who, talking, sharing }: { who: Person; talking: boolean; sharing: boolean }) {
  const s = SPEAKERS[who];
  const name = who === 'you' ? `${s.name} (Sen)` : s.name;
  return (
    <div
      className={`${styles.tile} ${talking ? styles.tileTalking : ''}`}
      style={{ ['--c' as string]: s.color }}
      title={PLACES[who]}
    >
      <div className={styles.noCam}>
        <span className={`${styles.nameplate} ${talking ? styles.nameplateTalking : ''}`}>{name}</span>
      </div>
      <div className={styles.tileName}>
        <span className={styles.mic} aria-hidden="true">
          {talking ? (
            <span className={styles.bars}>
              <i />
              <i />
              <i />
            </span>
          ) : (
            <MicOff />
          )}
        </span>
        {sharing && <small>paylaşıyor</small>}
      </div>
    </div>
  );
}

/** Kapalı bir mikrofon, görüşme uygulamasının kendi simge setindeki gibi çizilmiş. */
function MicOff() {
  return (
    <svg className={styles.micOff} viewBox="0 0 16 16" aria-hidden="true">
      <rect x="5.5" y="1.5" width="5" height="8.5" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 7.5a5 5 0 0 0 10 0M8 12.5V14.5M5.5 14.5h5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M2.5 2.5 13.5 13.5" stroke="#e5484d" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Görüşmenin yan sohbeti, iki sekmede: oda ("Genel") ve yalnızca sana yazılanlar ("Özel").
 * Bakmadığın sekmedeki yeni bir mesaj sayı olarak görünür.
 */
function Chat({ messages, typing }: { messages: ChatMessage[]; typing: Speaker | null }) {
  const [tab, setTab] = useState<'public' | 'private'>('public');
  const publicMsgs = messages.filter((m) => !m.private);
  const privateMsgs = messages.filter((m) => m.private);
  // her sekmede en son baktığında ne olduğu
  const [seen, setSeen] = useState({ public: 0, private: 0 });
  const current = tab === 'public' ? publicMsgs : privateMsgs;
  if (seen[tab] !== current.length) setSeen({ ...seen, [tab]: current.length });
  const unread = { public: publicMsgs.length - seen.public, private: privateMsgs.length - seen.private };
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' });
  }, [current.length, typing, tab]);
  return (
    <aside className={styles.chat} aria-label="Görüşme sohbeti">
      <div className={styles.chatTabs} role="tablist">
        {(['public', 'private'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={`${styles.chatTab} ${tab === t ? styles.chatTabOn : ''}`} onClick={() => setTab(t)}>
            {t === 'public' ? 'Genel' : 'Özel'}
            {tab !== t && unread[t] > 0 && <span className={styles.chatBadge}>{unread[t]}</span>}
          </button>
        ))}
      </div>
      <div className={styles.chatList} aria-live="polite">
        {current.length === 0 && <p className={styles.chatSystem}>{tab === 'public' ? 'Henüz mesaj yok.' : 'Sana özel mesaj yok.'}</p>}
        {current.map((m, i) =>
          m.who === 'system' ? (
            <p key={i} className={styles.chatSystem}>
              {m.text}
            </p>
          ) : (
            <p key={i} className={styles.chatMsg}>
              <b style={{ color: SPEAKERS[m.who].color }}>{SPEAKERS[m.who].name.split(' ')[0]}</b>
              <span>{m.text}</span>
            </p>
          ),
        )}
        {tab === 'private' && typing && typing !== 'room' && <p className={styles.chatTyping}>{SPEAKERS[typing].name.split(' ')[0]} yazıyor…</p>}
        <div ref={end} />
      </div>
    </aside>
  );
}

export function CallScene({ active, you, board, chat, typing }: { active: Speaker | null; you: TeamStats; board: Board; chat: ChatMessage[]; typing: Speaker | null }) {
  const sharing = board.page !== 'off';
  return (
    <div className={styles.call}>
      <div className={`${styles.share} ${sharing ? '' : styles.shareOff}`}>
        {sharing && (
          <div className={styles.shareBar}>
            <span className={styles.shareDot} /> Selin Aksoy ekranını paylaşıyor
          </div>
        )}
        <Dashboard board={board} you={you} />
      </div>
      <div className={styles.side}>
        <div className={styles.tiles}>
          {ORDER.map((who) => (
            <Tile key={who} who={who} talking={active === who} sharing={who === 'selin' && sharing} />
          ))}
        </div>
        <Chat messages={chat} typing={typing} />
      </div>
    </div>
  );
}
