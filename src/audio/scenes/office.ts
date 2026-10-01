import type { EngineCore } from '../engineCore';
import { RAIN_SRC } from '../engineCore';

/* The open-plan office while you work: air conditioning, keyboards, distant phones, rain on the window. */

/**
 * Open-plan office bed for the workday: room tone + air conditioning, colleagues typing in
 * bursts around the room, a distant desk phone, the printer and a low murmur of voices, plus
 * the wall clock. `setUrgency(1)` in the last hour doubles the clock and brings it forward.
 */
export function startOfficeAmbience(engine: EngineCore, rain = false): { setUrgency: (u: number) => void; stop: () => void } {
  const ctx = engine.ensureContext();
  if (!engine.sfxIn) return { setUrgency: () => {}, stop: () => {} };
  const bus = ctx.createGain();
  bus.gain.setValueAtTime(0, ctx.currentTime);
  bus.gain.linearRampToValueAtTime(1, ctx.currentTime + 2);
  bus.connect(engine.sfxIn);
  const sources: AudioScheduledSourceNode[] = [];
  const timers: number[] = [];
  let urgency = 0;
  let stopped = false;

  const bed = (type: BiquadFilterType, freq: number, q: number, level: number) => {
    const src = engine.noiseSource(ctx);
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = level;
    src.connect(f);
    f.connect(g);
    g.connect(bus);
    engine.startNoise(src, ctx.currentTime);
    sources.push(src);
    return g;
  };
  bed('lowpass', 220, 0.5, 0.02); // room tone / AC
  // a rainy day: the recording, soft, as heard through the office windows
  if (rain) engine.loopSample(RAIN_SRC, bus, 0.35, sources, () => !stopped, () => {});
  const murmur = bed('bandpass', 520, 0.9, 0.012); // voices, far away
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.23;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 0.007;
  lfo.connect(lfoDepth);
  lfoDepth.connect(murmur.gain);
  lfo.start();
  sources.push(lfo);

  const later = (seconds: number, fn: () => void) => timers.push(window.setTimeout(fn, seconds * 1000));
  const every = (min: number, max: number, fn: () => void, first: number) => {
    const loop = () => {
      if (stopped) return;
      fn();
      later(min + Math.random() * (max - min), loop);
    };
    later(first, loop);
  };

  const typingBurst = () => {
    const pan = Math.random() * 1.6 - 0.8;
    const keys = 6 + Math.floor(Math.random() * 18);
    let t = ctx.currentTime;
    for (let i = 0; i < keys; i++) {
      t += 0.06 + Math.random() * 0.09 + (Math.random() < 0.1 ? 0.25 : 0);
      engine.noiseHit({ filter: 'highpass', freq: 2600, when: t, attack: 0.001, decay: 0.008, peak: 0.02 + Math.random() * 0.015, pan });
      engine.noiseHit({ filter: 'bandpass', freq: 650, q: 1.5, when: t, attack: 0.001, decay: 0.015, peak: 0.012, pan });
    }
  };
  const deskPhone = () => {
    const pan = Math.random() * 1.4 - 0.7;
    for (let ring = 0; ring < 2; ring++) {
      const start = ctx.currentTime + ring * 1.6;
      for (let i = 0; i < 18; i++) {
        engine.tone({ type: 'square', freq: i % 2 ? 1180 : 1420, when: start + i * 0.06, attack: 0.003, decay: 0.05, peak: 0.006, pan });
      }
    }
  };
  const printer = () => {
    const steps = 48;
    const curve = new Float32Array(steps);
    for (let i = 0; i < steps; i++) curve[i] = (0.4 + 0.6 * Math.abs(Math.sin(i * 1.3))) * Math.min(1, i / 4, (steps - i) / 6) * 0.03;
    engine.noiseHit({ filter: 'bandpass', freq: 900, freqEnd: 1300, q: 2, when: ctx.currentTime, decay: 2.6, peak: 0, curve, pan: 0.6 });
  };

  every(3, 9, typingBurst, 1);
  every(4, 11, typingBurst, 3.5);
  every(28, 55, deskPhone, 14);
  every(40, 75, printer, 24);

  // Wall clock: one tick per real second, twice as fast and closer in the last hour.
  let tock = false;
  const tick = () => {
    if (stopped) return;
    tock = !tock;
    engine.tone({ type: 'triangle', freq: tock ? 1900 : 2400, attack: 0.001, decay: 0.02, peak: 0.012 + urgency * 0.02, pan: -0.5 });
    later(urgency > 0.5 ? 0.5 : 1, tick);
  };
  later(0.5, tick);

  return {
    setUrgency: (u) => {
      urgency = Math.max(0, Math.min(1, u));
    },
    stop: () => {
      if (stopped) return;
      stopped = true;
      const now = ctx.currentTime;
      bus.gain.cancelScheduledValues(now);
      bus.gain.setValueAtTime(bus.gain.value, now);
      bus.gain.linearRampToValueAtTime(0, now + 0.8);
      timers.forEach((t) => window.clearTimeout(t));
      sources.forEach((src) => {
        try {
          src.stop(now + 0.85);
        } catch {
          // already stopped
        }
      });
      window.setTimeout(() => bus.disconnect(), 1200);
    },
  };
}
