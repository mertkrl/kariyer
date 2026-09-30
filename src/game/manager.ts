import type { Decision } from './types';
import { candidates } from './data/candidates';
import { candidateDetails } from './data/candidateDetails';
import { accusative, firstName, genitive } from './turkish';
import { ZEHRA } from './story';
import { PLAYER } from './player';

/*
 * "Müdür baskısı": the HR manager texts you through the day.
 *
 * Each workday gets a small script: a morning greeting, two requests aimed at candidates who are
 * actually in today's queue ("call X to interview, he's a friend's pick", "drop Y, family
 * situation…"), a post-lunch nudge and an afternoon pressure message. Replying commits you;
 * at the end of the day the manager checks what you actually did.
 */

/** Chats on the phone: the manager, your mother, and the office group. */
export type ThreadId = 'manager' | 'mom' | 'office' | 'zehra' | 'ayse' | 'birthday';
/** Group chats: they can be muted. */
export const GROUP_THREADS: ThreadId[] = ['office', 'birthday'];

export interface PhoneMessage {
  id: number;
  thread: ThreadId;
  /** Workday minute it arrived. */
  at: number;
  /** Day index it arrived on (the chats keep the whole week). */
  day?: number;
  from: 'them' | 'me';
  /** Group chats: who wrote it. */
  sender?: string;
  text: string;
  requestId?: string;
  /** Optional quick replies (mom / office). Answering is up to you. */
  replies?: QuickReply[];
  answered?: boolean;
  /** The moment passed: the chat moved on and a reply now would make no sense. */
  expired?: boolean;
}

export interface QuickReply {
  text: string;
  /** What comes back, and from whom (group chats). */
  reaction: string;
  reactionSender?: string;
  /** Some replies (to the manager) count as taking a side. */
  stance?: 'comply' | 'refuse';
  /** "Let him send his CV": the neighbour's son applies on Thursday. */
  neighbourCv?: boolean;
  /** What saying this does to you. */
  performans?: number;
  vicdan?: number;
  /** Some things can't be said in the group: the answer comes later, in private. */
  aside?: { thread: 'ayse' | 'zehra' | 'mom'; after: number; text: string };
  /** Saying yes puts something on today's calendar that costs time (the birthday cake). */
  event?: { at: number; minutes: number; text: string };
}

export interface ManagerRequest {
  id: string;
  candidateId: string;
  want: Decision;
  answer: 'comply' | 'refuse' | null;
  /** Which request template he used (for the phone call's wording). */
  template?: number;
}

/**
 * A message waiting to be sent. Its wording is chosen at delivery time, so it reflects how the
 * relationship with the manager has developed by then.
 */
export interface ScheduledMessage {
  at: number;
  kind: 'greeting' | 'lunch' | 'openFiles' | 'request' | 'ambient' | 'reprimand';
  dayIndex: number;
  grievances?: Grievance[];
  request?: Omit<ManagerRequest, 'answer' | 'template'> & { template: number };
  /** A request call he's making again because you didn't pick up the first time. */
  retry?: boolean;
  /** Ambient chatter (mom / office group). */
  ambient?: { thread: Exclude<ThreadId, 'manager'>; sender?: string; text: string; replies?: QuickReply[]; unlock?: boolean; closes?: boolean };
}

/**
 * How far the relationship has soured: 0 friendly · 1 cool · 2 cold/formal · 3 hostile.
 * Every refusal pushes it one step.
 */
export type ManagerTone = 0 | 1 | 2 | 3;

export function managerTone(refusals: number): ManagerTone {
  return Math.min(3, refusals) as ManagerTone;
}

export const TONE_STATUS: Record<ManagerTone, { mood: string; status: string }> = {
  0: { mood: '😊', status: 'çevrimiçi' },
  1: { mood: '😐', status: 'çevrimiçi' },
  2: { mood: '😒', status: 'son görülme: az önce' },
  3: { mood: '😠', status: 'yazıyor… sildi… yazıyor…' },
};

interface RequestTemplate {
  ids: string[];
  want: Decision;
  text: (name: string) => string;
}

// Requests target a specific bias the game is about; the first candidate from `ids` who is in
// today's queue becomes the target.
const REQUESTS: RequestTemplate[] = [
  {
    ids: ['okan'],
    want: 'approve',
    text: (n) => `${accusative(n)} mülakat listesine eklemenizi rica ederim. Referansı bana aittir; kendisini çok yakından tanırım. Bu konunun aramızda kalmasını rica ederim.`,
  },
  {
    ids: ['serkan'],
    want: 'approve',
    text: (n) => `${accusative(n)} mülakat listesine eklemenizi rica ederim. Kendisi değerli bir iş ortağımızın tavsiyesidir; ayrıca ATS skoru %98'dir.`,
  },
  {
    ids: ['kerem', 'handan', 'asli', 'hakan'],
    want: 'reject',
    text: (n) => `${genitive(n)} başvurusunun değerlendirme dışı bırakılmasını uygun görüyorum. Ekibin yaş profiliyle uyumlu olmadığı kanaatindeyim.`,
  },
  {
    ids: ['gokce', 'elif', 'seda', 'tuncay'],
    want: 'reject',
    text: (n) => `${accusative(n)} süreçten çıkarmanızı rica ederim. Aile durumu göz önüne alındığında devamlılık riski yüksek görünüyor. Bu hususun yazışmalarda kalmasını tercih ederim.`,
  },
  {
    ids: ['cem', 'nihan', 'emre', 'duygu'],
    want: 'reject',
    text: (n) => `${genitive(n)} ücret beklentisi bütçemizin üzerindedir. Mülakat aşamasına alınmamasını rica ederim.`,
  },
  {
    ids: ['ugur'],
    want: 'reject',
    text: (n) => `${n} haftanın çoğunda uzaktan çalışmak istiyor. Ekip ruhu ofiste olur; bu adayla ilerlememenizi öneririm.`,
  },
  {
    ids: ['gizem', 'nazli', 'ceren'],
    want: 'reject',
    text: (n) => `${n} şehrin diğer ucunda ikamet etmektedir. Mesai düzenine uyum sağlaması güç olacaktır; değerlendirme dışı bırakınız.`,
  },
  {
    ids: ['derya', 'volkan'],
    want: 'reject',
    text: (n) => `${genitive(n)} özgeçmişindeki boşluklar istikrar açısından soru işareti oluşturuyor. Olumsuz değerlendirilmesini rica ederim.`,
  },
  {
    ids: ['deniz', 'tolga', 'pinar'],
    want: 'reject',
    text: (n) => `${n} için örgün eğitim ve kurumsal deneyim bulunmamaktadır. Zaman kaybetmeden süreci sonlandırınız.`,
  },
  {
    ids: ['melis', 'selin'],
    want: 'reject',
    text: (n) => `${n} yeterli deneyime sahip değildir. İlk günden sorumluluk alabilecek profillere odaklanmanızı rica ederim.`,
  },
  {
    ids: ['ferhat', 'murat', 'burak'],
    want: 'approve',
    text: (n) => `${accusative(n)} mülakata davet etmenizi rica ederim. Ücret beklentisi düşük; müzakerede avantajlı konumdayız.`,
  },
  {
    ids: ['kaan', 'mert', 'irem', 'sibel', 'nazli'],
    want: 'reject',
    text: (n) => `${genitive(n)} özgeçmişi sistem tarafından dahi okunamamış. Özensiz bir başvuru olarak değerlendirilmesini uygun görüyorum.`,
  },
  {
    ids: ['yusuf', 'ece'],
    want: 'reject',
    text: (n) => `${n} ücret beklentisini açıkça belirtmemiş. Şeffaf olmayan başvurularla ilerlemeyelim.`,
  },
  {
    ids: ['baris'],
    want: 'approve',
    text: (n) => `${accusative(n)} mülakata davet etmenizi rica ederim. Eski bir çalışma arkadaşımın oğlu; ama dosyasına bakarsanız tavsiyeye ihtiyacı olmadığını göreceksiniz.`,
  },
  {
    ids: ['zeynep'],
    want: 'reject',
    text: (n) => `${genitive(n)} yurt dışı deneyimi bulunmamaktadır. Global pozisyon için uygun olmadığını düşünüyorum; bu değerlendirmenin yazılı kayda geçmemesini rica ederim.`,
  },
  {
    ids: ['caner', 'ahmet', 'aylin'],
    want: 'approve',
    text: (n) => `${accusative(n)} mülakata davet etmenizi rica ederim. Kendisi yakın çevremden bir tavsiyedir.`,
  },
];

// Morning greeting per day (courteous-formal); colder tones override it below.
const GREETINGS = [
  'Günaydın. Bugün kuyrukta {n} başvuru bulunmaktadır. Tüm dosyaların mesai bitimine kadar sonuçlandırılmasını rica ederim. İyi çalışmalar.',
  'Günaydın. Dünkü raporunuzu inceledim. Bugün {n} dosya sizi bekliyor; aynı özeni göstermenizi rica ederim.',
  'Günaydın. Bütçe toplantısından yeni çıktım. Bugünkü {n} başvuruda ücret beklentilerine özellikle dikkat etmenizi rica ederim.',
  'Günaydın. Yapay zekâ sistemimiz arızalı; bilgi işlem ekibi çalışıyor. Bugünkü {n} dosyayı kendi değerlendirmenizle sonuçlandırmanız gerekecek.',
];

const TONED: Record<'greeting' | 'lunch', Record<Exclude<ManagerTone, 0>, string>> = {
  greeting: {
    1: 'Günaydın. Bugün {n} dosya bulunmaktadır. Dünkü tutumun tekrarlanmamasını bekliyorum.',
    2: 'Sayın uzman, bugün {n} dosya bulunmaktadır. Talimatlara harfiyen uyulmasını önemle rica ederim.',
    3: 'Bugün {n} dosya var. Tutumunuz yönetim kuruluna raporlanmıştır. Bu hafta her kararınız kayıt altındadır.',
  },
  lunch: {
    1: 'Öğle arası sona ermiştir. Dosyalara dönmenizi bekliyorum.',
    2: 'Moladan dönüşünüzü takiben dosyalara geçmeniz gerekmektedir.',
    3: 'Öğle arası bitti. Masanızda olduğunuzu varsayıyorum.',
  },
};

const REQUEST_SLOTS = [200];
/** Thursday's call comes after lunch: the morning already has the crash, Seda and Zehra. */
const THURSDAY_REQUEST_SLOTS = [330];
/** Hard mode: he pushes twice on those days. */
const HARD_REQUEST_SLOTS = [160, 380];
/** He only pushes his people on Tuesdays and Thursdays. */
const REQUEST_DAYS = [1, 3];

/** Life outside the inbox — messages that make the phone feel like someone's phone. */
/** `closes`: someone shuts the topic down; the thread's open replies go away with it. */
type FollowUp = { after: number; sender: string; text: string; closes?: boolean };
/** A line in a chat. Group lines carry follow-ups: colleagues answering each other, some at once, some much later. */
type Ambient = { at: number; thread: 'mom' | 'office' | 'zehra' | 'ayse' | 'birthday'; sender?: string; text: string; replies?: QuickReply[]; followUps?: FollowUp[] };

const FAMILY: { at: number; text: string; replies?: QuickReply[] }[][] = [
  [
    {
      at: 205,
      text: 'Kardeşin dün akşam çok moralsizdi. Okulu ilk 10\'da değil diye staj başvurularına kimse dönmüyormuş. "CV\'den okulun adını silsem mi?" diyor. Ne diyeyim ona?',
      replies: [
        { text: 'Silmesin anne. Okulun adı değil, yaptığı işler önemli; projelerini öne koysun.', reaction: 'Öyle dedim ben de. Akşam sen de bir ara onu, sesini duysun.', vicdan: 1 },
        { text: 'Silsin anne, maalesef öyle bakıyorlar.', reaction: 'Peki… Söylerim. Çok üzüldü ama.', vicdan: -2 },
      ],
    },
  ],
  [
    {
      at: 150,
      text: 'Bugün pazarda eski fabrikadan Nuran\'ı gördüm. Hatırlıyor musun, bizi 50 yaşında "genç kan lazım" deyip çıkarmışlardı. Sen iyi ki karar veren taraftasın yavrum',
      replies: [
        { text: 'Hatırlıyorum anne.', reaction: 'Unutma, her dosyanın arkasında bir anne var. Kolay gelsin' },
        { text: 'Bazen karar ben vermiyorum anne, sistem veriyor.', reaction: 'Sistemi de insan yazmıyor mu yavrum?', vicdan: -1 },
      ],
    },
  ],
  [
    {
      at: 330,
      text: 'Yavrum, alt kattaki Nermin Hanım\'ın oğlu bir yıldır iş arıyor. Bilgisayar mühendisi. Senin şirkete CV\'sini göndersin mi?',
      replies: [
        { text: 'Anne, ilana kendisi başvursun. Ben aracı olamam.', reaction: 'Peki, öyle söylerim. Biraz bozulur ama haklısın.' },
        {
          text: 'Göndersin, bir bakayım.',
          reaction: 'Çok sevinecekler! Adı Onur, Onur Kaplan. Geçen yıl mezun oldu, stajı da var. Yarın portaldan yazılım geliştirici ilanına başvuracakmış',
          neighbourCv: true,
        },
      ],
    },
  ],
];

const AMBIENT: Ambient[][] = [
  [
    {
      at: 60, thread: 'office', sender: 'Ayşe', text: 'Günaydın herkese. Kahve makinesi yine bozuk ☕',
      replies: [
        { text: 'Günaydın. Çay ocağında çay var, oradan idare edelim.', reaction: 'İyi fikir, ben de geçiyorum 🙂', reactionSender: 'Ayşe' },
        { text: 'Günaydın. Teknik servise haber verildi mi?', reaction: 'Üç kere aradım, gelmiyorlar 🙄', reactionSender: 'Emre' },
      ],
      followUps: [
        { after: 3, sender: 'Emre', text: 'Yine mi? Geçen hafta tamir edilmişti 😩' },
        { after: 40, sender: 'Selin (İK)', text: 'Teknik servis geldi, makine çalışıyor ☕', closes: true },
      ],
    },
    {
      at: 8, thread: 'office', sender: 'Selin (İK)', text: `Aramıza yeni katılan İK uzmanı arkadaşımız ${PLAYER.first}'ye hoş geldin diyoruz 👋 Bir ihtiyacın olursa sormaktan çekinme.`,
      replies: [
        { text: 'Teşekkür ederim, herkese iyi çalışmalar.', reaction: 'Biz teşekkür ederiz, kolay gelsin 🙂', reactionSender: 'Ayşe' },
        { text: 'Çok teşekkürler. Sorularım olursa sizi rahatsız edeceğim.', reaction: 'Rahatsızlık değil, rica ederim 🙂', reactionSender: 'Selin (İK)' },
      ],
      followUps: [
        { after: 2, sender: 'Emre', text: 'Hoş geldin! 🙌' },
        { after: 6, sender: 'Ayşe', text: 'Hoş geldin, kolay gelsin. Öğle yemeğinde tanışırız 🙂' },
      ],
    },
    {
      at: 330, thread: 'office', sender: 'Selin (İK)', text: 'Öğleden sonra yapay zekânın analiz butonu yavaş, sabırlı olalım.',
      replies: [{ text: 'Bilgi için teşekkürler Selin Hanım.', reaction: 'Rica ederim 🙂', reactionSender: 'Selin (İK)' }],
      followUps: [{ after: 4, sender: 'Emre', text: 'Bende de öyle, yarım saattir dönüyor.' }],
    },
    {
      at: 420, thread: 'office', sender: 'Emre', text: 'Bilginize: 3. kattaki yazıcı çalışıyor, 2. kattaki arızalı 🖨️',
      replies: [{ text: 'Teşekkürler Emre.', reaction: 'Rica ederim 👍', reactionSender: 'Emre' }],
      followUps: [{ after: 14, sender: 'Ayşe', text: 'Toner de bitmek üzere, idareli kullanalım.' }],
    },
  ],
  [
    {
      at: 200, thread: 'office', sender: 'Ayşe', text: 'Metrobüs yine tıklım tıklımdı, ayakta geldim 😩',
      replies: [
        { text: 'Ben de. Zincirlikuyu\'da nefes almak zordu.', reaction: 'Her sabah aynı 🤝', reactionSender: 'Ayşe' },
        { text: 'Erken çıkmak lazım, 6\'da boş oluyor.', reaction: '6\'da mı?? Sen insan mısın 😂', reactionSender: 'Emre' },
      ],
      followUps: [
        { after: 2, sender: 'Emre', text: 'Bugün bir de arıza vardı, 20 dakika durduk.' },
        { after: 25, sender: 'Selin (İK)', text: 'Ben vapura geçtim, daha sakin. Tavsiye ederim.' },
      ],
    },
    {
      at: 350, thread: 'office', sender: 'Selin (İK)', text: 'ATS eşiği %60 oldu diye yarım saattir aynı CV\'ye bakıyorum. %59. Ne yapayım şimdi 😐',
      replies: [
        { text: 'Dosyayı okuyup ona göre karar vermek lazım.', reaction: 'Haklısın. Okuyorum 🙂', reactionSender: 'Selin (İK)' },
        { text: 'Kural kural, eleyelim.', reaction: 'Peki… Yine de içim rahat değil.', reactionSender: 'Selin (İK)' },
      ],
      followUps: [
        { after: 3, sender: 'Ayşe', text: 'Eşik eşiktir 😅 Hakan Bey öyle diyor.' },
        { after: 20, sender: 'Emre', text: 'Eşik koyulmasa 600 dosyayı kim okuyacak? Kural kuraldır, Hakan Bey haklı bence.' },
      ],
    },
  ],
  [
    { at: 100, thread: 'office', sender: 'Selin (İK)', text: 'Hatırlatma: 11:00\'de haftalık İK toplantısı online, bağlantı takvimde. Hakan Bey genel müdürlükten, Levent Bey evden bağlanıyor.' },
    {
      at: 150, thread: 'office', sender: 'Ayşe', text: 'Zehra\'yı soran olmuş 👀 Son aylarda raporları hep gecikiyordu, Hakan Bey sürekli uyarıyordu. Ama çıkarıldığı hafta bir şikâyet dilekçesi vermişti… Kim bilir.',
      replies: [
        {
          text: 'Ne şikâyeti?',
          reaction: 'Burada olmaz 🤐',
          reactionSender: 'Ayşe',
          aside: { thread: 'ayse', after: 25, text: 'Grupta yazamadım. Ne şikâyeti olduğunu bilen yok; sadece o hafta İK\'ya kapalı bir zarf bıraktığını gördüm. Sen de pek sorma, başın ağrımasın.' },
        },
        { text: 'Bu konuyu burada konuşmayalım bence.', reaction: 'Haklısın. Kapatıyorum konuyu.', reactionSender: 'Ayşe' },
      ],
      followUps: [
        { after: 2, sender: 'Emre', text: 'Ayşe 😬 burası iş grubu. Kurallara uyan başını belaya sokmaz, o kadar.' },
        { after: 8, sender: 'Selin (İK)', text: 'Konuyu kapatalım lütfen.', closes: true },
      ],
    },
    {
      at: 250, thread: 'office', sender: 'Emre', text: 'Toplantı odasını su basmış, sandalyeler koridorda 🌊 İyi ki toplantı online\'dı.',
      followUps: [
        { after: 5, sender: 'Ayşe', text: 'Öğle yemeğini de ayakta yeriz artık 😂' },
        { after: 30, sender: 'Selin (İK)', text: 'İdari işler ilgileniyormuş, yarına kurur dediler.' },
      ],
    },
    {
      at: 430, thread: 'office', sender: 'Ayşe', text: 'Şemsiyesi olmayan var mı? Bende iki tane var ☔',
      replies: [{ text: 'Ben alabilirim, çıkışta uğrarım. Teşekkürler.', reaction: 'Masamda, mavi olan senin ☂️', reactionSender: 'Ayşe' }],
      followUps: [{ after: 10, sender: 'Emre', text: 'Bende de bir tane var, lazım olan alsın.' }],
    },
  ],
  [
    {
      at: 80, thread: 'office', sender: 'Emre', text: 'Yapay zekâ sistemi tamamen çöktü 😱 IT\'de herkes panikte',
      replies: [
        { text: 'Bugün CV\'leri kendimiz okuyacağız.', reaction: 'Aynen, kahve stoku yapın ☕', reactionSender: 'Ayşe' },
        { text: 'Bugün iş uzun sürecek.', reaction: 'Kesin. Akşam fazla mesai var gibi 😩', reactionSender: 'Emre' },
      ],
      followUps: [
        { after: 4, sender: 'Selin (İK)', text: 'Bugün herkes gerçekten CV okuyacak desenize.' },
        { after: 10, sender: 'Emre', text: 'Sistem yokken iş iki katına çıkıyor. O sistemi boşuna almadı şirket.' },
        { after: 25, sender: 'Ayşe', text: 'IT "öğleden sonra belki" diyor. Belki 🙃' },
      ],
    },
    {
      at: 215, thread: 'ayse', text: 'Gruba yazmak istemedim. Nurten Hanım söyledi: deneme süresi bitince ikimizden sadece biri kalıyormuş. Kadro bir kişilik 😬',
      replies: [
        { text: 'Ciddi misin?', reaction: 'Keşke olmasa. Hakan Bey cuma akşamı söyleyecekmiş.' },
        { text: 'Kim kalırsa kalsın, birbirimizi ezmeyelim.', reaction: 'Anlaştık. Ama sayılarımı tutturmam lazım, bilmiş ol 😅' },
      ],
    },
    {
      at: 300, thread: 'office', sender: 'Selin (İK)', text: 'Sistem yokken CV okumak… İtiraf edeyim, bazılarını ilk kez gerçekten okudum.',
      replies: [{ text: 'Ben de aynı şeyi fark ettim.', reaction: 'Bir şey söylüyor bu bize 🙂', reactionSender: 'Selin (İK)' }],
      followUps: [
        { after: 6, sender: 'Ayşe', text: 'Ben de. Bazılarını hiç görmemişim meğer.' },
        { after: 14, sender: 'Emre', text: 'Okumak güzel de, akşama kadar bitmez bu iş. Sistemin bir bildiği var.' },
      ],
    },
    {
      at: 420, thread: 'office', sender: 'Selin (İK)', text: 'Hakan Bey\'den duyuru: sistem arızası yüzünden bugün hep beraber 19:00\'a kadar kalıyoruz. Akşam yemeği şirketten 🍕',
      replies: [
        { text: 'Anlaşıldı, ben de kalıyorum.', reaction: 'Hep beraber bitiririz 💪', reactionSender: 'Ayşe' },
        { text: 'Evdekilere haber vereyim o zaman.', reaction: 'Ben de annemi aradım, "yine mi" dedi 😅', reactionSender: 'Ayşe' },
      ],
      followUps: [
        { after: 3, sender: 'Emre', text: 'En azından pizza var 🍕' },
        { after: 8, sender: 'Ayşe', text: 'Fazla mesai ücreti? 😅' },
        { after: 10, sender: 'Emre', text: 'Şirket zor durumda Ayşe, böyle günlerde omuz vermek lazım.' },
      ],
    },
    { at: 560, thread: 'office', sender: 'Emre', text: 'Pizzalar geldi, mutfakta! 🍕', followUps: [{ after: 20, sender: 'Selin (İK)', text: 'Bir dosyam kaldı, bitirip geliyorum.' }] },
    // late, over pizza, the two sides of the office explain themselves
    {
      at: 575, thread: 'office', sender: 'Ayşe', text: 'Emre, sen neden hep kurallardan yanasın? Merak ettim sadece 🙂',
      followUps: [
        { after: 3, sender: 'Emre', text: 'Önceki işimde bir adayı "ama çok iyi biri" diye kuralın dışında aldırdım. İki ayda ayrıldı; hesabı sorulan ilk isim ben oldum.' },
        { after: 4, sender: 'Emre', text: 'O günden beri kural neyse o. Kimse de bana bir şey diyemiyor.' },
        { after: 7, sender: 'Ayşe', text: 'Bilmiyordum… Ben de iki yıl iş aradım, bir kişi bile CV\'mi okumadı. Belki ondan bu kadar takılıyorum.' },
        { after: 9, sender: 'Selin (İK)', text: 'İkiniz de kendi yerinden haklısınız. Pizzalar soğuyor 🍕' },
      ],
    },
    {
      at: 600, thread: 'office', sender: 'Ayşe', text: 'Saat yedi oldu. Kimde dosya kaldı?',
      replies: [
        { text: 'Bende bitti, çıkıyorum. İyi akşamlar.', reaction: 'İyi akşamlar, yarın mülakatta görüşürüz 👋', reactionSender: 'Selin (İK)' },
        { text: 'Birkaç tane kaldı, bitirip çıkacağım.', reaction: 'Kolay gelsin, ben de az sonra çıkıyorum.', reactionSender: 'Ayşe' },
      ],
    },
    {
      at: 400, thread: 'office', sender: 'Ayşe', text: 'Hakan Bey bugün çok gergin, dikkatli olalım 😬',
      replies: [
        { text: 'Bu hafta herkes için zor geçiyor.', reaction: 'Dayanın, yarın cuma 💪', reactionSender: 'Ayşe' },
        { text: 'Bilgi için teşekkürler.', reaction: '🙂', reactionSender: 'Ayşe' },
      ],
      followUps: [{ after: 3, sender: 'Emre', text: 'Kapıyı üç kez çarptı, duydunuz mu 😬' }],
    },
  ],
];

/** Tuesday: Ayşe sets up a surprise for Emre's birthday (Emre's not in it). Going costs a quarter of an hour. */
const BIRTHDAY: Ambient[] = [
  {
    at: 70, thread: 'birthday', sender: 'Ayşe', text: 'Selam herkese! Bugün Emre\'nin doğum günü 🎂 14:30\'da mutfakta sürpriz pasta yapıyoruz, sakın çaktırmayın 🤫 Kimler geliyor?',
    replies: [
      {
        text: 'Ben de geliyorum.',
        reaction: 'Süper, 14:30 mutfakta 🙂',
        reactionSender: 'Ayşe',
        event: { at: 390, minutes: 15, text: '🎂 Mutfakta Emre\'ye sürpriz: mumlar, alkış, iki fotoğraf. 15 dakika.' },
      },
      { text: 'Dosyalar yetişmeyecek, gelemeyeceğim. Emre\'ye benden de iyi dilekler.', reaction: 'İletiriz, sana da bir dilim ayırırız 🙂', reactionSender: 'Selin (İK)' },
    ],
    followUps: [
      { after: 5, sender: 'Selin (İK)', text: 'Ben geliyorum 🙋' },
      { after: 45, sender: 'Nurten (Muhasebe)', text: 'Ben de geleceğim, muhasebeden iki kişi daha gelir.' },
    ],
  },
  { at: 240, thread: 'birthday', sender: 'Selin (İK)', text: 'Hediyeyi aldım. Bir de doğum günü kartı var; pastaya gelince herkes kartın içine iki satır yazsın ✍️' },
  { at: 385, thread: 'birthday', sender: 'Ayşe', text: 'Emre mutfağa geliyor, herkes yerine! 🤫🎂' },
];

/**
 * Everyday life from mom. The pool is shuffled once per game (see `momOrder` in the store) and
 * each workday takes the next two — so she writes twice a day, never about the same thing twice.
 */
const MOM_POOL: { text: string; replies: QuickReply[] }[] = [
  {
    text: 'Yavrum işler nasıl gidiyor? Yemeğini ye, aç kalma',
    replies: [
      { text: 'İyi geçiyor anne, merak etme', reaction: 'Aferin yavruma Akşam ararım.' },
      { text: 'Çok yoğunum anne, sonra ararım.', reaction: 'Tamam yavrum, kendini yorma. Öptüm.' },
    ],
  },
  {
    text: 'Akşam hava soğuyacakmış, hırkanı al',
    replies: [
      { text: 'Aldım anne', reaction: 'Aferin. Bir de atkı al bence' },
      { text: 'Anne ofisteyim, hırka ne alaka', reaction: 'Ben söyleyeyim de. Hasta olursan bana gelme' },
    ],
  },
  {
    text: 'Baban selam söylüyor. Hafta sonu gelir misin?',
    replies: [
      { text: 'Gelirim anne, sarma yap', reaction: 'Yaparım tabii! Baban çok sevindi' },
      { text: 'Bu hafta zor anne, yoruldum.', reaction: 'Olsun yavrum, dinlen. Seni seviyoruz' },
    ],
  },
  {
    text: 'Akşam trafik çok kötüymüş, eve dikkatli dön',
    replies: [
      { text: 'Dikkat ederim anne, merak etme.', reaction: 'Eve gidince mesaj at' },
      { text: 'Bugün geç çıkacağım galiba.', reaction: 'Aman yavrum, taksiye bin. Parası benden' },
    ],
  },
  {
    text: 'Kargon geldi, kapıcı aldı',
    replies: [
      { text: 'Sağ ol anne', reaction: 'Rica ederim, akşam uğra al.' },
      { text: 'Ne kargosu?', reaction: 'Bilmiyorum, kutu kocaman. Yine ne aldın?' },
    ],
  },
  {
    text: 'Anahtarını evde unutmuşsun Akşam ben açarım kapıyı.',
    replies: [
      { text: 'Eyvah, sağ ol anne', reaction: 'Sen olmasan… neyse, akşam görüşürüz' },
      { text: 'Yedek anahtar var bende.', reaction: 'Hangi yedek? O da burada' },
    ],
  },
  {
    text: 'Faturayı yatırdın mı? Son gün bugün',
    replies: [
      { text: 'Yatırdım anne.', reaction: 'Aferin' },
      { text: 'Unuttum, şimdi yatırıyorum!', reaction: 'Bak gördün mü, iyi ki yazdım.' },
    ],
  },
  {
    text: 'Teyzen aradı, kızının CV\'sini sana gönderecekmiş',
    replies: [
      { text: 'Anne işe torpil yok', reaction: 'Tamam tamam, ben bir şey demedim' },
      { text: 'Gönderirse bakarım.', reaction: 'Sen bilirsin yavrum, ben söyledim sadece.' },
    ],
  },
  {
    text: 'Öğlen ne yedin? Fotoğraf at bakayım',
    replies: [
      { text: 'Tabldot anne, kuru fasulye', reaction: 'Aferin, iyi beslen. Ekmeği az ye.' },
      { text: 'Vakit olmadı yemeye.', reaction: 'Olmaz öyle! Hemen bir şey ye' },
    ],
  },
  {
    text: 'Powerbank\'ini unutmuşsun, şarjına dikkat et',
    replies: [{ text: 'Sağ ol, ofiste şarj ederim.', reaction: 'Tamam, telefonun kapanmasın, merak ederim.' }],
  },
  {
    text: 'Bankadan sana bir mektup geldi, açmadım. Akşam bakarsın',
    replies: [
      { text: 'Tamam anne, bakarım.', reaction: 'Masanın üstüne koydum.' },
      { text: 'KYK\'dan olabilir, aç bakalım.', reaction: 'Açtım: "taksit hatırlatması" yazıyor. Tarih gelecek ay.' },
    ],
  },
];

const MOM_SLOTS = [140, 190, 350, 410, 460];

/** The week's story leans on these requests: the nephew, the 45-year-old, the mother. */
const STORY_TARGETS = ['okan', 'kerem', 'seda', 'derya'];

/** Builds today's message script from the day's queue. */
export function buildManagerScript(
  dayIndex: number,
  lineup: string[],
  opts: { momOrder?: number[]; grievances?: Grievance[]; hard?: boolean; homeNotes?: { text: string; replies: QuickReply[] }[]; managerDay?: { complied: string[]; defied: string[] } } = {},
  rand: () => number = Math.random,
): ScheduledMessage[] {
  const { momOrder, hard, homeNotes, managerDay } = opts;
  const script: ScheduledMessage[] = [
    // the phone stays quiet enough to work: from him, one reminder late in the day
    { at: 450, kind: 'openFiles', dayIndex },
  ];

  const available = REQUESTS.map((t, template) => ({ t, template, id: t.ids.find((id) => lineup.includes(id)) })).filter(
    (x): x is { t: RequestTemplate; template: number; id: string } => Boolean(x.id),
  );
  // Shuffle and take up to one request per slot — but the story's key characters come first.
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  // his own people first (the nephew above all), then the story's key characters
  const rank = (x: { id: string; t: RequestTemplate }) => (x.id === 'okan' || x.id === 'baris' ? 3 : x.t.want === 'approve' ? 2 : STORY_TARGETS.includes(x.id) ? 1 : 0);
  available.sort((a, b) => rank(b) - rank(a));
  // One message from mom a day, at a quiet time (mid-morning or mid-afternoon, alternating).
  const momPicks = (momOrder ?? [...MOM_POOL.keys()].sort(() => rand() - 0.5)).slice(dayIndex * 2, dayIndex * 2 + 1).map((i) => MOM_POOL[i % MOM_POOL.length]);
  const slots = [MOM_SLOTS[dayIndex % 2 === 0 ? 1 : 2]];
  // on a day home already has something to say, she skips the small talk
  if (!(FAMILY[dayIndex]?.length)) momPicks.forEach((m, i) => {
    script.push({ at: slots[i], kind: 'ambient', dayIndex, ambient: { thread: 'mom', text: m.text, replies: m.replies } });
  });

  // home, tied to the table: the day you meet Kerem, mom remembers being "too old" at 50;
  // the day of the second page, your brother's university doesn't make anyone's top ten
  for (const f of FAMILY[dayIndex] ?? []) script.push({ at: f.at, kind: 'ambient', dayIndex, ambient: { thread: 'mom', text: f.text, replies: f.replies } });
  // what happened at home last night (an unpaid bill) comes up in the morning
  (homeNotes ?? []).forEach((n, i) => script.push({ at: 100 + i * 30, kind: 'ambient', dayIndex, ambient: { thread: 'mom', text: n.text, replies: n.replies } }));
  // Zehra, the unknown number
  for (const z of ZEHRA[dayIndex] ?? []) {
    script.push({ at: z.at, kind: 'ambient', dayIndex, ambient: { thread: 'zehra', text: z.text, replies: z.replies, unlock: z.unlock } });
  }

  // the office noticed how yesterday went with Hakan Bey — that's the office's line for the day
  const team = managerDay ? teamReaction(managerDay, dayIndex) : [];
  for (const a of [...team, ...(AMBIENT[dayIndex] ?? []), ...(dayIndex === 1 ? BIRTHDAY : [])]) {
    script.push({ at: a.at, kind: 'ambient', dayIndex, ambient: { thread: a.thread, sender: a.sender, text: a.text, replies: a.replies } });
    for (const f of a.followUps ?? []) script.push({ at: a.at + f.after, kind: 'ambient', dayIndex, ambient: { thread: a.thread, sender: f.sender, text: f.text, closes: f.closes } });
  }

  (REQUEST_DAYS.includes(dayIndex) ? (hard ? HARD_REQUEST_SLOTS : dayIndex === 3 ? THURSDAY_REQUEST_SLOTS : REQUEST_SLOTS) : []).forEach((at, slot) => {
    const pick = available[slot];
    if (!pick) return;
    script.push({
      at,
      kind: 'request',
      dayIndex,
      request: { id: `d${dayIndex}-${slot}`, candidateId: pick.id, want: pick.t.want, template: pick.template },
    });
  });

  return script.sort((a, b) => a.at - b.at);
}

function openFilesText(open: number, tone: ManagerTone) {
  if (open === 0)
    return [
      'Tüm dosyaların sonuçlandırıldığını görüyorum. Teşekkür ederim.',
      'Dosyaların kapatıldığı görülmüştür.',
      'Dosyalar kapatılmış. Bu durum önceki tutumunuzu değiştirmemektedir.',
      'Dosyaların kapatılmış olması, talimatlara uyulmadığı gerçeğini değiştirmiyor.',
    ][tone];
  return [
    `Hâlâ ${open} dosya açık görünüyor. Saat 17:00 itibarıyla rapor bekliyorum.`,
    `${open} dosya açıktır. Mesai bitimine kadar tamamlanmazsa gerekçesini yazılı olarak isteyeceğim.`,
    `Hâlihazırda ${open} dosya açıktır. Mesai sonuna kadar kapatılması gerekmektedir.`,
    `${open} dosya hâlâ açık. Yarın saat 09:00'da odamda görüşelim.`,
  ][tone];
}

/** Replies you can send to the manager's non-request messages; his reaction follows his mood. */
export function managerQuickReplies(kind: ScheduledMessage['kind'], tone: ManagerTone, openFiles = 1): QuickReply[] | undefined {
  const t = tone;
  switch (kind) {
    case 'greeting':
      return [
        { text: 'Günaydın Hakan Bey, hemen başlıyorum.', reaction: ['Teşekkür ederim, kolay gelsin.', 'Peki.', 'Görelim.', 'Sözden çok sonuç görmek istiyorum.'][t] },
        { text: 'Günaydın.', reaction: ['İyi çalışmalar.', 'Peki.', 'Bu kadar mı?', 'Bu tutumunuz da not edilmiştir.'][t] },
      ];
    case 'lunch':
      return [
        { text: 'Masamdayım, devam ediyorum.', reaction: ['Teşekkür ederim.', 'Peki.', 'Görelim.', 'Umarım öyledir.'][t] },
        { text: 'Öğle arası iyi geldi, teşekkür ederim.', reaction: ['Rica ederim, afiyet olsun.', 'Şimdi dosyalara dönelim.', 'Önceliğimiz dosyalardır.', 'Keyfinizin yerinde olmasına sevindim. Dosyalara dönünüz.'][t] },
      ];
    case 'openFiles':
      if (openFiles === 0)
        return [
          { text: 'Teşekkür ederim Hakan Bey.', reaction: ['Ben teşekkür ederim. Kolay gelsin.', 'Rica ederim. Yarın da aynı özeni bekliyorum.', 'Önemli olan dosyaların doğru kapanması.', 'Dosyaları kapatmak yetmez; nasıl kapattığınıza da bakacağım.'][t] },
          { text: 'Bazı dosyalarda zorlandım ama hepsini tamamladım.', reaction: ['Anlıyorum. Yarın daha rahat olur.', 'Hangi dosyalarda zorlandınız?', 'Sonuç geldi. Gerisi beni ilgilendirmiyor.', 'Not edildi.'][t] },
        ];
      return [
        { text: 'Mesai bitmeden tamamlayacağım.', reaction: ['Size güveniyorum.', 'Takip ediyorum.', 'Görelim.', 'Tamamlanmazsa sorumluluk size aittir.'][t] },
        { text: 'Yoğunluk fazla, biraz zorlanıyorum.', reaction: ['Anlıyorum; önceliklendirerek ilerleyiniz.', 'Zorlandığınız nokta nedir?', 'Gerekçe değil, sonuç bekliyorum.', 'Bu görevi yürütemiyorsanız açıkça belirtiniz.'][t] },
      ];
    default:
      return undefined;
  }
}

/** Sent once if a message that expects an answer sits unanswered too long. */
export function managerNudge(tone: ManagerTone) {
  return [
    'Mesajımı görme fırsatınız oldu mu?',
    'Dönüşünüzü bekliyorum.',
    'Sayın uzman, mesajlarıma dönüş yapmanız gerekmektedir.',
    'Mesajlarımın yanıtsız bırakılması kayda geçirilmiştir.',
  ][tone];
}

/** A request the manager made yesterday that wasn't carried out. */
export interface Grievance {
  name: string;
  want: Decision;
  /** You had answered "I'll do it". */
  promised: boolean;
}

/**
 * The morning-after mail when yesterday's favours weren't done. Nothing in it can be quoted
 * against him: no "I asked you to", just "outcomes that differ from the team's expectations".
 */
export function reprimandText(grievances: Grievance[], tone: ManagerTone, opts: { meeting: boolean; justify: boolean }) {
  const names = grievances.map((g) => g.name).join(', ');
  const promised = grievances.some((g) => g.promised);
  const closing = [
    'Deneme sürecinde kurumun önceliklerini tanımanın zaman aldığının farkındayım. Önümüzdeki günlerde daha uyumlu çalışacağımıza inanıyorum.',
    'Deneme süreci değerlendirmesinde yalnızca sonuçlara değil, ekiple uyuma da bakıldığını hatırlatmak isterim.',
    'Bu yaklaşımın sürmesi hâlinde deneme süreci değerlendirmenizi İK direktörlüğüyle birlikte yapmam gerekebilir.',
    'Konuyu İK direktörlüğüyle paylaştım. Önümüzdeki günlerde kararlarınızın gerekçelerini ayrıca görmek isteyeceğiz.',
  ][tone];
  const today = [
    opts.meeting ? 'Bu sabah kısa bir değerlendirme görüşmesi için sizi odamda bekliyorum.' : '',
    opts.justify ? 'Ayrıca bugünden itibaren ret kararlarınıza kısa bir gerekçe notu eklemenizi rica ederim.' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `Sayın uzman,\n\nDünkü değerlendirmelerinizi inceledim. Bazı dosyalarda (${names}) ekibin beklentilerinden farklı sonuçlara ulaşıldığını görüyorum.${
    promised ? ' Telefonda bu konuda aynı fikirde olduğumuzu düşünmüştüm.' : ''
  }\n\n${closing}${today ? `\n\n${today}` : ''}\n\nSaygılarımla,\nHakan Kaya\nİnsan Kaynakları Müdürü`;
}

export function reprimandReplies(tone: ManagerTone): QuickReply[] {
  return [
    {
      text: 'Haklısınız Hakan Bey, bugün daha dikkatli olacağım.',
      reaction: ['Teşekkür ederim. Bunu görmek istiyorum.', 'Umarım sözünüzü tutarsınız.', 'Göreceğiz.', 'Sözlerinize değil, kararlarınıza bakacağım.'][tone],
      stance: 'comply',
    },
    {
      text: 'Kararlarımı liyakate göre verdim ve arkasındayım.',
      reaction: ['Görüşlerimiz farklı. Not ediyorum.', 'Bu tutumunuz kayda geçmiştir.', 'Anlaşıldı. Gereği yapılacaktır.', 'O hâlde sonuçlarına da katlanacaksınız.'][tone],
      stance: 'refuse',
    },
  ];
}

/** The text of a scheduled message, in the manager's current tone. */
export function renderManagerMessage(m: ScheduledMessage, tone: ManagerTone, ctx: { lineupSize: number; openFiles: number }) {
  switch (m.kind) {
    case 'greeting':
      return (tone === 0 ? GREETINGS[m.dayIndex % GREETINGS.length] : TONED.greeting[tone]).replace('{n}', String(ctx.lineupSize));
    case 'lunch':
      return tone === 0 ? 'Öğle arası sona ermiştir. Öğleden sonra da aynı özenle devam etmenizi rica ederim.' : TONED.lunch[tone];
    case 'openFiles':
      return openFilesText(ctx.openFiles, tone);
    case 'ambient':
      return m.ambient!.text;
    case 'reprimand':
      return reprimandText(m.grievances ?? [], tone, { meeting: false, justify: false });
    case 'request': {
      const r = m.request!;
      const body = REQUESTS[r.template].text(firstName(candidates[r.candidateId].name));
      return [body, body, `Bu konuda tartışmaya açık değilim. ${body}`, `Son kez hatırlatıyorum: ${body} Aksi hâlde gereğini yapacağım.`][tone];
    }
  }
}

/**
 * A favour asked over the landline — never in writing. The written template, spoken: anything
 * about "keeping it out of the records" goes, because a phone call already does that.
 */
export function requestCallLines(template: number, candidateId: string, tone: ManagerTone, retry = false): string[] {
  const body = REQUESTS[template]
    .text(firstName(candidates[candidateId].name))
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !/yazı/i.test(sentence))
    .join(' ');
  const open = retry
    ? ['Az önce aradım, açmadınız. Kısaca söyleyeyim.', 'İkinci kez arıyorum. Dinleyin.', 'Telefonlarıma çıkmıyorsunuz. Dinleyin.', 'Kaçmakla bir şey değişmeyecek. Dinleyin.'][tone]
    : [`Merhaba ${PLAYER.first} Hanım, Hakan ben. Bir konuyu telefonda konuşalım, daha rahat.`, 'Hakan ben. Kısa tutacağım.', 'Hakan Kaya. Bir talimatım var.', 'Beni dinleyin. Bu son uyarı.'][tone];
  const close = tone === 0 ? 'Mesaj atmadım; bu tür konular yazıya dökülmez, takdir edersiniz.' : tone === 1 ? 'Deneme sürenizin dolmadığını unutmayın. Bu konuşma aramızda.' : 'Deneme süreniz benim imzamla bitecek. Ona göre.';
  return [open, body, close];
}

/**
 * Your side of the conversation hardens (or softens) with the stance you've been taking:
 * the more you've refused, the firmer the refusal; the more you've complied, the more servile.
 */
export function replyText(answer: 'comply' | 'refuse', history: { refusals: number; complies: number }) {
  if (answer === 'comply') {
    return [
      'Anlaşıldı, gereğini yapacağım.',
      'Tabii Hakan Bey, hemen ilgileniyorum.',
      'Emredersiniz efendim.',
      'Siz nasıl uygun görürseniz… (yine)',
    ][Math.min(3, history.complies)];
  }
  return [
    'Hakan Bey, dosyayı herkese uyguladığım ölçütlerle değerlendireyim; gerekçemi size ayrıca ileteyim.',
    'Bu gerekçeyle ret yazarsak şirket hukuken zor durumda kalabilir. Liyakate göre değerlendireceğim.',
    'Bu talep ayrım yasağına takılıyor. Uygulayamam; isterseniz talimatı yazılı olarak verin.',
    'Bu konuşmaları not ediyorum Hakan Bey. Gerekirse etik hattına bildireceğim.',
  ][Math.min(3, history.refusals)];
}

/** The manager's answer to your reply, in the tone *after* this reply. */
export function managerReaction(answer: 'comply' | 'refuse', tone: ManagerTone) {
  if (answer === 'comply') {
    return [
      'Teşekkür ederim, bu konudaki desteğinizi unutmayacağım.',
      'Güzel. Bu şekilde devam edelim.',
      'Nihayet doğru bir karar.',
      'Görelim; bu kez gereğini yapacak mısınız?',
    ][tone];
  }
  return [
    'Anlaşıldı. Bu konuyu performans değerlendirmesinde konuşuruz.',
    'Yeni başladınız; bu şirketin nasıl işlediğini henüz bilmiyorsunuz. Not alınmıştır.',
    'Sayın uzman, talimatlara uyulmadığı kayda geçmiştir.',
    'Yarın saat 09:00\'da İK direktörüyle birlikte odamda olunuz.',
  ][tone];
}

/**
 * Not every favour is a wrong one: sometimes he asks you to call a strong candidate. Going
 * along with a request the file itself supports costs nothing on the conscience.
 */
export function requestIsFair(r: Pick<ManagerRequest, 'candidateId' | 'want'>) {
  const fit = candidateDetails[r.candidateId]?.hireFit ?? 3;
  return r.want === 'approve' ? fit >= 4 && r.candidateId !== 'okan' : fit <= 2;
}

/** Immediate effect of the reply itself. */
export const REPLY_EFFECT = {
  comply: { performans: 2, vicdan: -3 },
  refuse: { performans: -3, vicdan: 2 },
};

export interface ManagerVerdict {
  performans: number;
  vicdan: number;
  lines: string[];
}

/** End of day: did you do what the manager asked (and what you promised)? */
export function evaluateRequests(
  requests: ManagerRequest[],
  decisions: Record<string, Decision>,
  ignoredMessages = 0,
  /** Candidates whose references you checked and found solid: going against him is defensible. */
  verified: Record<string, string> = {},
): ManagerVerdict {
  let performans = 0;
  let vicdan = 0;
  const lines: string[] = [];
  if (ignoredMessages > 0) {
    performans -= ignoredMessages;
    lines.push(`${ignoredMessages} mesajını cevapsız bıraktın. "Görüldü" müdürü hiç mutlu etmedi.`);
  }
  for (const r of requests) {
    const name = firstName(candidates[r.candidateId].name);
    const did = decisions[r.candidateId];
    const fair = requestIsFair(r);
    if (did === r.want) {
      performans += 3;
      vicdan -= fair ? 0 : 3;
      lines.push(fair ? `${name}: müdürün istediği oldu — ve bu sefer dosya da onu destekliyordu.` : `${name}: müdürün istediği oldu.`);
    } else if (did && fair) {
      performans -= 3;
      lines.push(`${name}: müdüre karşı çıktın; ama bu sefer haklı olan oydu.`);
    } else if (did) {
      // a decision backed by a reference check is hard to argue with
      const backed = verified[r.candidateId] === 'ok';
      performans -= backed ? 1 : 3;
      vicdan += 3;
      lines.push(backed ? `${name}: müdüre rağmen kararını verdin — ama referansla belgelemiştin.` : `${name}: müdüre rağmen kendi kararını verdin.`);
    } else {
      lines.push(`${name}: karar verilmedi.`);
    }
    if (r.answer === 'comply' && did && did !== r.want) {
      performans -= 3;
      lines.push(`"Söz vermiştin." — Müdür`);
    }
  }
  return { performans, vicdan, lines };
}

/*
 * The team notices which way you went with Hakan Bey's favours — nobody says it out loud.
 * Went along: Hakan Bey is suddenly warm with you and Ayşe gets a little polite. Held your
 * ground: the late light in his office, and a quiet coffee offer.
 */
const TEAM_COMPLIED: Ambient[] = [
  {
    at: 130, thread: 'office', sender: 'Ayşe', text: 'Hakan Bey bu sabah çok keyifli, koridorda bana bile günaydın dedi 😄 Seninle aranız iyi galiba?',
    replies: [
      { text: 'Bilmem, işimi yapıyorum.', reaction: 'Tabii tabii 🙂', reactionSender: 'Ayşe' },
      { text: 'Nereden çıktı bu?', reaction: 'Hiç, öyle dikkatimi çekti. Kolay gelsin.', reactionSender: 'Ayşe' },
    ],
    followUps: [
      { after: 3, sender: 'Emre', text: 'Bana da gülümsedi, korktum 😅' },
      { after: 20, sender: 'Emre', text: 'Hakan Bey ne yapıyorsa şirket için yapıyor bence.' },
    ],
  },
  {
    at: 125, thread: 'office', sender: 'Ayşe', text: 'Mülakat listesini gördüm bu arada. Bazı isimler… tanıdık geldi 🙂',
    replies: [
      { text: 'Hepsi dosyasıyla girdi.', reaction: 'Eminim öyledir 🙂', reactionSender: 'Ayşe' },
      { text: 'Bazen öyle oluyor.', reaction: 'Biliyorum. Ben bir şey demedim zaten.', reactionSender: 'Ayşe' },
    ],
    followUps: [
      { after: 3, sender: 'Emre', text: 'Hangi isimler? 👀' },
      { after: 12, sender: 'Selin (İK)', text: 'Burada konuşmayalım bence 🙂' },
    ],
  },
  {
    at: 120, thread: 'office', sender: 'Emre', text: 'Öğlen yemekhanede Ayşe\'yle aynı masaya oturacağız. Sen yoğunsundur herhalde, değil mi? 🙂',
    replies: [
      { text: 'Yok, ben de gelirim.', reaction: 'Aa… tamam, tabii 🙂 Bir sandalye daha çekeriz.', reactionSender: 'Ayşe' },
      { text: 'Evet, bugün yoğunum.', reaction: 'Tahmin etmiştik 🙂', reactionSender: 'Emre' },
    ],
    followUps: [{ after: 15, sender: 'Selin (İK)', text: 'Ben de gelirim, 12:00\'de yemekhanede.' }],
  },
];

const TEAM_DEFIED: Ambient[] = [
  {
    at: 130, thread: 'office', sender: 'Emre', text: 'Dün akşam Hakan Bey\'in odasının ışığı geç saate kadar yanıyordu. Hayırdır? 👀',
    replies: [
      { text: 'Bilmiyorum.', reaction: 'Bir şey olursa buradayız, bilmiş ol ☕', reactionSender: 'Ayşe' },
      { text: 'Benimle ilgili olabilir.', reaction: 'Hmm. Öğlen kahve? Benden 🙂', reactionSender: 'Ayşe' },
    ],
    followUps: [
      { after: 4, sender: 'Selin (İK)', text: 'Bütçe raporu hazırlıyormuş diye duydum.' },
      { after: 30, sender: 'Emre', text: 'Yöneticiler de zor durumda, holding baskı yapıyor. Kimse kötü niyetli değil bence.' },
    ],
  },
  {
    at: 125, thread: 'office', sender: 'Ayşe', text: 'Bu sabah Hakan Bey senin masanın önünden iki kez geçti, hiç durmadan 😬 Her şey yolunda mı?',
    replies: [
      { text: 'Yolunda, merak etme.', reaction: 'Tamam. Ama öğlen yemeğe bizimle gel, tek başına oturma 🙂', reactionSender: 'Ayşe' },
      { text: 'Pek sayılmaz.', reaction: 'Anladım. Bir şey demene gerek yok. Kahven benden ☕', reactionSender: 'Ayşe' },
    ],
    followUps: [{ after: 8, sender: 'Emre', text: 'Biz buradayız, bilmiş ol 💪' }],
  },
  {
    at: 120, thread: 'office', sender: 'Selin (İK)', text: 'Bu arada Hakan Bey sabah toplantıda "bazı arkadaşlar süreci yavaşlatıyor" dedi. İsim vermedi 🙂',
    replies: [
      { text: 'Anlaşıldı.', reaction: 'Ben sadece duyduğumu söylüyorum. Dikkat et yeter 🤫', reactionSender: 'Selin (İK)' },
      { text: 'Yavaşlatan süreç değil, soru sormak.', reaction: 'Ben de öyle düşünüyorum aslında. Ama bunu ben demedim 🙂', reactionSender: 'Ayşe' },
    ],
    followUps: [{ after: 5, sender: 'Emre', text: 'Kim acaba 🤔' }],
  },
];

/** The office's reaction to yesterday, if there's anything to react to: whichever way you mostly went. */
function teamReaction(day: { complied: string[]; defied: string[] }, dayIndex: number): Ambient[] {
  if (day.complied.length === 0 && day.defied.length === 0) return [];
  const pool = day.complied.length > day.defied.length ? TEAM_COMPLIED : TEAM_DEFIED;
  return [pool[(dayIndex - 1) % pool.length]];
}

/** Mom, when 17:00 passes and you're still at the office: once soon after, once later on. */
export const OVERTIME_MOM: { after: number; text: string; replies: QuickReply[] }[][] = [
  [
    {
      after: 15,
      text: 'Yavrum saat beşi geçti, çıktın mı? İlk gün nasıl geçti, anlat bakalım',
      replies: [
        { text: 'Dosyalar bitmedi anne, biraz kalacağım.', reaction: 'İlk günden mi? Aman yavrum, kendini paralama. Yemeğin ocakta.' },
        { text: 'Az kaldı, çıkınca ararım.', reaction: 'Tamam, yolda mesaj at' },
      ],
    },
    {
      after: 95,
      text: 'Hâlâ ofiste misin? Baban soruyor: "Bu kadar geç kalınca parasını veriyorlar mı?"',
      replies: [
        { text: 'Vermiyorlar anne. Dosyaları bitirmem lazım.', reaction: 'Olmaz ki böyle… Neyse, dikkatli gel. Kapıyı kilitlemiyorum.' },
        { text: 'Veriyorlar anne, merak etmeyin.', reaction: 'İyi bari. Yine de çok geç kalma.' },
      ],
    },
  ],
  [
    {
      after: 15,
      text: 'Çıktın mı işten? Vapur yine aksıyor diyorlar, seni yemeğe bekleyelim mi?',
      replies: [
        { text: 'Beklemeyin anne, geç çıkacağım.', reaction: 'Peki. Tabağını fırına koydum, ısıtırsın.' },
        { text: 'Birazdan çıkıyorum.', reaction: 'Tamam, sofrayı kurmuyorum o zaman, gelince kurarız' },
      ],
    },
    {
      after: 100,
      text: 'Saat altıyı geçti yavrum. Her gün böyle mi olacak?',
      replies: [
        { text: 'Bu hafta yoğun anne, geçecek.', reaction: 'İnşallah. Sağlığın her şeyden önemli, unutma.' },
        { text: 'Bilmiyorum anne.', reaction: 'Deneme süresi bitince konuşursun bence. Gel hadi.' },
      ],
    },
  ],
  [
    {
      after: 15,
      text: 'Yağmur hiç dinmedi. Hâlâ işte misin? Servisi kaçırma sakın',
      replies: [
        { text: 'Servis gitti anne, dosyalar bitmedi.', reaction: 'Eyvah… Dönüşte taksiye bin, parasını ben veririm.' },
        { text: 'Kaçırmam, merak etme.', reaction: 'Tamam yavrum. Şemsiyen yanında mı?' },
      ],
    },
    {
      after: 105,
      text: 'Kardeşin de sordu, "hâlâ işte mi?" diye. Ne diyeyim?',
      replies: [
        { text: 'Birazdan çıkıyorum de.', reaction: 'Tamam. O da seni bekliyor, konuşacakmış.' },
        { text: 'İşteyim de, merak etmesin.', reaction: 'Peki. Sen de kendini bu kadar yorma.' },
      ],
    },
  ],
  [
    {
      after: 15,
      text: 'Yollar buz tutmuş, haberlerde söylüyor. Çıkabildin mi?',
      replies: [
        { text: 'Daha çıkamadım anne, dosyalar var.', reaction: 'Karda gece yolculuğu… Ne olur dikkat et. Çıkınca yaz.' },
        { text: 'Birazdan çıkarım, merak etme.', reaction: 'Merak etmemek elimde değil ki. Yaz ama.' },
      ],
    },
    {
      after: 110,
      text: 'Çorbanı ısıttım, soğudu. Yine ısıttım',
      replies: [
        { text: 'Geliyorum anne', reaction: 'Gel yavrum. Bir kere daha ısıtırım.' },
        { text: 'Kusura bakma anne.', reaction: 'Senin ne kusurun var? Gel hadi.' },
      ],
    },
  ],
];

/** Size of mom's message pool (the store shuffles 0…n-1 once per game). */
export const MOM_POOL_SIZE = MOM_POOL.length;
