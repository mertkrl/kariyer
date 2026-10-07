/*
 * Bir mülakat odasının kuralları, ekrandan ve zamanlayıcılardan bağımsız: kayıttan (Entry[])
 * odanın şu anki durumu çıkarılır, her eylem kaydı yeni bir kayda çevirir. useInterview bunları
 * React durumuna bağlar; testler doğrudan bunları çalıştırır.
 */
import type { SalaryMove } from '../../game/events/interview';
import { CASE, FOLLOW, FORBIDDEN, QUESTION_BUDGET, TEST, type Entry } from './interviewModel';

type Question = Extract<Entry, { kind: 'q' }>;
type Salary = Extract<Entry, { kind: 'salary' }>;
type Back = Extract<Entry, { kind: 'back' }>;

export interface RoomState {
  questions: Question[];
  /** Senin sorduğun klasik sorular (hakkından düşenler). */
  mine: number[];
  followUsed: boolean;
  /** Test puanı soruldu. */
  testUsed: boolean;
  handedOff: boolean;
  salaryEntry: Salary | undefined;
  salaryPending: boolean;
  salaryDone: boolean;
  backPending: Back | null;
  /** Maaş konuşuldu ve adayın bütün soruları cevaplandı: görüşme kapatılabilir. */
  backsDone: boolean;
  ended: boolean;
}

/** Kayıttan odanın durumu. `backs`: adayın sonda soracağı soru sayısı. */
export function roomState(entries: Entry[], backs: number): RoomState {
  const questions = entries.filter((e): e is Question => e.kind === 'q');
  const salaryEntry = entries.find((e): e is Salary => e.kind === 'salary');
  const salaryDone = salaryEntry?.move != null;
  const backEntries = entries.filter((e): e is Back => e.kind === 'back');
  const backPending = backEntries.find((e) => e.choice === null) ?? null;
  return {
    questions,
    // takip sorusu, Ümit'in ve Hakan Bey'in soruları hakkından düşmez
    mine: questions.filter((e) => !e.by && e.q < FOLLOW).map((e) => e.q),
    followUsed: questions.some((e) => e.q >= FOLLOW && e.q < CASE),
    testUsed: questions.some((e) => e.q === TEST),
    handedOff: entries.some((e) => e.kind === 'handoff'),
    salaryEntry,
    salaryPending: salaryEntry !== undefined && salaryEntry.move === null,
    salaryDone,
    backPending,
    backsDone: salaryDone && !backPending && backEntries.length >= backs,
    ended: entries.some((e) => e.kind === 'end'),
  };
}

export const isFollowUp = (question: number) => question >= FOLLOW && question < CASE;

/** Takip sorusu hakkı hâlâ duruyor mu (birisi yazarken sorulmaz). */
export const canFollowUp = (room: RoomState, typing: boolean) => !room.followUsed && !typing && !room.handedOff && !room.ended;

/** Bu soru şimdi sorulabilir mi: sıra sende, hak ve tekrar kuralları. */
export function canAsk(room: RoomState, question: number, typing: boolean): boolean {
  if (typing || room.handedOff || room.ended) return false;
  if (isFollowUp(question)) return canFollowUp(room, typing);
  if (question === TEST) return !room.testUsed;
  return !room.questions.some((e) => e.q === question) && room.mine.length < QUESTION_BUDGET;
}

/** Söz Ümit'e geçerken sırayla sorulacaklar: teknik soru, sonra (yapılandırılmış değilse) Hakan Bey. */
export function handOffQuestions(structured: boolean): Question[] {
  return structured ? [{ kind: 'q', q: CASE, by: 'levent' }] : [{ kind: 'q', q: CASE, by: 'levent' }, { kind: 'q', q: FORBIDDEN, by: 'hakan' }];
}

/** Maaş konuşması sonuçlanır; adayın sorusu varsa ilki sıraya girer. */
export function settleSalaryIn(entries: Entry[], move: SalaryMove, backs: number): Entry[] {
  const settled = entries.map((e): Entry => (e.kind === 'salary' && e.move === null ? { kind: 'salary', move } : e));
  return backs > 0 ? [...settled, { kind: 'back', n: 0, choice: null }] : settled;
}

/** Adayın bekleyen sorusu cevaplanır; başka sorusu varsa sıradaki gelir. */
export function answerBackIn(entries: Entry[], honest: boolean, backs: number): Entry[] {
  const pending = entries.find((e): e is Back => e.kind === 'back' && e.choice === null);
  if (!pending) return entries;
  const answered = entries.map((e): Entry => (e === pending ? { ...pending, choice: honest ? 'honest' : 'polished' } : e));
  return pending.n + 1 < backs ? [...answered, { kind: 'back', n: pending.n + 1, choice: null }] : answered;
}
