import type { ExamQuestion } from './questions';

/*
 * Her bölümün önündeki tanıtım ve örnek soru. Gerçek değerlendirme platformlarında olduğu gibi
 * ciddidir: amaç, yönerge ve puanlanmayan, gerçekten mantıklı bir örnek soru. Şaka bilerek burada
 * yoktur; oyuncu testi gerçek sanar, bölümün asıl soruları başlayınca durumu anlar.
 */

export interface SectionBriefing {
  /** EXAM_SECTIONS'taki id. */
  id: string;
  /** Bu bölüm neyi ölçer: tanıtım ekranının ana cümlesi. */
  purpose: string;
  /** Yönergeler, madde madde. */
  rules: string[];
  /** Puanlanmayan örnek soru; `answer` doğru şıktır, `explain` cevaptan sonra görünür. */
  practice: Pick<ExamQuestion, 'prompt' | 'options' | 'figure'> & { answer: number | null; explain: string };
}

export const BRIEFINGS: SectionBriefing[] = [
  {
    id: 'cognitive',
    purpose: 'Bu bölüm sayısal akıl yürütme, sözel çıkarım, şekil örüntüleri ve dikkat becerilerinizi ölçer. Sorular kolaydan zora doğru sıralanmamıştır.',
    rules: ['Her soruda tek bir doğru cevap vardır.', 'Hesap makinesi ve kâğıt kullanabilirsiniz.', 'Emin olmadığınız soruyu boş bırakmak yerine en olası cevabı işaretleyin.'],
    practice: {
      prompt: 'Dizide bir sonraki sayı hangisidir?',
      figure: '2   6   12   20   30   ?',
      options: ['36', '40', '42', '44'],
      answer: 2,
      explain: 'Ardışık farklar 4, 6, 8, 10 diye ikişer artıyor; sıradaki fark 12, yani 30 + 12 = 42.',
    },
  },
  {
    id: 'simulation',
    purpose: 'Bu bölüm iş hayatında karşılaşabileceğiniz durumlarda nasıl davrandığınızı ölçer. Her soruda kısa bir senaryo ve olası tepkiler yer alır.',
    rules: ['Size en uygun görünen tepkiyi seçin; ideal olanı değil, gerçekten yapacağınızı.', 'Bazı sorular etkileşimlidir; yönergeyi sorunun üstünde bulabilirsiniz.', 'Senaryolardaki kişi ve kurumlar kurgusaldır.'],
    practice: {
      prompt: 'Bir müşteri, siparişinin söz verilen tarihte teslim edilmediğini öfkeyle bildiriyor. Gecikme lojistik firmasından kaynaklanıyor. İlk olarak ne yaparsınız?',
      options: [
        'Gecikmenin lojistik firmasının hatası olduğunu açıklarım.',
        'Müşteriyi dinler, özür diler ve gerçekçi yeni bir teslim tarihi veririm.',
        'Şikâyeti yöneticime iletir, dönüş yapılacağını söylerim.',
        'İndirim kodu gönderip konuyu kapatırım.',
      ],
      answer: 1,
      explain: 'Önce dinlemek ve sorumluluğu üstlenmek güveni korur; somut bir tarih vermek de belirsizliği giderir. Suçu başkasına atmak ya da konuyu ertelemek müşteriyi daha da kızdırır.',
    },
  },
  {
    id: 'culture',
    purpose: 'Bu bölüm çalışma tarzınızı ve değerlerinizi anlamamıza yardımcı olur. Kişilik envanteri biçimindedir.',
    rules: ['Doğru ya da yanlış cevap yoktur.', 'Uzun düşünmeyin; ilk aklınıza geleni işaretleyin.', 'Kendinizi olduğunuz gibi, olmak istediğiniz gibi değil yanıtlayın.'],
    practice: {
      prompt: 'Net talimatlar olmasa da yeni bir işe kendi başıma başlayabilirim.',
      options: ['Kesinlikle katılmıyorum', 'Katılmıyorum', 'Katılıyorum', 'Kesinlikle katılıyorum'],
      answer: null,
      explain: 'Bu tür ifadelerde doğru cevap yoktur; seçiminiz yalnızca çalışma tarzınızı tanımlar.',
    },
  },
  {
    id: 'general',
    purpose: 'Bu bölüm güncel ve tarihsel konulardaki genel bilgi düzeyinizi ölçer.',
    rules: ['Her soruda tek bir doğru cevap vardır.', 'Sorular farklı alanlardan rastgele seçilir.', 'İnternette arama yapmanız gözetim sistemi tarafından algılanır.'],
    practice: {
      prompt: 'Türkiye Büyük Millet Meclisi hangi yıl açılmıştır?',
      options: ['1919', '1920', '1921', '1923'],
      answer: 1,
      explain: 'TBMM 23 Nisan 1920’de Ankara’da açıldı. 1923 Cumhuriyet’in ilan edildiği yıldır.',
    },
  },
];
