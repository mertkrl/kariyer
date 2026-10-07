import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../game/store/store';
import { forbiddenAnswer, forbiddenQuestion } from '../game/day/story';
import { candidateOf } from '../game/data/candidates';
import { candidateDetails, FINAL_INTERVIEW_QUESTIONS } from '../game/data/candidateDetails';
import { backQuestionsFor, experienceYears, followUpAnswer, FOLLOW_UP_QUESTIONS } from '../game/data/interviewExtras';
import { Button } from '../components/ui/Button';
import { average, caseAnswer, caseFor, salaryTalk, tagNote, type SalaryMove, type Scores } from '../game/events/interview';
import { INTERVIEWER, handOver, ownerOf } from '../game/events/panel';
import { type Note as NotebookNote } from './final/InterviewParts';
import { SoundToggle } from '../components/ui/SoundToggle';
import { audioEngine } from '../audio/audioEngine';
import { CASE, COLLEAGUES, FALLBACK, FOLLOW, FORBIDDEN, INTERVIEW_LIMIT, LEAD, QUESTION_BUDGET, THINKING_MS, TYPING_MS_PER_CHAR, type Entry, type Typing } from './final/interviewModel';
import { PoolPicker } from './final/PoolPicker';
import { Conversation } from './final/Conversation';
import { Dossier } from './final/Dossier';
import { HireModal } from './final/HireModal';
import { InterviewConsole } from './final/InterviewConsole';
import { ColleagueReport } from './final/ColleagueReport';
import styles from './FinalRoundScreen.module.css';
import { avatarStyle } from '../components/ui/avatarStyle';

/*
 * Cuma: herkes kendi adayının mülakatına girer. Senin odanda sırayla sen klasik sorularını
 * sorarsın, Ümit teknik soruyu, Hakan Bey "uyum" sorusunu sorar; araya giremezsin. Maaşı konuşur,
 * puanlarsın. Ayşe, Emre ve Hakan Bey kendi adaylarıyla kendi odalarında görüşür; gün sonunda
 * kurul bütün puanları yan yana koyar ve ortak karar verir.
 */
export function FinalRoundScreen() {
  const finalists = useGameStore((s) => s.finalists);
  const hire = useGameStore((s) => s.hire);
  const pastRequests = useGameStore((s) => s.story.pastRequests);
  // Hakan Bey yapılandırılmış mülakatı kabul etti: herkese aynı sorular, onun listesi masada değil
  const structured = useGameStore((s) => s.story.reform?.kind === 'structured' && s.story.reform.accepted);
  const forced = finalists.length === 0;
  const everyone = [...(forced ? FALLBACK : finalists), ...COLLEAGUES.filter((c) => !finalists.some((f) => f.id === c.id))];
  const mineAll = everyone.filter((f) => ownerOf(f, pastRequests) === 'you');
  const others = everyone.filter((f) => ownerOf(f, pastRequests) !== 'you');
  // senin günün yalnızca kendi adaylarını alır; uzun bir liste sabah kısaltılır
  const [chosen, setChosen] = useState<string[] | null>(() => (mineAll.length <= INTERVIEW_LIMIT ? mineAll.map((f) => f.id) : null));
  const own = chosen ? mineAll.filter((f) => chosen.includes(f.id)) : mineAll;
  // seçmediklerin kaybolmaz: Ayşe ve Emre'nin odalarına eşit dağılır
  const handed = chosen ? handOver(mineAll.filter((f) => !chosen.includes(f.id)), others, pastRequests) : [];
  const panelPool = [...own, ...handed, ...others];
  const ownerOfId = (id: string) => ownerOf((panelPool.find((f) => f.id === id) ?? everyone.find((f) => f.id === id))!, pastRequests);

  const [selectedId, setSelectedId] = useState((own[0] ?? others[0]).id);
  // Her adayın şimdiye kadarki görüşmesi, sırasıyla; aynı anda yalnızca bir cevap canlı yazılır.
  const [log, setLog] = useState<Record<string, Entry[]>>({});
  const [typing, setTyping] = useState<Typing | null>(null);
  const timer = useRef<number | null>(null);
  const endedFor = (id: string) => (log[id] ?? []).some((e) => e.kind === 'end');
  const interviewed = own.filter((f) => endedFor(f.id)).length;
  const chatRef = useRef<HTMLDivElement>(null);
  const [confirming, setConfirming] = useState(false);
  const [notes, setNotes] = useState<Record<string, NotebookNote[]>>({});
  const [scores, setScores] = useState<Record<string, Scores>>({});
  const [agreed, setAgreed] = useState<Record<string, number | null>>({});
  const settleSalary = useGameStore((s) => s.settleSalary);
  const answerCandidate = useGameStore((s) => s.answerCandidate);

  const candidate = candidateOf(selectedId);
  const details = candidateDetails[selectedId];
  const selected = everyone.find((f) => f.id === selectedId);
  const isMine = ownerOfId(selectedId) === 'you';

  useEffect(() => {
    audioEngine.setMusicMood('paused');
    return () => audioEngine.setMusicMood('work');
  }, []);

  const entries = log[selectedId] ?? [];
  const questions = entries.filter((e): e is Extract<Entry, { kind: 'q' }> => e.kind === 'q');
  // senin klasik soruların hakkından düşer; takip sorusu, Ümit'in ve Hakan Bey'in soruları düşmez
  const mine = questions.filter((e) => !e.by && e.q < FOLLOW).map((e) => e.q);
  const followUsed = questions.some((e) => e.q >= FOLLOW && e.q < CASE);
  const handedOff = entries.some((e) => e.kind === 'handoff');
  const salaryEntry = entries.find((e): e is Extract<Entry, { kind: 'salary' }> => e.kind === 'salary');
  const salaryDone = salaryEntry?.move != null;
  const salaryPending = salaryEntry !== undefined && salaryEntry.move === null;
  const ended = endedFor(selectedId);
  // adayın sonda sorduğu sorular: sayısı ve tarzı deneyimine bağlı
  const backs = backQuestionsFor(selectedId, experienceYears(candidate.experience), own.map((f) => f.id));
  const backEntries = entries.filter((e): e is Extract<Entry, { kind: 'back' }> => e.kind === 'back');
  const backPending = backEntries.find((e) => e.choice === null) ?? null;
  const backsDone = salaryDone && !backPending && backEntries.length >= backs.length;
  const canFollow = !followUsed && !typing && !handedOff && !ended;
  const poolIds = own.map((f) => f.id);
  const myNotes = notes[selectedId] ?? [];
  const isNoted = (sentence: string) => myNotes.some((n) => n.text === sentence);
  function toggleNote(sentence: string) {
    const id = selectedId;
    audioEngine.playUi('click');
    setNotes((all) => {
      const list = all[id] ?? [];
      return { ...all, [id]: list.some((n) => n.text === sentence) ? list.filter((n) => n.text !== sentence) : [...list, { text: sentence, tag: tagNote(sentence) }] };
    });
  }

  function finishTyping() {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    setTyping(null);
  }

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
  }, []);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [log, typing, selectedId]);

  const push = (id: string, entry: Entry) => setLog((l) => ({ ...l, [id]: [...(l[id] ?? []), entry] }));
  const sizeOf = (id: string) => (log[id] ?? []).length;

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

  function ask(question: number, about?: string) {
    if (typing || handedOff || ended || !isMine) return;
    const follow = question >= FOLLOW && question < CASE;
    if (follow ? !canFollow : questions.some((e) => e.q === question) || mine.length >= QUESTION_BUDGET) return;
    const id = selectedId;
    audioEngine.playUi('click');
    push(id, { kind: 'q', q: question, about });
    typeAnswer(id, entries.length, answerFor(id, question));
  }

  /** Söz Ümit'e geçer: teknik soru, ardından (yapılandırılmış mülakat yoksa) Hakan Bey'in uyum sorusu, sonra maaş. */
  function handOff() {
    if (typing || handedOff || ended || mine.length === 0) return;
    const id = selectedId;
    const start = sizeOf(id);
    audioEngine.playUi('click');
    push(id, { kind: 'handoff' });
    push(id, { kind: 'q', q: CASE, by: 'levent' });
    typeAnswer(id, start + 1, answerFor(id, CASE), () => {
      if (structured) {
        push(id, { kind: 'salary', move: null });
        return;
      }
      push(id, { kind: 'q', q: FORBIDDEN, by: 'hakan' });
      typeAnswer(id, start + 2, answerFor(id, FORBIDDEN), () => push(id, { kind: 'salary', move: null }));
    });
  }

  function talkSalary(move: SalaryMove) {
    if (!salaryPending || typing) return;
    const id = selectedId;
    const result = salaryTalk(id, move);
    audioEngine.playUi('click');
    setLog((l) => ({ ...l, [id]: (l[id] ?? []).map((e) => (e.kind === 'salary' && e.move === null ? { kind: 'salary', move } : e)) }));
    setAgreed((a) => ({ ...a, [id]: result.agreed }));
    settleSalary(id, move);
    // maaştan sonra, sorusu olan aday sorar
    if (backs.length > 0) push(id, { kind: 'back', n: 0, choice: null });
  }

  function answerBack(honest: boolean) {
    if (!backPending || typing) return;
    const id = selectedId;
    const next = backPending.n + 1;
    audioEngine.playUi('click');
    answerCandidate(honest);
    setLog((l) => {
      const list = (l[id] ?? []).map((e) => (e.kind === 'back' && e.choice === null ? { ...e, choice: honest ? ('honest' as const) : ('polished' as const) } : e));
      return { ...l, [id]: next < backs.length ? [...list, { kind: 'back', n: next, choice: null }] : list };
    });
  }

  function endInterview() {
    if (typing || ended || !backsDone) return;
    audioEngine.playUi('confirm');
    push(selectedId, { kind: 'end' });
  }

  function answerFor(id: string, question: number) {
    if (question === CASE) return caseAnswer(id, caseFor(id, poolIds));
    if (question >= FOLLOW) return followUpAnswer(id, question - FOLLOW, candidateDetails[id].hireFit);
    return question === FORBIDDEN ? forbiddenAnswer(id, candidateOf(id).age) : candidateDetails[id].interview[question];
  }
  const questionText = (q: number, about?: string) =>
    q === CASE
      ? 'Kısa bir vaka vereyim: bu kodda ne yanlış, nasıl düzeltirdiniz?'
      : q >= FOLLOW
        ? `${about ? `"${about.replace(/[.;,]$/, '')}" dediniz. ` : ''}${FOLLOW_UP_QUESTIONS[q - FOLLOW]}`
        : q === FORBIDDEN
          ? forbiddenQuestion(selectedId, candidateOf(selectedId).age)
          : FINAL_INTERVIEW_QUESTIONS[q];
  const fit = details.hireFit;
  const leadHeard = questions.some((e) => e.q === CASE) && !typing;

  // bir seferde tek görüşme: bir cevap gelirken burada kalırsın
  const busy = Boolean(typing) || (handedOff && !salaryEntry);
  function select(id: string, index: number) {
    if (busy && id !== selectedId) return;
    audioEngine.playUi('select', index % 4);
    setSelectedId(id);
  }
  const stateOf = (id: string) => (endedFor(id) ? 'done' : (log[id] ?? []).length ? 'active' : 'waiting');
  const myScores = Object.fromEntries(own.map((f) => [f.id, average(scores[f.id])]));
  const ready = interviewed === own.length && !busy;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Gün 5 · Cuma · Mülakatlar</div>
          <h1 className={styles.title}>Mülakat Günü</h1>
          <p className={styles.subtitle}>
            Bütçe kesildi: <strong>sadece 1 kişi</strong> işe alınacak. Herkes kendi adayının mülakatına giriyor: sen kendi çağırdıklarınla, Ayşe ve Emre kendi kısa listeleriyle, Hakan
            Bey kendi önerdikleriyle görüşüyor. Her odada teknik soruyu <strong>{LEAD}</strong>, uyum sorusunu <strong>Hakan Bey</strong> soruyor. Gün sonunda kurul bütün puanları yan
            yana koyup ortak karar veriyor.
            {structured && ' Bugün yapılandırılmış mülakat var: Hakan Bey\'in listesi masada değil.'}
          </p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.counter}>
            <span className={`${styles.counterValue} mono`}>
              {interviewed}/{own.length}
            </span>
            <span className={styles.counterLabel}>görüşmen tamamlandı</span>
          </div>
          <SoundToggle variant="inline" />
        </div>
      </header>

      {forced && (
        <div className={styles.forcedNote}>
          Hafta boyunca kimseyi mülakata çağırmadın (her gün 3 hakkın vardı). Senin listenin yerini yönetimin iç referansı aldı; bugün senin odan boş, kurulda diğerlerinin
          görüşmelerini değerlendireceksin.
        </div>
      )}

      {chosen === null ? (
        <PoolPicker
          everyone={mineAll}
          locked={new Set()}
          onConfirm={(ids) => {
            setChosen(ids);
            setSelectedId(ids[0]);
          }}
        />
      ) : (
        <div className={styles.body}>
          <aside className={styles.list} aria-label="Mülakat adayları">
            {[
              // diğer odalarda kimin olduğu kurula kadar görünmez
              { label: 'Senin görüşmelerin', items: own },
            ].map((group) =>
              group.items.length === 0 ? null : (
                <div key={group.label}>
                  <div className={styles.listLabel}>{group.label}</div>
                  {group.items.map((f, i) => {
                    const c = candidateOf(f.id);
                    const isSelected = f.id === selectedId;
                    const owner = ownerOf(f, pastRequests);
                    return (
                      <button
                        key={f.id}
                        className={`${styles.listItem} ${isSelected ? styles.listItemSelected : ''}`}
                        onClick={() => select(f.id, i)}
                        disabled={busy && !isSelected}
                        title={busy && !isSelected ? 'Önce bu görüşmedeki konuşmayı tamamla' : undefined}
                      >
                        <span className={styles.avatar} style={avatarStyle(c.color)}>
                          {c.initials}
                        </span>
                        <span className={styles.listText}>
                          <span className={styles.listName}>{c.name}</span>
                          <span className={styles.listRole}>{c.role.replace(' adayı', '')}</span>
                          <span className={`${styles.listState} ${styles['state_' + (owner === 'you' ? stateOf(f.id) : 'done')]}`}>
                            {owner === 'you'
                              ? { waiting: 'Görüşülmedi', active: 'Görüşme sürüyor', done: 'Görüşüldü' }[stateOf(f.id)]
                              : `${INTERVIEWER[owner].name.split(' ')[0]} görüştü`}
                          </span>
                        </span>
                        <span className={styles.listMeta}>
                          {owner === 'ayse' || owner === 'emre' ? (
                            <span className={styles.teamBadge}>{owner === 'ayse' ? 'Ayşe' : 'Emre'}</span>
                          ) : owner === 'hakan' ? (
                            <span className={styles.refBadge}>Hakan Bey</span>
                          ) : (
                            <span className={`${styles.dayBadge} mono`}>G{f.day}</span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ),
            )}
          </aside>

          <div className={styles.room} key={selectedId} role="region" aria-label="Mülakat odası">
            <section className={styles.conversation} aria-label="Görüşme">
              <header className={styles.roomHead}>
                <span className={`${styles.avatar} ${styles.avatarLarge}`} style={avatarStyle(candidate.color)}>
                  {candidate.initials}
                </span>
                <div>
                  <h2>{candidate.name}</h2>
                  <div className={styles.profileSub}>
                    {candidate.age} yaşında · {candidate.role}
                  </div>
                </div>
                <span className={`${styles.roomState} ${styles['state_' + (isMine ? stateOf(selectedId) : 'done')]}`}>
                  {!isMine ? `${INTERVIEWER[ownerOfId(selectedId)].name} görüştü` : ended ? 'Görüşme tamamlandı' : entries.length ? `Soru ${mine.length}/${QUESTION_BUDGET}` : 'Görüşme başlamadı'}
                </span>
              </header>

              {isMine ? (
                <>
                  <Conversation
                    entries={entries}
                    selectedId={selectedId}
                    candidate={candidate}
                    poolIds={poolIds}
                    typing={typing}
                    canFollow={canFollow}
                    chatRef={chatRef}
                    answerFor={answerFor}
                    questionText={questionText}
                    ask={ask}
                    isNoted={isNoted}
                    toggleNote={toggleNote}
                    firstOfDay={interviewed === 0}
                    structured={structured}
                    backs={backs}
                  />

                  <InterviewConsole
                    candidate={candidate}
                    typing={Boolean(typing)}
                    handedOff={handedOff}
                    salaryPending={salaryPending}
                    salaryDone={backsDone}
                    back={backPending ? backs[backPending.n] : null}
                    answerBack={answerBack}
                    ended={ended}
                    allDone={interviewed === own.length}
                    mine={mine}
                    canFollow={canFollow}
                    scores={scores[selectedId] ?? {}}
                    onScore={(c, v) => setScores((all) => ({ ...all, [selectedId]: { ...all[selectedId], [c]: v } }))}
                    ask={ask}
                    handOff={handOff}
                    talkSalary={talkSalary}
                    endInterview={endInterview}
                  />
                </>
              ) : (
                <ColleagueReport id={selectedId} owner={ownerOfId(selectedId) as Exclude<ReturnType<typeof ownerOf>, 'you'>} structured={structured} />
              )}
            </section>

            <Dossier
              candidate={candidate}
              details={details}
              selectedId={selectedId}
              invitedOn={selected?.day ?? 0}
              agreed={agreed}
              notes={myNotes}
              onRemoveNote={toggleNote}
              leadHeard={leadHeard}
              fit={fit}
              followUsed={followUsed && !typing}
              caseAsked={leadHeard}
            />
          </div>

          <div className={styles.hireBar}>
            <span className={styles.hireHint}>
              {interviewed < own.length ? `Kurula geçmeden önce kendi görüşmelerini bitir: ${own.length - interviewed} aday kaldı.` : 'Görüşmeler bitti. Kurul toplanıyor.'}
            </span>
            <Button variant="gold" sound="click" onClick={() => setConfirming(true)} disabled={!ready} title={ready ? undefined : 'Önce kendi görüşmelerini bitir'}>
              Kurula geç →
            </Button>
          </div>
        </div>
      )}

      {confirming && (
        <HireModal
          pool={panelPool}
          pastRequests={pastRequests}
          myScores={myScores}
          structured={structured}
          agreed={agreed}
          onClose={() => setConfirming(false)}
          onConfirm={(decided, recommended) => hire(recommended, { agreed, decided })}
        />
      )}
    </div>
  );
}
