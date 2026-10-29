import { test } from 'node:test';
import assert from 'node:assert/strict';
import { budgetOption, contractOption, EXAM_QUESTIONS, EXAM_SECTIONS, passwordOption, passwordRuleOk, screenshareOption, sectionOf, shutdownOption, sliderOption, stampOption, swipeOption } from '../src/games/test/data/questions';
import { BRIEFINGS } from '../src/games/test/data/briefings';
import { puzzleSolved, ROBOT_CHALLENGES, ROBOT_PUZZLES, robotPassed } from '../src/games/test/data/robot';
import { canShuffle, highlightsOf, pickExam, QUESTIONS_PER_SECTION, reportNo, shuffleOptions, scoreExam, secondsOf, sectionScores, totalSeconds, verdictOf } from '../src/games/test/logic';

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

test('şıklar karışır ama anahtar ve sağduyu cevabı kendi metniyle gider', () => {
  let x = 0.71;
  const random = () => (x = (x * 9301 + 0.49297) % 1);
  const moved = new Set<string>();
  for (let round = 0; round < 6; round++)
    for (const q of EXAM_QUESTIONS) {
      const s = shuffleOptions(q, random);
      assert.deepEqual([...s.options].sort(), [...q.options].sort(), q.id);
      assert.equal(s.options[s.answer], q.options[q.answer], q.id);
      assert.equal(s.options[s.sensible], q.options[q.sensible], q.id);
      if (s.options.join() !== q.options.join()) moved.add(q.id);
      // sırası anlam taşıyan türler olduğu gibi kalır
      if (!canShuffle(q)) assert.equal(s, q, q.id);
    }
  assert.ok(EXAM_QUESTIONS.filter(canShuffle).every((q) => moved.has(q.id)), 'karıştırılabilen her soru en az bir kez yer değiştirmeli');
  // kaydırıcının eşikleri şık sırasına bağlıdır: asla karışmaz
  assert.ok(EXAM_QUESTIONS.filter((q) => q.widget?.type === 'slider').every((q) => !canShuffle(q)));
});

test('aklı başında cevap artık hep aynı yerde değil', () => {
  const exam = pickExam();
  const spots = new Set(exam.flatMap((s) => s.questions.filter(canShuffle).map((q) => q.sensible)));
  assert.ok(spots.size >= 3);
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

test('her bölümün tanıtımı ve geçerli bir örnek sorusu var', () => {
  assert.deepEqual(
    BRIEFINGS.map((b) => b.id),
    EXAM_SECTIONS.map((s) => s.id),
  );
  for (const b of BRIEFINGS) {
    assert.ok(b.rules.length > 0 && b.practice.explain, b.id);
    assert.ok(b.practice.answer === null || b.practice.answer < b.practice.options.length, b.id);
  }
});

test('havuz büyük: 120 soru, her bölüm iki tur boyunca tekrarsız, soruların en az %40\'ı etkileşimli', () => {
  assert.ok(EXAM_QUESTIONS.length >= 120, `${EXAM_QUESTIONS.length} soru`);
  EXAM_SECTIONS.forEach((s, si) => assert.ok(EXAM_QUESTIONS.filter((q) => sectionOf(q.kind) === si).length >= 2 * QUESTIONS_PER_SECTION, s.title));
  assert.ok(EXAM_QUESTIONS.filter((q) => q.widget).length / EXAM_QUESTIONS.length >= 0.4);
});

const widgetsOf = <T extends string>(type: T) => EXAM_QUESTIONS.filter((q) => q.widget?.type === type);

test('sözleşme: okumadan imza anahtar, okuyup imzalamamak sağduyu; tuzak gerçek bir madde', () => {
  assert.equal(contractOption(false, true), 0);
  assert.equal(contractOption(true, true), 1);
  assert.equal(contractOption(true, false), 2);
  assert.equal(contractOption(false, false), 3);
  const qs = widgetsOf('contract');
  assert.ok(qs.length >= 3);
  for (const q of qs) {
    if (q.widget?.type !== 'contract') continue;
    assert.ok(q.widget.trap < q.widget.clauses.length, q.id);
    assert.equal(q.answer, 0, q.id);
    assert.equal(q.sensible, 2, q.id);
  }
});

test('kart kaydırma: gerçek hakları seçen sağduyuya, süsleri seçen anahtara yakın', () => {
  for (const q of widgetsOf('swipe')) {
    if (q.widget?.type !== 'swipe') continue;
    const cards = q.widget.cards;
    const real = new Set(cards.flatMap((c, i) => (c.real ? [i] : [])));
    const fake = new Set(cards.flatMap((c, i) => (c.real ? [] : [i])));
    assert.ok(real.size > 0 && fake.size > 0, q.id);
    assert.equal(swipeOption(cards, real), q.sensible, q.id);
    assert.equal(swipeOption(cards, new Set()), 3);
    assert.equal(swipeOption(cards, new Set(cards.map((_, i) => i))), 1);
    assert.equal(swipeOption(cards, fake), 2);
  }
});

test('şifre: kurallar sırayla tutar, örnek bir şifre hepsini geçer', () => {
  const q = widgetsOf('password')[0];
  if (q?.widget?.type !== 'password') return assert.fail('şifre sorusu yok');
  const rules = q.widget.rules;
  assert.ok(!passwordRuleOk(rules[0], 'kısa'));
  const good = 'SinerjiPazartesi1967';
  assert.ok(rules.every((r) => passwordRuleOk(r, good)));
  // Türkçe büyük harf de sayılır: "İ" ve "Ş"
  assert.ok(passwordRuleOk({ text: '', upper: true }, 'şİfre'));
  assert.equal(passwordOption('submit', rules, good), q.answer);
  assert.equal(passwordOption('submit', rules, 'abc'), 2);
  assert.equal(passwordOption('ticket', rules, ''), q.sensible);
  assert.equal(passwordOption('postit', rules, good), 3);
});

test('bilgisayarı kapatmak: sonuna kadar giden sağduyu, ilk uyarıda dönen anahtar', () => {
  const q = widgetsOf('shutdown')[0];
  if (q?.widget?.type !== 'shutdown') return assert.fail('kapatma sorusu yok');
  const n = q.widget.dialogs.length;
  assert.equal(shutdownOption(n, n), q.sensible);
  assert.equal(shutdownOption(0, n), q.answer);
  assert.equal(shutdownOption(2, n), 2);
  assert.equal(shutdownOption(0, n, true), 3);
});

test('asansör ve bütçe: sessizlik geçerli bir şık, bütçede en büyük pay kalemin sırası, eşitlik son şık', () => {
  for (const q of widgetsOf('elevator')) if (q.widget?.type === 'elevator') assert.ok(q.widget.silent < q.options.length && q.widget.floors > 2, q.id);
  assert.equal(budgetOption([60, 30, 10]), 0);
  assert.equal(budgetOption([10, 20, 70]), 2);
  assert.equal(budgetOption([40, 40, 20]), 3);
  for (const q of widgetsOf('budget')) if (q.widget?.type === 'budget') assert.equal(q.options.length, q.widget.lines.length + 1, q.id);
});

test('robot bulmacaları: doğru cevap geçer, boş ve yanlış geçmez', () => {
  for (const p of ROBOT_PUZZLES) {
    const right = p.kind === 'text' ? `  ${p.accept[0].toLocaleUpperCase('tr-TR')} ` : p.kind === 'slider' ? 100 : p.answer;
    const wrong = p.kind === 'text' ? 'robot' : p.kind === 'slider' ? 10 : (p.answer + 1) % p.options.length;
    assert.ok(puzzleSolved(p, right), p.id);
    assert.ok(!puzzleSolved(p, wrong), p.id);
    assert.ok(!puzzleSolved(p, null), p.id);
  }
});

test('rapor gözlemleri: adayın kendi cevaplarından, en çok bir sağduyu satırı', () => {
  const exam = pickExam();
  const qs = exam.flatMap((s) => s.questions);
  const keyOnly = highlightsOf(qs, qs.map((q) => q.answer));
  assert.equal(keyOnly.length, 3);
  assert.ok(keyOnly.every((h) => h.tone === 'key'));
  const mixed = highlightsOf(qs, qs.map((q, i) => (i % 2 ? q.sensible : q.answer)));
  assert.equal(mixed.filter((h) => h.tone === 'sense').length, 1);
  assert.equal(highlightsOf(qs, qs.map(() => null)).length, 0);
});
