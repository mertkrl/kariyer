import { audioEngine } from '../../shared/audio/audioEngine';

/*
 * Şehrin uğultusu: süzülmüş kahverengi gürültü. Kuyruk uzadıkça yükselir ve parlaklaşır, kuyruk çok
 * uzunsa arada uzaktan korna gelir. Oyun durunca ya da ses kapalıyken susar. Kendi AudioContext'i
 * vardır; tarayıcı izin vermezse sessiz kalır.
 */

export interface CitySound {
  /** `load`: 0 sakin, 1 kilit; `on`: oyun akıyor mu. */
  set: (load: number, on: boolean) => void;
  stop: () => void;
}

export function citySound(): CitySound {
  let ctx: AudioContext | null = null;
  let gain: GainNode | null = null;
  let filter: BiquadFilterNode | null = null;
  let lastHorn = 0;
  const start = () => {
    try {
      ctx = new AudioContext();
      const n = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < n; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        d[i] = last * 3.5;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 300;
      gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(filter).connect(gain).connect(ctx.destination);
      src.start();
    } catch {
      ctx = null;
    }
  };
  const horn = () => {
    if (!ctx || !gain) return;
    const g = ctx.createGain();
    const t0 = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.012, t0 + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3 + Math.random() * 0.4);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900;
    g.connect(f).connect(ctx.destination);
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = 330 + Math.random() * 160;
    o.connect(g);
    o.start(t0);
    o.stop(t0 + 0.8);
  };
  return {
    set(load, on) {
      const audible = on && !audioEngine.isMuted();
      if (audible && !ctx) start();
      if (!ctx || !gain || !filter) return;
      if (ctx.state === 'suspended' && audible) void ctx.resume();
      const t = ctx.currentTime;
      const l = Math.max(0, Math.min(1, load));
      gain.gain.setTargetAtTime(audible ? 0.02 + 0.06 * l : 0, t, 0.6);
      filter.frequency.setTargetAtTime(260 + 700 * l, t, 0.8);
      if (audible && l > 0.55 && t - lastHorn > 2.5 && Math.random() < 0.25 * l) {
        lastHorn = t;
        horn();
      }
    },
    stop() {
      void ctx?.close();
      ctx = null;
    },
  };
}
