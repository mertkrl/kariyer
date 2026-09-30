import { useEffect, useRef } from 'react';
import { SPEAKERS, type Board, type ChatMessage, type Speaker, type TeamStats } from '../../game/meeting';
import { Dashboard } from './Dashboard';
import styles from './MeetingRoom.module.css';

/*
 * The Wednesday meeting as a video call: Selin's shared report in the middle, following the
 * conversation, everyone else in tiles on the side showing only their name. The name of
 * whoever is talking lights up.
 */

type Person = Exclude<Speaker, 'room'>;

/** Where each of them dials in from (shown on hover). */
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
            '🔇'
          )}
        </span>
        {sharing && <small>paylaşıyor</small>}
      </div>
    </div>
  );
}

/** The call's side chat: what people type while someone else has the floor. */
function Chat({ messages, typing }: { messages: ChatMessage[]; typing: Speaker | null }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length, typing]);
  return (
    <aside className={styles.chat} aria-label="Görüşme sohbeti" aria-live="polite">
      <div className={styles.chatHead}>Sohbet</div>
      <div className={styles.chatList}>
        {messages.map((m, i) =>
          m.who === 'system' ? (
            <p key={i} className={styles.chatSystem}>
              {m.text}
            </p>
          ) : (
            <p key={i} className={`${styles.chatMsg} ${m.private ? styles.chatPrivate : ''}`}>
              <b style={{ color: SPEAKERS[m.who].color }}>{SPEAKERS[m.who].name.split(' ')[0]}</b>
              {m.private && <em>özel · sadece sana</em>}
              <span>{m.text}</span>
            </p>
          ),
        )}
        {typing && typing !== 'room' && <p className={styles.chatTyping}>{SPEAKERS[typing].name.split(' ')[0]} yazıyor…</p>}
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
