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
  /** Oyunu tek cümleyle, şakayla anlatan satır: maketteki kartta oyunun adının altında yazar. */
  quip: string;
  /** Personel dosyası numarası: kartın sekmesinde yazar, sırayı da verir. */
  file: number;
}

export const GAMES: ArcadeGame[] = [
  {
    route: 'cuzdan',
    title: 'Cüzdan Zamanı',
    blurb: 'Cüzdan TL 2005\'te açılıyor. Saati 2002\'ye geri al: simit 250 bin, ekran mavi pencereli. Eski fiyatı bil, ucuzu seç, çevirmeli bağlanıp eski bakkaldan alışveriş yap; her şeyi enflasyonla karşılaştır.',
    color: 'var(--teal)',
    quip: "Saati 2002'ye geri alıyorsun: simit ucuzluyor, sen bir anlığına zengin oluyorsun.",
    file: 9,
  },
  {
    route: 'trafik',
    title: 'Kavşak Amiri',
    blurb: 'Tek kavşaktan dört kavşaklı caddeye. Yeşili, sarıyı, kırmızıyı ayarla; maç çıkışında dedektörü aç, sönen ışığa usta çağır, Vatan Caddesi’ne yeşil dalga kur.',
    color: 'var(--blue-ink)',
    quip: "Kırk sürücü aynı anda korna çalıyor ve hepsi haklı; ışık sende.",
    file: 8,
  },
  {
    route: 'asfalt',
    title: 'Yama Ekibi',
    blurb: 'Üç aydır kapanmayan çukur, yağmur ve kurdele kesmeye gelen başkan. Toprağı dök, mıcırı yay, asfalt soğumadan silindiri geçir.',
    color: 'var(--red)',
    quip: "Üç aydır bekleyen çukuru, başkan kurdeleyi kesmeden kapatman gerekiyor.",
    file: 7,
  },
  {
    route: 'meydan',
    title: 'Meydan Islahı',
    blurb: 'İstanbul’dan Diyarbakır’a beş sokak: kaçak katlar, klimalar, kompozit yamalar. Cepheyi kapla, binayı güçlendir, tabelaları hizaya sok.',
    color: 'var(--green)',
    quip: "Klimayı, tabelayı, kaçak katı topla; gerisini bir sonraki imar affına bırak.",
    file: 6,
  },
  {
    route: 'ekran',
    title: 'Ekran İhalesi',
    blurb: 'Hastane sıra ekranı, metrobüs, Marmaray… Yıllardır aynı duran ekranları baştan tasarla, canlı çalıştır, paylaş.',
    color: 'var(--blue)',
    quip: "2009'dan beri \"PES**** TÜR****\" yazan ekranı kurtarma ihalesi sana kaldı.",
    file: 5,
  },
  {
    route: 'bakkal',
    title: 'Köy Bakkalı',
    blurb: 'Etiket yok, fiyatı sen söylersin. Müşterinin yüzünü oku, defterini tut, köyü küstürmeden kasayı doldur. Şükrü Amca 30 gün sonra dönüyor.',
    color: 'var(--gold)',
    quip: "Etiket yok, fiyatı sen söylersin; köy de senin hakkında ne düşündüğünü söyler.",
    file: 4,
  },
  {
    route: 'insaat',
    title: 'İnşaat İzleme',
    blurb: 'Bir apartman, temelden çatıya. Ellerini arkana koy, izle. Yorum yapmak serbest, karışmak yasak.',
    color: 'var(--clay)',
    quip: "Hiçbir şeye dokunmadan koca bir apartman bitiriyorsun; amcalar seninle gurur duyuyor.",
    file: 3,
  },
  {
    route: 'test',
    title: 'Genel Yetenek ve Uyum Testi',
    blurb: 'Bilimsel olarak geliştirilmiş, tamamen objektif bir değerlendirme. Lütfen sekmeyi değiştirmeyiniz.',
    color: 'var(--plum)',
    quip: "Doğru cevap yok, ama yanlış cevaplarınız yöneticinize raporlanacaktır.",
    file: 2,
  },
  {
    route: 'iseAlim',
    title: "Sen İK'sin",
    blurb: '5 günlük işe alım simülasyonu. Kurallara mı uyacaksın, vicdanını mı dinleyeceksin?',
    color: 'var(--teal)',
    quip: "Beş günde yüzlerce CV, bir müdür ve bir vicdan: üçünü birden memnun edemezsin.",
    file: 1,
  },
];

