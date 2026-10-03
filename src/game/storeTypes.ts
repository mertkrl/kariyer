/*
 * The shape of the game's state: what the store holds and the actions it offers. Types only —
 * the behaviour lives in store.ts.
 */
import type { Decision, DayStats, Difficulty, EventKind, GamePhase } from './types';
import type { ExpenseId, BillId, EvidenceAction } from './story';
import type { Mail } from './mail';
import type { ReferenceVerdict } from './references';
import type { ReformKind } from './desk';
import type { ManagerRequest, PhoneMessage, ScheduledMessage, Grievance, ThreadId } from './manager';
import type { MeetingChoice, WeekEntry } from './echoes';
import type { RejectTemplate } from './rejectionMails';

export interface Finalist {
  id: string;
  /** 1-based day the candidate was advanced on. */
  day: number;
  /** Put on the list by Hakan Bey, not by you. */
  byManager?: boolean;
  /** Brought by a colleague from their own shortlist. */
  by?: 'ayse' | 'emre';
}

export interface DayEvent {
  kind: EventKind;
  /** Workday minute it strikes. */
  at: number;
  /** Calendar items: minutes taken and the toast text. */
  minutes?: number;
  text?: string;
}

export interface ActiveEvent {
  kind: EventKind;
  /** Workday minute it ends. */
  until: number;
  text?: string;
}

/** What happened over the whole week — for the weekend call, achievements and endings. */
export interface WeekLog {
  /** Ticks spent on decided candidates, and how many were decided. */
  reviewTicks: number;
  reviewed: number;
  momMessages: number;
  momAnswered: number;
  managerIgnored: number;
  events: number;
}

/** The story's state: the red folder, your money, the week's key decisions. */
export interface StoryState {
  drawer: 'locked' | 'unlocked' | 'photographed' | 'returned';
  /** Pages of the red folder you have on your phone (0–2). */
  photoPages: number;
  evidence: EvidenceAction | null;
  money: number;
  bills: Partial<Record<BillId, 'paid' | 'skipped'>>;
  /** Today's income, shown on the evening budget. */
  wageToday: number;
  primToday: number;
  /** Docked today for files left open at 20:00. */
  penaltyToday: number;
  /** Target bonus for ending the day with high performance. */
  bonusToday: number;
  /** Spent this evening (dinner, coffee…). */
  spentToday: number;
  /** Evening activities you did, all week. */
  activities: string[];
  /** Stayed past 17:00 today. */
  overtimeToday: boolean;
  rent: 'paid' | 'unpaid' | null;
  /** Your decision on each of the five, all week. */
  keyDecisions: Record<string, Decision>;
  /** Yesterday's favours: the candidates you did them for, and those you didn't. The team notices. */
  managerDay: { complied: string[]; defied: string[] };
  /** Every candidate Hakan Bey asked you to call this week (his side of the panel). */
  pastRequests: { candidateId: string; want: Decision }[];
  /** You lost a night's sleep this week (it only happens once). */
  sleptBadly?: boolean;
  /** The change you pitched to Hakan Bey on Thursday. */
  reform: { kind: ReformKind; accepted: boolean } | null;
  /** You told Mom the neighbour's son could send his CV. */
  neighbourCv: boolean;
  /** The evening ledger: which everyday expenses you paid, per day. */
  ledger: Record<number, Partial<Record<ExpenseId, boolean>>>;
}

/** The desk around the computer: the landline, the coffee mug, the welcome flowers. */
export interface DeskState {
  flower: boolean;
  /** Day index the flowers last got fresh water. */
  lastWatered: number;
  /** Sips left in the mug. */
  coffee: number;
  /** Sips taken today — picks the day's next thought. */
  sipsToday: number;
  /** Refills today. */
  refills: number;
  /** Trips to the water cooler, all week. */
  coolerVisits: number;
  /** How each landline call went, all week. */
  calls: Record<string, 'answered' | 'missed'>;
  ringing: string | null;
  ringingSince: number;
  /** Things you threw away or put in your bag (the cake plate, the final notice). */
  cleared: string[];
  inCall: string | null;
  /** What happened while you weren't looking — shown on the desk. */
  notice: string | null;
  /** What kind of notice it is. */
  noticeKind?: 'missed' | 'overtime' | 'overtimeWarning' | 'scheduled' | 'sent';
  /** Slices of Thursday's late-night pizza you ate. */
  pizzaEaten?: number;
}

/** Replying to a rejected candidate's DM: the truth (against policy), the template, or silence. */
export type DmKind = 'honest' | 'template' | 'ignore';

export interface DecisionLogEntry {
  id: string;
  decision: Decision;
  /** Workday minutes when the decision was (last) made. */
  at: number;
}

export interface GameState {
  phase: GamePhase;
  currentDayIndex: number;

  performans: number;
  vicdan: number;

  workdayMinutes: number;
  /** You went back to your desk before 13:00 — the rest of the hour is work time again. */
  breakOver: boolean;
  /** Past 17:00 with files still open: you stay until 20:00. */
  overtime: boolean;
  /** Today's one-hour warning (16:00) has been shown. */
  overtimeWarned: boolean;
  /** Extra files Hakan Bey added after you closed the queue early, by day index. */
  extraFiles: Record<number, string[]>;
  openedIds: string[];
  currentCandidateId: string | null;
  decisions: Record<string, Decision>;
  /** Today's decisions, newest last. Re-deciding a candidate moves them to the end. */
  decisionLog: DecisionLogEntry[];
  /** Seconds each of today's files spent open on the portal screen. */
  timeSpent: Record<string, number>;
  /** Files whose CV was seen to the end (see `wasConsidered`). */
  readThrough: Record<string, true>;
  /** The portal is on screen with a file open: only then does reading time count. */
  reading: boolean;

  dayStats: DayStats;
  totalStats: DayStats;

  /** Candidates advanced to the final round on previous days. */
  finalists: Finalist[];
  /** The one person hired on the final day. */
  hiredId: string | null;
  /** Who you put forward on Friday (the panel may have picked someone else). */
  recommendedId: string | null;
  /** This game's candidate queue per day. */
  lineups: string[][];

  /** The manager's texts on the desk phone. */
  phone: PhoneMessage[];
  phoneUnread: Record<ThreadId, number>;
  managerRequests: ManagerRequest[];
  managerScript: ScheduledMessage[];
  /** End-of-day summary of how the manager's requests went. */
  managerVerdict: string[];
  /** Whole-week record of how you've answered the manager — drives both sides' tone. */
  managerStance: { refusals: number; complies: number };
  /** Message ids the manager has already chased up (one nudge each). */
  managerNudged: number[];
  /** Mom's topics for the week (shuffled once per game; two per day, never repeated). */
  momOrder: number[];
  /** Yesterday's requests that weren't carried out — the manager brings them up next morning. */
  managerGrievances: Grievance[];

  difficulty: Difficulty;
  /** How many times the AI analysis was asked for, all week. */
  aiUses: number;
  week: WeekLog;
  /** Hard mode: today's surprises, and the one happening right now. */
  dayEvents: DayEvent[];
  activeEvent: ActiveEvent | null;
  /** What you told your mother on Friday night. */
  weekendChoice: string | null;
  /** How you answered rejected candidates who messaged you on Kariyergram. */
  dmHandled: Record<string, DmKind>;
  story: StoryState;
  desk: DeskState;
  /** E-mails you've opened (all week). */
  mailRead: string[];
  /** What the reference calls you made turned up, by candidate. */
  referenceChecks: Record<string, ReferenceVerdict>;
  /** Questions you asked on Friday that no interviewer should ask. */
  forbiddenAsked: number;
  /** Friday: how you handled Hakan Bey cutting in, and the candidates' own questions. */
  interviewStance: InterviewStance;
  /** What each of today's decisions did to the scores (to take it back exactly). */
  /** What each of today's decisions did to the scores (as applied, so undo restores them exactly) and why. */
  decisionEffects: Record<string, { performans: number; vicdan: number; reason?: string }>;
  /** Performance fell too low: one interview slot fewer today. */
  quotaCut: boolean;

  muted: boolean;
  paused: boolean;
  /** The clock waits until you press "Mesaiye başla" in the portal. */
  shiftStarted: boolean;
  /** Why you're at your desk late this morning, said on the clock-in card (not as a notification). */
  lateReason: string | null;
  /** This game's roll of the dice: who writes to you, and in what temper. */
  seed: number;
  /** The id the next phone message gets. */
  messageSeq: number;
  /** Workday minute the landline last rang or was in use today (null: not yet). */
  lastLandlineAt: number | null;
  /** Scores when the day began (the evening report shows what the day did to them). */
  dayStart: { performans: number; vicdan: number };
  /** Group chats you muted: they still arrive, they just don't pop up. */
  mutedThreads: ThreadId[];
  /** Someone is typing an answer to you in this chat. */
  typingThread: ThreadId | null;
  /** Mail written for this playthrough (Hakan Bey's morning-after notes). */
  extraMails: Mail[];
  /** Every decision of the week, by day: what the echoes during the week are built from. */
  weekLog: WeekEntry[];
  /** Today's rejection mails: the day doesn't close until they have gone out (or you chose not to). */
  rejectionMailsSent: boolean;
  /** Rejection notices written today and waiting in the outbox for 17:00; decisions can still change until then. */
  plannedRejections: Record<string, RejectTemplate>;
  /** Day 1's walk-through of the portal, done once per playthrough. */
  orientationDone: boolean;
  /** Across the week, how you told people no. */
  rejectionStats: Record<RejectTemplate, number>;
  /** The same, for today only (the day-end report). */
  rejectionToday: Record<RejectTemplate, number>;
  /** Wednesday's team meeting, held as a video call. */
  meeting: { state: 'pending' | 'active' | 'done'; choice: MeetingChoice };
  /** Hakan Bey wants a written reason for every rejection: each one costs a few minutes. */
  justifyRejects: boolean;
  /** After you went against him: when he calls you into his office this morning. */
  reviewAt: number | null;
  /** Two invitations you sent, taken back on Hakan Bey's call: who, and how you worded it. */
  revoked: { ids: string[]; honest: boolean | null } | null;
  /** The recall mail you still have to write (opens in the mail app). */
  revokeDraft: string[] | null;
  /** 0–1 slider values, persisted. */
  musicVolume: number;
  sfxVolume: number;

  selectedJobId: string | null;

  /** A new week; with `replaySeed`, the same week as that seed's (same files, same calls). */
  startGame: (replaySeed?: number) => void;
  /** Picks the week up from this browser's last checkpoint (the start of a day). */
  continueGame: () => void;
  publishJob: (jobId: string) => void;
  proceedToBriefing: () => void;
  beginDay: () => void;
  selectCandidate: (id: string) => void;
  tick: () => void;
  skipBreak: () => void;
  decide: (decision: Decision) => void;
  /** Takes back the decision on the currently open candidate. */
  undoDecision: () => void;
  /** Final day: hire one finalist and end the game. */
  hire: (id: string) => void;
  answerRequest: (requestId: string, answer: 'comply' | 'refuse') => void;
  /** Optional quick reply to a mom / office message. */
  answerMessage: (messageId: number, replyIndex: number) => void;
  markPhoneRead: (thread: ThreadId) => void;
  finishDay: () => void;
  nextDay: () => void;
  restart: () => void;
  toggleMute: () => void;
  togglePause: () => void;
  setReading: (reading: boolean) => void;
  markReadThrough: (id: string) => void;
  startShift: () => void;
  finishOrientation: () => void;
  toggleMuteThread: (thread: ThreadId) => void;
  /** Send the recall mail, lying ("sent by mistake") or saying what happened. */
  sendRevoke: (honest: boolean) => void;
  setDifficulty: (d: Difficulty) => void;
  recordAiUse: () => void;
  setWeekendChoice: (choice: string) => void;
  answerCandidateDm: (candidateId: string, kind: DmKind) => void;
  decideDrawer: (photo: boolean) => void;
  payBill: (id: BillId, pay: boolean) => void;
  setExpense: (id: ExpenseId, pay: boolean) => void;
  payRent: (pay: boolean) => void;
  setEvidence: (action: EvidenceAction) => void;
  finishReckoning: () => void;
  finishWeekend: () => void;
  setMusicVolume: (value: number) => void;
  setSfxVolume: (value: number) => void;
  /** Lift the ringing landline's handset. */
  pickUpCall: () => void;
  /** Say your piece and hang up. */
  answerCall: (choice: number) => void;
  /** A sip of coffee and a thought — or, with an empty mug, a trip to the kitchen (a few minutes). */
  drinkCoffee: () => string;
  /** A slice of the team's pizza on Thursday evening. Returns the thought. */
  eatPizza: () => string;
  waterFlower: () => void;
  clearDeskNotice: () => void;
  clearDeskItem: (id: string) => void;
  readMail: (id: string) => void;
  /** Dial a candidate's former employer. False when the line is busy or there's nobody to call. */
  callReference: (candidateId: string) => boolean;
  /** Friday: ask a question no interviewer should ask. */
  askForbidden: () => void;
  /** Hakan Bey asks a question from his list mid-interview: step in, or let it stand. */
  hakanInterrupt: (protect: boolean) => void;
  /** The candidate asks you something: the plain truth, or the brochure. */
  answerCandidate: (honest: boolean) => void;
  /** Leave the Wednesday meeting having said what you said. */
  finishMeeting: (choice: Exclude<MeetingChoice, null>) => void;
  /** Put the notices in the outbox for 17:00 (right away if it's already past). */
  planRejectionMails: (choices: Record<string, RejectTemplate>) => void;
  /** Spend on something after work (dinner, coffee…). */
  doActivity: (id: string) => void;
  /** A glass of water at the cooler — the famous perk. Returns the thought. */
  visitCooler: () => string;
}

export interface InterviewStance {
  protected: number;
  silent: number;
  honest: number;
  polished: number;
}
