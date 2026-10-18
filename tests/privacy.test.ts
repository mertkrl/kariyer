import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clearAllGameData } from '../src/game/lib/privacy';
import { writeSave } from '../src/game/store/save';
import { useGameStore } from '../src/game/store/store';

test('verilerimi sil yalnızca oyunun kayıtlarını siler', async () => {
  localStorage.clear();
  writeSave(useGameStore.getState());
  localStorage.setItem('kariyerweb-muted', 'true');
  localStorage.setItem('baska-site', 'kalsın');
  await clearAllGameData();
  assert.equal(localStorage.getItem('kariyerweb-save'), null);
  assert.equal(localStorage.getItem('kariyerweb-muted'), null);
  assert.equal(localStorage.getItem('baska-site'), 'kalsın');
});

test('verilerimi sil oyunun çevrimdışı kopyasını da siler, başka önbelleğe dokunmaz', async () => {
  const names = new Set(['sen-iksin-abc123', 'baska-site-cache']);
  const g = globalThis as { caches?: unknown };
  g.caches = {
    keys: async () => [...names],
    delete: async (n: string) => names.delete(n),
  };
  try {
    await clearAllGameData();
    assert.deepEqual([...names], ['baska-site-cache']);
  } finally {
    delete g.caches;
  }
});
