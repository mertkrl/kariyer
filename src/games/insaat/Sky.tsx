import { memo } from 'react';
import { dayPhase, weatherAt } from './data';
import { clamp, GROUND, mix } from './geo';
import { darkAt, skyAt } from './light';
import { INK, inkFar } from './ink';
import s from './Scene.module.css';

/*
 * Atmosfer, gerçek saate (`t`) göre. Arkadan öne: gökyüzü (üç duraklı geçiş ve güneş tarafında
 * ufuk ışıması), yıldızlar ve ay, güneş ve ışınları, mürekkeple çizilmiş bulutlar (altı gölgeli),
 * uzak dağlar, üç sıra orman (uzak sıranın mürekkebi havaya karışır), ufuk pusu, çimen kenarı ve
 * toprak arsa (lastik izi, çakıl, kütükler). Yağmur ve kar ayrı katmandır (Weather). Orman ve
 * zemin süsleri ağırdır, yalnızca kar örtüsü değişince yeniden çizilir (memo).
 */

/** Bulutlar: [x, y, ölçek, sürüklenme süresi]. */
const CLOUDS: [number, number, number, number][] = [
  [160, 86, 1, 70],
  [520, 54, 1.4, 95],
  [860, 112, 0.9, 80],
  [1080, 70, 1.15, 110],
  [330, 150, 0.7, 60],
];

/** Bir bulut: üst üste binen yuvarlaklar, çevresi mürekkep; altı gölgeli, tepesi parlak. */
function Cloud({ i, x, y, k, dur, light, shade }: { i: number; x: number; y: number; k: number; dur: number; light: string; shade: string }) {
  const blobs: [number, number, number][] = [
    [-46, 6, 22],
    [-20, -8, 30],
    [14, -14, 34],
    [46, -2, 26],
    [70, 8, 18],
    [0, 10, 26],
  ];
  const clip = `ins-cloud-${i}`;
  return (
    <g className={s.cloudDrift} style={{ animationDuration: `${dur}s` }}>
      <g transform={`translate(${x} ${y}) scale(${k})`}>
        <clipPath id={clip}>
          {blobs.map(([bx, by, r], j) => (
            <circle key={j} cx={bx} cy={by} r={r} />
          ))}
        </clipPath>
        {/* önce kalın çizgili yuvarlaklar, üstüne çizgisizleri: geriye yalnızca dış çevre kalır */}
        <g fill={light} stroke={inkFar(light, 0.45)} strokeWidth={2.2 / k}>
          {blobs.map(([bx, by, r], j) => (
            <circle key={j} cx={bx} cy={by} r={r} />
          ))}
        </g>
        <g fill={light}>
          {blobs.map(([bx, by, r], j) => (
            <circle key={j} cx={bx} cy={by} r={r} />
          ))}
        </g>
        <g clipPath={`url(#${clip})`}>
          <path d="M -80 12 Q -20 2 20 8 T 100 6 V 50 H -80 Z" fill={shade} opacity="0.42" />
          <path d="M -40 -26 q 24 -14 50 -12" fill="none" stroke="#fff" strokeWidth={2.4 / k} strokeLinecap="round" opacity="0.7" />
        </g>
      </g>
    </g>
  );
}

/** Kademeli çam: üç kat, ışık tarafı açık, gölge tarafı koyu. */
function Pine({ x, base, h, color, ink }: { x: number; base: number; h: number; color: string; ink: string }) {
  const lit = mix(color, '#e9f0c8', 0.18);
  const dark = mix(color, '#2a2c48', 0.3);
  const tiers = [0, 0.28, 0.52];
  return (
    <g>
      <rect x={x - h * 0.025} y={base - h * 0.16} width={h * 0.05} height={h * 0.16} fill={mix(color, '#3a2a1c', 0.6)} stroke={ink} strokeWidth="0.8" />
      {tiers.map((f, i) => {
        const tip = base - h + f * h * 0.55;
        const wid = h * (0.16 + i * 0.07);
        const bot = base - h * 0.14 - (2 - i) * h * 0.2;
        return (
          <g key={i}>
            <path d={`M ${x} ${tip} L ${x + wid} ${bot} Q ${x} ${bot + h * 0.05} ${x - wid} ${bot} Z`} fill={color} stroke={ink} strokeWidth="1" strokeLinejoin="round" />
            <path d={`M ${x} ${tip} L ${x - wid} ${bot} Q ${x - wid * 0.5} ${bot + h * 0.03} ${x - wid * 0.15} ${bot + h * 0.02} Z`} fill={lit} />
            <path d={`M ${x} ${tip} L ${x + wid} ${bot} Q ${x + wid * 0.6} ${bot + h * 0.04} ${x + wid * 0.25} ${bot + h * 0.03} Z`} fill={dark} />
            <path d={`M ${x} ${tip} L ${x + wid} ${bot} Q ${x} ${bot + h * 0.05} ${x - wid} ${bot} Z`} fill="none" stroke={ink} strokeWidth="1" strokeLinejoin="round" />
          </g>
        );
      })}
    </g>
  );
}

/** Yapraklı ağaç: birkaç yuvarlak taç; sol üst aydınlık, sağ alt gölgeli. */
function Broadleaf({ x, base, h, color, ink }: { x: number; base: number; h: number; color: string; ink: string }) {
  const lit = mix(color, '#f0f5c8', 0.2);
  const dark = mix(color, '#2a2c48', 0.32);
  const crown: [number, number, number][] = [
    [h * 0.12, -h * 0.52, h * 0.22],
    [-h * 0.14, -h * 0.55, h * 0.2],
    [0, -h * 0.72, h * 0.24],
  ];
  return (
    <g>
      <path d={`M ${x - h * 0.03} ${base} L ${x - h * 0.02} ${base - h * 0.4} L ${x + h * 0.02} ${base - h * 0.4} L ${x + h * 0.035} ${base} Z`} fill={mix(color, '#3a2a1c', 0.65)} stroke={ink} strokeWidth="0.8" />
      <g fill={color} stroke={ink} strokeWidth="2">
        {crown.map(([dx, dy, r], i) => (
          <circle key={i} cx={x + dx} cy={base + dy} r={r} />
        ))}
      </g>
      <circle cx={x + h * 0.12} cy={base - h * 0.52} r={h * 0.22} fill={dark} />
      <circle cx={x - h * 0.14} cy={base - h * 0.55} r={h * 0.2} fill={color} />
      <circle cx={x} cy={base - h * 0.72} r={h * 0.24} fill={color} />
      <circle cx={x - h * 0.08} cy={base - h * 0.8} r={h * 0.12} fill={lit} />
      <circle cx={x + h * 0.15} cy={base - h * 0.62} r={h * 0.12} fill={dark} opacity="0.7" />
    </g>
  );
}

/** Orman sıraları: [taban, boy, aralık, renk, tohum]. Uzaktan yakına. */
const ROWS: [number, number, number, string, number][] = [
  [466, 38, 20, '#90a99c', 3],
  [486, 56, 24, '#5f8464', 7],
  [508, 82, 30, '#3f6447', 11],
];

/** Ormanın tamamı: ağır çizim, yalnızca kar örtüsü değişince yenilenir. */
const Forest = memo(function Forest({ snow }: { snow: number }) {
  return (
    <g>
      {/* uzak dağlar: soluk ve mavimsi, hava perspektifi */}
      <path d="M0 470 L 90 420 L 170 446 L 280 392 L 390 440 L 470 414 L 560 448 L 700 398 L 820 436 L 930 404 L 1040 442 L 1130 410 L 1200 430 V 480 H 0 Z" fill="#a9b8c0" opacity="0.75" stroke={inkFar('#c8d2cf', 0.72)} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M0 476 L 120 446 L 240 466 L 360 432 L 500 462 L 640 440 L 780 466 L 900 444 L 1040 464 L 1200 446 V 486 H 0 Z" fill="#94a89f" opacity="0.8" stroke={inkFar('#c8d2cf', 0.6)} strokeWidth="1.2" strokeLinejoin="round" />
      {snow > 0 && <path d="M 280 392 L 300 402 L 270 400 Z M 700 398 L 722 409 L 690 406 Z M 930 404 L 950 413 L 920 411 Z" fill="#f4f6f8" opacity={snow} />}
      {ROWS.map(([base, h, gap, color, seed], r) => {
        const c = snow > 0 ? mix(color, '#e3e9ec', snow * 0.4) : color;
        return (
          <g key={base}>
            <rect y={base - h * 0.25} width="1200" height={h * 0.3} fill={mix(c, '#0d1a12', r * 0.1)} />
            {Array.from({ length: Math.ceil(1240 / gap) }, (_, i) => {
              const n = (i * 37 + seed * 13) % 17;
              const x = i * gap - 10 + (n % 5) * 3;
              const hh = h * (0.8 + (n % 7) * 0.05);
              const ink = inkFar('#c8d2cf', [0.7, 0.42, 0.12][r]);
              return n % 3 === 0 ? <Broadleaf key={i} x={x} base={base} h={hh} color={c} ink={ink} /> : <Pine key={i} x={x} base={base} h={hh} color={c} ink={ink} />;
            })}
          </g>
        );
      })}
    </g>
  );
});

/** Arsa süsleri: çimen kenarı ve tutamlar, lastik izleri, çakıl, kütükler. */
const Lot = memo(function Lot({ wet }: { wet: boolean }) {
  return (
    <g>
      {/* çimen kenarı: arsanın iki yanında, ormanın dibinde */}
      <path d={`M 0 ${GROUND - 4} H 290 Q 300 ${GROUND + 10} 280 ${GROUND + 24} H 0 Z`} fill={wet ? '#5a6e42' : '#7a8c4e'} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d={`M 1200 ${GROUND - 4} H 935 Q 924 ${GROUND + 12} 944 ${GROUND + 26} H 1200 Z`} fill={wet ? '#5a6e42' : '#7a8c4e'} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <g stroke={wet ? '#46582f' : '#5d7036'} strokeWidth="1.2">
        {Array.from({ length: 70 }, (_, i) => {
          const x = i < 35 ? (i * 8.3) % 285 : 940 + ((i - 35) * 7.7) % 260;
          const y = GROUND + 2 + ((i * 13) % 18);
          return <path key={i} d={`M ${x} ${y} l -2 -6 M ${x} ${y} l 1 -7 M ${x} ${y} l 3 -5`} />;
        })}
      </g>
      {/* lastik izleri: soldan arsaya giren iki iz */}
      <g fill="none" stroke="rgba(60,40,22,.28)" strokeWidth="5" strokeDasharray="6 4">
        <path d={`M 0 ${GROUND + 78} C 200 ${GROUND + 70} 280 ${GROUND + 40} 400 ${GROUND + 26}`} />
        <path d={`M 0 ${GROUND + 98} C 220 ${GROUND + 88} 300 ${GROUND + 56} 420 ${GROUND + 40}`} />
      </g>
      {/* çakıl */}
      <g fill="rgba(80,60,40,.35)">
        {Array.from({ length: 120 }, (_, i) => (
          <ellipse key={i} cx={(i * 97) % 1200} cy={GROUND + 8 + ((i * 41) % 110)} rx={1 + (i % 3) * 0.7} ry={0.8 + (i % 2) * 0.5} />
        ))}
      </g>
      <g fill="rgba(255,245,225,.22)">
        {Array.from({ length: 60 }, (_, i) => (
          <circle key={i} cx={(i * 131 + 40) % 1200} cy={GROUND + 10 + ((i * 59) % 105)} r="0.9" />
        ))}
      </g>
      {/* kesilmiş ağaç kütükleri: kabuk, kesik yüzü, yıllık halkalar */}
      {[34, 84, 1142, 1184].map((x, i) => {
        const r = 11 + (i % 2) * 3;
        return (
          <g key={x}>
            <ellipse cx={x + 6} cy={GROUND + 13} rx={r + 6} ry="3.5" fill="rgba(0,0,0,.22)" filter="url(#ins-soft)" />
            <path d={`M ${x - r} ${GROUND + 4} V ${GROUND + 12} Q ${x} ${GROUND + 16} ${x + r} ${GROUND + 12} V ${GROUND + 4} Z`} fill="#5a3d26" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
            <path d={`M ${x - r} ${GROUND + 6} V ${GROUND + 12} Q ${x - r * 0.5} ${GROUND + 14} ${x - r * 0.3} ${GROUND + 14} V ${GROUND + 6} Z`} fill="#74513a" />
            <ellipse cx={x} cy={GROUND + 4} rx={r} ry="4" fill="#d6bd8a" stroke={INK} strokeWidth="1.4" />
            <ellipse cx={x} cy={GROUND + 4} rx={r * 0.62} ry="2.4" fill="none" stroke="#b89668" strokeWidth="0.8" />
            <ellipse cx={x} cy={GROUND + 4} rx={r * 0.3} ry="1.2" fill="none" stroke="#b89668" strokeWidth="0.8" />
          </g>
        );
      })}
    </g>
  );
});

export function Sky({ t, snowCover }: { t: number; snowCover: number }) {
  const p = dayPhase(t);
  const sky = skyAt(p);
  const dark = darkAt(t);
  const weather = weatherAt(t);
  const dayP = clamp(p / 0.72);
  const sunX = 140 + dayP * 920;
  const sunY = 210 - Math.sin(dayP * Math.PI) * 160;
  const nightP = clamp((p - 0.7) / 0.28);
  const grey = weather !== 'clear';
  const wet = weather === 'rain';
  const low = clamp(1 - Math.sin(dayP * Math.PI) * 1.6); // güneş alçakken 1: sabah ve akşam
  const sun = mix('#fff2c4', '#ff8a45', low);
  const top = grey ? mix(sky.top, '#6f767e', 0.7) : sky.top;
  const bottom = grey ? mix(sky.bottom, '#a4aab0', 0.7) : sky.bottom;
  const midSky = mix(top, bottom, 0.55);
  const cloudLight = grey ? '#b5bac0' : mix('#ffffff', '#ffd2b0', low * 0.7);
  const cloudShade = grey ? '#5d636b' : mix('#9aa8b8', '#b0788a', low * 0.6);
  const snow = Math.round(snowCover * 20) / 20;

  return (
    <g>
      <defs>
        <linearGradient id="ins-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="0.55" stopColor={midSky} />
          <stop offset="0.8" stopColor={bottom} />
          <stop offset="1" stopColor={mix(bottom, '#ffffff', grey ? 0.05 : 0.2)} />
        </linearGradient>
        <radialGradient id="ins-glow" cx={sunX / 1200} cy={sunY / 640} r="0.6">
          <stop offset="0" stopColor={sun} stopOpacity={grey ? 0 : 0.55 + low * 0.25} />
          <stop offset="0.35" stopColor={sun} stopOpacity={grey ? 0 : 0.18 + low * 0.15} />
          <stop offset="1" stopColor={sun} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ins-sun">
          <stop offset="0" stopColor="#fffdf2" />
          <stop offset="0.6" stopColor={sun} />
          <stop offset="1" stopColor={sun} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ins-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={wet ? '#6f5a40' : '#a2825a'} />
          <stop offset="0.5" stopColor={wet ? '#5e4a34' : '#94744d'} />
          <stop offset="1" stopColor={wet ? '#4a3a29' : '#7a5e3e'} />
        </linearGradient>
        <linearGradient id="ins-haze-band" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={bottom} stopOpacity="0" />
          <stop offset="0.75" stopColor={bottom} stopOpacity={grey ? 0.65 : 0.42} />
          <stop offset="1" stopColor={bottom} stopOpacity="0.12" />
        </linearGradient>
        <filter id="ins-cloudsoft" x="-20%" y="-30%" width="140%" height="160%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <filter id="ins-haze">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
      </defs>
      <rect width="1200" height="640" fill="url(#ins-sky)" />
      {!grey && p < 0.74 && <rect width="1200" height="640" fill="url(#ins-glow)" />}

      <g opacity={clamp(dark / 0.4)} fill="#fff">
        {Array.from({ length: 40 }, (_, i) => (
          <circle key={i} cx={(i * 197) % 1200} cy={20 + ((i * 89) % 260)} r={0.6 + (i % 3) * 0.45} className={i % 4 === 0 ? s.star : undefined} opacity={0.5 + (i % 5) * 0.1} />
        ))}
      </g>

      {/* güneş: parlak çekirdek, geniş hale, alçakken ince ışınlar */}
      {p < 0.74 && !grey && (
        <g>
          {low > 0.2 && (
            <g opacity={low * 0.12} fill={sun}>
              {Array.from({ length: 7 }, (_, i) => {
                const a = (-0.5 + i / 6) * 1.1 + Math.PI / 2;
                return <path key={i} d={`M ${sunX} ${sunY} L ${sunX + Math.cos(a - 0.05) * 900} ${sunY + Math.sin(a - 0.05) * 900} L ${sunX + Math.cos(a + 0.05) * 900} ${sunY + Math.sin(a + 0.05) * 900} Z`} />;
              })}
            </g>
          )}
          <circle cx={sunX} cy={sunY} r="70" fill="url(#ins-sun)" opacity="0.5" />
          <circle cx={sunX} cy={sunY} r="24" fill="#fff5d2" stroke={mix(sun, INK, 0.35)} strokeWidth="1.6" />
        </g>
      )}
      {p >= 0.7 && (
        <g opacity={clamp(dark / 0.3)}>
          <circle cx={200 + nightP * 760} cy={150 - Math.sin(nightP * Math.PI) * 90} r="44" fill="#f4efd8" opacity="0.12" />
          <circle cx={200 + nightP * 760} cy={150 - Math.sin(nightP * Math.PI) * 90} r="18" fill="#f4efd8" stroke="#9c977f" strokeWidth="1.4" />
          <circle cx={194 + nightP * 760} cy={146 - Math.sin(nightP * Math.PI) * 90} r="4" fill="#d9d2b8" />
          <circle cx={206 + nightP * 760} cy={156 - Math.sin(nightP * Math.PI) * 90} r="3" fill="#d9d2b8" />
        </g>
      )}

      {/* bulutlar; kötü havada üstüne kalın bir bulut tabakası iner */}
      {CLOUDS.map(([x, y, k, dur], i) => (
        <Cloud key={x} i={i} x={x} y={y} k={k} dur={dur} light={cloudLight} shade={cloudShade} />
      ))}
      {grey && (
        <g>
          <rect width="1200" height="200" fill="url(#ins-overcast)" />
          <defs>
            <linearGradient id="ins-overcast" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5a6068" stopOpacity="0.85" />
              <stop offset="1" stopColor="#5a6068" stopOpacity="0" />
            </linearGradient>
          </defs>
        </g>
      )}

      <Forest snow={snow} />

      {/* ufuk pusu: ormanın dibi havanın rengine karışır */}
      <rect y="380" width="1200" height="140" fill="url(#ins-haze-band)" />

      {/* arsa */}
      <rect y={GROUND} width="1200" height="120" fill="url(#ins-ground)" />
      <path d={`M 0 ${GROUND} H 1200`} stroke={INK} strokeWidth="1.6" opacity="0.55" />
      <Lot wet={wet} />
      {snowCover > 0 && <rect y={GROUND - 4} width="1200" height="124" fill="#eef2f5" opacity={snowCover * 0.85} />}
      {wet && (
        <g>
          {[
            [260, 30, 46, 5],
            [840, 22, 60, 6],
            [1040, 44, 38, 4],
            [600, 96, 70, 6],
          ].map(([x, y, rx, ry]) => (
            <g key={x}>
              <ellipse cx={x} cy={GROUND + y} rx={rx} ry={ry} fill={mix(top, '#7c8894', 0.4)} opacity="0.75" />
              <ellipse cx={x - rx * 0.3} cy={GROUND + y - 1} rx={rx * 0.4} ry={ry * 0.35} fill="#ffffff" opacity="0.25" />
            </g>
          ))}
        </g>
      )}
    </g>
  );
}

/**
 * Yağmur ve kar. Yağmur: uzak (ince, bulanık) ve yakın (uzun, belirgin) iki katman, yerde
 * sıçrayan damlalar ve havayı griye çeken bir pus. Kar: farklı boyda taneler, iki hızda, hafifçe
 * savrularak iner.
 */
export function Weather({ t }: { t: number }) {
  const w = weatherAt(t);
  if (w === 'clear') return null;
  if (w === 'rain')
    return (
      <g pointerEvents="none">
        <rect width="1200" height="640" fill="#8e98a2" opacity="0.2" />
        <g className={s.rainFar} stroke="rgba(210,222,235,.3)" strokeWidth="0.9" filter="url(#ins-haze)">
          {Array.from({ length: 200 }, (_, i) => {
            const x = (i * 61) % 1240;
            const y = ((i * 113) % 1280) - 640;
            return <line key={i} x1={x} y1={y} x2={x - 4} y2={y + 14} />;
          })}
        </g>
        <g className={s.rainNear} stroke="rgba(230,238,246,.5)" strokeWidth="1.2">
          {Array.from({ length: 110 }, (_, i) => {
            const x = (i * 89 + 17) % 1240;
            const y = ((i * 157) % 1280) - 640;
            return <line key={i} x1={x} y1={y} x2={x - 8} y2={y + 30} />;
          })}
        </g>
        <g fill="none" stroke="rgba(225,235,245,.6)" strokeWidth="1">
          {Array.from({ length: 30 }, (_, i) => (
            <ellipse key={i} className={s.splash} style={{ animationDelay: `${(i % 7) * 0.11}s` }} cx={(i * 173) % 1200} cy={GROUND + 6 + (i % 5) * 20} rx="6" ry="1.5" />
          ))}
        </g>
      </g>
    );
  return (
    <g pointerEvents="none">
      <rect width="1200" height="640" fill="#dfe6ec" opacity="0.16" />
      <g className={s.snowFar} fill="#fff" opacity="0.7" filter="url(#ins-haze)">
        {Array.from({ length: 140 }, (_, i) => (
          <circle key={i} cx={(i * 131) % 1240} cy={((i * 71) % 1280) - 640} r={1 + (i % 2)} />
        ))}
      </g>
      <g className={s.snowNear} fill="#fff">
        {Array.from({ length: 70 }, (_, i) => (
          <circle key={i} cx={(i * 197 + 30) % 1240} cy={((i * 89) % 1280) - 640} r={2.2 + (i % 3)} />
        ))}
      </g>
    </g>
  );
}
