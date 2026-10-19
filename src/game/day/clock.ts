/*
 * Mesai saati işlerken olanlar: mesajların gelmesi, sabit hattın çalması, cevapların süresinin
 * dolması, ret bildirimlerinin 17:00'de gitmesi, günün bitmesi. Store'un tik'inden ve
 * eylemlerinden çağrılır; store'u storeApi üzerinden okur ve yazar.
 */
import { getState, setState } from '../store/storeApi';
import { BREAK_END_MIN, BREAK_START_MIN, OVERTIME_END_MIN, WORKDAY_END_MIN, isBreakTime } from '../lib/time';
import { CALLBACK_MINUTES, REQUEST_CALL_PREFIX, RING_MINUTES, callsForDay } from './desk';
import { GROUP_THREADS, OVERTIME_MOM, type PhoneMessage, type QuickReply, type ThreadId, managerQuickReplies, managerTone, renderManagerMessage, reprimandReplies, RAPPORT, clampRapport } from './manager';
import { type GameState } from '../store/storeTypes';
import { REVOKE_AT, REVOKE_DAY, SNOW_CALL_AT, SNOW_CALL_ID, callFor, revokeInvites, revokeTargets, strandFinalist } from './managerCalls';
import { type RejectTemplate, candidateReplies, sentMails } from './rejectionMails';
import { TEAM_LATE_DAY, TEAM_LATE_END, clampScore, lineupFor, addVicdan } from '../store/storeDefaults';
import { sound } from '../lib/sound';
import { visitorsToday } from './visits';
import { days } from '../data/days';
import { EXTRA_CANDIDATES } from '../data/extraCandidates';
import { rngFor, shuffle } from '../lib/rng';
import { THANKS_DAY } from '../lib/weekdays';
/** Teşekkür gününde 13:00: arama öğle arasından sonra gelir. */
const THANKS_AT = 300;
/** Bir sonraki telefon mesajı kimliğini verir. */
export function takeMessageId() {
  const id = getState().messageSeq;
  setState({ messageSeq: id + 1 });
  return id;
}

/** Müdür cevabını bekliyorsa (bekleyen bir rica ya da cevapsız bir mesaj) true. */
export function managerAwaiting(state: GameState) {
  const pendingRequest = state.managerRequests.find((r) => r.answer === null);
  if (pendingRequest) return state.phone.find((m) => m.requestId === pendingRequest.id) ?? null;
  return [...state.phone].reverse().find((m) => m.thread === 'manager' && m.from === 'them' && m.replies && !m.answered) ?? null;
}

/**
 * Zamanı gelen yazılı mesajları iletir.
 * Annenin ve ofisin mesajları her zaman gelir. Müdür ise senin cevabını beklerken asla yeni bir
 * konu açmaz: sonraki mesajları sırada bekler, onu bir saat bekletirsen tek bir dürtme yollar.
 */
/** Öğle arası: 12:00–13:00, masana çoktan dönmediysen. */
export const isOnBreak = (state: Pick<GameState, 'workdayMinutes' | 'breakOver'>) => isBreakTime(state.workdayMinutes) && !state.breakOver;

/*
 * Aynı anda tek şey: cep telefonu ve sabit hat hiçbir zaman birlikte çalmaz. Masa telefonu
 * çalarken (ya da sen konuşurken) ve hemen sonrasında mesaj bekler; arama da son mesajdan sonra
 * bir an bekler. Aynı anda vadesi gelen mesajlar tek tek gelir.
 */
export const QUIET_GAP = 10;
export const TEXT_GAP = 8;

// yalnızca bugünün mesajları sayılır: telefon dün geceki mesajları tutar, onların geç saatleri
// yoksa bütün ertesi sabahı tutar ve tek bir patlamada bırakırdı
export const lastTextAt = (state: GameState) =>
  state.phone.reduce((at, m) => (m.from === 'them' && (m.day ?? state.currentDayIndex) === state.currentDayIndex ? Math.max(at, m.at) : at), -Infinity);

type Patch = Partial<GameState>;
type Desk = GameState['desk'];
const ring = (desk: Desk, id: string, minutes: number): Patch => ({ desk: { ...desk, ringing: id, ringingSince: minutes } });

/** Çok uzun çalan arama cevapsız kalır; müdürün rica aramaları sonra yeniden çalar. */
function letRing(state: GameState, minutes: number): Patch | null {
  const desk = state.desk;
  const id = desk.ringing;
  if (!id || minutes - desk.ringingSince < RING_MINUTES) return null;
  if (id.startsWith(REQUEST_CALL_PREFIX) && desk.calls[id] !== 'missed') {
    // geri arayacak
    const r = state.managerRequests.find((x) => x.id === id.slice(REQUEST_CALL_PREFIX.length));
    return {
      desk: { ...desk, ringing: null, calls: { ...desk.calls, [id]: 'missed' }, notice: 'Hakan Bey aradı, açmadın. Birazdan tekrar arar.', noticeKind: 'missed' },
      hakanRapport: clampRapport(state.hakanRapport + RAPPORT.missedCall),
      managerScript: r
        ? [...state.managerScript, { at: minutes + CALLBACK_MINUTES, kind: 'request' as const, dayIndex: state.currentDayIndex, retry: true, request: { id: r.id, candidateId: r.candidateId, want: r.want, template: r.template ?? 0 } }]
        : state.managerScript };
  }
  const call = callFor(state, id);
  if (!call) return null;
  return {
    ...(id === 'revoke' ? revokeInvites(state, null) : {}),
    ...(id === SNOW_CALL_ID ? strandFinalist(state, 'tolga') : {}),
    performans: clampScore(state.performans + (call.missed.performans ?? 0)),
    vicdan: addVicdan(state.vicdan, (call.missed.vicdan ?? 0)),
    // Hakan Bey'in aramasını açmamak
    hakanRapport: clampRapport(state.hakanRapport + (call.caller === 'Hakan Bey' ? RAPPORT.missedCall : 0)),
    desk: { ...desk, ringing: null, calls: { ...desk.calls, [id]: 'missed' }, notice: call.missed.note, noticeKind: 'missed', flower: desk.flower || !!call.flower, lastWatered: call.flower ? state.currentDayIndex : desk.lastWatered } };
}

/**
 * Sıradaki arayan, en acilden başlayarak: araması vadesi gelen ilk kaynak hattı alır.
 * Yeni bir arama türü buraya, araya gireceği yere yeni bir kayıt olarak eklenir.
 */
const CALL_SOURCES: ((state: GameState, minutes: number) => Patch | null)[] = [
  // Çarşamba öğleden sonra: davetlerinden ikisi geri alınacak
  (state, minutes) =>
    state.currentDayIndex === REVOKE_DAY && minutes >= REVOKE_AT && !state.desk.calls.revoke && !state.revoked && revokeTargets(state.finalists).length === 2
      ? ring(state.desk, 'revoke', minutes)
      : null,
  // ona karşı çıktığın günün ertesi sabahı odasına çağrılırsın
  (state, minutes) => (state.reviewAt !== null && minutes >= state.reviewAt && !state.desk.calls.review ? ring(state.desk, 'review', minutes) : null),
  // Perşembe öğleden sonra: hafta başında teste geçirdiğin biri teşekkür etmek için arar
  (state, minutes) => {
    if (state.currentDayIndex !== THANKS_DAY || minutes < THANKS_AT || Object.keys(state.desk.calls).some((k) => k.startsWith('thanks:'))) return null;
    const early = state.weekLog.find((e) => e.decision === 'approve' && e.day <= THANKS_DAY - 2);
    return early ? ring(state.desk, `thanks:${early.id}`, minutes) : null;
  },
  // Perşembe öğleden sonra: mülakata çağırdığın Tolga Kars'ta karda kaldı
  (state, minutes) =>
    state.currentDayIndex === THANKS_DAY && minutes >= SNOW_CALL_AT && !state.desk.calls[SNOW_CALL_ID] && state.finalists.some((f) => f.id === 'tolga')
      ? ring(state.desk, SNOW_CALL_ID, minutes)
      : null,
  // dün geri çevirdiğin biri lobide bekliyor
  (state, minutes) => {
    const due = visitorsToday(state.currentDayIndex, state.story.keyDecisions, state.dmHandled).find((v) => !state.desk.calls[v.id] && v.at <= minutes);
    return due ? ring(state.desk, due.id, minutes) : null;
  },
  // günün senaryolu aramaları ve müdürün ricaları, hangisinin vadesi önce geldiyse
  (state, minutes) => {
    const desk = state.desk;
    const dueStatic = callsForDay(state.currentDayIndex).find((c) => !desk.calls[c.id] && c.at <= minutes);
    const dueRequest = state.managerScript.find((m) => m.kind === 'request' && m.at <= minutes);
    if (dueRequest?.request && (!dueStatic || dueRequest.at <= dueStatic.at)) {
      // müdür bir rica istiyor: bu bir telefon aramasıdır, asla bir mesaj değil
      const r = dueRequest.request;
      const known = state.managerRequests.some((x) => x.id === r.id);
      return {
        managerScript: state.managerScript.filter((m) => m !== dueRequest),
        managerRequests: known ? state.managerRequests : [...state.managerRequests, { id: r.id, candidateId: r.candidateId, want: r.want, answer: null, template: r.template }],
        ...ring(desk, REQUEST_CALL_PREFIX + r.id, minutes) };
    }
    if (!dueStatic) return null;
    // masana yürüyüp gelen biri çalmaz: konuşma hemen başlar
    return dueStatic.walkIn ? { desk: { ...desk, inCall: dueStatic.id } } : ring(desk, dueStatic.id, minutes);
  },
];

/** Bugünün sıradaki sabit hat aramasını zamanı gelince başlatır; çok uzun çalan arama cevapsız kalır. */
export function ringLandline(minutes: number) {
  const state = getState();
  if (state.desk.inCall) return;
  if (state.desk.ringing) {
    const missed = letRing(state, minutes);
    if (missed) setState(missed);
    return;
  }
  // bir mesajın hemen ardından ve öğle arası civarında hat sessiz kalır
  if (minutes - lastTextAt(state) < QUIET_GAP) return;
  if (minutes >= BREAK_START_MIN - 15 && minutes < BREAK_END_MIN) return;
  for (const source of CALL_SOURCES) {
    const patch = source(state, minutes);
    if (patch) return setState(patch);
  }
}

/**
 * Saatin gün sonu. 17:00'de her dosya kapalıysa eve gidersin; değilse 20:00'ye kadar (ücretsiz)
 * kalırsın ve o saatte hâlâ açık olan her dosya Performans'tan düşer.
 */
/** Bugün reddedilip henüz kendisine hiçbir şey gönderilmeyenler. */
export function mailsPending(state: Pick<GameState, 'currentDayIndex' | 'lineups' | 'decisions' | 'rejectionMailsSent' | 'plannedRejections'>) {
  return !state.rejectionMailsSent && lineupFor(state).some((id) => state.decisions[id] === 'reject' && !state.plannedRejections[id]);
}

/** Giden kutusunun gittiği an: iş gününün sonu. */
export const MAIL_SEND_AT = WORKDAY_END_MIN;

/**
 * 17:00 (ya da gün erken kapanırken): giden kutusu gider. Bildirimi planlanmadan reddedilen
 * hiçbir şey almaz. Etkiler bildirimlerin yazıldığı anda değil, şimdi işler.
 */
export function dispatchRejections() {
  const state = getState();
  if (state.rejectionMailsSent) return;
  const day = state.currentDayIndex;
  const choices: Record<string, RejectTemplate> = Object.fromEntries(
    lineupFor(state)
      .filter((id) => state.decisions[id] === 'reject')
      .map((id) => [id, state.plannedRejections[id] ?? ('none' as const)]),
  );
  const picked = Object.values(choices);
  const count = (t: RejectTemplate) => picked.filter((p) => p === t).length;
  const personal = count('personal');
  const none = count('none');
  setState({
    rejectionMailsSent: true,
    plannedRejections: {},
    extraMails: [
      ...state.extraMails.filter((m) => !(m.folder === 'outbox' && m.day === day)),
      ...sentMails(choices, day, MAIL_SEND_AT),
      ...candidateReplies(choices, day, MAIL_SEND_AT),
    ],
    rejectionToday: { standard: count('standard'), personal, pool: count('pool'), none },
    rejectionStats: {
      standard: state.rejectionStats.standard + count('standard'),
      personal: state.rejectionStats.personal + personal,
      pool: state.rejectionStats.pool + count('pool'),
      none: state.rejectionStats.none + none },
    // dürüst geri bildirim temponun biraz yavaşlamasına mal olur; sessizlik başka bir şeye
    vicdan: addVicdan(state.vicdan, personal - none),
    performans: clampScore(state.performans - Math.floor(personal / 3)) });
}

/** 16:00: fazla mesaiden bir saat önceki uyarı. */
const OVERTIME_WARN_AT = WORKDAY_END_MIN - 60;

export function checkDayEnd(minutes: number) {
  const state = getState();
  if (state.phase !== 'gameplay') return;
  // bitişten bir saat önce: hâlâ açık olanlar ve açık kalırsa ne olacağı
  if (!state.overtime && !state.overtimeWarned && minutes >= OVERTIME_WARN_AT && minutes < WORKDAY_END_MIN && state.currentDayIndex !== TEAM_LATE_DAY) {
    const open = lineupFor(state).filter((id) => !state.decisions[id]).length;
    const pending = mailsPending(state);
    if (open > 0 || pending) {
      setState({
        overtimeWarned: true,
        desk: {
          ...state.desk,
          noticeKind: 'overtimeWarning',
          notice: open
            ? `Saat 16:00 ve ${open} dosya hâlâ açık. 17:00'ye kadar bitmezse fazla mesaiye kalacaksın.`
            : "Saat 16:00. Ret bildirimleri hazır değil; 17:00'ye kadar gönderilmezse fazla mesaiye kalacaksın." } });
      sound().playPhoneBuzz();
    }
  }
  if (!state.overtime && minutes >= WORKDAY_END_MIN) {
    const open = lineupFor(state).filter((id) => !state.decisions[id]).length;
    // Perşembe, sistem yok: bütün ekip 19:00'a kadar kalır
    const teamLate = state.currentDayIndex === TEAM_LATE_DAY;
    const pending = mailsPending(state);
    if (open === 0 && !pending) dispatchRejections();
    if (open === 0 && !pending && !teamLate) {
      state.finishDay();
      return;
    }
    // annen evde olmadığını fark eder
    const momLate = (OVERTIME_MOM[state.currentDayIndex] ?? []).map((m) => ({
      at: minutes + m.after,
      kind: 'ambient' as const,
      dayIndex: state.currentDayIndex,
      ambient: { thread: 'mom' as const, text: m.text, replies: m.replies } }));
    setState({
      overtime: true,
      managerScript: [...state.managerScript, ...momLate].sort((a, b) => a.at - b.at),
      desk: {
        ...state.desk,
        noticeKind: 'overtime',
        notice: teamLate
          ? 'Saat 17:00. Bugün bütün ekip 19:00\'a kadar kalıyor.'
          : open
            ? `Saat 17:00 ama ${open} dosya hâlâ açık. 20:00'ye kadar kalıyorsun — fazla mesai ücreti yok.`
            : 'Saat 17:00 ama ret bildirimleri hazır değil. Gönderene kadar kalıyorsun.' } });
    sound().playPhoneBuzz();
    return;
  }
  if (state.overtime && minutes >= OVERTIME_END_MIN) state.finishDay();
  // on the team's late Thursday, 19:00 sends you home if your files are done
  else if (state.overtime && state.currentDayIndex === TEAM_LATE_DAY && minutes >= TEAM_LATE_END && lineupFor(state).every((id) => state.decisions[id]) && !mailsPending(state)) state.finishDay();
}

export const dayLimit = (state: Pick<GameState, 'overtime'>) => (state.overtime ? OVERTIME_END_MIN : WORKDAY_END_MIN);

/** Ekrandan uzakta geçen zaman (bir arama, bir yudum, çiçekler); öğle arasında ve 17:00'de durur. */
export function spendMinutes(minutes: number) {
  const state = getState();
  if (state.phase !== 'gameplay' || isOnBreak(state) || !state.shiftStarted) return;
  let next = state.workdayMinutes + minutes;
  if (state.workdayMinutes < BREAK_START_MIN && next >= BREAK_START_MIN) next = BREAK_START_MIN;
  next = Math.min(next, dayLimit(state));
  setState({ workdayMinutes: next });
  expireReplies(next);
  deliverManagerMessages(next);
  checkDayEnd(next);
}

/**
 * Bir grup sohbetinin cevabını ne kadar beklediği (mesai dakikası). Gruplar hızlı ilerler; yarım
 * saat gecikmiş bir cevap başka bir konuşmanın ortasına düşer. Özel mesajlar (annen, Ayşe, Hakan
 * Bey) beklemeye devam eder: geç de olsa cevap verilebilir.
 */
// oyun dakikası cinsinden (gerçek saniyede 1.3): grup sohbetleri seni yaklaşık 45 gerçek saniye bekler
export const REPLY_WINDOW: Partial<Record<ThreadId, number>> = { office: 60, birthday: 60 };

export function expireReplies(minutes: number) {
  const state = getState();
  const stale = (m: PhoneMessage) => {
    const window = REPLY_WINDOW[m.thread];
    return window !== undefined && !m.first && m.from === 'them' && m.replies && !m.answered && !m.expired && (m.day ?? state.currentDayIndex) === state.currentDayIndex && minutes - m.at > window;
  };
  if (state.phone.some(stale)) setState({ phone: state.phone.map((m) => (stale(m) ? { ...m, expired: true } : m)) });
}

export function deliverManagerMessages(minutes: number) {
  const state = getState();
  const lineup = lineupFor(state);
  const open = lineup.filter((id) => !state.decisions[id]).length;
  const tone = managerTone(state.hakanRapport);
  const awaiting = managerAwaiting(state);

  if (state.desk.ringing || state.desk.inCall) {
    if (state.lastLandlineAt !== minutes) setState({ lastLandlineAt: minutes });
    return;
  }
  if (state.lastLandlineAt !== null && minutes - state.lastLandlineAt < QUIET_GAP) return;
  // adaylar için ricalar sabit hattan gelir (ringLandline), asla yazılı değil
  const next = state.managerScript.find((m) => m.at <= minutes && (m.kind === 'ambient' || (!awaiting && m.kind !== 'request')));
  // grup sohbetleri kendi temposunda akar (iş arkadaşları birbirine bir dakika içinde cevap verir); geri kalan her şey mesafesini korur
  const group = next?.ambient && GROUP_THREADS.includes(next.ambient.thread);
  if (minutes - lastTextAt(state) < (group ? 1 : TEXT_GAP)) return;
  const delivered = next ? [next] : [];

  const messages: PhoneMessage[] = delivered.map((m) => ({
    id: takeMessageId(),
    thread: m.ambient?.thread ?? 'manager',
    at: minutes,
    day: state.currentDayIndex,
    from: 'them',
    sender: m.ambient?.sender,
    text: renderManagerMessage(m, tone, { lineupSize: lineup.length, openFiles: open }),
    requestId: m.request?.id,
    replies: m.ambient?.replies ?? (m.kind === 'reprimand' ? reprimandReplies(tone) : managerQuickReplies(m.kind, tone, open)),
    first: m.ambient?.first }));

  const nudged = state.managerNudged;
  if (messages.length === 0) return;

  const unread = { ...state.phoneUnread };
  messages.forEach((m) => (unread[m.thread] += 1));
  const requests = delivered.flatMap((m) =>
    m.request ? [{ id: m.request.id, candidateId: m.request.candidateId, want: m.request.want, answer: null }] : [],
  );
  const momCount = messages.filter((m) => m.thread === 'mom').length;
  // "konuyu kapatalım": kapanmış bir konuya kimse cevap vermez
  const closed: ThreadId[] = delivered.flatMap((m) => (m.ambient?.closes ? [m.ambient.thread] : []));
  const history = closed.length ? state.phone.map((m) => (closed.includes(m.thread) && m.replies && !m.answered ? { ...m, answered: true } : m)) : state.phone;
  setState({
    week: momCount ? { ...state.week, momMessages: state.week.momMessages + momCount } : state.week,
    managerScript: state.managerScript.filter((m) => !delivered.includes(m)),
    phone: [...history, ...messages],
    phoneUnread: unread,
    managerRequests: [...state.managerRequests, ...requests],
    managerNudged: nudged });
  sound().playPhoneBuzz();
}

/** Kuyruğu 15:30'dan önce kapatmak "erken" sayılır; Hakan Bey yalnızca 14:00'ten itibaren kontrol eder. */
const EXTRA_FILES_BEFORE = WORKDAY_END_MIN - 90;
export const EXTRA_FILES_FROM = 6 * 60;

/**
 * Bugünün kuyruğunu erken kapattın: Hakan Bey fark eder ve sistemin bekleme listesinde 2–4 dosya
 * daha "bulur". Günde bir kez, yalnızca eleme günlerinde, asla haftada zaten görünmüş biri değil.
 * Dosyalar kuyruğun en üstüne gider; 17:00'ye kadar kapatılmazsa her zamanki gibi fazla mesai.
 * Yalnızca hâlâ masandayken: her dosya kapalıyken "Günü Bitir" seni eve gönderir.
 * Dosya eklenip eklenmediğini döndürür.
 */
/** "Biraz daha CV'ye bak" mesajına verilebilecek cevaplar. */
function extraFilesReplies(n: number): QuickReply[] {
  return [
    { text: `Tamam Hakan Bey, ${n} dosyaya da bakıyorum.`, reaction: 'Teşekkür ederim. Kolay gelsin.' },
    { text: 'Bugünkü kotayı bitirmiştim ama bakarım.', reaction: 'Kota bir alt sınırdır, üst sınır değil.' },
    {
      text: 'Bunlar neden bekleme listesindeydi?',
      reaction: 'Sistem öyle sıralamış. Sizden beklenen değerlendirmeniz.',
      followUp: [
        { text: 'Anladım, değerlendiriyorum.', reaction: 'Peki.' },
        { text: 'Sıralamanın nedenine de bakacağım.', reaction: 'Mesaiyi aşmadan lütfen.' },
      ],
    },
  ];
}

export function addExtraFiles(): boolean {
  const s = getState();
  const day = s.currentDayIndex;
  if (s.phase !== 'gameplay' || days[day]?.final || s.overtime || s.extraFiles[day] || s.workdayMinutes < EXTRA_FILES_FROM || s.workdayMinutes >= EXTRA_FILES_BEFORE) return false;
  if (!lineupFor(s).every((id) => s.decisions[id])) return false;
  const inWeek = new Set(s.lineups.flat());
  const rand = rngFor(s.seed, `extras-${day}`);
  const pool = shuffle(Object.keys(EXTRA_CANDIDATES).filter((id) => !inWeek.has(id)), rand);
  if (pool.length < 2) return false;
  const picked = pool.slice(0, Math.min(pool.length, 2 + Math.floor(rand() * 3)));
  const text = `İşi bitirmişsin, bakıyorum. O zaman biraz daha CV'ye bak bakalım: sistemin bekleme listesinden ${picked.length} dosya daha portalına düştü. Mesai bitmeden kapat.`;
  setState({
    extraFiles: { ...s.extraFiles, [day]: picked },
    // yeni dosyalar kuyruğun en üstüne, görüldükleri yere düşer
    lineups: s.lineups.map((l, i) => (i === day ? [...picked, ...l] : l)),
    phone: [...s.phone, { id: takeMessageId(), thread: 'manager', at: s.workdayMinutes, day, from: 'them', text, replies: extraFilesReplies(picked.length) }],
    phoneUnread: { ...s.phoneUnread, manager: s.phoneUnread.manager + 1 },
  });
  sound().playPhoneBuzz();
  return true;
}
