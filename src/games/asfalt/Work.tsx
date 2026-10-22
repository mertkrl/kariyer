import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../components/ui/motion';
import { REMARKS, TOOL_LABEL, verdict, type Level, type Tool } from './levels';
import { H, PRICE, ROLLER_W, TICKS_PER_SEC, W, createWorld, dig, driveRoller, openToTraffic, pour, pump, raining, step, type Material, type Report, type World } from './model';
import { draw, newImage } from './render';
import { Backdrop, CarSprite, RollerSprite } from './Site';
import styles from './AsfaltGame.module.css';

/*
 * Bir iş: çukurun başında ekip. Basılı tutunca seçili araç çalışır; dünya saniyede 60 adım
 * ilerler, tuval her karede çizilir. "Trafiğe aç" ile yama oturur, araba geçer, hakediş fişi gelir.
 */

const MATERIALS: Tool[] = ['soil', 'gravel', 'asphalt'];
const SWATCH: Record<Tool, string> = { soil: '#966a42', gravel: '#a49e92', asphalt: '#2a2a2e', shovel: '#7a6a55', pump: '#4684ba', roller: '#e6a813' };
/** Bir hücre kaç kilo. */
const KG_PER_CELL = 25;

type Stage = 'work' | 'traffic' | 'receipt';
interface Hud {
  cost: number;
  sec: number;
  rain: boolean;
}

const money = (n: number) => `${Math.round(n).toLocaleString('tr-TR')} ₺`;
const tons = (cells: number) => `${((cells * KG_PER_CELL) / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} t`;
const costOf = (w: World) => (Object.keys(w.used) as Material[]).reduce((s, m) => s + w.used[m] * PRICE[m], 0);

export function Work({ level, last, onNext, onRetry }: { level: Level; last: boolean; onNext: (score: number) => void; onRetry: () => void }) {
  const world = useRef<World>(null as unknown as World);
  if (!world.current) world.current = createWorld(level.spec);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stageEl = useRef<HTMLDivElement>(null);
  const toolRef = useRef<Tool>(level.tools[0]);
  const pointer = useRef({ x: 0, y: 0, down: false, over: false });
  const [tool, setTool] = useState<Tool>(level.tools[0]);
  const [hud, setHud] = useState<Hud>({ cost: 0, sec: 0, rain: raining(world.current) });
  const [remark, setRemark] = useState({ text: REMARKS.start, id: 0 });
  const [stage, setStage] = useState<Stage>('work');
  const stageRef = useRef<Stage>('work');
  const [report, setReport] = useState<Report | null>(null);
  const [car, setCar] = useState({ x: -30, shake: 0 });
  const [overlay, setOverlay] = useState({ rollerX: -1, px: 0, py: 0, over: false, down: false });

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
          if (p.down) {
            if (t === 'soil' || t === 'gravel' || t === 'asphalt') pour(w, t, p.x, p.y, 3, 3);
            else if (t === 'shovel') {
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
        if (costOf(w) > level.budget) say('overBudget');
        if (w.tick >= deadline) finish();
        draw(ctx, img, w);
        if (frame++ % 6 === 0) {
          setHud({ cost: costOf(w), sec: Math.floor(w.tick / TICKS_PER_SEC), rain: r });
          const p = pointer.current;
          setOverlay({ rollerX: w.roller ? w.roller.x : -1, px: p.x, py: p.y, over: p.over, down: p.down });
        }
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
      const t = level.tools.find((k) => TOOL_LABEL[k].key === e.key);
      if (t) return pick(t);
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
    const r = openToTraffic(w);
    setReport(r);
    setOverlay((o) => ({ ...o, rollerX: -1, over: false }));
    const ctx = canvas.current!.getContext('2d')!;
    draw(ctx, newImage(ctx), w);
    // araba soldan sağa geçer; pürüz arttıkça sarsıntı büyür. Hareket azaltılınca fiş hemen gelir.
    if (prefersReducedMotion()) {
      setCar({ x: W + 4, shake: 0 });
      stageRef.current = 'receipt';
      setStage('receipt');
      return;
    }
    const start = performance.now();
    const dur = 4200;
    const rough = Math.min(2.2, r.roughness / 25);
    const tick = (now: number) => {
      const u = Math.min(1, (now - start) / dur);
      const x = -30 + u * (W + 34);
      const shake = rough * Math.sin(now / 38) * (x > w.hole[0] - 26 && x < w.hole[1] + 4 ? 1 : 0.1);
      setCar({ x, shake });
      if (u < 1) requestAnimationFrame(tick);
      else {
        stageRef.current = 'receipt';
        setStage('receipt');
      }
    };
    requestAnimationFrame(tick);
  }

  const toCell = (e: React.PointerEvent) => {
    const rect = stageEl.current!.getBoundingClientRect();
    pointer.current.x = ((e.clientX - rect.left) / rect.width) * W;
    pointer.current.y = ((e.clientY - rect.top) / rect.height) * H;
  };

  const left = level.spec.deadlineSec ? Math.max(0, level.spec.deadlineSec - hud.sec) : null;
  const over = hud.cost > level.budget;
  const w = world.current;
  const isMaterial = MATERIALS.includes(tool);

  return (
    <div className={styles.work}>
      <div
        ref={stageEl}
        className={`${styles.stage} ${hud.rain && stage === 'work' ? styles.raining : ''}`}
        onPointerDown={(e) => {
          if (stage !== 'work') return;
          e.currentTarget.setPointerCapture(e.pointerId);
          toCell(e);
          pointer.current.down = true;
        }}
        onPointerMove={(e) => {
          toCell(e);
          pointer.current.over = true;
        }}
        onPointerUp={() => (pointer.current.down = false)}
        onPointerCancel={() => (pointer.current.down = false)}
        onPointerLeave={() => (pointer.current.over = false)}
      >
        <Backdrop rain={hud.rain && stage === 'work'} />
        <canvas ref={canvas} width={W} height={H} className={styles.canvas} aria-label="Yolun kesiti ve çukur" />
        <svg className={styles.overlay} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          {overlay.rollerX >= 0 && <RollerSprite x={overlay.rollerX} />}
          {stage === 'work' && overlay.over && tool !== 'roller' && (
            <g>
              {isMaterial && overlay.down && <rect x={overlay.px - 2} y="0" width="4" height={Math.max(0, overlay.py - 3)} fill={SWATCH[tool]} opacity="0.35" />}
              <circle cx={overlay.px} cy={overlay.py} r={tool === 'pump' ? 6 : tool === 'shovel' ? 4 : 3} fill="none" stroke={tool === 'asphalt' ? '#f0e6cf' : '#fff'} strokeWidth="0.5" strokeDasharray={tool === 'shovel' || tool === 'pump' ? '1.5 1' : undefined} />
            </g>
          )}
          {stage !== 'work' && report && <CarSprite x={car.x} profile={report.profile} shake={car.shake} />}
        </svg>
        <p key={remark.id} className={styles.bubble}>
          <b>Muhtar:</b> {remark.text}
        </p>
        {stage === 'receipt' && report && <Receipt level={level} world={w} report={report} last={last} onNext={() => onNext(report.score)} onRetry={onRetry} />}
      </div>

      <div className={styles.bar}>
        <div className={styles.tools} role="toolbar" aria-label="Araçlar">
          {level.tools.map((t) => (
            <button key={t} type="button" className={`${styles.tool} ${tool === t ? styles.on : ''}`} aria-pressed={tool === t} disabled={stage !== 'work'} onClick={() => pick(t)}>
              <i style={{ background: SWATCH[t] }} />
              <span>
                <b>{TOOL_LABEL[t].name}</b>
                <small>
                  {t === 'soil' || t === 'gravel' || t === 'asphalt' ? `${tons(w.used[t])} · ${money(PRICE[t] * 40)}/t` : TOOL_LABEL[t].hint}
                </small>
              </span>
              <kbd>{TOOL_LABEL[t].key}</kbd>
            </button>
          ))}
        </div>
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
          {level.spec.rainSec !== undefined && <div className={styles.chip}>{hud.rain ? '🌧 Yağmur yağıyor' : '⛅ Yağmur dindi'}</div>}
          {left !== null && <div className={`${styles.chip} ${left < 20 ? styles.bad : ''}`}>Kurdeleye {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</div>}
          <button type="button" className={styles.primary} disabled={stage !== 'work'} onClick={finish}>
            Trafiğe aç
          </button>
        </div>
      </div>
      <p className={styles.help}>Basılı tut: seçili araç çalışır. Toprakla doldur, mıcırı yay, asfaltı dök; soğumadan silindiri üstünden geçir. Silindir yol hizasının üstünde kalanı önüne katar.</p>
    </div>
  );
}

function Receipt({ level, world, report, last, onNext, onRetry }: { level: Level; world: World; report: Report; last: boolean; onNext: () => void; onRetry: () => void }) {
  const rows: [string, number][] = [
    ['Tümsek (sütun)', report.bumps],
    ['Çöken yer (sütun)', report.dips],
    ['İnce asfalt', report.thin],
    ['Mıcırsız', report.noGravel],
    ['Sulu asfalt', report.wet],
    ['Yola saçılan (kova)', Math.round(report.spill / 4)],
  ];
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => ref.current?.focus(), []);
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
            <tr className={styles.total}>
              <td>Toplam</td>
              <td />
              <td className={report.cost > level.budget ? styles.bad : undefined}>{money(report.cost)}</td>
            </tr>
          </tbody>
        </table>
        <ul>
          {rows.map(([k, v]) => (
            <li key={k} className={v > 0 ? styles.bad : undefined}>
              <span>{k}</span>
              <span>{v === 0 ? 'yok' : v}</span>
            </li>
          ))}
        </ul>
        <div className={styles.score}>
          <span>Yama puanı</span>
          <b>{report.score}</b>
        </div>
        <p className={styles.verdict}>{verdict(report)}</p>
        <p className={styles.after}>{level.after}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.ghost} onClick={onRetry}>
            Baştan dök
          </button>
          <button ref={ref} type="button" className={styles.primary} onClick={onNext}>
            {last ? 'Mesai bitti →' : 'Sonraki iş →'}
          </button>
        </div>
      </div>
    </div>
  );
}
