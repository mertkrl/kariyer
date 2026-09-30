/*
 * A whole week played by a bot, tick by tick, the way the screens drive the store: open each
 * file, read for a while, decide, answer what blocks the clock. Same seed, same week.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useGameStore } from '../src/game/store';
import { days, FINALIST_LIMIT } from '../src/game/data/days';
import { lineupFor } from '../src/game/storeDefaults';
import { rngFor } from '../src/game/rng';

const store = useGameStore;
const MAX_TICKS_PER_DAY = 2000;

interface Run {
  trace: string[];
  performans: number;
  vicdan: number;
  finalists: string[];
  scoresSeen: number[];
}

function playWeek(seed: number, style: 'approve' | 'reject' | 'mixed', difficulty: 'normal' | 'hard' = 'normal'): Run {
  (globalThis.window as { location: URL }).location = new URL(`http://localhost/?seed=${seed}`);
  localStorage.clear();
  const s = () => store.getState();
  const bot = rngFor(seed, 'bot');
  const run: Run = { trace: [], performans: 0, vicdan: 0, finalists: [], scoresSeen: [] };

  s().restart();
  s().setDifficulty(difficulty);
  s().startGame();
  s().publishJob('standart');
  s().proceedToBriefing();

  while (!days[s().currentDayIndex].final) {
    const day = s().currentDayIndex;
    s().beginDay();
    assert.equal(s().phase, 'gameplay', `gün ${day} başlamadı`);
    s().finishOrientation();
    let reading = 0;
    for (let t = 0; t < MAX_TICKS_PER_DAY && s().phase === 'gameplay'; t++) {
      const st = s();
      if (st.meeting.state === 'active') st.finishMeeting('silent' as never);
      if (st.revokeDraft) st.sendRevoke(true);
      if (st.desk.ringing && !st.desk.inCall) st.pickUpCall();
      if (st.desk.inCall) st.answerCall(0);
      const open = lineupFor(st).find((id) => !st.decisions[id]);
      if (open && st.currentCandidateId !== open) {
        st.selectCandidate(open);
        reading = 0;
      } else if (open && ++reading > 6) {
        const approve = style === 'approve' || (style === 'mixed' && bot() < 0.35);
        st.decide(approve ? 'approve' : 'reject');
        if (s().decisions[open] !== (approve ? 'approve' : 'reject')) st.decide('reject'); // quota full
      }
      const after = s();
      const rejected = lineupFor(after).filter((id) => after.decisions[id] === 'reject' && !after.plannedRejections[id]);
      if (!open && rejected.length && !after.rejectionMailsSent) st.planRejectionMails(Object.fromEntries(rejected.map((id) => [id, 'standard'])));
      s().tick();
      run.scoresSeen.push(s().performans, s().vicdan);
    }
    if (s().phase === 'gameplay') s().finishDay();
    assert.equal(s().phase, 'dayEnd', `gün ${day} bitmedi (saat ${s().workdayMinutes})`);
    run.trace.push(`${day}:${s().performans}/${s().vicdan}/${s().finalists.length}@${Math.round(s().workdayMinutes)}`);
    if (process.env.TRACE) console.log(style, run.trace.at(-1), lineupFor(s()).length, s().managerRequests.length, s().meeting.state);
    s().nextDay();
    if (s().phase === 'applicationFlood') s().proceedToBriefing();
  }
  run.performans = s().performans;
  run.vicdan = s().vicdan;
  run.finalists = s().finalists.map((f) => f.id);
  return run;
}

for (const style of ['approve', 'reject', 'mixed'] as const) {
  test(`hafta sonuna kadar oynanır (${style})`, () => {
    const run = playWeek(12345, style);
    assert.ok(run.scoresSeen.every((v) => v >= 0 && v <= 100), 'puan 0–100 dışına çıktı');
    assert.equal(new Set(run.finalists).size, run.finalists.length, 'aynı finalist iki kez');
    const byPlayer = store.getState().finalists.filter((f) => !f.byManager).length;
    assert.ok(byPlayer <= FINALIST_LIMIT, `kontenjan aşıldı: ${byPlayer}`);
  });
}

test('zor modda da hafta tamamlanır', () => {
  const run = playWeek(2024, 'mixed', 'hard');
  assert.equal(store.getState().difficulty, 'hard');
  assert.ok(store.getState().week.events > 0, 'zor modda sürpriz olay yaşanmadı');
  assert.ok(run.scoresSeen.every((v) => v >= 0 && v <= 100));
});

test('aynı tohum aynı haftayı üretir', () => {
  const a = playWeek(777, 'mixed');
  const b = playWeek(777, 'mixed');
  assert.deepEqual(a.trace, b.trace);
  assert.deepEqual(a.finalists, b.finalists);
});

test('onaylayan ve reddeden oyuncu farklı yerlere varır', () => {
  const yes = playWeek(99, 'approve');
  const no = playWeek(99, 'reject');
  assert.notDeepEqual(yes.trace, no.trace);
  assert.ok(yes.finalists.length > no.finalists.length);
});


test('gerçek bir haftanın gün başı kaydı eksiksiz geri yüklenir', async () => {
  const { loadSave } = await import('../src/game/store');
  playWeek(31, 'mixed');
  const save = loadSave();
  assert.ok(save, 'son gün başı kaydı geçersiz sayıldı');
  const kept = Object.keys(save.data).sort();
  const written = Object.keys(JSON.parse(localStorage.getItem('kariyerweb-save')!).data).sort();
  assert.deepEqual(kept, written, 'kaydın bazı alanları yüklenirken düştü');
});
