# Oyun Mekaniği Tasarımı

## 1. Temel Döngü (Core Loop)

```
GÜN BAŞLA → (Günün Kuralı/Kuralları göster) → CV Kuyruğu İşlenir → GÜN SONU ÖZETİ → Sonraki gün
```

Bir "gün" = 5-8 vaka. Toplam oyun = 5-6 gün (~30 dk hedefine uyar: gün başına ~4-5 dk).

### Vaka işleme akışı (her CV için):
1. CV kartı ekrana gelir (isim, yaş, deneyim, maaş beklentisi, kısa not/foto placeholder)
2. Oyuncu CV'yi inceler (bazı detaylar "gizli" olabilir, tıklayıp açman gerekir — CV'yi gerçekten okuma davranışını simüle eder)
3. Günün kuralına göre karar: **ONAYLA / REDDET** (bazı vakalarda üçüncü seçenek: **BEKLET**)
4. Anlık kısa animasyon + ses (komik katman)
5. Karar kaydedilir → puan/zaman etkisi uygulanır
6. Bazı kararlarda **gecikmeli sonuç** tetiklenir (o gün değil, 1-3 gün sonra geri gelir)

---

## 2. Zaman Baskısı — KARAR: Kapasite Sınırı

- Süre sayacı yok. Bunun yerine her gün **sabit bir kapasite** var: "Bugün en fazla N CV'ye bakabilirsin." Kuyrukta bundan fazlası varsa geri kalanı **otomatik-red** olur (bu, gün sonu özetinde ayrı bir kalem: "M CV hiç açılmadan otomatik elendi").
- Oyuncu kuyruktan **hangi CV'lere bakacağını kendi seçer** (kuyruk bir liste olarak görünür, tıklayıp açıyor) — bu da gerçek İK'nın yaptığı önceliklendirme/rastgele elemeyi simüle eder.
- CV detayını açmak "gün bütçesinden" görünmez bir maliyet düşer (ör. her açılan CV kapasiteden 1 hak tüketir) — böylece oyuncu "bu CV'ye bakmaya değer mi" diye seçim yapmak zorunda kalır, panik yaratan bir sayaç olmadan zaman baskısı hissedilir.
- Gün ilerledikçe kapasite düşebilir (kuyruk büyür, kapasite sabit/azalır) — bu da sisteme yetişememe hissini artırır.

---

## 3. Kural Sistemi (Rule Engine)

Her gün 1-3 "resmi kural" verilir (İK müdüründen not olarak). Kurallar:
- **Açık kurallar:** "Min 5 yıl deneyim", "ATS skoru %60 altı red" — objektif, oyuncu doğru/yanlış uygulayabilir.
- **Örtük/gri kurallar:** "Genç ve dinamik ekip" gibi yazılı olmayan ama "fısıldanan" kurallar — oyuncunun yorumuna kalıyor, bu da ahlaki gerilim yaratıyor.
- **Çelişkili kurallar (ileri günlerde):** Aynı gün içinde "deneyimli olsun" + "maaş beklentisi düşük olsun" gibi birbirini dışlayan kurallar — oyuncu hangi kurala öncelik vereceğini seçmek zorunda kalır.

Kurallara **uyup uymama tamamen oyuncunun elinde** — sistem seni zorlamıyor, ama:
- Kurala uymazsan → "Performans Skoru" düşer (İK müdüründen uyarı gelir, ileri günlerde işten çıkarılma riski/oyun sonu tehdidi olabilir — bu da oyuncuyu sistemin bir parçası olmaya *iten* baskıyı simüle eder)
- Kurala uyarsan → Skor yükselir ama "Vicdan/Empati" göstergesi (ikinci bir gizli metrik) düşer

---

## 4. Çift Metrik Sistemi (Skor Tasarımının Kalbi)

İki paralel skor tutulur, oyuncuya açıkça gösterilir (ölçek 0-100):

| Metrik | Ne ölçer | Nasıl değişir |
|---|---|---|
| **Performans** | Şirketin seni ne kadar "iyi çalışan" gördüğü | Kurallara uyum, hız, kuyruğu boşaltma |
| **Vicdan** | Adaylara ne kadar adil/insani davrandığın | Kurala rağmen doğru olanı yapma, CV'yi gerçekten okuma, itiraz etme seçeneğini kullanma |

**Bu ikili sistem oyunun ahlaki gerilimini mekanikleştirir** — Papers Please'deki "aile vs. kurallar" gerginliğinin karşılığı burada "iş güvencen vs. vicdanın" oluyor.

- Performans çok düşerse: Gün 3-4 civarı "İK Müdürü" seni uyarır, düşmeye devam ederse oyun erken biter (kovulma sonu).
- Vicdan çok düşerse: Oyun bitmez ama **final ekranında** bu yansır (bkz. Bölüm 6 - Sonlar).
- İkisi de bir arada yüksek tutulamaz — bu **kasıtlı**: oyuncuya "sistemde tamamen adil kalman neredeyse imkansız" mesajını oynanış üzerinden veriyor.

---

## 5. Gecikmeli Sonuç Mekaniği (Callback System)

Papers Please'in en güçlü yanı kararların geri dönmesiydi. Burada:

- Her karar, arka planda bir "aday dosyası" olarak saklanır.
- Rastgele/seçili bazı adaylar **1-3 gün sonra** geri döner:
  - Gün sonu özetinde tek satır not olarak ("Ahmet bugün 47. reddini aldı")
  - Ya da bir sonraki günün başında kısa bir "flash" kart olarak (aday sosyal medyada paylaşım yapmış, ya da tam tersi işe girmiş başka yerde ve başarılı olmuş)
- Bazı geri dönüşler oyuncunun kararını **sorgulatır**: reddettiğin biri aslında ideal biri çıkmış, onayladığın biri de sistemin öngördüğü gibi olmamış (dengeyi kurmak için — "her zaman sistem haksız" demiyoruz, gerçekçi kalıyoruz).

Teknik olarak: her vaka bir `id` + `decision` + `revealDay` (kaç gün sonra sonuç açılacak) ile bir kuyrukta tutulur, ilgili günde tetiklenir.

---

## 6. Sonlar (Ending Variations)

Oyun sonunda (gün 5-6 bitince) final ekranı **iki skora göre** değişir:

1. **Yüksek Performans + Düşük Vicdan:** "Sen artık sistemin mükemmel bir parçasısın." (rahatsız edici, ironik övgü tonunda) + istatistik: kaç kişinin hayatını nasıl etkilediğin
2. **Düşük Performans + Yüksek Vicdan:** "İşten çıkarıldın. Ama 12 kişi senin yüzünden ikinci bir şans buldu." (oyuncu kaybetmiş gibi hissetmez, anlamlı bir kayıp)
3. **Orta/Dengeli:** "Sistemde kaldın, tam olarak uyum sağlamadın. Bazı geceler uyuyamadın." — en gerçekçi/yaygın son
4. **Gizli/Nadiren:** Oyuncu belirli bir eşiği geçerse (çok yüksek vicdan + belirli "itiraz et" aksiyonlarını kullanmışsa) → "İstifa ettin ve bu deneyimi anlatan bir yazı yazdın" (meta-referans: tam da oyuncunun şu an oynadığı oyunun kendisine gönderme)

Son ekranında ayrıca **toplam oyun istatistiği** (tüm günler toplamı):
- Kaç CV işlendi / kaç tanesi hiç açılmadan elendi
- Ortalama karar süresi
- "Gerçek Türkiye" karşılaştırma notu (ör. "Gerçek hayatta iş başvurularının %X'i hiçbir geri bildirim almaz" gibi kaynak gösterilebilir bir istatistik — burada gerçek veri kullanmak farkındalık amacını güçlendirir)

---

## 7. Ekran / UI Bileşenleri (Yüksek Seviye)

- **Üst bar:** Gün sayacı, kalan süre/kapasite, Performans & Vicdan göstergeleri (iki ayrı bar, renkli)
- **Orta alan:** CV kartı (genişletilebilir detaylar), İK Sistemi mesaj balonu (komik karakter/robot)
- **Alt aksiyon barı:** ONAYLA / REDDET / (bazen) BEKLET
- **Geçiş ekranı (kararlar arası):** kısa animasyon + olası "flash sonuç" kartı
- **Gün sonu ekranı:** ton değişimi (griye dönen sade tasarım), istatistik listesi
- **Final ekranı:** skor bazlı son metni + toplam istatistik + paylaşılabilir kart (sosyal medyada paylaşım için görsel — bu viral yayılım için kritik)

---

## 8. Teknik Basit Mimari Önerisi

- **State machine** tek bir JS objesi/store ile: `gameState = { day, queueIndex, performans, vicdan, decisions: [], pendingCallbacks: [] }`
- Vaka verisi (vakalar.md içeriği) **JSON'a dönüştürülüp** data-driven ilerlenir — her vaka: `{id, day, candidate, rule, presentation, decisionOutcomes: {onayla: {...}, reddet: {...}}, revealDay}`
- Basit **React + local state** (veya vanilla JS + tek HTML dosyası) yeterli, backend gerekmez — tüm oyun tek oturumluk, kayıt gerekmiyor (belki localStorage ile "kaldığın yerden devam" opsiyonel)
- Animasyonlar: CSS transition + basit sprite/emoji tabanlı, ağır illüstrasyon gerekmez (hız/scope için önemli)

---

## Kesinleşen Kararlar

1. **Zaman baskısı:** Kapasite sınırı (sayaç yok). Gün başına sabit CV hakkı, CV açmak haktan düşer, kuyrukta kalan otomatik-red olur.
2. **İtiraz Et:** Kaldırıldı — sadece ONAYLA / REDDET / (bazen) BEKLET.
3. **Gecikmeli sonuçlar:** Tamamen scriptli — her vaka için sabit, önceden yazılmış sonuç metni. Rastgelelik yok.
