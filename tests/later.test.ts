import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cancelLater, later } from '../src/game/later';
import { useGameStore } from '../src/game/store';

test('yeni hafta, eski haftanın bekleyen olaylarını iptal eder', async () => {
  let fired = 0;
  later(() => fired++, 10);
  useGameStore.getState().restart();
  later(() => fired += 10, 10);
  await new Promise((r) => setTimeout(r, 40));
  assert.equal(fired, 10);
  cancelLater();
});
