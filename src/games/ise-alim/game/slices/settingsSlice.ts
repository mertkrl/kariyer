/*
 * Ses ayarları, bu tarayıcıda hatırlanır.
 */
import type { GetState, SetState } from '../store/storeApi';
import type { SettingsActions } from '../store/storeTypes';
import { MUSIC_VOLUME_KEY, SFX_VOLUME_KEY, storeMuted, storeVolume } from '../../../../shared/prefs';
import { sound } from '../../../../shared/sound';

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
    storeMuted(next);
    set({ muted: next });
  },
});
