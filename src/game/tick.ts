/*
 * One second of the workday. The game calls tick() once a second while the day screen is up;
 * each step below looks at the same moment and either ends the second there (the clock stands
 * still, lunch, the meeting door) or lets it run on to the next. Their order is the rule: a new
 * kind of interruption is a new step, put where it should cut in. What a minute sets off once it
 * has passed (calls, texts, the end of the day) is the AFTER_MINUTE list at the bottom.
 */
import { getState, setState } from './storeApi';
import type { GameState } from './storeTypes';
import { sound } from './sound';
import { BREAK_END_MIN, BREAK_START_MIN } from './time';
import { MEETING_AT, MEETING_DAY } from './meeting';
import { EVENT_LENGTH, minutesPerTick } from './storeDefaults';
import { addExtraFiles, checkDayEnd, dayLimit, deliverManagerMessages, expireReplies, isOnBreak, ringLandline } from './clock';

/** A step of the second: true when the second ends with it. */
type Step = (state: GameState) => boolean;

/** Nothing moves: another screen, the pause menu, before the shift, the recall mail, the meeting. */
const clockStopped: Step = (state) =>
  state.phase !== 'gameplay' ||
  state.paused ||
  !state.shiftStarted ||
  // the recall mail is open over everything: the day waits until it's sent
  Boolean(state.revokeDraft && !state.desk.inCall) ||
  // the clock stops at the conference room door; the meeting takes its time when it ends
  state.meeting.state === 'active';

/** Wednesday 11:00: the weekly meeting starts (not over lunch). */
const meetingStarts: Step = (state) => {
  if (state.currentDayIndex !== MEETING_DAY || state.meeting.state !== 'pending' || state.workdayMinutes < MEETING_AT || isOnBreak(state)) return false;
  setState({ meeting: { ...state.meeting, state: 'active' } });
  sound().playUi('select', 1);
  return true;
};

/** Lunch is an hour of the clock too: eat fast, or eat into your break. The landline waits. */
const lunchHour: Step = (state) => {
  if (!isOnBreak(state)) return false;
  const next = Math.min(BREAK_END_MIN, state.workdayMinutes + minutesPerTick(state.difficulty));
  setState({ workdayMinutes: next });
  for (const after of DURING_LUNCH) after(next);
  return true;
};

/** A working minute: the clock moves (an event can take a bite out of it), and so does reading. */
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

/** Where the clock lands this second, with the day's events (hard mode, the calendar) worked in. */
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
      // Dragged into an "urgent" meeting: half an hour gone in a blink.
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
  // the morning stops at noon: lunch starts on the hour
  if (state.workdayMinutes < BREAK_START_MIN && workdayMinutes >= BREAK_START_MIN) workdayMinutes = BREAK_START_MIN;
  return { workdayMinutes: Math.min(workdayMinutes, dayLimit(state)), activeEvent, dayEvents, week };
}

/** Reading time counts only while the open, undecided file is actually on screen. */
function readingTime(state: GameState): GameState['timeSpent'] {
  const id = state.currentCandidateId;
  if (!id || state.decisions[id] || !state.reading) return state.timeSpent;
  return { ...state.timeSpent, [id]: (state.timeSpent[id] ?? 0) + 1 };
}

/** What lunch lets through: replies running out, texts arriving. */
const DURING_LUNCH: ((minutes: number) => void)[] = [expireReplies, deliverManagerMessages];

/** What a working minute sets off, in this order (see clock.ts for each). */
const AFTER_MINUTE: ((minutes: number) => void)[] = [
  ringLandline,
  expireReplies,
  deliverManagerMessages,
  checkDayEnd,
  // a queue closed in the morning: at 14:00 Hakan Bey notices, and finds more files
  () => void addExtraFiles(),
];
