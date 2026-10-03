/*
 * The day's frame: the morning that sets it up, the clock (tick.ts) that runs it, the evening
 * that counts it, and the step to the next one. A new day's rules mostly live in data
 * (data/days.ts, data/dayPlans.ts, weekdays.ts); what changes here is how a morning is put together.
 */
import type { DayStats } from '../types';
import type { GetState, SetState } from '../storeApi';
import type { Finalist, GameState, StoryState, WeekLog } from '../storeTypes';
import { days } from '../data/days';
import { DAY_PLANS } from '../data/dayPlans';
import { DAILY_WAGE, OPEN_FILE_PENALTY, QUOTA_CUT_BELOW, TARGET_BONUS, TARGET_BONUS_AT, PRIM, KEY_CHARACTERS } from '../story';
import { OPEN_FILE_PERFORMANS, OPEN_FILE_PERFORMANS_CAP, isStrong, isWronglyFlagged, unusedSlotCost, wasConsidered } from '../engine/scoring';
import type { Mail } from '../mail';
import { COFFEE_SIPS } from '../desk';
import { NEIGHBOUR_ID, candidateOf } from '../data/candidates';
import { buildManagerScript, evaluateRequests, managerTone, reprimandText, type PhoneMessage } from '../manager';
import { BREAK_END_MIN, formatClock } from '../time';
import { leventMail, type WeekEntry } from '../echoes';
import { rngFor } from '../rng';
import { SLEEPLESS_BELOW, SLEEPLESS_MINUTES, approvalQuota, clampScore, emptyStats, lineupFor, noUnread, planEvents, readingOf } from '../storeDefaults';
import { dispatchRejections, isOnBreak } from '../clock';
import { NEIGHBOUR_DAY } from '../weekdays';
import { tick } from '../tick';

/** Yesterday, as the manager saw it: did you go against him more than with him? */
function defiedYesterday(state: GameState) {
  const { complied, defied } = state.story.managerDay;
  return state.currentDayIndex > 0 && defied.length > 0 && defied.length >= complied.length;
}

/** The morning's mail: Levent's note about yesterday, and Hakan Bey's after a day you went against him. */
function morningMail(state: GameState, justifyRejects: boolean): Mail[] {
  const tone = managerTone(state.managerStance.refusals);
  const defied = defiedYesterday(state);
  const levent = leventMail(state.currentDayIndex, state.weekLog, state.meeting.choice);
  // Hakan Bey, after you went against him: a mail that says nothing quotable, a "short" meeting
  const reprimand: Mail[] =
    state.managerGrievances.length > 0 || defied
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
              { meeting: defied, justify: justifyRejects && !state.justifyRejects },
            ) },
        ]
      : [];
  return [...state.extraMails.filter((m) => m.id !== `levent-${state.currentDayIndex}`), ...reprimand, ...(levent ? [levent] : [])];
}

/** Today's files: the neighbour's son joins his day if you passed his CV on. */
function todaysLineups(state: GameState): string[][] {
  return state.currentDayIndex === NEIGHBOUR_DAY && state.story.neighbourCv && !lineupFor(state).includes(NEIGHBOUR_ID)
    ? state.lineups.map((l, i) => (i === NEIGHBOUR_DAY ? [...l, NEIGHBOUR_ID] : l))
    : state.lineups;
}

/** What will interrupt the day: the calendar's meetings, and hard mode's surprises. */
function todaysEvents(state: GameState): GameState['dayEvents'] {
  const plan = DAY_PLANS[state.currentDayIndex] ?? { calendar: [] };
  return [
    ...plan.calendar.map((c) => ({ kind: 'calendar' as const, at: c.at, minutes: c.minutes, text: c.text })),
    ...(state.difficulty === 'hard' ? planEvents(rngFor(state.seed, `events-${state.currentDayIndex}`)) : []),
  ].sort((a, b) => a.at - b.at);
}

export const createDaySlice = (set: SetState, get: GetState): Pick<GameState, 'beginDay' | 'tick' | 'skipBreak' | 'finishDay' | 'nextDay'> => ({
  beginDay: () => {
    set({ lastLandlineAt: null });
    const state = get();
    if (days[state.currentDayIndex].final) {
      set({ phase: 'finalRound', paused: false });
      return;
    }
    // a bad conscience costs you sleep — once; after that you're too tired not to sleep
    const sleepless = state.currentDayIndex > 0 && state.vicdan < SLEEPLESS_BELOW && !state.story.sleptBadly;
    // performance too low: the manager trusts you with one interview slot fewer
    const quotaCut = state.currentDayIndex > 0 && state.performans < QUOTA_CUT_BELOW;
    // after a day against him, a harsh manager wants every "no" in writing
    const defied = defiedYesterday(state);
    const justifyRejects = state.justifyRejects || (defied && managerTone(state.managerStance.refusals) >= 2);
    const lateMinutes = sleepless ? SLEEPLESS_MINUTES : 0;
    const lineups = todaysLineups(state);
    set({
      phase: 'gameplay',
      paused: false,
      shiftStarted: false,
      lineups,
      extraMails: morningMail(state, justifyRejects),
      justifyRejects,
      reviewAt: defied ? lateMinutes + 30 : null,
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
      dayEvents: todaysEvents(state),
      activeEvent: null,
      lateReason: sleepless ? `Gece uyuyamadın; gözünün önünden dosyalar geçti. Masana ${formatClock(SLEEPLESS_MINUTES)}'te oturabildin.` : null,
      story: sleepless ? { ...state.story, sleptBadly: true } : state.story });
  },

  tick,

  skipBreak: () => {
    const state = get();
    if (state.phase !== 'gameplay' || !isOnBreak(state)) return;
    // back to the desk early — but the afternoon still starts at 13:00
    set({ breakOver: true, workdayMinutes: BREAK_END_MIN });
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

    const logged: WeekEntry[] = Object.entries(state.decisions).map(([id, decision]) => ({ id, day: state.currentDayIndex, decision, considered: wasConsidered(readingOf(state, id)) }));
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

});
