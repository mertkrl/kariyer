/*
 * Oyun durumunun parçaları, alan alan. GameState (storeTypes.ts) bunların birleşimidir; her dilim
 * yalnızca kendi parçasıyla ilgilenir.
 */
import type { Decision, DayStats, Difficulty, GamePhase } from '../types';
import type { Mail } from '../day/mail';
import type { ReferenceVerdict } from '../day/references';
import type { ManagerRequest, PhoneMessage, ScheduledMessage, Grievance, ThreadId } from '../day/manager';
import type { MeetingChoice, WeekEntry } from '../day/echoes';
import type { RejectTemplate } from '../day/rejectionMails';
import type { ActiveEvent, DayEvent, DecisionLogEntry, DeskState, DmKind, Finalist, InterviewStance, StoryState, WeekLog } from './storeTypes';

/** Haftanın kendisi: aşama, gün, puanlar, kadro ve hafta boyu süren kayıtlar. */
export interface WeekState {
  phase: GamePhase;
  currentDayIndex: number;
  performans: number;
  vicdan: number;
  difficulty: Difficulty;
  /** Bu oyunun zar atışı: sana kim yazıyor ve hangi ruh hâlinde. */
  seed: number;
  selectedJobId: string | null;
  /** Önceki günlerde final turuna ilerletilen adaylar. */
  finalists: Finalist[];
  /** Son gün işe alınan tek kişi. */
  hiredId: string | null;
  /** Cuma öne sürdüğün kişi (kurul başka birini seçmiş olabilir). */
  recommendedId: string | null;
  /** Bu oyunun gün gün aday kuyruğu. */
  lineups: string[][];
  dayStats: DayStats;
  totalStats: DayStats;
  week: WeekLog;
  /** Haftanın her kararı, gün gün: hafta içindeki yankılar bundan kurulur. */
  weekLog: WeekEntry[];
  /** Gün başladığındaki puanlar (akşam raporu günün onlara ne yaptığını gösterir). */
  dayStart: { performans: number; vicdan: number };
  story: StoryState;
  /** Cuma gecesi annene ne dediğin. */
  weekendChoice: string | null;
  /** Yapay zekâ analizinin kaç kez istendiği, bütün hafta. */
  aiUses: number;
  /** Performans çok düştü: bugün bir mülakat hakkı eksik. */
  quotaCut: boolean;
  /** 1. günün portal tanıtımı, oyun başına bir kez yapılır. */
  orientationDone: boolean;
  /** Çarşamba'nın ekip toplantısı, görüntülü görüşme olarak yapılır. */
  meeting: { state: 'pending' | 'active' | 'done'; choice: MeetingChoice };
  /** Cuma: Hakan Bey'in araya girmesini ve adayların kendi sorularını nasıl karşıladığın. */
  interviewStance: InterviewStance;
  /** Cuma sorduğun, hiçbir mülakatçının sormaması gereken sorular. */
  forbiddenAsked: number;
  desk: DeskState;
}

/** Mesai saati ve günün akışı: öğle arası, fazla mesai, zor mod olayları. */
export interface ShiftState {
  workdayMinutes: number;
  /** 13:00'ten önce masana döndün: saatin geri kalanı yine mesai. */
  breakOver: boolean;
  /** 17:00 geçti ve hâlâ açık dosya var: 20:00'ye kadar kalırsın. */
  overtime: boolean;
  /** Bugünün bir saat önceki uyarısı (16:00) gösterildi. */
  overtimeWarned: boolean;
  /** Kuyruğu erken kapattıktan sonra Hakan Bey'in eklediği dosyalar, gün sırasına göre. */
  extraFiles: Record<number, string[]>;
  /** Zor mod: bugünün sürprizleri ve şu an olanı. */
  dayEvents: DayEvent[];
  activeEvent: ActiveEvent | null;
  paused: boolean;
  /** Saat, portalda "Mesaiye başla"ya basana kadar bekler. */
  shiftStarted: boolean;
  /** Bu sabah masana neden geç oturduğun; bildirim olarak değil, mesai kartında söylenir. */
  lateReason: string | null;
  /** Hakan Bey her ret için yazılı gerekçe istiyor: her biri birkaç dakikaya mal olur. */
  justifyRejects: boolean;
  /** Ona karşı çıktıktan sonra: seni bu sabah odasına ne zaman çağırdığı. */
  reviewAt: number | null;
}

/** İşe Alım Portalı: açılan dosyalar, kararlar ve okuma süreleri. */
export interface PortalState {
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
  /** Bugünün her kararının puanlara yaptığı (tam olarak geri alabilmek için). */
  /** Bugünün her kararının puanlara yaptığı (uygulandığı hâliyle, geri alma tam geri yüklesin diye) ve nedeni. */
  decisionEffects: Record<string, { performans: number; vicdan: number; reason?: string }>;
  /** Yaptığın referans aramalarının ortaya çıkardıkları, adaya göre. */
  referenceChecks: Record<string, ReferenceVerdict>;
  /** Gönderdiğin ve Hakan Bey'in aramasıyla geri alınan iki davet: kimler ve nasıl yazdığın. */
  revoked: { ids: string[]; honest: boolean | null } | null;
  /** Hâlâ yazman gereken geri çekme e-postası (e-posta uygulamasında açılır). */
  revokeDraft: string[] | null;
}

/** Telefonlar: mesajlar, Hakan Bey'in ricaları ve onunla ilişki, Kariyergram mesajları. */
export interface PhoneState {
  /** Müdürün masa telefonuna gelen mesajları. */
  phone: PhoneMessage[];
  phoneUnread: Record<ThreadId, number>;
  managerRequests: ManagerRequest[];
  managerScript: ScheduledMessage[];
  /** Müdürün ricalarının nasıl gittiğinin gün sonu özeti. */
  managerVerdict: string[];
  /** Müdüre nasıl cevap verdiğinin bütün haftalık kaydı: iki tarafın tonunu da belirler. */
  managerStance: { refusals: number; complies: number };
  /** Hakan Bey'le ilişki, oyuncudan gizli (bkz. manager.ts RAPPORT). */
  hakanRapport: number;
  /** Müdürün zaten dürttüğü mesaj kimlikleri (her birine bir dürtme). */
  managerNudged: number[];
  /** Annenin haftalık konuları (oyun başına bir kez karışır; günde iki, hiç tekrar yok). */
  momOrder: number[];
  /** Dünün yapılmayan ricaları: müdür ertesi sabah açar. */
  managerGrievances: Grievance[];
  /** Sıradaki telefon mesajının alacağı kimlik. */
  messageSeq: number;
  /** Sabit hattın bugün en son çaldığı ya da kullanıldığı mesai dakikası (null: henüz değil). */
  lastLandlineAt: number | null;
  /** Sessize aldığın grup sohbetleri: yine gelirler, yalnızca açılmazlar. */
  mutedThreads: ThreadId[];
  /** Bu sohbette biri sana cevap yazıyor. */
  typingThread: ThreadId | null;
  /** Kariyergram'dan sana yazan reddedilmiş adaylara nasıl cevap verdiğin. */
  dmHandled: Record<string, DmKind>;
}

/** E-posta ve ret bildirimleri. */
export interface MailState {
  /** Açtığın e-postalar (bütün hafta). */
  mailRead: string[];
  /** Bu oyun için yazılmış e-postalar (Hakan Bey'in ertesi sabah notları). */
  extraMails: Mail[];
  /** Bugünün ret e-postaları: gidene kadar (ya da göndermemeyi seçene kadar) gün kapanmaz. */
  rejectionMailsSent: boolean;
  /** Bugün yazılıp giden kutusunda 17:00'yi bekleyen ret bildirimleri; kararlar o zamana kadar değişebilir. */
  plannedRejections: Record<string, RejectTemplate>;
  /** Hafta boyunca insanlara nasıl hayır dediğin. */
  rejectionStats: Record<RejectTemplate, number>;
  /** Aynısı, yalnızca bugün için (gün sonu raporu). */
  rejectionToday: Record<RejectTemplate, number>;
}

/** Ses ayarları. */
export interface SettingsState {
  muted: boolean;
  /** 0–1 kaydırıcı değerleri, kalıcı. */
  musicVolume: number;
  sfxVolume: number;
}
