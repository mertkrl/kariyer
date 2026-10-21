import { useEffect, useRef, useState } from 'react';
import { PASS_MARK, reportNo, scoreExam, sectionScores, verdictOf, type ExamAnswer, type ExamSection } from './logic';
import base from './TestGame.module.css';
import styles from './Result.module.css';

/*
 * Aday Profil Raporu: kaydırmadan tek ekrana sığan bir pano. Solda profil (mühür, iki puan, yorum,
 * özet), sağda cevap kâğıdı: her bölüm bir satır, solunda bölümün iki puan çubuğu, sağında soru
 * kutucukları. Kutucuğa tıklayınca o sorunun ayrıntısı hemen altında açılır. Mühür şirket
 * puanına bakar; sağduyu puanı raporda durur ama hiçbir kararı etkilemez.
 */

function Ring({ value, label, note, tone }: { value: number; label: string; note: string; tone: 'company' | 'sense' }) {
  return (
    <div className={`${styles.ringBox} ${tone === 'sense' ? styles.sense : ''}`}>
      <div className={styles.ring} style={{ ['--p' as string]: value }} role="img" aria-label={`${label}: 100 üzerinden ${value}`}>
        <b className="mono">{value}</b>
      </div>
      <span className={styles.ringLabel}>{label}</span>
      <small>{note}</small>
    </div>
  );
}

type Mark = 'key' | 'sense' | 'other' | 'blank';
const MARK_TEXT: Record<Mark, string> = { key: 'anahtarla aynı', sense: 'sağduyulu', other: 'ikisi de değil', blank: 'boş' };

export function Result({ exam, answers, robots = 0, onAgain }: { exam: ExamSection[]; answers: ExamAnswer[]; robots?: number; onAgain: () => void }) {
  const questions = exam.flatMap((s) => s.questions);
  const r = scoreExam(questions, answers);
  const v = verdictOf(r.company);
  const sections = sectionScores(exam, answers);
  const passed = r.company >= PASS_MARK;
  const [open, setOpen] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  const date = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

  const markOf = (i: number): Mark => {
    const a = answers[i] ?? null;
    if (a === null) return 'blank';
    if (a === questions[i].answer) return 'key';
    if (a === questions[i].sensible) return 'sense';
    return 'other';
  };
  const q = questions[open];
  const a = answers[open] ?? null;
  let n = 0;

  return (
    <main className={styles.board}>
      {/* ── sol: profil ── */}
      <article className={styles.profile}>
        <header className={styles.head}>
          <div>
            <p className={base.eyebrow}>Aday Profil Raporu · Gizli</p>
            <h1 ref={heading} tabIndex={-1} className={styles.title}>
              {v.title}
            </h1>
          </div>
          <div className={`${styles.stamp} ${passed ? styles.stampPass : ''}`} aria-label={passed ? 'Mühür: uygun' : 'Mühür: uygun değil'}>
            {passed ? 'UYGUN' : 'UYGUN DEĞİL'}
            <small>eşik {PASS_MARK}</small>
          </div>
        </header>

        <dl className={`${styles.meta} mono`}>
          <div>
            <dt>Belge</dt>
            <dd>{reportNo(answers)}</dd>
          </div>
          <div>
            <dt>Tarih</dt>
            <dd>{date}</dd>
          </div>
          <div>
            <dt>Pozisyon</dt>
            <dd>Her pozisyon</dd>
          </div>
        </dl>

        <div className={styles.rings}>
          <Ring value={r.company} label="Şirket puanı" note="Anahtarla uyum" tone="company" />
          <Ring value={r.sense} label="Sağduyu puanı" note="Karara etkisi: yok" tone="sense" />
        </div>

        <p className={styles.verdict}>
          <b>Platform yorumu:</b> {v.line}
          {r.blank > 0 && ` ${r.blank} boş soru "kararsızlık" olarak işlendi.`}
        </p>

        <dl className={styles.facts}>
          <div>
            <dt>Cevaplanan</dt>
            <dd className="mono">
              {questions.length - r.blank}/{questions.length}
            </dd>
          </div>
          <div>
            <dt>Anahtarla aynı</dt>
            <dd className="mono">{questions.filter((x, i) => answers[i] === x.answer).length}</dd>
          </div>
          <div>
            <dt>Robot testi</dt>
            <dd className="mono">{robots}</dd>
          </div>
        </dl>

        <footer className={styles.foot}>
          <button className={base.primary} onClick={onAgain}>
            Testi yeniden çöz
          </button>
          <p className={styles.sign}>
            <i>Otomatik onaylanmıştır.</i> İnsan incelemesi: planlanmadı · İtiraz süresi: geçti
          </p>
        </footer>
      </article>

      {/* ── sağ: cevap kâğıdı ── */}
      <section className={styles.sheet} aria-labelledby="sheet-title">
        <div className={styles.sheetHead}>
          <h2 id="sheet-title" className={styles.h2}>
            Cevap kâğıdı ve yetkinlik profili
          </h2>
          <p className={styles.legend} aria-hidden="true">
            <span>
              <i className={styles.mKey} /> Anahtar
            </span>
            <span>
              <i className={styles.mSense} /> Sağduyu
            </span>
            <span>
              <i className={styles.mOther} /> Diğer
            </span>
            <span>
              <i className={styles.mBlank} /> Boş
            </span>
          </p>
        </div>

        <ol className={styles.rows}>
          {exam.map((s, si) => (
            <li key={s.title} className={styles.row}>
              <div className={styles.rowInfo}>
                <span className={styles.rowTitle}>{s.title}</span>
                <span className={styles.bar} aria-label={`Şirket ${sections[si].company}`}>
                  <i style={{ width: `${sections[si].company}%` }} />
                </span>
                <span className={`${styles.bar} ${styles.barSense}`} aria-label={`Sağduyu ${sections[si].sense}`}>
                  <i style={{ width: `${sections[si].sense}%` }} />
                </span>
                <span className={`${styles.rowNums} mono`}>
                  {sections[si].company} / {sections[si].sense}
                </span>
              </div>
              <div className={styles.chips}>
                {s.questions.map((sq) => {
                  const i = n++;
                  const m = markOf(i);
                  return (
                    <button
                      key={sq.id}
                      className={`${styles.chip} ${styles[m]} ${i === open ? styles.chipOn : ''}`}
                      aria-pressed={i === open}
                      aria-label={`Soru ${i + 1}: ${MARK_TEXT[m]}`}
                      onClick={() => setOpen(i)}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ol>

        <div className={styles.detail} aria-live="polite">
          <p className={styles.detailMeta}>
            Soru {open + 1} · {q.kind} · <b className={styles[`t${markOf(open)}`]}>{MARK_TEXT[markOf(open)]}</b>
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
          <p className={styles.why}>“{q.why}”</p>
        </div>

        <p className={styles.real}>
          <b>Gerçekte:</b> İşle ilgisiz genel kültür ve kişilik soruları başarıyı iyi öngörmez; süre baskısı yeteneği değil kaygıyı ölçer. Adil bir süreç işe benzeyen görevler, yapılandırılmış mülakat
          ve baştan açıklanan ölçütler kullanır. Çalışanın ekranını ya da geçmişini izlemek ise KVKK'ya göre ancak sınırlı durumlarda ve önceden bilgilendirmeyle mümkündür.
        </p>
      </section>
    </main>
  );
}
