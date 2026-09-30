/*
 * The save: one checkpoint at the start of each day, kept in this browser's localStorage.
 * Nothing leaves the device — there is no server. A private window or cleared site data
 * simply means there is nothing to continue.
 */
import type { GameState } from './storeTypes';

const SAVE_KEY = 'kariyerweb-save';
/** Bump when the saved shape changes, and add a step to MIGRATIONS if old saves can be carried over. */
export const SAVE_VERSION = 2;
/** Preferences have their own storage and are not part of a save. */
const NOT_SAVED = ['muted', 'musicVolume', 'sfxVolume'];

export interface SaveFile {
  version: number;
  savedAt: number;
  data: Partial<GameState>;
}

type SaveData = Record<string, unknown>;

/**
 * How to bring a save from version n to n + 1. A version with no step here can't be carried
 * over, and its save is ignored rather than half-loaded.
 */
const MIGRATIONS: Record<number, (data: SaveData) => SaveData> = {};

export function writeSave(state: GameState) {
  const data = Object.fromEntries(Object.entries(state).filter(([key, value]) => typeof value !== 'function' && !NOT_SAVED.includes(key)));
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, savedAt: Date.now(), data } satisfies SaveFile));
  } catch {
    // storage unavailable or full — the game just won't be resumable
  }
}

const isRecord = (v: unknown): v is SaveData => typeof v === 'object' && v !== null && !Array.isArray(v);
const kind = (v: unknown) => (v === null || v === undefined ? 'empty' : Array.isArray(v) ? 'array' : typeof v);

/**
 * The save's fields that fit the game as it is now. `fresh` is a new week's state: a field the
 * game no longer has is dropped, and a field whose kind changed (a list that became a record,
 * say) makes the whole save unusable. Empty values (null) are allowed either way.
 */
export function checkSave(data: unknown, fresh: object): Partial<GameState> | null {
  if (!isRecord(data)) return null;
  if (typeof data.phase !== 'string' || typeof data.currentDayIndex !== 'number') return null;
  const shape = fresh as SaveData;
  const kept: SaveData = {};
  for (const [key, value] of Object.entries(data)) {
    if (!(key in shape)) continue;
    const want = kind(shape[key]);
    const got = kind(value);
    if (want !== got && want !== 'empty' && got !== 'empty') return null;
    kept[key] = value;
  }
  return kept as Partial<GameState>;
}

export function readSave(): SaveFile | null {
  try {
    const save: unknown = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null');
    if (!isRecord(save) || typeof save.version !== 'number' || !isRecord(save.data)) return null;
    let { version, data } = save;
    while (version < SAVE_VERSION && MIGRATIONS[version]) data = MIGRATIONS[version++](data);
    if (version !== SAVE_VERSION) return null;
    return { version, savedAt: typeof save.savedAt === 'number' ? save.savedAt : 0, data: data as Partial<GameState> };
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
