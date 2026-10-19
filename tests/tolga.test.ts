/*
 * Tolga'nın hikâyesi: onu mülakata çağırdıysan Perşembe Kars'ta kar yolu kapatır ve görüşmeyi
 * ekrandan yapmayı rica eder. "Yüz yüze şart" dersen ya da açmazsan listeden düşer.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SNOW_CALL_AT, SNOW_CALL_ID, callFor, strandFinalist, tolgaSnowCall } from '../src/game/day/managerCalls';
import { days } from '../src/game/data/days';
import { THURSDAY } from '../src/game/lib/weekdays';
import { KEY_CHARACTERS } from '../src/game/day/story';
import type { GameState } from '../src/game/store/storeTypes';

test('tolga: kar araması Perşembe öğleden sonra, 17:00\'den önce', () => {
  // CV'si hafta başında gelir; çağrıldıysa Perşembe kar yolu kapatır
  assert.ok(days.slice(0, THURSDAY).some((d) => d.candidateIds.includes('tolga')));
  assert.ok(!days[THURSDAY].final);
  assert.ok(SNOW_CALL_AT > 6 * 60 && SNOW_CALL_AT < 9 * 60);
});

test('tolga: arama ekrandan görüşme ister; biri kabul, biri listeden düşürür', () => {
  const call = tolgaSnowCall(THURSDAY);
  assert.match(call.lines.join(' '), /Kars/);
  assert.equal(call.choices.length, 2);
  assert.equal(call.choices.filter((c) => c.strand === 'tolga').length, 1);
  const viaStore = callFor({ managerRequests: [], managerStance: { refusals: 0, complies: 0 } as never, currentDayIndex: THURSDAY, desk: { calls: {} } as never }, SNOW_CALL_ID);
  assert.equal(viaStore?.caller, 'Tolga Şen');
});

test('tolga: listeden düşen aday hikâyeye "gelemedi" diye yazılır', () => {
  const state = { finalists: [{ id: 'tolga' }, { id: 'kerem' }], story: { stranded: undefined } } as unknown as GameState;
  const patch = strandFinalist(state, 'tolga');
  assert.deepEqual(patch.finalists?.map((f) => f.id), ['kerem']);
  assert.deepEqual(patch.story?.stranded, ['tolga']);
  const tolga = KEY_CHARACTERS.find((k) => k.id === 'tolga');
  assert.ok(tolga?.stranded);
  assert.doesNotMatch(Object.values(tolga.epilogue).join(' '), /yama/);
});

test('tolga: bütün hafta oynanınca, Perşembe çağrılan Tolga için kar araması gerçekten çalar', async () => {
  const { playWeek } = await import('./support/bot');
  const { useGameStore } = await import('../src/game/store/store');
  playWeek(4242, { read: () => 3, decide: (id) => (id === 'tolga' ? 'approve' : 'reject'), comply: () => false });
  const st = useGameStore.getState();
  assert.equal(st.desk.calls[SNOW_CALL_ID], 'answered');
  assert.ok(st.finalists.some((f) => f.id === 'tolga'), 'ekrandan görüşmeyi kabul edince listede kalır');
});
