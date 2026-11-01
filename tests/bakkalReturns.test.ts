import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCTS } from '../src/games/bakkal/data';
import { DRAWER_MAX, GIFT_GOODS, addReceipt, bestSellers, giftIn, planReturn, revealOf, settleGift, settleReturn, type Receipt } from '../src/games/bakkal/returns';

const yogurt = PRODUCTS.find((p) => p.id === 'yogurt')!;
const cips = PRODUCTS.find((p) => p.id === 'cips')!;

const sale = (day: number, who = 'ayse', name = 'Ayşe Teyze'): Omit<Receipt, 'no'> => ({ day, who, name, items: [{ id: 'yogurt', name: yogurt.name }], total: 95 });

test('fişler sırayla numaralanır, çekmece taşmaz', () => {
  let list: Receipt[] = [];
  for (let i = 0; i < DRAWER_MAX + 5; i++) list = addReceipt(list, sale(1));
  assert.equal(list.length, DRAWER_MAX);
  assert.equal(list[list.length - 1].no, DRAWER_MAX + 5);
});

test('iade: ilk gün yok; her tür Z raporlarıyla tutarlıdır', () => {
  let list: Receipt[] = [];
  const who = [
    ['ayse', 'Ayşe Teyze'],
    ['fatma', 'Fatma Teyze'],
    ['hasan', 'Muhtar Hasan'],
  ];
  for (let d = 1; d < 6; d++) for (const [id, name] of who) list = addReceipt(list, sale(d, id, name));
  // birinin iadesi daha önce alınmış: ikinci kez iade buna denk gelebilir
  list = list.map((x) => (x.no === 4 ? { ...x, returnedOn: 3 } : x));
  assert.equal(planReturn(list, 1, 1), null);
  const seen = new Set<string>();
  for (let seed = 0; seed < 600; seed++) {
    const p = planReturn(list, seed, 6);
    if (!p) continue;
    const { ask, villager } = p;
    seen.add(ask.kind);
    const rc = list.find((x) => x.no === ask.receipt);
    const bought = list.some((x) => x.who === villager.id && x.items.some((i) => i.id === ask.product.id));
    if (ask.kind === 'real') assert.ok(rc && rc.who === villager.id && rc.returnedOn === undefined && ask.price === ask.paid);
    if (ask.kind === 'inflated') assert.ok(rc && ask.price > ask.paid!);
    if (ask.kind === 'double') assert.ok(rc && rc.returnedOn !== undefined);
    if (ask.kind === 'elsewhere') assert.ok(!bought && list.some((x) => x.who === villager.id));
    if (ask.kind === 'never') assert.ok(!list.some((x) => x.who === villager.id));
  }
  assert.deepEqual([...seen].sort(), ['double', 'elsewhere', 'inflated', 'never', 'real']);
});

test('iade: bugün kesilen fiş bugünkü iade planını değiştirmez', () => {
  let list: Receipt[] = [];
  for (let d = 1; d < 4; d++) list = addReceipt(list, sale(d));
  for (let seed = 0; seed < 50; seed++) {
    const before = planReturn(list, seed, 4);
    const after = planReturn(addReceipt(list, sale(4, 'fatma', 'Fatma Teyze')), seed, 4);
    assert.deepEqual(after, before);
  }
});

test('iade kararı: gerçeği geri çevirmek küstürür, oyunu yakalamak kasayı korur', () => {
  const base = { product: yogurt, reason: '', restock: true };
  const real = { ...base, kind: 'real' as const, price: 95, paid: 95, receipt: 3 };
  assert.equal(settleReturn(real, true, 'A').cash, -95);
  assert.ok(settleReturn(real, false, 'A').rep < 0);
  const inflated = { ...base, kind: 'inflated' as const, price: 130, paid: 95, receipt: 3 };
  assert.equal(settleReturn(inflated, true, 'A').cash, -130);
  // fazla isteyene fişteki kadarı verilir
  assert.equal(settleReturn(inflated, false, 'A').cash, -95);
  for (const kind of ['elsewhere', 'never', 'double'] as const) {
    assert.equal(settleReturn({ ...base, kind, price: 100 }, true, 'A').cash, -100);
    assert.equal(settleReturn({ ...base, kind, price: 100 }, false, 'A').cash, 0);
  }
  assert.match(revealOf(inflated, 'A', [{ no: 3, day: 2, who: 'a', name: 'A', items: [], total: 95 }]), /95 ₺ yazıyordu/);
});

test('hediye yalnızca paketli maldan çıkar; tutmak vicdanı, vermek itibarı etkiler', () => {
  assert.equal(giftIn([yogurt], 1), null);
  assert.ok(GIFT_GOODS.includes('cips'));
  const found = Array.from({ length: 300 }, (_, s) => giftIn([cips], s)).filter(Boolean);
  assert.ok(found.length > 10 && found.length < 120, `${found.length} hediye`);
  assert.equal(settleGift(50, true, 'A').cash, 50);
  assert.ok(settleGift(50, true, 'A').ethics < 0);
  assert.ok(settleGift(50, false, 'A').rep > 0);
});

test('gün sonu: çok satanlar adede göre, fişteki pay market fiyatına göre bölünür', () => {
  let list: Receipt[] = [];
  list = addReceipt(list, { day: 2, who: 'a', name: 'A', items: [{ id: 'cips', name: 'Cips' }], total: 40 });
  list = addReceipt(list, { day: 2, who: 'b', name: 'B', items: [{ id: 'cips', name: 'Cips' }, { id: 'yogurt', name: 'Yoğurt' }], total: 130 });
  list = addReceipt(list, { day: 1, who: 'c', name: 'C', items: [{ id: 'yogurt', name: 'Yoğurt' }], total: 95 });
  const rows = bestSellers(list, 2);
  assert.deepEqual(rows.map((r) => [r.id, r.count]), [['cips', 2], ['yogurt', 1]]);
  assert.equal(rows.reduce((s, r) => s + r.revenue, 0), 170);
});
