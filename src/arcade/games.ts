// uzantılı: derleme ayarı da (gamePages.ts) bu dosyayı Node'un kurallarıyla okur
import type { GameRoute } from './slugs.ts';

/** Salonun, yani sitenin adı: salonda başlık, oyunlarda sol üstte ana sayfaya dönüş bağlantısı. */
export const SITE_NAME = 'Mesai Dışı';
/** Salonun alt başlığı; paylaşım sayfalarında da yazar. */
export const SITE_TAGLINE = 'Kısa, tuhaf oyunlar.';

/**
 * Salondaki kartlar. Her oyun kendi kodu, verisi ve kaydıyla ayrıdır; yalnızca altyapı ortaktır.
 * Yeni oyun: adımlar docs/yeni-oyun.md'de (slugs.ts'e adresi, buraya kartı, en yenisi en üstte).
 */
export interface ArcadeGame {
  route: GameRoute;
  title: string;
  /** Kartın zemin rengi (tokens.css). */
  color: string;
  /** Oyunu tek cümleyle, şakayla anlatan satır: maketteki kartta oyunun adının altında yazar. */
  quip: string;
  /** Personel dosyası numarası: kartın sekmesinde yazar, sırayı da verir. */
  file: number;
  /**
   * Oyunun açılış zemini: oyun yüklenirken (Root.tsx) ve maketten oyuna dalarken ekranın döndüğü
   * renk (WelcomeScreen.tsx). Oyunun ilk ekranıyla aynıdır, böylece geçişte renk sıçramaz.
   */
  loadingBg: string;
}

export const GAMES: ArcadeGame[] = [
  {
    route: 'cuzdan',
    title: 'Cüzdan Zamanı',
    color: 'var(--teal)',
    quip: "Saati 2002'ye geri alıyorsun: simit ucuzluyor, sen bir anlığına zengin oluyorsun.",
    file: 9,
    loadingBg: '#efe9da', // krem banknot kâğıdı
  },
  {
    route: 'trafik',
    title: 'Kavşak Amiri',
    color: 'var(--blue-ink)',
    quip: "Kırk sürücü aynı anda korna çalıyor ve hepsi haklı; ışık sende.",
    file: 8,
    loadingBg: '#1d2128', // kontrol merkezinin koyu zemini
  },
  {
    route: 'asfalt',
    title: 'Yama Ekibi',
    color: 'var(--red)',
    quip: "Üç aydır bekleyen çukuru, başkan kurdeleyi kesmeden kapatman gerekiyor.",
    file: 7,
    loadingBg: '#e9e4d8', // şantiyenin açık zemini
  },
  {
    route: 'meydan',
    title: 'Meydan Islahı',
    color: 'var(--green)',
    quip: "Klimayı, tabelayı, kaçak katı topla; gerisini bir sonraki imar affına bırak.",
    file: 6,
    loadingBg: '#ece6da', // imar masasının açık zemini
  },
  {
    route: 'ekran',
    title: 'Ekran İhalesi',
    color: 'var(--blue)',
    quip: "Durak ekranı 2011'den beri \"Otobüs: 3 dk\" diyor; o otobüs hâlâ yolda, ihale sende.",
    file: 5,
    loadingBg: '#23262d', // atölyenin koyu zemini
  },
  {
    route: 'bakkal',
    title: 'Köy Bakkalı',
    color: 'var(--gold)',
    quip: "Etiket yok, fiyatı sen söylersin; köy de senin hakkında ne düşündüğünü söyler.",
    file: 4,
    loadingBg: '#f4e6c8', // bakkalın ahşap bejı
  },
  {
    route: 'insaat',
    title: 'İnşaat İzleme',
    color: 'var(--clay)',
    quip: "Hiçbir şeye dokunmadan koca bir apartman bitiriyorsun; amcalar seninle gurur duyuyor.",
    file: 3,
    loadingBg: '#bcd9ea', // şantiyenin gökyüzü
  },
  {
    route: 'test',
    title: 'Genel Yetenek ve Uyum Testi',
    color: 'var(--plum)',
    quip: "Doğru cevap yok, ama yanlış cevaplarınız yöneticinize raporlanacaktır.",
    file: 2,
    loadingBg: '#f4f6fa', // test platformunun açık zemini
  },
  {
    route: 'iseAlim',
    title: "Sen İK'sin",
    color: 'var(--teal)',
    quip: "Beş günde yüzlerce CV, bir müdür ve bir vicdan: üçünü birden memnun edemezsin.",
    file: 1,
    loadingBg: '#100e0b', // İK sisteminin koyu açılışı
  },
];


/** Oyunun açılış zemini (`loadingBg`). */
export const loadingBgOf = (route: GameRoute) => GAMES.find((g) => g.route === route)!.loadingBg;
