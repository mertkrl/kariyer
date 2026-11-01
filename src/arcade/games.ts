// uzantılı: derleme ayarı da (gamePages.ts) bu dosyayı Node'un kurallarıyla okur
import type { GameRoute } from './slugs.ts';

/** Salonun, yani sitenin adı: salonda başlık, oyunlarda sol üstte ana sayfaya dönüş bağlantısı. */
export const SITE_NAME = 'Mesai Dışı';
/** Salonun alt başlığı; paylaşım sayfalarında da yazar. */
export const SITE_TAGLINE = 'Kısa, tuhaf oyunlar.';

/**
 * Salondaki kartlar. Her oyun kendi kodu, verisi ve kaydıyla ayrıdır; yalnızca altyapı ortaktır.
 * Yeni oyun: route.ts'e adresini, buraya kartını (en yenisi en üstte), CardArt.tsx'e çizimini ekle.
 */
export interface ArcadeGame {
  route: GameRoute;
  title: string;
  blurb: string;
  /** Kartın zemin rengi (tokens.css). */
  color: string;
  minutes: number;
  /** Personel dosyası numarası: kartın sekmesinde yazar, sırayı da verir. */
  file: number;
}

export const GAMES: ArcadeGame[] = [
  {
    route: 'cuzdan',
    title: 'Cüzdan Zamanı',
    blurb: 'Cüzdan TL 2005\'te açılıyor. Saati 2002\'ye geri al: simit 250 bin, ekran mavi pencereli. Eski fiyatı bil, ucuzu seç, çevirmeli bağlanıp eski bakkaldan alışveriş yap; her şeyi enflasyonla karşılaştır.',
    color: 'var(--teal)',
    minutes: 8,
    file: 9,
  },
  {
    route: 'trafik',
    title: 'Kavşak Amiri',
    blurb: 'Kadıköy, Ataşehir, Şişli, Mecidiyeköy, Beşiktaş. Evreleri kur, ışık sürelerini ayarla; sola dönenler, okul çıkışı, ambulans ve vapur dalgası varken kavşağı kilitletme.',
    color: 'var(--blue-ink)',
    minutes: 10,
    file: 8,
  },
  {
    route: 'asfalt',
    title: 'Yama Ekibi',
    blurb: 'Üç aydır kapanmayan çukur, yağmur ve kurdele kesmeye gelen başkan. Toprağı dök, mıcırı yay, asfalt soğumadan silindiri geçir.',
    color: 'var(--red)',
    minutes: 8,
    file: 7,
  },
  {
    route: 'meydan',
    title: 'Meydan Islahı',
    blurb: 'Bakırköy Cumhuriyet Meydanı: otuz tabela, sekiz klima, yedi renk kavgası. Cepheleri boya, tabelaları sök, meydanı baştan düzenle.',
    color: 'var(--green)',
    minutes: 10,
    file: 6,
  },
  {
    route: 'ekran',
    title: 'Ekran İhalesi',
    blurb: 'Hastane sıra ekranı, metrobüs, Marmaray… Yıllardır aynı duran ekranları baştan tasarla, canlı çalıştır, paylaş.',
    color: 'var(--blue)',
    minutes: 15,
    file: 5,
  },
  {
    route: 'bakkal',
    title: 'Köy Bakkalı',
    blurb: 'Etiket yok, fiyatı sen söylersin. Müşterinin yüzünü oku, defterini tut, köyü küstürmeden kasayı doldur.',
    color: 'var(--gold)',
    minutes: 10,
    file: 4,
  },
  {
    route: 'insaat',
    title: 'İnşaat İzleme',
    blurb: 'Bir apartman, temelden çatıya. Ellerini arkana koy, izle. Yorum yapmak serbest, karışmak yasak.',
    color: 'var(--clay)',
    minutes: 6,
    file: 3,
  },
  {
    route: 'test',
    title: 'Genel Yetenek ve Uyum Testi',
    blurb: 'Bilimsel olarak geliştirilmiş, tamamen objektif bir değerlendirme. Lütfen sekmeyi değiştirmeyiniz.',
    color: 'var(--plum)',
    minutes: 24,
    file: 2,
  },
  {
    route: 'iseAlim',
    title: "Sen İK'sin",
    blurb: '5 günlük işe alım simülasyonu. Kurallara mı uyacaksın, vicdanını mı dinleyeceksin?',
    color: 'var(--teal)',
    minutes: 45,
    file: 1,
  },
];

/** Mesai saati (09:00–18:00): salonun üst şeridi buna göre konuşur. */
export function isWorkHours(d: Date): boolean {
  const day = d.getDay();
  const h = d.getHours();
  return day >= 1 && day <= 5 && h >= 9 && h < 18;
}
