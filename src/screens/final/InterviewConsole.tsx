import type { Candidate } from '../../game/types';
import { SALARY_CAP } from '../../game/store';
import { FINAL_INTERVIEW_QUESTIONS } from '../../game/data/candidateDetails';
import { expectedSalary, salaryMoves, salaryOffer, type CRITERIA, type SalaryMove, type Scores } from '../../game/interview';
import { Scorecard } from './InterviewParts';
import { LEAD, QUESTION_BUDGET, SALARY_LABEL, SALARY_LINES } from './interviewModel';
import styles from '../FinalRoundScreen.module.css';

/*
 * Konuşmanın altındaki şerit: şu anda ne yapabileceğin. Önce klasik sorularını seç; sonra sözü
 * Ümit'e bırak (teknik soru ve Hakan Bey'in sorusu kendiliğinden gelir, araya giremezsin); maaşı
 * konuş, puanla ve görüşmeyi kapat.
 */
export interface InterviewConsoleProps {
  candidate: Candidate;
  /** Bir cevap yazılıyor. */
  typing: boolean;
  /** Söz Ümit'e geçti: senin soruların bitti. */
  handedOff: boolean;
  salaryPending: boolean;
  salaryDone: boolean;
  ended: boolean;
  /** Bütün görüşmelerin bitti: kurul bekliyor. */
  allDone: boolean;
  /** Kendi sorduğun klasik sorular. */
  mine: number[];
  canFollow: boolean;
  scores: Scores;
  onScore: (criterion: (typeof CRITERIA)[number], value: number) => void;
  ask: (question: number) => void;
  handOff: () => void;
  talkSalary: (move: SalaryMove) => void;
  endInterview: () => void;
}

export function InterviewConsole({ candidate, typing, handedOff, salaryPending, salaryDone, ended, allDone, mine, canFollow, scores, onScore, ask, handOff, talkSalary, endInterview }: InterviewConsoleProps) {
  const first = candidate.name.split(' ')[0];
  const scored = Object.keys(scores).length > 0;
  return (
    <div className={styles.console}>
      {typing ? (
        <p className={styles.consoleWait}>{first} cevaplıyor…</p>
      ) : handedOff && !salaryPending && !salaryDone ? (
        <p className={styles.consoleWait}>Söz {LEAD}'da. Dinliyorsun.</p>
      ) : salaryPending ? (
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
      ) : salaryDone ? (
        <>
          <p className={styles.consoleTitle}>Puan kartı · {first} (her ölçüt 1–5)</p>
          <Scorecard scores={scores} onScore={onScore} />
          {ended ? (
            <p className={styles.consoleWait}>{allDone ? 'Bütün görüşmelerin bitti; kurula geçebilirsin.' : ''}</p>
          ) : (
            <button className={styles.endButton} onClick={endInterview} disabled={!scored} title={scored ? undefined : 'Önce puanla'}>
              {scored ? 'Görüşmeyi kapat →' : 'Görüşmeyi kapat · önce puanla'}
            </button>
          )}
        </>
      ) : (
        <>
          <p className={styles.consoleTitle}>{mine.length < QUESTION_BUDGET ? `Soru seç · ${mine.length}/${QUESTION_BUDGET}` : 'Soruların bitti.'}</p>
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
          </div>
          {canFollow && mine.length > 0 && <p className={styles.consoleHint}>İpucu: cevaplardaki altı noktalı bir ifadeye tıklarsan onun üzerine bir takip sorusu sorarsın (bir hak).</p>}
          {mine.length > 0 && (
            <button className={styles.endButton} onClick={handOff}>
              Sözü {LEAD}'a bırak: teknik bölüm →
            </button>
          )}
        </>
      )}
    </div>
  );
}
