/*
 * Günün çerçevesi: onu kuran sabah, onu işleten saat (tick.ts), onu sayan akşam ve bir sonrakine
 * geçiş. Yeni bir günün kuralları çoğunlukla veride yaşar (data/days.ts, data/dayPlans.ts,
 * weekdays.ts); burada değişen, bir sabahın nasıl kurulduğudur.
 */
import type { DayStats } from '../types';
import type { GetState, SetState } from '../store/storeApi';
import type { Finalist, GameState, StoryState, WeekLog, DayActions } from '../store/storeTypes';
import { days } from '../data/days';
import { DAY_PLANS } from '../data/dayPlans';
import { QUOTA_CUT_BELOW, KEY_CHARACTERS } from '../day/story';
import { OPEN_FILE_PERFORMANS, OPEN_FILE_PERFORMANS_CAP, isStrong, isWronglyFlagged, unusedSlotCost, wasConsidered } from '../engine/scoring';
import type { Mail } from '../day/mail';
import { COFFEE_SIPS } from '../day/desk';
import { NEIGHBOUR_ID, candidateOf } from '../data/candidates';
import { buildManagerScript, evaluateRequests, managerTone, reprimandText, type PhoneMessage } from '../day/manager';
import { BREAK_END_MIN } from '../lib/time';
import { leventMail, type WeekEntry } from '../day/echoes';
import { rngFor } from '../lib/rng';
import { SLEEPLESS_BELOW, approvalQuota, clampScore, emptyStats, lineupFor, noUnread, planEvents, readingOf, addVicdan, testPool } from '../store/storeDefaults';
import { dispatchRejections, isOnBreak } from '../day/clock';
import { NEIGHBOUR_DAY } from '../lib/weekdays';
import { tick } from '../day/tick';
import { APTITUDE_CUTOFF, candidateAptitude } from '../events/aptitude';

/** Okuyarak çağrılan ve gerçekten güçlü çıkan aday başına: ekip liderinin olumlu notu. */
export const SPOTTED_PERFORMANS = 1;

/** Müdürün gördüğü hâliyle dün: ona uyduğundan çok mu karşı çıktın? */
function defiedYesterday(state: GameState) {
  const { complied, defied } = state.story.managerDay;
  return state.currentDayIndex > 0 && defied.length > 0 && defied.length >= complied.length;
}

/** Sabahın e-postaları: Ümit'in dünle ilgili notu ve ona karşı çıktığın bir günün ardından Hakan Bey'inki. */
function morningMail(state: GameState, justifyRejects: boolean): Mail[] {
  const tone = managerTone(state.hakanRapport);
  const defied = defiedYesterday(state);
  const levent = leventMail(state.currentDayIndex, state.weekLog, state.meeting.choice);
  // ona karşı çıktıktan sonra Hakan Bey: alıntılanacak hiçbir şey söylemeyen bir e-posta, "kısa" bir görüşme
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

/** Bugünün dosyaları: seçim günü teste geçenlerdir; CV'sini ilettiysen komşunun oğlu kendi gününe katılır. */
function todaysLineups(state: GameState): string[][] {
  if (days[state.currentDayIndex].selection) {
    const pool = testPool(state);
    return state.lineups.map((l, i) => (i === state.currentDayIndex ? pool : l));
  }
  return state.currentDayIndex === NEIGHBOUR_DAY && state.story.neighbourCv && !lineupFor(state).includes(NEIGHBOUR_ID)
    ? state.lineups.map((l, i) => (i === NEIGHBOUR_DAY ? [...l, NEIGHBOUR_ID] : l))
    : state.lineups;
}

/** Günü ne kesecek: takvimin toplantıları ve zor modun sürprizleri. */
function todaysEvents(state: GameState): GameState['dayEvents'] {
  const plan = DAY_PLANS[state.currentDayIndex] ?? { calendar: [] };
  return [
    ...plan.calendar.map((c) => ({ kind: 'calendar' as const, at: c.at, minutes: c.minutes, text: c.text })),
    ...(state.difficulty === 'hard' ? planEvents(rngFor(state.seed, `events-${state.currentDayIndex}`)) : []),
  ].sort((a, b) => a.at - b.at);
}

export const createDaySlice = (set: SetState, get: GetState): DayActions => ({
  beginDay: () => {
    set({ lastLandlineAt: null });
    const state = get();
    if (days[state.currentDayIndex].final) {
      set({ phase: 'finalRound', paused: false });
      return;
    }
    // kötü bir vicdan uykuna mal olur, bir kez; ondan sonra uyumamak için fazla yorgunsun
    const sleepless = state.currentDayIndex > 0 && state.vicdan < SLEEPLESS_BELOW && !state.story.sleptBadly;
    // performans çok düşük: müdür sana bir mülakat hakkı eksik emanet eder
    const quotaCut = state.currentDayIndex > 0 && state.performans < QUOTA_CUT_BELOW;
    // ona karşı geçen bir günden sonra sert bir müdür her "hayır"ı yazılı ister
    const defied = defiedYesterday(state);
    const justifyRejects = state.justifyRejects || (defied && managerTone(state.hakanRapport) >= 2);
    // mesai her gün 08:00'de başlar; uykusuz gece yalnızca sabah kartında anlatılır
    const lateMinutes = 0;
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
        managerDay: state.currentDayIndex > 0 ? state.story.managerDay : undefined }, rngFor(state.seed, `manager-${state.currentDayIndex}`)),
      managerGrievances: [],
      desk: { ...state.desk, coffee: COFFEE_SIPS, sipsToday: 0, refills: 0, ringing: null, inCall: null, notice: null, pizzaEaten: 0 },
      breakOver: false,
      overtime: false,
      overtimeWarned: false,
      quotaCut,
      decisionEffects: {},
      // hava seni geciktirebilir, kötü bir vicdan da
      workdayMinutes: lateMinutes,
      dayEvents: todaysEvents(state),
      activeEvent: null,
      lateReason: sleepless ? 'Gece uyuyamadın; gözünün önünden dosyalar geçti. Masaya gözlerin kızarmış oturdun.' : null,
      story: sleepless ? { ...state.story, sleptBadly: true } : state.story });
  },

  tick,

  skipBreak: () => {
    const state = get();
    if (state.phase !== 'gameplay' || !isOnBreak(state)) return;
    // masaya erken dönüldü, ama öğleden sonra yine 13:00'te başlar
    set({ breakOver: true, workdayMinutes: BREAK_END_MIN });
  },

  finishDay: () => {
    if (get().phase !== 'gameplay') return;
    // giden kutusu günle birlikte gider (17:00 damgasıyla); bildirimi olmayan hiçbir şey duymaz
    dispatchRejections();
    const state = get();
    const day = days[state.currentDayIndex];
    // Yapay zekânın elediği: başvuru sayacındaki, hiçbir insana ulaşmamış her başvuru.
    const lineup = lineupFor(state);
    const autoRejected = Math.max(0, day.applicationTarget - lineup.length);
    const undecided = lineup.filter((id) => !state.decisions[id]).length;
    const today = (m: PhoneMessage) => (m.day ?? state.currentDayIndex) === state.currentDayIndex;
    const ignored = state.phone.filter((m) => today(m) && m.thread === 'manager' && m.from === 'them' && m.replies && !m.answered).length;
    const verdict = evaluateRequests(state.managerRequests, state.decisions, ignored, state.referenceChecks);
    // evden gelen ve "görüldü"de bırakılan bir mesaj
    const momIgnored = state.phone.filter((m) => today(m) && m.thread === 'mom' && m.from === 'them' && m.replies && !m.answered).length;
    if (momIgnored > 0) {
      verdict.vicdan -= momIgnored;
      verdict.lines.push(`Annenin ${momIgnored} mesajını cevapsız bıraktın.`);
    }
    // şirket açık bıraktığın dosyaları sayar
    if (undecided > 0) {
      verdict.performans -= Math.min(OPEN_FILE_PERFORMANS_CAP, undecided * OPEN_FILE_PERFORMANS);
      verdict.lines.push(`${undecided} dosyayı açık bıraktın. Raporda "tamamlanmadı" yazıyor.`);
    }
    // güçlü insanlar bir işaret yüzünden geri çevrilirken kimsenin almadığı bir mülakat hakkı
    const quota = approvalQuota(state);
    const strongRejected = lineup.filter((id) => state.decisions[id] === 'reject' && isWronglyFlagged(id) && isStrong(id)).length;
    const emptySlots = Number.isFinite(quota.dailyLeft) ? unusedSlotCost(quota.dailyLeft, strongRejected) : 0;
    if (emptySlots > 0) {
      verdict.vicdan -= emptySlots;
      verdict.lines.push(`${emptySlots} mülakat hakkın boş kaldı; o sırada işaretli ${strongRejected} güçlü adayı eledin.`);
    }

    // Perşembe: eşiğin altından çağırdıkların Hakan Bey'in gözünden kaçmaz
    if (day.selection) {
      const below = lineup.filter((id) => state.decisions[id] === 'approve' && candidateAptitude(id, state.seed).score < APTITUDE_CUTOFF).length;
      if (below > 0) verdict.lines.push(`Hakan Bey: "Test puanı ${APTITUDE_CUTOFF}'in altında ${below} kişiyi mülakata çağırmışsınız. Sayıların neden orada olduğunu hatırlatırım."`);
    }

    // ekip liderinin sesi: okuyarak mülakata çağırdığın ve gerçekten güçlü çıkan her aday deneme değerlendirmene yazılır
    const spotted = lineup.filter((id) => day.selection && state.decisions[id] === 'approve' && isStrong(id) && wasConsidered(readingOf(state, id))).length;
    if (spotted > 0) {
      verdict.performans += spotted * SPOTTED_PERFORMANS;
      verdict.lines.push(`Ümit Bey'in ekibi bugün çağırdığın ${spotted} adayın dosyasını beğendi; deneme değerlendirmene not düştü.`);
    }

    const dayStats: DayStats = { ...state.dayStats, autoRejected, undecided };
    // mülakata yalnızca seçim gününün davetlileri gider; CV günlerinin onayı teste geçirmektir
    const advanced = state.decisionLog
      // Perşembe karında yolu kapanan aday çağrılmış olsa da gelemez
      .filter((e) => day.selection && e.decision === 'approve' && state.decisions[e.id] === 'approve' && !state.story.stranded?.includes(e.id))
      .map((e) => ({ id: e.id, day: day.day }) as Finalist);
    // çağırmanı istediği kişiler mülakatlara yine de gelir
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

    const keyDecisions = { ...state.story.keyDecisions };
    for (const k of KEY_CHARACTERS) if (lineup.includes(k.id) && state.decisions[k.id]) keyDecisions[k.id] = state.decisions[k.id];
    const story: StoryState = {
      ...state.story,
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
      vicdan: addVicdan(state.vicdan, verdict.vicdan),
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
      // Seçim günü ve son gün yeni başvuru yok: doğrudan memoya.
      phase: days[nextIndex].final || days[nextIndex].selection ? 'briefing' : 'applicationFlood',
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
