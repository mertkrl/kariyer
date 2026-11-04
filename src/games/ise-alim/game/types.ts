export type Decision = 'approve' | 'reject';

export type EvaluatedField = 'experience' | 'salary' | 'skills' | 'motivation' | 'questions';

/** Eleme sisteminin şirkete bir dosya hakkında söylediği. */
export type SystemVerdict = 'priority' | 'review' | 'low' | 'out';
/** nephew: müdürün yeğeni · neighbour: annenin komşusunun oğlu, senin kendi "referansın". */
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
  /** Kulüpler, gönüllülük, hobiler: ince bir CV'nin boş yarısını doldurduğu şeyler. */
  activities?: string[];
  companyAnswers: string[];
  internalNote: string;
  /** Eleme sisteminin önerisi. Puanlama bunu okur, `systemLine`'ın ifadesini asla. */
  verdict: SystemVerdict;
  /** Sistemin ekranda görünen satırı; `verdict`in etiketiyle başlamalı (testler kontrol eder). */
  systemLine: string;
  /** Sistemin bu dosya hakkındaki kaygısı gerçek, önyargılı bir vekil değil. */
  flagIsFair?: boolean;
  /** Haftanın hikâyesinin asıldığı bir dosya. Her rolü tam olarak bir aday taşır. */
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
  /** Bugün mülakata kaç aday çağrılabilir (yalnızca seçim günü; CV günlerinde teste geçirmenin sınırı yok). */
  approvalLimit?: number;
  /** 5. gün: final turu; haftanın finalistleriyle mülakatlar, tek işe alım. */
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
  /** Her ilan maaşını aralık olarak yazar (tests/data.test.ts): başvuranın bilmesi gerekir. */
  salary: { min: number; max: number; /** varsa üstüne gelenler */ extra?: string };
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
  | 'offer'
  | 'weekend'
  | 'final';

/** relaxed: kendi temponda okumak için daha yavaş bir saat; hikâye ve puanlama aynı. */
export type Difficulty = 'relaxed' | 'normal' | 'hard';

/** Mesai sırasında zor mod sürprizleri. */
export type EventKind = 'power' | 'meeting' | 'it' | 'calendar' | 'weather';

export interface DayStats {
  approved: number;
  rejected: number;
  /** Hiçbir insan açmadan yapay zekânın elediği başvurular. */
  autoRejected: number;
  /** Gün bittiğinde kararsız kalan kısa listedeki adaylar. */
  undecided: number;
}

export interface EndingVariant {
  title: string;
  body: string;
  /** Bir yıl sonra artık şirkette değilsin (çıkarıldın, gönderildin, istifa ettin). */
  left?: boolean;
}
