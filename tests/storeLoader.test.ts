import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadStore, withStore } from '../src/game/storeLoader';

test('oyun bir kez yüklenir, sonraki çağrılar aynı modülü alır', async () => {
  const a = await loadStore();
  const b = await loadStore();
  assert.equal(a, b);
  assert.equal(typeof a.useGameStore.getState().startGame, 'function');
});

test('oyun yüklendikten sonra withStore beklemeden çalışır', async () => {
  await loadStore();
  let ran = false;
  withStore(() => {
    ran = true;
  });
  assert.equal(ran, true, 'tıklamanın kullanıcı hareketi (ses izni) korunmalı');
});
