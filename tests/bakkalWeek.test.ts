import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BASIC, CATEGORIES, FRIDGE, LOW_REP, MADE, PRODUCTS, VILLAGERS, characterOf, complains, dayVisits, haggleOffer, priceOn, settleDebts } from '../src/games/bakkal/data';

const DAYS = 12;
import { BOOK } from '../src/games/bakkal/pages';
import {
  LOAN,
  LOAN_DAY,
  OLD_DEBTS,
  START_STOCK,
  TAX_EVERY,
  accountsOn,
  billFor,
  GUM,
  GUM_PACK,
  GUM_PACK_COST,
  payment,
  settleChange,
  deliver,
  expensesOn,
  morning,
  orderCost,
  owedBy,
  settleAccount,
  settleDilemma,
  shortBy,
  spoil,
  split,
  take,
  weekDay,
  priceIndex,
  RETURN_DAY,
  SHELF_MAX,
  BREAD_MAX,
  CHARITY,
  ZABITA,
  charityDay,
  discard,
  fineFor,
  handOver,
  rot,
  bulkDiscount,
  bulkRate,
  priceTalk,
  madeCost,
} from '../src/games/bakkal/week';

test('eski veresiyelerin sahipleri köyde yaşar, defterde yazılıdır', () => {
  OLD_DEBTS.forEach((d) => d.who && assert.ok(VILLAGERS.some((v) => v.id === d.who), d.who));
  const written = BOOK.filter((p) => p.id.startsWith('veresiye')).flatMap((p) => p.written.map((w) => w.text));
  OLD_DEBTS.forEach((d) => assert.ok(written.some((t) => t.includes(d.what)), d.what));
  // Rıza'nın iki açık kalemi toplanır, çizilmiş satırlar sayılmaz
  assert.equal(owedBy('riza'), 785);
  assert.equal(owedBy('nazmiye'), 0);
});

test('her gün bir eski hesap gelir; borcu yoksa "borcu yok" doğrudur', () => {
  for (let d = 1; d <= 5; d++) assert.ok(accountsOn(d).length >= 1, `gün ${d}`);
  const check = accountsOn(2).find((a) => a.account.kind === 'check')!.account;
  assert.equal(settleAccount(check, 'X', 'none').rep > 0, true);
  // borcu yokken tutar yazılırsa çekip gitmez: söylenir, cebinden verebildiğini verir
  const wrong = settleAccount(check, 'X', 500);
  assert.equal(wrong.mood, 'grumble');
  assert.equal(wrong.cash, check.wallet);
  assert.ok(wrong.ethics < 0);
  assert.equal(settleAccount(check, 'X', 50).cash, 50);
});

test('borcunu ödeyen: tam tutar ödenir, fazlası istenirse söylenir ve doğrusunu verir', () => {
  const pay = { kind: 'pay' as const, owed: 245, remembers: 210, wallet: 310 };
  assert.deepEqual([settleAccount(pay, 'X', 245).cash, settleAccount(pay, 'X', 245).mood], [245, 'happy']);
  assert.equal(settleAccount(pay, 'X', 210).cash, 210);
  // fazlası istenirse cebindeki kadarını verir, söylenir
  const over = settleAccount(pay, 'X', 300);
  assert.equal(over.cash, 300);
  assert.equal(settleAccount(pay, 'X', 900).cash, 310);
  assert.ok(over.rep < 0 && over.ethics < 0 && over.mood === 'grumble');
  assert.equal(settleAccount(pay, 'X', 'none').cash, 0);
});

test('"ödemiştim" diyen: dürüste inanmak, yalancının üstüne gitmek kazandırır', () => {
  const honest = { kind: 'claim' as const, owed: 180, honest: true };
  const liar = { kind: 'claim' as const, owed: 95, honest: false };
  assert.ok(settleAccount(honest, 'X', 'believe').rep > settleAccount(honest, 'X', 'insist').rep);
  assert.equal(settleAccount(liar, 'X', 'insist').cash, 95);
  assert.equal(settleAccount(liar, 'X', 'believe').cash, 0);
});

test('ikilemler: iyilik itibar ve vicdan kazandırır, kasadan bir şey götürür', () => {
  assert.ok(shortBy(25) >= 5 && shortBy(25) < 25);
  assert.ok(billFor(60) > 60);
  const kid = settleDilemma('short', true, 40);
  assert.equal(kid.cash, 40 - shortBy(40));
  assert.equal(settleDilemma('short', false, 40).cash, 0);
  assert.equal(settleDilemma('change', true, 60).cash, 60);
  assert.equal(settleDilemma('change', false, 60).cash, billFor(60));
  assert.ok(settleDilemma('change', true, 60).ethics > settleDilemma('change', false, 60).ethics);
  assert.equal(settleDilemma('loan', true).cash, -LOAN);
});

test('haftanın olayları güne katılır; aynı köylü o gün iki kez gelmez', () => {
  for (let seed = 0; seed < 20; seed++)
    for (let d = 1; d <= DAYS; d++) {
      const day = weekDay(dayVisits(seed, d, 60), d);
      const ids = day.map((v) => v.villager.id);
      assert.equal(new Set(ids).size, ids.length);
      assert.equal(day.filter((v) => v.account).length, accountsOn(d).length);
      assert.equal(day.some((v) => v.dilemma === 'loan'), d === LOAN_DAY);
      day.filter((v) => v.dilemma && v.dilemma !== 'loan').forEach((v) => assert.equal(v.credit, false));
      day.filter((v) => !v.account && v.dilemma !== 'loan').forEach((v) => assert.ok(v.items.length >= 1));
    }
});

test('raf ve kasa: biten satılmaz, sabah ekmek yenilenir, gece süt bozulur, giderler zamlanır', () => {
  const [ekmek, sut] = PRODUCTS;
  const empty = { ...START_STOCK, sut: 0 };
  assert.deepEqual(split([ekmek, sut], empty), { have: [ekmek], missing: [sut] });
  assert.equal(take(START_STOCK, [ekmek]).ekmek, START_STOCK.ekmek - 1);
  const next = morning({ ...START_STOCK, ekmek: 3 }, 8, { sut: 40, ekmek: 50 });
  assert.equal(next.ekmek, 8);
  assert.equal(next.sut, SHELF_MAX);
  // sipariş o günün maliyetiyle ödenir
  assert.equal(orderCost({ sut: 2, ekmek: 3 }, 9), 2 * priceOn(sut, 9).cost + 3 * priceOn(ekmek, 9).cost);
  const night = spoil({ sut: 10, cay: 5 });
  assert.ok(night.spoiled.sut! > 0 && night.stock.sut < 10);
  assert.equal(night.stock.cay, 5);
  assert.equal(expensesOn(1).tax, 0);
  assert.ok(expensesOn(TAX_EVERY).tax > 0);
  assert.ok(expensesOn(30).power > expensesOn(1).power);
});

test('peşin teslim: kasadaki para kadar mal gelir, kasa siparişle eksiye düşmez', () => {
  const cay = PRODUCTS.find((p) => p.id === 'cay')!;
  const c = priceOn(cay, 5).cost;
  const full = deliver({ cay: 3 }, 10 * c, 5);
  assert.deepEqual(full, { delivered: { cay: 3 }, cost: 3 * c, short: false });
  const part = deliver({ cay: 3 }, 2 * c + 1, 5);
  assert.equal(part.delivered.cay, 2);
  assert.equal(part.short, true);
  assert.ok(part.cost <= 2 * c + 1);
  assert.deepEqual(deliver({ cay: 2 }, 0, 5), { delivered: {}, cost: 0, short: true });
});

test('para üstü: küsurat 5 liranın altıdır; sakıza çocuk sevinir, şehirli söylenir; sakız paketle gelir', () => {
  for (let price = 1; price < 400; price++)
    for (const seed of [0, 1]) {
      const p = payment(price, seed);
      assert.ok(p.bill >= price);
      assert.equal(p.change, p.bill - price);
      assert.ok(p.odd >= 0 && p.odd < 5);
    }
  assert.equal(payment(42, 1).odd, 3);
  assert.equal(payment(45, 1).odd, 0);
  assert.ok(settleChange('gum', 3, 'cocuk').rep > 0);
  assert.ok(settleChange('gum', 3, 'turist').rep < 0);
  assert.equal(settleChange('round', 3, 'teyze').cash, -2);
  assert.equal(settleChange('coins', 3, 'teyze').cash, 0);
  const d = deliver({ [GUM]: 2 }, 100, 3);
  assert.equal(d.delivered[GUM], 2 * GUM_PACK);
  assert.equal(d.cost, 2 * GUM_PACK_COST);
});

test('küçük satışta çocuğun elinde para kalır; bin liranın üstünde para üstü doğru', () => {
  for (const sold of [2, 5, 8, 10]) assert.ok(shortBy(sold) >= 1 && shortBy(sold) < sold);
  const p = payment(1500, 1);
  assert.equal(p.bill, 2000);
  assert.equal(p.change, 500);
  assert.equal(payment(2347, 3).odd, 3);
});

test('denge: giderler fiyatlarla zamlanır, az mal da bozulabilir, üstü kasaya atmak itibar yakar', () => {
  // gider / fiyat endeksi oranı sabit kalır: geç günlerde kasa kendiliğinden dolmaz
  assert.ok(Math.abs(expensesOn(70).tax / priceIndex(70) - expensesOn(7).tax / priceIndex(7)) < 2);
  assert.equal(spoil({ yumurta: 10 }, () => 0.9).spoiled.yumurta, 1);
  assert.equal(spoil({ yumurta: 10 }, () => 0.1).spoiled.yumurta, undefined);
  assert.ok(settleDilemma('change', false, 60).rep < 0);
  assert.ok(RETURN_DAY > TAX_EVERY * 4);
});

test('eski hesaplar ilk haftadan sonra da gelir; defterle tutarlıdır', () => {
  const later = [7, 9, 12, 14, 16, 18, 20, 25].flatMap((d) => accountsOn(d));
  assert.equal(later.length, 8);
  for (const { who, account } of later) {
    // "borcum var mı" diyenin cevabı da defterde: kimi borçlu, kimi değil
    assert.equal(account.owed, owedBy(who));
    if (account.kind !== 'check') assert.ok(account.owed > 0, `${who} borçlu olmalı`);
  }
  const checks = later.filter((a) => a.account.kind === 'check');
  assert.ok(checks.some((a) => a.account.owed > 0) && checks.some((a) => a.account.owed === 0));
  assert.equal(accountsOn(6).length, 0);
});

test('müşteriler her oyunda ve her gün başka sırayla gelir; özel ziyaretler de rastgele saatte', () => {
  const order = (seed: number) => weekDay(dayVisits(seed, 2, 60), 2, { seed }).map((v) => v.villager.id).join();
  assert.ok(new Set([1, 2, 3, 4, 5].map(order)).size >= 4);
  const at = new Set(Array.from({ length: 20 }, (_, seed) => weekDay(dayVisits(seed, 2, 60), 2, { seed }).findIndex((v) => v.account)));
  assert.ok(at.size > 2);
  // misafirler köyün olağan sırasına girmez
  for (let seed = 0; seed < 20; seed++) assert.ok(!dayVisits(seed, 3, 100).some((v) => v.villager.guest));
});

test('hayırsever oyunların yaklaşık beşte birinde, tek bir gün gelir', () => {
  const days = Array.from({ length: 2000 }, (_, seed) => charityDay(seed));
  const share = days.filter((d) => d !== null).length / days.length;
  assert.ok(share > 0.15 && share < 0.25, String(share));
  days.forEach((d) => d !== null && assert.ok(d >= 8 && d < RETURN_DAY));
  const seed = days.findIndex((d) => d !== null);
  const visits = weekDay(dayVisits(seed, days[seed]!, 60), days[seed]!, { seed });
  assert.equal(visits.filter((v) => v.charity && v.villager.id === CHARITY).length, 1);
});

test('bayat mal: akşam ekmek bayatlar, süt bozulur, atmak oyuncunun kararı; rafta kalan bayat satılabilir ve zabıta getirir', () => {
  // kalan ekmeğin üçte biri bayatlar, sütün azı bozulur, çay bozulmaz
  const night = rot({ ekmek: 10, sut: 10, cay: 5 }, {}, () => 0.9);
  assert.equal(night.old.ekmek, 3);
  assert.ok(night.old.sut! > 0 && night.old.cay === undefined);
  // ilk gece yalnız ekmek bayatlar
  assert.deepEqual(Object.keys(rot({ ekmek: 10, sut: 10 }, {}, () => 0.9, ['ekmek']).old), ['ekmek']);
  // dünden kalan bayat yeniden bozulmaz, yalnızca tazeler
  assert.equal(rot({ sut: 3 }, { sut: 3 }).spoiled.sut, undefined);
  const thrown = discard({ ekmek: 4, sut: 10 }, { ekmek: 4, sut: 3 }, { sut: true });
  assert.deepEqual(thrown.old, { sut: 3 });
  assert.equal(thrown.stock.ekmek, 0);
  assert.equal(thrown.stock.sut, 10);
  const sut = PRODUCTS.find((p) => p.id === 'sut')!;
  const sold = handOver({ sut: 3 }, { sut: 3 }, [sut], () => 0.5);
  assert.equal(sold.stale.length, 1);
  assert.deepEqual([sold.stock.sut, sold.old.sut], [2, 2]);
  assert.equal(handOver({ sut: 3 }, {}, [sut], () => 0).stale.length, 0);
  const day = weekDay(dayVisits(1, 6, 60), 6, { seed: 1, staleSold: 2 });
  const zabita = day.find((v) => v.villager.id === ZABITA)!;
  assert.equal(zabita.fine, 2);
  assert.ok(fineFor(2, 6) > fineFor(1, 6));
  assert.ok(!weekDay(dayVisits(1, 6, 60), 6, { seed: 1 }).some((v) => v.fine));
});

test('her köylünün kendi huyu ve ilk selamı var', () => {
  VILLAGERS.forEach((v) => assert.ok(characterOf(v.id).trait && characterOf(v.id).hello, v.id));
});

test('pazarlıkçının teklifi söylenen fiyatın biraz altıdır; titiz bayatı hep şikâyet eder', () => {
  for (const p of [2, 9, 15, 42, 100, 999]) assert.ok(haggleOffer(p) >= 1 && haggleOffer(p) < p, String(p));
  assert.equal(haggleOffer(100), 90);
  assert.ok(VILLAGERS.some((v) => characterOf(v.id).haggle));
  const fussy = VILLAGERS.find((v) => characterOf(v.id).fussy)!.id;
  const calm = VILLAGERS.find((v) => !characterOf(v.id).fussy)!.id;
  assert.equal(complains(fussy, 0.99), true);
  assert.equal(complains(calm, 0.99), false);
  assert.equal(complains(calm, 0.1), true);
});

test('toptancı ekmeği de getirir; büyük siparişe indirim yapar', () => {
  const d = deliver({ ekmek: 5, sut: 2 }, 10000, 2);
  assert.equal(d.delivered.ekmek, 5);
  assert.equal(bulkRate(1499), 0);
  assert.equal(bulkRate(1500), 0.05);
  assert.equal(bulkRate(3500), 0.1);
  assert.equal(bulkDiscount(3000), 300);
});

test('katalog: her mal bir reyonda; açılışta her maldan biraz var, temel gıdadan bol; tost ve sandviçin içi yazılı', () => {
  const listed = CATEGORIES.flatMap((c) => c.ids);
  PRODUCTS.forEach((p) => assert.equal(listed.filter((id) => id === p.id).length, 1, p.id));
  const shelved = PRODUCTS.filter((p) => !MADE.includes(p.id));
  shelved.forEach((p) => assert.ok(START_STOCK[p.id] > 0, p.id));
  const least = Math.min(...BASIC.map((id) => START_STOCK[id]));
  shelved.filter((p) => !BASIC.includes(p.id)).forEach((p) => assert.ok(START_STOCK[p.id] < least, p.id));
  shelved.forEach((p) => assert.ok(START_STOCK[p.id] <= (p.id === 'ekmek' ? BREAD_MAX : SHELF_MAX), p.id));
  CATEGORIES.find((c) => c.id === 'bufe')!.ids.forEach((id) => assert.ok(PRODUCTS.find((p) => p.id === id)!.detail, id));
});

test('tost ve sandviç tezgâhta hazırlanır: stok tutulmaz, sandviç ekmekten yapılır, malzemesi kasadan çıkar', () => {
  const tost = PRODUCTS.find((p) => p.id === 'kasarli')!;
  const sandvic = PRODUCTS.find((p) => p.id === 'peynirli')!;
  assert.deepEqual(split([tost, sandvic], { ekmek: 0 }).missing, [sandvic]);
  assert.deepEqual(split([tost, sandvic], { ekmek: 2 }).missing, []);
  const h = handOver({ ekmek: 2 }, {}, [tost, sandvic], () => 0.9);
  assert.equal(h.stock.ekmek, 1);
  assert.equal(h.stock.kasarli, undefined);
  assert.equal(madeCost([tost, sandvic], 1), priceOn(tost, 1).cost + priceOn(sandvic, 1).cost);
  assert.equal(START_STOCK.kasarli, undefined);
  assert.ok(!FRIDGE.some((id) => MADE.includes(id)));
});

test('itibar düşünce köylü yerine yabancı gelir, veresiyeciler borcunu ödemez, pahalı fiyat kahvede konuşulur', () => {
  const strangers = (rep: number) => Array.from({ length: 20 }, (_, seed) => dayVisits(seed, 3, rep).filter((v) => v.customer.id === 'turist').length).reduce((a, b) => a + b, 0);
  assert.ok(strangers(15) > strangers(70) * 2);
  const debts = [{ who: 'ayse', name: 'Ayşe Teyze', amount: 50, cost: 30, day: 1 }];
  const paidHigh = Array.from({ length: 30 }, (_, seed) => settleDebts(debts, seed, 3, 70)[0].paid).filter(Boolean).length;
  const paidLow = Array.from({ length: 30 }, (_, seed) => settleDebts(debts, seed, 3, LOW_REP - 1)[0].paid).filter(Boolean).length;
  assert.ok(paidHigh > 0);
  assert.equal(paidLow, 0);
  assert.ok(priceTalk([1.4, 1.3])!.rep < 0);
  assert.ok(priceTalk([0.95])!.rep > 0);
  assert.equal(priceTalk([]), null);
});

test('yoldan geçen yabancılar yalnızca itibar düşünce gelir', () => {
  for (let seed = 0; seed < 20; seed++) assert.ok(!dayVisits(seed, 4, 70).some((v) => v.villager.passerby));
  assert.ok(Array.from({ length: 20 }, (_, seed) => dayVisits(seed, 4, 15)).some((d) => d.some((v) => v.villager.passerby)));
});

test('açılış günü yalnızca bir müşteri dükkânda olmayan bir şey ister; başlangıç malı o güne yeter', () => {
  for (let seed = 0; seed < 40; seed++) {
    const day = dayVisits(seed, 1, 60);
    assert.equal(day.filter((v) => v.items.some((p) => !BASIC.includes(p.id))).length, 1, `seed ${seed}`);
    const asked: Record<string, number> = {};
    day.flatMap((v) => v.items).forEach((p) => (asked[p.id] = (asked[p.id] ?? 0) + 1));
    Object.entries(asked).filter(([id]) => BASIC.includes(id)).forEach(([id, n]) => assert.ok(n <= START_STOCK[id], `${seed} ${id}`));
  }
});
