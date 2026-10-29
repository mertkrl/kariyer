import styles from './ShopScene.module.css';

/*
 * Dükkânın küçük eşyaları: rafın üstündeki radyo, saksı, asılı biber ve sarımsak dizileri ve
 * tezgâhtaki uyuyan kedi. Sahneyle aynı koordinatlarda çizilir.
 */

/** Tezgâhın üst kenarı: müşteri bunun arkasında kalır. */
export const COUNTER_Y = 690;

/** Rafın üstündeki radyo, dolabın üstündeki saksı, kapı yanında asılı biber ve sarımsak dizileri. */
export function Extras() {
  return (
    <g>
      {/* eski tip lambalı radyo: ahşap kasa, kumaş hoparlör, skala, iki düğme */}
      <g transform="translate(560 56)">
        <ellipse cx="0" cy="0" rx="66" ry="5" fill="rgba(0,0,0,.35)" />
        <path d="M70 -60 L96 -108" stroke="#8a8f93" strokeWidth="3" />
        <rect x="-64" y="-62" width="128" height="62" rx="12" fill="url(#post)" />
        <rect x="-60" y="-58" width="120" height="54" rx="9" fill="#8b5a2b" />
        <rect x="-52" y="-50" width="60" height="38" rx="5" fill="#cdb48a" />
        {Array.from({ length: 24 }, (_, i) => (
          <circle key={i} cx={-46 + (i % 8) * 7} cy={-43 + Math.floor(i / 8) * 9} r="1.6" fill="#8a7550" />
        ))}
        <rect x="14" y="-50" width="38" height="14" rx="2" fill="#f2e6c2" />
        <path d="M18 -43 h30" stroke="#a88b54" strokeWidth="1" />
        <rect x="30" y="-49" width="2" height="12" fill="#c0392b" />
        <circle cx="22" cy="-22" r="7" fill="#3d2a17" stroke="#c9a227" strokeWidth="1.5" />
        <circle cx="44" cy="-22" r="7" fill="#3d2a17" stroke="#c9a227" strokeWidth="1.5" />
      </g>
      {/* saksıda sardunya */}
      <g transform="translate(1440 150)">
        <path d="M-26 0 L-20 -40 H20 L26 0 Z" fill="#b5653a" />
        <rect x="-24" y="-46" width="48" height="8" rx="2" fill="#c77447" />
        {[-24, -6, 12, 26].map((x, i) => (
          <ellipse key={x} cx={x} cy={-62 - (i % 2) * 14} rx="16" ry="11" fill={i % 2 ? '#4f7d3a' : '#5d8f45'} />
        ))}
        {[-14, 10, 22].map((x) => (
          <circle key={x} cx={x} cy={-84} r="7" fill="#d6453b" />
        ))}
      </g>
      {/* kurutulmuş biber ve sarımsak dizileri */}
      {[
        { x: 400, n: 9, c: '#b3261e', r: 7 },
        { x: 430, n: 7, c: '#efe6d2', r: 10 },
      ].map(({ x, n, c, r }) => (
        <g key={x}>
          <path d={`M${x} -180 V${-180 + n * 18 + 160}`} stroke="#8a6a3a" strokeWidth="2" />
          {Array.from({ length: n }, (_, i) => (
            <ellipse key={i} cx={x + (i % 2 ? 5 : -5)} cy={-20 + i * 18} rx={r} ry={r * 1.4} fill={c} stroke="rgba(0,0,0,.15)" />
          ))}
        </g>
      ))}
    </g>
  );
}

const FUR = '#de9149';
const STRIPE = '#a85a22';
const CREAM = '#f7dcbc';
const PINK = '#e7a19b';

/**
 * Tezgâhtaki tekir kedi: turuncu tüyde koyu çizgiler, krem göğüs ve ağız, pembe burun ve kulak içi,
 * bıyıklar. Hep uyur: sola bakan bir yumak gibi kıvrılır, kuyruğu önüne dolanır, ucu ara sıra
 * kıpırdar. Okşanınca mırlar.
 */
export function Cat({ onPet }: { onPet?: () => void }) {
  return (
    <g transform={`translate(300 ${COUNTER_Y})`} className={styles.cat} onClick={onPet} role="button" aria-label="Kediyi okşa">
      <defs>
        <radialGradient id="catFur" cx=".45" cy=".3" r=".8">
          <stop offset="0" stopColor="#f0ab63" />
          <stop offset=".65" stopColor={FUR} />
          <stop offset="1" stopColor="#b86f30" />
        </radialGradient>
      </defs>
      <ellipse cx="0" cy="2" rx="70" ry="8" fill="rgba(0,0,0,.25)" />
      <g>
        {/* kıvrılmış gövde */}
        <path d="M-40 0 C-62 0 -68 -30 -50 -44 C-30 -60 22 -64 46 -48 C66 -36 68 -8 54 0 Z" fill="url(#catFur)" />
        {[-12, 4, 20, 35].map((x, i) => (
          <path key={x} d={`M${x} ${-58 + Math.abs(i - 1.5) * 3} q${7 - i} 14 ${3 - i} ${28 - i * 2}`} stroke={STRIPE} strokeWidth="4.5" fill="none" strokeLinecap="round" opacity=".75" />
        ))}
        <path d="M-30 -2 C-10 4 30 4 50 -2" stroke="rgba(120,60,20,.35)" strokeWidth="6" fill="none" />
        {/* kuyruk gövdenin önüne dolanır; ucu ara sıra kıpırdar */}
        <path d="M52 -6 C46 8 -10 10 -40 4" stroke={FUR} strokeWidth="12" fill="none" strokeLinecap="round" />
        {[30, 12, -6].map((x) => (
          <path key={x} d={`M${x} 0 v10`} stroke={STRIPE} strokeWidth="3.5" strokeLinecap="round" />
        ))}
        <path className={styles.tail} d="M-38 4 C-46 2 -52 4 -56 0" stroke={STRIPE} strokeWidth="11" fill="none" strokeLinecap="round" />
        {/* patilere dayanmış baş */}
        <ellipse cx="-60" cy="-5" rx="10" ry="5" fill={CREAM} />
        <ellipse cx="-42" cy="-4" rx="9" ry="5" fill={CREAM} />
        <g transform="translate(-50 -28)">
          <path d="M-22 -8 L-20 -34 L-4 -18 Z M6 -19 L20 -33 L22 -6 Z" fill={FUR} />
          <path d="M-18 -12 L-17 -28 L-8 -18 Z M9 -18 L18 -28 L18 -10 Z" fill={PINK} />
          <path d="M-26 6 C-28 -10 -16 -22 0 -22 C16 -22 28 -10 26 6 C22 16 10 20 0 20 C-10 20 -22 16 -26 6 Z" fill="url(#catFur)" />
          <path d="M-7 -20 v8 M0 -21 v10 M7 -20 v8 M-19 -4 h-6 M19 -4 h6" stroke={STRIPE} strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="0" cy="10" rx="10" ry="7" fill={CREAM} />
          <path d="M-15 -1 q5 4 10 0 M5 -1 q5 4 10 0" stroke="#4a2a10" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M-3 6 h6 l-3 3.5 Z" fill="#d97f7f" />
          <path d="M-7 10 l-22 -3 M-7 12 l-22 3 M7 10 l22 -3 M7 12 l22 3" stroke="rgba(255,255,255,.85)" strokeWidth="1" />
        </g>
        <text x="-30" y="-66" fontSize="20" fill="rgba(60,40,20,.5)" className={styles.zzz} fontFamily="var(--font-mono)">
          z
        </text>
      </g>
    </g>
  );
}
