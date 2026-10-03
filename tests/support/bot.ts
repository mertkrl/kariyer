/*
 * A bot that plays a whole week tick by tick, the way the screens drive the store: open each
 * file, read it for a while (with the portal on screen), decide, answer whatever blocks the
 * clock. How it reads, decides and answers the manager is up to the caller.
 */
import { useGameStore } from '../../src/game/store';
import { days } from '../../src/game/data/days';
import { lineupFor } from '../../src/game/storeDefaults';
import type { Decision, Difficulty } from '../../src/game/types';

const store = useGameStore;
const MAX_TICKS_PER_DAY = 2000;

export interface BotStyle {
  /** Seconds to read the file before deciding. */
  read: () => number;
  decide: (id: string) => Decision;
  /** The manager asks a favour on the phone: go along with it? */
  comply: () => boolean;
}

export interface Run {
  /** `day:performans/vicdan/finalists@minutes`, one per workday. */
  trace: string[];
  performans: number;
  vicdan: number;
  finalists: string[];
  scoresSeen: number[];
}

export function playWeek(seed: number, style: BotStyle, difficulty: Difficulty = 'normal'): Run {
  (globalThis.window as { location: URL }).location = new URL(`http://localhost/?seed=${seed}`);
  localStorage.clear();
  const s = () => store.getState();
  const run: Run = { trace: [], performans: 0, vicdan: 0, finalists: [], scoresSeen: [] };

  s().restart();
  s().setDifficulty(difficulty);
  s().startGame();
  s().publishJob('standart');
  s().proceedToBriefing();

  while (!days[s().currentDayIndex].final) {
    const day = s().currentDayIndex;
    s().beginDay();
    if (s().phase !== 'gameplay') throw new Error(`gün ${day} başlamadı`);
    s().finishOrientation();
    s().setReading(true);
    let reading = 0;
    let need = style.read();
    for (let t = 0; t < MAX_TICKS_PER_DAY && s().phase === 'gameplay'; t++) {
      const st = s();
      if (st.meeting.state === 'active') st.finishMeeting('silent' as never);
      if (st.revokeDraft) st.sendRevoke(true);
      if (st.desk.ringing && !st.desk.inCall) st.pickUpCall();
      if (st.desk.inCall) st.answerCall(st.desk.inCall.startsWith('req:') && !style.comply() ? 1 : 0);
      const open = lineupFor(st).find((id) => !st.decisions[id]);
      if (open && st.currentCandidateId !== open) {
        st.selectCandidate(open);
        st.markReadThrough(open); // the whole CV fits, as on a tall screen
        reading = 0;
        need = style.read();
      } else if (open && ++reading >= need) {
        const d = style.decide(open);
        st.decide(d);
        if (s().decisions[open] !== d) st.decide('reject'); // quota full
      }
      const after = s();
      // like the notices screen: every one of today's rejections, the ones already planned included
      const rejected = lineupFor(after).filter((id) => after.decisions[id] === 'reject');
      if (!open && rejected.some((id) => !after.plannedRejections[id]) && !after.rejectionMailsSent)
        st.planRejectionMails(Object.fromEntries(rejected.map((id) => [id, after.plannedRejections[id] ?? 'standard'])));
      s().tick();
      run.scoresSeen.push(s().performans, s().vicdan);
    }
    if (s().phase === 'gameplay') s().finishDay();
    if (s().phase !== 'dayEnd') throw new Error(`gün ${day} bitmedi (saat ${s().workdayMinutes})`);
    run.trace.push(`${day}:${s().performans}/${s().vicdan}/${s().finalists.length}@${Math.round(s().workdayMinutes)}`);
    s().nextDay();
    if (s().phase === 'applicationFlood') s().proceedToBriefing();
  }
  run.performans = s().performans;
  run.vicdan = s().vicdan;
  run.finalists = s().finalists.map((f) => f.id);
  return run;
}
