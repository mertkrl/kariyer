import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APTITUDE_QUESTIONS } from '../src/game/data/aptitudeTest';
import { APTITUDE_CUTOFF, aptitudeNote, candidateAptitude, scoreAptitude, testTalk } from '../src/game/events/aptitude';
import { candidates } from '../src/game/data/candidates';
import { candidateDetails } from '../src/game/data/candidateDetails';

test('her sorunun anahtarı ve aklı başında cevabı şıkların içinde ve farklı', () => {
  for (const q of APTITUDE_QUESTIONS) {
    assert.ok(q.answer >= 0 && q.answer < q.options.length, q.id);
    assert.ok(q.sensible >= 0 && q.sensible < q.options.length, q.id);
    assert.notEqual(q.answer, q.sensible, q.id);
  }
  assert.equal(new Set(APTITUDE_QUESTIONS.map((q) => q.id)).size, APTITUDE_QUESTIONS.length);
});

test('anahtar 100, hiç cevap 0, aklı başında cevaplar eşiğin altında', () => {
  assert.equal(scoreAptitude(APTITUDE_QUESTIONS.map((q) => q.answer)).score, 100);
  assert.deepEqual({ ...scoreAptitude([]), answers: [] }, { score: 0, correct: 0, timedOut: APTITUDE_QUESTIONS.length, answers: [] });
  assert.equal(scoreAptitude(APTITUDE_QUESTIONS.map((q) => q.sensible)).score, 0);
});

test('aday kâğıtları tohuma bağlı; işini bilen ortalamada daha düşük alır ama çoğu aday eşiği geçer', () => {
  const ids = Object.keys(candidates);
  assert.deepEqual(candidateAptitude(ids[0], 7), candidateAptitude(ids[0], 7));
  const avg = (pick: (fit: number) => boolean) => {
    const xs = ids.filter((id) => pick(candidateDetails[id]?.hireFit ?? 3)).flatMap((id) => [1, 2, 3, 4, 5].map((s) => candidateAptitude(id, s).score));
    return xs.reduce((a, b) => a + b, 0) / xs.length;
  };
  assert.ok(avg((f) => f >= 4) < avg((f) => f <= 2));
  // ama çoğu aday eşiği geçer: test herkesi değil, bazılarını eler
  const all = ids.flatMap((id) => [1, 2, 3].map((s) => candidateAptitude(id, s).score));
  assert.ok(all.filter((x) => x >= APTITUDE_CUTOFF).length > all.length / 2);
});

test('mülakatta test sorusu: aklı başında cevabı veren gerekçesini anlatır', () => {
  for (const id of Object.keys(candidates)) {
    const { question, answer } = testTalk(id, 3);
    assert.match(question, /Testte \d+ aldınız/);
    assert.ok(answer.length > 20, id);
  }
  assert.ok(APTITUDE_QUESTIONS.every((q) => q.why.length > 20));
});

test('elle yazılmış kâğıtlar: yeğen tam puan, sistemin gözdesi eşiğin üstünde, disleksili güçlü aday altında, test bazen tutar', () => {
  assert.equal(candidateAptitude('okan', 1).score, 100);
  assert.ok(candidateAptitude('serkan', 1).score >= 90);
  assert.ok(candidateAptitude('irem', 1).score < APTITUDE_CUTOFF && candidateAptitude('irem', 1).timedOut >= 5);
  assert.ok(candidateAptitude('murat', 1).score >= APTITUDE_CUTOFF);
  assert.match(aptitudeNote('irem') ?? '', /ek süre/);
  assert.match(testTalk('irem', 1).answer, /Disleksi/);
});

test('rapor: eşikte takılan güçlü dosyalar ve kendi puanın tartışma sorusuna döner', async () => {
  const { sessionReport } = await import('../src/game/engine/report');
  const r = sessionReport({
    seed: 1, difficulty: 'normal', endingTitle: '', performans: 50, vicdan: 50,
    weekLog: [{ id: 'irem', day: 1, decision: 'approve' }, { id: 'serkan', day: 1, decision: 'approve' }, { id: 'serkan', day: 3, decision: 'approve' }],
    finalists: [{ id: 'serkan' }], hiredId: null, referenceChecks: {}, aiUses: 0, complies: 0, refusals: 0, selfScore: 42,
  });
  assert.equal(r.decided, 2);
  assert.deepEqual(r.test.strongBelow.map((t) => [t.name.split(' ')[0], t.invited]), [['İrem', false]]);
  assert.ok(r.test.weakAbove.some((t) => t.invited));
  assert.ok(r.questions.some((q) => q.includes('sen de mülakata çağrılmazdın')));
});
