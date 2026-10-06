import type { CSSProperties } from 'react';
import type { FlowerState } from '../../game/desk';

/*
 * The welcome orchid: a real photograph of a potted phalaenopsis (Unsplash License: free to use
 * and change, no credit required), cut out of its black backdrop. The pot stands to the right
 * and the spike arcs over to the left. Every day without water it goes further — the colour
 * drains, the spike sags further over, petals drop onto the desk, and in the end only a bent
 * stem hangs over the pot.
 */

/*
 * Two layers of the same photo: the leaves and pot (below SPLIT), the flower spike (above it).
 * Thirst shows the way it does on a real orchid — the spike bends at its base (where the stem
 * leaves the leaves, SPIKE_BASE) and hangs further over, the blooms brown and shrivel, the
 * leaves go limp and yellow later than the flowers.
 */
/** Where the leaves begin, as a share of the image's height. */
const SPLIT = 55;
const SPIKE_BASE = `90% ${SPLIT}%`;
/** The pot's centre line (share of the width): the leaves sag towards it, its shadow sits under it. */
const POT_X = 75.5;
const SPIKE: Record<FlowerState, CSSProperties> = {
  fresh: {},
  tired: { transform: 'rotate(-4deg) translateY(1%)', filter: 'saturate(0.8) sepia(0.12)' },
  wilted: { transform: 'rotate(-12deg) translate(-2%, 4%) scale(0.96)', filter: 'saturate(0.45) sepia(0.5) hue-rotate(-12deg) brightness(0.88)' },
  dead: { transform: 'rotate(-24deg) translate(-3%, 9%) scale(0.88)', filter: 'grayscale(0.4) sepia(0.85) brightness(0.62) contrast(1.1)', opacity: 0.85 },
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

/**
 * Office light on a studio photo: a touch warmer and softer so it sits in the room, and the
 * window to the left throws a soft shadow to the right — a close contact one and a wide one on
 * the wall behind.
 */
const CAST = 'sepia(0.08) saturate(0.92) contrast(0.96) drop-shadow(2px 1px 1.5px rgba(45, 28, 12, 0.28)) drop-shadow(14px 6px 10px rgba(45, 28, 12, 0.16))';
const withCast = (style: CSSProperties): CSSProperties => ({ ...style, filter: [style.filter, CAST].filter(Boolean).join(' ') });

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
  const tone = state === 'fresh' || state === 'tired' ? '#c690c8' : state === 'wilted' ? '#8a5a4a' : '#6e5a44';
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
        {/* where the saucer meets the desk: a wide soft shadow and a tight dark line under it */}
        <ellipse cx={POT_X + 1.5} cy={98.8} rx={27} ry={1.8} fill="rgba(40,24,10,0.32)" filter="url(#deskBlur)" />
        <ellipse cx={POT_X} cy={99.5} rx={21} ry={0.7} fill="rgba(30,18,8,0.55)" filter="url(#deskBlur)" />
        {PETALS.slice(0, FALLEN[state]).map(([x, y, r], i) => (
          <ellipse key={i} cx={x} cy={y} rx={3.4} ry={0.9} transform={`rotate(${r * 0.15} ${x} ${y})`} fill={i % 3 === 0 ? '#f3e6f0' : tone} opacity={0.9} />
        ))}
      </svg>
      {/* leaves and pot */}
      <img
        src={`${import.meta.env.BASE_URL}desk/orchid.webp`}
        alt=""
        draggable={false}
        style={{ ...IMG, clipPath: `inset(${SPLIT}% 0 0 0)`, transformOrigin: `${POT_X}% 72%`, ...withCast(LEAVES[state]) }}
      />
      {/* the flower spike, hinged where it leaves the leaves */}
      <img
        src={`${import.meta.env.BASE_URL}desk/orchid.webp`}
        alt=""
        draggable={false}
        style={{ ...IMG, clipPath: `inset(0 0 ${100 - SPLIT}% 0)`, transformOrigin: SPIKE_BASE, ...withCast(SPIKE[state]) }}
      />
      {/* the gift card on its plastic fork */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
        <defs>
          <linearGradient id="orchidCard" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fffdf8" />
            <stop offset="1" stopColor="#efe8da" />
          </linearGradient>
        </defs>
        <line x1={68.5} y1={73} x2={63} y2={65.5} stroke="#bfc3c6" strokeWidth={0.45} strokeLinecap="round" />
        <g transform="rotate(-7 60 62)">
          <rect x={52.6} y={59.4} width={15} height={5.6} rx={0.3} fill="rgba(40,24,10,0.22)" transform="translate(0.5 0.45)" />
          <rect x={52.6} y={59.4} width={15} height={5.6} rx={0.3} fill="url(#orchidCard)" />
          <text x={60.1} y={63.1} textAnchor="middle" fontSize={2.4} fill="#6d5a3a" fontStyle="italic" fontFamily="Fraunces, serif">
            Hoş geldin
          </text>
        </g>
      </svg>
    </div>
  );
}
