import { useEffect, useRef, useState } from 'react';
import type { Candidate, EvaluatedField } from '../../game/types';
import type { candidateDetails } from '../../game/data/candidateDetails';
import { questionsFor } from '../../game/day/lineups';
import { ThumbUpIcon, ThumbDownIcon } from '../ui/ThumbIcon';
import { scanAt } from './scan';
import styles from '../../screens/GameplayScreen.module.css';
import own from './CvBody.module.css';
import { ProjectList } from './ProjectList';
import { projectsOf } from '../../game/data/portfolios';

/*
 * Bir CV, bir ATS'nin belge görüntüleyicisinde açıldığı gibi: gri zeminde beyaz bir sayfa. Sayfanın
 * solunda koyu bir bilgi sütunu (iletişim, maaş, beceriler, diller, sertifikalar, referanslar),
 * sağında asıl özgeçmiş (isim, profil, deneyim, projeler, başarılar, eğitim). Şirketin başvuru
 * formundaki sorular CV'nin parçası değildir: sayfanın altında ayrı bir ATS paneli. Yapay zekâ
 * tararken her bölüm sırayla yanar; taradıktan sonra her biri başparmak yukarı ya da aşağı alır.
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

/** Adayın CV'sinde yazan e-posta: adı ve soyadından. */
const emailOf = (name: string) =>
  `${name
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .split(' ')
    .join('.')
    .replace(/[^a-z.]/g, '')}@posta.com`;

export function CvBody({ candidate, details, scanning, verdicts, onReadThrough, onBreak = false }: { candidate: Candidate; details?: Details; scanning: boolean; verdicts: boolean; onReadThrough: () => void; onBreak?: boolean }) {
  const { ref, more } = useMoreBelow();
  const endRef = useSeenToEnd(onReadThrough);
  const sweep = (i: number, extra = '') => ({ className: `${own.block} ${extra} ${scanning ? styles.scanSweep : ''}`, style: scanAt(i) });
  const skills = candidate.skills.split(/,\s*/).filter(Boolean);
  const projects = projectsOf(candidate.id);
  // iki sütun dengede kalsın: deneyimi kısa ve projesi olanda eğitim deneyimin altına, diğerlerinde sağ sütuna
  const educationLeft = projects.length > 0 && (details?.workHistory.length ?? 0) <= 2;
  const education = (
    <section {...sweep(7)}>
      <h4>Eğitim {verdicts && <Verdict candidate={candidate} />}</h4>
      <p>{candidate.education}</p>
    </section>
  );
  return (
    <div ref={ref} className={`${styles.cvBody} ${own.viewer} ${more ? own.viewerMore : ''}`}>
      <article className={own.sheet} aria-label={`${candidate.name} özgeçmişi`}>
        {/* ── sol: bir bakışta bilinenler ── */}
        <aside className={own.side}>
          <section {...sweep(0)}>
            <h4>İletişim</h4>
            <ul className={own.contact}>
              {details?.location && <li>📍 {details.location}</li>}
              <li>✉ {emailOf(candidate.name)}</li>
              <li>🎂 {candidate.age} yaşında</li>
            </ul>
          </section>
          <section {...sweep(5, own.salary)}>
            <h4>
              Maaş beklentisi {verdicts && <Verdict field="salary" candidate={candidate} />}
            </h4>
            <b>{candidate.salary}</b>
            <small>aylık net</small>
          </section>
          <section {...sweep(6, own.wide)}>
            <h4>
              Beceriler {verdicts && <Verdict field="skills" candidate={candidate} />}
            </h4>
            <ul className={own.skills}>
              {skills.map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ul>
          </section>
          {details?.languages && (
            <section {...sweep(6)}>
              <h4>Diller</h4>
              <p>{details.languages}</p>
            </section>
          )}
          <section {...sweep(8)}>
            <h4>Sertifikalar {verdicts && <Verdict candidate={candidate} />}</h4>
            <p>{candidate.certifications}</p>
          </section>
          <section {...sweep(9)}>
            <h4>Referanslar {verdicts && <Verdict candidate={candidate} />}</h4>
            <p>{candidate.references}</p>
          </section>
          {candidate.activities && (
            <section {...sweep(9)}>
              <h4>İlgi alanları</h4>
              <ul className={own.plain}>
                {candidate.activities.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </section>
          )}
        </aside>

        {/* ── sağ: özgeçmişin kendisi ── */}
        <div className={own.main}>
          <header className={own.title}>
            <h3>{candidate.name}</h3>
            <span>{candidate.role.replace(/ adayı.*$/, '')}</span>
          </header>

          <section {...sweep(1, own.full)}>
            <h4>
              Profil {verdicts && <Verdict field="motivation" candidate={candidate} />}
            </h4>
            <p className={own.profile}>{candidate.motivation}</p>
          </section>

          <div className={own.colA}>

          <section {...sweep(2)}>
            <h4>
              İş deneyimi <small>{candidate.experience}</small>
              {verdicts && <Verdict field="experience" candidate={candidate} />}
            </h4>
            {details && (
              <ol className={own.jobs}>
                {details.workHistory.map((w) => (
                  <li key={`${w.period}-${w.title}`}>
                    <div className={own.jobHead}>
                      <b>{w.title}</b>
                      <span className="mono">{w.period}</span>
                    </div>
                    <div className={own.company}>{w.company}</div>
                    {w.note && <p>{w.note}</p>}
                  </li>
                ))}
              </ol>
            )}
          </section>

          {educationLeft && education}
          </div>

          <div className={own.colB}>
          {projects.length > 0 && (
            <section {...sweep(3)}>
              <h4>Projeler</h4>
              <ProjectList id={candidate.id} disabled={onBreak} />
            </section>
          )}

          {details && (
            <section {...sweep(3)}>
              <h4>Başarılar {verdicts && <Verdict candidate={candidate} />}</h4>
              <ul className={own.bullets}>
                {details.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </section>
          )}
          {!educationLeft && education}
          </div>
          {/* CV'nin parçası değil: ATS'nin kendi alanı, başvuru formunda şirketin soruları */}
          <section className={`${own.form} ${scanning ? styles.scanSweep : ''}`} style={scanAt(4)}>
            <h4>
              <span className={own.formTag}>ATS</span> Başvuru formu · şirketin soruları {verdicts && <Verdict field="questions" candidate={candidate} />}
            </h4>
            <div className={own.qa}>
              {questionsFor(candidate.id).map((question, i) => (
                <div key={question}>
                  <b>{question}</b>
                  <span>{candidate.companyAnswers[i]}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </article>

      {/* dosyanın sonu: bu ekranda bir kez göründüyse bütünüyle görülmüştür */}
      <div ref={endRef} className={own.end} aria-hidden="true" />
    </div>
  );
}
