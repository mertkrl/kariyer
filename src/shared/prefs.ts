/*
 * Ses tercihleri, kayıttan ayrı olarak bu tarayıcıda tutulur. Bilerek hafif: sayfa onları ilk ses
 * çalmadan, oyunun kendisi yüklenmeden çok önce okur.
 */

import { readText, writeText } from './storage';
export const MUTED_STORAGE_KEY = 'kariyerweb-muted';

export const MUSIC_VOLUME_KEY = 'kariyerweb-music-volume';
export const SFX_VOLUME_KEY = 'kariyerweb-sfx-volume';
export const DEFAULT_VOLUME = 0.8;

export const readStoredMuted = (): boolean => readText(MUTED_STORAGE_KEY) === 'true';

export const storeMuted = (muted: boolean) => writeText(MUTED_STORAGE_KEY, String(muted));

export function readStoredVolume(key: string): number {
  const raw = readText(key);
  const value = raw === null ? NaN : Number(raw);
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : DEFAULT_VOLUME;
}

export const storeVolume = (key: string, value: number) => writeText(key, String(value));

export const initialMusicVolume = readStoredVolume(MUSIC_VOLUME_KEY);
export const initialSfxVolume = readStoredVolume(SFX_VOLUME_KEY);
