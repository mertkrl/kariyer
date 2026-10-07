import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../game/store/store';
import { forbiddenQuestion } from '../game/day/story';
import { candidateOf } from '../game/data/candidates';
import { candidateDetails, FINAL_INTERVIEW_QUESTIONS } from '../game/data/candidateDetails';
import { FOLLOW_UP_QUESTIONS } from '../game/data/interviewExtras';
import { Button } from '../components/ui/Button';
import { INTERVIEWER, handOver, ownerOf } from '../game/events/panel';
import { SoundToggle } from '../components/ui/SoundToggle';
import { audioEngine } from '../audio/audioEngine';
import { CASE, COLLEAGUES, FALLBACK, FOLLOW, FORBIDDEN, INTERVIEW_LIMIT, LEAD, QUESTION_BUDGET } from './final/interviewModel';
import { useInterview } from './final/useInterview';
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
  const chatRef = useRef<HTMLDivElement>(null);
  const [confirming, setConfirming] = useState(false);
  const interview = useInterview({ selectedId, ownIds: own.map((f) => f.id), structured });
  const { entries, typing, room, backs, canFollow, busy, interviewed, stateOf, answerFor, ask, handOff, talkSalary, answerBack, endInterview, myNotes, isNoted, toggleNote, scores, setScore, myScores, agreed } = interview;
  const { mine, followUsed, handedOff, salaryPending, backsDone, backPending, ended, questions } = room;
  const poolIds = own.map((f) => f.id);

  const candidate = candidateOf(selectedId);
  const details = candidateDetails[selectedId];
  const selected = everyone.find((f) => f.id === selectedId);
  const isMine = ownerOfId(selectedId) === 'you';

  useEffect(() => {
    audioEngine.setMusicMood('paused');
    return () => audioEngine.setMusicMood('work');
  }, []);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [interview.log, typing, selectedId]);

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

  function select(id: string, index: number) {
    if (busy && id !== selectedId) return;
    audioEngine.playUi('select', index % 4);
    setSelectedId(id);
  }
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
                    onScore={setScore}
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
