/*
 * Sound settings, remembered in this browser.
 */
import type { GetState, SetState } from '../storeApi';
import type { GameState } from '../storeTypes';
import { MUSIC_VOLUME_KEY, MUTED_STORAGE_KEY, SFX_VOLUME_KEY, storeVolume } from '../storeDefaults';
import { sound } from '../sound';

export const createSettingsSlice = (set: SetState, get: GetState): Pick<GameState, 'setMusicVolume' | 'setSfxVolume' | 'toggleMute'> => ({
  setMusicVolume: (value) => {
    sound().setMusicVolume(value);
    storeVolume(MUSIC_VOLUME_KEY, value);
    set({ musicVolume: value });
  },

  setSfxVolume: (value) => {
    sound().setSfxVolume(value);
    storeVolume(SFX_VOLUME_KEY, value);
    set({ sfxVolume: value });
  },

  toggleMute: () => {
    const next = !get().muted;
    sound().setMuted(next);
    try {
      localStorage.setItem(MUTED_STORAGE_KEY, String(next));
    } catch {
      // localStorage unavailable — ignore, mute preference just won't persist
    }
    set({ muted: next });
  },
});
