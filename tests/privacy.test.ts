import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clearAllGameData } from '../src/game/privacy';
import { writeSave } from '../src/game/save';
import { useGameStore } from '../src/game/store';

test('verilerimi sil yalnızca oyunun kayıtlarını siler', () => {
  localStorage.clear();
  writeSave(useGameStore.getState());
  localStorage.setItem('kariyerweb-muted', 'true');
  localStorage.setItem('baska-site', 'kalsın');
  clearAllGameData();
  assert.equal(localStorage.getItem('kariyerweb-save'), null);
  assert.equal(localStorage.getItem('kariyerweb-muted'), null);
  assert.equal(localStorage.getItem('baska-site'), 'kalsın');
});
