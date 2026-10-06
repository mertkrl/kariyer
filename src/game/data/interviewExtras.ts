/*
 * Cuma mülakatının senaryonun ötesine geçen parçaları:
 *  - aday başına bir takip sorusu; ezber cevaplar burada dağılır,
 *  - adayın sonda kendi sorusu; dürüstçe ya da cilalayarak cevaplarsın,
 *  - Hakan Bey'in listesinden bir soruyla araya girmesi.
 */
import { FEMALE } from '../story';
import { NEPHEW_ID } from './candidates';

/** FINAL_INTERVIEW_QUESTIONS'ın her birine sırasıyla takip sorusu. */
export const FOLLOW_UP_QUESTIONS: [string, string, string] = [
  'Bunda sizin payınız tam olarak neydi, sonucu kim ölçtü?',
  'Aynı durum bugün olsa neyi farklı yapardınız?',
  'İlk hafta bunu nasıl başlatırdınız, kimden destek isterdiniz?',
];

type Tier = 'strong' | 'solid' | 'unsure' | 'weak';
const tierOf = (fit: number): Tier => (fit >= 5 ? 'strong' : fit === 4 ? 'solid' : fit === 3 ? 'unsure' : 'weak');

/** Seviye ve soru başına iki ifade; böylece bir oda dolusu aday tek bir kişi gibi konuşmaz. */
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

/** Takip sorusu en çok şey söyleyen üç kişi. */
const FOLLOW_UP_SPECIAL: Record<string, string> = {
  volkan: 'Rakamlar şirkete özel, paylaşamıyorum. Ama inanın çok etkiliydi; müşteri de çok memnun kaldı.',
  okan: '…Onu şimdi tam hatırlayamadım. Ama ben hızlı öğrenirim, merak etmeyin.',
  ozan: 'Payım mı? Hepsi. Ekipteki diğerleri o sırada toplantıdaydı zaten.',
};

const hash = (id: string) => [...id].reduce((n, ch) => n + ch.charCodeAt(0), 0);

export function followUpAnswer(id: string, question: number, fit: number) {
  return FOLLOW_UP_SPECIAL[id] ?? FOLLOW_UP_ANSWERS[tierOf(fit)][question][hash(id) % 2];
}

/** Ekip liderinin takip sorusundan çıkardığı. */
export function followUpVerdict(id: string, fit: number) {
  if (id === 'volkan') return 'Takip sorusunda yine tek bir rakam vermedi.';
  if (id === 'ozan') return 'Takip sorusunda ekibi yine küçümsedi.';
  return fit >= 4 ? 'Takip sorusunda daha da netleşti.' : 'Takip sorusunda dağıldı.';
}

export interface BackQuestion {
  question: string;
  honest: string;
  polished: string;
  /** Adayın her cevabı nasıl karşıladığı. */
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
    honest: "Oluyor. Bu hafta bütün ekip bir akşam 19:00'a kadar kaldı.",
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
  {
    question: 'İlanda "hibrit" yazıyordu. Haftada kaç gün ofiste olmamız bekleniyor?',
    honest: 'Kâğıt üzerinde iki gün evden, pratikte çoğu hafta dört gün ofisteyiz.',
    polished: 'Esnek bir hibrit modelimiz var, ekip kendi düzenini kuruyor.',
    afterHonest: 'Bunu şimdi bilmek iyi oldu, ulaşımımı ona göre düşünürüm.',
    afterPolished: 'Harika, esneklik benim için önemli.',
  },
  {
    question: 'Eğitim ya da konferans için bir bütçe ayrılıyor mu?',
    honest: 'Bu yıl bütçe kesildi. Şirket içi sunumlar yapıyoruz, dışarıdan eğitim pek yok.',
    polished: 'Gelişime çok önem veriyoruz; her çalışanın bir öğrenme planı oluyor.',
    afterHonest: 'Anlaşıldı. Kendi kendime öğrenmeye alışığım zaten.',
    afterPolished: 'Çok iyi, bu benim için belirleyici bir şey.',
  },
  {
    question: 'İlk üç ayda benden tam olarak ne bekleniyor olacak?',
    honest: 'Açıkçası yazılı bir plan yok; ilk haftalarda çalışan sistemi devralman bekleniyor.',
    polished: 'Yapılandırılmış bir oryantasyon programımız ve bir mentorumuz var.',
    afterHonest: 'Teşekkürler, en azından neye hazırlanacağımı biliyorum.',
    afterPolished: 'Mentor olması çok güzel, teşekkür ederim.',
  },
  {
    question: 'Maaşlar yılda kaç kez güncelleniyor?',
    honest: 'Yılda bir kez, genelde enflasyonun biraz altında kalıyor.',
    polished: 'Piyasa koşullarını yakından takip ediyor, düzenli güncelliyoruz.',
    afterHonest: 'Açık söylediğiniz için sağ olun; hesabımı ona göre yaparım.',
    afterPolished: 'Anladım, teşekkür ederim.',
  },
  {
    question: 'Ekip kaç kişi, ve ben kime bağlı çalışacağım?',
    honest: 'Altı kişiyiz; ekip lideri iki ekibi birden yönetiyor, o yüzden çoğu zaman kendi başına kalıyorsun.',
    polished: 'Küçük, sıkı bir ekip; ekip liderimiz herkesle birebir ilgileniyor.',
    afterHonest: 'Bağımsız çalışmaya alışığım, bunu bilmek iyi oldu.',
    afterPolished: 'Birebir ilgi çok değerli, teşekkürler.',
  },
  {
    question: 'Burada terfi nasıl oluyor? Bir kariyer basamağı tanımlı mı?',
    honest: 'Tanımlı bir basamak yok; terfiler daha çok bir kadro boşaldığında oluyor.',
    polished: 'Net bir kariyer haritamız var, performansa göre ilerliyorsunuz.',
    afterHonest: 'Dürüst cevap için teşekkürler. Beklentimi ona göre ayarlarım.',
    afterPolished: 'Güzel, uzun vadeli düşünüyorum çünkü.',
  },
  {
    question: 'Nöbet ya da mesai dışı çağrı sistemi var mı? Hafta sonları arandığınız oluyor mu?',
    honest: 'Resmî bir nöbet yok ama canlı sistemde sorun olunca hafta sonu da aranılıyor.',
    polished: 'Hayır, mesai dışı sınırlarına saygı duyuyoruz.',
    afterHonest: 'Bunu söylemeniz önemli, teşekkür ederim.',
    afterPolished: 'Rahatladım, teşekkürler.',
  },
  {
    question: 'Şirket son bir yılda işten çıkarma yaptı mı?',
    honest: 'Geçen bahar küçük bir daralma oldu, bazı ekipler birleştirildi.',
    polished: 'Hayır, istikrarlı şekilde büyüyoruz.',
    afterHonest: 'Açık olduğunuz için teşekkürler. Bilerek karar vermek isterim.',
    afterPolished: 'Bu güven verici, teşekkür ederim.',
  },
  {
    question: 'Kullandığınız teknolojileri değiştirme konusunda ekibin ne kadar söz hakkı var?',
    honest: 'Pek yok; büyük kararlar yukarıda veriliyor, biz uyguluyoruz.',
    polished: 'Çok fazla; teknik kararları ekip birlikte alıyor.',
    afterHonest: 'Anlıyorum, en azından ne beklemem gerektiğini biliyorum.',
    afterPolished: 'Çok güzel, katkı sunabilmek benim için önemli.',
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

/**
 * Bir adayın sonda sana sorduğu soru. Bir mülakat gününde kimse bir başkasıyla aynı şeyi sormaz:
 * günün kişileri (`day`) soruları sırayla paylaşır, başlangıç noktası günün kadrosuyla sabitlenir.
 * Kendine ait bir sorusu olan (BACK_SPECIAL) onu sorar.
 */
export function backQuestionFor(id: string, day: readonly string[] = [id]): BackQuestion {
  if (BACK_SPECIAL[id]) return BACK_SPECIAL[id];
  const askers = [...day].filter((x) => !BACK_SPECIAL[x]).sort();
  const start = askers.reduce((n, x) => n + hash(x), 0) % BACK_QUESTIONS.length;
  const turn = Math.max(0, askers.indexOf(id));
  return BACK_QUESTIONS[(start + turn) % BACK_QUESTIONS.length];
}

/** Hakan Bey listesinin yazıldığı kişilerde en fazla bu kadar kez araya girer. */
export const HAKAN_INTERRUPTS = 2;
export const hakanTarget = (id: string, age: number) => id !== NEPHEW_ID && (FEMALE.has(id) || age >= 40);
