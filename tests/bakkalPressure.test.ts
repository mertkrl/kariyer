import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CUSTOMERS, PRODUCTS, RIVAL_DAY, awayOf, fairOn, priceOn, customersFor, dayVisits, effectiveType, loyalOf, react } from '../src/games/bakkal/data';
import { SHELF_SLOTS, STAPLE_CAP, addRep, applySupply, auditDay, befriend, canStock, firmOf, kindsOf, rivalOf, settleAudit, spreadGossip, sulk, supplyOn } from '../src/games/bakkal/pressure';
import { expensesOn, weekDay } from '../src/games/bakkal/week';

const teyze = CUSTOMERS.find((c) => c.id === 'teyze')!;
const ekmek = PRODUCTS.find((p) => p.id === 'ekmek')!;
const cips = PRODUCTS.find((p) => p.id === 'cips')!;

test('itibar: 80 üstünde artış yarıya iner, market fiyatında satış itibar getirmez', () => {
  assert.equal(addRep(60, 2), 62);
  assert.equal(addRep(85, 2), 86);
  assert.equal(addRep(85, 1), 85);
  assert.equal(addRep(85, -3), 82);
  assert.equal(react(100, 100, teyze).rep, 0);
  assert.ok(react(90, 100, teyze).rep > 0);
});

test('kazık kahvede konuşulur: iki köylü duyar ve kin tutar', () => {
  const { memories, told } = spreadGossip({}, 'ayse', 1, 3);
  assert.equal(told.length, 2);
  assert.equal(Object.values(memories).filter((m) => m.heard && m.grudge === 1).length, 2);
  assert.equal(memories.ayse, undefined);
});

test('temel gıdada köylü fiyatı bilir: tavan dar, zincir marketten sonra daha dar; pazarlık etmeden gider', () => {
  assert.ok(rivalOf(teyze, RIVAL_DAY - 1, [ekmek]).ceiling <= STAPLE_CAP);
  assert.ok(rivalOf(teyze, RIVAL_DAY, [ekmek]).ceiling < rivalOf(teyze, RIVAL_DAY - 1, [ekmek]).ceiling);
  assert.equal(rivalOf(teyze, RIVAL_DAY, [cips]).ceiling, teyze.ceiling);
  assert.ok(firmOf([ekmek]) && firmOf([ekmek, cips]) && !firmOf([cips]));
  assert.equal(react(130, 100, { ceiling: 1.06, gossip: 1 }, false, true).mood, 'leave');
  assert.equal(react(130, 100, { ceiling: 1.2, gossip: 1 }, false, false).mood, 'counter');
  // temel gıda dışı malda köylü biraz fazlasını olağan sayar
  assert.ok(fairOn(cips, 1) > priceOn(cips, 1).market);
  assert.equal(fairOn(ekmek, 1), priceOn(ekmek, 1).market);
  assert.ok(customersFor(60, undefined, 'sunny', RIVAL_DAY) < customersFor(60, undefined, 'sunny', 1));
  assert.ok(customersFor(60, undefined, 'sunny', 5, true) < customersFor(60, undefined, 'sunny', 5, false));
});

test('toptancı bazen gelmez ya da yarısını getirir; ekmek hep gelir', () => {
  const kinds = new Set(Array.from({ length: 200 }, (_, s) => supplyOn(s, 8)));
  assert.deepEqual([...kinds].sort(), ['absent', 'ok', 'partial']);
  assert.deepEqual(applySupply({ ekmek: 12, sut: 5 }, 'absent'), { ekmek: 12, sut: 0 });
  assert.deepEqual(applySupply({ ekmek: 12, sut: 5 }, 'partial'), { ekmek: 12, sut: 2 });
  assert.equal(supplyOn(1, 2), 'ok');
});

test('raf gözü dolunca tükenen mal geri getirilemez', () => {
  const full = Object.fromEntries(PRODUCTS.filter((p) => !['ekmek', 'kasarli', 'sucuklu', 'karisik', 'peynirli', 'salamli', 'tonlu', 'tavuklu'].includes(p.id)).slice(0, SHELF_SLOTS).map((p) => [p.id, 1]));
  assert.equal(kindsOf(full), SHELF_SLOTS);
  const missing = PRODUCTS.find((p) => !(p.id in full) && p.id !== 'ekmek' && !['kasarli', 'sucuklu', 'karisik', 'peynirli', 'salamli', 'tonlu', 'tavuklu'].includes(p.id))!;
  assert.equal(canStock(missing.id, full, {}), false);
  assert.equal(canStock(Object.keys(full)[0], full, {}), true);
  assert.equal(canStock('ekmek', full, {}), true);
});

test('vergi memuru her oyunda bir kez gelir; kayıt dışı para cezası iki katı', () => {
  const d = auditDay(7);
  assert.ok(d >= 12 && d <= 25);
  assert.ok(weekDay([], d, { seed: 7 }).some((v) => v.audit));
  assert.equal(settleAudit(0).cash, 0);
  assert.equal(settleAudit(100).cash, -650);
});

test('veresiye: yazılmayan bir hafta küser, ödeyen sadık olur ve her gün gelir', () => {
  const m = sulk({}, 'ayse', 4);
  assert.ok(awayOf(m, 5).includes('ayse'));
  assert.ok(!awayOf(m, 11).includes('ayse'));
  const f = befriend({}, 'fatma');
  assert.deepEqual(loyalOf(f), ['fatma']);
  assert.ok(effectiveType(teyze, undefined, f.fatma).ceiling > teyze.ceiling);
  for (let seed = 0; seed < 10; seed++) assert.ok(dayVisits(seed, 5, 40, 'sunny', [], ['fatma']).some((v) => v.villager.id === 'fatma'));
});

test('giderler: haftalık kira ve ayın ortasında aidat', () => {
  assert.ok(expensesOn(14).tax > 0);
  assert.ok(expensesOn(15).tax > 0);
  assert.equal(expensesOn(16).tax, 0);
});
