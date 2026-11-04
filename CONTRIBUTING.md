# Katkı rehberi

## Çalışma akışı

1. `main` her zaman yayımlanabilir durumdadır; doğrudan ona commit atılmaz.
2. Her iş kendi dalında yapılır: `senaryo/…` (metin ve hikâye), `ozellik/…`, `duzeltme/…`, `iyilestirme/…`.
3. Dal bir PR ile `main`'e girer. PR şablonundaki denetimler doldurulur, CI yeşil olmadan birleştirilmez.
4. Ekranda görünen her değişiklik `CHANGELOG.md`'nin **Yayımlanmadı** bölümüne bir satır olarak yazılır.

`npm install` git kancalarını kendiliğinden bağlar (`scripts/hooks.mjs`): her `git push` önce `npm run ci`'ı çalıştırır; acil durumda `git push --no-verify`. Arayüz değişikliklerinde `npm run build && npm run e2e` de çalıştır (gerçek tarayıcıda uçtan uca testler; CI'da da koşar).

## Nereye ne konur

| Değişiklik | Yer |
| --- | --- |
| Aday, gün, ilan metni | `src/games/ise-alim/game/data/` (JSON'lar yüklenirken denetlenir; `tests/data.test.ts`) |
| Mesai içinde olanlar (saat, e-posta, müdür, telefon) | `src/games/ise-alim/game/day/` |
| Haftanın özel anları (toplantı, mülakat, teklif, hafta sonu) | `src/games/ise-alim/game/events/` |
| Puanlama ve sonlar | `src/games/ise-alim/game/engine/`; ardından `tests/balance*.test.ts` çalıştırılır, botların sırası bozulmamalı |
| Oyun durumu ve kayıt | `src/games/ise-alim/game/store/`; kayıt biçimi değişirse `SAVE_VERSION` artar |
| Oyundan bağımsız araçlar | `src/shared/` (bütün oyunlar), `src/games/ise-alim/game/lib/` (yalnızca İK) |
| Yeni oyun | `src/games/<ad>/`; adımlar ve kalıp `docs/yeni-oyun.md`, katmanlar `docs/mimari.md` |
| Tarayıcıda saklanan veri | `src/shared/storage.ts` (doğrudan `localStorage` yok; `tests/architecture.test.ts`) |
| Bileşen stili | Bileşenin yanındaki `X.module.css`; 800 satırı geçen dosya bölünür |
| Animasyon | `requestAnimationFrame` kullanıyorsa `prefersReducedMotion()` sorulur |

## Sürüm yayımlamak

1. `CHANGELOG.md`'de **Yayımlanmadı** başlığını `## [X.Y.Z] - YYYY-AA-GG` yap.
2. `npm version X.Y.Z --no-git-tag-version` ile `package.json`'u güncelle, ikisini birlikte commit'le (PR ile).
3. `main`'de: `git tag vX.Y.Z && git push origin vX.Y.Z`. Release iş akışı CI'ı çalıştırır, zip'i GitHub sürümüne ekler.

Sürüm numarası: yeni bir sahne ya da mekanik **küçük** (1.1.0), yalnızca düzeltme **yama** (1.0.1), kayıtları geçersiz kılan değişiklik **büyük** (2.0.0).
