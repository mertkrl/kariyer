type StampKind = 'approve' | 'reject';

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

const SFX_LEVEL = 0.55;
const MUSIC_SRC = '/audio/theme-calm.m4a';
/** A real rain recording, looped under the weather and street scenes. */
const RAIN_SRC = '/audio/rain.mp3';
/** Exact loop length of theme-calm.m4a (32 bars @ 66 BPM) — see scripts/generate-calm-music.mjs. */
const MUSIC_LOOP_SECONDS = (60 / 66) * 4 * 32;

/**
 * How the background music sits in the scene:
 * - work:   full-range mix
 * - break:  band-limited, quieter — like a radio playing in the cafeteria
 * - paused: heavily muffled, as if behind a closed door
 * - off:    faded out (intro screens — the flood sequence carries its own sound design)
 */
export type MusicMood = 'work' | 'break' | 'paused' | 'off';

const MUSIC_MOODS: Record<MusicMood, { volume: number; lowpass: number; highpass: number }> = {
  work: { volume: 0.3, lowpass: 16000, highpass: 20 },
  break: { volume: 0.3, lowpass: 2400, highpass: 280 },
  paused: { volume: 0.16, lowpass: 480, highpass: 20 },
  off: { volume: 0, lowpass: 18000, highpass: 20 },
};

/** The application-flood sequence plays alone (no music under it), so it sits ~+3.5 dB hotter. */
const FLOOD_BOOST = 1.5;

/** Slider position (0–1) → linear gain. A squared curve tracks perceived loudness far better than linear. */
const sliderToGain = (v: number) => Math.max(0, Math.min(1, v)) ** 2;

/** Pentatonic "data" pitches (Hz) for the AI scan chirps — musical, never harsh. */
const DATA_PITCHES = [1318.5, 1568, 1760, 2093, 2349.3, 2637];

interface ScatterPaper {
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

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxIn: GainNode | null = null;
  private sfxVolume: GainNode | null = null;
  private musicVolume: GainNode | null = null;
  private noise: AudioBuffer | null = null;

  private muted = false;
  private musicLevel = 0.8;
  private sfxLevel = 0.8;

  private musicBuffer: Promise<AudioBuffer> | null = null;
  private musicSource: AudioBufferSourceNode | null = null;
  private musicGain: GainNode | null = null;
  private musicLowpass: BiquadFilterNode | null = null;
  private musicHighpass: BiquadFilterNode | null = null;
  private musicMood: MusicMood = 'off';
  private musicWanted = false;

  private scanStop: ((fade: number) => void) | null = null;
  private riserStop: ((fade: number) => void) | null = null;

  // ── Graph setup ────────────────────────────────────────────────────────────

  private ensureContext() {
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

  private ramp(param: AudioParam, value: number, seconds: number) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(value, now + seconds);
  }

  private samples = new Map<string, Promise<AudioBuffer | null>>();

  /** Fetches and decodes a recording once; null if it can't be loaded. */
  private loadSample(url: string): Promise<AudioBuffer | null> {
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
  private loopSample(url: string, dest: AudioNode, level: number, sources: AudioScheduledSourceNode[], alive: () => boolean, fallback: () => void) {
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
  private noiseSource(ctx: AudioContext) {
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    return src;
  }

  private startNoise(src: AudioBufferSourceNode, when: number, duration?: number) {
    const offset = Math.random() * 1.5;
    if (duration === undefined) src.start(when, offset);
    else src.start(when, offset, duration);
  }

  private panner(ctx: AudioContext, pan: number): AudioNode {
    if (typeof ctx.createStereoPanner !== 'function') return ctx.createGain();
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    return p;
  }

  /** Percussive envelope: fast attack to `peak`, exponential decay to silence. */
  private envelope(param: AudioParam, when: number, attack: number, peak: number, decay: number) {
    param.setValueAtTime(0.0001, when);
    param.exponentialRampToValueAtTime(Math.max(0.0002, peak), when + attack);
    param.exponentialRampToValueAtTime(0.0001, when + attack + decay);
  }

  private tone(opts: {
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

  private noiseHit(opts: {
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

  // ── Global controls ────────────────────────────────────────────────────────

  /** Must be called from a user gesture (click) — browsers block audio otherwise. */
  init() {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') void ctx.resume();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.master) this.ramp(this.master.gain, muted ? 0 : 1, 0.25);
  }

  isMuted() {
    return this.muted;
  }

  /** 0–1 slider value for the background music. */
  setMusicVolume(level: number) {
    this.musicLevel = level;
    if (this.musicVolume) this.ramp(this.musicVolume.gain, sliderToGain(level) * (this.ducked ? 0.3 : 1), 0.08);
  }

  private ducked = false;

  /** Pull the music down under a spoken line, then back up. */
  duckMusic(on: boolean) {
    this.ducked = on;
    if (this.musicVolume) this.ramp(this.musicVolume.gain, sliderToGain(this.musicLevel) * (on ? 0.3 : 1), on ? 0.25 : 0.8);
  }

  /** 0–1 slider value for all sound effects. */
  setSfxVolume(level: number) {
    this.sfxLevel = level;
    if (this.sfxVolume) this.ramp(this.sfxVolume.gain, sliderToGain(level), 0.08);
  }

  setMusicMood(mood: MusicMood) {
    if (mood === this.musicMood) return;
    const previous = this.musicMood;
    this.musicMood = mood;
    if (!this.ctx || !this.musicGain || !this.musicLowpass || !this.musicHighpass) return;
    const target = MUSIC_MOODS[mood];
    // Day start fades the music in slowly; mood changes within the day are quicker.
    const seconds = mood === 'paused' ? 0.4 : previous === 'off' ? 2.5 : 1.2;
    const now = this.ctx.currentTime;
    this.ramp(this.musicGain.gain, target.volume, seconds);
    for (const [param, value] of [
      [this.musicLowpass.frequency, target.lowpass],
      [this.musicHighpass.frequency, target.highpass],
    ] as const) {
      param.cancelScheduledValues(now);
      param.setValueAtTime(param.value, now);
      param.exponentialRampToValueAtTime(value, now + seconds);
    }
  }

  // ── Music ──────────────────────────────────────────────────────────────────

  private loadMusic(ctx: AudioContext) {
    this.musicBuffer ??= fetch(MUSIC_SRC)
      .then((res) => res.arrayBuffer())
      .then((data) => ctx.decodeAudioData(data));
    return this.musicBuffer;
  }

  /** Starts the gapless background loop (Web Audio loops sample-accurately; <audio loop> leaves a gap). */
  startAmbient() {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') void ctx.resume();
    this.musicWanted = true;
    if (this.musicSource) return;

    void this.loadMusic(ctx)
      .then((buffer) => {
        if (!this.musicWanted || this.musicSource || !this.musicHighpass) return;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.loopStart = 0;
        source.loopEnd = Math.min(buffer.duration, MUSIC_LOOP_SECONDS);
        source.connect(this.musicHighpass);
        source.start();
        this.musicSource = source;
      })
      .catch(() => {
        // Music is optional; the game plays fine without it.
        this.musicBuffer = null;
      });
  }

  stopAmbient() {
    this.musicWanted = false;
    this.musicSource?.stop();
    this.musicSource?.disconnect();
    this.musicSource = null;
  }

  // ── Decisions & UI ─────────────────────────────────────────────────────────

  /** Rubber stamp: low body thump + paper slap. Approve is brighter, reject heavier. */
  playStamp(kind: StampKind) {
    const approve = kind === 'approve';
    this.tone({ freq: approve ? 150 : 110, freqEnd: 55, decay: 0.16, peak: 0.55 });
    this.noiseHit({ filter: 'lowpass', freq: approve ? 2400 : 1100, decay: 0.12, peak: 0.45 });
    this.noiseHit({ filter: 'bandpass', freq: 3200, q: 1.5, decay: 0.04, peak: 0.18 });
  }

  /**
   * Button feedback, designed per intent:
   * - start:   warm rising power-on (the game begins)
   * - confirm: bright major-third chime (publish / next day)
   * - connect: data handshake chirps into a "connected" chime (logging into the HR system)
   * - select:  soft tick; `variant` shifts the pitch so neighbouring choices sound distinct
   * - click:   neutral tick
   */
  playUi(kind: 'start' | 'confirm' | 'connect' | 'select' | 'click', variant = 0) {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    switch (kind) {
      case 'start':
        this.tone({ freq: 70, freqEnd: 45, attack: 0.005, decay: 0.3, peak: 0.35 });
        this.tone({ type: 'triangle', freq: 392, when: now, attack: 0.02, decay: 0.35, peak: 0.08 });
        this.tone({ type: 'triangle', freq: 587.3, when: now + 0.09, attack: 0.02, decay: 0.45, peak: 0.08 });
        this.tone({ freq: 784, when: now + 0.18, attack: 0.01, decay: 0.6, peak: 0.06 });
        this.noiseHit({ filter: 'bandpass', freq: 300, freqEnd: 2400, q: 1, attack: 0.15, decay: 0.12, peak: 0.05 });
        break;
      case 'confirm':
        this.noiseHit({ filter: 'highpass', freq: 4000, attack: 0.001, decay: 0.015, peak: 0.06 });
        this.tone({ freq: 880, when: now, attack: 0.003, decay: 0.25, peak: 0.07 });
        this.tone({ freq: 1108.7, when: now + 0.07, attack: 0.003, decay: 0.35, peak: 0.07 });
        break;
      case 'connect': {
        this.tone({ freq: 110, freqEnd: 220, attack: 0.1, decay: 0.5, peak: 0.06 });
        [0, 0.05, 0.1, 0.15, 0.2, 0.25].forEach((t, i) => {
          this.tone({ type: 'square', freq: 1200 + ((i * 7) % 5) * 260, when: now + t, attack: 0.002, decay: 0.025, peak: 0.018, pan: i % 2 ? 0.3 : -0.3 });
        });
        this.tone({ freq: 1318.5, when: now + 0.36, attack: 0.004, decay: 0.3, peak: 0.07 });
        this.tone({ freq: 1975.5, when: now + 0.44, attack: 0.004, decay: 0.5, peak: 0.06 });
        break;
      }
      case 'select':
        this.noiseHit({ filter: 'bandpass', freq: 2600 + variant * 300, q: 3, attack: 0.001, decay: 0.02, peak: 0.07 });
        this.tone({ type: 'triangle', freq: 660 * Math.pow(2, (variant * 3) / 12), attack: 0.002, decay: 0.09, peak: 0.06 });
        break;
      case 'click':
        this.playUiClick();
        break;
    }
  }

  /** Soft click for general UI interactions. */
  playUiClick() {
    this.tone({ freq: 1250, freqEnd: 900, decay: 0.05, peak: 0.1 });
    this.noiseHit({ filter: 'highpass', freq: 5000, decay: 0.012, peak: 0.05 });
  }

  // ── AI analysis ────────────────────────────────────────────────────────────

  /**
   * AI scan bed for `duration` seconds:
   *  1. a low, resonant two-oscillator hum ("the model is thinking"),
   *  2. a band-passed noise sweep that rises with the visual scan line and drifts across the stereo field,
   *  3. quiet pentatonic data chirps scattered left/right,
   *  4. a crisp lock-on tick at each `locks` time (when a CV field gets highlighted).
   * Ends with a resolved chime (when `chime`) unless stopped early.
   */
  startScan(duration = 3.2, locks: number[] = [], chime = true) {
    const ctx = this.ensureContext();
    if (!this.sfxIn) return;
    this.stopScan(0.05);

    const t0 = ctx.currentTime + 0.01;
    const end = t0 + duration;
    const bus = ctx.createGain();
    bus.gain.value = 1;
    bus.connect(this.sfxIn);
    const sources: AudioScheduledSourceNode[] = [];

    // 1. Hum
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

    // 2. Rising scan sweep with slow auto-pan
    const sweep = this.noiseSource(ctx);
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
    const sweepPan = this.panner(ctx, 0);
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
    this.startNoise(sweep, t0);
    sweep.stop(end + 0.05);
    sources.push(sweep);

    // 3. Data chirps — denser toward the end as the "analysis" converges
    let t = t0 + 0.15;
    while (t < end - 0.15) {
      const progress = (t - t0) / duration;
      const freq = DATA_PITCHES[Math.floor(Math.random() * DATA_PITCHES.length)];
      this.tone({ type: 'sine', freq, when: t, attack: 0.002, decay: 0.035, peak: 0.035, pan: Math.random() * 1.4 - 0.7, dest: bus });
      t += 0.12 - progress * 0.06 + Math.random() * 0.05;
    }

    // 4. Field lock-on ticks
    for (const lock of locks) {
      const when = t0 + lock;
      if (when >= end) continue;
      this.tone({ type: 'triangle', freq: 1760, when, attack: 0.002, decay: 0.05, peak: 0.08, dest: bus });
      this.tone({ type: 'triangle', freq: 2637, when: when + 0.045, attack: 0.002, decay: 0.07, peak: 0.06, dest: bus });
    }

    const completeTimer = window.setTimeout(() => {
      this.scanStop = null;
      if (chime) this.playScanComplete();
    }, duration * 1000);

    this.scanStop = (fade: number) => {
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

  /** Stops the scan bed early (without the completion chime). */
  stopScan(fade = 0.12) {
    this.scanStop?.(fade);
    this.scanStop = null;
  }

  /** Two-note resolved chime (perfect fifth) with a soft bell tail. */
  playScanComplete() {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    for (const [freq, offset] of [
      [1046.5, 0],
      [1568, 0.09],
    ]) {
      this.tone({ freq, when: now + offset, attack: 0.004, decay: 0.7, peak: 0.1 });
      this.tone({ freq: freq * 2.76, when: now + offset, attack: 0.002, decay: 0.18, peak: 0.02 });
    }
  }

  // ── Application flood (day intro) ──────────────────────────────────────────

  /** Tension riser under the incoming-applications counter. */
  startFloodRiser(duration: number) {
    const ctx = this.ensureContext();
    if (!this.sfxIn) return;
    this.stopFloodRiser(0.05);
    const t0 = ctx.currentTime;
    const end = t0 + duration;

    const src = this.noiseSource(ctx);
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
    gain.connect(this.sfxIn);
    this.startNoise(src, t0);
    src.stop(end + 0.3);

    const sub = ctx.createOscillator();
    sub.frequency.setValueAtTime(70, t0);
    sub.frequency.exponentialRampToValueAtTime(140, end);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.0001, t0);
    subGain.gain.exponentialRampToValueAtTime(0.08 * FLOOD_BOOST, end - 0.05);
    subGain.gain.exponentialRampToValueAtTime(0.0001, end + 0.2);
    sub.connect(subGain);
    subGain.connect(this.sfxIn);
    sub.start(t0);
    sub.stop(end + 0.3);

    this.riserStop = (fade: number) => {
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

  stopFloodRiser(fade = 0.15) {
    this.riserStop?.(fade);
    this.riserStop = null;
  }

  /**
   * Mechanical counter tick. `pitch` 0–1 moves it up (counting up) or down (counting down),
   * so the listener "hears" the direction of the number.
   */
  playCounterTick(pitch: number) {
    this.noiseHit({ filter: 'bandpass', freq: 3800, q: 2, attack: 0.001, decay: 0.012, peak: 0.07 * FLOOD_BOOST });
    this.tone({ type: 'triangle', freq: 900 + pitch * 900, attack: 0.001, decay: 0.03, peak: 0.035 * FLOOD_BOOST });
  }

  /** A single CV sliding in: short downward "fwip" of paper, panned to where it came from. */
  playPaperIn(pan: number) {
    this.noiseHit({ filter: 'bandpass', freq: 3400, freqEnd: 900, q: 1.4, attack: 0.02, decay: 0.08, peak: 0.07 * FLOOD_BOOST, pan });
    // Soft "gulp" as the core swallows it
    this.tone({ freq: 240, freqEnd: 120, attack: 0.005, decay: 0.07, peak: 0.05 * FLOOD_BOOST, pan: pan * 0.3 });
  }

  /** A sheet of paper settling onto a surface: soft, dry, low "tap-shhh". */
  playPaperLand(pan: number) {
    this.noiseHit({ filter: 'lowpass', freq: 1800, attack: 0.002, decay: 0.05, peak: 0.07 * FLOOD_BOOST, pan });
    this.noiseHit({ filter: 'bandpass', freq: 3000, freqEnd: 1500, q: 0.9, attack: 0.01, decay: 0.12, peak: 0.025 * FLOOD_BOOST, pan });
  }

  /**
   * The AI flings rejected CVs away: sub impact + air "whoomp", then one fluttering paper
   * per CV, each panned to its flight direction. `chaotic` (AI crash day) adds a glitchy
   * failing-machine layer and an error beep.
   */
  playScatter(papers: ScatterPaper[], chaotic: boolean) {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    this.tone({ freq: 90, freqEnd: 34, attack: 0.004, decay: 0.55, peak: 0.7 * FLOOD_BOOST });
    this.noiseHit({ filter: 'lowpass', freq: 1400, freqEnd: 200, attack: 0.004, decay: 0.3, peak: 0.35 * FLOOD_BOOST });
    this.noiseHit({ filter: 'bandpass', freq: 500, freqEnd: 140, q: 1.2, attack: 0.03, decay: 0.45, peak: 0.25 * FLOOD_BOOST });

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
      this.noiseHit({
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
      if (this.sfxIn) g.connect(this.sfxIn);
      glitch.start(now);
      glitch.stop(now + 1.65);

      [0, 0.18, 0.36].forEach((offset, i) => {
        this.tone({ type: 'square', freq: i === 2 ? 220 : 440, when: now + 0.9 + offset, attack: 0.003, decay: 0.12, peak: 0.045 });
      });
    }
  }

  /** "Rewind" for taking a decision back: a reversed swell into a falling two-note figure. */
  playUndo() {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const steps = 32;
    const swell = new Float32Array(steps);
    for (let i = 0; i < steps; i++) {
      const x = i / (steps - 1);
      swell[i] = x < 0.9 ? 0.16 * x ** 2.2 : 0.16 * (1 - (x - 0.9) / 0.1);
    }
    this.noiseHit({ filter: 'bandpass', freq: 500, freqEnd: 2600, q: 1.6, when: now, decay: 0.2, peak: 0, curve: swell });
    this.tone({ type: 'triangle', freq: 880, when: now + 0.18, attack: 0.004, decay: 0.12, peak: 0.07 });
    this.tone({ type: 'triangle', freq: 660, when: now + 0.27, attack: 0.004, decay: 0.2, peak: 0.07 });
  }

  /**
   * Electric lunch bell (school/factory style): a hammer striking a small gong ~22×/s,
   * built from the bell's inharmonic modes, rung twice — "zırrr… zırr" — with a short
   * corridor echo so it sounds like it comes from the hallway.
   */
  playLunchBell() {
    const ctx = this.ensureContext();
    if (!this.sfxIn) return;
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
    echoOut.connect(this.sfxIn);

    const bell = ctx.createGain();
    bell.gain.value = 0.9;
    bell.connect(this.sfxIn);
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
      const buzz = this.noiseSource(ctx);
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
      this.startNoise(buzz, now + start, total + 0.05);
    }

    window.setTimeout(() => {
      bell.disconnect();
      echoOut.disconnect();
      feedback.disconnect();
    }, 5000);
  }

  // ── Phone & office ─────────────────────────────────────────────────────────

  /** Phone on the desk: two short vibration buzzes (rattling against wood) + a soft message ping. */
  playPhoneBuzz() {
    const ctx = this.ensureContext();
    if (!this.sfxIn) return;
    const now = ctx.currentTime;
    [0, 0.32].forEach((offset) => {
      const when = now + offset;
      const motor = ctx.createOscillator();
      motor.type = 'square';
      motor.frequency.value = 165;
      const rattle = ctx.createBiquadFilter();
      rattle.type = 'bandpass';
      rattle.frequency.value = 330;
      rattle.Q.value = 2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(0.09, when + 0.02);
      g.gain.setValueAtTime(0.09, when + 0.2);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 0.24);
      motor.connect(rattle);
      rattle.connect(g);
      g.connect(this.sfxIn!);
      motor.start(when);
      motor.stop(when + 0.26);
    });
    this.tone({ freq: 1568, when: now + 0.62, attack: 0.004, decay: 0.18, peak: 0.06 });
    this.tone({ freq: 2093, when: now + 0.7, attack: 0.004, decay: 0.3, peak: 0.05 });
  }

  /** Office landline: one electronic double trill (call it every ~2.5 s while it rings). */
  playDeskRing() {
    const ctx = this.ensureContext();
    if (!this.sfxIn) return;
    const now = ctx.currentTime;
    for (const burst of [0, 0.5]) {
      for (let i = 0; i < 8; i++) {
        const when = now + burst + i * 0.045;
        this.tone({ type: 'square', freq: i % 2 ? 1180 : 940, when, attack: 0.003, decay: 0.04, peak: 0.028, pan: -0.35 });
      }
    }
  }

  /** Handset lifted off / put back on the cradle. */
  playHandset(down = false) {
    this.noiseHit({ filter: 'lowpass', freq: down ? 900 : 1400, attack: 0.002, decay: down ? 0.12 : 0.07, peak: down ? 0.22 : 0.14, pan: -0.3 });
    if (!down) this.tone({ freq: 425, attack: 0.01, decay: 0.35, peak: 0.02, pan: -0.3 });
  }

  /** A single soft key press — used for live-typed interview answers. */
  playKeyTick() {
    this.noiseHit({ filter: 'highpass', freq: 2800 + Math.random() * 1200, attack: 0.001, decay: 0.008, peak: 0.018 + Math.random() * 0.01, pan: Math.random() * 0.4 - 0.2 });
  }

  /**
   * Open-plan office bed for the workday: room tone + air conditioning, colleagues typing in
   * bursts around the room, a distant desk phone, the printer and a low murmur of voices, plus
   * the wall clock. `setUrgency(1)` in the last hour doubles the clock and brings it forward.
   */
  startOfficeAmbience(rain = false): { setUrgency: (u: number) => void; stop: () => void } {
    const ctx = this.ensureContext();
    if (!this.sfxIn) return { setUrgency: () => {}, stop: () => {} };
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0, ctx.currentTime);
    bus.gain.linearRampToValueAtTime(1, ctx.currentTime + 2);
    bus.connect(this.sfxIn);
    const sources: AudioScheduledSourceNode[] = [];
    const timers: number[] = [];
    let urgency = 0;
    let stopped = false;

    const bed = (type: BiquadFilterType, freq: number, q: number, level: number) => {
      const src = this.noiseSource(ctx);
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = level;
      src.connect(f);
      f.connect(g);
      g.connect(bus);
      this.startNoise(src, ctx.currentTime);
      sources.push(src);
      return g;
    };
    bed('lowpass', 220, 0.5, 0.02); // room tone / AC
    // a rainy day: the recording, soft, as heard through the office windows
    if (rain) this.loopSample(RAIN_SRC, bus, 0.35, sources, () => !stopped, () => {});
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
        this.noiseHit({ filter: 'highpass', freq: 2600, when: t, attack: 0.001, decay: 0.008, peak: 0.02 + Math.random() * 0.015, pan });
        this.noiseHit({ filter: 'bandpass', freq: 650, q: 1.5, when: t, attack: 0.001, decay: 0.015, peak: 0.012, pan });
      }
    };
    const deskPhone = () => {
      const pan = Math.random() * 1.4 - 0.7;
      for (let ring = 0; ring < 2; ring++) {
        const start = ctx.currentTime + ring * 1.6;
        for (let i = 0; i < 18; i++) {
          this.tone({ type: 'square', freq: i % 2 ? 1180 : 1420, when: start + i * 0.06, attack: 0.003, decay: 0.05, peak: 0.006, pan });
        }
      }
    };
    const printer = () => {
      const steps = 48;
      const curve = new Float32Array(steps);
      for (let i = 0; i < steps; i++) curve[i] = (0.4 + 0.6 * Math.abs(Math.sin(i * 1.3))) * Math.min(1, i / 4, (steps - i) / 6) * 0.03;
      this.noiseHit({ filter: 'bandpass', freq: 900, freqEnd: 1300, q: 2, when: ctx.currentTime, decay: 2.6, peak: 0, curve, pan: 0.6 });
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
      this.tone({ type: 'triangle', freq: tock ? 1900 : 2400, attack: 0.001, decay: 0.02, peak: 0.012 + urgency * 0.02, pan: -0.5 });
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

  // ── After-work rush (day-end screen) ─────────────────────────────────────

  /**
   * "İş çıkışı hengamesi": the city at 17:05. A traffic bed with cars whooshing past left→right,
   * horns (short taps and the odd long angry one), crowd murmur, footsteps clattering down
   * stairs, Istanbulkart turnstile beeps — plus one signature per scene: office elevator dings,
   * metrobüs air brakes, the metro arriving + station chime, the ferry horn and gulls.
   */
  startRushHourAmbience(scene: 0 | 1 | 2 | 3): () => void {
    const ctx = this.ensureContext();
    if (!this.sfxIn) return () => {};
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0, ctx.currentTime);
    bus.gain.linearRampToValueAtTime(1, ctx.currentTime + 2.5);
    bus.connect(this.sfxIn);
    const sources: AudioScheduledSourceNode[] = [];
    const timers: number[] = [];
    let stopped = false;

    const bed = (type: BiquadFilterType, freq: number, q: number, level: number, lfoRate = 0, lfoDepth = 0) => {
      const src = this.noiseSource(ctx);
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = level;
      src.connect(f);
      f.connect(g);
      g.connect(bus);
      this.startNoise(src, ctx.currentTime);
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
      const src = this.noiseSource(ctx);
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
      this.startNoise(src, now, dur + 0.1);
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
        this.noiseHit({ filter: 'lowpass', freq: 900, when: t, attack: 0.002, decay: 0.05, peak: 0.07, pan });
        this.noiseHit({ filter: 'bandpass', freq: 2600, q: 2, when: t + 0.01, attack: 0.001, decay: 0.02, peak: 0.02, pan });
        this.noiseHit({ filter: 'lowpass', freq: 700, when: t + 0.12, attack: 0.002, decay: 0.08, peak: 0.02, pan: -pan });
      }
    };
    // Istanbulkart validator: two short high beeps.
    const turnstile = () => {
      const now = ctx.currentTime;
      const pan = Math.random() * 1.2 - 0.6;
      this.tone({ type: 'square', freq: 2350, when: now, attack: 0.002, decay: 0.06, peak: 0.018, pan });
      this.tone({ type: 'square', freq: 2350, when: now + 0.11, attack: 0.002, decay: 0.08, peak: 0.018, pan });
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
          this.tone({ freq: 1318.5, attack: 0.004, decay: 0.8, peak: 0.05 });
          this.tone({ freq: 1046.5, when: ctx.currentTime + 0.35, attack: 0.004, decay: 1.1, peak: 0.05 });
        }, 4);
        break;
      case 1: // metrobüs: air brakes + door beeps
        every(8, 14, () => {
          this.noiseHit({ filter: 'highpass', freq: 2500, attack: 0.01, decay: 0.9, peak: 0.08, pan: 0.3 });
          [0.9, 1.2, 1.5].forEach((d) => this.tone({ type: 'square', freq: 1600, when: ctx.currentTime + d, attack: 0.002, decay: 0.12, peak: 0.02, pan: 0.3 }));
        }, 3);
        break;
      case 2: // servis gridlock in the rain: the rain recording, impatient horns, idling diesels, door hiss
        this.loopSample(RAIN_SRC, bus, 0.45, sources, () => !stopped, () => bed('bandpass', 2600, 0.4, 0.018));
        bed('lowpass', 90, 0.8, 0.05, 0.4, 0.02);
        every(1.2, 3.2, horn, 1);
        every(7, 12, () => {
          this.noiseHit({ filter: 'highpass', freq: 2200, attack: 0.01, decay: 0.7, peak: 0.07, pan: 0.4 });
        }, 2);
        break;
      case 3: // ferry pier: horn + gulls, snow-softened
        every(16, 26, () => this.playFerryHorn(), 3);
        every(6, 11, () => this.playGullCall(Math.random() * 1.4 - 0.7, 0.5), 5);
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

  // ── Weather ambience (heard through the cafeteria window) ─────────────────

  /**
   * Starts the weather bed for the break room and returns a stop function.
   * - sunny:  distant gull calls + an occasional Bosphorus ferry horn
   * - windy:  gusting wind (slowly modulated band-passed noise) + the odd gull
   * - rainy:  rain hiss + drops ticking on the glass + rare distant thunder
   * - snowy:  near-silence — soft, muffled wind (snow absorbs sound)
   */
  startWeatherAmbience(kind: 'sunny' | 'windy' | 'rainy' | 'snowy'): () => void {
    const ctx = this.ensureContext();
    if (!this.sfxIn) return () => {};
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0, ctx.currentTime);
    bus.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.5);
    // Everything outside is heard through glass: roll off the top end.
    const glass = ctx.createBiquadFilter();
    glass.type = 'lowpass';
    glass.frequency.value = kind === 'snowy' ? 1400 : 5200;
    bus.connect(glass);
    glass.connect(this.sfxIn);

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
      const src = this.noiseSource(ctx);
      const f = ctx.createBiquadFilter();
      f.type = filterType;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = level;
      src.connect(f);
      f.connect(g);
      g.connect(bus);
      this.startNoise(src, ctx.currentTime);
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
          this.noiseHit({ filter: 'bandpass', freq: 1800 + Math.random() * 6200, q: 4, attack: 0.0006, decay: 0.003 + Math.random() * 0.01, peak: 0.008 + Math.random() * 0.022, pan: Math.random() * 1.8 - 0.9 });
      }, 24);
      timers.push(-tickTimer);
    };

    switch (kind) {
      case 'sunny':
        noiseBed('lowpass', 500, 0.5, 0.012); // distant city/sea air
        every(5, 11, () => this.playGullCall(Math.random() * 1.4 - 0.7, 0.6), 2);
        every(26, 40, () => this.playFerryHorn(), 7);
        break;
      case 'windy':
        wind(0.06, 520);
        every(9, 16, () => this.playGullCall(Math.random() * 1.4 - 0.7, 0.4), 5);
        break;
      case 'rainy':
        // the real recording, heard through the glass; a rare distant thunder on top
        // straight to the output, not through the glass filter: this is the recording as it is
        this.loopSample(RAIN_SRC, this.sfxIn, 0.9, sources, () => !stopped, synthRain);
        every(28, 55, () => this.playThunder(), 14);
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

  /** Herring gull "kee-ow": FM-roughened sine with a rising-then-falling pitch, 2–4 calls. */
  private playGullCall(pan: number, distance: number) {
    const ctx = this.ensureContext();
    if (!this.sfxIn) return;
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
      this.envelope(g.gain, when, 0.03, 0.035 * distance, dur);
      const p = this.panner(ctx, pan);
      osc.connect(bp);
      bp.connect(g);
      g.connect(p);
      p.connect(this.sfxIn);
      osc.start(when);
      fm.start(when);
      osc.stop(when + dur + 0.05);
      fm.stop(when + dur + 0.05);
    }
  }

  /** Distant vapur horn: two detuned low saws a fourth apart, slow swell, long echo off the shore. */
  private playFerryHorn() {
    const ctx = this.ensureContext();
    if (!this.sfxIn) return;
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
    g.connect(this.sfxIn);
    g.connect(echo);
    echo.connect(this.sfxIn);
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
  private playThunder() {
    const ctx = this.ensureContext();
    const steps = 64;
    const curve = new Float32Array(steps);
    for (let i = 0; i < steps; i++) {
      const x = i / (steps - 1);
      const swell = Math.min(1, x / 0.15) * Math.exp(-x * 3.2);
      curve[i] = swell * (0.7 + 0.3 * Math.random()) * 0.22;
    }
    this.noiseHit({ filter: 'lowpass', freq: 160, freqEnd: 70, q: 0.9, when: ctx.currentTime, decay: 3.6, peak: 0, curve, pan: Math.random() * 0.8 - 0.4 });
  }

  // ── Lunch break foley ──────────────────────────────────────────────────────

  private playNoise(duration: number, filterType: BiquadFilterType, frequency: number, volume: number, delay = 0) {
    const ctx = this.ensureContext();
    const steps = 32;
    const curve = new Float32Array(steps);
    for (let i = 0; i < steps; i++) curve[i] = Math.sin((Math.PI * i) / (steps - 1)) * volume;
    this.noiseHit({ filter: filterType, freq: frequency, when: ctx.currentTime + delay, decay: duration, peak: 0, curve });
  }

  /** Short slurp for sipping tea, soup or ayran. */
  /** A cat's purr: a low rumble pulsing about eleven times a second. */
  playPurr() {
    for (let i = 0; i < 20; i++) this.playNoise(0.07, 'lowpass', 160, 0.35, i * 0.09);
  }

  playSip() {
    this.playNoise(0.28, 'bandpass', 900, 0.35);
  }

  /** Soft crunch for a bite of food. */
  playBite() {
    this.playNoise(0.1, 'lowpass', 700, 0.4);
    this.playNoise(0.08, 'lowpass', 500, 0.3, 0.12);
  }

  /** Wet squish for squeezing a lemon wedge. */
  playSqueeze() {
    this.playNoise(0.18, 'bandpass', 1600, 0.3);
    this.playNoise(0.14, 'bandpass', 2600, 0.18, 0.38);
    this.playNoise(0.14, 'bandpass', 2200, 0.16, 0.76);
  }

  /**
   * Liquid pouring into a tulip glass. The defining cue of a real pour is the air column above
   * the liquid: as it shortens, its resonance rises — so a band-passed noise "throat" plus a
   * narrower glassy partial track 1/(air length). Turbulence is a pair of slow LFOs on the level,
   * bubble "blips" pitch up with the fill, and the stop ends in a couple of drips.
   * Brew (from the demlik) is a thin, bright trickle; water (from the kettle) is fuller and louder.
   */
  startPour(kind: 'brew' | 'water'): PourSound {
    const ctx = this.ensureContext();
    if (!this.sfxIn) return { setFill: () => {}, stop: () => {} };
    const now = ctx.currentTime;
    const water = kind === 'water';
    const level = water ? 0.26 : 0.16;

    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, now);
    out.gain.exponentialRampToValueAtTime(level, now + 0.05);
    out.connect(this.sfxIn);

    const src = this.noiseSource(ctx);
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
    this.startNoise(src, now);

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
    this.noiseHit({ filter: 'bandpass', freq: 1800, q: 1.2, attack: 0.002, decay: 0.07, peak: water ? 0.14 : 0.08 });

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
      this.tone({ freq: f * (0.9 + Math.random() * 0.4), freqEnd: f * 1.5, attack: 0.002, decay: 0.03, peak: 0.018 + Math.random() * 0.014, pan: Math.random() * 0.4 - 0.2 });
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
        this.tone({ freq: f, freqEnd: f * 1.6, when: t + offset, attack: 0.002, decay: 0.05, peak: 0.05 });
      });
      window.setTimeout(() => out.disconnect(), 400);
    };

    return { setFill, stop };
  }

  /** Glass-and-spoon clink; `count` rapid clinks for stirring. */
  playClink(count = 1) {
    const ctx = this.ensureContext();
    for (let i = 0; i < count; i++) {
      const when = ctx.currentTime + i * 0.16;
      this.tone({ freq: 3150 + Math.random() * 80, when, attack: 0.004, decay: 0.35, peak: 0.09 });
      this.tone({ freq: 4720 + Math.random() * 80, when, attack: 0.004, decay: 0.3, peak: 0.05 });
    }
  }
}

export const audioEngine = new AudioEngine();
