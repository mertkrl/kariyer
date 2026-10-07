/*
 * Ses ayarları, bu tarayıcıda hatırlanır.
 */
import type { GetState, SetState } from '../store/storeApi';
import type { SettingsActions } from '../store/storeTypes';
import { MUSIC_VOLUME_KEY, MUTED_STORAGE_KEY, SFX_VOLUME_KEY, storeVolume } from '../lib/prefs';
import { sound } from '../lib/sound';

export const createSettingsSlice = (set: SetState, get: GetState): SettingsActions => ({
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
