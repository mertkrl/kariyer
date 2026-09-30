import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { lineupFor, useGameStore } from '../game/store';
import { days } from '../game/data/days';
import { AD_EFFECT } from '../game/data/jobs';
import { Button } from '../components/ui/Button';
import { AiIcon } from '../components/ui/AiIcon';
import { audioEngine } from '../audio/audioEngine';
import { PaperStorm, type Point } from './flood/PaperStorm';
import { ParquetFloor } from './flood/ParquetFloor';
import styles from './ApplicationFloodScreen.module.css';

const COUNT_DURATION_MS = 2200;
const SCAN_DURATION_MS = 1300;
const SORT_DURATION_MS = 3200;
const SORT_COUNTDOWN_MS = 1400;

const INCOMING_COUNT = 64;
const EJECTED_COUNT = 84;
const EJECTED_COUNT_CHAOTIC = 110;
/** With this many sheets, individual paper sounds would smear into noise — keep them spaced. */
const MIN_PAPER_SOUND_GAP_MS = 55;
/** Seconds over which incoming CVs keep arriving (most of the counting phase). */
const INCOMING_WINDOW = (COUNT_DURATION_MS / 1000) * 0.78;
/** Landing sounds beyond this many would turn into noise. */
const MAX_LANDING_SOUNDS = 14;

/** Area around the AI core (px) that landed CVs stay out of, so the counter and button stay readable. */
const CLEAR_ZONE = { halfWidth: 210, above: 340, below: 140 };

type Stage = 'counting' | 'scanning' | 'sorting' | 'done';

export function ApplicationFloodScreen() {
  const currentDayIndex = useGameStore((s) => s.currentDayIndex);
  const proceedToBriefing = useGameStore((s) => s.proceedToBriefing);
  const day = days[currentDayIndex];
  // the first morning: who never applied because of the ad you picked
  const adNote = useGameStore((s) => (s.currentDayIndex === 0 && s.selectedJobId ? AD_EFFECT[s.selectedJobId]?.note : undefined));
  const lineups = useGameStore((s) => s.lineups);
  const shortlist = lineupFor({ currentDayIndex, lineups }).length;
  const startValue = currentDayIndex > 0 ? days[currentDayIndex - 1].applicationTarget : 0;

  const [count, setCount] = useState(startValue);
  const [stage, setStage] = useState<Stage>('counting');
  const [origin, setOrigin] = useState<Point | null>(null);
  const brainRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const timeoutsRef = useRef<number[]>([]);
  const lastPulse = useRef(0);
  const lastPaperSound = useRef(0);

  // Measure where the AI core sits so papers fly to/from it across the full viewport.
  useLayoutEffect(() => {
    function measure() {
      const r = brainRef.current?.getBoundingClientRect();
      if (r) setOrigin({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    setCount(startValue);
    setStage('counting');
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];

    // Tension riser under the counter; the per-CV "swallow" sounds come from PaperStorm.
    audioEngine.startFloodRiser(COUNT_DURATION_MS / 1000);

    // Counter: mechanical ticks that start fast and slow down with the easing, like a settling wheel.
    const start = performance.now();
    let lastTick = 0;
    let lastValue = startValue;
    function step(now: number) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / COUNT_DURATION_MS);
      const eased = 1 - (1 - progress) * (1 - progress);
      const value = Math.round(startValue + (day.applicationTarget - startValue) * eased);
      setCount(value);
      if (value !== lastValue && now - lastTick > 32 + progress * 110) {
        audioEngine.playCounterTick(progress);
        lastTick = now;
      }
      lastValue = value;
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    }
    rafRef.current = requestAnimationFrame(step);

    timeoutsRef.current.push(
      window.setTimeout(() => {
        setStage('scanning');
        audioEngine.startScan(SCAN_DURATION_MS / 1000, [0.25, 0.6, 0.95], false);
      }, COUNT_DURATION_MS),
      window.setTimeout(() => {
        audioEngine.stopScan(0.06);
        setStage('sorting');
      }, COUNT_DURATION_MS + SCAN_DURATION_MS),
    );

    // Non-crash days end in an actionable "N aday seçildi" badge instead of an
    // automatic timeout — the player clicks it to move on. The AI-down day has
    // no such badge, so it still resolves into an error screen on its own.
    if (day.aiDown) {
      timeoutsRef.current.push(
        window.setTimeout(() => setStage('done'), COUNT_DURATION_MS + SCAN_DURATION_MS + SORT_DURATION_MS),
      );
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      audioEngine.stopFloodRiser();
      audioEngine.stopScan();
    };
    // oxlint-disable-next-line react/exhaustive-deps
  }, [currentDayIndex]);

  // Once the AI starts sorting, the applicant count counts back down as CVs
  // get flung out of the core, landing on the shortlist it kept.
  useEffect(() => {
    if (stage !== 'sorting' || day.aiDown) return;

    const startCount = day.applicationTarget;
    const start = performance.now();
    let raf: number;
    let lastTick = 0;

    function step(now: number) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / SORT_COUNTDOWN_MS);
      const eased = 1 - (1 - progress) * (1 - progress);
      const value = Math.round(startCount - (startCount - shortlist) * eased);
      setCount(value);
      // Descending ticks: the pitch falls as the pile shrinks.
      if (progress > 0.08 && now - lastTick > 40 + progress * 120) {
        audioEngine.playCounterTick(1 - progress);
        lastTick = now;
      }
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      }
    }

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // oxlint-disable-next-line react/exhaustive-deps
  }, [stage, currentDayIndex]);

  /** The core swallows a CV: paper "fwip" from its side + a quick pulse of the icon. */
  function handleAbsorb(pan: number) {
    const now = performance.now();
    if (now - lastPaperSound.current >= MIN_PAPER_SOUND_GAP_MS) {
      lastPaperSound.current = now;
      audioEngine.playPaperIn(pan * 0.8);
    }
    if (now - lastPulse.current < 90) return;
    lastPulse.current = now;
    brainRef.current?.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.14)' }, { transform: 'scale(1)' }],
      { duration: 200, easing: 'ease-out' },
    );
  }

  const isDone = stage === 'done';
  const isCountingDown = stage === 'sorting' && !day.aiDown;
  const counterLabel = isCountingDown ? 'Başvuru kaldı' : 'başvuru alındı';

  return (
    <div className={styles.screen}>
      <ParquetFloor />
      {origin && stage === 'counting' && (
        <PaperStorm
          key={`in-${currentDayIndex}`}
          mode="in"
          origin={origin}
          count={INCOMING_COUNT}
          window={INCOMING_WINDOW}
          onAbsorb={handleAbsorb}
        />
      )}
      {origin && (stage === 'sorting' || stage === 'done') && (
        <PaperStorm
          key={`out-${currentDayIndex}`}
          mode="out"
          origin={origin}
          count={day.aiDown ? EJECTED_COUNT_CHAOTIC : EJECTED_COUNT}
          chaotic={!!day.aiDown}
          clear={CLEAR_ZONE}
          onLaunch={(papers) => audioEngine.playScatter(papers, !!day.aiDown)}
          onLand={(pan, i) => {
            if (i < MAX_LANDING_SOUNDS) audioEngine.playPaperLand(pan * 0.8);
          }}
        />
      )}

      <div className={styles.content}>
        <div className={styles.eyebrow}>Gün {day.day} · Başvuru Akışı</div>

        <div className={styles.counterBox}>
          <div className={`${styles.counter} ${stage === 'counting' ? styles.counterLive : ''} mono`}>
            {count.toLocaleString('tr-TR')}
          </div>
          <div className={styles.counterLabel}>{counterLabel}</div>
        </div>

        <div className={styles.brainStage} style={isDone ? { display: 'none' } : undefined}>
          <div
            className={`${styles.brainArena} ${stage === 'sorting' ? (day.aiDown ? styles.arenaShakeHard : styles.arenaShake) : ''}`}
          >
            <div
              ref={brainRef}
              className={`${styles.brainWrap} ${stage === 'scanning' ? styles.brainScanning : ''} ${
                stage === 'sorting' ? (day.aiDown ? styles.brainGlitch : styles.brainBurst) : ''
              }`}
            >
              {stage === 'scanning' && <div className={styles.scanRing} />}
              {stage === 'sorting' && (
                <>
                  <div className={`${styles.shockwave} ${day.aiDown ? styles.shockwaveError : ''}`} />
                  <div className={`${styles.shockwave} ${styles.shockwaveDelay} ${day.aiDown ? styles.shockwaveError : ''}`} />
                </>
              )}
              <AiIcon className={styles.brain} />
            </div>

            {stage === 'sorting' && !day.aiDown && (
              <button
                className={styles.selectedBadge}
                onClick={() => {
                  audioEngine.playUi('confirm');
                  proceedToBriefing();
                }}
              >
                ✓ {shortlist} aday seçildi — Adayları Gör →
              </button>
            )}
            {stage === 'sorting' && adNote && <div className={styles.adNote}>📢 {adNote}</div>}
          </div>

          <div className={`${styles.stageLabel} ${stage === 'sorting' && day.aiDown ? styles.stageLabelError : ''}`}>
            {stage === 'counting' && 'Başvurular geliyor…'}
            {stage === 'scanning' && "CV'ler taranıyor…"}
            {stage === 'sorting' && day.aiDown && '⚡ Sistem çöküyor…'}
          </div>
        </div>

        {isDone && day.aiDown && (
          <div className={`${styles.resultBox} ${styles.errorBox}`}>
            <div className={`${styles.resultBadge} ${styles.resultBadgeError}`}>
              <AiIcon className={styles.resultBadgeIcon} />
              <div className={styles.resultBadgeSlash} />
            </div>
            <div className={styles.resultTitle}>SİSTEM HATASI: AI Modülü Yanıt Vermiyor</div>
            <div className={styles.resultText}>
              Yapay zeka analiz sistemi çöktü. Bugün {count.toLocaleString('tr-TR')} başvuru
              arasından hangi {shortlist} kişiyi göreceğine hiçbir algoritma karar vermiyor — bu sefer
              tamamen sana kalmış.
            </div>
            <Button variant="danger" onClick={proceedToBriefing}>
              Kendi Kararını Ver →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
