import { useEffect, useRef, useState } from 'react';
import { accusative } from '../game/turkish';
import { SALARY_CAP, panelDecision, useGameStore, type Finalist } from '../game/store';
import { forbiddenAnswer, forbiddenQuestion } from '../game/story';
import { candidates } from '../game/data/candidates';
import { candidateDetails, FINAL_INTERVIEW_QUESTIONS } from '../game/data/candidateDetails';
import { FINALIST_LIMIT } from '../game/data/days';
import { backQuestionFor, followUpAnswer, followUpVerdict, FOLLOW_UP_QUESTIONS, HAKAN_INTERRUPTS, hakanTarget } from '../game/data/interviewExtras';
import { Button } from '../components/ui/Button';
import { SoundToggle } from '../components/ui/SoundToggle';
import { audioEngine } from '../audio/audioEngine';
import styles from './FinalRoundScreen.module.css';

/** When nobody was advanced all week, management fills the final with its internal reference. */
const FALLBACK: Finalist[] = [{ id: 'okan', day: 0 }];
/** The rest of the team screened too: their shortlists sit in the same room on Friday. */
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
  const [whisper, setWhisper] = useState(false);
  const [whispered, setWhispered] = useState(false);
  const forced = finalists.length === 0;
  const pool = [...(forced ? FALLBACK : finalists), ...COLLEAGUES.filter((c) => !finalists.some((f) => f.id === c.id))];

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

  const candidate = candidates[selectedId];
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
  const pending = entries.find((e) => e.kind !== 'q' && e.choice === null);
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
      hakanTarget(id, candidates[id].age) && interruptsUsed < HAKAN_INTERRUPTS;
    // otherwise he leans over once, after your first question that isn't on his list
    if (!structured && !interruptNext && question !== FORBIDDEN && !whispered && mine.length === 0) {
      setWhispered(true);
      window.setTimeout(() => setWhisper(true), 1200);
    }
    audioEngine.playUi('click');
    push(id, { kind: 'q', q: question });
    typeAnswer(id, entries.length, answerFor(id, question), interruptNext ? () => push(id, { kind: 'hakan', choice: null }) : undefined);
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
      typeAnswer(id, entries.length, forbiddenAnswer(id, candidates[id].age));
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
    return question === FORBIDDEN ? forbiddenAnswer(id, candidates[id].age) : candidateDetails[id].interview[question];
  }
  const questionText = (q: number) =>
    q >= FOLLOW ? FOLLOW_UP_QUESTIONS[q - FOLLOW] : q === FORBIDDEN ? forbiddenQuestion(selectedId, candidates[selectedId].age) : FINAL_INTERVIEW_QUESTIONS[q];
  const fit = details.hireFit;
  const leadHeard = mine.some((q) => q !== FORBIDDEN) && !typing;

  function select(id: string, index: number) {
    audioEngine.playUi('select', index % 4);
    setSelectedId(id);
    finishTyping();
  }

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

      <div className={styles.body}>
        <aside className={styles.list} aria-label="Mülakat adayları">
          <div className={styles.listLabel}>Mülakat Adayları</div>
          {pool.map((f, i) => {
            const c = candidates[f.id];
            const isSelected = f.id === selectedId;
            return (
              <button
                key={f.id}
                className={`${styles.listItem} ${isSelected ? styles.listItemSelected : ''}`}
                onClick={() => select(f.id, i)}
              >
                <span className={styles.avatar} style={{ background: c.color }}>
                  {c.initials}
                </span>
                <span className={styles.listText}>
                  <span className={styles.listName}>{c.name}</span>
                  <span className={styles.listRole}>{c.role.replace(' adayı', '')}</span>
                </span>
                <span className={styles.listMeta}>
                  {f.by ? <span className={styles.teamBadge}>{f.by === 'ayse' ? 'Ayşe' : 'Emre'}</span> : f.byManager ? <span className={styles.refBadge}>Hakan Bey</span> : f.day > 0 ? <span className={`${styles.dayBadge} mono`}>G{f.day}</span> : <span className={styles.refBadge}>Referans</span>}
                  {endedFor(f.id) && <span className={styles.readDot} title="Görüşüldü" />}
                </span>
              </button>
            );
          })}
        </aside>

        <main className={styles.profile} key={selectedId}>
          <div className={styles.profileHead}>
            <span className={`${styles.avatar} ${styles.avatarLarge}`} style={{ background: candidate.color }}>
              {candidate.initials}
            </span>
            <div className={styles.profileNames}>
              <h2>{candidate.name}</h2>
              <div className={styles.profileSub}>
                {candidate.age} yaşında · {candidate.role}
              </div>
              <div className={styles.profileMeta}>
                <span>📍 {details.location}</span>
                <span>🗣 {details.languages}</span>
                {selected && selected.day > 0 && <span>{selected.day}. gün mülakata çağrıldı</span>}
              </div>
            </div>
          </div>

          <div className={styles.facts}>
            <div>
              <span className={styles.factLabel}>Deneyim</span>
              <span className={styles.factValue}>{candidate.experience}</span>
            </div>
            <div>
              <span className={styles.factLabel}>Maaş Beklentisi</span>
              <span className={styles.factValue}>{candidate.salary}</span>
            </div>
            <div>
              <span className={styles.factLabel}>Son Görev</span>
              <span className={styles.factValue}>{details.workHistory[0].title}</span>
            </div>
          </div>

          <section className={styles.transcript} aria-label="Canlı mülakat">
            <div className={styles.transcriptLabel}>
              Canlı Mülakat
              <span className="mono">
                {mine.length}/{QUESTION_BUDGET} soru
              </span>
            </div>
            <div className={styles.chat} ref={chatRef}>
              {entries.length === 0 && (
                <div className={styles.chatEmpty}>
                  {candidate.name.split(' ')[0]} karşında oturuyor. Süren kısa: {QUESTION_BUDGET} soru ve bir takip sorusu. Hangilerini soracaksın?
                </div>
              )}
              {entries.map((e, index) => {
                if (e.kind === 'hakan') {
                  return (
                    <div key={index} className={styles.qa}>
                      <div className={`${styles.question} ${styles.questionForbidden}`}>
                        <span className={`${styles.speaker} ${styles.speakerHakan}`}>HB</span>
                        <span>
                          <small className={styles.stage}>Hakan Bey araya giriyor:</small> {forbiddenQuestion(selectedId, candidate.age)}
                        </span>
                      </div>
                      {e.choice === 'protect' && (
                        <>
                          <div className={styles.question}>
                            <span className={styles.speaker}>İK</span>
                            Hakan Bey, bu soruyu geçelim. Pozisyonla bir ilgisi yok.
                          </div>
                          <div className={styles.stageNote}>(Kısa bir sessizlik. Hakan Bey not defterine bir şey yazıyor.) "…Peki. Devam edin."</div>
                        </>
                      )}
                      {e.choice === 'silent' && <div className={styles.stageNote}>(Sen bir şey demiyorsun.)</div>}
                    </div>
                  );
                }
                if (e.kind === 'back') {
                  const back = backQuestionFor(selectedId);
                  return (
                    <div key={index} className={styles.qa}>
                      <div className={styles.answer}>
                        <span className={`${styles.speaker} ${styles.speakerCandidate}`}>{candidate.initials}</span>
                        <span>"{back.question}"</span>
                      </div>
                      {e.choice && (
                        <>
                          <div className={styles.question}>
                            <span className={styles.speaker}>İK</span>
                            {e.choice === 'honest' ? back.honest : back.polished}
                          </div>
                          <div className={styles.answer}>
                            <span className={`${styles.speaker} ${styles.speakerCandidate}`}>{candidate.initials}</span>
                            <span>"{e.choice === 'honest' ? back.afterHonest : back.afterPolished}"</span>
                          </div>
                          <div className={styles.stageNote}>
                            {e.choice === 'honest' ? '(Hakan Bey boğazını temizliyor.)' : '(Hakan Bey onaylar gibi başını sallıyor.)'}
                          </div>
                        </>
                      )}
                    </div>
                  );
                }
                const live = typing && typing.candidateId === selectedId && typing.entry === index;
                const answer = answerFor(selectedId, e.q);
                return (
                  <div key={index} className={styles.qa}>
                    {!e.by && (
                      <div className={`${styles.question} ${e.q === FORBIDDEN ? styles.questionForbidden : ''}`}>
                        <span className={styles.speaker}>İK</span>
                        <span>
                          {e.q >= FOLLOW && <small className={styles.stage}>Takip sorusu:</small>} {questionText(e.q)}
                        </span>
                      </div>
                    )}
                    <div className={styles.answer}>
                      <span className={`${styles.speaker} ${styles.speakerCandidate}`}>{candidate.initials}</span>
                      {live && typing.shown < 0 ? (
                        <span className={styles.thinking} aria-label="yazıyor">
                          <i />
                          <i />
                          <i />
                        </span>
                      ) : (
                        <span>
                          "{live ? answer.slice(0, typing.shown) : answer}
                          {live ? <span className={styles.caret} /> : '"'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className={styles.questionPicker}>
              {pending?.kind === 'hakan' && !typing && (
                <>
                  <button className={`${styles.questionChip} ${styles.chipProtect}`} onClick={() => respondHakan(true)}>
                    <span className={styles.chipIcon}>✋</span>
                    "Hakan Bey, bu soruyu geçelim. Pozisyonla bir ilgisi yok."
                  </button>
                  <button className={styles.questionChip} onClick={() => respondHakan(false)}>
                    <span className={styles.chipIcon}>…</span>
                    Sessiz kal, aday cevaplasın.
                  </button>
                </>
              )}
              {pending?.kind === 'back' && (() => {
                const back = backQuestionFor(selectedId);
                return (
                  <>
                    <button className={styles.questionChip} onClick={() => answerBack(true)}>
                      <span className={styles.chipIcon}>↩</span>
                      <span>
                        {back.honest}
                        <small className={styles.choiceTag}>Olduğu gibi anlat</small>
                      </span>
                    </button>
                    <button className={styles.questionChip} onClick={() => answerBack(false)}>
                      <span className={styles.chipIcon}>↩</span>
                      <span>
                        {back.polished}
                        <small className={styles.choiceTag}>Şirketi iyi göster</small>
                      </span>
                    </button>
                  </>
                );
              })()}
              {!pending && !ended && mine.length < QUESTION_BUDGET &&
                FINAL_INTERVIEW_QUESTIONS.map((q, i) => {
                  const done = mine.includes(i);
                  return (
                    <button
                      key={q}
                      className={`${styles.questionChip} ${done ? styles.chipDone : ''}`}
                      disabled={done || Boolean(typing)}
                      onClick={() => ask(i)}
                    >
                      <span className={styles.chipIcon}>{done ? '✓' : '?'}</span>
                      {q}
                    </button>
                  );
                })}
              {!structured && !hakanChoice && !pending && !ended && mine.length < QUESTION_BUDGET && (
                <button
                  className={`${styles.questionChip} ${styles.chipForbidden} ${forbiddenDone ? styles.chipDone : ''}`}
                  disabled={forbiddenDone || Boolean(typing)}
                  onClick={() => ask(FORBIDDEN)}
                  title="Hakan Bey'in listesinden. İş Kanunu'na göre ayrımcılık sayılabilir."
                >
                  <span className={styles.chipIcon}>{forbiddenDone ? '✓' : '!'}</span>
                  {forbiddenQuestion(selectedId, candidate.age)}
                  <small>Hakan Bey'in listesinden</small>
                </button>
              )}
              {canFollow && lastOwn && (
                <button className={`${styles.questionChip} ${styles.chipFollow}`} onClick={() => ask(FOLLOW + lastOwn.q)}>
                  <span className={styles.chipIcon}>↳</span>
                  <span>
                    {FOLLOW_UP_QUESTIONS[lastOwn.q]}
                    <small className={styles.choiceTag}>Takip sorusu · 1 hak</small>
                  </span>
                </button>
              )}
              {!pending && !ended && mine.length > 0 && !typing && (
                <button className={`${styles.questionChip} ${styles.chipEnd}`} onClick={endInterview}>
                  {mine.length >= QUESTION_BUDGET ? 'Süre doldu. Görüşmeyi bitir →' : 'Görüşmeyi bitir →'}
                </button>
              )}
              {ended && <div className={styles.outOfTime}>Görüşme bitti.</div>}
            </div>
          </section>

          {leadHeard && (
            <div className={styles.leadNote} role="status">
              <b>👨‍💻 {LEAD} · Yazılım Ekip Lideri</b>
              <span>"{leadView(selectedId, fit)}"</span>
              {followUsed && !typing && <span>"{followUpVerdict(selectedId, fit)}"</span>}
              {mine.includes(FORBIDDEN) && <small>Sonra alçak sesle: "O soruyu sormasaydın keşke."</small>}
              {hakanChoice === 'protect' && <small>Sonra alçak sesle: "Araya girmen iyiydi."</small>}
              {hakanChoice === 'silent' && <small>Sonra alçak sesle: "Hakan Bey o soruyu sorunca bir şey demedin."</small>}
            </div>
          )}

          <div className={styles.historyRow}>
            {details.highlights.map((h) => (
              <span key={h} className={styles.highlight}>
                ★ {h}
              </span>
            ))}
          </div>

          <div className={styles.hireBar}>
            <span className={styles.hireHint}>
              {interviewed < pool.length
                ? `Öneri için önce herkesle görüşmeyi bitir: ${pool.length - interviewed} aday kaldı.`
                : 'Tüm adaylarla görüştün.'}
            </span>
            <Button
              variant="gold"
              sound="click"
              onClick={() => setConfirming(true)}
              disabled={interviewed < pool.length}
              title={interviewed < pool.length ? 'Önce bütün adaylarla görüş' : undefined}
            >
              {accusative(candidate.name.split(' ')[0])} Öner →
            </Button>
          </div>
        </main>
      </div>

      {whisper && (
        <div className={styles.whisper} role="status" onClick={() => setWhisper(false)}>
          <b>Hakan Bey kulağına eğiliyor:</b> "Listedeki soruları da sor. Aile planı, memleket, emeklilik… Uzun vadeli uyum önemli."
          <small>Kapatmak için tıkla</small>
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
              const first = (id: string) => candidates[id].name.split(' ')[0];
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
                      : panel.his === 'okan'
                        ? '"Ben Okan\'dan yanayım. Uzun vadeli uyum önemli."'
                        : `"Ben ${accusative(first(panel.his))} daha uygun buluyorum."`}
                  </p>
                  <p className={styles.panelBudget}>Bütçe tavanı: {SALARY_CAP.toLocaleString('tr-TR')} TL/ay · üç oy ayrı düşerse karar ekip liderinin.</p>
                  <p className={styles.panelResult}>
                    Kurul kararı: <b>{candidates[panel.hired].name}</b>
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
