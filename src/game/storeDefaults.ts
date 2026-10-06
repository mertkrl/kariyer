/*
 * Store'un başlangıç değerleri ve küçük saf yardımcılar: yeni masa/hikâye/hafta kayıtları, puan
 * sınırlama, bugünün kadrosu ve mülakat kontenjanı, zor modun sürprizleri. Ses tercihleri
 * prefs.ts'de yaşar.
 */
import { COFFEE_SIPS } from './desk';
import { type DayEvent, type DeskState, type DmKind, type GameState, type InterviewStance, type StoryState, type WeekLog } from './storeTypes';
import { type DayStats, type Difficulty, type EventKind } from './types';
import { FINALIST_LIMIT, days } from './data/days';
import { MINUTES_PER_TICK } from './time';
import { shuffle } from './rng';
import { type ThreadId } from './manager';
import { THURSDAY } from './weekdays';
import type { ReadingContext } from './engine/scoring';
/** Bugünün aday kuyruğu (her oyunda rastgele; bkz. lineups.ts). */
export function lineupFor(state: Pick<GameState, 'currentDayIndex' | 'lineups'>, dayIndex = state.currentDayIndex): string[] {
  return state.lineups[dayIndex] ?? days[dayIndex].candidateIds;
}

/** Kalan final yuvaları: bugünün günlük sınırı ile haftalık sınırdan hangisi daha darsa. */
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

/** Oyunun her saniyesinde geçen oyun dakikası. */
const CLOCK_SPEED: Record<Difficulty, number> = { relaxed: 0.6, normal: 1, hard: 1.35 };
export const minutesPerTick = (d: Difficulty) => MINUTES_PER_TICK * CLOCK_SPEED[d];

export const EVENT_LENGTH: Record<EventKind, number> = { power: 20, meeting: 4, it: 60, calendar: 5, weather: 6 };

export function planEvents(rand: () => number): DayEvent[] {
  // zor modun sürprizleri: yalnızca saati yiyen hiçbir şey yok ("5 dakikalık" toplantı yok)
  const kinds = shuffle<EventKind>(['power', 'it'], rand);
  return [
    { kind: kinds[0], at: Math.round(90 + rand() * 120) },
    { kind: kinds[1], at: Math.round(320 + rand() * 130) },
  ];
}

export const newDesk = (): DeskState => ({ cleared: [], flower: false, lastWatered: 0, coffee: COFFEE_SIPS, sipsToday: 0, refills: 0, coolerVisits: 0, calls: {}, ringing: null, ringingSince: 0, inCall: null, notice: null });

export const newStory = (): StoryState => ({
  overtimeToday: false,
  offer: null,
  keyDecisions: {},
  managerDay: { complied: [], defied: [] },
  reform: null,
  pastRequests: [],
  neighbourCv: false });

export const DM_EFFECT: Record<DmKind, { performans: number; vicdan: number }> = {
  honest: { performans: -1, vicdan: 2 },
  template: { performans: 0, vicdan: 0 },
  ignore: { performans: 0, vicdan: -1 } };

/** Bu kadar düşük bir vicdan geceleri uyutmaz: ertesi güne geç başlarsın. */
export const SLEEPLESS_BELOW = 35;
export const SLEEPLESS_MINUTES = 25;
/** Perşembe bütün ekip geç saate kadar kalır (yapay zekâ yok): 19:00'a kadar. */
export const TEAM_LATE_DAY = THURSDAY;
export const TEAM_LATE_END = 11 * 60;
/** Hakan Bey istedikten sonra bir ret için gerekçe yazmak. */
export const JUSTIFY_MINUTES = 3;

export const emptyStance = (): InterviewStance => ({ protected: 0, silent: 0, honest: 0, polished: 0 });

export const emptyStats = (): DayStats => ({ approved: 0, rejected: 0, autoRejected: 0, undecided: 0 });

export const noUnread = (): Record<ThreadId, number> => ({ manager: 0, mom: 0, office: 0, ayse: 0, birthday: 0 });
export const clampScore = (v: number) => Math.max(0, Math.min(100, v));

/** Bunun altında Vicdan kayıpları küçülür: gösterge dibe yapışıp susmasın, toparlanma hep mümkün kalsın. */
export const VICDAN_SOFT_FLOOR = 40;

/**
 * Vicdan'a bir değişiklik uygular. Kazançlar olduğu gibi işler; kayıplar VICDAN_SOFT_FLOOR'un altında
 * orantılı olarak hafifler (en az dörtte birine). Hızlı ama kayıtsız bir hafta yine düşük biter,
 * ama Salı sabahı sıfırda kilitlenmez.
 */
export function addVicdan(current: number, delta: number) {
  if (delta >= 0 || current >= VICDAN_SOFT_FLOOR) return clampScore(current + delta);
  const factor = Math.max(0.25, current / VICDAN_SOFT_FLOOR);
  return clampScore(current + Math.round(delta * factor));
}

/** Bir dosyanın, puanlamanın tarttığı biçimde nasıl okunduğu. */
export function readingOf(state: Pick<GameState, 'timeSpent' | 'readThrough' | 'referenceChecks'>, id: string): ReadingContext {
  return { secondsSpent: state.timeSpent[id] ?? 0, readThrough: Boolean(state.readThrough[id]), referenceChecked: Boolean(state.referenceChecks[id]) };
}
