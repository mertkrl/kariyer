/*
 * Bakkalın sesleri: hepsi Web Audio ile anında üretilir, dosya yok. Kapı çıngırağı, yazar kasa
 * zili ve çekmecesi, metal kepenk; arkada havaya göre kuş cıvıltısı ya da yağmur.
 * Ses kapatılınca hepsi susar. Tarayıcı ilk dokunuştan önce ses çalmaz: bağlam ilk çağrıda kurulur.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
/** Ses düzeyi (0–1): üst çubuktaki kaydırıcıdan; tarayıcıda saklanır. */
const VOLUME_KEY = 'kariyerweb-bakkal-ses';
let volume = readVolume();
let ambience: { stop: () => void } | null = null;

function ac() {
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : volume;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function readVolume(): number {
  try {
    const v = Number(localStorage.getItem(VOLUME_KEY));
    return localStorage.getItem(VOLUME_KEY) !== null && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.6;
  } catch {
    return 0.6;
  }
}

const apply = () => {
  if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, 0.05);
};

export function setMuted(m: boolean) {
  muted = m;
  apply();
}

export const isMuted = () => muted;

/** Ses düzeyi 0–1; sıfıra çekmek susturmakla aynı değildir: düğme açıp kapatır, kaydırıcı düzeyi tutar. */
export function setVolume(v: number) {
  volume = Math.max(0, Math.min(1, v));
  apply();
  try {
    localStorage.setItem(VOLUME_KEY, String(volume));
  } catch {
    // saklanamazsa düzey yalnızca bu oturumda geçerli
  }
}

export const getVolume = () => volume;

function tone(freq: number, at: number, dur: number, gain: number, type: OscillatorType = 'sine') {
  const c = ac();
  if (!c || !master) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, c.currentTime + at);
  g.gain.linearRampToValueAtTime(gain, c.currentTime + at + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + at + dur);
  o.connect(g).connect(master);
  o.start(c.currentTime + at);
  o.stop(c.currentTime + at + dur + 0.05);
}

function noise(dur: number) {
  const c = ac()!;
  const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function burst(at: number, dur: number, gain: number, freq: number, q = 1) {
  const c = ac();
  if (!c || !master) return;
  const s = c.createBufferSource();
  s.buffer = noise(dur);
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, c.currentTime + at);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + at + dur);
  s.connect(f).connect(g).connect(master);
  s.start(c.currentTime + at);
}

/** Kapı çıngırağı: iki üç metalik vuruş. */
export function bell() {
  [0, 0.12, 0.26].forEach((t, i) => {
    tone(2350 - i * 60, t, 0.7, 0.12);
    tone(3520 - i * 80, t, 0.4, 0.05);
  });
}

/** Yazar kasa: tuş tıkırtısı, zil, çekmecenin kayması. */
export function register() {
  [0, 0.07, 0.14].forEach((t) => burst(t, 0.03, 0.25, 3000, 4));
  tone(1760, 0.25, 0.9, 0.18);
  tone(2640, 0.25, 0.6, 0.06);
  burst(0.35, 0.25, 0.2, 500, 0.8);
}

/** Arka plan: güneşli günde ara sıra kuş, yağmurda sürekli yağmur hışırtısı. */
export function setAmbience(kind: 'birds' | 'rain' | 'quiet') {
  ambience?.stop();
  ambience = null;
  if (kind === 'quiet') return;
  const c = ac();
  if (!c || !master) return;
  if (kind === 'rain') {
    // yağmur: üç katman. Uzakta düzgün bir hışırtı (pembe gürültü, bant geçiren), yakında
    // camla saçağa düşen tek tek damlalar ve ara ara esen rüzgârla kabarıp sönen bir dalga.
    const len = 4;
    const buf = c.createBuffer(2, Math.floor(c.sampleRate * len), c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      // Paul Kellet'in pembe gürültüsü: beyaz gürültüden daha yumuşak, gerçek yağmura yakın
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < d.length; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
      // döngü dikişi duyulmasın: baş ve son kısa bir süre birbirine geçer
      const fade = Math.floor(c.sampleRate * 0.05);
      for (let i = 0; i < fade; i++) {
        const k = i / fade;
        d[i] = d[i] * k + d[d.length - fade + i] * (1 - k);
      }
    }
    const s = c.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    s.loopEnd = len - 0.05;
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 350;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 6500;
    const bed = c.createGain();
    bed.gain.value = 0.22;
    // rüzgâr: yavaş bir dalga hışırtıyı kabartıp söndürür
    const gust = c.createOscillator();
    const gustDepth = c.createGain();
    gust.frequency.value = 0.08;
    gustDepth.gain.value = 0.07;
    gust.connect(gustDepth).connect(bed.gain);
    s.connect(hp).connect(lp).connect(bed).connect(master);
    s.start();
    gust.start();
    // camdaki damlalar: kısa, parlak tıkırtılar; ara ara saçaktan düşen iri bir damla
    const drop = () => {
      const at = Math.random() * 0.25;
      if (Math.random() < 0.12) {
        tone(900 + Math.random() * 500, at, 0.06, 0.03, 'sine');
        burst(at, 0.04, 0.05, 1800, 3);
      } else burst(at, 0.012 + Math.random() * 0.015, 0.04 + Math.random() * 0.05, 3000 + Math.random() * 4000, 5);
    };
    const id = window.setInterval(() => {
      for (let i = 0; i < 3; i++) if (Math.random() < 0.7) drop();
    }, 90);
    ambience = {
      stop: () => {
        window.clearInterval(id);
        s.stop();
        gust.stop();
      },
    };
    return;
  }
  const chirp = () => {
    const base = 2600 + Math.random() * 1200;
    [0, 0.09, 0.18].forEach((t, i) => tone(base + i * 300, t, 0.07, 0.035, 'sine'));
  };
  const id = window.setInterval(() => Math.random() < 0.5 && chirp(), 3500);
  ambience = { stop: () => window.clearInterval(id) };
}

/** Kasa ya da hesap makinesi tuşu: kısa, kuru bir tık. */
export function key() {
  burst(0, 0.025, 0.18, 2400, 3);
  tone(1200, 0, 0.03, 0.03, 'square');
}

/**
 * Metal kepenk: lamelleri sıra sıra takırdayan, altta uğuldayan bir sarılma; sonunda kepenk
 * yuvasına ya da yere vurur. Açılışta takırtı yavaşlayarak durur, inerken hızlanır.
 */
export function shutter(down = false) {
  const c = ac();
  if (!c || !master) return;
  const dur = 1.45;
  // lamel takırtısı: kısa metalik vuruşlar, aralığı yavaş yavaş değişir
  let t = 0.02;
  for (let i = 0; t < dur; i++) {
    const k = t / dur;
    burst(t, 0.045, 0.1 + Math.random() * 0.05, 1500 + Math.random() * 1800, 6);
    tone(240 + Math.random() * 90, t, 0.05, 0.025, 'square');
    t += down ? 0.07 - k * 0.035 : 0.035 + k * 0.035;
  }
  // altta sac uğultusu: alçak geçiren gürültü, yükselip söner
  const s = c.createBufferSource();
  s.buffer = noise(dur + 0.2);
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 380;
  const g = c.createGain();
  g.gain.setValueAtTime(0, c.currentTime);
  g.gain.linearRampToValueAtTime(0.32, c.currentTime + 0.15);
  g.gain.setValueAtTime(0.32, c.currentTime + dur - 0.2);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur + 0.15);
  s.connect(f).connect(g).connect(master);
  s.start();
  // vuruş: boğuk güm ve sacın kısa çınlaması
  tone(down ? 62 : 85, dur, 0.35, 0.45, 'triangle');
  burst(dur, 0.18, 0.35, down ? 220 : 320, 1);
  tone(610, dur, 0.6, 0.05, 'triangle');
  tone(947, dur + 0.01, 0.45, 0.03, 'triangle');
}
