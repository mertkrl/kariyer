import type { EngineCore } from '../engineCore';
import type { PourSound } from '../engineCore';

/* The lunch break: the bell at noon, and the foley of eating and drinking. */

/**
 * Electric lunch bell (school/factory style): a hammer striking a small gong ~22×/s,
 * built from the bell's inharmonic modes, rung twice — "zırrr… zırr" — with a short
 * corridor echo so it sounds like it comes from the hallway.
 */
export function playLunchBell(engine: EngineCore) {
  const ctx = engine.ensureContext();
  if (!engine.sfxIn) return;
  const now = ctx.currentTime + 0.02;

  const echo = ctx.createDelay(0.5);
  echo.delayTime.value = 0.11;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.28;
  const echoOut = ctx.createGain();
  echoOut.gain.value = 0.35;
  echo.connect(feedback);
  feedback.connect(echo);
  echo.connect(echoOut);
  echoOut.connect(engine.sfxIn);

  const bell = ctx.createGain();
  bell.gain.value = 0.9;
  bell.connect(engine.sfxIn);
  bell.connect(echo);

  const rings: [number, number][] = [
    [0, 1.5],
    [1.85, 0.9],
  ];
  const strikeRate = 22;
  const pointsPerSecond = 600;

  for (const [start, length] of rings) {
    const total = length + 0.9; // ring + natural decay
    const n = Math.ceil(total * pointsPerSecond);
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / pointsPerSecond;
      if (t < length) {
        const phase = (t * strikeRate) % 1;
        curve[i] = 0.45 + 0.55 * Math.exp(-phase * 9); // each hammer hit re-excites the gong
      } else {
        curve[i] = Math.exp(-(t - length) * 6) * 0.6;
      }
      curve[i] *= Math.min(1, t / 0.01);
    }
    const ringGain = ctx.createGain();
    ringGain.gain.value = 0;
    ringGain.gain.setValueCurveAtTime(curve, now + start, total);
    ringGain.connect(bell);

    for (const [ratio, amp] of [
      [1, 0.05],
      [2.32, 0.035],
      [4.25, 0.022],
      [6.63, 0.012],
    ]) {
      const osc = ctx.createOscillator();
      osc.frequency.value = 1080 * ratio;
      const g = ctx.createGain();
      g.gain.value = amp;
      osc.connect(g);
      g.connect(ringGain);
      osc.start(now + start);
      osc.stop(now + start + total + 0.05);
    }

    // Hammer buzz: bright noise ticking at the strike rate
    const buzz = engine.noiseSource(ctx);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 5000;
    const buzzGain = ctx.createGain();
    buzzGain.gain.value = 0;
    const buzzCurve = curve.map((v, i) => (i / pointsPerSecond < length ? v * 0.05 : 0));
    buzzGain.gain.setValueCurveAtTime(buzzCurve, now + start, total);
    buzz.connect(hp);
    hp.connect(buzzGain);
    buzzGain.connect(bell);
    engine.startNoise(buzz, now + start, total + 0.05);
  }

  window.setTimeout(() => {
    bell.disconnect();
    echoOut.disconnect();
    feedback.disconnect();
  }, 5000);
}

/** A cat's purr: a low rumble pulsing about eleven times a second. */
export function playPurr(engine: EngineCore) {
  for (let i = 0; i < 20; i++) engine.playNoise(0.07, 'lowpass', 160, 0.35, i * 0.09);
}

/** Short slurp for sipping tea, soup or ayran. */
export function playSip(engine: EngineCore) {
  engine.playNoise(0.28, 'bandpass', 900, 0.35);
}

/** Soft crunch for a bite of food. */
export function playBite(engine: EngineCore) {
  engine.playNoise(0.1, 'lowpass', 700, 0.4);
  engine.playNoise(0.08, 'lowpass', 500, 0.3, 0.12);
}

/** Wet squish for squeezing a lemon wedge. */
export function playSqueeze(engine: EngineCore) {
  engine.playNoise(0.18, 'bandpass', 1600, 0.3);
  engine.playNoise(0.14, 'bandpass', 2600, 0.18, 0.38);
  engine.playNoise(0.14, 'bandpass', 2200, 0.16, 0.76);
}

/**
 * Liquid pouring into a tulip glass. The defining cue of a real pour is the air column above
 * the liquid: as it shortens, its resonance rises — so a band-passed noise "throat" plus a
 * narrower glassy partial track 1/(air length). Turbulence is a pair of slow LFOs on the level,
 * bubble "blips" pitch up with the fill, and the stop ends in a couple of drips.
 * Brew (from the demlik) is a thin, bright trickle; water (from the kettle) is fuller and louder.
 */
export function startPour(engine: EngineCore, kind: 'brew' | 'water'): PourSound {
  const ctx = engine.ensureContext();
  if (!engine.sfxIn) return { setFill: () => {}, stop: () => {} };
  const now = ctx.currentTime;
  const water = kind === 'water';
  const level = water ? 0.26 : 0.16;

  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, now);
  out.gain.exponentialRampToValueAtTime(level, now + 0.05);
  out.connect(engine.sfxIn);

  const src = engine.noiseSource(ctx);
  const throat = ctx.createBiquadFilter();
  throat.type = 'bandpass';
  throat.Q.value = water ? 4 : 6;
  const glassy = ctx.createBiquadFilter();
  glassy.type = 'bandpass';
  glassy.Q.value = 14;
  const glassyGain = ctx.createGain();
  glassyGain.gain.value = 0.55;
  const hiss = ctx.createBiquadFilter();
  hiss.type = 'highpass';
  hiss.frequency.value = water ? 3500 : 5000;
  const hissGain = ctx.createGain();
  hissGain.gain.value = water ? 0.18 : 0.1;

  src.connect(throat);
  throat.connect(out);
  src.connect(glassy);
  glassy.connect(glassyGain);
  glassyGain.connect(out);
  src.connect(hiss);
  hiss.connect(hissGain);
  hissGain.connect(out);
  engine.startNoise(src, now);

  // Turbulence: two unsynced LFOs wobble the level
  const lfos = [9.5, 13.7].map((rate) => {
    const o = ctx.createOscillator();
    o.frequency.value = rate;
    const d = ctx.createGain();
    d.gain.value = level * 0.18;
    o.connect(d);
    d.connect(out.gain);
    o.start(now);
    return o;
  });

  // Initial splash as the stream first hits the liquid (or the empty glass bottom)
  engine.noiseHit({ filter: 'bandpass', freq: 1800, q: 1.2, attack: 0.002, decay: 0.07, peak: water ? 0.14 : 0.08 });

  let fill = 0;
  const base = water ? 380 : 520;
  const setFill = (f: number) => {
    fill = Math.max(0, Math.min(0.95, f));
    // Resonance ∝ 1 / (remaining air column)
    const freq = base / (1 - fill * 0.85);
    const t = ctx.currentTime;
    throat.frequency.setTargetAtTime(freq, t, 0.03);
    glassy.frequency.setTargetAtTime(freq * 2.3, t, 0.03);
  };
  setFill(0);

  const bubbles = window.setInterval(() => {
    if (Math.random() > (water ? 0.55 : 0.35)) return;
    const f = (base * 2.2) / (1 - fill * 0.8);
    engine.tone({ freq: f * (0.9 + Math.random() * 0.4), freqEnd: f * 1.5, attack: 0.002, decay: 0.03, peak: 0.018 + Math.random() * 0.014, pan: Math.random() * 0.4 - 0.2 });
  }, 38);

  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    window.clearInterval(bubbles);
    const t = ctx.currentTime;
    out.gain.cancelScheduledValues(t);
    out.gain.setValueAtTime(out.gain.value, t);
    out.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    src.stop(t + 0.12);
    lfos.forEach((o) => o.stop(t + 0.12));
    // Last drips from the spout: rising "plink" (a drop's cavity collapsing)
    [0.22, 0.55].forEach((offset, i) => {
      const f = 1500 + fill * 900 + i * 180;
      engine.tone({ freq: f, freqEnd: f * 1.6, when: t + offset, attack: 0.002, decay: 0.05, peak: 0.05 });
    });
    window.setTimeout(() => out.disconnect(), 400);
  };

  return { setFill, stop };
}

/** Glass-and-spoon clink; `count` rapid clinks for stirring. */
export function playClink(engine: EngineCore, count = 1) {
  const ctx = engine.ensureContext();
  for (let i = 0; i < count; i++) {
    const when = ctx.currentTime + i * 0.16;
    engine.tone({ freq: 3150 + Math.random() * 80, when, attack: 0.004, decay: 0.35, peak: 0.09 });
    engine.tone({ freq: 4720 + Math.random() * 80, when, attack: 0.004, decay: 0.3, peak: 0.05 });
  }
}
