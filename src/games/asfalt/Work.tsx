import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../components/ui/motion';
import { PASS_SCORE, REMARKS, TOOL_LABEL, verdict, type Level, type Tool } from './levels';
import { CHUTE_Y, H, PRICE, ROAD, ROLLER_W, SAW_PRICE, TACK_PRICE, TICKS_PER_SEC, TRAFFIC, W, checklist, costOf, createWorld, dig, driveRoller, endDay, gradeTraffic, passVehicle, pour, rake, surfaceTemp, tamp, toggleVibe, probe, pump, raining, runTraffic, sawCut, spray, startTraffic, step, surfaceAt, findPit, railSpill, type Material, type Probe, type Report, type StepKey, type VehicleKind, type Weather, type World } from './model';
import { draw, newImage, SCALE } from './render';
import { Backdrop, CarSprite, RollerSprite, VEHICLE } from './Site';
import styles from './AsfaltGame.module.css';
import ui from './Work.module.css';

/*
 * Bir iş: çukurun başında ekip. Basılı tutunca seçili araç çalışır; dünya saniyede 60 adım
 * ilerler, tuval her karede çizilir. "Trafiğe aç" ile üç gün geçer (güneş, yağmur, kar); her gün
 * araçlar tek tek geçer ve yama gözün önünde oturur. Sonunda hakediş fişi gelir.
 */

const MATERIALS: Tool[] = ['soil', 'gravel', 'asphalt'];
const SWATCH: Record<Tool, string> = { tamper: '#8a8f9a', rake: '#b0855a', saw: '#c0392b', soil: '#966a42', gravel: '#a49e92', tack: '#3a2a20', asphalt: '#2a2a2e', shovel: '#7a6a55', pump: '#4684ba', roller: '#e6a813', probe: '#2f7a4e' };
/** Bir hücre yapıştırıcı kaç litre bitüm emülsiyonu. */
const TACK_LITRE = 0.6;
/** Bir hücre kaç kilo. */
const KG_PER_CELL = 25;

type Stage = 'work' | 'traffic' | 'receipt';
interface Hud {
  cost: number;
  sec: number;
  rain: boolean;
  /** Çukurdaki sıcak asfaltın ortalama sıcaklığı (°C). */
  temp: number | null;
  cuts: number;
}

const money = (n: number) => `${Math.round(n).toLocaleString('tr-TR')} ₺`;
const tons = (cells: number) => `${((cells * KG_PER_CELL) / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} t`;

/**
 * İş sırası: sahadaki gerçek yama sırası. Biten adım işaretlenir (model.checklist); su motoru gibi
 * yalnızca bazı işlerde olan araçların adımı o işte görünür.
 */
const STEPS: { key: StepKey; text: string; tool?: Tool }[] = [
  { key: 'water', text: 'Suyu çek', tool: 'pump' },
  { key: 'cut', text: 'Kenarları kes' },
  { key: 'rubble', text: 'Molozu al' },
  { key: 'base', text: 'Toprak 30 cm altta, üstü mıcır; her kat silindirli' },
  { key: 'tack', text: 'Kenara, tabana yapıştırıcı' },
  { key: 'asphalt', text: 'Asfaltı hizanın biraz üstüne dök' },
  { key: 'roll', text: '78 °C altına inmeden silindirle' },
  { key: 'cool', text: 'Soğuyunca trafiğe aç' },
];

const SAW_LINE: Record<string, string> = { ok: 'sawOk', done: 'sawDone', far: 'sawFar', cracked: 'sawCracked', inside: 'sawInside' };

/** Asfaltın sıcaklığına göre ne yapılacağı: serme, sıkıştırma, soğuma. */
const tempWord = (t: number) => (t >= 135 ? 'serme sıcaklığı' : t >= 78 ? 'sıkıştır' : 'sıkışmaz, soğuyor');

export function Work({ level, last, onNext, onRetry }: { level: Level; last: boolean; onNext: (score: number) => void; onRetry: () => void }) {
  const world = useRef<World>(null as unknown as World);
  if (!world.current) world.current = createWorld(level.spec);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stageEl = useRef<HTMLDivElement>(null);
  const toolRef = useRef<Tool>(level.tools[0]);
  const pointer = useRef({ x: 0, y: 0, down: false, over: false, fresh: false, cx: 0, cy: 0 });
  const [tool, setTool] = useState<Tool>(level.tools[0]);
  const [hud, setHud] = useState<Hud>({ cost: 0, sec: 0, rain: raining(world.current), temp: null, cuts: 0 });
  const [done, setDone] = useState<Record<StepKey, boolean>>(() => checklist(world.current));
  const [reading, setReading] = useState<Probe | null>(null);
  const [remark, setRemark] = useState({ text: REMARKS.start, id: 0 });
  const [stage, setStage] = useState<Stage>('work');
  const stageRef = useRef<Stage>('work');
  const [report, setReport] = useState<Report | null>(null);
  const [car, setCar] = useState<{ x: number; shake: number; kind: VehicleKind }>({ x: -30, shake: 0, kind: 'dolmus' });
  const [profile, setProfile] = useState<number[] | null>(null);
  const [day, setDay] = useState<{ weather: Weather; label: string } | null>(null);
  const alive = useRef(true);
  /** Karın kalınlığı (0–1): kar günü boyunca birikir. */
  const snow = useRef(0);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const [overlay, setOverlay] = useState({ rollerX: -1, rollerY: 0, vibe: true, px: 0, py: 0, over: false, down: false });

  const pick = (t: Tool) => {
    toolRef.current = t;
    setTool(t);
  };

  // dünyanın döngüsü: sabit adım, kare başına en çok dört adım
  useEffect(() => {
    const w = world.current;
    const ctx = canvas.current!.getContext('2d')!;
    const img = newImage(ctx);
    const said = new Set<string>(['start']);
    const say = (key: string) => {
      if (said.has(key)) return;
      said.add(key);
      setRemark((r) => ({ text: REMARKS[key], id: r.id + 1 }));
    };
    let wasRaining = raining(w);
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let frame = 0;
    const deadline = level.spec.deadlineSec ? level.spec.deadlineSec * TICKS_PER_SEC : Infinity;

    const loop = (now: number) => {
      acc = Math.min(acc + (now - last) / 1000, 4 / TICKS_PER_SEC);
      last = now;
      if (stageRef.current === 'work') {
        while (acc >= 1 / TICKS_PER_SEC) {
          acc -= 1 / TICKS_PER_SEC;
          const p = pointer.current;
          const t = toolRef.current;
          // kesme makinesi her basışta bir kez keser: kısa bir dokunuş da sayılır
          if (p.fresh) {
            p.fresh = false;
            if (t === 'saw' && level.strictBudget && costOf(w) >= level.budget) say('budgetLock');
            else if (t === 'saw') {
              const r = sawCut(w, p.x);
              setRemark((m) => ({ text: REMARKS[SAW_LINE[r]], id: m.id + 1 }));
            }
          }
          if (p.down) {
            const locked = level.strictBudget && costOf(w) >= level.budget;
            const late = t === 'gravel' && w.tick < (level.gravelAfterSec ?? 0) * TICKS_PER_SEC;
            if (t === 'soil' || t === 'gravel' || t === 'asphalt') {
              if (locked) say('budgetLock');
              // malzeme kamyonun oluğundan akar: imleç yalnızca oluğun nereye çevrileceğini seçer
              else if (!late) pour(w, t, p.x, CHUTE_Y, 2, 3);
              if (t === 'asphalt' && !checklist(w).tack) say('tackFirst');
            } else if (t === 'saw') {
              // kesme makinesi basışta keser (aşağıda), basılı tutmak bir şey değiştirmez
            } else if (t === 'tack') {
              if (locked) say('budgetLock');
              else if (w.tick % 2 === 0) spray(w, p.x, p.y, 4);
            } else if (t === 'tamper') {
              tamp(w, p.x, p.y);
            } else if (t === 'rake') {
              if (w.tick % 3 === 0) rake(w, p.x);
            } else if (t === 'probe') {
              // ölçüm dünyaya dokunmaz
            } else if (t === 'shovel') {
              if (w.tick % 2 === 0) dig(w, p.x, p.y, 4);
            } else if (t === 'pump') pump(w, p.x, p.y, 6);
            else driveRoller(w, p.x - ROLLER_W / 2);
          }
          step(w);
        }
        for (const e of w.events) say(e);
        const r = raining(w);
        if (wasRaining && !r) say('rainStop');
        wasRaining = r;
        if (deadline - w.tick < 20 * TICKS_PER_SEC && deadline !== Infinity) say('deadline');
        if (!level.strictBudget && costOf(w) > level.budget) say('overBudget');
        if (level.gravelAfterSec) {
          if (w.tick < level.gravelAfterSec * TICKS_PER_SEC) say('gravelLate');
          else say('gravelHere');
        }
        if (level.spec.rail && w.tick % 30 === 0 && railSpill(w) > 3) say('rail');
        if (w.tick >= deadline) finish();
        draw(ctx, img, w);
        if (frame++ % 6 === 0) {
          setHud({ cost: costOf(w), sec: Math.floor(w.tick / TICKS_PER_SEC), rain: r, temp: surfaceTemp(w), cuts: (w.cuts.left !== null ? 1 : 0) + (w.cuts.right !== null ? 1 : 0) });
          // frame burada bir artmış: altı karede bir girilen bu bloğa her üçüncü girişte iş sırası okunur
          if (frame % 18 === 1) setDone(checklist(w));
          const p = pointer.current;
          setReading(toolRef.current === 'probe' && p.over ? probe(w, p.x) : null);
          setOverlay({ rollerX: w.roller ? w.roller.x : -1, rollerY: w.roller ? w.roller.y : 0, vibe: !!w.roller?.vibe, px: p.x, py: p.y, over: p.over, down: p.down });
        }
      }
      // trafik günleri: yağmurda dünya akmaya devam eder (su birikir, süzülür); karda yüzey örtülür
      if (stageRef.current === 'traffic') {
        while (acc >= 1 / TICKS_PER_SEC) {
          acc -= 1 / TICKS_PER_SEC;
          if (w.weather === 'rain') step(w);
          if (w.weather === 'snow') snow.current = Math.min(1, snow.current + 1 / (TICKS_PER_SEC * 6));
        }
        draw(ctx, img, w, w.weather === 'snow' ? snow.current : 0);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [level]);

  // klavye: rakamlar araç seçer, oklar silindiri sürer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (stageRef.current !== 'work' || e.metaKey || e.ctrlKey || e.altKey) return;
      // 1–9 ve 0 (onuncu araç) seçer; V silindirin titreşimini açar, kapatır
      const t = level.tools[e.key === '0' ? 9 : Number(e.key) - 1];
      if (t && /^[0-9]$/.test(e.key)) return pick(t);
      if (e.key === 'v' || e.key === 'V') return toggleVibe(world.current);
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const w = world.current;
        const from = w.roller ? w.roller.target : e.key === 'ArrowLeft' ? W : 0;
        driveRoller(w, from + (e.key === 'ArrowLeft' ? -8 : 8));
        pick('roller');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [level]);

  function finish() {
    if (stageRef.current !== 'work') return;
    stageRef.current = 'traffic';
    setStage('traffic');
    const w = world.current;
    w.roller = null;
    setOverlay((o) => ({ ...o, rollerX: -1, over: false }));
    const ctx = canvas.current!.getContext('2d')!;
    const img = newImage(ctx);
    const t = startTraffic(w);
    const redraw = () => {
      draw(ctx, img, w, w.weather === 'snow' ? snow.current : 0);
      setProfile(Array.from({ length: W }, (_, x) => surfaceAt(w, x)));
    };
    redraw();
    const done = () => {
      setReport(gradeTraffic(w, t, level.budget));
      stageRef.current = 'receipt';
      setStage('receipt');
    };
    // hareket azaltılınca senaryo bir anda oynar, fiş hemen gelir
    if (prefersReducedMotion()) {
      // animasyonlu oynatmayla aynı kural: çöken yamaya gelen araç gömülür, yol kapanır
      runTraffic(w, t);
      redraw();
      done();
      return;
    }
    const wait = (ms: number) => new Promise((res) => window.setTimeout(res, ms));
    const center = (w.hole[0] + w.hole[1]) / 2;
    // bir araç soldan sağa geçer; yamanın ortasına gelince yükünü bırakır, yol gözün önünde oturur
    const drive = (kind: VehicleKind, d: number) =>
      new Promise<void>((res) => {
        const v = VEHICLE[kind];
        const start = performance.now();
        const dur = 1500 + v.len * 22;
        const end = t.stuck >= 0 ? t.stuck - v.wheels[1] + 3 : Infinity;
        let passed = false;
        const tick = (now: number) => {
          if (!alive.current) return;
          const u = Math.min(1, (now - start) / dur);
          const x = Math.min(end, -v.len - 4 + u * (W + v.len + 8));
          if (x >= end) {
            setCar({ x, shake: 0, kind });
            res();
            return;
          }
          if (!passed && x + v.len / 2 >= center) {
            passed = true;
            passVehicle(w, t, d, kind);
            redraw();
          }
          const onPatch = x + v.len > w.hole[0] && x < w.hole[1];
          setCar({ x, shake: onPatch ? 0.5 * Math.sin(now / 35) : 0, kind });
          if (u < 1) requestAnimationFrame(tick);
          else res();
        };
        requestAnimationFrame(tick);
      });
    (async () => {
      for (let d = 0; d < TRAFFIC.length; d++) {
        setDay(TRAFFIC[d]);
        w.weather = TRAFFIC[d].weather;
        // hava bir süre etkisini gösterir: yağmur yağar, kar birikir, sonra araçlar gelir
        await wait(d === 0 ? 700 : 2200);
        for (const kind of TRAFFIC[d].vehicles) {
          if (!alive.current) return;
          // çöken yamaya gelen araç gömülür, yol kapanır
          if (t.stuck < 0) t.stuck = findPit(w);
          await drive(kind, d);
          if (t.stuck >= 0) {
            setRemark((m) => ({ text: d === 0 && t.phases.length === 0 && kind === TRAFFIC[0].vehicles[0] ? REMARKS.stuck : REMARKS.collapse, id: m.id + 1 }));
            endDay(w, t, d);
            await wait(1600);
            return done();
          }
        }
        endDay(w, t, d);
        redraw();
        const dips = t.phases[d].dips;
        setRemark((m) => ({ text: dips > 0 ? `${TRAFFIC[d].label}: yamada ${dips} yer çöktü.` : `${TRAFFIC[d].label}: yama sağlam.`, id: m.id + 1 }));
        await wait(900);
      }
      if (alive.current) done();
    })();
  }

  const toCell = (e: React.PointerEvent) => {
    const rect = stageEl.current!.getBoundingClientRect();
    pointer.current.cx = e.clientX;
    pointer.current.cy = e.clientY;
    pointer.current.x = ((e.clientX - rect.left) / rect.width) * W;
    pointer.current.y = ((e.clientY - rect.top) / rect.height) * H;
  };

  const left = level.spec.deadlineSec ? Math.max(0, level.spec.deadlineSec - hud.sec) : null;
  const over = hud.cost > level.budget;
  const w = world.current;
  const isMaterial = MATERIALS.includes(tool);
  // mastar ipi: yol hizası ve seçili malzemenin hedef seviyesi, çukurun iki yanına gerilmiş
  const guide = tool === 'soil' ? { y: ROAD + 12, label: 'toprak buraya kadar (−30 cm)' } : tool === 'gravel' ? { y: ROAD + 3, label: 'mıcır buraya kadar (−7,5 cm)' } : tool === 'asphalt' ? { y: ROAD - 1, label: 'sıkışma payı (+2,5 cm)' } : null;
  const [g0, g1] = [w.hole[0] - 4, w.hole[1] + 4];

  return (
    <div className={styles.work}>
      <p className={styles.rotate} aria-hidden="true">
        <span>📱↻</span> Telefonu yan çevir: çukur büyür.
      </p>
      <div className={styles.frame}>
        <div
          ref={stageEl}
          className={`${styles.stage} ${(hud.rain && stage === 'work') || day?.weather === 'rain' ? styles.raining : ''} ${day?.weather === 'snow' ? styles.snowing : ''}`}
          onPointerDown={(e) => {
            if (stage !== 'work') return;
            e.currentTarget.setPointerCapture(e.pointerId);
            toCell(e);
            pointer.current.down = true;
            pointer.current.fresh = true;
          }}
          onPointerMove={(e) => {
            toCell(e);
            pointer.current.over = true;
          }}
          onPointerUp={() => (pointer.current.down = false)}
          onPointerCancel={() => (pointer.current.down = false)}
          onPointerLeave={() => (pointer.current.over = false)}
        >
          <Backdrop rain={hud.rain && stage === 'work'} weather={day?.weather} />
          <canvas ref={canvas} width={W * SCALE} height={H * SCALE} className={styles.canvas} aria-label="Yolun kesiti ve çukur" />
          <svg className={styles.overlay} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
            {overlay.rollerX >= 0 && <RollerSprite x={overlay.rollerX} y={overlay.rollerY} vibe={overlay.vibe} />}
            {stage === 'work' && (
              <g className={ui.guide}>
                <line x1={g0} x2={g1} y1={ROAD} y2={ROAD} stroke="#ffe25a" strokeWidth="0.45" strokeDasharray="2 1.2" />
                <text x={g1 + 1} y={ROAD + 0.8} fontSize="2.6" fill="#ffe25a">
                  yol hizası
                </text>
                {guide && (
                  <>
                    <line x1={g0} x2={g1} y1={guide.y} y2={guide.y} stroke="#fff" strokeWidth="0.45" strokeDasharray="1 1" />
                    <text x={g1 + 1} y={guide.y + 0.8} fontSize="2.6" fill="#fff">
                      {guide.label}
                    </text>
                  </>
                )}
              </g>
            )}
            {stage === 'work' && overlay.over && tool === 'saw' && (
              <g>
                <line x1={Math.round(overlay.px)} x2={Math.round(overlay.px)} y1={ROAD - 10} y2={ROAD + 5} stroke="#c0392b" strokeWidth="0.8" strokeDasharray="1.5 1" />
                <circle cx={Math.round(overlay.px)} cy={ROAD - 12} r="2.2" fill="none" stroke="#c0392b" strokeWidth="0.6" />
              </g>
            )}
            {stage === 'work' && overlay.over && tool === 'probe' && <line x1={overlay.px} x2={overlay.px} y1="0" y2={H} stroke="#ffe25a" strokeWidth="0.5" strokeDasharray="2 1" />}
            {stage === 'work' && overlay.over && tool === 'tack' && <circle cx={overlay.px} cy={overlay.py} r="4" fill="rgba(40,28,20,.25)" stroke="#f0e6cf" strokeWidth="0.5" />}
            {stage === 'work' && overlay.over && isMaterial && (
              <g>
                {/* kamyonun döküm oluğu ve malzemenin düşeceği hat */}
                <line x1={overlay.px} x2={overlay.px} y1={CHUTE_Y + 3} y2={H} stroke="#fff" strokeWidth="0.35" strokeDasharray="1 1.5" opacity="0.7" />
                <path d={`M${overlay.px - 6} ${CHUTE_Y - 7} H${overlay.px + 6} L${overlay.px + 2.5} ${CHUTE_Y} H${overlay.px - 2.5} Z`} fill={SWATCH[tool]} stroke="#2b2620" strokeWidth="0.4" />
                <rect x={overlay.px - 7} y={CHUTE_Y - 9} width="14" height="2.5" rx="0.6" fill="#e6a813" stroke="#2b2620" strokeWidth="0.4" />
                <rect x={overlay.px - 2.5} y={CHUTE_Y} width="5" height="1.6" fill="#555" />
              </g>
            )}
            {stage === 'work' && overlay.over && tool === 'rake' && (
              <g stroke="#f0e6cf" strokeWidth="0.5">
                <line x1={overlay.px - 6} x2={overlay.px + 6} y1={overlay.py} y2={overlay.py} />
                {[-6, -3, 0, 3, 6].map((d) => (
                  <line key={d} x1={overlay.px + d} x2={overlay.px + d} y1={overlay.py} y2={overlay.py + 1.6} />
                ))}
              </g>
            )}
            {stage === 'work' && overlay.over && tool === 'tamper' && <rect x={overlay.px - 3.5} y={overlay.py - 1} width="7" height="2" fill="rgba(138,143,154,.6)" stroke="#fff" strokeWidth="0.4" />}
            {stage === 'work' && overlay.over && (tool === 'shovel' || tool === 'pump') && (
              <g>
                <circle cx={overlay.px} cy={overlay.py} r={tool === 'pump' ? 6 : 4} fill="none" stroke="#fff" strokeWidth="0.5" strokeDasharray="1.5 1" />
              </g>
            )}
            {stage !== 'work' && profile && <CarSprite x={car.x} kind={car.kind} profile={profile} shake={car.shake} />}
          </svg>
        </div>
      </div>
      {reading && stage === 'work' && <ProbeCard reading={reading} x={pointer.current.cx} y={pointer.current.cy} />}
      <p key={remark.id} className={styles.bubble}>
        <b>Muhtar:</b> {remark.text}
      </p>
      {stage === 'receipt' && report && <Receipt level={level} world={w} report={report} last={last} onNext={() => onNext(report.score)} onRetry={onRetry} />}

      <div className={styles.dock}>
        <ol className={styles.help} aria-label="Yapılış sırası">
          {STEPS.filter((st) => !st.tool || level.tools.includes(st.tool)).map((st) => (
            <li key={st.key} className={done[st.key] ? styles.stepDone : ''}>
              {st.text}
            </li>
          ))}
        </ol>
        <div className={styles.tools} role="toolbar" aria-label="Araçlar">
          {level.tools.map((t, k) => (
            <button key={t} type="button" className={`${styles.tool} ${tool === t ? styles.on : ''}`} aria-pressed={tool === t} disabled={stage !== 'work' || (t === 'gravel' && hud.sec < (level.gravelAfterSec ?? 0))} onClick={() => pick(t)}>
              <i style={{ background: SWATCH[t] }} />
              <span>
                <b>{TOOL_LABEL[t].name}</b>
                <small>
                  {t === 'gravel' && hud.sec < (level.gravelAfterSec ?? 0)
                    ? `kamyon ${level.gravelAfterSec! - hud.sec} sn sonra`
                    : t === 'soil' || t === 'gravel' || t === 'asphalt'
                      ? `${tons(w.used[t])} · ${money(PRICE[t] * 40)}/t`
                      : t === 'saw'
                        ? `${hud.cuts}/2 kesim · ${money(SAW_PRICE)}`
                        : TOOL_LABEL[t].hint}
                </small>
              </span>
              <kbd>{k + 1}</kbd>
            </button>
          ))}
        </div>
      </div>
      <div className={styles.hud}>
        <div className={styles.status}>
          <div className={styles.meter}>
            <span>Harcanan</span>
            <b className={over ? styles.bad : undefined}>
              {money(hud.cost)} <small>/ {money(level.budget)}</small>
            </b>
            <div className={styles.track}>
              <div style={{ width: `${Math.min(100, (hud.cost / level.budget) * 100)}%` }} className={over ? styles.trackBad : undefined} />
            </div>
          </div>
          {overlay.rollerX >= 0 && stage === 'work' && (
            <button type="button" className={`${styles.chip} ${overlay.vibe ? styles.vibeOn : ''}`} onClick={() => toggleVibe(world.current)} title="Titreşimli tambur derine ve hızlı sıkıştırır; statik tambur yüzeyi yavaş sıkıştırır. Kısayol: V">
              〰 Titreşim {overlay.vibe ? 'açık' : 'kapalı'}
            </button>
          )}
          {hud.temp !== null && stage === 'work' && (
            <div className={`${styles.chip} ${hud.temp < 78 ? styles.bad : ''}`} title="Asfalt 160 °C'de gelir, 78 °C'nin altında sıkışmaz.">
              🌡 {hud.temp} °C · {tempWord(hud.temp)}
            </div>
          )}
          {day && stage !== 'work' && <div className={styles.chip}>{{ sun: '☀️', rain: '🌧', snow: '❄️' }[day.weather]} {day.label}</div>}
          {level.spec.rainSec !== undefined && stage === 'work' && <div className={styles.chip}>{hud.rain ? '🌧 Yağmur yağıyor' : '⛅ Yağmur dindi'}</div>}
          {left !== null && <div className={`${styles.chip} ${left < 20 ? styles.bad : ''}`}>Kurdeleye {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</div>}
          <button type="button" className={styles.primary} disabled={stage !== 'work'} onClick={finish}>
            Trafiğe aç
          </button>
        </div>
      </div>
    </div>
  );
}

function Receipt({ level, world, report, last, onNext, onRetry }: { level: Level; world: World; report: Report; last: boolean; onNext: () => void; onRetry: () => void }) {
  const rows: [string, number][] = [
    ['Kesilmeyen kırık kenar', report.uncut],
    ['Yapıştırıcısız kenar', report.unbonded],
    ['Yapıştırıcısız taban (sütun)', report.untacked],
    ['Dolgu altında moloz (kova)', Math.ceil(report.rubble / 4)],
    ['Tümsek (sütun)', report.bumps],
    ['Çöken yer (sütun)', report.dips],
    ['İnce asfalt', report.thin],
    ['Mıcırsız', report.noGravel],
    ['Asfaltsız (çıplak toprak)', report.bare],
    ['Taşıyıcıda toprak (ilk 30 cm)', report.soilBase],
    ['Sıkışmamış dolgu', report.unpacked],
    ['Soğumadan açılan asfalt', report.hot],
    ['Sulu asfalt', report.wet],
    ['Yola saçılan (kova)', Math.round(report.spill / 4)],
  ];
  const passed = report.score >= PASS_SCORE;
  const ref = useRef<HTMLButtonElement>(null);
  const retry = useRef<HTMLButtonElement>(null);
  useEffect(() => (passed ? ref : retry).current?.focus(), [passed]);
  return (
    <div className={styles.receiptWrap}>
      <div className={styles.receipt} role="dialog" aria-label="Hakediş fişi">
        <header>
          <b>HAKEDİŞ FİŞİ</b>
          <span>{level.place}</span>
        </header>
        <table>
          <tbody>
            {(['soil', 'gravel', 'asphalt'] as Material[]).map((m) => (
              <tr key={m}>
                <td>{TOOL_LABEL[m].name}</td>
                <td>{tons(world.used[m])}</td>
                <td>{money(world.used[m] * PRICE[m])}</td>
              </tr>
            ))}
            <tr>
              <td>Yapıştırıcı</td>
              <td>{Math.round(world.tackUsed * TACK_LITRE)} lt</td>
              <td>{money(world.tackUsed * TACK_PRICE)}</td>
            </tr>
            <tr>
              <td>Asfalt kesme</td>
              <td>{(world.cuts.left !== null ? 1 : 0) + (world.cuts.right !== null ? 1 : 0)} kesim</td>
              <td>{money(((world.cuts.left !== null ? 1 : 0) + (world.cuts.right !== null ? 1 : 0)) * SAW_PRICE)}</td>
            </tr>
            <tr className={styles.total}>
              <td>Toplam</td>
              <td />
              <td className={report.cost > level.budget ? styles.bad : undefined}>{money(report.cost)}</td>
            </tr>
          </tbody>
        </table>
        {report.phases.length > 0 && (
          <ol className={styles.days}>
            {report.phases.map((p) => (
              <li key={p.weather} className={p.dips > 0 ? styles.bad : undefined}>
                <span>
                  {{ sun: '☀️', rain: '🌧', snow: '❄️' }[p.weather]} {p.label}
                </span>
                <span>{p.dips === 0 ? 'sağlam' : `${p.dips} yer çöktü`}</span>
              </li>
            ))}
          </ol>
        )}
        {report.reasons.length > 0 && (
          <div className={ui.why}>
            <b>Neden bu puan?</b>
            <ol>
              {report.reasons.slice(0, 3).map((r) => (
                <li key={r.label}>
                  <span>{r.label}</span>
                  <span>−{r.points}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
        {world.wasted > 0 && (
          <p className={ui.waste}>
            Boşa giden malzeme: <b>{money(world.wasted)}</b> (kürekle atılan ya da silindirin yoldan ittiği)
          </p>
        )}
        <details className={ui.allRows}>
          <summary>Bütün kalemler</summary>
          <ul>
            {rows.map(([k, v]) => (
              <li key={k} className={v > 0 ? styles.bad : undefined}>
                <span>{k}</span>
                <span>{v === 0 ? 'yok' : v}</span>
              </li>
            ))}
          </ul>
        </details>
        <div className={styles.score}>
          <span>Yama puanı</span>
          <b>{report.score}</b>
        </div>
        <p className={styles.verdict}>{verdict(report)}</p>
        {passed ? (
          <p className={styles.after}>{level.after}</p>
        ) : (
          <p className={`${styles.after} ${styles.bad}`}>Kontrol mühendisi işi teslim almadı: en az {PASS_SCORE} puan gerekir. Çukuru baştan yap.</p>
        )}
        <div className={styles.actions}>
          <button ref={retry} type="button" className={styles.ghost} onClick={onRetry}>
            Baştan dök
          </button>
          <button ref={ref} type="button" className={styles.primary} onClick={onNext} disabled={!passed}>
            {last ? 'Mesai bitti →' : 'Sonraki iş →'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Ölçüm kartı: imlecin yanında karot kesiti, sıcaklık, sıkışma ve mastar sapması. */
function ProbeCard({ reading, x, y }: { reading: Probe; x: number; y: number }) {
  const dev = reading.deviation;
  const flip = x > window.innerWidth - 300;
  return (
    <div className={ui.probe} style={{ left: flip ? x - 268 : x + 18, top: Math.max(70, Math.min(window.innerHeight - 260, y - 40)) }} aria-live="polite">
      <header>
        <b>Karot · ölçüm</b>
        <span className={Math.abs(dev) > 10 ? styles.bad : styles.okTxt}>
          Mastar {dev > 0 ? '+' : ''}
          {dev} mm
        </span>
      </header>
      <ul>
        {reading.layers.map((l, i) => (
          <li key={i}>
            <span>{l.name}</span>
            <span>
              {l.cm > 0 && `${l.cm.toLocaleString('tr-TR')} cm`}
              {l.temp !== undefined && <em className={l.temp < 78 ? styles.bad : undefined}> · {l.temp} °C</em>}
              {l.proctor !== undefined && l.name !== 'Asfalt' && <em className={l.proctor < 95 ? styles.bad : styles.okTxt}> · %{l.proctor}</em>}
              {l.proctor !== undefined && l.name === 'Asfalt' && <em className={l.proctor < 95 ? styles.bad : styles.okTxt}> · %{l.proctor} sıkı</em>}
              {l.tacked && <em> · yapıştırıcılı</em>}
            </span>
          </li>
        ))}
      </ul>
      <p className={ui.probeCarrier}>
        Taşıyıcı (asfalt + mıcır): <b className={reading.carrier < 30 ? styles.bad : styles.okTxt}>{reading.carrier.toLocaleString('tr-TR')} cm</b> / en az 30 cm
      </p>
      <small>Sıkışma %95 Proctor üstü, mastar ±10 mm içinde olmalı. Toprak yol hizasının 30 cm altında kalmalı.</small>
    </div>
  );
}
