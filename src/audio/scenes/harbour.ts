import type { EngineCore } from '../engineCore';

/* Single calls from outside: gulls, a vapur horn, far thunder. Shared by the weather and street scenes. */

/** Herring gull "kee-ow": FM-roughened sine with a rising-then-falling pitch, 2–4 calls. */
export function playGullCall(engine: EngineCore, pan: number, distance: number) {
  const ctx = engine.ensureContext();
  if (!engine.sfxIn) return;
  const calls = 2 + Math.floor(Math.random() * 3);
  const base = 1250 + Math.random() * 350;
  for (let i = 0; i < calls; i++) {
    const when = ctx.currentTime + i * (0.32 + Math.random() * 0.08);
    const dur = 0.24 + Math.random() * 0.06;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(base * 0.8, when);
    osc.frequency.linearRampToValueAtTime(base * 1.25, when + dur * 0.3);
    osc.frequency.exponentialRampToValueAtTime(base * 0.7, when + dur);
    const fm = ctx.createOscillator();
    fm.frequency.value = 34;
    const fmDepth = ctx.createGain();
    fmDepth.gain.value = 60;
    fm.connect(fmDepth);
    fmDepth.connect(osc.frequency);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2000;
    bp.Q.value = 1.3;
    const g = ctx.createGain();
    engine.envelope(g.gain, when, 0.03, 0.035 * distance, dur);
    const p = engine.panner(ctx, pan);
    osc.connect(bp);
    bp.connect(g);
    g.connect(p);
    p.connect(engine.sfxIn);
    osc.start(when);
    fm.start(when);
    osc.stop(when + dur + 0.05);
    fm.stop(when + dur + 0.05);
  }
}

/** Distant vapur horn: two detuned low saws a fourth apart, slow swell, long echo off the shore. */
export function playFerryHorn(engine: EngineCore) {
  const ctx = engine.ensureContext();
  if (!engine.sfxIn) return;
  const now = ctx.currentTime;
  const dur = 1.8;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 650;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.05, now + 0.35);
  g.gain.setValueAtTime(0.05, now + dur - 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  const echo = ctx.createDelay(1);
  echo.delayTime.value = 0.42;
  const fb = ctx.createGain();
  fb.gain.value = 0.35;
  echo.connect(fb);
  fb.connect(echo);
  lp.connect(g);
  g.connect(engine.sfxIn);
  g.connect(echo);
  echo.connect(engine.sfxIn);
  for (const f of [138, 184.5]) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    o.detune.value = Math.random() * 8 - 4;
    o.connect(lp);
    o.start(now);
    o.stop(now + dur + 0.05);
  }
  window.setTimeout(() => {
    echo.disconnect();
    fb.disconnect();
  }, 5000);
}

/** Far thunder: low rumble that swells and rolls off over a few seconds. */
export function playThunder(engine: EngineCore) {
  const ctx = engine.ensureContext();
  const steps = 64;
  const curve = new Float32Array(steps);
  for (let i = 0; i < steps; i++) {
    const x = i / (steps - 1);
    const swell = Math.min(1, x / 0.15) * Math.exp(-x * 3.2);
    curve[i] = swell * (0.7 + 0.3 * Math.random()) * 0.22;
  }
  engine.noiseHit({ filter: 'lowpass', freq: 160, freqEnd: 70, q: 0.9, when: ctx.currentTime, decay: 3.6, peak: 0, curve, pan: Math.random() * 0.8 - 0.4 });
}
