import { COUNTER_Y } from './ShopDecor';

/* Ekmek dolabı ve somunları: sahnenin koordinatlarında (ShopScene çizer). */

/** Tek somun: fırından yeni çıkmış, üstünde üç bıçak yarığı. */
function Loaf({ x, y, r = 0 }: { x: number; y: number; r?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <ellipse cx="0" cy="-11" rx="27" ry="12" fill="url(#bread)" />
      {[-12, -2, 8].map((dx) => (
        <path key={dx} d={`M${dx} -18 q4 4 8 1`} stroke="#8a4f17" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      ))}
      <ellipse cx="-6" cy="-17" rx="12" ry="2.5" fill="rgba(255,240,210,.35)" />
    </g>
  );
}

/** Ekmek dolabındaki somunların yerleri: alttan üste, her katta beş somun (üçü yan yana, ikisi üstte). */
const LOAVES = [620, 520, 420, 360].flatMap((y) => [
  { x: 40, y, r: -3 },
  { x: 96, y, r: 4 },
  { x: 68, y: y - 15, r: 2 },
  { x: 54, y: y - 28, r: -4 },
  { x: 84, y: y - 28, r: 5 },
]);

/**
 * Ekmek dolabı: rafla içecek dolabının arasında, ahşap çerçeveli camlı dolap. Üstünde boyalı
 * EKMEK yazısı; içeride dört katta raftaki ekmek kadar somun. Fırın sabah getirir.
 */
export function BreadCase({ bread }: { bread: number }) {
  const x0 = 1030;
  const x1 = 1166;
  const top = 290;
  return (
    <g>
      <ellipse cx={(x0 + x1) / 2} cy="712" rx="78" ry="7" fill="rgba(0,0,0,.3)" />
      <rect x={x1 + 4} y={top} width="18" height={COUNTER_Y - top + 10} fill="url(#hatch)" stroke="none" />
      <rect x={x0} y={top} width={x1 - x0} height={COUNTER_Y - top + 20} rx="4" fill="url(#post)" />
      <rect x={x0} y={top} width={x1 - x0} height={COUNTER_Y - top + 20} rx="4" fill="url(#woodGrainV)" stroke="none" />
      <rect x={x0 - 4} y={top - 34} width={x1 - x0 + 8} height="38" rx="4" fill="#7a4f2c" />
      <rect x={x0 - 4} y={top - 34} width={x1 - x0 + 8} height="38" rx="4" fill="url(#woodGrain)" stroke="none" />
      <rect x={x0 - 4} y={top - 2} width={x1 - x0 + 8} height="6" fill="#5c3b22" />
      <text x={(x0 + x1) / 2} y={top - 8} textAnchor="middle" fontSize="24" fontWeight="800" fill="#f3d27a" fontFamily="Georgia, serif" letterSpacing="3">
        EKMEK
      </text>
      <rect x={x0 + 10} y={top + 12} width={x1 - x0 - 20} height={COUNTER_Y - top - 2} fill="#f3e6c8" />
      <rect x={x0 + 10} y={top + 12} width={x1 - x0 - 20} height={COUNTER_Y - top - 2} fill="url(#shelfShade)" opacity=".5" />
      {[360, 420, 520, 620].map((y) => (
        <rect key={y} x={x0 + 10} y={y} width={x1 - x0 - 20} height="6" fill="#a8754a" />
      ))}
      {LOAVES.slice(0, bread).map((l, i) => (
        <Loaf key={i} x={x0 + l.x} y={l.y} r={l.r} />
      ))}
      {/* cam kapı: iki kanat, yansıma, pirinç topuz */}
      <rect x={x0 + 10} y={top + 12} width={x1 - x0 - 20} height={COUNTER_Y - top - 2} fill="url(#glass)" />
      <path d={`M${x0 + 18} ${top + 16} L${x0 + 50} ${top + 16} L${x0 + 22} ${COUNTER_Y - 10} L${x0 + 14} ${COUNTER_Y - 10} Z`} fill="rgba(255,255,255,.18)" />
      <rect x={(x0 + x1) / 2 - 2} y={top + 12} width="4" height={COUNTER_Y - top - 2} fill="#4a2f1b" />
      <rect x={x0 + 10} y={top + 12} width={x1 - x0 - 20} height={COUNTER_Y - top - 2} fill="none" stroke="#4a2f1b" strokeWidth="6" />
      <circle cx={(x0 + x1) / 2 - 9} cy="470" r="4" fill="url(#brass)" />
      <circle cx={(x0 + x1) / 2 + 9} cy="470" r="4" fill="url(#brass)" />
    </g>
  );
}
