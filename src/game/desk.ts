/*
 * The desk: what sits on it besides the computer.
 *
 *  - The landline rings with calls the mobile never gets: reception, IT, payroll, once a
 *    candidate who found the number — and the manager, whenever he wants a favour for (or
 *    against) a candidate. Those never come in writing. Let it ring too
 *    long and it's a missed call — which has its own consequences.
 *  - The coffee mug: a few sips a day, each one costs a few minutes and lets a thought through.
 *  - The flower reception brings up on your first morning. Nobody else will water it.
 */

export interface CallChoice {
  text: string;
  reply: string;
  performans?: number;
  vicdan?: number;
  /** Hand over to another scene right away (reception → the lobby). */
  next?: string;
  /** Counts as honest feedback to this candidate. */
  honestFor?: string;
  /** Taking back two invitations: the mail lies ("sent by mistake") or says what happened. */
  revoke?: 'draft';
  /** A process change you pitched to Hakan Bey, and whether he took it. */
  reform?: { kind: ReformKind; accepted: boolean };
}

/** What you can pitch after Hakan Bey's confession instead of just going along or refusing. */
export type ReformKind = 'blind' | 'structured' | 'audit';

export interface DeskCall {
  id: string;
  /** What's riding on it, shown on the handset (e.g. the bonus a favour pays). */
  stakes?: string;
  /** You dialled this one. */
  outgoing?: boolean;
  /** Face to face, not over the phone. */
  inPerson?: boolean;
  /** Someone walks up to your desk: it starts right away instead of ringing. */
  walkIn?: boolean;
  day: number;
  /** Workday minute it starts ringing. */
  at: number;
  caller: string;
  /** Shown under the caller's name while it rings. */
  line: string;
  lines: string[];
  choices: CallChoice[];
  /** Game minutes the call takes. */
  minutes: number;
  missed: { note: string; performans?: number; vicdan?: number };
  /** This call brings the welcome flowers. */
  flower?: boolean;
}

/** Game minutes the landline rings before it counts as a missed call. */
export const RING_MINUTES = 25;
/** The manager rings back this long after you let a favour call ring out. */
export const CALLBACK_MINUTES = 45;
export const REQUEST_CALL_PREFIX = 'req:';

export const DESK_CALLS: DeskCall[] = [
  {
    id: 'reception-flower',
    day: 0,
    at: 18,
    caller: 'Gülay Hanım',
    line: 'Resepsiyon · dahili 100',
    lines: ['Günaydın! Adınıza bir çiçek geldi, kartında "Aramıza hoş geldin" yazıyor.', 'Şimdi çıkarıp masanıza bırakıyorum. Hayırlı olsun yeni işiniz!'],
    choices: [
      { text: 'Çok teşekkür ederim Gülay Hanım.', reply: 'Rica ederim canım. Bir şey olursa dahili 100, ben hep buradayım.' },
      { text: 'Kimden geldiğini biliyor musunuz?', reply: 'İK ekibinden. Her yeni gelene gönderilir… Senden öncekine de gelmişti.' },
    ],
    minutes: 3,
    missed: { note: 'Resepsiyon açamayınca çiçeği masana bırakmış.' },
    flower: true,
  },
  {
    id: 'it-culture',
    day: 0,
    at: 140,
    caller: 'Burak',
    line: 'Bilgi İşlem · dahili 330',
    lines: ['Selam, IT\'den Burak. Yapay zekâ sistemine gece "kültür uyumu" modülü yüklendi.', 'Skorlar biraz oynayabilir, haberin olsun.'],
    choices: [
      { text: 'Neye göre ölçüyor bu kültür uyumunu?', reply: 'Valla bilmiyorum. Lisans firması kapalı kutu gönderiyor, biz sadece kuruyoruz.', vicdan: 1 },
      { text: 'Tamam, teşekkürler.', reply: 'Kolay gelsin.' },
    ],
    minutes: 3,
    missed: { note: 'IT aramış, açmadın. Sistemde bir şey değişmiş olabilir.' },
  },

  {
    id: 'seda-call',
    day: 2,
    at: 300,
    caller: 'Seda Uysal',
    line: 'Dış hat · santralden aktarıldı',
    lines: ['Merhaba, kusura bakmayın, santralden rica ettim. Seda Uysal, yazılım geliştirici başvurusu.', 'Kreşin çıkış saati yaklaşıyor, kısa tutacağım… Sadece bir dönüş olacak mı, onu bilmek istiyorum.'],
    choices: [
      { text: 'Süreç devam ediyor, size döneceğiz.', reply: 'Tamam… Teşekkür ederim. Bekliyorum o zaman.' },
      { text: 'Dosyanıza bizzat ben bakacağım, söz.', reply: 'Bunu duymak… Çok sağ olun. Gerçekten.', vicdan: 2, performans: -1 },
    ],
    minutes: 5,
    missed: { note: 'Dış hattan biri aradı. Santral "bir hanım, adını bırakmadı" dedi.', vicdan: -1 },
  },
  {
    id: 'hakan-crash',
    day: 3,
    at: 75,
    caller: 'Hakan Bey',
    line: 'İK Müdürü · dahili 210',
    lines: ['Sistem çökmüş. Bugün kararları siz vereceksiniz.', 'Yanlış birini çağırırsanız hesabını da siz verirsiniz. Ona göre.'],
    choices: [
      { text: 'Anlaşıldı Hakan Bey.', reply: 'Güzel.' },
      { text: 'Belki bu sefer kararlar daha adil olur.', reply: '…Ne demek istiyorsunuz? Neyse. İşinize bakın.', vicdan: 1, performans: -1 },
    ],
    minutes: 3,
    missed: { note: 'Hakan Bey aradı, açmadın. Sonra koridorda yüzüne baktı, bir şey demedi.', performans: -2 },
  },
  {
    id: 'hakan-confession',
    day: 3,
    at: 375,
    caller: 'Hakan Bey',
    line: 'İK Müdürü · dahili 210 · kapısı kapalı',
    lines: [
      'Hakan ben. Kapımı kapattım, telefonda konuşalım. Bir dakikan var mı? Resmî değil bu.',
      'Holding bu çeyrek %15 kadro kesintisi istiyor. Sayıları tutturamazsak "maliyet" diye bizim ekipten üç kişi gidecek. Sen dahil.',
      'Ben de 45 yaşımda bir sabah işsiz kaldım. Kimse CV\'me bakmadı. O tabloyu ben yazmadım ama… imzaladım.',
    ],
    choices: [
      { text: 'Anlıyorum Hakan Bey. Kolay değil.', reply: 'Sağ ol. Bunu kimseye söylemedim. Yarın mülakatlar… ne yaparsan yap, bilerek yap.', performans: 2 },
      { text: 'Bu, adaylara yapılanı haklı çıkarmaz.', reply: '…Haklısın. Ama haklı olmak kirayı ödemiyor. Kolay gelsin.', vicdan: 3 },
      { text: 'Kolay değil. Ama bir önerim var: sayıları tutturup süreci de düzeltebiliriz.', reply: '…Söyle bakalım. İki dakikan var.', next: 'reform' },
    ],
    minutes: 6,
    missed: { note: 'Hakan Bey aradı, açmadın. Sonra kapısının önünden geçerken seni gördü; bir şey demedi.' },
  },
];

export const callsForDay = (day: number) => DESK_CALLS.filter((c) => c.day === day);
export const deskCall = (id: string) => DESK_CALLS.find((c) => c.id === id);

/* ── Coffee ── */

/** Sips in a full mug. Sipping is free; walking to the kitchen for a refill is not. */
export const COFFEE_SIPS = 6;
/** Game minutes a refill takes (the kitchen, the queue at the machine, small talk). */
export const REFILL_MINUTES = 5;

export const REFILL_THOUGHTS = [
  'Mutfağa gidip kupanı doldurdun. Makinenin önünde üç kişi vardı; beş dakika gitti.',
  'Kahve makinesi yine "su haznesini doldurun" diyordu. Doldurdun, bekledin, döndün.',
  'Mutfakta biri "yeni İK sen misin?" diye sordu. Kupanı doldurup kaçtın.',
];

/** When the day's thoughts run out. */
export const IDLE_THOUGHTS = ['Kahve iyi geldi.', 'Bir yudum daha. Ekrana dönmen lazım.', 'Kupanın sıcaklığı ellerinde.'];

/** What goes through your head over the day's coffee, per day. */
export const COFFEE_THOUGHTS: string[][] = [
  ['Filtre kahve. On bir ay işsizlikten sonra ilk sabah kahvesi.', 'Ofisin kahvesi berbat ama sıcak.', 'İki ay deneme süresi. İki ay boyunca hiçbir şeyi yanlış yapmamalısın.', 'Kira %60 zamlanmış, KYK borcu duruyor. Kahve bile acı geliyor.', 'Son yudum soğumuş.'],
  ['Dün kaç kişiyi elediğimi saymamaya çalışıyorum.', 'Masadaki telefona bakmamaya çalışıyorum.', 'Kahve dünkünden daha sert. Ya da ben daha yorgunum.', 'Annemin kart borcu… Asgariyi bu hafta yatırmam lazım.', 'Kupanın dibinde telve kalmış. Fal bakacak vakit yok.'],
  ['Yağmur camı dövüyor. Kahve sıcak, iyi ki.', 'Çekmeceye bakıyorum. Sonra kahveye.', 'Zehra kim? Bu masada ne yaşadı?', 'Kırmızı dosyayı düşünüyorum. Kahve boğazımda düğümlendi.', 'Soğudu. Her şey gibi.'],
  ['Kar yağıyor. Pencereden bakınca her şey sessiz.', 'Ekran boş. Yapay zekâ yok. Sadece ben ve dosyalar.', 'Bugün sistem yok. Kararlar gerçekten benim.', 'Kardeşimin yurt taksiti… Yine hesap yapıyorum.', 'Son yudum. Yarın cuma.'],
];

/* ── The flower ── */

export type FlowerState = 'fresh' | 'tired' | 'wilted' | 'dead';

/** Every day without fresh water takes it one step further. */
export function flowerState(currentDay: number, lastWatered: number): FlowerState {
  const dry = currentDay - lastWatered;
  return dry <= 0 ? 'fresh' : dry === 1 ? 'tired' : dry === 2 ? 'wilted' : 'dead';
}

export const FLOWER_STATE_TEXT: Record<FlowerState, string> = {
  fresh: 'Çiçekler taptaze, yaprakları parlıyor.',
  tired: 'Dünden beri su almamış. Çiçekler hafifçe sarkmış, kenarları kararmaya başlamış.',
  wilted: 'İki gündür susuz. Çiçeklerin çoğu masaya dökülmüş, yapraklar sararıyor.',
  dead: 'Kurumuş. Sapta tek çiçek kalmadı. Kartta hâlâ "Aramıza hoş geldin" yazıyor.',
};

export const FLOWER_CARD = 'Aramıza hoş geldin!\nTavrinsa Labs ailesi olarak yeni görevinde başarılar dileriz.\n— İnsan Kaynakları';
/** Walking to the water cooler with a glass and back. */
export const WATER_MINUTES = 4;
/** A glass of water for yourself at the cooler. */
export const COOLER_MINUTES = 2;
export const COOLER_THOUGHTS = [
  'İlanda "rekabetçi yan haklar" yazıyordu. Sebilin üstünde gerçekten "Yan haklar: su sebili" yazıyor. Şaka sanmıştın.',
  'Sebilin önünde muhasebeden biri: "Yan haklardan faydalanıyoruz" dedi, gülmedi.',
  'Bir bardak su. Bu hafta şirketten aldığın tek şey bu olabilir.',
  'Sebilin fokurtusu ofisteki tek sakin ses.',
];

/** Nothing interesting in the drawer — until someone tells you where to look. */
export const DRAWER_LOCKED_THOUGHT = 'Birkaç kalem, eski bir zımba, kurumuş bir sakız. Arkada sıkışmış bir şey var gibi… ama çıkmıyor.';
