import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DAILY_ROUNDS, dailyShare, dayNumber, makeDaily, nextStreak } from '../src/games/cuzdan/daily';
import { ALL_YEARS, CPI, ERA_ITEMS, EVENTS, ITEMS, LIMITS, NOW, YEARS } from '../src/games/cuzdan/data';
import {
  salaryPersona,
  salaryTable,
  walletOf,
  GUESS_ROUNDS,
  QUICK_ROUNDS,
  basketCost,
  cheaperSide,
  cost,
  guessScore,
  makeCheaperRounds,
  makeGuessRounds,
  makeGuessRoundsFor,
  makeSameYearRounds,
  PERSONAS,
  START_YEAR,
  themeOf,
  money,
  niceRound,
  quickMax,
  quickPoints,
  sameMoneyToday,
  priceIn,
  sliderValue,
  successOf,
  realChange,
  cpiMultiple,
  vsInflation,
  titleFor,
  walletFor,
  workMinutes,
} from '../src/games/cuzdan/model';

test('her ürünün her yıl için fiyatı var ve fiyatlar zamanla düşmez', () => {
  for (const it of ITEMS) {
    for (const y of ALL_YEARS) assert.ok(it.prices[y] > 0, `${it.id} ${y}`);
    for (let i = 1; i < ALL_YEARS.length; i++) assert.ok(it.prices[ALL_YEARS[i]] >= it.prices[ALL_YEARS[i - 1]], it.id);
  }
});

test('para dönemine göre yazılır: eski lira, YTL, TL', () => {
  assert.equal(money(0.25, 2002), '250.000 TL');
  assert.equal(money(1.25, 2005), '1,25 YTL');
  assert.equal(money(4.5, 2012), '4,50 TL');
  assert.equal(money(6, 2002), '6.000.000 TL');
});

test('tahmin puanı oransaldır: tam isabet 100, 2,5 kat sapma 0', () => {
  assert.equal(guessScore(20, 20), 100);
  assert.equal(guessScore(50, 20), 0);
  assert.equal(guessScore(0, 20), 0);
  assert.equal(guessScore(40, 20), guessScore(10, 20));
});

test('geçmişi bil: cevap kaydırıcının içinde, uçlardan uzakta ve yuvarlanınca bulunabilir', () => {
  for (const seed of [1, 42, 777, 9001]) {
    const rounds = makeGuessRounds(seed);
    assert.equal(rounds.length, GUESS_ROUNDS);
    assert.equal(new Set(rounds.map((r) => r.item.id)).size, GUESS_ROUNDS);
    for (const { item, year, lo, hi } of rounds) {
      const p = item.prices[year];
      assert.ok(lo < p / 3.9 && hi > p * 3.9);
      // kaydırıcının bir noktası cevaba tam isabet ettirir
      const t = Math.log(p / lo) / Math.log(hi / lo);
      assert.equal(guessScore(niceRound(sliderValue(t, lo, hi), year), p), 100, `${item.id} ${year}`);
    }
  }
  assert.deepEqual(makeGuessRounds(5), makeGuessRounds(5));
});

test('hangisi ucuz: fark belirgin, tekrarsız; tek turlar aynı yıl, çiftler farklı yıl', () => {
  for (const seed of [3, 99, 2024]) {
    const rounds = makeCheaperRounds(seed);
    assert.equal(rounds.length, QUICK_ROUNDS);
    rounds.forEach((r, i) => {
      assert.equal(r.kind, i % 2 === 0 ? 'same' : 'work');
      if (r.kind === 'same') assert.equal(r.a.year, r.b.year);
      else assert.notEqual(r.a.year, r.b.year);
      const [a, b] = [cost(r, r.a), cost(r, r.b)];
      assert.ok(Math.max(a, b) / Math.min(a, b) >= 1.35 && Math.max(a, b) / Math.min(a, b) <= 5);
      assert.equal(cheaperSide(r), a <= b ? 'a' : 'b');
    });
  }
});

test('seri bonusu 200 puanda durur; unvan puana göre değişir', () => {
  assert.equal(quickPoints(1), 100);
  assert.equal(quickPoints(3), 140);
  assert.equal(quickPoints(20), 200);
  assert.notEqual(titleFor('ucuz', 1).title, titleFor('ucuz', 0).title);
  // hızlı masada unvan seriye değil isabete bakar: 10'da 7 doğru, seri olmasa da iyi unvandır
  const log = Array.from({ length: QUICK_ROUNDS }, (_, i) => ({ score: i < 7 ? 100 : 0, ok: i < 7 }));
  assert.equal(successOf('ucuz', log, quickMax(QUICK_ROUNDS)), 0.7);
  assert.equal(successOf('gecmis', [{ score: 50 }, { score: 100 }], 200), 0.75);
});

test('cüzdan her yıl en az bir ürün alır, sepet ve dakika hesabı tutarlı', () => {
  for (const y of YEARS) assert.ok(walletFor(y) >= Math.min(...ITEMS.map((i) => i.prices[y])), String(y));
  assert.equal(basketCost({ ekmek: 2 }, 2002), 0.5);
  assert.ok(workMinutes(17.5, NOW) > 0);
  assert.deepEqual(sameMoneyToday(1), []);
});

test('Cüzdan TL: tema yılla değişir', () => {
  assert.equal(themeOf(2002), 'luna');
  assert.equal(themeOf(2005), 'luna');
  assert.equal(themeOf(2009), 'glass');
  assert.equal(themeOf(2012), 'glass');
  assert.equal(themeOf(2016), 'flat');
  assert.equal(themeOf(NOW), 'flat');
});

test('Cüzdan TL: saatin yılına bağlı turlar o yıldan gelir ve çözülebilir', () => {
  for (const y of YEARS) {
    const g = makeGuessRoundsFor(9, y);
    assert.equal(g.length, GUESS_ROUNDS);
    for (const r of g) assert.ok(r.year === y && r.lo < r.item.prices[y] && r.hi > r.item.prices[y]);
    const c = makeSameYearRounds(9, y);
    assert.equal(c.length, QUICK_ROUNDS, String(y));
    assert.equal(new Set(c.map((r) => [r.a.item.id, r.b.item.id].sort().join())).size, QUICK_ROUNDS);
    for (const r of c) {
      assert.ok(r.a.year === y && r.b.year === y);
      const ratio = Math.max(r.a.item.prices[y], r.b.item.prices[y]) / Math.min(r.a.item.prices[y], r.b.item.prices[y]);
      assert.ok(ratio >= 1.35 && ratio <= 8);
    }
  }
});

test('Cüzdan TL: her kişinin cüzdanı her yıl en az bir ürün alır', () => {
  for (const p of PERSONAS) for (const y of YEARS) assert.ok(walletFor(y, p.share) >= Math.min(...ITEMS.map((i) => i.prices[y])), `${p.id} ${y}`);
});

test('TÜFE karşılaştırması: enflasyondan hızlı ve yavaş artanlar ayırt edilir', () => {
  const altin = ITEMS.find((i) => i.id === 'altin')!;
  const ekmek = ITEMS.find((i) => i.id === 'ekmek')!;
  assert.ok(realChange(altin, 2002) > 1, 'altın enflasyondan hızlı');
  assert.ok(cpiMultiple(2002) > 40 && cpiMultiple(2002) < 70);
  assert.match(vsInflation(1.5), /%50 hızlı/);
  assert.match(vsInflation(0.5), /%50 yavaş/);
  assert.equal(vsInflation(1), 'enflasyonla aşağı yukarı aynı');
  assert.ok(realChange(ekmek, 2002) > 0);
});

test('Cüzdan TL: oyun altı sıfırın atıldığı yılda, YTL ile açılır', () => {
  assert.equal(START_YEAR, 2005);
  assert.ok(!money(1, START_YEAR).includes('000.000'));
  assert.match(money(1, START_YEAR), /YTL$/);
});

test('Günün Sepeti: aynı gün herkese aynı beş soru, dört farklı şık, biri doğru', () => {
  const day = dayNumber(new Date(2026, 9, 28));
  assert.equal(day, 28);
  assert.deepEqual(makeDaily(day), makeDaily(day));
  assert.notDeepEqual(makeDaily(day).map((r) => r.item.id), makeDaily(day + 1).map((r) => r.item.id));
  for (let d = 1; d <= 60; d++) {
    const rounds = makeDaily(d);
    assert.equal(rounds.length, DAILY_ROUNDS);
    assert.equal(new Set(rounds.map((r) => r.item.id)).size, DAILY_ROUNDS);
    for (const r of rounds) {
      assert.equal(r.options.length, 4, `gün ${d} ${r.item.id}`);
      assert.equal(new Set(r.options.map((o) => money(o, r.year))).size, 4);
      assert.ok(r.options.includes(r.answer));
    }
  }
});

test('Günün Sepeti: seri dün oynandıysa artar, ara verilince 1\'e döner; paylaşım metni kareli', () => {
  assert.equal(nextStreak(null, 10), 1);
  assert.equal(nextStreak({ day: 9, picks: [], streak: 4, last: 9 }, 10), 5);
  assert.equal(nextStreak({ day: 7, picks: [], streak: 4, last: 7 }, 10), 1);
  const rounds = makeDaily(3);
  const right = rounds.map((r) => r.options.indexOf(r.answer));
  assert.match(dailyShare(3, rounds, right), /#3 · 5\/5\n🟩🟩🟩🟩🟩/);
});

test('dönemin rafı: her yılın manşeti var; bugün satılmayanlar bugünkü tutara girmez', () => {
  for (const y of YEARS) assert.ok(EVENTS[y].headline && EVENTS[y].news.length >= 2, String(y));
  assert.equal(priceIn('maske', 2020), 12);
  assert.equal(priceIn('maske', 2005), null);
  assert.equal(priceIn('telkart', NOW), null);
  assert.equal(basketCost({ telkart: 1, ekmek: 2 }, 2002), 3.5);
  assert.equal(basketCost({ telkart: 1, ekmek: 2 }, NOW), 35);
  const ids = new Set([...ITEMS, ...ERA_ITEMS].map((i) => i.id));
  for (const l of Object.values(LIMITS)) for (const id of Object.keys(l ?? {})) assert.ok(ids.has(id), id);
  assert.ok(ERA_ITEMS.some((e) => e.prices[2020] !== undefined && e.tag === 'Salgın'), '2020 rafında salgın ürünleri');
});

test('senin maaşın: her yılda aynı alım gücü, bugün aynen kendisi', () => {
  const p = salaryPersona(45000);
  const table = salaryTable(45000);
  assert.equal(Math.round(table[table.length - 1].amount), 45000);
  for (const r of table) assert.ok(Math.abs(r.amount / CPI[r.year] - 45000 / CPI[NOW]) < 1e-9, String(r.year));
  assert.ok(walletOf(2002, p) < walletOf(2022, p));
  assert.equal(walletOf(2005, PERSONAS[0]), walletFor(2005, PERSONAS[0].share));
});
