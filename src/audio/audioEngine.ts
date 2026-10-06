import { EngineCore, MUSIC_LOOP_SECONDS, MUSIC_MOODS, MUSIC_SRC, sliderToGain, type MusicMood, type PourSound, type ScatterPaper, type StampKind } from './engineCore';

export type { MusicMood, PourSound } from './engineCore';

/*
 * Oyunun sesi: ses grafiğinin (engineCore.ts) üstünde tek bir motor. Burada kontroller (sessiz,
 * iki ses kaydırıcısı, müzik ve ruh hâli) ve kısa tek seferlik sesler var; daha uzun sahneler
 * ./scenes'te yaşar ve öncekiyle aynı yöntemlerle ulaşılır, böylece oyunun geri kalanı yalnızca
 * `audioEngine` ile konuşur.
 */
class AudioEngine extends EngineCore {
  /** Bir kullanıcı hareketinden (tık) çağrılmalı; yoksa tarayıcılar sesi engeller. */
  init() {
    void this.loadScenes();
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

  /** Arka plan müziği için 0–1 kaydırıcı değeri. */
  setMusicVolume(level: number) {
    this.musicLevel = level;
    if (this.musicVolume) this.ramp(this.musicVolume.gain, sliderToGain(level) * (this.ducked ? 0.3 : 1), 0.08);
  }

  /** Konuşulan bir satırın altında müziği kıs, sonra geri aç. */
  duckMusic(on: boolean) {
    this.ducked = on;
    if (this.musicVolume) this.ramp(this.musicVolume.gain, sliderToGain(this.musicLevel) * (on ? 0.3 : 1), on ? 0.25 : 0.8);
  }

  /** Bütün ses efektleri için 0–1 kaydırıcı değeri. */
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
    // Günün başlangıcı müziği yavaşça açar; gün içindeki ruh hâli değişimleri daha hızlıdır.
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

  private loadMusic(ctx: AudioContext) {
    this.musicBuffer ??= fetch(MUSIC_SRC)
      .then((res) => res.arrayBuffer())
      .then((data) => ctx.decodeAudioData(data));
    return this.musicBuffer;
  }

  /** Boşluksuz arka plan döngüsünü başlatır (Web Audio örnek hassasiyetinde döngü yapar; <audio loop> boşluk bırakır). */
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
        // Müzik isteğe bağlı; oyun onsuz da sorunsuz oynanır.
        this.musicBuffer = null;
      });
  }

  stopAmbient() {
    this.musicWanted = false;
    this.musicSource?.stop();
    this.musicSource?.disconnect();
    this.musicSource = null;
  }

  /** Lastik damga: alçak gövde gümbürtüsü + kâğıt şaplağı. Onay daha parlak, ret daha ağır. */
  playStamp(kind: StampKind) {
    const approve = kind === 'approve';
    this.tone({ freq: approve ? 150 : 110, freqEnd: 55, decay: 0.16, peak: 0.55 });
    this.noiseHit({ filter: 'lowpass', freq: approve ? 2400 : 1100, decay: 0.12, peak: 0.45 });
    this.noiseHit({ filter: 'bandpass', freq: 3200, q: 1.5, decay: 0.04, peak: 0.18 });
  }

  /**
   * Niyete göre tasarlanmış düğme geri bildirimi:
   * - start:   sıcak, yükselen bir açılış (oyun başlıyor)
   * - confirm: parlak majör üçlü çan (yayınla / sonraki gün)
   * - connect: "bağlandı" çanına dönüşen veri el sıkışması cıvıltıları (İK sistemine giriş)
   * - select:  yumuşak tık; `variant` ses inceliğini kaydırır, komşu seçimler farklı tınlasın
   * - click:   nötr tık
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

  /** Genel arayüz etkileşimleri için yumuşak tık. */
  playUiClick() {
    this.tone({ freq: 1250, freqEnd: 900, decay: 0.05, peak: 0.1 });
    this.noiseHit({ filter: 'highpass', freq: 5000, decay: 0.012, peak: 0.05 });
  }

  /** Bir kararı geri almak için "geri sar": ters bir kabarma, ardından inen iki notalı bir figür. */
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

  /** Masadaki telefon: iki kısa titreşim vızıltısı (tahtaya çarparak) + yumuşak bir mesaj sesi. */
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

  /** Ofis sabit hattı: tek bir elektronik çift titreşim (çalarken ~2.5 sn'de bir çağır). */
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

  /** Ahize yuvasından kaldırıldı / geri kondu. */
  playHandset(down = false) {
    this.noiseHit({ filter: 'lowpass', freq: down ? 900 : 1400, attack: 0.002, decay: down ? 0.12 : 0.07, peak: down ? 0.22 : 0.14, pan: -0.3 });
    if (!down) this.tone({ freq: 425, attack: 0.01, decay: 0.35, peak: 0.02, pan: -0.3 });
  }

  /** Tek bir yumuşak tuş vuruşu: canlı yazılan mülakat cevapları için. */
  playKeyTick() {
    this.noiseHit({ filter: 'highpass', freq: 2800 + Math.random() * 1200, attack: 0.001, decay: 0.008, peak: 0.018 + Math.random() * 0.01, pan: Math.random() * 0.4 - 0.2 });
  }

  // ── Sahneler: her biri yapıldığı yerde, ./scenes/<dosya>.ts içinde belgelenmiştir ─────
  // İlk ekrandan bir an sonra gelirler (main.tsx sayfa boştayken ister, init() ilk tıkta);
  // ondan önce istenen bir sahne beklemek yerine sessiz kalır.

  private scenes: typeof import('./scenes') | null = null;
  private scenesLoading: Promise<void> | null = null;

  loadScenes() {
    this.scenesLoading ??= import('./scenes').then(
      (m) => void (this.scenes = m),
      () => void (this.scenesLoading = null), // offline before it was cached: try again next time
    );
    return this.scenesLoading;
  }

  startScan(duration = 3.2, locks: number[] = [], chime = true) { this.scenes?.scan.startScan(this, duration, locks, chime); }
  stopScan(fade = 0.12) { this.scenes?.scan.stopScan(this, fade); }
  playScanComplete() { this.scenes?.scan.playScanComplete(this); }
  startFloodRiser(duration: number) { this.scenes?.flood.startFloodRiser(this, duration); }
  stopFloodRiser(fade = 0.15) { this.scenes?.flood.stopFloodRiser(this, fade); }
  playCounterTick(pitch: number) { this.scenes?.flood.playCounterTick(this, pitch); }
  playPaperIn(pan: number) { this.scenes?.flood.playPaperIn(this, pan); }
  playPaperLand(pan: number) { this.scenes?.flood.playPaperLand(this, pan); }
  playScatter(papers: ScatterPaper[], chaotic: boolean) { this.scenes?.flood.playScatter(this, papers, chaotic); }
  startOfficeAmbience(rain = false): { setUrgency: (u: number) => void; stop: () => void } {
    return this.scenes?.office.startOfficeAmbience(this, rain) ?? { setUrgency: () => {}, stop: () => {} };
  }
  startRushHourAmbience(scene: 0 | 1 | 2 | 3): () => void { return this.scenes?.street.startRushHourAmbience(this, scene) ?? (() => {}); }
  startWeatherAmbience(kind: 'sunny' | 'windy' | 'rainy' | 'snowy'): () => void { return this.scenes?.weather.startWeatherAmbience(this, kind) ?? (() => {}); }
  playLunchBell() { this.scenes?.lunch.playLunchBell(this); }
  playPurr() { this.scenes?.lunch.playPurr(this); }
  playSip() { this.scenes?.lunch.playSip(this); }
  playBite() { this.scenes?.lunch.playBite(this); }
  playSqueeze() { this.scenes?.lunch.playSqueeze(this); }
  startPour(kind: 'brew' | 'water'): PourSound { return this.scenes?.lunch.startPour(this, kind) ?? { setFill: () => {}, stop: () => {} }; }
  playClink(count = 1) { this.scenes?.lunch.playClink(this, count); }
}

export const audioEngine = new AudioEngine();
