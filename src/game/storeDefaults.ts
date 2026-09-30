/*
 * The store's starting values and small pure helpers: fresh desk/story/week records, score
 * clamping, today's lineup and interview quota, hard mode's surprises, and the audio settings
 * read back from the browser before the first sound plays.
 */
import { COFFEE_SIPS } from './desk';
import { type DayEvent, type DeskState, type DmKind, type GameState, type InterviewStance, type StoryState, type WeekLog } from './storeTypes';
import { type DayStats, type Difficulty, type EventKind } from './types';
import { FINALIST_LIMIT, days } from './data/days';
import { MINUTES_PER_TICK } from './time';
import { START_MONEY } from './story';
import { type ThreadId } from './manager';
import { audioEngine } from '../audio/audioEngine';
export const MUTED_STORAGE_KEY = 'kariyerweb-muted';

export const MUSIC_VOLUME_KEY = 'kariyerweb-music-volume';
export const SFX_VOLUME_KEY = 'kariyerweb-sfx-volume';
export const DEFAULT_VOLUME = 0.8;

export function readStoredMuted(): boolean {
  try {
    return localStorage.getItem(MUTED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function readStoredVolume(key: string): number {
  try {
    const raw = localStorage.getItem(key);
    const value = raw === null ? NaN : Number(raw);
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : DEFAULT_VOLUME;
  } catch {
    return DEFAULT_VOLUME;
  }
}

export function storeVolume(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Storage unavailable (private mode etc.) — the setting just won't persist.
  }
}

// The engine must know the saved mute state before the very first click sound.
audioEngine.setMuted(readStoredMuted());
export const initialMusicVolume = readStoredVolume(MUSIC_VOLUME_KEY);
export const initialSfxVolume = readStoredVolume(SFX_VOLUME_KEY);
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

export const emptyWeek = (): WeekLog => ({ reviewTicks: 0, reviewed: 0, momMessages: 0, momAnswered: 0, managerIgnored: 0, events: 0 });

/** Game minutes that pass per second of play. */
export const minutesPerTick = (d: Difficulty) => (d === 'hard' ? MINUTES_PER_TICK * 1.35 : MINUTES_PER_TICK);

export const EVENT_LENGTH: Record<EventKind, number> = { power: 20, meeting: 4, it: 60, calendar: 5, weather: 6 };

export function planEvents(rand: () => number): DayEvent[] {
  // hard mode's surprises: nothing that just eats the clock (no "5-minute" meetings)
  const kinds: EventKind[] = ['power', 'it'].sort(() => rand() - 0.5) as EventKind[];
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
export const TEAM_LATE_DAY = 3;
export const TEAM_LATE_END = 11 * 60;
/** Writing up a reason for a rejection, once Hakan Bey asks for one. */
export const JUSTIFY_MINUTES = 3;

export const emptyStance = (): InterviewStance => ({ protected: 0, silent: 0, honest: 0, polished: 0 });

export const emptyStats = (): DayStats => ({ approved: 0, rejected: 0, autoRejected: 0, undecided: 0 });

export const noUnread = (): Record<ThreadId, number> => ({ manager: 0, mom: 0, office: 0, zehra: 0, ayse: 0, birthday: 0 });
export const clampScore = (v: number) => Math.max(0, Math.min(100, v));
