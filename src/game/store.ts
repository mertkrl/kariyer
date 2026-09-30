import { create } from 'zustand';
import type { DayStats, Difficulty, EventKind } from './types';
import { days, FINALIST_LIMIT } from './data/days';
import { DAY_PLANS } from './data/dayPlans';
import { BILLS, DAILY_WAGE, EXPENSES, EVENING_ACTIVITIES, OPEN_FILE_PENALTY, QUOTA_CUT_BELOW, TARGET_BONUS, TARGET_BONUS_AT, PRIM, RENT, START_MONEY, KEY_CHARACTERS } from './story';
import { candidateDetails } from './data/candidateDetails';
import { decisionEffect } from './engine/scoring';
import { AD_EFFECT } from './data/jobs';
import type { Mail } from './mail';
import { visitorsToday } from './visits';
import { REFERENCE_MINUTES, referenceFor } from './references';
import { CALLBACK_MINUTES, COOLER_MINUTES, COOLER_THOUGHTS, COFFEE_SIPS, COFFEE_THOUGHTS, IDLE_THOUGHTS, REFILL_MINUTES, REFILL_THOUGHTS, REQUEST_CALL_PREFIX, RING_MINUTES, WATER_MINUTES, callsForDay } from './desk';
import { candidates } from './data/candidates';
import { defaultLineups, makeLineups, KEY_CAST } from './lineups';
import {
  REPLY_EFFECT,
  buildManagerScript,
  evaluateRequests,
  MOM_POOL_SIZE,
  managerQuickReplies,
  reprimandReplies,
  managerReaction,
  managerTone,
  GROUP_THREADS,
  OVERTIME_MOM,
  renderManagerMessage,
  replyText,
  reprimandText,
  requestIsFair,
  type PhoneMessage,
  type ThreadId,
} from './manager';
import { audioEngine } from '../audio/audioEngine';
import { BREAK_END_MIN, BREAK_START_MIN, MINUTES_PER_TICK, OVERTIME_END_MIN, WORKDAY_END_MIN, formatClock, isBreakTime } from './time';
import { leventMail, type WeekEntry } from './echoes';
import { MEETING_AT, MEETING_DAY, MEETING_MINUTES, OPTIONS } from './meeting';
import { TEMPLATE_MINUTES, candidateReplies, outboxMails, sentMails, type RejectTemplate } from './rejectionMails';
import type { Finalist, DayEvent, WeekLog, StoryState, DeskState, DmKind, GameState, InterviewStance } from './storeTypes';
import { callFor, panelDecision, revokeInvites, revokeTargets, REVOKE_AT } from './managerCalls';

export type { Finalist, DayEvent, ActiveEvent, WeekLog, StoryState, DeskState, DmKind, DecisionLogEntry, GameState, InterviewStance } from './storeTypes';
export { callFor, panelDecision, revokeTargets, salaryOf, SALARY_CAP } from './managerCalls';

const MUTED_STORAGE_KEY = 'kariyerweb-muted';

const MUSIC_VOLUME_KEY = 'kariyerweb-music-volume';
const SFX_VOLUME_KEY = 'kariyerweb-sfx-volume';
const DEFAULT_VOLUME = 0.8;

function readStoredMuted(): boolean {
  try {
    return localStorage.getItem(MUTED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function readStoredVolume(key: string): number {
  try {
    const raw = localStorage.getItem(key);
    const value = raw === null ? NaN : Number(raw);
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : DEFAULT_VOLUME;
  } catch {
    return DEFAULT_VOLUME;
  }
}

function storeVolume(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Storage unavailable (private mode etc.) — the setting just won't persist.
  }
}

// The engine must know the saved mute state before the very first click sound.
audioEngine.setMuted(readStoredMuted());
const initialMusicVolume = readStoredVolume(MUSIC_VOLUME_KEY);
const initialSfxVolume = readStoredVolume(SFX_VOLUME_KEY);
audioEngine.setMusicVolume(initialMusicVolume);
audioEngine.setSfxVolume(initialSfxVolume);

/** Today's candidate queue (randomised per game; see lineups.ts). */
export function lineupFor(state: Pick<GameState, 'currentDayIndex' | 'lineups'>, dayIndex = state.currentDayIndex): string[] {
  return state.lineups[dayIndex] ?? days[dayIndex].candidateIds;
}

/** Remaining final-round slots: today's daily cap and the week-wide cap, whichever is tighter. */
export function approvalQuota(state: Pick<GameState, 'currentDayIndex' | 'decisions' | 'finalists' | 'lineups'> & { quotaCut?: boolean }) {
  const day = days[state.currentDayIndex];
  const approvedToday = lineupFor(state).filter((id) => state.decisions[id] === 'approve').length;
  const dailyLimit = (day.approvalLimit ?? Infinity) - (state.quotaCut ? 1 : 0);
  const totalUsed = state.finalists.length + approvedToday;
  return {
    approvedToday,
    dailyLimit,
    dailyLeft: Math.max(0, dailyLimit - approvedToday),
    totalUsed,
    totalLeft: Math.max(0, FINALIST_LIMIT - totalUsed),
    canApprove: approvedToday < dailyLimit && totalUsed < FINALIST_LIMIT };
}

const emptyWeek = (): WeekLog => ({ reviewTicks: 0, reviewed: 0, momMessages: 0, momAnswered: 0, managerIgnored: 0, events: 0 });

/** Game minutes that pass per second of play. */
export const minutesPerTick = (d: Difficulty) => (d === 'hard' ? MINUTES_PER_TICK * 1.35 : MINUTES_PER_TICK);

const EVENT_LENGTH: Record<EventKind, number> = { power: 20, meeting: 4, it: 60, calendar: 5, weather: 6 };

function planEvents(rand: () => number = Math.random): DayEvent[] {
  // hard mode's surprises: nothing that just eats the clock (no "5-minute" meetings)
  const kinds: EventKind[] = ['power', 'it'].sort(() => rand() - 0.5) as EventKind[];
  return [
    { kind: kinds[0], at: Math.round(90 + rand() * 120) },
    { kind: kinds[1], at: Math.round(320 + rand() * 130) },
  ];
}

const newDesk = (): DeskState => ({ cleared: [], flower: false, lastWatered: 0, coffee: COFFEE_SIPS, sipsToday: 0, refills: 0, coolerVisits: 0, calls: {}, ringing: null, ringingSince: 0, inCall: null, notice: null });

const newStory = (): StoryState => ({
  drawer: 'locked',
  photoPages: 0,
  evidence: null,
  money: START_MONEY,
  bills: {},
  wageToday: 0,
  primToday: 0,
  penaltyToday: 0,
  bonusToday: 0,
  spentToday: 0,
  activities: [],
  overtimeToday: false,
  rent: null,
  keyDecisions: {},
  managerDay: { complied: [], defied: [] },
  reform: null,
  pastRequests: [],
  neighbourCv: false,
  ledger: {} });

const DM_EFFECT: Record<DmKind, { performans: number; vicdan: number }> = {
  honest: { performans: -1, vicdan: 2 },
  template: { performans: 0, vicdan: 0 },
  ignore: { performans: 0, vicdan: -1 } };

/** A conscience this low keeps you up at night: you start the next day late. */
const SLEEPLESS_BELOW = 35;
const SLEEPLESS_MINUTES = 25;
/** Thursday the whole team stays late (no AI): until 19:00. */
export const TEAM_LATE_DAY = 3;
export const TEAM_LATE_END = 11 * 60;
/** Writing up a reason for a rejection, once Hakan Bey asks for one. */
const JUSTIFY_MINUTES = 3;

const emptyStance = (): InterviewStance => ({ protected: 0, silent: 0, honest: 0, polished: 0 });

const emptyStats = (): DayStats => ({ approved: 0, rejected: 0, autoRejected: 0, undecided: 0 });

let nextMessageId = 1;
const noUnread = (): Record<ThreadId, number> => ({ manager: 0, mom: 0, office: 0, zehra: 0, ayse: 0, birthday: 0 });
const clampScore = (v: number) => Math.max(0, Math.min(100, v));

/** True when the manager is waiting for your answer (pending request or an unanswered message). */
function managerAwaiting(state: GameState) {
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
const QUIET_GAP = 10;
const TEXT_GAP = 8;
let lastLandlineAt = -Infinity;

// only today's messages count: the phone keeps last night's texts, and their late clock times
// would otherwise hold back the whole next morning and release it in one burst
const lastTextAt = (state: GameState) =>
  state.phone.reduce((at, m) => (m.from === 'them' && (m.day ?? state.currentDayIndex) === state.currentDayIndex ? Math.max(at, m.at) : at), -Infinity);

/** Starts today's next landline call when it's due; a call left ringing too long is missed. */
function ringLandline(minutes: number) {
  const state = useGameStore.getState();
  const desk = state.desk;
  if (desk.inCall) return;
  if (!desk.ringing && minutes - lastTextAt(state) < QUIET_GAP) return;
  if (!desk.ringing && minutes >= BREAK_START_MIN - 15 && minutes < BREAK_END_MIN) return;
  // Wednesday afternoon: two of your invitations are to be taken back
  if (!desk.ringing && state.currentDayIndex === 2 && minutes >= REVOKE_AT && !desk.calls.revoke && !state.revoked && revokeTargets(state.finalists).length === 2) {
    useGameStore.setState({ desk: { ...desk, ringing: 'revoke', ringingSince: minutes } });
    return;
  }
  // called into his office the morning after you went against him
  if (!desk.ringing && state.reviewAt !== null && minutes >= state.reviewAt && !desk.calls.review) {
    useGameStore.setState({ desk: { ...desk, ringing: 'review', ringingSince: minutes } });
    return;
  }
  if (desk.ringing) {
    if (minutes - desk.ringingSince < RING_MINUTES) return;
    const id = desk.ringing;
    if (id.startsWith(REQUEST_CALL_PREFIX) && desk.calls[id] !== 'missed') {
      // he'll ring back
      const r = state.managerRequests.find((x) => x.id === id.slice(REQUEST_CALL_PREFIX.length));
      useGameStore.setState({
        desk: { ...desk, ringing: null, calls: { ...desk.calls, [id]: 'missed' }, notice: 'Hakan Bey aradı, açmadın. Birazdan tekrar arar.', noticeKind: 'missed' },
        managerScript: r
          ? [...state.managerScript, { at: minutes + CALLBACK_MINUTES, kind: 'request' as const, dayIndex: state.currentDayIndex, retry: true, request: { id: r.id, candidateId: r.candidateId, want: r.want, template: r.template ?? 0 } }]
          : state.managerScript });
      return;
    }
    const call = callFor(state, id);
    if (!call) return;
    useGameStore.setState({
      ...(id === 'revoke' ? revokeInvites(state, null) : {}),
      performans: clampScore(state.performans + (call.missed.performans ?? 0)),
      vicdan: clampScore(state.vicdan + (call.missed.vicdan ?? 0)),
      desk: { ...desk, ringing: null, calls: { ...desk.calls, [id]: 'missed' }, notice: call.missed.note, noticeKind: 'missed', flower: desk.flower || !!call.flower, lastWatered: call.flower ? state.currentDayIndex : desk.lastWatered } });
    return;
  }
  // Thursday afternoon: someone you called to interview earlier in the week rings to say thanks
  if (state.currentDayIndex === 3 && minutes >= 300 && !Object.keys(desk.calls).some((k) => k.startsWith('thanks:'))) {
    const early = state.finalists.find((f) => f.day <= 2);
    if (early) {
      useGameStore.setState({ desk: { ...desk, ringing: `thanks:${early.id}`, ringingSince: minutes } });
      return;
    }
  }
  // someone you turned away yesterday is waiting in the lobby
  const dueVisit = visitorsToday(state.currentDayIndex, state.story.keyDecisions, state.dmHandled).find((v) => !desk.calls[v.id] && v.at <= minutes);
  if (dueVisit) {
    useGameStore.setState({ desk: { ...desk, ringing: dueVisit.id, ringingSince: minutes } });
    return;
  }
  const dueStatic = callsForDay(state.currentDayIndex).find((c) => !desk.calls[c.id] && c.at <= minutes);
  const dueRequest = state.managerScript.find((m) => m.kind === 'request' && m.at <= minutes);
  if (dueRequest?.request && (!dueStatic || dueRequest.at <= dueStatic.at)) {
    // the manager wants a favour: that's a phone call, never a message
    const r = dueRequest.request;
    const known = state.managerRequests.some((x) => x.id === r.id);
    useGameStore.setState({
      managerScript: state.managerScript.filter((m) => m !== dueRequest),
      managerRequests: known ? state.managerRequests : [...state.managerRequests, { id: r.id, candidateId: r.candidateId, want: r.want, answer: null, template: r.template }],
      desk: { ...desk, ringing: REQUEST_CALL_PREFIX + r.id, ringingSince: minutes } });
    return;
  }
  // someone walking up to your desk doesn't ring — the conversation just starts
  if (dueStatic?.walkIn) useGameStore.setState({ desk: { ...desk, inCall: dueStatic.id } });
  else if (dueStatic) useGameStore.setState({ desk: { ...desk, ringing: dueStatic.id, ringingSince: minutes } });
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
function dispatchRejections() {
  const state = useGameStore.getState();
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
  useGameStore.setState({
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

function checkDayEnd(minutes: number) {
  const state = useGameStore.getState();
  if (state.phase !== 'gameplay') return;
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
    useGameStore.setState({
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
    audioEngine.playPhoneBuzz();
    return;
  }
  if (state.overtime && minutes >= OVERTIME_END_MIN) state.finishDay();
  // on the team's late Thursday, 19:00 sends you home if your files are done
  else if (state.overtime && state.currentDayIndex === TEAM_LATE_DAY && minutes >= TEAM_LATE_END && lineupFor(state).every((id) => state.decisions[id]) && !mailsPending(state)) state.finishDay();
}

const dayLimit = (state: Pick<GameState, 'overtime'>) => (state.overtime ? OVERTIME_END_MIN : WORKDAY_END_MIN);

/** Time spent away from the screen (a call, a sip, the flowers) — stops at lunch and at 17:00. */
function spendMinutes(minutes: number) {
  const state = useGameStore.getState();
  if (state.phase !== 'gameplay' || isOnBreak(state) || !state.shiftStarted) return;
  let next = state.workdayMinutes + minutes;
  if (state.workdayMinutes < BREAK_START_MIN && next >= BREAK_START_MIN) next = BREAK_START_MIN;
  next = Math.min(next, dayLimit(state));
  useGameStore.setState({ workdayMinutes: next });
  expireReplies(next);
  deliverManagerMessages(next);
  checkDayEnd(next);
}

/**
 * How long a chat waits for your answer (workday minutes). Group chats move on quickly — an
 * answer half an hour late lands in the middle of another conversation. Hakan Bey and Zehra
 * wait: those threads carry the story.
 */
const REPLY_WINDOW: Partial<Record<ThreadId, number>> = { office: 25, birthday: 25, mom: 90, ayse: 60 };

function expireReplies(minutes: number) {
  const state = useGameStore.getState();
  const stale = (m: PhoneMessage) => {
    const window = REPLY_WINDOW[m.thread];
    return window !== undefined && m.from === 'them' && m.replies && !m.answered && !m.expired && (m.day ?? state.currentDayIndex) === state.currentDayIndex && minutes - m.at > window;
  };
  if (state.phone.some(stale)) useGameStore.setState({ phone: state.phone.map((m) => (stale(m) ? { ...m, expired: true } : m)) });
}

function deliverManagerMessages(minutes: number) {
  const state = useGameStore.getState();
  const lineup = lineupFor(state);
  const open = lineup.filter((id) => !state.decisions[id]).length;
  const tone = managerTone(state.managerStance.refusals);
  const awaiting = managerAwaiting(state);

  if (state.desk.ringing || state.desk.inCall) {
    lastLandlineAt = minutes;
    return;
  }
  if (minutes - lastLandlineAt < QUIET_GAP) return;
  // favours for candidates come over the landline (ringLandline), never in writing
  const next = state.managerScript.find((m) => m.at <= minutes && (m.kind === 'ambient' || (!awaiting && m.kind !== 'request')));
  // group chats run at their own pace (colleagues answer each other within a minute); everything else keeps its distance
  const group = next?.ambient && GROUP_THREADS.includes(next.ambient.thread);
  if (minutes - lastTextAt(state) < (group ? 1 : TEXT_GAP)) return;
  const delivered = next ? [next] : [];

  const messages: PhoneMessage[] = delivered.map((m) => ({
    id: nextMessageId++,
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
  useGameStore.setState({
    story: unlocks ? { ...state.story, drawer: 'unlocked' } : state.story,
    week: momCount ? { ...state.week, momMessages: state.week.momMessages + momCount } : state.week,
    managerScript: state.managerScript.filter((m) => !delivered.includes(m)),
    phone: [...history, ...messages],
    phoneUnread: unread,
    managerRequests: [...state.managerRequests, ...requests],
    managerNudged: nudged });
  audioEngine.playPhoneBuzz();
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'welcome',
  currentDayIndex: 0,

  performans: 50,
  vicdan: 50,

  workdayMinutes: 0,
      breakOver: false,
      overtime: false,
  openedIds: [],
  currentCandidateId: null,
  decisions: {},
  decisionLog: [],
  timeSpent: {},

  dayStats: emptyStats(),
  totalStats: emptyStats(),

  finalists: [],
  hiredId: null,
  recommendedId: null,
  lineups: defaultLineups(),

  phone: [],
  phoneUnread: noUnread(),
  managerRequests: [],
  managerScript: [],
  managerVerdict: [],
  managerStance: { refusals: 0, complies: 0 },
  managerNudged: [],
  momOrder: [],
  managerGrievances: [],

  difficulty: 'normal',
  aiUses: 0,
  week: emptyWeek(),
  dayEvents: [],
  activeEvent: null,
  weekendChoice: null,
  dmHandled: {},
  story: newStory(),
  desk: newDesk(),
  mailRead: [],
  extraMails: [],
  weekLog: [],
  orientationDone: false,
  rejectionMailsSent: false,
  plannedRejections: {},
  rejectionStats: { standard: 0, personal: 0, pool: 0, none: 0 },
  rejectionToday: { standard: 0, personal: 0, pool: 0, none: 0 },
  meeting: { state: 'pending', choice: null },
  justifyRejects: false,
  reviewAt: null,
  revoked: null,
  revokeDraft: null,
  referenceChecks: {},
  forbiddenAsked: 0,
  interviewStance: emptyStance(),
  decisionEffects: {},
  lastEffect: null,
  quotaCut: false,

  muted: readStoredMuted(),
  paused: false,
  shiftStarted: false,
  lateReason: null,
  seed: 1,
  dayStart: { performans: 50, vicdan: 50 },
  mutedThreads: [],
  typingThread: null,
  musicVolume: initialMusicVolume,
  sfxVolume: initialSfxVolume,

  selectedJobId: null,

  startGame: () => {
    set({ seed: Math.floor(Math.random() * 1e9), lineups: makeLineups(), momOrder: [...Array(MOM_POOL_SIZE).keys()].sort(() => Math.random() - 0.5) });
    audioEngine.init();
    audioEngine.setMuted(get().muted);
    audioEngine.startAmbient();
    set({
      phase: 'jobSelect',
      currentDayIndex: 0,
      performans: 50,
      vicdan: 50,
      workdayMinutes: 0,
      breakOver: false,
      overtime: false,
      openedIds: [],
      currentCandidateId: null,
      decisions: {},
      decisionLog: [],
      timeSpent: {},
      dayStats: emptyStats(),
      totalStats: emptyStats(),
      finalists: [],
      hiredId: null,
      recommendedId: null,
      phone: [],
      phoneUnread: noUnread(),
      managerRequests: [],
      managerScript: [],
      managerVerdict: [],
      managerStance: { refusals: 0, complies: 0 },
      managerGrievances: [],
      paused: false,
      selectedJobId: null,
      aiUses: 0,
      week: emptyWeek(),
      dayEvents: [],
      activeEvent: null,
      weekendChoice: null,
      dmHandled: {},
      story: newStory(),
      desk: newDesk(),
      mailRead: [],
      extraMails: [],
      weekLog: [],
      orientationDone: false,
      rejectionMailsSent: false,
      plannedRejections: {},
      rejectionStats: { standard: 0, personal: 0, pool: 0, none: 0 },
      rejectionToday: { standard: 0, personal: 0, pool: 0, none: 0 },
      meeting: { state: 'pending', choice: null },
      justifyRejects: false,
      revoked: null,
      revokeDraft: null,
      referenceChecks: {},
      forbiddenAsked: 0,
      interviewStance: emptyStance(),
      decisionEffects: {},
      lastEffect: null,
      quotaCut: false });
  },

  publishJob: (jobId) =>
    set((state) => ({
      selectedJobId: jobId,
      // how the ad was worded decides who never applies
      lineups: AD_EFFECT[jobId]
        ? state.lineups.map((day) => day.filter((id) => KEY_CAST.includes(id) || id === 'baris' || !AD_EFFECT[jobId].skip(candidates[id])))
        : state.lineups,
      phase: 'applicationFlood',
      // A harsh manager from the first morning on in hard mode.
      managerStance: state.difficulty === 'hard' ? { refusals: 1, complies: 0 } : { refusals: 0, complies: 0 } })),

  proceedToBriefing: () => set({ phase: 'briefing' }),

  beginDay: () => {
    const state = get();
    lastLandlineAt = -Infinity;
    // a bad conscience costs you sleep — once; after that you're too tired not to sleep
    const sleepless = state.currentDayIndex > 0 && state.vicdan < SLEEPLESS_BELOW && !state.story.sleptBadly;
    // performance too low: the manager trusts you with one interview slot fewer
    const quotaCut = state.currentDayIndex > 0 && state.performans < QUOTA_CUT_BELOW;
    const day = days[state.currentDayIndex];
    const plan = DAY_PLANS[state.currentDayIndex] ?? { calendar: [] };
    if (day.final) {
      set({ phase: 'finalRound', paused: false });
      return;
    }
    // Hakan Bey, after you went against him: a mail that says nothing quotable, a "short" meeting
    const tone = managerTone(state.managerStance.refusals);
    const defiedYesterday = state.currentDayIndex > 0 && state.story.managerDay.defied.length > 0 && state.story.managerDay.defied.length >= state.story.managerDay.complied.length;
    const justifyRejects = state.justifyRejects || (defiedYesterday && tone >= 2);
    const lateMinutes = sleepless ? SLEEPLESS_MINUTES : 0;
    const levent = leventMail(state.currentDayIndex, state.weekLog, state.meeting.choice);
    const reprimand: Mail[] =
      state.managerGrievances.length > 0 || defiedYesterday
        ? [
            {
              id: `reprimand-${state.currentDayIndex}`,
              day: state.currentDayIndex,
              at: 0,
              from: 'Hakan Kaya',
              address: 'hakan.kaya@tavrinsalabs.test',
              subject: 'Dünkü değerlendirmeler hk.',
              important: true,
              body: reprimandText(
                state.managerGrievances.length ? state.managerGrievances : state.story.managerDay.defied.map((id) => ({ name: candidates[id].name.split(' ')[0], want: 'approve' as const, promised: false })),
                tone,
                { meeting: defiedYesterday, justify: justifyRejects && !state.justifyRejects },
              ) },
          ]
        : [];
    const lineups =
      state.currentDayIndex === 3 && state.story.neighbourCv && !lineupFor(state).includes('onur')
        ? state.lineups.map((l, i) => (i === 3 ? [...l, 'onur'] : l))
        : state.lineups;
    set({
      phase: 'gameplay',
      paused: false,
      shiftStarted: false,
      lineups,
      extraMails: [...state.extraMails.filter((m) => m.id !== `levent-${state.currentDayIndex}`), ...reprimand, ...(levent ? [levent] : [])],
      justifyRejects,
      reviewAt: defiedYesterday ? lateMinutes + 30 : null,
      phone: state.phone.map((m) => (m.replies && !m.answered ? { ...m, answered: true } : m)),
      dayStart: { performans: state.performans, vicdan: state.vicdan },
      rejectionMailsSent: false,
      plannedRejections: {},
      rejectionToday: { standard: 0, personal: 0, pool: 0, none: 0 },
      phoneUnread: noUnread(),
      managerRequests: [],
      managerVerdict: [],
      managerNudged: [],
      managerScript: buildManagerScript(state.currentDayIndex, lineupFor({ currentDayIndex: state.currentDayIndex, lineups }), {
        momOrder: state.momOrder.length ? state.momOrder : undefined,
        hard: state.difficulty === 'hard',
        homeNotes: [],
        managerDay: state.currentDayIndex > 0 ? state.story.managerDay : undefined }),
      managerGrievances: [],
      desk: { ...state.desk, coffee: COFFEE_SIPS, sipsToday: 0, refills: 0, ringing: null, inCall: null, notice: null },
      breakOver: false,
      overtime: false,
      quotaCut,
      decisionEffects: {},
      lastEffect: null,
      // weather can make you late — and so can a bad conscience, or an empty travel card
      workdayMinutes: lateMinutes,
      dayEvents: [
        ...plan.calendar.map((c) => ({ kind: 'calendar' as const, at: c.at, minutes: c.minutes, text: c.text })),
        ...(state.difficulty === 'hard' ? planEvents() : []),
      ].sort((a, b) => a.at - b.at),
      activeEvent: null,
      lateReason: sleepless ? `Gece uyuyamadın; gözünün önünden dosyalar geçti. Masana ${formatClock(SLEEPLESS_MINUTES)}'te oturabildin.` : null,
      story: sleepless ? { ...state.story, sleptBadly: true } : state.story });
  },

  selectCandidate: (id) => {
    const state = get();
    if (isOnBreak(state)) return;

    const alreadyOpened = state.openedIds.includes(id);
    if (!alreadyOpened) {
      set({
        openedIds: [...state.openedIds, id],
        timeSpent: { ...state.timeSpent, [id]: 0 },
        currentCandidateId: id });
    } else {
      set({ currentCandidateId: id });
    }
  },

  tick: () => {
    const state = get();
    if (state.phase !== 'gameplay' || state.paused || !state.shiftStarted) return;
    // the clock stops at the conference room door; the meeting takes its time when it ends
    if (state.meeting.state === 'active') return;
    if (state.currentDayIndex === MEETING_DAY && state.meeting.state === 'pending' && state.workdayMinutes >= MEETING_AT && !isOnBreak(state)) {
      set({ meeting: { ...state.meeting, state: 'active' } });
      audioEngine.playUi('select', 1);
      return;
    }

    // Lunch is an hour of the clock too: eat fast, or eat into your break. The landline waits.
    if (isOnBreak(state)) {
      const next = Math.min(BREAK_END_MIN, state.workdayMinutes + minutesPerTick(state.difficulty));
      set({ workdayMinutes: next });
      expireReplies(next);
      deliverManagerMessages(next);
      return;
    }

    let nextMinutes = state.workdayMinutes + minutesPerTick(state.difficulty);
    let activeEvent = state.activeEvent && nextMinutes < state.activeEvent.until ? state.activeEvent : null;
    let dayEvents = state.dayEvents;
    let week = state.week;
    const due = dayEvents.find((e) => e.at <= nextMinutes);
    if (due && !activeEvent) {
      dayEvents = dayEvents.filter((e) => e !== due);
      week = { ...week, events: week.events + 1 };
      if (due.kind === 'meeting') {
        // Dragged into an "urgent" meeting: half an hour gone in a blink.
        nextMinutes += 30;
        audioEngine.playPhoneBuzz();
      } else if (due.kind === 'calendar') {
        nextMinutes += due.minutes ?? 15;
        audioEngine.playUi('select', 2);
      } else {
        audioEngine.playUi(due.kind === 'power' ? 'click' : 'connect');
      }
      activeEvent = { kind: due.kind, until: nextMinutes + EVENT_LENGTH[due.kind], text: due.text };
    }
    if (state.workdayMinutes < BREAK_START_MIN && nextMinutes >= BREAK_START_MIN) {
      nextMinutes = BREAK_START_MIN;
    }
    nextMinutes = Math.min(nextMinutes, dayLimit(state));

    let timeSpent = state.timeSpent;
    const id = state.currentCandidateId;
    if (id && !state.decisions[id]) {
      timeSpent = { ...state.timeSpent, [id]: (state.timeSpent[id] ?? 0) + 1 };
    }

    set({ workdayMinutes: nextMinutes, timeSpent, activeEvent, dayEvents, week });
    ringLandline(nextMinutes);
    expireReplies(nextMinutes);
    deliverManagerMessages(nextMinutes);
    checkDayEnd(nextMinutes);
  },

  skipBreak: () => {
    const state = get();
    if (state.phase !== 'gameplay' || !isOnBreak(state)) return;
    // back to the desk early — but the afternoon still starts at 13:00
    set({ breakOver: true, workdayMinutes: BREAK_END_MIN });
  },

  decide: (decision) => {
    const state = get();
    if (isOnBreak(state)) return;
    if (state.activeEvent?.kind === 'power') return;
    const id = state.currentCandidateId;
    if (!id) return;

    const prevDecision = state.decisions[id];
    // Final-round quota: today's cap and the week-wide cap of FINALIST_LIMIT.
    if (decision === 'approve' && prevDecision !== 'approve' && !approvalQuota(state).canApprove) {
      audioEngine.playUi('click');
      return;
    }
    let performans = state.performans;
    let vicdan = state.vicdan;
    const dayStats = { ...state.dayStats };

    if (prevDecision) {
      const prev = state.decisionEffects[id];
      if (prev) {
        performans = clampScore(performans - prev.performans);
        vicdan = clampScore(vicdan - prev.vicdan);
      }
      if (prevDecision === 'approve') dayStats.approved -= 1;
      else dayStats.rejected -= 1;
    }

    // how you decided matters as much as what: reading the file, checking a reference
    const effect = decisionEffect(id, decision, { secondsSpent: state.timeSpent[id] ?? 0, referenceChecked: Boolean(state.referenceChecks[id]) });
    performans = clampScore(performans + effect.performans);
    vicdan = clampScore(vicdan + effect.vicdan);
    if (decision === 'approve') dayStats.approved += 1;
    else dayStats.rejected += 1;

    audioEngine.playStamp(decision);

    set({
      decisions: { ...state.decisions, [id]: decision },
      decisionLog: [...state.decisionLog.filter((e) => e.id !== id), { id, decision, at: state.workdayMinutes }],
      performans,
      vicdan,
      dayStats,
      decisionEffects: { ...state.decisionEffects, [id]: { performans: effect.performans, vicdan: effect.vicdan } },
      lastEffect: { id, reason: effect.reason, performans: effect.performans, vicdan: effect.vicdan, key: (state.lastEffect?.key ?? 0) + 1 } });
    // Hakan Bey wants every "no" in writing now
    if (state.justifyRejects && decision === 'reject' && prevDecision !== 'reject') spendMinutes(JUSTIFY_MINUTES);
    // staying late: closing the last open file sends you home
    const after = get();
    if (after.overtime && lineupFor(after).every((cid) => after.decisions[cid]) && !mailsPending(after) && !(after.currentDayIndex === TEAM_LATE_DAY && after.workdayMinutes < TEAM_LATE_END)) {
      window.setTimeout(() => get().finishDay(), 1400);
    }
  },

  undoDecision: () => {
    const state = get();
    if (isOnBreak(state)) return;
    const id = state.currentCandidateId;
    const prev = id ? state.decisions[id] : undefined;
    if (!id || !prev) return;

    const applied = state.decisionEffects[id] ?? { performans: 0, vicdan: 0 };
    const reverted = { performans: clampScore(state.performans - applied.performans), vicdan: clampScore(state.vicdan - applied.vicdan) };
    const decisionEffects = { ...state.decisionEffects };
    delete decisionEffects[id];
    const dayStats = { ...state.dayStats };
    if (prev === 'approve') dayStats.approved -= 1;
    else dayStats.rejected -= 1;

    const decisions = { ...state.decisions };
    delete decisions[id];

    audioEngine.playUndo();

    // a notice waiting in the outbox for this person is pulled back with the decision
    const plannedRejections = { ...state.plannedRejections };
    delete plannedRejections[id];
    set({
      plannedRejections,
      extraMails: state.extraMails.filter((m) => m.id !== `outbox-${state.currentDayIndex}-${id}`),
      decisions,
      decisionLog: state.decisionLog.filter((e) => e.id !== id),
      decisionEffects,
      lastEffect: null,
      performans: reverted.performans,
      vicdan: reverted.vicdan,
      dayStats });
  },

  finishDay: () => {
    if (get().phase !== 'gameplay') return;
    // the outbox goes out with the day (stamped 17:00); anyone without a notice hears nothing
    dispatchRejections();
    const state = get();
    const day = days[state.currentDayIndex];
    // The AI's cut: every application from the flood counter that never reached a human.
    const lineup = lineupFor(state);
    const autoRejected = Math.max(0, day.applicationTarget - lineup.length);
    const undecided = lineup.filter((id) => !state.decisions[id]).length;
    const today = (m: PhoneMessage) => (m.day ?? state.currentDayIndex) === state.currentDayIndex;
    const ignored = state.phone.filter((m) => today(m) && m.thread === 'manager' && m.from === 'them' && m.replies && !m.answered).length;
    const verdict = evaluateRequests(state.managerRequests, state.decisions, ignored, state.referenceChecks);
    // a message from home left on "seen"
    const momIgnored = state.phone.filter((m) => today(m) && m.thread === 'mom' && m.from === 'them' && m.replies && !m.answered).length;
    if (momIgnored > 0) {
      verdict.vicdan -= momIgnored;
      verdict.lines.push(`Annenin ${momIgnored} mesajını cevapsız bıraktın.`);
    }

    const dayStats: DayStats = { ...state.dayStats, autoRejected, undecided };
    const advanced = state.decisionLog
      .filter((e) => e.decision === 'approve' && state.decisions[e.id] === 'approve')
      .map((e) => ({ id: e.id, day: day.day }) as Finalist);
    // the people he asked you to call come to the interviews anyway
    for (const r of state.managerRequests)
      if (r.want === 'approve' && state.decisions[r.candidateId] !== 'approve' && !state.finalists.some((f) => f.id === r.candidateId))
        advanced.push({ id: r.candidateId, day: day.day, byManager: true });
    const totalStats: DayStats = {
      approved: state.totalStats.approved + dayStats.approved,
      rejected: state.totalStats.rejected + dayStats.rejected,
      autoRejected: state.totalStats.autoRejected + dayStats.autoRejected,
      undecided: state.totalStats.undecided + dayStats.undecided };

    const decidedIds = lineup.filter((id) => state.decisions[id]);
    const week: WeekLog = {
      ...state.week,
      reviewTicks: state.week.reviewTicks + decidedIds.reduce((n, id) => n + (state.timeSpent[id] ?? 0), 0),
      reviewed: state.week.reviewed + decidedIds.length,
      managerIgnored: state.week.managerIgnored + ignored };

    const prim = state.managerRequests.filter((r) => state.decisions[r.candidateId] === r.want).length * PRIM;
    const keyDecisions = { ...state.story.keyDecisions };
    for (const k of KEY_CHARACTERS) if (lineup.includes(k.id) && state.decisions[k.id]) keyDecisions[k.id] = state.decisions[k.id];
    // files still open when you leave come out of the day's wage
    const penalty = Math.min(DAILY_WAGE, undecided * OPEN_FILE_PENALTY);
    // a strong day pays: the target bonus
    const bonus = clampScore(state.performans + verdict.performans) >= TARGET_BONUS_AT ? TARGET_BONUS : 0;
    const story: StoryState = {
      ...state.story,
      money: state.story.money,
      wageToday: DAILY_WAGE,
      primToday: prim,
      bonusToday: bonus,
      penaltyToday: penalty,
      spentToday: 0,
      overtimeToday: state.overtime,
      keyDecisions,
      pastRequests: [...state.story.pastRequests, ...state.managerRequests.map((r) => ({ candidateId: r.candidateId, want: r.want }))],
      managerDay: {
        complied: state.managerRequests.filter((r) => state.decisions[r.candidateId] === r.want).map((r) => r.candidateId),
        defied: state.managerRequests.filter((r) => state.decisions[r.candidateId] && state.decisions[r.candidateId] !== r.want).map((r) => r.candidateId) } };

    set({
      phase: 'dayEnd',
      week,
      story,
      activeEvent: null,
      dayEvents: [],
      dayStats,
      totalStats,
      finalists: [...state.finalists, ...advanced],
      performans: clampScore(state.performans + verdict.performans),
      vicdan: clampScore(state.vicdan + verdict.vicdan),
      managerVerdict: verdict.lines,
      managerGrievances: state.managerRequests
        .filter((r) => state.decisions[r.candidateId] !== r.want)
        .map((r) => ({ name: candidates[r.candidateId].name.split(' ')[0], want: r.want, promised: r.answer === 'comply' })) });
  },

  nextDay: () => {
    const state = get();
    const nextIndex = state.currentDayIndex + 1;

    if (nextIndex >= days.length) {
      set({ phase: 'final' });
      return;
    }

    const logged: WeekEntry[] = Object.entries(state.decisions).map(([id, decision]) => ({ id, day: state.currentDayIndex, decision }));
    set({
      weekLog: [...state.weekLog.filter((e) => e.day !== state.currentDayIndex), ...logged],
      // The final day has no new applications — straight to the memo.
      phase: days[nextIndex].final ? 'briefing' : 'applicationFlood',
      currentDayIndex: nextIndex,
      workdayMinutes: 0,
      breakOver: false,
      overtime: false,
      openedIds: [],
      currentCandidateId: null,
      decisions: {},
      decisionLog: [],
      timeSpent: {},
      dayStats: emptyStats() });
  },

  restart: () => {
    set({
      phase: 'welcome',
      currentDayIndex: 0,
      performans: 50,
      vicdan: 50,
      workdayMinutes: 0,
      breakOver: false,
      overtime: false,
      openedIds: [],
      currentCandidateId: null,
      decisions: {},
      decisionLog: [],
      timeSpent: {},
      dayStats: emptyStats(),
      totalStats: emptyStats(),
      finalists: [],
      hiredId: null,
      recommendedId: null,
      phone: [],
      phoneUnread: noUnread(),
      managerRequests: [],
      managerScript: [],
      managerVerdict: [],
      managerStance: { refusals: 0, complies: 0 },
      managerGrievances: [],
      paused: false,
      selectedJobId: null,
      aiUses: 0,
      week: emptyWeek(),
      dayEvents: [],
      activeEvent: null,
      weekendChoice: null,
  dmHandled: {},
  story: newStory(),
      desk: newDesk(),
      mailRead: [],
      extraMails: [],
      weekLog: [],
      orientationDone: false,
      rejectionMailsSent: false,
      plannedRejections: {},
      rejectionStats: { standard: 0, personal: 0, pool: 0, none: 0 },
      rejectionToday: { standard: 0, personal: 0, pool: 0, none: 0 },
      meeting: { state: 'pending', choice: null },
      justifyRejects: false,
      revoked: null,
      revokeDraft: null,
      referenceChecks: {},
      forbiddenAsked: 0,
      interviewStance: emptyStance(),
      decisionEffects: {},
      lastEffect: null,
      quotaCut: false });
  },

  togglePause: () => set((state) => ({ paused: !state.paused })),
  startShift: () => set({ shiftStarted: true }),
  finishOrientation: () => set({ orientationDone: true, shiftStarted: true }),
  sendRevoke: (honest) => {
    const state = get();
    if (!state.revokeDraft) return;
    audioEngine.playUi('confirm');
    set({
      ...revokeInvites(state, honest),
      revokeDraft: null,
      vicdan: clampScore(state.vicdan + (honest ? -1 : -3)) });
  },
  toggleMuteThread: (thread) =>
    set((state) => ({ mutedThreads: state.mutedThreads.includes(thread) ? state.mutedThreads.filter((t) => t !== thread) : [...state.mutedThreads, thread] })),

  pickUpCall: () => {
    const { desk } = get();
    if (!desk.ringing) return;
    set({ desk: { ...desk, inCall: desk.ringing, ringing: null } });
  },

  answerCall: (choice) => {
    const state = get();
    const id = state.desk.inCall;
    if (id?.startsWith('ref:')) {
      const cid = id.slice(4);
      const ref = referenceFor(cid);
      set({
        referenceChecks: ref ? { ...state.referenceChecks, [cid]: ref.verdict } : state.referenceChecks,
        desk: { ...state.desk, inCall: null, calls: { ...state.desk.calls, [id]: 'answered' } } });
      spendMinutes(REFERENCE_MINUTES);
      return;
    }
    if (id?.startsWith(REQUEST_CALL_PREFIX)) {
      const requestId = id.slice(REQUEST_CALL_PREFIX.length);
      const answer = choice === 0 ? 'comply' : 'refuse';
      const req = state.managerRequests.find((r) => r.id === requestId);
      // saying yes to a request the file backs up isn't a compromise
      const effect = req && requestIsFair(req) ? { performans: REPLY_EFFECT[answer].performans, vicdan: 0 } : REPLY_EFFECT[answer];
      set({
        managerRequests: state.managerRequests.map((r) => (r.id === requestId ? { ...r, answer } : r)),
        managerStance: {
          refusals: state.managerStance.refusals + (answer === 'refuse' ? 1 : 0),
          complies: state.managerStance.complies + (answer === 'comply' ? 1 : 0) },
        performans: clampScore(state.performans + effect.performans),
        vicdan: clampScore(state.vicdan + effect.vicdan),
        desk: { ...state.desk, inCall: null, calls: { ...state.desk.calls, [id]: 'answered' } } });
      spendMinutes(4);
      return;
    }
    const call = id ? callFor(state, id) : undefined;
    if (!call) return;
    const c = call.choices[choice];
    set({
      performans: clampScore(state.performans + (c?.performans ?? 0)),
      vicdan: clampScore(state.vicdan + (c?.vicdan ?? 0)),
      // telling them the truth face to face counts as honest feedback
      dmHandled: c?.honestFor ? { ...state.dmHandled, [c.honestFor]: 'honest' } : state.dmHandled,
      story: c?.reform ? { ...state.story, reform: c.reform } : state.story,
      ...(c?.revoke ? { revokeDraft: revokeTargets(state.finalists) } : {}),
      desk: {
        ...state.desk,
        inCall: c?.next ?? null,
        calls: { ...state.desk.calls, [call.id]: 'answered' },
        flower: state.desk.flower || !!call.flower,
        lastWatered: call.flower ? state.currentDayIndex : state.desk.lastWatered } });
    spendMinutes(call.minutes);
  },

  drinkCoffee: () => {
    const state = get();
    const desk = state.desk;
    if (desk.coffee <= 0) {
      // the kitchen: a fresh mug costs a few minutes
      set({ desk: { ...desk, coffee: COFFEE_SIPS, refills: desk.refills + 1 } });
      const pour = audioEngine.startPour('brew');
      pour.setFill(0.6);
      setTimeout(() => pour.stop(), 1100);
      spendMinutes(REFILL_MINUTES);
      return REFILL_THOUGHTS[desk.refills % REFILL_THOUGHTS.length];
    }
    const thoughts = COFFEE_THOUGHTS[Math.min(state.currentDayIndex, COFFEE_THOUGHTS.length - 1)];
    const thought = thoughts[desk.sipsToday] ?? IDLE_THOUGHTS[desk.sipsToday % IDLE_THOUGHTS.length];
    set({ desk: { ...desk, coffee: desk.coffee - 1, sipsToday: desk.sipsToday + 1 } });
    audioEngine.playSip();
    return thought;
  },

  waterFlower: () => {
    const state = get();
    if (!state.desk.flower || state.desk.lastWatered === state.currentDayIndex) return;
    set({ desk: { ...state.desk, lastWatered: state.currentDayIndex } });
    spendMinutes(WATER_MINUTES);
  },

  clearDeskNotice: () => set((state) => ({ desk: { ...state.desk, notice: null } })),
  clearDeskItem: (id) => set((state) => ({ desk: { ...state.desk, cleared: [...state.desk.cleared, id] } })),

  callReference: (candidateId) => {
    const state = get();
    if (state.desk.inCall || state.desk.ringing || isOnBreak(state) || !referenceFor(candidateId)) return false;
    audioEngine.playHandset();
    set({ desk: { ...state.desk, inCall: `ref:${candidateId}` } });
    return true;
  },

  doActivity: (id) => {
    const state = get();
    const a = EVENING_ACTIVITIES[state.currentDayIndex]?.find((x) => x.id === id);
    if (!a || state.story.activities.includes(id) || state.story.money < a.cost) return;
    audioEngine.playUi('confirm');
    set({ story: { ...state.story, money: state.story.money - a.cost, spentToday: state.story.spentToday + a.cost, activities: [...state.story.activities, id] } });
  },

  askForbidden: () =>
    set((state) => ({
      forbiddenAsked: state.forbiddenAsked + 1,
      performans: clampScore(state.performans + 2),
      vicdan: clampScore(state.vicdan - 4) })),

  planRejectionMails: (choices) => {
    const state = get();
    if (state.rejectionMailsSent) return;
    const day = state.currentDayIndex;
    // writing takes time: only for notices that are new or changed
    const minutes = Object.entries(choices).reduce((m, [id, t]) => m + (state.plannedRejections[id] === t ? 0 : TEMPLATE_MINUTES[t]), 0);
    const count = Object.values(choices).filter((t) => t !== 'none').length;
    const late = state.workdayMinutes >= MAIL_SEND_AT;
    set({
      plannedRejections: choices,
      extraMails: [...state.extraMails.filter((m) => !(m.folder === 'outbox' && m.day === day)), ...outboxMails(choices, day, state.workdayMinutes)],
      desk: {
        ...state.desk,
        noticeKind: late ? 'sent' : 'scheduled',
        notice: late
          ? `${count} ret bildirimi adaylara gönderildi.`
          : `${count} ret bildirimi giden kutusuna alındı ve bugün 17:00'de gönderilecek. O saate kadar kararlarını değiştirebilirsin; değişen adayın bildirimi otomatik olarak geri çekilir.` } });
    audioEngine.playUi('confirm');
    spendMinutes(Math.round(minutes));
    const after = get();
    // past 17:00 there is nothing to wait for
    if (after.workdayMinutes >= MAIL_SEND_AT && !mailsPending(after)) {
      dispatchRejections();
      const done = get();
      if (done.overtime && lineupFor(done).every((cid) => done.decisions[cid]) && !(done.currentDayIndex === TEAM_LATE_DAY && done.workdayMinutes < TEAM_LATE_END)) {
        window.setTimeout(() => get().finishDay(), 1400);
      }
    }
  },

  finishMeeting: (choice) => {
    const state = get();
    if (state.meeting.state !== 'active') return;
    const option = OPTIONS.find((o) => o.id === choice);
    set({
      meeting: { state: 'done', choice },
      workdayMinutes: state.workdayMinutes + MEETING_MINUTES,
      performans: clampScore(state.performans + (option?.performans ?? 0)),
      vicdan: clampScore(state.vicdan + (option?.vicdan ?? 0)) });
  },

  hakanInterrupt: (protect) =>
    set((state) => ({
      interviewStance: { ...state.interviewStance, [protect ? 'protected' : 'silent']: state.interviewStance[protect ? 'protected' : 'silent'] + 1 },
      performans: clampScore(state.performans + (protect ? -3 : 0)),
      vicdan: clampScore(state.vicdan + (protect ? 3 : -3)) })),

  answerCandidate: (honest) =>
    set((state) => ({
      interviewStance: { ...state.interviewStance, [honest ? 'honest' : 'polished']: state.interviewStance[honest ? 'honest' : 'polished'] + 1 },
      performans: clampScore(state.performans + (honest ? -1 : 1)),
      vicdan: clampScore(state.vicdan + (honest ? 2 : -2)) })),

  visitCooler: () => {
    const state = get();
    set({ desk: { ...state.desk, coolerVisits: state.desk.coolerVisits + 1 } });
    audioEngine.playSip();
    spendMinutes(COOLER_MINUTES);
    return COOLER_THOUGHTS[state.desk.coolerVisits % COOLER_THOUGHTS.length];
  },

  readMail: (id) => set((state) => (state.mailRead.includes(id) ? state : { mailRead: [...state.mailRead, id] })),

  setDifficulty: (difficulty) => set({ difficulty }),

  recordAiUse: () => set((state) => ({ aiUses: state.aiUses + 1 })),

  setWeekendChoice: (weekendChoice) => set({ weekendChoice }),

  decideDrawer: (photo) =>
    set((state) => {
      // Wednesday only the first page is in the folder; the second turns up on Thursday
      const available = state.currentDayIndex >= 3 ? 2 : 1;
      const photoPages = photo ? Math.max(state.story.photoPages, available) : state.story.photoPages;
      return { story: { ...state.story, drawer: photoPages > 0 ? 'photographed' : 'returned', photoPages } };
    }),

  payBill: (id, pay) =>
    set((state) => {
      const bill = BILLS.find((b) => b.id === id);
      if (!bill || state.story.bills[id]) return {};
      const can = state.story.money >= bill.amount;
      const paid = pay && can;
      return {
        story: { ...state.story, bills: { ...state.story.bills, [id]: paid ? 'paid' : 'skipped' }, money: state.story.money - (paid ? bill.amount : 0) },
        // leaving Mom without her medicine weighs on you
        vicdan: clampScore(state.vicdan - (!paid && id === 'kart' ? 2 : 0)) };
    }),

  setExpense: (id, pay) =>
    set((state) => {
      const e = EXPENSES.find((x) => x.id === id);
      const today = state.story.ledger[state.currentDayIndex] ?? {};
      if (!e || today[id] !== undefined) return {};
      const paid = pay && state.story.money >= e.cost;
      audioEngine.playUi(paid ? 'confirm' : 'click');
      return {
        story: {
          ...state.story,
          money: state.story.money - (paid ? e.cost : 0),
          ledger: { ...state.story.ledger, [state.currentDayIndex]: { ...today, [id]: paid } } } };
    }),

  payRent: (pay) =>
    set((state) => {
      const paid = pay && state.story.money >= RENT;
      return { story: { ...state.story, rent: paid ? 'paid' : 'unpaid', money: state.story.money - (paid ? RENT : 0) } };
    }),

  setEvidence: (evidence) => set((state) => ({ story: { ...state.story, evidence } })),

  finishReckoning: () => set({ phase: 'weekend' }),

  answerCandidateDm: (candidateId, kind) =>
    set((state) => {
      if (state.dmHandled[candidateId]) return {};
      const e = DM_EFFECT[kind];
      return {
        dmHandled: { ...state.dmHandled, [candidateId]: kind },
        performans: clampScore(state.performans + e.performans),
        vicdan: clampScore(state.vicdan + e.vicdan) };
    }),

  finishWeekend: () => set({ phase: 'final' }),

  setMusicVolume: (value) => {
    audioEngine.setMusicVolume(value);
    storeVolume(MUSIC_VOLUME_KEY, value);
    set({ musicVolume: value });
  },

  setSfxVolume: (value) => {
    audioEngine.setSfxVolume(value);
    storeVolume(SFX_VOLUME_KEY, value);
    set({ sfxVolume: value });
  },

  answerMessage: (messageId, replyIndex) => {
    const state = get();
    const msg = state.phone.find((m) => m.id === messageId);
    const reply = msg?.replies?.[replyIndex];
    if (!msg || !reply || msg.answered || msg.expired) return;
    const stance = reply.stance
      ? {
          refusals: state.managerStance.refusals + (reply.stance === 'refuse' ? 1 : 0),
          complies: state.managerStance.complies + (reply.stance === 'comply' ? 1 : 0) }
      : state.managerStance;
    // what you say matters — and so does writing back to Mom at all
    const momCare = msg.thread === 'mom' ? 1 : 0;
    set({
      performans: clampScore(state.performans + (reply.performans ?? 0)),
      vicdan: clampScore(state.vicdan + (reply.vicdan ?? 0) + momCare),
      managerStance: stance,
      story: reply.neighbourCv ? { ...state.story, neighbourCv: true } : state.story,
      typingThread: msg.thread,
      dayEvents:
        reply.event && state.workdayMinutes <= reply.event.at + 20
          ? [...state.dayEvents, { kind: 'calendar' as const, at: Math.max(reply.event.at, state.workdayMinutes), minutes: reply.event.minutes, text: reply.event.text }].sort((a, b) => a.at - b.at)
          : state.dayEvents,
      week: msg.thread === 'mom' ? { ...state.week, momAnswered: state.week.momAnswered + 1 } : state.week,
      phone: [
        ...state.phone.map((m) => (m.id === messageId ? { ...m, answered: true } : m)),
        { id: nextMessageId++, thread: msg.thread, at: state.workdayMinutes, day: state.currentDayIndex, from: 'me', text: reply.text },
      ] });
    audioEngine.playUi('click');
    window.setTimeout(() => {
      const s2 = get();
      if (s2.phase !== 'gameplay') return;
      set({
        phone: [
          ...s2.phone,
          { id: nextMessageId++, thread: msg.thread, at: s2.workdayMinutes, day: s2.currentDayIndex, from: 'them', sender: reply.reactionSender, text: reply.reaction },
        ],
        typingThread: s2.typingThread === msg.thread ? null : s2.typingThread,
        phoneUnread: { ...s2.phoneUnread, [msg.thread]: s2.phoneUnread[msg.thread] + 1 },
        // the private half of the answer arrives later, through the normal message pacing
        managerScript: reply.aside
          ? [
              ...s2.managerScript,
              { at: s2.workdayMinutes + reply.aside.after, kind: 'ambient' as const, dayIndex: s2.currentDayIndex, ambient: { thread: reply.aside.thread, text: reply.aside.text } },
            ].sort((a, b) => a.at - b.at)
          : s2.managerScript });
      audioEngine.playPhoneBuzz();
    }, 1800);
  },

  answerRequest: (requestId, answer) => {
    const state = get();
    const request = state.managerRequests.find((r) => r.id === requestId);
    if (!request || request.answer) return;
    const effect = REPLY_EFFECT[answer];
    const now = state.workdayMinutes;
    const stance = {
      refusals: state.managerStance.refusals + (answer === 'refuse' ? 1 : 0),
      complies: state.managerStance.complies + (answer === 'comply' ? 1 : 0) };
    set({
      managerRequests: state.managerRequests.map((r) => (r.id === requestId ? { ...r, answer } : r)),
      phone: [
        ...state.phone,
        { id: nextMessageId++, thread: 'manager', at: now, day: state.currentDayIndex, from: 'me', text: replyText(answer, state.managerStance), requestId },
      ],
      managerStance: stance,
      performans: clampScore(state.performans + effect.performans),
      vicdan: clampScore(state.vicdan + effect.vicdan) });
    audioEngine.playUi('click');
    // The manager "types" for a moment before reacting.
    window.setTimeout(() => {
      const s2 = get();
      if (s2.phase !== 'gameplay') return;
      set({
        phone: [
          ...s2.phone,
          {
            id: nextMessageId++,
            thread: 'manager',
            at: s2.workdayMinutes,
            day: s2.currentDayIndex,
            from: 'them',
            text: managerReaction(answer, managerTone(stance.refusals)) },
        ],
        phoneUnread: { ...s2.phoneUnread, manager: s2.phoneUnread.manager + 1 } });
      audioEngine.playPhoneBuzz();
    }, 1600);
  },

  markPhoneRead: (thread) => set((state) => ({ phoneUnread: { ...state.phoneUnread, [thread]: 0 } })),

  hire: (recommended) => {
    const state = get();
    if (state.phase !== 'finalRound' || state.hiredId) return;
    // you only recommend; the panel (you, Levent, Hakan Bey) decides
    const id = panelDecision(recommended, state.finalists.length ? state.finalists : [{ id: 'okan', day: 0 }], state.story.pastRequests).hired;
    // How the hire actually works out moves Performans; hiring someone the system had
    // written off, and who turns out great, is what the Vicdan bar is about.
    const fit = candidateDetails[id]?.hireFit ?? 3;
    const performans = Math.max(0, Math.min(100, state.performans + (fit - 3) * 6));
    const vicdan = Math.max(0, Math.min(100, state.vicdan + (fit >= 4 ? 4 : fit <= 2 ? -4 : 0)));
    audioEngine.playUi('confirm');
    set({ hiredId: id, recommendedId: recommended, performans, vicdan, phase: 'weekend' });
  },

  toggleMute: () => {
    const next = !get().muted;
    audioEngine.setMuted(next);
    try {
      localStorage.setItem(MUTED_STORAGE_KEY, String(next));
    } catch {
      // localStorage unavailable — ignore, mute preference just won't persist
    }
    set({ muted: next });
  } }));
