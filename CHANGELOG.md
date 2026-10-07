# Değişiklikler

Her sürüm bir `vX.Y.Z` etiketiyle yayımlanır; etiket gönderilince `.github/workflows/release.yml` buradaki bölümü sürüm notu yapar. Yeni değişiklikler önce **Yayımlanmadı** altına yazılır.

## [Yayımlanmadı]

### Arayüz
- Başvuru akışındaki ilan notu ("📢 İlandaki 'genç, dinamik ekip'…") kaldırıldı; bu bilgi yalnızca sondaki oturum raporunda kalıyor.
- Portaldaki "İK Müdüründen Not" kaldırıldı; aday listesi kenar sütununun tamamını kaplıyor ve satırlar büyüdü.
- Aday tablosu Excel taklidi yerine şirketin kendi "Ortak Liste" aracı: portalla aynı kâğıt-mürekkep dili, kişi başı renkli etiketler, "Kim kaç kişi çağırdı" görünümü. Pencerenin tamamını kaplıyor (sağdaki boşluk giderildi); masaüstü simgesi de özgün.
- Ayarlar paneli sadeleşti (440 → 340 px genişlik, tek satırlık kontroller) ve "Oyun kodu" kaldırıldı.

### Oyun
- Tek davet kuralı: her gün en fazla 3 kişi mülakata çağrılır; haftalık 10 sınırı kalktı. Cuma'da sen 3 kişiyle görüşürsün, kalanlar Ayşe ile Emre'ye dağılır.
- Kalıp tekrarı azaldı: Defne'nin sıcak ve dürüst cevaplarında üçer varyant, adayların e-posta cevaplarında iki yeni ses (8), Kariyergram mesajlarında her ruh hâline yeni açılış ve cevaplar. Standart ret, "havuz" ve kurumsal yanıt bilerek her seferinde aynıdır.

### Ses ve müzik
- Üç parça: sakin (Pazartesi–Salı), gergin "ofis noir" (Çarşamba, Perşembe, Cuma mülakatları) ve yeni kapanış teması "karar" (teklif, hafta sonu, son); parçalar arası yumuşak geçiş.
- Her efekt çalınışında küçük perde (±%1,5), ses düzeyi (±%10) ve filtre (±%6) sapması; aynı damga 50. kez de biraz farklı vurur.

### Kod
- Cuma mülakat kuralları `screens/final/interviewRoom.ts`'te (saf ve testli), durum ve zamanlayıcılar `useInterview` hook'unda; FinalRoundScreen 412 → 278 satır.
- GameplayScreen 379 → 238 satır: portal `Portal` bileşeninde, klavye ve saat `useWorkdayControls` hook'unda.
- GameState tipleri bölündü: alanlar `store/stateParts.ts`'te, eylemler dilimlerine göre `store/actions.ts`'te.

### Oyuncu geri bildirimi
- Hakan Bey'in "işi bitirmişsin, … dosya daha" mesajına cevap verilebilir; soru biçimindeki her tepkinin ("Hangi dosyalarda zorlandınız?" gibi) cevap seçenekleri var.
- Kariyer platformunun e-postası artık spama düşmüyor; "Şirket belgelerinin gizliliği" hatırlatması kaldırıldı.
- Her adayın maaş beklentisi bir rakamla yazılı (Yusuf: esnek, Ece: önceki maaşını paylaşmadı; hikâyeleri korunuyor).
- Çarşamba toplantısı anlatıcı cümlesi yerine selamlaşmayla başlıyor; Selin ekranını konuşmanın içinde paylaşıyor.
- Cuma: Defne en fazla 3 kişiyle görüşür, seçmedikleri Ayşe ile Emre'ye eşit dağılır; diğer odalardaki adaylar kurula kadar görünmez.
- Masaüstündeki *Adaylar_FINAL_v7.xlsx* salt okunur, gerçek bir hesap tablosu gibi bir ortak dosya (şerit, formül çubuğu, sütun harfleri, filtre başlıkları, hücre notları, toplam satırı, "Özet" sayfası, durum çubuğu): kim kimi davet ettiyse anında eklenir.
- Gün sonu servis sahnesi yalnızca camdan dışarıyı gösteriyor, servisin içi görünmüyor.
- Konuşmalarda "(kısa bir sessizlik)" gibi sahne notları yok.
- İstifa ettiysen annenle konuşma bununla açılır ve bununla kapanır.

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
