/*
 * Hafta dengesi: Vicdan dibe yapışmaz, hikâyenin insanları kuyruğun ilk yarısındadır, Ozan'ın
 * gizli puanı hikâyesiyle tutarlıdır.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VICDAN_SOFT_FLOOR, addVicdan } from '../src/game/storeDefaults';
import { KEY_CAST, STORY_FIXED, makeLineups } from '../src/game/lineups';
import { rngFor } from '../src/game/rng';
import { candidateDetails } from '../src/game/data/candidateDetails';
import { caseVerdict } from '../src/game/interview';

test('vicdan: eşiğin üstünde kayıp olduğu gibi işler, altında hafifler, kazanç hep tam işler', () => {
  assert.equal(addVicdan(60, -4), 56);
  assert.equal(addVicdan(VICDAN_SOFT_FLOOR, -4), VICDAN_SOFT_FLOOR - 4);
  assert.equal(addVicdan(20, -4), 18);
  assert.ok(addVicdan(8, -4) >= 7);
  assert.equal(addVicdan(5, 3), 8);
  assert.equal(addVicdan(99, 5), 100);
  // art arda kayıplar sıfıra yapışmaz
  let v = 50;
  for (let i = 0; i < 40; i++) v = addVicdan(v, -2);
  assert.ok(v > 0, `kırk kayıptan sonra ${v}`);
});

test('kuyruk: hikâyenin insanları her tohumda kendi günlerinin ilk yarısında', () => {
  const story = [...KEY_CAST, ...STORY_FIXED];
  for (let seed = 1; seed <= 200; seed++) {
    const lineups = makeLineups(rngFor(seed, 'lineups'));
    for (const day of lineups)
      for (const id of day.filter((x) => story.includes(x))) {
        assert.ok(day.indexOf(id) <= Math.ceil(day.length / 2) + story.length, `tohum ${seed}: ${id} sırada ${day.indexOf(id)}/${day.length}`);
      }
  }
});

test('ozan: teknik olarak güçlü, ama işe alınınca kötü çıkar', () => {
  assert.equal(candidateDetails.ozan?.hireFit, 2);
  assert.match(caseVerdict('ozan'), /çözdü/);
});
