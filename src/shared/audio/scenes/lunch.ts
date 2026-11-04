import type { EngineCore } from '../engineCore';
import type { PourSound } from '../engineCore';

/* Öğle arası: öğlen zili ve yeme içmenin efektleri. */

/**
 * Elektrikli öğle zili (okul/fabrika tarzı): küçük bir gonga saniyede ~22 kez vuran bir çekiç,
 * zilin uyumsuz kiplerinden kurulmuş, iki kez çalar ("zırrr… zırr") ve koridordan geliyormuş gibi
 * kısa bir koridor yankısıyla.
 */
export function playLunchBell(engine: EngineCore) {
  const ctx = engine.ensureContext();
  if (!engine.sfxIn) return;
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
  echoOut.connect(engine.sfxIn);

  const bell = ctx.createGain();
  bell.gain.value = 0.9;
  bell.connect(engine.sfxIn);
  bell.connect(echo);

  const rings: [number, number][] = [
    [0, 1.5],
    [1.85, 0.9],
  ];
  const strikeRate = 22;
  const pointsPerSecond = 600;

  for (const [start, length] of rings) {
    const total = length + 0.9; // çalış + doğal sönüm
    const n = Math.ceil(total * pointsPerSecond);
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / pointsPerSecond;
      if (t < length) {
        const phase = (t * strikeRate) % 1;
        curve[i] = 0.45 + 0.55 * Math.exp(-phase * 9); // her çekiç vuruşu gongu yeniden uyarır
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

    // Çekiç vızıltısı: vuruş hızında tıkırdayan parlak gürültü
    const buzz = engine.noiseSource(ctx);
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
    engine.startNoise(buzz, now + start, total + 0.05);
  }

  window.setTimeout(() => {
    bell.disconnect();
    echoOut.disconnect();
    feedback.disconnect();
  }, 5000);
}

/** Bir kedinin mırlaması: saniyede yaklaşık on bir kez atan alçak bir gümbürtü. */
export function playPurr(engine: EngineCore) {
  for (let i = 0; i < 20; i++) engine.playNoise(0.07, 'lowpass', 160, 0.35, i * 0.09);
}

/** Çay, çorba ya da ayran yudumlarken kısa bir höpürtü. */
export function playSip(engine: EngineCore) {
  engine.playNoise(0.28, 'bandpass', 900, 0.35);
}

/** Bir lokma için yumuşak bir çıtırtı. */
export function playBite(engine: EngineCore) {
  engine.playNoise(0.1, 'lowpass', 700, 0.4);
  engine.playNoise(0.08, 'lowpass', 500, 0.3, 0.12);
}

/** Bir limon dilimini sıkarken ıslak bir vıcıklık. */
export function playSqueeze(engine: EngineCore) {
  engine.playNoise(0.18, 'bandpass', 1600, 0.3);
  engine.playNoise(0.14, 'bandpass', 2600, 0.18, 0.38);
  engine.playNoise(0.14, 'bandpass', 2200, 0.16, 0.76);
}

/**
 * İnce belli bir bardağa dökülen sıvı. Gerçek bir dökmenin belirleyici ipucu sıvının üstündeki hava
 * sütunudur: kısaldıkça rezonansı yükselir; bu yüzden bant geçiren bir gürültü "boğazı" artı daha dar
 * camsı bir harmonik 1/(hava uzunluğu)'nu izler. Türbülans, seviyedeki yavaş iki LFO'dur; kabarcık
 * "bip"leri dolumla birlikte incelir ve duruş birkaç damlayla biter. Dem (demlikten) ince, parlak bir
 * süzülmedir; su (çaydanlıktan) daha dolgun ve daha yüksektir.
 */
export function startPour(engine: EngineCore, kind: 'brew' | 'water'): PourSound {
  const ctx = engine.ensureContext();
  if (!engine.sfxIn) return { setFill: () => {}, stop: () => {} };
  const now = ctx.currentTime;
  const water = kind === 'water';
  const level = water ? 0.26 : 0.16;

  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, now);
  out.gain.exponentialRampToValueAtTime(level, now + 0.05);
  out.connect(engine.sfxIn);

  const src = engine.noiseSource(ctx);
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
  engine.startNoise(src, now);

  // Türbülans: senkronsuz iki LFO seviyeyi titretir
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

  // Akış sıvıya (ya da boş bardağın dibine) ilk çarptığında ilk sıçrama
  engine.noiseHit({ filter: 'bandpass', freq: 1800, q: 1.2, attack: 0.002, decay: 0.07, peak: water ? 0.14 : 0.08 });

  let fill = 0;
  const base = water ? 380 : 520;
  const setFill = (f: number) => {
    fill = Math.max(0, Math.min(0.95, f));
    // Rezonans ∝ 1 / (kalan hava sütunu)
    const freq = base / (1 - fill * 0.85);
    const t = ctx.currentTime;
    throat.frequency.setTargetAtTime(freq, t, 0.03);
    glassy.frequency.setTargetAtTime(freq * 2.3, t, 0.03);
  };
  setFill(0);

  const bubbles = window.setInterval(() => {
    if (Math.random() > (water ? 0.55 : 0.35)) return;
    const f = (base * 2.2) / (1 - fill * 0.8);
    engine.tone({ freq: f * (0.9 + Math.random() * 0.4), freqEnd: f * 1.5, attack: 0.002, decay: 0.03, peak: 0.018 + Math.random() * 0.014, pan: Math.random() * 0.4 - 0.2 });
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
    // Emzikten son damlalar: yükselen "pınk" (bir damlanın boşluğunun çöküşü)
    [0.22, 0.55].forEach((offset, i) => {
      const f = 1500 + fill * 900 + i * 180;
      engine.tone({ freq: f, freqEnd: f * 1.6, when: t + offset, attack: 0.002, decay: 0.05, peak: 0.05 });
    });
    window.setTimeout(() => out.disconnect(), 400);
  };

  return { setFill, stop };
}

/** Cam ve kaşık şıngırtısı; karıştırmak için `count` kadar hızlı şıngırtı. */
export function playClink(engine: EngineCore, count = 1) {
  const ctx = engine.ensureContext();
  for (let i = 0; i < count; i++) {
    const when = ctx.currentTime + i * 0.16;
    engine.tone({ freq: 3150 + Math.random() * 80, when, attack: 0.004, decay: 0.35, peak: 0.09 });
    engine.tone({ freq: 4720 + Math.random() * 80, when, attack: 0.004, decay: 0.3, peak: 0.05 });
  }
}
