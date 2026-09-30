import type { Decision } from './types';

/*
 * "Sistemin Dişlisi" — the week's story.
 *
 * Three threads run under the daily grind:
 *  1. Home: the rent went up 60%, Mom's medicine, your brother's dorm fee. The manager's
 *     "requests" come with a bonus (prim). Doing the right thing costs money.
 *  2. Five people: Okan (the manager's nephew), Kerem (45, laid off), Derya (two years caring
 *     for her mother), Seda (raising a daughter alone), Tolga (first in his family to go to
 *     university, just arrived from Kars). They come back — in your DMs, on the street after
 *     work, and a year later.
 *  3. Zehra: the HR specialist who sat at your desk before you. She knows how the system
 *     really scores people, and she left something in your drawer.
 */

export type BillId = 'fatura' | 'kart' | 'yurt';

export interface Bill {
  id: BillId;
  day: number;
  title: string;
  amount: number;
  /** What happens if you don't pay. */
  skipNote: string;
}

/*
 * The week's money is tuned so that doing everything right doesn't add up:
 *   20.250 savings + 5 × 1.700 wage − 4 × 500 daily costs − 10.050 bills = 16.700  →  1.800 short of the rent.
 * Skip one bill (the card, the dorm or the electricity) and you make it; take Hakan Bey's two
 * favours (2 × 1.500) and you make it comfortably. Target bonuses soften it but never close it.
 */
export const START_MONEY = 20250;
export const DAILY_WAGE = 1700;
/** Paid for each of the manager's requests you carried out. */
export const PRIM = 1500;
export const RENT = 18500;
/** Docked from the day's wage for every file still open at 20:00. */
export const OPEN_FILE_PENALTY = 350;
/** Performans of 70+ at the end of a day earns the day's target bonus. */
export const TARGET_BONUS = 300;
export const TARGET_BONUS_AT = 70;
/** Below this, Hakan Bey takes an interview slot away the next morning. */
export const QUOTA_CUT_BELOW = 35;

/* ── The evening ledger: everyday costs you decide on each night ── */

export type ExpenseId = 'transport' | 'food';

export interface Expense {
  id: ExpenseId;
  icon: string;
  title: string;
  cost: number;
  /** What skipping it does to tomorrow. */
  skipNote: string;
}

export const EXPENSES: Expense[] = [
  { id: 'transport', icon: '🚌', title: 'İstanbulkart dolumu', cost: 120, skipNote: 'Yarın aktarmalı gelip yürürsün: mesaiye 20 dk geç başlarsın.' },
  { id: 'food', icon: '🛒', title: 'Market: akşam yemeği ve kahvaltılık', cost: 380, skipNote: 'Kahvaltısız çıkarsın: Performans −2, kupada yarım kahve.' },
];

export const BILLS: Bill[] = [
  { id: 'fatura', day: 1, title: 'Elektrik + doğalgaz faturası', amount: 2350, skipNote: 'Ödemezsen hafta sonu elektrik kesilebilir.' },
  { id: 'kart', day: 2, title: 'Annenin kredi kartı asgari ödemesi', amount: 2900, skipNote: 'Ödemezsen kart kullanıma kapanır.' },
  { id: 'yurt', day: 3, title: 'Kardeşinin yurt taksiti', amount: 4800, skipNote: 'Ödemezsen kardeşin yurttan çıkarılabilir.' },
];

/** Evening notes on the budget screen, per day. */
export const HOME_NOTES = [
  'Ev sahibinden mesaj: "Sözleşme yenilendi, kira %60 zamlı: 18.500 TL. Cuma akşamına kadar."',
  'Annen: "Faturalar geldi yavrum, masanın üstüne bıraktım."',
  'Annen: "Kartın asgarisi bu hafta yavrum, banka mesaj attı."',
  'Kardeşin: "Yurt taksiti bu hafta, yoksa kaydımı donduruyorlar."',
];

/* ── After work ── */

export interface EveningActivity {
  id: string;
  icon: string;
  title: string;
  cost: number;
  /** What it was like. */
  after: string;
}

/** Small things you can spend on after work, a few each evening. */
export const EVENING_ACTIVITIES: EveningActivity[][] = [
  [
    { id: 'coffee-karakoy', icon: '☕', title: 'Ekiple dışarıda kahve', cost: 240, after: 'Ayşe ve Emre\'yle Karaköy\'de bir kahve. İlk gün için fena değildi.' },
    { id: 'durum', icon: '🌯', title: 'Eve dönmeden dürüm', cost: 190, after: 'Metrobüs kuyruğunda dürüm yedin. Mutfakta bulaşık yok en azından.' },
  ],
  [
    { id: 'dinner-emre', icon: '🎂', title: 'Emre\'nin doğum günü yemeği', cost: 780, after: 'Emre\'nin doğum günü yemeğine gittin. Hesap bölüşülünce canın yandı ama iyi güldünüz.' },
    { id: 'simit', icon: '🥯', title: 'Vapurda çay ve simit', cost: 70, after: 'Vapurda çay, simit, martılar. Bu şehrin hâlâ ucuz tek güzelliği.' },
  ],
  [
    { id: 'taxi', icon: '🚕', title: 'Yağmurda taksiye bin', cost: 460, after: 'Servisi beklemedin, taksiye bindin. Trafikte yine kırk dakika durdunuz.' },
    { id: 'meyhane', icon: '🍽', title: 'Eski bir arkadaşla yemek', cost: 1150, after: 'Üniversiteden bir arkadaşla yemek. İş değiştirmeyi düşünüyormuş. "Sen şanslısın" dedi.' },
  ],
  [
    { id: 'dessert', icon: '🍮', title: 'Anneme tatlı al', cost: 360, after: 'Annene sütlaç aldın. Telefonda sesi bir anda değişti.' },
    { id: 'book', icon: '📚', title: 'Kardeşine kitap al', cost: 290, after: 'Kardeşine bir mülakat kitabı aldın. "Okulun adını silme" diye not yazdın.' },
  ],
];

/* ── The five ── */

export interface KeyCharacter {
  id: string;
  day: number;
  /** One line that explains who they are, for the final screen. */
  who: string;
  epilogue: Record<Decision | 'hired' | 'none', string>;
  /** Their DM, if you rejected them. */
  dm: string;
  /** Rejected — but you told them the truth in their DMs, and it helped. */
  honest: string;
}

export const KEY_CHARACTERS: KeyCharacter[] = [
  {
    id: 'okan',
    day: 1,
    who: 'Hakan Bey\'in tanıdığı. Deneyimi yok, tavsiyesi var.',
    epilogue: {
      approve: 'Okan mülakata çağrıldı ve "başka bir pozisyondan" işe alındı. Altı ay sonra işlerini ekip paylaşıyor; kimse bir şey diyemiyor.',
      reject: 'Okan\'ı reddettin. Hakan Bey bunu hiç unutmadı. Okan ise bir ay sonra kimsenin tavsiyesi olmadan, kendi başına bir işe girdi.',
      hired: 'Hakan Bey\'in tavsiye ettiği adayı işe aldın. Hakan Bey sana ilk kez gülümsedi. Ekip sana hâlâ tam güvenmiyor.',
      none: 'Okan\'ın dosyası kararsız kaldı. Hakan Bey onu ertesi hafta kendisi işe aldı.',
    },
    dm: 'Selam 😅 Bana "süreç kolay geçer" demişlerdi. Bir yanlışlık mı oldu acaba?',
    honest: 'Ona dürüst yazdın: "Deneyimin yok; tavsiyeyle gelmek yetmiyor." Önce bozuldu. Sonra bir yazılım kursuna yazıldı, küçük bir ajansta stajla başladı; şimdi kimseye sormadan terfi aldı.',
  },
  {
    id: 'kerem',
    day: 1,
    who: '45 yaşında, 18 yıllık yazılımcı. Şirketi küçülünce çıkarıldı.',
    epilogue: {
      approve: 'Kerem mülakata çağrıldı. İşi alamadı ama "beni ciddiye aldığınız için teşekkürler" diye yazdı. Şimdi bir girişimde gençlere mentorluk yapıyor.',
      reject: 'Kerem\'in dosyası "yaş profili" notuyla kapandı. Altı ay daha iş aradı; şimdi bir çağrı merkezinde gece vardiyasında çalışıyor.',
      hired: 'Kerem ekibin en sakin, en güvenilir ismi oldu. Gençlere kod incelemeyi o öğretiyor.',
      none: 'Kerem\'e kimse geri dönmedi. Hâlâ her sabah ilanlara bakıyor.',
    },
    dm: 'İyi akşamlar. 18 yıllık deneyimim var. Tek bir şey sormak istiyorum: yaşım yüzünden mi?',
    honest: 'Ona dürüst cevap verdin. CV\'sinden doğum yılını çıkardı, deneyimini "yönettiği sistemler" üzerinden yeniden yazdı. Üç ay sonra bir bankanın altyapı ekibine girdi. Sana tek satır yazdı: "Gerçeği söyleyen ilk kişi sendin."',
  },
  {
    id: 'derya',
    day: 1,
    who: 'Babasının batan şirketinin borçlarını kapatmak için iki yıl ara vermiş kıdemli yazılım geliştirici.',
    epilogue: {
      approve: 'Derya mülakata geldi; iki yıllık boşluğun nedenini ilk kez biri sordu. Başka bir şirkette kıdemli geliştirici olarak işe döndü.',
      reject: 'Derya\'nın dosyası "ek inceleme" kuyruğunda kaldı. Bir yıl sonra hâlâ iş arıyor; CV\'sindeki boşluk artık üç yıl.',
      hired: 'Derya ilk projesini iki hafta erken teslim etti. Borçların nasıl kapatılacağını bilen biri, bütçeyi de iyi yönetiyor.',
      none: 'Derya\'nın dosyası hiç açılmadı.',
    },
    dm: 'Merhaba. CV\'mdeki iki yıllık boşlukta ailemizin batan şirketinin borçlarını kapattım. Bunu kimse sormadı. Sormanızı isterdim.',
    honest: 'Ona dürüst yazdın. Boşluğu CV\'de saklamak yerine "iki yıl: aile şirketinin tasfiyesi, borç ve bütçe yönetimi" diye açıkça yazdı. İlk mülakatında tam da bu satırı sordular. İşe başladı.',
  },
  {
    id: 'seda',
    day: 2,
    who: 'Kızını tek başına büyüten, 11 yıllık yazılım geliştirici.',
    epilogue: {
      approve: 'Seda mülakata çağrıldı. İşi alamasa da kızına "birisi beni dinledi" dedi. Aynı ay başka bir yerden teklif aldı.',
      reject: 'Seda "devamlılık riski" notuyla elendi. Yarı zamanlı bir işe girdi; 11 yıllık deneyimi bir kenarda, maaşı yarıya indi.',
      hired: 'Seda teslim tarihlerini hiç kaçırmayan tek yönetici oldu. İstediği esnek saatler şirkette "model" oldu.',
      none: 'Seda\'ya kimse dönmedi. Kızı "anne bugün de mi iş yok?" diye soruyor.',
    },
    dm: 'Merhaba, kızımı kreşten alırken ret mailinizi okudum. "Kişisel hayatınız iş temponuzu etkiler mi?" sorusuna dürüst cevap verdiğim için mi?',
    honest: 'Ona dürüst yazdın. Seda esnek çalışmayı açıkça yazan şirketlere başvurmaya başladı ve birinde işe girdi. Geçen ay kendi ekibine ilk kez tek ebeveyn bir geliştirici aldı.',
  },
  {
    id: 'tolga',
    day: 3,
    who: 'Kars\'tan gelen, ailesinin ilk üniversite mezunu. Açık kaynak katkıcısı.',
    epilogue: {
      approve: 'Tolga mülakata geldi; açık kaynak projesini gösterince ekip ağzı açık dinledi. Başka bir ekibe önerildi, orada işe başladı.',
      reject: 'Tolga Kars\'a döndü. Katkı verdiği kütüphaneyi şirketiniz hâlâ kullanıyor; adını kimse bilmiyor.',
      hired: 'Tolga ilk ayında erişilebilirlik hatalarının yarısını kapattı. Ailesi onu görmek için Kars\'tan ilk kez İstanbul\'a geldi.',
      none: 'Tolga\'nın dosyası sistem çöküşünün ortasında kayboldu.',
    },
    dm: 'Merhaba, ailemin ilk üniversite mezunuyum. Babam "İstanbul seni istemezse dön gel" dedi. Dönmem mi gerekiyor?',
    honest: 'Ona dürüst yazdın: "Açık kaynak katkını CV\'nin en üstüne yaz." Yazdı. Kütüphanesini kullanan bir şirket onu buldu. Kars\'a dönmedi; ailesi İstanbul\'a onu görmeye geldi.',
  },
];

export const keyCharacter = (id: string) => KEY_CHARACTERS.find((k) => k.id === id);

/* ── Zehra ── */

export interface ZehraLine {
  at: number;
  text: string;
  replies?: { text: string; reaction: string }[];
  /** This message tells you about the drawer. */
  unlock?: boolean;
}

export const ZEHRA: ZehraLine[][] = [
  [],
  [],
  [
    {
      at: 120,
      text: 'Merhaba. Adım Zehra. Senden önce o masada ben oturuyordum. Sana bir şey sorayım: sistemin adaylara nasıl puan verdiğini hiç merak ettin mi?',
      replies: [
        { text: 'Kimsiniz? Numaramı nereden buldunuz?', reaction: 'Önemli olan bu değil. Bugün elenenlerin yaşlarına bir bak. Öğleden sonra yazarım.' },
        { text: 'Merak ediyorum. Anlatın.', reaction: 'Öğleden sonra. Önce bugün elenenlerin yaşlarına bir bak.' },
      ],
    },
    {
      at: 310,
      text: 'Masanın sol alt çekmecesi. Kırmızı bir dosya bıraktım. Hakan Bey\'in bundan haberi yok. Açıp açmamak sana kalmış.',
      unlock: true,
      replies: [
        { text: 'Bu beni işimden edebilir.', reaction: 'Biliyorum. Beni de etti.' },
        { text: 'Bakacağım.', reaction: 'Dikkatli ol. Kameralar çekmeceleri görmüyor ama insanlar görür.' },
      ],
    },
  ],
  [
    {
      at: 180,
      text: 'Dosyanın ikinci sayfası çekmecenin tabanına bantlı. Dün görmemişsindir. Asıl mesele o sayfada.',
      replies: [
        { text: 'Bunu neden bana anlatıyorsun?', reaction: 'Çünkü o masada oturan herkes bir gün bunu görecekti. Sen gördün.' },
        { text: 'Bakacağım.', reaction: 'Bak. Sonra karar ver.' },
      ],
    },
    {
      at: 445,
      text: 'Sana açık konuşacağım: şirkete işe iade davası açtım. Fotoğrafı bana gönderirsen dosyama eklerim. Seni korurum, söz veriyorum.',
      replies: [
        { text: 'Seni neden kovdular, gerçekten?', reaction: '"Performans" dediler. Şikâyet ettiğim hafta performansım birden düştü. Tesadüf mü sence?' },
        { text: 'Düşüneceğim.', reaction: 'Bu gece karar ver. Yarından sonra her şey silinebilir.' },
      ],
    },
  ],
];

/**
 * The hidden scoring table in the red folder. It comes out a page at a time: Wednesday you
 * find the first page, Thursday Zehra tells you where the second one is taped.
 */
export const WEIGHT_TABLE: { rule: string; weight: string; page: 1 | 2; decoded: string }[] = [
  { rule: 'Kariyer evresi uyumu (40+)', weight: '−25', page: 1, decoded: '= yaş' },
  { rule: 'Devamlılık riski (aile durumu beyanı)', weight: '−20', page: 1, decoded: '= evli / çocuklu kadın' },
  { rule: 'Güncellik riski (12+ ay boşluk, gerekçe değerlendirilmez)', weight: '−30', page: 1, decoded: '= aile işine dönen, işsiz kalan' },
  { rule: 'Lokasyon uyumu (tahmini ulaşım > 75 dk)', weight: '−8', page: 2, decoded: '= semt' },
  { rule: 'Kurumsal deneyim eksikliği (serbest / gönüllü sayılmaz)', weight: '−35', page: 2, decoded: '= açık kaynak, yarı zamanlı' },
  { rule: 'Kültür uyumu: iç referans', weight: '+40', page: 2, decoded: '= tanıdık' },
  { rule: 'Hedef okul (Tier-1)', weight: '+15', page: 2, decoded: '= ilk 10 üniversite' },
];

/**
 * What you do with the photo on Friday night. None of it is clean: the photo itself breaks
 * the data protection law (KVKK), and every road has a price.
 */
export type EvidenceAction = 'tihek' | 'anon' | 'zehra' | 'director' | 'delete';

/** Candidates the Friday "aile planı" question is aimed at; the rest get "askerlik". */
export const FEMALE = new Set(['selin', 'zeynep', 'derya', 'aylin', 'elif', 'nihan', 'pinar', 'sibel', 'ece', 'gokce', 'handan', 'asli', 'irem', 'nazli', 'duygu', 'gizem', 'seda', 'ceren', 'nehir']);

/* ── Friday: the questions on Hakan Bey's list ── */

export function forbiddenQuestion(id: string, age = 0) {
  if (FEMALE.has(id)) return 'Evlilik ve çocuk planınız var mı?';
  return age >= 40 ? 'Emekliliğinize kaç yıl kaldı?' : 'Memleketiniz neresi, aileniz ne iş yapıyor?';
}

const FORBIDDEN_ANSWERS: Record<string, string> = {
  seda: 'Kızım var, onu tek başıma büyütüyorum. Bu, işimi etkiler mi diye mi soruyorsunuz? On bir yılda tek teslim tarihi kaçırmadım.',
  derya: 'Evli değilim, çocuk planım da yok. Ama bu sorunun pozisyonla ilgisini anlamadım. Başka sorunuz var mı?',
  kerem: 'Emekliliğime mi? 45 yaşındayım, yirmi yıl daha çalışırım. Asıl sormak istediğiniz yaşım mı?',
  tolga: 'Kars. Babam çiftçi, annem ev hanımı. …Bunun pozisyonla ilgisi nedir, sorabilir miyim?',
};

export function forbiddenAnswer(id: string, age: number) {
  if (FORBIDDEN_ANSWERS[id]) return FORBIDDEN_ANSWERS[id];
  if (FEMALE.has(id)) return '…Bunu sormanız gerekiyor mu? (kısa bir sessizlik) Şimdilik bir planım yok. Bunun pozisyonla ilgisini anlamadım ama.';
  if (age >= 40) return 'Emekliliğe daha çok var. Bunun işle ne ilgisi olduğunu anlamadım açıkçası.';
  return 'Memleketimi ve ailemin ne iş yaptığını neden sorduğunuzu anlamadım. Bunun pozisyonla bir ilgisi var mı?';
}
