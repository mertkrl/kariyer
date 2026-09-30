# Üçüncü taraf bağımlılıklar — güvenlik kararları

## Çalışma zamanı bağımlılıkları
Yalnızca react, react-dom ve zustand. Animasyonların tamamı CSS ile yapılıyor; üçüncü taraf animasyon veya 3D kütüphanesi yok.

## Yazı tipleri: @fontsource-variable/fraunces, work-sans, jetbrains-mono 5.3.0 (geliştirme bağımlılığı)
- Kaynak: npm, Fontsource projesi — https://github.com/fontsource/font-files. Lisans: SIL Open Font License 1.1 (yazı tipleri için standart açık lisans; Google Fonts'un sunduğu dosyaların aynısı).
- Sürüm: 2026-07-19 yayını (kurulumda ~10 haftalık); `--save-exact` ile sabit.
- Kurulum `--ignore-scripts` ile yapıldı; paketlerde kurulum betiği ve alt bağımlılık yok, JavaScript dosyası yok (yalnızca CSS ve woff2).
- `npm audit`: 0 açık.
- Yalnızca Latin ve Latin Extended alt kümeleri `src/styles/fonts.css` ile kullanılıyor; bu sayede Google Fonts isteği kalktı ve oyun çevrimdışı çalışabiliyor.

## Kaldırılanlar
- three.js ve 3D model/doku dosyaları: toplantı sahnesi 2D çizime döndüğü için tamamen kaldırıldı. (Toplantı görüntülü görüşmeye çevrilirken 3D arka planlar için kısa süreliğine yeniden eklendi; o kurulumda aşağıdaki adımlar uygulanmadı. Arka planlar kaldırılınca paket de silindi.)
- framer-motion 13.2.0 ve `overrides` ile sabitlenen alt bağımlılıkları (motion-dom, motion-utils, tslib): yalnızca eski toplantı odası sahnesinde kullanılıyordu; sahne görüntülü görüşmeye dönünce kullanan kod kalmadı.

## Yeni bağımlılık eklerken
1. Resmi yayıncı ve depo, açık kaynak lisans (MIT/BSD/Apache/ISC/0BSD).
2. En az 2–4 haftalık sürüm; `--save-exact`, gerekirse `overrides` ile alt bağımlılıkları sabitle.
3. `npm view <paket> scripts` ile kurulum betiği kontrolü; `--ignore-scripts` ile kurulum.
4. Paket içeriğinde ağ/eval taraması, ardından `npm audit`.
