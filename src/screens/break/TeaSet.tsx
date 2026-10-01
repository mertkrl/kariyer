import type { CSSProperties } from 'react';
import { GLASS_PATH } from './lunch';
import { Hit, Steam } from './SceneBits';
import type { Tea } from './useTea';
import styles from './BreakRoom.module.css';

interface Props {
  id: (name: string) => string;
  tea: Tea;
  bumped: string | null;
}

/** The çaydanlık, the sugar bowl, the tea glass and its spoon. */
export function TeaSet({ id, tea, bumped }: Props) {
  const { pourTea, bindPour, bindPool, addSugar, sipTea, pouring, teaFrac, teaTint, teaHeight, teaSurfaceScale, teaEmpty, undissolved, drops, stirring, teaHot, stir } = tea;
  return (
    <>
      {/* Çaydanlık (double teapot) — click to pour. The demlik lifts off for the brew,
          then the whole kettle tilts for the water; poses are driven by teaPour.ts. */}
      <Hit label="Çaydanlık — çay koy" onActivate={pourTea} bumped={false}>
        <g transform="translate(1100 480)">
          <g ref={bindPour('kettle')}>
            {/* Bottom kettle */}
            <path d="M-54,0 C-60,-30 -50,-64 -36,-68 L36,-68 C50,-64 60,-30 54,0 Z" fill={`url(#${id('kettle')})`} stroke="#7d858b" />
            <rect x="-40" y="-74" width="80" height="8" rx="3" fill="#b5bcc1" stroke="#7d858b" />
            <path d="M54,-50 C80,-50 80,-14 52,-12" stroke="#5a4a3a" strokeWidth="6" fill="none" strokeLinecap="round" />
            <path d="M-54,-30 L-74,-50" stroke="#a8afb4" strokeWidth="8" strokeLinecap="round" />
            <path d="M-54,-30 L-74,-50" stroke="#e6e9eb" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
            {/* Porcelain demlik */}
            <g ref={bindPour('demlik')}>
              <path d="M-30,-74 C-38,-96 -26,-124 0,-124 C26,-124 38,-96 30,-74 Z" fill={`url(#${id('porcelain')})`} stroke="#cfc8b8" />
              <path d="M-30,-104 C-44,-106 -52,-116 -62,-126" stroke="#f3f1ea" strokeWidth="7" strokeLinecap="round" fill="none" />
              <path d="M-30,-104 C-44,-106 -52,-116 -62,-126" stroke="#cfc8b8" strokeWidth="1" fill="none" />
              <path d="M28,-112 C46,-112 46,-86 30,-84" stroke="#e8e4da" strokeWidth="5" fill="none" />
              <ellipse cx="0" cy="-124" rx="20" ry="5" fill="#f3f1ea" stroke="#cfc8b8" />
              <circle cx="0" cy="-131" r="5" fill="#b8402c" />
              {/* Tulip motif */}
              <g transform="translate(0 -98)">
                <path d="M0,6 C-8,0 -7,-10 -3,-12 L0,-7 L3,-12 C7,-10 8,0 0,6 Z" fill="#b8402c" />
                <path d="M0,6 V14 M0,11 Q-6,8 -8,12 M0,11 Q6,8 8,12" stroke="#3f8a7a" strokeWidth="1.5" fill="none" />
              </g>
            </g>
          </g>
        </g>
      </Hit>

      {/* Sugar bowl */}
      <Hit label="Şekerlik — kesme şeker at" onActivate={addSugar} bumped={bumped === 'sugar'}>
        <g transform="translate(1112 604)">
          <path d="M-32,-30 C-32,-6 -18,0 -14,0 L14,0 C18,0 32,-6 32,-30 Z" fill={`url(#${id('porcelain')})`} stroke="#cfc8b8" />
          <path d="M-31,-20 C-24,-14 24,-14 31,-20" stroke="#3e6a9a" strokeWidth="2" fill="none" />
          <ellipse cx="0" cy="-30" rx="32" ry="8" fill="#f7f5ef" stroke="#cfc8b8" />
          {[
            [-14, -36],
            [0, -38],
            [13, -35],
            [-6, -31],
            [8, -30],
          ].map(([x, y], i) => (
            <rect
              key={i}
              x={x - 5}
              y={y - 5}
              width="10"
              height="10"
              rx="1.5"
              fill="#ffffff"
              stroke="#dcd8cc"
              transform={`rotate(${i * 17 - 20} ${x} ${y})`}
            />
          ))}
        </g>
      </Hit>

      {/* Tea glass on its saucer */}
      <ellipse cx="990" cy="590" rx="62" ry="14" fill="#fbfaf6" stroke="#c9a227" strokeWidth="2" />
      <ellipse cx="990" cy="588" rx="30" ry="6" fill="#ebe7dc" />
      <Hit label="Çay bardağı — bir yudum al" onActivate={sipTea} bumped={bumped === 'tea'}>
        <g transform="translate(990 586)" className={pouring ? styles.pouring : undefined}>
          <g clipPath={`url(#${id('glassClip')})`}>
            <rect x="-30" y="-120" width="60" height="120" fill="#ffffff" opacity="0.25" />
            <rect
              x="-30"
              y="-120"
              width="60"
              height="120"
              fill={`url(#${id('tea')})`}
              className={styles.teaFill}
              style={{ transform: `scaleY(${teaFrac})`, opacity: teaTint.opacity }}
              ref={bindPour('fill')}
            />
            {/* Depth: the column darkens toward the bottom */}
            <rect x="-30" y={-teaHeight} width="60" height={teaHeight} fill="url(#teaDepth)" pointerEvents="none" />
            <ellipse
              cx="0"
              cy="0"
              rx="28"
              ry="4"
              fill={teaTint.surface}
              className={styles.teaSurface}
              style={{
                transform: `translateY(${-teaHeight}px) scaleX(${teaSurfaceScale})`,
                opacity: teaEmpty ? 0 : 1,
              }}
              ref={bindPour('surface')}
            />
            {/* Pour FX pools (splash droplets, impact rings, foam) — animated by teaPour.ts */}
            <g pointerEvents="none">
              {Array.from({ length: 6 }).map((_, i) => (
                <ellipse
                  key={`ring${i}`}
                  rx="0"
                  ry="0"
                  fill="none"
                  stroke="#f6d9c2"
                  strokeWidth="0.8"
                  ref={bindPool('rings', i)}
                />
              ))}
              {Array.from({ length: 14 }).map((_, i) => (
                <circle
                  key={`foam${i}`}
                  r="0"
                  fill="#f3dcc6"
                  ref={bindPool('foam', i)}
                />
              ))}
              {Array.from({ length: 18 }).map((_, i) => (
                <circle
                  key={`drop${i}`}
                  r="0"
                  fill={teaTint.surface}
                  ref={bindPool('droplets', i)}
                />
              ))}
            </g>
            {Array.from({ length: Math.min(undissolved, 4) }).map((_, i) => (
              <rect key={i} x={-12 + i * 7} y={-10 - (i % 2) * 5} width="8" height="8" rx="1" fill="#f7f1e6" opacity="0.85" />
            ))}
            {drops.map((d) => (
              <g key={d}>
                <ellipse cx="0" cy={-teaHeight} rx="10" ry="2.5" fill="none" stroke="#f3c9a8" strokeWidth="1.4" className={styles.splash} />
                <rect
                  x="-5"
                  y={-teaHeight - 3}
                  width="10"
                  height="10"
                  rx="1.5"
                  fill="#f7f1e6"
                  className={styles.sugarSink}
                  style={{ '--sink-y': `${Math.max(0, teaHeight - 16)}px` } as CSSProperties}
                />
              </g>
            ))}
          </g>
          {drops.map((d) => (
            <rect
              key={d}
              x="-5.5"
              y="-135.5"
              width="11"
              height="11"
              rx="1.5"
              fill="#ffffff"
              stroke="#dcd8cc"
              className={styles.sugarDrop}
              style={{ '--drop-y': `${132 - teaHeight}px` } as CSSProperties}
            />
          ))}
          {/* The falling stream: in front of the liquid, behind the glass wall */}
          <g pointerEvents="none">
            <path ref={bindPour('stream')} d="" strokeLinejoin="round" />
            <path
              ref={bindPour('streamHighlight')}
              d=""
              fill="none"
              strokeWidth="0.7"
              strokeLinecap="round"
            />
            <circle ref={bindPour('streamHead')} r="0" />
          </g>
          <path d={GLASS_PATH} fill={`url(#${id('glass')})`} stroke="#b7c2c8" strokeWidth="1.5" />
          <path d="M-22,-112 C-22,-96 -14,-86 -14,-72" stroke="#ffffff" strokeWidth="3" strokeOpacity="0.7" fill="none" strokeLinecap="round" />
          <ellipse cx="0" cy="-120" rx="28" ry="4" fill="none" stroke="#c9d3d8" strokeWidth="1.5" />
          {stirring && (
            <g className={styles.stir}>
              <path d="M4,-40 L14,-150" stroke="#b5bcc1" strokeWidth="3.5" strokeLinecap="round" />
              <ellipse cx="3" cy="-34" rx="5" ry="9" fill="#c5cbcf" />
            </g>
          )}
        </g>
      </Hit>
      {!teaEmpty && teaHot && !pouring && <Steam x={990} y={452} />}

      {/* Teaspoon on the saucer */}
      {!stirring && (
        <Hit label="Çay kaşığı — karıştır" onActivate={stir} bumped={false}>
          <g>
            <path d="M1022,594 L1066,578" stroke="#aab1b6" strokeWidth="3.5" strokeLinecap="round" />
            <ellipse cx="1018" cy="596" rx="8" ry="4.5" fill="#c5cbcf" transform="rotate(-20 1018 596)" />
          </g>
        </Hit>
      )}
    </>
  );
}
