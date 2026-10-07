export type StampKind = 'approve' | 'reject';

/*
 * Sinyal akışı
 *
 *   SFX sesleri ──► sfxIn ──► sfxGlue (yumuşak kompresör) ──► sfxVolume ──┐
 *                                                                          ├──► master (sessiz) ──► sınırlayıcı ──► çıkış
 *   müzik parçası ──► parça kazancı (geçişler) ──► highpass ──► lowpass ──► moodGain ──► musicVolume ──┘
 *
 * Kullanıcının gördüğü iki kaydırıcı (Müzik / Efektler) musicVolume ve sfxVolume'u yönetir. Son
 * sınırlayıcı üst üste binen ani sesleri (ör. aynı anda saçılan 60 CV) yakalar, hiçbir şey patlamaz.
 */

export const SFX_LEVEL = 0.55;
/** Gerçek bir yağmur kaydı; hava ve sokak sahnelerinin altında döngüde çalar. */
export const RAIN_SRC = `${import.meta.env.BASE_URL}audio/rain.mp3`;

/**
 * Arka plan müziğinin sahnede nasıl durduğu:
 * - work:   tam aralıklı karışım
 * - break:  bant sınırlı, daha sessiz; yemekhanede çalan bir radyo gibi
 * - paused: kapalı bir kapının ardındaymış gibi iyice boğuk
 * - off:    kısılmış (giriş ekranları; yağmur sekansının kendi ses tasarımı var)
 */
export type MusicMood = 'work' | 'break' | 'paused' | 'off';

export const MUSIC_MOODS: Record<MusicMood, { volume: number; lowpass: number; highpass: number }> = {
  work: { volume: 0.3, lowpass: 16000, highpass: 20 },
  break: { volume: 0.3, lowpass: 2400, highpass: 280 },
  paused: { volume: 0.16, lowpass: 480, highpass: 20 },
  off: { volume: 0, lowpass: 18000, highpass: 20 },
};

/** Başvuru yağmuru sekansı tek başına çalar (altında müzik yok), bu yüzden ~+3.5 dB daha yüksek durur. */
export const FLOOD_BOOST = 1.5;

/** Kaydırıcı konumu (0–1) → doğrusal kazanç. Karesel bir eğri algılanan yüksekliği doğrusaldan çok daha iyi izler. */
export const sliderToGain = (v: number) => Math.max(0, Math.min(1, v)) ** 2;

/** Yapay zekâ taraması cıvıltıları için pentatonik "veri" perdeleri (Hz): müzikal, asla sert değil. */
export const DATA_PITCHES = [1318.5, 1568, 1760, 2093, 2349.3, 2637];

export interface ScatterPaper {
  /** -1 (sol) … 1 (sağ): kâğıdın uçuş yönünü izler. */
  pan: number;
  /** Patlamadan sonraki saniye. */
  delay: number;
}

/** Dökme için canlı tutamak: dolum seviyesini ver, akış kopunca durdur. */
export interface PourSound {
  /** Bardağın payı olarak sıvı yüksekliği (0–1). */
  setFill: (fill: number) => void;
  stop: () => void;
}

/**
 * Ses grafiği ve her sesin kurulduğu çalgılar: tonlar, gürültü vuruşları, kaydırma, zarflar,
 * döngülü kayıtlar. ./scenes'teki sahneler bunun üstünde çalar; AudioEngine kontrolleri ve kısa
 * tek seferlik sesleri ekler. Üyeler yalnızca bu ikisi için açıktır; src/audio dışında hiçbir şey
 * bu sınıfı kullanmaz.
 */
/** Bir sesin tek çalınışındaki küçük sapmalar: perde, ses düzeyi ve filtre parlaklığı. */
export interface Variation {
  pitch: number;
  gain: number;
  filter: number;
}

/**
 * Elle yapılan bir sesin doğal dağınıklığı: aynı damga 50. kez de biraz farklı vurur. Perde
 * ±%1,5 (bir çeyrek yarım ses kadar), ses düzeyi ±%10, filtre ±%6. Akorlar bozulmasın diye bir
 * olayın bütün parçaları aynı sapmayı paylaşır.
 */
export function makeVariation(rand: () => number = Math.random): Variation {
  const spread = (amount: number) => 1 + (rand() * 2 - 1) * amount;
  return { pitch: spread(0.015), gain: spread(0.1), filter: spread(0.06) };
}

/** Aynı anda (bu kadar ms içinde) çağrılan parçalar tek bir olaydır. */
const EVENT_WINDOW_MS = 25;

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
  musicBuffers = new Map<string, Promise<AudioBuffer>>();
  musicSource: AudioBufferSourceNode | null = null;
  musicSourceGain: GainNode | null = null;
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

    // SFX hattı: hafif yapıştırıcı sıkıştırma katmanlı efektleri bir arada tutar.
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

    // Müzik hattı
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

    // Gürültüye dayalı her sesi tek bir ortak 2 saniyelik beyaz gürültü tamponu besler.
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

  /** Bir kaydı bir kez indirip çözer; yüklenemezse null. */
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
   * Bir kaydı `level` seviyesinde `dest`e döngüyle, yavaşça açarak çalar. Dosya yüklenemezse
   * bunun yerine `fallback`i çağırır. `alive` yüklendikten sonra kontrol edilir, böylece çoktan
   * bitmiş bir sahne sessiz kalır.
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

  /** Rastgele bir noktadan başlayan döngülü gürültü kaynağı (tekrarlanan vuruşlar hiç aynı tınlamasın). */
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

  /** Vurmalı zarf: `peak`e hızlı yükselme, sessizliğe üstel sönüm. */
  envelope(param: AudioParam, when: number, attack: number, peak: number, decay: number) {
    param.setValueAtTime(0.0001, when);
    param.exponentialRampToValueAtTime(Math.max(0.0002, peak), when + attack);
    param.exponentialRampToValueAtTime(0.0001, when + attack + decay);
  }

  private variation: Variation & { at: number } = { at: -Infinity, pitch: 1, gain: 1, filter: 1 };

  /** Bu olayın sapması: yeni bir olay yeni bir sapma alır, aynı olayın parçaları aynısını paylaşır. */
  protected vary(): Variation {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - this.variation.at > EVENT_WINDOW_MS) this.variation = { at: now, ...makeVariation() };
    else this.variation.at = now;
    return this.variation;
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
    const v = this.vary();
    const osc = ctx.createOscillator();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(opts.freq * v.pitch, when);
    if (opts.freqEnd) osc.frequency.exponentialRampToValueAtTime(opts.freqEnd * v.pitch, when + attack + opts.decay);
    const gain = ctx.createGain();
    this.envelope(gain.gain, when, attack, opts.peak * v.gain, opts.decay);
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
    const v = this.vary();
    const src = this.noiseSource(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = opts.filter;
    filter.Q.value = opts.q ?? 0.8;
    filter.frequency.setValueAtTime(opts.freq * v.filter, when);
    if (opts.freqEnd) filter.frequency.exponentialRampToValueAtTime(opts.freqEnd * v.filter, when + total);
    const gain = ctx.createGain();
    if (opts.curve) {
      // Eğrinin zaman aralığını başka hiçbir otomasyon olayı paylaşamaz.
      gain.gain.value = 0;
      gain.gain.setValueCurveAtTime(v.gain === 1 ? opts.curve : opts.curve.map((x) => x * v.gain), when, total);
    } else {
      this.envelope(gain.gain, when, attack, opts.peak * v.gain, opts.decay);
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
