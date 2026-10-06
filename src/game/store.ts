/*
 * Oyunun durumu (zustand): yeni bir hafta, birini başlatmak ve sürdürmek, kontrol noktası.
 * Eylemler dilimlerde yaşar: günün çerçevesi (daySlice: sabah, saat, akşam), dosyalar
 * (decisionSlice), telefon, masa, hikâye ve ayarlar. Saatin saniyesi tick.ts'dir; saatin
 * tetiklediği şeyler clock.ts'dir.
 */
import { create } from 'zustand';
import { days } from './data/days';
import { AD_EFFECT } from './data/jobs';
import { candidateOf, candidates } from './data/candidates';
import { defaultLineups, makeLineups, KEY_CAST, STORY_FIXED } from './lineups';
import { MOM_POOL_SIZE } from './manager';
import { sound } from './sound';
import type { GameState } from './storeTypes';
import { checkSave, clearSave, discardSave, readSave, writeSave, type SaveFile } from './save';
import { bindStore } from './storeApi';
import { cancelLater } from './later';
import { createDaySlice } from './slices/daySlice';
import { createDecisionSlice } from './slices/decisionSlice';
import { createDeskSlice } from './slices/deskSlice';
import { createPhoneSlice } from './slices/phoneSlice';
import { createSettingsSlice } from './slices/settingsSlice';
import { createStorySlice } from './slices/storySlice';
import { newSeed, rngFor, shuffle } from './rng';
import { emptyStance, emptyStats, emptyWeek, newDesk, newStory, noUnread } from './storeDefaults';
import { initialMusicVolume, initialSfxVolume, readStoredMuted } from './prefs';

export type { Finalist, DayEvent, ActiveEvent, WeekLog, StoryState, DeskState, DmKind, DecisionLogEntry, GameState, InterviewStance } from './storeTypes';
export { TEAM_LATE_DAY, TEAM_LATE_END, approvalQuota, lineupFor, minutesPerTick, readingOf } from './storeDefaults';
export { MAIL_SEND_AT, isOnBreak, mailsPending } from './clock';
export { callFor, panelDecision, revokeTargets, salaryOf, SALARY_CAP } from './managerCalls';

/** Bir oyuncunun ayarlarının içermediği: yeni bir haftanın baştan başlattığı her şey. */
type DataKey = { [K in keyof GameState]: GameState[K] extends (...args: never[]) => unknown ? never : K }[keyof GameState];
type WeekData = Omit<Pick<GameState, DataKey>, 'muted' | 'musicVolume' | 'sfxVolume' | 'difficulty'>;

/** Yeni bir haftanın durumu. GameState'e eklenen bir alan burada unutulamasın diye tiplenmiştir. */
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
 * Bu oyun derlemesi sürdürebiliyorsa kontrol noktası: alanları bugünün durumuna uyar, günü vardır
 * ve adını verdiği herkes hâlâ kadrodadır. Uymayan silinir.
 */
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
      // ilanın nasıl yazıldığı, kimin hiç başvurmayacağına karar verir
      lineups: AD_EFFECT[jobId]
        ? state.lineups.map((day) => day.filter((id) => KEY_CAST.includes(id) || STORY_FIXED.includes(id) || !AD_EFFECT[jobId].skip(candidateOf(id))))
        : state.lineups,
      phase: 'applicationFlood',
      // Zor modda ilk sabahtan itibaren sert bir müdür.
      managerStance: state.difficulty === 'hard' ? { refusals: 1, complies: 0 } : { refusals: 0, complies: 0 } })),

  proceedToBriefing: () => set({ phase: 'briefing' }),

  restart: () => {
    cancelLater();
    set(freshWeek());
  },

  togglePause: () => set((state) => ({ paused: !state.paused })),
  startShift: () => set({ shiftStarted: true }),
  finishOrientation: () => set({ orientationDone: true, shiftStarted: true }),
  ...createDaySlice(set, get),
  ...createDecisionSlice(set, get),
  ...createPhoneSlice(set, get),
  ...createDeskSlice(set, get),
  ...createStorySlice(set, get),
  ...createSettingsSlice(set, get),
}));

bindStore(useGameStore);

// Her günün başında kontrol noktası; biten ya da bırakılan bir hafta devam edilecek bir şey bırakmaz.
useGameStore.subscribe((state, prev) => {
  if (state.phase === prev.phase) return;
  if (state.phase === 'applicationFlood' || state.phase === 'briefing') writeSave(state);
  else if (state.phase === 'final') clearSave();
});
