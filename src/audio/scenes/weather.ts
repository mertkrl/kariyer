import type { EngineCore } from '../engineCore';
import { RAIN_SRC } from '../engineCore';
import { playFerryHorn, playGullCall, playThunder } from './harbour';

/* Weather heard through the cafeteria window. */

/**
 * Starts the weather bed for the break room and returns a stop function.
 * - sunny:  distant gull calls + an occasional Bosphorus ferry horn
 * - windy:  gusting wind (slowly modulated band-passed noise) + the odd gull
 * - rainy:  rain hiss + drops ticking on the glass + rare distant thunder
 * - snowy:  near-silence — soft, muffled wind (snow absorbs sound)
 */
export function startWeatherAmbience(engine: EngineCore, kind: 'sunny' | 'windy' | 'rainy' | 'snowy'): () => void {
  const ctx = engine.ensureContext();
  if (!engine.sfxIn) return () => {};
  const bus = ctx.createGain();
  bus.gain.setValueAtTime(0, ctx.currentTime);
  bus.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.5);
  // Everything outside is heard through glass: roll off the top end.
  const glass = ctx.createBiquadFilter();
  glass.type = 'lowpass';
  glass.frequency.value = kind === 'snowy' ? 1400 : 5200;
  bus.connect(glass);
  glass.connect(engine.sfxIn);

  const sources: AudioScheduledSourceNode[] = [];
  const timers: number[] = [];
  const every = (min: number, max: number, fn: () => void, first = min) => {
    const loop = () => {
      fn();
      timers.push(window.setTimeout(loop, (min + Math.random() * (max - min)) * 1000));
    };
    timers.push(window.setTimeout(loop, first * 1000));
  };

  const noiseBed = (filterType: BiquadFilterType, freq: number, q: number, level: number) => {
    const src = engine.noiseSource(ctx);
    const f = ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = level;
    src.connect(f);
    f.connect(g);
    g.connect(bus);
    engine.startNoise(src, ctx.currentTime);
    sources.push(src);
    return { filter: f, gain: g };
  };

  const lfo = (rate: number, depth: number, target: AudioParam) => {
    const o = ctx.createOscillator();
    o.frequency.value = rate;
    const d = ctx.createGain();
    d.gain.value = depth;
    o.connect(d);
    d.connect(target);
    o.start();
    sources.push(o);
  };

  const wind = (level: number, center: number) => {
    const { filter, gain } = noiseBed('bandpass', center, 0.7, level);
    lfo(0.11, center * 0.45, filter.frequency);
    lfo(0.17, level * 0.6, gain.gain);
    lfo(0.043, level * 0.4, gain.gain);
  };

  // declared before the switch: the rain recording loads asynchronously and must not start after stop
  let stopped = false;

  /** Synthesized rain, used only if the recording can't be loaded: layered beds, glass ticks, fat drops. */
  const synthRain = () => {
    const body = noiseBed('lowpass', 850, 0.4, 0.045); // roofs, pavement
    const sheet = noiseBed('bandpass', 1700, 0.35, 0.035); // the falling sheet
    noiseBed('highpass', 6200, 0.3, 0.011); // fine sizzle
    lfo(0.07, 0.014, sheet.gain.gain); // gusts of heavier rain
    lfo(0.031, 0.012, body.gain.gain);
    const tickTimer = window.setInterval(() => {
      if (Math.random() < 0.9)
        engine.noiseHit({ filter: 'bandpass', freq: 1800 + Math.random() * 6200, q: 4, attack: 0.0006, decay: 0.003 + Math.random() * 0.01, peak: 0.008 + Math.random() * 0.022, pan: Math.random() * 1.8 - 0.9 });
    }, 24);
    timers.push(-tickTimer);
  };

  switch (kind) {
    case 'sunny':
      noiseBed('lowpass', 500, 0.5, 0.012); // distant city/sea air
      every(5, 11, () => playGullCall(engine, Math.random() * 1.4 - 0.7, 0.6), 2);
      every(26, 40, () => playFerryHorn(engine), 7);
      break;
    case 'windy':
      wind(0.06, 520);
      every(9, 16, () => playGullCall(engine, Math.random() * 1.4 - 0.7, 0.4), 5);
      break;
    case 'rainy':
      // the real recording, heard through the glass; a rare distant thunder on top
      // straight to the output, not through the glass filter: this is the recording as it is
      engine.loopSample(RAIN_SRC, engine.sfxIn, 0.9, sources, () => !stopped, synthRain);
      every(28, 55, () => playThunder(engine), 14);
      break;
    case 'snowy':
      wind(0.018, 320);
      break;
  }

  return () => {
    if (stopped) return;
    stopped = true;
    const now = ctx.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(bus.gain.value, now);
    bus.gain.linearRampToValueAtTime(0, now + 0.8);
    for (const t of timers) {
      if (t < 0) window.clearInterval(-t);
      else window.clearTimeout(t);
    }
    for (const src of sources) {
      try {
        src.stop(now + 0.85);
      } catch {
        // already stopped
      }
    }
    window.setTimeout(() => bus.disconnect(), 1200);
  };
}
