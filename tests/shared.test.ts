import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hash01, mulberry32 } from '../src/shared/random';
import { contrast, luminance, mixHex, toneHex } from '../src/shared/color';
import { isChunkError } from '../src/arcade/shell/errors';

// Ortak yardımcılar oyunların eski kopyalarının yerine geçti: tohumlu diziler değişirse kayıtlar,
// "günün kavşağı" ve paylaşılan bağlantılar başka dünya üretir. Değerler eski kopyalardan alındı.

test('mulberry32: eski kopyalarla aynı dizi (tohum 42)', () => {
  const r = mulberry32(42);
  assert.deepEqual([r(), r(), r()], [0.6011037519201636, 0.44829055899754167, 0.8524657934904099]);
});

test('mulberry32: eksi ve kesirli tohum 32 bite kırpılır', () => {
  const a = mulberry32(-5);
  const b = mulberry32(-5 >>> 0);
  assert.equal(a(), b());
  assert.equal(mulberry32(3.9)(), mulberry32(3)());
});

test('hash01: eski sahne kopyalarıyla aynı değer', () => {
  assert.equal(hash01(1), 0.10468242550996365);
  assert.equal(hash01(17), 0.06731167519092196);
});

test('renk: ara renk, ton ve kırpma', () => {
  assert.equal(mixHex('#000000', '#ffffff', 0.5), '#808080');
  assert.equal(mixHex('#102030', '#405060', 2), '#405060');
  assert.equal(toneHex('#808080', 1), '#ffffff');
  assert.equal(toneHex('#808080', -1), '#000000');
  assert.equal(toneHex('#b9573a', 0), '#b9573a');
});

test('renk: WCAG parlaklık ve kontrast', () => {
  assert.equal(luminance('#ffffff'), 1);
  assert.equal(luminance('#000000'), 0);
  assert.equal(Math.round(contrast('#ffffff', '#000000')), 21);
  // Kavşak Amiri'nin "Oyna" düğmesi: koyu yazı sarı zeminde okunur olmalı
  assert.ok(contrast('#1b1607', '#ffb81c') >= 4.5);
});

test('parça yükleme hataları tanınır, sıradan hatalar tanınmaz', () => {
  assert.ok(isChunkError(new TypeError('Failed to fetch dynamically imported module: /assets/BakkalGame-x.js')));
  assert.ok(isChunkError(new Error('Unable to preload CSS for /assets/ClockOut-k.css')));
  assert.ok(isChunkError(new TypeError('Importing a module script failed.')));
  assert.ok(isChunkError(new Error('error loading dynamically imported module')));
  assert.ok(!isChunkError(new Error("Cannot read properties of undefined (reading 'x')")));
});
