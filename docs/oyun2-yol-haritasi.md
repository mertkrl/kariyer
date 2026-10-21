# İkinci Oyun: "Genel Yetenek ve Uyum Değerlendirmesi" — Yol Haritası

## Fikir

Şirketlerin adayları soktuğu genel yetenek ve genel kültür testleriyle dalga geçen kısa bir oyun.
Sorular ciddi bir sınav gibi görünür ama absürttür. Cevap anahtarı mantığı değil, kurum kültürünü
ödüllendirir. Aklı başında cevap veren oyuncu puan kaybeder. Oyunun ana şakası da budur: test,
ölçtüğünü söylediği şeyi ölçmez.

Site neal.fun gibi olur: ana sayfada oyun kartları bulunur, her kart kendi oyununu açar.
- Kart 1: İşe Alım Haftası (mevcut oyun)
- Kart 2: Genel Yetenek ve Uyum Değerlendirmesi (yeni oyun)

**Elimizdeki malzeme:** `src/game/data/aptitudeTest.ts` dosyasında 22 soru ve altı etkileşim türü
duruyor (kaydırıcı, sıralama, toplantıda baş sallama, takvim, gece mesajı, kaçan düğme). Her sorunun
bir "anahtar" cevabı ve bir de "aklı başında" cevabı var. İkinci oyun bunun üstüne kurulur, sıfırdan
başlamaz.

---

## Uzman görüşleri

### 1. Oyun tasarımcısı: döngü ve tempo
- Oyun 5–8 dakika sürmeli ve tek oturuşta bitmeli. neal.fun oyunlarının gücü kısa olmalarından gelir.
- Akış: Giriş (sahte KVKK onayı, kamera "açılıyor") → 3 bölüm × 5 soru → Sonuç raporu.
- Her soruya süre konmalı (geri sayım baskısı da testin şakasının bir parçası). Ama süre bitince
  oyuncu cezalandırılmaz; "Süreniz doldu, bu bir dikkat sorusuydu" gibi bir yorum çıkar.
- Absürtlük giderek artmalı: ilk sorular neredeyse gerçek gibi olur, sonlara doğru kaçan düğmeye ve
  "Bu soruyu atlamak liderlik eksikliğidir" uyarısına varılır. Şaka yavaş yavaş açılmalı.
- Tekrar oynanabilirlik: soru havuzundan rastgele seçim yapılmalı, sonda iki puan gösterilmeli
  ("Şirket puanın: 34, Sağduyu puanın: 92").

### 2. Mizah yazarı / hiciv uzmanı: şaka kime?
- Hedef test sistemi ve kurum dili olmalı, aday asla hedef olmamalı. Oyuncuyla birlikte gülmeli,
  oyuncuya gülmemeli.
- En iyi absürt soru gerçek bir soruya %90 benzer. Kurumsal dil hiç bozulmamalı (deadpan).
  Komiklik içerikten gelmeli, dilden gelmemeli.
- Soru türleri:
  - **Sayısal:** "Bir toplantı 30 dk sürer. 4 kişi katılır. Kaç e-posta doğar?"
  - **Şekil:** dizinin devamı aslında şirket logosu.
  - **Sözel:** "'Esneklik' kelimesinin eş anlamlısı: a) Fazla mesai …"
  - **Kişilik:** iki şık da aynı anlama gelir.
  - **Genel kültür:** "Genel Müdürümüzün en sevdiği yemek nedir?"
- Gerçek kişi, gerçek şirket ya da gerçek test markası taklit edilmemeli. Mevcut oyundaki
  uydurma "Assessa" markası kullanılmalı.

### 3. İK / endüstri-örgüt psikoloğu: gerçeklik zemini
- Hiciv doğru bir eleştiriye dayanırsa daha güçlü olur. Bilinen sorunlar şunlar:
  geçerliliği zayıf kişilik testleri, işle ilgisiz genel kültür soruları, süre baskısının
  kaygıyı ölçmesi, "doğru" kişilik profilinin önceden belli olması, otomatik eleme eşikleri.
- Sonuç ekranına kısa bir "Gerçekte" notu eklenmeli (mevcut oyundaki "Gerçek Dünya" notu gibi):
  iyi bir seçme sürecinde neler olur? İşle ilgili iş örneği, yapılandırılmış mülakat, şeffaf
  ölçütler.
- Bu not ders vermemeli. En fazla 3–4 satır olmalı ve katlanır olmalı.

### 4. UX / arayüz tasarımcısı: sahte kurumsal arayüz
- Görsel dil, ucuz bir online sınav platformunu taklit etmeli: ilerleme çubuğu, "Sonraki ▶",
  gereksiz yasal metin, "Tarayıcı sekmesini değiştirmeyiniz" uyarısı, sağ üstte kamera simgesi.
- Arayüzün kendisi de şakanın parçası olmalı: geri gelen ilerleme çubuğu, "Kaydediliyor…" döngüsü,
  sonradan tıklanabilir hâle gelen düğme. Ama oyun her zaman oynanabilir kalmalı; bozuk görünen
  şey gerçekten bozuk olmamalı.
- Ana sayfa (neal.fun tarzı): sade bir ızgara, her oyuna bir renkli kart, büyük başlık, tek satır
  açıklama. Telefonda tek sütun.

### 5. Erişilebilirlik uzmanı
- Kaçan düğme ve süre baskısı engel çıkarabilir. "Hareketi azalt" ayarı açıksa düğme kaçmamalı,
  süreler de ya kapatılabilmeli ya uzatılabilmeli.
- Klavyeyle oynanabilmeli; ekran okuyucu her soru değiştiğinde soruyu okumalı.
- Mevcut `useScreenFocus` ve metin ölçeği altyapısı yeniden kullanılmalı.

### 6. Yazılım mimarı
- İki seçenek var:
  - **A (önerilen):** Aynı Vite projesi, basit bir yönlendirme: `/` → oyun salonu, `/ise-alim`,
    `/test`. Her oyun kendi lazy-loaded parçası olur, ortak UI/ses/ayar kodu paylaşılır.
  - B: Ayrı paket veya ayrı proje. Bugün gereksiz karmaşa getirir.
- Yeni bağımlılık eklenmemeli; `history.pushState` ile çalışan küçük bir yönlendirici yeter.
- Yeni oyunun kendi küçük zustand deposu olmalı, mevcut oyunun kayıt sistemine dokunmamalı.
- `aptitudeTest.ts` ortak bir yere (`src/shared/` ya da `src/games/test/data/`) taşınmalı.
  Mevcut oyundaki Cuma dosyası puanı hâlâ ona dayanıyorsa bu bağ korunmalı.
- Boyut bütçesi (`npm run size`), CSP ve service worker yeni rotalara göre güncellenmeli.

### 7. Hukuk / etik notu
- Uydurma marka ve şirket adları kullanılmalı, alan adları `.test` uzantılı kalmalı.
- Sahte "kamera" ve "KVKK onayı" gerçekte hiçbir şey açmamalı ya da toplamamalı. Sayfada açıkça
  "parodidir" yazmalı. Hiçbir veri dışarı gönderilmemeli.

---

## Yol haritası

### Aşama 0: Oyun salonu (ana sayfa)
- [x] Küçük bir yönlendirici yazılır (`/`, `/ise-alim`, `/test`)
- [x] neal.fun tarzı kart ızgarası (`ArcadeScreen`)
- [x] Mevcut oyun `/ise-alim` altına taşınır, kayıt ve ayarlar bozulmadan çalışır
- [ ] Service worker, CSP ve boyut betiği güncellenir

### Aşama 1: Oynanabilir ilk sürüm (MVP) ✅
- [x] Soru verisi yeni oyuna kopyalandı (`src/games/test/data/questions.ts`); Assessa'dan bağımsız
- [x] Giriş (sahte aydınlatma onayı) → bölüm bölüm sorular, soru başı süre → sonuç
- [x] Altı etkileşim türü (`src/games/test/widgets/`); hareket azaltılınca düğme kaçmaz
- [x] Sonuç: "Şirket puanı" ve "Sağduyu puanı", her soruya anahtar ve aklı başında cevap, katlanır "Gerçekte" notu
- Not: kültür bölümünde şimdilik 4 soru var (toplam 14); Aşama 2'de havuz büyüyecek

### Aşama 1.5: Sınav arayüzü ✅
- [x] İki sütun: solda süre halkası (son dakikada kırmızı), soru haritası, gözetmen kutusu ve "Testi bitir"; sağda soru
- [x] Tek toplam süre (soruların sürelerinin toplamı); süre bitince test kapanır
- [x] Önceki / Sonraki; haritadan soruya geçiş; cevap değiştirilebilir
- [x] Haritada cevaplanan soru dolu mavi ve ✓, boş soru beyaz; o anki soru çerçeveli
- [x] Boş soru varken bitirmeden önce uyarı ve "İlk boş soruya git"

### Aşama 1.6: Görsel katman ✅
- [x] Sonuç: resmî "Aday Profil Raporu" belgesi (belge no, tarih, mühür, iki puan halkası, bölüm çubukları, "otomatik onay" imzası); cevap kâğıdı ve "Gerçekte" katlanır
- [x] Giriş: sahte sistem kontrolü (kamera, ışık, yüz ifadesi, mikrofon, arka plan, sekme kilidi); kamera hiç açılmaz
- [x] Salon: kartlara oyuna özel SVG çizimler, üstüne gelince canlanan parçalar, "Oyna →"

### Tasarım denemesi ✅
Optik Form, Yapay Zekâ, Masaüstü 95, Yarışma, Gazete Bulmacası ve Oyunsu Pastel denendi; mevcut
tasarım kaldı ve cilalandı: iki sütunlu giriş (künye kartları, bölüm listesi), daha güçlü tipografi,
iri ve basılabilir şıklar (seçilen dolar, ✓ çıkar), bölüm başına ilerleme sayacı, soru geçişinde yumuşak giriş.

### Rapor düzeni ve robot testi ✅
- [x] Aday Profil Raporu kaydırmasız tek ekran: solda profil (mühür, iki puan, yorum, özet); sağda cevap kâğıdı, her bölüm bir satır (iki puan çubuğu + soru kutucukları: anahtar mavi, sağduyu yeşil, diğer gri, boş kesikli); kutucuğa tıklayınca altında soru, senin cevabın, anahtar ve aklı başında cevap; en altta kısa "Gerçekte" notu
- [x] Üst üste 3 soru 2,5 saniyeden kısa sürede cevaplanırsa "UyumCAPTCHA" açılır (bir testte en fazla 2 kez): önce "Ben robot değilim", sonra 3×3 kare seçme görevi (fazla mesai, motivasyon, kurum kültürü). Yanlışta pencere sallanır ve görev değişir; 4 yanlıştan sonra "Yine de devam et". Bu sırada süre durur

### Ekran içinde ekran soruları ✅
- [x] **Ekran paylaşımı paniği** (`screenshare`): toplantıya katılınca 5 saniyelik geri sayım; oyuncu sekmeleri × ile kapatır. Açık kalanlara göre şık: hiçbiri kapanmadı / riskli sekme açık kaldı / yalnızca zararsız kişisel sekmeler açık (sağduyu) / yalnızca iş kaldı (anahtar). Bitiş anı sabittir, tıklamak süreyi uzatmaz
- [x] Ekran paylaşımı gerçek bir tarayıcı gibi: pencere düğmeleri, sekme şeridi (açık sekme tam başlıklı, diğerleri simgeye küçülür), adres çubuğu (.test adresleri) ve her sekmenin sahte sayfası: tablo, müzik çalar, dilekçe, hava durumu, forum, tatil ilanı, gündem (`widgets/MockPages.tsx`)
- [x] Soru kartı sabit yükseklikte: sol panelle aynı boy, gezinme düğmeleri "Testi bitir" hizasında; uzun içerik kartın içinde kayar
- [x] "Dizide hangi şekil gelmelidir?" ve "Güneş sisteminde kaç gezegen var?" soruları kaldırıldı
- [x] **Arama geçmişi** (`history`): çalışanın gece aramaları; "endişe verici" olanı işaretle. Anahtar: "istifa dilekçesi nasıl yazılır"; sağduyu: "Hiçbiri; bu onun özel hayatı"
- [x] Raporun "Gerçekte" notuna KVKK ve çalışan izleme satırı

### Ofis uygulaması soruları ✅
- [x] **Görüntülü görüşme arka planı** (`background`): kamera önizlemesi ve dört arka plan (salon, okunmamış kitaplık, bulanık, şirket logosu). Logo seçilince "Kültür uyumu +15". Anahtar: logo; sağduyu: bulanık
- [x] **Cumartesi daveti** (`invite`): e-postada "Strateji Kahvaltısı (zorunlu değildir)". Reddetmek 300 karakter gerekçe ister; "✨ Kurumsal gerekçe üret" 400 karakterlik şirket ağzı metin yazar. Anahtar: kabul; sağduyu: gerekçe yazıp reddet
- [x] **Emoji tepkisi** (`reaction`): "Hedefler %40 arttı, ekip ve bütçe aynı" duyurusuna tepki. 😐/😬 seçince "Bölge Müdürü sizi kısa bir görüşmeye davet etti". Anahtar: 🚀; sağduyu: tepki vermeden geç

### Site adı ve stüdyo imzası ✅
- [x] Site adı "Mesai Dışı" (`SITE_NAME`): salon başlığı, sekme başlığı ve her iki oyundaki dönüş bağlantısı aynı yerden
- [x] KASM logosu (`arcade/Studio.tsx`): geniş, içi boş harfler. Açılış animasyonu: dış çizgi kalemle çizilir (0,9 sn), soldan mavi, sağdan sarı dalgalı sıvı akar, ortada çarpışınca yeşil sıçrama yayılır ve mavi-yeşil-sarı geçişe oturur (2 sn). Üstüne gelince yeniden oynar ve zıplar; küçük sürümde çizgi kalın
- [x] Salon ve iki oyunun giriş ekranında sağ altta "KASM LABS" imzası
- [x] Sen İK'sin giriş ekranındaki köşe çizgileri (ve onları kıpırdatan fare takibi) kaldırıldı

### Üst çubuk ve ferah panel ✅
- [x] Üst çubuk üç sütun: solda "← Mesai Dışı" (her aşamada, sınav sırasında da ana sayfaya döner), ortada UyumMetre, sağda kamera göstergesi. Site adı `arcade/games.ts`'te tek yerde (`SITE_NAME`)
- [x] Sınav ekranın kalan yüksekliğini doldurur; saat ve harita kutuları pencere yüksekliğine göre büyür (`clamp`), bölümler arası boşluk eşit dağılır

### Ofis katı soruları ✅
- [x] **Evrak damgalama** (`stamp`): 15 sn'de 6 evrak (izin, zam, masraf, yeğene danışmanlık bütçesi, stajyerin sandalyesi, toplantı hakkında toplantı); ONAY/RET damgası, damgalanmayan "beklemede". Hakkına göre damgalayan sağduyu, haklı taleplerin en az üçünü reddeden anahtar
- [x] **Ofis termostatı** (`thermostat`): kadran ve − / +; her derecede ofisten bir yorum. Anahtar: 16–19° (Genel Müdürün tercihi); sağduyu: 20–22°
- [x] **Çıkış turnikesi** (`turnstile`): 18:00'de kart okut, "ERKEN ÇIKIŞ TESPİT EDİLDİ". Masaya dön (anahtar), onayı bekle (21:34'te gelir), "Mesaim bitti" yaz (sağduyu, kol açılır), altından geç (alarm)

### 40 soruluk test ✅
- [x] Her bölümden 10 soru (bir tur 40 soru, ~20 dk); havuz 64 soru: Bilişsel 15, İş Hayatı 19, Kültür Uyumu 15 (`cultureQuestions.ts`), Genel Kültür 15
- [x] Sol panel sıkılaştı (küçük saat, 5×2 kutu); rapordaki cevap kâğıdı 10'lu satırlar; ikisi de kaydırmasız
- [x] Düz şıklar alt alta; kamera arka planındaki "Kültür uyumu +15" kaldırıldı; sistem kontrolü sabit yükseklikte
- [x] "Satırda kaç kahve fincanı var?" sorusu kaldırıldı

### Görsel doku ✅
- [x] Arka plan: sınav kitapçığı güvenlik deseni (çapraz "ADAY #4471 · GİZLİ · UYUMMETRE · KOPYALANAMAZ" ve dalgalı giyoş çizgileri, `assets/guvenlik-deseni.svg`)
- [x] Süreye göre ortam rengi: zemin sakin maviden son dakikalarda sıcak kırmızıya kayar (karesel, yani başta hiç fark edilmez)
- [x] Soru ve şıklar birlikte kartın ortasında (istatistik paneli denendi, kaldırıldı); hiçbir soru kartı taşırmaz

### Ofis günü soruları ✅
- [x] **Öğle siparişi** (`lunch`): "Lokma" uygulaması, saat 12:04, yöneticiden "12:30'da toplanalım mı?". Yemek seçilir, sonra masaya / toplantı odasına / dışarı / atla. Anahtar: masada; sağduyu: dışarı çıkmak
- [x] **Zam tablosu** (`raise`): oyuncu kendi zam oranını yazar, Enter'da hücre 🔒 %3'e kilitlenir ("=MİN(C2_ÖNERİNİZ; %3)"); genel müdürün satırında maaş bulanık, zam %60. Cevap yazılan orandan çıkar: %0–3 anahtar, enflasyon kadarı (%26–50) sağduyu

### Küçük düzeltmeler ✅
- [x] Onay kutusu: "Aydınlatma metnini okudum, anlamadım ve kabul etmiyorum."
- [x] Sistem kontrolü ~2,3 sn (önceden ~5,4 sn); kamera kutusunda siluet yok
- [x] Soru gövdesi kartın içinde dikey ortalı; başlık satırı üstte
- [x] Kamera arka planlarında kişi yok; salon, kitaplık ve şirket logosu SVG çizimleri (`widgets/Backdrops.tsx`)

### Aşama 2: Mizah ve atmosfer
- [x] Soru havuzu 47 soruya çıktı; 4. bölüm "Genel Kültür" eklendi (bir tur: 4 bölüm × 5 = 20 soru)
- [ ] Giderek artan absürtlük sırası, bölüm araları ("Mola: 0 saniye")
- [x] ~~Bozulan arayüz şakaları~~ (denendi, kaldırıldı)
- [ ] Ses: mevcut ses motoru ile tıklama ve uyarı sesleri

### Aşama 3: Sonuç ve paylaşım
- [ ] Sahte "Aday Profil Raporu" (ör. "Profil: Uyumlu Patates", radar grafik)
- [ ] Paylaşılabilir sonuç kartı (görsel, ağ isteği yok)
- [ ] Katlanır "Gerçekte" notu

### Aşama 4: Cila
- [ ] Erişilebilirlik geçişi (hareketi azalt, süreyi kapat, klavye)
- [ ] Telefon desteği (mevcut oyunda telefon engeli var, bu oyun telefonda açık olabilir)
- [ ] Testler, CI, README ve CHANGELOG

---

## Verilen kararlar
1. Tek proje, `#` ile adresleme: `#/` salon, `#/ise-alim`, `#/test`. Altyapı (yazı tipleri, ses motoru, ayarlar) ortak.
2. Önce web; mobil en sona kalır.
3. İki oyun tamamen ayrı: kod, veri, kayıt ve puan paylaşılmaz. Mevcut oyundaki Assessa test puanı kaldırılacak.
