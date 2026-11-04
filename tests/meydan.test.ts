import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_ITEMS, W, applySignCode, colorCount, isJunk, itemsOn, makeItem, sanitize, withoutJunk, type Design, type Place } from '../src/games/meydan/model';
import { PLACES } from '../src/games/meydan/places';
import { adoptOldDrafts } from '../src/games/meydan/drafts';
import { draftKey } from '../src/games/meydan/model';
import { buildingCost, lookScore, makeover, openDefects, seismic } from '../src/games/meydan/report';

/** Mimarın ve mühendisin tam projesi: her kusur kapanır, her bina güçlenir, meydan yayalaşır. */
function planned(p: Place): Design {
  const clean = applySignCode(withoutJunk(p.original), p);
  return {
    ...clean,
    site: { paving: 'granit', green: 'bahce', lamps: 'klasik' },
    specs: p.original.specs.map((s, i) => ({
      ...s,
      wall: '#f1ebe0',
      trim: '#f1ebe0',
      shop: '#2f3b45',
      cladding: p.local[0],
      windows: 'ahsap',
      railing: 'ferforje',
      roof: p.buildings[i].roof === 'kirma' ? 'kiremit' : 'teras',
      eave: 'ahsap',
      shopfront: 'vitrin',
      lighting: 'aplik',
      structure: seismic(p.buildings[i], s).safe ? 'yok' : 'perde',
      extra: 'yik',
    })),
  };
}

test('meydanların bugünkü hâli temizlemeden olduğu gibi geçer', () => {
  for (const p of PLACES) {
    assert.deepEqual(sanitize(JSON.parse(JSON.stringify(p.original)), p), p.original);
    assert.deepEqual(
      p.original.specs.map((x) => x.id),
      p.buildings.map((b) => b.id),
    );
    assert.equal(new Set(p.original.items.map((it) => it.id)).size, p.original.items.length);
  }
});

test('binalar meydanı boşluksuz ve üst üste binmeden doldurur', () => {
  for (const p of PLACES) {
    assert.equal(p.buildings[0].x, 0);
    p.buildings.forEach((b, i) => i && assert.equal(b.x, p.buildings[i - 1].x + p.buildings[i - 1].w));
    const last = p.buildings[p.buildings.length - 1];
    assert.equal(last.x + last.w, W, p.id);
  }
});

test('her bölüm başka bir bölgede, başka bir manzarada ve kendi kusurlarıyla', () => {
  assert.equal(new Set(PLACES.map((p) => p.region)).size, PLACES.length);
  assert.equal(new Set(PLACES.map((p) => p.backdrop)).size, PLACES.length);
  assert.equal(new Set(PLACES.map((p) => p.landmark)).size, PLACES.length);
  for (const p of PLACES) {
    const kinds = new Set(p.buildings.flatMap((b) => Object.keys(b.defects ?? {})));
    assert.ok(kinds.size >= 5, `${p.id}: ${[...kinds]}`);
    assert.ok(p.buildings.some((b) => !seismic(b, p.original.specs[p.buildings.indexOf(b)]).safe), `${p.id}: riskli bina yok`);
    assert.ok(p.original.items.some((it) => isJunk(it.kind)));
  }
});

test('bozuk taslak sınırlanır, eksik ayarlar meydandan gelir', () => {
  const place = PLACES[0];
  const d = sanitize(
    {
      v: 2,
      place: place.id,
      specs: [{ id: 'b1', wall: '#ABCDEF', trim: 'red', shop: 5, cladding: 'tas', windows: 'altin', structure: '<script>' }, { id: 'yok', wall: '#000000' }],
      site: { paving: 'bazalt', green: 'orman' },
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
  assert.equal(d.specs.length, place.buildings.length);
  const [first] = d.specs;
  assert.equal(first.wall, '#abcdef');
  assert.equal(first.trim, place.original.specs[0].trim);
  assert.equal(first.cladding, 'tas');
  assert.equal(first.windows, 'mevcut');
  assert.equal(first.structure, 'yok');
  assert.deepEqual(d.specs[1], place.original.specs[1]);
  assert.deepEqual(d.site, { paving: 'bazalt', green: 'yok', lamps: 'mevcut' });
  assert.equal(d.items.length, MAX_ITEMS - 1);
  const [a, klima] = d.items;
  assert.ok(a.x <= 1200 && a.y >= -700 && a.w >= 8 && a.h === 36);
  assert.equal(a.fill, '#2f3b45');
  assert.equal(a.color, '#ffffff');
  assert.ok(a.text.startsWith('abx') && a.text.length === 40);
  assert.ok(!('onclick' in a));
  assert.notEqual(klima.id, a.id);
  assert.equal(sanitize({ v: 1, place: place.id }, place), null, 'eski sürüm taslak atılır');
  assert.equal(sanitize({ v: 2, place: 'baska' }, place), null);
  assert.equal(sanitize('x', place), null);
});

test('kirlilik sökülünce yalnızca tabelalar kalır, renk sayısı düşer', () => {
  const d = PLACES[0].original;
  const clean = withoutJunk(d);
  assert.ok(clean.items.length > 0 && clean.items.every((it) => !isJunk(it.kind)));
  const plain = { ...clean, items: [], specs: d.specs.map((p) => ({ ...p, wall: '#f1ebe0', trim: '#2f3b45', shop: '#2f3b45' })) };
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

test('tabela yönetmeliği: dükkân başına tek pano, aynı bantta; afiş ve folyo gider, klimalar yerinde', () => {
  for (const p of PLACES) {
    const d = applySignCode(p.original, p);
    assert.ok(!d.items.some((it) => it.kind === 'afis' || it.kind === 'folyo'));
    assert.equal(d.items.filter((it) => isJunk(it.kind)).length, p.original.items.filter((it) => isJunk(it.kind)).length);
    for (const b of p.buildings) {
      const panos = itemsOn(d.items, b).filter((it) => it.kind === 'pano');
      assert.ok(panos.length <= 1, `${p.id}/${b.id}`);
      for (const it of panos) assert.ok(it.x >= b.x && it.x + it.w <= b.x + b.w);
    }
    assert.ok(lookScore(p, d) > lookScore(p, p.original));
  }
});

test('mühendis: güçlendirme binayı güvenli yapar; ruhsatlanan kaçak katın yükü kalır, yıkılanınki kalkar', () => {
  for (const p of PLACES)
    p.buildings.forEach((b, i) => {
      const s = p.original.specs[i];
      assert.ok(seismic(b, { ...s, structure: 'perde' }).safe);
      if (b.defects?.illegal && b.risk >= 1 && !b.defects.cracked) {
        assert.equal(seismic(b, { ...s, extra: 'uyumla' }).safe, false, `${p.id}/${b.id}`);
        assert.equal(seismic(b, { ...s, extra: 'yik' }).safe, b.risk < 2);
      }
    });
});

test('mimar: doğru seçimler her kusuru kapatır, iyi malzeme pahalıdır', () => {
  for (const p of PLACES) {
    const d = planned(p);
    p.buildings.forEach((b, i) => {
      assert.deepEqual(openDefects(b, d.specs[i]), [], `${p.id}/${b.id}`);
      assert.ok(buildingCost(b, d.specs[i]) > buildingCost(b, p.original.specs[i]));
    });
    assert.equal(buildingCost(p.buildings[1], p.original.specs[1]), 0);
  }
});

test('paylaşım özeti: dokunulmayan, sökülen, tabela yığılan ve planlanan meydanlar ayrı unvan alır', () => {
  for (const p of PLACES) {
    const same = makeover(p, p.original);
    assert.equal(same.title, 'Dokunulmamış Meydan');
    assert.equal(same.junkRemoved, 0);
    assert.equal(same.score, same.scoreBefore);
    assert.ok(same.score < 30, `${p.id}: bugünkü hâl ${same.score}`);

    const clean = makeover(p, withoutJunk(p.original));
    assert.equal(clean.junkRemoved, p.original.items.filter((it) => isJunk(it.kind)).length);
    assert.equal(clean.title, 'Klima Avcısı');

    const more = { ...p.original, items: [...p.original.items, makeItem('pano'), makeItem('afis'), makeItem('kutu')] };
    assert.equal(makeover(p, more).title, 'Tabela Cenneti');

    const best = makeover(p, planned(p));
    assert.equal(best.title, 'Şehir Plancısı', `${p.id}: ${best.score}`);
    assert.equal(best.safe, best.total);
    assert.equal(best.defectsOpen, 0);
    assert.ok(best.defectsBefore >= 5);
    assert.ok(best.cost > 1e6);
    assert.ok(best.works.length >= 4);
  }
});

test('öneksiz eski taslaklar yeni anahtara taşınır, yenisinin üstüne yazılmaz, kalanı silinir', () => {
  localStorage.clear();
  localStorage.setItem('meydan:taslak:v3:rize', '"eski rize"');
  localStorage.setItem('meydan:taslak:v3:izmir', '"eski izmir"');
  localStorage.setItem(draftKey('izmir'), '"yeni izmir"');
  localStorage.setItem('meydan:taslak:v3:diyarbakir', '"kalkan yer"');
  localStorage.setItem('meydan:taslak:v2:rize', '"eski çizim"');
  adoptOldDrafts(localStorage, PLACES.map((p) => p.id));
  assert.equal(localStorage.getItem(draftKey('rize')), '"eski rize"');
  assert.equal(localStorage.getItem(draftKey('izmir')), '"yeni izmir"');
  assert.ok(Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i) ?? '').every((k) => k.startsWith('kariyerweb-')));
});
