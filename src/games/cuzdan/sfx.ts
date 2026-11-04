import { audioEngine } from '../../shared/audio/audioEngine';

/*
 * Cüzdan TL'nin sesleri: açılış ezgisi, tık, hata, titreşim ve çevirmeli modem. Hepsi Web Audio
 * ile o an üretilen özgün kısa dizilerdir. Salonun sesi kapalıysa ya da tepsideki hoparlör
 * kapatıldıysa çalmaz; tarayıcı ilk dokunuştan önce ses çalmaz, bağlam ilk çağrıda kurulur.
 */

let ctx: AudioContext | null = null;
let on = true;

export const setSound = (v: boolean) => {
  on = v;
};
export const soundOn = () => on;

function ac() {
  if (!on || audioEngine.isMuted()) return null;
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** [frekans, süre] dizisi; frekans 0 ise sessizlik. Notalar biraz üst üste biner. */
function play(seq: [number, number][], type: OscillatorType = 'sine', vol = 0.06) {
  const c = ac();
  if (!c) return;
  let t = c.currentTime;
  for (const [f, d] of seq) {
    if (f) {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.value = f;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + d);
    }
    t += d * 0.8;
  }
}

export const sfx = {
  chime: () => play([[392, 0.5], [523, 0.5], [659, 0.6], [784, 1.1]], 'triangle', 0.07),
  click: () => play([[1800, 0.03]], 'square', 0.02),
  error: () => play([[440, 0.12], [330, 0.3]], 'square', 0.04),
  ok: () => play([[880, 0.08], [1320, 0.2]], 'triangle', 0.05),
  nudge: () => play([[660, 0.07], [880, 0.07], [660, 0.07], [990, 0.15]], 'sine', 0.05),
  modem: () => play([[1209, 0.15], [1336, 0.15], [1477, 0.15], [941, 0.15], [2100, 0.6], [1300, 0.4], [980, 0.3], [1650, 0.5]], 'square', 0.025),
  hum: () => play([[60, 0.5]], 'sawtooth', 0.05),
};
