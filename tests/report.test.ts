import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reportText, sessionReport, type ReportInput } from '../src/game/engine/report';
import { NEPHEW_ID, candidates } from '../src/game/data/candidates';
import { isStrong, isWronglyFlagged } from '../src/game/engine/scoring';

const strongFlagged = Object.keys(candidates).filter((id) => isWronglyFlagged(id) && isStrong(id));
const base: ReportInput = {
  seed: 42,
  difficulty: 'normal',
  endingTitle: 'Deneme',
  performans: 55,
  vicdan: 40,
  weekLog: [],
  finalists: [],
  hiredId: null,
  referenceChecks: {},
  aiUses: 0,
  complies: 0,
  refusals: 0,
};

test('rapor haftanın kayıtlarını sayar', () => {
  const [a, b] = strongFlagged;
  const r = sessionReport({
    ...base,
    weekLog: [
      { id: a, day: 0, decision: 'reject', considered: false },
      { id: b, day: 1, decision: 'approve', considered: true },
    ],
  });
  assert.equal(r.decided, 2);
  assert.equal(r.approved, 1);
  assert.equal(r.readShare, 0.5);
  assert.equal(r.flaggedStrong.length, 2);
});

test('sorular oyuncunun kendi kararlarından başlar', () => {
  const a = strongFlagged[0];
  const r = sessionReport({ ...base, weekLog: [{ id: a, day: 0, decision: 'reject', considered: false }], complies: 2, finalists: [{ id: NEPHEW_ID }] });
  assert.ok(r.questions[0].includes(candidates[a].name), r.questions[0]);
  assert.ok(r.questions.some((q) => q.includes('2 ricasına')));
  assert.ok(r.questions.some((q) => q.includes('yeğeni')));
});

test('okuma bilgisi olmayan eski kayıtta oran bilinmez, rapor yine çıkar', () => {
  const r = sessionReport({ ...base, weekLog: [{ id: strongFlagged[0], day: 0, decision: 'reject' }] });
  assert.equal(r.readShare, null);
  assert.equal(r.flaggedStrong[0].considered, null);
  assert.ok(r.questions.length >= 3);
});

test('metin hali oyun kodunu, sonu ve soruları taşır', () => {
  const text = reportText(sessionReport({ ...base, hiredId: strongFlagged[0] }));
  assert.match(text, /#42/);
  assert.match(text, /Deneme/);
  assert.match(text, /Tartışma soruları:\n1\. /);
  assert.match(text, new RegExp(candidates[strongFlagged[0]].name));
});
