import { useEffect, useRef, useState } from 'react';
import { ShareButton } from '../../arcade/ShareButton';
import * as sfx from './sfx';
import { markPlayed } from '../../arcade/progress';
import { clockText, emptyLog, highlightsOf, PASS_MARK, proctorNote, reportNo, scoreExam, SECTION_SECONDS, sectionScores, verdictOf, type ExamAnswer, type ExamLog, type ExamSection } from './logic';
import base from './TestGame.module.css';
import styles from './Result.module.css';
import pr from './Proctor.module.css';
import { paintUyumCard } from './shareCard';

/*
 * Aday Profil Raporu: kaydırmadan ekrana sığan yatay bir belge. Solda karar, mühür, iki puan (şirket ve
 * sağduyu) ve bölüm sonuçları; sağda bölüm bölüm cevap kâğıdı, yapay zekâ raporu ve paylaşım. Cevap kâğıdında bir soruya tıklayınca altında üç cevap
 * yan yana açılır: seninki, anahtarınki, aklı başında olanınki. Mühür yalnızca şirket puanına bakar.
 */

function Score({ value, label, note, tone }: { value: number; label: string; note: string; tone: 'company' | 'sense' }) {
  return (
    <div className={`${styles.score} ${tone === 'sense' ? styles.scoreSense : ''}`}>
      <div className={styles.scoreTop}>
        <span>{label}</span>
        <b className="mono">
          {value}
          <small>/100</small>
        </b>
      </div>
      <span className={styles.meter} role="img" aria-label={`${label}: 100 üzerinden ${value}`}>
        <i style={{ width: `${value}%` }} />
      </span>
      <small className={styles.scoreNote}>{note}</small>
    </div>
  );
}

type Mark = 'key' | 'sense' | 'other' | 'blank';
const MARK_TEXT: Record<Mark, string> = {
  key: 'anahtarla aynı',
  sense: 'sağduyulu',
  other: 'ikisi de değil',
  blank: 'boş',
};

export function Result({ exam, answers, log = emptyLog(), onAgain }: { exam: ExamSection[]; answers: ExamAnswer[]; log?: ExamLog; onAgain: () => void }) {
  const questions = exam.flatMap((s) => s.questions);
  const r = scoreExam(questions, answers);
  const v = verdictOf(r.company, r.blank / Math.max(1, questions.length));
  const sections = sectionScores(exam, answers);
  const passed = r.company >= PASS_MARK;
  const notes = highlightsOf(questions, answers);
  const limit = exam.length * SECTION_SECONDS;
  const proctor = proctorNote(log, questions, answers, limit);
  const [open, setOpen] = useState(0);
  const [part, setPart] = useState(0);
  // her bölümün ilk sorusunun cevap kâğıdındaki sırası
  const starts = exam.map((_, si) => exam.slice(0, si).reduce((t, x) => t + x.questions.length, 0));
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  // rapor açılırken kısa bir trampet, ardından mühür masaya iner
  useEffect(() => {
    // salonun defterine: tik ve sonuç
    markPlayed('test', `${v.title} · ${r.company}`);
    sfx.drumroll(0.9);
    const id = window.setTimeout(() => sfx.stamp(passed), 950);
    return () => window.clearTimeout(id);
    // yalnızca rapor ilk açıldığında
    // oxlint-disable-next-line react/exhaustive-deps
  }, []);
  const date = new Date().toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const markOf = (i: number): Mark => {
    const a = answers[i] ?? null;
    if (a === null) return 'blank';
    if (questions[i].fair && a === questions[i].answer) return 'sense';
    if (a === questions[i].answer) return 'key';
    if (a === questions[i].sensible) return 'sense';
    return 'other';
  };
  const q = questions[open];
  const a = answers[open] ?? null;

  return (
    <main className={styles.board} data-fit>
      <article className={styles.doc}>
        <div className={styles.left}>
          {/* ── karar ── */}
          <header className={styles.head}>
            <div className={styles.headText}>
              <p className={styles.kicker}>
                Aday Profil Raporu{' '}
                <span className="mono">
                  {reportNo(answers)} · {date}
                </span>
              </p>
              <h1 ref={heading} tabIndex={-1} className={styles.title}>
                {v.title}
              </h1>
              <p className={styles.verdict}>
                {v.line}
                {r.blank > 0 && r.blank * 2 <= questions.length && ` ${r.blank} boş soru "kararsızlık" olarak işlendi.`}
              </p>
            </div>
            <div className={`${styles.stamp} ${passed ? styles.stampPass : ''}`} aria-label={passed ? 'Mühür: uygun' : 'Mühür: uygun değil'}>
              {passed ? 'UYGUN' : 'UYGUN DEĞİL'}
              <small>eşik {PASS_MARK}</small>
            </div>
          </header>

          {/* ── puanlar ── */}
          <div className={styles.scores}>
            <Score value={r.company} label="Şirket puanı" note="Cevap anahtarıyla uyum. Kararı bu verir." tone="company" />
            <Score value={r.sense} label="Sağduyu puanı" note="Aklı başında cevaplar. Karara etkisi yok." tone="sense" />
          </div>

          {/* ── bölümler ── */}
          <section className={`${styles.block} ${styles.secBlock}`} aria-labelledby="sec-title">
            <h2 id="sec-title" className={styles.h2}>
              Bölüm sonuçları
            </h2>
            <ul className={styles.sections}>
              {exam.map((s, si) => (
                <li key={s.title}>
                  <span className={styles.secTitle}>{s.title}</span>
                  <span className={styles.secBars}>
                    <span className={styles.bar} aria-label={`Şirket ${sections[si].company}`}>
                      <i style={{ width: `${sections[si].company}%` }} />
                    </span>
                    <span className={`${styles.bar} ${styles.barSense}`} aria-label={`Sağduyu ${sections[si].sense}`}>
                      <i style={{ width: `${sections[si].sense}%` }} />
                    </span>
                  </span>
                  <span className={`${styles.secNums} mono`}>
                    <b>{sections[si].company}</b>
                    <em>{sections[si].sense}</em>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <div className={styles.right}>
          {/* ── cevap kâğıdı ── */}
          <section className={`${styles.block} ${styles.sheet}`} aria-labelledby="sheet-title">
            <div className={styles.blockHead}>
              <h2 id="sheet-title" className={styles.h2}>
                Cevap kâğıdı
              </h2>
              <p className={styles.legend} aria-hidden="true">
                <span>
                  <i className={styles.key} /> Anahtar
                </span>
                <span>
                  <i className={styles.sense} /> Sağduyu
                </span>
                <span>
                  <i className={styles.other} /> Diğer
                </span>
                <span>
                  <i className={styles.blank} /> Boş
                </span>
              </p>
            </div>
            {/* bölüm sekmeleri: kâğıt bir seferde tek bölümü gösterir */}
            <div className={styles.tabs} role="tablist" aria-label="Bölümler">
              {exam.map((s, si) => (
                <button
                  key={s.title}
                  role="tab"
                  aria-selected={si === part}
                  className={`${styles.tab} ${si === part ? styles.tabOn : ''}`}
                  onClick={() => {
                    setPart(si);
                    setOpen(starts[si]);
                  }}
                >
                  <span>{si + 1}</span>
                  {s.title}
                </button>
              ))}
            </div>
            <div className={styles.chips} role="tabpanel">
              {exam[part].questions.map((sq, k) => {
                const i = starts[part] + k;
                const m = markOf(i);
                return (
                  <button
                    key={sq.id}
                    className={`${styles.chip} ${styles[m]} ${i === open ? styles.chipOn : ''}`}
                    aria-pressed={i === open}
                    aria-label={`Soru ${k + 1}: ${MARK_TEXT[m]}`}
                    onClick={() => setOpen(i)}
                  >
                    {k + 1}
                  </button>
                );
              })}
            </div>

            <div className={styles.detail} aria-live="polite">
              <p className={styles.detailMeta}>
                Soru {open - starts[part] + 1} · {q.kind} · <b className={styles[markOf(open)]}>{MARK_TEXT[markOf(open)]}</b>
              </p>
              <p className={styles.detailQ}>{q.prompt}</p>
              <div className={styles.compare}>
                <div>
                  <small>Senin cevabın</small>
                  <b>{a === null ? '—' : q.options[a]}</b>
                </div>
                <div className={styles.cKey}>
                  <small>Cevap anahtarı</small>
                  <b>{q.options[q.answer]}</b>
                </div>
                <div className={styles.cSense}>
                  <small>Aklı başında cevap</small>
                  <b>{q.options[q.sensible]}</b>
                </div>
              </div>
              {q.fair && (
                <p className={styles.fairNote}>
                  <b>Bu sefer kurum haklıydı.</b> Anahtar ile aklı başında cevap aynı.
                  {a === q.fair.trap ? ' Sen alaycı şıkkı seçtin: platformun önyargısını eleştirirken kendi önyargına da bak.' : ''}
                </p>
              )}
              <p className={styles.why}>“{q.why}”</p>
            </div>
          </section>

          {/* ── yapay zekâ raporu ── */}
          <section className={`${styles.block} ${pr.proctor}`} aria-labelledby="proctor-title">
            <h2 id="proctor-title" className={styles.h2}>
              Yapay zekâ raporu
            </h2>
            <div className={pr.grid}>
              <blockquote className={pr.memo}>
                {proctor.map((line) => (
                  <p key={line}>{line}</p>
                ))}
                <footer>UyumMetre YZ · Değerlendirme modeli v3.2 · Güven skoru %97*</footer>
              </blockquote>
              <div className={pr.side}>
                <dl className={pr.stats}>
                  <div>
                    <dt>Süre</dt>
                    <dd className="mono">
                      {clockText(Math.min(log.seconds, limit))}
                      <small>/ {clockText(limit)}</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Cevaplanan</dt>
                    <dd className="mono">
                      {questions.length - r.blank}
                      <small>/ {questions.length}</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Değiştirilen</dt>
                    <dd className="mono">{log.changed}</dd>
                  </div>
                  <div>
                    <dt>Robot testi</dt>
                    <dd className="mono">{log.robots}</dd>
                  </div>
                </dl>
                <div className={styles.footButtons}>
                  <ShareButton
                    floatNote
                    className={base.primary}
                    make={() => ({
                      route: 'test',
                      kicker: `Aday Profil Raporu · ${passed ? 'Uygun' : 'Uygun değil'}`,
                      title: v.title,
                      note: v.line,
                      stats: [
                        {
                          label: 'Şirket puanı',
                          value: String(r.company),
                          tone: '#2b62c0',
                        },
                        {
                          label: 'Sağduyu puanı',
                          value: String(r.sense),
                          tone: '#2f7a4e',
                        },
                        {
                          label: 'Mühür',
                          value: passed ? 'UYGUN' : 'RED',
                          tone: passed ? '#2f7a4e' : '#a8402f',
                        },
                      ],
                      paint: paintUyumCard({
                        title: v.title,
                        line: v.line,
                        company: r.company,
                        sense: r.sense,
                        passed,
                        passMark: PASS_MARK,
                        reportNo: reportNo(answers),
                        date,
                        sections,
                      }),
                      question: 'Sen kaç alırsın?',
                      text: notes[0]
                        ? `UyumMetre'ye göre "${v.title}" çıktım. Raporumda: “${notes[0].prompt}” sorusuna “${notes[0].option}” dedim, ${notes[0].tone === 'key' ? 'platform bunu örnek tutum saydı' : notes[0].tone === 'trap' ? 'oysa bu sefer kurum haklıymış' : 'platform bunu risk saydı'}. Sen kaç alırsın?`
                        : `UyumMetre'ye göre "${v.title}" çıktım: şirket puanım ${r.company}, sağduyu puanım ${r.sense}. Sen kaç alırsın?`,
                    })}
                  />
                  <button className={styles.again} onClick={onAgain}>
                    Testi yeniden çöz
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </article>
    </main>
  );
}
