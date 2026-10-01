import type { EngineCore } from '../engineCore';
import { FLOOD_BOOST } from '../engineCore';
import type { ScatterPaper } from '../engineCore';

/* The application flood that opens each day: a riser under the counter, paper flying in and landing. */

/** Tension riser under the incoming-applications counter. */
export function startFloodRiser(engine: EngineCore, duration: number) {
  const ctx = engine.ensureContext();
  if (!engine.sfxIn) return;
  stopFloodRiser(engine, 0.05);
  const t0 = ctx.currentTime;
  const end = t0 + duration;

  const src = engine.noiseSource(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 4;
  filter.frequency.setValueAtTime(140, t0);
  filter.frequency.exponentialRampToValueAtTime(3200, end);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.1 * FLOOD_BOOST, end - 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, end + 0.25);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(engine.sfxIn);
  engine.startNoise(src, t0);
  src.stop(end + 0.3);

  const sub = ctx.createOscillator();
  sub.frequency.setValueAtTime(70, t0);
  sub.frequency.exponentialRampToValueAtTime(140, end);
  const subGain = ctx.createGain();
  subGain.gain.setValueAtTime(0.0001, t0);
  subGain.gain.exponentialRampToValueAtTime(0.08 * FLOOD_BOOST, end - 0.05);
  subGain.gain.exponentialRampToValueAtTime(0.0001, end + 0.2);
  sub.connect(subGain);
  subGain.connect(engine.sfxIn);
  sub.start(t0);
  sub.stop(end + 0.3);

  engine.riserStop = (fade: number) => {
    const now = ctx.currentTime;
    for (const g of [gain.gain, subGain.gain]) {
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(0, now + fade);
    }
    try {
      src.stop(now + fade + 0.02);
      sub.stop(now + fade + 0.02);
    } catch {
      // already stopped
    }
  };
}

export function stopFloodRiser(engine: EngineCore, fade = 0.15) {
  engine.riserStop?.(fade);
  engine.riserStop = null;
}

/**
 * Mechanical counter tick. `pitch` 0–1 moves it up (counting up) or down (counting down),
 * so the listener "hears" the direction of the number.
 */
export function playCounterTick(engine: EngineCore, pitch: number) {
  engine.noiseHit({ filter: 'bandpass', freq: 3800, q: 2, attack: 0.001, decay: 0.012, peak: 0.07 * FLOOD_BOOST });
  engine.tone({ type: 'triangle', freq: 900 + pitch * 900, attack: 0.001, decay: 0.03, peak: 0.035 * FLOOD_BOOST });
}

/** A single CV sliding in: short downward "fwip" of paper, panned to where it came from. */
export function playPaperIn(engine: EngineCore, pan: number) {
  engine.noiseHit({ filter: 'bandpass', freq: 3400, freqEnd: 900, q: 1.4, attack: 0.02, decay: 0.08, peak: 0.07 * FLOOD_BOOST, pan });
  // Soft "gulp" as the core swallows it
  engine.tone({ freq: 240, freqEnd: 120, attack: 0.005, decay: 0.07, peak: 0.05 * FLOOD_BOOST, pan: pan * 0.3 });
}

/** A sheet of paper settling onto a surface: soft, dry, low "tap-shhh". */
export function playPaperLand(engine: EngineCore, pan: number) {
  engine.noiseHit({ filter: 'lowpass', freq: 1800, attack: 0.002, decay: 0.05, peak: 0.07 * FLOOD_BOOST, pan });
  engine.noiseHit({ filter: 'bandpass', freq: 3000, freqEnd: 1500, q: 0.9, attack: 0.01, decay: 0.12, peak: 0.025 * FLOOD_BOOST, pan });
}

/**
 * The AI flings rejected CVs away: sub impact + air "whoomp", then one fluttering paper
 * per CV, each panned to its flight direction. `chaotic` (AI crash day) adds a glitchy
 * failing-machine layer and an error beep.
 */
export function playScatter(engine: EngineCore, papers: ScatterPaper[], chaotic: boolean) {
  const ctx = engine.ensureContext();
  const now = ctx.currentTime;

  engine.tone({ freq: 90, freqEnd: 34, attack: 0.004, decay: 0.55, peak: 0.7 * FLOOD_BOOST });
  engine.noiseHit({ filter: 'lowpass', freq: 1400, freqEnd: 200, attack: 0.004, decay: 0.3, peak: 0.35 * FLOOD_BOOST });
  engine.noiseHit({ filter: 'bandpass', freq: 500, freqEnd: 140, q: 1.2, attack: 0.03, decay: 0.45, peak: 0.25 * FLOOD_BOOST });

  // Paper flutter: amplitude-modulated band-limited noise (a flapping sheet, ~16–28 Hz).
  const papersToVoice = papers.slice(0, 28);
  for (const p of papersToVoice) {
    const duration = 0.22 + Math.random() * 0.3;
    const rate = 16 + Math.random() * 12;
    const steps = 64;
    const curve = new Float32Array(steps);
    for (let i = 0; i < steps; i++) {
      const x = i / (steps - 1);
      const env = Math.min(1, x / 0.08) * (1 - x) ** 1.6;
      const flap = 0.45 + 0.55 * Math.abs(Math.sin(Math.PI * rate * duration * x));
      curve[i] = env * flap * (0.03 + Math.random() * 0.012) * FLOOD_BOOST;
    }
    engine.noiseHit({
      filter: 'bandpass',
      freq: 1800 + Math.random() * 2600,
      q: 1.1,
      when: now + p.delay + 0.02,
      decay: duration,
      peak: 0,
      pan: p.pan,
      curve,
    });
  }

  if (chaotic) {
    const glitch = ctx.createOscillator();
    glitch.type = 'square';
    const shaper = ctx.createWaveShaper();
    const k = 40;
    const shape = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i / 255) * 2 - 1;
      shape[i] = Math.round(((1 + k) * x) / (1 + k * Math.abs(x)) * 4) / 4; // drive + crude bit reduction
    }
    shaper.curve = shape;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.05, now);
    g.gain.linearRampToValueAtTime(0.0001, now + 1.6);
    for (let t = 0; t < 1.6; t += 0.035) {
      glitch.frequency.setValueAtTime(60 + Math.random() * 520, now + t);
    }
    glitch.connect(shaper);
    shaper.connect(g);
    if (engine.sfxIn) g.connect(engine.sfxIn);
    glitch.start(now);
    glitch.stop(now + 1.65);

    [0, 0.18, 0.36].forEach((offset, i) => {
      engine.tone({ type: 'square', freq: i === 2 ? 220 : 440, when: now + 0.9 + offset, attack: 0.003, decay: 0.12, peak: 0.045 });
    });
  }
}
