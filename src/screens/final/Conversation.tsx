import type { ReactNode, RefObject } from 'react';
import type { Candidate } from '../../game/types';
import { caseFor, expectedSalary, salaryOffer, salaryTalk } from '../../game/interview';
import { SALARY_CAP } from '../../game/store';
import { PLAYER } from '../../game/player';
import { AnswerText, CaseCard } from './InterviewParts';
import { CASE, FOLLOW, FORBIDDEN, LEAD, QUESTION_BUDGET, SALARY_LINES, type Entry, type Typing } from './interviewModel';
import styles from '../FinalRoundScreen.module.css';

/*
 * Odadaki kişiyle şimdiye kadarki konuşma, an an: senin soruların ve onun cevapları (canlı
 * olanı yazılırken), Ümit'in teknik sorusu, Hakan Bey'in uyum sorusu ve maaş konuşması. Biten
 * cevaplar kurcalanabilir (altı çizili ifadeler) ve not alınabilir (✎).
 */

/** Konuşmanın tek satırı: kim konuşuyor, hangi rolde ve ne diyor. */
export function Turn({ who, role, tone, children }: { who: string; role: string; tone: 'you' | 'candidate' | 'hakan' | 'lead'; children: ReactNode }) {
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
  /** Yapılandırılmış mülakat: Hakan Bey'in listesi masada değil. */
  structured: boolean;
}

export function Conversation({ entries, selectedId, candidate, poolIds, typing, canFollow, chatRef, answerFor, questionText, ask, isNoted, toggleNote, firstOfDay, structured }: ConversationProps) {
  return (
      <div className={styles.log} ref={chatRef} aria-live="polite">
        {entries.length === 0 && (
          firstOfDay ? (
            <div className={styles.rules} role="note" aria-label="Bugün nasıl işliyor">
              <b>Bugün nasıl işliyor?</b>
              <ol>
                <li>
                  Önce sen sorarsın: <b>{QUESTION_BUDGET} klasik soru</b>. Cevaplardaki <u>altı noktalı ifadeye</u> tıklarsan bir <b>takip sorusu</b> da sorabilirsin.
                </li>
                <li>
                  Sorularını bitirince söz <b>{LEAD}</b>'a geçer: teknik soruyu o sorar.{structured ? '' : ' Ardından Hakan Bey kendi listesinden bir "uyum" sorusu sorar.'} Araya giremezsin.
                </li>
                <li>
                  Sonra <b>maaşı konuşursun</b>; bütçe tavanını aşan beklentiyi pazarlık edebilirsin.
                </li>
                <li>
                  Bir cümlenin sonundaki <b>✎</b> ile not al; görüşme bitince adayı dört ölçütte puanla. Puanın kurulda Ümit'in ve Hakan Bey'in puanlarıyla yan yana durur.
                </li>
              </ol>
              <span>{candidate.name.split(' ')[0]} karşında oturuyor. Aşağıdan ilk soruyu seç.</span>
            </div>
          ) : (
            <p className={styles.logEmpty}>
              {candidate.name.split(' ')[0]} karşında oturuyor. Önce senin {QUESTION_BUDGET} sorun ve bir takip; sonra söz Ümit'te. Önemli cümleleri ✎ ile not almayı unutma.
            </p>
          )
        )}
        {entries.map((e, index) => {
          if (e.kind === 'note') return <Note key={index}>{e.text}</Note>;
          if (e.kind === 'handoff') return <Note key={index}>Söz {LEAD}'da.</Note>;
          if (e.kind === 'end') return <Note key={index}>Görüşme tamamlandı. Aday odadan çıkıyor.</Note>;
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
          const live = typing && typing.candidateId === selectedId && typing.entry === index;
          const answer = answerFor(selectedId, e.q);
          return (
            <div key={index} className={styles.exchange}>
              {e.by === 'levent' ? (
                <Turn who={LEAD} role="Yazılım Ekip Lideri · teknik soru" tone="lead">
                  {questionText(e.q, e.about)}
                </Turn>
              ) : e.by === 'hakan' ? (
                <Turn who="Hakan Kaya" role="İK Müdürü" tone="hakan">
                  {questionText(e.q, e.about)}
                </Turn>
              ) : (
                <Turn who={PLAYER.name} role={e.q >= FOLLOW ? 'Takip sorusu' : 'İK Uzmanı'} tone="you">
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
