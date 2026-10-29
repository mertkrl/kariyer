import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CUSTOMERS, CLOSE_HOUR, DEBT_DAYS, forget, type Debt, EVENT_POOL, OPEN_HOUR, PRODUCTS, VILLAGERS, basketOn, ceilingOf, customersFor, dayVisits, effectiveType, eventOn, factorOn, greetingFor, hikesOn, hourOf, priceOn, react, remember, sayItems, settleDebts, titleFor, weatherOn } from '../src/games/bakkal/data';

const DAYS = 20;
const pazar = EVENT_POOL.find((e) => e.title === 'Pazar günü')!;
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
  assert.ok(customersFor(60, undefined, 'rain') < customersFor(60, undefined, 'sunny'));
  assert.ok(customersFor(60, pazar, 'sunny') > customersFor(60, undefined, 'sunny'));
  // aynı köylü aynı gün iki kez gelmez; en kalabalık gün bile köye sığar
  for (let seed = 0; seed < 30; seed++)
    for (let d = 1; d <= DAYS; d++) {
      const ids = dayVisits(seed, d, 100).map((v) => v.villager.id);
      assert.equal(new Set(ids).size, ids.length);
    }
  assert.ok(VILLAGERS.length >= customersFor(100, pazar, 'sunny'));
});

test('fiyatlar her gün artar, her ürünün zammı başka; maliyet hep market fiyatının altında', () => {
  for (const p of PRODUCTS)
    for (let d = 2; d <= 60; d++) {
      assert.ok(factorOn(p, d) >= factorOn(p, d - 1), `${p.id} ${d}`);
      const x = priceOn(p, d);
      assert.ok(x.cost < x.market, `${p.id} ${d}`);
    }
  assert.deepEqual(priceOn(PRODUCTS[0], 1), { market: PRODUCTS[0].market, cost: PRODUCTS[0].cost });
  // otuzuncu günde ürünlerin pahalanma oranları birbirinden farklı
  const rates = new Set(PRODUCTS.map((p) => factorOn(p, 30).toFixed(2)));
  assert.ok(rates.size >= 6);
  // zam sıçraması radyoda bir gün önce duyulur
  const cay = PRODUCTS.find((p) => p.id === 'cay')!;
  assert.ok(hikesOn(cay.first!).includes(cay));
  assert.ok(factorOn(cay, cay.first!) > factorOn(cay, cay.first! - 1) * 1.1);
});

test('unvanlar dayanılan gün ve itibara göre', () => {
  assert.equal(titleFor(40, 20).title, 'Köyün Kurdu');
  assert.equal(titleFor(3, 80).title, 'Çırak Bakkal');
  assert.equal(titleFor(35, 80).title, 'Efsane Bakkal');
});

test('her günün bir olayı ve havası var; ilk gün güneşli', () => {
  for (let d = 1; d <= DAYS; d++) assert.ok(eventOn(3, d).title, `gün ${d}`);
  assert.equal(eventOn(3, 1).title, 'Kepenk açılışı');
  assert.deepEqual(eventOn(3, 9), eventOn(3, 9));
  assert.equal(weatherOn(3, 1), 'sunny');
  assert.equal(weatherOn(3, 4), weatherOn(3, 4));
});

test('köylüler hatırlar: kazık tavanı düşürür, sevinç biraz yükseltir; turist unutur', () => {
  const teyze = CUSTOMERS.find((c) => c.id === 'teyze')!;
  let m = remember({}, 'ayse', 'leave');
  m = remember(m, 'ayse', 'grumble');
  assert.deepEqual(m.ayse, { visits: 2, grudge: 3, happy: 0 });
  assert.ok(effectiveType(teyze, undefined, m.ayse).ceiling < teyze.ceiling);
  assert.ok(effectiveType(teyze, undefined, { visits: 3, grudge: 0, happy: 3 }).ceiling > teyze.ceiling);
  assert.ok(effectiveType(teyze, EVENT_POOL[3], { visits: 9, grudge: 9, happy: 0 }).ceiling >= 1.02);
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

test('veresiye: aynı gün ödenmez, vadesinde çoğu zaman ödenir, ödenmeyen batar', () => {
  const debts = [
    { who: 'ayse', name: 'Ayşe Teyze', amount: 50, cost: 35, day: 2 },
    { who: 'ali', name: 'Küçük Ali', amount: 20, cost: 13, day: 1, paid: 1 },
  ];
  assert.deepEqual(settleDebts(debts, 1, 2), debts);
  // bir hafta boyunca her akşam zar atılır
  const week = (who: string, seed: number) => {
    let d = [{ who, name: who, amount: 50, cost: 35, day: 1 }] as Debt[];
    for (let day = 2; day <= 1 + DEBT_DAYS; day++) d = settleDebts(d, seed, day);
    return d[0];
  };
  let paid = 0;
  let murat = 0;
  for (let seed = 0; seed < 100; seed++) {
    const a = week('ayse', seed);
    assert.ok(a.paid || a.lost, 'vade sonunda borç ya ödenmiş ya batmış olur');
    if (a.paid) paid++;
    if (week('murat', seed).paid) murat++;
  }
  assert.ok(paid > 80, `Ayşe Teyze çoğu zaman öder (${paid}/100)`);
  assert.ok(murat < 75 && murat > 30, `Motorcu Murat'ın borcu sık batar (${murat}/100)`);
  assert.equal(settleDebts([{ who: 'ayse', name: 'A', amount: 5, cost: 3, day: 1, lost: 8 }], 1, 9)[0].paid, undefined);
});

test('saat açılıştan kapanışa ilerler, akşam kararır', () => {
  assert.equal(hourOf(0, 8), OPEN_HOUR);
  assert.ok(hourOf(7, 8) < CLOSE_HOUR);
  assert.ok(darknessAt(20, 'sunny') > darknessAt(13, 'sunny'));
  assert.ok(darknessAt(13, 'rain') > darknessAt(13, 'sunny'));
  assert.notDeepEqual(skyAt(9, 'sunny'), skyAt(18, 'sunny'));
  skyAt(30, 'snow').forEach((c) => assert.match(c, /^#[0-9a-f]{6}$/));
});

test('sevinç bir kini sildirir', () => {
  let m = remember({}, 'ayse', 'grumble');
  m = remember(m, 'ayse', 'happy');
  assert.equal(m.ayse.grudge, 0);
});

test('market fiyatına yakın söylenme itibar yakmaz, kin bırakmaz; köy gece biraz unutur', () => {
  const r = react(101, 100, { ceiling: 1.5, gossip: 1 });
  assert.equal(r.mood, 'grumble');
  assert.equal(r.rep, 0);
  assert.equal(remember({}, 'ayse', 'grumble', r.mild).ayse.grudge, 0);
  assert.ok(react(148, 100, { ceiling: 1.5, gossip: 1 }).rep < 0);
  assert.equal(forget(90), 87);
  assert.equal(forget(59), 60);
  assert.equal(forget(60), 60);
});
