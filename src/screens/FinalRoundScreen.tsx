import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../game/store/store';
import { forbiddenQuestion } from '../game/day/story';
import { candidateOf } from '../game/data/candidates';
import { candidateDetails, FINAL_INTERVIEW_QUESTIONS } from '../game/data/candidateDetails';
import { FOLLOW_UP_QUESTIONS } from '../game/data/interviewExtras';
import { Button } from '../components/ui/Button';
import { INTERVIEWER, ownerOf } from '../game/events/panel';
import { SoundToggle } from '../components/ui/SoundToggle';
import { audioEngine } from '../audio/audioEngine';
import { CASE, COLLEAGUES, FALLBACK, FOLLOW, FORBIDDEN, INTERVIEW_LIMIT, LEAD, OWNER, PANEL_SIZE, QUESTION_BUDGET, TEST, ownerQuestion, runnerFor } from './final/interviewModel';
import { APTITUDE_CUTOFF } from '../game/events/aptitude';
import { candidateAptitude, testTalk } from '../game/events/aptitude';
import { useInterview } from './final/useInterview';
import { PoolPicker } from './final/PoolPicker';
import { Conversation } from './final/Conversation';
import { Dossier } from './final/Dossier';
import { HireModal } from './final/HireModal';
import { InterviewConsole } from './final/InterviewConsole';
import styles from './FinalRoundScreen.module.css';
import { avatarStyle } from '../components/ui/avatarStyle';

/*
 * Cuma: panel günü. Kendi çağırdıklarınla görüşmeyi sen yürütürsün: açarsın, klasik sorularını
 * sorarsın; Ümit bir durum sorusu, Hakan Bey "uyum" sorusu sorar; maaşı konuşur, puanlarsın.
 * Ekibin (Ayşe, Emre, Hakan Bey) adaylarında görüşmeyi onlar yürütür, kendi tarzlarıyla; sen
 * gözlemcisin, en fazla iki soru sorar ve puanını verirsin. Gün sonunda kurul puanları yan yana koyar.
 */
export function FinalRoundScreen() {
  const finalists = useGameStore((s) => s.finalists);
  const hire = useGameStore((s) => s.hire);
  const pastRequests = useGameStore((s) => s.story.pastRequests);
  const seed = useGameStore((s) => s.seed);
  // Hakan Bey yapılandırılmış mülakatı kabul etti: herkese aynı sorular, onun listesi masada değil
  const structured = useGameStore((s) => s.story.reform?.kind === 'structured' && s.story.reform.accepted);
  const forced = finalists.length === 0;
  const everyone = [...(forced ? FALLBACK : finalists), ...COLLEAGUES.filter((c) => !finalists.some((f) => f.id === c.id))];
  const mineAll = everyone.filter((f) => ownerOf(f, pastRequests) === 'you');
  const others = everyone.filter((f) => ownerOf(f, pastRequests) !== 'you');
  // senin günün yalnızca kendi adaylarını alır; uzun bir liste sabah kısaltılır
  const [chosen, setChosen] = useState<string[] | null>(() => (mineAll.length <= INTERVIEW_LIMIT ? mineAll.map((f) => f.id) : null));
  const own = chosen ? mineAll.filter((f) => chosen.includes(f.id)) : mineAll;
  // kalan yerleri ekibin listeleri doldurur: önce Hakan Bey'in adayı, sonra Ayşe ile Emre sırayla
  const byOwner = (o: string) => others.filter((f) => ownerOf(f, pastRequests) === o);
  const queue = [...byOwner('hakan')];
  const [ayse, emre] = [byOwner('ayse'), byOwner('emre')];
  for (let i = 0; i < Math.max(ayse.length, emre.length); i++) queue.push(...[ayse[i], emre[i]].filter(Boolean));
  const panelPool = [...own, ...queue.slice(0, Math.max(0, PANEL_SIZE - own.length))];
  const ownerOfId = (id: string) => ownerOf((panelPool.find((f) => f.id === id) ?? everyone.find((f) => f.id === id))!, pastRequests);

  const [selectedId, setSelectedId] = useState((own[0] ?? others[0]).id);
  const sitting = panelPool.filter((f) => ownerOf(f, pastRequests) !== 'you');
  // tek liste: kimin getirdiği rozette; kimin yürüteceği görüşme açılınca belli olur
  const groups = [{ label: 'Bugünün adayları', items: [...own, ...sitting] }];
  const listOrder = groups.flatMap((g) => g.items);
  const chatRef = useRef<HTMLDivElement>(null);
  const [confirming, setConfirming] = useState(false);
  const runnerOfId = (id: string) => runnerFor(id, seed, ownerOfId(id));
  const interview = useInterview({ selectedId, ownIds: panelPool.map((f) => f.id), structured, ownerOf: ownerOfId, runnerOf: runnerOfId });
  const { entries, typing, room, backs, canFollow, busy, interviewed, stateOf, answerFor, open, rattled, observed, ask, handOff, talkSalary, answerBack, endInterview, scores, setScore, myScores, agreed } = interview;
  const { mine, followUsed, handedOff, salaryPending, backsDone, backPending, ended, questions } = room;
  const poolIds = panelPool.map((f) => f.id);

  const candidate = candidateOf(selectedId);
  const details = candidateDetails[selectedId];
  const selected = everyone.find((f) => f.id === selectedId);
  const bringer = ownerOfId(selectedId);

  useEffect(() => {
    audioEngine.setMusicMood('paused');
    return () => audioEngine.setMusicMood('work');
  }, []);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [interview.log, typing, selectedId]);

  const questionText = (q: number, about?: string, by?: string) =>
    q >= OWNER && (by === 'ayse' || by === 'emre' || by === 'hakan')
      ? ownerQuestion(by, FINAL_INTERVIEW_QUESTIONS[q - OWNER], candidateAptitude(selectedId, seed).score, APTITUDE_CUTOFF, by === bringer, by === runnerOfId(selectedId))
      : q === TEST
      ? testTalk(selectedId, seed).question
      : q === CASE
      ? 'Size bir durum anlatayım; sizce ne yapardınız?'
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
  const done = interviewed;
  const total = panelPool.length;
  const panelLead = [LEAD.split(' ')[0], structured || bringer === 'hakan' ? null : 'Hakan Bey'].filter(Boolean).join(', ');
  const runner = runnerOfId(selectedId);
  // kimin sürdüreceği açılıştan sonra belli olur
  const shownObserved = observed && room.warm !== null;
  const hostName = shownObserved ? INTERVIEWER[runner].name.split(' ')[0] : null;
  const askedClassic = questions.map((e) => (e.q >= OWNER ? e.q - OWNER : e.q)).filter((q) => q >= 0 && q < FORBIDDEN);
  const rattledIds = new Set(poolIds.filter(rattled));
  const ready = done === total && !busy;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Gün 5 · Cuma · Mülakatlar</div>
          <h1 className={styles.title}>Mülakat Günü</h1>
          <p className={styles.subtitle}>
            Bütçe kesildi: <strong>sadece 1 kişi</strong> işe alınacak. Her görüşmeyi sen açarsın; sonra görüşmeyi kim sürdürecekse o devam eder. Başkası sürdürürken en fazla 2 soru sorabilirsin.
            {structured && ' Bugün yapılandırılmış mülakat var: Hakan Bey\'in listesi masada değil.'}
          </p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.counter}>
            <span className={`${styles.counterValue} mono`}>
              {done}/{total}
            </span>
            <span className={styles.counterLabel}>görüşme tamamlandı</span>
          </div>
          <SoundToggle variant="inline" />
        </div>
      </header>

      {forced && (
        <div className={styles.forcedNote}>
          Perşembe kimseyi mülakata çağırmadın (üç hakkın vardı). Senin listenin yerini yönetimin iç referansı aldı; bugün senin odan boş, kurulda diğerlerinin
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
            {groups.map((group) =>
              group.items.length === 0 ? null : (
                <div key={group.label}>
                  <div className={styles.listLabel}>{group.label}</div>
                  {group.items.map((f) => {
                    const i = listOrder.indexOf(f);
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
                          <span className={`${styles.listState} ${styles['state_' + stateOf(f.id)]}`}>
                            {{ waiting: 'Görüşülmedi', active: 'Görüşme sürüyor', done: 'Görüşüldü' }[stateOf(f.id)]}
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
                <span className={`${styles.roomState} ${styles['state_' + stateOf(selectedId)]}`}>
                  {ended ? 'Görüşme tamamlandı' : hostName ? `${hostName} yürütüyor · sorun ${mine.length}/${QUESTION_BUDGET}` : entries.length ? `Soru ${mine.length}/${QUESTION_BUDGET}` : 'Görüşme başlamadı'}
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
                firstOfDay={interviewed === 0}
                structured={structured}
                backs={backs}
                host={shownObserved ? (runner as 'ayse' | 'emre' | 'hakan') : null}
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
                allDone={done === total}
                mine={mine}
                canFollow={canFollow}
                canTest={!room.testUsed}
                scores={scores[selectedId] ?? {}}
                onScore={setScore}
                ask={ask}
                handOff={handOff}
                talkSalary={talkSalary}
                endInterview={endInterview}
                opening={room.warm === null}
                hostName={hostName}
                asked={askedClassic}
                open={open}
                panelLead={panelLead}
              />
            </section>

            <Dossier
              candidate={candidate}
              details={details}
              selectedId={selectedId}
              invitedOn={selected?.day ?? 0}
              agreed={agreed}
              leadHeard={leadHeard}
              fit={fit}
              testScore={candidateAptitude(selectedId, seed).score}
              followUsed={followUsed && !typing}
              caseAsked={leadHeard}
              rattled={leadHeard && rattled(selectedId)}
            />
          </div>

          <div className={styles.hireBar}>
            <span className={styles.hireHint}>
              {done < total ? `Kurula geçmeden önce bütün görüşmeleri bitir: ${total - done} görüşme kaldı.` : 'Görüşmeler bitti. Kurul toplanıyor.'}
            </span>
            <Button variant="gold" sound="click" onClick={() => setConfirming(true)} disabled={!ready} title={ready ? undefined : 'Önce bütün görüşmeleri bitir'}>
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
          sitIn={Object.fromEntries(sitting.map((f) => [f.id, myScores[f.id] ?? null]))}
          rattled={rattledIds}
          structured={structured}
          agreed={agreed}
          onClose={() => setConfirming(false)}
          onConfirm={(decided, recommended) => hire(recommended, { agreed, decided })}
        />
      )}
    </div>
  );
}
