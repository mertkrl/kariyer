/*
 * Mesainin bir saniyesi. Gün ekranı açıkken oyun tick()'i saniyede bir çağırır; aşağıdaki her
 * adım aynı ana bakar ve ya saniyeyi orada bitirir (saat durur, öğle arası, toplantı kapısı) ya da
 * bir sonrakine geçmesine izin verir. Sıraları kuraldır: yeni bir kesinti türü, araya gireceği yere
 * konan yeni bir adımdır. Bir dakika geçtikten sonra tetiklediği şeyler (aramalar, mesajlar, günün
 * sonu) en alttaki AFTER_MINUTE listesidir.
 */
import { getState, setState } from './storeApi';
import type { GameState } from './storeTypes';
import { sound } from './sound';
import { BREAK_END_MIN, BREAK_START_MIN } from './time';
import { MEETING_AT, MEETING_DAY } from './meeting';
import { EVENT_LENGTH, minutesPerTick } from './storeDefaults';
import { addExtraFiles, checkDayEnd, dayLimit, deliverManagerMessages, expireReplies, isOnBreak, ringLandline } from './clock';

/** Saniyenin bir adımı: saniye onunla bitiyorsa true. */
type Step = (state: GameState) => boolean;

/** Hiçbir şey kıpırdamaz: başka bir ekran, duraklatma menüsü, mesaiden önce, geri çekme e-postası, toplantı. */
const clockStopped: Step = (state) =>
  state.phase !== 'gameplay' ||
  state.paused ||
  !state.shiftStarted ||
  // geri çekme e-postası her şeyin üstünde açık: gün, gönderilene kadar bekler
  Boolean(state.revokeDraft && !state.desk.inCall) ||
  // saat toplantı odasının kapısında durur; toplantı bitince süresini alır
  state.meeting.state === 'active';

/** Çarşamba 11:00: haftalık toplantı başlar (öğle arasında değil). */
const meetingStarts: Step = (state) => {
  if (state.currentDayIndex !== MEETING_DAY || state.meeting.state !== 'pending' || state.workdayMinutes < MEETING_AT || isOnBreak(state)) return false;
  setState({ meeting: { ...state.meeting, state: 'active' } });
  sound().playUi('select', 1);
  return true;
};

/** Öğle arası da saatin bir saatidir: hızlı ye ya da molandan ye. Sabit hat bekler. */
const lunchHour: Step = (state) => {
  if (!isOnBreak(state)) return false;
  const next = Math.min(BREAK_END_MIN, state.workdayMinutes + minutesPerTick(state.difficulty));
  setState({ workdayMinutes: next });
  for (const after of DURING_LUNCH) after(next);
  return true;
};

/** Bir çalışma dakikası: saat ilerler (bir olay ondan bir parça koparabilir), okuma da. */
const workingMinute: Step = (state) => {
  const clock = nextClock(state);
  setState({ ...clock, timeSpent: readingTime(state) });
  for (const after of AFTER_MINUTE) after(clock.workdayMinutes);
  return true;
};

const STEPS: Step[] = [clockStopped, meetingStarts, lunchHour, workingMinute];

export function tick() {
  const state = getState();
  for (const step of STEPS) if (step(state)) return;
}

/** Saatin bu saniye nereye vardığı; günün olayları (zor mod, takvim) hesaba katılarak. */
function nextClock(state: GameState): Pick<GameState, 'workdayMinutes' | 'activeEvent' | 'dayEvents' | 'week'> {
  let workdayMinutes = state.workdayMinutes + minutesPerTick(state.difficulty);
  let activeEvent = state.activeEvent && workdayMinutes < state.activeEvent.until ? state.activeEvent : null;
  let dayEvents = state.dayEvents;
  let week = state.week;
  const due = dayEvents.find((e) => e.at <= workdayMinutes);
  if (due && !activeEvent) {
    dayEvents = dayEvents.filter((e) => e !== due);
    week = { ...week, events: week.events + 1 };
    if (due.kind === 'meeting') {
      // "Acil" bir toplantıya sürüklendin: göz açıp kapayıncaya kadar yarım saat gitti.
      workdayMinutes += 30;
      sound().playPhoneBuzz();
    } else if (due.kind === 'calendar') {
      workdayMinutes += due.minutes ?? 15;
      sound().playUi('select', 2);
    } else {
      sound().playUi(due.kind === 'power' ? 'click' : 'connect');
    }
    activeEvent = { kind: due.kind, until: workdayMinutes + EVENT_LENGTH[due.kind], text: due.text };
  }
  // sabah öğlen durur: öğle arası tam saatte başlar
  if (state.workdayMinutes < BREAK_START_MIN && workdayMinutes >= BREAK_START_MIN) workdayMinutes = BREAK_START_MIN;
  return { workdayMinutes: Math.min(workdayMinutes, dayLimit(state)), activeEvent, dayEvents, week };
}

/** Okuma süresi yalnızca açık ve karar verilmemiş dosya gerçekten ekrandayken sayılır. */
function readingTime(state: GameState): GameState['timeSpent'] {
  const id = state.currentCandidateId;
  if (!id || state.decisions[id] || !state.reading) return state.timeSpent;
  return { ...state.timeSpent, [id]: (state.timeSpent[id] ?? 0) + 1 };
}

/** Öğle arasının geçirdikleri: süresi dolan cevaplar, gelen mesajlar. */
const DURING_LUNCH: ((minutes: number) => void)[] = [expireReplies, deliverManagerMessages];

/** Bir çalışma dakikasının tetikledikleri, bu sırayla (her biri için bkz. clock.ts). */
const AFTER_MINUTE: ((minutes: number) => void)[] = [
  ringLandline,
  expireReplies,
  deliverManagerMessages,
  checkDayEnd,
  // sabah kapanmış bir kuyruk: 14:00'te Hakan Bey fark eder ve daha fazla dosya bulur
  () => void addExtraFiles(),
];
