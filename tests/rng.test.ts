import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rngFor } from '../src/game/rng';

const draw = (r: () => number, n: number) => Array.from({ length: n }, r);

test('aynı tohum ve etiket aynı diziyi verir', () => {
  assert.deepEqual(draw(rngFor(42, 'lineup'), 20), draw(rngFor(42, 'lineup'), 20));
});

test('farklı etiketler birbirinden bağımsız akışlardır', () => {
  assert.notDeepEqual(draw(rngFor(42, 'lineup'), 5), draw(rngFor(42, 'manager'), 5));
});

test('farklı tohumlar farklı dizi verir', () => {
  assert.notDeepEqual(draw(rngFor(1, 'x'), 5), draw(rngFor(2, 'x'), 5));
});

test('değerler [0, 1) aralığında', () => {
  for (const v of draw(rngFor(7, 'range'), 5000)) assert.ok(v >= 0 && v < 1, String(v));
});
