import type { CSSProperties } from 'react';
import type { FlowerState } from '../../game/desk';

/*
 * The welcome orchid: a real photograph of a potted phalaenopsis ("Pot Orchid", Timm Schoof,
 * CC BY-SA 3.0, Wikimedia Commons), cut out of its background. Every day without water it
 * goes further — the colour drains, it leans and sags, petals drop onto the desk, and in the
 * end only the bare spikes stand in the pot.
 */

export const ORCHID_CREDIT = 'Orkide fotoğrafı: "Pot Orchid", Timm Schoof — CC BY-SA 3.0, Wikimedia Commons';

/*
 * Two layers of the same photo: the leaves and pot (bottom), the flower spike (top). Thirst shows
 * the way it does on a real orchid — the spike bends at its base and hangs, the blooms brown and
 * shrivel, the leaves go limp and yellow later than the flowers.
 */
const SPIKE: Record<FlowerState, CSSProperties> = {
  fresh: {},
  tired: { transform: 'rotate(5deg) translateY(1%)', filter: 'saturate(0.8) sepia(0.12)' },
  wilted: { transform: 'rotate(17deg) translate(3%, 5%) scale(0.95)', filter: 'saturate(0.45) sepia(0.5) hue-rotate(-12deg) brightness(0.88)' },
  dead: { transform: 'rotate(34deg) translate(7%, 11%) scale(0.86)', filter: 'grayscale(0.4) sepia(0.85) brightness(0.62) contrast(1.1)', opacity: 0.85 },
};
const LEAVES: Record<FlowerState, CSSProperties> = {
  fresh: {},
  tired: {},
  wilted: { filter: 'saturate(0.8) sepia(0.18)', transform: 'scaleY(0.97)' },
  dead: { filter: 'saturate(0.5) sepia(0.55) hue-rotate(-18deg) brightness(0.8)', transform: 'scaleY(0.93)' },
};

const FALLEN: Record<FlowerState, number> = { fresh: 0, tired: 2, wilted: 6, dead: 10 };
const PETALS: [number, number, number][] = [
  [18, 96, 20],
  [78, 97, -30],
  [88, 94, 60],
  [8, 98, 110],
  [95, 98, 15],
  [26, 99, 80],
  [70, 99, -60],
  [4, 95, 140],
  [84, 99, 35],
  [14, 97, -20],
];

const IMG: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  objectPosition: 'bottom',
  transition: 'filter 0.8s ease, transform 0.8s ease',
};

export function OrchidArt({ state }: { state: FlowerState }) {
  const tone = state === 'fresh' || state === 'tired' ? '#a3185a' : state === 'wilted' ? '#8a5a4a' : '#6e5a44';
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
        <ellipse cx={50} cy={98.6} rx={30} ry={1.6} fill="rgba(40,24,10,0.45)" filter="url(#deskBlur)" />
        {PETALS.slice(0, FALLEN[state]).map(([x, y, r], i) => (
          <ellipse key={i} cx={x} cy={y} rx={3.4} ry={0.9} transform={`rotate(${r * 0.15} ${x} ${y})`} fill={i % 3 === 0 ? '#e8d6c0' : tone} opacity={0.9} />
        ))}
      </svg>
      {/* leaves and pot */}
      <img
        src="/desk/orchid.png"
        alt=""
        draggable={false}
        style={{ ...IMG, clipPath: 'inset(58% 0 0 0)', transformOrigin: '50% 92%', ...LEAVES[state] }}
      />
      {/* the flower spike, hinged where it leaves the leaves */}
      <img
        src="/desk/orchid.png"
        alt=""
        draggable={false}
        style={{ ...IMG, clipPath: 'inset(0 0 42% 0)', transformOrigin: '46% 60%', ...SPIKE[state] }}
      />
      {/* the gift card on its plastic fork */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
        <line x1={62} y1={72} x2={67} y2={63} stroke="#d8d8d8" strokeWidth={0.7} />
        <g transform="rotate(8 70 61)">
          <rect x={60} y={57} width={20} height={7} rx={0.6} fill="#fffdf7" stroke="rgba(0,0,0,0.12)" strokeWidth={0.2} />
          <text x={70} y={61.8} textAnchor="middle" fontSize={3.2} fill="#8a6a2b" fontStyle="italic" fontFamily="Fraunces, serif">
            Hoş geldin
          </text>
        </g>
        <rect x={37} y={75} width={26} height={2.2} fill="#c9a227" opacity={0.95} />
      </svg>
    </div>
  );
}
