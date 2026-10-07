import { useEffect, useRef, useState } from 'react';
import type { Candidate, EvaluatedField } from '../../game/types';
import type { candidateDetails } from '../../game/data/candidateDetails';
import { questionsFor } from '../../game/day/lineups';
import { ThumbUpIcon, ThumbDownIcon } from '../ui/ThumbIcon';
import { scanAt } from './scan';
import styles from '../../screens/GameplayScreen.module.css';
import own from './CvBody.module.css';

/*
 * Bir CV'nin portalın gösterdiği gövdesi: ana sütun (profil, iş geçmişi, öne çıkanlar, şirketin
 * soruları) ve yan sütun (maaş, beceriler, eğitim, referanslar). Yapay zekâ tararken her bölüm
 * sırayla yanar; taradıktan sonra her biri başparmak yukarı ya da aşağı alır.
 */

export function Verdict({ field, candidate }: { field?: EvaluatedField; candidate: Candidate }) {
  const isBad = !!field && candidate.flaggedField === field;
  return (
    <span
      className={`${own.verdictIcon} ${isBad ? own.verdictBad : own.verdictGood}`}
      title={isBad ? 'Sistem bu alanı olumsuz değerlendirdi' : 'Sistem bu alanı olumlu değerlendirdi'}
    >
      {isBad ? <ThumbDownIcon className={own.verdictGlyph} /> : <ThumbUpIcon className={own.verdictGlyph} />}
    </span>
  );
}

type Details = (typeof candidateDetails)[string];

/**
 * CV ekranın altına doğru sürerken true. Kısa ekranda CV kartın içinde kayar ve şirketin soruları
 * kaçırılmasın diye alt kenarı soluklaşır.
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

/**
 * Dosyanın sonu ekranda oldu; onu oraya ne kaydırırsa: kısa ekranda kartın içindeki CV, yan
 * çevrilmiş telefonda bütün kart ya da her şey sığıyorsa hiçbir şey.
 */
function useSeenToEnd(onEnd: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const endRef = useRef(onEnd);
  useEffect(() => {
    endRef.current = onEnd;
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) endRef.current();
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

export function CvBody({ candidate, details, scanning, verdicts, onReadThrough }: { candidate: Candidate; details?: Details; scanning: boolean; verdicts: boolean; onReadThrough: () => void }) {
  const { ref, more } = useMoreBelow();
  const endRef = useSeenToEnd(onReadThrough);
  return (
    <div ref={ref} className={`${styles.cvBody} ${more ? own.cvBodyMore : ''}`}>
      <div className={own.cvMain}>
        <section className={`${own.cvSection} ${scanning ? styles.scanSweep : ''}`} style={scanAt(1)}>
          <h3>
            Profil {verdicts && <Verdict field="motivation" candidate={candidate} />}
          </h3>
          <p className={own.cvQuote}>{candidate.motivation}</p>
        </section>

        <section className={`${own.cvSection} ${scanning ? styles.scanSweep : ''}`} style={scanAt(2)}>
          <h3>
            İş Deneyimi <small>· toplam {candidate.experience}</small>
            {verdicts && <Verdict field="experience" candidate={candidate} />}
          </h3>
          {details && (
            <ol className={own.cvTimeline}>
              {details.workHistory.map((w) => (
                <li key={`${w.period}-${w.title}`}>
                  <span className={`${own.cvPeriod} mono`}>{w.period}</span>
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
          <section className={`${own.cvSection} ${scanning ? styles.scanSweep : ''}`} style={scanAt(3)}>
            <h3>Öne Çıkanlar {verdicts && <Verdict candidate={candidate} />}</h3>
            <ul className={own.cvList}>
              {details.highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </section>
        )}

        <section className={`${own.cvSection} ${scanning ? styles.scanSweep : ''}`} style={scanAt(4)}>
          <h3>
            Şirket Soruları {verdicts && <Verdict field="questions" candidate={candidate} />}
          </h3>
          <div className={own.cvQa}>
            {questionsFor(candidate.id).map((question, i) => (
              <div key={question}>
                <b>{question}</b>
                <span>"{candidate.companyAnswers[i]}"</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className={own.cvSide}>
        <section className={`${own.cvSection} ${scanning ? styles.scanSweep : ''}`} style={scanAt(5)}>
          <h3>
            Maaş Beklentisi {verdicts && <Verdict field="salary" candidate={candidate} />}
          </h3>
          <p className={own.cvStrong}>{candidate.salary}</p>
        </section>
        <section className={`${own.cvSection} ${scanning ? styles.scanSweep : ''}`} style={scanAt(6)}>
          <h3>
            Beceriler {verdicts && <Verdict field="skills" candidate={candidate} />}
          </h3>
          <div className={own.cvChips}>
            {candidate.skills
              .split(/,\s*/)
              .filter(Boolean)
              .map((k) => (
                <span key={k}>{k}</span>
              ))}
          </div>
        </section>
        <section className={`${own.cvSection} ${scanning ? styles.scanSweep : ''}`} style={scanAt(7)}>
          <h3>Eğitim {verdicts && <Verdict candidate={candidate} />}</h3>
          <p>{candidate.education}</p>
        </section>
        <section className={`${own.cvSection} ${scanning ? styles.scanSweep : ''}`} style={scanAt(8)}>
          <h3>Sertifikalar {verdicts && <Verdict candidate={candidate} />}</h3>
          <p>{candidate.certifications}</p>
        </section>
        <section className={`${own.cvSection} ${scanning ? styles.scanSweep : ''}`} style={scanAt(9)}>
          <h3>Referanslar {verdicts && <Verdict candidate={candidate} />}</h3>
          <p>{candidate.references}</p>
        </section>
        {candidate.activities && (
          <section className={`${own.cvSection} ${scanning ? styles.scanSweep : ''}`} style={scanAt(9)}>
            <h3>Gönüllülük ve İlgi Alanları</h3>
            <ul className={own.cvList}>
              {candidate.activities.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </section>
        )}
      </aside>
      {/* iki sütun boyunca dosyanın altı: bu ekranda bir kez göründüyse bütünüyle görülmüştür */}
      <div ref={endRef} className={own.cvEnd} aria-hidden="true" />
    </div>
  );
}
