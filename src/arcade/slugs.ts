/*
 * Her oyunun adresteki adı: `#/<ad>` oyunun kendisi, `oyun/<ad>/` paylaşım sayfası, `og/<ad>.png`
 * önizleme görseli. Hiçbir şey import etmez; derleme ayarı (gamePages.ts) da buradan okur.
 */
export const SLUGS = {
  iseAlim: 'ise-alim',
  test: 'test',
  insaat: 'insaat',
  bakkal: 'bakkal',
  ekran: 'ekran',
  meydan: 'meydan',
  asfalt: 'asfalt',
  trafik: 'trafik',
} as const;

/** Salon dışındaki her adres: bir oyun. */
export type GameRoute = keyof typeof SLUGS;

export const slugOf = (route: GameRoute) => SLUGS[route];
