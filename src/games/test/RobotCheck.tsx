import { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../../audio/audioEngine';
import { ROBOT_CHALLENGES, ROBOT_FAIL_LINES, robotPassed } from './data/robot';
import styles from './RobotCheck.module.css';

/*
 * "Ben robot değilim" penceresi: üst üste çok hızlı cevap verince sınavın üstüne açılır, süre
 * bu sırada durur. Önce onay kutusu (bir an düşünür), sonra kareli bir seçim görevi. Yanlış seçimde
 * pencere sallanır ve görev değişir; dört denemeden sonra platform pes eder ve devam ettirir.
 */

type Step = 'box' | 'spin' | 'grid' | 'pass';

export function RobotCheck({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>('box');
  const [which, setWhich] = useState(() => Math.floor(Math.random() * ROBOT_CHALLENGES.length));
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [fails, setFails] = useState(0);
  const [shake, setShake] = useState(0);
  const box = useRef<HTMLButtonElement>(null);
  const c = ROBOT_CHALLENGES[which];
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
    setWhich((w) => (w + 1) % ROBOT_CHALLENGES.length);
    setPicked(new Set());
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
    if (robotPassed(c, picked)) {
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
              <h2 id="robot-title">{c.prompt}</h2>
            </header>
            <div className={styles.grid}>
              {c.tiles.map((t, i) => (
                <button key={`${c.id}-${i}`} className={`${styles.tile} ${picked.has(i) ? styles.tileOn : ''}`} aria-pressed={picked.has(i)} onClick={() => toggle(i)}>
                  <span className={styles.icon} aria-hidden="true">
                    {t.icon}
                  </span>
                  <span className={styles.tileLabel}>{t.label}</span>
                </button>
              ))}
            </div>
            <p className={styles.hint}>{c.hint}</p>
            {fails > 0 && (
              <p className={styles.fail} role="alert">
                {ROBOT_FAIL_LINES[Math.min(fails, ROBOT_FAIL_LINES.length) - 1]}
              </p>
            )}
            <footer className={styles.foot}>
              <button className={styles.icon2} onClick={next} aria-label="Başka bir görev">
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
            <p id="robot-title">{c.passLine}</p>
            <small>Sınava dönülüyor… Süreniz bu sırada durduruldu.</small>
          </div>
        )}
      </div>
    </div>
  );
}
