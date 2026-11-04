import { audioEngine as e } from '../../../audio/audioEngine';

/*
 * Vapurun sesleri: dosya yok, ortak ses motorunda üretilir. Düdük kalın ve uzun, dalga sesi
 * kısık ve yavaş, martılar uzaktan. Sitenin sessiz tercihine motor zaten uyar.
 */

const later = (ms: number, f: () => void) => window.setTimeout(f, ms);

/** Vapur düdüğü: iki kalın ses birlikte, uzun. */
export function horn(long = true) {
  const decay = long ? 2.6 : 1.1;
  e.tone({ type: 'sawtooth', freq: 110, attack: 0.18, decay, peak: 0.05 });
  e.tone({ type: 'sawtooth', freq: 138.6, attack: 0.18, decay, peak: 0.035 });
  e.tone({ type: 'sine', freq: 55, attack: 0.25, decay, peak: 0.06 });
}

/** Gövdeye vuran bir dalga. */
export function wave() {
  e.noiseHit({ filter: 'lowpass', freq: 700 + Math.random() * 300, freqEnd: 220, attack: 0.6, decay: 1.8, peak: 0.035, pan: -0.5 + Math.random() });
}

/** Uzaktan bir martı. */
export function gull() {
  const pan = -0.7 + Math.random() * 1.4;
  const f = 1500 + Math.random() * 400;
  for (let i = 0; i < 3; i++) later(i * 170, () => e.tone({ type: 'triangle', freq: f, freqEnd: f * 0.7, attack: 0.02, decay: 0.16, peak: 0.012, pan }));
}

/** Çay bardağı tabağa konunca: ince bir tın. */
export function clink() {
  e.tone({ type: 'sine', freq: 2640, decay: 0.35, peak: 0.02 });
  later(70, () => e.tone({ type: 'sine', freq: 3520, decay: 0.25, peak: 0.012 }));
}

/** Nefes: yavaşça kabaran, sonra sönen bir hışırtı. */
export function breath(inhale: boolean) {
  e.noiseHit({ filter: 'bandpass', freq: inhale ? 500 : 900, freqEnd: inhale ? 900 : 400, q: 0.6, attack: inhale ? 2.6 : 0.4, decay: inhale ? 1 : 3, peak: 0.02 });
}

/** Geri sayımın tıkı. */
export function tick(last: boolean) {
  e.tone({ type: 'triangle', freq: last ? 880 : 660, decay: 0.12, peak: 0.025 });
}

/** Vapurun makinesi: güvertenin altından gelen kalın, kısık bir uğultu. */
export function engine() {
  e.tone({ type: 'sine', freq: 46, attack: 1.2, decay: 3, peak: 0.03 });
  e.tone({ type: 'triangle', freq: 92, attack: 1.2, decay: 2.6, peak: 0.006 });
}

/** Simit martıya gidince: kanat çırpışı ve sevinçli bir çığlık. */
export function snatch() {
  for (let i = 0; i < 6; i++) later(i * 70, () => e.noiseHit({ filter: 'bandpass', freq: 1000 + i * 90, q: 1.1, attack: 0.005, decay: 0.05, peak: 0.025 }));
  later(380, gull);
}
