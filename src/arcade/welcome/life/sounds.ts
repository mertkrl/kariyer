import { audioEngine as e } from '../../../audio/audioEngine';

/*
 * Mahallenin canlı sesleri: dosya yok, hepsi ortak ses motorunda üretilir. Yalnızca ses açıkken
 * ve sekme görünürken çalınır (Life.tsx). Ortam sesleri kısık tutulur; sırların sesleri biraz
 * daha belirgin, ama hiçbiri bir oyunun sesinden yüksek değil.
 */

const later = (ms: number, f: () => void) => window.setTimeout(f, ms);
const jitter = (n: number) => n * (0.85 + Math.random() * 0.3);

/** Sesi açana küçük bir ödül: yükselen dört nota ve bir zil. */
export function fanfare() {
  [523, 659, 784, 1047].forEach((f, i) => later(i * 95, () => e.tone({ type: 'triangle', freq: f, decay: 0.22, peak: 0.03 })));
  later(420, () => e.tone({ type: 'sine', freq: 2093, decay: 0.9, peak: 0.018 }));
}

/** Gündüz: iki üç kısa kuş cıvıltısı. */
export function birds() {
  const base = jitter(3200);
  const n = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) later(i * jitter(120), () => e.tone({ type: 'sine', freq: base, freqEnd: base * 1.35, decay: 0.06, peak: 0.008, pan: -0.4 + Math.random() * 0.8 }));
}

/** Gece: cırcır böceği. */
export function crickets() {
  const pan = -0.6 + Math.random() * 1.2;
  for (let i = 0; i < 6; i++) later(i * 55, () => e.tone({ type: 'triangle', freq: 4400, decay: 0.03, peak: 0.004, pan }));
}

/** Uzaktan bir korna. */
export function farHorn() {
  e.tone({ type: 'square', freq: 392, decay: 0.28, peak: 0.004, pan: 0.5 });
  e.tone({ type: 'square', freq: 466, decay: 0.28, peak: 0.003, pan: 0.5 });
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

// ── sırların sesleri ──

export function meow() {
  e.tone({ type: 'sine', freq: 620, freqEnd: 980, attack: 0.04, decay: 0.18, peak: 0.03 });
  later(170, () => e.tone({ type: 'sine', freq: 960, freqEnd: 560, decay: 0.3, peak: 0.025 }));
}

export function flap() {
  for (let i = 0; i < 7; i++) later(i * 60, () => e.noiseHit({ filter: 'bandpass', freq: 900 + i * 80, q: 1.2, attack: 0.005, decay: 0.05, peak: 0.03 }));
}

export function bell() {
  e.tone({ type: 'triangle', freq: 1760, decay: 0.5, peak: 0.03 });
  later(160, () => e.tone({ type: 'triangle', freq: 1760, decay: 0.7, peak: 0.025 }));
}

export function horn() {
  e.tone({ type: 'square', freq: 415, decay: 0.22, peak: 0.02 });
  e.tone({ type: 'square', freq: 523, decay: 0.22, peak: 0.016 });
  later(260, () => {
    e.tone({ type: 'square', freq: 415, decay: 0.3, peak: 0.02 });
    e.tone({ type: 'square', freq: 523, decay: 0.3, peak: 0.016 });
  });
}

export function rumble() {
  e.noiseHit({ filter: 'lowpass', freq: 380, freqEnd: 140, attack: 0.03, decay: 0.6, peak: 0.06 });
}

export function creak() {
  e.tone({ type: 'sawtooth', freq: 140, freqEnd: 190, attack: 0.05, decay: 0.5, peak: 0.01 });
}

export function blip() {
  e.tone({ type: 'square', freq: 1320, decay: 0.05, peak: 0.012 });
  later(80, () => e.tone({ type: 'square', freq: 1760, decay: 0.07, peak: 0.012 }));
}

export function thud() {
  e.noiseHit({ filter: 'lowpass', freq: 600, attack: 0.002, decay: 0.12, peak: 0.05 });
}

/** Bir sır ilk kez bulununca: kısa bir "tadaa". */
export function found() {
  later(250, () => [784, 1175].forEach((f, i) => later(i * 110, () => e.tone({ type: 'sine', freq: f, decay: 0.35, peak: 0.02 }))));
}
