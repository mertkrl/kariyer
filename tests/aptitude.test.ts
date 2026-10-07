import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APTITUDE_QUESTIONS } from '../src/game/data/aptitudeTest';
import { APTITUDE_CUTOFF, scoreAptitude } from '../src/game/events/aptitude';

test('her sorunun cevabı şıkların içinde ve kimlikler tekil', () => {
  for (const q of APTITUDE_QUESTIONS) assert.ok(q.answer >= 0 && q.answer < q.options.length, q.id);
  assert.equal(new Set(APTITUDE_QUESTIONS.map((q) => q.id)).size, APTITUDE_QUESTIONS.length);
});

test('hepsi doğru 100, hiç cevap yok 0 ve hepsi süre aşımı', () => {
  assert.deepEqual(scoreAptitude(APTITUDE_QUESTIONS.map((q) => q.answer)), { score: 100, correct: APTITUDE_QUESTIONS.length, timedOut: 0 });
  assert.deepEqual(scoreAptitude([]), { score: 0, correct: 0, timedOut: APTITUDE_QUESTIONS.length });
});

test('kişilik maddelerinde dürüst bir "Kararsızım" puan götürür ve eşiğin altına iter', () => {
  const answers = APTITUDE_QUESTIONS.map((q) => (q.kind === 'kişilik' ? 2 : q.answer));
  const twoMissed = answers.map((a, i) => (i < 2 && APTITUDE_QUESTIONS[i].kind !== 'kişilik' ? null : a));
  assert.ok(scoreAptitude(answers).score < 100);
  assert.ok(scoreAptitude(twoMissed).score < APTITUDE_CUTOFF);
});
