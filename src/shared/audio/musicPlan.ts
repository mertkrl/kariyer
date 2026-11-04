/*
 * Müzik parçaları: dosyası ve döngü uzunluğu. Hangi aşamada hangisinin çalacağına oyun karar verir
 * (Sen İK'sin için src/games/ise-alim/audio/trackFor.ts). Üç parça da oyunun kendi sentezleyicisiyle üretilir
 * (scripts/generate-*-music.mjs) ve aynı sazları paylaşır; haftanın gerginliği parçalar arasında
 * yumuşak geçişlerle yükselir, Cuma akşamı çözülür.
 *
 * - calm:    "odak", Fa majör, 66 BPM. Pazartesi ve Salı mesaisi.
 * - tense:   "ofis noir", Re minör, 84 BPM, saat tıkıyla. Çarşamba (toplantı, yağmur), Perşembe
 *            (sistem çöktü) ve Cuma'nın mülakatları.
 * - resolve: "karar", Si bemol majör, 58 BPM. Hakan Bey kapıdayken, annenle telefonda ve sonda.
 */

export type MusicTrack = 'calm' | 'tense' | 'resolve';

const base = typeof import.meta.env?.BASE_URL === 'string' ? import.meta.env.BASE_URL : './';

export const MUSIC_TRACKS: Record<MusicTrack, { src: string; loopSeconds: number }> = {
  calm: { src: `${base}audio/theme-calm.m4a`, loopSeconds: (60 / 66) * 4 * 32 },
  tense: { src: `${base}audio/theme-tense.m4a`, loopSeconds: (60 / 84) * 4 * 16 },
  resolve: { src: `${base}audio/theme-resolve.m4a`, loopSeconds: (60 / 58) * 4 * 16 },
};
