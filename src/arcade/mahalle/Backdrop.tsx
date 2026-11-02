import { hash, type Phase } from './places';
import { Person } from './kit';
import s from './Scene.module.css';

/*
 * Mahallenin oyun olmayan katmanları: gökyüzü, uzaktaki şehir, kaldırımlar ve yol, akan trafik,
 * öndeki lambalar ve tezgâh. Hepsi tıklamayı geçirir; tıklanan yerler Places.tsx'te.
 */

/** Gün ışığının süzgeçleri, cam deseni ve gökyüzü geçişi. */
export function Defs() {
  return (
    <defs>
      <linearGradient id="mh-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" className={s.sky0} />
        <stop offset="0.55" className={s.sky1} />
        <stop offset="1" className={s.sky2} />
      </linearGradient>
      <radialGradient id="mh-sun" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#fff6d8" stopOpacity="0.95" />
        <stop offset="0.35" className={s.sunHalo} stopOpacity="0.45" />
        <stop offset="1" className={s.sunHalo} stopOpacity="0" />
      </radialGradient>
      <radialGradient id="mh-glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#ffd98a" stopOpacity="0.85" />
        <stop offset="1" stopColor="#ffb648" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="mh-cone" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffe2a0" stopOpacity="0.5" />
        <stop offset="1" stopColor="#ffd27a" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="mh-tower" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#8fc1e4" />
        <stop offset="0.45" stopColor="#4f86b7" />
        <stop offset="1" stopColor="#2b5482" />
      </linearGradient>
      <linearGradient id="mh-tower2" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#6f8fa8" />
        <stop offset="1" stopColor="#3d566e" />
      </linearGradient>
      <pattern id="mh-mullion" width="19" height="22" patternUnits="userSpaceOnUse">
        <path d="M0 0.5H19M0.5 0V22" stroke="rgba(230,244,255,.55)" strokeWidth="1" />
      </pattern>
      <pattern id="mh-net" width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M0 0L10 10M10 0L0 10" stroke="rgba(20,70,40,.35)" strokeWidth="0.8" />
      </pattern>
      <pattern id="mh-tiles" width="44" height="22" patternUnits="userSpaceOnUse">
        <path d="M0 21.5H44M22 0V22" stroke="rgba(90,78,60,.22)" strokeWidth="1" />
      </pattern>
      <linearGradient id="mh-road" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3f4249" />
        <stop offset="1" stopColor="#4d5058" />
      </linearGradient>
      <filter id="mh-sabah" colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="1.02 0.03 0 0 0.02  0.01 0.97 0.01 0 0.01  0 0.02 0.9 0 0.01  0 0 0 1 0" />
      </filter>
      <filter id="mh-aksam" colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="0.86 0.1 0 0 0.03  0.04 0.66 0.04 0 0  0.08 0.06 0.62 0 0.05  0 0 0 1 0" />
      </filter>
      <filter id="mh-gece" colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="0.26 0.04 0.02 0 0.01  0.03 0.3 0.05 0 0.02  0.05 0.09 0.48 0 0.06  0 0 0 1 0" />
      </filter>
    </defs>
  );
}

function Cloud({ x, y, k, d, delay }: { x: number; y: number; k: number; d: number; delay: number }) {
  return (
    <g className={s.cloud} style={{ animationDuration: `${d}s`, animationDelay: `${-delay}s` }}>
      <g transform={`translate(${x} ${y}) scale(${k})`}>
        <ellipse cx="0" cy="0" rx="62" ry="20" />
        <ellipse cx="-26" cy="-12" rx="30" ry="22" />
        <ellipse cx="14" cy="-22" rx="36" ry="30" />
        <ellipse cx="46" cy="-6" rx="26" ry="18" />
      </g>
    </g>
  );
}

const STARS = Array.from({ length: 60 }, (_, i) => ({ x: hash(i) * 1600, y: hash(i + 99) * 430, r: 0.6 + hash(i + 7) * 1.4, d: 2 + hash(i + 3) * 4 }));

export function Sky({ phase }: { phase: Phase }) {
  const sun = phase === 'sabah' ? { x: 240, y: 300 } : phase === 'gunduz' ? { x: 1330, y: 150 } : { x: 1420, y: 430 };
  return (
    <g>
      <rect width="1600" height="780" fill="url(#mh-sky)" />
      {phase === 'gece' ? (
        <g>
          {STARS.map((st, i) => (
            <circle key={i} className={s.star} cx={st.x} cy={st.y} r={st.r} style={{ animationDuration: `${st.d}s` }} />
          ))}
          <circle cx="1300" cy="150" r="70" fill="url(#mh-glow)" opacity="0.35" />
          <path d="M1300 118 a32 32 0 1 0 26 52 a26 26 0 1 1 -26 -52Z" fill="#f4eed8" />
        </g>
      ) : (
        <g>
          <circle cx={sun.x} cy={sun.y} r="150" fill="url(#mh-sun)" />
          <circle cx={sun.x} cy={sun.y} r="38" className={s.sunDisc} />
        </g>
      )}
      <g className={s.clouds}>
        <Cloud x={200} y={170} k={1.1} d={150} delay={20} />
        <Cloud x={600} y={110} k={0.8} d={190} delay={90} />
        <Cloud x={1100} y={220} k={1.3} d={170} delay={140} />
        <Cloud x={300} y={300} k={0.6} d={120} delay={60} />
      </g>
      <g className={s.birds}>
        {[
          [520, 210, 1, 0],
          [560, 236, 0.75, 0.4],
          [1180, 300, 0.6, 0.9],
        ].map(([x, y, k, d]) => (
          <g key={x} transform={`translate(${x} ${y}) scale(${k})`}>
            <path className={s.bird} d="M0 0 q8 -8 16 0 q8 -8 16 0" style={{ animationDelay: `${-d}s` }} />
          </g>
        ))}
      </g>
    </g>
  );
}

/** Ufuktaki şehir: tepe, küçük evler, cami ve iki minare. */
export function FarCity() {
  const houses = Array.from({ length: 38 }, (_, i) => {
    const x = i * 44 + hash(i) * 16;
    const h = 30 + hash(i + 40) * 70;
    return { x, h, w: 28 + hash(i + 80) * 20 };
  });
  return (
    <g className={s.far}>
      <g className={s.body}>
        <path d="M0 560 C 200 500, 380 520, 560 540 S 900 470, 1120 500 S 1450 520, 1600 490 V 760 H0Z" fill="#a8bccb" />
        {houses.map((h, i) => (
          <rect key={i} x={h.x} y={640 - h.h} width={h.w} height={h.h + 120} fill={i % 3 ? '#93aabb' : '#8aa1b3'} />
        ))}
        <g fill="#7f97aa">
          <rect x="1328" y="520" width="8" height="120" />
          <path d="M1326 520 L1332 486 L1338 520Z" />
          <rect x="1458" y="520" width="8" height="120" />
          <path d="M1456 520 L1462 486 L1468 520Z" />
          <path d="M1350 640 V 590 Q1397 520 1444 590 V 640Z" />
          <path d="M1394 548 v-14" stroke="#7f97aa" strokeWidth="2" />
          <path d="M1340 640 v-30 q14 -26 28 0 v30Z M1426 640 v-30 q14 -26 28 0 v30Z" />
        </g>
      </g>
      <g className={s.lit}>
        {houses.flatMap((h, i) =>
          [0, 1, 2].filter((k) => hash(i * 5 + k) < 0.5).map((k) => <rect key={`${i}-${k}`} x={h.x + 6 + k * 7} y={640 - h.h + 10 + (k % 2) * 14} width={3} height={4} fill="#ffd98a" />),
        )}
      </g>
    </g>
  );
}

/** Kaldırımlar, bordür ve yol. Yaya geçidi ışığın yanında. */
export function Street() {
  return (
    <g className={s.body}>
      <rect x="0" y="712" width="1600" height="48" fill="#d4cab4" />
      <rect x="0" y="712" width="1600" height="48" fill="url(#mh-tiles)" />
      <rect x="0" y="712" width="1600" height="5" fill="rgba(0,0,0,.08)" />
      <rect x="0" y="758" width="1600" height="11" fill="#a9a294" />
      <rect x="0" y="758" width="1600" height="2" fill="#cfc8b8" />
      <rect x="0" y="769" width="1600" height="140" fill="url(#mh-road)" />
      {/* yamalar ve çatlaklar: yol eski */}
      <path d="M120 790 h120 v26 h-120Z M980 872 h90 v22 h-90Z" fill="#555960" />
      <path d="M300 800 l18 8 l10 -4 l16 9 M1500 880 l-14 6 l-12 -3" stroke="#35373c" strokeWidth="1.4" fill="none" />
      {Array.from({ length: 20 }, (_, i) => (
        <rect key={i} x={i * 84 + 10} y="836" width="46" height="5" rx="1" fill="#e6e0ca" opacity={i * 84 > 1180 && i * 84 < 1340 ? 0 : 0.9} />
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x="1232" y={776 + i * 22} width="96" height="12" fill="#ece7d6" opacity="0.92" />
      ))}
      <rect x="1220" y="772" width="4" height="134" fill="#ece7d6" opacity="0.6" />
      <ellipse cx="760" cy="806" rx="18" ry="5" fill="#2e3034" />
      <ellipse cx="760" cy="805" rx="14" ry="3.5" fill="none" stroke="#5b5e64" strokeWidth="1" />
      <rect x="0" y="906" width="1600" height="12" fill="#a49d8f" />
      <rect x="0" y="906" width="1600" height="2" fill="#c9c2b2" />
      <rect x="0" y="918" width="1600" height="82" fill="#cbc1aa" />
      <rect x="0" y="918" width="1600" height="82" fill="url(#mh-tiles)" />
      <rect x="0" y="918" width="1600" height="6" fill="rgba(0,0,0,.1)" />
    </g>
  );
}

function Car({ color, roof = color, taxi = false }: { color: string; roof?: string; taxi?: boolean }) {
  return (
    <g>
      <ellipse cx="74" cy="0" rx="74" ry="5" fill="rgba(0,0,0,.28)" />
      <path d="M6 -14 Q4 -30 22 -32 L44 -34 Q58 -52 82 -52 L104 -52 Q120 -50 132 -34 L144 -30 Q152 -26 150 -14 Z" fill={color} />
      <path d="M50 -35 Q60 -48 80 -48 L86 -48 L86 -35Z M92 -48 L102 -48 Q114 -46 124 -35 L92 -35Z" fill="#9fc6dd" className={s.carGlass} />
      <path d="M6 -22 H150" stroke="rgba(0,0,0,.18)" strokeWidth="1.5" />
      <rect x="140" y="-28" width="9" height="5" rx="2" fill="#ffefb0" />
      <rect x="4" y="-27" width="6" height="5" rx="1" fill="#d23a2a" />
      {taxi && (
        <g>
          <rect x="74" y="-60" width="24" height="8" rx="2" fill="#222" />
          <text x="86" y="-53.5" fontSize="6.5" fill="#ffd400" textAnchor="middle" fontFamily="var(--font-mono)" fontWeight="700">TAKSİ</text>
          <rect x="6" y="-20" width="144" height="3" fill="#222" opacity="0.6" />
        </g>
      )}
      <path d="M44 -34 L132 -34" stroke={roof} strokeWidth="1" />
      {[34, 118].map((x) => (
        <g key={x}>
          <circle cx={x} cy="-8" r="12" fill="#1e1f23" />
          <circle cx={x} cy="-8" r="5.5" fill="#a6a8ad" />
        </g>
      ))}
    </g>
  );
}

function Bus() {
  return (
    <g>
      <ellipse cx="150" cy="0" rx="150" ry="5" fill="rgba(0,0,0,.28)" />
      <rect x="0" y="-92" width="300" height="82" rx="10" fill="#e9e6dc" />
      <rect x="0" y="-36" width="300" height="12" fill="#2f7a63" />
      <rect x="10" y="-82" width="270" height="34" rx="3" fill="#7fa9c4" className={s.carGlass} />
      {[60, 120, 180, 240].map((x) => (
        <rect key={x} x={x} y="-82" width="3" height="34" fill="#e9e6dc" />
      ))}
      <rect x="282" y="-84" width="14" height="70" rx="2" fill="#5d8aa6" className={s.carGlass} />
      <rect x="20" y="-90" width="70" height="7" rx="1" fill="#222" />
      <text x="55" y="-84.5" fontSize="6" textAnchor="middle" fill="#ffb13b" fontFamily="var(--font-mono)">34 KADIKÖY</text>
      {[54, 240].map((x) => (
        <g key={x}>
          <circle cx={x} cy="-8" r="13" fill="#1e1f23" />
          <circle cx={x} cy="-8" r="6" fill="#a6a8ad" />
        </g>
      ))}
    </g>
  );
}

function Minibus() {
  return (
    <g>
      <ellipse cx="90" cy="0" rx="90" ry="5" fill="rgba(0,0,0,.28)" />
      <path d="M4 -12 V -66 Q4 -72 12 -72 H140 Q156 -70 166 -46 L178 -40 Q182 -36 180 -12Z" fill="#f2c230" />
      <path d="M14 -64 H138 L138 -44 H14Z" fill="#8db6cf" className={s.carGlass} />
      <path d="M144 -64 Q154 -60 162 -44 H144Z" fill="#8db6cf" className={s.carGlass} />
      {[44, 76, 108].map((x) => (
        <rect key={x} x={x} y="-64" width="3" height="20" fill="#f2c230" />
      ))}
      <rect x="20" y="-34" width="70" height="9" fill="#fff" opacity="0.85" />
      <text x="55" y="-27.5" fontSize="6.5" textAnchor="middle" fill="#333" fontFamily="var(--font-mono)" fontWeight="700">BEŞİKTAŞ</text>
      {[38, 146].map((x) => (
        <g key={x}>
          <circle cx={x} cy="-8" r="12" fill="#1e1f23" />
          <circle cx={x} cy="-8" r="5.5" fill="#a6a8ad" />
        </g>
      ))}
    </g>
  );
}

/**
 * Akan trafik: uzak şerit sola, yakın şerit sağa. Yakın şeritteki her araç çukura girip çıkar:
 * sallanma, yatay hareketle aynı sürede ve gecikmede çalışır, tekerlek çukurun üstüne gelince olur.
 */
export function Traffic() {
  const near = [
    { el: <Car color="#c8402f" />, d: 16, delay: 0 },
    { el: <Car color="#f2c230" taxi />, d: 16, delay: 8 },
    { el: <Minibus />, d: 19, delay: 4 },
  ];
  const far = [
    { el: <Bus />, d: 26, delay: 3 },
    { el: <Car color="#2f5f8a" />, d: 15, delay: 10 },
    { el: <Car color="#e8e4da" />, d: 17, delay: 20 },
  ];
  return (
    <g className={`${s.decor} ${s.body}`}>
      {far.map((c, i) => (
        <g key={`f${i}`} className={s.driveL} style={{ animationDuration: `${c.d}s`, animationDelay: `${-c.delay}s` }}>
          <g transform="translate(0 826) scale(-0.86 0.86)">{c.el}</g>
        </g>
      ))}
      {near.map((c, i) => (
        <g key={`n${i}`} className={s.driveR} style={{ animationDuration: `${c.d}s`, animationDelay: `${-c.delay}s` }}>
          <g transform="translate(0 896)">
            <g className={s.bump} style={{ animationDuration: `${c.d}s`, animationDelay: `${-c.delay}s` }}>
              {c.el}
            </g>
          </g>
        </g>
      ))}
    </g>
  );
}

/** Arka kaldırımda yürüyen iki kişi. */
export function Walkers() {
  return (
    <g className={`${s.decor} ${s.body}`}>
      <g className={s.walkR} style={{ animationDuration: '70s', animationDelay: '-12s' }}>
        <Person x={0} y={750} coat="#7c5a8c" walk />
      </g>
      <g className={s.walkL} style={{ animationDuration: '85s', animationDelay: '-50s' }}>
        <Person x={0} y={754} coat="#3f6b63" cap="#2a2a2a" walk />
      </g>
    </g>
  );
}

function Lamp({ x }: { x: number }) {
  return (
    <g>
      <g className={s.body}>
        <ellipse cx={x} cy="976" rx="14" ry="4" fill="rgba(0,0,0,.2)" />
        <rect x={x - 5} y="660" width="10" height="316" fill="#33363c" />
        <rect x={x - 9} y="944" width="18" height="32" rx="3" fill="#2b2e33" />
        <path d={`M${x} 664 C ${x} 630, ${x - 16} 620, ${x - 48} 624`} stroke="#33363c" strokeWidth="7" fill="none" />
        <path d={`M${x - 66} 620 H ${x - 32} L ${x - 38} 632 H ${x - 60}Z`} fill="#2b2e33" />
      </g>
      <g className={s.lamp}>
        <path d={`M${x - 60} 632 L ${x - 120} 916 H ${x + 20} L ${x - 38} 632Z`} fill="url(#mh-cone)" />
        <ellipse cx={x - 50} cy="636" rx="40" ry="22" fill="url(#mh-glow)" />
        <rect x={x - 58} y="631" width="18" height="4" rx="2" fill="#fff4cf" />
      </g>
    </g>
  );
}

/** Ön kaldırım: lambalar, bank, simitçi tezgâhı. */
export function Foreground() {
  return (
    <g className={s.decor}>
      <Lamp x={330} />
      <Lamp x={1480} />
      <g className={s.body}>
        {/* bank */}
        <ellipse cx="740" cy="972" rx="54" ry="5" fill="rgba(0,0,0,.18)" />
        <rect x="690" y="930" width="100" height="8" rx="2" fill="#8a5a34" />
        <rect x="690" y="944" width="100" height="8" rx="2" fill="#7a4e2d" />
        <rect x="688" y="954" width="104" height="6" rx="2" fill="#9a683e" />
        <path d="M698 960 v12 M782 960 v12" stroke="#2c2e33" strokeWidth="5" />
        {/* simitçi */}
        <ellipse cx="940" cy="980" rx="60" ry="6" fill="rgba(0,0,0,.2)" />
        <rect x="892" y="908" width="96" height="52" rx="4" fill="#c33a2c" />
        <rect x="898" y="884" width="84" height="30" rx="3" fill="rgba(220,240,250,.55)" stroke="#e7e2d6" strokeWidth="2" />
        {[910, 932, 954].map((x) => (
          <g key={x}>
            <circle cx={x + 8} cy="904" r="8" fill="none" stroke="#b77632" strokeWidth="5" />
            <circle cx={x + 8} cy="904" r="8" fill="none" stroke="#7a4a1c" strokeWidth="1" strokeDasharray="1 3" />
          </g>
        ))}
        <rect x="892" y="924" width="96" height="10" fill="#f3ede0" />
        <text x="940" y="932" fontSize="8" textAnchor="middle" fill="#c33a2c" fontWeight="800" fontFamily="var(--font-body)">SİMİT · 1 TL</text>
        <circle cx="908" cy="968" r="10" fill="#26272b" />
        <circle cx="972" cy="968" r="10" fill="#26272b" />
        <path d="M988 920 L1012 906" stroke="#555" strokeWidth="4" strokeLinecap="round" />
        <Person x={1022} y={972} coat="#d9d1bf" cap="#f3f1ea" hands="side" />
        {/* çiçeklikler */}
        {[150, 1080, 1330].map((x) => (
          <g key={x}>
            <rect x={x - 22} y="944" width="44" height="30" rx="3" fill="#8f877a" />
            <circle cx={x - 10} cy="938" r="12" fill="#5d8c4f" />
            <circle cx={x + 8} cy="934" r="14" fill="#6c9c5b" />
            <circle cx={x + 2} cy="926" r="4" fill="#e45b6c" />
          </g>
        ))}
      </g>
    </g>
  );
}

/** Meydanın çınarı: apartmanla plazanın arasında, tıklamayı geçirir. */
export function PlaneTree() {
  return (
    <g className={`${s.decor} ${s.body}`}>
      <ellipse cx="770" cy="756" rx="34" ry="5" fill="rgba(0,0,0,.2)" />
      <path d="M762 756 C 764 680, 760 600, 752 520 L 764 520 C 772 600, 778 680, 780 756Z" fill="#6b4f39" />
      <path d="M758 560 C 740 530, 726 520, 714 518 M 768 570 C 786 536, 800 526, 816 522" stroke="#6b4f39" strokeWidth="5" fill="none" />
      <g className={s.leaves}>
        <circle cx="716" cy="496" r="38" fill="#5f8f4a" />
        <circle cx="764" cy="468" r="50" fill="#6c9d55" />
        <circle cx="816" cy="500" r="36" fill="#5a8946" />
        <circle cx="748" cy="514" r="32" fill="#4f7d3f" />
        <circle cx="792" cy="522" r="28" fill="#4c7a3c" />
        <circle cx="772" cy="440" r="26" fill="#7aab61" opacity="0.7" />
        <circle cx="730" cy="474" r="15" fill="#86b56c" opacity="0.6" />
      </g>
    </g>
  );
}
