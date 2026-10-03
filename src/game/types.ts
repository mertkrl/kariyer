export type Decision = 'approve' | 'reject';

export type EvaluatedField = 'experience' | 'salary' | 'skills' | 'motivation' | 'questions';

/** What the screening system told the company about a file. */
export type SystemVerdict = 'priority' | 'review' | 'low' | 'out';
/** nephew: the manager's nephew · neighbour: your mother's neighbour's son, your own "reference". */
export type StoryRole = 'nephew' | 'neighbour';

export interface Candidate {
  id: string;
  name: string;
  initials: string;
  color: string;
  age: number;
  role: string;
  experience: string;
  salary: string;
  skills: string;
  motivation: string;
  education: string;
  references: string;
  previousCompany: string;
  certifications: string;
  /** Clubs, volunteering, hobbies: what a thin CV fills its empty half with. */
  activities?: string[];
  companyAnswers: string[];
  internalNote: string;
  /** What the screening system recommends. Scoring reads this, never the wording of `systemLine`. */
  verdict: SystemVerdict;
  /** The system's line as shown on screen; must open with the label of `verdict` (tests check it). */
  systemLine: string;
  /** The system's concern about this file is real, not a biased proxy. */
  flagIsFair?: boolean;
  /** A file the week's story hangs on. Exactly one candidate holds each role. */
  storyRole?: StoryRole;
  outcomeNote: Record<Decision, string>;
  flaggedField: EvaluatedField;
}

export interface DayConfig {
  day: number;
  dayName: string;
  ruleText: string;
  memoFrom: string;
  memoTo: string;
  memoBody: string;
  goals: string[];
  candidateIds: string[];
  companyQuestions: string[];
  applicationTarget: number;
  aiDown?: boolean;
  /** Days 1–4: how many candidates may be advanced to the final today. */
  approvalLimit?: number;
  /** Day 5: the final round — interviews with the week's finalists, one hire. */
  final?: boolean;
}

export interface JobDraft {
  id: string;
  title: string;
  tag: string;
  accent: string;
  companyLine: string;
  location: string;
  employmentType: string;
  salaryRange: string;
  summary: string;
  aboutRole: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
}

export type GamePhase =
  | 'welcome'
  | 'jobSelect'
  | 'applicationFlood'
  | 'briefing'
  | 'gameplay'
  | 'finalRound'
  | 'dayEnd'
  | 'reckoning'
  | 'weekend'
  | 'final';

export type Difficulty = 'normal' | 'hard';

/** Hard-mode surprises during the workday. */
export type EventKind = 'power' | 'meeting' | 'it' | 'calendar' | 'weather';

export interface DayStats {
  approved: number;
  rejected: number;
  /** Applications the AI eliminated before any human opened them. */
  autoRejected: number;
  /** Shortlisted candidates left without a decision when the day ended. */
  undecided: number;
}

export interface EndingVariant {
  title: string;
  body: string;
  /** You're no longer at the company a year on (fired, pushed out, quit). */
  left?: boolean;
}
