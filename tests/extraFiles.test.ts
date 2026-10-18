import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useGameStore } from '../src/game/store/store';
import { EXTRA_FILES_FROM, addExtraFiles } from '../src/game/day/clock';
import { lineupFor } from '../src/game/store/storeDefaults';

test('işi erken bitirene ek dosyalar 14:00\'ten önce gelmez', () => {
  const s = () => useGameStore.getState();
  s().restart();
  s().startGame();
  s().publishJob('standart');
  s().proceedToBriefing();
  s().beginDay();
  const decisions = Object.fromEntries(lineupFor(s()).map((id) => [id, 'reject' as const]));
  useGameStore.setState({ decisions, workdayMinutes: 60 });
  assert.equal(addExtraFiles(), false);
  useGameStore.setState({ workdayMinutes: EXTRA_FILES_FROM });
  const before = lineupFor(s());
  assert.equal(addExtraFiles(), true);
  assert.ok(s().phone.some((m) => m.thread === 'manager' && /İşi bitirmişsin/.test(m.text)));
  // yeni dosyalar kuyruğun en üstünde
  const after = lineupFor(s());
  assert.deepEqual(after.slice(after.length - before.length), before);
  assert.ok(!before.includes(after[0]));
});

test('bütün dosyaları kapatan "Günü Bitir" ile hemen çıkabilir', () => {
  const s = () => useGameStore.getState();
  s().restart();
  s().startGame();
  s().publishJob('standart');
  s().proceedToBriefing();
  s().beginDay();
  const decisions = Object.fromEntries(lineupFor(s()).map((id) => [id, 'reject' as const]));
  useGameStore.setState({ decisions, workdayMinutes: 60 });
  s().finishDay();
  assert.equal(s().phase, 'dayEnd');
});
