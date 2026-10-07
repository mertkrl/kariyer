/*
 * Oyun kurallarının istediği sesler (damga, vızıltı, tık) ama kurallar sesin nasıl yapıldığını
 * bilmeden. Sayfa açılışta gerçek ses motorunu bağlar (main.tsx); o zamana kadar ve testlerde her
 * çağrı sessizdir. Bu, store'u Web Audio'dan bağımsız tutar.
 */
import type { audioEngine } from '../../audio/audioEngine';

type Engine = typeof audioEngine;
export type Sound = Pick<
  Engine,
  'init' | 'startAmbient' | 'setMuted' | 'setMusicVolume' | 'setSfxVolume' | 'playUi' | 'playStamp' | 'playUndo' | 'playPhoneBuzz' | 'playHandset' | 'playSip' | 'startPour'
>;

const noop = () => {};
const silent: Sound = {
  init: noop,
  startAmbient: noop,
  setMuted: noop,
  setMusicVolume: noop,
  setSfxVolume: noop,
  playUi: noop,
  playStamp: noop,
  playUndo: noop,
  playPhoneBuzz: noop,
  playHandset: noop,
  playSip: noop,
  startPour: () => ({ setFill: noop, stop: noop }),
};

let engine: Sound = silent;

/** Sayfa bir kez çağırır: bundan sonra oyunun sesleri duyulur. */
export function connectSound(real: Sound) {
  engine = real;
}

/** Bağlı ses çıkışı (connectSound'a kadar sessiz). */
export const sound = (): Sound => engine;
