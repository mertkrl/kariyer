/*
 * The day-end city scenes: boats stay on the water. The Ortaköy vapur is followed through a
 * whole crossing-and-back cycle and the small boats through ten minutes of drifting; at every
 * step both ends of each hull must be over the Bosphorus, never on either shore.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FERRY_HALF, boatAfloat, ferryAt, isWater, spawnBoats, stepBoat } from '../src/components/dayend/city/scenes/bosphorus';
import { makeRng } from '../src/components/dayend/city/kit';

test('the Ortaköy vapur never runs aground', () => {
  for (let t = 0; t <= 150; t += 0.25) {
    const f = ferryAt(t);
    for (const end of [-FERRY_HALF, FERRY_HALF]) {
      assert.ok(isWater(f.x + end * f.s, f.y + 20 * f.s), `vapur on land at t=${t}`);
    }
  }
});

test('small boats spawn afloat and turn back before the shore', () => {
  const boats = spawnBoats(makeRng(1973));
  assert.ok(boats.length >= 4);
  for (let i = 0; i < 600 * 20; i++) {
    for (const b of boats) {
      stepBoat(b, 0.05);
      assert.ok(boatAfloat(b.x, b.y, b.len), `boat on land at ${Math.round(b.x)},${Math.round(b.y)}`);
    }
  }
});
