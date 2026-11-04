import { audioEngine } from '../../shared/audio/audioEngine';

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


/** Fazla mesai: uzaktan bir klavye tuşu. */
export function keyTap() {
  e.noiseHit({ filter: 'highpass', freq: 3200 + Math.random() * 1200, attack: 0.001, decay: 0.02, peak: 0.012 });
}

/** Fazla mesai: floresanın uğultusu (uzun, kısık bir 100 Hz). */
export function hum() {
  e.tone({ type: 'sawtooth', freq: 100, attack: 0.8, decay: 3.2, peak: 0.004 });
}

/** Lambalar yanarken: kısa bir şıkırtı. */
export function lampOn() {
  e.tone({ type: 'triangle', freq: 880, freqEnd: 660, decay: 0.08, peak: 0.012 });
}
