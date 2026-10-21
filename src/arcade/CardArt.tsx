import styles from './ArcadeScreen.module.css';

/*
 * Kartların çizimleri: düz SVG, renkler kartın üstünde yarı saydam beyaz. Parçaların bir kısmı
 * (`data-float`) kartın üstüne gelince kıpırdar; hareket azaltılınca global CSS onları durdurur.
 */

/** İşe Alım Haftası: masaya yığılan CV'ler ve bir onay damgası. */
export function DeskArt() {
  return (
    <svg viewBox="0 0 240 120" className={styles.art} aria-hidden="true">
      <rect x="20" y="96" width="200" height="6" rx="3" fill="rgba(255,255,255,.35)" />
      <g className={styles.float1}>
        <rect x="52" y="34" width="56" height="60" rx="4" fill="rgba(255,255,255,.55)" transform="rotate(-8 80 64)" />
      </g>
      <g className={styles.float2}>
        <rect x="88" y="26" width="56" height="68" rx="4" fill="rgba(255,255,255,.9)" />
        <circle cx="104" cy="44" r="7" fill="rgba(0,0,0,.18)" />
        <rect x="116" y="40" width="20" height="4" rx="2" fill="rgba(0,0,0,.18)" />
        <rect x="116" y="47" width="14" height="3" rx="1.5" fill="rgba(0,0,0,.12)" />
        <rect x="96" y="60" width="40" height="3" rx="1.5" fill="rgba(0,0,0,.12)" />
        <rect x="96" y="67" width="34" height="3" rx="1.5" fill="rgba(0,0,0,.12)" />
        <rect x="96" y="74" width="38" height="3" rx="1.5" fill="rgba(0,0,0,.12)" />
      </g>
      <g className={styles.stampArt}>
        <rect x="150" y="36" width="58" height="26" rx="4" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="3" transform="rotate(-12 179 49)" />
        <text x="179" y="54" textAnchor="middle" fontSize="13" fontWeight="800" fill="rgba(255,255,255,.9)" transform="rotate(-12 179 49)" fontFamily="monospace">
          RED
        </text>
      </g>
    </svg>
  );
}

/** Test: işaretlenen kutucuklar, süre halkası ve kaçan bir onay düğmesi. */
export function ExamArt() {
  return (
    <svg viewBox="0 0 240 120" className={styles.art} aria-hidden="true">
      <rect x="24" y="18" width="120" height="84" rx="6" fill="rgba(255,255,255,.9)" />
      {[0, 1, 2].map((r) => (
        <g key={r}>
          <rect x="36" y={32 + r * 22} width="12" height="12" rx="3" fill={r === 1 ? 'rgba(0,0,0,.08)' : 'rgba(47,111,181,.85)'} />
          <rect x="56" y={35 + r * 22} width={r === 1 ? 52 : 70} height="5" rx="2.5" fill="rgba(0,0,0,.15)" />
        </g>
      ))}
      <g className={styles.float1}>
        <circle cx="186" cy="44" r="24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="6" />
        <circle cx="186" cy="44" r="24" fill="none" stroke="rgba(255,255,255,.95)" strokeWidth="6" strokeDasharray="100 151" transform="rotate(-90 186 44)" />
        <text x="186" y="48" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff" fontFamily="monospace">
          06:35
        </text>
      </g>
      <g className={styles.runaway}>
        <rect x="160" y="82" width="56" height="18" rx="9" fill="rgba(255,255,255,.95)" />
        <text x="188" y="94.5" textAnchor="middle" fontSize="9" fontWeight="700" fill="rgba(0,0,0,.55)">
          ZAM İSTE
        </text>
      </g>
    </svg>
  );
}

