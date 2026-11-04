# Veri ve (olası) backend

Bugün sunucu yok ve bu bir ürün kararı: oyunlar kurulumsuz, hesapsız, çevrimdışı çalışır ve
hiçbir veri dışarı gönderilmez (`tests/security.test.ts` "oyun ağ üzerinden hiçbir şey göndermez").
Bu belge bugünkü veri katmanını ve ileride bir sunucu gerekirse nasıl ekleneceğini anlatır.

## Bugün

| Ne | Nerede | Not |
| --- | --- | --- |
| Ağ isteği | yalnızca `src/shared/retry.ts` `fetchBytes` | Oyunun kendi ses/müzik dosyaları, aynı köken, GET |
| Yeniden deneme | `retrying()` | İki deneme, 1,5 s bekleme; başarısız ses önbellekten silinir, sonraki sahne yeniden dener |
| Çevrimdışı | `serviceWorker.ts` | Oyunun tamamı ilk açılışta; müzik ilk çalınışta saklanır |
| Kayıt | `src/shared/storage.ts` | Tek kapı; `kariyerweb-` öneki; sürüm göçü (`readChecked` + `legacy`) |
| Oyun sonucu | `src/arcade/progress.ts` `GameResult` | `{ result, at, score?, plays }`, defter sürümü `PROGRESS_VERSION` |
| Paylaşım | URL'de durum (`#/ekran?t=…`), `oyun/<ad>/` sayfaları | Sunucusuz |

## İleride bir sunucu gerekirse

Olası ihtiyaçlar: günün kavşağı için skor tablosu, paylaşılan Ekran tasarımlarının kısa bağlantısı,
eğitmen oturumlarının sınıf özeti. Hiçbiri bugünkü oyunlar için gerekli değil.

### İlkeler

1. **İsteğe bağlı.** Oyun sunucusuz çalışmaya devam eder; sunucu yoksa ya da erişilemezse yalnızca
   o özellik görünmez. Ağ hatası oyunu asla durdurmaz.
2. **Açık rıza ve anonimlik.** Gönderim yalnızca oyuncu "skorumu tabloya ekle" dediğinde olur;
   hesap yok, takma ad isteğe bağlı, IP saklanmaz. Gizlilik metni ve "Verilerimi sil" güncellenir.
3. **Tek alan adı.** CSP `connect-src` listesine yalnızca o alan eklenir (`csp.ts` ve
   `public/_headers` birlikte; test ikisini eşit tutar). `tests/security.test.ts`'teki ağ testi
   izin listesine yalnızca istemci modülü eklenir.
4. **Tek istemci modülü.** `src/shared/api.ts`: `fetch` yalnızca orada; `retrying()` ile; zaman aşımı
   (`AbortSignal.timeout(5000)`); yanıt şeması doğrulanır (kayıttaki `check` işlevleri gibi).
5. **Çevrimdışı önce.** Gönderilemeyen sonuç `storage.ts` ile bir kuyruğa yazılır, bağlantı gelince
   (`online` olayı) bir kez gönderilir; aynı sonuç iki kez sayılmasın diye istemcide üretilen bir
   kimlik (`crypto.randomUUID()`) taşır.

### Önerilen biçim

```ts
// POST /v1/results  (gövde: GameResult + oyun ve tohum)
interface ResultSubmission {
  id: string;            // crypto.randomUUID(): tekrar gönderim aynı kaydı üretmez
  game: GameRoute;       // 'trafik'
  seed?: number;         // günün kavşağı gibi herkesin aynı oynadığı bölüm
  result: string;        // GameResult.result (≤ 60)
  score: number;         // GameResult.score
  client: string;        // __APP_VERSION__
}
```

Sunucu tarafında: Cloudflare Worker + KV ya da D1 yeterli. Doğrulama sunucuda tekrarlanır (puan
aralığı, tohumun o güne ait olması), istek hızı IP başına sınırlanır, yanıt `Cache-Control` ile
60 sn önbelleğe alınır.

### Bugünden hazır olanlar

- Sonuç şeması tek (`GameResult`) ve sürümlü; Bakkal sayısal sonucu (`score`) yazıyor, diğer
  oyunlar `markPlayed(route, result, score)` ile ekleyebilir.
- Depo erişimi ve göç tek yerde; kuyruk için yeni bir anahtar yeterli.
- Ağ isteği tek yerde ve yeniden denemeli; güvenlik testi yeni bir ağ çağrısını yakalar.
