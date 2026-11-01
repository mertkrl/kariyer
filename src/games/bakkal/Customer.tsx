import type { ReactNode } from 'react';
import type { Look, Mood } from './data';
import { FIT } from './ShopScene';
import styles from './ShopScene.module.css';

/*
 * Müşteri çizimleri: dükkân sahnesiyle aynı koordinatlarda (1600×900) çizilir, böylece her ekran
 * boyutunda tezgâhın arkasında doğru yerde durur. Ayakları x=0, y=900'dedir; tezgâh belden
 * aşağısını örter. Yüz ifadesi tepkiye göre değişir; başörtüsü, şapka, gözlük, bıyık ve sakal köylünün
 * kendi görünüşündendir.
 */

/** Yüz: istek, tepkiler; kelepire sevinç (delight) ve akıl almaz fiyata şok (shock) tepkiden türer. */
export type Face = Mood | 'ask' | 'delight' | 'shock';

const SKIN: Record<string, string> = { teyze: '#e9bf9f', muhtar: '#ddb08d', ciftci: '#c99470', turist: '#f1d0b4', cocuk: '#f3c9a6', genc: '#e6b893', ogretmen: '#efc6a4', coban: '#b98260', gelin: '#f0c8a8', emekli: '#dcae8c' };
const INK = '#2b211b';

/** Yüz: iki nokta göz, tek çizgi ağız; kaş yalnızca duygu gerekince. Sevinçte yanaklar kızarır, şokta gözler büyür. */
function FaceParts({ face }: { face: Face }) {
  const mouth = {
    ask: 'M-12 24 q12 6 24 0',
    happy: 'M-16 20 q16 18 32 0',
    delight: 'M-20 16 q20 26 40 0 Z',
    grumble: 'M-12 28 h24',
    counter: 'M-12 28 q12 -2 24 -8',
    leave: 'M-14 30 q14 -12 28 0',
    shock: '',
  }[face];
  const brow = {
    grumble: 'M-30 -22 l16 4 M14 -18 l16 -4',
    counter: 'M-30 -22 h16 M14 -30 l16 -4',
    leave: 'M-30 -28 l18 8 M12 -20 l18 -8',
    shock: 'M-32 -30 q10 -8 20 0 M12 -30 q10 -8 20 0',
    delight: 'M-30 -24 q8 -6 16 0 M14 -24 q8 -6 16 0',
  }[face as string];
  return (
    <g className={styles.face} key={face} stroke={INK} strokeWidth="5" strokeLinecap="round" fill="none">
      {face === 'delight' && (
        <g fill="#f28b82" stroke="none" opacity=".55">
          <ellipse cx="-30" cy="12" rx="10" ry="6" />
          <ellipse cx="30" cy="12" rx="10" ry="6" />
        </g>
      )}
      {face === 'happy' || face === 'delight' ? (
        <path d="M-26 -4 q6 -7 12 0 M14 -4 q6 -7 12 0" />
      ) : face === 'shock' ? (
        <g fill="#fff" strokeWidth="3.5">
          <circle cx="-20" cy="-6" r="10" />
          <circle cx="20" cy="-6" r="10" />
          <circle cx="-20" cy="-6" r="3.5" fill={INK} stroke="none" />
          <circle cx="20" cy="-6" r="3.5" fill={INK} stroke="none" />
        </g>
      ) : (
        <g fill={INK} stroke="none">
          <circle cx="-20" cy="-4" r="5" />
          <circle cx="20" cy="-4" r="5" />
        </g>
      )}
      {brow && <path d={brow} />}
      {face === 'shock' ? <ellipse cx="0" cy="28" rx="9" ry="12" fill={INK} stroke="none" /> : <path d={mouth} fill={face === 'delight' ? '#7a2e2e' : 'none'} />}
    </g>
  );
}

/** Baş örtüsü, şapka ve saç: köylünün kendi görünüşünden. Başörtüsü ve şapka saçı örter. */
function Headwear({ look }: { look: Look }) {
  if (look.scarf)
    return (
      <g fill={look.scarf}>
        <path d="M-62 30 Q-66 -70 0 -70 Q66 -70 62 30 Q54 -30 0 -36 Q-54 -30 -62 30 Z" />
        <path d="M-60 26 Q-40 66 0 62 Q40 66 60 26 Q44 50 0 52 Q-44 50 -60 26 Z" />
        <path d="M-40 -46 Q0 -60 40 -46" stroke="rgba(0,0,0,.12)" strokeWidth="3" fill="none" />
      </g>
    );
  const hair = look.hair && (
    <path d="M-54 -6 Q-58 -62 0 -62 Q58 -62 54 -6 Q46 -34 10 -40 Q-30 -44 -54 -6 Z" fill={look.hair} />
  );
  const c = look.hatColor ?? '#444';
  switch (look.hat) {
    case 'kasket':
      return <path d="M-56 -20 Q-54 -68 0 -68 Q54 -68 56 -20 H80 Q74 -10 -56 -14 Z" fill={c} />;
    case 'takke':
      return (
        <g>
          {hair}
          <path d="M-44 -34 Q-44 -64 0 -64 Q44 -64 44 -34 Z" fill={c} />
          <path d="M-40 -40 H40" stroke="rgba(0,0,0,.1)" strokeWidth="2" strokeDasharray="4 3" />
        </g>
      );
    case 'bere':
      return (
        <g fill={c}>
          <path d="M-54 -16 Q-56 -76 0 -76 Q56 -76 54 -16 Z" />
          <rect x="-56" y="-26" width="112" height="14" rx="6" fill="rgba(0,0,0,.18)" />
          <circle cy="-80" r="10" fill="#f3efe6" />
        </g>
      );
    case 'sapka':
      return (
        <g fill={c}>
          <ellipse cy="-30" rx="86" ry="13" />
          <path d="M-42 -32 Q-40 -82 0 -82 Q40 -82 42 -32 Z" />
          <rect x="-42" y="-44" width="84" height="8" fill="rgba(0,0,0,.25)" />
        </g>
      );
    case 'kep':
      return (
        <g>
          {hair}
          <path d="M-52 -20 Q-50 -66 0 -66 Q50 -66 52 -20 Z M-52 -22 H-88 Q-82 -32 -50 -32 Z" fill={c} />
        </g>
      );
    default:
      return hair || null;
  }
}

/** Gözlük, bıyık, sakal: yüzün üstünde. */
function FaceExtras({ look }: { look: Partial<Look> }) {
  return (
    <g>
      {look.beard && <path d="M-52 2 Q-50 56 0 60 Q50 56 52 2 Q44 32 14 34 Q0 30 -14 34 Q-44 32 -52 2 Z" fill={look.beard} />}
      {look.mustache && <path d="M-26 14 Q0 4 26 14 Q12 22 0 16 Q-12 22 -26 14 Z" fill={look.mustache} />}
      {look.glasses && (
        <g stroke="#3a3330" strokeWidth="3" fill="rgba(255,255,255,.12)">
          <circle cx="-20" cy="-4" r="13" />
          <circle cx="20" cy="-4" r="13" />
          <path d="M-7 -6 Q0 -10 7 -6 M-33 -6 L-52 -10 M33 -6 L52 -10" fill="none" />
        </g>
      )}
      {look.sunglasses && (
        <g fill="#1b1b1f">
          <rect x="-38" y="-16" width="30" height="20" rx="8" />
          <rect x="8" y="-16" width="30" height="20" rx="8" />
          <path d="M-8 -8 H8" stroke="#1b1b1f" strokeWidth="3" />
          <path d="M-32 -12 l8 0" stroke="rgba(255,255,255,.35)" strokeWidth="2" />
        </g>
      )}
    </g>
  );
}

function Person({ type, face, look }: { type: string; face: Face; look: Look }) {
  const kid = type === 'cocuk';
  const skin = look.skin ?? SKIN[type] ?? '#e0b08a';
  // tezgâh y=690'da: baş tezgâhın biraz üstünde, gövde kısa ve geniş; eller tezgâhın üstünde
  return (
    <g transform={`translate(0 ${kid ? -178 : -230}) scale(${kid ? 0.82 : 1})`}>
      <path d="M-84 200 V-20 Q-84 -70 -34 -70 H34 Q84 -70 84 -20 V200 Z" fill={look.outfit} />
      <path d="M-18 -70 L0 -50 L18 -70 Z" fill="rgba(255,255,255,.55)" />
      {/* uzun saç omuzlara dökülür */}
      {look.long && !look.scarf && <path d="M-56 -176 Q-84 -110 -78 -36 Q-64 -24 -48 -40 L48 -40 Q64 -24 78 -36 Q84 -110 56 -176 Z" fill={look.hair} />}
      <rect x="-14" y="-90" width="28" height="24" fill={skin} />
      <g transform="translate(0 -138)">
        <circle r="54" fill={skin} />
        <FaceExtras look={{ beard: look.beard }} />
        <FaceParts face={face} />
        <FaceExtras look={{ mustache: look.mustache, glasses: look.glasses, sunglasses: look.sunglasses }} />
        <Headwear look={look} />
      </g>
    </g>
  );
}

/** Tezgâha dayanmış iki el: gövdeden ayrı çizilir, tezgâhın önünde kalır. */
function Hands({ type, look }: { type: string; look: Look }) {
  const skin = look.skin ?? SKIN[type] ?? '#e0b08a';
  const color = look.outfit;
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
export function Customer({ type, look, face, state, name, line, lineKey, reply }: { type: string; look: Look; face: Face; state: 'enter' | 'leave'; name: string; line: ReactNode; lineKey: string; reply: boolean }) {
  // ad etiketi ada göre uzar: "Üniversiteli Kerem" sığsın
  const tag = Math.max(100, name.length * 8.4 + 22);
  return (
    <svg className={styles.layer} viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="false">
      <g transform={FIT}>
      <g className={`${styles.walker} ${styles[state]}`}>
        <g transform="translate(800 690)">
          <g className={styles.bob}>
            <Person type={type} face={face} look={look} />
          </g>
          <Hands type={type} look={look} />
          <g transform={`translate(-60 ${type === 'cocuk' ? -373 : -470})`}>
            <rect x={60 - tag / 2} y="2" width={tag} height="26" rx="13" fill="rgba(255,255,255,.88)" />
            <text x="60" y="20" textAnchor="middle" fontSize="14" fontWeight="700" fill="#333" fontFamily="var(--font-body)">
              {name}
            </text>
          </g>
        </g>
      </g>
      </g>
      <foreignObject x="900" y="330" width="460" height="220">
        <div key={lineKey} data-tour="bubble" className={`${styles.bubble} ${reply ? styles.reply : ''}`} aria-live="polite">
          {line}
        </div>
      </foreignObject>
    </svg>
  );
}
