import { WindowView } from './WindowView';
import styles from './HomeScene.module.css';

/*
 * Friday, 21:40 — an ordinary Istanbul living room, drawn with light and depth rather than
 * boxes: a plaster wall with crown and skirting, a white PVC window with net curtains and heavy
 * drapes (the street and the condemned block opposite behind it), a pot plant on the sill, a
 * three-seater with a lace doily on its back and a knitted throw, a coffee
 * table with tea, a kilim with fringes, laminate flooring, a bookcase, and a
 * floor lamp throwing a warm pool across all of it. Without electricity: two candles.
 */

const WIN = { x: 110, y: 80, w: 460, h: 300 };

export function HomeScene() {
  return (
    <svg className={styles.scene} viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="hsWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6d5646" />
          <stop offset="0.6" stopColor="#5b4639" />
          <stop offset="1" stopColor="#4a382d" />
        </linearGradient>
        <radialGradient id="hsLampWash" cx="0.62" cy="0.42" r="0.55">
          <stop offset="0" stopColor="rgba(255,196,120,0.42)" />
          <stop offset="0.5" stopColor="rgba(255,170,90,0.14)" />
          <stop offset="1" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <filter id="hsNoise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.06 0" />
        </filter>
        <linearGradient id="hsPlank" x1="0" x2="1">
          <stop offset="0" stopColor="#6b4a31" />
          <stop offset="0.5" stopColor="#7a5638" />
          <stop offset="1" stopColor="#634329" />
        </linearGradient>
        <linearGradient id="hsFloorShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(0,0,0,0.35)" />
          <stop offset="0.4" stopColor="rgba(0,0,0,0.05)" />
          <stop offset="1" stopColor="rgba(0,0,0,0.45)" />
        </linearGradient>
        <linearGradient id="hsDrape" x1="0" x2="1">
          <stop offset="0" stopColor="#4d2a24" />
          <stop offset="0.14" stopColor="#6e3b31" />
          <stop offset="0.28" stopColor="#4a2620" />
          <stop offset="0.44" stopColor="#734036" />
          <stop offset="0.6" stopColor="#4f2a23" />
          <stop offset="0.78" stopColor="#6c3a30" />
          <stop offset="1" stopColor="#43221d" />
        </linearGradient>
        <linearGradient id="hsNet" x1="0" x2="1">
          <stop offset="0" stopColor="rgba(250,246,236,0.16)" />
          <stop offset="0.25" stopColor="rgba(250,246,236,0.3)" />
          <stop offset="0.5" stopColor="rgba(250,246,236,0.14)" />
          <stop offset="0.75" stopColor="rgba(250,246,236,0.28)" />
          <stop offset="1" stopColor="rgba(250,246,236,0.16)" />
        </linearGradient>
        <pattern id="hsNetWeave" width="4" height="4" patternUnits="userSpaceOnUse">
          <path d="M0 0 L4 4 M4 0 L0 4" stroke="rgba(255,255,255,0.08)" strokeWidth={0.6} />
        </pattern>
        <linearGradient id="hsSofaBack" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7d8a78" />
          <stop offset="1" stopColor="#56634f" />
        </linearGradient>
        <linearGradient id="hsSofaSeat" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6f7c69" />
          <stop offset="1" stopColor="#4a5645" />
        </linearGradient>
        <pattern id="hsKnit" width="8" height="10" patternUnits="userSpaceOnUse">
          <rect width="8" height="10" fill="#d2b27a" />
          <path d="M0 0 L4 5 L8 0 M0 5 L4 10 L8 5" stroke="#ae8f58" strokeWidth={1.1} fill="none" />
        </pattern>
        <pattern id="hsKilim" width="36" height="20" patternUnits="userSpaceOnUse">
          <rect width="36" height="20" fill="#8d3a2e" />
          <path d="M0 10 L9 0 L18 10 L9 20 Z" fill="#b55a3c" />
          <path d="M18 10 L27 0 L36 10 L27 20 Z" fill="#2f4a5c" />
          <path d="M5 10 L9 6 L13 10 L9 14 Z M23 10 L27 6 L31 10 L27 14 Z" fill="#e3c27a" />
        </pattern>
        <radialGradient id="hsVignette" cx="0.5" cy="0.45" r="0.78">
          <stop offset="0.55" stopColor="rgba(0,0,0,0)" />
          <stop offset="1" stopColor="rgba(0,0,0,0.62)" />
        </radialGradient>
        <filter id="hsSoft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id="hsSoftSmall" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
        <radialGradient id="hsFur" cx="0.4" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#eea45a" />
          <stop offset="0.6" stopColor="#d4863c" />
          <stop offset="1" stopColor="#a8601f" />
        </radialGradient>
        <linearGradient id="hsAO" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(0,0,0,0.45)" />
          <stop offset="1" stopColor="rgba(0,0,0,0)" />
        </linearGradient>
        <linearGradient id="hsTea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c7401f" />
          <stop offset="1" stopColor="#6e1a0b" />
        </linearGradient>
        <linearGradient id="hsShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6e2bd" />
          <stop offset="1" stopColor="#e8c48c" />
        </linearGradient>
      </defs>

      {/* ── the wall: plaster, crown moulding, skirting ── */}
      <rect width="1000" height="540" fill="url(#hsWall)" />
      <rect width="1000" height="540" filter="url(#hsNoise)" />
      <rect y="0" width="1000" height="16" fill="#7c6553" />
      <rect y="16" width="1000" height="4" fill="rgba(0,0,0,0.25)" />

      {/* ── the floor: laminate planks ── */}
      {Array.from({ length: 8 }, (_, row) =>
        Array.from({ length: 7 }, (_, i) => {
          const y = 540 + row * 21;
          const x = ((row * 83) % 170) - 170 + i * 190;
          return <rect key={`${row}-${i}`} x={x} y={y} width={188} height={20} fill="url(#hsPlank)" opacity={0.86 + ((row * 7 + i * 3) % 5) * 0.03} />;
        }),
      )}
      <rect y="540" width="1000" height="160" fill="url(#hsFloorShade)" />
      <rect y="541" width="1000" height="26" fill="url(#hsAO)" />
      <path d={`M${WIN.x + 40} 560 L${WIN.x + WIN.w - 40} 560 L${WIN.x + WIN.w + 90} 700 L${WIN.x - 60} 700 Z`} fill="rgba(150,170,210,0.07)" />
      <rect y="530" width="1000" height="11" fill="#4e3a2c" />
      <rect y="530" width="1000" height="2" fill="rgba(255,230,190,0.12)" />
      <rect y="540" width="1000" height="3" fill="rgba(0,0,0,0.35)" />

      {/* ── the window: white PVC in a deep reveal ── */}
      <rect x={WIN.x - 22} y={WIN.y - 22} width={WIN.w + 44} height={WIN.h + 44} fill="#3f3128" />
      <rect x={WIN.x - 14} y={WIN.y - 14} width={WIN.w + 28} height={WIN.h + 28} fill="#efece4" />
      <foreignObject x={WIN.x} y={WIN.y} width={WIN.w} height={WIN.h}>
        <WindowView className={styles.view} />
      </foreignObject>
      {/* sashes and glass sheen */}
      <rect x={WIN.x + WIN.w / 2 - 6} y={WIN.y} width={12} height={WIN.h} fill="#efece4" />
      <rect x={WIN.x} y={WIN.y + 46} width={WIN.w} height={10} fill="#efece4" />
      <rect x={WIN.x + WIN.w / 2 - 6} y={WIN.y} width={2} height={WIN.h} fill="rgba(0,0,0,0.15)" />
      <rect x={WIN.x + WIN.w / 2 + 20} y={WIN.y + WIN.h * 0.55} width={6} height={22} rx={2} fill="#c9c4b8" />
      <path d={`M${WIN.x} ${WIN.y} L${WIN.x + 130} ${WIN.y} L${WIN.x + 30} ${WIN.y + WIN.h} L${WIN.x} ${WIN.y + WIN.h} Z`} fill="rgba(255,255,255,0.04)" />
      {/* marble sill and a pot plant */}
      <rect x={WIN.x - 30} y={WIN.y + WIN.h + 12} width={WIN.w + 60} height={12} fill="#d8d2c6" />
      <rect x={WIN.x - 30} y={WIN.y + WIN.h + 24} width={WIN.w + 60} height={4} fill="rgba(0,0,0,0.3)" />
      <g transform={`translate(${WIN.x + 40} ${WIN.y + WIN.h - 60})`}>
        <path d="M-18 72 L18 72 L14 42 L-14 42 Z" fill="#b8633f" />
        <rect x="-20" y="38" width="40" height="7" rx={2} fill="#c9714a" />
        {[
          [-4, 40, -34, 0],
          [0, 40, -8, -20],
          [4, 40, 26, -6],
          [0, 40, 36, 18],
          [-2, 40, -30, 26],
        ].map(([x1, y1, x2, y2], i) => (
          <g key={i}>
            <path d={`M${x1} ${y1} Q${(x1 + x2) / 2} ${y2 + 10} ${x2} ${y2}`} stroke="#3e5a33" strokeWidth={2} fill="none" />
            <ellipse cx={x2} cy={y2} rx={11} ry={6} transform={`rotate(${-30 + i * 25} ${x2} ${y2})`} fill={i % 2 ? '#4f7a3f' : '#5f8c4a'} />
          </g>
        ))}
      </g>

      {/* ── net curtain and drapes ── */}
      <rect x={WIN.x - 60} y={34} width={WIN.w + 120} height={10} rx={5} fill="#2d221b" />
      {Array.from({ length: 22 }, (_, i) => (
        <circle key={i} cx={WIN.x - 50 + i * 26} cy={44} r={3.5} fill="#1c1510" />
      ))}
      <path d={`M${WIN.x + 40} 44 L${WIN.x + 210} 44 C${WIN.x + 200} 200 ${WIN.x + 216} 340 ${WIN.x + 204} 520 L${WIN.x + 50} 520 C${WIN.x + 60} 340 ${WIN.x + 34} 200 ${WIN.x + 40} 44 Z`} fill="url(#hsNet)" />
      <path d={`M${WIN.x + 40} 44 L${WIN.x + 210} 44 C${WIN.x + 200} 200 ${WIN.x + 216} 340 ${WIN.x + 204} 520 L${WIN.x + 50} 520 C${WIN.x + 60} 340 ${WIN.x + 34} 200 ${WIN.x + 40} 44 Z`} fill="url(#hsNetWeave)" />
      <path d={`M${WIN.x - 70} 44 L${WIN.x + 50} 44 C${WIN.x + 64} 220 ${WIN.x + 26} 380 ${WIN.x + 46} 540 L${WIN.x - 80} 540 Z`} fill="url(#hsDrape)" />
      <path d={`M${WIN.x + WIN.w - 50} 44 L${WIN.x + WIN.w + 70} 44 L${WIN.x + WIN.w + 80} 540 L${WIN.x + WIN.w - 46} 540 C${WIN.x + WIN.w - 26} 380 ${WIN.x + WIN.w - 64} 220 ${WIN.x + WIN.w - 50} 44 Z`} fill="url(#hsDrape)" />

      {/* ── wall clock, 21:40 ── */}
      <g transform="translate(700 70)">
        <circle cx="0" cy="0" r="30" fill="rgba(0,0,0,0.3)" filter="url(#hsSoftSmall)" transform="translate(3 4)" />
        <circle cx="0" cy="0" r="30" fill="#2e241c" />
        <circle cx="0" cy="0" r="26" fill="#f1ead9" />
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1={0} y1={-22} x2={0} y2={-19} stroke="#3a2e22" strokeWidth={i % 3 === 0 ? 2 : 1} transform={`rotate(${i * 30})`} />
        ))}
        <line x1={0} y1={0} x2={0} y2={-12} stroke="#2a2018" strokeWidth={3} strokeLinecap="round" transform="rotate(290)" />
        <line x1={0} y1={0} x2={0} y2={-19} stroke="#2a2018" strokeWidth={2} strokeLinecap="round" transform="rotate(240)" />
        <circle r={2} fill="#2a2018" />
        <path d="M-20 -12 A26 26 0 0 1 8 -24" stroke="rgba(255,255,255,0.35)" strokeWidth={2} fill="none" />
      </g>

      {/* ── bookcase ── */}
      <g transform="translate(800 100)">
        <rect x="6" y="6" width="150" height="430" fill="rgba(0,0,0,0.35)" filter="url(#hsSoft)" />
        <rect width="150" height="430" fill="#3b2b20" />
        <rect x="6" y="6" width="138" height="418" fill="#2a1e16" />
        {[0, 1, 2, 3].map((row) => (
          <g key={row} transform={`translate(10 ${14 + row * 104})`}>
            <rect y={84} width={130} height={10} fill="#4a3627" />
            {Array.from({ length: 8 }, (_, i) => {
              const h = 56 + ((i * 37 + row * 11) % 26);
              const colors = ['#7a3f35', '#34505f', '#9a7a44', '#46613f', '#5f4d73', '#a39473', '#553f2c', '#8a5a3a'];
              const lean = row === 2 && i === 7;
              return (
                <g key={i} transform={lean ? `rotate(12 ${i * 15 + 7} 84)` : undefined}>
                  <rect x={i * 15} y={84 - h} width={13} height={h} fill={colors[(i + row) % colors.length]} />
                  <rect x={i * 15 + 2} y={84 - h + 8} width={9} height={2} fill="rgba(255,230,190,0.35)" />
                </g>
              );
            })}
          </g>
        ))}
      </g>

      {/* the lamp's warm wash over wall and floor */}
      <rect width="1000" height="700" fill="url(#hsLampWash)" />

      {/* ── kilim with fringes ── */}
      <path d="M300 612 L920 612 L960 690 L260 690 Z" fill="url(#hsKilim)" />
      <path d="M300 612 L920 612 L960 690 L260 690 Z" fill="none" stroke="#e3c27a" strokeWidth={4} opacity={0.7} />
      {Array.from({ length: 40 }, (_, i) => (
        <line key={i} x1={262 + i * 17.5} y1={690} x2={260 + i * 17.5} y2={700} stroke="#e8dcc0" strokeWidth={2} />
      ))}

      {/* ── the sofa ── */}
      <ellipse cx="700" cy="604" rx="280" ry="16" fill="rgba(0,0,0,0.5)" filter="url(#hsSoft)" />
      <g>
        {[476, 928].map((x) => (
          <rect key={x} x={x} y={586} width={10} height={18} rx={2} fill="#3a2718" />
        ))}
        <path d="M470 440 Q470 404 506 404 L894 404 Q930 404 930 440 L930 590 L470 590 Z" fill="url(#hsSofaBack)" />
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x={496 + i * 138} y={414} width={132} height={96} rx={20} fill="url(#hsSofaBack)" />
            <rect x={496 + i * 138} y={414} width={132} height={96} rx={20} fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth={2} />
            <path d={`M${504 + i * 138} 432 Q${562 + i * 138} 424 ${620 + i * 138} 432`} stroke="rgba(255,255,255,0.12)" strokeWidth={3} fill="none" />
          </g>
        ))}
        {/* lace doily on the back, the Turkish way */}
        <g transform="translate(700 412)">
          <path d="M-46 0 L46 0 L40 26 Q0 40 -40 26 Z" fill="#f4efe2" opacity={0.92} />
          {Array.from({ length: 9 }, (_, i) => (
            <circle key={i} cx={-38 + i * 9.5} cy={28 - Math.abs(i - 4) * 2.5} r={2.6} fill="none" stroke="#d9d1bd" strokeWidth={1.2} />
          ))}
          <path d="M-30 8 Q0 20 30 8" stroke="#d9d1bd" strokeWidth={1.2} fill="none" />
        </g>
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x={492 + i * 140} y={500} width={138} height={52} rx={14} fill="url(#hsSofaSeat)" />
            <rect x={492 + i * 140} y={500} width={138} height={10} rx={5} fill="rgba(255,255,255,0.08)" />
          </g>
        ))}
        <rect x="448" y="452" width="58" height="140" rx={26} fill="#66735f" />
        <rect x="894" y="452" width="58" height="140" rx={26} fill="#5c6955" />
        <rect x="448" y="452" width="58" height="14" rx={7} fill="rgba(255,255,255,0.1)" />
        <rect x="448" y="552" width="504" height="38" fill="#4d5a47" />
        <path d="M512 470 Q560 452 604 468 L600 530 Q556 520 514 534 Z" fill="#b8855a" />
        <path d="M800 468 Q846 452 884 472 L878 532 Q840 520 802 530 Z" fill="#8a4a3e" />
        <path d="M812 480 L872 520 M870 482 L814 520" stroke="rgba(0,0,0,0.12)" strokeWidth={3} />
        <path d="M728 412 C746 440 752 506 742 560 L812 560 C822 506 812 440 796 410 Z" fill="url(#hsKnit)" />
        <path d="M742 560 L812 560" stroke="#ae8f58" strokeWidth={4} strokeDasharray="3 4" />
      </g>

      {/* ── coffee table with tea ── */}
      <g transform="translate(360 520)">
        <ellipse cx="0" cy="84" rx="90" ry="10" fill="rgba(0,0,0,0.45)" filter="url(#hsSoftSmall)" />
        <rect x="-86" y="30" width="172" height="14" rx={4} fill="#6b4a31" />
        <rect x="-86" y="30" width="172" height="4" rx={2} fill="rgba(255,230,190,0.18)" />
        <path d="M-70 31 L-40 31 L-52 43 L-82 43 Z" fill="rgba(255,255,255,0.08)" />
        <rect x="-74" y="44" width="10" height="42" fill="#533823" />
        <rect x="64" y="44" width="10" height="42" fill="#533823" />
        <ellipse cx="-10" cy="28" rx="26" ry="6" fill="#efe9dc" />
        <ellipse cx="-10" cy="27" rx="18" ry="3.5" fill="#d9d1c0" />
        <path d="M-22 -12 C-26 2 -16 10 -20 24 L0 24 C-4 10 6 2 2 -12 Z" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.45)" />
        <path d="M-20 0 C-22 6 -16 12 -19 22 L-1 22 C-4 12 2 6 0 0 Z" fill="url(#hsTea)" opacity={0.95} />
        <line x1="4" y1="24" x2="18" y2="16" stroke="#cfd2d6" strokeWidth={2} strokeLinecap="round" />
        <ellipse cx="46" cy="26" rx="22" ry="7" fill="#c9b18a" />
        {[0, 1, 2, 3, 4].map((i) => (
          <ellipse key={i} cx={36 + i * 5} cy={21 + (i % 2)} rx={4} ry={2.5} fill="#9a6a3a" />
        ))}
        <g className={styles.steam}>
          <path d="M-12 -18 C-18 -30 -6 -36 -12 -50" stroke="rgba(255,255,255,0.3)" strokeWidth={3} fill="none" strokeLinecap="round" />
          <path d="M-4 -20 C-10 -32 2 -38 -4 -52" stroke="rgba(255,255,255,0.2)" strokeWidth={3} fill="none" strokeLinecap="round" />
        </g>
      </g>

      {/* ── floor lamp ── */}
      <g transform="translate(610 150)">
        <ellipse cx="0" cy="470" rx="30" ry="7" fill="rgba(0,0,0,0.5)" filter="url(#hsSoftSmall)" />
        <rect x="-3" y="66" width="6" height="400" fill="#2a241e" />
        <rect x="-1" y="66" width="2" height="400" fill="rgba(255,230,190,0.25)" />
        <ellipse cx="0" cy="466" rx="24" ry="6" fill="#2a241e" />
        <path d="M-52 66 L52 66 L34 0 L-34 0 Z" fill="url(#hsShade)" />
        <path d="M-52 66 L52 66 L34 0 L-34 0 Z" fill="rgba(255,210,140,0.5)" filter="url(#hsSoft)" />
        <path d="M-52 66 L52 66 L110 330 L-110 330 Z" fill="rgba(255,200,130,0.07)" />
      </g>

      {/* the edges of the room fall into shadow */}
      <rect width="1000" height="700" fill="url(#hsVignette)" />
    </svg>
  );
}
