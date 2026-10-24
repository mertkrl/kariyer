import styles from './SalonParts.module.css';
import p from './CardPreview.module.css';

/*
 * Kartların çizimleri: düz SVG, renkler kartın üstünde yarı saydam beyaz. Durgunken bir kare;
 * kartın üstüne gelince (ya da klavyeyle odaklanınca) oyunun kendisinden kısa bir sahne döngüde
 * oynar (CardPreview.module.css). Hareket azaltılınca global CSS sahneyi durdurur.
 */

/** Sen İK'sin: masaya CV gelir, RED damgası iner, CV reddedilenler yığınına uçar; sonraki gelir. */
export function DeskArt() {
  return (
    <svg viewBox="0 0 240 120" className={`${styles.art} ${p.scene}`} aria-hidden="true">
      <rect x="20" y="96" width="200" height="6" rx="3" fill="rgba(255,255,255,.35)" />
      {/* reddedilenler yığını: solda, sahne boyunca büyür gibi durur */}
      <g className={p.pile}>
        <rect x="22" y="70" width="40" height="24" rx="3" fill="rgba(255,255,255,.35)" transform="rotate(-6 42 82)" />
        <rect x="24" y="64" width="40" height="28" rx="3" fill="rgba(255,255,255,.5)" transform="rotate(4 44 78)" />
      </g>
      <g className={p.cv}>
        <rect x="92" y="26" width="56" height="68" rx="4" fill="rgba(255,255,255,.92)" />
        <circle cx="108" cy="44" r="7" fill="rgba(0,0,0,.18)" />
        <rect x="120" y="40" width="20" height="4" rx="2" fill="rgba(0,0,0,.18)" />
        <rect x="120" y="47" width="14" height="3" rx="1.5" fill="rgba(0,0,0,.12)" />
        <rect x="100" y="60" width="40" height="3" rx="1.5" fill="rgba(0,0,0,.12)" />
        <rect x="100" y="67" width="34" height="3" rx="1.5" fill="rgba(0,0,0,.12)" />
        <rect x="100" y="74" width="38" height="3" rx="1.5" fill="rgba(0,0,0,.12)" />
        {/* damganın CV'de bıraktığı iz */}
        <g className={p.mark}>
          <rect x="100" y="52" width="40" height="18" rx="3" fill="none" stroke="#c0392b" strokeWidth="2.5" transform="rotate(-12 120 61)" />
          <text x="120" y="65" textAnchor="middle" fontSize="11" fontWeight="800" fill="#c0392b" transform="rotate(-12 120 61)" fontFamily="monospace">
            RED
          </text>
        </g>
      </g>
      {/* damga: yukarıdan iner, kalkar */}
      <g className={p.stamp}>
        <rect x="108" y="2" width="24" height="16" rx="3" fill="rgba(255,255,255,.95)" />
        <rect x="102" y="18" width="36" height="7" rx="2" fill="rgba(255,255,255,.75)" />
      </g>
      {/* durgun karede sağda bekleyen damga izi */}
      <g className={p.idleStamp}>
        <rect x="160" y="36" width="58" height="26" rx="4" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="3" transform="rotate(-12 189 49)" />
        <text x="189" y="54" textAnchor="middle" fontSize="13" fontWeight="800" fill="rgba(255,255,255,.9)" transform="rotate(-12 189 49)" fontFamily="monospace">
          RED
        </text>
      </g>
    </svg>
  );
}

/** Test: kutular sırayla işaretlenir, süre halkası erir, imleç "ZAM İSTE"ye gider, düğme kaçar. */
export function ExamArt() {
  return (
    <svg viewBox="0 0 240 120" className={`${styles.art} ${p.scene}`} aria-hidden="true">
      <rect x="24" y="18" width="120" height="84" rx="6" fill="rgba(255,255,255,.9)" />
      {[0, 1, 2].map((r) => (
        <g key={r}>
          <rect x="36" y={32 + r * 22} width="12" height="12" rx="3" fill="rgba(0,0,0,.08)" />
          <rect className={`${p.tick} ${r === 1 ? p.tickOff : ''}`} style={{ animationDelay: `${r * 0.35}s` }} x="36" y={32 + r * 22} width="12" height="12" rx="3" fill="rgba(47,111,181,.85)" />
          <rect x="56" y={35 + r * 22} width={r === 1 ? 52 : 70} height="5" rx="2.5" fill="rgba(0,0,0,.15)" />
        </g>
      ))}
      <circle cx="186" cy="44" r="24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="6" />
      <circle className={p.ring} cx="186" cy="44" r="24" fill="none" stroke="rgba(255,255,255,.95)" strokeWidth="6" strokeDasharray="151" transform="rotate(-90 186 44)" />
      <text x="186" y="48" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff" fontFamily="monospace">
        06:35
      </text>
      <g className={p.runaway}>
        <rect x="160" y="82" width="56" height="18" rx="9" fill="rgba(255,255,255,.95)" />
        <text x="188" y="94.5" textAnchor="middle" fontSize="9" fontWeight="700" fill="rgba(0,0,0,.55)">
          ZAM İSTE
        </text>
      </g>
      {/* imleç: yalnızca sahnede görünür */}
      <path className={p.cursor} d="M0 0 L0 14 L4 10 L7 17 L10 16 L7 9 L12 9 Z" fill="#fff" stroke="rgba(0,0,0,.6)" strokeWidth="1" />
    </svg>
  );
}

/** İnşaat İzleme: vinç yük taşır, katlar tek tek yükselir, çitin önünde bir amca izler. */
export function CraneArt() {
  return (
    <svg viewBox="0 0 240 120" className={`${styles.art} ${p.scene}`} aria-hidden="true">
      <rect x="20" y="100" width="200" height="4" rx="2" fill="rgba(255,255,255,.35)" />
      {/* katlar: durgunken üçü hazır, sahnede sırayla çıkar */}
      {[0, 1, 2, 3].map((k) => (
        <g key={k} className={`${p.floor} ${k === 3 ? p.floorOff : ''}`} style={{ animationDelay: `${k * 0.5}s` }}>
          <rect x="70" y={86 - k * 16} width="70" height="14" fill="rgba(255,255,255,.75)" />
          <rect x="78" y={90 - k * 16} width="12" height="6" fill="rgba(0,0,0,.18)" />
          <rect x="99" y={90 - k * 16} width="12" height="6" fill="rgba(0,0,0,.18)" />
          <rect x="120" y={90 - k * 16} width="12" height="6" fill="rgba(0,0,0,.18)" />
        </g>
      ))}
      <rect x="164" y="16" width="6" height="84" fill="rgba(255,255,255,.9)" />
      <rect x="96" y="12" width="104" height="6" fill="rgba(255,255,255,.9)" />
      <g className={p.load}>
        <line x1="120" y1="18" x2="120" y2="34" stroke="rgba(255,255,255,.9)" strokeWidth="1.5" />
        <rect x="110" y="34" width="20" height="8" fill="rgba(255,255,255,.95)" />
      </g>
      {/* izleyen amca, eller arkada */}
      <g>
        <rect x="32" y="74" width="12" height="20" rx="5" fill="rgba(255,255,255,.85)" />
        <circle cx="38" cy="68" r="6" fill="rgba(255,255,255,.95)" />
        <rect x="33" y="94" width="4" height="6" fill="rgba(255,255,255,.85)" />
        <rect x="39" y="94" width="4" height="6" fill="rgba(255,255,255,.85)" />
      </g>
      <g className={p.say}>
        <rect x="10" y="38" width="58" height="18" rx="7" fill="rgba(255,255,255,.95)" />
        <text x="39" y="50.5" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="rgba(0,0,0,.6)">
          Demir az.
        </text>
      </g>
    </svg>
  );
}

/** Köy Bakkalı: tezgâhta etiketsiz kavanozlar, fiyat balonu belirir, müşteri yüzü değişir. */
export function ShopArt() {
  return (
    <svg viewBox="0 0 240 120" className={`${styles.art} ${p.scene}`} aria-hidden="true">
      <rect x="20" y="84" width="200" height="18" rx="3" fill="rgba(255,255,255,.55)" />
      <rect x="20" y="102" width="200" height="4" rx="2" fill="rgba(255,255,255,.3)" />
      {[0, 1, 2].map((k) => (
        <g key={k}>
          <rect x={32 + k * 30} y={58} width="22" height="26" rx="4" fill="rgba(255,255,255,.8)" />
          <rect x={34 + k * 30} y={54} width="18" height="6" rx="2" fill="rgba(255,255,255,.55)" />
          <rect x={36 + k * 30} y={66} width="14" height="8" rx="1" fill="rgba(0,0,0,.12)" />
        </g>
      ))}
      <g className={p.floor} style={{ animationDelay: '0.2s' }}>
        <rect x="128" y="22" width="44" height="22" rx="11" fill="rgba(255,255,255,.95)" />
        <text x="150" y="37" textAnchor="middle" fontSize="11" fontWeight="800" fill="rgba(0,0,0,.6)" fontFamily="monospace">
          ?₺
        </text>
      </g>
      <circle cx="196" cy="56" r="18" fill="rgba(255,255,255,.9)" />
      <circle cx="190" cy="52" r="2" fill="rgba(0,0,0,.55)" />
      <circle cx="202" cy="52" r="2" fill="rgba(0,0,0,.55)" />
      <path d="M188 62 Q196 68 204 62" fill="none" stroke="rgba(0,0,0,.55)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Ekran İhalesi: duvarda eski sıra ekranı; numara değişir, yanında yeni tasarımın fırçası belirir. */
export function ScreenArt() {
  return (
    <svg viewBox="0 0 240 120" className={`${styles.art} ${p.scene}`} aria-hidden="true">
      <rect x="56" y="14" width="128" height="86" rx="5" fill="rgba(0,0,0,.28)" />
      <rect x="62" y="20" width="116" height="70" rx="2" fill="rgba(255,255,255,.92)" />
      <rect x="62" y="20" width="116" height="12" fill="rgba(0,0,0,.12)" />
      <rect x="62" y="38" width="116" height="20" fill="rgba(111,163,122,.55)" />
      <text x="72" y="53" fontSize="13" fontWeight="800" fill="rgba(0,0,0,.6)" fontFamily="monospace">
        701
      </text>
      <rect x="104" y="44" width="56" height="5" rx="2" fill="rgba(0,0,0,.25)" />
      <rect x="66" y="63" width="108" height="9" fill="rgba(0,0,0,.08)" />
      <rect x="66" y="75" width="108" height="9" fill="rgba(0,0,0,.08)" />
      <rect x="112" y="100" width="16" height="10" fill="rgba(0,0,0,.2)" />
      <g className={p.floor} style={{ animationDelay: '0.2s' }}>
        <rect x="178" y="6" width="46" height="22" rx="11" fill="rgba(255,255,255,.95)" />
        <text x="201" y="21" textAnchor="middle" fontSize="10" fontWeight="800" fill="rgba(0,0,0,.6)" fontFamily="monospace">
          702
        </text>
      </g>
    </svg>
  );
}

/** Meydan Islahı: cephelerde üst üste tabelalar; sökülür, yerine sade bir tabela şeridi gelir. */
export function FacadeArt() {
  return (
    <svg viewBox="0 0 240 120" className={`${styles.art} ${p.scene}`} aria-hidden="true">
      <rect x="20" y="104" width="200" height="4" rx="2" fill="rgba(255,255,255,.35)" />
      {[
        [30, 30, 56],
        [90, 14, 64],
        [158, 38, 52],
      ].map(([x, top, w]) => (
        <g key={x}>
          <rect x={x} y={top} width={w} height={104 - top} fill="rgba(255,255,255,.55)" />
          {Array.from({ length: Math.floor((70 - top) / 16) + 1 }, (_, i) => (
            <rect key={i} x={x + 8} y={top + 8 + i * 16} width={w - 16} height="7" fill="rgba(0,0,0,.12)" />
          ))}
          <rect x={x + 4} y="88" width={w - 8} height="16" fill="rgba(0,0,0,.18)" />
        </g>
      ))}
      <g className={p.junk}>
        <rect x="26" y="76" width="48" height="12" fill="rgba(255,235,59,.9)" />
        <rect x="58" y="44" width="34" height="22" fill="rgba(255,255,255,.95)" transform="rotate(-4 75 55)" />
        <rect x="96" y="70" width="58" height="14" fill="rgba(229,57,53,.85)" />
        <rect x="140" y="34" width="10" height="40" fill="rgba(0,51,153,.75)" />
        <rect x="166" y="60" width="36" height="22" fill="rgba(0,162,232,.8)" />
        <path d="M24 56 Q110 82 216 50" fill="none" stroke="rgba(0,0,0,.45)" strokeWidth="1.5" />
      </g>
      <g className={p.clean}>
        {[30, 90, 158].map((x, i) => (
          <rect key={x} x={x + 4} y="80" width={[56, 64, 52][i] - 8} height="7" fill="rgba(0,0,0,.4)" />
        ))}
      </g>
    </svg>
  );
}

/** Yama Ekibi: yolun kesitinde bir çukur; asfalt dökülür, çukur dolar, silindir üstünden geçer. */
export function PatchArt() {
  return (
    <svg viewBox="0 0 240 120" className={`${styles.art} ${p.scene}`} aria-hidden="true">
      <path d="M16 74 H92 L98 86 L104 98 H140 L148 86 L152 74 H224 V108 H16 Z" fill="rgba(0,0,0,.28)" />
      <path d="M16 74 H92 L96 80 H150 L152 74 H224 V68 H16 Z" fill="rgba(255,255,255,.18)" />
      <path d="M16 68 H224 V74 H152 L148 86 L140 98 H104 L98 86 L92 74 H16 Z" fill="rgba(255,255,255,.55)" />
      {[24, 50, 172, 198].map((x) => (
        <rect key={x} x={x} y="69.5" width="12" height="2" fill="rgba(255,255,255,.95)" />
      ))}
      {/* çukuru dolduran yeni asfalt */}
      <path className={p.patch} d="M92 74 L98 86 L104 98 H140 L148 86 L152 74 Z" fill="rgba(30,30,34,.85)" />
      {/* kamyon kasasından akan asfalt */}
      <rect className={p.stream} x="119" y="24" width="6" height="56" rx="3" fill="rgba(30,30,34,.7)" />
      <rect x="104" y="12" width="36" height="14" rx="3" fill="rgba(255,255,255,.85)" />
      {/* silindir */}
      <g className={p.roller}>
        <rect x="26" y="40" width="22" height="9" rx="2" fill="rgba(255,255,255,.9)" />
        <rect x="30" y="30" width="2" height="10" fill="rgba(255,255,255,.9)" />
        <rect x="42" y="30" width="2" height="10" fill="rgba(255,255,255,.9)" />
        <rect x="28" y="28" width="18" height="3" rx="1.5" fill="rgba(255,255,255,.9)" />
        <rect x="22" y="50" width="30" height="18" rx="9" fill="rgba(0,0,0,.4)" />
      </g>
    </svg>
  );
}
