import { audioEngine } from '../../shared/audio/audioEngine';
import type { Theme } from './model';

/*
 * Cüzdan TL'nin müzikleri: üç dönem, üç özgün parça. Hiçbiri gerçek bir şarkı değildir; notalar
 * burada yazılı, sesler Web Audio ile o an üretilir (telif yok, dosya yok). Her parça 8 ölçülük
 * bir döngüdür, 16'lık adımlarla çalınır; bir zamanlayıcı biraz ilerisini planlar.
 *
 * - kaset (2002–2005): "Mahalle Pop", 112 BPM, La hicaz. Darbuka vuruşu, kare dalga melodi:
 *   2000'lerin başında telefonlardan, kasetlerden taşan pop.
 * - cam (2008–2012): "Cam Salon", 96 BPM, Fa majör yedililer. Yumuşak pad, arpej, kulüp alkışı.
 * - duz (2016–2020): "Düz Lo-fi", 78 BPM, Re dokuzlu. Sallantılı vuruş, plak cızırtısı.
 */

export type TrackId = 'kaset' | 'cam' | 'duz';

interface Note {
  at: number; // adım (ölçü içinde 0–15)
  midi: number;
  len: number; // adım
}

interface Track {
  title: string;
  era: string;
  bpm: number;
  swing: number;
  /** Ölçü başına akor: kök MIDI ve aralıklar. */
  chords: [number, number[]][];
  /** Ölçü başına melodi. */
  melody: Note[][];
  kick: number[];
  snare: number[];
  hat: number[];
  bass: number[];
  lead: OscillatorType;
  pad: boolean;
  arp: boolean;
  crackle: boolean;
}

const n = (at: number, midi: number, len: number): Note => ({ at, midi, len });

export const TRACKS: Record<TrackId, Track> = {
  kaset: {
    title: 'Mahalle Pop',
    era: '2002',
    bpm: 112,
    swing: 0,
    // Am Am Dm E | Am F E E: Türk popunun bildik kapanışı
    chords: [
      [57, [0, 3, 7]],
      [57, [0, 3, 7]],
      [50, [0, 3, 7]],
      [52, [0, 4, 7]],
      [57, [0, 3, 7]],
      [53, [0, 4, 7]],
      [52, [0, 4, 7]],
      [52, [0, 4, 7]],
    ],
    // La hicaz: La Si♭ Do♯ Re Mi Fa Sol
    melody: [
      [n(0, 76, 2), n(2, 77, 2), n(4, 76, 2), n(6, 74, 2), n(8, 73, 4), n(12, 74, 2), n(14, 76, 2)],
      [n(0, 77, 3), n(3, 76, 1), n(4, 74, 2), n(6, 73, 2), n(8, 70, 4), n(12, 69, 4)],
      [n(0, 74, 2), n(2, 76, 2), n(4, 77, 2), n(6, 79, 2), n(8, 77, 4), n(12, 76, 4)],
      [n(0, 76, 2), n(2, 77, 2), n(4, 76, 2), n(6, 74, 2), n(8, 73, 6), n(14, 70, 2)],
      [n(0, 76, 2), n(2, 77, 2), n(4, 76, 2), n(6, 74, 2), n(8, 73, 4), n(12, 74, 2), n(14, 76, 2)],
      [n(0, 77, 2), n(2, 79, 2), n(4, 81, 4), n(8, 79, 2), n(10, 77, 2), n(12, 76, 4)],
      [n(0, 73, 2), n(2, 74, 2), n(4, 76, 4), n(8, 77, 2), n(10, 76, 2), n(12, 74, 2), n(14, 73, 2)],
      [n(0, 69, 8), n(12, 64, 2), n(14, 68, 2)],
    ],
    // düm-tek: düm 0 ve 7'de, tek 4, 12 ve 14'te
    kick: [0, 7, 8],
    snare: [4, 12, 14],
    hat: [0, 2, 4, 6, 8, 10, 12, 14],
    bass: [0, 3, 8, 11],
    lead: 'square',
    pad: false,
    arp: false,
    crackle: false,
  },
  cam: {
    title: 'Cam Salon',
    era: '2010',
    bpm: 96,
    swing: 0,
    // Fmaj7 Em7 Dm7 Cmaj7, iki kez
    chords: [
      [53, [0, 4, 7, 11]],
      [52, [0, 3, 7, 10]],
      [50, [0, 3, 7, 10]],
      [48, [0, 4, 7, 11]],
      [53, [0, 4, 7, 11]],
      [52, [0, 3, 7, 10]],
      [50, [0, 3, 7, 10]],
      [55, [0, 4, 7, 10]],
    ],
    melody: [
      [n(0, 81, 4), n(6, 79, 2), n(8, 76, 6)],
      [n(2, 79, 2), n(4, 76, 2), n(6, 74, 6)],
      [n(0, 77, 4), n(6, 76, 2), n(8, 72, 6)],
      [n(4, 74, 2), n(6, 76, 2), n(8, 79, 8)],
      [n(0, 81, 4), n(6, 84, 2), n(8, 81, 6)],
      [n(2, 79, 2), n(4, 81, 2), n(6, 79, 6)],
      [n(0, 77, 4), n(6, 76, 2), n(8, 74, 6)],
      [n(0, 74, 4), n(4, 77, 4), n(8, 79, 8)],
    ],
    kick: [0, 8, 10],
    snare: [4, 12],
    hat: [2, 6, 10, 14],
    bass: [0, 6, 8, 14],
    lead: 'sine',
    pad: true,
    arp: true,
    crackle: false,
  },
  duz: {
    title: 'Düz Lo-fi',
    era: '2020',
    bpm: 78,
    swing: 0.18,
    // Dm9 G7 Cmaj7 Am7
    chords: [
      [50, [0, 3, 7, 10, 14]],
      [55, [0, 4, 7, 10]],
      [48, [0, 4, 7, 11]],
      [57, [0, 3, 7, 10]],
      [50, [0, 3, 7, 10, 14]],
      [55, [0, 4, 7, 10]],
      [48, [0, 4, 7, 11, 14]],
      [52, [0, 3, 7, 10]],
    ],
    melody: [
      [n(4, 77, 2), n(6, 76, 2), n(8, 74, 4)],
      [n(6, 74, 2), n(8, 71, 6)],
      [n(4, 72, 2), n(6, 74, 2), n(8, 76, 6)],
      [n(10, 72, 2), n(12, 69, 4)],
      [n(4, 77, 2), n(6, 81, 2), n(8, 79, 4)],
      [n(6, 77, 2), n(8, 74, 6)],
      [n(2, 76, 2), n(4, 74, 2), n(6, 72, 8)],
      [n(8, 71, 8)],
    ],
    kick: [0, 10],
    snare: [8],
    hat: [0, 2, 4, 6, 8, 10, 12, 14],
    bass: [0, 7, 10],
    lead: 'triangle',
    pad: true,
    arp: false,
    crackle: true,
  },
};

export const TRACK_ORDER: TrackId[] = ['kaset', 'cam', 'duz'];
export const trackForTheme = (t: Theme): TrackId => (t === 'luna' ? 'kaset' : t === 'glass' ? 'cam' : 'duz');

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

class Player {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer = 0;
  private step = 0;
  private next = 0;
  private track: TrackId = 'kaset';
  private enabled = true;
  playing = false;

  private setup() {
    if (this.ctx) return this.ctx;
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    const c = new C();
    this.master = c.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(c.destination);
    this.noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.ctx = c;
    return c;
  }

  private voice(freq: number, t: number, dur: number, type: OscillatorType, vol: number, cutoff = 0, attack = 0.01) {
    const c = this.ctx!;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let out: AudioNode = o;
    if (cutoff) {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = cutoff;
      o.connect(f);
      out = f;
    }
    out.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private hit(t: number, kind: 'kick' | 'snare' | 'hat' | 'crackle', vol: number) {
    const c = this.ctx!;
    if (kind === 'kick') {
      const o = c.createOscillator();
      const g = c.createGain();
      o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.15);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.connect(g).connect(this.master!);
      o.start(t);
      o.stop(t + 0.3);
      return;
    }
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = kind === 'snare' ? 'bandpass' : 'highpass';
    f.frequency.value = kind === 'snare' ? 1800 : kind === 'hat' ? 7000 : 3000;
    const g = c.createGain();
    const dur = kind === 'snare' ? 0.16 : kind === 'hat' ? 0.04 : 0.02;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master!);
    s.start(t, Math.random() * 0.5, dur + 0.02);
  }

  /** Bir 16'lık adımı planlar. */
  private schedule(step: number, t: number) {
    const tr = TRACKS[this.track];
    const bar = Math.floor(step / 16) % 8;
    const s = step % 16;
    const sixteenth = 60 / tr.bpm / 4;
    const at = t + (s % 2 === 1 ? tr.swing * sixteenth : 0);
    const [root, iv] = tr.chords[bar];

    if (tr.kick.includes(s)) this.hit(at, 'kick', 0.5);
    if (tr.snare.includes(s)) this.hit(at, 'snare', tr.crackle ? 0.12 : 0.22);
    if (tr.hat.includes(s)) this.hit(at, 'hat', s % 4 === 0 ? 0.06 : 0.035);
    if (tr.crackle && Math.random() < 0.5) this.hit(at + Math.random() * sixteenth, 'crackle', 0.03);
    if (tr.bass.includes(s)) this.voice(hz(root - 12 + (this.track === 'kaset' && s % 8 === 3 ? 12 : 0)), at, sixteenth * 2.5, this.track === 'duz' ? 'sine' : 'triangle', 0.22);
    if (tr.pad && s === 0) for (const i of iv) this.voice(hz(root + 12 + i), at, sixteenth * 15, 'sawtooth', 0.025, 900, 0.4);
    if (!tr.pad && (s === 0 || s === 8)) for (const i of iv) this.voice(hz(root + 12 + i), at, sixteenth * 3, 'square', 0.018, 2200);
    if (tr.arp && s % 2 === 0) this.voice(hz(root + 24 + iv[(s / 2) % iv.length]), at, sixteenth * 1.5, 'triangle', 0.035, 3000);
    for (const note of tr.melody[bar]) if (note.at === s) this.voice(hz(note.midi), at, sixteenth * note.len * 0.95, tr.lead, tr.lead === 'square' ? 0.045 : 0.08, tr.lead === 'square' ? 2600 : 0);
  }

  private tick = () => {
    const c = this.ctx;
    if (!c || !this.master) return;
    const audible = this.enabled && !audioEngine.isMuted();
    this.master.gain.setTargetAtTime(audible ? 0.5 : 0, c.currentTime, 0.05);
    const sixteenth = 60 / TRACKS[this.track].bpm / 4;
    while (this.next < c.currentTime + 0.12) {
      if (audible) this.schedule(this.step, this.next);
      this.next += sixteenth;
      this.step = (this.step + 1) % 128;
    }
  };

  play(track: TrackId) {
    const c = this.setup();
    if (!c) return;
    if (c.state === 'suspended') void c.resume();
    if (track !== this.track) this.step = 0;
    this.track = track;
    if (this.playing) return;
    this.playing = true;
    this.next = c.currentTime + 0.05;
    this.timer = window.setInterval(this.tick, 25);
  }

  stop() {
    this.playing = false;
    window.clearInterval(this.timer);
  }

  /** Tepsideki hoparlör: müzik durmaz, yalnızca kısılır. */
  setEnabled(v: boolean) {
    this.enabled = v;
  }
}

export const music = new Player();
