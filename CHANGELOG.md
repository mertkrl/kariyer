# Değişiklikler

Her sürüm bir `vX.Y.Z` etiketiyle yayımlanır; etiket gönderilince `.github/workflows/release.yml` buradaki bölümü sürüm notu yapar. Yeni değişiklikler önce **Yayımlanmadı** altına yazılır.

## [Yayımlanmadı]

### Salon
- Gerçekçi kareli defter: kâğıt dokusu ve lifleri, sıcak beyaz kâğıt, basılı mavi kareler, sol kenarda delikler ve metal spiral tel, kenarlarda hafif gölge.
- Örgü kenarlık: sayfa açıldıktan birkaç saniye sonra spiral telin yanındaki boşluğa, kareli defter süsleme videolarındaki gibi elle bir örgü çizilir: önce siyah keçeli kalemle iki kenara satır atlayarak kısa çizgiler, sonra çaprazlarla birbirinin üstünden ve altından geçen iki şerit, en son şeritler renkli kalemle (pembe ve mavi; her gün başka bir kalem takımı) teker teker boyanır. Karelere oturur; telefonda dolabın altına yatay çizilir.
- Patron tuşu: üst köşede gerçek bir klavye tuşu ("esc") ve el yazısıyla "patron geliyor!". Basınca tuş çöker; mesai saatinde kırmızı yanıp söner. Esc ya da tuş defteri bir hesap tablosuna çevirir, sekmenin adı "Q3_rapor_v14_SON_son.xlsx" olur; bir daha Esc ya da tıklama geri getirir.
- Defter seni hatırlar: bitirdiğin oyunun kartına kalemle tik atılır ve sonucu el yazısıyla altına yazılır; dolap başlığında "yapılacaklar: 3/7", hepsi bitince "MESAİ DIŞI USTASI" damgası. Kayıt yalnızca bu tarayıcıda (`kariyerweb-defter`).
- Defter konuşur: günün notu, kırmızı kalemle halkaya alınan günün dosyası ve saate göre ton (mesai, akşam, gece, hafta sonu).
- Bant hareketi ve ses: kartın üstüne gelince bantlar kalkar ve kâğıt hışırdar; tıklayınca bant kopar, sonra oyun açılır.
- "Hepsi / Mini oyun / Test / Simülasyon" süzgeci ve kartlardaki tür etiketleri kalktı.
- Kod: salonun parçaları `SalonParts.tsx`'te, defter işleri `arcade/notebook/` altında; süsleme, tablo ve günün notu ilk açılıştan sonra iner.

### UyumMetre (Genel Yetenek ve Uyum Testi)
- Telefonda oynanır: üstte saat, bölümün soru kutuları ve "bitir" ince bir şerit; gözetmen tek satırlık bir not şeridi; soru kartı ekranı doldurur, gezinme düğmeleri ekranın altına yapışık. Giriş, sistem kontrolü, bölüm tanıtımı, sonuç ve robot penceresi tek sütuna iner; takvim ve zam tablosu kendi içinde yatay kayar. Tablette gözetmen üstte şerit, panel ve soru yan yana.
- Şıklar her oyunda karışır; anahtar ve "aklı başında" cevap şıklarıyla birlikte taşınır. Sırası anlam taşıyan türler (kaydırıcı, takvim, kaçan düğme, damga…) olduğu gibi kalır. Önceden aklı başında cevap 68 sorunun 43'ünde A şıkkıydı.
- Altı yeni etkileşimli tür: sözleşme (kaydırarak oku, sorunlu maddeye şerh düş, imzala), kart kaydırma (yan haklar, çalışma tarzı), kurallı şifre (kurallar birer birer açılır), 18:00'de bilgisayarı kapatmak (art arda uyarılar), asansörde Genel Müdür ve bütçe dağıtmak.
- Havuz 68'den 120 soruya çıktı (etkileşimli soru 31'den 52'ye); her bölüm iki tur boyunca tekrar etmez.
- Ses: lobide bekleme müziği, sınavda açık ofis uğultusu (süre azaldıkça duvar saati öne çıkar), bölüm çanı, son 10 saniyede saat tıkırtısı, gözetmen bildirimleri, robot hatası, kaçan düğme, kart kaydırma, asansör, sonuçta trampet ve mühür. Üst çubukta sitenin ortak sessiz tercihine bağlı ses düğmesi.
- Geliştirme aracı: `scripts/test-gallery/index.html` (geliştirme sunucusunda) bütün soruları sınav kartıyla alt alta çizer, `?t=swipe` gibi türe süzer.
- Kod: sınav stilleri ikiye bölündü (`Exam.module.css` soru kartı, `Panel.module.css` saat ve harita).

### Paylaşım ve mobil
- Site artık "Mesai Dışı" adıyla açılıyor: sayfa başlığı, açıklama, manifest ve genel önizleme görseli (`og.png`) salonun kendisi.
- Her oyunun `oyun/<ad>/` altında kendi paylaşım sayfası var: bağlantı önizlemesinde oyunun adı, açıklaması ve kartı (`og/<ad>.png`) görünür, açılınca oyuna geçer. Görseller `npm run og` ile salondaki çizimlerden üretilir.
- Ortak sonuç kartı (1080×1350): Test, Köy Bakkalı, Yama Ekibi, İnşaat İzleme ve Meydan Islahı'nın sonunda "Sonucu paylaş". Telefonda paylaşım menüsü açılır; bilgisayarda kart iner, metin ve bağlantı panoya kopyalanır. Meydan kartı önce/sonra hâlini tek karede gösterir. Sen İK'sin kartı da oyunun paylaşım sayfasına bağlanır.
- Yama Ekibi telefonda: dik tutulunca sahne kenardan kenara ve yakın, araçlar üçlü ızgarada, muhtarın balonu birkaç saniye sonra çekiliyor; yan çevrilince sahne ekranın yüksekliğini dolduruyor, araçlar sağda dikey şerit.
- Meydan Islahı telefonda: "Yakınlaş" ile meydan iki kat büyür ve sürgüyle yana kaydırılır; seçilen bina ya da yeni tabela görünür alana gelir. Yan çevrilince sahne ekrana sığar.

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
