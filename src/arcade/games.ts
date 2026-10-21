import type { Route } from './route';

/** Salonun, yani sitenin adı: salonda başlık, oyunlarda sol üstte ana sayfaya dönüş bağlantısı. */
export const SITE_NAME = 'Mesai Dışı';

/** Salondaki kartlar. Her oyun kendi kodu, verisi ve kaydıyla ayrıdır; yalnızca altyapı ortaktır. */
export interface ArcadeGame {
  route: Exclude<Route, 'arcade'>;
  title: string;
  blurb: string;
  /** Kartın zemin rengi (tokens.css). */
  color: string;
  tag: string;
}

export const GAMES: ArcadeGame[] = [
  {
    route: 'iseAlim',
    title: "Sen İK'sin",
    blurb: '5 günlük işe alım simülasyonu. Kurallara mı uyacaksın, vicdanını mı dinleyeceksin?',
    color: 'var(--teal)',
    tag: 'Simülasyon · ~45 dk',
  },
  {
    route: 'test',
    title: 'Genel Yetenek ve Uyum Testi',
    blurb: 'Bilimsel olarak geliştirilmiş, tamamen objektif bir değerlendirme. Lütfen sekmeyi değiştirmeyiniz.',
    color: 'var(--plum)',
    tag: 'Test · ~20 dk',
  },
];
