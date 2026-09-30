/*
 * The sounds the game's rules ask for — a stamp, a buzz, a click — without the rules knowing
 * how sound is made. The page plugs the real audio engine in at start-up (main.tsx); until then,
 * and in tests, every call is silent. This keeps the store free of Web Audio.
 */
import type { audioEngine } from '../audio/audioEngine';

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

/** Called once by the page: from now on the game's sounds are heard. */
export function connectSound(real: Sound) {
  engine = real;
}

/** The connected sound output (silent until connectSound). */
export const sound = (): Sound => engine;
