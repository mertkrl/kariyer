/*
 * Sound preferences, kept in this browser apart from the save. Light on purpose: the page reads
 * them before the first sound plays, long before the game itself has loaded.
 */
export const MUTED_STORAGE_KEY = 'kariyerweb-muted';

export const MUSIC_VOLUME_KEY = 'kariyerweb-music-volume';
export const SFX_VOLUME_KEY = 'kariyerweb-sfx-volume';
export const DEFAULT_VOLUME = 0.8;

export function readStoredMuted(): boolean {
  try {
    return localStorage.getItem(MUTED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function readStoredVolume(key: string): number {
  try {
    const raw = localStorage.getItem(key);
    const value = raw === null ? NaN : Number(raw);
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : DEFAULT_VOLUME;
  } catch {
    return DEFAULT_VOLUME;
  }
}

export function storeVolume(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Storage unavailable (private mode etc.) — the setting just won't persist.
  }
}

export const initialMusicVolume = readStoredVolume(MUSIC_VOLUME_KEY);
export const initialSfxVolume = readStoredVolume(SFX_VOLUME_KEY);
