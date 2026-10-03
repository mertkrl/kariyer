import { test } from 'node:test';
import assert from 'node:assert/strict';
import { candidateDetails } from '../src/game/data/candidateDetails';
import { candidates } from '../src/game/data/candidates';
import { SALARY_CAP, panelDecision, salaryOf } from '../src/game/managerCalls';
import { CODE_CASES, caseAnswer, caseFor, defenseHolds, hooksIn, salaryMoves, salaryTalk, scoreGap, sentencesOf, tagNote } from '../src/game/interview';

const ids = Object.keys(candidateDetails);

test('cevapların çoğunda üzerine sorulacak bir ifade bulunur, ifadeler cevabın içindedir', () => {
  let answers = 0;
  let withHook = 0;
  for (const id of ids)
    for (const a of candidateDetails[id].interview) {
      answers++;
      const hooks = hooksIn(a);
      // with the question's own kind as fallback, every answer has something to ask about
      assert.ok(hooksIn(a, 0).length >= 1, `${id}: ${a}`);
      if (hooks.length) withHook++;
      assert.ok(hooks.length <= 2);
      for (const h of hooks) assert.ok(h.start >= 0 && h.end <= a.length && h.end > h.start, `${id}: ${a}`);
      // no two hooks overlap
      for (let i = 1; i < hooks.length; i++) assert.ok(hooks[i].start >= hooks[i - 1].end);
    }
  assert.ok(withHook / answers > 0.8, `yalnızca ${withHook}/${answers} cevapta ifade var`);
});

test('cümlelere bölme cevabı kaybetmez; notların etiketi anlamına uyar', () => {
  for (const id of ids)
    for (const a of candidateDetails[id].interview) assert.equal(sentencesOf(a).map((s) => s.text).join(''), a);
  assert.equal(tagNote('6 haftalık döngüyü 2 haftaya indirdik.'), 'concrete');
  // a decimal point is not the end of a sentence
  assert.deepEqual(sentencesOf('Toplam "12.50" oldu. Sonra 1,2 saniyeye indi.').map((x) => x.text.trim()), ['Toplam "12.50" oldu.', 'Sonra 1,2 saniyeye indi.']);
  // "the error count halved" is an achievement, not a mistake to dig into
  assert.ok(!hooksIn('Üretimdeki hata sayısı yarıya düştü.').some((h) => h.kind === 1));
  assert.equal(tagNote('Payım mı? Hepsi.'), 'redflag');
  assert.equal(tagNote('Ama inanın çok etkiliydi.'), 'vague');
  assert.equal(tagNote('Ay sonu kapanışı üç günden yarım güne indi.'), 'concrete');
});

test('mini vaka: aynı gün iki aday aynı vakayı almaz, her adayın bir çözümü var', () => {
  const day = ids.slice(0, 3);
  assert.equal(new Set(day.map((id) => caseFor(id, day).title)).size, 3);
  for (const id of ids) for (const c of CODE_CASES) assert.ok(caseAnswer(id, c).length > 10);
});

test('maaş: bütçeyi aşan güçlü aday büyük indirimi reddeder, zayıf olan kabul eder', () => {
  const over = ids.filter((id) => (salaryOf(id) ?? 0) > SALARY_CAP);
  assert.ok(over.length > 0, 'bütçeyi aşan aday yok');
  for (const id of over) {
    assert.deepEqual(salaryMoves(id), ['cap', 'low', 'pass']);
    const low = salaryTalk(id, 'low');
    if (low.agreed !== null) assert.ok(low.agreed < SALARY_CAP);
  }
  const fit = (id: string) => candidateDetails[id].hireFit;
  const strongOver = over.filter((id) => fit(id) >= 5);
  for (const id of strongOver) assert.equal(salaryTalk(id, 'low').agreed, null, id);
  const under = ids.find((id) => (salaryOf(id) ?? Infinity) <= SALARY_CAP)!;
  assert.deepEqual(salaryMoves(under), ['match', 'squeeze']);
  assert.equal(salaryTalk(under, 'match').agreed, salaryOf(under));
});

test('kurul anlaşılan maaşı hesaba katar; ikna edilen ekip lideri önerine oy verir', () => {
  const over = ids.find((id) => (salaryOf(id) ?? 0) > SALARY_CAP && candidateDetails[id].hireFit >= 4)!;
  const other = ids.find((id) => id !== over && (salaryOf(id) ?? Infinity) <= SALARY_CAP && candidateDetails[id].hireFit >= 4)!;
  const pool = [over, other].map((id) => ({ id, day: 1 }));
  assert.equal(panelDecision(over, pool, []).overBudget, true);
  assert.equal(panelDecision(over, pool, [], { agreed: { [over]: SALARY_CAP } }).overBudget, false);
  const weaker = ids.find((id) => candidateDetails[id].hireFit === 3 && (salaryOf(id) ?? 0) <= SALARY_CAP)!;
  const room = [weaker, other].map((id) => ({ id, day: 1 }));
  assert.equal(panelDecision(weaker, room, []).lead, other);
  assert.equal(panelDecision(weaker, room, [], { convinced: true }).lead, weaker);
});

test('savunma: somut notlar ikna eder, belirsizler etmez; zayıf aday savunulamaz', () => {
  const ok = ids.find((id) => candidateDetails[id].hireFit >= 4)!;
  assert.equal(defenseHolds(ok, ['concrete', 'general'], false).holds, true);
  assert.equal(defenseHolds(ok, ['vague', 'general'], false).holds, false);
  const weak = ids.find((id) => candidateDetails[id].hireFit <= 2)!;
  assert.equal(defenseHolds(weak, ['concrete', 'concrete'], true).holds, false);
});

test('puan kartı: Hakan Bey\'in hedeflerine belirgin düşük puan fark edilir', () => {
  const scores = { a: { 'Teknik yetkinlik': 2, İletişim: 2 }, b: { 'Teknik yetkinlik': 4, İletişim: 5 }, c: { 'Teknik yetkinlik': 4 } };
  assert.equal(scoreGap(scores, (id) => id === 'a'), 2.3);
  assert.equal(scoreGap(scores, (id) => id === 'b'), null);
  assert.ok(Object.keys(candidates).length > 0);
});
