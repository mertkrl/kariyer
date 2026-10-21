import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXAM_QUESTIONS, EXAM_SECTIONS, screenshareOption, sectionOf, sliderOption, stampOption } from '../src/games/test/data/questions';
import { ROBOT_CHALLENGES, robotPassed } from '../src/games/test/data/robot';
import { pickExam, QUESTIONS_PER_SECTION, reportNo, scoreExam, secondsOf, sectionScores, totalSeconds, verdictOf } from '../src/games/test/logic';

test('her soru bir bölüme düşer, anahtar ve sağduyu farklı geçerli şıklardır', () => {
  for (const q of EXAM_QUESTIONS) {
    assert.ok(sectionOf(q.kind) >= 0, q.id);
    assert.notEqual(q.answer, q.sensible, q.id);
    assert.ok(q.answer < q.options.length && q.sensible < q.options.length, q.id);
  }
  assert.equal(new Set(EXAM_QUESTIONS.map((q) => q.id)).size, EXAM_QUESTIONS.length);
});

test('test bölümleri sırayla gelir, soru tekrar etmez', () => {
  const exam = pickExam();
  assert.equal(exam.length, EXAM_SECTIONS.length);
  exam.forEach((s, si) => {
    assert.ok(s.questions.length > 0 && s.questions.length <= QUESTIONS_PER_SECTION);
    for (const q of s.questions) assert.equal(sectionOf(q.kind), si);
  });
  const ids = exam.flatMap((s) => s.questions.map((q) => q.id));
  assert.equal(new Set(ids).size, ids.length);
});

test('aynı rastgelelik aynı testi verir', () => {
  const seq = () => {
    let x = 0.3;
    return () => (x = (x * 9301 + 0.49297) % 1);
  };
  const ids = (r: () => number) => pickExam(r).flatMap((s) => s.questions.map((q) => q.id));
  assert.deepEqual(ids(seq()), ids(seq()));
});

test('anahtarı tutturan şirket puanını, aklı başında olan sağduyu puanını alır', () => {
  const qs = EXAM_QUESTIONS.slice(0, 4);
  assert.deepEqual(scoreExam(qs, qs.map((q) => q.answer)), { company: 100, sense: 0, blank: 0 });
  assert.deepEqual(scoreExam(qs, qs.map((q) => q.sensible)), { company: 0, sense: 100, blank: 0 });
  assert.deepEqual(scoreExam(qs, [null, null, qs[2].answer]), { company: 25, sense: 0, blank: 3 });
});

test('yorum şirket puanıyla iyileşir', () => {
  assert.equal(verdictOf(100).title, 'Örnek Çalışan Adayı');
  assert.equal(verdictOf(0).title, 'Uyum Riski');
});

test('toplam süre soruların sürelerinin toplamıdır', () => {
  const qs = EXAM_QUESTIONS.slice(0, 3);
  assert.equal(totalSeconds(qs), secondsOf(qs[0]) + secondsOf(qs[1]) + secondsOf(qs[2]));
});

test('bölüm puanları kendi sorularına bakar', () => {
  const exam = pickExam();
  const answers = exam.flatMap((s, si) => s.questions.map((q) => (si === 0 ? q.answer : q.sensible)));
  const scores = sectionScores(exam, answers);
  assert.equal(scores[0].company, 100);
  assert.equal(scores[1].sense, 100);
  assert.equal(reportNo(answers), reportNo([...answers]));
});

test('her bölümün havuzu bir turu doldurmaya yeter', () => {
  EXAM_SECTIONS.forEach((_, si) => {
    assert.ok(EXAM_QUESTIONS.filter((q) => sectionOf(q.kind) === si).length >= QUESTIONS_PER_SECTION, EXAM_SECTIONS[si].title);
  });
});

test('robot görevleri: her görevin doğru bir seçimi var ve yalnızca o geçer', () => {
  for (const c of ROBOT_CHALLENGES) {
    assert.equal(c.tiles.length, 9, c.id);
    const right = new Set(c.tiles.flatMap((t, i) => (t.pick ? [i] : [])));
    assert.ok(robotPassed(c, right), c.id);
    assert.ok(!robotPassed(c, new Set([...right, c.tiles.findIndex((t) => !t.pick)])), c.id);
  }
});

test('ekran paylaşımı: açık kalan sekmelere göre şık', () => {
  const q = EXAM_QUESTIONS.find((x) => x.id === 'screenshare')!;
  const w = q.widget as Extract<NonNullable<typeof q.widget>, { type: 'screenshare' }>;
  const ids = (kind: string) => w.tabs.flatMap((t, i) => (t.kind === kind ? [i] : []));
  assert.equal(screenshareOption(w.tabs, new Set()), 0);
  assert.equal(screenshareOption(w.tabs, new Set(ids('personal'))), 1);
  assert.equal(screenshareOption(w.tabs, new Set(ids('risky'))), q.sensible);
  assert.equal(screenshareOption(w.tabs, new Set([...ids('risky'), ...ids('personal')])), q.answer);
});

test('arama geçmişi: her aramanın saati var, son şık "hiçbiri"', () => {
  const q = EXAM_QUESTIONS.find((x) => x.id === 'search-history')!;
  assert.equal(q.widget?.type, 'history');
  if (q.widget?.type === 'history') assert.equal(q.widget.times.length, q.options.length - 1);
  assert.equal(q.sensible, q.options.length - 1);
});

test('zam tablosu: yazılan oran şıkka düşer; şirketin önerisi anahtar, enflasyon kadarı sağduyu', () => {
  const q = EXAM_QUESTIONS.find((x) => x.id === 'raise-cell')!;
  assert.equal(q.widget?.type, 'raise');
  if (q.widget?.type !== 'raise') return;
  const t = q.widget.thresholds;
  assert.equal(sliderOption(3, t), q.answer);
  assert.equal(sliderOption(45, t), q.sensible);
  assert.equal(sliderOption(200, t), 3);
});


test('evrak damgalama: hakkına göre damgalayan sağduyu, haklı talepleri reddeden anahtar', () => {
  const q = EXAM_QUESTIONS.find((x) => x.id === 'stamp-desk')!;
  if (q.widget?.type !== 'stamp') return assert.fail('stamp değil');
  const docs = q.widget.docs;
  const fair = new Set(docs.flatMap((d, i) => (d.fair ? [i] : [])));
  const unfair = new Set(docs.flatMap((d, i) => (d.fair ? [] : [i])));
  assert.equal(stampOption(docs, new Set(docs.map((_, i) => i))), 0);
  assert.equal(stampOption(docs, fair), q.sensible);
  assert.equal(stampOption(docs, unfair), q.answer);
  assert.equal(stampOption(docs, new Set()), q.answer);
});
