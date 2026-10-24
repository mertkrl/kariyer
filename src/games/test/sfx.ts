import { audioEngine } from '../../audio/audioEngine';

/*
 * UyumMetre'nin sesleri: dosya yok, hepsi oyunun ortak ses motoruyla (audioEngine) anında
 * üretilir; böylece sitenin sessiz düğmesine ve ses seviyesine uyar. Lobide ucuz bir "bekleme
 * müziği" çalar, sınavda açık ofis uğultusu; süre azaldıkça duvar saati öne çıkar. Kısa sesler
 * platformun kendi sesleridir: seçim tıkı, bölüm çanı, gözetmen uyarısı, robot hatası, damga.
 */

const e = audioEngine;

/** Şık seçimi: her şık biraz farklı perdeden tınlar. */
export const select = (i: number) => e.playUi('select', i % 4);

export const click = () => e.playUi('click');

/** Sonraki soruya geçiş: kısa bir kâğıt hışırtısı. */
export function page() {
  e.noiseHit({ filter: 'bandpass', freq: 1800, freqEnd: 4200, q: 1.2, attack: 0.02, decay: 0.09, peak: 0.05 });
}

/** Bölüm başlıyor: platformun iki tonlu "ding-dong"u. */
export function chime() {
  const now = e.ensureContext().currentTime;
  e.tone({ freq: 987.8, when: now, attack: 0.005, decay: 0.7, peak: 0.07 });
  e.tone({ freq: 784, when: now + 0.28, attack: 0.005, decay: 0.9, peak: 0.07 });
}

/** Son saniyelerde saat: her saniye bir tık; son beşte daha tiz. */
export function tick(urgent: boolean) {
  e.tone({ type: 'square', freq: urgent ? 2200 : 1500, decay: 0.03, peak: urgent ? 0.035 : 0.02 });
}

/** Gözetmenin yeni notu: kibar ama huzursuz eden bir bildirim. */
export function warn() {
  const now = e.ensureContext().currentTime;
  e.tone({ type: 'triangle', freq: 660, when: now, decay: 0.12, peak: 0.05 });
  e.tone({ type: 'triangle', freq: 622, when: now + 0.11, decay: 0.2, peak: 0.05 });
}

/** Robot doğrulaması açıldı: eski bir sistemin hata vızıltısı. */
export function error() {
  e.tone({ type: 'sawtooth', freq: 140, decay: 0.32, peak: 0.06 });
  e.tone({ type: 'square', freq: 147, decay: 0.32, peak: 0.03 });
}

/** Kaçan düğme: kısa, yukarı kayan bir "fıyy". */
export function flee() {
  e.tone({ type: 'triangle', freq: 500, freqEnd: 1400, decay: 0.12, peak: 0.05 });
}

/** Kart kaydırma: yöne göre sağa ya da sola savrulan hava. */
export function swipe(right: boolean) {
  e.noiseHit({ filter: 'bandpass', freq: right ? 900 : 1600, freqEnd: right ? 2600 : 600, q: 1.4, attack: 0.01, decay: 0.16, peak: 0.07, pan: right ? 0.5 : -0.5 });
}

/** Asansör: kat geçerken tık, varınca çan. */
export const floor = () => e.tone({ type: 'sine', freq: 1046, decay: 0.05, peak: 0.02 });
export function arrive() {
  e.tone({ freq: 1318.5, decay: 1.1, peak: 0.07 });
}

/** Bilgisayarın uyarı penceresi. */
export function dialog() {
  const now = e.ensureContext().currentTime;
  e.tone({ freq: 880, when: now, decay: 0.12, peak: 0.05 });
  e.tone({ freq: 1174.7, when: now + 0.08, decay: 0.25, peak: 0.05 });
}

/** Klavye tuşu. */
export const key = () => e.playKeyTick();

/** Mühür: rapor açılırken masaya iner. */
export const stamp = (pass: boolean) => e.playStamp(pass ? 'approve' : 'reject');

/** Sonuçtan önce kısa bir trampet: yükselen gürültü, sonra sus. */
export function drumroll(seconds = 1.1) {
  const ctx = e.ensureContext();
  const now = ctx.currentTime;
  const hits = Math.round(seconds * 22);
  for (let i = 0; i < hits; i++) {
    const t = i / hits;
    e.noiseHit({ filter: 'bandpass', freq: 1800, q: 0.9, when: now + t * seconds, attack: 0.001, decay: 0.035, peak: 0.015 + t * 0.05, pan: i % 2 ? 0.15 : -0.15 });
  }
}

/** Başarı ya da onay: parlak üçlü. */
export const confirm = () => e.playUi('confirm');

// ── Uzun sesler ─────────────────────────────────────────────

/**
 * Lobi müziği: telefonda bekletilirken çalan türden, biraz ucuz, biraz neşeli bir bossa. Dört
 * akor, yumuşak elektrik piyano ve sentetik bas; sonsuz döngü. Notalar az ileriden planlanır.
 */
const BPM = 100;
const BEAT = 60 / BPM;
// Cmaj7 – Am7 – Dm7 – G7, her biri bir ölçü
const CHORDS = [
  [261.6, 329.6, 392, 493.9],
  [220, 261.6, 329.6, 392],
  [293.7, 349.2, 440, 523.3],
  [196, 246.9, 293.7, 349.2],
];
const BASS = [130.8, 110, 146.8, 98];
// ölçü başına melodi: [vuruş, frekans]
const MELODY: [number, number][][] = [
  [[0, 659.3], [1.5, 587.3], [2, 523.3], [3, 493.9]],
  [[0, 523.3], [1.5, 440], [2.5, 392]],
  [[0, 440], [1, 523.3], [1.5, 587.3], [2.5, 698.5]],
  [[0, 659.3], [2, 587.3], [3, 493.9]],
];

let hold: { stop: () => void } | null = null;

export function startHold() {
  if (hold) return;
  const ctx = e.ensureContext();
  if (!e.sfxIn) return;
  const bus = ctx.createGain();
  bus.gain.setValueAtTime(0.0001, ctx.currentTime);
  bus.gain.exponentialRampToValueAtTime(0.55, ctx.currentTime + 1.5);
  // telefon hattı gibi: alçağı ve tizi kırpılmış
  const line = ctx.createBiquadFilter();
  line.type = 'bandpass';
  line.frequency.value = 1100;
  line.Q.value = 0.5;
  bus.connect(line);
  line.connect(e.sfxIn);

  const note = (freq: number, when: number, len: number, peak: number, type: OscillatorType) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(peak, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, when + len);
    o.connect(g);
    g.connect(bus);
    o.start(when);
    o.stop(when + len + 0.05);
  };

  let bar = 0;
  let next = ctx.currentTime + 0.1;
  const schedule = () => {
    while (next < ctx.currentTime + 0.6) {
      const i = bar % CHORDS.length;
      // bossa ritmi: 1, 2.5 ve 4'te akor; 1 ve 3'te bas
      for (const b of [0, 1.5, 3]) for (const f of CHORDS[i]) note(f, next + b * BEAT, BEAT * 1.2, 0.018, 'sine');
      note(BASS[i], next, BEAT * 1.6, 0.09, 'triangle');
      note(BASS[i] * 1.5, next + 2 * BEAT, BEAT * 1.4, 0.07, 'triangle');
      for (const [b, f] of MELODY[i]) note(f, next + b * BEAT, BEAT * 0.9, 0.03, 'triangle');
      next += 4 * BEAT;
      bar++;
    }
  };
  schedule();
  const id = window.setInterval(schedule, 200);
  hold = {
    stop: () => {
      window.clearInterval(id);
      const t = ctx.currentTime;
      bus.gain.cancelScheduledValues(t);
      bus.gain.setValueAtTime(Math.max(0.0001, bus.gain.value), t);
      bus.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      window.setTimeout(() => bus.disconnect(), 800);
    },
  };
}

export function stopHold() {
  hold?.stop();
  hold = null;
}

/** Sınav sırasında açık ofis: `setUrgency` 0–1, süre azaldıkça duvar saati öne çıkar. */
export function startOffice() {
  return e.startOfficeAmbience(false);
}
