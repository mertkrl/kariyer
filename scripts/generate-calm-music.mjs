// Offline synthesizer: renders the calm workday loop ("focus", F major, 66 BPM, ~2 minutes).
// Run with: node scripts/generate-calm-music.mjs
// No npm deps — pure DSP + a hand-written WAV writer. On macOS the WAV is encoded to AAC (.m4a)
// with the built-in `afconvert`; elsewhere `ffmpeg` is used if present.
//
// Made to sit under hours of reading CVs without ever asking for attention: no drums, no clock,
// no hooks. Warm pads and held electric-piano chords breathe slowly; a felt piano drops a few
// notes now and then. The long loop (32 bars) keeps it from feeling repetitive.
//   bars 1–16   pad + held electric piano + soft bass, occasional piano arpeggio
//   bars 17–32  the same harmony with a sparse, unhurried felt-piano melody

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = path.join(__dirname, '..', 'public', 'audio');

const SR = 44100;
const BPM = 66;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const BARS = 32;
const LOOP_SAMPLES = Math.round(BAR * BARS * SR);
const TAIL_SAMPLES = 8 * SR; // rendered past the loop end, then folded back onto the start
const TOTAL = LOOP_SAMPLES + TAIL_SAMPLES;

// ── Utilities ────────────────────────────────────────────────────────────────

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
const rand = mulberry32(2026);
const jitter = (amount) => (rand() * 2 - 1) * amount;

/** A stereo bus: dry L/R plus a mono reverb send. */
function bus() {
  return { L: new Float32Array(TOTAL), R: new Float32Array(TOTAL), send: new Float32Array(TOTAL) };
}
const dry = bus();

/** Renders `fn(t, n)` for `dur` seconds (plus release) at `start` seconds, equal-power panned. */
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

// ── Instruments ──────────────────────────────────────────────────────────────

const tw = 2 * Math.PI;

/** Mellow electric piano: gentle FM, slow bloom, barely any tremolo. */
function electricPiano(midi, start, dur, vel, pan) {
  const f = mtof(midi);
  voice({
    start,
    dur,
    gain: 0.06 * vel,
    pan,
    send: 0.45,
    release: 1.2,
    panLfo: (t) => 0.08 * Math.sin(tw * 0.9 * t),
    fn: (t) => {
      const env = Math.min(1, t / 0.03) * (0.45 + 0.55 * Math.exp(-t * 0.9)) * Math.exp(-t * 0.18);
      const index = 0.55 * vel * Math.exp(-t * 3) + 0.08;
      return Math.sin(tw * f * t + Math.sin(tw * f * t) * index) * env;
    },
  });
}

/** Round, quiet bass: a sine with a whisper of 2nd harmonic. */
function bass(midi, start, dur, vel) {
  const f = mtof(midi);
  voice({
    start,
    dur,
    gain: 0.16 * vel,
    release: 0.8,
    fn: (t) => {
      const env = Math.min(1, t / 0.08) * (0.6 + 0.4 * Math.exp(-t * 0.8));
      return (Math.sin(tw * f * t) + 0.12 * Math.sin(tw * 2 * f * t)) * env;
    },
  });
}

/** Felt piano: soft hammer, dark partials, long sustain into the reverb. */
function feltPiano(midi, start, dur, vel, pan = 0.15) {
  const f = mtof(midi);
  voice({
    start,
    dur,
    gain: 0.07 * vel,
    pan,
    send: 0.7,
    release: 1.4,
    fn: (t) => {
      const env = Math.min(1, t / 0.01) * Math.exp(-t * 0.9);
      return (Math.sin(tw * f * t) + 0.28 * Math.sin(tw * 2.002 * f * t) * Math.exp(-t * 2.5) + 0.08 * Math.sin(tw * 3.005 * f * t) * Math.exp(-t * 5)) * env;
    },
  });
}

/** Warm pad: detuned soft saws through a slow swell, the bed everything rests on. */
function pad(midis, start, dur) {
  for (const midi of midis) {
    const f = mtof(midi);
    for (const detune of [-0.09, 0.09]) {
      const fd = f * Math.pow(2, detune / 12);
      voice({
        start,
        dur,
        gain: 0.016,
        pan: detune < 0 ? -0.55 : 0.55,
        send: 0.6,
        release: 2.8,
        fn: (t) => {
          const env = Math.min(1, t / 2.4) * (0.85 + 0.15 * Math.sin(tw * 0.13 * t));
          let x = 0;
          for (let h = 1; h <= 5; h++) x += Math.sin(tw * fd * h * t) / Math.pow(h, 1.9);
          return x * env;
        },
      });
    }
  }
}

// ── Score ────────────────────────────────────────────────────────────────────
// One chord per two bars: voicing for pad/EP + bass root.

const CHORDS = [
  { ep: [57, 60, 64, 67], bass: 41 }, // Fmaj9
  { ep: [55, 60, 64, 67], bass: 45 }, // Am7/C-ish colour
  { ep: [58, 62, 65, 69], bass: 46 }, // Bbmaj7
  { ep: [55, 60, 65, 67], bass: 48 }, // Csus4
  { ep: [57, 60, 64, 65], bass: 38 }, // Dm9
  { ep: [55, 60, 64, 67], bass: 45 }, // Am9
  { ep: [58, 62, 65, 69], bass: 46 }, // Bbmaj9
  { ep: [56, 61, 65, 67], bass: 46 }, // Bbm6 — a little bittersweet before home
];

// Felt-piano melody, second half: [bar, beat, midi, duration(beats)]
const MELODY = [
  [16, 1, 72, 2], [17, 0, 69, 3],
  [18, 2, 74, 2], [19, 1, 72, 3],
  [20, 1, 67, 1.5], [20, 3, 69, 2], [21, 2, 72, 2],
  [22, 0, 70, 3], [23, 1, 69, 3],
  [24, 1, 65, 2], [25, 0, 69, 2], [25, 2, 72, 2],
  [26, 1, 76, 3], [27, 1, 74, 3],
  [28, 0, 74, 2], [28, 2, 72, 2], [29, 1, 69, 3],
  [30, 1, 68, 2], [31, 0, 67, 3],
];

const at = (bar, beat) => bar * BAR + beat * BEAT;

for (let i = 0; i < BARS / 2; i++) {
  const chord = CHORDS[i % CHORDS.length];
  const bar = i * 2;
  pad(chord.ep.map((m) => m - 12), at(bar, 0), BAR * 2);
  // held chord, softly rolled, re-touched halfway through
  chord.ep.forEach((midi, v) => {
    electricPiano(midi, at(bar, 0) + v * 0.035 + jitter(0.01), BAR * 1.2, 0.7 + jitter(0.05), -0.3 + v * 0.2);
    electricPiano(midi, at(bar + 1, 0.5) + v * 0.03 + jitter(0.01), BAR * 0.9, 0.45 + jitter(0.05), -0.3 + v * 0.2);
  });
  bass(chord.bass, at(bar, 0), BAR * 1.1, 0.9);
  bass(chord.bass, at(bar + 1, 2), BAR * 0.45, 0.55);
  // first half: a slow, broken arpeggio now and then
  if (bar < 16 && i % 2 === 1) {
    const notes = [chord.ep[0] + 12, chord.ep[2] + 12, chord.ep[3] + 12, chord.ep[1] + 12];
    notes.forEach((m, k) => feltPiano(m, at(bar, 1 + k * 1.5) + jitter(0.02), BEAT * 1.6, 0.55 + jitter(0.06), 0.25 - k * 0.1));
  }
}

for (const [bar, beat, midi, dur] of MELODY) {
  feltPiano(midi, at(bar, beat) + jitter(0.015), dur * BEAT, 0.8 + jitter(0.08));
}

// ── Reverb (Freeverb-style: 8 damped combs + 4 allpasses per side) ───────────

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

// Reverb is rendered twice around the loop so its state at the loop start matches the end.
function circular(buf) {
  const twice = new Float32Array(TOTAL + LOOP_SAMPLES);
  twice.set(buf, 0);
  for (let i = 0; i < TOTAL; i++) twice[LOOP_SAMPLES + i] += buf[i];
  return twice;
}
const sendTwice = circular(dry.send);
const wetL2 = freeverb(sendTwice, 0);
const wetR2 = freeverb(sendTwice, 23);

// ── Mixdown: fold everything past the loop point back onto the start ─────────

const L = new Float32Array(LOOP_SAMPLES);
const R = new Float32Array(LOOP_SAMPLES);
const WET = 1.25;
for (let i = 0; i < LOOP_SAMPLES; i++) {
  let l = dry.L[i];
  let r = dry.R[i];
  if (i < TAIL_SAMPLES) {
    l += dry.L[LOOP_SAMPLES + i];
    r += dry.R[LOOP_SAMPLES + i];
  }
  // Second pass of the reverb has already "heard" the previous loop — seamless.
  l += wetL2[LOOP_SAMPLES + i] * WET;
  r += wetR2[LOOP_SAMPLES + i] * WET;
  L[i] = l;
  R[i] = r;
}

// DC / sub-rumble high-pass (~28 Hz) and gentle glue: soft saturation, then peak-normalize to -1.5 dBFS.
function highpass(buf, cutoff) {
  const a = Math.exp((-2 * Math.PI * cutoff) / SR);
  // Run twice so the filter state at the loop start matches the end.
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

// ── WAV encode ───────────────────────────────────────────────────────────────

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

// ── Encode to AAC (.m4a) ─────────────────────────────────────────────────────

fs.mkdirSync(AUDIO_DIR, { recursive: true });
const tmpWav = path.join(os.tmpdir(), `kariyerweb-calm-${process.pid}.wav`);
fs.writeFileSync(tmpWav, wav);
const m4aPath = path.join(AUDIO_DIR, 'theme-calm.m4a');

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
  const wavPath = path.join(AUDIO_DIR, 'theme-calm.wav');
  fs.renameSync(tmpWav, wavPath);
  console.warn(`No AAC encoder found (afconvert/ffmpeg). Wrote ${wavPath} — convert it to theme-calm.m4a manually.`);
}
