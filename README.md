# Sen İK'sin

Beş günlük bir işe alım simülasyonu. Yeni işe başlamış bir İK uzmanısın (Defne Aral): her gün masana onlarca CV düşüyor, müdürün hız istiyor, sistem adayların çoğunu sen görmeden eliyor. Kurallara uymakla vicdanını dinlemek arasında verdiğin her karar iki puana yansıyor: **Performans** ve **Vicdan**.

Oyun tamamen tarayıcıda çalışır; sunucu ya da hesap gerekmez (yalnızca yazı tipleri Google Fonts'tan yüklenir).

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
    store.ts              Oyun durumu ve eylemler (zustand)
    storeTypes.ts         Durumun tipleri
    managerCalls.ts       Müdürün duruma bağlı telefon aramaları
    data/                 Adaylar, günler, ilanlar
    manager.ts mail.ts meeting.ts …   Senaryo metinleri
    player.ts             Oyuncunun adı (tek yerden değişir)
  audio/                  Ses motoru (müzik dosyaları public/audio altında, scripts/ ile üretilir)
docs/                     Senaryo, oyun mekaniği, vakalar, bağımlılık kararları
```

## Bağımlılıklar

Çalışma zamanında yalnızca `react`, `react-dom` ve `zustand`. Yeni paket eklemeden önce [docs/bagimliliklar.md](docs/bagimliliklar.md) içindeki adımları izle.

## Bilinen eksikler

- Kayıt sistemi yok: sayfa yenilenirse hafta baştan başlar (yalnızca ses ayarları, yazı boyutu ve başarımlar saklanır).
- Otomatik test yok.
- Paylaşım önizleme görseli (`og:image`) göreli adres kullanıyor; yayına alınan alan adına göre tam adres yazılmalı.
