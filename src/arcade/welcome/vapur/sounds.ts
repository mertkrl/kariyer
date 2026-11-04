import { audioEngine as e } from '../../../audio/audioEngine';

/*
 * Vapurun sesleri: dosya yok, hepsi ortak ses motorunda üretilir ve sitenin sessiz tercihine
 * uyar (motorun ana kazancı). Gerçekçilik için:
 *   - Deniz ve makine sürekli çalan bir ses grafiği (startAmbience): iki kanalda yavaşça kabarıp
 *     sönen deniz uğultusu ve köpük hışırtısı, silindir vuruşuyla titreşen kalın dizel motoru,
 *     arada gövdeye vuran dalgalar ve rüzgâr.
 *   - Düdük: birbirinden azıcık akort dışı üç kalın ses, açılışta hafif perde kayması; kıyıdan geri
 *     dönen yankı (gecikme hattı) ve uzun bir yankılanma (üretilmiş dürtü yanıtı).
 *   - Martı: gırtlaksı, perdesi hızla yükselip düşen çağrılar ("kiyav kiyav"), uzaklığa göre kısık
 *     ve yankılı.
 *   - Çay: kaşığın bardağa çarpması (uyumsuz kısmi tonlar), dökülen çayın dolan bardakta yükselen
 *     tınısı, yudum, şekerin düşüşü. Simidin kıtır kıtır kopuşu, fırlatışın hışırtısı, kanat sesi.
 */

const later = (ms: number, f: () => void) => window.setTimeout(f, ms);

interface Bus {
  ctx: AudioContext;
  dry: AudioNode;
  verb: AudioNode;
}

let bus: Bus | null = null;

/** Ses grafiği: kuru hat ve paylaşılan yankılanma (açık deniz, kıyıdan dönen ses). */
function getBus(): Bus | null {
  const ctx = e.ensureContext();
  if (!e.sfxIn) return null;
  if (bus && bus.ctx === ctx) return bus;
  const len = Math.floor(ctx.sampleRate * 2.6);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3.2;
  }
  const conv = ctx.createConvolver();
  conv.buffer = ir;
  const wet = ctx.createGain();
  wet.gain.value = 0.55;
  conv.connect(wet);
  wet.connect(e.sfxIn);
  bus = { ctx, dry: e.sfxIn, verb: conv };
  return bus;
}

function noise(ctx: AudioContext) {
  const src = e.noiseSource(ctx);
  e.startNoise(src, ctx.currentTime);
  return src;
}

function lfo(ctx: AudioContext, freq: number, depth: number, target: AudioParam) {
  const o = ctx.createOscillator();
  o.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.value = depth;
  o.connect(g);
  g.connect(target);
  o.start();
  return o;
}

/** Bir ses düğümünü kuru ve yankılı hatlara, verilen konumda bağlar. */
function route(b: Bus, node: AudioNode, pan: number, wet: number) {
  const p = e.panner(b.ctx, pan);
  node.connect(p);
  p.connect(b.dry);
  if (wet > 0) {
    const w = b.ctx.createGain();
    w.gain.value = wet;
    p.connect(w);
    w.connect(b.verb);
  }
}

/**
 * Güvertede sürekli duyulanlar: deniz, köpük, makine, rüzgâr; arada gövdeye vuran dalgalar.
 * Döndürdüğü işlev sesi yavaşça kısıp kaynakları durdurur.
 */
export function startAmbience(): () => void {
  const b = getBus();
  if (!b) return () => {};
  const { ctx } = b;
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(1, now + 2.5);
  master.connect(b.dry);
  const stops: (AudioScheduledSourceNode | OscillatorNode)[] = [];

  // deniz: iki kanalda ayrı kabaran alçak uğultu
  for (const [pan, rate, phase] of [
    [-0.7, 0.07, 0],
    [0.7, 0.09, 1.3],
  ] as const) {
    const n = noise(ctx);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    lp.Q.value = 0.4;
    const g = ctx.createGain();
    g.gain.value = 0.11;
    n.connect(lp);
    lp.connect(g);
    const p = e.panner(ctx, pan);
    g.connect(p);
    p.connect(master);
    stops.push(n, lfo(ctx, rate, 200, lp.frequency), lfo(ctx, rate * 1.4 + phase * 0.01, 0.05, g.gain));
    // köpük hışırtısı
    const n2 = noise(ctx);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2600;
    bp.Q.value = 0.5;
    const g2 = ctx.createGain();
    g2.gain.value = 0.012;
    n2.connect(bp);
    bp.connect(g2);
    g2.connect(p);
    stops.push(n2, lfo(ctx, rate * 2.1, 0.01, g2.gain));
  }

  // dizel makine: kalın testere dişi, silindir vuruşuyla titreşir; altında gürültülü gürleme
  const thump = ctx.createGain();
  thump.gain.value = 0.7;
  stops.push(lfo(ctx, 7.6, 0.3, thump.gain));
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 150;
  lp.Q.value = 1.2;
  for (const [type, freq, gain] of [
    ['sawtooth', 38, 0.11],
    ['square', 57, 0.025],
    ['sine', 76, 0.04],
  ] as const) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = gain;
    o.connect(g);
    g.connect(lp);
    o.start();
    stops.push(o, lfo(ctx, 0.05, 0.6, o.frequency));
  }
  const rumble = noise(ctx);
  const rlp = ctx.createBiquadFilter();
  rlp.type = 'lowpass';
  rlp.frequency.value = 110;
  const rg = ctx.createGain();
  rg.gain.value = 0.16;
  rumble.connect(rlp);
  rlp.connect(rg);
  rg.connect(lp);
  stops.push(rumble);
  lp.connect(thump);
  thump.connect(master);

  // rüzgâr: yüksekte, yavaşça dolaşan hışırtı
  const wind = noise(ctx);
  const wbp = ctx.createBiquadFilter();
  wbp.type = 'bandpass';
  wbp.frequency.value = 700;
  wbp.Q.value = 0.9;
  const wg = ctx.createGain();
  wg.gain.value = 0.014;
  wind.connect(wbp);
  wbp.connect(wg);
  wg.connect(master);
  stops.push(wind, lfo(ctx, 0.05, 380, wbp.frequency), lfo(ctx, 0.08, 0.01, wg.gain));

  // gövdeye vuran dalgalar
  let alive = true;
  const slap = () => {
    if (!alive) return;
    wave(0.7 + Math.random() * 0.6);
    later(1800 + Math.random() * 2800, slap);
  };
  later(1200, slap);

  return () => {
    alive = false;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    later(1400, () => {
      stops.forEach((s) => {
        try {
          s.stop();
        } catch {
          // zaten durmuş
        }
      });
      master.disconnect();
    });
  };
}

/** Gövdeye vuran bir dalga: kabaran, sonra köpürerek çekilen gürültü. */
export function wave(level = 1) {
  const b = getBus();
  if (!b) return;
  const { ctx } = b;
  const t = ctx.currentTime;
  const n = e.noiseSource(ctx);
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 0.7;
  f.frequency.setValueAtTime(380, t);
  f.frequency.linearRampToValueAtTime(1100, t + 0.35);
  f.frequency.exponentialRampToValueAtTime(260, t + 1.6);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.09 * level, t + 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
  n.connect(f);
  f.connect(g);
  route(b, g, -0.6 + Math.random() * 1.2, 0.15);
  e.startNoise(n, t, 2);
}

/**
 * Vapur düdüğü: üç kalın ses birlikte (azıcık akort dışı), açılışta perde oturur; kıyıdan
 * yankısı geri gelir. `distant` karşıdan gelen vapurun düdüğü: kısık, boğuk, çok yankılı.
 */
export function horn(long = true, distant = false) {
  const b = getBus();
  if (!b) return;
  const { ctx } = b;
  const t = ctx.currentTime;
  const dur = long ? 2.8 : 1.2;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = distant ? 420 : 950;
  lp.Q.value = 0.8;
  const g = ctx.createGain();
  const peak = distant ? 0.05 : 0.16;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.18);
  g.gain.setValueAtTime(peak, t + dur);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.6);
  for (const [freq, type, level] of [
    [110, 'sawtooth', 1],
    [110.9, 'sawtooth', 0.8],
    [138.6, 'square', 0.35],
    [55, 'sine', 0.9],
  ] as const) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq * 0.96, t);
    o.frequency.exponentialRampToValueAtTime(freq, t + 0.25);
    const og = ctx.createGain();
    og.gain.value = level * 0.35;
    o.connect(og);
    og.connect(lp);
    o.start(t);
    o.stop(t + dur + 0.7);
  }
  lp.connect(g);
  // kıyıdan dönen yankı
  const delay = ctx.createDelay(2);
  delay.delayTime.value = distant ? 0.9 : 0.62;
  const fb = ctx.createGain();
  fb.gain.value = 0.32;
  const dl = ctx.createBiquadFilter();
  dl.type = 'lowpass';
  dl.frequency.value = 500;
  g.connect(delay);
  delay.connect(dl);
  dl.connect(fb);
  fb.connect(delay);
  route(b, g, distant ? -0.4 : 0, distant ? 0.9 : 0.45);
  route(b, fb, 0.3, 0.6);
}

/** Martı çağrısı: "kiyav kiyav" — gırtlaksı, perdesi hızla yükselip düşen birkaç ses. */
export function gull(near = 0.5) {
  const b = getBus();
  if (!b) return;
  const { ctx } = b;
  const calls = 2 + Math.floor(Math.random() * 3);
  const base = 900 + Math.random() * 300;
  const pan = -0.8 + Math.random() * 1.6;
  const level = 0.02 + near * 0.05;
  for (let i = 0; i < calls; i++) {
    const t = ctx.currentTime + i * (0.21 + Math.random() * 0.06);
    const len = i === 0 ? 0.36 : 0.22;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(base * 0.8, t);
    o.frequency.exponentialRampToValueAtTime(base * 1.75, t + len * 0.25);
    o.frequency.exponentialRampToValueAtTime(base * 0.95, t + len);
    // gırtlak: hızlı perde titremesi
    const vib = ctx.createOscillator();
    vib.frequency.value = 38;
    const vg = ctx.createGain();
    vg.gain.value = base * 0.05;
    vib.connect(vg);
    vg.connect(o.frequency);
    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.value = 1900;
    f1.Q.value = 2.4;
    const f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.value = 3300;
    f2.Q.value = 3;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level, t + 0.03);
    g.gain.setValueAtTime(level, t + len * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(f1);
    o.connect(f2);
    f1.connect(g);
    f2.connect(g);
    route(b, g, pan, 0.35 + (1 - near) * 0.5);
    o.start(t);
    vib.start(t);
    o.stop(t + len + 0.05);
    vib.stop(t + len + 0.05);
  }
}

/** Uyumsuz kısmi tonlarla ince bir metal ya da cam tını. */
function ring(partials: [number, number, number][], pan = 0.1, wet = 0.15) {
  const b = getBus();
  if (!b) return;
  const { ctx } = b;
  const t = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = 1;
  for (const [freq, peak, decay] of partials) {
    const o = ctx.createOscillator();
    o.frequency.value = freq * (0.98 + Math.random() * 0.04);
    const g = ctx.createGain();
    e.envelope(g.gain, t, 0.002, peak, decay);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + decay + 0.05);
  }
  route(b, out, pan, wet);
}

/** Bardak tabağa konunca: cam ve porselen. */
export function clink() {
  ring([
    [1850, 0.03, 0.35],
    [2930, 0.022, 0.28],
    [4420, 0.012, 0.18],
    [6100, 0.006, 0.12],
  ]);
  e.noiseHit({ filter: 'lowpass', freq: 700, attack: 0.001, decay: 0.05, peak: 0.03 });
}

/** Kaşık bardağa değince: ince, uzun tınlayan "çın". */
export function spoon() {
  ring([
    [3150, 0.022, 0.5],
    [4720, 0.016, 0.38],
    [6930, 0.009, 0.25],
    [9180, 0.005, 0.16],
  ]);
}

/** Yudum: kısa, ıslak bir çekiş. */
export function sip() {
  const b = getBus();
  if (!b) return;
  const { ctx } = b;
  const t = ctx.currentTime;
  const n = e.noiseSource(ctx);
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 3;
  f.frequency.setValueAtTime(700, t);
  f.frequency.linearRampToValueAtTime(1500, t + 0.35);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.05, t + 0.06);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  const trem = lfo(ctx, 22, 0.02, g.gain);
  n.connect(f);
  f.connect(g);
  route(b, g, 0.1, 0.05);
  e.startNoise(n, t, 0.5);
  trem.stop(t + 0.5);
}

/** Çay dökülüyor: bardak doldukça tınısı yükselen, köpüren akış. */
export function pour(seconds: number) {
  const b = getBus();
  if (!b) return;
  const { ctx } = b;
  const t = ctx.currentTime;
  const n = e.noiseSource(ctx);
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 6;
  f.frequency.setValueAtTime(420, t);
  f.frequency.exponentialRampToValueAtTime(1500, t + seconds);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.07, t + 0.12);
  g.gain.setValueAtTime(0.07, t + seconds - 0.15);
  g.gain.exponentialRampToValueAtTime(0.0001, t + seconds + 0.1);
  const gurgle = lfo(ctx, 17, 0.03, g.gain);
  n.connect(f);
  f.connect(g);
  route(b, g, 0.15, 0.08);
  e.startNoise(n, t, seconds + 0.2);
  gurgle.stop(t + seconds + 0.2);
}

/** Şeker çayın içine düşer. */
export function plop() {
  const b = getBus();
  if (!b) return;
  const { ctx } = b;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(1100, t);
  o.frequency.exponentialRampToValueAtTime(320, t + 0.08);
  const g = ctx.createGain();
  e.envelope(g.gain, t, 0.002, 0.05, 0.1);
  o.connect(g);
  route(b, g, 0.1, 0.1);
  o.start(t);
  o.stop(t + 0.15);
  e.noiseHit({ filter: 'highpass', freq: 3000, attack: 0.001, decay: 0.06, peak: 0.015 });
}

/** Simit kopar: kıtır kıtır kabuk, susam serpintisi. */
export function tear() {
  for (let i = 0; i < 9; i++) later(i * 26 + Math.random() * 20, () => e.noiseHit({ filter: 'bandpass', freq: 2200 + Math.random() * 2400, q: 1.5, attack: 0.001, decay: 0.02 + Math.random() * 0.03, peak: 0.03 }));
  later(60, () => e.noiseHit({ filter: 'lowpass', freq: 500, attack: 0.002, decay: 0.08, peak: 0.03 }));
}

/** Fırlatılan parçanın havayı yarışı. */
export function whoosh() {
  e.noiseHit({ filter: 'bandpass', freq: 500, freqEnd: 1800, q: 0.9, attack: 0.08, decay: 0.25, peak: 0.035 });
}

/** Kanat çırpışı: alçak, tok vuruşlar. */
export function flaps(n = 5) {
  for (let i = 0; i < n; i++) later(i * 130, () => e.noiseHit({ filter: 'lowpass', freq: 380 + Math.random() * 200, attack: 0.02, decay: 0.09, peak: 0.05 }));
}

/** Nefes: yavaşça kabaran, sonra sönen bir hışırtı. */
export function breath(inhale: boolean) {
  e.noiseHit({ filter: 'bandpass', freq: inhale ? 500 : 900, freqEnd: inhale ? 900 : 400, q: 0.6, attack: inhale ? 2.6 : 0.4, decay: inhale ? 1 : 3, peak: 0.02 });
}

/** Geri sayımın tıkı. */
export function tick(last: boolean) {
  e.tone({ type: 'triangle', freq: last ? 880 : 660, decay: 0.12, peak: 0.025 });
}
