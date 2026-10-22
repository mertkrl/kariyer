import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CALL_SECONDS, callOverlayAt, maskName, queueAt } from '../src/games/ekran/live';
import { STOP_SECONDS, lineOf, overlayAt, tripAt } from '../src/games/ekran/lines';
import { MAX_WIDGETS, PRESETS, blankDesign, currentDesign, sampleDesign, sanitize } from '../src/games/ekran/model';
import { decodeDesign, encodeDesign, sharedCodeOf } from '../src/games/ekran/share';

test('hasta adı KVKK gereği ilk üç harfle yıldızlanır', () => {
  assert.equal(maskName('Pestil Türkuyruk'), 'PES**** TÜR****');
  assert.equal(maskName('  Ali  İnce '), 'ALİ**** İNC****');
});

test('sıra her çağrı süresinde bir ilerler, sıradakiler hep sonraki numaralardır', () => {
  const a = queueAt(0);
  const b = queueAt(CALL_SECONDS);
  assert.equal(b.current.no, a.current.no + 1);
  assert.deepEqual(a.next[0], b.current);
  a.next.forEach((p, i) => assert.equal(p.no, a.current.no + 1 + i));
  assert.deepEqual(queueAt(3), queueAt(3));
});

test('hazır tasarımlar temizlemeden olduğu gibi geçer', () => {
  for (const { id } of PRESETS) for (const d of [currentDesign(id), sampleDesign(id), blankDesign(id)]) assert.deepEqual(sanitize(JSON.parse(JSON.stringify(d))), d);
  assert.ok(PRESETS.every((p) => p.ready));
});

test('dışarıdan gelen tasarım sınırlanır ve bilinmeyen alanlar atılır', () => {
  const evil = {
    v: 1,
    preset: 'yok',
    bg: 'red; background:url(x)',
    extra: '<script>',
    widgets: [
      { kind: 'text', id: 'a', x: 1e9, y: -1e9, w: -5, h: NaN, fill: 'javascript:x', color: '#ABCDEF', size: 9999, text: 'a\u0000b\nc'.padEnd(1000, 'x'), onclick: 'x' },
      { kind: 'iframe', id: 'b' },
      { kind: 'box', id: 'a' },
      ...Array.from({ length: 200 }, () => ({ kind: 'box' })),
    ],
  };
  const d = sanitize(evil);
  assert.ok(d);
  assert.equal(d.preset, 'hastane');
  assert.equal(d.bg, '#0f2a3d');
  assert.equal(d.widgets.length, MAX_WIDGETS - 1); // ilk 80'den bilinmeyen tür atıldı
  const [t, box] = d.widgets;
  assert.ok(t.x <= 1024 && t.y >= -768 && t.w >= 8 && t.h === 80);
  assert.equal(t.fill, 'none');
  assert.equal(t.color, '#abcdef');
  assert.equal(t.size, 300);
  assert.ok(t.text.startsWith('ab\nc') && t.text.length === 300);
  assert.ok(!('onclick' in t));
  assert.notEqual(box.id, t.id);
  assert.equal(sanitize({ v: 2, widgets: [] }), null);
  assert.equal(sanitize('x'), null);
});

test('paylaşım kodu tasarımı aynen geri verir, bozuk kod null döner', async () => {
  const d = sampleDesign();
  const code = await encodeDesign(d);
  assert.match(code, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(await decodeDesign(code), d);
  assert.equal(sharedCodeOf(`#/ekran?t=${code}`), code);
  assert.equal(sharedCodeOf('#/ekran'), null);
  assert.equal(await decodeDesign('bozuk!'), null);
  assert.equal(await decodeDesign('AAAA'), null);
  assert.equal(await decodeDesign(code.slice(0, 20)), null);
});

test('araç her durak süresinde bir ilerler, son durağa varınca hat baştan başlar', () => {
  for (const id of ['metrobus', 'otobus', 'marmaray'] as const) {
    const { stops } = lineOf(id);
    assert.ok(stops.every((st, i) => i === 0 || st !== stops[i - 1]), id);
    const a = tripAt(0, id);
    assert.equal(a.current, stops[0]);
    assert.equal(a.next, stops[1]);
    assert.equal(a.terminus, stops[stops.length - 1]);
    assert.equal(tripAt(STOP_SECONDS, id).current, stops[1]);
    const last = tripAt(STOP_SECONDS * (stops.length - 2), id);
    assert.equal(last.next, last.terminus);
    assert.equal(tripAt(STOP_SECONDS * (stops.length - 1), id).current, stops[0]);
  }
});

test('98G hattı Bakırköy\'den Giyimkent\'e 57 durak', () => {
  const { stops } = lineOf('otobus');
  assert.equal(stops.length, 57);
  assert.equal(stops[0], 'BAKIRKÖY');
  assert.equal(stops.at(-2), 'ÇAMLIK');
  assert.equal(stops.at(-1), 'GİYİMKENT');
});

test('geçişli ekranda önce sonraki durak, sonra varılan durak kartı gelir', () => {
  assert.equal(overlayAt(1, 'metrobus'), null);
  assert.equal(overlayAt(3, 'metrobus'), null);
  const next = overlayAt(7, 'metrobus');
  assert.equal(next?.kind, 'next');
  assert.equal(next?.name, 'Fikirtepe');
  const arrive = overlayAt(9, 'metrobus');
  assert.equal(arrive?.kind, 'arrive');
  assert.equal(arrive?.name, 'Fikirtepe');
  // sonraki yolculuğun başında aynı durak kayarak çıkar
  const leaving = overlayAt(STOP_SECONDS + 0.9, 'metrobus');
  assert.equal(leaving?.name, 'Fikirtepe');
  assert.ok(leaving && leaving.shown > 0 && leaving.shown < 1);
  assert.equal(overlayAt(STOP_SECONDS + 2, 'metrobus'), null);
  for (let t = 0; t < STOP_SECONDS * 3; t += 0.1) {
    const o = overlayAt(t, 'marmaray');
    if (o) assert.ok(o.shown >= 0 && o.shown <= 1, `t=${t}`);
  }
});

test('hastanede her çağrının başında kart iner ve çıkar', () => {
  assert.ok(callOverlayAt(1));
  assert.equal(callOverlayAt(5), null);
  assert.equal(callOverlayAt(CALL_SECONDS + 1)?.patient.no, queueAt(CALL_SECONDS).current.no);
  assert.ok(callOverlayAt(3.5)!.shown < 0.2);
});
