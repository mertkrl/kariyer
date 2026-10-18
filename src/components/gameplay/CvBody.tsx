import { useEffect, useRef, useState } from 'react';
import type { Candidate, EvaluatedField } from '../../game/types';
import type { candidateDetails } from '../../game/data/candidateDetails';
import { questionsFor } from '../../game/day/lineups';
import { ThumbUpIcon, ThumbDownIcon } from '../ui/ThumbIcon';
import { scanAt } from './scan';
import styles from '../../screens/GameplayScreen.module.css';
import own from './CvBody.module.css';

/*
 * Bir CV'nin portalın gösterdiği gövdesi, bir özgeçmiş gibi: ana sütun (özet, deneyim, başarılar,
 * eğitim, sertifikalar), yan sütun (maaş, beceriler, diller, referanslar) ve altta başvuru formunun
 * soruları. Yapay zekâ tararken her bölüm
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
  const sweep = (i: number) => ({ className: `${own.cvSection} ${scanning ? styles.scanSweep : ''}`, style: scanAt(i) });
  return (
    <div ref={ref} className={`${styles.cvBody} ${own.cv} ${more ? own.cvBodyMore : ''}`}>
      {/* ── özgeçmişin kendisi: özet, deneyim, başarılar, eğitim ── */}
      <div className={own.cvMain}>
        <section {...sweep(1)}>
          <h3>
            Özet {verdicts && <Verdict field="motivation" candidate={candidate} />}
          </h3>
          <p className={own.cvSummary}>{candidate.motivation}</p>
        </section>

        <section {...sweep(2)}>
          <h3>
            Deneyim <small>{candidate.experience}</small>
            {verdicts && <Verdict field="experience" candidate={candidate} />}
          </h3>
          {details && (
            <ol className={own.cvJobs}>
              {details.workHistory.map((w) => (
                <li key={`${w.period}-${w.title}`}>
                  <div className={own.cvJobHead}>
                    <b>{w.title}</b>
                    <span className={`${own.cvPeriod} mono`}>{w.period}</span>
                  </div>
                  <div className={own.cvCompany}>{w.company}</div>
                  {w.note && <p className={own.cvJobNote}>{w.note}</p>}
                </li>
              ))}
            </ol>
          )}
        </section>

        {details && (
          <section {...sweep(3)}>
            <h3>Başarılar {verdicts && <Verdict candidate={candidate} />}</h3>
            <ul className={own.cvList}>
              {details.highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </section>
        )}

        <section {...sweep(7)}>
          <h3>Eğitim {verdicts && <Verdict candidate={candidate} />}</h3>
          <p>{candidate.education}</p>
        </section>

        <section {...sweep(8)}>
          <h3>Sertifikalar {verdicts && <Verdict candidate={candidate} />}</h3>
          <p>{candidate.certifications}</p>
        </section>
      </div>

      {/* ── bir bakışta: maaş, beceriler, diller, referanslar ── */}
      <aside className={own.cvSide}>
        <section {...sweep(5)}>
          <h3>
            Maaş beklentisi {verdicts && <Verdict field="salary" candidate={candidate} />}
          </h3>
          <p className={own.cvStrong}>{candidate.salary}</p>
        </section>
        <section {...sweep(6)}>
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
        {details?.languages && (
          <section {...sweep(6)}>
            <h3>Diller</h3>
            <p>{details.languages}</p>
          </section>
        )}
        <section {...sweep(9)}>
          <h3>Referanslar {verdicts && <Verdict candidate={candidate} />}</h3>
          <p>{candidate.references}</p>
        </section>
        {candidate.activities && (
          <section {...sweep(9)}>
            <h3>Gönüllülük ve ilgi alanları</h3>
            <ul className={own.cvList}>
              {candidate.activities.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </section>
        )}
      </aside>

      {/* CV'nin parçası değil: başvuru formunda şirketin sorduğu sorular, ayrı bir şerit */}
      <section className={`${own.cvSection} ${own.cvForm} ${scanning ? styles.scanSweep : ''}`} style={scanAt(4)}>
        <h3>
          Başvuru formu · şirketin soruları {verdicts && <Verdict field="questions" candidate={candidate} />}
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
      {/* iki sütun boyunca dosyanın altı: bu ekranda bir kez göründüyse bütünüyle görülmüştür */}
      <div ref={endRef} className={own.cvEnd} aria-hidden="true" />
    </div>
  );
}
