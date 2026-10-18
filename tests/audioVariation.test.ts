/*
 * Aynı efekt her çalınışta biraz farklı: perde, ses düzeyi ve filtre küçük ve sınırlı oynar.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeVariation } from '../src/audio/engineCore';
import { rngFor } from '../src/game/lib/rng';

test('efekt sapması küçük ve sınırlı kalır', () => {
  const rand = rngFor(7, 'sfx');
  for (let i = 0; i < 500; i++) {
    const v = makeVariation(rand);
    assert.ok(Math.abs(v.pitch - 1) <= 0.015 + 1e-9, `perde ${v.pitch}`);
    assert.ok(Math.abs(v.gain - 1) <= 0.1 + 1e-9, `ses ${v.gain}`);
    assert.ok(Math.abs(v.filter - 1) <= 0.06 + 1e-9, `filtre ${v.filter}`);
  }
});

test('elli damga elli farklı ses', () => {
  const rand = rngFor(8, 'sfx');
  const pitches = new Set(Array.from({ length: 50 }, () => makeVariation(rand).pitch.toFixed(5)));
  assert.ok(pitches.size >= 45, `yalnızca ${pitches.size} farklı perde`);
});
