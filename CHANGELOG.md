# Değişiklikler

Her sürüm bir `vX.Y.Z` etiketiyle yayımlanır; etiket gönderilince `.github/workflows/release.yml` buradaki bölümü sürüm notu yapar. Yeni değişiklikler önce **Yayımlanmadı** altına yazılır.

## [Yayımlanmadı]

## [1.1.0] - 2026-11-03

Site artık **Mesai Dışı**: Sen İK'sin'in yanına sekiz kısa oyun geldi (Genel Yetenek ve Uyum Testi, İnşaat İzleme, Köy Bakkalı, Ekran İhalesi, Meydan Islahı, Yama Ekibi, Kavşak Amiri, Cüzdan Zamanı) ve ana sayfa bu oyunlara açılan bir mahalle maketi oldu. Sen İK'sin `#/ise-alim` adresinde; kayıtları taşınır.

### Kod, içerik ve görünüm
- Cüzdan Zamanı'nın 2005 masaüstü bir işletim sisteminin görünüşünü birebir anmıyor: görev çubuğu, pencereler, giriş ekranı, menü ve Haberci Cüzdan yeşili; menü düğmesi turuncu Cüzdan sikkesi ve adı "Cüzdan" (eğik "başlat" yazısı kalktı). 2009 ve bugünün temalarında da menü düğmesi aynı sikke.
- Meydan Islahı'ndan Diyarbakır · Sur (Gazi Caddesi) sokağı kaldırıldı; oyun dört şehirden dört sokak. Bazalt zemin kaplaması seçenek olarak kalıyor.
- Oyunların yüklenirken gösterdiği zemin tek yerde (`games.ts`'te `loadingBg`); `Root.tsx` dokuz ayrı yükleyici yerine tek bir tablodan okur.
- İnşaat İzleme'de modül düzeyinde değişen durum yok: şantiyenin takvimi saf bir `Plan` değeri (`planFor`), sahne, bina, şantiye ve defter onu prop olarak alır.
- Lint uyarısız: büyük dosyalar konularına göre bölündü (Yama Ekibi'nin modeli fizik, silindir, araçlar, trafik ve ölçüm; Kavşak Amiri'nin simülasyonu ara sokaklar ve sürüş, bölümleri, çizimleri; Köy Bakkalı'nın dükkân durumu `shopState.ts`'e, ekranı `ShopView.tsx`'e; Ekran İhalesi'nin bileşen paneli; UyumMetre'nin yedinci soru dalgası). Effect içinde durum eşitleyen yerler olaydan ya da çizim sırasında hesaplanıyor; Yama Ekibi'nin süre dolumu `useEffectEvent`.
- README sitenin bütününü anlatıyor; itch.io paketi `mesai-disi-<sürüm>-web.zip`.
- Meydan Islahı taslakları sitenin önekiyle (`kariyerweb-meydan-taslak-v3-<yer>`) saklanıyor; "Verilerimi sil" onları da siliyor. Eski anahtardaki taslaklar ilk açılışta yeni anahtara taşınıyor, kaldırılan yerlerin taslakları siliniyor. Değişkenli depolama anahtarlarının da önekle başladığı testle denetleniyor.

### Ana sayfa ve çıkış düzeltmeleri
- Ana sayfa yazıları laptopta okunur: çerçeveyle küçülen yazı ve düğmelere bir taban kondu (1280×720'de açıklama 10,8 → 14 px, üst etiket 6,5 → 10 px); ikincil metnin kontrastı 4,0'dan 5,0:1'e çıktı. Ekran okuyucu başlığı "Mahalleye hoş geldin" diye ayrı okur.
- Maketteki oyun kartı üst menünün (ses, yardım, ayarlar) üstüne binmez, ekranın altından da taşmaz: dikeyde içeri kayar, bağlantı çizgisi durakta kalır.
- Telefonda maketin altında oyunların listesi var; sık duran işaretlerin çakışan dokunma alanları yerine dokunuşu maket alır ve en yakın durağı seçer.
- Açılış hızlandı: maket görseli betikten önce inmeye başlar (preload), giriş animasyonları kısaldı (yazılar 0,4 s, maket 0,5 s, işaretler 0,3 s'de başlar).
- "Mesaiyi bitir" her oyunda sol üstte: Sen İK'sin'de ortadan sol üste geçti (telefonda ok artık "İK SİSTEMİ" yazısının üstüne binmiyor), Cüzdan Zamanı'nın masaüstünde de görünür; kısa ekranda masaüstü simgeleri ikinci sütuna geçer. `ClockOut`'un `centered` seçeneği kalktı.
- Mahalle rehberi: kayıt ve gizlilik açıklaması ve bütün oyunların verisini silen "Verilerimi sil". Panel açılınca odak panele geçer, uzun içerik panelin içinde kayar.
- Sen İK'sin açılışındaki "Oyun hiçbir veri göndermez… Verilerimi sil" satırı kalktı; verileri silmek artık yalnızca mahalle rehberinden.

### Gözden geçirme sonrası
- Ana sayfa artık mahalle maketi; eski kareli defter salonu (`ArcadeScreen`, `arcade/notebook/`, `arcade/mahalle/` sahnesi ve asansörü) hiçbir yerden açılmadığı için testleriyle birlikte silindi (~9.200 satır). Aşağıdaki defter maddeleri bu yüzden artık sitede yok.
- Maketin kırılma noktaları ortak listeye taşındı (`tests/layout.test.ts` yeniden geçiyor); 961 px ve üstünde maket çerçevesi, 560 px ve altında tek sütun.
- UyumMetre: testi bir kez bitiren aday sistem kontrolünü beklemez; bölüm tanıtımında "Örnek soruyu atla, bölüme başla" çıkar.
- Köy Bakkalı: açılıştaki yedi maddelik kural listesi kalktı, yerine iki cümlelik emanet notu; itibar sınırı ve elektrik gideri dükkândaki tanıtıma taşındı. Maket kartındaki dükkân sahibi Şükrü Amca.
- Cüzdan Zamanı: 2005 masaüstünün duvar kâğıdı akşamüstü Boğaz, başlat düğmesi Cüzdan'ın turuncu sikkesi; kullanıcı seçimi düğmeleri ekran okuyucuda düğme olarak okunur.
- Kavşak Amiri: olaylar ve trafik ekipleri `incidentSim.ts`'e, yayalar `peds.ts`'e, tutanak `Tutanak.tsx`'e ayrıldı (sim.ts 1.279 → 1.030, Play.tsx 538 → 475 satır); çizim sırasında ref okuyan yerler düzeltildi.
- Maket kartlarında ve paylaşım önizlemelerinde oyun süresi yazmıyor; her oyunun adının altında onu tek cümleyle anlatan bir espri var (`games.ts`'te `quip`); bitirilen oyunun sonucu ("Ekran tasarlandı", "Günün Sepeti 4/5"…) kartta yazmıyor, düğme "Tekrar oyna" olur.
- README sitenin bütününü (oyunlar, adresleri, kodları, yeni oyun ekleme adımları) anlatıyor.

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
