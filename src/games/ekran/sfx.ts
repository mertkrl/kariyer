/*
 * Sıra ekranının zili: hastane koridorunun iki tonlu "ding-dong"u, Web Audio ile üretilir.
 * Tarayıcı ilk dokunuştan önce ses çalmaz; bağlam ilk çağrıda kurulur.
 */

let ctx: AudioContext | null = null;

function ac() {
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(c: AudioContext, freq: number, at: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, c.currentTime + at);
  g.gain.linearRampToValueAtTime(0.25, c.currentTime + at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + at + 0.9);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + at);
  o.stop(c.currentTime + at + 1);
}

export function ding() {
  const c = ac();
  if (!c) return;
  tone(c, 880, 0);
  tone(c, 698, 0.35);
}
