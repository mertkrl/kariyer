/*
 * Telefonlara gelenlerin biçimleri: mesajlar, hızlı cevaplar, müdürün ricaları ve bunlara
 * dönüşen senaryolu satırlar.
 */
import type { Decision } from '../types';

/** Telefondaki sohbetler: müdür, annen ve ofis grubu. */
export type ThreadId = 'manager' | 'mom' | 'office' | 'ayse' | 'birthday';

/** Grup sohbetleri: sessize alınabilir. */
export const GROUP_THREADS: ThreadId[] = ['office', 'birthday'];

export interface PhoneMessage {
  id: number;
  thread: ThreadId;
  /** Geldiği mesai dakikası. */
  at: number;
  /** Geldiği günün sırası (sohbetler bütün haftayı tutar). */
  day?: number;
  from: 'them' | 'me';
  /** Grup sohbetleri: kimin yazdığı. */
  sender?: string;
  text: string;
  requestId?: string;
  /** İsteğe bağlı hızlı cevaplar (anne / ofis). Cevap vermek sana kalmış. */
  replies?: QuickReply[];
  answered?: boolean;
  /** An geçti: sohbet ilerledi ve şimdi verilecek bir cevabın anlamı kalmadı. */
  expired?: boolean;
  /** Sohbette önce bu cevaplanır; bkz. Ambient.first. */
  first?: boolean;
}

export interface QuickReply {
  text: string;
  /** Geri gelen ve kimden geldiği (grup sohbetleri). */
  reaction: string;
  reactionSender?: string;
  /** Bazı cevaplar (müdüre) taraf tutmak sayılır. */
  stance?: 'comply' | 'refuse';
  /** "CV'sini göndersin": komşunun oğlu Perşembe başvurur. */
  neighbourCv?: boolean;
  /** Bunu söylemenin sana etkisi. */
  performans?: number;
  vicdan?: number;
  /** Bazı şeyler grupta söylenemez: cevap sonra, özelden gelir. */
  aside?: { thread: 'ayse' | 'mom'; after: number; text: string };
  /** Evet demek bugünün takvimine zaman alan bir şey koyar (doğum günü pastası). */
  event?: { at: number; minutes: number; text: string };
}

export interface ManagerRequest {
  id: string;
  candidateId: string;
  want: Decision;
  answer: 'comply' | 'refuse' | null;
  /** Hangi rica şablonunu kullandığı (telefon aramasının sözleri için). */
  template?: number;
}

/**
 * Gönderilmeyi bekleyen bir mesaj. Sözleri teslim anında seçilir; böylece müdürle ilişkinin o
 * ana kadar nasıl geliştiğini yansıtır.
 */
export interface ScheduledMessage {
  at: number;
  kind: 'greeting' | 'lunch' | 'openFiles' | 'request' | 'ambient' | 'reprimand';
  dayIndex: number;
  grievances?: Grievance[];
  request?: Omit<ManagerRequest, 'answer' | 'template'> & { template: number };
  /** İlk seferde açmadığın için yeniden yaptığı bir rica araması. */
  retry?: boolean;
  /** Ortam sohbeti (anne / ofis grubu). */
  ambient?: { thread: Exclude<ThreadId, 'manager'>; sender?: string; text: string; replies?: QuickReply[]; closes?: boolean; first?: boolean };
}

/**
 * İlişkinin ne kadar bozulduğu: 0 dostça · 1 mesafeli · 2 soğuk/resmî · 3 düşmanca.
 * Her ret onu bir adım ileri iter.
 */
export type ManagerTone = 0 | 1 | 2 | 3;

export interface RequestTemplate {
  ids: string[];
  want: Decision;
  text: (name: string) => string;
}

/** Gelen kutusunun dışındaki hayat: telefonu birinin telefonu gibi hissettiren mesajlar. */
/** `closes`: biri konuyu kapatır; sohbetin açık cevapları da onunla birlikte gider. */
export type FollowUp = { after: number; sender: string; text: string; closes?: boolean };

/** Sohbette bir satır. Grup satırları devamını taşır: birbirine cevap veren iş arkadaşları, kimi hemen, kimi çok sonra. */
/** `first`: sohbette önce bu cevaplanır (ilk günün karşılaması); süresi dolmaz, cevaplanana kadar diğerlerine cevap verilemez. */
export type Ambient = { at: number; thread: 'mom' | 'office' | 'ayse' | 'birthday'; sender?: string; text: string; replies?: QuickReply[]; followUps?: FollowUp[]; first?: boolean };

/** Müdürün dün istediği ve yapılmayan bir rica. */
export interface Grievance {
  name: string;
  want: Decision;
  /** "Yaparım" diye cevap vermiştin. */
  promised: boolean;
}
