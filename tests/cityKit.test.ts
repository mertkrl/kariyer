/*
 * The day-end city's helpers that don't need a canvas: seeded randomness (a scene looks the
 * same every evening), colour maths, coastline lookup, and the servis scene's lane of cars.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clamp, hsl, lerp, makeRng, mix, pick, polyY, range, rgba, scale } from '../src/components/dayend/city/paint';
import { makeCars } from '../src/components/dayend/city/scenes/servisCars';
import { ferryAt, isWater, depthScale, P } from '../src/components/dayend/city/scenes/bosphorus';

test('şehir: aynı tohum aynı sahneyi çizer, değerler [0, 1) aralığında', () => {
  const a = makeRng(1973);
  const b = makeRng(1973);
  const xs = Array.from({ length: 500 }, () => a());
  assert.deepEqual(xs, Array.from({ length: 500 }, () => b()));
  assert.ok(xs.every((x) => x >= 0 && x < 1));
  assert.notDeepEqual(xs.slice(0, 5), Array.from({ length: 5 }, makeRng(1974)));
  const r = makeRng(1);
  for (let i = 0; i < 200; i++) {
    const v = range(r, 10, 20);
    assert.ok(v >= 10 && v < 20);
    assert.ok(['a', 'b', 'c'].includes(pick(r, ['a', 'b', 'c'])));
  }
});

test('şehir: renk yardımcıları', () => {
  assert.equal(rgba([255.9, 10.2, 0], 0.5), 'rgba(255,10,0,0.5)');
  assert.deepEqual(mix([0, 0, 0], [200, 100, 50], 0.5), [100, 50, 25]);
  assert.deepEqual(scale([100, 50, 10], 2), [200, 100, 20]);
  assert.deepEqual(hsl(0, 1, 0.5).map(Math.round), [255, 0, 0]);
  assert.deepEqual(hsl(120, 1, 0.5).map(Math.round), [0, 255, 0]);
  assert.equal(clamp(5, 0, 3), 3);
  assert.equal(lerp(10, 20, 0.25), 12.5);
});

test('şehir: kıyı çizgisi noktalar arasında doğrusal okunur, uçlarda sabit kalır', () => {
  const coast = [[0, 100], [100, 200], [200, 200]] as const;
  assert.equal(polyY(coast, -50), 100);
  assert.equal(polyY(coast, 50), 150);
  assert.equal(polyY(coast, 150), 200);
  assert.equal(polyY(coast, 999), 200);
});

test('servis: yan şeritteki araçlar üst üste binmez', () => {
  const cars = makeCars(makeRng(3131));
  assert.ok(cars.length > 8);
  for (let i = 1; i < cars.length; i++) {
    const gap = cars[i].rx - cars[i].len / 2 - (cars[i - 1].rx + cars[i - 1].len / 2);
    assert.ok(gap >= 1.2, `araç ${i} öndekine ${gap.toFixed(2)} m`);
  }
  assert.deepEqual(makeCars(makeRng(3131)), cars, 'her akşam aynı trafik');
});

test('boğaz: ufkun üstü su değildir, uzaktaki şey küçük görünür', () => {
  assert.equal(isWater(1000, P.vpy - 10), false);
  assert.ok(depthScale(800) > depthScale(500));
  const docked = ferryAt(0);
  assert.equal(docked.moving, false);
  assert.ok(isWater(docked.x, docked.y));
});
