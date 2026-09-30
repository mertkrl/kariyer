# Sen İK'sin

Beş günlük bir işe alım simülasyonu. Yeni işe başlamış bir İK uzmanısın (Defne Aral): her gün masana onlarca CV düşüyor, müdürün hız istiyor, sistem adayların çoğunu sen görmeden eliyor. Kurallara uymakla vicdanını dinlemek arasında verdiğin her karar iki puana yansıyor: **Performans** ve **Vicdan**.

Oyun tamamen tarayıcıda çalışır; sunucu, hesap ya da dış ağ isteği yoktur. Derlenmiş sürüm bir kez açıldıktan sonra çevrimdışı da oynanabilir ve uygulama olarak kurulabilir.

## Çalıştırma

```bash
npm install
npm run dev
```

Diğer komutlar:

| Komut | Ne yapar |
| --- | --- |
| `npm run build` | Tip kontrolü (`tsc -b`) ve üretim derlemesi (`dist/`) |
| `npm run preview` | Üretim derlemesini yerelde sunar |
| `npm run lint` | `oxlint` ile kod denetimi |

## Oyunun akışı

1. **Karşılama → ilan seçimi → başvuru seli → gün brifingi**
2. **Mesai** (`GameplayScreen`): masa, bilgisayar (İşe Alım Portalı, e-posta), sabit hat ve cep telefonu. CV'leri incele, mülakata çağır ya da reddet; öğle arası, müdürün ricaları, ret bildirimleri.
3. **Çarşamba 11:00 — haftalık İK toplantısı**: görüntülü görüşme; Selin'in paylaştığı pano konuşmayı takip eder.
4. **Gün sonu** özetleri, **Cuma mülakatları**, hesaplaşma, hafta sonu ve **final** ekranları

## Kod yapısı

```
src/
  App.tsx                 Aşamaya göre ekran seçimi (ekranlar ihtiyaç anında yüklenir)
  screens/                Her oyun aşamasının ekranı
  components/
    desk/ pc/ phone/      Masa, bilgisayar ve telefon
    gameplay/             CV gövdesi, ret bildirimleri, üst çubuk
    meeting/              Görüntülü toplantı ve pano
    dayend/ story/ ui/    Gün sonu sahneleri, kırmızı dosya, ortak bileşenler
  game/
    store.ts              Oyun durumu, başlangıç değerleri ve gün döngüsü (zustand)
    slices/               Telefon, masa, hikâye ve ayar eylemleri
    clock.ts              Saat ilerledikçe olanlar: mesajlar, aramalar, 17:00 bildirimleri, gün sonu
    storeDefaults.ts      Başlangıç kayıtları ve küçük saf yardımcılar
    storeTypes.ts         Durumun tipleri
    storeApi.ts           Store'a döngüsel import olmadan erişim
    managerCalls.ts       Müdürün duruma bağlı telefon aramaları
    manager.ts            Müdürün mesaj/istek mantığı
    data/                 Metinler ve veriler: adaylar, günler, ilanlar, telefon senaryosu (phoneScript)
    rng.ts                Tohumlu rastgelelik
    player.ts             Oyuncunun adı (tek yerden değişir)
    save.ts               Tarayıcıdaki kayıt (localStorage)
  audio/                  Ses motoru (müzik dosyaları public/audio altında, scripts/ ile üretilir)
docs/                     Senaryo, oyun mekaniği, vakalar, bağımlılık kararları
```

## Kayıt

Her günün başında otomatik kayıt alınır ve karşılama ekranında "Devam et" düğmesi çıkar. Kayıt yalnızca oyuncunun tarayıcısında (`localStorage`) durur; sunucu yoktur, hiçbir veri dışarı gönderilmez. Gün ortasında kapatılan oyun o günün başından devam eder. Gizli pencerede ya da site verileri silinince kayıt kaybolur.

## Aynı haftayı yeniden oynamak

Her oyunun bir kodu (tohum) vardır; ayarlar panelinin altında "Oyun kodu #…" olarak görünür. Adresin sonuna `?seed=<kod>` eklenirse aynı aday dizilimi, aynı müdür ricaları ve aynı olaylarla aynı hafta yeniden başlar. Hata bildirirken bu kodu paylaşmak yeterli.

## Çevrimdışı

`npm run build` bir servis çalışanı (`sw.js`) üretir: oyunun tüm dosyaları (sayfa, betikler, stiller, yazı tipleri, sesler) ilk açılışta tarayıcıya alınır. Yeni bir derleme yayınlandığında önbellek kendiliğinden yenilenir. Servis çalışanı yalnızca derlenmiş sürümde ve HTTPS ya da localhost üzerinden çalışır.

## Bağımlılıklar

Çalışma zamanında yalnızca `react`, `react-dom` ve `zustand`; yazı tipleri derleme sırasında `@fontsource-variable` paketlerinden projeye gömülür. Yeni paket eklemeden önce [docs/bagimliliklar.md](docs/bagimliliklar.md) içindeki adımları izle.

## Bilinen eksikler

- Otomatik test yok.
- Paylaşım önizleme görseli (`og:image`) göreli adres kullanıyor; yayına alınan alan adına göre tam adres yazılmalı.
