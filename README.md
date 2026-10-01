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
| `npm run typecheck` | Yalnızca tip kontrolü (strict mod) |
| `npm run lint` | `oxlint` ile kod denetimi (hook bağımlılıkları dahil) |
| `npm test` | Testler: Node'un kendi test aracıyla, ek paket kurmadan |
| `npm run check` | Tip kontrolü + lint + testler |
| `npm run size` | Derlemeden sonra ilk açılış paketinin boyut bütçesini denetler |

GitHub'a gönderildiğinde `.github/workflows/ci.yml` bunların hepsini her push ve PR'da çalıştırır.

## Testler

`tests/` altındaki dosyalar oyunun kaynak kodunu doğrudan çalıştırır: Node (23.6+) TypeScript tiplerini kendisi siler, `tests/setup/` Vite'ın yaptığı iki işi (uzantısız importlar, `import.meta.env`) üstlenir. Vitest, Jest ya da tarayıcı gerekmez.

- `scoring`, `ending`: kararların ve sonların kuralları, başarımlar
- `rng`, `time`: tohumlu rastgelelik, saat ve Türkçe ekler
- `save`: kaydın yazılması, doğrulanması, bozuk ya da eski kayıtların reddi
- `week`: bir botun beş günü saat saat oynaması; aynı tohumun aynı haftayı vermesi, zor mod

Oyun mantığı ses çalmak için `game/sound.ts` üzerinden konuşur; ses motoru `main.tsx`'te bağlanır, testlerde sessizdir.

## Oyunun akışı

1. **Karşılama → ilan seçimi → başvuru seli → gün brifingi**
2. **Mesai** (`GameplayScreen`): masa, bilgisayar (İşe Alım Portalı, e-posta), sabit hat ve cep telefonu. CV'leri incele, mülakata çağır ya da reddet; öğle arası, müdürün ricaları, ret bildirimleri.
3. **Çarşamba 11:00 — haftalık İK toplantısı**: görüntülü görüşme; Selin'in paylaştığı pano konuşmayı takip eder.
4. **Gün sonu** özetleri, **Cuma mülakatları**, hesaplaşma, hafta sonu ve **final** ekranları

## Kod yapısı

```
src/
  App.tsx                 Aşamaya göre ekran seçimi (ekranlar ve oyunun kendisi ihtiyaç anında yüklenir)
  screens/                Her oyun aşamasının ekranı
  components/
    desk/ pc/ phone/      Masa, bilgisayar ve telefon
    gameplay/             CV gövdesi, ret bildirimleri, üst çubuk
    meeting/              Görüntülü toplantı ve pano
    dayend/ story/ ui/    Gün sonu sahneleri, kırmızı dosya, ortak bileşenler
  game/
    store.ts              Oyun durumu, başlangıç değerleri ve gün döngüsü (zustand)
    storeLoader.ts        Store'u ilk ekrandan sonra arka planda yükler; App aşamayı buradan okur
    prefs.ts              Ses tercihleri (store'dan bağımsız, ilk sesten önce okunur)
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
    save.ts               Tarayıcıdaki kayıt (localStorage), doğrulama ve sürüm geçişleri
    sound.ts              Oyun mantığının ses çıkışı (main.tsx'te ses motoruna bağlanır)
  audio/                  Ses: audioEngine (ayarlar, müzik, kısa sesler), engineCore (ses grafiği ve
                          sentez araçları), scenes/ (ofis, sokak, hava, öğle arası, tarama…)
                          Müzik dosyaları public/audio altında, scripts/ ile üretilir
docs/                     Senaryo, oyun mekaniği, vakalar, bağımlılık kararları
```

## Hata bildirmek

Oyun çökerse hata ekranındaki "Hata raporunu kopyala" düğmesi sürümü, oyun kodunu, aşamayı, günü ve hata izini panoya alır; kişisel bilgi içermez. Oyun kodu (`?seed=`) aynı haftayı yeniden kurmaya yeter.

## Kayıt

Her günün başında otomatik kayıt alınır ve karşılama ekranında "Devam et" düğmesi çıkar. Kayıt yüklenmeden önce oyunun bugünkü haliyle karşılaştırılır; şekli uymayan, olmayan bir güne ya da artık oyunda olmayan bir adaya ait kayıt yarım yüklenmek yerine silinir. Kayıt biçimi değişirse `save.ts` içindeki `SAVE_VERSION` artırılır ve mümkünse `MIGRATIONS` tablosuna bir geçiş adımı yazılır. Kayıt yalnızca oyuncunun tarayıcısında (`localStorage`) durur; sunucu yoktur, hiçbir veri dışarı gönderilmez. Gün ortasında kapatılan oyun o günün başından devam eder. Gizli pencerede ya da site verileri silinince kayıt kaybolur.

## Aynı haftayı yeniden oynamak

Her oyunun bir kodu (tohum) vardır; ayarlar panelinin altında "Oyun kodu #…" olarak görünür. Adresin sonuna `?seed=<kod>` eklenirse aynı aday dizilimi, aynı müdür ricaları ve aynı olaylarla aynı hafta yeniden başlar. Hata bildirirken bu kodu paylaşmak yeterli.

## Çevrimdışı

`npm run build` bir servis çalışanı (`sw.js`) üretir: oyunun tüm dosyaları (sayfa, betikler, stiller, yazı tipleri, sesler) ilk açılışta tarayıcıya alınır. Yeni bir derleme yayınlandığında süren bir haftanın ortasında devreye girmez: karşılama ekranında "Oyunun yeni sürümü hazır · Yenile" çıkar, seçilmezse bütün sekmeler kapanınca geçilir. Servis çalışanı yalnızca derlenmiş sürümde ve HTTPS ya da localhost üzerinden çalışır.

## Bağımlılıklar

Çalışma zamanında yalnızca `react`, `react-dom` ve `zustand`; yazı tipleri derleme sırasında `@fontsource-variable` paketlerinden projeye gömülür. Yeni paket eklemeden önce [docs/bagimliliklar.md](docs/bagimliliklar.md) içindeki adımları izle.

## Bilinen eksikler

- Arayüz testleri yok: testler oyun mantığını kapsıyor, ekranlar elle deneniyor.
- Paylaşım önizleme görseli (`og:image`) göreli adres kullanıyor; yayına alınan alan adına göre tam adres yazılmalı.
