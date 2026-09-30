export type Decision = 'approve' | 'reject';

export type EvaluatedField = 'experience' | 'salary' | 'skills' | 'motivation' | 'questions';

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
  systemLine: string;
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
