/*
 * Tolga's thread: on the day the AI is down, IT's fix turns out to be his open-source patch,
 * and the call that says so knows what you did with his file that morning.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { callsForDay } from '../src/game/desk';
import { callFor, tolgaPatchCall } from '../src/game/managerCalls';
import { days } from '../src/game/data/days';
import { THURSDAY } from '../src/game/weekdays';
import { KEY_CHARACTERS } from '../src/game/story';

test('tolga: yama araması yapay zekânın çöktüğü gün, öğleden sonra çalar', () => {
  const call = callsForDay(THURSDAY).find((c) => c.id === 'it-patch');
  assert.ok(call);
  assert.equal(days[THURSDAY].aiDown, true);
  assert.ok(days[THURSDAY].candidateIds.includes('tolga'));
  assert.ok(call.at > 6 * 60 && call.at < 9 * 60, 'öğle arasından sonra, 17:00\'den önce');
});

test('tolga: arama, sabah dosyasıyla ne yaptığını bilir', () => {
  const text = (d: 'approve' | 'reject' | undefined) => tolgaPatchCall(d, THURSDAY).lines.join(' ');
  assert.match(text('reject'), /kuyruğunda değil miydi/);
  assert.match(text('approve'), /Mülakata çağırmışsın/);
  assert.match(text(undefined), /duruyor olabilir mi/);
  for (const d of ['approve', 'reject', undefined] as const) assert.equal(tolgaPatchCall(d, THURSDAY).choices.length, 2);
  const viaStore = callFor({ managerRequests: [], managerStance: { refusals: 0, complies: 0 } as never, currentDayIndex: THURSDAY, desk: { calls: {} } as never, decisions: { tolga: 'reject' } }, 'it-patch');
  assert.match(viaStore?.lines.join(' ') ?? '', /kuyruğunda değil miydi/);
});

test('tolga: bir yıl sonrası yamayı hatırlar', () => {
  const tolga = KEY_CHARACTERS.find((k) => k.id === 'tolga');
  assert.ok(tolga);
  for (const line of Object.values(tolga.epilogue)) assert.match(line, /yama|sistem/i);
});
