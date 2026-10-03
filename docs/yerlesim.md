# Yerleşim stratejisi

Oyun tek bir masaüstü tasarımının küçültülmüş hali değil; ekranı üç tür sahne paylaşıyor ve her biri küçük ekrana farklı davranıyor. Bu belge hangisinin nasıl davrandığını ve yeni bir yerleşim düzeltmesinin nereye yazılacağını anlatır.

## Üç tür sahne

| Sahne | Ekranlar | Küçük ekranda |
| --- | --- | --- |
| **Sahne (ölçeklenen çizim)** | Masa, öğle arası odası | Bütün çizim tek parça ölçeklenir; çizimin içine yerleşim kuralı yazılmaz. Masa `useDeskCamera` (`stageScale`) ile ölçeklenir, telefon darlığında yanlar kırpılır ki nesneler pul gibi küçülmesin. Öğle arası bir SVG'dir (`preserveAspectRatio="xMidYMid meet"`), her zaman bütünüyle sığar. |
| **Uygulama (akışkan arayüz)** | Bilgisayar (portal, e-posta, takvim), telefon, toplantı | Gerçek arayüz gibi akar: sütunlar daralır, satırlar sıkışır. Kırılma noktaları ve çerçeve ölçüleri burada çalışır. |
| **Sayfa (belge)** | Karşılama, ilan, brifing, gün sonu, final, hafta sonu, oturum raporu | Dikey okunur; dar ekranda tek sütuna iner. Telefonda dik tutulabilir. |

Masa, bilgisayar ve toplantı yatay ekran için tasarlandı. Dik tutulan telefonda (dik ve 760px'ten dar) `RotateHint` ekranı kapatıp yan çevirmeyi ister; oyuncu "yine de dik devam et" diyebilir. Sayfalar dik ekranda da okunur.

## Ortak kırılma noktaları

Bütün stil dosyaları yalnızca bunları kullanır (`styles/layout.css`). `tests/layout.test.ts` başka bir değere izin vermez.

| Eksen | Değer | Anlamı |
| --- | --- | --- |
| Genişlik | ≤1240 | Orta ekran: üst çubuk sıkılaşır |
| | ≤1100 | Dar pencere: portalın sağ sütunu daralır |
| | ≤960 | Tablet ya da küçük dizüstü: iki sütunlu sayfalar teke iner, e-posta sütunları daralır |
| | ≤760 | Telefon: dik tutulursa yan çevirme ipucu |
| | ≤560 | Küçük telefon: sayfaların kenar boşlukları ve ızgaraları |
| Yükseklik | ≤820 | Kısa ekran (ör. 1366×657, 1280×720): oyunun çerçevesi incelir |
| | ≤520 | Çok kısa: yan çevrilmiş telefon; üst çubuk tek satır |

`min-width` sorgusu eşleşen `max-width`'ten bir piksel sonra başlar (`min-width: 961px`, `max-width: 960px`'in tersi).

**Ekran değil kutu:** bir bileşenin içi kendi genişliğine göre değişecekse (CV kartı dar bir tablette tek sütuna iner) `@container` kullanılır, `@media` değil. Kırılma noktaları ekranın çerçevesi içindir; container query'ler o çerçevenin içinde yaşayan kutular için. Test yalnızca `@media`'ya bakar.

**Çok kısa ekran (≤520):** yan çevrilmiş telefonda bir alan ikiye bölünemiyorsa sığdırmaya çalışmak yerine kaydırılır (CV kartı, toplantıdaki pano) ve asıl eylem görünür kalır (kararın düğmeleri kartın altına yapışık).

## Çerçeve ölçüleri

Birden fazla bileşenin aynı anda bilmesi gereken ölçüler yalnızca `styles/layout.css`'te tanımlanır ve kısa ekranda orada değişir. Bileşenler sayı yazmaz, değişkeni kullanır.

| Değişken | Ne | Normal | Kısa ekran |
| --- | --- | --- | --- |
| `--frame-topbar` | Oyunun üst çubuğu | 84px | 64px |
| `--pc-titlebar` | Bilgisayarda pencere başlığı | 34px | 28px |
| `--pc-taskbar` | Bilgisayarın görev çubuğu | 42px | 34px |
| `--pc-task` | Görev çubuğundaki düğme | 32px | 28px |
| `--pc-side` | Portalın sağ sütunu (bildirimler buna hizalanır) | 270px | ≤1100 genişlikte 232px |

Örneğin bilgisayardaki bildirim yığını görev çubuğunun hemen üstünde durur: `bottom: calc(var(--pc-taskbar) + 16px)`. Görev çubuğu kısa ekranda inceldiğinde yığın da onunla iner.

## Yeni bir yerleşim sorunu çıktığında

1. **Hangi sahne türü?** Masa ya da öğle arasıysa sorun ölçekte (`useDeskCamera`, SVG `viewBox`), CSS'te değil.
2. **Hangi ekranda görüldü?** Genişlik ve yüksekliği tabloya yerleştir. Düzeltme o kırılma noktasının altına yazılır; yeni bir sayı eklenmez.
3. **Ölçü başka bir bileşeni de etkiliyor mu?** Etkiliyorsa `layout.css`'e değişken olarak eklenir ve iki taraf da onu kullanır.
4. **Denetim:** en az şu boyutlarda bak: 1440×900, 1366×657, 1280×720, 1024×768, 844×390 (yan telefon), 390×844 (dik telefon, sayfalar).
5. Gerçekten yeni bir eşik gerekiyorsa önce bu belgeye ve `layout.css`'e, sonra teste eklenir; nedeni yazılır.
