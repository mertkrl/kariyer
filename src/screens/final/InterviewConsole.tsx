import type { Candidate } from '../../game/types';
import type { Finalist } from '../../game/store';
import { SALARY_CAP } from '../../game/store';
import { forbiddenQuestion } from '../../game/story';
import { FINAL_INTERVIEW_QUESTIONS } from '../../game/data/candidateDetails';
import { backQuestionFor } from '../../game/data/interviewExtras';
import { expectedSalary, salaryMoves, salaryOffer, type CRITERIA, type SalaryMove, type Scores } from '../../game/interview';
import { Scorecard } from './InterviewParts';
import { CASE, FORBIDDEN, QUESTION_BUDGET, SALARY_LABEL, SALARY_LINES } from './interviewModel';
import styles from '../FinalRoundScreen.module.css';

/*
 * Konuşmanın altındaki şerit: şu anda ne yapabileceğin. Bir soru (ya da vaka) seç, maaşı konuş,
 * Hakan Bey araya girince tepki ver, adayın kendi sorusunu cevapla ve mülakat bitince puanla.
 */
export interface InterviewConsoleProps {
  candidate: Candidate;
  pool: Finalist[];
  /** Bir cevap yazılıyor. */
  typing: boolean;
  /** Odanın beklediği bir seçim. */
  pending: 'hakan' | 'back' | 'salary' | null;
  ended: boolean;
  interviewed: number;
  /** Kendi sorduğun sorular (interviewModel'deki kodlar). */
  mine: number[];
  canFollow: boolean;
  salaryOpened: boolean;
  salaryDone: boolean;
  structured: boolean;
  hakanAnswered: boolean;
  forbiddenDone: boolean;
  scores: Scores;
  onScore: (criterion: (typeof CRITERIA)[number], value: number) => void;
  ask: (question: number) => void;
  openSalary: () => void;
  talkSalary: (move: SalaryMove) => void;
  respondHakan: (protect: boolean) => void;
  answerBack: (honest: boolean) => void;
  endInterview: () => void;
}

export function InterviewConsole({ candidate, pool, typing, pending, ended, interviewed, mine, canFollow, salaryOpened, salaryDone, structured, hakanAnswered, forbiddenDone, scores, onScore, ask, openSalary, talkSalary, respondHakan, answerBack, endInterview }: InterviewConsoleProps) {
  return (
      <div className={styles.console}>
        {typing ? (
          <p className={styles.consoleWait}>{candidate.name.split(' ')[0]} cevaplıyor…</p>
        ) : pending === 'hakan' ? (
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
        ) : pending === 'salary' ? (
          <>
            <p className={styles.consoleTitle}>
              Beklenti {expectedSalary(candidate.id)?.toLocaleString('tr-TR') ?? '—'} TL · bütçe tavanı {SALARY_CAP.toLocaleString('tr-TR')} TL. Ne diyorsun?
            </p>
            <div className={styles.options}>
              {salaryMoves(candidate.id).map((m) => (
                <button key={m} className={`${styles.option} ${m === 'cap' || m === 'match' ? styles.optionPrimary : ''}`} onClick={() => talkSalary(m)}>
                  <b>{SALARY_LABEL[m]}</b>
                  <span>{SALARY_LINES[m](salaryOffer(candidate.id, m) ?? 0)}</span>
                </button>
              ))}
            </div>
          </>
        ) : pending === 'back' ? (
          <>
            <p className={styles.consoleTitle}>{candidate.name.split(' ')[0]} bir soru soruyor. Nasıl cevaplıyorsun?</p>
            <div className={styles.options}>
              {(() => {
                const back = backQuestionFor(candidate.id, pool.map((f) => f.id));
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
          <>
            <p className={styles.consoleTitle}>Puan kartı · {candidate.name.split(' ')[0]} (her ölçüt 1–5)</p>
            <Scorecard scores={scores} onScore={onScore} />
            <p className={styles.consoleWait}>{interviewed < pool.length ? 'Puanladıktan sonra listeden sıradaki adayı seç.' : 'Tüm adaylarla görüştün; önerini sunabilirsin.'}</p>
          </>
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
              {mine.length < QUESTION_BUDGET && !mine.includes(CASE) && (
                <button className={`${styles.question} ${styles.questionFollow}`} onClick={() => ask(CASE)}>
                  <span className={styles.qNumber}>{'</>'}</span>
                  <span>
                    Kısa bir kod vakası ver
                    <small>Bir soru hakkı · adayın düşünme şeklini gösterir</small>
                  </span>
                </button>
              )}
              {!salaryOpened && (
                <button className={styles.question} onClick={openSalary}>
                  <span className={styles.qNumber}>₺</span>
                  <span>
                    Maaş beklentisini konuş
                    <small>Görüşmeyi bitirmeden önce zorunlu</small>
                  </span>
                </button>
              )}
              {!structured && !hakanAnswered && !forbiddenDone && mine.length < QUESTION_BUDGET && (
                <button className={`${styles.question} ${styles.questionRisk}`} onClick={() => ask(FORBIDDEN)} title="İş Kanunu'na göre ayrımcılık sayılabilir.">
                  <span className={styles.qNumber}>!</span>
                  <span>
                    {forbiddenQuestion(candidate.id, candidate.age)}
                    <small>Hakan Bey'in listesinden · ayrımcılık sayılabilir</small>
                  </span>
                </button>
              )}
            </div>
            {canFollow && mine.length > 0 && <p className={styles.consoleHint}>İpucu: cevaplardaki altı noktalı bir ifadeye tıklarsan onun üzerine bir takip sorusu sorarsın (bir hak).</p>}
            {mine.length > 0 && (
              <button className={styles.endButton} onClick={endInterview} disabled={!salaryDone} title={salaryDone ? undefined : 'Önce maaşı konuş'}>
                {salaryDone ? 'Görüşmeyi bitir →' : 'Görüşmeyi bitir · önce maaşı konuş'}
              </button>
            )}
          </>
        )}
      </div>
  );
}
