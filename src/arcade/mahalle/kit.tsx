import { hash } from './places';
import s from './Scene.module.css';

/*
 * Sahnenin küçük parçaları. Her bina iki katmanda çizilir: gövde (`body`) günün ışığına göre
 * süzülür (akşam turuncu, gece lacivert), ışık saçanlar (`emit`) süzülmez: yanan pencereler,
 * tabelalar, ekranlar. Pencere ızgarası bu yüzden iki kez çağrılır, aynı ölçüyle.
 */

export interface GridProps {
  x: number;
  y: number;
  cols: number;
  rows: number;
  w: number;
  h: number;
  gx: number;
  gy: number;
  seed: number;
  /** Akşam ve gece yanan pencerelerin oranı. */
  ratio?: number;
}

function cells({ x, y, cols, rows, w, h, gx, gy }: GridProps) {
  const out: { x: number; y: number; i: number }[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push({ x: x + c * (w + gx), y: y + r * (h + gy), i: r * cols + c });
  return out;
}

/** Gövdedeki pencereler: çerçeve, cam ve camdaki gökyüzü yansıması. */
export function Windows(p: GridProps & { frame?: string; sill?: boolean }) {
  return (
    <g>
      {cells(p).map((c) => (
        <g key={c.i}>
          <rect x={c.x - 2} y={c.y - 2} width={p.w + 4} height={p.h + 4} fill={p.frame ?? '#f3ece0'} />
          <rect className={s.glass} x={c.x} y={c.y} width={p.w} height={p.h} />
          <path className={s.glint} d={`M${c.x + 2} ${c.y + p.h * 0.7} L${c.x + p.w * 0.6} ${c.y + 2} L${c.x + p.w * 0.85} ${c.y + 2} L${c.x + 2} ${c.y + p.h}Z`} />
          <rect x={c.x + p.w / 2 - 1} y={c.y} width={2} height={p.h} fill={p.frame ?? '#f3ece0'} />
          {p.sill !== false && <rect x={c.x - 4} y={c.y + p.h + 2} width={p.w + 8} height={3} fill="rgba(0,0,0,.18)" />}
        </g>
      ))}
    </g>
  );
}

/** Aynı ızgaranın yanan pencereleri: yalnızca akşam ve gece görünür, her biri kendi tonunda. */
export function LitWindows(p: GridProps) {
  const ratio = p.ratio ?? 0.45;
  return (
    <g className={s.lit}>
      {cells(p)
        .filter((c) => hash(p.seed + c.i) < ratio)
        .map((c) => (
          <rect key={c.i} x={c.x} y={c.y} width={p.w} height={p.h} fill={hash(p.seed * 3 + c.i) > 0.3 ? '#ffd27a' : '#bfe0ff'} opacity={0.75 + hash(c.i + p.seed * 7) * 0.25} />
        ))}
    </g>
  );
}

/** Kiremit çatı: alt kenar geniş, üstü dar. */
export function Roof({ x1, x2, y, h, inset, color = '#b9533c' }: { x1: number; x2: number; y: number; h: number; inset: number; color?: string }) {
  const rows = Math.floor(h / 8);
  return (
    <g>
      <path d={`M${x1} ${y} L${x1 + inset} ${y - h} L${x2 - inset} ${y - h} L${x2} ${y}Z`} fill={color} />
      {Array.from({ length: rows }, (_, i) => {
        const yy = y - (i + 1) * 8;
        const k = ((i + 1) * 8) / h;
        return <path key={i} d={`M${x1 + inset * k} ${yy} L${x2 - inset * k} ${yy}`} stroke="rgba(0,0,0,.16)" strokeWidth={1.5} />;
      })}
      <rect x={x1 - 4} y={y - 2} width={x2 - x1 + 8} height={6} fill="rgba(0,0,0,.25)" />
    </g>
  );
}

/** Dış ünite: kutu, pervane ve altında damlayan suyun izi. */
export function AirCon({ x, y, stain = true }: { x: number; y: number; stain?: boolean }) {
  return (
    <g>
      {stain && <path d={`M${x + 28} ${y + 26} q2 30 -1 60`} stroke="rgba(70,55,30,.25)" strokeWidth={3} fill="none" />}
      <rect x={x} y={y} width={38} height={26} rx={2} fill="#f2f2ee" stroke="#b7b5ab" />
      <circle cx={x + 14} cy={y + 13} r={9} fill="#d9d8d1" stroke="#a7a59b" />
      <path d={`M${x + 6} ${y + 13}h16M${x + 14} ${y + 5}v16`} stroke="#9b998f" strokeWidth={1.4} />
      <rect x={x + 27} y={y + 5} width={7} height={16} fill="#e1e0d9" />
      <path d={`M${x + 4} ${y + 26}v4M${x + 34} ${y + 26}v4`} stroke="#8a887f" strokeWidth={2} />
    </g>
  );
}

/** Çanak anten, gövdesi sağa bakar. */
export function Dish({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`}>
      <path d="M0 0 v-10" stroke="#777" strokeWidth={2} />
      <ellipse cx={4} cy={-20} rx={8} ry={13} transform="rotate(-25 4 -20)" fill="#e9e7e1" stroke="#9a978d" />
      <path d="M4 -20 L16 -26" stroke="#777" strokeWidth={1.5} />
      <circle cx={16} cy={-26} r={2} fill="#555" />
    </g>
  );
}

/** Mahalle sakini: yanlarda duran ya da yürüyen basit bir figür. */
export function Person({ x, y, coat, cap, hands = 'side', walk = false, scale = 1 }: { x: number; y: number; coat: string; cap?: string; hands?: 'side' | 'back'; walk?: boolean; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx={0} cy={0} rx={11} ry={2.5} fill="rgba(0,0,0,.18)" />
      <g className={walk ? s.legA : undefined}>
        <path d="M-2 -22 L-3 0" stroke="#2c2c34" strokeWidth={4.5} strokeLinecap="round" />
      </g>
      <g className={walk ? s.legB : undefined}>
        <path d="M2 -22 L3 0" stroke="#33333c" strokeWidth={4.5} strokeLinecap="round" />
      </g>
      <path d="M-7 -21 Q-8 -40 -4 -44 L4 -44 Q8 -40 7 -21Z" fill={coat} />
      {hands === 'back' ? <path d="M-6 -40 Q-10 -30 -3 -26" stroke={coat} strokeWidth={4} fill="none" strokeLinecap="round" /> : <path d="M-6 -41 L-8 -26" stroke={coat} strokeWidth={4} strokeLinecap="round" />}
      <circle cx={0} cy={-50} r={6} fill="#e6b994" />
      {cap && <path d="M-7 -52 Q0 -60 7 -52 L10 -51 L-7 -51Z" fill={cap} />}
    </g>
  );
}
