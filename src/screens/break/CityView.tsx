import type { CSSProperties } from 'react';
import type { Weather } from './weather';
import styles from './CityView.module.css';

/*
 * Noon view from the cafeteria window: the same business district the office looks onto —
 * glass towers, a tower still under its crane, the highway in between, rooftops below. Drawn in
 * the BreakRoom's scene coordinates (window glass spans x 82–388, y 52–258) and clipped by the
 * window. Depth cues: far things are smaller, paler and slower.
 */

type Drift = CSSProperties & { '--from': string; '--to': string };

/** Horizontal drift across the window: from/to in px, duration in s, negative delay = already underway. */
function drift(from: number, to: number, duration: number, delay: number): Drift {
  return {
    '--from': `${from}px`,
    '--to': `${to}px`,
    animationDuration: `${duration}s`,
    animationDelay: `${-delay}s`,
  };
}

function Cloud({ scale = 1 }: { scale?: number }) {
  return (
    <g transform={`scale(${scale})`} fill="#ffffff">
      <ellipse cx="0" cy="0" rx="26" ry="8" opacity="0.85" />
      <ellipse cx="-12" cy="-5" rx="12" ry="8" opacity="0.9" />
      <ellipse cx="8" cy="-7" rx="15" ry="10" opacity="0.9" />
    </g>
  );
}

/** Gull with two wings hinged at the body — they rotate, so the bird never collapses to a line. */
function Gull({ delay = 0 }: { delay?: number }) {
  const style = { animationDelay: `${delay}s` };
  return (
    <g>
      <path d="M0 0 Q-3.5 -3.2 -7.5 -0.8" className={`${styles.wing} ${styles.wingLeft}`} style={style} />
      <path d="M0 0 Q3.5 -3.2 7.5 -0.8" className={`${styles.wing} ${styles.wingRight}`} style={style} />
      <ellipse cx="0" cy="0.4" rx="1.6" ry="1" fill="#5f7282" />
    </g>
  );
}

/** Deterministic pseudo-random so weather layouts don't reshuffle on re-render. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) % 4294967296;
    return a / 4294967296;
  };
}

const R = seeded(42);
const RAIN_SLIDERS = Array.from({ length: 12 }, () => ({ x: 88 + R() * 294, y: 60 + R() * 120, dur: 2.5 + R() * 3.5, delay: R() * 6, r: 1.4 + R() * 1.4 }));
const RAIN_BEADS = Array.from({ length: 34 }, () => ({ x: 86 + R() * 298, y: 56 + R() * 196, r: 0.8 + R() * 1.6 }));
const SNOWFLAKES = Array.from({ length: 46 }, () => ({ x: 70 + R() * 330, r: 0.7 + R() * 1.6, dur: 6 + R() * 7, delay: R() * 12, sway: 4 + R() * 10 }));
/* Three depths of the business district, generated once. Window glass spans x 82–388. */
const HAZE_TOWERS = Array.from({ length: 22 }, (_, i) => ({ x: 78 + i * 14 + R() * 6, w: 9 + R() * 12, y: 150 + R() * 40 }));
const FAR_TOWERS = Array.from({ length: 11 }, (_, i) => ({ x: 80 + i * 29 + R() * 8, w: 14 + R() * 12, y: 128 + R() * 44 }));
const NEAR_TOWERS: { x: number; y: number; w: number; crown?: boolean; logo?: boolean; tone: number }[] = [
  { x: 90, y: 164, w: 34, tone: 0 },
  { x: 146, y: 100, w: 38, crown: true, logo: true, tone: 1 },
  { x: 190, y: 146, w: 30, tone: 0 },
  { x: 238, y: 160, w: 40, logo: true, tone: 1 },
  { x: 356, y: 172, w: 32, tone: 0 },
];
/* lit office windows, for the grey days */
const LIT = NEAR_TOWERS.flatMap((t) =>
  Array.from({ length: 14 }, () => ({ x: t.x + 2 + Math.floor(R() * Math.floor((t.w - 4) / 4)) * 4, y: t.y + 4 + Math.floor(R() * Math.floor((222 - t.y) / 5)) * 5 })),
).filter(() => R() > 0.35);
const TREES = Array.from({ length: 16 }, (_, i) => ({ x: 84 + i * 19.5 + R() * 6, r: 5 + R() * 3.5 }));
const CARS = Array.from({ length: 11 }, (_, i) => ({
  lane: [233.5, 237, 240.5, 244][i % 4],
  east: i % 4 >= 2,
  bus: i === 4,
  dur: 7 + (i % 5) * 1.4,
  delay: i * 1.1,
  color: ['#d8d4cc', '#3b4652', '#a8402f', '#e0e2e4', '#d9772b', '#2d2f33', '#c9a227', '#6b7b8c', '#f2f2f0', '#44505c', '#8c1f24'][i],
}));
const CLOUD_SLOTS = Array.from({ length: 8 }, (_, i) => ({ y: 124 + (i % 4) * 9 + R() * 6, scale: 0.5 + R() * 0.7, phase: R() }));

interface CityViewProps {
  weather: Weather;
  skyFill: string;
}

export function CityView({ weather: w, skyFill }: CityViewProps) {
  const snowy = w.kind === 'snowy';
  const rainy = w.kind === 'rainy';

  return (
    <g className={styles.view}>
      <rect x="82" y="52" width="306" height="206" fill={skyFill} />

      {/* Noon sun (high, mostly behind the blinds) — veiled on windy days */}
      {w.sun && (
        <>
          <circle cx="352" cy="128" r="40" fill="#fff6d8" opacity={w.kind === 'sunny' ? 0.28 : 0.14} />
          <circle cx="352" cy="128" r="18" fill="#fffaf0" opacity={w.kind === 'sunny' ? 0.9 : 0.55} />
        </>
      )}

      {/* Clouds — count, colour and speed follow the weather */}
      {CLOUD_SLOTS.slice(0, w.cloudCount).map((c, i) => (
        <g key={i} transform={`translate(0 ${c.y})`}>
          <g className={styles.drift} style={drift(-70, 470, w.cloudSpeed * (0.8 + c.scale * 0.4), w.cloudSpeed * c.phase)}>
            <g fill={w.cloud}>
              <Cloud scale={c.scale * (rainy ? 1.4 : 1)} />
            </g>
          </g>
        </g>
      ))}

      {/* The business district across the road, in three depths: a pale skyline lost in haze,
          nearer towers, and the glass towers right across the highway. */}
      <g fill={w.farShore} opacity="0.7">
        {HAZE_TOWERS.map((t, i) => (
          <rect key={i} x={t.x} y={t.y} width={t.w} height={230 - t.y} />
        ))}
      </g>
      <g fill={w.nearShore}>
        {FAR_TOWERS.map((t, i) => (
          <g key={i}>
            <rect x={t.x} y={t.y} width={t.w} height={230 - t.y} />
            <rect x={t.x} y={t.y} width={t.w * 0.3} height={230 - t.y} fill="#ffffff" opacity="0.08" />
          </g>
        ))}
      </g>
      {snowy && (
        <g fill="#f7f9fa">
          {FAR_TOWERS.map((t, i) => (
            <rect key={i} x={t.x} y={t.y - 1} width={t.w} height="2" />
          ))}
        </g>
      )}

      {/* crane over the unfinished tower, jib slowly turning */}
      <g stroke={w.landmarks} strokeWidth="1" fill="none">
        <path d="M300 222 V120 M296 222 V120 M296 124 L304 124 M296 132 L304 124 M296 140 L304 132 M296 148 L304 140 M296 156 L304 148 M296 164 L304 156 M296 172 L304 164 M296 180 L304 172" />
      </g>
      <g className={styles.jib}>
        <path d="M262 120 H352 M298 120 L298 110 L300 110 M300 110 L262 120 M300 110 L352 120" stroke={w.landmarks} strokeWidth="1.1" fill="none" />
        <line x1="336" y1="120" x2="336" y2="150" stroke={w.landmarks} strokeWidth="0.6" />
        <rect x="332" y="150" width="8" height="5" fill={w.landmarks} />
        <rect x="266" y="120" width="10" height="7" fill={w.landmarks} />
      </g>
      <circle cx="299" cy="108" r="1.3" fill="#ff5a4a" className={styles.blink} />
      {/* the tower it is building: finished floors below, bare slabs on top */}
      <g>
        <rect x="312" y="176" width="46" height="50" fill="url(#glass1)" />
        <rect x="312" y="150" width="46" height="26" fill={w.nearShore} />
        {Array.from({ length: 6 }, (_, i) => (
          <line key={i} x1="310" x2="360" y1={151 + i * 5} y2={151 + i * 5} stroke={w.landmarks} strokeWidth="1" />
        ))}
        {[316, 334, 352].map((x) => (
          <line key={x} x1={x} x2={x} y1="150" y2="176" stroke={w.landmarks} strokeWidth="0.8" />
        ))}
      </g>

      {/* the glass towers: curtain walls with the sky in them, mullions, a few lights on */}
      {NEAR_TOWERS.map((t, i) => (
        <g key={i}>
          <rect x={t.x} y={t.y} width={t.w} height={230 - t.y} fill={`url(#glass${t.tone})`} />
          <path d={`M ${t.x} ${t.y + 30} L ${t.x + t.w} ${t.y + 10} L ${t.x + t.w} ${t.y + 44} L ${t.x} ${t.y + 64} Z`} fill="#ffffff" opacity={w.sun ? 0.14 : 0.06} />
          <rect x={t.x + t.w - 3} y={t.y} width="3" height={230 - t.y} fill="#000" opacity="0.18" />
          <g stroke="rgba(28,44,58,0.38)" strokeWidth="0.5">
            {Array.from({ length: Math.floor((230 - t.y) / 5) }, (_, k) => (
              <line key={k} x1={t.x} x2={t.x + t.w} y1={t.y + 4 + k * 5} y2={t.y + 4 + k * 5} />
            ))}
            {Array.from({ length: Math.floor(t.w / 4) }, (_, k) => (
              <line key={`v${k}`} x1={t.x + 2 + k * 4} x2={t.x + 2 + k * 4} y1={t.y} y2="230" strokeWidth="0.3" />
            ))}
          </g>
          {t.crown && (
            <>
              <path d={`M${t.x + 4} ${t.y} L${t.x + t.w / 2} ${t.y - 10} L${t.x + t.w - 4} ${t.y} Z`} fill={w.landmarks} opacity="0.9" />
              <line x1={t.x + t.w / 2} x2={t.x + t.w / 2} y1={t.y - 10} y2={t.y - 22} stroke={w.landmarks} strokeWidth="1" />
            </>
          )}
          {t.logo && <rect x={t.x + t.w / 2 - 8} y={t.y + 4} width="16" height="4" rx="1" fill="#eef2f5" opacity="0.85" />}
          {snowy && <rect x={t.x} y={t.y - 1} width={t.w} height="2.5" fill="#f7f9fa" />}
        </g>
      ))}
      {!w.sun && (
        <g fill="#f4ddaa" opacity="0.8">
          {LIT.map((l, i) => (
            <rect key={i} x={l.x} y={l.y} width="2.6" height="2.4" />
          ))}
        </g>
      )}
      <circle cx="165" cy="78" r="1.6" fill="#ff5a4a" className={styles.blink} />

      {/* haze sitting on the horizon */}
      <rect x="82" y="150" width="306" height="80" fill="url(#haze)" />

      {/* the row of plane trees and street lamps along the road */}
      {TREES.map((t, i) => (
        <g key={i}>
          <rect x={t.x - 0.6} y="222" width="1.2" height="8" fill="#4a3f33" />
          <circle cx={t.x} cy={222 - t.r * 0.4} r={t.r} fill={snowy ? '#8a9a8e' : i % 3 ? '#4e6b48' : '#5b7a52'} />
          <circle cx={t.x - t.r * 0.3} cy={222 - t.r * 0.8} r={t.r * 0.55} fill={snowy ? '#eef2f3' : '#6b8a5e'} opacity="0.7" />
        </g>
      ))}
      {[120, 200, 280, 360].map((x) => (
        <g key={x} stroke="#3d4247" strokeWidth="0.8" fill="none">
          <path d={`M ${x} 232 V 212 Q ${x} 209 ${x + 5} 209`} />
          <rect x={x + 4} y="208.5" width="4" height="1.6" fill={w.sun ? '#9aa3aa' : '#fff3c4'} stroke="none" />
        </g>
      ))}

      {/* the highway: lanes, a barrier, traffic both ways */}
      <rect x="82" y="230" width="306" height="16" fill="#5a6065" />
      <rect x="82" y="238.4" width="306" height="1.2" fill="#c9c7bb" />
      <line x1="82" y1="234.6" x2="388" y2="234.6" stroke="#e9e3c8" strokeWidth="0.5" strokeDasharray="5 5" />
      <line x1="82" y1="242.2" x2="388" y2="242.2" stroke="#e9e3c8" strokeWidth="0.5" strokeDasharray="5 5" />
      {(w.kind === 'rainy' || snowy) && <rect x="82" y="230" width="306" height="16" fill="#aab6c0" opacity="0.18" />}
      {CARS.map((c, i) => (
        <g key={i} transform={`translate(0 ${c.lane})`}>
          <g className={styles.drift} style={c.east ? drift(40, 440, c.dur, c.delay) : drift(440, 40, c.dur, c.delay)}>
            {c.bus ? (
              <>
                <rect x="0" y="-3.2" width="16" height="4.4" rx="1" fill={c.color} />
                <rect x="1" y="-2.6" width="14" height="1.4" fill="#2a3440" opacity="0.8" />
              </>
            ) : (
              <>
                <rect x="0" y="-2.2" width="7.5" height="3.2" rx="1.1" fill={c.color} />
                <rect x={c.east ? 4.6 : 1} y="-2" width="1.9" height="1.3" fill="#1f2a33" opacity="0.8" />
              </>
            )}
            {!w.sun && <circle cx={c.east ? (c.bus ? 16.4 : 7.9) : -0.4} cy="0" r="0.8" fill={c.east ? '#fff6d0' : '#ff5a4a'} />}
          </g>
        </g>
      ))}

      {/* rooftops right below the window */}
      <path d="M82 258 V248 H150 V245 H214 V250 H292 V243 H388 V258 Z" fill="#8a8781" />
      <g fill="#6f6d68">
        <rect x="100" y="242" width="18" height="7" />
        <rect x="124" y="244" width="10" height="5" />
        <rect x="236" y="244" width="22" height="7" />
        <rect x="330" y="237" width="14" height="7" />
      </g>
      <circle cx="366" cy="252" r="5.5" fill="none" stroke="#e9e3c8" strokeWidth="0.7" />
      {snowy && <path d="M82 248 H150 V245.5 H214 V250.5 H292 V243.5 H388 V245 H294 V252 H212 V247 H152 V250 H82 Z" fill="#f7f9fa" />}

      {/* Seagulls — each crosses the full window width, staggered so one is usually in view */}
      {w.gulls && (
        <>
          <g transform="translate(0 166)">
            <g className={styles.gullPath} style={drift(40, 430, w.whitecaps ? 18 : 26, 4)}>
              <Gull />
            </g>
          </g>
          <g transform="translate(0 176) scale(0.8)">
            <g className={`${styles.gullPath} ${styles.gullPathAlt}`} style={drift(50, 540, w.whitecaps ? 22 : 34, 19)}>
              <Gull delay={0.3} />
            </g>
          </g>
          {!snowy && (
            <g transform="translate(0 158) scale(0.62)">
              <g className={styles.gullPath} style={drift(660, 90, 40, 27)}>
                <Gull delay={0.55} />
              </g>
            </g>
          )}
        </>
      )}

      {/* Rain: two parallax sheets of streaks falling past the window */}
      {rainy && (
        <g opacity="0.55">
          <g className={styles.rainFar}>
            <rect x="40" y="-40" width="400" height="360" fill="url(#rainFar)" />
          </g>
          <g className={styles.rainNear}>
            <rect x="40" y="-60" width="400" height="380" fill="url(#rainNear)" />
          </g>
        </g>
      )}

      {/* Snowfall */}
      {snowy &&
        SNOWFLAKES.map((f, i) => (
          <g key={i} className={styles.snowSway} style={{ animationDuration: `${2.5 + (i % 5) * 0.6}s`, ['--sway' as string]: `${f.sway}px` }}>
            <circle
              cx={f.x}
              cy="40"
              r={f.r}
              fill="#ffffff"
              opacity={0.65 + f.r * 0.15}
              className={styles.snowFall}
              style={{ animationDuration: `${f.dur * (1.6 - f.r * 0.3)}s`, animationDelay: `${-f.delay}s` }}
            />
          </g>
        ))}

      {/* On the glass itself: beads and drops running down (rain), frost creeping in (snow) */}
      {rainy && (
        <g>
          {RAIN_BEADS.map((b, i) => (
            <g key={i}>
              <circle cx={b.x} cy={b.y} r={b.r} fill="#dfe8ee" opacity="0.55" />
              <circle cx={b.x - b.r * 0.3} cy={b.y - b.r * 0.3} r={b.r * 0.35} fill="#ffffff" opacity="0.8" />
            </g>
          ))}
          {RAIN_SLIDERS.map((d, i) => (
            <g key={i} className={styles.dropSlide} style={{ animationDuration: `${d.dur}s`, animationDelay: `${-d.delay}s` }}>
              <path d={`M${d.x} ${d.y - 16} L${d.x} ${d.y}`} stroke="#e8eff3" strokeWidth={d.r * 0.7} opacity="0.35" strokeLinecap="round" />
              <ellipse cx={d.x} cy={d.y} rx={d.r} ry={d.r * 1.25} fill="#e3ebf0" opacity="0.75" />
              <circle cx={d.x - d.r * 0.35} cy={d.y - d.r * 0.4} r={d.r * 0.35} fill="#ffffff" />
            </g>
          ))}
        </g>
      )}
      {snowy && <rect x="82" y="52" width="306" height="206" fill="url(#frost)" />}
    </g>
  );
}

/** Pattern/gradient defs the weather layers reference — render once inside the scene's <defs>. */
export function WeatherDefs() {
  return (
    <>
      <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#dfe6ea" stopOpacity="0" />
        <stop offset="1" stopColor="#dfe6ea" stopOpacity="0.45" />
      </linearGradient>
      <linearGradient id="glass0" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#8fa9bd" />
        <stop offset="0.55" stopColor="#5f7a90" />
        <stop offset="1" stopColor="#4b6276" />
      </linearGradient>
      <linearGradient id="glass1" x1="1" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#a3b8c6" />
        <stop offset="0.6" stopColor="#6d8597" />
        <stop offset="1" stopColor="#56697a" />
      </linearGradient>
      <pattern id="rainFar" width="18" height="30" patternUnits="userSpaceOnUse" patternTransform="rotate(12)">
        <line x1="4" y1="0" x2="4" y2="9" stroke="#e9f0f4" strokeWidth="0.7" />
        <line x1="13" y1="15" x2="13" y2="22" stroke="#e9f0f4" strokeWidth="0.6" />
      </pattern>
      <pattern id="rainNear" width="26" height="44" patternUnits="userSpaceOnUse" patternTransform="rotate(14)">
        <line x1="6" y1="0" x2="6" y2="16" stroke="#f2f6f8" strokeWidth="1.1" />
        <line x1="19" y1="22" x2="19" y2="34" stroke="#f2f6f8" strokeWidth="0.9" />
      </pattern>
      <radialGradient id="frost" cx="50%" cy="50%" r="75%">
        <stop offset="0.55" stopColor="#ffffff" stopOpacity="0" />
        <stop offset="0.85" stopColor="#ffffff" stopOpacity="0.35" />
        <stop offset="1" stopColor="#ffffff" stopOpacity="0.75" />
      </radialGradient>
    </>
  );
}
