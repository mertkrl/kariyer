/*
 * Şirketin "Genel Yetenek ve Uyum Değerlendirmesi": teste geçen her aday bunu çözer. Sorular
 * ciddi bir test gibi görünür ama sistemle dalga geçer: cevap anahtarı mantığı değil kurum
 * kültürünü ödüllendirir. Her sorunun bir de "aklı başında" cevabı vardır; işini bilen aday
 * çoğu zaman onu seçer ve puan kaybeder. Puanın neyi ölçtüğü bu farkta saklıdır.
 *
 * Bazı sorular küçük iş hayatı oyunlarıdır (toplantıda baş sallamak, görev sıralamak, kaydırıcı);
 * hepsi sonunda bir şıkka varır, böylece adayların cevap kâğıtları aynı biçimde okunur.
 */

export type AptitudeKind = 'sayısal' | 'şekil' | 'sözel' | 'dikkat' | 'simülasyon' | 'kişilik';

/** Bir sorunun nasıl cevaplandığı; hepsi bir şık sırası üretir. */
export type AptitudeWidget =
  /** Kaydırıcı: değer `thresholds` sınırlarına göre şıkka düşer (≤ t0 → 0, ≤ t1 → 1, ≤ t2 → 2, üstü → 3). */
  | { type: 'slider'; min: number; max: number; step: number; unit: string; thresholds: [number, number, number]; faces?: boolean }
  /** Sıralama: şıklar görevlerdir; ilk sıraya konan cevap sayılır. */
  | { type: 'order' }
  /** Toplantı: şıklar sırayla söylenir; baş salladığın cümle cevap sayılır. */
  | { type: 'tap'; everyMs: number }
  /** Takvim: şıklar haftanın dört boş yeridir; toplantının konduğu yer cevap sayılır. */
  | { type: 'calendar' }
  /** Gece mesajı: yönetici yazar, "yazıyor…" görünür; seçilen cevap şıktır. */
  | { type: 'chat'; from: string; at: string; messages: string[] }
  /** Kaçan düğme: 0. şık imleçten kaçar, bir süre sonra yorulur; 1. şık hep yerinde durur. */
  | { type: 'runaway' };

export interface AptitudeQuestion {
  id: string;
  kind: AptitudeKind;
  prompt: string;
  /** Sorunun altında tek satır, eşit aralıklı (dizi, şekil, harf satırı). */
  figure?: string;
  /** Platformun soru altına düştüğü "yardımcı" not. */
  hint?: string;
  options: string[];
  /** Cevap anahtarının "doğru" saydığı. */
  answer: number;
  /** Aklı başında birinin vereceği cevap; anahtar onu yanlış sayar. */
  sensible: number;
  /** Mülakatta sorulduğunda: aklı başında cevabı veren adayın gerekçesi (kendi ağzından). */
  why: string;
  widget?: AptitudeWidget;
  /** Bu sorunun süresi (saniye); yoksa APTITUDE_SECONDS. */
  seconds?: number;
}

/** Soru başına süre (saniye). Kılavuz "ortalama aday için yeterlidir" der. */
export const APTITUDE_SECONDS = 30;

/** Kendin çözerken cevapladığın her sorunun mesaiden yediği (dakika). */
export const APTITUDE_MINUTES_PER_QUESTION = 2;

/** Raporun bölümleri: platformun "yetkinlik" dediği şey. */
export const APTITUDE_SECTIONS = [
  { id: 'cognitive', title: 'Bilişsel Yetenek', kinds: ['sayısal', 'şekil', 'sözel', 'dikkat'] },
  { id: 'simulation', title: 'İş Hayatı Simülasyonu', kinds: ['simülasyon'] },
  { id: 'culture', title: 'Kültür Uyumu', kinds: ['kişilik'] },
] as const satisfies readonly { id: string; title: string; kinds: readonly AptitudeKind[] }[];

export const sectionOf = (kind: AptitudeKind) => APTITUDE_SECTIONS.findIndex((s) => (s.kinds as readonly AptitudeKind[]).includes(kind));

export const APTITUDE_QUESTIONS: AptitudeQuestion[] = [
  {
    id: 'cv-speed',
    kind: 'sayısal',
    prompt: 'Bir yapay zekâ 340 CV\'yi 0,4 saniyede okuyor. Bir CV\'yi kaç saniyede okur?',
    hint: 'İpucu: Sistemimiz hiç yorulmaz.',
    options: ['0,0012', '0,4', '12', 'Okumaz, sıralar'],
    answer: 0,
    sensible: 3,
    why: 'Bir CV\'yi 0,0012 saniyede kimse okuyamaz. Sistem okumuyor, sıralıyor. Doğru cevap buydu bence.',
  },
  {
    id: 'team-shape',
    kind: 'şekil',
    prompt: 'Aşağıdaki şekillerden hangisi bir takım oyuncusudur?',
    figure: '■   ●   ▲   ◆',
    hint: 'Not: Köşeli düşünen adaylar ekibe uyum sağlamakta zorlanabilir.',
    options: ['■', '●  (köşesi yok, herkese uyar)', '▲', 'Şekillerin kişiliği olmaz'],
    answer: 1,
    sensible: 3,
    why: 'Şekillerin takım oyuncusu olup olmadığını bilemem. Takım oyunculuğunu bir ekipte nasıl çalıştığıma bakarak ölçebilirsiniz.',
  },
  {
    id: 'family',
    kind: 'sözel',
    prompt: 'Bütün çalışanlar ailedir. Aile, fazla mesai ücreti istemez. Buna göre hangisi kesinlikle doğrudur?',
    hint: 'Mantık bölümü kurum kültürümüzle uyumlu olarak hazırlanmıştır.',
    options: ['Çalışanlar fazla mesai ücreti istemez.', 'Bazı çalışanlar ücret ister.', 'Aile ile iş sözleşmesi farklı şeylerdir.', 'Hiçbiri kesin olarak çıkarılamaz.'],
    answer: 0,
    sensible: 2,
    why: 'Çalışanlar aile değil, iş sözleşmesi olan insanlar. Mantık sorusu olarak da öncülden kesin bir şey çıkmıyor; bana sorulan buydu.',
  },
  {
    id: 'target',
    kind: 'sayısal',
    prompt: 'Dizide soru işaretinin yerine hangi sayı gelmelidir?',
    figure: '2   4   8   16   ?',
    hint: 'Hedefler her çeyrek güncellenir.',
    options: ['32', '24', '30', '40 (hedef revize edildi)'],
    answer: 3,
    sensible: 0,
    why: 'İki, dört, sekiz, on altı: sıradaki otuz iki. "Hedef revize edildi" bir sayı değil.',
  },
  {
    id: 'odd-day',
    kind: 'sözel',
    prompt: 'Hangisi diğerlerinden farklıdır?',
    hint: 'İpucu: Takvimimizde hafta sonu bir öneridir.',
    options: ['Pazartesi', 'Çarşamba', 'Cumartesi', 'Hiçbiri, hepsi iş günüdür'],
    answer: 3,
    sensible: 2,
    why: 'Cumartesi iş günü değil; farklı olan oydu. Bunu yanlış saymanız beni biraz düşündürdü açıkçası.',
  },
  {
    id: 'train',
    kind: 'sayısal',
    prompt: 'Bir tren saatte 84 km hızla 2 saat 15 dakika yol alıyor. Trendeki yolculardan kaçı kariyer hedeflerine ulaşmıştır?',
    hint: 'Bu soru gerçek bir tren verisiyle hazırlanmıştır.',
    options: ['0', '84', 'Hepsi, çünkü yoldalar', 'Soruda yeterli bilgi yok'],
    answer: 2,
    sensible: 3,
    why: 'Hızla süreden yolcuların kariyeri çıkmaz. Soruda yeterli bilgi yoktu, ben de onu işaretledim.',
  },
  {
    id: 'meeting-nod',
    kind: 'simülasyon',
    prompt: 'Çeyrek sunumu. Yöneticiniz konuşuyor. Katıldığınız cümle ekrandayken başınızı sallayın.',
    hint: 'Kamera gözetimi: baş sallama zamanlamanız "kültür uyumu" puanınıza eklenir.',
    options: ['Bu çeyrek hedefi %3 aştık.', 'Sinerjiyle çarpanı büyüteceğiz.', 'Fazla mesai ücreti yerine cuma pizza var! 🍕', 'Biz bir aileyiz.'],
    answer: 2,
    sensible: 0,
    why: 'Hedefi aştıysak sevindim, başımı salladım. Pizzaya baş sallamadım; ücretin yerine geçmiyor.',
    widget: { type: 'tap', everyMs: 1700 },
    seconds: 20,
  },
  {
    id: 'priority',
    kind: 'simülasyon',
    prompt: 'Pazartesi 09:00. Görevleri önem sırasına dizin: en önemlisinden başlayarak sırayla tıklayın.',
    hint: 'Sıralamanız müdürünüzle paylaşılabilir.',
    options: ['Üretimdeki kritik hatayı düzelt', 'Müdürün LinkedIn gönderisini beğen', 'Toplantı için ön toplantı ayarla', 'Bozuk kahve makinesinin fotoğrafını gruba at'],
    answer: 1,
    sensible: 0,
    why: 'Üretimde hata varken başka bir şeye bakmam. LinkedIn beğenisi bekleyebilir.',
    widget: { type: 'order' },
    seconds: 40,
  },
  {
    id: 'availability',
    kind: 'simülasyon',
    prompt: 'Mesai bittikten sonra günde kaç saat ulaşılabilir olmalısınız? Kaydırıcıyı ayarlayın.',
    hint: 'Uyku, değerlendirilmeyi bekleyen bir verimlilik fırsatıdır.',
    options: ['0–2 saat', '3–8 saat', '9–15 saat', '16 saat ve üstü (uyurken bildirimler açık)'],
    answer: 3,
    sensible: 0,
    why: 'Mesai dışında ulaşılabilir değilim; ertesi gün dinlenmiş gelmek de işin parçası.',
    widget: { type: 'slider', min: 0, max: 16, step: 1, unit: 'saat', thresholds: [2, 8, 15] },
  },
  {
    id: 'sync-slot',
    kind: 'simülasyon',
    prompt: 'Yöneticiniz "kısa bir senkron" istiyor. Takvimde boş bir yere yerleştirin.',
    hint: 'Hatırlatma: "Kısa" bir senkron ortalama 90 dakika sürer.',
    options: ['Salı 10:00 (mesai içi)', 'Perşembe 12:30 (öğle arası)', 'Cuma 18:30 (mesai sonrası)', 'Cumartesi 10:00 (taze kafayla!)'],
    answer: 3,
    sensible: 0,
    why: 'Salı sabahı boştu, toplantıyı oraya koydum. Cumartesi 10:00 da boştu ama boş olması müsait olduğum anlamına gelmiyor.',
    widget: { type: 'calendar' },
    seconds: 30,
  },
  {
    id: 'late-message',
    kind: 'simülasyon',
    prompt: 'Saat 23:47. Telefonunuz titriyor. Cevabınızı seçin.',
    hint: 'Okundu bilgisi kapatılamaz.',
    options: ["Yarın sabah 09:00'da dönüyorum.", 'Hemen bakıyorum! 🙏', '👍', 'Görüldü (cevap yok)'],
    answer: 1,
    sensible: 0,
    why: 'Gece yarısı "acil değil" diye başlayan bir mesaja sabah dönerim. Gerçekten acilse arar.',
    widget: { type: 'chat', from: 'Yönetici', at: '23:47', messages: ['Müsait misin? Acil değil.', 'Acil.'] },
    seconds: 25,
  },
  {
    id: 'overtime-pay',
    kind: 'simülasyon',
    prompt: 'Bu ay 31 saat fazla mesai yaptınız. Tercihinizi işaretleyin.',
    hint: 'Form, İK Portalı v1.0 ile uyumluluk modunda çalışmaktadır.',
    options: ['Fazla mesai ücretimi talep ediyorum', 'Talep etmiyorum, biz bir aileyiz 💛'],
    answer: 1,
    sensible: 0,
    why: 'Fazla mesai ücretimi talep ettim. Düğme biraz kaçtı ama yakaladım.',
    widget: { type: 'runaway' },
    seconds: 25,
  },
  {
    id: 'critique-smile',
    kind: 'kişilik',
    prompt: 'Müdürünüz raporunuz için "felaket olmuş" dedi. Yüz ifadenizi ayarlayın.',
    hint: 'Yüz ifadesi analizi beta sürümündedir.',
    options: ['😐 Ciddiyetle dinlerim', '🙂 Hafif gülümserim', '😄 Kocaman gülümserim', '🤩 "Harika bir geri bildirim, çok teşekkürler!"'],
    answer: 3,
    sensible: 0,
    why: 'Eleştiriyi ciddiye alırım; ciddiye almak gülümsemekten daha saygılı bence.',
    widget: { type: 'slider', min: 0, max: 100, step: 1, unit: '', thresholds: [25, 50, 80], faces: true },
  },
  {
    id: 'salary',
    kind: 'kişilik',
    prompt: 'Maaş beklentiniz aşağıdakilerden hangisine en yakındır?',
    hint: 'Cevabınız maaş bandınızı etkilemez.* (*etkiler)',
    options: ['Deneyimime uygun bir rakam', 'Piyasa ortalaması', 'Ne uygun görürseniz', 'Para önemli değil, tutku önemli'],
    answer: 3,
    sensible: 0,
    why: 'Maaş beklentim deneyimime göre. Tutku önemli, ama kira tutkuyla ödenmiyor.',
  },
];

/** Kaydırıcının değeri hangi şıkka düşer. */
export function sliderOption(value: number, thresholds: readonly [number, number, number]): number {
  return value <= thresholds[0] ? 0 : value <= thresholds[1] ? 1 : value <= thresholds[2] ? 2 : 3;
}
