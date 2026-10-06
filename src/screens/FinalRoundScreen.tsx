import { useEffect, useRef, useState } from 'react';
import { accusative } from '../game/turkish';
import { useGameStore } from '../game/store';
import { forbiddenAnswer, forbiddenQuestion } from '../game/story';
import { NEPHEW_ID, candidateOf } from '../game/data/candidates';
import { candidateDetails, FINAL_INTERVIEW_QUESTIONS } from '../game/data/candidateDetails';
import { FINALIST_LIMIT } from '../game/data/days';
import { followUpAnswer, FOLLOW_UP_QUESTIONS, HAKAN_INTERRUPTS, hakanTarget } from '../game/data/interviewExtras';
import { Button } from '../components/ui/Button';
import { caseAnswer, caseFor, salaryTalk, tagNote, type SalaryMove, type Scores } from '../game/interview';
import { type Note as NotebookNote } from './final/InterviewParts';
import { SoundToggle } from '../components/ui/SoundToggle';
import { audioEngine } from '../audio/audioEngine';
import { CASE, COLLEAGUES, FALLBACK, FOLLOW, FORBIDDEN, INTERVIEW_LIMIT, LEAD, QUESTION_BUDGET, THINKING_MS, TYPING_MS_PER_CHAR, WHISPER, type Entry, type Typing } from './final/interviewModel';
import { PoolPicker } from './final/PoolPicker';
import { Conversation } from './final/Conversation';
import { Dossier } from './final/Dossier';
import { HireModal } from './final/HireModal';
import { InterviewConsole } from './final/InterviewConsole';
import styles from './FinalRoundScreen.module.css';
import { avatarStyle } from '../components/ui/avatarStyle';

export function FinalRoundScreen() {
  const finalists = useGameStore((s) => s.finalists);
  const hire = useGameStore((s) => s.hire);
  const askForbidden = useGameStore((s) => s.askForbidden);
  const pastRequests = useGameStore((s) => s.story.pastRequests);
  // Hakan Bey yapılandırılmış mülakatı kabul etti: herkese aynı sorular, onun listesi yok
  const structured = useGameStore((s) => s.story.reform?.kind === 'structured' && s.story.reform.accepted);
  // Hakan Bey gün içinde bir kez, listesinde olmayan ilk sorudan sonra kulağına eğilir
  const [whispered, setWhispered] = useState(false);
  const forced = finalists.length === 0;
  const everyone = [...(forced ? FALLBACK : finalists), ...COLLEAGUES.filter((c) => !finalists.some((f) => f.id === c.id))];
  // Hakan Bey'in odada istediği kişiler odada kalır: yeğeni ve sana çağırmanı söylediği herkes
  const locked = new Set(everyone.filter((f) => f.byManager || f.id === NEPHEW_ID || pastRequests.some((r) => r.want === 'approve' && r.candidateId === f.id)).map((f) => f.id));
  // uzun bir kısa liste, ilk görüşmeden önce bir günlük mülakata indirilir
  const [chosen, setChosen] = useState<string[] | null>(() => (everyone.length <= INTERVIEW_LIMIT ? everyone.map((f) => f.id) : null));
  const pool = chosen ? everyone.filter((f) => chosen.includes(f.id)) : everyone;

  const [selectedId, setSelectedId] = useState(pool[0].id);
  // Her adayın şimdiye kadarki görüşmesi, sırasıyla; aynı anda yalnızca bir cevap canlı yazılır.
  const [log, setLog] = useState<Record<string, Entry[]>>({});
  const [typing, setTyping] = useState<Typing | null>(null);
  const timer = useRef<number | null>(null);
  const hakanInterrupt = useGameStore((s) => s.hakanInterrupt);
  const answerCandidate = useGameStore((s) => s.answerCandidate);
  const endedFor = (id: string) => (log[id] ?? []).some((e) => e.kind === 'back' && e.choice !== null);
  // bir aday, görüşme düzgünce kapatılınca görüşüldü sayılır
  const interviewed = pool.filter((f) => endedFor(f.id)).length;
  const interruptsUsed = Object.values(log).flat().filter((e) => e.kind === 'hakan').length;
  const chatRef = useRef<HTMLDivElement>(null);
  const [confirming, setConfirming] = useState(false);
  // not defterin, puan kartları, her kişiyle anlaşılan maaş ve kurula sunduğun gerekçe
  const [notes, setNotes] = useState<Record<string, NotebookNote[]>>({});
  const [scores, setScores] = useState<Record<string, Scores>>({});
  const [agreed, setAgreed] = useState<Record<string, number | null>>({});
  const settleSalary = useGameStore((s) => s.settleSalary);

  const candidate = candidateOf(selectedId);
  const details = candidateDetails[selectedId];
  const selected = pool.find((f) => f.id === selectedId);

  useEffect(() => {
    audioEngine.setMusicMood('paused');
    return () => audioEngine.setMusicMood('work');
  }, []);

  const entries = log[selectedId] ?? [];
  const questions = entries.filter((e): e is Extract<Entry, { kind: 'q' }> => e.kind === 'q');
  // kendi seçtiğin sorular hakkından düşer; takip soruları ve Hakan Bey'inkiler düşmez
  const mine = questions.filter((e) => !e.by && (e.q < FOLLOW || e.q === CASE)).map((e) => e.q);
  const forbiddenDone = questions.some((e) => e.q === FORBIDDEN);
  const followUsed = questions.some((e) => e.q >= FOLLOW && e.q < CASE);
  const salaryEntry = entries.find((e): e is Extract<Entry, { kind: 'salary' }> => e.kind === 'salary');
  const salaryDone = salaryEntry?.move != null;
  const pending =
    entries.find((e): e is Extract<Entry, { kind: 'hakan' | 'back' }> => (e.kind === 'hakan' || e.kind === 'back') && e.choice === null) ??
    (salaryEntry && salaryEntry.move === null ? salaryEntry : undefined);
  const ended = endedFor(selectedId);
  const canFollow = !followUsed && !typing && !pending && !ended;
  const poolIds = pool.map((f) => f.id);
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
  const hakanChoice = entries.find((e): e is Extract<Entry, { kind: 'hakan' }> => e.kind === 'hakan')?.choice ?? null;

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
    if (typing || pending || ended) return;
    const follow = question >= FOLLOW && question < CASE;
    if (follow ? !canFollow : questions.some((e) => e.q === question) || mine.length >= QUESTION_BUDGET) return;
    const id = selectedId;
    if (question === FORBIDDEN) askForbidden();
    // Hakan Bey, listesinin yazıldığı kişilerde senin ilk cevabından sonra araya girer
    const interruptNext =
      !structured && !follow && question !== FORBIDDEN && mine.length === 0 && !forbiddenDone && !selected?.byManager &&
      hakanTarget(id, candidateOf(id).age) && interruptsUsed < HAKAN_INTERRUPTS;
    // yoksa bir kez, listesinde olmayan ilk sorundan sonra kulağına eğilir
    const whisperNext = !structured && !interruptNext && question !== FORBIDDEN && !whispered && mine.length === 0;
    if (whisperNext) setWhispered(true);
    audioEngine.playUi('click');
    push(id, { kind: 'q', q: question, about });
    typeAnswer(
      id,
      entries.length,
      answerFor(id, question),
      interruptNext ? () => push(id, { kind: 'hakan', choice: null }) : whisperNext ? () => push(id, { kind: 'note', text: WHISPER }) : undefined,
    );
  }

  function setChoice(kind: 'hakan' | 'back', choice: 'protect' | 'silent' | 'honest' | 'polished') {
    const id = selectedId;
    setLog((l) => ({ ...l, [id]: (l[id] ?? []).map((e) => (e.kind === kind && e.choice === null ? ({ ...e, choice } as Entry) : e)) }));
  }

  function respondHakan(protect: boolean) {
    if (typing || pending?.kind !== 'hakan') return;
    const id = selectedId;
    audioEngine.playUi('click');
    setChoice('hakan', protect ? 'protect' : 'silent');
    hakanInterrupt(protect);
    if (!protect) {
      push(id, { kind: 'q', q: FORBIDDEN, by: 'hakan' });
      typeAnswer(id, entries.length, forbiddenAnswer(id, candidateOf(id).age));
    }
  }

  function openSalary() {
    if (typing || pending || ended || salaryEntry) return;
    audioEngine.playUi('click');
    push(selectedId, { kind: 'salary', move: null });
  }

  function talkSalary(move: SalaryMove) {
    if (salaryEntry?.move !== null || typing) return;
    const id = selectedId;
    const result = salaryTalk(id, move);
    audioEngine.playUi('click');
    setLog((l) => ({ ...l, [id]: (l[id] ?? []).map((e) => (e.kind === 'salary' && e.move === null ? { kind: 'salary', move } : e)) }));
    setAgreed((a) => ({ ...a, [id]: result.agreed }));
    settleSalary(id, move);
  }

  function endInterview() {
    if (typing || pending || ended || mine.length === 0 || !salaryDone) return;
    audioEngine.playUi('click');
    push(selectedId, { kind: 'back', choice: null });
  }

  function answerBack(honest: boolean) {
    if (pending?.kind !== 'back') return;
    audioEngine.playUi('confirm');
    setChoice('back', honest ? 'honest' : 'polished');
    answerCandidate(honest);
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
  const leadHeard = mine.some((q) => q !== FORBIDDEN) && !typing;

  // bir seferde tek görüşme: bir cevap gelirken ya da bir seçim beklerken burada kalırsın
  const busy = Boolean(typing) || Boolean(pending);
  function select(id: string, index: number) {
    if (busy && id !== selectedId) return;
    audioEngine.playUi('select', index % 4);
    setSelectedId(id);
  }
  const stateOf = (id: string) => (endedFor(id) ? 'done' : (log[id] ?? []).length ? 'active' : 'waiting');

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Gün 5 · Cuma · Mülakatlar</div>
          <h1 className={styles.title}>Mülakat Günü</h1>
          <p className={styles.subtitle}>
            Bütçe kesildi: <strong>sadece 1 kişi</strong> işe alınacak. Odada senin listen ve ekip arkadaşlarının (Ayşe, Emre) kısa listeleri var. Yapay zeka yok, puan yok — sadece adayların
            cevapları. Odada <strong>Hakan Bey</strong> ve yazılım ekip lideri <strong>{LEAD}</strong> da var. Öneriyi sen sunacaksın; karar üçünüzün. Geri alınamaz.
            {structured && ' Bugün yapılandırılmış mülakat var: her adaya aynı sorular, Ümit puan kartı tutuyor; Hakan Bey\'in listesi masada değil.'}
          </p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.counter}>
            <span className={`${styles.counterValue} mono`}>
              {interviewed}/{pool.length}
            </span>
            <span className={styles.counterLabel}>aday görüşüldü</span>
          </div>
          <SoundToggle variant="inline" />
        </div>
      </header>

      {forced && (
        <div className={styles.forcedNote}>
          Hafta boyunca kimseyi mülakata çağırmadın (kontenjan {FINALIST_LIMIT} kişiydi). Senin listenin yerini yönetimin iç referansı
          aldı; odadaki diğer adaylar ekip arkadaşlarının kısa listelerinden.
        </div>
      )}

      {chosen === null ? (
        <PoolPicker
          everyone={everyone}
          locked={locked}
          onConfirm={(ids) => {
            setChosen(ids);
            setSelectedId(ids[0]);
          }}
        />
      ) : (
      <div className={styles.body}>
          <aside className={styles.list} aria-label="Mülakat adayları">
            <div className={styles.listLabel}>Mülakat Adayları</div>
            {pool.map((f, i) => {
              const c = candidateOf(f.id);
              const isSelected = f.id === selectedId;
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
                    <span className={`${styles.listState} ${styles['state_' + stateOf(f.id)]}`}>
                      {{ waiting: 'Görüşülmedi', active: 'Görüşme sürüyor', done: 'Görüşüldü' }[stateOf(f.id)]}
                    </span>
                  </span>
                  <span className={styles.listMeta}>
                    {f.by ? <span className={styles.teamBadge}>{f.by === 'ayse' ? 'Ayşe' : 'Emre'}</span> : f.byManager ? <span className={styles.refBadge}>Hakan Bey</span> : f.day > 0 ? <span className={`${styles.dayBadge} mono`}>G{f.day}</span> : <span className={styles.refBadge}>Referans</span>}
                  </span>
                </button>
              );
            })}
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
                <span className={`${styles.roomState} ${styles['state_' + stateOf(selectedId)]}`}>
                  {ended ? 'Görüşme tamamlandı' : entries.length ? `Soru ${mine.length}/${QUESTION_BUDGET}` : 'Görüşme başlamadı'}
                </span>
              </header>
  
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
              />

              <InterviewConsole
                candidate={candidate}
                pool={pool}
                typing={Boolean(typing)}
                pending={pending?.kind ?? null}
                ended={ended}
                interviewed={interviewed}
                mine={mine}
                canFollow={canFollow}
                salaryOpened={Boolean(salaryEntry)}
                salaryDone={salaryDone}
                structured={structured}
                hakanAnswered={hakanChoice !== null}
                forbiddenDone={forbiddenDone}
                scores={scores[selectedId] ?? {}}
                onScore={(c, v) => setScores((all) => ({ ...all, [selectedId]: { ...all[selectedId], [c]: v } }))}
                ask={ask}
                openSalary={openSalary}
                talkSalary={talkSalary}
                respondHakan={respondHakan}
                answerBack={answerBack}
                endInterview={endInterview}
              />
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
              caseAsked={mine.includes(CASE) && !typing}
              forbiddenAsked={mine.includes(FORBIDDEN)}
              hakanChoice={hakanChoice}
            />
          </div>
  
          <div className={styles.hireBar}>
            <span className={styles.hireHint}>
              {interviewed < pool.length ? `Öneri için önce herkesle görüşmeyi bitir: ${pool.length - interviewed} aday kaldı.` : 'Tüm adaylarla görüştün.'}
            </span>
            <Button
              variant="gold"
              sound="click"
              onClick={() => setConfirming(true)}
              disabled={interviewed < pool.length || busy}
              title={interviewed < pool.length ? 'Önce bütün adaylarla görüş' : undefined}
            >
              {accusative(candidate.name.split(' ')[0])} Öner →
            </Button>
          </div>
        </div>
      )}


      {confirming && (
        <HireModal
          candidate={candidate}
          pool={pool}
          scores={scores}
          agreed={agreed}
          notes={notes}
          pastRequests={pastRequests}
          fit={fit}
          onClose={() => setConfirming(false)}
          onConfirm={(convinced) => hire(selectedId, { agreed, convinced })}
        />
      )}
    </div>
  );
}
