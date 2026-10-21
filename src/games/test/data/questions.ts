/*
 * Genel Yetenek ve Uyum Testi'nin soruları. Bu oyunun kendi verisidir; İşe Alım Haftası'ndaki
 * Assessa testiyle bağı yoktur. Sorular ciddi bir test gibi görünür ama sistemle dalga geçer:
 * cevap anahtarı mantığı değil kurum kültürünü ödüllendirir. Her sorunun bir de "aklı başında"
 * cevabı vardır; oyuncu onu seçerse şirket puanı düşer, sağduyu puanı yükselir.
 *
 * Bazı sorular küçük iş hayatı oyunlarıdır (toplantıda baş sallamak, görev sıralamak, kaydırıcı);
 * hepsi sonunda bir şıkka varır.
 */

import { GENERAL_QUESTIONS } from './generalQuestions';
import { MORE_QUESTIONS } from './moreQuestions';
import { CULTURE_QUESTIONS } from './cultureQuestions';

export type ExamKind = 'sayısal' | 'şekil' | 'sözel' | 'dikkat' | 'simülasyon' | 'kişilik' | 'genel kültür';

/** Bir sorunun nasıl cevaplandığı; hepsi bir şık sırası üretir. */
export type ExamWidget =
  /** Kaydırıcı: değer `thresholds` sınırlarına göre şıkka düşer (≤ t0 → 0, ≤ t1 → 1, ≤ t2 → 2, üstü → 3). */
  | {
      type: 'slider';
      min: number;
      max: number;
      step: number;
      unit: string;
      thresholds: [number, number, number];
      faces?: boolean;
    }
  /** Sıralama: şıklar görevlerdir; ilk sıraya konan cevap sayılır. */
  | { type: 'order' }
  /**
   * Ekran paylaşımı: toplantıya katılınca geri sayım başlar; süre bitene kadar kapatılmayan sekmeler
   * herkese görünür. Açık kalanlara göre şık seçilir (screenshareOption).
   */
  | { type: 'screenshare'; seconds: number; tabs: ScreenTab[] }
  /** Görüntülü görüşme: her şık bir sanal arka plandır; seçip "Toplantıya katıl"a basınca cevap olur. */
  | { type: 'background' }
  /**
   * Takvim daveti: 0 kabul, 1 belki, 2 gerekçe yazıp reddet, 3 reddetmekten vazgeç. Reddetmek
   * `minChars` karakterlik gerekçe ister; "kurumsal gerekçe üret" düğmesi onu doldurur.
   */
  | { type: 'invite'; from: string; title: string; when: string; minChars: number }
  /** Öğle siparişi: yemek seçilir, sonra nerede yeneceği (her şık bir teslimat seçeneğidir). */
  | { type: 'lunch'; clock: string }
  /** Excel'de zam: oyuncu oranı yazar; değer `thresholds`e göre şıkka düşer, hücre sonra %3'e kilitlenir. */
  | { type: 'raise'; salary: number; locked: number; thresholds: [number, number, number] }
  /** Evrak damgalama: süre içinde her evraka ONAY ya da RET; sonuç stampOption ile şıkka düşer. */
  | { type: 'stamp'; seconds: number; docs: StampDoc[] }
  /** Termostat: derece `thresholds`e göre şıkka düşer; her derecede ofisten bir yorum gelir. */
  | { type: 'thermostat'; min: number; max: number; start: number; thresholds: [number, number, number] }
  /** Çıkış turnikesi: kart okutulur, "erken çıkış" uyarısı gelir; her şık bir harekettir. */
  | { type: 'turnstile'; clock: string }
  /** Emoji tepkisi: son şık hariç her şık bir emojidir; son şık "tepki vermeden geç". */
  | { type: 'reaction'; from: string; at: string; message: string; counts: number[] }
  /** Arama geçmişi: son şık hariç her şık bir aramadır (saatleriyle); son şık "hiçbiri" düğmesidir. */
  | { type: 'history'; times: string[] }
  /** Toplantı: şıklar sırayla söylenir; baş salladığın cümle cevap sayılır. */
  | { type: 'tap'; everyMs: number }
  /** Takvim: şıklar haftanın dört boş yeridir; toplantının konduğu yer cevap sayılır. */
  | { type: 'calendar' }
  /** Gece mesajı: yönetici yazar, "yazıyor…" görünür; seçilen cevap şıktır. */
  | { type: 'chat'; from: string; at: string; messages: string[] }
  /** Kaçan düğme: 0. şık imleçten kaçar, bir süre sonra yorulur; 1. şık hep yerinde durur. */
  | { type: 'runaway' };

export interface ExamQuestion {
  id: string;
  kind: ExamKind;
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
  /** Sonuç ekranında: aklı başında cevabı veren birinin gerekçesi (kendi ağzından). */
  why: string;
  widget?: ExamWidget;
  /** Bu sorunun süresi (saniye); yoksa EXAM_SECONDS. */
  seconds?: number;
}

/** Soru başına süre (saniye). Kılavuz "ortalama aday için yeterlidir" der. */
export const EXAM_SECONDS = 30;

/** Raporun bölümleri: platformun "yetkinlik" dediği şey. */
export const EXAM_SECTIONS = [
  {
    id: 'cognitive',
    title: 'Bilişsel Yetenek',
    kinds: ['sayısal', 'şekil', 'sözel', 'dikkat'],
  },
  { id: 'simulation', title: 'İş Hayatı Simülasyonu', kinds: ['simülasyon'] },
  { id: 'culture', title: 'Kültür Uyumu', kinds: ['kişilik'] },
  { id: 'general', title: 'Genel Kültür', kinds: ['genel kültür'] },
] as const satisfies readonly {
  id: string;
  title: string;
  kinds: readonly ExamKind[];
}[];

export const sectionOf = (kind: ExamKind) => EXAM_SECTIONS.findIndex((s) => (s.kinds as readonly ExamKind[]).includes(kind));

export const EXAM_QUESTIONS: ExamQuestion[] = [
  {
    id: 'cv-speed',
    kind: 'sayısal',
    prompt: "Bir yapay zekâ 340 CV'yi 0,4 saniyede okuyor. Bir CV'yi kaç saniyede okur?",
    hint: 'İpucu: Sistemimiz hiç yorulmaz.',
    options: ['0,0012', '0,4', '12', 'Okumaz, sıralar'],
    answer: 0,
    sensible: 3,
    why: "Bir CV'yi 0,0012 saniyede kimse okuyamaz. Sistem okumuyor, sıralıyor. Doğru cevap buydu bence.",
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
    widget: {
      type: 'slider',
      min: 0,
      max: 16,
      step: 1,
      unit: 'saat',
      thresholds: [2, 8, 15],
    },
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
    widget: {
      type: 'chat',
      from: 'Yönetici',
      at: '23:47',
      messages: ['Müsait misin? Acil değil.', 'Acil.'],
    },
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
    widget: {
      type: 'slider',
      min: 0,
      max: 100,
      step: 1,
      unit: '',
      thresholds: [25, 50, 80],
      faces: true,
    },
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
  // ── sonradan eklenenler: bilişsel ve kültür bölümleri de birer küçük oyun olsun ──
  {
    id: 'inbox-urgent',
    kind: 'dikkat',
    prompt: 'Gelen kutunuz akıyor. Gerçekten acil olan e-posta ekrandayken tıklayın.',
    hint: 'Konu satırında "ACİL" yazan her şey aciliyet derecesine göre sıralanmıştır.',
    options: ['ACİL: Kahve makinesi yine bozuk', 'Haftalık bülten (4. sayı)', 'ACİL!!: Genel Müdürün kedisinin veteriner randevusu', 'Bordro hatası: maaşlar yatmadı (önem: düşük)'],
    answer: 2,
    sensible: 3,
    why: 'Maaşlar yatmamışsa en acili o. Konu satırında "düşük" yazması bir şeyi değiştirmiyor.',
    widget: { type: 'tap', everyMs: 1600 },
    seconds: 20,
  },
  {
    id: 'layoff-math',
    kind: 'sayısal',
    prompt: '5 kişilik bir ekip bir projeyi 10 günde bitiriyor. Verimlilik çalışması sonucu 2 kişi ayrıldı. Proje kaç günde biter? Kaydırıcıyı ayarlayın.',
    hint: 'Teslim tarihi değişmemiştir.',
    options: ['5 gün veya daha az (motivasyon arttı)', '6–10 gün (teslim tarihi aynı)', '11–16 gün', '17 gün ve üstü'],
    answer: 1,
    sensible: 3,
    why: 'Üç kişiyle aynı iş on yedi günü bulur. Teslim tarihinin değişmemesi matematiği değiştirmiyor.',
    widget: {
      type: 'slider',
      min: 0,
      max: 30,
      step: 1,
      unit: 'gün',
      thresholds: [5, 10, 16],
    },
    seconds: 35,
  },
  {
    id: 'org-chart',
    kind: 'şekil',
    prompt: 'Organizasyon şemasını en tepeden başlayarak sıralayın.',
    hint: 'Şemamız düz bir yapıdadır.* (*bazıları daha düzdür)',
    options: ['Müşteri', 'Çalışan', 'Genel Müdür', 'Genel Müdürün köpeği Paşa 🐕'],
    answer: 3,
    sensible: 0,
    why: 'Şirket müşteri için var; şemanın tepesine onu koydum. Paşa da çok tatlı ama karar vermiyor.',
    widget: { type: 'order' },
    seconds: 35,
  },
  {
    id: 'birthday',
    kind: 'kişilik',
    prompt: "Bugün doğum gününüz. İK'dan mesaj geldi. Cevabınızı seçin.",
    hint: 'Doğum günü izni bir sonraki doğum gününüze devredilir.',
    options: ["Teşekkürler! Bugün 18:00'de çıkıyorum, akşam planım var.", 'Tabii ki kalırım, ne demek', 'Yemek kartıma yüklerseniz kalırım', '👍'],
    answer: 1,
    sensible: 0,
    why: 'Doğum günümde mesaimi tamamlayıp çıkarım. Bunu açıkça söylemek de iletişimin parçası.',
    widget: {
      type: 'chat',
      from: 'İnsan Kaynakları',
      at: '17:52',
      messages: ['İyi ki doğdun! 🎉', "Bu arada bugün 21:00'e kadar kalabilir misin?"],
    },
    seconds: 25,
  },
  {
    id: 'raise-face',
    kind: 'kişilik',
    prompt: 'Maaşınıza %3 zam yapıldı. Yıllık enflasyon %45. Yüz ifadenizi ayarlayın.',
    hint: 'Minnettarlık, yetkinlik matrisimizin 7. maddesidir.',
    options: ['😐 Teşekkürler, ama bunu konuşmamız lazım', '🙂 Teşekkürler', '😄 Çok mutluyum!', '🤩 "Hak etmemiştim bile!"'],
    answer: 3,
    sensible: 0,
    why: 'Zam için teşekkür ederim ama enflasyonun altındaysa bunu konuşmak isterim. Bu nankörlük değil.',
    widget: {
      type: 'slider',
      min: 0,
      max: 100,
      step: 1,
      unit: '',
      thresholds: [25, 50, 80],
      faces: true,
    },
  },
  ...MORE_QUESTIONS,
  ...CULTURE_QUESTIONS,
  ...GENERAL_QUESTIONS,
];

/** Damgalanacak evrak: `fair` haklı bir çalışan talebi mi (onaylanması gereken) yoksa değil mi. */
export interface StampDoc {
  icon: string;
  title: string;
  detail: string;
  fair: boolean;
}

/**
 * Evrak damgalamanın sonucu. `approved` onaylananlar; damgalanmayan evrak "beklemede" kalır, yani
 * reddedilmiş sayılır. Hepsi onaylandıysa 0; her evrak hakkına göre damgalandıysa 1; haklı
 * taleplerin en az üçü reddedildiyse 3 (bütçeyi koruyan yönetici); geri kalan her şey 2.
 */
export function stampOption(docs: readonly StampDoc[], approved: ReadonlySet<number>): number {
  if (docs.every((_, i) => approved.has(i))) return 0;
  if (docs.every((d, i) => d.fair === approved.has(i))) return 1;
  if (docs.filter((d, i) => d.fair && !approved.has(i)).length >= 3) return 3;
  return 2;
}

/** Ekran paylaşımındaki bir sekme: iş, zararsız kişisel ya da herkesin görmemesi gereken. */
export interface ScreenTab {
  icon: string;
  title: string;
  /** Adres çubuğunda görünen adres (hep .test uzantılı, gerçek bir siteye gitmez). */
  url: string;
  /** Sayfanın nasıl çizileceği (widgets/MockPages.tsx). */
  page: 'sheet' | 'music' | 'doc' | 'weather' | 'forum' | 'travel' | 'agenda';
  /** Sayfanın öne çıkan satırı. */
  peek: string;
  kind: 'work' | 'personal' | 'risky';
}

/**
 * Ekran paylaşımının sonucu: hiçbir şey kapatılmadıysa 0; riskli bir sekme açık kaldıysa 1;
 * riskliler kapandı ama zararsız kişisel sekmeler açıksa 2; yalnızca iş kaldıysa 3.
 */
export function screenshareOption(tabs: readonly ScreenTab[], closed: ReadonlySet<number>): number {
  if (closed.size === 0) return 0;
  const open = tabs.filter((_, i) => !closed.has(i));
  if (open.some((t) => t.kind === 'risky')) return 1;
  if (open.some((t) => t.kind === 'personal')) return 2;
  return 3;
}

/** Kaydırıcının değeri hangi şıkka düşer. */
export function sliderOption(value: number, thresholds: readonly [number, number, number]): number {
  return value <= thresholds[0] ? 0 : value <= thresholds[1] ? 1 : value <= thresholds[2] ? 2 : 3;
}
