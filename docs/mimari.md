# Mimari

Mesai Dışı, tek bir sayfada çalışan dokuz bağımsız tarayıcı oyunu ve onları bir araya getiren bir
"salon"dur (mahalle maketi). Sunucu yok; her şey tarayıcıda çalışır, kayıtlar tarayıcıda durur.

## Katmanlar

```
src/
├── main.tsx, Root.tsx   kök: uygulamayı başlatır, adrese göre salonu ya da bir oyunu tembel yükler
├── shared/              ortak katman: hiçbir oyunu ya da salonu bilmez
│   ├── audio/           ses motoru (sentez, örnekler, müzik parçaları)
│   ├── styles/          genel stiller, yazı tipleri, kırılma noktaları
│   ├── storage.ts       tarayıcı deposunun tek kapısı (okuma, yazma, sürüm göçü)
│   ├── random.ts        tohumlu rastgelelik (mulberry32, hash01)
│   ├── color.ts         renk hesapları (ara renk, ton, WCAG kontrastı)
│   ├── motion.ts        "hareketi azalt" tercihi
│   ├── prefs.ts, sound.ts, textScale.ts, privacy.ts, swUpdate.ts
├── arcade/              salon: maket, oyun listesi (games.ts), adresler (slugs.ts, route.ts),
│   │                    ilerleme defteri, kayıt yuvası, paylaşım, oyunların kabuğu
│   └── shell/           her oyunun hata sınırı ve yükleniyor ekranı
├── games/<ad>/          her oyun kendi klasöründe: mantığı, verisi, çizimi, kaydı
│   └── ise-alim/        Sen İK'sin (en büyük oyun; kendi game/, screens/, components/ klasörleri)
└── og/                  paylaşım görsellerinin sayfası (scripts/og-images.mjs çeker)
```

### Bağımlılık yönü

| Katman | Import edebilir |
| --- | --- |
| `shared/` | yalnızca kendi içi ve paketler |
| `arcade/` | `shared/` |
| `games/<ad>/` | `shared/`, `arcade/` (kabuk: kayıt yuvası, ilerleme, paylaşım, geri düğmesi) |
| kök (`main.tsx`, `Root.tsx`) | hepsi |

Bir oyun başka bir oyunu, salon bir oyunun içini, ortak katman da oyunları ya da salonu import
**edemez**. Böylece bir oyun silinince ya da taşınınca yalnızca `Root.tsx`, `games.ts` ve
`slugs.ts` değişir; oyunlar birbirini kırmaz.

Bu kural iki yerde korunur:

- `tests/architecture.test.ts`: bütün import'ları tarar, izin verilmeyen yönü listeler (CI'da).
- `.oxlintrc.json`: `src/shared/**` için `no-restricted-imports`; editörde anında uyarır.

Aynı test, tarayıcı deposuna yalnızca `shared/storage.ts` ve `shared/privacy.ts`'in ("Verilerimi
sil") dokunduğunu da denetler.

## Kayıt

- Anahtarlar `kariyerweb-<oyun>-<ne>-v<n>` biçimindedir. "Verilerimi sil" önekle hepsini bulur.
- Okuma ve yazma `shared/storage.ts` üzerinden: depo yoksa (gizli pencere, engelli site verisi,
  dolu kota) okuma boş döner, yazma sessizce atlanır; oyun kayıtsız oynanır.
- Kayıt biçimi değişince anahtarın sürümü artar. Eski anahtar `readSlot(key, check, legacy)`'ye
  verilirse ilk okumada çevrilip taşınır; çevrilemiyorsa silinir, depoda sahipsiz kayıt kalmaz
  (örnek: `games/trafik/TrafikGame.tsx` `OLD_SAVES`). Sen İK'sin kendi sürüm göçünü
  `games/ise-alim/game/store/save.ts` `MIGRATIONS` ile yapar.

## Durum (state)

İki model var ve ikisi de bilinçli:

- **Sen İK'sin**: zustand deposu (`games/ise-alim/game/store/`), dilimlere bölünmüş. Beş günlük,
  çok ekranlı, kaydı ve geri dönüşü olan bir oyun için uygun.
- **Diğer oyunlar**: saf mantık modülleri + tek bir oyun hook'u + görünüm. Yeni oyunlar bu kalıbı
  izler; ayrıntı ve şablon `docs/yeni-oyun.md`'de.

## Tembel yükleme ve hatalar

- Salon ilk pakettedir (bütçe: 90 KB gzip, `scripts/check-size.mjs`). Her oyun ayrı parçadır,
  `Root.tsx`'teki `LOADERS` ile yalnızca girilince (ya da kartın üstüne gelinince) iner.
- Her oyun `arcade/shell/GameBoundary.tsx` ile sarılır: oyun çökerse başlıkta oyunun adı ve
  "Salona dön"; oyunun parçası inemezse "yeni sürüm geldi" yazar. Sen İK'sin'in kayıt bilen kendi
  sınırı (`games/ise-alim/components/ui/ErrorBoundary.tsx`) kendi parçasındadır.

## Tip denetimi

`tsc -b` artımlıdır (`incremental`): önbellek `node_modules/.tmp/` altında, CI'da
`actions/cache` ile korunur. Soğuk denetim ~25 s, değişiklik yokken ~0,5 s, tek dosya değişince
~3–4 s.
