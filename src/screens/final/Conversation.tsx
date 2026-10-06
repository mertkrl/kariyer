import type { ReactNode, RefObject } from 'react';
import type { Candidate } from '../../game/types';
import { forbiddenQuestion } from '../../game/story';
import { backQuestionFor } from '../../game/data/interviewExtras';
import { caseFor, expectedSalary, salaryOffer, salaryTalk } from '../../game/interview';
import { SALARY_CAP } from '../../game/store';
import { PLAYER } from '../../game/player';
import { AnswerText, CaseCard } from './InterviewParts';
import { CASE, FOLLOW, FORBIDDEN, QUESTION_BUDGET, SALARY_LINES, type Entry, type Typing } from './interviewModel';
import styles from '../FinalRoundScreen.module.css';

/*
 * Odadaki kişiyle şimdiye kadarki konuşma, an an: senin soruların ve onun cevapları (canlı
 * olanı yazılırken), Hakan Bey'in araya girmesi, maaş konuşması, onun sana sorusu. Biten
 * cevaplar kurcalanabilir (altı çizili ifadeler) ve not alınabilir (✎).
 */

/** Konuşmanın tek satırı: kim konuşuyor, hangi rolde ve ne diyor. */
export function Turn({ who, role, tone, children }: { who: string; role: string; tone: 'you' | 'candidate' | 'hakan'; children: ReactNode }) {
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

/** Odada kimse konuşmadan olan şey. */
export function Note({ children }: { children: ReactNode }) {
  return <p className={styles.note}>{children}</p>;
}

export interface ConversationProps {
  entries: Entry[];
  selectedId: string;
  candidate: Candidate;
  poolIds: string[];
  typing: Typing | null;
  canFollow: boolean;
  chatRef: RefObject<HTMLDivElement | null>;
  answerFor: (id: string, question: number) => string;
  questionText: (q: number, about?: string) => string;
  ask: (question: number, about?: string) => void;
  isNoted: (sentence: string) => boolean;
  toggleNote: (sentence: string) => void;
  /** Bugün henüz kimseyle görüşülmedi: oda nasıl işlediğini anlatır. */
  firstOfDay: boolean;
}

export function Conversation({ entries, selectedId, candidate, poolIds, typing, canFollow, chatRef, answerFor, questionText, ask, isNoted, toggleNote, firstOfDay }: ConversationProps) {
  const pool = poolIds.map((id) => ({ id }));
  return (
      <div className={styles.log} ref={chatRef} aria-live="polite">
        {entries.length === 0 && (
          firstOfDay ? (
            <div className={styles.rules} role="note" aria-label="Bugün nasıl işliyor">
              <b>Bugün nasıl işliyor?</b>
              <ol>
                <li>
                  Her adaya <b>{QUESTION_BUDGET} soru</b> sorabilirsin; biri yerine kısa bir <b>kod vakası</b> da verebilirsin.
                </li>
                <li>
                  Cevaplardaki <u>altı noktalı ifadeye</u> tıklarsan onun üzerine bir <b>takip sorusu</b> sorarsın (aday başına bir hak).
                </li>
                <li>
                  <b>Maaşı konuşmadan</b> görüşmeyi bitiremezsin; bütçe tavanını aşan beklentiyi pazarlık edebilirsin.
                </li>
                <li>
                  Bir cümlenin sonundaki <b>✎</b> ile not al. <b>Önerini kurulda bu notlarla savunacaksın:</b> somut notlar ağır basar, belirsiz olanlar sayılmaz. Sağdaki
                  "kanıt gücü" ne kadar hazır olduğunu gösterir.
                </li>
                <li>Görüşme bitince adayı dört ölçütte puanla.</li>
              </ol>
              <span>{candidate.name.split(' ')[0]} karşında oturuyor. Aşağıdan ilk soruyu seç.</span>
            </div>
          ) : (
            <p className={styles.logEmpty}>
              {candidate.name.split(' ')[0]} karşında oturuyor. {QUESTION_BUDGET} soru (ya da vaka), bir takip, maaş; önemli cümleleri ✎ ile not almayı unutma.
            </p>
          )
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
          if (e.kind === 'salary') {
            const ask = expectedSalary(selectedId);
            const result = e.move ? salaryTalk(selectedId, e.move) : null;
            return (
              <div key={index} className={styles.exchange}>
                <Turn who={PLAYER.name} role="Maaş" tone="you">
                  Maaş beklentinizi konuşalım. Ne kadar bekliyorsunuz?
                </Turn>
                <Turn who={candidate.name} role="Aday" tone="candidate">
                  {ask ? `Aylık net ${ask.toLocaleString('tr-TR')} TL bekliyorum.` : candidate.salary}
                  {ask && ask > SALARY_CAP && ' Piyasada bu seviyede teklifler alıyorum.'}
                </Turn>
                {e.move && result && (
                  <>
                    <Turn who={PLAYER.name} role="Maaş" tone="you">
                      {SALARY_LINES[e.move](salaryOffer(selectedId, e.move) ?? 0)}
                    </Turn>
                    <Turn who={candidate.name} role="Aday" tone="candidate">
                      {result.reply}
                    </Turn>
                  </>
                )}
              </div>
            );
          }
          if (e.kind === 'back') {
            const back = backQuestionFor(selectedId, pool.map((f) => f.id));
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
                <Turn who={PLAYER.name} role={e.q === CASE ? 'Mini vaka' : e.q >= FOLLOW ? 'Takip sorusu' : e.q === FORBIDDEN ? "Hakan Bey'in listesinden" : 'İK Uzmanı'} tone={e.q === FORBIDDEN ? 'hakan' : 'you'}>
                  {questionText(e.q, e.about)}
                </Turn>
              )}
              {e.q === CASE && <CaseCard c={caseFor(selectedId, poolIds)} />}
              <Turn who={candidate.name} role="Aday" tone="candidate">
                {live && typing.shown < 0 ? (
                  <span className={styles.thinking} aria-label="düşünüyor">
                    <i />
                    <i />
                    <i />
                  </span>
                ) : (
                  <>
                    {live ? (
                      <>
                        {answer.slice(0, typing.shown)}
                        <span className={styles.caret} />
                      </>
                    ) : (
                      <AnswerText
                        text={answer}
                        fallback={e.q < FORBIDDEN ? (e.q as 0 | 1 | 2) : undefined}
                        canFollow={canFollow}
                        onFollow={e.q < FORBIDDEN && !e.by ? (kind, phrase) => ask(FOLLOW + kind, phrase) : undefined}
                        noted={isNoted}
                        onNote={toggleNote}
                      />
                    )}
                  </>
                )}
              </Turn>
            </div>
          );
        })}
      </div>
  );
}
