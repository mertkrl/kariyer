import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../game/store/store';
import { APTITUDE_MINUTES_PER_QUESTION, APTITUDE_QUESTIONS, APTITUDE_SECONDS } from '../../game/data/aptitudeTest';
import { APTITUDE_CUTOFF, aptitudeNote, candidateAptitude, type AptitudeAnswer, type AptitudeResult } from '../../game/events/aptitude';
import { candidateOf } from '../../game/data/candidates';
import { PLAYER } from '../../game/lib/player';
import { days } from '../../game/data/days';
import { audioEngine } from '../../audio/audioEngine';
import styles from './AptitudeApp.module.css';

/*
 * Değerlendirme: şirketin dışarıdan aldığı test platformu. Teste geçen adayların puanları ve cevap
 * kâğıtları burada: hangi soruya ne işaretlediği, anahtarın ne beklediği. İstersen testi kendin de
 * çözebilirsin; soru başına süre işler ve her soru mesaiden düşer. Bir kez çözülür.
 */

const DAY_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum'];
const SELF = '__self';
const SELECTION_DAY = days.findIndex((d) => d.selection);

interface Row {
  id: string;
  name: string;
  note: string;
  result: AptitudeResult;
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
    .map((e) => ({ id: e.id, name: candidateOf(e.id).name, note: `${DAY_SHORT[e.day]} teste geçti`, result: candidateAptitude(e.id, seed) }));
  if (mine) rows.unshift({ id: SELF, name: `${PLAYER.name} (siz)`, note: 'Deneme', result: mine });
  const current = rows.find((r) => r.id === selected) ?? rows[0] ?? null;

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
      <div className={styles.split}>
        <aside className={styles.list}>
          <div className={styles.listHead}>
            <b>Sonuçlar</b>
            <span className="mono">eşik {APTITUDE_CUTOFF}</span>
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
                  <span className={`mono ${styles.score} ${r.result.score < APTITUDE_CUTOFF ? styles.below : ''}`}>{r.result.score}</span>
                </button>
              </li>
            ))}
          </ul>
          {!mine && (
            <div className={styles.selfBox}>
              <p>Adayların çözdüğü testi kendin de çözebilirsin. {APTITUDE_QUESTIONS.length} soru, soru başına {APTITUDE_SECONDS} saniye; her soru mesaiden {APTITUDE_MINUTES_PER_QUESTION} dakika götürür.</p>
              <button
                className={styles.start}
                onClick={() => {
                  audioEngine.playUi('click');
                  setTaking(true);
                }}
              >
                Testi kendin çöz
              </button>
            </div>
          )}
        </aside>
        <section className={styles.sheet}>{current ? <AnswerSheet row={current} /> : <p className={styles.empty}>Bir sonuç seç.</p>}</section>
      </div>
    </Shell>
  );
}

function AnswerSheet({ row }: { row: Row }) {
  const { result } = row;
  return (
    <>
      <header className={styles.sheetHead}>
        <div>
          <h2 className={styles.heading}>{row.name}</h2>
          <p className={styles.sub}>
            {result.correct} doğru · {APTITUDE_QUESTIONS.length - result.correct - result.timedOut} yanlış · {result.timedOut} boş
          </p>
        </div>
        <div className={`${styles.bigScore} ${result.score < APTITUDE_CUTOFF ? styles.below : ''}`}>
          <b className="mono">{result.score}</b>
          <small>{result.score < APTITUDE_CUTOFF ? 'Eşiğin altında' : 'Eşiği geçti'}</small>
        </div>
      </header>
      {aptitudeNote(row.id) && <p className={styles.platformNote}>⚑ {aptitudeNote(row.id)}</p>}
      <ol className={styles.answers}>
        {APTITUDE_QUESTIONS.map((q, i) => {
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
    </>
  );
}

function SelfTest({ onDone }: { onDone: () => void }) {
  const paused = useGameStore((s) => s.paused);
  const finish = useGameStore((s) => s.finishAptitude);
  const step = useGameStore((s) => s.aptitudeStep);
  const [answers, setAnswers] = useState<AptitudeAnswer[]>([]);
  const [left, setLeft] = useState(APTITUDE_SECONDS);
  const leftRef = useRef(left);
  const index = answers.length;
  // pencereyi yarıda kapatmak testi bitirir: cevaplanmayanlar boş sayılır (hiç cevap yoksa test başlamamıştır)
  const pending = useRef(answers);

  const answer = (a: AptitudeAnswer) => {
    const next = [...answers, a];
    pending.current = next;
    step();
    setLeft(APTITUDE_SECONDS);
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
  return (
    <div className={styles.question}>
      <div className={styles.meta}>
        <span className="mono">
          Soru {index + 1} / {APTITUDE_QUESTIONS.length} · {q.kind}
        </span>
        <span className={`mono ${left <= 10 ? styles.hurry : ''}`}>00:{String(Math.max(0, left)).padStart(2, '0')}</span>
      </div>
      <div className={styles.timer} aria-hidden="true">
        <i style={{ width: `${(Math.max(0, left) / APTITUDE_SECONDS) * 100}%` }} className={left <= 10 ? styles.timerHurry : ''} />
      </div>
      <p className={styles.prompt}>{q.prompt}</p>
      {q.figure && <div className={styles.figure}>{q.figure}</div>}
      <div className={styles.options}>
        {q.options.map((o, i) => (
          <button
            key={i}
            className={styles.option}
            onClick={() => {
              audioEngine.playUi('click');
              answer(i);
            }}
          >
            <b>{'ABCD'[i]}</b> <span>{o}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.app}>
      <header className={styles.brand}>
        <span className={styles.logo}>Assessa</span>
        <span className={styles.brandNote}>Genel Yetenek ve Uyum Değerlendirmesi · Tavrinsa Labs için</span>
      </header>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
