/*
 * The Friday interview's fixed parts: who is in the room besides you, what the team lead makes
 * of people, the question budget and the codes each kind of question is logged under, the lines
 * of the salary talk, and the shape of the interview log. The screen (FinalRoundScreen) and its
 * pieces in this folder share them.
 */
import type { Finalist } from '../../game/store';
import { NEPHEW_ID } from '../../game/data/candidates';
import type { SalaryMove } from '../../game/interview';

/** When nobody was advanced all week, management fills the final with its internal reference. */
export const FALLBACK: Finalist[] = [{ id: NEPHEW_ID, day: 0 }];
/** How many people one interview day holds; a longer list is cut down in the morning. */
export const INTERVIEW_LIMIT = 6;

/** The rest of the team screened too: their shortlists sit in the same room on Friday. */
export const COLLEAGUES: Finalist[] = [
  { id: 'nehir', day: 0, by: 'ayse' },
  { id: 'berk', day: 0, by: 'ayse' },
  { id: 'cagan', day: 0, by: 'emre' },
  { id: 'sarp', day: 0, by: 'emre' },
];

/*
 * The hiring manager sits in too: Ümit, the software team lead. He listens to the answers,
 * not the flags, and says what he thinks after each interview. The hire is a panel decision —
 * you recommend, he and Hakan Bey sign (or object on the record).
 */
export const LEAD = 'Ümit Arslan';
export const LEAD_SPECIAL: Record<string, string> = {
  emre: 'Teknik olarak açık ara en iyisi. Ama ekibi "gereksiz" bulduğunu bana da söyledi; ekibim onunla çalışmak istemez.',
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
/** Does the team lead back this hire? Strong and not toxic: yes. */
export const leadBacks = (id: string, fit: number) => fit >= 4 && !LEAD_SPECIAL[id];

/** What Hakan Bey says into your ear, once, after your first own question. */
export const WHISPER = 'Hakan Bey kulağına eğiliyor: "Listedeki soruları da sor. Aile planı, memleket, emeklilik… Uzun vadeli uyum önemli."';

/** Each interview slot is short: only this many of the questions fit. */
export const QUESTION_BUDGET = 2;
/** Index used for the question from Hakan Bey's list (after the three standard ones). */
export const FORBIDDEN = 3;
export const TYPING_MS_PER_CHAR = 16;
export const THINKING_MS = 900;

/** Follow-ups are stored as FOLLOW + the kind of probe (interview.ts: HookKind). */
export const FOLLOW = 10;
/** The short coding case: one of the two questions. */
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

/** One beat of an interview, in the order it happened. */
export type Entry =
  | { kind: 'q'; q: number; by?: 'hakan'; about?: string }
  | { kind: 'salary'; move: SalaryMove | null }
  | { kind: 'note'; text: string }
  | { kind: 'hakan'; choice: 'protect' | 'silent' | null }
  | { kind: 'back'; choice: 'honest' | 'polished' | null };

export interface Typing {
  candidateId: string;
  /** Index of the entry whose answer is being typed. */
  entry: number;
  /** Characters revealed so far; -1 while the candidate is still "thinking". */
  shown: number;
}
