import { audioEngine } from '../../audio/audioEngine';

/*
 * Mahallenin sesleri: dosya yok, ortak ses motoruyla üretilir ve sitenin sessiz tercihine uyar.
 * Tarayıcı ilk dokunuştan önce ses çalmaz: `wake` ilk dokunuşta çağrılır.
 */

const e = audioEngine;

export const wake = () => e.init();

/** Bir yerin üstüne gelince: kısa, yumuşak bir tık. */
export function hover() {
  e.tone({ type: 'sine', freq: 1500, freqEnd: 1900, decay: 0.05, peak: 0.012 });
}

/** İçeri girerken: hafif bir rüzgâr. */
export function enter() {
  e.noiseHit({ filter: 'bandpass', freq: 500, freqEnd: 2600, q: 0.7, attack: 0.06, decay: 0.32, peak: 0.05 });
}

/** Asansörün kat düğmesi. */
export function press() {
  e.noiseHit({ filter: 'highpass', freq: 2400, attack: 0.001, decay: 0.03, peak: 0.05 });
  e.tone({ type: 'triangle', freq: 420, decay: 0.06, peak: 0.02 });
}

