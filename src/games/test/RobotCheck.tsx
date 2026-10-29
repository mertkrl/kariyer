import { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../../audio/audioEngine';
import { puzzleSolved, ROBOT_CHALLENGES, ROBOT_FAIL_LINES, ROBOT_PUZZLES, robotPassed, type RobotChallenge, type RobotPuzzle } from './data/robot';
import styles from './RobotCheck.module.css';

/*
 * "Ben robot değilim" penceresi: üst üste çok hızlı cevap verince sınavın üstüne açılır, süre
 * bu sırada durur. Önce onay kutusu (bir an düşünür), sonra kareli bir seçim görevi. Yanlış seçimde
 * pencere sallanır ve görev değişir; dört denemeden sonra platform pes eder ve devam ettirir.
 */

const MAX_SKIPS = 2;

type Step = 'box' | 'spin' | 'grid' | 'pass';

/** Kareli görevler ve diğer türler tek destede, sırayla karışık gelir. */
type Task = { kind: 'grid'; c: RobotChallenge } | RobotPuzzle;
const TASKS: Task[] = ROBOT_CHALLENGES.flatMap((c, i) => {
  const p = ROBOT_PUZZLES[i];
  return p ? [{ kind: 'grid' as const, c }, p] : [{ kind: 'grid' as const, c }];
}).concat(ROBOT_PUZZLES.slice(ROBOT_CHALLENGES.length));

export function RobotCheck({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>('box');
  const [which, setWhich] = useState(() => Math.floor(Math.random() * TASKS.length));
  const [picked, setPicked] = useState<Set<number>>(new Set());
  // kareli olmayan görevin cevabı: yazı, kaydırıcı değeri ya da şık
  const [value, setValue] = useState<string | number | null>(null);
  const [fails, setFails] = useState(0);
  const [shake, setShake] = useState(0);
  // ↻ ile görev değiştirme hakkı sınırlı; zor görev sonsuza dek atlanamaz
  const [skips, setSkips] = useState(0);
  const box = useRef<HTMLButtonElement>(null);
  const task = TASKS[which];
  const passLine = task.kind === 'grid' ? task.c.passLine : task.passLine;
  const giveUp = fails >= ROBOT_FAIL_LINES.length;

  useEffect(() => box.current?.focus(), []);
  useEffect(() => {
    if (step !== 'spin') return;
    const id = window.setTimeout(() => setStep('grid'), 1300);
    return () => window.clearTimeout(id);
  }, [step]);
  useEffect(() => {
    if (step !== 'pass') return;
    const id = window.setTimeout(onDone, 1800);
    return () => window.clearTimeout(id);
  }, [step, onDone]);

  const next = () => {
    setWhich((w) => (w + 1) % TASKS.length);
    setPicked(new Set());
    setValue(null);
  };
  const toggle = (i: number) => {
    audioEngine.playUi('click');
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  };
  const verify = () => {
    if (task.kind === 'grid' ? robotPassed(task.c, picked) : puzzleSolved(task, value)) {
      setStep('pass');
      return;
    }
    setFails((f) => f + 1);
    setShake((n) => n + 1);
    next();
  };

  return (
    <div className={styles.overlay}>
      <div key={shake} className={`${styles.window} ${shake ? styles.shake : ''}`} role="dialog" aria-modal="true" aria-labelledby="robot-title">
        {step === 'box' || step === 'spin' ? (
          <>
            <p id="robot-title" className={styles.why}>
              Çok hızlı ve tutarlı cevap veriyorsunuz. İnsanlar genellikle tereddüt eder.
            </p>
            <div className={styles.boxRow}>
              <button ref={box} className={styles.check} role="checkbox" aria-checked={step === 'spin'} disabled={step === 'spin'} onClick={() => setStep('spin')}>
                {step === 'spin' && <span className={styles.spinner} aria-hidden="true" />}
              </button>
              <span className={styles.boxLabel}>Ben robot değilim</span>
              <span className={styles.brand}>
                <b>◎</b>
                UyumCAPTCHA
                <small>Gizlilik · Şartlar</small>
              </span>
            </div>
          </>
        ) : step === 'grid' ? (
          <>
            <header className={styles.head}>
              <small>Doğrulama gerekiyor</small>
              <h2 id="robot-title">{task.kind === 'grid' ? task.c.prompt : task.prompt}</h2>
            </header>
            {task.kind === 'grid' && (
              <div className={styles.grid}>
                {task.c.tiles.map((t, i) => (
                  <button key={`${task.c.id}-${i}`} className={`${styles.tile} ${picked.has(i) ? styles.tileOn : ''}`} aria-pressed={picked.has(i)} onClick={() => toggle(i)}>
                    <span className={styles.icon} aria-hidden="true">
                      {t.icon}
                    </span>
                    <span className={styles.tileLabel}>{t.label}</span>
                  </button>
                ))}
              </div>
            )}
            {task.kind === 'text' && (
              <div key={task.id} className={styles.textTask}>
                <p className={styles.warped} aria-label={task.shown}>
                  {[...task.shown].map((ch, i) => (
                    <span key={i} style={{ transform: `rotate(${((i * 37) % 23) - 11}deg) translateY(${((i * 13) % 9) - 4}px)` }}>
                      {ch}
                    </span>
                  ))}
                </p>
                <input className={styles.textInput} value={typeof value === 'string' ? value : ''} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && verify()} placeholder="Gördüğünüzü yazın" autoFocus />
              </div>
            )}
            {task.kind === 'slider' && (
              <div key={task.id} className={styles.sliderTask}>
                <b className="mono">%{typeof value === 'number' ? value : 0}</b>
                <input type="range" min={0} max={100} value={typeof value === 'number' ? value : 0} onChange={(e) => setValue(Number(e.target.value))} aria-label={task.prompt} />
                <span>
                  <small>{task.low}</small>
                  <small>{task.high}</small>
                </span>
              </div>
            )}
            {task.kind === 'choice' && (
              <div key={task.id} className={styles.choices}>
                {task.options.map((o, i) => (
                  <button
                    key={o}
                    className={`${styles.choice} ${value === i ? styles.choiceOn : ''}`}
                    aria-pressed={value === i}
                    onClick={() => {
                      audioEngine.playUi('click');
                      setValue(i);
                    }}
                  >
                    {o}
                  </button>
                ))}
              </div>
            )}
            <p className={styles.hint}>{task.kind === 'grid' ? task.c.hint : task.hint}</p>
            {fails > 0 && (
              <p className={styles.fail} role="alert">
                {ROBOT_FAIL_LINES[Math.min(fails, ROBOT_FAIL_LINES.length) - 1]}
              </p>
            )}
            <footer className={styles.foot}>
              <button
                className={styles.icon2}
                disabled={skips >= MAX_SKIPS}
                onClick={() => {
                  setSkips((n) => n + 1);
                  next();
                }}
                aria-label={`Başka bir görev (${MAX_SKIPS - skips} hak)`}
                title={skips >= MAX_SKIPS ? 'Görev değiştirme hakkınız doldu' : undefined}
              >
                ↻
              </button>
              <span className={styles.footBrand}>UyumCAPTCHA</span>
              {giveUp ? (
                <button className={styles.verify} onClick={onDone}>
                  Yine de devam et
                </button>
              ) : (
                <button className={styles.verify} onClick={verify}>
                  Doğrula
                </button>
              )}
            </footer>
          </>
        ) : (
          <div className={styles.pass} role="status">
            <span className={styles.passMark} aria-hidden="true">
              ✓
            </span>
            <p id="robot-title">{passLine}</p>
            <small>Sınava dönülüyor… Süreniz bu sırada durduruldu.</small>
          </div>
        )}
      </div>
    </div>
  );
}
