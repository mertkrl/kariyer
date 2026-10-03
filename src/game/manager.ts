import type { Decision } from './types';
import { NEPHEW_ID, candidateOf } from './data/candidates';
import { candidateDetails } from './data/candidateDetails';
import { firstName } from './turkish';
import { ZEHRA } from './story';
import { PLAYER } from './player';
import { AMBIENT, BIRTHDAY, FAMILY, GREETINGS, MOM_POOL, REQUESTS, TEAM_COMPLIED, TEAM_DEFIED, TONED } from './data/phoneScript';
import type { Ambient, Grievance, ManagerRequest, ManagerTone, QuickReply, RequestTemplate, ScheduledMessage } from './phoneTypes';
import { BIRTHDAY_DAY, THURSDAY, TUESDAY } from './weekdays';
import { shuffle } from './rng';

export { GROUP_THREADS } from './phoneTypes';
export type { Grievance, ManagerRequest, ManagerTone, PhoneMessage, QuickReply, ScheduledMessage, ThreadId } from './phoneTypes';
export { OVERTIME_MOM } from './data/phoneScript';

/*
 * "Müdür baskısı": the HR manager texts you through the day.
 *
 * Each workday gets a small script: a morning greeting, two requests aimed at candidates who are
 * actually in today's queue ("call X to interview, he's a friend's pick", "drop Y, family
 * situation…"), a post-lunch nudge and an afternoon pressure message. Replying commits you;
 * at the end of the day the manager checks what you actually did.
 */

export function managerTone(refusals: number): ManagerTone {
  return Math.min(3, refusals) as ManagerTone;
}

export const TONE_STATUS: Record<ManagerTone, { mood: string; status: string }> = {
  0: { mood: '😊', status: 'çevrimiçi' },
  1: { mood: '😐', status: 'çevrimiçi' },
  2: { mood: '😒', status: 'son görülme: az önce' },
  3: { mood: '😠', status: 'yazıyor… sildi… yazıyor…' },
};

const REQUEST_SLOTS = [200];
/** Thursday's call comes after lunch: the morning already has the crash, Seda and Zehra. */
const THURSDAY_REQUEST_SLOTS = [330];
/** Hard mode: he pushes twice on those days. */
const HARD_REQUEST_SLOTS = [160, 380];
/** He only pushes his people on Tuesdays and Thursdays. */
const REQUEST_DAYS = [TUESDAY, THURSDAY];

const MOM_SLOTS = [140, 190, 350, 410, 460];

/** The week's story leans on these requests: the nephew, the 45-year-old, the mother. */
const STORY_TARGETS = ['okan', 'kerem', 'seda', 'derya'];

/** Builds today's message script from the day's queue. */
export function buildManagerScript(
  dayIndex: number,
  lineup: string[],
  opts: { momOrder?: number[]; grievances?: Grievance[]; hard?: boolean; homeNotes?: { text: string; replies: QuickReply[] }[]; managerDay?: { complied: string[]; defied: string[] } } = {},
  rand: () => number,
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
  const rank = (x: { id: string; t: RequestTemplate }) => (x.id === NEPHEW_ID || x.id === 'baris' ? 3 : x.t.want === 'approve' ? 2 : STORY_TARGETS.includes(x.id) ? 1 : 0);
  available.sort((a, b) => rank(b) - rank(a));
  // One message from mom a day, at a quiet time (mid-morning or mid-afternoon, alternating).
  const momPicks = (momOrder ?? shuffle([...MOM_POOL.keys()], rand)).slice(dayIndex * 2, dayIndex * 2 + 1).map((i) => MOM_POOL[i % MOM_POOL.length]);
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
  for (const a of [...team, ...(AMBIENT[dayIndex] ?? []), ...(dayIndex === BIRTHDAY_DAY ? BIRTHDAY : [])]) {
    script.push({ at: a.at, kind: 'ambient', dayIndex, ambient: { thread: a.thread, sender: a.sender, text: a.text, replies: a.replies } });
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
      const body = REQUESTS[r.template].text(firstName(candidateOf(r.candidateId).name));
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
  return r.want === 'approve' ? fit >= 4 && r.candidateId !== NEPHEW_ID : fit <= 2;
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

/** The office's reaction to yesterday, if there's anything to react to: whichever way you mostly went. */
function teamReaction(day: { complied: string[]; defied: string[] }, dayIndex: number): Ambient[] {
  if (day.complied.length === 0 && day.defied.length === 0) return [];
  const pool = day.complied.length > day.defied.length ? TEAM_COMPLIED : TEAM_DEFIED;
  return [pool[(dayIndex - 1) % pool.length]];
}

/** Size of mom's message pool (the store shuffles 0…n-1 once per game). */
export const MOM_POOL_SIZE = MOM_POOL.length;
