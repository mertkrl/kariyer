import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CUSTOMERS, CLOSE_HOUR, DAYS, EVENTS, HIKE_DAY, OPEN_HOUR, PRODUCTS, VILLAGERS, basketOn, ceilingOf, customersFor, dayVisits, effectiveType, greetingFor, hourOf, knownRange, priceOn, react, remember, sayItems, settleDebts, titleFor, weatherOn } from '../src/games/bakkal/data';
import { darknessAt, skyAt } from '../src/games/bakkal/sky';

const teyze = CUSTOMERS.find((c) => c.id === 'teyze')!;
const muhtar = CUSTOMERS.find((c) => c.id === 'muhtar')!;

test('her ürünün maliyeti market fiyatının altında', () => {
  PRODUCTS.forEach((p) => assert.ok(p.cost < p.market, p.id));
  assert.equal(new Set(PRODUCTS.map((p) => p.id)).size, PRODUCTS.length);
});

test('market fiyatına kadar sevinir, tavana kadar söylenir, sonra pazarlık eder, ikincide gider', () => {
  assert.equal(react(50, 50, teyze).mood, 'happy');
  assert.equal(react(30, 50, teyze).mood, 'happy');
  assert.equal(react(55, 50, teyze).mood, 'grumble');
  assert.equal(react(55, 50, teyze).sold, 55);
  const c = react(80, 50, teyze);
  assert.equal(c.mood, 'counter');
  assert.equal(react(80, 50, teyze, true).mood, 'leave');
  // muhtarın tavanı daha yüksek
  assert.equal(react(70, 50, muhtar).mood, 'grumble');
});

test('karşı teklif market ile tavan arasında kalır ve kabul edilince satılır', () => {
  for (const cust of CUSTOMERS)
    for (const p of PRODUCTS) {
      const r = react(p.market * 3, p.market, cust);
      assert.equal(r.mood, 'counter');
      assert.ok(r.offer! <= ceilingOf(p.market, cust), `${cust.id} ${p.id}`);
      assert.ok(react(r.offer!, p.market, cust, true).sold !== undefined);
    }
});

test('itibar müşteri sayısını belirler, günler tohumdan tekrarlanır', () => {
  assert.ok(customersFor(90) > customersFor(20));
  assert.deepEqual(dayVisits(42, 2, 60), dayVisits(42, 2, 60));
  dayVisits(7, 1, 60).forEach((v) => {
    if (v.customer.wants) v.items.forEach((p) => assert.ok(v.customer.wants!.includes(p.id)));
    assert.ok(v.items.length >= 1 && v.items.length <= 3);
    assert.equal(new Set(v.items).size, v.items.length);
    if (v.credit) assert.ok(v.villager.pays > 0);
  });
  // kötü hava kalabalığı azaltır, pazar günü artırır
  assert.ok(customersFor(60, 1, 'rain') < customersFor(60, 1, 'sunny'));
  assert.ok(customersFor(60, 5, 'sunny') > customersFor(60, 1, 'sunny'));
  // aynı köylü aynı gün iki kez gelmez; en kalabalık gün bile köye sığar
  for (let seed = 0; seed < 30; seed++)
    for (let d = 1; d <= DAYS; d++) {
      const ids = dayVisits(seed, d, 100).map((v) => v.villager.id);
      assert.equal(new Set(ids).size, ids.length);
    }
  assert.ok(VILLAGERS.length >= customersFor(100, 5, 'sunny'));
});

test('zamdan sonra fiyatlar artar, defter eski kayıtları saymaz', () => {
  const p = PRODUCTS[0];
  assert.ok(priceOn(p, HIKE_DAY).market > priceOn(p, 1).market);
  const log = [
    { product: p.id, day: 1, price: 14, mood: 'happy' as const, customer: 'x' },
    { product: p.id, day: HIKE_DAY, price: 16, mood: 'happy' as const, customer: 'x' },
    { product: p.id, day: HIKE_DAY, price: 20, mood: 'grumble' as const, customer: 'x' },
  ];
  assert.deepEqual(knownRange(log.slice(0, 1), p.id, 1), { atLeast: 14, below: undefined });
  assert.deepEqual(knownRange(log, p.id, HIKE_DAY), { atLeast: 16, below: 20 });
});

test('unvanlar kâr ve itibara göre', () => {
  assert.equal(titleFor(2000, 20).title, 'Köyün Kurdu');
  assert.equal(titleFor(-50, 80).title, 'Hayırsever Bakkal');
  assert.equal(titleFor(800, 80).title, 'Efsane Bakkal');
});

test('her günün bir olayı ve havası var; ilk gün güneşli', () => {
  for (let d = 1; d <= DAYS; d++) assert.ok(EVENTS[d]?.title, `gün ${d}`);
  assert.equal(weatherOn(3, 1), 'sunny');
  assert.equal(weatherOn(3, 4), weatherOn(3, 4));
});

test('köylüler hatırlar: kazık tavanı düşürür, sevinç biraz yükseltir; turist unutur', () => {
  const teyze = CUSTOMERS.find((c) => c.id === 'teyze')!;
  let m = remember({}, 'ayse', 'leave');
  m = remember(m, 'ayse', 'grumble');
  assert.deepEqual(m.ayse, { visits: 2, grudge: 3, happy: 0 });
  assert.ok(effectiveType(teyze, 1, m.ayse).ceiling < teyze.ceiling);
  assert.ok(effectiveType(teyze, 1, { visits: 3, grudge: 0, happy: 3 }).ceiling > teyze.ceiling);
  assert.ok(effectiveType(teyze, 4, { visits: 9, grudge: 9, happy: 0 }).ceiling >= 1.02);
  assert.deepEqual(remember({}, 'turist', 'leave'), {});
  const ayse = VILLAGERS.find((v) => v.id === 'ayse')!;
  assert.match(greetingFor(ayse, m.ayse), /kazıkladın/);
  assert.match(greetingFor(ayse, { visits: 1, grudge: 0, happy: 1 }), /iyi/);
});

test('sepet toplamı ve konuşma', () => {
  const [a, b, c] = PRODUCTS;
  assert.deepEqual(basketOn([a, b], 1), { market: a.market + b.market, cost: a.cost + b.cost });
  assert.equal(sayItems([a]), 'bir ekmek');
  assert.equal(sayItems([a, b, c]), 'bir ekmek, bir süt bir de yumurta');
});

test('veresiye: aynı gün ödenmez, sonra ödenebilir, ödenen değişmez', () => {
  const debts = [
    { who: 'ayse', name: 'Ayşe Teyze', amount: 50, cost: 35, day: 2 },
    { who: 'ali', name: 'Küçük Ali', amount: 20, cost: 13, day: 1, paid: 1 },
  ];
  assert.deepEqual(settleDebts(debts, 1, 2), debts);
  let paid = 0;
  for (let seed = 0; seed < 50; seed++) if (settleDebts(debts, seed, 3)[0].paid === 3) paid++;
  assert.ok(paid > 35, `Ayşe Teyze çoğu zaman öder (${paid}/50)`);
});

test('saat açılıştan kapanışa ilerler, akşam kararır', () => {
  assert.equal(hourOf(0, 8), OPEN_HOUR);
  assert.ok(hourOf(7, 8) < CLOSE_HOUR);
  assert.ok(darknessAt(20, 'sunny') > darknessAt(13, 'sunny'));
  assert.ok(darknessAt(13, 'rain') > darknessAt(13, 'sunny'));
  assert.notDeepEqual(skyAt(9, 'sunny'), skyAt(18, 'sunny'));
  skyAt(30, 'snow').forEach((c) => assert.match(c, /^#[0-9a-f]{6}$/));
});
