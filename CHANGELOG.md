# Değişiklikler

Her sürüm bir `vX.Y.Z` etiketiyle yayımlanır; etiket gönderilince `.github/workflows/release.yml` buradaki bölümü sürüm notu yapar. Yeni değişiklikler önce **Yayımlanmadı** altına yazılır.

## [Yayımlanmadı]

### Erişilebilirlik
- Hareketi azaltmayı seçen oyuncu için çay dökme, ofis penceresi, toplantı panosu sayaçları ve başvuru seli sayaçları hareket etmeden son hâlini gösterir. Tercih tek yerden (`components/ui/motion.ts`) okunur; yeni bir animasyon döngüsü bu tercihi sormadan eklenemez (`tests/motion.test.ts`).

### Mimari ve kod kalitesi
- `src/game/` alanlara ayrıldı: `store/`, `day/`, `events/`, `lib/`.
- `GameplayScreen.module.css` (2.253 satır) bileşenlerinin kendi stil dosyalarına bölündü; ekrandaki görünüm değişmedi.
- `FinalRoundScreen.module.css` (1.094 → 481), `Phone.module.css` (1.087 → 496) ve `SocialApp.module.css` (1.030 → 401) bileşenlerine bölündü. Telefonun ana ekranı, sohbet listesi ve konuşma kendi bileşenlerinde (`PhoneHome`, `ChatList`, `ChatThread`).
- oxlint `max-lines` (500) uyarısı ve 800 satırı geçen stil dosyalarını yakalayan test.

### Güvenlik ve performans
- Service worker kaynağı `serviceWorker.ts`'e taşındı ve testle denetleniyor (yalnızca kendi adresi, müzik ilk indirmede yok, her derlemeye yeni önbellek).
- Boyut denetimine oyun çekirdeği için ikinci bir bütçe (95 KB gzip) eklendi.

### Süreç
- Etiketle çalışan sürüm iş akışı, bu dosya ve katkı rehberi (`CONTRIBUTING.md`).

## [1.0.0] - 2026-10-06

İlk tam sürüm: beş günlük hafta, Çarşamba toplantısı, Cuma mülakat kurulu, Hakan Bey'in teklifi, hafta sonu ve sonlar; çevrimdışı oynanış ve itch.io paketi.
