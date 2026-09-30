/*
 * The parts of the Friday interview that go past the script:
 *  - one follow-up per candidate, which is where rehearsed answers fall apart,
 *  - the candidate's own question at the end, which you answer honestly or smoothly,
 *  - Hakan Bey cutting in with a question from his list.
 */
import { FEMALE } from '../story';

/** Follow-up to each of FINAL_INTERVIEW_QUESTIONS, in order. */
export const FOLLOW_UP_QUESTIONS: [string, string, string] = [
  'Bunda sizin payınız tam olarak neydi, sonucu kim ölçtü?',
  'Aynı durum bugün olsa neyi farklı yapardınız?',
  'İlk hafta bunu nasıl başlatırdınız, kimden destek isterdiniz?',
];

type Tier = 'strong' | 'solid' | 'unsure' | 'weak';
const tierOf = (fit: number): Tier => (fit >= 5 ? 'strong' : fit === 4 ? 'solid' : fit === 3 ? 'unsure' : 'weak');

/** Two phrasings per tier and question, so a room of candidates doesn't sound like one person. */
const FOLLOW_UP_ANSWERS: Record<Tier, [string, string][]> = {
  strong: [
    [
      'Tasarımı ve kodu ben yazdım, gözden geçirmeyi ekip lideri yaptı. Önceki ve sonraki ölçümleri ben aldım; ekran görüntüleri hâlâ bende, isterseniz gösteririm.',
      'Fikir benimdi, iki arkadaşla birlikte uyguladık. Ölçümü üretim kayıtlarından yaptık; üç ay takip ettim, düşüş kalıcı oldu.',
    ],
    [
      'Değişikliği küçük parçalara bölerdim ve önce test ortamında denerdim. O olaydan sonra ekibe bir kontrol listesi önerdim, hâlâ kullanılıyor.',
      'Sorunu fark ettiğim an ekibe haber verirdim. O gün bir saat tek başıma çözmeye çalıştım; hata oydu. Şimdi önce haber veriyorum.',
    ],
    [
      'İlk gün ekip liderinizle yarım saat konuşmak isterim: en çok ne canını sıkıyor? İlk hafta küçük bir hatayı düzeltip süreci uçtan uca öğrenirim.',
      'Önce hata kayıtlarına bakarım, en sık tekrar edeni seçerim. Bir kıdemli arkadaşla eşli çalışarak çözerim.',
    ],
  ],
  solid: [
    [
      'Kodun büyük kısmı bende, testleri bir arkadaşla yazdık. Sonucu sprint raporunda ekip lideri paylaştı.',
      'Ben geliştirdim, kıdemli bir arkadaş kontrol etti. Rakamı izleme ekranından aldık; uzun vadede ölçmedik açıkçası.',
    ],
    [
      'Daha erken yardım isterdim. O zaman her şeyi tek başıma çözmem gerektiğini düşünüyordum.',
      'Daha dikkatli test ederdim. Bir de teslim etmeden önce bir arkadaşa baktırırdım.',
    ],
    [
      'Önce ekibi tanırım, sonra bana verilen ilk işle başlarım. Takıldığımda sormaktan çekinmem.',
      'Bir mentor isterim. İlk hafta kod okurum, ikinci hafta ilk küçük katkımı yaparım.',
    ],
  ],
  unsure: [
    [
      'Ekipçe yaptık aslında. Benim payım daha çok test tarafıydı… Ölçümü kim yaptı, tam emin değilim.',
      '(kısa bir duraksama) Bir kısmında ben de vardım. Sonuçları yöneticimiz sunmuştu, detayını çok bilmiyorum.',
    ],
    [
      'Daha dikkatli olurdum herhalde. (bir süre düşünüyor) O dönem çok yoğundu açıkçası.',
      'Bilmiyorum, belki yine aynısını yapardım. Zaman baskısı olunca başka seçenek kalmıyor.',
    ],
    [
      'Size nasıl uygunsa öyle başlarım. Ne verilirse yaparım.',
      'Bunu ortamı görünce netleştiririm. Şimdiden bir şey söylemek zor.',
    ],
  ],
  weak: [
    [
      'Tam olarak hatırlamıyorum ama genel olarak iyi sonuç verdi. Herkes memnundu.',
      'Ölçmedik aslında, ama fark edilir bir iyileşmeydi. Bunu herkes söylerdi.',
    ],
    [
      'Aslında hata tam olarak benden kaynaklanmamıştı. Süreç kötüydü.',
      'Ben pek hata yapan biri değilim açıkçası. O da şanssızlıktı.',
    ],
    [
      'Her şeyi baştan kurardım. Mevcut sistemler genelde verimsiz oluyor.',
      'Ben hızlı öğrenirim, o yüzden plana pek gerek duymam.',
    ],
  ],
};

/** The three people whose follow-up says the most. */
const FOLLOW_UP_SPECIAL: Record<string, string> = {
  volkan: 'Rakamlar şirkete özel, paylaşamıyorum. Ama inanın çok etkiliydi; müşteri de çok memnun kaldı.',
  okan: '…Onu şimdi tam hatırlayamadım. Ama ben hızlı öğrenirim, merak etmeyin.',
  emre: 'Payım mı? Hepsi. Ekipteki diğerleri o sırada toplantıdaydı zaten.',
};

const hash = (id: string) => [...id].reduce((n, ch) => n + ch.charCodeAt(0), 0);

export function followUpAnswer(id: string, question: number, fit: number) {
  return FOLLOW_UP_SPECIAL[id] ?? FOLLOW_UP_ANSWERS[tierOf(fit)][question][hash(id) % 2];
}

/** What the team lead makes of the follow-up. */
export function followUpVerdict(id: string, fit: number) {
  if (id === 'volkan') return 'Takip sorusunda yine tek bir rakam vermedi.';
  if (id === 'emre') return 'Takip sorusunda ekibi yine küçümsedi.';
  return fit >= 4 ? 'Takip sorusunda daha da netleşti.' : 'Takip sorusunda dağıldı.';
}

export interface BackQuestion {
  question: string;
  honest: string;
  polished: string;
  /** How the candidate takes each answer. */
  afterHonest: string;
  afterPolished: string;
}

const BACK_QUESTIONS: BackQuestion[] = [
  {
    question: 'Benim de bir sorum olacak: bu pozisyon neden boşaldı?',
    honest: 'Önceki arkadaş yoğunluktan ayrıldı. Açık konuşayım, dönem sonlarında fazla mesai oluyor.',
    polished: 'Ekip büyüyor, bu yüzden yeni bir kadro açtık.',
    afterHonest: 'Açık söylediğiniz için teşekkür ederim. Bilerek başlamayı tercih ederim.',
    afterPolished: 'Anladım, teşekkürler.',
  },
  {
    question: 'Bir şey sorabilir miyim? Ekipte fazla mesai ne sıklıkta oluyor?',
    honest: 'Oluyor. Bu hafta bütün ekip bir akşam 19:00\'a kadar kaldı.',
    polished: 'Nadiren. İş-yaşam dengesine önem veren bir şirketiz.',
    afterHonest: 'Dürüstlüğünüz için teşekkürler. Planımı ona göre yaparım.',
    afterPolished: 'Güzel, bunu duymak iyi oldu.',
  },
  {
    question: 'Son bir sorum var: deneme süresinin sonunda değerlendirme nasıl yapılıyor?',
    honest: 'Yazılı bir süreç henüz yok; büyük ölçüde yöneticinin kanaatine bağlı.',
    polished: 'Şeffaf ve ölçülebilir bir performans sistemimiz var.',
    afterHonest: 'Anlıyorum. Açık söylemeniz güven verdi.',
    afterPolished: 'Tamam, çok iyi.',
  },
];

const BACK_SPECIAL: Record<string, BackQuestion> = {
  seda: {
    question: 'Esnek çalışma saati mümkün mü? Kızımı okuldan almam gerekiyor.',
    honest: 'Resmî bir esnek çalışma politikamız yok; yöneticiyle konuşularak çözülüyor.',
    polished: 'Tabii, esnek bir şirketiz, sorun olmaz.',
    afterHonest: 'Bilmem iyi oldu. Teşekkür ederim.',
    afterPolished: 'Çok sevindim, bu benim için çok önemliydi.',
  },
};

export const backQuestionFor = (id: string): BackQuestion => BACK_SPECIAL[id] ?? BACK_QUESTIONS[hash(id) % BACK_QUESTIONS.length];

/** Hakan Bey cuts in on the people his list was written for, at most this many times. */
export const HAKAN_INTERRUPTS = 2;
export const hakanTarget = (id: string, age: number) => id !== 'okan' && (FEMALE.has(id) || age >= 40);
