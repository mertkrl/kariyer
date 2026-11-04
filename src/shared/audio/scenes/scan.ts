import type { EngineCore } from '../engineCore';
import { DATA_PITCHES } from '../engineCore';

/* Bir CV'yi okuyan yapay zekâ: düşünen bir uğultu, yükselen bir süpürme, veri cıvıltıları ve kilitlenme tıkları, sonra bir çan. */

/**
 * `duration` saniyelik yapay zekâ tarama ses yatağı:
 *  1. alçak, rezonanslı iki osilatörlü bir uğultu ("model düşünüyor"),
 *  2. görsel tarama çizgisiyle yükselen ve stereo alanda kayan bant geçiren bir gürültü süpürmesi,
 *  3. sola/sağa saçılmış sessiz pentatonik veri cıvıltıları,
 *  4. her `locks` anında (bir CV alanı vurgulandığında) net bir kilitlenme tıkı.
 * Erken durdurulmadıkça çözülmüş bir çanla (`chime` ise) biter.
 */
export function startScan(engine: EngineCore, duration = 3.2, locks: number[] = [], chime = true) {
  const ctx = engine.ensureContext();
  if (!engine.sfxIn) return;
  stopScan(engine, 0.05);

  const t0 = ctx.currentTime + 0.01;
  const end = t0 + duration;
  const bus = ctx.createGain();
  bus.gain.value = 1;
  bus.connect(engine.sfxIn);
  const sources: AudioScheduledSourceNode[] = [];

  // 1. Uğultu
  const humFilter = ctx.createBiquadFilter();
  humFilter.type = 'lowpass';
  humFilter.Q.value = 7;
  humFilter.frequency.setValueAtTime(160, t0);
  humFilter.frequency.exponentialRampToValueAtTime(900, t0 + duration * 0.7);
  humFilter.frequency.exponentialRampToValueAtTime(380, end);
  const humGain = ctx.createGain();
  humGain.gain.setValueAtTime(0.0001, t0);
  humGain.gain.exponentialRampToValueAtTime(0.07, t0 + 0.35);
  humGain.gain.setValueAtTime(0.07, end - 0.25);
  humGain.gain.exponentialRampToValueAtTime(0.0001, end);
  for (const [freq, detune] of [
    [55, -6],
    [82.4, 5],
  ]) {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    osc.detune.value = detune;
    osc.connect(humFilter);
    osc.start(t0);
    osc.stop(end + 0.05);
    sources.push(osc);
  }
  humFilter.connect(humGain);
  humGain.connect(bus);

  // 2. Yavaş otomatik kaydırmalı yükselen tarama süpürmesi
  const sweep = engine.noiseSource(ctx);
  const sweepFilter = ctx.createBiquadFilter();
  sweepFilter.type = 'bandpass';
  sweepFilter.Q.value = 9;
  sweepFilter.frequency.setValueAtTime(320, t0);
  sweepFilter.frequency.exponentialRampToValueAtTime(4200, end);
  const sweepGain = ctx.createGain();
  sweepGain.gain.setValueAtTime(0.0001, t0);
  sweepGain.gain.exponentialRampToValueAtTime(0.09, t0 + 0.5);
  sweepGain.gain.setValueAtTime(0.09, end - 0.2);
  sweepGain.gain.exponentialRampToValueAtTime(0.0001, end);
  const sweepPan = engine.panner(ctx, 0);
  if ('pan' in sweepPan) {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.7;
    const depth = ctx.createGain();
    depth.gain.value = 0.6;
    lfo.connect(depth);
    depth.connect((sweepPan as StereoPannerNode).pan);
    lfo.start(t0);
    lfo.stop(end + 0.05);
    sources.push(lfo);
  }
  sweep.connect(sweepFilter);
  sweepFilter.connect(sweepGain);
  sweepGain.connect(sweepPan);
  sweepPan.connect(bus);
  engine.startNoise(sweep, t0);
  sweep.stop(end + 0.05);
  sources.push(sweep);

  // 3. Veri cıvıltıları: "analiz" yakınsadıkça sona doğru daha yoğun
  let t = t0 + 0.15;
  while (t < end - 0.15) {
    const progress = (t - t0) / duration;
    const freq = DATA_PITCHES[Math.floor(Math.random() * DATA_PITCHES.length)];
    engine.tone({ type: 'sine', freq, when: t, attack: 0.002, decay: 0.035, peak: 0.035, pan: Math.random() * 1.4 - 0.7, dest: bus });
    t += 0.12 - progress * 0.06 + Math.random() * 0.05;
  }

  // 4. Alan kilitlenme tıkları
  for (const lock of locks) {
    const when = t0 + lock;
    if (when >= end) continue;
    engine.tone({ type: 'triangle', freq: 1760, when, attack: 0.002, decay: 0.05, peak: 0.08, dest: bus });
    engine.tone({ type: 'triangle', freq: 2637, when: when + 0.045, attack: 0.002, decay: 0.07, peak: 0.06, dest: bus });
  }

  const completeTimer = window.setTimeout(() => {
    engine.scanStop = null;
    if (chime) playScanComplete(engine);
  }, duration * 1000);

  engine.scanStop = (fade: number) => {
    window.clearTimeout(completeTimer);
    const now = ctx.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(bus.gain.value, now);
    bus.gain.linearRampToValueAtTime(0, now + fade);
    for (const s of sources) {
      try {
        s.stop(now + fade + 0.02);
      } catch {
        // already stopped
      }
    }
    window.setTimeout(() => bus.disconnect(), (fade + 0.5) * 1000);
  };
}

/** Tarama yatağını erken durdurur (bitiş çanı olmadan). */
export function stopScan(engine: EngineCore, fade = 0.12) {
  engine.scanStop?.(fade);
  engine.scanStop = null;
}

/** Yumuşak bir çan kuyruğuyla iki notalı çözülmüş çan (tam beşli). */
export function playScanComplete(engine: EngineCore) {
  const ctx = engine.ensureContext();
  const now = ctx.currentTime;
  for (const [freq, offset] of [
    [1046.5, 0],
    [1568, 0.09],
  ]) {
    engine.tone({ freq, when: now + offset, attack: 0.004, decay: 0.7, peak: 0.1 });
    engine.tone({ freq: freq * 2.76, when: now + offset, attack: 0.002, decay: 0.18, peak: 0.02 });
  }
}
