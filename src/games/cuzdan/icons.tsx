import { useId, type ReactNode } from 'react';
import type { Theme } from './model';
import { toneHex } from '../../shared/color';

/*
 * Cüzdan TL'nin simgeleri: her uygulama için elle çizilmiş SVG, üç dönemde üç ayrı işçilikle.
 * Biçim aynı kalır, işçilik yılla gelişir:
 * - luna (2002–2005): dikey degrade, koyu kontur, sert gölge; kalın ve "oyuncak" gibi.
 * - glass (2008–2012): çapraz degrade, ince kontur, üstte cam parlaması, yumuşak gölge.
 * - flat (2016–2020): düz renk, kontur ve gölge yok; ayrıntılar bir ton koyu.
 * Renkler `paint` ile verilir; dönem ona göre degrade, düz renk ya da parlama üretir.
 */

export type IconId = 'gecmis' | 'ucuz' | 'web' | 'not' | 'saat' | 'muzik' | 'karne' | 'gunluk' | 'oyun' | 'start';

const shade = toneHex;

interface Paint {
  /** Ana dolgu: dönemine göre degrade ya da düz renk. */
  f: (hex: string) => string;
  /** Kontur rengi ve kalınlığı. */
  s: (hex: string) => { stroke: string; strokeWidth: number };
  /** Ayrıntı rengi (çizgi, akrep): düz dönemde bir ton koyu. */
  d: (hex: string) => string;
  /** Cam döneminde üstte parlama; diğerlerinde yok. */
  gloss: (cx: number, cy: number, rx: number, ry: number) => ReactNode;
}

function usePaint(theme: Theme): { p: Paint; defs: () => ReactNode; filter: string | undefined } {
  const uid = useId().replace(/:/g, '');
  const used = new Set<string>();
  const p: Paint = {
    f: (hex) => {
      if (theme === 'flat') return hex;
      used.add(hex);
      return `url(#${uid}${hex.slice(1)})`;
    },
    s: (hex) => (theme === 'luna' ? { stroke: shade(hex, -0.55), strokeWidth: 1.4 } : theme === 'glass' ? { stroke: 'rgba(0,0,0,.38)', strokeWidth: 0.9 } : { stroke: 'none', strokeWidth: 0 }),
    d: (hex) => (theme === 'flat' ? shade(hex, -0.25) : shade(hex, -0.45)),
    gloss: (cx, cy, rx, ry) => (theme === 'glass' ? <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${uid}gloss)`} pointerEvents="none" /> : null),
  };
  const defs = () => (
    <defs>
      {[...used].map((hex) =>
        theme === 'luna' ? (
          <linearGradient key={hex} id={`${uid}${hex.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={shade(hex, 0.45)} />
            <stop offset="0.55" stopColor={hex} />
            <stop offset="1" stopColor={shade(hex, -0.3)} />
          </linearGradient>
        ) : (
          <linearGradient key={hex} id={`${uid}${hex.slice(1)}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={shade(hex, 0.6)} />
            <stop offset="0.5" stopColor={hex} />
            <stop offset="1" stopColor={shade(hex, -0.45)} />
          </linearGradient>
        ),
      )}
      <linearGradient id={`${uid}gloss`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity=".85" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      <filter id={`${uid}sh`} x="-20%" y="-20%" width="150%" height="150%">
        {theme === 'luna' ? <feDropShadow dx="1.2" dy="1.6" stdDeviation="0.6" floodOpacity=".5" /> : <feDropShadow dx="0" dy="2" stdDeviation="1.8" floodOpacity=".45" />}
      </filter>
    </defs>
  );
  return { p, defs, filter: theme === 'flat' ? undefined : `url(#${uid}sh)` };
}

function art(id: IconId, p: Paint): ReactNode {
  switch (id) {
    case 'gecmis': // fiyat etiketi ve köşesinde saat: "eski fiyat"
      return (
        <>
          <path d="M5 25 L22 7 H39 a2 2 0 0 1 2 2 V26 L24 43 a2 2 0 0 1-2.8 0 L5 27.8 a2 2 0 0 1 0-2.8Z" fill={p.f('#f2b230')} {...p.s('#f2b230')} />
          <circle cx="34" cy="14" r="3.2" fill="#fff" {...p.s('#999999')} />
          <text x="20" y="31" fontSize="15" fontWeight="900" fontFamily="Tahoma, sans-serif" fill={p.d('#f2b230')} transform="rotate(-45 22 26)">
            ₺
          </text>
          {p.gloss(22, 15, 13, 6)}
          <circle cx="36" cy="36" r="9.5" fill={p.f('#3a7bd5')} {...p.s('#3a7bd5')} />
          <circle cx="36" cy="36" r="6.8" fill="#fff" />
          <path d="M36 31.5 V36 L39 38" fill="none" stroke={p.d('#3a7bd5')} strokeWidth="1.8" strokeLinecap="round" />
        </>
      );
    case 'ucuz': // terazi: bir kefe ağır, bir kefe hafif
      return (
        <>
          <path d="M17 43 H31 L28 38 H20Z" fill={p.f('#8b5a2b')} {...p.s('#8b5a2b')} />
          <rect x="22.6" y="9" width="2.8" height="30" rx="1.2" fill={p.f('#9aa3ad')} {...p.s('#9aa3ad')} />
          <path d="M7 15 L41 11" stroke={p.d('#9aa3ad')} strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="24" cy="9" r="3" fill={p.f('#f2b230')} {...p.s('#f2b230')} />
          <path d="M7 15 L2.5 27 M7 15 L11.5 27 M41 11 L36.5 22 M41 11 L45.5 22" stroke={p.d('#9aa3ad')} strokeWidth="0.9" />
          <path d="M1.5 27 H12.5 a5.5 4 0 0 1-11 0Z" fill={p.f('#d9a520')} {...p.s('#d9a520')} />
          <path d="M35.5 22 H46.5 a5.5 4 0 0 1-11 0Z" fill={p.f('#d9a520')} {...p.s('#d9a520')} />
          <ellipse cx="7" cy="25.6" rx="3.2" ry="1.4" fill={p.f('#e8c547')} {...p.s('#e8c547')} />
          <ellipse cx="7" cy="23.8" rx="3.2" ry="1.4" fill={p.f('#e8c547')} {...p.s('#e8c547')} />
          {p.gloss(24, 12, 4, 6)}
        </>
      );
    case 'web': // dünya ve önünde alışveriş torbası: "Zaman Bakkalı" sitesi
      return (
        <>
          <circle cx="21" cy="21" r="17" fill={p.f('#2f80ed')} {...p.s('#2f80ed')} />
          <path d="M8 13 C14 16 12 22 17 24 C21 26 19 31 22 35 M28 6 C26 11 31 13 34 15 C37 17 35 22 38 24" fill="none" stroke={p.f('#3cb371')} strokeWidth="4.5" strokeLinecap="round" opacity=".9" />
          <ellipse cx="21" cy="21" rx="7.5" ry="17" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="0.9" />
          <path d="M4 21 H38 M7 12 H35 M7 30 H35" stroke="rgba(255,255,255,.45)" strokeWidth="0.9" />
          {p.gloss(21, 11, 12, 7)}
          <path d="M25 26 H44 L42 45 H27Z" fill={p.f('#e0533d')} {...p.s('#e0533d')} />
          <path d="M30 29 V25 a4.5 4.5 0 0 1 9 0 V29" fill="none" stroke={p.d('#e0533d')} strokeWidth="2" strokeLinecap="round" />
          <text x="34.5" y="41" fontSize="10" fontWeight="900" textAnchor="middle" fontFamily="Tahoma, sans-serif" fill="#fff">
            ₺
          </text>
        </>
      );
    case 'not': // spiralli not defteri, satırlar
      return (
        <>
          <rect x="9" y="7" width="30" height="37" rx="2" fill={p.f('#fbfaf2')} {...p.s('#c9c4a8')} />
          <rect x="9" y="7" width="30" height="7" rx="2" fill={p.f('#4a90d9')} {...p.s('#4a90d9')} />
          {[16, 24, 32].map((x) => (
            <path key={x} d={`M${x} 4 v7`} stroke={p.d('#9aa3ad')} strokeWidth="2.2" strokeLinecap="round" />
          ))}
          {[20, 25, 30, 35].map((y) => (
            <path key={y} d={`M13 ${y} H${y === 35 ? 27 : 35}`} stroke={p.d('#8fb3e0')} strokeWidth="1.3" />
          ))}
          <path d="M13 40 H22" stroke="#d9534f" strokeWidth="1.3" />
          {p.gloss(24, 10, 14, 3)}
        </>
      );
    case 'saat': // duvar saati, kırmızı kasa
      return (
        <>
          <circle cx="24" cy="24" r="19" fill={p.f('#c0392b')} {...p.s('#c0392b')} />
          <circle cx="24" cy="24" r="15" fill="#fff" stroke={p.d('#c0392b')} strokeWidth="0.8" />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i * 30 * Math.PI) / 180;
            const r1 = i % 3 ? 13 : 11.5;
            return <path key={i} d={`M${24 + r1 * Math.sin(a)} ${24 - r1 * Math.cos(a)} L${24 + 14 * Math.sin(a)} ${24 - 14 * Math.cos(a)}`} stroke="#333" strokeWidth={i % 3 ? 0.8 : 1.6} />;
          })}
          <path d="M24 24 L24 14.5 M24 24 L31 27.5" stroke="#222" strokeWidth="2" strokeLinecap="round" />
          <path d="M24 24 L17 33" stroke="#c0392b" strokeWidth="0.9" />
          <circle cx="24" cy="24" r="1.8" fill="#222" />
          {p.gloss(24, 14, 13, 7)}
        </>
      );
    case 'muzik': // kompakt disk ve nota
      return (
        <>
          <circle cx="20" cy="24" r="17" fill={p.f('#c8d0dc')} {...p.s('#9aa3ad')} />
          <path d="M20 7 A17 17 0 0 1 37 24 L26 24 A6 6 0 0 0 20 18Z" fill="#ff7eb6" opacity=".45" />
          <path d="M3 24 A17 17 0 0 1 20 7 L20 18 A6 6 0 0 0 14 24Z" fill="#7ee0ff" opacity=".45" />
          <path d="M20 41 A17 17 0 0 1 3 24 L14 24 A6 6 0 0 0 20 30Z" fill="#fff07e" opacity=".45" />
          <circle cx="20" cy="24" r="5.5" fill="#fff" {...p.s('#9aa3ad')} />
          <circle cx="20" cy="24" r="2.2" fill="#666" />
          <path d="M34 10 V33" stroke={p.d('#6a3fc1')} strokeWidth="2.6" />
          <path d="M34 10 Q41 12 44 18" fill="none" stroke={p.d('#6a3fc1')} strokeWidth="2.6" strokeLinecap="round" />
          <ellipse cx="30" cy="34" rx="5" ry="3.8" fill={p.f('#6a3fc1')} {...p.s('#6a3fc1')} transform="rotate(-20 30 34)" />
          {p.gloss(18, 14, 11, 5)}
        </>
      );
    case 'karne': // kupa
      return (
        <>
          <path d="M14 7 H34 V17 a10 10 0 0 1-20 0Z" fill={p.f('#f5b82e')} {...p.s('#f5b82e')} />
          <path d="M14 10 H7 a5 6 0 0 0 7 11 M34 10 H41 a5 6 0 0 1-7 11" fill="none" stroke={p.d('#f5b82e')} strokeWidth="2.4" />
          <rect x="21.5" y="26" width="5" height="8" fill={p.f('#f5b82e')} {...p.s('#f5b82e')} />
          <rect x="14" y="34" width="20" height="8" rx="1.5" fill={p.f('#8b5a2b')} {...p.s('#8b5a2b')} />
          <text x="24" y="20" fontSize="10" fontWeight="900" textAnchor="middle" fontFamily="Tahoma, sans-serif" fill={p.d('#f5b82e')}>
            1
          </text>
          {p.gloss(21, 11, 6, 4)}
        </>
      );
    case 'gunluk': // yaprak takvim, önünde dolu sepet: "Günün Sepeti"
      return (
        <>
          <rect x="6" y="6" width="30" height="32" rx="3" fill={p.f('#fbfaf2')} {...p.s('#c9c4a8')} />
          <rect x="6" y="6" width="30" height="9" rx="3" fill={p.f('#d9443a')} {...p.s('#d9443a')} />
          <path d="M13 3 v7 M29 3 v7" stroke={p.d('#9aa3ad')} strokeWidth="2.4" strokeLinecap="round" />
          <text x="21" y="31" fontSize="14" fontWeight="900" textAnchor="middle" fontFamily="Tahoma, sans-serif" fill={p.d('#d9443a')}>
            1
          </text>
          {p.gloss(21, 9, 13, 3)}
          <path d="M22 30 H46 L42 45 H26Z" fill={p.f('#c98a3b')} {...p.s('#c98a3b')} />
          <path d="M26 30 L31 22 M42 30 L37 22" stroke={p.d('#c98a3b')} strokeWidth="2" strokeLinecap="round" />
          <circle cx="29" cy="28" r="3.5" fill={p.f('#e0533d')} {...p.s('#e0533d')} />
          <circle cx="36" cy="27" r="3" fill={p.f('#3cb371')} {...p.s('#3cb371')} />
          <path d="M27 35 H41 M28 40 H40" stroke={p.d('#c98a3b')} strokeWidth="1" />
        </>
      );
    case 'oyun': // yapboz parçası: "Dönemin Oyunu"
      return (
        <>
          <path d="M8 14 H19 a5 5 0 1 1 10 0 H40 V25 a5 5 0 1 0 0 10 V42 H8 V35 a5 5 0 1 1 0-10Z" fill={p.f('#3cb371')} {...p.s('#3cb371')} />
          <path d="M24 20 V42 M8 30 H40" stroke={p.d('#3cb371')} strokeWidth="1" strokeDasharray="2 2" />
          {p.gloss(24, 18, 14, 5)}
        </>
      );
    case 'start': // başlat düğmesinin altın sikkesi
      return (
        <>
          <circle cx="24" cy="24" r="20" fill={p.f('#e8b923')} {...p.s('#e8b923')} />
          <circle cx="24" cy="24" r="15.5" fill="none" stroke={p.d('#e8b923')} strokeWidth="1.2" strokeDasharray="2 2" />
          <text x="24" y="32" fontSize="22" fontWeight="900" textAnchor="middle" fontFamily="Tahoma, sans-serif" fill={p.d('#e8b923')}>
            ₺
          </text>
          {p.gloss(24, 14, 13, 7)}
        </>
      );
  }
}

export function AppIcon({ id, theme, size = 40 }: { id: IconId; theme: Theme; size?: number }) {
  const { p, defs, filter } = usePaint(theme);
  const body = art(id, p);
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      {defs()}
      <g filter={filter}>{body}</g>
    </svg>
  );
}
