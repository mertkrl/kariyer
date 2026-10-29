/*
 * Kapı camından görünen köy sokağı, tek kaçış noktalı perspektifle: ortada ufka uzanan toprak yol,
 * solda badanalı kerpiç ev, sağda taş ev ve elektrik direği, uzakta minare, köy evleri ve karlı
 * dağlar. Kapı camının koordinatlarında çizilir (x 132–318, y 190–430). Gece pencereler yanar,
 * karda damlar ve yol beyazlar.
 */

/** Ufuk ve kaçış noktası. */
const VX = 226;
const VY = 322;

/**
 * Sol evin duvarında (x, v) noktası: v=0 saçak çizgisi, v=1 duvar dibi; ikisi de kaçış noktasına
 * koşar. Eksi v saçağın üstüdür (dam).
 */
const left = (x: number, v: number) => {
  const top = VY - 0.78 * (VX - x);
  const base = VY + 0.5 * (VX - x);
  return `${x} ${top + (base - top) * v}`;
};
const right = (x: number, v: number) => {
  const top = VY - 0.72 * (x - VX);
  const base = VY + 0.5 * (x - VX);
  return `${x} ${top + (base - top) * v}`;
};

/** Duvar üzerindeki dörtgen (pencere, kapı): x ve v aralığından. */
const quad = (on: typeof left, x1: number, x2: number, v1: number, v2: number) => `M${on(x1, v1)} L${on(x2, v1)} L${on(x2, v2)} L${on(x1, v2)} Z`;

export function Street({ night, snow }: { night: boolean; snow: boolean }) {
  const lit = night ? '#ffd27a' : '#4d6a80';
  const roofSnow = snow ? '#f4f7f9' : undefined;
  return (
    <g>
      <defs>
        <linearGradient id="road" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={snow ? '#e3e8ec' : '#bfa47c'} />
          <stop offset="1" stopColor={snow ? '#f4f7f9' : '#a98a5f'} />
        </linearGradient>
        <linearGradient id="whitewash" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e8dfcc" />
          <stop offset="1" stopColor="#d6ccb6" />
        </linearGradient>
        <linearGradient id="stoneWall" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#b9a786" />
          <stop offset="1" stopColor="#a39073" />
        </linearGradient>
      </defs>

      {/* karlı uzak dağlar ve yakın tepeler: havadan soluklaşır */}
      <path d="M132 304 L162 282 L184 290 L212 258 L236 276 L262 262 L292 286 L318 278 V330 H132Z" fill="#a7b5c2" />
      <path d="M204 266 L212 258 L220 266 L214 264 L210 268 Z M256 266 L262 262 L270 270 L264 268 Z" fill="#eef2f5" />
      <path d="M132 316 Q170 298 210 310 T318 306 V330 H132Z" fill={snow ? '#dfe5ea' : '#8da585'} />
      <path d="M150 322 Q200 312 250 318 T318 316 V330 H150Z" fill={snow ? '#e8edf0' : '#7d9a6a'} />
      {/* uzak kavaklar */}
      {[196, 202, 262, 268, 274].map((x, i) => (
        <ellipse key={x} cx={x} cy={312 - (i % 2) * 2} rx="2.6" ry={9 + (i % 3)} fill={snow ? '#6f7f72' : '#56743d'} />
      ))}
      {/* uzaktaki köy: minare, küçük kubbe, kiremit damlı evler */}
      <rect x="241" y="282" width="4" height="40" fill="#ece7dc" />
      <rect x="239.5" y="294" width="7" height="2" fill="#cfc8ba" />
      <path d="M240.5 283 L243 268 L245.5 283 Z" fill="#7d878e" />
      <path d="M228 322 Q234 310 240 322 Z" fill="#e2dccf" />
      {[
        [206, 314, 10],
        [216, 316, 8],
        [250, 315, 9],
        [258, 317, 7],
      ].map(([x, y, w]) => (
        <g key={x}>
          <rect x={x} y={y} width={w} height={322 - y} fill="#e6dccb" />
          <path d={`M${x - 1} ${y} L${x + w / 2} ${y - 4} L${x + w + 1} ${y} Z`} fill={roofSnow ?? '#b5523b'} />
          {night && <rect x={x + 2} y={y + 2} width="2" height="2" fill={lit} />}
        </g>
      ))}

      {/* sokağın ucunda ceviz ağacı */}
      <path d="M211 324 L212 304 M212 312 l-5 -6 M212 309 l5 -5" stroke="#5b4330" strokeWidth="2.5" />
      {[
        [212, 296, 12],
        [204, 302, 8],
        [220, 301, 8],
      ].map(([x, y, r]) => (
        <circle key={x} cx={x} cy={y} r={r} fill={snow ? '#dfe6ea' : x === 212 ? '#55763d' : '#4a6834'} />
      ))}
      {/* toprak yol: tekerlek izleri ve taşlar */}
      <path d={`M146 430 L${VX - 5} ${VY} L${VX + 5} ${VY} L310 430 Z`} fill="url(#road)" />
      <path d={`M196 430 L${VX - 2} ${VY} M262 430 L${VX + 2} ${VY}`} stroke="rgba(110,80,45,.35)" strokeWidth="3" />
      {[
        [178, 418, 4],
        [236, 404, 3],
        [282, 424, 4.5],
        [212, 380, 2.5],
        [246, 362, 2],
      ].map(([x, y, r]) => (
        <ellipse key={`${x}-${y}`} cx={x} cy={y} rx={r} ry={r * 0.5} fill={snow ? '#d5dde2' : '#8f7a5a'} />
      ))}

      {/* sol: badanalı kerpiç ev, taş temel, ahşap kapı, mavi pencereler */}
      <path d={`M${left(132, 1)} L${left(132, 0)} L${left(206, 0)} L${left(206, 1)} Z`} fill="url(#whitewash)" />
      <path d={`M${left(132, 0.82)} L${left(206, 0.82)} L${left(206, 1)} L${left(132, 1)} Z`} fill="#a8987c" />
      {[0.86, 0.93].map((v) => (
        <path key={v} d={`M${left(132, v)} L${left(206, v)}`} stroke="rgba(80,60,40,.3)" strokeWidth="1" />
      ))}
      <path d={quad(left, 140, 156, 0.22, 0.5)} fill={lit} stroke="#2f5d8a" strokeWidth="2" />
      <path d={quad(left, 164, 174, 0.24, 0.48)} fill={lit} stroke="#2f5d8a" strokeWidth="1.6" />
      <path d={`M${left(148, 0.22)} L${left(148, 0.5)}`} stroke="#2f5d8a" strokeWidth="1.5" />
      <path d={quad(left, 182, 192, 0.42, 1)} fill="#6e4526" />
      <path d={quad(left, 196, 202, 0.3, 0.5)} fill={lit} stroke="#2f5d8a" strokeWidth="1.2" />
      {/* saçak ve kiremit dam */}
      <path d={quad(left, 132, 210, -0.22, 0)} fill={roofSnow ?? '#a8452f'} />
      {[146, 162, 178, 194].map((x) => (
        <path key={x} d={`M${left(x, -0.22)} L${left(x, 0)}`} stroke="rgba(90,30,20,.35)" strokeWidth="1.5" />
      ))}
      <path d={quad(left, 150, 158, -0.42, -0.12)} fill="#8c7b6b" />
      <path d={`M${left(132, 0)} L${left(206, 0)}`} stroke="#6b3a24" strokeWidth="3" />
      {/* kaldırım */}
      <path d={`M132 430 L${left(132, 1)} L${VX - 5} ${VY} L146 430 Z`} fill={snow ? '#eef2f5' : '#a99877'} />
      <path d={`M146 430 L${VX - 5} ${VY}`} stroke="rgba(60,45,30,.35)" strokeWidth="2" />
      {/* duvar dibinde saksıda sardunya */}
      <rect x="160" y="352" width="10" height="9" fill="#b5653a" />
      <circle cx="163" cy="349" r="4" fill="#4f7d3a" />
      <circle cx="168" cy="348" r="3" fill="#d6453b" />

      {/* sağ: taş ev, ahşap kepenkli pencereler */}
      <path d={`M${right(318, 1)} L${right(318, 0)} L${right(244, 0)} L${right(244, 1)} Z`} fill="url(#stoneWall)" />
      {[0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map((v, i) => (
        <path key={v} d={`M${right(318, v)} L${right(244, v)}`} stroke="rgba(70,55,40,.28)" strokeWidth="1" strokeDasharray={i % 2 ? '9 3' : '6 4'} />
      ))}
      <path d={quad(right, 300, 284, 0.24, 0.52)} fill={lit} stroke="#f2ead8" strokeWidth="2" />
      <path d={quad(right, 312, 302, 0.24, 0.52)} fill="#3f6b4a" />
      <path d={quad(right, 270, 260, 0.26, 0.5)} fill={lit} stroke="#f2ead8" strokeWidth="1.5" />
      <path d={quad(right, 278, 271, 0.26, 0.5)} fill="#3f6b4a" />
      <path d={quad(right, 318, 240, -0.22, 0)} fill={roofSnow ?? '#b5523b'} />
      {[306, 290, 274, 258].map((x) => (
        <path key={x} d={`M${right(x, -0.22)} L${right(x, 0)}`} stroke="rgba(90,30,20,.35)" strokeWidth="1.5" />
      ))}
      <path d={`M${right(318, 0)} L${right(244, 0)}`} stroke="#7e3523" strokeWidth="3" />
      <path d={quad(right, 288, 280, -0.4, -0.12)} fill="#8c7b6b" />
      <path d={`M318 430 L${right(318, 1)} L${VX + 5} ${VY} L310 430 Z`} fill={snow ? '#eef2f5' : '#8e8470'} />

      {/* elektrik direği ve teller */}
      <path d="M298 430 L295 236" stroke="#5b4330" strokeWidth="4" />
      <path d="M285 246 H306" stroke="#4a3626" strokeWidth="3" />
      <path d={`M287 246 Q250 280 ${VX - 2} ${VY - 18} M304 246 Q262 282 ${VX + 3} ${VY - 16}`} stroke="rgba(40,30,25,.6)" strokeWidth="1" fill="none" />
      <path d="M287 246 Q220 262 132 248" stroke="rgba(40,30,25,.6)" strokeWidth="1" fill="none" />

      {/* yol kenarında otlar */}
      {!snow &&
        [150, 158, 300, 306].map((x) => <path key={x} d={`M${x} 430 l-3 -9 M${x} 430 l0 -11 M${x} 430 l3 -8`} stroke="#5f7f3e" strokeWidth="1.5" />)}
    </g>
  );
}
