import { useEffect, useState } from 'react';
import { useGameStore } from '../../game/store';
import { candidates } from '../../game/data/candidates';
import { AD_KEYWORDS, atsReport } from '../../game/ats';
import { audioEngine } from '../../audio/audioEngine';
import { buildOpening, CLOSING, OPTIONS, SHORTLIST, SPEAKERS, type Board, type Line, type MeetingOption, type Speaker, type TeamStats } from '../../game/meeting';
import { CallScene } from './CallScene';
import styles from './MeetingRoom.module.css';

/*
 * The Wednesday meeting, held online: Selin shares a live report that follows what is said,
 * everyone sits in a small tile, Hakan Bey's camera stays off. Whoever talks lights up.
 */

type Stage = 'opening' | 'choice' | 'replies' | 'closing';
const CHARS_PER_TICK = 2;
const TICK_MS = 22;

export function MeetingRoom() {
  const finishMeeting = useGameStore((s) => s.finishMeeting);
  // your week so far, frozen as the meeting starts
  const [you] = useState<TeamStats>(() => {
    const g = useGameStore.getState();
    const today = Object.entries(g.decisions);
    const files = g.weekLog.length + today.length;
    const seconds = g.week.reviewTicks + today.reduce((n, [id]) => n + (g.timeSpent[id] ?? 0), 0);
    // who you invited this week: they are the rows under your name on Friday's shortlist
    const invited = [...g.weekLog.filter((e) => e.decision === 'approve').map((e) => e.id), ...today.filter(([, d]) => d === 'approve').map(([id]) => id)];
    const picks = invited
      // someone a colleague already put on the list is not listed twice
      .filter((id) => candidates[id] && !SHORTLIST.some((c) => c.id === id))
      .map((id) => ({ id, name: candidates[id].name, ats: Math.round((atsReport(candidates[id], 0).matched.length / AD_KEYWORDS.length) * 100) }));
    return { files, avg: files ? Math.round(seconds / files) : 0, invites: invited.length, ai: files ? Math.min(1, g.aiUses / files) : 0, picks };
  });
  const [OPENING] = useState(() => buildOpening(you));
  const [stage, setStage] = useState<Stage>('opening');
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<MeetingOption | null>(null);
  // the line is typed out; a click first completes it, the next one moves on
  const [full, setFull] = useState(false);
  const [done, setDone] = useState(false);

  const lines: Line[] =
    stage === 'opening' ? OPENING : stage === 'replies' && choice ? [{ who: 'you', text: choice.text }, ...choice.replies] : stage === 'closing' ? CLOSING : [];
  const line = lines[index] ?? null;
  const active: Speaker | null = stage === 'choice' ? 'hakan' : (line?.who ?? null);
  // everything said so far: the shared screen shows the latest board, the chat keeps every message
  const replyLines: Line[] = choice ? [{ who: 'you', text: choice.text }, ...choice.replies] : [];
  const seen: Line[] = [
    ...(stage === 'opening' ? OPENING.slice(0, index + 1) : OPENING),
    ...(stage === 'replies' ? replyLines.slice(0, index + 1) : stage === 'closing' ? replyLines : []),
    ...(stage === 'closing' ? CLOSING.slice(0, index + 1) : []),
  ];
  const board: Board = [...seen].reverse().find((l) => l.board)?.board ?? { page: 'overview' };
  const chat = seen.flatMap((l) => l.chat ?? []);

  function advance() {
    if (!line) return;
    if (!done && !full) {
      setFull(true);
      return;
    }
    audioEngine.playUi('click');
    setFull(false);
    setDone(false);
    if (index < lines.length - 1) {
      setIndex(index + 1);
      return;
    }
    setIndex(0);
    if (stage === 'opening') setStage('choice');
    else if (stage === 'replies') setStage('closing');
    else if (stage === 'closing' && choice) finishMeeting(choice.id);
  }

  function pick(option: MeetingOption) {
    audioEngine.playUi('confirm');
    setChoice(option);
    setIndex(0);
    setFull(false);
    setDone(false);
    setStage('replies');
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (stage === 'choice') return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        advance();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const speaker = line && line.who !== 'room' ? SPEAKERS[line.who] : null;
  const isLast = stage === 'closing' && index === lines.length - 1;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Haftalık İK toplantısı">
      <div className={styles.header}>
        <span>Haftalık İK toplantısı</span>
        <span className="mono">
          <span className={styles.rec} aria-hidden="true" /> Çarşamba · 11:00 · Görüntülü görüşme
        </span>
      </div>

      <CallScene active={active} you={you} board={board} chat={chat} typing={line?.typing ?? null} />

      <div className={styles.dialog}>
        {stage === 'choice' ? (
          <>
            <div className={styles.speaker} style={{ color: SPEAKERS.hakan.color }}>
              Hakan Kaya <small>İK Müdürü · sana soruyor</small>
            </div>
            <p className={styles.text}>"{OPENING[OPENING.length - 1].text}"</p>
            <div className={styles.options}>
              {OPTIONS.map((o) => (
                <button key={o.id} className={styles.option} onClick={() => pick(o)}>
                  <span className={styles.optionIcon} aria-hidden="true">
                    ›
                  </span>
                  {o.text}
                </button>
              ))}
            </div>
          </>
        ) : (
          line && (
            <button className={styles.lineButton} onClick={advance}>
              {speaker ? (
                <div className={styles.speaker} style={{ color: speaker.color }}>
                  {speaker.name} {speaker.role && <small>{speaker.role}</small>}
                </div>
              ) : (
                <div className={`${styles.speaker} ${styles.narration}`}>Görüşme</div>
              )}
              <p className={`${styles.text} ${line.who === 'room' ? styles.stage : ''}`}>
                <Typed key={`${stage}-${index}`} text={line.who === 'room' ? line.text : `"${line.text}"`} full={full} onDone={() => setDone(true)} />
              </p>
              <span className={styles.next}>{isLast ? 'Görüşmeden ayrıl ▸' : 'Devam ▸'}</span>
            </button>
          )
        )}
      </div>
    </div>
  );
}

function Typed({ text, full, onDone }: { text: string; full: boolean; onDone: () => void }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let n = 0;
    const id = window.setInterval(() => {
      n = Math.min(text.length, n + CHARS_PER_TICK);
      setShown(n);
      if (n >= text.length) {
        window.clearInterval(id);
        onDone();
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
    // typed once per line; the parent keys this component by line
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <>{full ? text : text.slice(0, shown)}</>;
}
