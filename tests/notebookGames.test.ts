import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compute, parseNumber, show } from '../src/arcade/notebook/sheet';
import { recognize, type Pt } from '../src/arcade/notebook/glyph';
import { SOS_N, sosLines, sosMove, xoxMove, xoxWinner, type Letter, type Mark } from '../src/arcade/notebook/boardGames';

test('tablo: sayılar, formüller, aralıklar, işlevler', () => {
  const v = compute({ A1: '10', A2: '1.250', A3: '2,5', B1: '=A1+A2*2', B2: '=TOPLA(A1:A3)', B3: '=YUVARLA(A2/A1;1)', B4: '=EĞER(A1>=10;"Tamam";"Takipte")', B5: '=ORTALAMA(A1:A2)', B6: '=MAK(A1:A3)-MİN(A1:A3)' });
  assert.equal(v.A2, 1250);
  assert.equal(v.A3, 2.5);
  assert.equal(v.B1, 2510);
  assert.equal(v.B2, 1262.5);
  assert.equal(v.B3, 125);
  assert.equal(v.B4, 'Tamam');
  assert.equal(v.B5, 630);
  assert.equal(v.B6, 1247.5);
  assert.equal(show(1262.5), '1.262,5');
});

test('tablo: hatalar ve döngü yakalanır, metin olduğu gibi kalır', () => {
  const v = compute({ A1: '=1/0', A2: '=B2', B2: '=A2', A3: '=FOO(1)', A4: '=1+', A5: 'Marmara', A6: '=A5*2' });
  assert.equal(v.A1, '#SAYI/0!');
  assert.equal(v.B2, '#DÖNGÜ!');
  assert.equal(v.A3, '#AD?');
  assert.equal(v.A4, '#HATA!');
  assert.equal(v.A5, 'Marmara');
  assert.equal(v.A6, '#DEĞER!');
  assert.equal(parseNumber('abc'), null);
  assert.equal(parseNumber('-12'), -12);
});

test('XOX: kazanan bulunur; bilgisayar kazanır, keser, ortayı alır', () => {
  assert.deepEqual(xoxWinner(['X', 'X', 'X', null, null, null, null, null, null]), { who: 'X', line: [0, 1, 2] });
  assert.equal(xoxWinner(['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X']), 'draw');
  const never = () => 0.99;
  // kazanabiliyorsa kazanır
  assert.equal(xoxMove(['O', 'O', null, 'X', 'X', null, null, null, null], never), 2);
  // oyuncu kazanacaksa keser
  assert.equal(xoxMove(['X', 'X', null, null, 'O', null, null, null, null], never), 2);
  assert.equal(xoxMove(['X', null, null, null, null, null, null, null, null] as Mark[], never), 4);
});

test('SOS: tamamlanan S-O-S sayılır; bilgisayar puanı alır, puan yoksa hazır SOS bırakmaz', () => {
  const b: Letter[] = Array(SOS_N * SOS_N).fill(null);
  b[0] = 'S';
  b[1] = 'O';
  assert.equal(sosLines(b, 2, 'S').length, 1);
  assert.equal(sosLines(b, 2, 'O').length, 0);
  // ortaya O: iki yönde S'ler varsa iki SOS
  const c: Letter[] = Array(SOS_N * SOS_N).fill(null);
  [6, 8, 16, 18].forEach((i) => (c[i] = 'S'));
  assert.equal(sosLines(c, 12, 'O').length, 2);
  assert.deepEqual(sosMove(b, () => 0), { i: 2, ch: 'S' });
  // boş tahtada hazır SOS bırakmayan bir hamle
  const e: Letter[] = Array(SOS_N * SOS_N).fill(null);
  e[0] = 'S';
  const m = sosMove(e, () => 0.5)!;
  const g = [...e];
  g[m.i] = m.ch;
  g.forEach((x, i) => {
    if (x) return;
    for (const ch of ['S', 'O'] as const) assert.equal(sosLines(g, i, ch).length, 0);
  });
});

test('kâğıda çizilen işaret tanınır: X iki çapraz çizgi, O kapalı halka, S iki kıvrım', () => {
  const line = (a: Pt, b: Pt, n = 12): Pt[] => Array.from({ length: n + 1 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]);
  assert.equal(recognize([line([0, 0], [40, 40]), line([40, 0], [0, 40])]), 'X');
  // titrek X da X
  const shaky = line([0, 0], [40, 42]).map(([x, y], i) => [x + (i % 2 ? 1.5 : -1.5), y] as Pt);
  assert.equal(recognize([shaky, line([42, 2], [2, 40])]), 'X');
  // iki paralel çizgi X değildir
  assert.equal(recognize([line([0, 0], [40, 40]), line([10, 0], [50, 40])]), null);
  const ring: Pt[] = Array.from({ length: 40 }, (_, i) => [20 + 18 * Math.cos((i / 38) * Math.PI * 2), 20 + 20 * Math.sin((i / 38) * Math.PI * 2)]);
  assert.equal(recognize([ring]), 'O');
  const square: Pt[] = [...line([0, 0], [40, 1], 8), ...line([40, 1], [41, 40], 8), ...line([41, 40], [1, 39], 8), ...line([1, 39], [2, 3], 8)];
  assert.equal(recognize([square]), '□');
  const tri: Pt[] = [...line([20, 0], [42, 38], 10), ...line([42, 38], [0, 40], 10), ...line([0, 40], [19, 2], 10)];
  assert.equal(recognize([tri]), '△');
  const m: Pt[] = [...line([0, 40], [8, 0], 8), ...line([8, 0], [20, 30], 8), ...line([20, 30], [32, 0], 8), ...line([32, 0], [40, 40], 8)];
  assert.equal(recognize([m]), 'M');
  // elle çizilmiş, hafif titrek bir O hâlâ O
  const wobbly: Pt[] = Array.from({ length: 60 }, (_, i) => [20 + (19 + Math.sin(i * 1.7)) * Math.cos((i / 58) * Math.PI * 2), 20 + (21 + Math.cos(i * 2.3)) * Math.sin((i / 58) * Math.PI * 2)]);
  assert.equal(recognize([wobbly]), 'O');
  // iki düz çizgiyle T artık oyun açmaz
  assert.equal(recognize([line([0, 0], [40, 2]), line([20, 1], [21, 45])]), null);
  // S: yukarıdan aşağı, sağdan sola, sağa, sola
  const s: Pt[] = [...line([30, 0], [5, 6], 6), ...line([5, 6], [5, 16], 4), ...line([5, 16], [30, 24], 6), ...line([30, 24], [30, 36], 4), ...line([30, 36], [3, 42], 6)];
  assert.equal(recognize([s]), 'S');
  // düz çizgi ve minik nokta bir şey değildir
  assert.equal(recognize([line([0, 0], [60, 5])]), null);
  assert.equal(recognize([line([0, 0], [4, 4])]), null);
});
