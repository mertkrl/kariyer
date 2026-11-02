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

/** Kat geldi: iki notalı asansör zili. */
export function ding() {
  const now = e.ensureContext().currentTime;
  e.tone({ type: 'sine', freq: 1318, when: now, decay: 0.9, peak: 0.05 });
  e.tone({ type: 'sine', freq: 1046, when: now + 0.28, decay: 1.1, peak: 0.05 });
}

/** Kapılar kapanır: uzun, boğuk bir sürtünme. */
export function doors() {
  e.noiseHit({ filter: 'lowpass', freq: 900, freqEnd: 300, attack: 0.08, decay: 0.5, peak: 0.05 });
}
