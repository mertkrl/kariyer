import type { ReactNode } from 'react';
import type { Mood } from './data';
import { FIT } from './ShopScene';
import styles from './ShopScene.module.css';

/*
 * Müşteri çizimleri: dükkân sahnesiyle aynı koordinatlarda (1600×900) çizilir, böylece her ekran
 * boyutunda tezgâhın arkasında doğru yerde durur. Ayakları x=0, y=900'dedir; tezgâh belden
 * aşağısını örter. Yüz ifadesi tepkiye göre değişir.
 */

export type Face = Mood | 'ask';

const SKIN: Record<string, string> = { teyze: '#e9bf9f', muhtar: '#ddb08d', ciftci: '#c99470', turist: '#f1d0b4', cocuk: '#f3c9a6' };
const INK = '#2b211b';

/** Yüz: iki nokta göz, tek çizgi ağız; kaş yalnızca duygu gerekince. */
function FaceParts({ face }: { face: Face }) {
  const mouth = {
    ask: 'M-12 24 q12 6 24 0',
    happy: 'M-16 20 q16 18 32 0',
    grumble: 'M-12 28 h24',
    counter: 'M-12 28 q12 -2 24 -8',
    leave: 'M-14 30 q14 -12 28 0',
  }[face];
  const brow = { grumble: 'M-30 -22 l16 4 M14 -18 l16 -4', counter: 'M-30 -22 h16 M14 -30 l16 -4', leave: 'M-30 -28 l18 8 M12 -20 l18 -8' }[face as string];
  return (
    <g stroke={INK} strokeWidth="5" strokeLinecap="round" fill="none">
      {face === 'happy' ? (
        <path d="M-26 -4 q6 -7 12 0 M14 -4 q6 -7 12 0" />
      ) : (
        <g fill={INK} stroke="none">
          <circle cx="-20" cy="-4" r="5" />
          <circle cx="20" cy="-4" r="5" />
        </g>
      )}
      {brow && <path d={brow} />}
      <path d={mouth} />
    </g>
  );
}

/** Tipine göre tek bir ayırt edici parça: başörtüsü, bıyık, kasket, güneş gözlüğü, şapka. */
function Accessory({ type }: { type: string }) {
  switch (type) {
    case 'teyze':
      return <path d="M-62 30 Q-66 -70 0 -70 Q66 -70 62 30 Q54 -30 0 -36 Q-54 -30 -62 30 Z" fill="#c46b6b" />;
    case 'muhtar':
      return (
        <g fill="#d6d6d6">
          <path d="M-54 -8 Q-56 -44 -36 -50 V-10 Z M54 -8 Q56 -44 36 -50 V-10 Z" />
          <path d="M-26 14 Q0 4 26 14 Q12 22 0 16 Q-12 22 -26 14 Z" />
        </g>
      );
    case 'ciftci':
      return <path d="M-56 -20 Q-54 -66 0 -66 Q54 -66 56 -20 H80 Q74 -10 -56 -14 Z" fill="#5a6650" />;
    case 'turist':
      return <rect x="-38" y="-50" width="76" height="16" rx="8" fill={INK} />;
    case 'cocuk':
      return <path d="M-52 -20 Q-50 -64 0 -64 Q50 -64 52 -20 Z M-52 -22 H-86 Q-80 -32 -50 -32 Z" fill="#e0b13a" />;
    default:
      return null;
  }
}

function Person({ type, face, color }: { type: string; face: Face; color: string }) {
  const kid = type === 'cocuk';
  const skin = SKIN[type] ?? '#e0b08a';
  // tezgâh y=690'da: baş tezgâhın biraz üstünde, gövde kısa ve geniş; eller tezgâhın üstünde
  return (
    <g transform={`translate(0 ${kid ? -150 : -230}) scale(${kid ? 0.82 : 1})`}>
      <path d="M-84 200 V-20 Q-84 -70 -34 -70 H34 Q84 -70 84 -20 V200 Z" fill={color} />
      <path d="M-18 -70 L0 -50 L18 -70 Z" fill="rgba(255,255,255,.55)" />
      <rect x="-14" y="-90" width="28" height="24" fill={skin} />
      <g transform="translate(0 -138)">
        <circle r="54" fill={skin} />
        <FaceParts face={face} />
        <Accessory type={type} />
      </g>
    </g>
  );
}

/** Tezgâha dayanmış iki el: gövdeden ayrı çizilir, tezgâhın önünde kalır. */
function Hands({ type, color }: { type: string; color: string }) {
  const skin = SKIN[type] ?? '#e0b08a';
  const w = type === 'cocuk' ? 52 : 62;
  return (
    <g>
      {[-1, 1].map((d) => (
        <g key={d}>
          <path d={`M${d * (w + 20)} -60 Q${d * (w + 26)} -20 ${d * w} -6 L${d * (w - 26)} -10 Q${d * (w - 6)} -30 ${d * (w - 4)} -60 Z`} fill={color} />
          <ellipse cx={d * (w - 14)} cy="-6" rx="18" ry="11" fill={skin} />
        </g>
      ))}
    </g>
  );
}

/**
 * Sahnedeki müşteri: kapının önünden (x≈230) tezgâhın ortasına (x≈800) yürür; giderken kapıya
 * döner. Konuşma balonu tezgâha varınca belirir.
 */
export function Customer({ type, color, face, state, name, line, lineKey, reply }: { type: string; color: string; face: Face; state: 'enter' | 'leave'; name: string; line: ReactNode; lineKey: string; reply: boolean }) {
  return (
    <svg className={styles.layer} viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="false">
      <g transform={FIT}>
      <g className={`${styles.walker} ${styles[state]}`}>
        <g transform="translate(800 690)">
          <g className={styles.bob}>
            <Person type={type} face={face} color={color} />
          </g>
          <Hands type={type} color={color} />
          <g transform={`translate(-60 ${type === 'cocuk' ? -345 : -470})`}>
            <rect x="10" y="2" width="100" height="26" rx="13" fill="rgba(255,255,255,.88)" />
            <text x="60" y="20" textAnchor="middle" fontSize="14" fontWeight="700" fill="#333" fontFamily="var(--font-body)">
              {name}
            </text>
          </g>
        </g>
      </g>
      </g>
      <foreignObject x="900" y="330" width="460" height="220">
        <div key={lineKey} className={`${styles.bubble} ${reply ? styles.reply : ''}`} aria-live="polite">
          {line}
        </div>
      </foreignObject>
    </svg>
  );
}
