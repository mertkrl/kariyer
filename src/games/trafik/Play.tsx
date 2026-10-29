import { useCallback, useEffect, useRef, useState } from 'react';
import { PASS_SCORE, verdict, type Level } from './levels';
import { AMBER, DT, moveName, type Plan } from './model';
import { cycleOf } from './controller';
import { PhaseCards, PhaseEditor } from './PhaseBar';
import { applyPlan, createSim, delays, avgPedWait, los, planIssues, report, setHold, skipTo, step, type Report, type Sim } from './sim';
import { Scene } from './Scene';
import styles from './TrafikGame.module.css';

/*
 * Bir vardiya: kavşak ekranı kaplar, göstergeler ve kontrolör paneli üstünde yüzer. Süre durukken
 * plan okunur ve düzeltilir; ▶ ile trafik akar. Plan oyun sırasında da değişir (gerçek
 * kontrolörde olduğu gibi, geçerli evre bitince yeni süreler işler). "Tut" yeşili sabitler,
 * "Şimdi geç" en kısa yeşil dolunca sıradaki evreye geçer. Süre bitince tutanak gelir.
 */

const SPEEDS = [1, 2, 4];

const COACH = [
  'Alttaki ▶ trafiği başlatır (boşluk tuşu da olur). Süre durukken her şeyi rahatça ayarlayabilirsin.',
  'Evre kartları hangi yönlerin birlikte yeşil yandığını gösterir. Bir karta dokun, − / + ile o evrenin yeşil süresini değiştir.',
  'Kuyruğu uzayan kola daha çok yeşil ver. "Tut" o anki yeşili sabitler, "Şimdi geç" sıradaki evreye geçer.',
];

/** Kolun gecikmesinden kaç korna çalar: her 12 saniyede bir, en çok beş. */
const horns = (delay: number) => Math.min(5, Math.floor(delay / 12));
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const LOS_TONE: Record<string, string> = { A: '#3fae63', B: '#6dbb4a', C: '#c9b437', D: '#e6a813', E: '#e2783f', F: '#e2553f' };

export function Play({ level, briefing, last, coach = false, onNext, onRetry }: { level: Level; briefing: boolean; last: boolean; coach?: boolean; onNext: (score: number) => void; onRetry: () => void }) {
  const [sim] = useState<Sim>(() => createSim(level.spec));
  const [plan, setPlanState] = useState<Plan>(() => sim.plan);
  const [, setTick] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<Report | null>(null);
  // ilk kavşakta üç adımlık kısa anlatım; trafik başlayınca ya da "Anladım" ile kapanır
  const [lesson, setLesson] = useState(coach ? 0 : COACH.length);
  const refresh = useCallback(() => setTick((f) => f + 1), []);
  const lastUi = useRef(0);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let prev = performance.now();
    let acc = 0;
    const tick = (now: number) => {
      // sekme arkadayken biriken süreyi tek seferde koşturma
      acc += Math.min(0.25, (now - prev) / 1000) * speed;
      prev = now;
      while (acc >= DT && !sim.done) {
        step(sim);
        acc -= DT;
      }
      // arayüz saniyede birkaç kez yenilenir; harita kendi karesini çizer
      if (now - lastUi.current > 180 || sim.done) {
        lastUi.current = now;
        refresh();
      }
      if (sim.done) {
        setRunning(false);
        setResult(report(sim));
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, speed, sim, refresh]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (briefing || result || (e.target as HTMLElement).closest('input, textarea')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setRunning((r) => !r && !sim.done);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [briefing, result, sim]);

  const setPlan = (p: Plan) => {
    setPlanState(p);
    applyPlan(sim, p);
    refresh();
  };

  const issues = planIssues(sim, plan);
  const d = delays(sim);
  const pedWait = avgPedWait(sim);
  const grade = los(d.avg);
  const crashes = sim.crashes.length;
  const amb = sim.cars.find((c) => c.kind === 'ambulance');
  const cycle = cycleOf(plan);

  return (
    <main className={styles.play}>
      <Scene sim={sim} />

      <div className={styles.topRight}>
        <div className={styles.stat}>
          <small>Araç başına gecikme</small>
          <b>
            {d.avg.toFixed(0)} sn{' '}
            <span className={styles.los} style={{ background: LOS_TONE[grade] }} title="Hizmet düzeyi: A en iyi, F kilit">
              {grade}
            </span>
          </b>
        </div>
        <div className={styles.stat}>
          <small>En çok bekleyen</small>
          <b>{d.worstMv ? `${moveName(d.worstMv)} · ${d.worst.toFixed(0)} sn` : '—'}</b>
        </div>
        {level.spec.peds.length > 0 && (
          <div className={styles.stat}>
            <small>Yaya bekleyişi</small>
            <b>
              {pedWait.toFixed(0)} sn{sim.jay ? <span className={styles.bad}> · {sim.jay} kırmızıda</span> : null}
            </b>
          </div>
        )}
        <div className={styles.stat}>
          <small>Kaza</small>
          <b className={crashes ? styles.bad : undefined}>{crashes}</b>
        </div>
      </div>

      {amb && (
        <div className={styles.siren} role="status">
          <i aria-hidden="true" />
          Ambulans yolda: {moveName(amb.mv)}
        </div>
      )}

      <ol className={styles.log} aria-live="polite">
        {sim.log.slice(0, 3).map((l) => (
          <li key={`${l.t}-${l.text}`} className={styles[l.tone]}>
            <time>{clock(l.t)}</time> {l.text}
          </li>
        ))}
        {!sim.log.length && <li className={styles.info}>{level.tip}</li>}
      </ol>

      <section className={styles.console} aria-label="Kavşak kontrolörü">
        <PhaseEditor
          sim={sim}
          plan={plan}
          selected={selected}
          onSelect={setSelected}
          onPlan={setPlan}
          onJump={(i) => {
            skipTo(sim, i);
            refresh();
          }}
        />
        <div className={styles.bar}>
          <div className={styles.transport}>
            <button type="button" className={running ? styles.pauseBtn : styles.playBtn} disabled={sim.done || briefing} onClick={() => setRunning(!running)} aria-label={running ? 'Duraklat' : 'Başlat'}>
              {running ? '❚❚' : '▶'}
            </button>
            <div className={styles.timeBox}>
              <b>{clock(Math.max(0, level.spec.duration - sim.t))}</b>
              <div className={styles.speeds}>
                {SPEEDS.map((s) => (
                  <button key={s} type="button" className={speed === s ? styles.on : undefined} onClick={() => setSpeed(s)} aria-pressed={speed === s}>
                    {s}×
                  </button>
                ))}
              </div>
            </div>
          </div>

          <PhaseCards sim={sim} plan={plan} selected={selected} onSelect={setSelected} onPlan={setPlan} />

          <div className={styles.knobs}>
            <div className={styles.knob}>
              <small>Tüm kırmızı</small>
              <div className={styles.secs}>
                <button type="button" onClick={() => setPlan({ ...plan, allRed: Math.max(0, plan.allRed - 1) })} aria-label="Tüm kırmızıyı kısalt">
                  −
                </button>
                <span>
                  <b>{plan.allRed}</b> sn
                </span>
                <button type="button" onClick={() => setPlan({ ...plan, allRed: Math.min(5, plan.allRed + 1) })} aria-label="Tüm kırmızıyı uzat">
                  +
                </button>
              </div>
            </div>
            <label className={styles.toggle}>
              <input type="checkbox" checked={!!plan.sensor} onChange={(e) => setPlan({ ...plan, sensor: e.target.checked })} />
              <span>Sensörlü</span>
            </label>
            <div className={styles.live}>
              <button type="button" className={sim.ctl.hold ? styles.holdOn : undefined} disabled={sim.t === 0} onClick={() => (setHold(sim, !sim.ctl.hold), refresh())} aria-pressed={sim.ctl.hold}>
                {sim.ctl.hold ? 'Bırak' : 'Tut'}
              </button>
              <button type="button" disabled={sim.t === 0 || sim.ctl.stage !== 'green'} onClick={() => (skipTo(sim), refresh())}>
                Şimdi geç
              </button>
            </div>
            <small className={styles.cycle}>
              Döngü {cycle} sn · sarı {AMBER} sn
            </small>
          </div>
        </div>
        {(issues.hard.length > 0 || issues.warn.length > 0) && (
          <p className={styles.issues}>
            {[...issues.hard, ...issues.warn].slice(0, 2).join(' · ')}
          </p>
        )}
      </section>

      {!briefing && !running && sim.t === 0 && lesson < COACH.length && (
        <div className={styles.coach} role="dialog" aria-label="Kontrolör anlatımı">
          <small>
            Kısa anlatım · {lesson + 1}/{COACH.length}
          </small>
          <p>{COACH[lesson]}</p>
          <div>
            <button type="button" className={styles.ghost} onClick={() => setLesson(COACH.length)}>
              Atla
            </button>
            <button type="button" className={styles.primary} onClick={() => setLesson(lesson + 1)}>
              {lesson + 1 < COACH.length ? 'İleri' : 'Anladım'}
            </button>
          </div>
        </div>
      )}

      {!briefing && !running && sim.t === 0 && lesson >= COACH.length && (
        <p className={styles.paused}>
          Süre durdu. Planı incele, evre kartına dokunup düzenle; hazır olunca <b>▶</b> ya da boşluk.
        </p>
      )}

      {result && <Tutanak result={result} last={last} onNext={onNext} onRetry={onRetry} />}
    </main>
  );
}

/** Vardiya tutanağı: puanın kalemleri ve yorum; geçtiyse sonraki kavşağa. */
function Tutanak({ result, last, onNext, onRetry }: { result: Report; last: boolean; onNext: (score: number) => void; onRetry: () => void }) {
  const pass = result.score >= PASS_SCORE;
  return (
    <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="trafik-sonuc">
      <article className={styles.order}>
        <header>
          <span>TRAFİK KONTROL MERKEZİ · VARDİYA TUTANAĞI</span>
        </header>
        <h2 id="trafik-sonuc">{result.score} / 100</h2>
        <p>{verdict(result.score, !!result.jammed, result.pedHits)}</p>
        <dl>
          {result.parts.map((p) => (
            <div key={p.label} className={styles.row}>
              <dt>{p.label}</dt>
              <dd>
                {p.got} / {p.max}
              </dd>
            </div>
          ))}
          <div className={styles.row}>
            <dt>Ortalama gecikme</dt>
            <dd>
              {result.delay.toFixed(1)} sn ({result.los})
            </dd>
          </div>
          {result.worstMv && (
            <div className={styles.row}>
              <dt>En çok bekleyen</dt>
              <dd>
                {moveName(result.worstMv)} · {result.worst.toFixed(0)} sn
              </dd>
            </div>
          )}
          <div className={styles.row}>
            <dt>Geçen araç</dt>
            <dd>{result.delivered}</dd>
          </div>
        </dl>
        {result.legs.length > 0 && (
          <div className={styles.horns}>
            <b>Korna haritası</b>
            {result.legs.map((l) => (
              <div key={l.dir} className={styles.hornRow}>
                <span>{l.name}</span>
                <i aria-hidden="true">
                  <em style={{ width: `${Math.min(100, (l.delay / 80) * 100)}%`, background: LOS_TONE[los(l.delay)] }} />
                </i>
                <span className="mono" aria-label={`${l.name}: ortalama ${l.delay.toFixed(0)} saniye bekleme`}>
                  {'📢'.repeat(horns(l.delay)) || '·'} {l.delay.toFixed(0)} sn
                </span>
              </div>
            ))}
          </div>
        )}
        <div className={styles.actions}>
          {pass && (
            <button type="button" className={styles.primary} onClick={() => onNext(result.score)}>
              {last ? 'Vardiyayı bitir' : 'Sonraki kavşak'}
            </button>
          )}
          <button type="button" className={pass ? styles.ghost : styles.primary} onClick={onRetry}>
            Tekrar dene
          </button>
        </div>
      </article>
    </div>
  );
}
