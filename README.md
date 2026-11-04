# Mesai Dışı

İş hayatının ve şehrin tuhaflıkları üzerine kısa tarayıcı oyunları. Ana sayfa bir mahalle maketi (`src/arcade/welcome/`): maketteki her durak bir oyuna açılır. Kurulum, hesap ya da sunucu yok; her şey tarayıcıda çalışır, hiçbir veri dışarı gönderilmez.

## Oyunlar

| Oyun | Maketteki yeri | Adres | Kod |
| --- | --- | --- | --- |
| **Sen İK'sin**: beş günlük işe alım simülasyonu; kurallar mı, vicdan mı? (yalnızca geniş ekranda) | Plaza | `#/ise-alim` | `src/games/ise-alim/` |
| **Genel Yetenek ve Uyum Testi** (UyumMetre): "tamamen objektif" bir işe alım sınavının hicvi | Plaza | `#/test` | `src/games/test/` |
| **İnşaat İzleme**: bir apartmanı temelden çatıya, ellerin arkanda izle | Şantiye | `#/insaat` | `src/games/insaat/` |
| **Köy Bakkalı**: etiket yok, fiyatı sen söylersin; otuz gün dükkânı batırmadan tut | Bakkal | `#/bakkal` | `src/games/bakkal/` |
| **Ekran İhalesi**: hastane, metrobüs, Marmaray ekranlarını baştan tasarla | Durak | `#/ekran` | `src/games/ekran/` |
| **Meydan Islahı**: dört şehirden dört sokak; cepheyi kapla, binayı güçlendir, tabelaları hizaya sok | Meydan | `#/meydan` | `src/games/meydan/` |
| **Yama Ekibi**: üç aydır kapanmayan çukura sandbox fiziğiyle asfalt dök | Çukur | `#/asfalt` | `src/games/asfalt/` |
| **Kavşak Amiri**: tek kavşaktan dört kavşaklı caddeye, sinyal yönetimi | Işık | `#/trafik` | `src/games/trafik/` |
| **Cüzdan Zamanı**: 2002'den bugüne Türk lirası; eski fiyatı bil, ucuzu seç | Döviz | `#/cuzdan` | `src/games/cuzdan/` |

Oyunların adı, kart esprisi, rengi ve yüklenirken görünen zemini `src/arcade/games.ts`'te; adresleri `src/arcade/slugs.ts`'te; maketteki yerleri `src/arcade/mahalle/places.ts` ve `src/arcade/welcome/stops.ts`'te.

## Çalıştırma

```bash
npm install
npm run dev
```

| Komut | Ne yapar |
| --- | --- |
| `npm run build` | Tip kontrolü (`tsc -b`) ve üretim derlemesi (`dist/`) |
| `npm run preview` | Üretim derlemesini yerelde sunar |
| `npm run typecheck` | Yalnızca tip kontrolü (strict mod). `tsc -p .` hiçbir şeyi denetlemez, `tsc -b` kullan |
| `npm run lint` | `oxlint` ile kod denetimi (hook bağımlılıkları, 500 satır sınırı dahil) |
| `npm test` | Testler: Node'un kendi test aracıyla, ek paket kurmadan |
| `npm run check` | Tip kontrolü + lint + testler |
| `npm run size` | Derlemeden sonra ilk açılış paketinin boyut bütçesini denetler |
| `npm run og` | Çalışan geliştirme sunucusundan bağlantı önizlemesi görsellerini (`public/og.png`, `public/og/<oyun>.png`) Chrome ile yeniden üretir |
| `npm run package` | Derleyip `release/mesai-disi-<sürüm>-web.zip`'i üretir (itch.io'ya HTML projesi olarak yüklenmeye hazır) |
| `npm run ci` | CI'ın çalıştırdığının aynısı: check + derleme + boyut bütçesi + `npm audit` |

GitHub'a gönderildiğinde `.github/workflows/ci.yml` her push ve PR'da `npm run ci`'ı çalıştırır. Node sürümü `.nvmrc`'de. Göndermeden önce aynı denetimin yerelde çalışması için, klonladıktan sonra bir kez:

```bash
git config core.hooksPath .githooks
```

Çalışma akışı (dal → PR → `main`), dosyaların nereye konduğu ve sürüm yayımlama [CONTRIBUTING.md](CONTRIBUTING.md)'de; değişiklikler [CHANGELOG.md](CHANGELOG.md)'de.

## Sitenin yapısı

```
src/
  main.tsx, Root.tsx      Açılış: ayarlar, ses, servis çalışanı; adrese göre maket ya da oyun
  arcade/                 Bütün oyunların ortak altyapısı
    games.ts, slugs.ts    Oyun listesi ve adresleri
    route.ts              `#/<oyun>` adresleri (herhangi bir statik sunucuda, çevrimdışı da çalışır)
    welcome/, mahalle/    Ana sayfa: mahalle maketi, duraklar, kartlar, mahalle rehberi
    ClockOut              Her oyunun sol üstündeki "Mesaiyi bitir" (gerekirse onay ister)
    Finale, share.ts      Oyun sonu belgesi ve 1080×1350 sonuç kartı, paylaşım
    saveSlot.ts           Oyunların ortak kayıt yuvası (doğrulamalı)
    progress.ts           Maketteki tikler: hangi oyun bitti, sonucu ne
    shell/                Her oyunun hata sınırı ve yükleniyor ekranı
  games/<oyun>/           Her oyun kendi klasöründe, kendi verisi ve kaydıyla
  games/ise-alim/         Sen İK'sin (aşağıda)
  shared/                 Oyunları bilmeyen ortak katman: ses motoru (audio/), stiller (styles/),
                          depo (storage.ts), rastgelelik, renk, hareket ve ses tercihleri
gamePages.ts              Her oyunun paylaşım sayfası (`oyun/<ad>/`)
serviceWorker.ts, csp.ts  Çevrimdışı kopya ve içerik güvenliği politikası
```

Her oyun ayrı bir parça olarak yalnızca girilince (ya da maketteki durağın üstüne gelince) iner; ilk açılış yalnızca maketi indirir. Oyun bitince `progress.ts` ile maketteki durağına tik düşer.

Katmanlar ve bağımlılık yönü (`shared/` ← `arcade/` ← `games/<oyun>/`, oyunlar birbirini import etmez): [docs/mimari.md](docs/mimari.md); `tests/architecture.test.ts` korur.

**Yeni oyun eklemek:** klasör kalıbı, reducer şablonu ve salona bağlama adımları [docs/yeni-oyun.md](docs/yeni-oyun.md)'de.

## Testler

`tests/` altındaki dosyalar oyunların kaynak kodunu doğrudan çalıştırır: Node (23.6+) TypeScript tiplerini kendisi siler, `tests/setup/` Vite'ın yaptığı iki işi (uzantısız importlar, `import.meta.env`) üstlenir. Vitest, Jest ya da tarayıcı gerekmez. Testler tip kontrolüne girmez; bir import'u taşırken testleri de çalıştır.

- **Ortak:** `security`, `privacy` (ağ isteği yok, her depolama anahtarı `kariyerweb-` önekli, "Verilerimi sil" her şeyi siler, sayfadaki ve başlıktaki güvenlik politikası aynı), `layout` (yalnızca ortak kırılma noktaları), `motion` (her animasyon döngüsü hareket azaltma tercihini sorar), `defter` (maketin ilerleme kaydı)
- **Oyunlar:** `aptitude`, `testGame` (UyumMetre), `insaat`, `bakkal*`, `ekran`, `meydan`, `asfalt`, `trafik`, `cuzdan`
- **Sen İK'sin:** `scoring`, `ending`, `balance*` (farklı alışkanlıkta botlar aynı haftaları oynar, puanlar onları doğru sıraya dizmeli), `week`, `save`, `data`, `a11y`, `interview*`, `offer`, `report` ve diğerleri

## Kayıt ve gizlilik

Sunucu, hesap, analiz ya da üçüncü taraf betiği yoktur. Her oyunun kaydı, maketteki tikler ve ayarlar yalnızca oyuncunun tarayıcısında, `kariyerweb-` ile başlayan anahtarlarda durur; kayıtlar okunurken doğrulanır, bozuk ya da eski biçimli kayıt yarım yüklenmek yerine yok sayılır. Ana sayfadaki **Mahalle rehberi**'nde (?) "Verilerimi sil" bunların hepsini ve çevrimdışı kopyayı siler. Gizli pencerede ya da site verileri silinince kayıtlar kaybolur.

Tarayıcı deposuna yalnızca `src/shared/storage.ts` dokunur; biçimi değişen kayıt eski anahtarından çevrilip taşınır ya da silinir. Ağa yalnızca oyunun kendi ses dosyaları için çıkılır (`src/shared/retry.ts`). İleride bir sunucu gerekirse izlenecek ilkeler: [docs/backend.md](docs/backend.md).

**Güvenlik:** sıkı İçerik Güvenliği Politikası (`csp.ts`: yalnızca kendi dosyalar, Trusted Types, sokulan `<style>` çalışmaz). Site başka bir sitenin çerçevesinde açılırsa oyun çizilmez, kendi adresinde açma bağlantısı görünür (`src/shared/frameGuard.ts`; itch.io istisna); başlık gönderebilen sunucularda `public/_headers` aynı korumayı başlıkla da verir.

## Çevrimdışı

`npm run build` bir servis çalışanı (`sw.js`) üretir: sitenin dosyaları (sayfa, betikler, stiller, yazı tipleri, görseller) ilk açılışta tarayıcıya alınır, sonra çevrimdışı da oynanır ve uygulama olarak kurulabilir. Müzik ve yağmur sesi (birkaç MB) ilk açılışta indirilmez, ilk çalındıklarında saklanır. Yeni bir derleme süren bir oyunun ortasında devreye girmez: "Oyunun yeni sürümü hazır · Yenile" çıkar, seçilmezse bütün sekmeler kapanınca geçilir. Servis çalışanı yalnızca derlenmiş sürümde ve HTTPS ya da localhost üzerinden çalışır.

## Yayına almak

`dist/` klasörü herhangi bir statik sunucudan, herhangi bir alt klasörde yayınlanabilir; `.github/workflows/pages.yml` onu GitHub Pages'e yayınlar.

- **Paylaşım önizlemesi:** adresler `#/test` gibi bir parça taşır ve bağlantı önizlemesi yapan siteler parçayı görmez. Bu yüzden her oyunun `oyun/<ad>/` altında kendi başlığını, açıklamasını ve görselini taşıyan küçük bir sayfası vardır (`gamePages.ts`); oyunların paylaştığı bağlantılar oraya gider. Önizleme görseli tam adres ister: `SITE_URL=https://alan-adi npm run build`.
- **Güvenlik:** derlenen sayfa kendi Content-Security-Policy'sini taşır (`csp.ts`): yalnızca sitenin kendi dosyaları yüklenir, sayfadan hiçbir yere istek çıkmaz, Trusted Types metnin betiğe dönüşmesini engeller. `public/_headers` aynı politikayı başlık olarak da verir, çerçeve içine alınmayı reddeder ve önbellek sürelerini ayarlar; ama bu dosyayı yalnızca Netlify ve Cloudflare Pages okur. **GitHub Pages onu yok sayar:** orada çerçeve yasağı, HSTS ve önbellek başlıkları uygulanmaz. Başka bir sunucu kullanılıyorsa aynı başlıklar oradan verilmeli.
- **Görseller:** masadaki orkide Unsplash Lisansı'yla, adayların sitelerindeki fotoğraflar Wikimedia Commons'tan (CC0 ya da kamu malı) gelir ([docs/gorsel-kaynaklari.md](docs/gorsel-kaynaklari.md)); diğer bütün çizimler kodun içinde SVG ya da tuval olarak durur.

## Bağımlılıklar

Çalışma zamanında yalnızca `react`, `react-dom` ve `zustand`; yazı tipleri derleme sırasında `@fontsource-variable` paketlerinden projeye gömülür. Yeni paket eklemeden önce [docs/bagimliliklar.md](docs/bagimliliklar.md) içindeki adımları izle.

## Sen İK'sin

İlk ve en büyük oyun: yeni işe başlamış bir İK uzmanısın (Defne Aral); her gün masana onlarca CV düşüyor, müdürün hız istiyor, sistem adayların çoğunu sen görmeden eliyor. Kurallara uymakla vicdanını dinlemek arasında verdiğin her karar iki puana yansıyor: **Performans** ve **Vicdan**. Masa, bilgisayar ve mülakat odası geniş ekran için tasarlandı; telefonda açılış sayfası okunur, oyun başlamaz.

**Akış:** karşılama → ilan seçimi → başvuru seli → gün brifingi → mesai (masa, İşe Alım Portalı, e-posta, sabit hat, cep telefonu) → Çarşamba 11:00 haftalık İK toplantısı → gün sonu özetleri → Cuma mülakatları → Cuma 18:40 Hakan Bey'in kadro teklifi → annenle telefon → final ve oturum raporu.

```
src/games/ise-alim/
  App.tsx                 Aşamaya göre ekran seçimi (ekranlar ihtiyaç anında yüklenir)
  screens/                Her aşamanın ekranı
  components/             desk/ pc/ phone/ (masa, bilgisayar, telefon), gameplay/, meeting/, dayend/, ui/
  game/
    store/                Oyun durumu (zustand), kayıt ve sürüm geçişleri (save.ts, SAVE_VERSION, MIGRATIONS)
    slices/               Eylemler: gün, dosyalar ve kararlar, telefon, masa, hikâye, ayarlar
    day/                  Mesainin kendisi: saat, e-posta, müdür, ATS, aday havuzu, hikâye
    events/               Haftanın özel anları: toplantı, mülakat, kurul, teklif, hafta sonu
    engine/               Puanlama, sonlar, başarımlar, oturum raporu
    lib/                  İK'nın araçları: etiketli tohumlu rastgelelik, zaman, Türkçe ekler
  audio/trackFor.ts       Haftanın hangi anında hangi müzik
    data/                 Adaylar, günler, ilanlar, telefon senaryosu
```

- **Kayıt:** her günün başında otomatik kayıt alınır; karşılama ekranında "Devam et" o günün sabahına döner. Kayıt biçimi değişirse `src/games/ise-alim/game/store/save.ts`'te `SAVE_VERSION` artar, mümkünse `MIGRATIONS`'a bir geçiş yazılır.
- **Aynı haftayı yeniden oynamak:** adresin sonuna `?seed=<kod>` eklenirse aynı aday dizilimi, aynı ricalar ve aynı olaylarla aynı hafta yeniden başlar.
- **Eğitimde kullanmak:** final ekranındaki **Oturum raporu** oyuncunun haftasını ve kendi kararlarından başlayan tartışma sorularını gösterir; yazdırılabilir ya da metin olarak kopyalanabilir, hiçbir yere gönderilmez. Oturum planı: [docs/egitmen-rehberi.md](docs/egitmen-rehberi.md).
- **Hata bildirmek:** hata ekranındaki "Hata raporunu kopyala" sürümü, oyun kodunu, aşamayı, günü ve hata izini panoya alır; kişisel bilgi içermez.

## Bilinen eksikler

- Arayüz testleri yok: testler oyun mantığını kapsıyor, ekranlar elle deneniyor.
- Renklerin çoğu hâlâ doğrudan yazılmış; `styles/tokens.css` yalnızca temel paleti taşıyor.
- Yalnızca Türkçe.
