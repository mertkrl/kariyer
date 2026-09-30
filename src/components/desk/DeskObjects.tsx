import type { ReactElement } from 'react';
import { WORK_START_HOUR } from '../../game/time';

/*
 * The things on the desk, drawn as SVG: each fills its own box (positioned by Desk.module.css),
 * lit from the window on the right and from the monitor, with a soft contact shadow on the oak.
 */

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function Shadow({ cx, cy, rx, ry, a = 0.35 }: { cx: number; cy: number; rx: number; ry: number; a?: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`rgba(40,24,10,${a})`} filter="url(#deskBlur)" />;
}

/** Shared filters/gradients, rendered once inside the desk. */
export function DeskDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <filter id="deskBlur" x="-30%" y="-80%" width="160%" height="260%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="deskSoft" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
        <linearGradient id="alu" x1="0" x2="1">
          <stop offset="0" stopColor="#5b5e64" />
          <stop offset="0.45" stopColor="#c9ccd2" />
          <stop offset="0.6" stopColor="#8d9097" />
          <stop offset="1" stopColor="#44474d" />
        </linearGradient>
        <linearGradient id="ceramic" x1="0" x2="1">
          <stop offset="0" stopColor="#c9c6c0" />
          <stop offset="0.35" stopColor="#f7f5f0" />
          <stop offset="0.7" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d8d4cc" />
        </linearGradient>
        <linearGradient id="plasticDark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#45484e" />
          <stop offset="1" stopColor="#25272b" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ── Monitor ── */

export function MonitorArt() {
  return (
    <svg viewBox="0 0 620 470" width="100%" height="100%" aria-hidden="true">
      <Shadow cx={310} cy={456} rx={150} ry={14} a={0.45} />
      {/* stand */}
      <path d="M288 360 L332 360 L338 446 L282 446 Z" fill="url(#alu)" />
      <ellipse cx={310} cy={452} rx={118} ry={15} fill="#2b2d31" />
      <ellipse cx={310} cy={449} rx={116} ry={12} fill="url(#alu)" />
      {/* body */}
      <rect x={0} y={0} width={620} height={372} rx={10} fill="#0e0f11" />
      <rect x={1.5} y={1.5} width={617} height={369} rx={9} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} />
      <rect x={0} y={347} width={620} height={25} rx={4} fill="#17181b" />
      <text x={310} y={364} textAnchor="middle" fontSize={8} fill="#6d7078" letterSpacing={2} fontFamily="Work Sans, sans-serif">
        TAVRINSA
      </text>
      <circle cx={596} cy={360} r={2} fill="#3fd67a" opacity={0.8} />
    </svg>
  );
}

/* ── Keyboard & mouse ── */

export function KeyboardArt() {
  const back = { y: 8, x0: 34, x1: 466 };
  const front = { y: 86, x0: 10, x1: 490 };
  const rows = [14, 14, 13, 12, 8];
  const keys: ReactElement[] = [];
  rows.forEach((n, ri) => {
    const t0 = (ri + 0.12) / rows.length;
    const t1 = (ri + 0.86) / rows.length;
    const y0 = lerp(back.y + 6, front.y - 6, t0);
    const y1 = lerp(back.y + 6, front.y - 6, t1);
    const xl0 = lerp(back.x0 + 12, front.x0 + 12, t0);
    const xr0 = lerp(back.x1 - 12, front.x1 - 12, t0);
    const xl1 = lerp(back.x0 + 12, front.x0 + 12, t1);
    const xr1 = lerp(back.x1 - 12, front.x1 - 12, t1);
    const widths = ri === 4 ? [1.3, 1.3, 1.3, 6, 1.3, 1.3, 1.3, 1.3] : Array.from({ length: n }, (_, i) => (i === 0 || i === n - 1 ? 1.4 : 1));
    const total = widths.reduce((a, b) => a + b, 0);
    let acc = 0;
    widths.forEach((w, ki) => {
      const a = acc / total;
      const b = (acc + w) / total;
      acc += w;
      const g = 0.012;
      const pts = [
        [lerp(xl0, xr0, a + g), y0],
        [lerp(xl0, xr0, b - g), y0],
        [lerp(xl1, xr1, b - g), y1],
        [lerp(xl1, xr1, a + g), y1],
      ];
      keys.push(<polygon key={`${ri}-${ki}`} points={pts.map((p) => p.join(',')).join(' ')} fill="#2d2f34" stroke="#1a1b1e" strokeWidth={0.8} />);
      keys.push(<line key={`h${ri}-${ki}`} x1={pts[0][0]} y1={pts[0][1] + 0.8} x2={pts[1][0]} y2={pts[1][1] + 0.8} stroke="rgba(255,255,255,0.14)" strokeWidth={1} />);
    });
  });
  return (
    <svg viewBox="0 0 500 104" width="100%" height="100%" aria-hidden="true">
      <Shadow cx={250} cy={92} rx={240} ry={10} a={0.4} />
      <polygon points={`${back.x0},${back.y} ${back.x1},${back.y} ${front.x1},${front.y} ${front.x0},${front.y}`} fill="#1c1d21" />
      <polygon points={`${front.x0},${front.y} ${front.x1},${front.y} ${front.x1 - 2},${front.y + 7} ${front.x0 + 2},${front.y + 7}`} fill="#0f1012" />
      {keys}
    </svg>
  );
}

export function MouseArt() {
  return (
    <svg viewBox="0 0 170 100" width="100%" height="100%" aria-hidden="true">
      <Shadow cx={85} cy={90} rx={80} ry={8} a={0.3} />
      <path d="M22 10 H150 Q160 10 162 20 L168 80 Q169 92 156 92 H14 Q2 92 3 80 L10 20 Q12 10 22 10 Z" fill="#23262d" />
      <path d="M22 10 H150 Q160 10 162 20 L168 80 Q169 92 156 92 H14 Q2 92 3 80 L10 20 Q12 10 22 10 Z" fill="none" stroke="rgba(255,255,255,0.06)" />
      <ellipse cx={96} cy={60} rx={24} ry={20} fill="rgba(0,0,0,0.35)" filter="url(#deskSoft)" />
      <path d="M96 30 C112 30 120 42 120 56 C120 70 110 78 96 78 C82 78 72 70 72 56 C72 42 80 30 96 30 Z" fill="#e8e9ec" />
      <path d="M96 30 C112 30 120 42 120 56 C120 70 110 78 96 78 C82 78 72 70 72 56 C72 42 80 30 96 30 Z" fill="url(#ceramic)" opacity={0.6} />
      <line x1={96} y1={31} x2={96} y2={50} stroke="#b7b9bf" strokeWidth={1} />
      <rect x={94} y={36} width={4} height={8} rx={2} fill="#7d8088" />
    </svg>
  );
}

/* ── Landline ── */

export function LandlineArt({ ringing, display }: { ringing: boolean; display: string }) {
  const keys: ReactElement[] = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      const t = row / 3;
      const w = lerp(20, 26, t);
      const x = lerp(128, 120, t) + col * lerp(27, 31, t);
      const y = lerp(96, 150, t);
      keys.push(<rect key={`${row}-${col}`} x={x} y={y} width={w} height={lerp(10, 13, t)} rx={3} fill="#d9dadd" stroke="#8d9097" strokeWidth={0.6} />);
    }
  }
  return (
    <svg viewBox="0 0 270 200" width="100%" height="100%" aria-hidden="true">
      <Shadow cx={135} cy={184} rx={128} ry={12} a={0.45} />
      {/* base */}
      <path d="M36 38 H236 Q246 38 248 48 L264 164 Q266 178 252 178 H18 Q4 178 6 164 L22 48 Q24 38 36 38 Z" fill="url(#plasticDark)" />
      <path d="M8 170 Q6 184 20 184 H250 Q264 184 262 170 L262 176 Q262 190 248 190 H22 Q8 190 8 176 Z" fill="#17181b" />
      <path d="M36 38 H236" stroke="rgba(255,255,255,0.18)" strokeWidth={1.5} />
      {/* display */}
      <path d="M116 50 H236 L240 88 H112 Z" fill={ringing ? '#cfe6c2' : '#9fae96'} />
      <path d="M116 50 H236 L240 88 H112 Z" fill="none" stroke="#1b1c1f" strokeWidth={2} />
      <text x={176} y={66} textAnchor="middle" fontSize={11} fontFamily="JetBrains Mono, monospace" fill="#1f2a1c" fontWeight={700}>
        {ringing ? '☎ ARIYOR' : 'TAVRINSA'}
      </text>
      <text x={176} y={81} textAnchor="middle" fontSize={10} fontFamily="JetBrains Mono, monospace" fill="#1f2a1c">
        {display}
      </text>
      {keys}
      {/* function keys + message light */}
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={lerp(218, 222, i / 3)} y={lerp(96, 150, i / 3)} width={lerp(22, 26, i / 3)} height={lerp(9, 12, i / 3)} rx={3} fill="#5d6068" />
      ))}
      <circle cx={244} cy={46} r={4} fill={ringing ? '#ff3b30' : '#5a2320'} className={ringing ? 'deskLedBlink' : undefined} />
      {/* coiled cord */}
      <path d="M40 168 q-8 6 -2 10 q8 4 2 10 q-8 5 0 9" fill="none" stroke="#1d1e22" strokeWidth={4} strokeLinecap="round" />
      {/* handset on its cradle, it jumps when it rings */}
      <g className={ringing ? 'deskHandsetRing' : undefined}>
        <path d="M30 34 Q30 22 46 22 H78 Q96 22 96 38 L100 150 Q101 170 82 172 H44 Q24 172 24 152 Z" fill="#2c2e33" />
        <path d="M30 34 Q30 22 46 22 H78 Q96 22 96 38" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={2} />
        <rect x={34} y={30} width={56} height={26} rx={10} fill="#232428" />
        <rect x={30} y={138} width={66} height={28} rx={11} fill="#232428" />
        <path d="M44 62 L46 132" stroke="rgba(255,255,255,0.08)" strokeWidth={6} strokeLinecap="round" />
      </g>
    </svg>
  );
}

/* ── Mobile phone, lying face up ── */

export function MobileArt({ lit, unread }: { lit: boolean; unread: number }) {
  const body = 'M52 10 L118 8 Q126 8 127 16 L146 112 Q148 122 138 122 L26 124 Q16 124 18 114 L42 16 Q44 10 52 10 Z';
  const screen = 'M55 16 L116 14 L138 114 L27 116 Z';
  return (
    <svg viewBox="0 0 164 136" width="100%" height="100%" aria-hidden="true">
      <Shadow cx={82} cy={124} rx={72} ry={9} a={0.45} />
      <path d={body} fill="#0b0c0e" />
      <path d={body} fill="none" stroke="#6b6e75" strokeWidth={2} />
      <path d={screen} fill={lit ? 'url(#phoneLit)' : '#07080a'} />
      <defs>
        <linearGradient id="phoneLit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2f4f86" />
          <stop offset="1" stopColor="#1b2640" />
        </linearGradient>
      </defs>
      {lit && (
        <>
          <path d="M60 30 L112 29 L117 52 L55 53 Z" fill="rgba(255,255,255,0.88)" />
          <path d="M64 36 L90 35.5 L91 39 L63 39.5 Z" fill="#2c3440" />
          <path d="M63 44 L108 43.5 L109 47 L62 47.5 Z" fill="#8a93a0" />
        </>
      )}
      <path d="M58 18 L100 17" stroke="rgba(255,255,255,0.14)" strokeWidth={6} strokeLinecap="round" />
      {unread > 0 && (
        <>
          <circle cx={132} cy={20} r={10} fill="#e0463a" />
          <text x={132} y={24} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fff" fontFamily="Work Sans, sans-serif">
            {Math.min(9, unread)}
          </text>
        </>
      )}
    </svg>
  );
}

/* ── Coffee mug ── */

export function MugArt({ sips, max }: { sips: number; max: number }) {
  const level = sips / max;
  // a full mug sits just under the rim; each sip lowers it a little, so less and less shows through the mouth
  const surfaceY = lerp(37.5, 31.5, level);
  return (
    <svg viewBox="0 0 130 150" width="100%" height="100%" aria-hidden="true">
      <Shadow cx={62} cy={138} rx={52} ry={9} a={0.4} />
      {/* handle */}
      <path d="M92 52 C124 50 126 104 92 104" fill="none" stroke="#e9e6e0" strokeWidth={12} />
      <path d="M92 52 C124 50 126 104 92 104" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth={2} />
      {/* body */}
      <path d="M20 30 L20 124 Q20 138 58 138 Q96 138 96 124 L96 30 Z" fill="url(#ceramic)" />
      <ellipse cx={58} cy={30} rx={38} ry={10} fill="#f4f1ea" />
      {/* the mouth: you see the inside wall, and the coffee only through the opening */}
      <clipPath id="mugMouth">
        <ellipse cx={58} cy={31} rx={34} ry={8} />
      </clipPath>
      <ellipse cx={58} cy={31} rx={34} ry={8} fill="#cbc5ba" />
      <g clipPath="url(#mugMouth)">
        <ellipse cx={58} cy={35} rx={34} ry={8} fill="#b9b2a6" />
        {sips > 0 && <ellipse cx={58} cy={surfaceY} rx={lerp(29, 33, level)} ry={lerp(6.5, 7.5, level)} fill="#3a2212" />}
        {sips > 0 && <ellipse cx={50} cy={surfaceY - 1.5} rx={12} ry={2} fill="rgba(255,236,210,0.25)" />}
      </g>
      <text x={58} y={92} textAnchor="middle" fontSize={9.5} fontWeight={700} letterSpacing={1.5} fill="#2d3a55" fontFamily="Work Sans, sans-serif">
        TAVRINSA
      </text>
      <text x={58} y={103} textAnchor="middle" fontSize={7} letterSpacing={2.5} fill="#8a6a2b" fontFamily="Work Sans, sans-serif">
        LABS
      </text>
      {sips >= 2 && (
        <g className="deskSteam" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={3} strokeLinecap="round">
          <path d="M46 20 C38 8 54 0 46 -14" />
          <path d="M64 18 C56 4 72 -4 64 -20" />
        </g>
      )}
    </svg>
  );
}

/* ── Small things ── */

export function FoldersArt({ count }: { count: number }) {
  const colors = ['#d9c08a', '#6f8fb3', '#c9b27d', '#a8584a', '#e0cf9e'];
  const n = Math.min(5, Math.max(2, count));
  return (
    <svg viewBox="0 0 240 90" width="100%" height="100%" aria-hidden="true">
      <Shadow cx={120} cy={80} rx={112} ry={8} a={0.35} />
      {Array.from({ length: n }, (_, i) => {
        const y = 70 - i * 8;
        const dx = (i % 2 ? 4 : -3) + i;
        return (
          <g key={i}>
            <polygon points={`${22 + dx},${y - 20} ${206 + dx},${y - 20} ${220 + dx},${y} ${8 + dx},${y}`} fill={colors[i]} />
            <polygon points={`${8 + dx},${y} ${220 + dx},${y} ${220 + dx},${y + 5} ${8 + dx},${y + 5}`} fill="rgba(0,0,0,0.25)" />
            <polygon points={`${28 + dx},${y - 17} ${198 + dx},${y - 17} ${204 + dx},${y - 12} ${24 + dx},${y - 12}`} fill="#f7f3e8" opacity={0.8} />
          </g>
        );
      })}
    </svg>
  );
}

export function PenCupArt() {
  return (
    <svg viewBox="0 0 80 120" width="100%" height="100%" aria-hidden="true">
      <Shadow cx={40} cy={112} rx={34} ry={6} a={0.4} />
      <line x1={30} y1={50} x2={18} y2={4} stroke="#2a4f9c" strokeWidth={4} strokeLinecap="round" />
      <line x1={42} y1={50} x2={46} y2={0} stroke="#1b1b1b" strokeWidth={4} strokeLinecap="round" />
      <line x1={50} y1={50} x2={64} y2={10} stroke="#d9a21b" strokeWidth={5} strokeLinecap="round" />
      <line x1={36} y1={50} x2={30} y2={14} stroke="#c0392b" strokeWidth={3} strokeLinecap="round" />
      <path d="M14 44 L66 44 L62 108 Q40 114 18 108 Z" fill="#2a2c31" />
      <path d="M14 44 L66 44 L62 108 Q40 114 18 108 Z" fill="url(#alu)" opacity={0.25} />
      <ellipse cx={40} cy={44} rx={26} ry={5} fill="#3a3c42" />
    </svg>
  );
}

export function WallClockArt({ minutes }: { minutes: number }) {
  const total = WORK_START_HOUR * 60 + minutes;
  const hourA = ((total / 60) % 12) * 30;
  const minA = (total % 60) * 6;
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true">
      <circle cx={62} cy={63} r={54} fill="rgba(40,30,20,0.25)" filter="url(#deskSoft)" />
      <circle cx={60} cy={60} r={54} fill="#24262b" />
      <circle cx={60} cy={60} r={48} fill="#f6f3ec" />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1={60} y1={16} x2={60} y2={i % 3 === 0 ? 24 : 20} stroke="#2a2a2a" strokeWidth={i % 3 === 0 ? 3 : 1.5} transform={`rotate(${i * 30} 60 60)`} />
      ))}
      <line x1={60} y1={60} x2={60} y2={34} stroke="#1c1c1c" strokeWidth={4} strokeLinecap="round" transform={`rotate(${hourA} 60 60)`} />
      <line x1={60} y1={60} x2={60} y2={22} stroke="#1c1c1c" strokeWidth={2.5} strokeLinecap="round" transform={`rotate(${minA} 60 60)`} />
      <g className="deskSecond">
        <line x1={60} y1={68} x2={60} y2={20} stroke="#c0392b" strokeWidth={1.2} />
      </g>
      <circle cx={60} cy={60} r={3} fill="#c0392b" />
      <path d="M22 40 A44 44 0 0 1 70 16" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={3} />
    </svg>
  );
}

export function PosterArt() {
  return (
    <svg viewBox="0 0 280 200" width="100%" height="100%" aria-hidden="true">
      <rect x={6} y={8} width={272} height={190} fill="rgba(40,30,20,0.25)" filter="url(#deskSoft)" />
      <rect x={0} y={0} width={272} height={190} fill="#1f2024" />
      <rect x={8} y={8} width={256} height={174} fill="#f7f4ec" />
      <rect x={8} y={8} width={256} height={40} fill="#2d3a55" />
      <text x={136} y={34} textAnchor="middle" fontSize={17} fontWeight={700} letterSpacing={4} fill="#f7f4ec" fontFamily="Work Sans, sans-serif">
        DEĞERLERİMİZ
      </text>
      {['İnsan önce gelir.', 'Şeffaflık.', 'Fırsat eşitliği.'].map((t, i) => (
        <text key={t} x={136} y={82 + i * 30} textAnchor="middle" fontSize={17} fill="#2d3a55" fontFamily="Fraunces, serif" fontStyle="italic">
          {t}
        </text>
      ))}
      <text x={250} y={174} textAnchor="end" fontSize={8} letterSpacing={2} fill="#8a6a2b" fontFamily="Work Sans, sans-serif">
        TAVRINSA LABS
      </text>
      <path d="M8 8 L120 8 L60 182 L8 182 Z" fill="rgba(255,255,255,0.12)" />
    </svg>
  );
}

export function WindowFrameArt() {
  const slats = Array.from({ length: 11 }, (_, i) => i);
  return (
    <svg viewBox="0 0 580 360" width="100%" height="100%" aria-hidden="true" preserveAspectRatio="none">
      {/* blinds pulled a third of the way down */}
      {slats.map((i) => (
        <g key={i}>
          <rect x={10} y={10 + i * 9} width={560} height={8} fill="#e9e6df" />
          <rect x={10} y={16 + i * 9} width={560} height={2} fill="rgba(0,0,0,0.12)" />
        </g>
      ))}
      <rect x={10} y={108} width={560} height={6} rx={2} fill="#cfcac0" />
      <line x1={500} y1={10} x2={500} y2={200} stroke="#bdb7aa" strokeWidth={1.5} />
      <circle cx={500} cy={204} r={4} fill="#bdb7aa" />
      {/* aluminium frame and mullion */}
      <path d="M0 0 H580 V360 H0 Z M10 10 V350 H570 V10 Z" fill="#8f949b" fillRule="evenodd" />
      <path d="M0 0 H580 V4 H0 Z" fill="#c3c7cc" />
      <rect x={286} y={10} width={8} height={340} fill="#8f949b" />
      <rect x={287} y={10} width={2} height={340} fill="#c3c7cc" />
      <rect x={0} y={350} width={580} height={10} fill="#a4a8ae" />
      <rect x={-6} y={356} width={592} height={8} fill="#d8d2c6" />
    </svg>
  );
}

export function PedestalArt({ unlocked }: { unlocked: boolean }) {
  return (
    <svg viewBox="0 0 300 100" width="100%" height="100%" aria-hidden="true" preserveAspectRatio="none">
      <rect x={0} y={0} width={300} height={100} fill="#3b3d42" />
      <rect x={6} y={4} width={288} height={40} rx={2} fill="#6e7178" />
      <rect x={6} y={4} width={288} height={3} fill="rgba(255,255,255,0.2)" />
      <rect x={110} y={18} width={80} height={8} rx={4} fill="#2c2e33" />
      <circle cx={270} cy={16} r={5} fill="#b9bcc2" />
      <rect x={6} y={50} width={288} height={50} rx={2} fill="#666970" />
      <rect x={6} y={50} width={288} height={3} fill="rgba(255,255,255,0.18)" />
      <rect x={110} y={66} width={80} height={8} rx={4} fill="#2c2e33" />
      {unlocked && (
        <>
          <rect x={30} y={47} width={120} height={4} fill="#b8322a" />
          <rect x={30} y={47} width={120} height={1.5} fill="#e25a4c" />
        </>
      )}
    </svg>
  );
}
