import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SAVE_VERSION, checkSave, clearSave, readSave, saveWasLost, writeSave } from '../src/game/save';
import { loadSave, useGameStore } from '../src/game/store';
import type { GameState } from '../src/game/storeTypes';

const KEY = 'kariyerweb-save';
const state = () => useGameStore.getState();

test('kayıt yazılıp aynen geri okunur, ayarlar ve fonksiyonlar kayda girmez', () => {
  localStorage.clear();
  state().restart();
  useGameStore.setState({ currentDayIndex: 2, performans: 61, vicdan: 38, phase: 'briefing' });
  writeSave(state());
  const save = readSave();
  assert.ok(save);
  assert.equal(save.version, SAVE_VERSION);
  assert.equal(save.data.performans, 61);
  assert.equal(save.data.currentDayIndex, 2);
  assert.equal('muted' in save.data, false);
  assert.equal('tick' in save.data, false);
});

test('bozuk JSON, eski sürüm ve boş kayıt yok sayılır', () => {
  localStorage.setItem(KEY, '{bozuk');
  assert.equal(readSave(), null);
  localStorage.setItem(KEY, JSON.stringify({ version: SAVE_VERSION - 1, savedAt: 1, data: { phase: 'briefing', currentDayIndex: 0 } }));
  assert.equal(readSave(), null);
  localStorage.setItem(KEY, JSON.stringify({ version: SAVE_VERSION, savedAt: 1, data: 'yok' }));
  assert.equal(readSave(), null);
  clearSave();
  assert.equal(readSave(), null);
});

test('şekli değişmiş alan kaydı geçersiz kılar, artık olmayan alan atılır', () => {
  const fresh = { phase: 'welcome', currentDayIndex: 0, finalists: [], hiredId: null } as Partial<GameState>;
  assert.equal(checkSave({ phase: 'briefing', currentDayIndex: 1, finalists: {} }, fresh), null);
  assert.equal(checkSave({ currentDayIndex: 1 }, fresh), null);
  const ok = checkSave({ phase: 'briefing', currentDayIndex: 1, hiredId: 'ece', eskiAlan: 3 }, fresh);
  assert.deepEqual(ok, { phase: 'briefing', currentDayIndex: 1, hiredId: 'ece' });
});

test('oyunda artık olmayan adayı anan kayıt silinir', () => {
  state().restart();
  writeSave({ ...state(), phase: 'briefing', lineups: [['hayalet-aday']] });
  assert.equal(loadSave(), null);
  assert.equal(localStorage.getItem(KEY), null);
});

test('olmayan bir güne ait kayıt silinir', () => {
  state().restart();
  writeSave({ ...state(), phase: 'briefing', currentDayIndex: 99 });
  assert.equal(loadSave(), null);
});

test('devam et kaydı olduğu gibi yükler', () => {
  state().restart();
  writeSave({ ...state(), phase: 'briefing', currentDayIndex: 3, vicdan: 12 });
  state().restart();
  state().continueGame();
  assert.equal(state().currentDayIndex, 3);
  assert.equal(state().vicdan, 12);
  assert.equal(state().phase, 'briefing');
});

test('kullanılamayan kayıt oyuncuya söylenir, kayıt hiç yoksa söylenmez', () => {
  clearSave();
  assert.equal(readSave(), null);
  assert.equal(saveWasLost(), false);
  localStorage.setItem(KEY, JSON.stringify({ version: SAVE_VERSION - 1, savedAt: 1, data: { phase: 'briefing', currentDayIndex: 0 } }));
  assert.equal(readSave(), null);
  assert.equal(saveWasLost(), true);
  clearSave();
  assert.equal(saveWasLost(), false);
  localStorage.setItem(KEY, '{bozuk');
  assert.equal(readSave(), null);
  assert.equal(saveWasLost(), true);
  state().restart();
  writeSave({ ...state(), phase: 'briefing', currentDayIndex: 99 });
  assert.equal(loadSave(), null);
  assert.equal(saveWasLost(), true);
});
