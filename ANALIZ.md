# Mesai Dışı · Uçtan uca analiz

> Tarih: 4 Kasım 2026 · İncelenen dal: `claude/great-bardeen-zhfl2n` (`mesai-disi-salonu` üstünde) · Commit `370999d`
>
> Yöntem: Kod tabanı tarandı, üretim derlemesi (`vite preview`, port 4173) Playwright/Chromium ile her
> route'ta 375, 768 ve 1440 px genişlikte gezildi, konsol ve ağ olayları kaydedildi, Lighthouse 12.6.1
> çalıştırıldı, `npm audit`, derleme süresi, paket boyutu ve test kapsamı ölçüldü. Sınır durumları
> (çift tıklama, yenileme, geri tuşu, çevrimdışı, yavaş ağ, klavye) elle senaryolarla denendi.
> Ekran görüntüleri: [`docs/analiz/`](docs/analiz/).
>
> Ciddiyet: 🔴 Kritik · 🟠 Önemli · 🟡 İyileştirme · 🟢 Güzel olmuş

---

## 0. Ölçülen sayılar (özet)

| Ölçüm | Değer | Not |
| --- | --- | --- |
| Kaynak | 452 `.ts/.tsx` dosyası, 80.682 satır | `src/games/` 43.341 satır (9 oyun) |
| Bağımlılık | 3 runtime (`react`, `react-dom`, `zustand`) + 2 font paketi | Çok yalın |
| `npm audit` | **0 zafiyet** | |
| Derleme | `tsc -b` **28,2 s** (soğuk) + `vite build` **3,8 s** | Tip denetimi derlemenin %88'i |
| `dist/` | 9,8 MB, 82 asset | 4,2 MB'ı müzik (ilk açılışta inmiyor) |
| İlk açılış JS+CSS (gzip) | **90 KB / 90 KB bütçe** | Bütçede hiç pay kalmadı |
| En büyük parçalar (gzip) | TestGame 110 KB · store 88 KB · index 86 KB · GameplayScreen 84 KB · Bakkal 70 KB · Trafik 61 KB | |
| En büyük CSS (gzip) | GameplayScreen 33 KB · TestGame 22 KB | |
| Fontlar | 12 woff2, toplam 556 KB (alt kümeler; sayfa başına 3–6'sı iner) | |
| Testler | 47 dosya, **353 test, hepsi geçiyor** | |
| Kapsam | satır %89,7 · dal %90,6 · fonksiyon %86,1 | **Yalnızca 148/452 dosya ölçülüyor, hiçbir `.tsx` yok** |
| Konsol/ağ hatası | 11 route × 3 ekran boyutu = 33 ziyaret, **0 konsol hatası, 0 başarısız istek** | |
| Route açılış (yerel, networkidle) | 600–1.020 ms | 11–45 istek |
| Yavaş ağ (400 kbps, 400 ms RTT, 375 px) | salon `load` 4,55 s, LCP 4,54 s | |

**Lighthouse (12.6.1, üretim derlemesi):**

| Sayfa | Perf | A11y | Best Pr. | SEO | FCP | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Salon · masaüstü | **100** | **100** | 100 | 92 | 0,5 s | 0,8 s | 0 ms | 0 |
| Salon · mobil | **80** | 100 | 100 | 92 | 2,4 s | **4,1 s** | 220 ms | 0,001 |
| `#/bakkal` · mobil | 87 | 94 | 96 | 91 | 2,1 s | 3,3 s | 190 ms | 0 |
| `#/trafik` · mobil | 91 | 94 | 100 | 91 | 2,2 s | 3,2 s | 10 ms | 0,01 |

---

## 1. Frontend geliştirici

**Özet:** Kod disiplinli: strict TypeScript, `any` yasak, lint kuralları ve dosya başı yorumlar çok iyi.
Zayıf nokta, oyun bileşenlerindeki dev "her şeyi bilen" hook'lar ve oyunlar arası kopyalanan
yardımcılar. Hata sınırı tek ve yanlış markalı. Yükleniyor durumu görsel olarak boş.

> **Durum (4 Kasım 2026): bu bölümdeki maddeler uygulandı.** Oyun başına hata sınırı ve "yeni sürüm"
> ekranı (`src/arcade/shell/`), yükleniyor ekranı, ortak `src/shared/random.ts` ve `src/shared/color.ts`
> (+ `tests/shared.test.ts`), Bakkal'da `useShopUi` ve `state / act / ui` grupları, `layout.ts`,
> `max-lines: error`. Kanıt: [`fe-yeni-surum.webp`](docs/analiz/fe-yeni-surum.webp),
> [`fe-yukleniyor.webp`](docs/analiz/fe-yukleniyor.webp), [`fe-bakkal-akis.webp`](docs/analiz/fe-bakkal-akis.webp).

🔴 **Tek, İK markalı hata sınırı bütün oyunlara uygulanıyor.**
- Gördüm: `src/main.tsx:25` tek bir `<ErrorBoundary>` var. Metni `src/components/ui/ErrorBoundary.tsx:66-67`
  "İK SİSTEMİ v4.2 · BEKLENMEYEN HATA / Sistem yanıt vermiyor. … Kayıtlı bir günün yok". Bir oyun
  parçası yüklenemeyince Bakkal'da bile bu ekran açılıyor ([`qa-hata-ekrani.webp`](docs/analiz/qa-hata-ekrani.webp)).
- Neden problem: Oyuncu yanlış oyunun dilinde, yanlış bilgi alıyor ("kayıtlı günün yok" Bakkal için doğru değil). Gerçek tetikleyici: yeni bir yayından sonra açık kalmış bir sekme, artık sunucuda olmayan eski bir parçayı istediğinde.
- Düzeltme: `Root.tsx`'teki her `lazy` oyunu kendi sınırıyla sar; metin `GAMES`'ten gelsin. Parça yükleme hatasını (`ChunkLoadError` / "Failed to fetch dynamically imported module") ayrı yakala ve "Yeni sürüm geldi, sayfayı yenile" de:
  ```tsx
  <GameBoundary route={route}> {/* başlık: GAMES[route].title, "Salona dön" + "Yenile" */}
    <Suspense fallback={<GameLoading route={route} />}><Game /></Suspense>
  </GameBoundary>
  ```
- Etki: yüksek (güven ve kayıp oyuncu) · Efor: 2–3 saat.

🟠 **Bakkal'ın oyun hook'u 99 alanlık bir nesne döndürüyor.**
- Gördüm: `src/games/bakkal/BakkalGame.tsx:605`. `return { acceptCharity, answerAccount, … }` 99 alan döndürüyor. Hook'ta 27 `useState` var. `ShopView.tsx:28` bunların hepsini tek satırda açıyor.
- Neden: Her durum değişikliği bütün görünümü yeniden çiziyor, alanların kim tarafından kullanıldığı izlenemiyor, test edilemiyor (tsx kapsamı 0).
- Düzeltme: Saf bir `reducer(state, action)` (gün, satış, defter, tanıtım) + ince bir `useBakkal()`. Mantık `week.ts`/`returns.ts`'te zaten saf; geriye kalan UI durumunu (kitap açık mı, hesap makinesi) ayrı tutun.
- Etki: orta (bakım) · Efor: 1–2 gün.

🟠 **Aynı yardımcılar oyunlar arasında kopyalanmış.**
- Gördüm: sin tabanlı `hash` 4 dosyada (`arcade/mahalle/places.ts`, `games/asfalt/Site.tsx`, `games/bakkal/ShopScene.tsx`, `games/ekran/scenes.tsx`). Tohumlu `rng`/`mulberry32` 6 yerde (`game/lib/rng.ts`, `screens/break/FoodPile.tsx:165`, `games/trafik/sim.ts:145`, `games/asfalt/model.ts:137`, `games/bakkal/data.ts:235`, `games/cuzdan/model.ts:59`). Renk koyulaştırma (`tone`, `shade`, `mix`) en az 3 kez yazılmış.
- Düzeltme: `src/lib/random.ts` (`hash`, `mulberry32`) ve `src/lib/color.ts`. Testler zaten var, yalnızca import yolları değişir.
- Etki: düşük-orta · Efor: 2 saat.

🟡 **Yükleniyor durumu boş bir renk kutusu.** `src/Root.tsx:37` `fallback` olarak yalnızca oyunun zemin rengini çiziyor. Yavaş ağda (400 kbps) oyun parçası 60–110 KB gzip; oyuncu 1–3 sn boş ekran görüyor. Oyunun adı ve küçük bir ilerleme çizgisi yeter. Efor 1 saat.

🟡 **Satır sınırı fiilen aşılmış.** `.oxlintrc.json` `max-lines: 500` (yorum ve boşluk hariç) ama 12 dosya ham olarak 500'ü geçiyor (`bakkal/data.ts` 661, `bakkal/BakkalGame.tsx` 613, `trafik/sim.ts` 608). Kural "uyarı" seviyesinde. Ya `error` yapın ya da sınırı dürüstçe 600'e çekin.

🟡 **Magic number'lar SVG sahnelerinde yoğun** (`ShopScene.tsx` `translate(1254 -10)`, `FIT = 'translate(160 180) scale(0.8)'`). Çizim kodunda kabul edilebilir, ama sahneler arası ortak sabitler (`COUNTER_Y`, `W/H`) tek bir `layout.ts`'te toplanmalı.

🟢 Strict TS + `no-explicit-any: error`, `eqeqeq`, `rules-of-hooks: error`. Ölü kod az. Kaydedilmiş verinin şema denetimi örnek niteliğinde (`arcade/progress.ts` `parseProgress` bozuk kaydı sessizce boş sayıyor). `React.memo` neredeyse hiç yok (3 yer), ama ölçülen bir yavaşlık da yok; erken optimizasyona gerek yok.

---

## 2. Yazılım mimarı

**Özet:** "Her oyun kendi klasöründe, salon onları tembel yüklüyor" kararı doğru ve ölçeklenebilir.
Asıl borç, ilk oyunun (İK) kökte yaşaması: `src/game`, `src/screens`, `src/components` aslında tek
bir oyunun kodu ama paylaşılan altyapı gibi duruyor. 10 kat büyümede kırılacak ilk şey bu
belirsizlik ve paylaşılan kodun yokluğu olur.

> **Durum (4 Kasım 2026): bu bölümdeki maddeler uygulandı.** İK `src/games/ise-alim/`'e taşındı;
> ortak kod `src/shared/` altında (ses motoru, stiller, depo, rastgelelik, renk, tercihler). İmport
> yönü `tests/architecture.test.ts` ve `src/shared/**` için lint kuralıyla korunuyor. Kayıt erişimi
> `src/shared/storage.ts`'te; eski sürüm anahtarları için göç desteği var (Trafik v1–v3 temizleniyor).
> Yeni oyun kalıbı `docs/yeni-oyun.md`, katmanlar `docs/mimari.md`. `tsc -b` artımlı hâle geldi:
> sıcak denetim 24,9 s → **0,46 s**, tek dosya değişince ~3–4 s; CI'da önbellekli.

🟠 **İK oyunu kökü işgal ediyor.** `src/game/` (9.272 satır), `src/screens/` (8.014), `src/components/` (15.669) yalnızca `#/ise-alim` için; yine de `ErrorBoundary`, `motion`, `MobileBlock` gibi gerçekten ortak parçalar da `src/components/ui/` içinde. Yeni bir geliştirici neyin paylaşıldığını anlayamaz.
- Düzeltme: `src/games/ise-alim/` altına taşıyın; gerçekten ortak olanları `src/shared/` (ui, lib, audio) altında toplayın. Lint ile yön koruyun: `games/*` → `shared/*` serbest, `games/a` → `games/b` yasak (oxlint `no-restricted-imports`).
- Etki: yüksek (10x büyümede) · Efor: 1 gün (çoğu taşıma + import yolu).

🟠 **İki farklı durum modeli.** İK'da zustand (`game/store/store.ts`, 88 KB'lık parça), diğer 8 oyunda büyük `useState` hook'ları. İkisi de çalışıyor; ama yeni oyunlar için bir kalıp yok.
- Öneri: Oyun mantığı için "saf reducer + seçici" kalıbını standartlaştırın (zustand'a gerek yok, `useReducer` yeter); şablonu `docs/yeni-oyun.md` olarak yazın.

🟡 **Kayıt erişimi tek yerde değil.** Anahtarlar tutarlı (`kariyerweb-<oyun>-v<n>`; `src/game/lib/privacy.ts` "Verilerimi sil" hepsini önekle temizliyor, eski `meydan:taslak:` önekini de). Ama `localStorage` 20 dosyada doğrudan çağrılıyor, her oyun kendi `try/catch`'ini yazıyor. Tek bir `storage.ts` (`read(key, check)` / `write` / sürüm göçü) bu tekrarı kaldırır. `arcade/saveSlot.ts` bunun yarısı zaten.

🟡 **`tsc -b` derlemenin %88'i (28 s).** 10 kat kodda dakikaları bulur. `tsconfig` proje referanslarıyla oyunları ayrı projelere bölün; değişmeyen oyun yeniden denetlenmez.

🟢 Bağımlılık yönü temiz: oyunlar birbirini import etmiyor (`grep` ile doğrulandı), salon yalnızca `games.ts` ve `slugs.ts` üzerinden biliyor. `slugs.ts` "hiçbir şey import etmez" kuralı derleme betiklerinin de onu okuyabilmesini sağlıyor; bu iyi düşünülmüş.

---

## 3. Backend / veri

**Özet:** Backend yok ve bu bilinçli bir ürün kararı ("hiçbir veri dışarı gönderilmez"). Ağ çağrısı
yalnızca ses dosyaları ve service worker için. Bugün backend gerektiren bir sorun yok; ama
"paylaşılan sonuç", "günün kavşağı skor tablosu" gibi fırsatlar geldiğinde hazır olunacak birkaç şey var.

🟢 **Ağ katmanı minimal ve doğru.** `fetch` yalnızca `audio/audioEngine.ts:74`, `audio/engineCore.ts:178` ve `serviceWorker.ts`'te. Yarış koşulu yok, N+1 yok.

🟡 **Ses indirmesindeki hata oturum boyunca kalıcı.** `src/audio/engineCore.ts:174-182` `loadSample`, başarısız `fetch`'i `.catch(() => null)` ile `null`'a çevirip `this.samples` haritasında saklıyor. Mobil veride tek bir kopukluk, o sesi sekme kapanana kadar sessiz bırakıyor (yedek sentez çalıyor). Düzeltme: `null` sonucunu haritadan silin (`.catch(() => { this.samples.delete(url); return null; })`) ve bir kez 2 s sonra yeniden deneyin.

🟡 **İleride backend gerekirse bugün hazırlanmalı:**
1. Sürüm göçü. Sürüm bugün anahtarın adında (`kariyerweb-trafik-v4`); biçim değişince anahtar değişiyor ve eski kayıt **sessizce terk ediliyor** (silinmiyor da). Bir backend ya da bulut kaydı gelirse "v3'ü v4'e çevir" adımı gerekecek; bugünden `saveSlot.ts`'e bir `migrate` kancası eklenebilir.
2. Oyun sonuçları için ortak bir `Result` şeması (`progress.ts` `{result: string, at}` iyi bir başlangıç).
3. Paylaşım için bugünkü "URL'de durum" yaklaşımı (`#/ekran?t=…`) korunsun; skor tablosu gerekiyorsa yalnızca **isteğe bağlı**, anonim bir uç (Cloudflare Worker + KV) ve CSP `connect-src`'ye tek bir alan eklenmeli.

---

## 4. Güvenlik

**Özet:** Bu ölçekte bir istemci uygulaması için güvenlik duruşu örnek alınacak düzeyde: sıkı CSP,
Trusted Types, sıfır zafiyet, `innerHTML` yok, gizli anahtar yok. Bulduğum tek pratik risk,
`_headers` dosyasının GitHub Pages'te işlenmemesi.

🟢 CSP (`csp.ts`): `default-src 'self'`, `script-src 'self'`, `object-src 'none'`, `form-action 'none'`, `require-trusted-types-for 'script'`. Hem `<meta>` hem `_headers`'ta; `tests/security.test.ts` ikisini eşit tutuyor.
🟢 `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`: **0 kullanım**.
🟢 `npm audit`: 0 zafiyet. Dependabot açık (`.github/dependabot.yml`).
🟢 Kayıt verisi dışarıdan geldiği varsayılarak doğrulanıyor (`parseProgress`, uzunluk kırpma `slice(0, 60)`).
🟢 `localStorage`'da hassas veri yok: yalnızca oyun durumu ve tercihler.

🟠 **GitHub Pages `_headers`'ı okumaz.** `pages.yml` Pages'e yayınlıyor; `frame-ancestors`, `X-Frame-Options`, HSTS, `Permissions-Policy` orada **gönderilmez** (`<meta>` CSP `frame-ancestors`'u yok sayar). Sonuç: site başka bir sitede `<iframe>` içine alınabilir (clickjacking riski düşük ama sıfır değil; site oyun ve form yok).
- Düzeltme: Ya Cloudflare Pages/Netlify'a geçin (`_headers` zaten hazır), ya da JS ile çerçeve kırma: `if (top !== self) top.location = self.location`. Bu kontrol itch.io yerleşimini bozar, bu yüzden `release` paketinde kapalı olmalı.

🟡 `style-src 'unsafe-inline'` var (SVG `style={{…}}` ve React inline stilleri için gerekli). Kabul edilebilir; not olarak kalsın.

---

## 5. Performans

**Özet:** Masaüstünde kusursuz (Lighthouse 100). Mobilde salon 80'de kalıyor: LCP 4,1 s'nin sebebi
render'ı engelleyen CSS ve mobile göre büyük maket görseli. İlk açılış paketi bütçenin tam
sınırında; bir sonraki özellik bütçeyi delecek.

🟠 **İlk açılış bütçesi doldu: 90 / 90 KB.** `index-*.js` 85,6 KB gzip. İçinde salonun maketi, durak verisi ve ses motoru köprüsü var.
- Düzeltme: Ses motorunun başlatılması (`main.tsx:15-18`) ve `UpdateNotice` ilk boyamadan sonraya alınabilir. Salonun "yardım" ve "ayarlar" panelleri ayrı parça olabilir. Tahmini kazanç: 8–15 KB gzip.

🟠 **Mobil LCP 4,1 s: render'ı engelleyen CSS ve büyük görsel.**
- Gördüm: Lighthouse `render-blocking-resources` mobilde 1.180 ms tasarruf öneriyor (`index-*.css`). `uses-responsive-images`: `giris.webp` (1152×928, 139 KB) ve `giris-gece.webp` 375 px ekranda tam boyutta iniyor (140 KB tasarruf).
- Düzeltme:
  1. `srcset`: `giris-576.webp` (≈40 KB) + `giris-1152.webp`, `sizes="(max-width: 600px) 92vw, 50vw"`.
  2. Gece görselini (`giris-gece*.webp`) yalnızca saat akşamsa yükleyin. Şu an ikisi de iniyor.
  3. Salonun kritik CSS'ini (~6 KB) `index.html`'e gömün.
- Beklenen: mobil LCP 4,1 s → ~2,6 s, Lighthouse 80 → 90+.

🟡 **Meydan ilk ekranda 9.697 DOM düğümü açıyor** (diğer oyunlar 49–3.096). Seçim kartlarındaki dört cephe tam SVG olarak çiziliyor. Kartlarda önceden üretilmiş küçük bir `webp` (ya da `content-visibility: auto`) kullanılırsa mobilde ilk etkileşim belirgin hızlanır.

🟡 **Bakkal sahnesinde filtre dersi alındı.** Bu dalda denenen SVG `feConvolveMatrix` mürekkep filtresi kareyi 14 → 3 fps'e düşürdü, CSS çizgiye çevrilince 60 fps'e çıktı. Kural olarak yazılsın: canlı sahnede SVG filtresi yok, dokular `pattern` ile.

🟡 **Altı yazı tipi ailesi var** (Fraunces, Work Sans, JetBrains Mono ve Caveat `src/styles/fonts.css`'te; Inter ve Manrope salonun kendi `src/arcade/welcome/fonts.css`'inde). Alt kümeleme ve `font-display: swap` doğru; `@font-face` tanımı dosyayı indirmez. Yine de salonun ilk boyaması için kullanılan iki yazı tipine `<link rel="preload">` eklenmesi FCP'yi iyileştirir; tasarım tarafında da aile sayısını 4'e indirmek kimliği netleştirir.

🟢 Tembel yükleme örnek düzeyde: her oyun ve İK'nın her ekranı ayrı parça; sesler `requestIdleCallback` ile; müzik service worker'da ilk çalınışta saklanıyor. CLS her yerde ≈0.

---

## 6. UX / etkileşim

**Özet:** Salon ilk 5 saniyede ne yapılacağını anlatıyor: masaüstünde maket, mobilde oyun çipleri.
Oyunların girişleri net ve tek düğmeli. Sorunlar sınırlarda: mobilde İK'da çıkmaz sokak, bilinmeyen
adreste sessiz yönlendirme ve oyunlar arasında tutarsız "geri" dili.

🔴 **Mobilde İK: önce "İşe başla" deniyor, sonra kapı kapanıyor.**
- Tekrar: 375 px → `#/ise-alim` → "İşe başla" → "Bu oyun bilgisayar için" ([`qa-ik-mobil.webp`](docs/analiz/qa-ik-mobil.webp)).
- Problem: Oyuncu bir adım atıyor, sonra cezalandırılıyor. Engel ekranında **hiç düğme yok** (`src/components/ui/MobileBlock.tsx`, `role="dialog" aria-modal="true"`, odaklanacak öğe yok). Tek çıkış tarayıcının geri tuşu.
- Düzeltme: (1) Salonda dar ekranda İK çipine "masaüstü" etiketi koyun. (2) Engel ekranına "Salona dön" ve "Bağlantıyı kopyala" (masaüstünde açmak için) düğmeleri ekleyin. (3) Engeli giriş ekranında gösterin, "İşe başla"dan sonra değil.
- Etki: yüksek (mobil trafik) · Efor: 1–2 saat.

🟠 **Bilinmeyen adres sessizce salona düşüyor.** `#/olmayan-sayfa` → salon, hiçbir mesaj yok (`arcade/route.ts` `routeOf` → `'arcade'`). Eski paylaşım bağlantısıyla gelen kişi neden salonda olduğunu anlamaz. Salonun üstünde küçük bir şerit yeter: "Aradığın oyun bulunamadı; işte mahalle."

🟠 **"Geri" dili oyundan oyuna değişiyor:** "Mesaiyi bitir" (Bakkal, Trafik, Meydan, Asfalt, Ekran), "← Girişe dön" (İK), yalnız ok (mobil), Cüzdan açılışında hiç yok (yalnızca "Açılışı atla ›"). Hepsi aynı yere gidiyor. Tek bileşen ve tek metin önerisi: **"← Salona dön"**. "Mesaiyi bitir" esprili ama ilk kez gelen oyuncu oyundan mı çıkıyor, günü mü bitiriyor, anlayamıyor.

🟡 **Cüzdan'ın açılışı 375 px'te kesiliyor:** BIOS satırları sağdan kırpılıyor ("TAM" yarım, [`cuzdan-375.webp`](docs/analiz/cuzdan-375.webp)). Dar ekranda satırları kısaltın ya da `font-size: clamp()` kullanın.

🟡 **Trafik giriş ekranındaki "Oyna" okunmuyor** (bkz. Erişilebilirlik): birincil eylem, ekranın en zayıf kontrastlı öğesi.

🟢 Bakkal'da kapatılabilir tanıtım, onay soran ×, yanıp sönen AÇIK levhası ve dar ekranda levhanın eşi; çift tıklamada çift kepenk ya da çift tanıtım **oluşmuyor** (QA'da denendi). Trafik'te "Günün kavşağı / Rastgele kavşak" ayrımı tekrar oynamayı davet ediyor.

---

## 7. Görsel / UI

**Özet:** Bu proje "şablon gibi" durmuyor. Her oyunun kendi dünyası var: Ekran İhalesi'nin ihale
belgesi, Trafik'in kontrol merkezi, Cüzdan'ın BIOS'u, Bakkal'ın mürekkep çizimi. Güçlü yanı bu
çeşitlilik, zayıf yanı da aynı çeşitlilik: salon ile oyunlar arasında ortak bir "ev" dili zayıf.

🟠 **Marka adı dört farklı biçimde geçiyor:** "Mesai Dışı" (başlık, `index.html`), "KASM Mahallesi / KASM Labs" (salon logosu, oyun köşeleri), "Sen İK'sin" (önbellek adı `sen-iksin-*`, hata ekranı), "kariyerweb" (paket adı, `kariyerweb-defter`). Kullanıcıya görünenler ilk ikisi; ama hangisinin marka olduğu belirsiz.
- Öneri: Ürün adı **Mesai Dışı**, stüdyo imzası **KASM**. Logo "MESAİ DIŞI · KASM Mahallesi" olsun; iç anahtarlar zamanla `mesai-disi-` önekine taşınsın (göç ile).

🟡 **Oyunların köşesindeki "KASM LABS" damgası** bazı ekranlarda içerikle çakışıyor (Bakkal 768 ve 1440 px'te kepengin rayının üstünde, [`bakkal-768.webp`](docs/analiz/bakkal-768.webp)). Dar ekranda ya da oyun sahnesinin üstünde gizlenmeli.

🟡 **Birincil düğme renkleri oyun başına değişiyor** (sarı, kahve, mavi, siyah). Bu bilinçli bir dünya kurma tercihi, doğru. Ama "geri" düğmesi ve ses/ayar düğmeleri her oyunda aynı olmalı, bunlar salonun "kabuğu".

🟢 Tipografi hiyerarşisi güçlü: Fraunces başlıklar + Work Sans gövde + JetBrains Mono "sistem" sesi. Mahalle maketi görseli (`public/mahalle/giris.webp`) siteye kimlik veriyor; Bakkal ve Kavşak bu dile taşındı.

**Somut tasarım yönü:** Salonun maketindeki mürekkep çizimi dilini "kabuk" yapın: her oyunun üst köşesinde aynı küçük "mahalle tabelası" (oyunun durak adı + geri oku), aynı kâğıt dokulu modal kartı ve aynı ses düğmesi. Oyunlar içeride kendi dünyası olarak kalsın, çerçeve ortak olsun.

---

## 8. Erişilebilirlik

**Özet:** Ortalamanın çok üstünde: hareketi azaltma (55 CSS bloğu), yüksek kontrast, büyük tuşlar,
metin ölçeği, modal odak kapanı, `aria-live` var. Lighthouse salonda 100. Bulunan sorunlar az ve
somut.

🟠 **Trafik "Oyna" düğmesi kontrastı 1,42:1** (AA için 4,5:1 gerekir).
- Kanıt: Lighthouse `color-contrast` (#ece9e1 metin, #ffb81c zemin). Sebep: `src/games/trafik/TrafikGame.module.css:27-29` `.app button { color: inherit }` kuralının seçici ağırlığı (0,1,1), `Title.module.css:312` `.cta { color: #1b1607 }` kuralını (0,1,0) eziyor.
- Düzeltme: `.app .cta { color: #1b1607; }` ya da `.app button` kuralını `:where(.app) button` yapın.
- Efor: 5 dakika.

🟠 **İK mobil engelinde odaklanacak öğe yok** (`MobileBlock.tsx`): `aria-modal="true"` olan bir diyalog ama içinde düğme yok. Ekran okuyucu kullanıcısı sıkışıyor. Bkz. UX düzeltmesi.

🟡 **Bakkal kepengi:** `src/games/bakkal/Shutter.tsx:12` `<div aria-label="Kepenk">` rol olmadan (Lighthouse `aria-prohibited-attr`). Kepenk dekor: `aria-hidden="true"` yeterli, `aria-label` kalkmalı.

🟡 **Salon logosunun erişilebilir adı görünen metni içermiyor:** `src/arcade/welcome/WelcomeScreen.tsx:284` `aria-label="KASM Mahallesi, Mesai Dışı Sk."`. Görünen metin "KASM MAHALLESİ"; WCAG 2.5.3 "Label in Name". Düzeltme: `aria-label="KASM Mahallesi — salona dön"` gibi görünen metinle başlayan bir ad.

🟡 **Tab sırası:** Salonda ilk Tab maketteki 8 durağa gidiyor, başlık (logo, ses, yardım, ayarlar) sonra geliyor; bir adımda odak `body`'ye düşüyor (QA). Görsel sıra yukarıdan aşağı olduğu için başlık önce gelmeli. Odak göstergesi duraklarda var (açılan bilgi kartı, [`qa-klavye-odak.webp`](docs/analiz/qa-klavye-odak.webp)).

🟡 **Oyunların çoğunda `<h1>` yok** (İnşaat, Bakkal, Ekran, Meydan, Asfalt, Cüzdan). Ekran okuyucu "başlıklar" listesinde boş görüyor. Her oyunun girişinde görsel olarak gizli (`.sr-only`) bir `h1` yeter.

🟡 **Bakkal'daki raf etiketleri 5,6 SVG birimi** (Lighthouse `font-size`: metnin %39'u okunaklı). Çizimin parçası, ama raftaki adet bilgisi oyun bilgisi: büyük metin modunda etiketlerin de büyümesi gerekir.

🟢 `prefers-reduced-motion` 55 yerde, "Hareketi azalt" ayarı da var; `useModalTrap`, `useScreenFocus`; 30 dosyada `role="dialog"`. Salonun Lighthouse a11y puanı 100.

---

## 9. Mobil / responsive

**Özet:** 375 px'te 33 ziyaretin hiçbirinde yatay kaydırma yok. Oyunların çoğu dar ekran için ayrıca
düşünülmüş: Bakkal'da levha eşi, Trafik'te panel, salonda çip listesi. Sorunlar dokunma hedefi
boyutları ve tek bir oyunun (İK) mobil deneyimi.

🟠 **Dokunma hedefleri küçük:** 375 px'te salonda 21 hedefin **13'ü** 44×44 px altında (oyun çipleri 36 px yükseklikte). İnşaat'ta 7/7, Bakkal'da 6/8, Ekran'da 5/9.
- Düzeltme: Çiplerde `min-height: 44px`; ikon düğmelerde görünmez dokunma alanı (`::after { inset: -6px }`).

🟡 **Safe-area yalnızca 1 yerde** (`safe-area-inset` tüm kodda 1 kez). Çentikli telefonda yatay Trafik/Bakkal'da üst çubuk çentiğe girebilir. Kabuk düzeyinde `padding: env(safe-area-inset-*)`.

🟡 **Mobil performans:** Bakkal mobilde TBT 190 ms, ana iş parçacığı 5,6 s (Lighthouse). SVG sahnesi 2.618 DOM düğümü. Raftaki her ürün ayrı SVG grubu; ürün çizimleri bir `<symbol>` + `<use>` ile tanımlanırsa düğüm sayısı yarıya iner.

🟢 Hiçbir route'ta yatay kaydırma yok; `touch-action` 16 yerde doğru kullanılmış; Trafik dar ekranda üst/alt paneli yeniden düzenliyor.

---

## 10. SEO ve bulunabilirlik

**Özet:** Hash router'ın SEO zararı, oyun başına scriptsiz paylaşım sayfalarıyla (`oyun/<ad>/`)
akıllıca telafi edilmiş. Eksikler basit: robots.txt, sitemap, yapılandırılmış veri ve kanonik adres
için `SITE_URL`'nin CI'da tanımlı olması.

🟠 **`robots.txt` ve `sitemap.xml` yok.** Önizleme sunucusunda `/robots.txt` SPA'nın HTML'ini (`200 text/html`) döndürüyor, Lighthouse "34 hata". Pages'te 404 olur.
- Düzeltme: `public/robots.txt`:
  ```
  User-agent: *
  Allow: /
  Sitemap: https://<alan>/sitemap.xml
  ```
  `sitemap.xml`'i `gamePages.ts` ile derlemede üretin (ana sayfa + 9 `oyun/<ad>/`).

🟢 **Kanonik adres ve mutlak OG görseli:** `vite.config.ts` `publishedPage` bunları `SITE_URL` verilince yazıyor; `.github/workflows/pages.yml:35` bu değişkeni Pages adresiyle tanımlıyor. Yerel `npm run build` ve `npm run package` (itch.io) çıktılarında göreli kalır; itch.io için bu kabul edilebilir.

🟡 **Yapılandırılmış veri yok.** Her `oyun/<ad>/` sayfasına `VideoGame` JSON-LD'si (ad, açıklama, `inLanguage: tr`, `gamePlatform: Web browser`, `isAccessibleForFree: true`) eklenebilir. CSP `script-src 'self'` JSON-LD'yi etkilemez (veri bloğu, çalıştırılmaz).

🟢 Hash router'dan History API'ye geçmeye **gerek yok**: oyunlar indekslenecek içerik değil, paylaşım sayfaları zaten tarayıcı ve botlar için ayrı HTML. SSR/prerender gereksiz. `title`/`description`/OG etiketleri eksiksiz; her oyunun kendi OG görseli var (`dist/og/*.png`, 9/9).

---

## 11. İçerik / metin

**Özet:** Metinler bu projenin en güçlü yanı: kısa, esprili, yerel. Sorunlar ton tutarlılığında
değil, işlevsel metinlerde (geri düğmesi, hata, engel ekranı) ve küçük tutarsızlıklarda.

🟠 **İşlevsel metinler oyunun dünyasına göre değil, İK'ya göre yazılmış:**
| Yer | Şimdi | Öneri |
| --- | --- | --- |
| Hata ekranı (bütün oyunlar) | "İK SİSTEMİ v4.2 · BEKLENMEYEN HATA / Sistem yanıt vermiyor. … Kayıtlı bir günün yok" | "**{Oyun adı}** takıldı. / Bir şey ters gitti, biz değil, kod. Sayfayı yenile; kayıtlı ilerlemen yerinde." + "Salona dön" |
| Parça yüklenemedi | (aynı hata ekranı) | "Mahalleye yeni bir sürüm geldi. Yenileyince kaldığın yerden devam edersin." |
| İK mobil engel | "Bu oyun bilgisayar için … Aynı adresi bir bilgisayarda … açarak oynayabilirsin." | "Bu masa telefona sığmıyor. / Sen İK'sin geniş ekran ister: CV'ler, telefon, mülakat odası aynı anda açık. Bağlantıyı kopyala, bilgisayarda aç." [Bağlantıyı kopyala] [Salona dön] |
| Geri düğmesi | "Mesaiyi bitir" / "Girişe dön" | "← Salona dön" (oyun içi "günü bitir" ile karışmasın) |
| Bilinmeyen adres | (mesaj yok) | "Bu sokakta öyle bir dükkân yok. İşte mahalle." |

🟡 **Küçük tutarsızlıklar:** Salon "Mahalleye hoş geldin." ama sekme başlığı "Mesai Dışı · Kısa, tuhaf oyunlar"; tagline iki biçimde ("Kısa, tuhaf oyunlar." / "Mesai bitti, kimse bakmıyor."). Bir tanesini ana slogan seçin. `src/arcade/games.ts`'teki yorum "route.ts'e adresini" diyor ama dosya `slugs.ts`.

🟢 Bakkal'ın müşteri diyalogları ("Şehirde her şey iki katı, burası cennet!"), Trafik'in "104.6 Trafik Radyosu" şeridi, Test'in "*Kendi içimizde." dipnotu: ton tutarlı ve karakterli. İmla dikkatli (Türkçe karakterler, kesme işaretleri doğru).

---

## 12. Oyun senaristi / kurgu

**Özet:** Her oyun kendi içinde güçlü bir premise taşıyor ("Etiket yok, fiyatı sen söylersin"). Eksik
olan, "mahalle"nin bir dünya olarak oyunları birbirine bağlaması. Bugün salon bir menü; bir yer
olabilir.

🟠 **Mahalle bir menü, dünya değil.** Maket harika, ama duraklar arasında anlatı bağı yok. Oysa malzeme hazır: Bakkal'ın Şükrü Amca'sı, Yama Ekibi'nin "Kadıköy, Moda · Ara sokak" çukuru, Trafik'in "104.6" radyosu, Cüzdan'ın 2005'i. Somut öneriler:
1. **Çapraz göndermeler:** Bakkal'da bir müşteri "Köşedeki çukur hâlâ kapanmadı" desin; Yama Ekibi'ni bitiren oyuncu, Bakkal'da o müşteriyi "Çukur kapandı, sağ ol" diye görsün (`progress.ts` zaten hangi oyunun bitirildiğini biliyor).
2. **Trafik radyosu salonun sesi olsun:** Salonun üstündeki "Mesai bitti. Kimse bakmıyor." şeridi, oynanan oyunlara göre değişen bir haber bandına dönüşsün ("Kavşak Amiri Vatan Caddesi'ne yeşil dalga kurdu", "Köy bakkalında fiyatlar makul").
3. **Maket değişsin:** Bitirilen oyun maketi değiştirsin: çukur kapanır, bakkalın tentesi açılır, meydan tabelaları düzelir. Ödül görsel ve anlatısal olur, puan tablosu gerekmez.

🟡 **Oyuncunun motivasyonu oyun başına net, oyunlar arası değil.** "Neden bir sonrakini oynayayım?" sorusunun cevabı yok. Yukarıdaki 3 madde bunu çözer.

🟢 Hiciv dengeli: İK ve Test oyunlarında sistem eleştirilirken oyuncu yargılanmıyor; Bakkal'da etik ikilemler (eksik para, para üstü, bayat mal) vaaz vermeden sunuluyor.

---

## 13. Oyun tasarımı / oyunlaştırma

**Özet:** Oyunların iç döngüleri iyi kurulmuş (Bakkal'da itibar-kasa gerilimi, Trafik'te günün
kavşağı). Salon düzeyinde ilerleme hissi zayıf. Önerilerim karanlık desen içermiyor: seri cezası,
yapay kıtlık ya da bildirim yok.

🟠 **Salon düzeyinde ilerleme görünmüyor.** `arcade/progress.ts` bitirilen oyunu ve sonucunu saklıyor (`{result, at}`), ama salonda bunun karşılığı zayıf.
- Öneri: Maket üzerinde "yapıldı" işaretleri (bkz. §12/3) ve salonda "9 durağın 4'ü" gibi sakin bir sayaç. Sonuç metni (`result`) durak kartında görünsün: "Köy Bakkalı · 30 gün, itibar 82".

🟡 **Günlük içerik bir oyunda var, sistem olarak yok.** Trafik'te "Günün kavşağı", Cüzdan'da `daily.ts`. Bu, salonda tek bir "Bugün" rafına dönüşebilir: geri dönme sebebi, ama seri (streak) cezası olmadan.

🟡 **Zorluk eğrisi:** Bakkal'da ilk gün tanıtımı bitince zorluk birden açılıyor (itibar eşikleri, iade, veresiye aynı haftada). `week.ts` olaylarını ilk 3 güne yaymak öğrenmeyi yumuşatır. Bu bir ölçüm değil, tasarım önerisi; oyuncu verisi olmadan doğrulanamaz.

🟢 Ödüller içsel ve hikâyeye bağlı (Şükrü Amca'nın dönüşü, Kavşak'ta yeşil dalga). Mikro-ödeme, reklam, bildirim gibi karanlık desenler yok.

---

## 14. QA

**Özet:** 33 route ziyaretinde sıfır konsol hatası, testler yeşil, çift tıklama ve yenileme sağlam.
Bulunan hatalar arayüz katmanında; bunlar bugün testlerle yakalanamıyor çünkü UI testi yok.

**Tekrar üretilebilir hatalar:**

| # | Ciddiyet | Adımlar | Beklenen | Gerçekleşen |
| --- | --- | --- | --- | --- |
| Q1 | 🔴 | 375 px → `#/ise-alim` → "İşe başla" | Engel girişte gösterilsin, çıkış olsun | Çıkışsız "Bu oyun bilgisayar için" ekranı |
| Q2 | 🟠 | `#/bakkal` açıkken bir oyun parçasının yüklenmesini engelle (DevTools → Network → request blocking `*Bakkal*`) → yenile | Bakkal'a özgü hata, "Salona dön" | "İK SİSTEMİ v4.2 · Kayıtlı bir günün yok" |
| Q3 | 🟠 | `#/trafik` → giriş ekranı | "Oyna" okunur | Açık renk yazı, sarı zemin (1,42:1) |
| Q4 | 🟡 | `#/olmayan-sayfa` | "Bulunamadı" bilgisi | Sessizce salon |
| Q5 | 🟡 | 375 px → `#/cuzdan` | BIOS satırları sığar | Sağdan kesik |
| Q6 | 🟡 | Salonda Tab ×9 | Odak başlıkta başlar | Önce 8 durak, sonra `body`, sonra başlık |
| Q7 | 🟡 | `curl /robots.txt` (preview) | `text/plain` | `200 text/html` (SPA) |

**Denendi, sorun yok:** Bakkal "Kepengi aç" çift tıklama (tek tanıtım), oyun içinde sayfa yenileme, oyundan tarayıcı geri tuşu (salona dönüyor, başlık güncelleniyor), derin bağlantıyla doğrudan oyuna giriş (9/9), **çevrimdışı** (service worker 92 dosyayı önbelleğe alıyor; Chrome çevrimdışı modunda salon, Trafik, Meydan, Bakkal ve İK açıldı). *Not: Playwright'ın `setOffline` ayarı service worker'ı da kestiği için ilk denemede yanlış "boş sayfa" sonucu verdi; test CDP'nin çevrimdışı modu ile tekrarlandı.*

**Test kapsamı değerlendirmesi:**
- 🟢 Oyun mantığı iyi test edilmiş: 353 test; denge testleri (`balance*.test.ts`), olasılık (`rng.test.ts`), güvenlik (`security.test.ts` CSP eşitliği), gizlilik.
- 🟠 Ölçülen %89,7 yanıltıcı: kapsam yalnızca testlerin içe aktardığı **148/452** dosyayı sayıyor; **sıfır `.tsx`**. Arayüz hiç test edilmiyor.
- **Eksik testler (öncelik sırasıyla):**
  1. Playwright duman testi: 9 route × 2 boyut, açılıyor mu, konsol hatası yok mu (≈40 satır, CI'da 1 dk).
  2. Hata sınırı: oyun parçası 404 → oyuna özgü mesaj.
  3. Bakkal tanıtımı: × → onay → atla → levha → ilk satış.
  4. Erişilebilirlik: `@axe-core/playwright` ile her route.
  5. Kayıt göçü: eski biçimdeki `localStorage` kaydı yeni sürümde açılıyor mu.
  6. Kapsamı dürüst ölçmek için `--test-coverage-include="src/**"` ile **bütün** dosyalar (içe aktarılmayan 0 sayılır).

---

## 15. DevOps

**Özet:** CI/CD çoğu projeden olgun: tip + lint + kapsamlı test + derleme + boyut bütçesi + audit tek
komutta (`npm run ci`), pre-push hook, Pages yayını, sürüm paketi (itch.io). Eksikler hata görünürlüğü
ve derleme hızı.

🟠 **Üretimdeki hatalardan haberin yok.** Bilinçli olarak analitik ve Sentry yok ("hiçbir veri gönderilmez"). Bu doğru bir ilke, ama sonuç olarak Q2 gibi hatalar yalnızca kullanıcı şikâyet ederse görülür.
- Öneri (ilkeyi bozmadan): Hata ekranındaki "Hata raporunu kopyala" zaten var; buna "GitHub'da bildir" bağlantısı ekleyin (`.github/ISSUE_TEMPLATE/hata.yml` hazır, rapor URL parametresiyle doldurulabilir). Analitik gerekiyorsa çerezsiz, kendi barındırılan, **isteğe bağlı** bir sayaç (Plausible/GoatCounter); CSP `connect-src`'ye tek alan.

🟡 **Derleme süresi:** `tsc -b` 28 s, Vite 3,8 s. CI'da `tsc -b`'nin `.tsbuildinfo`'sunu `actions/cache` ile saklayın; yerelde değişen proje dışı denetlenmez (bkz. §2).

🟡 **Biçimlendirici yok** (Prettier/Biome). Kod tutarlı görünüyor, ama bu disiplinle değil araçla korunmalı. `oxlint` yanında `biome format` (hızlı, tek ikili) ve `.githooks/pre-commit`.

🟡 **`pre-push` hook'u isteğe bağlı** (`git config core.hooksPath .githooks` elle). `npm install` sonrası `prepare` betiğiyle otomatik ayarlanabilir.

🟢 `ci.yml`: `concurrency` ile eski çalışmayı iptal, `permissions: contents: read`, `timeout-minutes: 15`, `dist` artefaktı. `pages.yml` ayrı ve sırayla. `release.yml` paket üretiyor. Dependabot açık. `engines.node >= 23.6` ve `.nvmrc` tutarlı.

---

## 16. Ürün stratejisi

**Özet:** "Mesai Dışı", Türkiye'nin gündelik absürtlüklerini (işe alım, enflasyon, kavşak, bakkal
veresiyesi) kısa ve oynanabilir hicivlere çeviriyor. Kurulumsuz, hesapsız, çevrimdışı çalışıyor.
Değer önerisi oyunların içinde çok net, salonun kapısında daha az net.

**Kimin hangi problemini çözüyor?** Mesai sonrası 5–15 dakikası olan, Türkçe mizahtan hoşlanan,
reklam ve hesap istemeyen yetişkin. Rakipler (genel HTML5 portalları, mobil hiper-casual oyunlar)
yerel değil, reklamlı, hikâyesiz. Fark: **yerellik + hiciv + saygılı tasarım** (reklam yok, takip yok,
çevrimdışı).

**En büyük 3 kaçırılmış fırsat:**
1. **Paylaşılabilir sonuç anı.** İK'da sonuç kartı var (`sen-iksin-sonuc-karti.png`); diğer oyunlarda paylaşılacak bir "an" zayıf. Bakkal'ın 30. günü ("Şükrü Amca döndü: kasa 2.340 ₺, itibar 82, köy seni sevdi") ya da Cüzdan'ın skoru, OG görselli bir sonuç kartıyla WhatsApp'ta yayılır. Altyapı (`ShareButton`, `oyun/<ad>/`) hazır.
2. **Mahalle dünyası** (bkz. §12): Oyunlar arası bağ, salonu menüden geri dönülen bir yere çevirir.
3. **Eğitim kullanımı.** `docs/egitmen-rehberi.md` var, ama sitede görünmüyor. İK ve Test oyunları İK eğitimleri ve üniversite dersleri için hazır vaka; "Eğitmenler için" sayfası düşük eforla yeni bir kitle açar.

**En çok fark yaratacak tek değişiklik:** Her oyuna **paylaşılabilir bir sonuç kartı** eklemek
(OG görseli + tek dokunuşla paylaşım). Bugünkü kitle büyümesinin tek kanalı ağızdan ağıza; bu kanalın
yakıtı da paylaşılabilir an.

---

## Yol haritası

### Bu hafta (toplam ≈1,5 gün)
| # | İş | Etki | Efor |
| --- | --- | --- | --- |
| 1 | Trafik "Oyna" kontrastı (`.app .cta { color }`) | A11y AA, birincil eylem okunur | 5 dk |
| 2 | Mobil İK: engeli girişte göster, "Salona dön" + "Bağlantıyı kopyala" | Mobil çıkmaz sokak kalkar | 2 sa |
| 3 | Oyun başına hata sınırı + parça yükleme hatası metni | Yanlış "İK SİSTEMİ" ekranı kalkar, yeni sürümde kayıp oyuncu azalır | 3 sa |
| 4 | `robots.txt` + derlemede `sitemap.xml` | SEO hatası kalkar | 1 sa |
| 5 | Kepenk `aria-label`, logo erişilebilir adı, gizli `h1`'ler | Lighthouse a11y 94 → 100 (oyunlar) | 1 sa |
| 6 | Playwright duman testi CI'a (9 route × 2 boyut, konsol hatası = başarısız) | UI hataları CI'da yakalanır | 3 sa |

### Bu ay
| # | İş | Etki | Efor |
| --- | --- | --- | --- |
| 7 | Maket görseli `srcset`, gece görselini koşullu yükle, kritik CSS'i göm | Mobil LCP 4,1 → ~2,6 s, Lighthouse 80 → 90+ | 1 gün |
| 8 | İlk açılış paketinden ses motoru/panelleri ayır | Bütçede 8–15 KB pay | 0,5 gün |
| 9 | Ortak "kabuk": tek geri düğmesi ("← Salona dön"), ses/ayar, bilinmeyen adres şeridi | Tutarlılık, ilk kez gelen oyuncunun güveni | 2 gün |
| 10 | Dokunma hedefleri ≥44 px, safe-area | Mobil kullanılabilirlik | 0,5 gün |
| 11 | `hash`/`rng`/renk yardımcılarını `shared/lib`'e topla | Kopya kod kalkar | 2 sa |
| 12 | Hata ekranına "GitHub'da bildir" bağlantısı | Hatalardan haberdar olunur, gizlilik bozulmaz | 2 sa |
| 13 | Kapsamı bütün dosyalar üzerinden ölç; `axe` testleri | Dürüst kalite ölçüsü | 0,5 gün |

### Sonraki aşama
| # | İş | Etki | Efor |
| --- | --- | --- | --- |
| 14 | Paylaşılabilir sonuç kartları (Bakkal, Trafik, Cüzdan, Yama) | Büyümenin ana kanalı | 1 hafta |
| 15 | Mahalle dünyası: bitirilen oyun maketi değiştirir, çapraz göndermeler, haber bandı | Geri dönüş sebebi, ürün kimliği | 1–2 hafta |
| 16 | İK'yı `src/games/ise-alim/`'e taşı, `shared/` katmanı, import yönü lint kuralı | 10x büyümeye hazırlık | 1 gün |
| 17 | Bakkal hook'unu reducer'a böl; aynı kalıbı yeni oyun şablonu yap | Bakım, test edilebilirlik | 2 gün |
| 18 | `tsc` proje referansları + CI önbelleği | Derleme 28 s → ~8 s (tahmin) | 0,5 gün |
| 19 | "Eğitmenler için" sayfası | Yeni kitle (eğitim) | 1 gün |
| 20 | Güvenlik başlıkları için Cloudflare Pages'e geçiş (ya da çerçeve kırma) | Clickjacking koruması gerçekten çalışır | 2 sa |

---

### Ek: Ekran görüntüleri

`docs/analiz/` (WebP):

- Her route × 3 genişlik: `{salon,ise-alim,test,insaat,bakkal,ekran,meydan,asfalt,trafik,cuzdan}-{375,768,1440}.webp`, ayrıca `olmayan-sayfa-375.webp`.
- QA: `qa-ik-mobil.webp` (Q1), `qa-hata-ekrani.webp` (Q2'nin görünümü), `qa-klavye-odak.webp` (odak göstergesi), `qa-yavas-ag.webp` (400 kbps'te salon).

**Görsellerin yorumu:**
- **375 px:** Salon maket yerine oyun çiplerine dönüyor; iyi bir mobil uyarlama, ama çipler küçük. Ekran, Meydan, Yama ve Trafik dar ekranda düzgün. Cüzdan'ın BIOS satırları kesik. İK önce davet edip sonra engelliyor. İnşaat'ta HUD küçük kalıyor, ekranın çoğu gökyüzü.
- **768 px:** En dengeli boyut. Test, Ekran ve Meydan iki sütuna geçiyor. Bakkal kepenginin üstündeki "KASM" damgası raya biniyor.
- **1440 px:** Salon kusursuz. Oyunlar geniş ekranda iyi oturuyor; Meydan'ın seçim kartları sağda boşluk bırakıyor (4 kart, 3+1 diziliyor).
