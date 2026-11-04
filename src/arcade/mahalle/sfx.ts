import { audio, ifReady } from '../../shared/audio/lazy';

/*
 * Mahallenin sesleri: dosya yok, ortak ses motoruyla üretilir ve sitenin sessiz tercihine uyar.
 * Tarayıcı ilk dokunuştan önce ses çalmaz: `wake` ilk dokunuşta çağrılır. Motor tembel iner
 * (shared/audio/lazy.ts): gelmeden çalınan süs sesi atlanır.
 */

export const wake = () => audio.init();

/** Bir yerin üstüne gelince: kısa, yumuşak bir tık. */
export function hover() {
  ifReady((e) => e.tone({ type: 'sine', freq: 1500, freqEnd: 1900, decay: 0.05, peak: 0.012 }));
}

/** İçeri girerken: hafif bir rüzgâr. */
export function enter() {
  ifReady((e) => e.noiseHit({ filter: 'bandpass', freq: 500, freqEnd: 2600, q: 0.7, attack: 0.06, decay: 0.32, peak: 0.05 }));
}

/** Asansörün kat düğmesi. */
export function press() {
  ifReady((e) => {
    e.noiseHit({ filter: 'highpass', freq: 2400, attack: 0.001, decay: 0.03, peak: 0.05 });
    e.tone({ type: 'triangle', freq: 420, decay: 0.06, peak: 0.02 });
  });
}


/** Fazla mesai: uzaktan bir klavye tuşu. */
export function keyTap() {
  ifReady((e) => e.noiseHit({ filter: 'highpass', freq: 3200 + Math.random() * 1200, attack: 0.001, decay: 0.02, peak: 0.012 }));
}

/** Fazla mesai: floresanın uğultusu (uzun, kısık bir 100 Hz). */
export function hum() {
  ifReady((e) => e.tone({ type: 'sawtooth', freq: 100, attack: 0.8, decay: 3.2, peak: 0.004 }));
}

/** Lambalar yanarken: kısa bir şıkırtı. */
export function lampOn() {
  ifReady((e) => e.tone({ type: 'triangle', freq: 880, freqEnd: 660, decay: 0.08, peak: 0.012 }));
}
