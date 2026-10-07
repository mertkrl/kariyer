# Katkı rehberi

## Çalışma akışı

1. `main` her zaman yayımlanabilir durumdadır; doğrudan ona commit atılmaz.
2. Her iş kendi dalında yapılır: `senaryo/…` (metin ve hikâye), `ozellik/…`, `duzeltme/…`, `iyilestirme/…`.
3. Dal bir PR ile `main`'e girer. PR şablonundaki denetimler doldurulur, CI yeşil olmadan birleştirilmez.
4. Ekranda görünen her değişiklik `CHANGELOG.md`'nin **Yayımlanmadı** bölümüne bir satır olarak yazılır.

İlk klonda bir kez `git config core.hooksPath .githooks` çalıştır: her `git push` önce `npm run ci`'ı çalıştırır.

## Nereye ne konur

| Değişiklik | Yer |
| --- | --- |
| Aday, gün, ilan metni | `src/game/data/` (JSON'lar yüklenirken denetlenir; `tests/data.test.ts`) |
| Mesai içinde olanlar (saat, e-posta, müdür, telefon) | `src/game/day/` |
| Haftanın özel anları (toplantı, mülakat, teklif, hafta sonu) | `src/game/events/` |
| Puanlama ve sonlar | `src/game/engine/`; ardından `tests/balance*.test.ts` çalıştırılır, botların sırası bozulmamalı |
| Oyun durumu ve kayıt | `src/game/store/`; kayıt biçimi değişirse `SAVE_VERSION` artar |
| Oyundan bağımsız araçlar | `src/game/lib/` |
| Bileşen stili | Bileşenin yanındaki `X.module.css`; 1.100 satırı geçen dosya bölünür |
| Animasyon | `requestAnimationFrame` kullanıyorsa `prefersReducedMotion()` sorulur |

## Sürüm yayımlamak

1. `CHANGELOG.md`'de **Yayımlanmadı** başlığını `## [X.Y.Z] - YYYY-AA-GG` yap.
2. `npm version X.Y.Z --no-git-tag-version` ile `package.json`'u güncelle, ikisini birlikte commit'le (PR ile).
3. `main`'de: `git tag vX.Y.Z && git push origin vX.Y.Z`. Release iş akışı CI'ı çalıştırır, zip'i GitHub sürümüne ekler.

Sürüm numarası: yeni bir sahne ya da mekanik **küçük** (1.1.0), yalnızca düzeltme **yama** (1.0.1), kayıtları geçersiz kılan değişiklik **büyük** (2.0.0).
