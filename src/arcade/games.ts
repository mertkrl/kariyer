import type { Route } from './route';

/** Salonun, yani sitenin adı: salonda başlık, oyunlarda sol üstte ana sayfaya dönüş bağlantısı. */
export const SITE_NAME = 'Mesai Dışı';

/** Salondaki raflar: oyun sayısı arttıkça üstte süzgeç olarak çıkar. */
export type GameKind = 'Simülasyon' | 'Test' | 'Mini oyun';

/**
 * Salondaki kartlar. Her oyun kendi kodu, verisi ve kaydıyla ayrıdır; yalnızca altyapı ortaktır.
 * Yeni oyun: route.ts'e adresini, buraya kartını (en yenisi en üstte), CardArt.tsx'e çizimini ekle.
 */
export interface ArcadeGame {
  route: Exclude<Route, 'arcade'>;
  title: string;
  blurb: string;
  /** Kartın zemin rengi (tokens.css). */
  color: string;
  kind: GameKind;
  minutes: number;
  /** Personel dosyası numarası: kartın sekmesinde yazar, sırayı da verir. */
  file: number;
}

export const GAMES: ArcadeGame[] = [
  {
    route: 'asfalt',
    title: 'Yama Ekibi',
    blurb: 'Üç aydır kapanmayan çukur, yağmur ve kurdele kesmeye gelen başkan. Toprağı dök, mıcırı yay, asfalt soğumadan silindiri geçir.',
    color: 'var(--red)',
    kind: 'Mini oyun',
    minutes: 8,
    file: 7,
  },
  {
    route: 'ekran',
    title: 'Ekran İhalesi',
    blurb: 'Hastane sıra ekranı, metrobüs, Marmaray… Yıllardır aynı duran ekranları baştan tasarla, canlı çalıştır, paylaş.',
    color: 'var(--blue)',
    kind: 'Mini oyun',
    minutes: 15,
    file: 5,
  },
  {
    route: 'bakkal',
    title: 'Köy Bakkalı',
    blurb: 'Etiket yok, fiyatı sen söylersin. Müşterinin yüzünü oku, defterini tut, köyü küstürmeden kasayı doldur.',
    color: 'var(--gold)',
    kind: 'Mini oyun',
    minutes: 10,
    file: 4,
  },
  {
    route: 'insaat',
    title: 'İnşaat İzleme',
    blurb: 'Bir apartman, temelden çatıya. Ellerini arkana koy, izle. Yorum yapmak serbest, karışmak yasak.',
    color: 'var(--clay)',
    kind: 'Mini oyun',
    minutes: 6,
    file: 3,
  },
  {
    route: 'test',
    title: 'Genel Yetenek ve Uyum Testi',
    blurb: 'Bilimsel olarak geliştirilmiş, tamamen objektif bir değerlendirme. Lütfen sekmeyi değiştirmeyiniz.',
    color: 'var(--plum)',
    kind: 'Test',
    minutes: 20,
    file: 2,
  },
  {
    route: 'iseAlim',
    title: "Sen İK'sin",
    blurb: '5 günlük işe alım simülasyonu. Kurallara mı uyacaksın, vicdanını mı dinleyeceksin?',
    color: 'var(--teal)',
    kind: 'Simülasyon',
    minutes: 45,
    file: 1,
  },
];

/** Süzgeç bu kadar oyundan sonra görünür; az oyunda yalnızca kalabalık eder. */
export const FILTER_FROM = 4;

/** Mesai saati (09:00–18:00): salonun üst şeridi buna göre konuşur. */
export function isWorkHours(d: Date): boolean {
  const day = d.getDay();
  const h = d.getHours();
  return day >= 1 && day <= 5 && h >= 9 && h < 18;
}
