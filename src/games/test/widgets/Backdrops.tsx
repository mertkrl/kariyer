/*
 * Görüntülü görüşme sorusunun arka plan çizimleri: düz SVG, görsel dosyası yok. Hepsi 16:9 bir
 * sahne çizer ve kutuyu doldurur (slice); küçük önizlemelerde de aynısı kullanılır.
 */

const svgProps = { viewBox: '0 0 320 180', preserveAspectRatio: 'xMidYMid slice', width: '100%', height: '100%', 'aria-hidden': true } as const;

/** Salon: perdeli pencere, tablo, kanepe, lamba, bitki ve köşede kurumaya asılmış çamaşırlar. */
export function LivingRoom() {
  return (
    <svg {...svgProps}>
      <defs>
        <linearGradient id="bd-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#efe3d0" />
          <stop offset="1" stopColor="#e2d1b8" />
        </linearGradient>
        <linearGradient id="bd-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8cc8f0" />
          <stop offset="1" stopColor="#d8eefa" />
        </linearGradient>
        <linearGradient id="bd-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b98a5e" />
          <stop offset="1" stopColor="#9c7048" />
        </linearGradient>
        <radialGradient id="bd-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff3c4" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff3c4" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="320" height="180" fill="url(#bd-wall)" />
      {/* süpürgelik ve parke */}
      <rect y="132" width="320" height="48" fill="url(#bd-floor)" />
      {[0, 40, 80, 120, 160, 200, 240, 280].map((x) => (
        <line key={x} x1={x} y1="132" x2={x - 14} y2="180" stroke="#8a613d" strokeWidth="0.8" opacity="0.5" />
      ))}
      <rect y="128" width="320" height="5" fill="#f6eee2" />
      {/* pencere ve perdeler */}
      <rect x="22" y="20" width="78" height="72" rx="2" fill="#fff" />
      <rect x="26" y="24" width="70" height="64" fill="url(#bd-sky)" />
      <ellipse cx="50" cy="44" rx="12" ry="5" fill="#fff" opacity="0.9" />
      <ellipse cx="60" cy="41" rx="9" ry="5" fill="#fff" opacity="0.9" />
      <path d="M26 74 Q45 62 61 70 T96 66 V88 H26Z" fill="#9fc89a" />
      <line x1="61" y1="24" x2="61" y2="88" stroke="#fff" strokeWidth="2.5" />
      <line x1="26" y1="56" x2="96" y2="56" stroke="#fff" strokeWidth="2.5" />
      <rect x="14" y="14" width="96" height="4" rx="2" fill="#7a5a3e" />
      <path d="M16 18 Q24 54 18 100 H32 Q30 56 34 18Z" fill="#c9705a" />
      <path d="M90 18 Q94 56 92 100 H106 Q100 54 108 18Z" fill="#c9705a" />
      {/* duvardaki tablo */}
      <rect x="150" y="28" width="58" height="40" rx="2" fill="#6b4a32" />
      <rect x="154" y="32" width="50" height="32" fill="#f3e9d8" />
      <path d="M154 64 L170 44 L182 56 L192 46 L204 60 V64Z" fill="#7da48e" />
      <circle cx="194" cy="40" r="4" fill="#e9b44c" />
      {/* halı */}
      <ellipse cx="160" cy="160" rx="96" ry="14" fill="#a8574b" opacity="0.8" />
      <ellipse cx="160" cy="160" rx="80" ry="10" fill="none" stroke="#e8c39e" strokeWidth="1.5" opacity="0.7" />
      {/* kanepe */}
      <rect x="112" y="86" width="116" height="34" rx="10" fill="#4f7a68" />
      <rect x="104" y="104" width="132" height="30" rx="8" fill="#5b8b76" />
      <rect x="98" y="98" width="18" height="38" rx="8" fill="#4a7362" />
      <rect x="224" y="98" width="18" height="38" rx="8" fill="#4a7362" />
      <rect x="122" y="92" width="30" height="22" rx="6" fill="#e9b44c" transform="rotate(-6 137 103)" />
      <rect x="188" y="92" width="30" height="22" rx="6" fill="#d98a6a" transform="rotate(5 203 103)" />
      <rect x="112" y="134" width="5" height="6" fill="#3a2a1e" />
      <rect x="223" y="134" width="5" height="6" fill="#3a2a1e" />
      {/* ayaklı lamba */}
      <circle cx="262" cy="56" r="34" fill="url(#bd-glow)" />
      <line x1="262" y1="62" x2="262" y2="130" stroke="#3a3530" strokeWidth="2.5" />
      <ellipse cx="262" cy="131" rx="10" ry="3" fill="#3a3530" />
      <path d="M248 62 L252 42 H272 L276 62Z" fill="#f4e2b8" />
      {/* bitki */}
      <path d="M70 128 L74 112 H92 L96 128Z" fill="#c4683f" />
      {[
        [83, 112, -40],
        [83, 112, -10],
        [83, 112, 20],
        [83, 112, 50],
        [83, 112, -70],
      ].map(([x, y, r], i) => (
        <ellipse key={i} cx={x} cy={y - 14} rx="5" ry="15" fill={i % 2 ? '#4f8a52' : '#3f7a44'} transform={`rotate(${r} ${x} ${y})`} />
      ))}
      {/* çamaşırlık: gün ortası toplantısının gerçek kahramanı */}
      <line x1="282" y1="96" x2="312" y2="96" stroke="#b9bec4" strokeWidth="2" />
      <line x1="284" y1="96" x2="278" y2="134" stroke="#b9bec4" strokeWidth="2" />
      <line x1="310" y1="96" x2="316" y2="134" stroke="#b9bec4" strokeWidth="2" />
      <path d="M286 96 h10 v16 h-3 v-8 h-4 v8 h-3z" fill="#6a9fd8" />
      <path d="M298 96 h5 v12 q0 4 4 4 v3 h-6 q-3 0 -3 -4z" fill="#e05b6b" />
      <rect x="305" y="96" width="5" height="10" fill="#f2d16b" />
    </svg>
  );
}

/** Kitaplık: dört raf, boyu ve rengi değişen kitaplar, yaslanmış birkaç kitap ve süsler. */
const BOOK_COLORS = ['#8c2f39', '#2e5e8a', '#d4a72c', '#3e7a4f', '#6c4a8a', '#c96b2c', '#1f3b4d', '#a8a29e', '#b23a48', '#4c7f7a'];

/** `gap`: süs için boş bırakılan aralık [başlangıç, bitiş]. */
function shelfBooks(seed: number, y: number, gap?: [number, number]) {
  const books: { x: number; w: number; h: number; c: string; lean?: boolean }[] = [];
  let x = 14;
  let n = seed;
  while (x < 300) {
    if (gap && x + 12 > gap[0] && x < gap[1]) {
      x = gap[1];
      continue;
    }
    n = (n * 9301 + 49297) % 233280;
    const r = n / 233280;
    const w = 5 + Math.floor(r * 7);
    const h = 26 + Math.floor(((r * 7) % 1) * 10);
    books.push({ x, w, h, c: BOOK_COLORS[Math.floor(r * 100) % BOOK_COLORS.length], lean: r > 0.84 });
    x += w + 1;
  }
  return books.map((b, i) => (
    <g key={i} transform={b.lean ? `rotate(14 ${b.x} ${y})` : undefined}>
      <rect x={b.x} y={y - b.h} width={b.w} height={b.h} fill={b.c} />
      <rect x={b.x} y={y - b.h + 4} width={b.w} height="1.5" fill="#fff" opacity="0.35" />
      <rect x={b.x} y={y - 7} width={b.w} height="1.5" fill="#fff" opacity="0.25" />
    </g>
  ));
}

export function Bookshelf() {
  const shelves = [48, 90, 132, 174];
  const gaps: ([number, number] | undefined)[] = [undefined, [106, 136], [224, 252], [170, 200]];
  return (
    <svg {...svgProps}>
      <rect width="320" height="180" fill="#3b2a1d" />
      <rect x="6" y="4" width="308" height="176" fill="#4a3424" />
      {shelves.map((y, i) => (
        <g key={y}>
          <rect x="10" y={y - 40} width="300" height="40" fill="#2c1f15" opacity="0.55" />
          {shelfBooks(i * 37 + 11, y, gaps[i])}
          <rect x="6" y={y} width="308" height="5" fill="#6b4a32" />
          <rect x="6" y={y + 5} width="308" height="1.5" fill="#24180f" opacity="0.6" />
        </g>
      ))}
      {/* süsler: küçük bir küre, kupa, bitki */}
      <circle cx="120" cy="77" r="9" fill="#5b8fb8" />
      <path d="M113 74 q7 -6 14 0 M112 79 q8 4 16 0" stroke="#3f7a44" strokeWidth="2" fill="none" />
      <rect x="117" y="86" width="6" height="4" fill="#c9a227" />
      <path d="M230 116 h14 l-2 10 h-10z" fill="#c9a227" />
      <rect x="235" y="126" width="4" height="4" fill="#c9a227" />
      <rect x="231" y="130" width="12" height="2" fill="#8a6d1a" />
      <path d="M176 168 l3 -10 h10 l3 10z" fill="#c4683f" />
      <ellipse cx="184" cy="152" rx="3" ry="8" fill="#3f7a44" transform="rotate(-25 184 158)" />
      <ellipse cx="184" cy="152" rx="3" ry="8" fill="#4f8a52" transform="rotate(25 184 158)" />
    </svg>
  );
}

/** Şirket logosu: desenli kurumsal zemin, ortada dev logo ve slogan. */
export function CompanyLogo() {
  return (
    <svg {...svgProps}>
      <defs>
        <linearGradient id="bd-corp" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1f4c99" />
          <stop offset="1" stopColor="#3f8fd8" />
        </linearGradient>
        <pattern id="bd-dots" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(-20)">
          <circle cx="13" cy="13" r="5" fill="none" stroke="#fff" strokeOpacity="0.1" strokeWidth="1.5" />
        </pattern>
      </defs>
      <rect width="320" height="180" fill="url(#bd-corp)" />
      <rect width="320" height="180" fill="url(#bd-dots)" />
      <rect y="150" width="320" height="30" fill="#000" opacity="0.12" />
      <circle cx="106" cy="86" r="22" fill="none" stroke="#fff" strokeWidth="6" />
      <circle cx="106" cy="86" r="9" fill="#fff" />
      <text x="138" y="96" fill="#fff" fontSize="30" fontWeight="800" fontFamily="system-ui, sans-serif" letterSpacing="-1">
        UyumMetre
      </text>
      <text x="160" y="170" fill="#fff" fillOpacity="0.85" fontSize="11" textAnchor="middle" fontFamily="system-ui, sans-serif" letterSpacing="2">
        BİZ BİR AİLEYİZ.
      </text>
    </svg>
  );
}
