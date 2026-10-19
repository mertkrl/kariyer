import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../game/store/store';
import { forbiddenAnswer } from '../../game/day/story';
import { candidateOf } from '../../game/data/candidates';
import { candidateDetails } from '../../game/data/candidateDetails';
import { backQuestionsFor, experienceYears, followUpAnswer } from '../../game/data/interviewExtras';
import { average, caseAnswer, caseFor, salaryMoves, salaryTalk, type SalaryMove, type Scores } from '../../game/events/interview';
import { testTalk } from '../../game/events/aptitude';
import { EVIDENCE_SITE, evidenceFor } from '../../game/data/evidence';
import { audioEngine } from '../../audio/audioEngine';
import { CALM_ANSWERS, CASE, FOLLOW, FORBIDDEN, OWNER, TEST, THINKING_MS, TYPING_MS_PER_CHAR, isNervous, ownerSalaryMove, type Entry, type Typing } from './interviewModel';
import { answerBackIn, canAsk, canFollowUp, handOffQuestions, roomState, settleSalaryIn } from './interviewRoom';

/*
 * Cuma'nın bütün görüşmeleri: her adayın kaydı, canlı yazılan cevap, notlar, puanlar ve anlaşılan
 * maaşlar. Kurallar interviewRoom.ts'te; bu hook onları React durumuna ve zamanlayıcılara bağlar.
 * Ekran yalnızca seçili adayı ve kendi adaylarının listesini verir.
 */
export function useInterview({
  selectedId,
  ownIds,
  structured,
  ownerOf,
  runnerOf,
}: {
  selectedId: string;
  /** Bugünkü panelin bütün adayları: hepsiyle sen görüşürsün. */
  ownIds: string[];
  structured: boolean;
  /** Adayı panele kim getirdi. */
  ownerOf: (id: string) => 'you' | 'ayse' | 'emre' | 'hakan';
  /** Açılıştan sonra görüşmeyi kim sürdürür. */
  runnerOf: (id: string) => 'you' | 'ayse' | 'emre' | 'hakan';
}) {
  const settleSalary = useGameStore((s) => s.settleSalary);
  const answerCandidate = useGameStore((s) => s.answerCandidate);
  const seed = useGameStore((s) => s.seed);
  const sitesOpened = useGameStore((s) => s.story.sitesOpened);
  const referenceChecks = useGameStore((s) => s.referenceChecks);
  const cardsFor = (id: string) => evidenceFor(id, { site: !!sitesOpened?.includes(id), reference: !!referenceChecks[id] });
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
  // ekipten birinin yürüttüğü görüşme: sen gözlemcisin, en fazla iki soru sorarsın
  const host = runnerOf(selectedId);
  const bringer = ownerOf(selectedId);
  const observed = host !== 'you';
  // adayın sonda sorduğu sorular (yalnızca senin yürüttüğün görüşmede): sayısı ve tarzı deneyimine bağlı
  const backs = observed ? [] : backQuestionsFor(selectedId, experienceYears(candidate.experience), ownIds);
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

  const warmFor = (id: string) => (log[id] ?? []).some((e) => e.kind === 'warm' && e.warm);
  /** Heyecanlı aday rahatlatılmadıysa: kekeler ve vakada takılır. */
  const rattled = (id: string) => isNervous(id) && (log[id] ?? []).some((e) => e.kind === 'warm') && !warmFor(id);

  /** Klasik sorunun cevabı: heyecanlı aday rahatlatıldıysa sakin hâli. */
  function classicAnswer(id: string, k: number) {
    const calm = warmFor(id) ? CALM_ANSWERS[id]?.[k as 0 | 1 | 2] : undefined;
    return calm ?? candidateDetails[id].interview[k];
  }

  function answerFor(id: string, question: number) {
    if (question === CASE) return `${rattled(id) ? 'Şey… pardon, bir saniye, heyecandan… ' : ''}${caseAnswer(id, caseFor(id, ownIds))}`;
    if (question >= EVIDENCE_SITE) return cardsFor(id).find((c) => c.code === question)?.answer ?? '';
    if (question === TEST) return testTalk(id, seed).answer;
    if (question >= OWNER) return classicAnswer(id, question - OWNER);
    if (question >= FOLLOW) return followUpAnswer(id, question - FOLLOW, candidateDetails[id].hireFit);
    return question === FORBIDDEN ? forbiddenAnswer(id, candidateOf(id).age) : classicAnswer(id, question);
  }

  /**
   * Görüşmeyi sen açarsın: samimi bir merhaba (aday rahatlar) ya da kurumsal bir giriş. Sonra
   * görüşmeyi kim sürdürecekse (runner) o devam eder; ekipten biriyse ilk soruyu hemen sorar.
   */
  function open(warm: boolean) {
    if (room.warm !== null || typing) return;
    const id = selectedId;
    audioEngine.playUi('click');
    if (!observed) return push(id, { kind: 'warm', warm });
    const opener: Entry = { kind: 'q', q: OWNER + 0, by: host as 'ayse' | 'emre' | 'hakan' };
    setLog((l) => ({ ...l, [id]: [...(l[id] ?? []), { kind: 'warm', warm }, opener] }));
    // kayıt henüz güncellenmediği için cevabın sakin hâli burada seçilir
    const calm = warm ? CALM_ANSWERS[id]?.[0] : undefined;
    typeAnswer(id, entries.length + 1, calm ?? candidateDetails[id].interview[0]);
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
    if (typing || room.handedOff || room.ended || (!observed && room.mine.length === 0)) return;
    const id = selectedId;
    audioEngine.playUi('click');
    push(id, { kind: 'handoff' });
    // yürüten açılış sorusunu zaten sordu: sırada yalnızca Ümit ve (kendi adayı değilse) Hakan Bey
    const queue = observed ? handOffQuestions(structured, 'you').filter((q) => !(bringer === 'hakan' && q.by === 'hakan')) : handOffQuestions(structured, bringer, room.mine);
    const next = (i: number, at: number) => {
      if (i >= queue.length) {
        if (!observed) return push(id, { kind: 'salary', move: null });
        // maaşı yürüten konuşur, kendi tarzıyla; senin hesabına yazılmaz
        const move = ownerSalaryMove(host as 'ayse' | 'emre' | 'hakan', salaryMoves(id));
        push(id, { kind: 'salary', move });
        setAgreed((a) => ({ ...a, [id]: salaryTalk(id, move).agreed }));
        return;
      }
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
    cards: cardsFor(selectedId),
    cardsFor,
    observed,
    host,
    open,
    rattled,
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
