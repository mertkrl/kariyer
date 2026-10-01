import type { EngineCore } from '../engineCore';
import { RAIN_SRC } from '../engineCore';
import { playFerryHorn, playGullCall } from './harbour';

/* After work: the city on the way home, one sound bed per day-end scene. */

/**
 * "İş çıkışı hengamesi": the city at 17:05. A traffic bed with cars whooshing past left→right,
 * horns (short taps and the odd long angry one), crowd murmur, footsteps clattering down
 * stairs, Istanbulkart turnstile beeps — plus one signature per scene: office elevator dings,
 * metrobüs air brakes, the metro arriving + station chime, the ferry horn and gulls.
 */
export function startRushHourAmbience(engine: EngineCore, scene: 0 | 1 | 2 | 3): () => void {
  const ctx = engine.ensureContext();
  if (!engine.sfxIn) return () => {};
  const bus = ctx.createGain();
  bus.gain.setValueAtTime(0, ctx.currentTime);
  bus.gain.linearRampToValueAtTime(1, ctx.currentTime + 2.5);
  bus.connect(engine.sfxIn);
  const sources: AudioScheduledSourceNode[] = [];
  const timers: number[] = [];
  let stopped = false;

  const bed = (type: BiquadFilterType, freq: number, q: number, level: number, lfoRate = 0, lfoDepth = 0) => {
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
    if (lfoRate) {
      const o = ctx.createOscillator();
      o.frequency.value = lfoRate;
      const d = ctx.createGain();
      d.gain.value = lfoDepth;
      o.connect(d);
      d.connect(g.gain);
      o.start();
      sources.push(o);
    }
  };
  const every = (min: number, max: number, fn: () => void, first: number) => {
    const loop = () => {
      if (stopped) return;
      fn();
      timers.push(window.setTimeout(loop, (min + Math.random() * (max - min)) * 1000));
    };
    timers.push(window.setTimeout(loop, first * 1000));
  };

  // Car passing: a band-passed whoosh that pans across and swells as it goes by.
  const carPass = () => {
    const now = ctx.currentTime;
    const dur = 1.6 + Math.random() * 1.4;
    const src = engine.noiseSource(ctx);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 0.8;
    f.frequency.setValueAtTime(350, now);
    f.frequency.linearRampToValueAtTime(700, now + dur * 0.5);
    f.frequency.linearRampToValueAtTime(300, now + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.12, now + dur * 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    const pan = ctx.createStereoPanner();
    const dir = Math.random() < 0.5 ? 1 : -1;
    pan.pan.setValueAtTime(-0.9 * dir, now);
    pan.pan.linearRampToValueAtTime(0.9 * dir, now + dur);
    src.connect(f);
    f.connect(g);
    g.connect(pan);
    pan.connect(bus);
    engine.startNoise(src, now, dur + 0.1);
  };
  // Car horn: two detuned square tones through a small-speaker band-pass.
  const horn = () => {
    const now = ctx.currentTime;
    const long = Math.random() < 0.2;
    const taps = long ? 1 : 1 + Math.floor(Math.random() * 2);
    const pan = Math.random() * 1.6 - 0.8;
    const base = 380 + Math.random() * 120;
    for (let t = 0; t < taps; t++) {
      const when = now + t * 0.22;
      const len = long ? 0.9 + Math.random() * 0.6 : 0.12 + Math.random() * 0.08;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 900;
      bp.Q.value = 1.2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(0.05, when + 0.015);
      g.gain.setValueAtTime(0.05, when + len);
      g.gain.exponentialRampToValueAtTime(0.0001, when + len + 0.05);
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      bp.connect(g);
      g.connect(p);
      p.connect(bus);
      for (const freq of [base, base * 1.26]) {
        const o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.value = freq;
        o.connect(bp);
        o.start(when);
        o.stop(when + len + 0.06);
      }
    }
  };
  // Footsteps down concrete stairs: quick heel thumps with a stairwell echo.
  const stairs = () => {
    const steps = 6 + Math.floor(Math.random() * 7);
    const pan = Math.random() * 1.2 - 0.6;
    let t = ctx.currentTime;
    for (let i = 0; i < steps; i++) {
      t += 0.26 + Math.random() * 0.06;
      engine.noiseHit({ filter: 'lowpass', freq: 900, when: t, attack: 0.002, decay: 0.05, peak: 0.07, pan });
      engine.noiseHit({ filter: 'bandpass', freq: 2600, q: 2, when: t + 0.01, attack: 0.001, decay: 0.02, peak: 0.02, pan });
      engine.noiseHit({ filter: 'lowpass', freq: 700, when: t + 0.12, attack: 0.002, decay: 0.08, peak: 0.02, pan: -pan });
    }
  };
  // Istanbulkart validator: two short high beeps.
  const turnstile = () => {
    const now = ctx.currentTime;
    const pan = Math.random() * 1.2 - 0.6;
    engine.tone({ type: 'square', freq: 2350, when: now, attack: 0.002, decay: 0.06, peak: 0.018, pan });
    engine.tone({ type: 'square', freq: 2350, when: now + 0.11, attack: 0.002, decay: 0.08, peak: 0.018, pan });
  };

  bed('lowpass', 380, 0.6, 0.05, 0.07, 0.02); // city traffic rumble
  bed('bandpass', 650, 0.9, 0.02, 0.19, 0.01); // crowd murmur
  every(1.8, 4.5, carPass, 0.6);
  every(4, 10, horn, 2);
  every(6, 13, stairs, 1.5);
  every(5, 11, turnstile, 3);

  switch (scene) {
    case 0: // office lobby: elevator dings
      every(9, 16, () => {
        engine.tone({ freq: 1318.5, attack: 0.004, decay: 0.8, peak: 0.05 });
        engine.tone({ freq: 1046.5, when: ctx.currentTime + 0.35, attack: 0.004, decay: 1.1, peak: 0.05 });
      }, 4);
      break;
    case 1: // metrobüs: air brakes + door beeps
      every(8, 14, () => {
        engine.noiseHit({ filter: 'highpass', freq: 2500, attack: 0.01, decay: 0.9, peak: 0.08, pan: 0.3 });
        [0.9, 1.2, 1.5].forEach((d) => engine.tone({ type: 'square', freq: 1600, when: ctx.currentTime + d, attack: 0.002, decay: 0.12, peak: 0.02, pan: 0.3 }));
      }, 3);
      break;
    case 2: // servis gridlock in the rain: the rain recording, impatient horns, idling diesels, door hiss
      engine.loopSample(RAIN_SRC, bus, 0.45, sources, () => !stopped, () => bed('bandpass', 2600, 0.4, 0.018));
      bed('lowpass', 90, 0.8, 0.05, 0.4, 0.02);
      every(1.2, 3.2, horn, 1);
      every(7, 12, () => {
        engine.noiseHit({ filter: 'highpass', freq: 2200, attack: 0.01, decay: 0.7, peak: 0.07, pan: 0.4 });
      }, 2);
      break;
    case 3: // ferry pier: horn + gulls, snow-softened
      every(16, 26, () => playFerryHorn(engine), 3);
      every(6, 11, () => playGullCall(engine, Math.random() * 1.4 - 0.7, 0.5), 5);
      break;
  }

  return () => {
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
  };
}
