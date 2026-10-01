export type StampKind = 'approve' | 'reject';

/*
 * Signal flow
 *
 *   SFX voices ──► sfxIn ──► sfxGlue (gentle compressor) ──► sfxVolume ─┐
 *                                                                        ├──► master (mute) ──► limiter ──► out
 *   music loop ──► highpass ──► lowpass ──► moodGain ──► musicVolume ───┘
 *
 * The two user-facing sliders (Müzik / Efektler) drive musicVolume and sfxVolume. The final
 * limiter catches stacked transients (e.g. 60 CVs scattering at once) so nothing ever clips.
 */

export const SFX_LEVEL = 0.55;
export const MUSIC_SRC = `${import.meta.env.BASE_URL}audio/theme-calm.m4a`;
/** A real rain recording, looped under the weather and street scenes. */
export const RAIN_SRC = `${import.meta.env.BASE_URL}audio/rain.mp3`;
/** Exact loop length of theme-calm.m4a (32 bars @ 66 BPM) — see scripts/generate-calm-music.mjs. */
export const MUSIC_LOOP_SECONDS = (60 / 66) * 4 * 32;

/**
 * How the background music sits in the scene:
 * - work:   full-range mix
 * - break:  band-limited, quieter — like a radio playing in the cafeteria
 * - paused: heavily muffled, as if behind a closed door
 * - off:    faded out (intro screens — the flood sequence carries its own sound design)
 */
export type MusicMood = 'work' | 'break' | 'paused' | 'off';

export const MUSIC_MOODS: Record<MusicMood, { volume: number; lowpass: number; highpass: number }> = {
  work: { volume: 0.3, lowpass: 16000, highpass: 20 },
  break: { volume: 0.3, lowpass: 2400, highpass: 280 },
  paused: { volume: 0.16, lowpass: 480, highpass: 20 },
  off: { volume: 0, lowpass: 18000, highpass: 20 },
};

/** The application-flood sequence plays alone (no music under it), so it sits ~+3.5 dB hotter. */
export const FLOOD_BOOST = 1.5;

/** Slider position (0–1) → linear gain. A squared curve tracks perceived loudness far better than linear. */
export const sliderToGain = (v: number) => Math.max(0, Math.min(1, v)) ** 2;

/** Pentatonic "data" pitches (Hz) for the AI scan chirps — musical, never harsh. */
export const DATA_PITCHES = [1318.5, 1568, 1760, 2093, 2349.3, 2637];

export interface ScatterPaper {
  /** -1 (left) … 1 (right) — follows the paper's flight direction. */
  pan: number;
  /** Seconds after the burst. */
  delay: number;
}

/** Live handle for a pour: feed it the fill level, stop it when the stream detaches. */
export interface PourSound {
  /** Liquid height as a fraction of the glass (0–1). */
  setFill: (fill: number) => void;
  stop: () => void;
}

/**
 * The audio graph and the instruments every sound is built from: tones, noise hits, panning,
 * envelopes, looped recordings. The scenes in ./scenes play on it; AudioEngine adds the
 * controls and the short one-off sounds. Members are public only for those two — nothing
 * outside src/audio uses this class.
 */
export class EngineCore {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  sfxIn: GainNode | null = null;
  sfxVolume: GainNode | null = null;
  musicVolume: GainNode | null = null;
  noise: AudioBuffer | null = null;
  muted = false;
  musicLevel = 0.8;
  sfxLevel = 0.8;
  musicBuffer: Promise<AudioBuffer> | null = null;
  musicSource: AudioBufferSourceNode | null = null;
  musicGain: GainNode | null = null;
  musicLowpass: BiquadFilterNode | null = null;
  musicHighpass: BiquadFilterNode | null = null;
  musicMood: MusicMood = 'off';
  musicWanted = false;
  scanStop: ((fade: number) => void) | null = null;
  riserStop: ((fade: number) => void) | null = null;
  samples = new Map<string, Promise<AudioBuffer | null>>();
  ducked = false;

  ensureContext() {
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor();
    this.ctx = ctx;

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.12;
    limiter.connect(ctx.destination);

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(limiter);

    // SFX bus: light glue compression keeps layered foley cohesive.
    this.sfxIn = ctx.createGain();
    this.sfxIn.gain.value = SFX_LEVEL;
    const glue = ctx.createDynamicsCompressor();
    glue.threshold.value = -18;
    glue.knee.value = 12;
    glue.ratio.value = 3;
    glue.attack.value = 0.005;
    glue.release.value = 0.2;
    this.sfxVolume = ctx.createGain();
    this.sfxVolume.gain.value = sliderToGain(this.sfxLevel);
    this.sfxIn.connect(glue);
    glue.connect(this.sfxVolume);
    this.sfxVolume.connect(this.master);

    // Music bus
    const mood = MUSIC_MOODS[this.musicMood];
    this.musicHighpass = ctx.createBiquadFilter();
    this.musicHighpass.type = 'highpass';
    this.musicHighpass.frequency.value = mood.highpass;
    this.musicLowpass = ctx.createBiquadFilter();
    this.musicLowpass.type = 'lowpass';
    this.musicLowpass.frequency.value = mood.lowpass;
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = mood.volume;
    this.musicVolume = ctx.createGain();
    this.musicVolume.gain.value = sliderToGain(this.musicLevel);
    this.musicHighpass.connect(this.musicLowpass);
    this.musicLowpass.connect(this.musicGain);
    this.musicGain.connect(this.musicVolume);
    this.musicVolume.connect(this.master);

    // One shared 2-second white-noise buffer feeds every noise-based sound.
    const length = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

    return ctx;
  }

  ramp(param: AudioParam, value: number, seconds: number) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(value, now + seconds);
  }

  /** Fetches and decodes a recording once; null if it can't be loaded. */
  loadSample(url: string): Promise<AudioBuffer | null> {
    let p = this.samples.get(url);
    if (!p) {
      const ctx = this.ensureContext();
      p = fetch(url)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
        .then((b) => ctx.decodeAudioData(b))
        .catch(() => null);
      this.samples.set(url, p);
    }
    return p;
  }

  /**
   * Loops a recording into `dest` at `level`, fading in. Calls `fallback` instead if the file
   * can't be loaded. `alive` is checked once it has loaded, so a scene that already ended stays quiet.
   */
  loopSample(url: string, dest: AudioNode, level: number, sources: AudioScheduledSourceNode[], alive: () => boolean, fallback: () => void) {
    void this.loadSample(url).then((buffer) => {
      if (!alive()) return;
      if (!buffer) {
        fallback();
        return;
      }
      const ctx = this.ensureContext();
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(level, ctx.currentTime + 1.2);
      src.connect(g);
      g.connect(dest);
      src.start(ctx.currentTime, Math.random() * Math.max(0, buffer.duration - 1));
      sources.push(src);
    });
  }

  /** Looping noise source starting at a random offset (so repeated hits never sound identical). */
  noiseSource(ctx: AudioContext) {
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    return src;
  }

  startNoise(src: AudioBufferSourceNode, when: number, duration?: number) {
    const offset = Math.random() * 1.5;
    if (duration === undefined) src.start(when, offset);
    else src.start(when, offset, duration);
  }

  panner(ctx: AudioContext, pan: number): AudioNode {
    if (typeof ctx.createStereoPanner !== 'function') return ctx.createGain();
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    return p;
  }

  /** Percussive envelope: fast attack to `peak`, exponential decay to silence. */
  envelope(param: AudioParam, when: number, attack: number, peak: number, decay: number) {
    param.setValueAtTime(0.0001, when);
    param.exponentialRampToValueAtTime(Math.max(0.0002, peak), when + attack);
    param.exponentialRampToValueAtTime(0.0001, when + attack + decay);
  }

  tone(opts: {
    type?: OscillatorType;
    freq: number;
    freqEnd?: number;
    when?: number;
    attack?: number;
    decay: number;
    peak: number;
    pan?: number;
    dest?: AudioNode;
  }) {
    const ctx = this.ensureContext();
    if (!this.sfxIn) return;
    const when = opts.when ?? ctx.currentTime;
    const attack = opts.attack ?? 0.004;
    const osc = ctx.createOscillator();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(opts.freq, when);
    if (opts.freqEnd) osc.frequency.exponentialRampToValueAtTime(opts.freqEnd, when + attack + opts.decay);
    const gain = ctx.createGain();
    this.envelope(gain.gain, when, attack, opts.peak, opts.decay);
    osc.connect(gain);
    const pan = this.panner(ctx, opts.pan ?? 0);
    gain.connect(pan);
    pan.connect(opts.dest ?? this.sfxIn);
    osc.start(when);
    osc.stop(when + attack + opts.decay + 0.02);
  }

  noiseHit(opts: {
    filter: BiquadFilterType;
    freq: number;
    freqEnd?: number;
    q?: number;
    when?: number;
    attack?: number;
    decay: number;
    peak: number;
    pan?: number;
    curve?: Float32Array;
  }) {
    const ctx = this.ensureContext();
    if (!this.sfxIn) return;
    const when = opts.when ?? ctx.currentTime;
    const attack = opts.attack ?? 0.003;
    const total = attack + opts.decay;
    const src = this.noiseSource(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = opts.filter;
    filter.Q.value = opts.q ?? 0.8;
    filter.frequency.setValueAtTime(opts.freq, when);
    if (opts.freqEnd) filter.frequency.exponentialRampToValueAtTime(opts.freqEnd, when + total);
    const gain = ctx.createGain();
    if (opts.curve) {
      // No other automation event may share the curve's time range.
      gain.gain.value = 0;
      gain.gain.setValueCurveAtTime(opts.curve, when, total);
    } else {
      this.envelope(gain.gain, when, attack, opts.peak, opts.decay);
    }
    const pan = this.panner(ctx, opts.pan ?? 0);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(pan);
    pan.connect(this.sfxIn);
    this.startNoise(src, when, total + 0.05);
  }

  playNoise(duration: number, filterType: BiquadFilterType, frequency: number, volume: number, delay = 0) {
    const ctx = this.ensureContext();
    const steps = 32;
    const curve = new Float32Array(steps);
    for (let i = 0; i < steps; i++) curve[i] = Math.sin((Math.PI * i) / (steps - 1)) * volume;
    this.noiseHit({ filter: filterType, freq: frequency, when: ctx.currentTime + delay, decay: duration, peak: 0, curve });
  }
}
