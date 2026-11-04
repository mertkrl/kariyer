// uzantılı: derleme ayarı da (gamePages.ts) bu dosyayı Node'un kurallarıyla okur
import type { GameRoute } from './slugs.ts';

/**
 * Oyunların uzun tanıtım metni: paylaşım sayfalarının açıklaması ve önizleme görseli (gamePages.ts,
 * og/). Salonda görünmez; ayrı dosyada durur ki sitenin ilk açılış paketine girmesin.
 */
export const BLURBS: Record<GameRoute, string> = {
  cuzdan: 'Cüzdan TL 2005\'te açılıyor. Saati 2002\'ye geri al: simit 250 bin, ekran mavi pencereli. Eski fiyatı bil, ucuzu seç, çevirmeli bağlanıp eski bakkaldan alışveriş yap; her şeyi enflasyonla karşılaştır.',
  trafik: 'Tek kavşaktan dört kavşaklı caddeye. Yeşili, sarıyı, kırmızıyı ayarla; maç çıkışında dedektörü aç, sönen ışığa usta çağır, Vatan Caddesi’ne yeşil dalga kur.',
  asfalt: 'Üç aydır kapanmayan çukur, yağmur ve kurdele kesmeye gelen başkan. Toprağı dök, mıcırı yay, asfalt soğumadan silindiri geçir.',
  meydan: 'İstanbul’dan Ankara’ya dört sokak: kaçak katlar, klimalar, kompozit yamalar. Cepheyi kapla, binayı güçlendir, tabelaları hizaya sok.',
  ekran: 'Hastane sıra ekranı, metrobüs, Marmaray… Yıllardır aynı duran ekranları baştan tasarla, canlı çalıştır, paylaş.',
  bakkal: 'Etiket yok, fiyatı sen söylersin. Müşterinin yüzünü oku, defterini tut, köyü küstürmeden kasayı doldur. Şükrü Amca 30 gün sonra dönüyor.',
  insaat: 'Bir apartman, temelden çatıya. Ellerini arkana koy, izle. Yorum yapmak serbest, karışmak yasak.',
  test: 'Bilimsel olarak geliştirilmiş, tamamen objektif bir değerlendirme. Lütfen sekmeyi değiştirmeyiniz.',
  iseAlim: '5 günlük işe alım simülasyonu. Kurallara mı uyacaksın, vicdanını mı dinleyeceksin?',
};
