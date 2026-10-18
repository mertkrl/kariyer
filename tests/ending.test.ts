import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getEnding, type EndingContext } from '../src/game/engine/ending';
import type { OfferOutcome } from '../src/game/events/offer';
import { ACHIEVEMENTS, loadUnlocked, unlockAchievements, type AchievementInput } from '../src/game/engine/achievements';

const ctx = (over: Partial<EndingContext> = {}): EndingContext => ({ refusals: 0, hireFit: 3, aiUses: 0, weekendChoice: null, difficulty: 'normal', ...over });

test('sonu Hakan Bey\'in teklifine verilen cevap belirler, puanlar değil', () => {
  const at = (outcome: OfferOutcome) => getEnding(60, 60, ctx({ offer: { outcome, vicdan: 0 } }));
  assert.match(at('quit').title, /İstifa/);
  assert.equal(at('quit').left, true);
  assert.match(at('gaveToAyse').title, /Ayşe/);
  assert.equal(at('gaveToAyse').left, true);
  assert.match(at('reformRefused').title, /Şartını koydun/);
  assert.match(at('stayAfterRefusal').title, /çekmece/);
  assert.equal(at('stay').left, undefined);
  assert.match(getEnding(60, 60, ctx({ offer: { outcome: 'stayReform', reform: 'blind', vicdan: 3 } })).body, /isimler, yaşlar/);
  // aynı puanlar, altı farklı hafta: cevap karar verir
  const titles = new Set((['stay', 'stayReform', 'stayAfterRefusal', 'reformRefused', 'gaveToAyse', 'quit'] as OfferOutcome[]).map((o) => at(o).title));
  assert.equal(titles.size, 6);
});

test('çok yüksek vicdan tek başına istifa ettirmez: istifa bir karardır', () => {
  assert.doesNotMatch(getEnding(50, 95, ctx({ refusals: 4 })).title, /İstifa/);
});

test('annene söylediğin son söz sonun son cümlesi olur', () => {
  const stay = { outcome: 'stay' as const, vicdan: 0 };
  assert.match(getEnding(60, 60, ctx({ offer: stay, weekendChoice: 'quit' })).body, /iş değiştirmeyi düşündüğünü/);
  assert.match(getEnding(60, 60, ctx({ offer: { outcome: 'quit', vicdan: 2 }, weekendChoice: 'search' })).body, /insan tarafından değerlendirilir/);
  assert.match(getEnding(60, 60, ctx({ offer: stay, weekendChoice: 'breakfast' })).body, /menemen/);
});

test('yüksek performans düşük vicdanla terfi değil, sistemin sonu olur', () => {
  assert.match(getEnding(90, 10, ctx({ hireFit: 5 })).title, /sistemin mükemmel/);
  assert.match(getEnding(90, 50, ctx({ hireFit: 5 })).title, /Terfi/);
});

test('düşük performans işten çıkarılmayla biter', () => {
  assert.equal(getEnding(30, 70, ctx()).left, true);
  assert.equal(getEnding(30, 20, ctx()).left, true);
});

test('bütün puan aralığında bir son vardır', () => {
  for (let p = 0; p <= 100; p += 5) for (let v = 0; v <= 100; v += 5) assert.ok(getEnding(p, v, ctx()).title.length > 0);
});

const input = (over: Partial<AchievementInput> = {}): AchievementInput => ({
  performans: 50, vicdan: 50, aiUses: 1, refusals: 1, complies: 0, undecided: 1, reviewed: 10, avgSeconds: 30, hireFit: 3,
  momMessages: 2, momAnswered: 0, difficulty: 'normal', weekendChoice: null, finalists: 5, events: 0, dmHonest: 0, tested: 0, invitedBelowStrong: 0, selfScore: null, cutoff: 70, ...over,
});

test('başarım kimlikleri benzersiz', () => {
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, ACHIEVEMENTS.length);
});

test('başarımlar kaydedilir, ikinci kez "yeni" sayılmaz', () => {
  localStorage.clear();
  const first = unlockAchievements(input({ aiUses: 0, refusals: 3 }));
  assert.deepEqual(first.fresh.sort(), ['human', 'spine']);
  const again = unlockAchievements(input({ aiUses: 0 }));
  assert.deepEqual(again.fresh, []);
  assert.ok(loadUnlocked().has('spine'));
});

test('bozuk başarım kaydı oyunu durdurmaz', () => {
  localStorage.setItem('kariyerweb-achievements', '{bozuk');
  assert.equal(loadUnlocked().size, 0);
});

test('rozet kaydı bozuk ya da elle değiştirilmişse yalnızca bilinen rozetler okunur', () => {
  localStorage.setItem('kariyerweb-achievements', JSON.stringify(['spine', 'uydurma', 42, null]));
  assert.deepEqual([...loadUnlocked()], ['spine']);
  localStorage.setItem('kariyerweb-achievements', '"spine"');
  assert.equal(loadUnlocked().size, 0);
  localStorage.setItem('kariyerweb-achievements', '{bozuk');
  assert.equal(loadUnlocked().size, 0);
  localStorage.removeItem('kariyerweb-achievements');
});
