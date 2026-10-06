/*
 * Cuma mülakatının sabit parçaları: odada senden başka kimlerin olduğu, ekip liderinin insanlar
 * hakkında ne düşündüğü, soru hakkı ve her soru türünün kaydedildiği kodlar, maaş konuşmasının
 * cümleleri ve mülakat kaydının biçimi. Ekran (FinalRoundScreen) ve bu klasördeki parçaları
 * bunları paylaşır.
 */
import type { Finalist } from '../../game/store';
import { NEPHEW_ID } from '../../game/data/candidates';
import type { SalaryMove } from '../../game/interview';

/** Bütün hafta kimse ilerletilmediyse yönetim finali kendi iç referansıyla doldurur. */
export const FALLBACK: Finalist[] = [{ id: NEPHEW_ID, day: 0 }];
/** Bir mülakat gününün kaç kişi aldığı; daha uzun bir liste sabah kısaltılır. */
export const INTERVIEW_LIMIT = 6;

/** Ekibin geri kalanı da eleme yaptı: kısa listeleri Cuma aynı odada oturur. */
export const COLLEAGUES: Finalist[] = [
  { id: 'nehir', day: 0, by: 'ayse' },
  { id: 'berk', day: 0, by: 'ayse' },
  { id: 'cagan', day: 0, by: 'emre' },
  { id: 'sarp', day: 0, by: 'emre' },
];

/*
 * İşe alımı yapacak yönetici de odada: yazılım ekip lideri Ümit. İşaretlere değil cevaplara
 * kulak verir ve her mülakattan sonra ne düşündüğünü söyler. İşe alım bir kurul kararıdır: sen
 * önerirsin, o ve Hakan Bey imzalar (ya da kayda geçecek şekilde itiraz eder).
 */
export const LEAD = 'Ümit Arslan';
export const LEAD_SPECIAL: Record<string, string> = {
  ozan: 'Teknik olarak açık ara en iyisi. Ama ekibi "gereksiz" bulduğunu bana da söyledi; ekibim onunla çalışmak istemez.',
  okan: 'Temel sorulara cevap veremedi. Kimin yakını olduğu umurumda değil; ekipte yeri yok.',
  volkan: 'Çok iyi konuşuyor ama tek bir rakam, tek bir somut örnek vermedi. Referanslarını aramadan ben ikna olmadım.',
};
export function leadView(id: string, fit: number) {
  if (LEAD_SPECIAL[id]) return LEAD_SPECIAL[id];
  if (fit >= 5) return 'Cevapları somut ve ölçülebilir. Teknik olarak ekibin en güçlüsü olabilir.';
  if (fit === 4) return 'Sağlam. İlk aylarda biraz destek ister ama işini bildiği belli.';
  if (fit === 3) return 'Potansiyeli var ama henüz hazır değil; yanına bir mentor vermemiz gerekir.';
  return 'Somut hiçbir şey anlatmadı. Bu cevaplarla ben ikna olmadım.';
}
/** Ekip lideri bu işe alımı destekler mi? Güçlü ve toksik değilse: evet. */
export const leadBacks = (id: string, fit: number) => fit >= 4 && !LEAD_SPECIAL[id];

/** Hakan Bey'in, senin ilk kendi sorundan sonra bir kez kulağına söylediği. */
export const WHISPER = 'Hakan Bey kulağına eğiliyor: "Listedeki soruları da sor. Aile planı, memleket, emeklilik… Uzun vadeli uyum önemli."';

/** Her mülakat aralığı kısa: soruların yalnızca bu kadarı sığar. */
export const QUESTION_BUDGET = 2;
/** Hakan Bey'in listesinden gelen soru için kullanılan sıra (üç standart sorudan sonra). */
export const FORBIDDEN = 3;
export const TYPING_MS_PER_CHAR = 16;
export const THINKING_MS = 900;

/** Takip soruları FOLLOW + yoklama türü olarak saklanır (interview.ts: HookKind). */
export const FOLLOW = 10;
/** Kısa kodlama vakası: iki sorudan biri. */
export const CASE = 20;
export const SALARY_LINES: Record<SalaryMove, (offer: number) => string> = {
  match: () => 'Beklentiniz bütçemize uygun; bu rakamla ilerleyebiliriz.',
  pass: () => 'Beklentinizi olduğu gibi Hakan Bey\'e ileteceğim.',
  cap: (o) => `Bu pozisyon için bütçemiz ${o.toLocaleString('tr-TR')} TL. Bu rakama inebilir misiniz?`,
  low: (o) => `Size ${o.toLocaleString('tr-TR')} TL teklif edebiliriz.`,
  squeeze: (o) => `Biraz aşağı çekebilir miyiz? ${o.toLocaleString('tr-TR')} TL ile başlasak?`,
};
export const SALARY_LABEL: Record<SalaryMove, string> = {
  match: 'Beklentiyi kabul et',
  pass: 'Olduğu gibi Hakan Bey\'e ilet',
  cap: 'Bütçe tavanını teklif et',
  low: 'Daha düşük teklif et',
  squeeze: 'Biraz aşağı çekmeyi dene',
};

/** Bir mülakatın tek bir anı, olduğu sırayla. */
export type Entry =
  | { kind: 'q'; q: number; by?: 'hakan'; about?: string }
  | { kind: 'salary'; move: SalaryMove | null }
  | { kind: 'note'; text: string }
  | { kind: 'hakan'; choice: 'protect' | 'silent' | null }
  | { kind: 'back'; choice: 'honest' | 'polished' | null };

export interface Typing {
  candidateId: string;
  /** Cevabı yazılmakta olan kaydın sırası. */
  entry: number;
  /** Şimdiye kadar gösterilen karakter sayısı; aday hâlâ "düşünürken" -1. */
  shown: number;
}
