import { audioEngine } from '../../audio/audioEngine';

/*
 * Defterin sesleri: dosya yok, hepsi ortak ses motoruyla üretilir ve sitenin sessiz tercihine
 * uyar. Kâğıt hışırtısı, kopan bant, patron gelince klavyeye vuran eller ve kâğıda kalem. Tarayıcı ilk
 * dokunuştan önce ses çalmaz: `wake` ilk dokunuşta çağrılır.
 */

const e = audioEngine;

export const wake = () => e.init();

/** Kartın üstüne gelince: çok hafif bir kâğıt hışırtısı. */
export function rustle() {
  e.noiseHit({ filter: 'bandpass', freq: 3200, freqEnd: 1800, q: 0.9, attack: 0.02, decay: 0.12, peak: 0.018 });
}

/** Bant kopar: yükselen, çıtırtılı bir yırtılma. */
export function rip() {
  const now = e.ensureContext().currentTime;
  e.noiseHit({ filter: 'bandpass', freq: 900, freqEnd: 4200, q: 1.2, when: now, attack: 0.01, decay: 0.16, peak: 0.07 });
  for (let i = 0; i < 4; i++) e.noiseHit({ filter: 'highpass', freq: 3000, when: now + 0.02 + i * 0.035, attack: 0.001, decay: 0.012, peak: 0.03 });
}

/** Patron geliyor: klavyeye hızlı hızlı vuran eller ve pencere değişimi. */
export function boss() {
  const now = e.ensureContext().currentTime;
  for (let i = 0; i < 7; i++) e.noiseHit({ filter: 'highpass', freq: 2600 + (i % 3) * 500, when: now + i * 0.055, attack: 0.001, decay: 0.018, peak: 0.05 });
  e.noiseHit({ filter: 'bandpass', freq: 600, freqEnd: 2400, q: 0.8, when: now + 0.42, attack: 0.03, decay: 0.12, peak: 0.04 });
}

/** Kâğıda kalemle bir işaret: kısa, kuru bir sürtünme (SOS ve XOX). */
export function scribble() {
  const now = e.ensureContext().currentTime;
  e.noiseHit({ filter: 'bandpass', freq: 2400, freqEnd: 3600, q: 1.6, when: now, attack: 0.008, decay: 0.07, peak: 0.03 });
  e.noiseHit({ filter: 'bandpass', freq: 3000, freqEnd: 2000, q: 1.6, when: now + 0.08, attack: 0.008, decay: 0.06, peak: 0.025 });
}
