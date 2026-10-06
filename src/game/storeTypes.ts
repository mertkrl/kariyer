/*
 * Oyun durumunun biçimi: store'un tuttukları ve sunduğu eylemler. Yalnızca tipler; davranış
 * store.ts'de yaşar.
 */
import type { Decision, DayStats, Difficulty, EventKind, GamePhase } from './types';
import type { Mail } from './mail';
import type { ReferenceVerdict } from './references';
import type { ReformKind } from './desk';
import type { OfferResult } from './offer';
import type { ManagerRequest, PhoneMessage, ScheduledMessage, Grievance, ThreadId } from './manager';
import type { MeetingChoice, WeekEntry } from './echoes';
import type { RejectTemplate } from './rejectionMails';
import type { ReplyBack } from './rejectionMails';
import type { PanelInput } from './managerCalls';
import type { SalaryMove } from './interview';

export interface Finalist {
  id: string;
  /** Adayın ilerletildiği gün (1'den başlar). */
  day: number;
  /** Listeye sen değil Hakan Bey koydu. */
  byManager?: boolean;
  /** Bir iş arkadaşının kendi kısa listesinden getirdiği. */
  by?: 'ayse' | 'emre';
}

export interface DayEvent {
  kind: EventKind;
  /** Patlak verdiği mesai dakikası. */
  at: number;
  /** Takvim öğeleri: aldığı dakikalar ve bildirim metni. */
  minutes?: number;
  text?: string;
}

export interface ActiveEvent {
  kind: EventKind;
  /** Bittiği mesai dakikası. */
  until: number;
  text?: string;
}

/** Bütün hafta boyunca olanlar: hafta sonu araması, başarımlar ve sonlar için. */
export interface WeekLog {
  /** Karar verilen adaylara harcanan tikler ve kaç tanesine karar verildiği. */
  reviewTicks: number;
  reviewed: number;
  momMessages: number;
  momAnswered: number;
  managerIgnored: number;
  events: number;
}

/** Hikâyenin durumu: haftanın kilit kararları. */
export interface StoryState {
  /** Bugün 17:00'den sonra kaldın. */
  overtimeToday: boolean;
  /** Cuma 18:40: Hakan Bey kadroyu teklif ettiğinde ne dediğin ve nasıl bittiği. */
  offer: OfferResult | null;
  /** Beşinin her biri hakkındaki kararın, bütün hafta. */
  keyDecisions: Record<string, Decision>;
  /** Dünkü ricalar: yaptığın adaylar ve yapmadıkların. Ekip fark eder. */
  managerDay: { complied: string[]; defied: string[] };
  /** Hakan Bey'in bu hafta çağırmanı istediği her aday (kurulda onun tarafı). */
  pastRequests: { candidateId: string; want: Decision }[];
  /** Bu hafta bir gece uykusuz kaldın (yalnızca bir kez olur). */
  sleptBadly?: boolean;
  /** Perşembe Hakan Bey'e önerdiğin değişiklik. */
  reform: { kind: ReformKind; accepted: boolean } | null;
  /** Annene komşunun oğlunun CV'sini gönderebileceğini söyledin. */
  neighbourCv: boolean;
  /** Çağırdığın ama yolu kapandığı için mülakata gelemeyen adaylar (Perşembe karı). */
  stranded?: string[];
}

/** Bilgisayarın çevresindeki masa: sabit hat, kahve kupası, hoş geldin çiçekleri. */
export interface DeskState {
  flower: boolean;
  /** Çiçeklerin en son taze su aldığı günün sırası. */
  lastWatered: number;
  /** Kupada kalan yudumlar. */
  coffee: number;
  /** Bugün alınan yudumlar: günün sıradaki düşüncesini seçer. */
  sipsToday: number;
  /** Bugünkü doldurmalar. */
  refills: number;
  /** Sebile gidişler, bütün hafta. */
  coolerVisits: number;
  /** Her sabit hat aramasının nasıl geçtiği, bütün hafta. */
  calls: Record<string, 'answered' | 'missed'>;
  ringing: string | null;
  ringingSince: number;
  /** Attığın ya da çantana koyduğun şeyler (pasta tabağı). */
  cleared: string[];
  inCall: string | null;
  /** Sen bakmazken olanlar: masada gösterilir. */
  notice: string | null;
  /** Bildirimin türü. */
  noticeKind?: 'missed' | 'overtime' | 'overtimeWarning' | 'scheduled' | 'sent';
  /** Perşembe geceki pizzadan yediğin dilimler. */
  pizzaEaten?: number;
}

/** Reddedilen bir adayın özel mesajına cevap: gerçek (politikaya aykırı), şablon ya da sessizlik. */
export type DmKind = 'honest' | 'template' | 'ignore';

export interface DecisionLogEntry {
  id: string;
  decision: Decision;
  /** Kararın (en son) verildiği mesai dakikası. */
  at: number;
}

export interface GameState {
  phase: GamePhase;
  currentDayIndex: number;

  performans: number;
  vicdan: number;

  workdayMinutes: number;
  /** 13:00'ten önce masana döndün: saatin geri kalanı yine mesai. */
  breakOver: boolean;
  /** 17:00 geçti ve hâlâ açık dosya var: 20:00'ye kadar kalırsın. */
  overtime: boolean;
  /** Bugünün bir saat önceki uyarısı (16:00) gösterildi. */
  overtimeWarned: boolean;
  /** Kuyruğu erken kapattıktan sonra Hakan Bey'in eklediği dosyalar, gün sırasına göre. */
  extraFiles: Record<number, string[]>;
  openedIds: string[];
  currentCandidateId: string | null;
  decisions: Record<string, Decision>;
  /** Bugünün kararları, en yenisi sonda. Bir adaya yeniden karar vermek onu sona taşır. */
  decisionLog: DecisionLogEntry[];
  /** Bugünün her dosyasının portal ekranında açık kaldığı saniye. */
  timeSpent: Record<string, number>;
  /** CV'si sonuna kadar görülen dosyalar (bkz. `wasConsidered`). */
  readThrough: Record<string, true>;
  /** Portal ekranda ve bir dosya açık: okuma süresi yalnızca o zaman sayılır. */
  reading: boolean;

  dayStats: DayStats;
  totalStats: DayStats;

  /** Önceki günlerde final turuna ilerletilen adaylar. */
  finalists: Finalist[];
  /** Son gün işe alınan tek kişi. */
  hiredId: string | null;
  /** Cuma öne sürdüğün kişi (kurul başka birini seçmiş olabilir). */
  recommendedId: string | null;
  /** Bu oyunun gün gün aday kuyruğu. */
  lineups: string[][];

  /** Müdürün masa telefonuna gelen mesajları. */
  phone: PhoneMessage[];
  phoneUnread: Record<ThreadId, number>;
  managerRequests: ManagerRequest[];
  managerScript: ScheduledMessage[];
  /** Müdürün ricalarının nasıl gittiğinin gün sonu özeti. */
  managerVerdict: string[];
  /** Müdüre nasıl cevap verdiğinin bütün haftalık kaydı: iki tarafın tonunu da belirler. */
  managerStance: { refusals: number; complies: number };
  /** Müdürün zaten dürttüğü mesaj kimlikleri (her birine bir dürtme). */
  managerNudged: number[];
  /** Annenin haftalık konuları (oyun başına bir kez karışır; günde iki, hiç tekrar yok). */
  momOrder: number[];
  /** Dünün yapılmayan ricaları: müdür ertesi sabah açar. */
  managerGrievances: Grievance[];

  difficulty: Difficulty;
  /** Yapay zekâ analizinin kaç kez istendiği, bütün hafta. */
  aiUses: number;
  week: WeekLog;
  /** Zor mod: bugünün sürprizleri ve şu an olanı. */
  dayEvents: DayEvent[];
  activeEvent: ActiveEvent | null;
  /** Cuma gecesi annene ne dediğin. */
  weekendChoice: string | null;
  /** Kariyergram'dan sana yazan reddedilmiş adaylara nasıl cevap verdiğin. */
  dmHandled: Record<string, DmKind>;
  story: StoryState;
  desk: DeskState;
  /** Açtığın e-postalar (bütün hafta). */
  mailRead: string[];
  /** Yaptığın referans aramalarının ortaya çıkardıkları, adaya göre. */
  referenceChecks: Record<string, ReferenceVerdict>;
  /** Cuma sorduğun, hiçbir mülakatçının sormaması gereken sorular. */
  forbiddenAsked: number;
  /** Cuma: Hakan Bey'in araya girmesini ve adayların kendi sorularını nasıl karşıladığın. */
  interviewStance: InterviewStance;
  /** Bugünün her kararının puanlara yaptığı (tam olarak geri alabilmek için). */
  /** Bugünün her kararının puanlara yaptığı (uygulandığı hâliyle, geri alma tam geri yüklesin diye) ve nedeni. */
  decisionEffects: Record<string, { performans: number; vicdan: number; reason?: string }>;
  /** Performans çok düştü: bugün bir mülakat hakkı eksik. */
  quotaCut: boolean;

  muted: boolean;
  paused: boolean;
  /** Saat, portalda "Mesaiye başla"ya basana kadar bekler. */
  shiftStarted: boolean;
  /** Bu sabah masana neden geç oturduğun; bildirim olarak değil, mesai kartında söylenir. */
  lateReason: string | null;
  /** Bu oyunun zar atışı: sana kim yazıyor ve hangi ruh hâlinde. */
  seed: number;
  /** Sıradaki telefon mesajının alacağı kimlik. */
  messageSeq: number;
  /** Sabit hattın bugün en son çaldığı ya da kullanıldığı mesai dakikası (null: henüz değil). */
  lastLandlineAt: number | null;
  /** Gün başladığındaki puanlar (akşam raporu günün onlara ne yaptığını gösterir). */
  dayStart: { performans: number; vicdan: number };
  /** Sessize aldığın grup sohbetleri: yine gelirler, yalnızca açılmazlar. */
  mutedThreads: ThreadId[];
  /** Bu sohbette biri sana cevap yazıyor. */
  typingThread: ThreadId | null;
  /** Bu oyun için yazılmış e-postalar (Hakan Bey'in ertesi sabah notları). */
  extraMails: Mail[];
  /** Haftanın her kararı, gün gün: hafta içindeki yankılar bundan kurulur. */
  weekLog: WeekEntry[];
  /** Bugünün ret e-postaları: gidene kadar (ya da göndermemeyi seçene kadar) gün kapanmaz. */
  rejectionMailsSent: boolean;
  /** Bugün yazılıp giden kutusunda 17:00'yi bekleyen ret bildirimleri; kararlar o zamana kadar değişebilir. */
  plannedRejections: Record<string, RejectTemplate>;
  /** 1. günün portal tanıtımı, oyun başına bir kez yapılır. */
  orientationDone: boolean;
  /** Hafta boyunca insanlara nasıl hayır dediğin. */
  rejectionStats: Record<RejectTemplate, number>;
  /** Aynısı, yalnızca bugün için (gün sonu raporu). */
  rejectionToday: Record<RejectTemplate, number>;
  /** Çarşamba'nın ekip toplantısı, görüntülü görüşme olarak yapılır. */
  meeting: { state: 'pending' | 'active' | 'done'; choice: MeetingChoice };
  /** Hakan Bey her ret için yazılı gerekçe istiyor: her biri birkaç dakikaya mal olur. */
  justifyRejects: boolean;
  /** Ona karşı çıktıktan sonra: seni bu sabah odasına ne zaman çağırdığı. */
  reviewAt: number | null;
  /** Gönderdiğin ve Hakan Bey'in aramasıyla geri alınan iki davet: kimler ve nasıl yazdığın. */
  revoked: { ids: string[]; honest: boolean | null } | null;
  /** Hâlâ yazman gereken geri çekme e-postası (e-posta uygulamasında açılır). */
  revokeDraft: string[] | null;
  /** 0–1 kaydırıcı değerleri, kalıcı. */
  musicVolume: number;
  sfxVolume: number;

  selectedJobId: string | null;

  /** Yeni bir hafta; `replaySeed` ile o tohumun haftasının aynısı (aynı dosyalar, aynı aramalar). */
  startGame: (replaySeed?: number) => void;
  /** Haftayı bu tarayıcının son kontrol noktasından (bir günün başı) devralır. */
  continueGame: () => void;
  publishJob: (jobId: string) => void;
  proceedToBriefing: () => void;
  beginDay: () => void;
  selectCandidate: (id: string) => void;
  tick: () => void;
  skipBreak: () => void;
  decide: (decision: Decision) => void;
  /** O an açık adaydaki kararı geri alır. */
  undoDecision: () => void;
  /** Son gün: kurula bir finalist öner; mülakatta belirlenenler (maaş, gerekçen) onunla gider. */
  hire: (id: string, panel?: PanelInput) => void;
  /** Cuma: bir adayla maaş konuşmasının puanlarına yaptığı. */
  settleSalary: (id: string, move: SalaryMove) => void;
  answerRequest: (requestId: string, answer: 'comply' | 'refuse') => void;
  /** Anne / ofis mesajına isteğe bağlı hızlı cevap. */
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
  /** Geri çekme e-postasını gönder: yalan söyleyerek ("sehven gönderildi") ya da olanı söyleyerek. */
  sendRevoke: (honest: boolean) => void;
  setDifficulty: (d: Difficulty) => void;
  recordAiUse: () => void;
  setWeekendChoice: (choice: string) => void;
  answerCandidateDm: (candidateId: string, kind: DmKind) => void;
  /** Cuma 18:40: Hakan Bey'in teklifine cevabın ve bundan ne çıktığı. */
  settleOffer: (result: OfferResult) => void;
  finishOffer: () => void;
  finishWeekend: () => void;
  setMusicVolume: (value: number) => void;
  setSfxVolume: (value: number) => void;
  /** Çalan sabit hattın ahizesini kaldır. */
  pickUpCall: () => void;
  /** Söyleyeceğini söyle ve kapat. */
  answerCall: (choice: number) => void;
  /** Bir yudum kahve ve bir düşünce; ya da kupa boşsa mutfağa bir yürüyüş (birkaç dakika). */
  drinkCoffee: () => string;
  /** Perşembe akşamı ekibin pizzasından bir dilim. Düşünceyi döndürür. */
  eatPizza: () => string;
  waterFlower: () => void;
  clearDeskNotice: () => void;
  clearDeskItem: (id: string) => void;
  readMail: (id: string) => void;
  /** Reddine cevap veren bir adaya yaz (rejectionMails.ts: REPLY_BACK). */
  answerCandidateMail: (mailId: string, kind: ReplyBack) => void;
  /** Bir adayın eski işverenini ara. Hat meşgulse ya da aranacak kimse yoksa false. */
  callReference: (candidateId: string) => boolean;
  /** Cuma: hiçbir mülakatçının sormaması gereken bir soru sor. */
  askForbidden: () => void;
  /** Hakan Bey mülakatın ortasında listesinden bir soru sorar: araya gir ya da öyle kalsın. */
  hakanInterrupt: (protect: boolean) => void;
  /** Aday sana bir şey sorar: düz gerçek ya da broşür. */
  answerCandidate: (honest: boolean) => void;
  /** Çarşamba toplantısından, söylediğini söylemiş olarak ayrıl. */
  finishMeeting: (choice: Exclude<MeetingChoice, null>) => void;
  /** Bildirimleri 17:00 için giden kutusuna koy (saat geçtiyse hemen). */
  planRejectionMails: (choices: Record<string, RejectTemplate>) => void;
  /** Sebilde bir bardak su, meşhur yan hak. Düşünceyi döndürür. */
  visitCooler: () => string;
}

export interface InterviewStance {
  protected: number;
  silent: number;
  honest: number;
  polished: number;
}
