import { blockerOf, clash, exitOf, U, yields } from './junction';
import { AMBER, DIR_NAME, DIRS, legOf, MIN_GREEN, moveName, turnOf, type Dir, type MoveId, type Phase, type Plan, type Turn } from './model';
import type { Sim } from './sim';
import ui from './PhaseBar.module.css';
import styles from './TrafikGame.module.css';

/*
 * Kontrolör paneli: evre kartları (küçük kavşak şeması, yeşil süresi, geçerli evrenin ilerlemesi)
 * ve seçili evrenin düzenleyicisi. Düzenleyicide her kolun Sol, Düz, Sağ ve Yaya düğmeleri var;
 * evredeki bir hareketle sert çakışan düğme kilitlidir ve neyle çakıştığını yazar, izinli
 * çakışan "yol verir" diye işaretlenir.
 */

const STEP_LIMITS = { min: MIN_GREEN, max: 90 };
const TURNS: (Turn | 'P')[] = ['L', 'T', 'R', 'P'];
const TURN_LABEL: Record<Turn | 'P', string> = { L: 'Sol', T: 'Düz', R: 'Sağ', P: 'Yaya' };

/** Evrenin küçük şeması: 52 × 52 kutuda kollar ve hareket okları. */
export function PhaseGlyph({ sim, moves, size = 52 }: { sim: Sim; moves: MoveId[]; size?: number }) {
  const c = 26;
  const legs = DIRS.filter((d) => sim.j.legs[d]);
  const rin = (d: Dir): [number, number] => [U[d][1], -U[d][0]];
  const rout = (d: Dir): [number, number] => [-U[d][1], U[d][0]];
  const pt = (d: Dir, s: number, lat: [number, number], k: number): [number, number] => [c + U[d][0] * s + lat[0] * k, c + U[d][1] * s + lat[1] * k];
  return (
    <svg viewBox="0 0 52 52" width={size} height={size} aria-hidden="true" className={ui.glyph}>
      {legs.map((d) => (
        <line key={d} x1={c} y1={c} x2={c + U[d][0] * 26} y2={c + U[d][1] * 26} stroke="currentColor" strokeOpacity={0.18} strokeWidth={14} />
      ))}
      {moves.map((m) => {
        const d = legOf(m);
        const t = turnOf(m);
        if (t === 'P') {
          const a = pt(d, 15, rout(d), 9);
          const b = pt(d, 15, rout(d), -9);
          return <line key={m} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#f2efe6" strokeWidth={2.4} strokeDasharray="1.6 1.4" />;
        }
        const e = exitOf(d, t);
        const p0 = pt(d, 24, rin(d), 3.5);
        const p1 = pt(d, 8, rin(d), 3.5);
        const p2 = pt(e, 8, rout(e), 3.5);
        const p3 = pt(e, 20, rout(e), 3.5);
        const ctrl = t === 'T' ? [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2] : U[d][0] === 0 ? [p1[0], p2[1]] : [p2[0], p1[1]];
        // izinli hareket: evredeki başka bir harekete yol verir, kesikli çizilir
        const soft = moves.some((o) => o !== m && yields(m, o));
        const ang = Math.atan2(p3[1] - p2[1], p3[0] - p2[0]);
        return (
          <g key={m} stroke={soft ? '#f2c14a' : '#4fd683'} fill="none" strokeWidth={2.2} strokeLinecap="round">
            <path d={`M${p0[0]} ${p0[1]} L${p1[0]} ${p1[1]} Q${ctrl[0]} ${ctrl[1]} ${p2[0]} ${p2[1]} L${p3[0]} ${p3[1]}`} strokeDasharray={soft ? '3 2' : undefined} />
            <path d={`M${p3[0] + Math.cos(ang + 2.5) * 4} ${p3[1] + Math.sin(ang + 2.5) * 4} L${p3[0]} ${p3[1]} L${p3[0] + Math.cos(ang - 2.5) * 4} ${p3[1] + Math.sin(ang - 2.5) * 4}`} />
          </g>
        );
      })}
    </svg>
  );
}


interface Props {
  sim: Sim;
  plan: Plan;
  selected: number | null;
  onSelect: (i: number | null) => void;
  onPlan: (p: Plan) => void;
  onJump: (i: number) => void;
  /** Rehber bu parçayı gösteriyor: parlar. */
  hint?: boolean;
}

export function PhaseCards({ sim, plan, selected, onSelect, onPlan, hint }: Omit<Props, 'onJump'>) {
  const { ctl } = sim;
  const setGreen = (i: number, g: number) => onPlan({ ...plan, phases: plan.phases.map((p, k) => (k === i ? { ...p, green: Math.max(STEP_LIMITS.min, Math.min(STEP_LIMITS.max, g)) } : p)) });
  return (
    <div className={`${ui.cards} ${hint ? styles.hint : ''}`} role="list" aria-label="Evreler">
      {plan.phases.map((p, i) => {
        const active = ctl.phase === i;
        const stage = active ? ctl.stage : null;
        const prog = !active ? 0 : ctl.stage === 'green' ? Math.min(1, ctl.t / p.green) : ctl.stage === 'amber' ? ctl.t / AMBER : 1;
        const next = (ctl.next ?? (ctl.phase + 1) % plan.phases.length) === i && !active;
        // evre hangi yollara yeşil yakıyor: şemadaki oklar tek başına okunmuyor, kolların adı yazılır
        const roads = [...new Set(p.moves.filter((m) => turnOf(m) !== 'P').map((m) => sim.spec.legs[legOf(m)]?.name))].filter(Boolean).join(' · ');
        return (
          <div key={i} role="listitem" className={`${ui.card} ${active ? ui[`on_${stage}`] : ''} ${selected === i ? ui.sel : ''}`}>
            <button type="button" className={ui.cardMain} onClick={() => onSelect(selected === i ? null : i)} aria-pressed={selected === i} aria-label={`${i + 1}. evre: ${p.moves.map(moveName).join(', ') || 'boş'}`}>
              <span className={ui.cardHead}>
                <b>{i + 1}</b>
                {active ? <em>{stage === 'green' ? (ctl.hold ? 'tutuluyor' : 'yeşil') : stage === 'amber' ? 'sarı' : 'tüm kırmızı'}</em> : next ? <em className={ui.nextTag}>sıradaki</em> : null}
              </span>
              <PhaseGlyph sim={sim} moves={p.moves} />
              <span className={ui.roads} title={roads}>
                {roads || (p.moves.length ? 'yalnız yaya' : 'boş evre')}
              </span>
            </button>
            <div className={styles.secs}>
              <button type="button" onClick={() => setGreen(i, p.green - 1)} aria-label={`${i + 1}. evrenin yeşilini kısalt`}>
                −
              </button>
              <span>
                <b>{p.green}</b> sn
              </span>
              <button type="button" onClick={() => setGreen(i, p.green + 1)} aria-label={`${i + 1}. evrenin yeşilini uzat`}>
                +
              </button>
            </div>
            <i className={ui.prog} style={{ width: `${prog * 100}%` }} />
          </div>
        );
      })}
      {!sim.spec.lockMoves && plan.phases.length < 6 && (
        <button
          type="button"
          className={ui.addCard}
          onClick={() => {
            onPlan({ ...plan, phases: [...plan.phases, { moves: [], green: 12 }] });
            onSelect(plan.phases.length);
          }}
        >
          <span>+</span>Evre
        </button>
      )}
    </div>
  );
}

/** Seçili evrenin düzenleyicisi: hareket düğmeleri, çakışma notları, sil, şimdi geç. */
export function PhaseEditor({ sim, plan, selected, onSelect, onPlan, onJump, hint }: Props) {
  if (selected === null || !plan.phases[selected]) return null;
  const phase = plan.phases[selected];
  const locked = !!sim.spec.lockMoves;
  const toggle = (m: MoveId) => {
    const has = phase.moves.includes(m);
    const moves = has ? phase.moves.filter((x) => x !== m) : [...phase.moves, m];
    onPlan({ ...plan, phases: plan.phases.map((p, k): Phase => (k === selected ? { ...p, moves } : p)) });
  };
  return (
    <section className={`${ui.editor} ${hint ? styles.hint : ''}`} aria-label={`${selected + 1}. evreyi düzenle`}>
      <header>
        <b>{selected + 1}. evre</b>
        <span>{locked ? 'Bu kavşakta evreler sabit; yalnızca süreler değişir.' : 'Aynı anda yeşil yanacak hareketleri seç.'}</span>
        <button type="button" className={ui.x} onClick={() => onSelect(null)} aria-label="Düzenleyiciyi kapat">
          ✕
        </button>
      </header>
      <div className={ui.grid}>
        {DIRS.filter((d) => sim.j.legs[d]).map((d) => (
          <div key={d} className={ui.legRow}>
            <span className={ui.legName}>
              {DIR_NAME[d]}
              <small>{sim.j.legs[d]!.spec.name}</small>
            </span>
            {TURNS.map((t) => {
              const m = `${d}.${t}` as MoveId;
              if (!sim.j.moves.includes(m)) return <span key={t} className={ui.none} />;
              const on = phase.moves.includes(m);
              const block = on ? null : blockerOf(phase, m);
              const soft = !on && !block && phase.moves.some((o) => clash(o, m) === 'soft');
              const softOn = on && phase.moves.some((o) => o !== m && yields(m, o));
              return (
                <button
                  key={t}
                  type="button"
                  className={`${ui.mv} ${on ? ui.mvOn : ''} ${softOn ? ui.mvSoft : ''}`}
                  disabled={locked || !!block}
                  aria-pressed={on}
                  title={block ? `${moveName(block)} ile çakışır` : soft ? 'İzinli: biri ötekine yol verir' : undefined}
                  onClick={() => toggle(m)}
                >
                  <span className={ui.mvIcon} aria-hidden="true">
                    {t === 'L' ? '↰' : t === 'T' ? '↑' : t === 'R' ? '↱' : '🚶'}
                  </span>
                  {TURN_LABEL[t]}
                  {block && <small className={ui.blk}>{moveName(block)} ile çakışır</small>}
                  {softOn && <small>yol verir</small>}
                  {soft && <small>izinli</small>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <footer>
        {!locked && plan.phases.length > 1 && (
          <button
            type="button"
            className={styles.ghost}
            onClick={() => {
              onPlan({ ...plan, phases: plan.phases.filter((_, k) => k !== selected) });
              onSelect(null);
            }}
          >
            Evreyi sil
          </button>
        )}
        {sim.t > 0 && sim.ctl.phase !== selected && (
          <button type="button" className={styles.primary} onClick={() => onJump(selected)}>
            Bu evreye geç
          </button>
        )}
      </footer>
    </section>
  );
}
