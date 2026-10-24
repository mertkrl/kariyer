import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_ITEMS, colorCount, isJunk, itemsOn, makeItem, makeover, sanitize, withoutJunk } from '../src/games/meydan/model';
import { PLACES } from '../src/games/meydan/places';

test('meydanların bugünkü hâli temizlemeden olduğu gibi geçer', () => {
  for (const p of PLACES) {
    assert.deepEqual(sanitize(JSON.parse(JSON.stringify(p.original)), p), p.original);
    assert.deepEqual(
      p.original.paints.map((x) => x.id),
      p.buildings.map((b) => b.id),
    );
    assert.equal(new Set(p.original.items.map((it) => it.id)).size, p.original.items.length);
  }
});

test('binalar meydanı boşluksuz ve üst üste binmeden doldurur', () => {
  for (const p of PLACES) p.buildings.forEach((b, i) => i && assert.equal(b.x, p.buildings[i - 1].x + p.buildings[i - 1].w));
});

test('bozuk taslak sınırlanır, eksik boyalar meydandan gelir', () => {
  const place = PLACES[0];
  const d = sanitize(
    {
      v: 1,
      place: place.id,
      paints: [{ id: 'b1', wall: '#ABCDEF', trim: 'red', shop: 5 }, { id: 'yok', wall: '#000000' }],
      items: [
        { kind: 'pano', id: 'a', x: 1e9, y: -1e9, w: -5, h: NaN, fill: 'javascript:x', color: '#FFFFFF', text: 'a\u0000b'.padEnd(200, 'x'), onclick: 'x' },
        { kind: 'iframe', id: 'b' },
        { kind: 'klima', id: 'a' },
        ...Array.from({ length: 300 }, () => ({ kind: 'kutu' })),
      ],
    },
    place,
  );
  assert.ok(d);
  assert.equal(d.paints.length, place.buildings.length);
  assert.deepEqual(d.paints[0], { id: 'b1', wall: '#abcdef', trim: place.original.paints[0].trim, shop: place.original.paints[0].shop });
  assert.deepEqual(d.paints[1], place.original.paints[1]);
  assert.equal(d.items.length, MAX_ITEMS - 1);
  const [a, klima] = d.items;
  assert.ok(a.x <= 1200 && a.y >= -700 && a.w >= 8 && a.h === 36);
  assert.equal(a.fill, '#2f3b45');
  assert.equal(a.color, '#ffffff');
  assert.ok(a.text.startsWith('abx') && a.text.length === 40);
  assert.ok(!('onclick' in a));
  assert.notEqual(klima.id, a.id);
  assert.equal(sanitize({ v: 1, place: 'baska' }, place), null);
  assert.equal(sanitize('x', place), null);
});

test('kirlilik sökülünce yalnızca tabelalar kalır, renk sayısı düşer', () => {
  const d = PLACES[0].original;
  const clean = withoutJunk(d);
  assert.ok(d.items.some((it) => isJunk(it.kind)));
  assert.ok(clean.items.length > 0 && clean.items.every((it) => !isJunk(it.kind)));
  const plain = { ...clean, items: [], paints: d.paints.map((p) => ({ ...p, wall: '#f1ebe0', trim: '#2f3b45', shop: '#2f3b45' })) };
  assert.equal(colorCount(plain), 2);
  assert.ok(colorCount(d) > 20);
});

test('cepheyi temizle yalnızca ortası binanın üstünde kalanları seçer', () => {
  const [b] = PLACES[0].buildings;
  const inside = makeItem('pano', { x: b.x + 10, w: 40 });
  const edge = makeItem('pano', { x: b.x + b.w - 10, w: 100 });
  assert.deepEqual(itemsOn([inside, edge], b), [inside]);
  assert.notEqual(makeItem('pano').id, makeItem('pano').id);
});

test('paylaşım özeti: hiç dokunulmayan meydan, sökülen klimalar ve artan tabelalar ayrı unvan alır', () => {
  const p = PLACES[0];
  const same = makeover(p.original, p.original);
  assert.equal(same.title, 'Dokunulmamış Meydan');
  assert.equal(same.junkRemoved, 0);
  assert.equal(same.signsBefore, same.signsAfter);

  const clean = makeover(p.original, withoutJunk(p.original));
  assert.equal(clean.junkRemoved, p.original.items.filter((it) => isJunk(it.kind)).length);
  assert.ok(clean.junkRemoved > 0);
  assert.equal(clean.title, 'Klima Avcısı');

  const more = { ...p.original, items: [...p.original.items, makeItem('pano')] };
  assert.equal(makeover(p.original, more).title, 'Tabela Cenneti');

  const planned = { ...withoutJunk(p.original), paints: p.original.paints.map((x) => ({ ...x, wall: '#f1ebe0', trim: '#f1ebe0', shop: '#2f3b45' })), items: [] };
  assert.equal(makeover(p.original, planned).title, 'Şehir Plancısı');
});
