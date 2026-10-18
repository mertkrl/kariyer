/*
 * Haftanın müziği: Pazartesi ve Salı sakin, Çarşamba ve Perşembe gergin, Cuma mülakatları gergin,
 * Cuma akşamından sonrası kapanış teması. Her parçanın dosyası public/audio altında durur.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { MUSIC_TRACKS, trackFor } from '../src/audio/musicPlan';

test('haftanın gerginliği parçalara yansır', () => {
  assert.deepEqual([0, 1, 2, 3].map((d) => trackFor('gameplay', d)), ['calm', 'calm', 'tense', 'tense']);
  assert.equal(trackFor('finalRound', 4), 'tense');
  for (const phase of ['offer', 'weekend', 'final'] as const) assert.equal(trackFor(phase, 4), 'resolve');
  assert.equal(trackFor('welcome', 0), null);
  assert.equal(trackFor('dayEnd', 2), null, 'gün sonu o günün parçasıyla kapanır');
});

test('her parçanın dosyası var ve döngüsü makul uzunlukta', () => {
  for (const [name, t] of Object.entries(MUSIC_TRACKS)) {
    const file = new URL(`../public/${t.src.replace(/^\.?\/?/, '')}`, import.meta.url);
    assert.ok(existsSync(file), `${name}: ${t.src} yok`);
    assert.ok(t.loopSeconds > 30 && t.loopSeconds < 180, `${name}: ${t.loopSeconds} sn`);
  }
});
