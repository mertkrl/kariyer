import type { AptitudeAnswer } from '../events/aptitude';
/*
 * Store'un sunduğu eylemler, onları uygulayan dilime göre gruplanmış. GameState (storeTypes.ts)
 * bunların birleşimidir.
 */
import type { Decision, Difficulty } from '../types';
import type { OfferResult } from '../events/offer';
import type { ThreadId } from '../day/manager';
import type { MeetingChoice } from '../day/echoes';
import type { RejectTemplate, ReplyBack } from '../day/rejectionMails';
import type { PanelInput } from '../day/managerCalls';
import type { SalaryMove } from '../events/interview';
import type { DmKind } from './storeTypes';

/** Oyunun akışı: hafta başlatmak, sürdürmek, ekranlar arası geçiş (store.ts). */
export interface FlowActions {
  /** Yeni bir hafta; `replaySeed` ile o tohumun haftasının aynısı (aynı dosyalar, aynı aramalar). */
  startGame: (replaySeed?: number) => void;
  /** Haftayı bu tarayıcının son kontrol noktasından (bir günün başı) devralır. */
  continueGame: () => void;
  publishJob: (jobId: string) => void;
  proceedToBriefing: () => void;
  restart: () => void;
  togglePause: () => void;
  startShift: () => void;
  finishOrientation: () => void;
}

/** Gün: sabah, saat, akşam (slices/daySlice.ts). */
export interface DayActions {
  beginDay: () => void;
  tick: () => void;
  skipBreak: () => void;
  finishDay: () => void;
  nextDay: () => void;
}

/** Dosyalar ve kararlar (slices/decisionSlice.ts). */
export interface DecisionActions {
  selectCandidate: (id: string) => void;
  decide: (decision: Decision) => void;
  /** O an açık adaydaki kararı geri alır. */
  undoDecision: () => void;
  setReading: (reading: boolean) => void;
  markReadThrough: (id: string) => void;
}

/** Masa: sabit hat, kahve, çiçek, referans aramaları (slices/deskSlice.ts). */
export interface DeskActions {
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
  /** Bir adayın eski işverenini ara. Hat meşgulse ya da aranacak kimse yoksa false. */
  callReference: (candidateId: string) => boolean;
  /** Sebilde bir bardak su, meşhur yan hak. Düşünceyi döndürür. */
  visitCooler: () => string;
  /** Geri çekme e-postasını gönder: yalan söyleyerek ("sehven gönderildi") ya da olanı söyleyerek. */
  sendRevoke: (honest: boolean) => void;
}

/** Cep telefonu (slices/phoneSlice.ts). */
export interface PhoneActions {
  toggleMuteThread: (thread: ThreadId) => void;
  /** Anne / ofis mesajına isteğe bağlı hızlı cevap. */
  answerMessage: (messageId: number, replyIndex: number) => void;
  answerRequest: (requestId: string, answer: 'comply' | 'refuse') => void;
  markPhoneRead: (thread: ThreadId) => void;
}

/** Ayarlar (slices/settingsSlice.ts). */
export interface SettingsActions {
  setMusicVolume: (value: number) => void;
  setSfxVolume: (value: number) => void;
  toggleMute: () => void;
}

/** Hikâye: toplantı, mülakat, teklif, hafta sonu, e-postalar (slices/storySlice.ts). */
export interface StoryActions {
  /** Cuma: hiçbir mülakatçının sormaması gereken bir soru sor. */
  askForbidden: () => void;
  /** Cuma 18:40: Hakan Bey'in teklifine cevabın ve bundan ne çıktığı. */
  settleOffer: (result: OfferResult) => void;
  finishOffer: () => void;
  answerCandidateDm: (candidateId: string, kind: DmKind) => void;
  finishWeekend: () => void;
  setWeekendChoice: (choice: string) => void;
  /** Hakan Bey mülakatın ortasında listesinden bir soru sorar: araya gir ya da öyle kalsın. */
  hakanInterrupt: (protect: boolean) => void;
  /** Aday sana bir şey sorar: düz gerçek ya da broşür. */
  answerCandidate: (honest: boolean) => void;
  /** Son gün: kurula bir finalist öner; mülakatta belirlenenler (maaş, gerekçen) onunla gider. */
  hire: (id: string, panel?: PanelInput) => void;
  /** Çarşamba toplantısından, söylediğini söylemiş olarak ayrıl. */
  finishMeeting: (choice: Exclude<MeetingChoice, null>) => void;
  /** Bildirimleri 17:00 için giden kutusuna koy (saat geçtiyse hemen). */
  planRejectionMails: (choices: Record<string, RejectTemplate>) => void;
  readMail: (id: string) => void;
  /** Değerlendirme uygulamasında testi kendin çözdün (her soru için seçilen şık ya da süre dolduysa null). */
  finishAptitude: (answers: AptitudeAnswer[]) => void;
  /** Kendin çözerken geçen bir soru: mesaiden düşer. */
  aptitudeStep: () => void;
  /** Reddine cevap veren bir adaya yaz (rejectionMails.ts: REPLY_BACK). */
  answerCandidateMail: (mailId: string, kind: ReplyBack) => void;
  /** Cuma: bir adayla maaş konuşmasının puanlarına yaptığı. */
  settleSalary: (id: string, move: SalaryMove) => void;
  recordAiUse: () => void;
  setDifficulty: (d: Difficulty) => void;
}
