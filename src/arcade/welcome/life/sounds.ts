import { audioEngine as e } from '../../../audio/audioEngine';
import { RAIN_SRC } from '../../../audio/engineCore';

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

// ── yaşayan şehrin sesleri: konuma göre sağa sola yerleşir ──

/** Görseldeki x'e göre stereo konum. */
export const panAt = (x: number) => Math.max(-0.9, Math.min(0.9, x / 576 - 1));

/** Sert fren: lastik cıyaklaması. */
export function screech() {
  e.tone({ type: 'sawtooth', freq: 1900, freqEnd: 1300, attack: 0.02, decay: 0.5, peak: 0.012 });
  e.noiseHit({ filter: 'bandpass', freq: 3200, freqEnd: 2200, q: 4, attack: 0.02, decay: 0.45, peak: 0.03 });
}

/** Araba kornası: iki ses birden, kısa. */
export function carHorn(pan = 0) {
  const f = 360 + Math.random() * 80;
  e.tone({ type: 'square', freq: f, decay: 0.26, peak: 0.012, pan });
  e.tone({ type: 'square', freq: f * 1.25, decay: 0.26, peak: 0.009, pan });
}

/** Otobüsün kalın kornası. */
export function busHorn() {
  e.tone({ type: 'sawtooth', freq: 196, decay: 0.5, peak: 0.016, pan: -0.2 });
  e.tone({ type: 'sawtooth', freq: 247, decay: 0.5, peak: 0.012, pan: -0.2 });
}

/** Otobüs durur: havalı frenin tıslaması. */
export function busBrake() {
  e.noiseHit({ filter: 'highpass', freq: 3500, attack: 0.01, decay: 0.7, peak: 0.03, pan: -0.2 });
}

/** Otobüs kapısı: tıslama, sonra kapanma tokluğu. */
export function busDoor() {
  e.noiseHit({ filter: 'highpass', freq: 2800, attack: 0.01, decay: 0.35, peak: 0.03, pan: -0.2 });
  later(330, () => e.noiseHit({ filter: 'lowpass', freq: 380, attack: 0.002, decay: 0.12, peak: 0.05, pan: -0.2 }));
}

/** Kuryenin motoru gazlanır. */
export function rev() {
  e.tone({ type: 'sawtooth', freq: 90, freqEnd: 260, attack: 0.05, decay: 0.8, peak: 0.02 });
  e.tone({ type: 'square', freq: 45, freqEnd: 130, attack: 0.05, decay: 0.8, peak: 0.008 });
}

/** Şemsiye ters döner: hışırtılı bir patlama. */
export function umbrellaPop() {
  e.noiseHit({ filter: 'bandpass', freq: 900, freqEnd: 2400, q: 1, attack: 0.005, decay: 0.18, peak: 0.05 });
  e.tone({ type: 'triangle', freq: 320, freqEnd: 180, decay: 0.12, peak: 0.02 });
}

/** Tepsideki bardaklar birbirine değer. */
export function clinks() {
  for (let i = 0; i < 4; i++) later(i * 70 + Math.random() * 40, () => e.tone({ type: 'sine', freq: 2900 + Math.random() * 900, decay: 0.18, peak: 0.012 }));
}

/** Top yere vurur: güce göre tok bir ses. */
export function bounce(level = 0.5) {
  e.tone({ type: 'sine', freq: 140 + level * 60, freqEnd: 90, decay: 0.08, peak: 0.03 * level, pan: 0.2 });
  e.noiseHit({ filter: 'lowpass', freq: 900, attack: 0.001, decay: 0.04, peak: 0.02 * level, pan: 0.2 });
}

/** Şut. */
export function kick() {
  e.noiseHit({ filter: 'lowpass', freq: 700, attack: 0.001, decay: 0.08, peak: 0.07, pan: 0.2 });
  e.tone({ type: 'sine', freq: 180, freqEnd: 80, decay: 0.1, peak: 0.04, pan: 0.2 });
}

/** Balon kaçar: lastik gıcırtısı. */
export function squeak() {
  e.tone({ type: 'sine', freq: 900, freqEnd: 1700, attack: 0.02, decay: 0.2, peak: 0.016, pan: -0.5 });
}

/** Köpek havlar: iki formantlı kısa patlama. */
export function bark() {
  const t = (f: number, peak: number) => e.tone({ type: 'sawtooth', freq: f, freqEnd: f * 0.7, attack: 0.008, decay: 0.12, peak, pan: 0.3 });
  t(420, 0.022);
  t(860, 0.01);
  e.noiseHit({ filter: 'bandpass', freq: 1200, q: 1.2, attack: 0.005, decay: 0.08, peak: 0.02, pan: 0.3 });
}

/** Martı: "kiyav" diye yükselip düşen gırtlaksı çağrı. */
export function gull() {
  const pan = -0.6 + Math.random() * 1.2;
  for (let i = 0; i < 3; i++)
    later(i * 190, () => {
      e.tone({ type: 'sawtooth', freq: 1250, freqEnd: 820, attack: 0.03, decay: 0.2, peak: 0.009, pan });
      e.tone({ type: 'triangle', freq: 2400, freqEnd: 1700, attack: 0.03, decay: 0.16, peak: 0.006, pan });
    });
}

/** Kara kedi mırlar. */
export function purr() {
  for (let i = 0; i < 10; i++) later(i * 42, () => e.noiseHit({ filter: 'lowpass', freq: 220, attack: 0.005, decay: 0.03, peak: 0.03, pan: -0.4 }));
}

/** Kaynak kıvılcımı: çıtırtı. */
export function crackle() {
  for (let i = 0; i < 6; i++) later(Math.random() * 160, () => e.noiseHit({ filter: 'highpass', freq: 4000 + Math.random() * 3000, attack: 0.001, decay: 0.015, peak: 0.02, pan: 0.6 }));
}

/** Çekiç: metale tok vuruş. */
export function hammer() {
  e.tone({ type: 'triangle', freq: 1400, decay: 0.1, peak: 0.008, pan: 0.6 });
  e.noiseHit({ filter: 'bandpass', freq: 2000, q: 2, attack: 0.001, decay: 0.05, peak: 0.012, pan: 0.6 });
}

/** "GOL!": bütün mahalleden kabaran uğultu ve düdükler. */
export function cheer() {
  e.noiseHit({ filter: 'bandpass', freq: 900, freqEnd: 1300, q: 0.7, attack: 0.25, decay: 1.6, peak: 0.08, pan: -0.4 });
  for (let i = 0; i < 3; i++) later(200 + i * 280, () => e.tone({ type: 'sine', freq: 2600, freqEnd: 2900, attack: 0.02, decay: 0.25, peak: 0.01, pan: -0.6 + i * 0.5 }));
}

/** Duman halkası: yumuşak bir "puf". */
export function puff() {
  e.noiseHit({ filter: 'lowpass', freq: 400, freqEnd: 180, attack: 0.02, decay: 0.25, peak: 0.05, pan: -0.3 });
}

/** Rüzgârdaki kâğıt hışırtısı. */
export function rustle() {
  for (let i = 0; i < 5; i++) later(i * 50, () => e.noiseHit({ filter: 'highpass', freq: 2500 + Math.random() * 2000, attack: 0.005, decay: 0.04, peak: 0.02 }));
}

/** Uzak gök gürültüsü. */
export function thunder() {
  e.noiseHit({ filter: 'lowpass', freq: 160, freqEnd: 60, attack: 0.3, decay: 3, peak: 0.12 });
}

let rainStop: (() => void) | null = null;

/** Yağmur: kayıttan döngü (yüklenemezse üretilmiş hışırtı); yavaşça açılıp kapanır. */
export function rain(on: boolean) {
  if (on && !rainStop) {
    const ctx = e.ensureContext();
    if (!e.sfxIn) return;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, ctx.currentTime);
    out.gain.exponentialRampToValueAtTime(0.6, ctx.currentTime + 2.5);
    out.connect(e.sfxIn);
    const sources: AudioScheduledSourceNode[] = [];
    let alive = true;
    e.loopSample(RAIN_SRC, out, 0.7, sources, () => alive, () => {
      const n = e.noiseSource(ctx);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 3000;
      f.Q.value = 0.4;
      const g = ctx.createGain();
      g.gain.value = 0.05;
      n.connect(f);
      f.connect(g);
      g.connect(out);
      e.startNoise(n, ctx.currentTime);
      sources.push(n);
    });
    rainStop = () => {
      alive = false;
      const t = ctx.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), t);
      out.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);
      later(2700, () => {
        sources.forEach((src) => {
          try {
            src.stop();
          } catch {
            // zaten durmuş
          }
        });
        out.disconnect();
      });
    };
  } else if (!on && rainStop) {
    rainStop();
    rainStop = null;
  }
}
