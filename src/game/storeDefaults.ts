/*
 * The store's starting values and small pure helpers: fresh desk/story/week records, score
 * clamping, today's lineup and interview quota, hard mode's surprises. Sound preferences live in
 * prefs.ts.
 */
import { COFFEE_SIPS } from './desk';
import { type DayEvent, type DeskState, type DmKind, type GameState, type InterviewStance, type StoryState, type WeekLog } from './storeTypes';
import { type DayStats, type Difficulty, type EventKind } from './types';
import { FINALIST_LIMIT, days } from './data/days';
import { MINUTES_PER_TICK } from './time';
import { START_MONEY } from './story';
import { shuffle } from './rng';
import { type ThreadId } from './manager';
import { THURSDAY } from './weekdays';
import type { ReadingContext } from './engine/scoring';
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

export const emptyWeek = (): WeekLog => ({ reviewTicks: 0, reviewed: 0, momMessages: 0, momAnswered: 0, managerIgnored: 0, events: 0 });

/** Game minutes that pass per second of play. */
const CLOCK_SPEED: Record<Difficulty, number> = { relaxed: 0.6, normal: 1, hard: 1.35 };
export const minutesPerTick = (d: Difficulty) => MINUTES_PER_TICK * CLOCK_SPEED[d];

export const EVENT_LENGTH: Record<EventKind, number> = { power: 20, meeting: 4, it: 60, calendar: 5, weather: 6 };

export function planEvents(rand: () => number): DayEvent[] {
  // hard mode's surprises: nothing that just eats the clock (no "5-minute" meetings)
  const kinds = shuffle<EventKind>(['power', 'it'], rand);
  return [
    { kind: kinds[0], at: Math.round(90 + rand() * 120) },
    { kind: kinds[1], at: Math.round(320 + rand() * 130) },
  ];
}

export const newDesk = (): DeskState => ({ cleared: [], flower: false, lastWatered: 0, coffee: COFFEE_SIPS, sipsToday: 0, refills: 0, coolerVisits: 0, calls: {}, ringing: null, ringingSince: 0, inCall: null, notice: null });

export const newStory = (): StoryState => ({
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

export const DM_EFFECT: Record<DmKind, { performans: number; vicdan: number }> = {
  honest: { performans: -1, vicdan: 2 },
  template: { performans: 0, vicdan: 0 },
  ignore: { performans: 0, vicdan: -1 } };

/** A conscience this low keeps you up at night: you start the next day late. */
export const SLEEPLESS_BELOW = 35;
export const SLEEPLESS_MINUTES = 25;
/** Thursday the whole team stays late (no AI): until 19:00. */
export const TEAM_LATE_DAY = THURSDAY;
export const TEAM_LATE_END = 11 * 60;
/** Writing up a reason for a rejection, once Hakan Bey asks for one. */
export const JUSTIFY_MINUTES = 3;

export const emptyStance = (): InterviewStance => ({ protected: 0, silent: 0, honest: 0, polished: 0 });

export const emptyStats = (): DayStats => ({ approved: 0, rejected: 0, autoRejected: 0, undecided: 0 });

export const noUnread = (): Record<ThreadId, number> => ({ manager: 0, mom: 0, office: 0, zehra: 0, ayse: 0, birthday: 0 });
export const clampScore = (v: number) => Math.max(0, Math.min(100, v));

/** How a file was read, as the scoring weighs it. */
export function readingOf(state: Pick<GameState, 'timeSpent' | 'readThrough' | 'referenceChecks'>, id: string): ReadingContext {
  return { secondsSpent: state.timeSpent[id] ?? 0, readThrough: Boolean(state.readThrough[id]), referenceChecked: Boolean(state.referenceChecks[id]) };
}
