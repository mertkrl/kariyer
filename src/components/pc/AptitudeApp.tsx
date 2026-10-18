import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../game/store/store';
import { APTITUDE_MINUTES_PER_QUESTION, APTITUDE_QUESTIONS, APTITUDE_SECONDS, APTITUDE_SECTIONS, sectionOf } from '../../game/data/aptitudeTest';
import { APTITUDE_CUTOFF, aptitudeNote, candidateAptitude, type AptitudeAnswer, type AptitudeResult } from '../../game/events/aptitude';
import { candidateOf } from '../../game/data/candidates';
import { PLAYER } from '../../game/lib/player';
import { days } from '../../game/data/days';
import { audioEngine } from '../../audio/audioEngine';
import { QuestionWidget } from './AptitudeWidgets';
import styles from './AptitudeApp.module.css';

/*
 * Assessa: şirketin dışarıdan aldığı "yetenek ölçüm platformu". Kurumsal bir panel: teste geçen
 * adayların puanları, yetkinlik çubukları ve cevap kâğıtları (hangi soruya ne işaretlendi, anahtar
 * ne bekliyordu). İstersen testi kendin de çözebilirsin; gözetimli sınav ekranında soru başına
 * süre işler ve her soru mesaiden düşer. Bir kez çözülür.
 */

const DAY_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum'];
const SELF = '__self';
const SELECTION_DAY = days.findIndex((d) => d.selection);
const secondsOf = (i: number) => APTITUDE_QUESTIONS[i]?.seconds ?? APTITUDE_SECONDS;

interface Row {
  id: string;
  name: string;
  note: string;
  result: AptitudeResult;
}

/** Bölüm başına doğru oranı (0–1): platformun "yetkinlik profili". */
function sectionScores(result: AptitudeResult) {
  return APTITUDE_SECTIONS.map((s, si) => {
    const qs = APTITUDE_QUESTIONS.map((q, i) => ({ q, i })).filter(({ q }) => sectionOf(q.kind) === si);
    return { title: s.title, ratio: qs.filter(({ q, i }) => result.answers[i] === q.answer).length / qs.length };
  });
}

/** Platformun her puana yapıştırdığı, hiçbir şey söylemeyen yorum. */
function verdictLine(score: number) {
  if (score >= 90) return 'Kurum kültürüyle olağanüstü uyum. Aday beklentileri sezgisel olarak kavrıyor.';
  if (score >= APTITUDE_CUTOFF) return 'Kurum kültürüyle uyumlu. Yönlendirmeye açık bir profil.';
  if (score >= 40) return 'Gelişime açık. Aday zaman zaman soruları "fazla düşünerek" yanıtlıyor.';
  return 'Uyum riski. Aday soruların bir kısmını sorgulama eğiliminde.';
}

export function AptitudeApp() {
  const seed = useGameStore((s) => s.seed);
  const dayIndex = useGameStore((s) => s.currentDayIndex);
  const weekLog = useGameStore((s) => s.weekLog);
  const mine = useGameStore((s) => s.story.aptitude);
  const [taking, setTaking] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  // teste geçen adayın sonucu ertesi sabah gelir; Perşembe'nin onayı test değil, davettir
  const rows: Row[] = weekLog
    .filter((e) => e.decision === 'approve' && e.day < Math.min(dayIndex, SELECTION_DAY))
    .map((e) => ({ id: e.id, name: candidateOf(e.id).name, note: `${DAY_SHORT[e.day]} · teste geçti`, result: candidateAptitude(e.id, seed) }));
  if (mine) rows.unshift({ id: SELF, name: `${PLAYER.name} (siz)`, note: 'İç deneme', result: mine });
  const current = rows.find((r) => r.id === selected) ?? rows[0] ?? null;
  const scored = rows.filter((r) => r.id !== SELF);
  const avg = scored.length ? Math.round(scored.reduce((n, r) => n + r.result.score, 0) / scored.length) : null;
  const passed = scored.filter((r) => r.result.score >= APTITUDE_CUTOFF).length;

  if (taking) {
    return (
      <Shell>
        <SelfTest
          onDone={() => {
            setTaking(false);
            setSelected(SELF);
          }}
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <div className={styles.dashboard}>
        <div className={styles.dashHead}>
          <div>
            <h2 className={styles.heading}>Aday Sonuçları</h2>
            <p className={styles.sub}>Genel Yetenek ve Uyum Değerlendirmesi v3.1 · Yazılım Geliştirici · eşik {APTITUDE_CUTOFF}</p>
          </div>
          <div className={styles.kpis}>
            <Kpi label="Tamamlanan" value={String(scored.length)} />
            <Kpi label="Ortalama" value={avg === null ? '—' : String(avg)} />
            <Kpi label="Eşiği geçen" value={`${passed}/${scored.length}`} />
          </div>
        </div>

        <div className={styles.split}>
          <aside className={styles.list}>
            <div className={styles.listHead}>
              <span>Aday</span>
              <span>Puan</span>
            </div>
            {rows.length === 0 && <p className={styles.empty}>Henüz tamamlanmış bir değerlendirme yok. Teste geçirdiğin adayların sonuçları ertesi sabah burada görünür.</p>}
            <ul>
              {rows.map((r) => (
                <li key={r.id}>
                  <button className={`${styles.row} ${current?.id === r.id ? styles.rowOn : ''}`} onClick={() => setSelected(r.id)}>
                    <span className={styles.rowName}>
                      {r.name}
                      <small>{r.note}</small>
                    </span>
                    <span className={`${styles.chip} ${r.result.score < APTITUDE_CUTOFF ? styles.chipBad : styles.chipOk}`}>{r.result.score}</span>
                  </button>
                </li>
              ))}
            </ul>
            {!mine && (
              <div className={styles.selfBox}>
                <b>Kendi deneyiminizi ölçün</b>
                <p>
                  Adayların çözdüğü testi siz de çözebilirsiniz. {APTITUDE_QUESTIONS.length} soru, 3 bölüm, iş hayatı simülasyonları dahil. Her soru mesaiden {APTITUDE_MINUTES_PER_QUESTION}{' '}
                  dakika götürür.
                </p>
                <button
                  className={styles.primary}
                  onClick={() => {
                    audioEngine.playUi('click');
                    setTaking(true);
                  }}
                >
                  Teste başla
                </button>
              </div>
            )}
          </aside>
          <section className={styles.sheet}>{current ? <Report row={current} /> : <p className={styles.empty}>Bir sonuç seçin.</p>}</section>
        </div>
      </div>
    </Shell>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.kpi}>
      <b className="mono">{value}</b>
      <small>{label}</small>
    </div>
  );
}

function Report({ row }: { row: Row }) {
  const { result } = row;
  const below = result.score < APTITUDE_CUTOFF;
  const note = aptitudeNote(row.id);
  return (
    <>
      <header className={styles.reportHead}>
        <div>
          <small className={styles.kicker}>Aday raporu · ASX-{(row.id.length * 7919).toString(16).toUpperCase()}</small>
          <h2 className={styles.heading}>{row.name}</h2>
          <p className={styles.sub}>
            {result.correct} doğru · {APTITUDE_QUESTIONS.length - result.correct - result.timedOut} yanlış · {result.timedOut} boş
          </p>
        </div>
        <div className={`${styles.ring} ${below ? styles.ringBad : ''}`} style={{ ['--p' as string]: result.score }}>
          <b className="mono">{result.score}</b>
          <small>{below ? 'Eşiğin altında' : 'Eşiği geçti'}</small>
        </div>
      </header>

      <div className={styles.profile}>
        <div className={styles.bars}>
          {sectionScores(result).map((s) => (
            <div key={s.title} className={styles.bar}>
              <span>{s.title}</span>
              <span className={styles.barTrack}>
                <i style={{ width: `${Math.round(s.ratio * 100)}%` }} />
              </span>
              <span className="mono">%{Math.round(s.ratio * 100)}</span>
            </div>
          ))}
        </div>
        <p className={styles.verdict}>
          <b>Platform yorumu:</b> {verdictLine(result.score)} <span className={styles.muted}>Normlara göre üst %{Math.max(1, 100 - result.score)}.</span>
        </p>
      </div>

      {note && <p className={styles.platformNote}>⚑ {note}</p>}

      {APTITUDE_SECTIONS.map((s, si) => (
        <section key={s.id} className={styles.answerSection}>
          <h3>{s.title}</h3>
          <ol className={styles.answers}>
            {APTITUDE_QUESTIONS.map((q, i) => ({ q, i }))
              .filter(({ q }) => sectionOf(q.kind) === si)
              .map(({ q, i }) => {
                const a = result.answers[i];
                const ok = a === q.answer;
                return (
                  <li key={q.id} className={styles.answer}>
                    <span className={`${styles.mark} ${ok ? styles.markOk : styles.markBad}`} aria-label={ok ? 'doğru' : a === null ? 'boş' : 'yanlış'}>
                      {ok ? '✓' : a === null ? '⏱' : '✗'}
                    </span>
                    <div>
                      <p className={styles.q}>
                        <span className="mono">{q.kind}</span> {q.prompt}
                      </p>
                      {q.figure && <p className={styles.miniFigure}>{q.figure}</p>}
                      <p className={styles.given}>İşaretlenen: {a === null ? <i>süre doldu</i> : <b>{q.options[a]}</b>}</p>
                      {!ok && <p className={styles.key}>Anahtar: {q.options[q.answer]}</p>}
                    </div>
                  </li>
                );
              })}
          </ol>
        </section>
      ))}
      <p className={styles.fineprint}>
        Bu rapor Assessa'nın yapay zekâ destekli psikometrik modeli tarafından üretilmiştir. Sonuçlar tek başına işe alım kararı için kullanılmamalıdır.* · *Lisans sözleşmesinin
        14.c maddesi bu uyarıyı bağlayıcı kılmaz.
      </p>
    </>
  );
}

function SelfTest({ onDone }: { onDone: () => void }) {
  const paused = useGameStore((s) => s.paused);
  const finish = useGameStore((s) => s.finishAptitude);
  const step = useGameStore((s) => s.aptitudeStep);
  const [answers, setAnswers] = useState<AptitudeAnswer[]>([]);
  const [left, setLeft] = useState(secondsOf(0));
  const leftRef = useRef(left);
  const index = answers.length;
  // pencereyi yarıda kapatmak testi bitirir: cevaplanmayanlar boş sayılır (hiç cevap yoksa test başlamamıştır)
  const pending = useRef(answers);

  const answer = (a: AptitudeAnswer) => {
    const next = [...answers, a];
    pending.current = next;
    step();
    setLeft(secondsOf(next.length));
    setAnswers(next);
    if (next.length === APTITUDE_QUESTIONS.length) {
      finish(next);
      onDone();
    }
  };

  useEffect(
    () => () => {
      if (pending.current.length > 0 && pending.current.length < APTITUDE_QUESTIONS.length) finish(pending.current);
    },
    [finish],
  );

  // süre dolunca soru boş geçer; sayaç saniyede bir iner, oyun duraklatılınca durur
  const answerRef = useRef(answer);
  useEffect(() => {
    answerRef.current = answer;
    leftRef.current = left;
  });
  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setLeft((s) => s - 1);
      if (leftRef.current <= 1) answerRef.current(null);
    }, 1000);
    return () => window.clearInterval(id);
  }, [paused]);

  const q = APTITUDE_QUESTIONS[index];
  if (!q) return null;
  const total = secondsOf(index);
  const section = sectionOf(q.kind);
  return (
    <div className={styles.exam}>
      <div className={styles.examBar}>
        <span className={styles.examSection}>
          Bölüm {section + 1}/{APTITUDE_SECTIONS.length} · {APTITUDE_SECTIONS[section].title}
        </span>
        <span className={styles.proctor}>● Kamera gözetimi aktif</span>
        <span className={`mono ${styles.clock} ${left <= 10 ? styles.hurry : ''}`}>00:{String(Math.max(0, left)).padStart(2, '0')}</span>
      </div>
      <ol className={styles.steps} aria-label={`Soru ${index + 1} / ${APTITUDE_QUESTIONS.length}`}>
        {APTITUDE_QUESTIONS.map((x, i) => (
          <li key={x.id} className={i < index ? styles.stepDone : i === index ? styles.stepNow : undefined} />
        ))}
      </ol>
      <div className={styles.timer} aria-hidden="true">
        <i style={{ width: `${(Math.max(0, left) / total) * 100}%` }} className={left <= 10 ? styles.timerHurry : ''} />
      </div>
      <div className={styles.question}>
        <span className={styles.qMeta}>
          Soru {index + 1} · {q.kind}
        </span>
        <p className={styles.prompt}>{q.prompt}</p>
        {q.figure && <div className={styles.figure}>{q.figure}</div>}
        <QuestionWidget key={q.id} q={q} onAnswer={answer} />
        {q.hint && <p className={styles.hint}>{q.hint}</p>}
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.app}>
      <header className={styles.brand}>
        <span className={styles.logo}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M12 2 21 7v10l-9 5-9-5V7z" fill="currentColor" opacity="0.18" />
            <path d="M12 6 17 9v6l-5 3-5-3V9z" fill="currentColor" />
          </svg>
          Assessa <small>Talent Insights</small>
        </span>
        <nav className={styles.brandNav} aria-hidden="true">
          <span className={styles.navOn}>Sonuçlar</span>
          <span>Normlar</span>
          <span>Lisans</span>
        </nav>
        <span className={styles.user}>Tavrinsa Labs · {PLAYER.name}</span>
      </header>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
