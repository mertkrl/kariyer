/*
 * Bakkalın sesleri: hepsi Web Audio ile anında üretilir, dosya yok. Kapı çıngırağı, yazar kasa
 * zili ve çekmecesi, düşen kutu, kedi mırıltısı; arkada havaya göre kuş cıvıltısı ya da yağmur.
 * Ses kapatılınca hepsi susar. Tarayıcı ilk dokunuştan önce ses çalmaz: bağlam ilk çağrıda kurulur.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let ambience: { stop: () => void } | null = null;

function ac() {
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.6;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function setMuted(m: boolean) {
  muted = m;
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.6, ctx.currentTime, 0.05);
}

export const isMuted = () => muted;

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

/** Kutu düşer: boğuk bir güm. */
export function thud() {
  tone(90, 0, 0.25, 0.4, 'triangle');
  burst(0, 0.12, 0.3, 300, 1);
}

/** Kedi mırıltısı: alçak, titreyen bir hırıltı. */
export function purr() {
  const c = ac();
  if (!c || !master) return;
  const s = c.createBufferSource();
  s.buffer = noise(1.6);
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 180;
  const g = c.createGain();
  const lfo = c.createOscillator();
  const depth = c.createGain();
  lfo.frequency.value = 24;
  depth.gain.value = 0.25;
  g.gain.value = 0.3;
  lfo.connect(depth).connect(g.gain);
  s.connect(f).connect(g).connect(master);
  g.gain.setTargetAtTime(0, c.currentTime + 1.2, 0.15);
  lfo.start();
  s.start();
  lfo.stop(c.currentTime + 1.7);
}

/** Arka plan: güneşli günde ara sıra kuş, yağmurda sürekli yağmur hışırtısı. */
export function setAmbience(kind: 'birds' | 'rain' | 'quiet') {
  ambience?.stop();
  ambience = null;
  if (kind === 'quiet') return;
  const c = ac();
  if (!c || !master) return;
  if (kind === 'rain') {
    const s = c.createBufferSource();
    s.buffer = noise(2);
    s.loop = true;
    const f = c.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 1200;
    const g = c.createGain();
    g.gain.value = 0.07;
    s.connect(f).connect(g).connect(master);
    s.start();
    ambience = { stop: () => s.stop() };
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

/** Fiş yazıcısı: hızlı tıkırtılı vızıltı, sonunda kağıdın yırtılması. */
export function receipt() {
  for (let i = 0; i < 18; i++) burst(i * 0.055, 0.04, 0.12, 1800 + (i % 3) * 300, 6);
  tone(220, 0, 1, 0.025, 'sawtooth');
  burst(1.1, 0.18, 0.18, 4200, 0.7);
}
