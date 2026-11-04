import { useId, useMemo, type CSSProperties, type ReactNode } from 'react';
import { SHORE, TILE_H, TILE_W, type Palette } from './palettes';
import s from './Scene.module.css';

const INK = '#2a2420';

/*
 * Vapurun güvertesinden bakış. Arkada dört katman farklı hızlarda kayar: en uzakta tepeler ve
 * köprü, sonra camili silüet, sonra yalılar, en önde dalgalar. Her katman 3200 × 900'lük bir
 * karodur; iki kopyası yan yana durur, karo genişliği kadar kayınca başa döner (dikiş görünmez).
 * Katmanlar ekranın yüksekliğine göre ölçeklenir: ufuk her ekranda aynı yerde kalır. Önde sabit
 * duran küpeşte, çay bardağı ve simit (Vapur.tsx) ayrı çizilir. Renkler günün saatine göre.
 * Gerçek bir yerin resmi değil; mahalle maketinin mürekkep çizgili, toprak tonlu diliyle genel bir
 * İstanbul kıyısı.
 */

/** Sabit tohumlu sözde rastgele: kıyı her açılışta aynı. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Noktalardan yumuşak bir tepe çizgisi (ilk ve son nokta aynı yükseklikte: karo dikişsiz). */
function ridge(points: [number, number][], base: number) {
  let d = `M0 ${base} L${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    d += ` Q${x0} ${y0} ${(x0 + x1) / 2} ${(y0 + y1) / 2}`;
  }
  const last = points[points.length - 1];
  return `${d} L${last[0]} ${last[1]} L${TILE_W} ${base} Z`;
}

function Far({ p }: { p: Palette }) {
  const r = rng(7);
  const pts: [number, number][] = [];
  for (let x = 0; x <= TILE_W; x += 200) pts.push([x, x === 0 || x === TILE_W ? 492 : 468 + r() * 50]);
  // köprü: iki kule arasında sarkan ana kablo, askılar ve tabliye
  const [ax, bx, top, deck] = [820, 1780, 352, 490];
  const cableY = (t: number) => (1 - t) ** 2 * top + 2 * t * (1 - t) * 600 + t ** 2 * top;
  const hangers: ReactNode[] = [];
  for (let t = 0.04; t < 0.97; t += 0.035) {
    const x = ax + (bx - ax) * t;
    hangers.push(<line key={t} x1={x} y1={cableY(t)} x2={x} y2={deck} />);
  }
  const lights: ReactNode[] = [];
  if (p.lit) {
    const colors = ['#ffd27a', '#8fd3ff', '#ff9ec0', '#b5f2a5'];
    for (let x = 560, i = 0; x <= 2040; x += 28, i++) lights.push(<circle key={x} cx={x} cy={deck + 2} r={3.2} fill={colors[Math.floor(i / 6) % colors.length]} />);
  }
  return (
    <>
      <path d={ridge(pts, SHORE)} fill={p.far} stroke={p.farLine} strokeWidth={2} />
      <g stroke={p.farLine} fill="none" strokeWidth={2.4}>
        <path d={`M560 ${deck} Q700 470 ${ax} ${top}`} />
        <path d={`M${ax} ${top} Q1300 600 ${bx} ${top}`} />
        <path d={`M${bx} ${top} Q1900 470 2040 ${deck}`} />
        <g strokeWidth={1}>{hangers}</g>
      </g>
      <rect x={540} y={deck - 3} width={1520} height={9} fill={p.farLine} />
      {[ax, bx].map((x) => (
        <g key={x} fill={p.far} stroke={p.farLine} strokeWidth={2}>
          <rect x={x - 12} y={top} width={9} height={SHORE - top} />
          <rect x={x + 3} y={top} width={9} height={SHORE - top} />
          <rect x={x - 12} y={top + 30} width={24} height={6} />
          <rect x={x - 12} y={top + 80} width={24} height={6} />
          {p.lit && <circle className={s.blink} cx={x} cy={top - 6} r={4} fill="#ff5a4a" stroke="none" />}
        </g>
      ))}
      {lights.length > 0 && <g className={s.twinkle}>{lights}</g>}
    </>
  );
}

/** Cami silüeti: kubbe, yarım kubbeler, minareler. */
function Mosque({ x, base, p, minarets }: { x: number; base: number; p: Palette; minarets: number }) {
  const w = 150;
  const body = base - 52;
  const towers = minarets === 4 ? [x - 105, x - 88, x + 88, x + 105] : [x - 96, x + 96];
  return (
    <g fill={p.mid} stroke={p.midLine} strokeWidth={2} strokeLinejoin="round">
      {towers.map((tx) => (
        <g key={tx}>
          <rect x={tx - 4} y={base - 150} width={8} height={150} />
          <path d={`M${tx - 5} ${base - 150} L${tx} ${base - 184} L${tx + 5} ${base - 150} Z`} />
          <rect x={tx - 6.5} y={base - 112} width={13} height={4} />
        </g>
      ))}
      <rect x={x - w / 2} y={body} width={w} height={52} />
      <path d={`M${x - 70} ${body} a26 22 0 0 1 52 0 Z`} />
      <path d={`M${x + 18} ${body} a26 22 0 0 1 52 0 Z`} />
      <path d={`M${x - 42} ${body} a42 40 0 0 1 84 0 Z`} />
      <rect x={x - 2} y={body - 54} width={4} height={14} />
      {p.lit &&
        [-50, -25, 0, 25, 50].map((dx) => <rect key={dx} x={x + dx - 4} y={body + 20} width={8} height={12} rx={4} fill="#f6c76c" stroke="none" />)}
    </g>
  );
}

function Mid({ p }: { p: Palette }) {
  const r = rng(31);
  const base = 566;
  const blocks: ReactNode[] = [];
  const lit: ReactNode[] = [];
  for (let x = 0; x < TILE_W; ) {
    const w = 40 + r() * 70;
    const h = 18 + r() * 46;
    blocks.push(<rect key={x} x={x} y={base - h} width={w + 1} height={h} />);
    if (p.lit) for (let k = 0; k < 3; k++) if (r() > 0.55) lit.push(<rect key={`${x}-${k}`} x={x + 6 + r() * (w - 14)} y={base - h + 6 + r() * (h - 14)} width={4} height={5} />);
    x += w;
  }
  return (
    <>
      <g fill={p.mid} stroke={p.midLine} strokeWidth={1.5}>
        {blocks}
      </g>
      {lit.length > 0 && <g fill="#f3c46e">{lit}</g>}
      <Mosque x={640} base={base - 18} p={p} minarets={2} />
      <Mosque x={2280} base={base - 26} p={p} minarets={4} />
      {/* tepedeki taş kule */}
      <g fill={p.mid} stroke={p.midLine} strokeWidth={2}>
        <rect x={1430} y={base - 150} width={40} height={150} />
        <rect x={1426} y={base - 158} width={48} height={10} />
        <path d={`M1428 ${base - 158} L1450 ${base - 206} L1472 ${base - 158} Z`} />
        {p.lit && <rect x={1444} y={base - 140} width={12} height={8} fill="#f3c46e" stroke="none" />}
      </g>
    </>
  );
}

interface House {
  x: number;
  w: number;
  h: number;
  color: string;
  floors: number;
  bay: boolean;
}

function houses(p: Palette): { list: House[]; trees: { x: number; h: number; cypress: boolean }[] } {
  const r = rng(101);
  const list: House[] = [];
  const trees: { x: number; h: number; cypress: boolean }[] = [];
  for (let x = 30; x < TILE_W - 200; ) {
    if (r() < 0.28) {
      const cypress = r() < 0.5;
      trees.push({ x: x + 20, h: cypress ? 90 + r() * 50 : 60 + r() * 30, cypress });
      x += 50;
      continue;
    }
    const floors = 2 + Math.floor(r() * 2);
    const w = 120 + r() * 120;
    list.push({ x, w, h: floors * 38 + 10, color: p.houses[Math.floor(r() * p.houses.length)], floors, bay: r() < 0.55 });
    x += w + 8 + r() * 30;
  }
  return { list, trees };
}

function NearShore({ p, list, trees, lit }: { p: Palette; list: House[]; trees: { x: number; h: number; cypress: boolean }[]; lit: Set<string> }) {
  const base = SHORE - 10;
  return (
    <>
      {trees.map((t) =>
        t.cypress ? (
          <path key={t.x} d={`M${t.x} ${base} C${t.x - 12} ${base - t.h * 0.5} ${t.x - 6} ${base - t.h} ${t.x} ${base - t.h} C${t.x + 6} ${base - t.h} ${t.x + 12} ${base - t.h * 0.5} ${t.x} ${base} Z`} fill={p.tree} stroke={INK} strokeWidth={1.6} />
        ) : (
          <g key={t.x} fill={p.tree} stroke={INK} strokeWidth={1.6}>
            <circle cx={t.x} cy={base - t.h + 24} r={26} />
            <circle cx={t.x + 20} cy={base - t.h + 34} r={20} />
          </g>
        ),
      )}
      {list.map((h, i) => {
        const top = base - h.h;
        const cols = Math.max(3, Math.floor(h.w / 30));
        const gap = h.w / cols;
        const wins: ReactNode[] = [];
        for (let f = 0; f < h.floors; f++)
          for (let c = 0; c < cols; c++) {
            const key = `${i}-${f}-${c}`;
            wins.push(<rect key={key} x={h.x + c * gap + gap / 2 - 5} y={top + 14 + f * 38} width={10} height={20} fill={lit.has(key) ? '#f6c86e' : p.window} />);
          }
        return (
          <g key={h.x}>
            <path d={`M${h.x - 10} ${top} L${h.x + 14} ${top - 26} L${h.x + h.w - 14} ${top - 26} L${h.x + h.w + 10} ${top} Z`} fill={p.roof} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
            <rect x={h.x} y={top} width={h.w} height={h.h} fill={h.color} stroke={INK} strokeWidth={1.8} />
            {/* ahşap kaplama çizgileri */}
            <g stroke="rgba(42,36,32,.18)" strokeWidth={1}>
              {Array.from({ length: Math.floor(h.h / 9) }, (_, k) => (
                <line key={k} x1={h.x} x2={h.x + h.w} y1={top + 6 + k * 9} y2={top + 6 + k * 9} />
              ))}
            </g>
            <g stroke={INK} strokeWidth={1}>
              {wins}
            </g>
            {h.bay && (
              <g stroke={INK}>
                <rect x={h.x + h.w * 0.35} y={top + 6} width={h.w * 0.3} height={40} fill={h.color} strokeWidth={1.8} />
                {[0.42, 0.53].map((k) => (
                  <rect key={k} x={h.x + h.w * k} y={top + 14} width={h.w * 0.06} height={22} fill={lit.has(`${i}-0-0`) ? '#f6c86e' : p.window} strokeWidth={1} />
                ))}
              </g>
            )}
            <rect x={h.x + h.w / 2 - 9} y={base - 26} width={18} height={26} fill={p.roof} stroke={INK} strokeWidth={1.4} />
          </g>
        );
      })}
      {/* rıhtım */}
      <rect x={0} y={base} width={TILE_W} height={12} fill={p.quay} stroke={INK} strokeWidth={1.6} />
    </>
  );
}

function Near({ p, low }: { p: Palette; low: boolean }) {
  const clip = `yansima-${useId().replace(/\W/g, '')}`;
  const { list, trees } = useMemo(() => houses(p), [p]);
  const lit = useMemo(() => {
    const set = new Set<string>();
    if (!p.lit) return set;
    const r = rng(55);
    list.forEach((h, i) => {
      const cols = Math.max(3, Math.floor(h.w / 30));
      for (let f = 0; f < h.floors; f++) for (let c = 0; c < cols; c++) if (r() < 0.32) set.add(`${i}-${f}-${c}`);
    });
    return set;
  }, [list, p.lit]);
  // gece: yanan pencerelerin suya düşen titrek ışıkları
  const streaks: ReactNode[] = [];
  if (p.lit) {
    list.forEach((h, i) => {
      const cols = Math.max(3, Math.floor(h.w / 30));
      const gap = h.w / cols;
      for (let c = 0; c < cols; c++)
        if ([...Array(h.floors).keys()].some((f) => lit.has(`${i}-${f}-${c}`))) {
          // kırık bir ışık sütunu: aşağı indikçe daralan, sağa sola kayan kısa çizgiler
          const cx = h.x + c * gap + gap / 2;
          const n = 6 + ((i * 7 + c * 13) % 5);
          for (let k = 0; k < n; k++) {
            const w = 12 - k;
            streaks.push(<rect key={`${i}-${c}-${k}`} x={cx - w / 2 + (((k * 5 + c) % 3) - 1) * 2} y={SHORE + 8 + k * 9} width={w} height={3} rx={1.5} />);
          }
        }
    });
  }
  return (
    <>
      {/* yansıma: kıyının ters kopyası, suyun rengiyle kırık çizgiler halinde */}
      {!low && (
        <>
          <clipPath id={clip}>
            <rect x={0} y={SHORE + 2} width={TILE_W} height={130} />
          </clipPath>
          <g clipPath={`url(#${clip})`} opacity={p.lit ? 0.22 : 0.28}>
            <g transform={`translate(0 ${SHORE * 2 - 20}) scale(1 -1)`}>
              <NearShore p={p} list={list} trees={trees} lit={lit} />
            </g>
            <g stroke={p.water} strokeWidth={3}>
              {Array.from({ length: 16 }, (_, k) => (
                <line key={k} x1={0} x2={TILE_W} y1={SHORE + 6 + k * 8} y2={SHORE + 6 + k * 8} />
              ))}
            </g>
          </g>
        </>
      )}
      {streaks.length > 0 && (
        <g className={s.shimmer} fill="rgba(246,200,110,.7)">
          {streaks}
        </g>
      )}
      <NearShore p={p} list={list} trees={trees} lit={lit} />
      {/* kıyıda bağlı sandallar */}
      {[260, 1180, 2050, 2900].map((x) => (
        <path key={x} d={`M${x} ${SHORE + 8} l60 0 l-8 12 l-44 0 Z`} fill={p.houses[2]} stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
      ))}
    </>
  );
}

function Waves({ p, low }: { p: Palette; low: boolean }) {
  const r = rng(9);
  const n = low ? 70 : 150;
  const paths: string[] = [];
  for (let i = 0; i < n; i++) {
    // aşağıya (bize) yaklaştıkça dalga uzar ve sıklaşır
    const depth = Math.sqrt(r());
    const y = SHORE + 20 + depth * (TILE_H - SHORE - 20);
    const w = 14 + depth * 46;
    const x = r() * (TILE_W - w);
    paths.push(`M${x.toFixed(0)} ${y.toFixed(0)} q${(w / 2).toFixed(0)} ${(-3 - depth * 5).toFixed(1)} ${w.toFixed(0)} 0`);
  }
  return <path d={paths.join(' ')} fill="none" stroke={p.wave} strokeWidth={2.2} strokeLinecap="round" />;
}

/** Kayan bir katman: karonun iki kopyası, karo boyu kadar kayar. */
function Strip({ children, speed, className }: { children: ReactNode; speed: number; className?: string }) {
  const tile = (
    <svg className={s.tile} viewBox={`0 0 ${TILE_W} ${TILE_H}`} preserveAspectRatio="xMinYMin meet" aria-hidden="true">
      {children}
    </svg>
  );
  return (
    <div className={`${s.strip} ${className ?? ''}`}>
      <div className={s.track} style={{ animationDuration: `${speed}s` } as CSSProperties}>
        {tile}
        {tile}
      </div>
    </div>
  );
}

export function Scene({ p, low, reverse, still }: { p: Palette; low: boolean; reverse: boolean; still: boolean }) {
  const vars = {
    '--sky-top': p.skyTop,
    '--sky-low': p.skyLow,
    '--water': p.water,
    '--water-deep': p.waterDeep,
    '--sun': p.sun,
    '--shore': `${(SHORE / TILE_H) * 100}%`,
  } as CSSProperties;
  return (
    <div className={`${s.scene} ${reverse ? s.reverse : ''} ${still ? s.sceneStill : ''}`} style={vars} aria-hidden="true">
      <div className={s.sky} />
      {p.moon && <div className={s.stars} />}
      <div className={`${s.sun} ${p.moon ? s.moon : ''}`} style={{ left: `${p.sunAt[0]}%`, top: `${p.sunAt[1]}%`, width: p.sunR * 2, height: p.sunR * 2 } as CSSProperties} />
      <div className={s.world}>
        <div className={s.water} />
        <Strip speed={300}>
          <Far p={p} />
        </Strip>
        <Strip speed={150}>
          <Mid p={p} />
        </Strip>
        <Strip speed={70}>
          <Near p={p} low={low} />
        </Strip>
        <Strip speed={40}>
          <Waves p={p} low={low} />
        </Strip>
      </div>
      {!low && !still && (
        <svg className={s.gulls} viewBox="0 0 100 40" aria-hidden="true">
          <path className={s.gull} d="M2 10 q6 -7 12 0 q6 -7 12 0" />
          <path className={`${s.gull} ${s.gull2}`} d="M2 10 q5 -6 10 0 q5 -6 10 0" />
        </svg>
      )}
    </div>
  );
}
