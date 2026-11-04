import { readStoredMuted } from '../prefs';

/*
 * Salonun ses motoruna ulaştığı yer. Motor (audioEngine.ts, engineCore.ts) salonun ilk paketine
 * girmez: sayfa boşa çıkınca (main.tsx), bir oyuna girilince (Root.tsx) ya da ilk dokunuşta iner.
 * O ana kadar ayarlar beklenir ve motor gelince uygulanır; kısa süs sesleri (üstüne gelme tıkı)
 * motor yoksa çalınmaz, beklemez. Oyunlar motoru doğrudan import eder: onların parçasıyla gelir.
 */
type Engine = typeof import('./audioEngine').audioEngine;

let engine: Engine | null = null;
let loading: Promise<Engine> | null = null;
let muted = readStoredMuted();

/** Motoru indirir (bir kez); tercihleri motor kendisi uygular. */
export function loadAudio(): Promise<Engine> {
  loading ??= import('./audioEngine').then((m) => {
    engine = m.audioEngine;
    engine.setMuted(muted);
    return engine;
  });
  return loading;
}

/** Motor geldiyse hemen, gelmediyse gelince. Ayarlar ve ilk dokunuş için. */
const later = (run: (e: Engine) => void) => (engine ? run(engine) : void loadAudio().then(run));
/** Yalnızca motor hazırsa: süs sesleri beklemez. */
export const ifReady = (run: (e: Engine) => void) => engine && run(engine);

export const audio = {
  isMuted: () => (engine ? engine.isMuted() : muted),
  setMuted(m: boolean) {
    muted = m;
    later((e) => e.setMuted(m));
  },
  /** İlk dokunuş: tarayıcı sesi ancak kullanıcı bir şeye dokununca açar. */
  init: () => later((e) => e.init()),
  setMusicVolume: (v: number) => later((e) => e.setMusicVolume(v)),
  setSfxVolume: (v: number) => later((e) => e.setSfxVolume(v)),
  setMusicMood: (mood: Parameters<Engine['setMusicMood']>[0]) => later((e) => e.setMusicMood(mood)),
};
