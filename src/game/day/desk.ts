/*
 * Masa: bilgisayarın yanında üzerinde duran şeyler.
 *
 *  - Sabit hat, cep telefonunun hiç almadığı aramalarla çalar: resepsiyon, bilgi işlem, muhasebe,
 *    bir kez numarayı bulan bir aday ve bir adayın lehine (ya da aleyhine) rica isteyen müdür.
 *    Bunlar asla yazılı gelmez. Çok uzun çalarsa cevapsız arama olur, onun da kendi sonuçları var.
 *  - Kahve kupası: günde birkaç yudum; her biri birkaç dakikaya mal olur ve bir düşünceyi geçirir.
 *  - İlk sabah resepsiyonun getirdiği çiçek. Onu başka kimse sulamayacak.
 */

export interface CallChoice {
  text: string;
  reply: string;
  performans?: number;
  vicdan?: number;
  /** Hemen başka bir sahneye geçir (resepsiyon → lobi). */
  next?: string;
  /** Bu adaya dürüst geri bildirim sayılır. */
  honestFor?: string;
  /** İki daveti geri almak: e-posta yalan söyler ("sehven gönderildi") ya da olanı söyler. */
  revoke?: 'draft';
  /** Hakan Bey'le gizli ilişkiye etkisi (bkz. manager.ts RAPPORT). */
  rapport?: number;
  /** Bu aday mülakat listesinden düşer (Perşembe karı: "yüz yüze şart"). */
  strand?: string;
  /** Hakan Bey'e önerdiğin bir süreç değişikliği ve onu kabul edip etmediği. */
  reform?: { kind: ReformKind; accepted: boolean };
}

/** Hakan Bey'in itirafından sonra sadece uymak ya da reddetmek yerine önerebileceğin. */
export type ReformKind = 'blind' | 'structured' | 'audit';

export interface DeskCall {
  id: string;
  /** Aramada neyin söz konusu olduğu; ahizede gösterilir. */
  stakes?: string;
  /** Bunu sen aradın. */
  outgoing?: boolean;
  /** Telefonda değil, yüz yüze. */
  inPerson?: boolean;
  /** Biri masana yürüyüp gelir: çalmak yerine hemen başlar. */
  walkIn?: boolean;
  day: number;
  /** Çalmaya başladığı mesai dakikası. */
  at: number;
  caller: string;
  /** Çalarken arayanın adının altında gösterilir. */
  line: string;
  lines: string[];
  choices: CallChoice[];
  /** Aramanın sürdüğü oyun dakikası. */
  minutes: number;
  missed: { note: string; performans?: number; vicdan?: number };
  /** Bu arama hoş geldin çiçeklerini getirir. */
  flower?: boolean;
}

/** Sabit hattın cevapsız sayılmadan önce çaldığı oyun dakikası. */
export const RING_MINUTES = 25;
/** Bir rica aramasını çalmaya bıraktığında müdürün bu kadar sonra geri araması. */
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
    // Pazartesi: on bir ay önce gece 02:14'te, başvurudan 0,4 saniye sonra gelen cümle, bu kez gönderen tarafta
    id: 'reject-template',
    day: 0,
    at: 380,
    caller: 'Selin (İK)',
    line: 'İnsan Kaynakları · dahili 214',
    stakes: 'Ret şablonu',
    lines: [
      'Selam, Selin ben. Portaldaki ret bildirimlerini sana tanımladım; şablon hazır, bir okur musun?',
      'Metin şöyle: Başvurunuz için teşekkür ederiz. Değerlendirmemiz sonucunda süreç şu an için olumlu sonuçlanmamıştır. Özgeçmişiniz havuzumuzda saklanacaktır. Başarılar dileriz.',
      'Otomatik gönderim de açık: biri elenince sistem saniyesinde atıyor. Sen hiç uğraşma diye.',
    ],
    choices: [
      { text: 'Otomatik gönderimi kapat Selin. Bildirimleri ben planlayacağım.', reply: 'Emin misin? …Peki, kapattım. Hakan Bey sorarsa senin isteğin, bilsin.', vicdan: 2, performans: -1 },
      { text: 'Tamam, teşekkürler. Açık kalsın.', reply: 'Süper. Bu işin en kolay kısmı bu zaten 🙂', vicdan: -1, performans: 1 },
      { text: 'Bu şablon… ben de almıştım. Gece yarısı.', reply: '…Herkes almıştır bence. Ben de. Kapatayım mı, bırakayım mı? Sen söyle.', next: 'reject-template-2' },
    ],
    minutes: 4,
    missed: { note: 'Selin aramış: "Ret şablonunu tanımladım, otomatik gönderim açık" diye not bırakmış.' },
  },
  {
    // yukarıdaki aramanın devamı; kendi başına hiç çalmaz (gün -1)
    id: 'reject-template-2',
    day: -1,
    at: 0,
    caller: 'Selin (İK)',
    line: 'İnsan Kaynakları · dahili 214',
    lines: ['Ben de üç yıl önce, otuz küsur tane. Hepsi aynı metin. Sonra buraya girdim, şimdi ben gönderiyorum. Komik, değil mi?'],
    choices: [
      { text: 'Kapat. Kimse bunu gece 02:14\'te bir daha almasın.', reply: 'Tamam. Kapattım. …İyi ki söyledin aslında.', vicdan: 3, performans: -1 },
      { text: 'Açık kalsın. Elle yetişemem zaten.', reply: 'Haklısın, 340 başvuru var. Kolay gelsin.', vicdan: -1, performans: 1 },
    ],
    minutes: 3,
    missed: { note: '' },
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
      { text: 'Anlaşıldı Hakan Bey.', reply: 'Güzel.', rapport: 2 },
      { text: 'Belki bu sefer kararlar daha adil olur.', reply: 'Ne demek istiyorsunuz? Sistemimiz adil değil mi? Bu cümleyi bir daha duymayayım. İşinize bakın.', vicdan: 1, performans: -1, rapport: -6 },
    ],
    minutes: 3,
    missed: { note: 'Hakan Bey aradı, açmadın. Sonra koridorda yüzüne baktı, bir şey demedi.', performans: -2 },
  },
  {
    // sistemin çöktüğü sabah, kararların ilk kez tamamen insanlara kaldığı gün: öneriler güne yayılır
    id: 'hakan-confession',
    day: 3,
    at: 130,
    caller: 'Hakan Bey',
    line: 'İK Müdürü · dahili 210 · kapısı kapalı',
    lines: [
      'Hakan ben. Kapımı kapattım, telefonda konuşalım. Bir dakikan var mı? Resmî değil bu.',
      'Holding bu çeyrek %15 kadro kesintisi istiyor. Sayıları tutturamazsak "maliyet" diye bizim ekipten üç kişi gidecek. Sen dahil.',
      'Sistemin aday puanlama tablosunu biliyorsun; kimin kaç yaşında, hangi semtte oturduğuna, hangi okuldan mezun olduğuna kaç puan verileceğini o belirliyor.',
      'O tabloyu holding gönderdi, ben yazmadım. Ama altında benim imzam var. Ben de 45 yaşımda bir sabah işsiz kaldım, kimse CV\'me bakmadı. Yine de imzaladım.',
    ],
    choices: [
      { text: 'Anlıyorum Hakan Bey. Kolay değil.', reply: 'Sağ ol. Bunu kimseye söylemedim. Yarın mülakatlar var; ne yaparsan yap, bilerek yap.', performans: 2, rapport: 8 },
      { text: 'Bu, adaylara yapılanı haklı çıkarmaz.', reply: 'Haklısın. Ama haklı olmak kimseyi bu masada tutmuyor. Kolay gelsin.', vicdan: 3, rapport: -5 },
      { text: 'Kolay değil. Ama bir önerim var: sayıları tutturup süreci de düzeltebiliriz.', reply: 'Söyle bakalım. İki dakikan var.', next: 'reform' },
    ],
    minutes: 6,
    missed: { note: 'Hakan Bey aradı, açmadın. Sonra kapısının önünden geçerken seni gördü; bir şey demedi.' },
  },
];

export const callsForDay = (day: number) => DESK_CALLS.filter((c) => c.day === day);
export const deskCall = (id: string) => DESK_CALLS.find((c) => c.id === id);

/* ── Kahve ── */

/** Dolu bir kupadaki yudum sayısı. Yudumlamak bedava; doldurmak için mutfağa yürümek değil. */
export const COFFEE_SIPS = 6;
/** Doldurmanın sürdüğü oyun dakikası (mutfak, makinedeki sıra, ayaküstü sohbet). */
export const REFILL_MINUTES = 5;

export const REFILL_THOUGHTS = [
  'Mutfağa gidip kupanı doldurdun. Makinenin önünde üç kişi vardı; beş dakika gitti.',
  'Kahve makinesi yine "su haznesini doldurun" diyordu. Doldurdun, bekledin, döndün.',
  'Mutfakta biri "yeni İK sen misin?" diye sordu. Kupanı doldurup kaçtın.',
];

/** Günün düşünceleri tükenince. */
export const IDLE_THOUGHTS = ['Kahve iyi geldi.', 'Bir yudum daha. Ekrana dönmen lazım.', 'Kupanın sıcaklığı ellerinde.'];

/** Günün kahvesi boyunca aklından geçenler, gün gün. */
export const COFFEE_THOUGHTS: string[][] = [
  ['Filtre kahve. On bir ay işsizlikten sonra ilk sabah kahvesi.', 'Ofisin kahvesi berbat ama sıcak.', 'İki ay deneme süresi. İki ay boyunca hiçbir şeyi yanlış yapmamalısın.', 'Kira %60 zamlanmış, KYK borcu duruyor. Kahve bile acı geliyor.', 'Son yudum soğumuş.'],
  ['Dün kaç kişiyi elediğimi saymamaya çalışıyorum.', 'Masadaki telefona bakmamaya çalışıyorum.', 'Kahve dünkünden daha sert. Ya da ben daha yorgunum.', 'Annemin kart borcu… Asgariyi bu hafta yatırmam lazım.', 'Kupanın dibinde telve kalmış. Fal bakacak vakit yok.'],
  ['Yağmur camı dövüyor. Kahve sıcak, iyi ki.', 'Dosyalar bitmiyor. Önce kahve.', 'Yarın mülakat günü. Kahve boğazımda düğümlendi.', 'Bu sistemi kim yazdı acaba?', 'Soğudu. Her şey gibi.'],
  ['Kar yağıyor. Pencereden bakınca her şey sessiz.', 'Ekran boş. Yapay zekâ yok. Sadece ben ve dosyalar.', 'Bugün sistem yok. Kararlar gerçekten benim.', 'Kardeşimin yurt taksiti… Yine hesap yapıyorum.', 'Son yudum. Yarın cuma.'],
];

/* ── Çiçek ── */

export type FlowerState = 'fresh' | 'tired' | 'wilted' | 'dead';

/** Taze su almadan geçen her gün onu bir adım daha ileri götürür. */
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
/** Bir bardakla sebile yürüyüp geri gelmek. */
export const WATER_MINUTES = 4;
/** Sebilde kendin için bir bardak su. */
export const COOLER_MINUTES = 2;
export const COOLER_THOUGHTS = [
  'İlanda "rekabetçi yan haklar" yazıyordu. Sebilin üstünde gerçekten "Yan haklar: su sebili" yazıyor. Şaka sanmıştın.',
  'Sebilin önünde muhasebeden biri: "Yan haklardan faydalanıyoruz" dedi, gülmedi.',
  'Bir bardak su. Bu hafta şirketten aldığın tek şey bu olabilir.',
  'Sebilin fokurtusu ofisteki tek sakin ses.',
];

/** Çekmecede her ofis çekmecesinde olandan başka bir şey yok. */
export const DRAWER_THOUGHT = 'Birkaç kalem, eski bir zımba, kurumuş bir sakız. Çekmeceyi kapattın.';
