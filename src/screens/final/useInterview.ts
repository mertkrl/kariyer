import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../game/store/store';
import { forbiddenAnswer } from '../../game/day/story';
import { candidateOf } from '../../game/data/candidates';
import { candidateDetails } from '../../game/data/candidateDetails';
import { backQuestionsFor, experienceYears, followUpAnswer } from '../../game/data/interviewExtras';
import { average, caseAnswer, caseFor, salaryTalk, type SalaryMove, type Scores } from '../../game/events/interview';
import { testTalk } from '../../game/events/aptitude';
import { audioEngine } from '../../audio/audioEngine';
import { CASE, FOLLOW, FORBIDDEN, TEST, THINKING_MS, TYPING_MS_PER_CHAR, type Entry, type Typing } from './interviewModel';
import { answerBackIn, canAsk, canFollowUp, handOffQuestions, roomState, settleSalaryIn } from './interviewRoom';

/*
 * Cuma'nın bütün görüşmeleri: her adayın kaydı, canlı yazılan cevap, notlar, puanlar ve anlaşılan
 * maaşlar. Kurallar interviewRoom.ts'te; bu hook onları React durumuna ve zamanlayıcılara bağlar.
 * Ekran yalnızca seçili adayı ve kendi adaylarının listesini verir.
 */
export function useInterview({ selectedId, ownIds, structured }: { selectedId: string; ownIds: string[]; structured: boolean }) {
  const settleSalary = useGameStore((s) => s.settleSalary);
  const answerCandidate = useGameStore((s) => s.answerCandidate);
  const seed = useGameStore((s) => s.seed);
  const [log, setLog] = useState<Record<string, Entry[]>>({});
  const [typing, setTyping] = useState<Typing | null>(null);
  const [scores, setScores] = useState<Record<string, Scores>>({});
  const [agreed, setAgreed] = useState<Record<string, number | null>>({});
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearInterval(timer.current);
    },
    [],
  );

  const candidate = candidateOf(selectedId);
  const entries = log[selectedId] ?? [];
  // adayın sonda sorduğu sorular: sayısı ve tarzı deneyimine bağlı
  const backs = backQuestionsFor(selectedId, experienceYears(candidate.experience), ownIds);
  const room = roomState(entries, backs.length);
  const canFollow = canFollowUp(room, Boolean(typing));
  const endedFor = (id: string) => (log[id] ?? []).some((e) => e.kind === 'end');
  const interviewed = ownIds.filter(endedFor).length;
  const stateOf = (id: string) => (endedFor(id) ? 'done' : (log[id] ?? []).length ? 'active' : 'waiting');
  // bir seferde tek görüşme: bir cevap gelirken burada kalırsın
  const busy = Boolean(typing) || (room.handedOff && !room.salaryEntry);

  const push = (id: string, entry: Entry) => setLog((l) => ({ ...l, [id]: [...(l[id] ?? []), entry] }));

  function finishTyping() {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    setTyping(null);
  }

  /** Aday bir an düşünür, sonra cevabı canlı yazar. */
  function typeAnswer(id: string, entry: number, answer: string, onDone?: () => void) {
    setTyping({ candidateId: id, entry, shown: -1 });
    timer.current = window.setTimeout(() => {
      let shown = 0;
      timer.current = window.setInterval(() => {
        shown += 1;
        if (shown % 3 === 0) audioEngine.playKeyTick();
        if (shown >= answer.length) {
          finishTyping();
          onDone?.();
          return;
        }
        setTyping({ candidateId: id, entry, shown });
      }, TYPING_MS_PER_CHAR);
    }, THINKING_MS);
  }

  function answerFor(id: string, question: number) {
    if (question === CASE) return caseAnswer(id, caseFor(id, ownIds));
    if (question === TEST) return testTalk(id, seed).answer;
    if (question >= FOLLOW) return followUpAnswer(id, question - FOLLOW, candidateDetails[id].hireFit);
    return question === FORBIDDEN ? forbiddenAnswer(id, candidateOf(id).age) : candidateDetails[id].interview[question];
  }

  function ask(question: number, about?: string) {
    if (!canAsk(room, question, Boolean(typing))) return;
    const id = selectedId;
    audioEngine.playUi('click');
    push(id, { kind: 'q', q: question, about });
    typeAnswer(id, entries.length, answerFor(id, question));
  }

  /** Söz Ümit'e geçer: teknik soru, ardından (yapılandırılmış mülakat yoksa) Hakan Bey'in uyum sorusu, sonra maaş. */
  function handOff() {
    if (typing || room.handedOff || room.ended || room.mine.length === 0) return;
    const id = selectedId;
    audioEngine.playUi('click');
    push(id, { kind: 'handoff' });
    const queue = handOffQuestions(structured);
    const next = (i: number, at: number) => {
      if (i >= queue.length) return push(id, { kind: 'salary', move: null });
      push(id, queue[i]);
      typeAnswer(id, at, answerFor(id, queue[i].q), () => next(i + 1, at + 1));
    };
    next(0, entries.length + 1);
  }

  function talkSalary(move: SalaryMove) {
    if (!room.salaryPending || typing) return;
    const id = selectedId;
    audioEngine.playUi('click');
    setLog((l) => ({ ...l, [id]: settleSalaryIn(l[id] ?? [], move, backs.length) }));
    setAgreed((a) => ({ ...a, [id]: salaryTalk(id, move).agreed }));
    settleSalary(id, move);
  }

  function answerBack(honest: boolean) {
    if (!room.backPending || typing) return;
    const id = selectedId;
    audioEngine.playUi('click');
    answerCandidate(honest);
    setLog((l) => ({ ...l, [id]: answerBackIn(l[id] ?? [], honest, backs.length) }));
  }

  function endInterview() {
    if (typing || room.ended || !room.backsDone) return;
    audioEngine.playUi('confirm');
    push(selectedId, { kind: 'end' });
  }

  return {
    log,
    entries,
    typing,
    room,
    backs,
    canFollow,
    busy,
    interviewed,
    stateOf,
    answerFor,
    ask,
    handOff,
    talkSalary,
    answerBack,
    endInterview,
    scores,
    setScore: (criterion: keyof Scores, value: number) => setScores((all) => ({ ...all, [selectedId]: { ...all[selectedId], [criterion]: value } })),
    myScores: Object.fromEntries(ownIds.map((id) => [id, average(scores[id])])) as Record<string, number | null>,
    agreed,
  };
}
