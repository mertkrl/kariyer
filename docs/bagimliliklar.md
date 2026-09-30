# Üçüncü taraf bağımlılıklar — güvenlik kararları

## Çalışma zamanı bağımlılıkları
Yalnızca react, react-dom ve zustand. Animasyonların tamamı CSS ile yapılıyor; üçüncü taraf animasyon veya 3D kütüphanesi yok.

## Kaldırılanlar
- three.js ve 3D model/doku dosyaları: toplantı sahnesi 2D çizime döndüğü için tamamen kaldırıldı. (Toplantı görüntülü görüşmeye çevrilirken 3D arka planlar için kısa süreliğine yeniden eklendi; o kurulumda aşağıdaki adımlar uygulanmadı. Arka planlar kaldırılınca paket de silindi.)
- framer-motion 13.2.0 ve `overrides` ile sabitlenen alt bağımlılıkları (motion-dom, motion-utils, tslib): yalnızca eski toplantı odası sahnesinde kullanılıyordu; sahne görüntülü görüşmeye dönünce kullanan kod kalmadı.

## Yeni bağımlılık eklerken
1. Resmi yayıncı ve depo, açık kaynak lisans (MIT/BSD/Apache/ISC/0BSD).
2. En az 2–4 haftalık sürüm; `--save-exact`, gerekirse `overrides` ile alt bağımlılıkları sabitle.
3. `npm view <paket> scripts` ile kurulum betiği kontrolü; `--ignore-scripts` ile kurulum.
4. Paket içeriğinde ağ/eval taraması, ardından `npm audit`.
