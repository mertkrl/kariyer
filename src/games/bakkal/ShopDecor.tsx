import styles from './ShopScene.module.css';

/*
 * Dükkânın küçük eşyaları: rafın üstündeki radyo, saksı, asılı biber ve sarımsak dizileri ve
 * tezgâhtaki kedi. Sahneyle aynı koordinatlarda çizilir.
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

/** Tezgâhtaki kedi: uyurken kuyruğu sallanır; uyanınca kalkar. Okşanınca mırlar. */
export function Cat({ awake, onPet }: { awake: boolean; onPet?: () => void }) {
  return (
    <g transform={`translate(1190 ${COUNTER_Y})`} className={styles.cat} onClick={onPet} role="button" aria-label="Kediyi okşa">
      <ellipse cx="0" cy="2" rx="62" ry="8" fill="rgba(0,0,0,.22)" />
      {awake ? (
        <g className={styles.catUp}>
          <path className={styles.tail} d="M44 -40 Q84 -50 76 -96" stroke="#d98c3f" strokeWidth="12" fill="none" strokeLinecap="round" />
          <rect x="-34" y="-34" width="10" height="34" rx="5" fill="#d98c3f" />
          <rect x="20" y="-34" width="10" height="34" rx="5" fill="#d98c3f" />
          <ellipse cx="0" cy="-50" rx="50" ry="24" fill="#e39a4f" />
          <circle cx="-46" cy="-72" r="22" fill="#e39a4f" />
          <path d="M-64 -86 L-62 -106 L-50 -92 Z M-42 -92 L-32 -106 L-28 -86 Z" fill="#e39a4f" />
          <circle cx="-54" cy="-74" r="3.5" fill="#2b4a1a" />
          <circle cx="-38" cy="-74" r="3.5" fill="#2b4a1a" />
        </g>
      ) : (
        <g>
          <path className={styles.tail} d="M48 -8 Q86 -10 80 -40" stroke="#d98c3f" strokeWidth="12" fill="none" strokeLinecap="round" />
          <ellipse cx="6" cy="-24" rx="54" ry="26" fill="#e39a4f" />
          <path d="M-20 -46 q10 -6 20 0 M10 -48 q10 -6 20 0" stroke="#c97a30" strokeWidth="5" fill="none" />
          <circle cx="-40" cy="-30" r="22" fill="#e39a4f" />
          <path d="M-58 -44 L-56 -64 L-44 -50 Z M-36 -50 L-26 -64 L-22 -44 Z" fill="#e39a4f" />
          <path d="M-50 -30 q4 3 8 0 M-36 -30 q4 3 8 0" stroke="#5a3a1a" strokeWidth="2.5" fill="none" />
          <text x="-10" y="-62" fontSize="20" fill="rgba(60,40,20,.5)" className={styles.zzz} fontFamily="var(--font-mono)">
            z
          </text>
        </g>
      )}
    </g>
  );
}

