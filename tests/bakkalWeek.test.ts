import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCTS, VILLAGERS, dayVisits, priceOn } from '../src/games/bakkal/data';

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
  RETURN_DAY
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
  assert.equal(settleAccount(check, 'X', 50).mood, 'leave');
});

test('borcunu ödeyen: tam tutar ödenir, fazlası istenirse söylenir ve doğrusunu verir', () => {
  const pay = { kind: 'pay' as const, owed: 245, remembers: 210 };
  assert.deepEqual([settleAccount(pay, 'X', 245).cash, settleAccount(pay, 'X', 245).mood], [245, 'happy']);
  assert.equal(settleAccount(pay, 'X', 210).cash, 210);
  const over = settleAccount(pay, 'X', 300);
  assert.equal(over.cash, 245);
  assert.ok(over.rep < 0 && over.ethics < 0);
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
  const next = morning({ ...START_STOCK, ekmek: 3 }, 8, { sut: 20, ekmek: 50 });
  assert.equal(next.ekmek, 8);
  assert.equal(next.sut, 12);
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
  assert.equal(spoil({ yumurta: 4 }, () => 0.9).spoiled.yumurta, 1);
  assert.equal(spoil({ yumurta: 4 }, () => 0.1).spoiled.yumurta, undefined);
  assert.ok(settleDilemma('change', false, 60).rep < 0);
  assert.ok(RETURN_DAY > TAX_EVERY * 4);
});

test('eski hesaplar ilk haftadan sonra da gelir; defterle tutarlıdır', () => {
  const later = [9, 12, 16, 20, 25].flatMap((d) => accountsOn(d));
  assert.equal(later.length, 5);
  for (const { who, account } of later) {
    if (account.kind === 'check') assert.equal(owedBy(who), 0, `${who} borçsuz olmalı`);
    else assert.ok(account.owed > 0, `${who} borçlu olmalı`);
  }
  assert.equal(accountsOn(6).length, 0);
});
