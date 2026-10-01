import { useEffect, useRef, useState } from 'react';
import type { Candidate, EvaluatedField } from '../../game/types';
import type { candidateDetails } from '../../game/data/candidateDetails';
import { questionsFor } from '../../game/lineups';
import { ThumbUpIcon, ThumbDownIcon } from '../ui/ThumbIcon';
import { scanAt } from './scan';
import styles from '../../screens/GameplayScreen.module.css';

/*
 * The body of a CV as the portal shows it: the main column (profile, work history, highlights,
 * the company's questions) and the sidebar (salary, skills, education, references). While the
 * AI scans, each section lights up in turn; once it has, each gets its thumb up or down.
 */

export function Verdict({ field, candidate }: { field?: EvaluatedField; candidate: Candidate }) {
  const isBad = !!field && candidate.flaggedField === field;
  return (
    <span
      className={`${styles.verdictIcon} ${isBad ? styles.verdictBad : styles.verdictGood}`}
      title={isBad ? 'Sistem bu alanı olumsuz değerlendirdi' : 'Sistem bu alanı olumlu değerlendirdi'}
    >
      {isBad ? <ThumbDownIcon className={styles.verdictGlyph} /> : <ThumbUpIcon className={styles.verdictGlyph} />}
    </span>
  );
}

type Details = (typeof candidateDetails)[string];

/**
 * True while the CV runs on below the fold. On a short screen the CV scrolls inside the card,
 * and its bottom edge fades out so the company's questions aren't missed.
 */
function useMoreBelow() {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
    const ro = new ResizeObserver(check);
    ro.observe(el);
    for (const child of el.children) ro.observe(child);
    el.addEventListener('scroll', check, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', check);
    };
  }, []);
  return { ref, more };
}

export function CvBody({ candidate, details, scanning, verdicts }: { candidate: Candidate; details?: Details; scanning: boolean; verdicts: boolean }) {
  const { ref, more } = useMoreBelow();
  return (
    <div ref={ref} className={`${styles.cvBody} ${more ? styles.cvBodyMore : ''}`}>
      <div className={styles.cvMain}>
        <section className={`${styles.cvSection} ${scanning ? styles.scanSweep : ''}`} style={scanAt(1)}>
          <h3>
            Profil {verdicts && <Verdict field="motivation" candidate={candidate} />}
          </h3>
          <p className={styles.cvQuote}>{candidate.motivation}</p>
        </section>

        <section className={`${styles.cvSection} ${scanning ? styles.scanSweep : ''}`} style={scanAt(2)}>
          <h3>
            İş Deneyimi <small>· toplam {candidate.experience}</small>
            {verdicts && <Verdict field="experience" candidate={candidate} />}
          </h3>
          {details && (
            <ol className={styles.cvTimeline}>
              {details.workHistory.map((w) => (
                <li key={`${w.period}-${w.title}`}>
                  <span className={`${styles.cvPeriod} mono`}>{w.period}</span>
                  <span>
                    <b>{w.title}</b> · {w.company}
                    <em>{w.note}</em>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {details && (
          <section className={`${styles.cvSection} ${scanning ? styles.scanSweep : ''}`} style={scanAt(3)}>
            <h3>Öne Çıkanlar {verdicts && <Verdict candidate={candidate} />}</h3>
            <ul className={styles.cvList}>
              {details.highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </section>
        )}

        <section className={`${styles.cvSection} ${scanning ? styles.scanSweep : ''}`} style={scanAt(4)}>
          <h3>
            Şirket Soruları {verdicts && <Verdict field="questions" candidate={candidate} />}
          </h3>
          <div className={styles.cvQa}>
            {questionsFor(candidate.id).map((question, i) => (
              <div key={question}>
                <b>{question}</b>
                <span>"{candidate.companyAnswers[i]}"</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className={styles.cvSide}>
        <section className={`${styles.cvSection} ${scanning ? styles.scanSweep : ''}`} style={scanAt(5)}>
          <h3>
            Maaş Beklentisi {verdicts && <Verdict field="salary" candidate={candidate} />}
          </h3>
          <p className={styles.cvStrong}>{candidate.salary}</p>
        </section>
        <section className={`${styles.cvSection} ${scanning ? styles.scanSweep : ''}`} style={scanAt(6)}>
          <h3>
            Beceriler {verdicts && <Verdict field="skills" candidate={candidate} />}
          </h3>
          <div className={styles.cvChips}>
            {candidate.skills
              .split(/,\s*/)
              .filter(Boolean)
              .map((k) => (
                <span key={k}>{k}</span>
              ))}
          </div>
        </section>
        <section className={`${styles.cvSection} ${scanning ? styles.scanSweep : ''}`} style={scanAt(7)}>
          <h3>Eğitim {verdicts && <Verdict candidate={candidate} />}</h3>
          <p>{candidate.education}</p>
        </section>
        <section className={`${styles.cvSection} ${scanning ? styles.scanSweep : ''}`} style={scanAt(8)}>
          <h3>Sertifikalar {verdicts && <Verdict candidate={candidate} />}</h3>
          <p>{candidate.certifications}</p>
        </section>
        <section className={`${styles.cvSection} ${scanning ? styles.scanSweep : ''}`} style={scanAt(9)}>
          <h3>Referanslar {verdicts && <Verdict candidate={candidate} />}</h3>
          <p>{candidate.references}</p>
        </section>
        {candidate.activities && (
          <section className={`${styles.cvSection} ${scanning ? styles.scanSweep : ''}`} style={scanAt(9)}>
            <h3>Gönüllülük ve İlgi Alanları</h3>
            <ul className={styles.cvList}>
              {candidate.activities.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </section>
        )}
      </aside>
    </div>
  );
}
