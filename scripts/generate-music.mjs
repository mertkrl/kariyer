// Çevrimdışı sentezleyici: oyunun arka plan döngüsünü üretir ("ofis noir" lo-fi, Re minör, 84 BPM).
// Çalıştırmak için: node scripts/generate-music.mjs
// npm bağımlılığı yok: saf DSP + elle yazılmış bir WAV yazıcısı. macOS'te WAV, yerleşik `afconvert`
// ile AAC'ye (.m4a) kodlanır; başka yerlerde varsa `ffmpeg` kullanılır.
//
// Düzenleme (16 ölçü, kesintisiz döngü):
//   1–8. ölçüler   Rhodes tarzı FM elektrik piyano, alt bas, yumuşak kick, salınımlı hi-hat, saat tik-tak
//   9–16. ölçüler  + fırçalı trampet ve seyrek bir keçe piyano melodisi (çözülmemiş bir "soru" motifi)
// Her vuruştaki saat tıkı müziği oyun içindeki mesai sayacına bağlar.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = path.join(__dirname, '..', 'public', 'audio');

const SR = 44100;
const BPM = 84;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const BARS = 16;
const LOOP_SAMPLES = Math.round(BAR * BARS * SR);
const TAIL_SAMPLES = 5 * SR; // döngü sonunun ötesine çizilir, sonra başa katlanır
const TOTAL = LOOP_SAMPLES + TAIL_SAMPLES;

// ── Yardımcılar ──────────────────────────────────────────────────────────────

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(1984);
const jitter = (amount) => (rand() * 2 - 1) * amount;

/** Bir stereo hat: kuru L/R artı mono bir yankı gönderimi. */
function bus() {
  return { L: new Float32Array(TOTAL), R: new Float32Array(TOTAL), send: new Float32Array(TOTAL) };
}
const dry = bus();

/** `fn(t, n)`i `start` saniyesinde `dur` saniye (artı bırakma) boyunca, eşit güçle kaydırarak çizer. */
function voice({ start, dur, gain, pan = 0, send = 0, release = 0.12, fn, panLfo }) {
  const s0 = Math.round(start * SR);
  const len = Math.round((dur + release) * SR);
  const relStart = Math.round(dur * SR);
  for (let n = 0; n < len; n++) {
    const i = s0 + n;
    if (i < 0 || i >= TOTAL) continue;
    const t = n / SR;
    let v = fn(t, n) * gain;
    if (n > relStart) v *= 1 - (n - relStart) / (len - relStart);
    const p = panLfo ? pan + panLfo(start + t) : pan;
    const angle = ((Math.max(-1, Math.min(1, p)) + 1) * Math.PI) / 4;
    dry.L[i] += v * Math.cos(angle);
    dry.R[i] += v * Math.sin(angle);
    dry.send[i] += v * send;
  }
}

// ── Çalgılar ─────────────────────────────────────────────────────────────────

/** Rhodes benzeri elektrik piyano: sönen bir indeksle 1:1 FM artı hızlı bir "çatal" harmoniği. */
function electricPiano(midi, start, dur, vel, pan) {
  const f = mtof(midi);
  const tw = 2 * Math.PI;
  voice({
    start,
    dur,
    gain: 0.1 * vel,
    pan,
    send: 0.32,
    release: 0.25,
    panLfo: (t) => 0.22 * Math.sin(tw * 4.2 * t), // classic suitcase auto-pan tremolo
    fn: (t) => {
      const attack = Math.min(1, t / 0.004);
      const env = attack * (0.35 + 0.65 * Math.exp(-t * 2.2)) * Math.exp(-t * 0.35);
      const index = (1.4 * vel) * Math.exp(-t * 6) + 0.18;
      const mod = Math.sin(tw * f * t) * index;
      const body = Math.sin(tw * f * t + mod);
      const tine = Math.sin(tw * f * 7.02 * t) * 0.18 * vel * Math.exp(-t * 28);
      return (body + tine) * env;
    },
  });
}

/** Sıcak alt bas: sinüs + biraz 2. harmonik, hafifçe doyurulmuş. */
function bass(midi, start, dur, vel) {
  const f = mtof(midi);
  const tw = 2 * Math.PI;
  voice({
    start,
    dur,
    gain: 0.26 * vel,
    release: 0.09,
    fn: (t) => {
      const env = Math.min(1, t / 0.01) * (0.55 + 0.45 * Math.exp(-t * 3));
      const x = Math.sin(tw * f * t) + 0.22 * Math.sin(tw * 2 * f * t) + 0.06 * Math.sin(tw * 3 * f * t);
      return Math.tanh(1.3 * x) * env;
    },
  });
}

/** Keçe piyano: yumuşak, koyu bir atakla birkaç uyumsuzca harmonik. */
function feltPiano(midi, start, dur, vel) {
  const f = mtof(midi);
  const tw = 2 * Math.PI;
  voice({
    start,
    dur,
    gain: 0.085 * vel,
    pan: 0.12,
    send: 0.55,
    release: 0.6,
    fn: (t) => {
      const env = Math.min(1, t / 0.006) * Math.exp(-t * 1.6);
      return (
        (Math.sin(tw * f * t) +
          0.35 * Math.sin(tw * 2.001 * f * t) * Math.exp(-t * 3) +
          0.12 * Math.sin(tw * 3.004 * f * t) * Math.exp(-t * 6)) *
        env
      );
    },
  });
}

/** Armoniyi yapıştırmak için çok sessiz toplamalı bir pad (bant sınırlı testere, akordu kaymış bir çift). */
function pad(midis, start, dur) {
  const tw = 2 * Math.PI;
  for (const midi of midis) {
    const f = mtof(midi);
    for (const detune of [-0.07, 0.07]) {
      const fd = f * Math.pow(2, detune / 12);
      voice({
        start,
        dur,
        gain: 0.011,
        pan: detune < 0 ? -0.45 : 0.45,
        send: 0.5,
        release: 1.6,
        fn: (t) => {
          const env = Math.min(1, t / 1.4);
          let x = 0;
          for (let h = 1; h <= 6; h++) x += Math.sin(tw * fd * h * t) / Math.pow(h, 1.6);
          return x * env;
        },
      });
    }
  }
}

/** Davulların paylaştığı bant sınırlı gürültü kaynağı (basit tek kutuplu filtreler). */
function filteredNoise(hp, lp) {
  let lpState = 0;
  let hpState = 0;
  let prev = 0;
  const aLp = Math.exp((-2 * Math.PI * lp) / SR);
  const aHp = Math.exp((-2 * Math.PI * hp) / SR);
  return () => {
    const white = rand() * 2 - 1;
    lpState = (1 - aLp) * white + aLp * lpState;
    hpState = aHp * (hpState + lpState - prev);
    prev = lpState;
    return hpState;
  };
}

function kick(start, vel) {
  const tw = 2 * Math.PI;
  let phase = 0;
  voice({
    start,
    dur: 0.32,
    gain: 0.34 * vel,
    release: 0.02,
    fn: (t) => {
      const f = 45 + 70 * Math.exp(-t * 32);
      phase += (tw * f) / SR;
      return Math.sin(phase) * Math.exp(-t * 11);
    },
  });
}

function brush(start, vel) {
  const noise = filteredNoise(900, 5200);
  voice({
    start,
    dur: 0.22,
    gain: 0.12 * vel,
    pan: -0.05,
    send: 0.2,
    release: 0.03,
    fn: (t) => noise() * Math.min(1, t / 0.008) * Math.exp(-t * 16),
  });
}

function hat(start, vel) {
  const noise = filteredNoise(7000, 15000);
  voice({
    start,
    dur: 0.05,
    gain: 0.1 * vel,
    pan: 0.42,
    release: 0.01,
    fn: (t) => noise() * Math.exp(-t * 70),
  });
}

/** Duvar saati tik-takı: minik bir gürültü tıkı artı kısa, rezonanslı bir çınlama. */
function tick(start, tock) {
  const tw = 2 * Math.PI;
  const noise = filteredNoise(2500, 9000);
  const f = tock ? 1850 : 2450;
  voice({
    start,
    dur: 0.03,
    gain: 0.05,
    pan: -0.38,
    send: 0.1,
    release: 0.01,
    fn: (t) => (noise() * 0.6 + Math.sin(tw * f * t) * 0.8) * Math.exp(-t * 180),
  });
}

// ── Nota ─────────────────────────────────────────────────────────────────────
// Ölçü başına bir kayıt: köksüz EP dizilimi + bas kökü (MIDI numaraları).

const D2 = 38, Bb1 = 34, G2 = 43, A1 = 33, F2 = 41;
const CHORDS = [
  { name: 'Dm9', ep: [53, 57, 60, 64], bass: D2 },
  { name: 'Dm9', ep: [53, 57, 60, 64], bass: D2 },
  { name: 'Bbmaj9', ep: [50, 53, 57, 60], bass: Bb1 },
  { name: 'Bbmaj9', ep: [50, 53, 57, 60], bass: Bb1 },
  { name: 'Gm9', ep: [58, 62, 65, 69], bass: G2 },
  { name: 'Gm9', ep: [58, 62, 65, 69], bass: G2 },
  { name: 'A7sus4', ep: [57, 62, 64, 67], bass: A1 },
  { name: 'A7b9', ep: [61, 64, 67, 70], bass: A1 },
  { name: 'Dm9', ep: [53, 57, 60, 64], bass: D2 },
  { name: 'Dm9', ep: [53, 57, 60, 64], bass: D2 },
  { name: 'Fmaj9', ep: [57, 60, 64, 67], bass: F2 },
  { name: 'Fmaj9', ep: [57, 60, 64, 67], bass: F2 },
  { name: 'Gm9', ep: [53, 57, 58, 62], bass: G2 },
  { name: 'Gm9', ep: [53, 57, 58, 62], bass: G2 },
  { name: 'Bbmaj7', ep: [57, 62, 65], bass: Bb1 },
  { name: 'A7b9', ep: [61, 64, 67, 70], bass: A1 },
];

// Senkoplu eşlik kalıpları: [vuruş, süre(vuruş), şiddet]
const COMP_A = [
  [0, 1.4, 0.8],
  [1.5, 0.9, 0.55],
  [3, 0.9, 0.6],
];
const COMP_B = [
  [0, 2.2, 0.75],
  [2.5, 1.0, 0.6],
  [3.5, 0.5, 0.45],
];

// 9–16. ölçüler için keçe piyano melodisi: [ölçü, vuruş, midi, süre(vuruş)]
const MELODY = [
  [8, 0.5, 69, 1], [8, 1.5, 72, 0.5], [8, 2, 74, 1.5], [8, 3.5, 76, 0.5],
  [9, 0, 77, 1.5], [9, 1.5, 76, 0.5], [9, 2, 74, 2],
  [10, 0.5, 74, 0.5], [10, 1, 72, 0.5], [10, 1.5, 70, 1], [10, 2.5, 69, 1.5],
  [11, 0, 67, 1], [11, 1, 69, 1], [11, 2, 64, 2],
  [12, 0.5, 69, 0.5], [12, 1, 74, 1], [12, 2, 77, 1], [12, 3, 76, 1],
  [13, 0, 72, 1.5], [13, 1.5, 69, 0.5], [13, 2, 72, 2],
  [14, 0.5, 70, 1], [14, 1.5, 69, 0.5], [14, 2, 67, 1], [14, 3, 65, 1],
  [15, 0, 64, 1.5], [15, 2, 73, 1], [15, 3, 76, 1],
];

const SWING = 0.58; // zayıf zamandaki sekizliğin düştüğü vuruş payı
const at = (bar, beat) => bar * BAR + beat * BEAT;

for (let bar = 0; bar < BARS; bar++) {
  const chord = CHORDS[bar];
  const next = CHORDS[(bar + 1) % BARS];
  const second = bar >= 8;

  // Elektrik piyano eşliği, hafifçe vurulmuş ve insanlaştırılmış
  const comp = bar % 2 === 0 ? COMP_A : COMP_B;
  for (const [beat, dur, vel] of comp) {
    chord.ep.forEach((midi, v) => {
      const start = at(bar, beat) + v * 0.009 + jitter(0.006);
      electricPiano(midi, start, dur * BEAT, vel + jitter(0.06), -0.33 + v * 0.22);
    });
  }

  // Pad iki ölçüde bir değişir
  if (bar % 2 === 0) pad(chord.ep.map((m) => m - 12), at(bar, 0), BAR * 2);

  // Bas: kök, beşli/oktav, bir sonraki akora kromatik yaklaşım
  bass(chord.bass, at(bar, 0), BEAT * 1.3, 0.9);
  bass(chord.bass + (bar % 2 === 0 ? 7 : 12), at(bar, 2.5), BEAT * 0.8, 0.65);
  const approach = next.bass + (next.bass > chord.bass ? -1 : 1);
  bass(approach, at(bar, 3.5), BEAT * 0.42, 0.55);

  // Davullar
  kick(at(bar, 0), 1);
  kick(at(bar, 2.5), 0.75);
  if (bar % 4 === 3) kick(at(bar, 3.5), 0.5);
  if (second) {
    brush(at(bar, 1), 0.9);
    brush(at(bar, 3), 1);
  }
  for (let beat = 0; beat < 4; beat++) {
    hat(at(bar, beat), 0.55 + jitter(0.08));
    hat(at(bar, beat + SWING), 0.85 + jitter(0.1));
    tick(at(bar, beat), beat % 2 === 1);
  }
}

for (const [bar, beat, midi, dur] of MELODY) {
  feltPiano(midi, at(bar, beat) + jitter(0.01), dur * BEAT, 0.9 + jitter(0.08));
}

// ── Yankı (Freeverb tarzı: taraf başına 8 sönümlü tarak + 4 tüm geçiren) ─────

function freeverb(input, stereoSpread) {
  const scale = SR / 44100;
  const combTunings = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((d) => Math.round((d + stereoSpread) * scale));
  const allpassTunings = [556, 441, 341, 225].map((d) => Math.round((d + stereoSpread) * scale));
  const feedback = 0.84;
  const damp = 0.35;
  const out = new Float32Array(input.length);

  for (const len of combTunings) {
    const buf = new Float32Array(len);
    let idx = 0;
    let store = 0;
    for (let i = 0; i < input.length; i++) {
      const y = buf[idx];
      store = y * (1 - damp) + store * damp;
      buf[idx] = input[i] * 0.015 + store * feedback;
      out[i] += y;
      idx = idx + 1 === len ? 0 : idx + 1;
    }
  }
  for (const len of allpassTunings) {
    const buf = new Float32Array(len);
    let idx = 0;
    for (let i = 0; i < out.length; i++) {
      const b = buf[idx];
      const x = out[i];
      buf[idx] = x + b * 0.5;
      out[i] = b - x;
      idx = idx + 1 === len ? 0 : idx + 1;
    }
  }
  return out;
}

// Yankı döngünün çevresinde iki kez çizilir, böylece döngü başındaki durumu sonla eşleşir.
function circular(buf) {
  const twice = new Float32Array(TOTAL + LOOP_SAMPLES);
  twice.set(buf, 0);
  for (let i = 0; i < TOTAL; i++) twice[LOOP_SAMPLES + i] += buf[i];
  return twice;
}
const sendTwice = circular(dry.send);
const wetL2 = freeverb(sendTwice, 0);
const wetR2 = freeverb(sendTwice, 23);

// ── Karışım: döngü noktasının ötesindeki her şeyi başa katla ─────────────────

const L = new Float32Array(LOOP_SAMPLES);
const R = new Float32Array(LOOP_SAMPLES);
const WET = 0.9;
for (let i = 0; i < LOOP_SAMPLES; i++) {
  let l = dry.L[i];
  let r = dry.R[i];
  if (i < TAIL_SAMPLES) {
    l += dry.L[LOOP_SAMPLES + i];
    r += dry.R[LOOP_SAMPLES + i];
  }
  // Yankının ikinci geçişi önceki döngüyü zaten "duydu": kesintisiz.
  l += wetL2[LOOP_SAMPLES + i] * WET;
  r += wetR2[LOOP_SAMPLES + i] * WET;
  L[i] = l;
  R[i] = r;
}

// DC / alt gümbürtü yüksek geçireni (~28 Hz) ve hafif yapıştırma: yumuşak doygunluk, sonra -1.5 dBFS'ye tepe normalleştirme.
function highpass(buf, cutoff) {
  const a = Math.exp((-2 * Math.PI * cutoff) / SR);
  // Filtre durumu döngü başında sonla eşleşsin diye iki kez çalıştır.
  let y = 0;
  let prev = 0;
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < buf.length; i++) {
      const x = buf[i];
      const out = a * (y + x - prev);
      prev = x;
      y = out;
      if (pass === 1) buf[i] = out;
    }
  }
}
highpass(L, 28);
highpass(R, 28);

let peak = 0;
for (let i = 0; i < LOOP_SAMPLES; i++) {
  L[i] = Math.tanh(L[i] * 1.6) / 1.6;
  R[i] = Math.tanh(R[i] * 1.6) / 1.6;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const norm = Math.pow(10, -1.5 / 20) / peak;

// ── WAV kodlama ──────────────────────────────────────────────────────────────

const dataLength = LOOP_SAMPLES * 4;
const wav = Buffer.alloc(44 + dataLength);
wav.write('RIFF', 0, 'ascii');
wav.writeUInt32LE(36 + dataLength, 4);
wav.write('WAVE', 8, 'ascii');
wav.write('fmt ', 12, 'ascii');
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(SR, 24);
wav.writeUInt32LE(SR * 4, 28);
wav.writeUInt16LE(4, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36, 'ascii');
wav.writeUInt32LE(dataLength, 40);
const to16 = (s) => Math.round(Math.max(-1, Math.min(1, s)) * 32767);
for (let i = 0, o = 44; i < LOOP_SAMPLES; i++, o += 4) {
  wav.writeInt16LE(to16(L[i] * norm), o);
  wav.writeInt16LE(to16(R[i] * norm), o + 2);
}

// ── AAC'ye (.m4a) kodlama ────────────────────────────────────────────────────

fs.mkdirSync(AUDIO_DIR, { recursive: true });
const tmpWav = path.join(os.tmpdir(), `kariyerweb-theme-${process.pid}.wav`);
fs.writeFileSync(tmpWav, wav);
const m4aPath = path.join(AUDIO_DIR, 'theme.m4a');

function tryEncode() {
  try {
    execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '160000', '-q', '127', tmpWav, m4aPath], { stdio: 'ignore' });
    return 'afconvert';
  } catch {
    try {
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmpWav, '-c:a', 'aac', '-b:a', '160k', m4aPath]);
      return 'ffmpeg';
    } catch {
      return null;
    }
  }
}

if (process.env.KEEP_WAV) fs.copyFileSync(tmpWav, process.env.KEEP_WAV);
const encoder = tryEncode();
if (encoder) {
  fs.rmSync(tmpWav);
  const size = (fs.statSync(m4aPath).size / 1024).toFixed(0);
  console.log(`Wrote ${m4aPath} via ${encoder} (${size} KB, ${(LOOP_SAMPLES / SR).toFixed(1)}s loop)`);
} else {
  const wavPath = path.join(AUDIO_DIR, 'theme.wav');
  fs.renameSync(tmpWav, wavPath);
  console.warn(`No AAC encoder found (afconvert/ffmpeg). Wrote ${wavPath} — convert it to theme.m4a manually.`);
}
