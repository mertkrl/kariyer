/*
 * Oyun durumunun biçimi: store'un tuttukları ve sunduğu eylemler. Burada hafta boyu kullanılan
 * kayıt tipleri ve GameState'in kendisi durur; alanlar stateParts.ts'te, eylemler actions.ts'te.
 * Yalnızca tipler; davranış store.ts ve slices/ altında yaşar.
 */
import type { Decision, EventKind } from '../types';
import type { ReformKind } from '../day/desk';
import type { OfferResult } from '../events/offer';
import type { MailState, PhoneState, PortalState, SettingsState, ShiftState, WeekState } from './stateParts';
import type { DayActions, DecisionActions, DeskActions, FlowActions, PhoneActions, SettingsActions, StoryActions } from './actions';

export type * from './stateParts';
export type * from './actions';

export interface Finalist {
  id: string;
  /** Adayın ilerletildiği gün (1'den başlar). */
  day: number;
  /** Listeye sen değil Hakan Bey koydu. */
  byManager?: boolean;
  /** Bir iş arkadaşının kendi kısa listesinden getirdiği. */
  by?: 'ayse' | 'emre';
  /** Senin çağırdığın ama Cuma'nın iş bölümünde bir meslektaşına devrettiğin aday. */
  handedOver?: boolean;
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

/** Bütün oyun durumu ve eylemleri: parçaları stateParts.ts ve actions.ts'te. */
export interface GameState
  extends WeekState,
    ShiftState,
    PortalState,
    PhoneState,
    MailState,
    SettingsState,
    FlowActions,
    DayActions,
    DecisionActions,
    DeskActions,
    PhoneActions,
    SettingsActions,
    StoryActions {}

export interface InterviewStance {
  protected: number;
  silent: number;
  honest: number;
  polished: number;
}
