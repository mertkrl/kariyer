/*
 * What happens as the workday clock runs: texts arriving, the landline ringing, replies
 * expiring, rejection notices going out at 17:00, the day ending. Called from the store's
 * tick and actions; reads and writes the store through storeApi.
 */
import { getState, setState } from './storeApi';
import { BREAK_END_MIN, BREAK_START_MIN, OVERTIME_END_MIN, WORKDAY_END_MIN, isBreakTime } from './time';
import { CALLBACK_MINUTES, REQUEST_CALL_PREFIX, RING_MINUTES, callsForDay } from './desk';
import { GROUP_THREADS, OVERTIME_MOM, type PhoneMessage, type ThreadId, managerQuickReplies, managerTone, renderManagerMessage, reprimandReplies } from './manager';
import { type GameState } from './storeTypes';
import { REVOKE_AT, REVOKE_DAY, callFor, revokeInvites, revokeTargets } from './managerCalls';
import { type RejectTemplate, candidateReplies, sentMails } from './rejectionMails';
import { TEAM_LATE_DAY, TEAM_LATE_END, clampScore, lineupFor } from './storeDefaults';
import { sound } from './sound';
import { visitorsToday } from './visits';
import { days } from './data/days';
import { EXTRA_CANDIDATES } from './data/extraCandidates';
import { rngFor, shuffle } from './rng';
import { THANKS_DAY } from './weekdays';
/** 13:00 on the thanks day: the call comes after lunch. */
const THANKS_AT = 300;
/** Hands out the next phone message id. */
export function takeMessageId() {
  const id = getState().messageSeq;
  setState({ messageSeq: id + 1 });
  return id;
}

/** True when the manager is waiting for your answer (pending request or an unanswered message). */
export function managerAwaiting(state: GameState) {
  const pendingRequest = state.managerRequests.find((r) => r.answer === null);
  if (pendingRequest) return state.phone.find((m) => m.requestId === pendingRequest.id) ?? null;
  return [...state.phone].reverse().find((m) => m.thread === 'manager' && m.from === 'them' && m.replies && !m.answered) ?? null;
}

/**
 * Delivers the scripted texts whose time has come.
 * Mom/office messages always arrive. The manager, though, never opens a new topic while he is
 * still waiting for your answer: his next messages stay queued, and if you keep him waiting for
 * an hour he sends a single nudge instead.
 */
/** Lunch: 12:00–13:00, unless you've already gone back to your desk. */
export const isOnBreak = (state: Pick<GameState, 'workdayMinutes' | 'breakOver'>) => isBreakTime(state.workdayMinutes) && !state.breakOver;

/*
 * One thing at a time: the mobile and the landline never go off together. A text waits while
 * the desk phone rings (or you're on it) and for a moment after; a call waits for a moment
 * after the last text. Texts that fall due together arrive one by one.
 */
export const QUIET_GAP = 10;
export const TEXT_GAP = 8;

// only today's messages count: the phone keeps last night's texts, and their late clock times
// would otherwise hold back the whole next morning and release it in one burst
export const lastTextAt = (state: GameState) =>
  state.phone.reduce((at, m) => (m.from === 'them' && (m.day ?? state.currentDayIndex) === state.currentDayIndex ? Math.max(at, m.at) : at), -Infinity);

type Patch = Partial<GameState>;
type Desk = GameState['desk'];
const ring = (desk: Desk, id: string, minutes: number): Patch => ({ desk: { ...desk, ringing: id, ringingSince: minutes } });

/** A call left ringing too long is missed; the manager's favour calls ring back later. */
function letRing(state: GameState, minutes: number): Patch | null {
  const desk = state.desk;
  const id = desk.ringing;
  if (!id || minutes - desk.ringingSince < RING_MINUTES) return null;
  if (id.startsWith(REQUEST_CALL_PREFIX) && desk.calls[id] !== 'missed') {
    // he'll ring back
    const r = state.managerRequests.find((x) => x.id === id.slice(REQUEST_CALL_PREFIX.length));
    return {
      desk: { ...desk, ringing: null, calls: { ...desk.calls, [id]: 'missed' }, notice: 'Hakan Bey aradı, açmadın. Birazdan tekrar arar.', noticeKind: 'missed' },
      managerScript: r
        ? [...state.managerScript, { at: minutes + CALLBACK_MINUTES, kind: 'request' as const, dayIndex: state.currentDayIndex, retry: true, request: { id: r.id, candidateId: r.candidateId, want: r.want, template: r.template ?? 0 } }]
        : state.managerScript };
  }
  const call = callFor(state, id);
  if (!call) return null;
  return {
    ...(id === 'revoke' ? revokeInvites(state, null) : {}),
    performans: clampScore(state.performans + (call.missed.performans ?? 0)),
    vicdan: clampScore(state.vicdan + (call.missed.vicdan ?? 0)),
    desk: { ...desk, ringing: null, calls: { ...desk.calls, [id]: 'missed' }, notice: call.missed.note, noticeKind: 'missed', flower: desk.flower || !!call.flower, lastWatered: call.flower ? state.currentDayIndex : desk.lastWatered } };
}

/**
 * Who calls next, most urgent first: the first source that has a call due wins the line.
 * A new kind of call is a new entry here, placed where it should cut in.
 */
const CALL_SOURCES: ((state: GameState, minutes: number) => Patch | null)[] = [
  // Wednesday afternoon: two of your invitations are to be taken back
  (state, minutes) =>
    state.currentDayIndex === REVOKE_DAY && minutes >= REVOKE_AT && !state.desk.calls.revoke && !state.revoked && revokeTargets(state.finalists).length === 2
      ? ring(state.desk, 'revoke', minutes)
      : null,
  // called into his office the morning after you went against him
  (state, minutes) => (state.reviewAt !== null && minutes >= state.reviewAt && !state.desk.calls.review ? ring(state.desk, 'review', minutes) : null),
  // Thursday afternoon: someone you called to interview earlier in the week rings to say thanks
  (state, minutes) => {
    if (state.currentDayIndex !== THANKS_DAY || minutes < THANKS_AT || Object.keys(state.desk.calls).some((k) => k.startsWith('thanks:'))) return null;
    const early = state.finalists.find((f) => f.day <= THANKS_DAY - 1);
    return early ? ring(state.desk, `thanks:${early.id}`, minutes) : null;
  },
  // someone you turned away yesterday is waiting in the lobby
  (state, minutes) => {
    const due = visitorsToday(state.currentDayIndex, state.story.keyDecisions, state.dmHandled).find((v) => !state.desk.calls[v.id] && v.at <= minutes);
    return due ? ring(state.desk, due.id, minutes) : null;
  },
  // the day's scripted calls and the manager's favours, whichever fell due first
  (state, minutes) => {
    const desk = state.desk;
    const dueStatic = callsForDay(state.currentDayIndex).find((c) => !desk.calls[c.id] && c.at <= minutes);
    const dueRequest = state.managerScript.find((m) => m.kind === 'request' && m.at <= minutes);
    if (dueRequest?.request && (!dueStatic || dueRequest.at <= dueStatic.at)) {
      // the manager wants a favour: that's a phone call, never a message
      const r = dueRequest.request;
      const known = state.managerRequests.some((x) => x.id === r.id);
      return {
        managerScript: state.managerScript.filter((m) => m !== dueRequest),
        managerRequests: known ? state.managerRequests : [...state.managerRequests, { id: r.id, candidateId: r.candidateId, want: r.want, answer: null, template: r.template }],
        ...ring(desk, REQUEST_CALL_PREFIX + r.id, minutes) };
    }
    if (!dueStatic) return null;
    // someone walking up to your desk doesn't ring — the conversation just starts
    return dueStatic.walkIn ? { desk: { ...desk, inCall: dueStatic.id } } : ring(desk, dueStatic.id, minutes);
  },
];

/** Starts today's next landline call when it's due; a call left ringing too long is missed. */
export function ringLandline(minutes: number) {
  const state = getState();
  if (state.desk.inCall) return;
  if (state.desk.ringing) {
    const missed = letRing(state, minutes);
    if (missed) setState(missed);
    return;
  }
  // the line stays quiet right after a text, and around lunch
  if (minutes - lastTextAt(state) < QUIET_GAP) return;
  if (minutes >= BREAK_START_MIN - 15 && minutes < BREAK_END_MIN) return;
  for (const source of CALL_SOURCES) {
    const patch = source(state, minutes);
    if (patch) return setState(patch);
  }
}

/**
 * The clock's end of the day. At 17:00 you go home if every file is closed; otherwise you
 * stay (unpaid) until 20:00, and whatever is still open then comes out of your wage.
 */
/** People rejected today who haven't been sent anything yet. */
export function mailsPending(state: Pick<GameState, 'currentDayIndex' | 'lineups' | 'decisions' | 'rejectionMailsSent' | 'plannedRejections'>) {
  return !state.rejectionMailsSent && lineupFor(state).some((id) => state.decisions[id] === 'reject' && !state.plannedRejections[id]);
}

/** When the outbox goes out: end of the working day. */
export const MAIL_SEND_AT = WORKDAY_END_MIN;

/**
 * 17:00 (or the day closing early): the outbox goes out. Anyone rejected without a planned
 * notice gets nothing. Effects land now, not when the notices were written.
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
    // honest feedback costs a little of the pace; silence costs something else
    vicdan: clampScore(state.vicdan + personal - none),
    performans: clampScore(state.performans - Math.floor(personal / 2)) });
}

/** 16:00: the one-hour warning before overtime. */
const OVERTIME_WARN_AT = WORKDAY_END_MIN - 60;

export function checkDayEnd(minutes: number) {
  const state = getState();
  if (state.phase !== 'gameplay') return;
  // an hour before the end: what's still open, and what happens if it stays open
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
    // Thursday, no system: the whole team stays until 19:00
    const teamLate = state.currentDayIndex === TEAM_LATE_DAY;
    const pending = mailsPending(state);
    if (open === 0 && !pending) dispatchRejections();
    if (open === 0 && !pending && !teamLate) {
      state.finishDay();
      return;
    }
    // mom notices you're not home
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

/** Time spent away from the screen (a call, a sip, the flowers) — stops at lunch and at 17:00. */
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
 * How long a chat waits for your answer (workday minutes). Group chats move on quickly — an
 * answer half an hour late lands in the middle of another conversation. Hakan Bey and Zehra
 * wait: those threads carry the story.
 */
// in game minutes (1.3 per real second): the group chats wait about 45 real seconds for you
export const REPLY_WINDOW: Partial<Record<ThreadId, number>> = { office: 60, birthday: 60, mom: 90, ayse: 60 };

export function expireReplies(minutes: number) {
  const state = getState();
  const stale = (m: PhoneMessage) => {
    const window = REPLY_WINDOW[m.thread];
    return window !== undefined && m.from === 'them' && m.replies && !m.answered && !m.expired && (m.day ?? state.currentDayIndex) === state.currentDayIndex && minutes - m.at > window;
  };
  if (state.phone.some(stale)) setState({ phone: state.phone.map((m) => (stale(m) ? { ...m, expired: true } : m)) });
}

export function deliverManagerMessages(minutes: number) {
  const state = getState();
  const lineup = lineupFor(state);
  const open = lineup.filter((id) => !state.decisions[id]).length;
  const tone = managerTone(state.managerStance.refusals);
  const awaiting = managerAwaiting(state);

  if (state.desk.ringing || state.desk.inCall) {
    if (state.lastLandlineAt !== minutes) setState({ lastLandlineAt: minutes });
    return;
  }
  if (state.lastLandlineAt !== null && minutes - state.lastLandlineAt < QUIET_GAP) return;
  // favours for candidates come over the landline (ringLandline), never in writing
  const next = state.managerScript.find((m) => m.at <= minutes && (m.kind === 'ambient' || (!awaiting && m.kind !== 'request')));
  // group chats run at their own pace (colleagues answer each other within a minute); everything else keeps its distance
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
    replies: m.ambient?.replies ?? (m.kind === 'reprimand' ? reprimandReplies(tone) : managerQuickReplies(m.kind, tone, open)) }));

  const nudged = state.managerNudged;
  if (messages.length === 0) return;

  const unread = { ...state.phoneUnread };
  messages.forEach((m) => (unread[m.thread] += 1));
  const requests = delivered.flatMap((m) =>
    m.request ? [{ id: m.request.id, candidateId: m.request.candidateId, want: m.request.want, answer: null }] : [],
  );
  const momCount = messages.filter((m) => m.thread === 'mom').length;
  const unlocks = delivered.some((m) => m.ambient?.unlock) && state.story.drawer === 'locked';
  // "let's drop it": nobody answers a closed topic
  const closed: ThreadId[] = delivered.flatMap((m) => (m.ambient?.closes ? [m.ambient.thread] : []));
  const history = closed.length ? state.phone.map((m) => (closed.includes(m.thread) && m.replies && !m.answered ? { ...m, answered: true } : m)) : state.phone;
  setState({
    story: unlocks ? { ...state.story, drawer: 'unlocked' } : state.story,
    week: momCount ? { ...state.week, momMessages: state.week.momMessages + momCount } : state.week,
    managerScript: state.managerScript.filter((m) => !delivered.includes(m)),
    phone: [...history, ...messages],
    phoneUnread: unread,
    managerRequests: [...state.managerRequests, ...requests],
    managerNudged: nudged });
  sound().playPhoneBuzz();
}

/** Closing the queue before 15:30 counts as "early"; Hakan Bey only checks from 14:00 on. */
const EXTRA_FILES_BEFORE = WORKDAY_END_MIN - 90;
export const EXTRA_FILES_FROM = 6 * 60;

/**
 * You closed today's queue early: Hakan Bey notices and "finds" 2–4 more files in the system's
 * waiting list. Once a day, only on a screening day, never someone already in the week.
 * The files go to the top of the queue; if they aren't closed by 17:00, overtime as usual.
 * Only while you're still at your desk: "Günü Bitir" with every file closed sends you home.
 * Returns whether files were added.
 */
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
    // the new files land at the top of the queue, where they're seen
    lineups: s.lineups.map((l, i) => (i === day ? [...picked, ...l] : l)),
    phone: [...s.phone, { id: takeMessageId(), thread: 'manager', at: s.workdayMinutes, day, from: 'them', text }],
    phoneUnread: { ...s.phoneUnread, manager: s.phoneUnread.manager + 1 },
  });
  sound().playPhoneBuzz();
  return true;
}
