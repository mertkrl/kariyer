import type { ReactNode, RefObject } from 'react';
import type { Candidate } from '../../game/types';
import { caseFor, expectedSalary, salaryOffer, salaryTalk } from '../../game/events/interview';
import type { BackQuestion } from '../../game/data/interviewExtras';
import { SALARY_CAP } from '../../game/store/store';
import { PLAYER } from '../../game/lib/player';
import { AnswerText, CaseCard } from './InterviewParts';
import { CASE, FOLLOW, FORBIDDEN, LEAD, QUESTION_BUDGET, SALARY_LINES, TEST, type Entry, type Typing } from './interviewModel';
import styles from './Conversation.module.css';

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
  /** Bugün henüz kimseyle görüşülmedi: oda nasıl işlediğini anlatır. */
  firstOfDay: boolean;
  /** Yapılandırılmış mülakat: Hakan Bey'in listesi masada değil. */
  structured: boolean;
  /** Adayın sonda soracağı sorular (deneyimine göre 0–2). */
  backs: BackQuestion[];
}

export function Conversation({ entries, selectedId, candidate, poolIds, typing, canFollow, chatRef, answerFor, questionText, ask, firstOfDay, structured, backs }: ConversationProps) {
  return (
      <div className={styles.log} ref={chatRef} aria-live="polite">
        {entries.length === 0 && (
          firstOfDay ? (
            <div className={styles.rules} role="note" aria-label="Bugün nasıl işliyor">
              <ol className={styles.steps}>
                <li>
                  <b>{QUESTION_BUDGET} soru</b> sen sor · <u>altı noktalı</u> ifadeye tıkla, takip et
                </li>
                <li>
                  <b>{LEAD}</b> teknik soru{structured ? '' : ', Hakan Bey "uyum" sorusu sorar'}
                </li>
                <li>
                  <b>Maaş</b> konuşulur, aday da soru sorabilir
                </li>
                <li>
                  <b>Puanla:</b> 4 ölçüt, 1–5
                </li>
              </ol>
              <span>{candidate.name.split(' ')[0]} karşında oturuyor. Aşağıdan ilk soruyu seç.</span>
            </div>
          ) : (
            <p className={styles.logEmpty}>
              {candidate.name.split(' ')[0]} karşında oturuyor. Önce senin {QUESTION_BUDGET} sorun ve bir takip; sonra söz Ümit'te.
            </p>
          )
        )}
        {entries.map((e, index) => {
          if (e.kind === 'note') return <Note key={index}>{e.text}</Note>;
          if (e.kind === 'handoff') return <Note key={index}>Söz {LEAD}'da.</Note>;
          if (e.kind === 'end') return <Note key={index}>Görüşme tamamlandı. Aday odadan çıkıyor.</Note>;
          if (e.kind === 'back') {
            const back = backs[e.n];
            if (!back) return null;
            return (
              <div key={index} className={styles.exchange}>
                <Turn who={candidate.name} role="Aday soruyor" tone="candidate">
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
                  </>
                )}
              </div>
            );
          }
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
                <Turn who={PLAYER.name} role={e.q === TEST ? 'Test sorusu' : e.q >= FOLLOW ? 'Takip sorusu' : 'İK Uzmanı'} tone="you">
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
