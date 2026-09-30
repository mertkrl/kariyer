/*
 * The save: one checkpoint at the start of each day, kept in this browser's localStorage.
 * Nothing leaves the device — there is no server. A private window or cleared site data
 * simply means there is nothing to continue.
 */
import type { GameState } from './storeTypes';

const SAVE_KEY = 'kariyerweb-save';
/** Bump when the saved shape changes: older saves are then ignored rather than half-loaded. */
const SAVE_VERSION = 2;
/** Preferences have their own storage and are not part of a save. */
const NOT_SAVED = ['muted', 'musicVolume', 'sfxVolume'];

export interface SaveFile {
  version: number;
  savedAt: number;
  data: Partial<GameState>;
}

export function writeSave(state: GameState) {
  const data = Object.fromEntries(Object.entries(state).filter(([key, value]) => typeof value !== 'function' && !NOT_SAVED.includes(key)));
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, savedAt: Date.now(), data } satisfies SaveFile));
  } catch {
    // storage unavailable or full — the game just won't be resumable
  }
}

export function readSave(): SaveFile | null {
  try {
    const save = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null') as SaveFile | null;
    return save && save.version === SAVE_VERSION && save.data ? save : null;
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // nothing to clear
  }
}
