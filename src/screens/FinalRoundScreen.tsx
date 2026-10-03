import { useEffect, useRef, useState, type ReactNode } from 'react';
import { accusative } from '../game/turkish';
import { SALARY_CAP, panelDecision, useGameStore, type Finalist } from '../game/store';
import { forbiddenAnswer, forbiddenQuestion } from '../game/story';
import { NEPHEW_ID, candidateOf } from '../game/data/candidates';
import { candidateDetails, FINAL_INTERVIEW_QUESTIONS } from '../game/data/candidateDetails';
import { FINALIST_LIMIT } from '../game/data/days';
import { backQuestionFor, followUpAnswer, followUpVerdict, FOLLOW_UP_QUESTIONS, HAKAN_INTERRUPTS, hakanTarget } from '../game/data/interviewExtras';
import { Button } from '../components/ui/Button';
import { SoundToggle } from '../components/ui/SoundToggle';
import { audioEngine } from '../audio/audioEngine';
import { PLAYER } from '../game/player';
import styles from './FinalRoundScreen.module.css';

/** One line of the conversation: who speaks, in what role, and what they say. */
function Turn({ who, role, tone, children }: { who: string; role: string; tone: 'you' | 'candidate' | 'hakan'; children: ReactNode }) {
  return (
    <div className={`${styles.turn} ${styles['turn_' + tone]}`}>
      <div className={styles.turnWho}>
        <b>{who}</b>
        <small>{role}</small>
      </div>
      <div className={styles.turnText}>{children}</div>
    </div>
  );
}

/** What happens in the room without anyone speaking. */
function Note({ children }: { children: ReactNode }) {
  return <p className={styles.note}>{children}</p>;
}

/** When nobody was advanced all week, management fills the final with its internal reference. */
const FALLBACK: Finalist[] = [{ id: NEPHEW_ID, day: 0 }];
/** The rest of the team screened too: their shortlists sit in the same room on Friday. */
/** How many people one interview day holds; a longer list is cut down in the morning. */
export const INTERVIEW_LIMIT = 6;

const COLLEAGUES: Finalist[] = [
  { id: 'nehir', day: 0, by: 'ayse' },
  { id: 'berk', day: 0, by: 'ayse' },
  { id: 'cagan', day: 0, by: 'emre' },
  { id: 'sarp', day: 0, by: 'emre' },
];

/*
 * The hiring manager sits in too: Levent, the software team lead. He listens to the answers,
 * not the flags, and says what he thinks after each interview. The hire is a panel decision —
 * you recommend, he and Hakan Bey sign (or object on the record).
 */
const LEAD = 'Levent Arslan';
const LEAD_SPECIAL: Record<string, string> = {
  emre: 'Teknik olarak açık ara en iyisi. Ama ekibi "gereksiz" bulduğunu bana da söyledi; ekibim onunla çalışmak istemez.',
  okan: 'Temel sorulara cevap veremedi. Kimin yakını olduğu umurumda değil; ekipte yeri yok.',
  volkan: 'Çok iyi konuşuyor ama tek bir rakam, tek bir somut örnek vermedi. Referanslarını aramadan ben ikna olmadım.',
};
function leadView(id: string, fit: number) {
  if (LEAD_SPECIAL[id]) return LEAD_SPECIAL[id];
  if (fit >= 5) return 'Cevapları somut ve ölçülebilir. Teknik olarak ekibin en güçlüsü olabilir.';
  if (fit === 4) return 'Sağlam. İlk aylarda biraz destek ister ama işini bildiği belli.';
  if (fit === 3) return 'Potansiyeli var ama henüz hazır değil; yanına bir mentor vermemiz gerekir.';
  return 'Somut hiçbir şey anlatmadı. Bu cevaplarla ben ikna olmadım.';
}
/** Does the team lead back this hire? Strong and not toxic: yes. */
const leadBacks = (id: string, fit: number) => fit >= 4 && !LEAD_SPECIAL[id];

/** What Hakan Bey says into your ear, once, after your first own question. */
const WHISPER = 'Hakan Bey kulağına eğiliyor: "Listedeki soruları da sor. Aile planı, memleket, emeklilik… Uzun vadeli uyum önemli."';

/** Each interview slot is short: only this many of the questions fit. */
const QUESTION_BUDGET = 2;
/** Index used for the question from Hakan Bey's list (after the three standard ones). */
const FORBIDDEN = 3;
const TYPING_MS_PER_CHAR = 16;
const THINKING_MS = 900;

/** Follow-ups are stored as FOLLOW + the index of the question they dig into. */
const FOLLOW = 10;

/** One beat of an interview, in the order it happened. */
type Entry =
  | { kind: 'q'; q: number; by?: 'hakan' }
  | { kind: 'note'; text: string }
  | { kind: 'hakan'; choice: 'protect' | 'silent' | null }
  | { kind: 'back'; choice: 'honest' | 'polished' | null };

interface Typing {
  candidateId: string;
  /** Index of the entry whose answer is being typed. */
  entry: number;
  /** Characters revealed so far; -1 while the candidate is still "thinking". */
  shown: number;
}

export function FinalRoundScreen() {
  const finalists = useGameStore((s) => s.finalists);
  const hire = useGameStore((s) => s.hire);
  const askForbidden = useGameStore((s) => s.askForbidden);
  const pastRequests = useGameStore((s) => s.story.pastRequests);
  // Hakan Bey agreed to a structured interview: same questions for everyone, his list is out
  const structured = useGameStore((s) => s.story.reform?.kind === 'structured' && s.story.reform.accepted);
  // Hakan Bey leans over once in the day, after the first question that isn't on his list
  const [whispered, setWhispered] = useState(false);
  const forced = finalists.length === 0;
  const everyone = [...(forced ? FALLBACK : finalists), ...COLLEAGUES.filter((c) => !finalists.some((f) => f.id === c.id))];
  // who Hakan Bey wants in the room stays in it: his nephew and everyone he asked you to call
  const locked = new Set(everyone.filter((f) => f.byManager || f.id === NEPHEW_ID || pastRequests.some((r) => r.want === 'approve' && r.candidateId === f.id)).map((f) => f.id));
  // a long shortlist is cut down to a day's worth of interviews before the first one
  const [chosen, setChosen] = useState<string[] | null>(() => (everyone.length <= INTERVIEW_LIMIT ? everyone.map((f) => f.id) : null));
  const pool = chosen ? everyone.filter((f) => chosen.includes(f.id)) : everyone;

  const [selectedId, setSelectedId] = useState(pool[0].id);
  // Each candidate's interview so far, in order; one answer typing live at a time.
  const [log, setLog] = useState<Record<string, Entry[]>>({});
  const [typing, setTyping] = useState<Typing | null>(null);
  const timer = useRef<number | null>(null);
  const hakanInterrupt = useGameStore((s) => s.hakanInterrupt);
  const answerCandidate = useGameStore((s) => s.answerCandidate);
  const endedFor = (id: string) => (log[id] ?? []).some((e) => e.kind === 'back' && e.choice !== null);
  // a candidate counts as interviewed once the conversation has been closed properly
  const interviewed = pool.filter((f) => endedFor(f.id)).length;
  const interruptsUsed = Object.values(log).flat().filter((e) => e.kind === 'hakan').length;
  const chatRef = useRef<HTMLDivElement>(null);
  const [confirming, setConfirming] = useState(false);

  const candidate = candidateOf(selectedId);
  const details = candidateDetails[selectedId];
  const selected = pool.find((f) => f.id === selectedId);

  useEffect(() => {
    audioEngine.setMusicMood('paused');
    return () => audioEngine.setMusicMood('work');
  }, []);

  const entries = log[selectedId] ?? [];
  const questions = entries.filter((e): e is Extract<Entry, { kind: 'q' }> => e.kind === 'q');
  // the questions you chose yourself count against the slot; follow-ups and Hakan Bey's don't
  const mine = questions.filter((e) => !e.by && e.q < FOLLOW).map((e) => e.q);
  const forbiddenDone = questions.some((e) => e.q === FORBIDDEN);
  const followUsed = questions.some((e) => e.q >= FOLLOW);
  const pending = entries.find((e): e is Extract<Entry, { kind: 'hakan' | 'back' }> => (e.kind === 'hakan' || e.kind === 'back') && e.choice === null);
  const ended = endedFor(selectedId);
  const lastOwn = [...questions].reverse().find((e) => !e.by && e.q < FORBIDDEN);
  const canFollow = !followUsed && lastOwn !== undefined && !typing && !pending && !ended;
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

  /** The candidate thinks for a beat, then types the answer out live. */
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

  function ask(question: number) {
    if (typing || pending || ended) return;
    const follow = question >= FOLLOW;
    if (follow ? !canFollow : questions.some((e) => e.q === question) || mine.length >= QUESTION_BUDGET) return;
    const id = selectedId;
    if (question === FORBIDDEN) askForbidden();
    // Hakan Bey cuts in after your first answer with the people his list was written for
    const interruptNext =
      !structured && !follow && question !== FORBIDDEN && mine.length === 0 && !forbiddenDone && !selected?.byManager &&
      hakanTarget(id, candidateOf(id).age) && interruptsUsed < HAKAN_INTERRUPTS;
    // otherwise he leans over once, after your first question that isn't on his list
    const whisperNext = !structured && !interruptNext && question !== FORBIDDEN && !whispered && mine.length === 0;
    if (whisperNext) setWhispered(true);
    audioEngine.playUi('click');
    push(id, { kind: 'q', q: question });
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

  function endInterview() {
    if (typing || pending || ended || mine.length === 0) return;
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
    if (question >= FOLLOW) return followUpAnswer(id, question - FOLLOW, candidateDetails[id].hireFit);
    return question === FORBIDDEN ? forbiddenAnswer(id, candidateOf(id).age) : candidateDetails[id].interview[question];
  }
  const questionText = (q: number) =>
    q >= FOLLOW ? FOLLOW_UP_QUESTIONS[q - FOLLOW] : q === FORBIDDEN ? forbiddenQuestion(selectedId, candidateOf(selectedId).age) : FINAL_INTERVIEW_QUESTIONS[q];
  const fit = details.hireFit;
  const leadHeard = mine.some((q) => q !== FORBIDDEN) && !typing;

  // one conversation at a time: while an answer is coming or a choice is waiting, you stay
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
            {structured && ' Bugün yapılandırılmış mülakat var: her adaya aynı sorular, Levent puan kartı tutuyor; Hakan Bey\'in listesi masada değil.'}
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
                  <span className={styles.avatar} style={{ background: c.color }}>
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
  
          <main className={styles.room} key={selectedId}>
            <section className={styles.conversation} aria-label="Görüşme">
              <header className={styles.roomHead}>
                <span className={`${styles.avatar} ${styles.avatarLarge}`} style={{ background: candidate.color }}>
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
  
              <div className={styles.log} ref={chatRef} aria-live="polite">
                {entries.length === 0 && (
                  <p className={styles.logEmpty}>
                    {candidate.name.split(' ')[0]} karşında oturuyor. Süren kısa: {QUESTION_BUDGET} soru ve bir takip sorusu. Aşağıdan ilk soruyu seç.
                  </p>
                )}
                {entries.map((e, index) => {
                  if (e.kind === 'note') return <Note key={index}>{e.text}</Note>;
                  if (e.kind === 'hakan')
                    return (
                      <div key={index} className={styles.exchange}>
                        <Turn who="Hakan Kaya" role="İK Müdürü" tone="hakan">
                          {forbiddenQuestion(selectedId, candidate.age)}
                        </Turn>
                        {e.choice === 'protect' && (
                          <>
                            <Turn who={PLAYER.name} role="İK Uzmanı" tone="you">
                              Hakan Bey, bu soruyu geçelim. Pozisyonla bir ilgisi yok.
                            </Turn>
                            <Note>Kısa bir sessizlik. Hakan Bey not defterine bir şey yazıyor: "…Peki. Devam edin."</Note>
                          </>
                        )}
                        {e.choice === 'silent' && <Note>Bir şey demiyorsun.</Note>}
                      </div>
                    );
                  if (e.kind === 'back') {
                    const back = backQuestionFor(selectedId);
                    return (
                      <div key={index} className={styles.exchange}>
                        <Turn who={candidate.name} role="Aday" tone="candidate">
                          {back.question}
                        </Turn>
                        {e.choice && (
                          <>
                            <Turn who={PLAYER.name} role="İK Uzmanı" tone="you">
                              {e.choice === 'honest' ? back.honest : back.polished}
                            </Turn>
                            <Turn who={candidate.name} role="Aday" tone="candidate">
                              {e.choice === 'honest' ? back.afterHonest : back.afterPolished}
                            </Turn>
                            <Note>{e.choice === 'honest' ? 'Hakan Bey boğazını temizliyor.' : 'Hakan Bey onaylar gibi başını sallıyor.'}</Note>
                          </>
                        )}
                      </div>
                    );
                  }
                  const live = typing && typing.candidateId === selectedId && typing.entry === index;
                  const answer = answerFor(selectedId, e.q);
                  return (
                    <div key={index} className={styles.exchange}>
                      {!e.by && (
                        <Turn who={PLAYER.name} role={e.q >= FOLLOW ? 'Takip sorusu' : e.q === FORBIDDEN ? "Hakan Bey'in listesinden" : 'İK Uzmanı'} tone={e.q === FORBIDDEN ? 'hakan' : 'you'}>
                          {questionText(e.q)}
                        </Turn>
                      )}
                      <Turn who={candidate.name} role="Aday" tone="candidate">
                        {live && typing.shown < 0 ? (
                          <span className={styles.thinking} aria-label="düşünüyor">
                            <i />
                            <i />
                            <i />
                          </span>
                        ) : (
                          <>
                            {live ? answer.slice(0, typing.shown) : answer}
                            {live && <span className={styles.caret} />}
                          </>
                        )}
                      </Turn>
                    </div>
                  );
                })}
              </div>
  
              <div className={styles.console}>
                {typing ? (
                  <p className={styles.consoleWait}>{candidate.name.split(' ')[0]} cevaplıyor…</p>
                ) : pending?.kind === 'hakan' ? (
                  <>
                    <p className={styles.consoleTitle}>Hakan Bey araya girdi. Ne yapıyorsun?</p>
                    <div className={styles.options}>
                      <button className={`${styles.option} ${styles.optionPrimary}`} onClick={() => respondHakan(true)}>
                        <b>Araya gir</b>
                        <span>"Hakan Bey, bu soruyu geçelim. Pozisyonla bir ilgisi yok."</span>
                      </button>
                      <button className={styles.option} onClick={() => respondHakan(false)}>
                        <b>Sessiz kal</b>
                        <span>Aday soruyu cevaplasın.</span>
                      </button>
                    </div>
                  </>
                ) : pending?.kind === 'back' ? (
                  <>
                    <p className={styles.consoleTitle}>{candidate.name.split(' ')[0]} bir soru soruyor. Nasıl cevaplıyorsun?</p>
                    <div className={styles.options}>
                      {(() => {
                        const back = backQuestionFor(selectedId);
                        return (
                          <>
                            <button className={styles.option} onClick={() => answerBack(true)}>
                              <b>Olduğu gibi anlat</b>
                              <span>{back.honest}</span>
                            </button>
                            <button className={styles.option} onClick={() => answerBack(false)}>
                              <b>Şirketi iyi göster</b>
                              <span>{back.polished}</span>
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  </>
                ) : ended ? (
                  <p className={styles.consoleWait}>Görüşme tamamlandı. {interviewed < pool.length ? 'Listeden sıradaki adayı seç.' : 'Tüm adaylarla görüştün; önerini sunabilirsin.'}</p>
                ) : (
                  <>
                    <p className={styles.consoleTitle}>
                      {mine.length < QUESTION_BUDGET ? `Soru seç · ${mine.length}/${QUESTION_BUDGET}` : 'Soru hakkın doldu.'}
                    </p>
                    <div className={styles.questionList}>
                      {mine.length < QUESTION_BUDGET &&
                        FINAL_INTERVIEW_QUESTIONS.map((q, i) =>
                          mine.includes(i) ? null : (
                            <button key={q} className={styles.question} onClick={() => ask(i)}>
                              <span className={styles.qNumber}>{i + 1}</span>
                              {q}
                            </button>
                          ),
                        )}
                      {canFollow && lastOwn && (
                        <button className={`${styles.question} ${styles.questionFollow}`} onClick={() => ask(FOLLOW + lastOwn.q)}>
                          <span className={styles.qNumber}>↳</span>
                          <span>
                            {FOLLOW_UP_QUESTIONS[lastOwn.q]}
                            <small>Takip sorusu · 1 hak</small>
                          </span>
                        </button>
                      )}
                      {!structured && !hakanChoice && !forbiddenDone && mine.length < QUESTION_BUDGET && (
                        <button className={`${styles.question} ${styles.questionRisk}`} onClick={() => ask(FORBIDDEN)} title="İş Kanunu'na göre ayrımcılık sayılabilir.">
                          <span className={styles.qNumber}>!</span>
                          <span>
                            {forbiddenQuestion(selectedId, candidate.age)}
                            <small>Hakan Bey'in listesinden · ayrımcılık sayılabilir</small>
                          </span>
                        </button>
                      )}
                    </div>
                    {mine.length > 0 && (
                      <button className={styles.endButton} onClick={endInterview}>
                        Görüşmeyi bitir →
                      </button>
                    )}
                  </>
                )}
              </div>
            </section>
  
            <aside className={styles.dossier} aria-label="Aday dosyası">
              <h3>Dosya</h3>
              <dl className={styles.facts}>
                <dt>Deneyim</dt>
                <dd>{candidate.experience}</dd>
                <dt>Maaş beklentisi</dt>
                <dd>{candidate.salary}</dd>
                <dt>Son görev</dt>
                <dd>{details.workHistory[0].title}</dd>
                <dt>Konum</dt>
                <dd>{details.location}</dd>
                <dt>Dil</dt>
                <dd>{details.languages}</dd>
                {selected && selected.day > 0 && (
                  <>
                    <dt>Mülakata çağrılma</dt>
                    <dd>{selected.day}. gün</dd>
                  </>
                )}
              </dl>
              <h3>Öne çıkanlar</h3>
              <ul className={styles.highlights}>
                {details.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
              <h3>{LEAD}'ın notu</h3>
              {leadHeard ? (
                <div className={styles.leadNote} role="status">
                  <p>"{leadView(selectedId, fit)}"</p>
                  {followUsed && !typing && <p>"{followUpVerdict(selectedId, fit)}"</p>}
                  {mine.includes(FORBIDDEN) && <small>Sonra alçak sesle: "O soruyu sormasaydın keşke."</small>}
                  {hakanChoice === 'protect' && <small>Sonra alçak sesle: "Araya girmen iyiydi."</small>}
                  {hakanChoice === 'silent' && <small>Sonra alçak sesle: "Hakan Bey o soruyu sorunca bir şey demedin."</small>}
                </div>
              ) : (
                <p className={styles.leadEmpty}>İlk cevaptan sonra ekip liderinin görüşü burada görünür.</p>
              )}
            </aside>
          </main>
  
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
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="confirm-hire">
          <div className={styles.modal}>
            <span className={`${styles.avatar} ${styles.avatarLarge}`} style={{ background: candidate.color }}>
              {candidate.initials}
            </span>
            <h2 id="confirm-hire">Önerin: {candidate.name}</h2>
            {(() => {
              // you recommend; the panel votes
              const panel = panelDecision(selectedId, pool, pastRequests);
              const first = (id: string) => candidateOf(id).name.split(' ')[0];
              return (
                <div className={styles.panelVotes}>
                  <p>
                    <b>{LEAD}:</b>{' '}
                    {panel.lead === selectedId
                      ? leadBacks(selectedId, fit)
                        ? '"Katılıyorum. Ekibe iyi gelir."'
                        : '"Aralarında en iyisi bu, katılıyorum."'
                      : panel.overBudget
                        ? `"${first(selectedId)} bütçeyi aşıyor. Tavanın içinde en iyisi ${first(panel.lead)}."`
                        : `"Ben ${accusative(first(panel.lead))} tercih ederim. Cevapları daha somuttu."`}
                  </p>
                  <p>
                    <b>Hakan Bey:</b>{' '}
                    {panel.his === selectedId
                      ? '"Bütçe onaylı. İmzalıyorum."'
                      : panel.his === NEPHEW_ID
                        ? '"Ben Okan\'dan yanayım. Uzun vadeli uyum önemli."'
                        : `"Ben ${accusative(first(panel.his))} daha uygun buluyorum."`}
                  </p>
                  <p className={styles.panelBudget}>Bütçe tavanı: {SALARY_CAP.toLocaleString('tr-TR')} TL/ay · üç oy ayrı düşerse karar ekip liderinin.</p>
                  <p className={styles.panelResult}>
                    Kurul kararı: <b>{candidateOf(panel.hired).name}</b>
                    {panel.hired !== selectedId && ' — önerin kabul edilmedi.'}
                  </p>
                </div>
              );
            })()}
            <p>Diğer adaylar için süreç burada biter. Bu karar geri alınamaz.</p>
            <div className={styles.modalActions}>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                Vazgeç
              </Button>
              <Button variant="gold" sound="none" onClick={() => hire(selectedId)}>
                Kurul Kararını Onayla
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const sourceOf = (f: Finalist) => (f.by ? (f.by === 'ayse' ? 'Ayşe seçti' : 'Emre seçti') : f.byManager ? 'Hakan Bey ekletti' : f.day > 0 ? `Sen çağırdın · ${f.day}. gün` : 'Referans');

/**
 * Friday morning, when the shortlist is longer than a day of interviews: who you'll actually
 * sit down with. Hakan Bey's people are already on it and can't be taken off.
 */
function PoolPicker({ everyone, locked, onConfirm }: { everyone: Finalist[]; locked: Set<string>; onConfirm: (ids: string[]) => void }) {
  const [picked, setPicked] = useState<string[]>(() => everyone.filter((f) => locked.has(f.id)).map((f) => f.id));
  const full = picked.length >= INTERVIEW_LIMIT;
  const toggle = (id: string) => {
    if (locked.has(id)) return;
    audioEngine.playUi('click');
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < INTERVIEW_LIMIT ? [...p, id] : p));
  };
  return (
    <section className={styles.picker} aria-labelledby="picker-title">
      <h2 id="picker-title" className={styles.pickerTitle}>
        Bugün kimlerle görüşeceksin?
      </h2>
      <p className={styles.pickerLead}>
        Kısa listede <b>{everyone.length}</b> kişi var; bir günde en fazla <b>{INTERVIEW_LIMIT}</b> mülakat yapılabiliyor. Hakan Bey'in istedikleri listede kalıyor; kalan yerleri sen
        seç. Seçmediklerine bu iş için dönülmeyecek.
      </p>
      <ul className={styles.pickerList}>
        {everyone.map((f) => {
          const c = candidateOf(f.id);
          const on = picked.includes(f.id);
          const isLocked = locked.has(f.id);
          return (
            <li key={f.id}>
              <label className={`${styles.pickerItem} ${on ? styles.pickerOn : ''} ${isLocked ? styles.pickerLocked : ''}`}>
                <input type="checkbox" checked={on} disabled={isLocked || (!on && full)} onChange={() => toggle(f.id)} />
                <span className={styles.avatar} style={{ background: c.color }}>
                  {c.initials}
                </span>
                <span className={styles.listText}>
                  <span className={styles.listName}>{c.name}</span>
                  <span className={styles.listRole}>{c.role.replace(' adayı', '')}</span>
                </span>
                <span className={styles.pickerSource}>{isLocked ? '🔒 ' : ''}{sourceOf(f)}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <div className={styles.pickerFoot}>
        <span className="mono">
          {picked.length}/{INTERVIEW_LIMIT} seçildi
        </span>
        <Button variant="gold" disabled={picked.length === 0} onClick={() => onConfirm(everyone.filter((f) => picked.includes(f.id)).map((f) => f.id))}>
          Mülakatlara başla →
        </Button>
      </div>
    </section>
  );
}
