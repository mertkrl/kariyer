# Uzman gözden geçirmesi ve yol haritası

> Ekim 2026. Oyun baştan sona farklı uzmanlıkların gözüyle tarandı: senaryo ve CV verisi, gün olayları, toplantı, mülakat, sonlar, arayüz, erişilebilirlik, teknik altyapı. Durum: **✅ yapıldı** · **⏳ sırada** · **💭 karar gerekiyor**.

## Güçlü yanlar (korunacak)

- **Teknik:** 167 test, satır kapsamı %83; tip kontrolü, lint, boyut bütçesi, `npm audit` CI'da. Ağ isteği yok, kayıt doğrulanıyor, CSP tutarlı.
- **Erişilebilirlik:** klavye kısayolları, metin boyutu (3 kademe), sistem hareket tercihi, ekran okuyucu etiketleri, `lang="tr"`.
- **Eğitim kullanımı:** eğitmen rehberi, tohumlu haftalar (`?seed=`), "Gerçek hayatta" bölümü.
- **Anlatı:** beş kilit aday, gri adaylar (sistemin haklı çıktığı dosyalar), kararların hafta içinde geri dönmesi, iki katmanlı son.

---

## 1. Senaryo ve anlatı tasarımcısı

| Bulgu | Durum |
|---|---|
| 8 aday hiçbir güne bağlı değildi; yaş, evlilik, semt, uzaktan ve yarı zamanlı çalışma temaları oyundan düşmüştü | ✅ |
| Hakan Bey'in "bu sefer haklı" Barış ricası hiç gelmiyordu | ✅ Barış Perşembe'de |
| Tolga Pazartesi'deydi ama metinleri Perşembe'ye ve kara göre yazılmıştı | ✅ |
| "İki aylık deneme süresi" Cuma günü "bitti" diye anlatılıyordu | ✅ "sonu beklenmeden karar" |
| Aile düzeni çelişkiliydi (baba, evdeki kardeş) | ✅ |
| Test kaldırılmıştı ama Perşembe metinleri hâlâ teste dayanıyordu | ✅ Assessa akışı |
| İlan seçimi, işe başlamadan önce yayımlanmış ilanla çelişiyordu | ✅ "işe başlamadan önceki cuma" |
| Nehir, Seda, Aylin, Batuhan, Kaan, Handan, Okan, Ferhat metin hataları | ✅ |
| Hakan Bey'in %15 kesinti itirafı Perşembe'den önce toplantıda açıklanıyordu | ✅ |
| `docs/senaryo.md` eskimişti | ✅ temel bilgiler güncellendi; ⏳ ayrıntılı geçiş |
| Kahraman Defne'nin kendi seslendirme anı az: kararlarını kendi cümlesiyle gerekçelendirebileceği bir an yok (ör. Cuma kurulunda bir paragraf) | ⏳ |

## 2. Oyun tasarımcısı (mekanik ve denge)

| Bulgu | Durum |
|---|---|
| İlan seçiminde "Standart" ilan baskın strateji: hiçbir bedeli yok. Diğer ikisini seçmek için sebep yok | 💭 Standart ilana küçük bir bedel (ör. ilk gün +%30 başvuru, kuyruk uzar) ya da diğerlerine bir kazanç (Hakan Bey'le ilişki +) |
| İlan metinleri kendi kendini alaya alıyordu ("kullanacak vakti bulursan"); şirket bunu yazmaz, seçim de kolaylaşıyordu | ✅ kurumsal ama ele veren dil |
| Perşembe kuralı ("70 altı listeye girmez") ve `day.selection` ölü kod olarak duruyor | ✅ temizlendi (Assessa puanı yalnızca Cuma dosyasında) |
| Perşembe kuyruğu artık 10 kişi ve aynı gün 19:00'a kadar mesai var: en ağır gün. Rahat modda bile sıkışabilir | ⏳ oynanış testi; gerekirse 1 aday Salı'ya |
| Tekrar oynanabilirlik: kuyruklar karışıyor ama hikâye anları sabit. İkinci oyunda sürpriz az | 💭 haftaya göre değişen 1–2 yan olay havuzu |

## 3. İK ve iş hukuku danışmanı

| Bulgu | Durum |
|---|---|
| Deneme süresi (İş Kanunu m.15) en fazla 2 ay; erken sonlandırma mümkün. Metinler artık buna uygun | ✅ |
| Ücretsiz fazla mesai, yaş ibareli ilan, önceki maaşı sorma, aile planı sorusu: bilinçli olarak hukuka aykırı gösteriliyor. Oyunun içinde hiçbir yerde *aykırı olduğu* söylenmiyor; yalnızca final ekranında | 💭 ilgili an geçtikten sonra küçük bir "Bunu biliyor muydun?" notu (eğitim modunda açık) |
| Kişisel geri bildirimli ret, kör CV, yapılandırılmış mülakat iyi uygulama olarak doğru anlatılıyor | — |
| KVKK: Gökçe'nin sosyal medya paylaşımının değerlendirilmesi temada var ama adı geçmiyor | ✅ KVKK zaten vardı; ilan/mülakat soruları, fazla mesai ve deneme süresi satırları eklendi |

## 4. UX / arayüz tasarımcısı

| Bulgu | Durum |
|---|---|
| "Ana sayfaya dön" uyarısı "İlerlemen kaybolacak" diyor; oysa gün başı kaydı duruyor ve "Devam et" o güne döndürüyor. Oyuncu gereksiz korkuyor | ✅ uyarı metni düzeltildi |
| "Devam et" günün sabah ekranına döndürüyor; oyuncu bunu bilmiyor | ✅ "… sabahından devam edersin" |
| Ayarlarda hareket tercihi yoktu, yalnızca sistemden okunuyordu | ✅ "Hareketi azalt" anahtarı |

## 5. Erişilebilirlik uzmanı

| Bulgu | Durum |
|---|---|
| Hareket azaltma yalnızca işletim sisteminden okunuyordu | ✅ oyun içi anahtar |
| Bazı okuma alanları metin ölçeğine (`--ts`) bağlı değildi | ✅ telefon, e-posta ve portal zaten ölçekleniyordu; portfolyo siteleri, mülakat listesi eki ve Ayarlar eklendi. Üst çubuk ve trafik oyunu bilerek sabit |
| Masa ve telefon sahnesi zaman baskılı; "Rahat" mod var ama oyun içinde değiştirilemiyor | 💭 Ayarlara "saat hızı" |

## 6. Yazılım mimarı / performans

| Bulgu | Durum |
|---|---|
| Oyun çekirdeği 86,1 KB / bütçe 95 KB (gzip; ölü kod temizliğinden önce 91,3): yeni içerik için pay az | ⏳ `candidates.json` ve `candidateDetails.json`'u gün bazlı tembel yüklemek |
| Eski adlar kodda duruyor (`levent` = Ümit, `selin` = Ilgın, `hakan` = Cihan, `burak` = Batuhan); yeni katkıcı için tuzak, kayıt uyumluluğu yüzünden değiştirilmesi zor | 💭 kayıt sürümü yükseltilirken eşleme tablosuyla |
| Senaryo belgesi koddan elle türetiliyor ve eskiyor | 💭 kadroları ve saatleri `days.ts`'den üreten küçük bir betik |

## 7. Pazarlama / yayın

| Bulgu | Durum |
|---|---|
| Yalnızca Türkçe; itch.io'da kitle dar. Metinler veri dosyalarında, çeviriye hazır değil | 💭 İngilizce sürüm için metinleri tek kaynağa toplamak (büyük iş) |
| Paylaşım kartı var; mağaza sayfası için ekran görüntüsü ve fragman yok | ⏳ |

## 8. Veri ve iddia doğruluğu

| Bulgu | Durum |
|---|---|
| Final ekranındaki "Gerçek Dünya" notu, oyuncu herkese kişisel geri bildirim gönderse bile "bunu X kişiye yaşattın" diyor; sayıya mülakata çağrılanlar da giriyor | ⏳ sayıyı yalnızca bildirimsiz kalanlar ve sistemin elediklerinden kurmak |

---

## Sıradaki adımlar (öneri sırası)

1. Perşembe yükünü (10 dosya + 19:00 mesaisi) Rahat ve Normal modda oynayarak ölçmek.
2. "Gerçek Dünya" notundaki sayıyı doğru kurmak.
3. Çekirdek paketi küçültmek: aday verisini tembel yüklemek.
4. Karar gerektirenler (💭): ilan seçimine bedel, oyun içi hukuk notları, saat hızı ayarı, çeviri.
