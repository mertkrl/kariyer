/*
 * Oyunun kendi kararları için tohumlu rastgelelik (kim hangi gün geliyor, müdür hangi ricaları
 * istiyor, zor modun sürprizleri). Her oyun için bir tohum; her kullanım bir etiketle adlandırılmış
 * kendi akışından çeker, böylece şeyler hangi sırayla istenirse istensin aynı tohum aynı haftayı
 * verir. Görsel ve işitsel gürültü Math.random kullanmaya devam eder: hiçbir şeyi değiştirmez.
 */

function hashLabel(label: string) {
  let h = 2166136261;
  for (let i = 0; i < label.length; i++) h = Math.imul(h ^ label.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Bu tohum ve etiket için [0, 1) aralığında bir sayı akışı (mulberry32). */
export function rngFor(seed: number, label: string): () => number {
  let a = (seed ^ hashLabel(label)) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `list`in rastgele sıralı bir kopyası (Fisher–Yates: her sıra eşit olasılıklı). */
export function shuffle<T>(list: readonly T[], rand: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Yeni bir oyunun tohumu: adresteki `?seed=123` o haftayı yeniden oynatır, yoksa yepyeni bir tane. */
export function newSeed(replay?: number): number {
  if (replay !== undefined && Number.isInteger(replay) && replay > 0) return replay;
  const asked = Number(new URLSearchParams(window.location.search).get('seed'));
  return Number.isInteger(asked) && asked > 0 ? asked : Math.floor(Math.random() * 1e9) + 1;
}
