import type { Decision } from '../types';
import { NEPHEW_ID, candidateOf } from '../data/candidates';
import { candidateDetails } from '../data/candidateDetails';
import { firstName } from '../lib/turkish';
import { PLAYER } from '../lib/player';
import { AMBIENT, BIRTHDAY, FAMILY, GREETINGS, MOM_POOL, REQUESTS, TEAM_COMPLIED, TEAM_DEFIED, TONED } from '../data/phoneScript';
import type { Ambient, Grievance, ManagerRequest, ManagerTone, QuickReply, RequestTemplate, ScheduledMessage } from './phoneTypes';
import { BIRTHDAY_DAY, THURSDAY, TUESDAY } from '../lib/weekdays';
import { shuffle } from '../lib/rng';

export { GROUP_THREADS } from './phoneTypes';
export type { Grievance, ManagerRequest, ManagerTone, PhoneMessage, QuickReply, ScheduledMessage, ThreadId } from './phoneTypes';
export { OVERTIME_MOM } from '../data/phoneScript';

/*
 * "Müdür baskısı": İK müdürü gün boyunca sana yazar.
 *
 * Her iş gününün küçük bir senaryosu vardır: sabah selamı, bugünün kuyruğunda gerçekten olan
 * adaylara yönelik iki rica ("X'i mülakata çağır, bir arkadaşın tavsiyesi", "Y'yi ele, aile
 * durumu…"), öğleden sonra bir dürtme ve ikindi bir baskı mesajı. Cevap vermek seni bağlar;
 * gün sonunda müdür gerçekte ne yaptığını kontrol eder.
 */

/**
 * Hakan Bey'in sana karşı tutumu, oyuncudan gizli (0–100). Ricalarına uymak, onu desteklemek ve
 * aramalarını açmak yükseltir; karşı çıkmak, özellikle haklı olduğu bir ricada, düşürür. Sesinin
 * dozu (selam, tepki, uyarı) buna göre ayarlanır.
 */
export const RAPPORT_START = 55;
export const RAPPORT_START_HARD = 40;

export const clampRapport = (r: number) => Math.max(0, Math.min(100, r));

/** İlişkiden tona: 60 ve üstü sıcak, 45 resmî, 30 soğuk, altı düşmanca. */
export function managerTone(rapport: number): ManagerTone {
  return (rapport >= 60 ? 0 : rapport >= 45 ? 1 : rapport >= 30 ? 2 : 3) as ManagerTone;
}

/** Hakan Bey'in ilişkiye verdiği ağırlık: rica cevapları, aramalar, toplantı. */
export const RAPPORT = {
  comply: 7,
  refuse: -9,
  /** Dosyanın da desteklediği bir ricaya (Barış) karşı çıkmak: "bu sefer haklıydım". */
  refuseFair: -13,
  missedCall: -4,
} as const;

export const TONE_STATUS: Record<ManagerTone, { mood: string; status: string }> = {
  0: { mood: '😊', status: 'çevrimiçi' },
  1: { mood: '😐', status: 'çevrimiçi' },
  2: { mood: '😒', status: 'son görülme: az önce' },
  3: { mood: '😠', status: 'yazıyor… sildi… yazıyor…' },
};

const REQUEST_SLOTS = [200];
/** Perşembe'nin araması öğleden sonra gelir: sabahta zaten çöküş ve Seda var. */
const THURSDAY_REQUEST_SLOTS = [330];
/** Zor mod: o günlerde iki kez bastırır. */
const HARD_REQUEST_SLOTS = [160, 380];
/** Kendi adamlarını yalnızca Salı ve Perşembe öne iter. */
const REQUEST_DAYS = [TUESDAY, THURSDAY];

const MOM_SLOTS = [140, 190, 350, 410, 460];

/** Haftanın hikâyesi bu ricalara yaslanır: yeğen, 45 yaşındaki, anne. */
const STORY_TARGETS = ['okan', 'kerem', 'seda', 'derya'];

/** Günün kuyruğundan bugünün mesaj senaryosunu kurar. */
export function buildManagerScript(
  dayIndex: number,
  lineup: string[],
  opts: { momOrder?: number[]; grievances?: Grievance[]; hard?: boolean; managerDay?: { complied: string[]; defied: string[] } } = {},
  rand: () => number,
): ScheduledMessage[] {
  const { momOrder, hard, managerDay } = opts;
  const script: ScheduledMessage[] = [
    // telefon çalışılacak kadar sessiz kalır: ondan günün sonlarında tek bir hatırlatma
    { at: 450, kind: 'openFiles', dayIndex },
  ];

  const available = REQUESTS.map((t, template) => ({ t, template, id: t.ids.find((id) => lineup.includes(id)) })).filter(
    (x): x is { t: RequestTemplate; template: number; id: string } => Boolean(x.id),
  );
  // Karıştır ve her yuvaya en fazla bir rica al; ama hikâyenin kilit karakterleri önce gelir.
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  // önce kendi adamları (en başta yeğen), sonra hikâyenin kilit karakterleri
  const rank = (x: { id: string; t: RequestTemplate }) => (x.id === NEPHEW_ID || x.id === 'baris' ? 3 : x.t.want === 'approve' ? 2 : STORY_TARGETS.includes(x.id) ? 1 : 0);
  available.sort((a, b) => rank(b) - rank(a));
  // Günde bir mesaj anneden, sakin bir saatte (öğleden önce ya da ikindi, sırayla).
  const momPicks = (momOrder ?? shuffle([...MOM_POOL.keys()], rand)).slice(dayIndex * 2, dayIndex * 2 + 1).map((i) => MOM_POOL[i % MOM_POOL.length]);
  const slots = [MOM_SLOTS[dayIndex % 2 === 0 ? 1 : 2]];
  // evin zaten söyleyecek bir şeyi olduğu gün, ayaküstü sohbeti atlar
  if (!(FAMILY[dayIndex]?.length)) momPicks.forEach((m, i) => {
    script.push({ at: slots[i], kind: 'ambient', dayIndex, ambient: { thread: 'mom', text: m.text, replies: m.replies } });
  });

  // ev, masaya bağlı: ilk gün kardeşinin okulu kimsenin ilk on'una girmiyor; Kerem'le
  // karşılaştığın gün annen 50 yaşında "fazla yaşlı" bulunmayı hatırlıyor
  for (const f of FAMILY[dayIndex] ?? []) script.push({ at: f.at, kind: 'ambient', dayIndex, ambient: { thread: 'mom', text: f.text, replies: f.replies } });

  // ofis, dün Hakan Bey'le işlerin nasıl gittiğini fark etti: günün ofis cümlesi bu
  const team = managerDay ? teamReaction(managerDay, dayIndex) : [];
  for (const a of [...team, ...(AMBIENT[dayIndex] ?? []), ...(dayIndex === BIRTHDAY_DAY ? BIRTHDAY : [])]) {
    script.push({ at: a.at, kind: 'ambient', dayIndex, ambient: { thread: a.thread, sender: a.sender, text: a.text, replies: a.replies, first: a.first } });
    for (const f of a.followUps ?? []) script.push({ at: a.at + f.after, kind: 'ambient', dayIndex, ambient: { thread: a.thread, sender: f.sender, text: f.text, closes: f.closes } });
  }

  (REQUEST_DAYS.includes(dayIndex) ? (hard ? HARD_REQUEST_SLOTS : dayIndex === THURSDAY ? THURSDAY_REQUEST_SLOTS : REQUEST_SLOTS) : []).forEach((at, slot) => {
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

/** Müdürün rica dışındaki mesajlarına gönderebileceğin cevaplar; tepkisi ruh hâlini izler. */
export function managerQuickReplies(kind: ScheduledMessage['kind'], tone: ManagerTone, openFiles = 1): QuickReply[] | undefined {
  const t = tone;
  switch (kind) {
    case 'greeting':
      return [
        { text: 'Günaydın Hakan Bey, hemen başlıyorum.', reaction: ['Teşekkür ederim, kolay gelsin.', 'Peki.', 'Görelim.', 'Sözden çok sonuç görmek istiyorum.'][t] },
        {
          text: 'Günaydın.',
          reaction: ['İyi çalışmalar.', 'Peki.', 'Bu kadar mı?', 'Bu tutumunuz da not edilmiştir.'][t],
          followUp: t === 2 ? [
            { text: 'Kusura bakmayın Hakan Bey, dosyalara başlıyorum.', reaction: 'Peki.' },
            { text: 'Evet, işe odaklanmak istiyorum.', reaction: 'Odaklanmanızı sonuçlarda görmek isterim.' },
          ] : undefined,
        },
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
          {
            text: 'Bazı dosyalarda zorlandım ama hepsini tamamladım.',
            reaction: ['Anlıyorum. Yarın daha rahat olur.', 'Hangi dosyalarda zorlandınız?', 'Sonuç geldi. Gerisi beni ilgilendirmiyor.', 'Not edildi.'][t],
            followUp: t === 1 ? [
              { text: 'Sistemin düşük puan verdiği ama CV\'si güçlü adaylarda. Okuyunca karar vermek zorlaşıyor.', reaction: 'Sistemin puanı bir başlangıç noktası. Son karar sizin; ama gerekçeniz sağlam olsun.' },
              { text: 'Önemli bir şey değil, alışma süreci.', reaction: 'Anlaşıldı. Hızınızın artmasını bekliyorum.' },
            ] : undefined,
          },
        ];
      return [
        { text: 'Mesai bitmeden tamamlayacağım.', reaction: ['Size güveniyorum.', 'Takip ediyorum.', 'Görelim.', 'Tamamlanmazsa sorumluluk size aittir.'][t] },
        {
          text: 'Yoğunluk fazla, biraz zorlanıyorum.',
          reaction: ['Anlıyorum; önceliklendirerek ilerleyiniz.', 'Zorlandığınız nokta nedir?', 'Gerekçe değil, sonuç bekliyorum.', 'Bu görevi yürütemiyorsanız açıkça belirtiniz.'][t],
          followUp: t === 1 ? [
            { text: 'Her CV\'yi okumak zaman alıyor; sistemin önerisine bakıp geçmek istemiyorum.', reaction: 'Özeniniz takdire değer ama mesai sınırlı. Önce sistemin "öncelikli" dediklerini bitirin.' },
            { text: 'Dosya sayısı çok fazla.', reaction: 'Yapay zekâ analizi bunun için var. Kullanın.' },
          ] : undefined,
        },
      ];
    default:
      return undefined;
  }
}

/** Cevap bekleyen bir mesaj çok uzun cevapsız kalırsa bir kez gönderilir. */
export function managerNudge(tone: ManagerTone) {
  return [
    'Mesajımı görme fırsatınız oldu mu?',
    'Dönüşünüzü bekliyorum.',
    'Sayın uzman, mesajlarıma dönüş yapmanız gerekmektedir.',
    'Mesajlarımın yanıtsız bırakılması kayda geçirilmiştir.',
  ][tone];
}


/**
 * Dünkü ricalar yapılmadığında ertesi sabahın e-postası. İçinde ona karşı alıntılanabilecek
 * hiçbir şey yok: "sizden rica etmiştim" yok, yalnızca "ekibin beklentilerinden farklı sonuçlar".
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

/** Planlanmış bir mesajın metni, müdürün o anki tonuyla. */
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
      const body = REQUESTS[r.template].text(firstName(candidateOf(r.candidateId).name));
      return [body, body, `Bu konuda tartışmaya açık değilim. ${body}`, `Son kez hatırlatıyorum: ${body} Aksi hâlde gereğini yapacağım.`][tone];
    }
  }
}

/**
 * Sabit hattan istenen bir rica, asla yazılı değil. Yazılı şablonun konuşulan hâli: "kayıtlara
 * geçirmeme" ile ilgili her şey çıkar, çünkü telefon araması bunu zaten yapar.
 */
export function requestCallLines(template: number, candidateId: string, tone: ManagerTone, retry = false): string[] {
  const body = REQUESTS[template]
    .text(firstName(candidateOf(candidateId).name))
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
 * Konuşmadaki senin tarafın, aldığın tavırla sertleşir (ya da yumuşar): ne kadar çok
 * reddettiysen ret o kadar kesin; ne kadar çok uyduysan o kadar boyun eğici.
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

/** Müdürün cevabına verdiği karşılık, bu cevaptan *sonraki* tonla. */
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
    'Peki. Bu kararın sorumluluğu sizde. Deneme sürecinizde bunu da konuşacağız.',
    'Deneme süresindeki birinin müdürüne hayır demesi… İlginç bir tercih. Not aldım.',
    'Talimatıma ikinci kez uymuyorsunuz. Bu, deneme değerlendirmenize aynen bu şekilde yazılacak.',
    'Yeter. Bu ekipte benimle değil bana karşı çalışıyorsunuz. Yarın sabah İK direktörüyle birlikte odamdasınız.',
  ][tone];
}

/**
 * Her rica yanlış değildir: bazen güçlü bir adayı çağırmanı ister. Dosyanın kendisinin
 * desteklediği bir ricaya uymak vicdana hiçbir şeye mal olmaz.
 */
export function requestIsFair(r: Pick<ManagerRequest, 'candidateId' | 'want'>) {
  const fit = candidateDetails[r.candidateId]?.hireFit ?? 3;
  return r.want === 'approve' ? fit >= 4 && r.candidateId !== NEPHEW_ID : fit <= 2;
}

/** Cevabın kendisinin anlık etkisi. */
export const REPLY_EFFECT = {
  comply: { performans: 2, vicdan: -3 },
  refuse: { performans: -3, vicdan: 2 },
};

export interface ManagerVerdict {
  performans: number;
  vicdan: number;
  lines: string[];
}

/** Gün sonu: müdürün istediğini (ve söz verdiğini) yaptın mı? */
export function evaluateRequests(
  requests: ManagerRequest[],
  decisions: Record<string, Decision>,
  ignoredMessages = 0,
  /** Referanslarını kontrol edip sağlam bulduğun adaylar: ona karşı çıkmak savunulabilir. */
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
    const name = firstName(candidateOf(r.candidateId).name);
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
      // referans kontrolüyle desteklenen bir kararla tartışmak zordur
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

/** Ofisin düne tepkisi, tepki verecek bir şey varsa: çoğunlukla hangi yöne gittiysen. */
function teamReaction(day: { complied: string[]; defied: string[] }, dayIndex: number): Ambient[] {
  if (day.complied.length === 0 && day.defied.length === 0) return [];
  const pool = day.complied.length > day.defied.length ? TEAM_COMPLIED : TEAM_DEFIED;
  return [pool[(dayIndex - 1) % pool.length]];
}

/** Annenin mesaj havuzunun boyutu (store, oyun başına bir kez 0…n-1'i karıştırır). */
export const MOM_POOL_SIZE = MOM_POOL.length;
