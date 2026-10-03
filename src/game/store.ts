import { create } from 'zustand';
import type { DayStats } from './types';
import { days } from './data/days';
import { DAY_PLANS } from './data/dayPlans';
import { DAILY_WAGE, OPEN_FILE_PENALTY, QUOTA_CUT_BELOW, TARGET_BONUS, TARGET_BONUS_AT, PRIM, KEY_CHARACTERS } from './story';
import { type ReadingContext, OPEN_FILE_PERFORMANS, OPEN_FILE_PERFORMANS_CAP, decisionEffect, isStrong, isWronglyFlagged, unusedSlotCost } from './engine/scoring';
import { AD_EFFECT } from './data/jobs';
import type { Mail } from './mail';
import { COFFEE_SIPS } from './desk';
import { NEIGHBOUR_ID, candidateOf, candidates } from './data/candidates';
import { defaultLineups, makeLineups, KEY_CAST } from './lineups';
import {
  buildManagerScript,
  evaluateRequests,
  MOM_POOL_SIZE,
  managerTone,
  reprimandText,
  type PhoneMessage,
} from './manager';
import { sound } from './sound';
import { BREAK_END_MIN, BREAK_START_MIN, formatClock } from './time';
import { leventMail, type WeekEntry } from './echoes';
import { MEETING_AT, MEETING_DAY } from './meeting';
import type { Finalist, WeekLog, StoryState, GameState } from './storeTypes';
import { checkSave, clearSave, discardSave, readSave, writeSave, type SaveFile } from './save';
import { bindStore } from './storeApi';
import { cancelLater, later } from './later';
import { createDeskSlice } from './slices/deskSlice';
import { createPhoneSlice } from './slices/phoneSlice';
import { createSettingsSlice } from './slices/settingsSlice';
import { createStorySlice } from './slices/storySlice';
import { newSeed, rngFor, shuffle } from './rng';
import { EVENT_LENGTH, JUSTIFY_MINUTES, SLEEPLESS_BELOW, SLEEPLESS_MINUTES, TEAM_LATE_DAY, TEAM_LATE_END, approvalQuota, clampScore, emptyStance, emptyStats, emptyWeek, lineupFor, minutesPerTick, newDesk, newStory, noUnread, planEvents } from './storeDefaults';
import { initialMusicVolume, initialSfxVolume, readStoredMuted } from './prefs';
import { addExtraFiles, checkDayEnd, dayLimit, deliverManagerMessages, dispatchRejections, expireReplies, isOnBreak, mailsPending, ringLandline, spendMinutes } from './clock';
import { NEIGHBOUR_DAY } from './weekdays';

export type { Finalist, DayEvent, ActiveEvent, WeekLog, StoryState, DeskState, DmKind, DecisionLogEntry, GameState, InterviewStance } from './storeTypes';
export { TEAM_LATE_DAY, TEAM_LATE_END, approvalQuota, lineupFor, minutesPerTick } from './storeDefaults';
export { MAIL_SEND_AT, isOnBreak, mailsPending } from './clock';
export { callFor, panelDecision, revokeTargets, salaryOf, SALARY_CAP } from './managerCalls';

/** What a player's settings don't include: everything a new week starts over. */
type DataKey = { [K in keyof GameState]: GameState[K] extends (...args: never[]) => unknown ? never : K }[keyof GameState];
type WeekData = Omit<Pick<GameState, DataKey>, 'muted' | 'musicVolume' | 'sfxVolume' | 'difficulty'>;

/** A new week's state. Typed so that a field added to GameState can't be forgotten here. */
function freshWeek(): WeekData {
  return {
    phase: 'welcome',
    currentDayIndex: 0,
    performans: 50,
    vicdan: 50,
    workdayMinutes: 0,
    breakOver: false,
    overtime: false,
    overtimeWarned: false,
    extraFiles: {},
    openedIds: [],
    currentCandidateId: null,
    decisions: {},
    decisionLog: [],
    timeSpent: {},
    readThrough: {},
    reading: false,
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
    quotaCut: false,
    paused: false,
    shiftStarted: false,
    lateReason: null,
    seed: 1,
    messageSeq: 1,
    lastLandlineAt: null,
    dayStart: { performans: 50, vicdan: 50 },
    mutedThreads: [],
    typingThread: null,
    selectedJobId: null,
  };
}

/**
 * The checkpoint, if this build of the game can continue it: its fields fit today's state, its day
 * exists, and everyone it names is still in the cast. One that doesn't is removed.
 */
/** How a file was read, as the scoring weighs it. */
export function readingOf(state: Pick<GameState, 'timeSpent' | 'readThrough' | 'referenceChecks'>, id: string): ReadingContext {
  return { secondsSpent: state.timeSpent[id] ?? 0, readThrough: Boolean(state.readThrough[id]), referenceChecked: Boolean(state.referenceChecks[id]) };
}

export function loadSave(): SaveFile | null {
  const save = readSave();
  if (!save) return null;
  const data = checkSave(save.data, { ...freshWeek(), difficulty: 'normal' });
  const ids = data ? [...(data.lineups ?? []).flat(), ...(data.weekLog ?? []).map((e) => e.id), ...(data.finalists ?? []).map((f) => f.id)] : [];
  if (!data || !days[data.currentDayIndex ?? -1] || ids.some((id) => !(id in candidates))) return discardSave();
  return { ...save, data };
}

export const useGameStore = create<GameState>((set, get) => ({
  ...freshWeek(),
  difficulty: 'normal',
  muted: readStoredMuted(),
  musicVolume: initialMusicVolume,
  sfxVolume: initialSfxVolume,

  continueGame: () => {
    const save = loadSave();
    if (!save) return;
    cancelLater();
    sound().init();
    sound().setMuted(get().muted);
    sound().startAmbient();
    set(save.data);
  },

  startGame: (replaySeed) => {
    cancelLater();
    const seed = newSeed(replaySeed);
    const momRand = rngFor(seed, 'mom');
    sound().init();
    sound().setMuted(get().muted);
    sound().startAmbient();
    set({
      ...freshWeek(),
      phase: 'jobSelect',
      seed,
      lineups: makeLineups(rngFor(seed, 'lineups')),
      momOrder: shuffle([...Array(MOM_POOL_SIZE).keys()], momRand),
    });
  },

  publishJob: (jobId) =>
    set((state) => ({
      selectedJobId: jobId,
      // how the ad was worded decides who never applies
      lineups: AD_EFFECT[jobId]
        ? state.lineups.map((day) => day.filter((id) => KEY_CAST.includes(id) || id === 'baris' || !AD_EFFECT[jobId].skip(candidateOf(id))))
        : state.lineups,
      phase: 'applicationFlood',
      // A harsh manager from the first morning on in hard mode.
      managerStance: state.difficulty === 'hard' ? { refusals: 1, complies: 0 } : { refusals: 0, complies: 0 } })),

  proceedToBriefing: () => set({ phase: 'briefing' }),

  beginDay: () => {
    set({ lastLandlineAt: null });
    const state = get();
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
                state.managerGrievances.length ? state.managerGrievances : state.story.managerDay.defied.map((id) => ({ name: candidateOf(id).name.split(' ')[0], want: 'approve' as const, promised: false })),
                tone,
                { meeting: defiedYesterday, justify: justifyRejects && !state.justifyRejects },
              ) },
          ]
        : [];
    const lineups =
      state.currentDayIndex === NEIGHBOUR_DAY && state.story.neighbourCv && !lineupFor(state).includes(NEIGHBOUR_ID)
        ? state.lineups.map((l, i) => (i === NEIGHBOUR_DAY ? [...l, NEIGHBOUR_ID] : l))
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
        managerDay: state.currentDayIndex > 0 ? state.story.managerDay : undefined }, rngFor(state.seed, `manager-${state.currentDayIndex}`)),
      managerGrievances: [],
      desk: { ...state.desk, coffee: COFFEE_SIPS, sipsToday: 0, refills: 0, ringing: null, inCall: null, notice: null, pizzaEaten: 0 },
      breakOver: false,
      overtime: false,
      overtimeWarned: false,
      quotaCut,
      decisionEffects: {},
      // weather can make you late — and so can a bad conscience, or an empty travel card
      workdayMinutes: lateMinutes,
      dayEvents: [
        ...plan.calendar.map((c) => ({ kind: 'calendar' as const, at: c.at, minutes: c.minutes, text: c.text })),
        ...(state.difficulty === 'hard' ? planEvents(rngFor(state.seed, `events-${state.currentDayIndex}`)) : []),
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
    // the recall mail is open over everything: the day waits until it's sent
    if (state.revokeDraft && !state.desk.inCall) return;
    // the clock stops at the conference room door; the meeting takes its time when it ends
    if (state.meeting.state === 'active') return;
    if (state.currentDayIndex === MEETING_DAY && state.meeting.state === 'pending' && state.workdayMinutes >= MEETING_AT && !isOnBreak(state)) {
      set({ meeting: { ...state.meeting, state: 'active' } });
      sound().playUi('select', 1);
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
        sound().playPhoneBuzz();
      } else if (due.kind === 'calendar') {
        nextMinutes += due.minutes ?? 15;
        sound().playUi('select', 2);
      } else {
        sound().playUi(due.kind === 'power' ? 'click' : 'connect');
      }
      activeEvent = { kind: due.kind, until: nextMinutes + EVENT_LENGTH[due.kind], text: due.text };
    }
    if (state.workdayMinutes < BREAK_START_MIN && nextMinutes >= BREAK_START_MIN) {
      nextMinutes = BREAK_START_MIN;
    }
    nextMinutes = Math.min(nextMinutes, dayLimit(state));

    let timeSpent = state.timeSpent;
    const id = state.currentCandidateId;
    // reading time counts only while the file is actually on screen
    if (id && !state.decisions[id] && state.reading) {
      timeSpent = { ...state.timeSpent, [id]: (state.timeSpent[id] ?? 0) + 1 };
    }

    set({ workdayMinutes: nextMinutes, timeSpent, activeEvent, dayEvents, week });
    ringLandline(nextMinutes);
    expireReplies(nextMinutes);
    deliverManagerMessages(nextMinutes);
    checkDayEnd(nextMinutes);
    // a queue closed in the morning: at 14:00 Hakan Bey notices, and finds more files
    addExtraFiles();
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
      sound().playUi('click');
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
    const effect = decisionEffect(id, decision, readingOf(state, id));
    const before = { performans, vicdan };
    performans = clampScore(performans + effect.performans);
    vicdan = clampScore(vicdan + effect.vicdan);
    if (decision === 'approve') dayStats.approved += 1;
    else dayStats.rejected += 1;

    sound().playStamp(decision);

    set({
      decisions: { ...state.decisions, [id]: decision },
      decisionLog: [...state.decisionLog.filter((e) => e.id !== id), { id, decision, at: state.workdayMinutes }],
      performans,
      vicdan,
      dayStats,
      decisionEffects: { ...state.decisionEffects, [id]: { performans: performans - before.performans, vicdan: vicdan - before.vicdan, reason: effect.reason } } });
    // Hakan Bey wants every "no" in writing now
    if (state.justifyRejects && decision === 'reject' && prevDecision !== 'reject') spendMinutes(JUSTIFY_MINUTES);
    // closing the queue early: a few more files are on their way
    later(addExtraFiles, 1500);
    // staying late: closing the last open file sends you home
    const after = get();
    if (after.overtime && lineupFor(after).every((cid) => after.decisions[cid]) && !mailsPending(after) && !(after.currentDayIndex === TEAM_LATE_DAY && after.workdayMinutes < TEAM_LATE_END)) {
      later(() => get().finishDay(), 1400);
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

    sound().playUndo();

    // a notice waiting in the outbox for this person is pulled back with the decision
    const plannedRejections = { ...state.plannedRejections };
    delete plannedRejections[id];
    set({
      plannedRejections,
      extraMails: state.extraMails.filter((m) => m.id !== `outbox-${state.currentDayIndex}-${id}`),
      decisions,
      decisionLog: state.decisionLog.filter((e) => e.id !== id),
      decisionEffects,
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
    // the company counts the files you left open
    if (undecided > 0) {
      verdict.performans -= Math.min(OPEN_FILE_PERFORMANS_CAP, undecided * OPEN_FILE_PERFORMANS);
      verdict.lines.push(`${undecided} dosyayı açık bıraktın. Raporda "tamamlanmadı" yazıyor.`);
    }
    // an interview slot nobody got, while strong people were turned away for a flag
    const quota = approvalQuota(state);
    const strongRejected = lineup.filter((id) => state.decisions[id] === 'reject' && isWronglyFlagged(id) && isStrong(id)).length;
    const emptySlots = unusedSlotCost(Math.min(quota.dailyLeft, quota.totalLeft), strongRejected);
    if (emptySlots > 0) {
      verdict.vicdan -= emptySlots;
      verdict.lines.push(`${emptySlots} mülakat hakkın boş kaldı; o sırada işaretli ${strongRejected} güçlü adayı eledin.`);
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
        .map((r) => ({ name: candidateOf(r.candidateId).name.split(' ')[0], want: r.want, promised: r.answer === 'comply' })) });
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
      overtimeWarned: false,
      openedIds: [],
      currentCandidateId: null,
      decisions: {},
      decisionLog: [],
      timeSpent: {},
      readThrough: {},
      dayStats: emptyStats() });
  },

  restart: () => {
    cancelLater();
    set(freshWeek());
  },

  togglePause: () => set((state) => ({ paused: !state.paused })),
  setReading: (reading) => set({ reading }),
  markReadThrough: (id) => {
    if (!get().readThrough[id]) set((state) => ({ readThrough: { ...state.readThrough, [id]: true } }));
  },
  startShift: () => set({ shiftStarted: true }),
  finishOrientation: () => set({ orientationDone: true, shiftStarted: true }),
  ...createPhoneSlice(set, get),
  ...createDeskSlice(set, get),
  ...createStorySlice(set, get),
  ...createSettingsSlice(set, get),
}));

bindStore(useGameStore);

// Checkpoint at the start of each day; a finished or abandoned week leaves nothing to continue.
useGameStore.subscribe((state, prev) => {
  if (state.phase === prev.phase) return;
  if (state.phase === 'applicationFlood' || state.phase === 'briefing') writeSave(state);
  else if (state.phase === 'final') clearSave();
});
