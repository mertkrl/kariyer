/*
 * Cuma mülakat odasının kuralları, ekransız: soru hakkı, takip sorusu, söz Ümit'e geçince sıra,
 * maaş konuşması, adayın soruları ve görüşmenin kapanması.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CASE, FOLLOW, FORBIDDEN, OWNER, QUESTION_BUDGET, type Entry } from '../src/screens/final/interviewModel';
import { answerBackIn, canAsk, canFollowUp, handOffQuestions, roomState, settleSalaryIn } from '../src/screens/final/interviewRoom';

const q = (n: number, by?: 'hakan' | 'levent'): Entry => ({ kind: 'q', q: n, ...(by ? { by } : {}) });

test('klasik soru hakkı dolunca yeni soru sorulamaz, aynı soru iki kez sorulamaz', () => {
  const opened: Entry = { kind: 'warm', warm: true };
  let entries: Entry[] = [];
  assert.ok(!canAsk(roomState(entries, 0), 0, false), 'görüşme açılmadan soru sorulmaz');
  entries = [opened];
  assert.ok(canAsk(roomState(entries, 0), 0, false));
  entries = [opened, q(0)];
  assert.ok(!canAsk(roomState(entries, 0), 0, false), 'aynı soru');
  entries = [opened, ...Array.from({ length: QUESTION_BUDGET }, (_, i) => q(i))];
  assert.ok(!canAsk(roomState(entries, 0), QUESTION_BUDGET, false), 'hak doldu');
  // takip sorusu haktan düşmez
  assert.ok(canAsk(roomState(entries, 0), FOLLOW, false));
});

test('takip sorusu tek seferlik; biri yazarken ya da söz geçtikten sonra soru sorulmaz', () => {
  const used = roomState([q(0), q(FOLLOW + 1)], 0);
  assert.ok(!canFollowUp(used, false));
  assert.ok(!canAsk(roomState([q(0)], 0), 1, true), 'yazarken');
  assert.ok(!canAsk(roomState([q(0), { kind: 'handoff' }], 0), 1, false), 'söz geçti');
});

test('söz Ümit\'e geçince: teknik soru, sonra (yapılandırılmış değilse) Hakan Bey', () => {
  assert.deepEqual(handOffQuestions(false).map((e) => e.kind === 'q' && [e.q, e.by]), [[CASE, 'levent'], [FORBIDDEN, 'hakan']]);
  assert.deepEqual(handOffQuestions(true).map((e) => e.kind === 'q' && [e.q, e.by]), [[CASE, 'levent']]);
  // Ümit'in ve Hakan Bey'in soruları senin hakkından düşmez
  assert.deepEqual(roomState([q(0), { kind: 'handoff' }, ...handOffQuestions(false)], 0).mine, [0]);
  // adayı ekipten biri getirdiyse önce o, senin sormadığın klasik soruyu sorar; Hakan Bey kendi adayına uyum sorusu sormaz
  assert.deepEqual(handOffQuestions(false, 'ayse', [0, 2]).map((e) => e.kind === 'q' && [e.q, e.by]), [[OWNER + 1, 'ayse'], [CASE, 'levent'], [FORBIDDEN, 'hakan']]);
  assert.deepEqual(handOffQuestions(false, 'hakan', [0, 1]).map((e) => e.kind === 'q' && e.by), ['hakan', 'levent']);
});

test('maaştan sonra adayın soruları sırayla gelir; hepsi cevaplanınca görüşme kapatılabilir', () => {
  const backs = 2;
  let entries: Entry[] = [q(0), { kind: 'handoff' }, ...handOffQuestions(false), { kind: 'salary', move: null }];
  assert.ok(roomState(entries, backs).salaryPending);
  entries = settleSalaryIn(entries, 'match', backs);
  let room = roomState(entries, backs);
  assert.ok(room.salaryDone && room.backPending?.n === 0 && !room.backsDone);
  entries = answerBackIn(entries, true, backs);
  room = roomState(entries, backs);
  assert.equal(room.backPending?.n, 1);
  entries = answerBackIn(entries, false, backs);
  room = roomState(entries, backs);
  assert.ok(room.backsDone && !room.backPending);
  assert.deepEqual(entries.filter((e) => e.kind === 'back').map((e) => e.kind === 'back' && e.choice), ['honest', 'polished']);
});

test('sorusu olmayan aday: maaş biter bitmez görüşme kapatılabilir', () => {
  const entries = settleSalaryIn([{ kind: 'salary', move: null }], 'cap', 0);
  assert.ok(roomState(entries, 0).backsDone);
  assert.ok(roomState([...entries, { kind: 'end' }], 0).ended);
});
