/*
 * Kapı camından görünen köy sokağı, tek kaçış noktalı perspektifle, giriş ekranındaki mahalle
 * maketinin diliyle: ince mürekkep çevre çizgileri, toprak tonlu sıvalı cepheler ve lekeleri,
 * kiremit damlar, bacalar, yeşil panjurlar, demir korkuluklu balkon ve çamaşır ipi, çizgili tenteli
 * kahve, elektrik direği ve sarkan teller, gri beton kaldırım. Ortada ufka uzanan toprak yol, uzakta
 * minare, köy evleri ve karlı dağlar. Kapı camının koordinatlarında çizilir (x 132–318, y 190–430).
 * Gece pencereler yanar, karda damlar ve yol beyazlar.
 */

const INK = '#2a231d';
/** Mürekkep çevre çizgisi (kapı camının biriminde ≈ 1 piksel). */
const LINE = { stroke: INK, strokeWidth: 0.9, strokeLinejoin: 'round' as const };

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
  const lit = night ? '#ffd27a' : 'url(#streetGlass)';
  const roofSnow = snow ? '#f4f7f9' : undefined;
  return (
    <g>
      <defs>
        <linearGradient id="road" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={snow ? '#e3e8ec' : '#bfa47c'} />
          <stop offset="1" stopColor={snow ? '#f4f7f9' : '#a98a5f'} />
        </linearGradient>
        {/* okra sıva: ışık soldan, kaçış noktasına doğru gölgelenir */}
        <linearGradient id="whitewash" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e6c99a" />
          <stop offset="1" stopColor="#c9a874" />
        </linearGradient>
        {/* somon sıva: sağ ev gölgede */}
        <linearGradient id="stoneWall" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#e1a98f" />
          <stop offset="1" stopColor="#c48a72" />
        </linearGradient>
        <linearGradient id="streetGlass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c9dde4" />
          <stop offset="1" stopColor="#6f8f9e" />
        </linearGradient>
      </defs>

      {/* karlı uzak dağlar ve yakın tepeler: havadan soluklaşır */}
      <path d="M132 304 L162 282 L184 290 L212 258 L236 276 L262 262 L292 286 L318 278 V330 H132Z" fill="#a7b5c2" />
      <path d="M204 266 L212 258 L220 266 L214 264 L210 268 Z M256 266 L262 262 L270 270 L264 268 Z" fill="#eef2f5" />
      <path d="M132 316 Q170 298 210 310 T318 306 V330 H132Z" fill={snow ? '#dfe5ea' : '#8da585'} />
      <path d="M150 322 Q200 312 250 318 T318 316 V330 H150Z" fill={snow ? '#e8edf0' : '#7d9a6a'} />
      {/* uzak kavaklar */}
      {[196, 202, 262, 268, 274].map((x, i) => (
        <ellipse key={x} cx={x} cy={312 - (i % 2) * 2} rx="2.6" ry={9 + (i % 3)} fill={snow ? '#6f7f72' : '#56743d'} stroke={INK} strokeWidth="0.4" strokeOpacity="0.5" />
      ))}
      {/* uzaktaki köy: minare, küçük kubbe, toprak tonlu sıvalı ve kiremit damlı evler */}
      <rect x="241" y="282" width="4" height="40" fill="#ece7dc" {...LINE} strokeWidth={0.5} />
      <rect x="239.5" y="294" width="7" height="2" fill="#cfc8ba" {...LINE} strokeWidth={0.4} />
      <path d="M240.5 283 L243 268 L245.5 283 Z" fill="#7d878e" {...LINE} strokeWidth={0.5} />
      <path d="M228 322 Q234 310 240 322 Z" fill="#e2dccf" {...LINE} strokeWidth={0.5} />
      {[
        [206, 314, 10, '#e6c99a'],
        [216, 316, 8, '#d7a3a8'],
        [250, 315, 9, '#e1a98f'],
        [258, 317, 7, '#cfc3a8'],
      ].map(([x, y, w, c]) => {
        const [px, py, pw] = [x as number, y as number, w as number];
        return (
          <g key={px}>
            <rect x={px} y={py} width={pw} height={322 - py} fill={c as string} {...LINE} strokeWidth={0.5} />
            <rect x={px + 2} y={py + 2} width="2" height="2" fill={night ? '#ffd27a' : '#5b7684'} />
            <path d={`M${px - 1} ${py} L${px + pw / 2} ${py - 4} L${px + pw + 1} ${py} Z`} fill={roofSnow ?? '#b9573a'} {...LINE} strokeWidth={0.5} />
          </g>
        );
      })}

      {/* sokağın ucunda ceviz ağacı */}
      <path d="M211 324 L212 304 M212 312 l-5 -6 M212 309 l5 -5" stroke="#5b4330" strokeWidth="2.5" />
      {[
        [212, 296, 12],
        [204, 302, 8],
        [220, 301, 8],
      ].map(([x, y, r]) => (
        <circle key={x} cx={x} cy={y} r={r} fill={snow ? '#dfe6ea' : x === 212 ? '#55763d' : '#4a6834'} stroke={INK} strokeWidth="0.6" strokeOpacity="0.6" />
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
        <ellipse key={`${x}-${y}`} cx={x} cy={y} rx={r} ry={r * 0.5} fill={snow ? '#d5dde2' : '#8f7a5a'} stroke={INK} strokeWidth="0.5" strokeOpacity="0.5" />
      ))}

      {/* sol: okra sıvalı ev; sıva lekeleri, kat silmesi, panjurlu pencereler, balkon ve çamaşır */}
      <path d={`M${left(132, 1)} L${left(132, 0)} L${left(206, 0)} L${left(206, 1)} Z`} fill="url(#whitewash)" />
      <path d={quad(left, 136, 150, 0.56, 0.74)} fill="#b8925e" opacity="0.35" />
      <path d={quad(left, 176, 190, 0.08, 0.2)} fill="#b8925e" opacity="0.3" />
      <path d={`M${left(132, 0.55)} L${left(206, 0.55)}`} stroke="#f1dfbd" strokeWidth="2" />
      <path d={`M${left(132, 0.575)} L${left(206, 0.575)}`} stroke={INK} strokeWidth="0.5" />
      {/* taş temel */}
      <path d={`M${left(132, 0.82)} L${left(206, 0.82)} L${left(206, 1)} L${left(132, 1)} Z`} fill="#a69e91" {...LINE} />
      {[0.88, 0.94].map((v) => (
        <path key={v} d={`M${left(132, v)} L${left(206, v)}`} stroke="rgba(42,35,29,.35)" strokeWidth="0.8" />
      ))}
      {/* üst kat pencereleri: krem kasa, orta kayıt, yeşil panjur */}
      {[
        [140, 156],
        [164, 174],
      ].map(([a, b]) => (
        <g key={a}>
          <path d={quad(left, a - 4, a - 0.6, 0.18, 0.48)} fill="#5f7d55" {...LINE} strokeWidth={0.6} />
          <path d={quad(left, b + 0.6, b + 3.4, 0.18, 0.48)} fill="#5f7d55" {...LINE} strokeWidth={0.6} />
          <path d={quad(left, a, b, 0.18, 0.48)} fill="#f3ead6" {...LINE} />
          <path d={quad(left, a + 1.2, b - 1.2, 0.21, 0.45)} fill={lit} />
          <path d={`M${left((a + b) / 2, 0.18)} L${left((a + b) / 2, 0.48)}`} stroke="#f3ead6" strokeWidth="1.2" />
        </g>
      ))}
      {/* zemin kat: ahşap kapı ve küçük pencere */}
      <path d={quad(left, 182, 192, 0.62, 1)} fill="#6e4a2e" {...LINE} />
      <path d={quad(left, 184, 190, 0.66, 0.78)} fill={lit} />
      <path d={quad(left, 196, 202, 0.62, 0.78)} fill="#f3ead6" {...LINE} />
      <path d={quad(left, 196.8, 201.2, 0.64, 0.76)} fill={lit} />
      {/* balkon: beton döşeme, demir korkuluk, çamaşır ipi */}
      <path d={`M${left(158, 0.5)} L${left(180, 0.5)} L${left(180, 0.54)} L${left(158, 0.54)} Z`} fill="#b39a74" {...LINE} strokeWidth={0.6} />
      <path d={`M${left(158, 0.36)} L${left(180, 0.36)}`} stroke={INK} strokeWidth="0.7" />
      {Array.from({ length: 12 }, (_, k) => 158 + k * 2).map((x) => (
        <path key={x} d={`M${left(x, 0.36)} L${left(x, 0.5)}`} stroke={INK} strokeWidth="0.5" />
      ))}
      <path d={`M${left(136, 0.06)} Q${left(152, 0.14)} ${left(170, 0.07)}`} stroke="#6b645a" strokeWidth="0.6" fill="none" />
      {!snow &&
        ['#c94a3a', '#f3ead6', '#3b6894', '#e6b62f'].map((c, k) => {
          const x = 142 + k * 7;
          return <path key={c} d={quad(left, x, x + 4, 0.09, k % 2 ? 0.17 : 0.2)} fill={c} {...LINE} strokeWidth={0.4} />;
        })}
      {/* saçak ve kiremit dam, baca ve çanak anten */}
      <path d={quad(left, 150, 158, -0.46, -0.1)} fill="#c9a874" {...LINE} />
      <path d={quad(left, 149, 159, -0.5, -0.44)} fill="#6f665c" {...LINE} strokeWidth={0.6} />
      <path d={quad(left, 132, 210, -0.22, 0)} fill={roofSnow ?? '#b9573a'} {...LINE} />
      {[-0.06, -0.12, -0.17].map((v) => (
        <path key={v} d={`M${left(132, v)} L${left(210, v)}`} stroke="rgba(60,20,10,.35)" strokeWidth="0.7" />
      ))}
      {[140, 148, 156, 164, 172, 180, 188, 196, 204].map((x) => (
        <path key={x} d={`M${left(x, -0.22)} L${left(x, 0)}`} stroke="rgba(60,20,10,.18)" strokeWidth="0.6" />
      ))}
      <path d={`M${left(132, 0)} L${left(208, 0)}`} stroke="#efe6d4" strokeWidth="2.4" />
      <path d={`M${left(132, 0.02)} L${left(208, 0.02)}`} stroke={INK} strokeWidth="0.6" />
      <g transform={`translate(${left(184, -0.16)})`}>
        <ellipse rx="3.2" ry="4" fill="#ece8e0" {...LINE} strokeWidth={0.6} transform="rotate(-20)" />
        <path d="M0 0 L4 -1.6" stroke={INK} strokeWidth="0.5" />
      </g>
      {/* çevre çizgisi: kalın mürekkep */}
      <path d={`M${left(132, 1)} L${left(132, 0)} L${left(206, 0)} L${left(206, 1)} Z`} fill="none" stroke={INK} strokeWidth="1.3" />
      {/* beton kaldırım: plakalar ve bordür */}
      <path d={`M132 430 L${left(132, 1)} L${VX - 5} ${VY} L146 430 Z`} fill={snow ? '#eef2f5' : '#bdb6aa'} />
      {!snow &&
        [0.2, 0.4, 0.6, 0.8].map((t) => {
          const x = 146 + (VX - 5 - 146) * t;
          return <path key={t} d={`M${x} ${430 - (430 - VY) * t} L${132 + (206 - 132) * t * 0.95} ${430 - (430 - VY - 30) * t}`} stroke="rgba(42,35,29,.35)" strokeWidth="0.6" />;
        })}
      <path d={`M146 430 L${VX - 5} ${VY}`} stroke={INK} strokeWidth="1.1" />
      {/* duvar dibinde saksıda sardunya */}
      <rect x="160" y="352" width="10" height="9" fill="#b65a3a" {...LINE} strokeWidth={0.6} />
      <circle cx="163" cy="349" r="4" fill="#5e8a4e" {...LINE} strokeWidth={0.5} />
      <circle cx="168" cy="348" r="3" fill="#d4544a" {...LINE} strokeWidth={0.5} />

      {/* sağ: somon sıvalı ev; zeminde çizgili tenteli kahve, üstte panjurlu pencereler */}
      <path d={`M${right(318, 1)} L${right(318, 0)} L${right(244, 0)} L${right(244, 1)} Z`} fill="url(#stoneWall)" />
      <path d={quad(right, 312, 296, 0.06, 0.18)} fill="#a8705a" opacity="0.3" />
      <path d={`M${right(318, 0.55)} L${right(244, 0.55)}`} stroke="#f0cdb8" strokeWidth="2" />
      <path d={`M${right(318, 0.575)} L${right(244, 0.575)}`} stroke={INK} strokeWidth="0.5" />
      {[
        [300, 284],
        [270, 260],
      ].map(([a, b]) => (
        <g key={a}>
          <path d={quad(right, a + 3.6, a + 0.6, 0.18, 0.48)} fill="#5f7d55" {...LINE} strokeWidth={0.6} />
          <path d={quad(right, b - 0.6, b - 3, 0.18, 0.48)} fill="#5f7d55" {...LINE} strokeWidth={0.6} />
          <path d={quad(right, a, b, 0.18, 0.48)} fill="#f3ead6" {...LINE} />
          <path d={quad(right, a - 1.2, b + 1.2, 0.21, 0.45)} fill={lit} />
          <path d={`M${right((a + b) / 2, 0.18)} L${right((a + b) / 2, 0.48)}`} stroke="#f3ead6" strokeWidth="1.2" />
        </g>
      ))}
      {/* kahvenin vitrini, tabelası ve tentesi */}
      <path d={quad(right, 314, 252, 0.7, 1)} fill="#3a3431" {...LINE} />
      <path d={quad(right, 310, 280, 0.74, 0.96)} fill={lit} opacity="0.9" />
      <path d={quad(right, 274, 258, 0.72, 1)} fill="#6e4a2e" {...LINE} strokeWidth={0.6} />
      <path d={quad(right, 316, 250, 0.58, 0.64)} fill="#fbf6ea" {...LINE} />
      <path d={quad(right, 316, 250, 0.64, 0.72)} fill="#fbf6ea" {...LINE} />
      {Array.from({ length: 11 }, (_, k) => 316 - k * 6).map((x) => (
        <path key={x} d={quad(right, x, x - 3, 0.64, 0.72)} fill="#2f6b4f" />
      ))}
      <path d={quad(right, 316, 250, 0.64, 0.72)} fill="none" {...LINE} />
      {/* kiremit dam ve baca */}
      <path d={quad(right, 288, 280, -0.44, -0.1)} fill="#c48a72" {...LINE} />
      <path d={quad(right, 289, 279, -0.48, -0.42)} fill="#6f665c" {...LINE} strokeWidth={0.6} />
      <path d={quad(right, 318, 240, -0.22, 0)} fill={roofSnow ?? '#b9573a'} {...LINE} />
      {[-0.06, -0.12, -0.17].map((v) => (
        <path key={v} d={`M${right(318, v)} L${right(240, v)}`} stroke="rgba(60,20,10,.35)" strokeWidth="0.7" />
      ))}
      {[310, 302, 294, 286, 278, 270, 262, 254, 246].map((x) => (
        <path key={x} d={`M${right(x, -0.22)} L${right(x, 0)}`} stroke="rgba(60,20,10,.18)" strokeWidth="0.6" />
      ))}
      <path d={`M${right(318, 0)} L${right(242, 0)}`} stroke="#efe6d4" strokeWidth="2.4" />
      <path d={`M${right(318, 0.02)} L${right(242, 0.02)}`} stroke={INK} strokeWidth="0.6" />
      {/* yağmur borusu */}
      <path d={`M${right(246, 0.02)} L${right(246, 1)}`} stroke="#8f8a80" strokeWidth="1.6" />
      <path d={`M${right(318, 1)} L${right(318, 0)} L${right(244, 0)} L${right(244, 1)} Z`} fill="none" stroke={INK} strokeWidth="1.3" />
      <path d={`M318 430 L${right(318, 1)} L${VX + 5} ${VY} L310 430 Z`} fill={snow ? '#eef2f5' : '#a69e91'} />
      <path d={`M310 430 L${VX + 5} ${VY}`} stroke={INK} strokeWidth="1.1" />

      {/* ahşap elektrik direği, travers ve izolatörler; teller sarkar */}
      <path d="M296 430 L293 236 L297 236 L300 430 Z" fill="#7a5a3c" {...LINE} />
      <rect x="284" y="244" width="22" height="3.2" fill="#6a4c32" {...LINE} />
      {[287, 303].map((x) => (
        <circle key={x} cx={x} cy="243" r="1.3" fill="#e9e4da" {...LINE} strokeWidth={0.4} />
      ))}
      <rect x="292" y="282" width="7" height="9" fill="#8f949a" {...LINE} />
      <path d={`M287 243 Q250 280 ${VX - 2} ${VY - 18} M303 243 Q262 282 ${VX + 3} ${VY - 16}`} stroke={INK} strokeOpacity="0.7" strokeWidth="0.7" fill="none" />
      <path d="M287 243 Q220 262 132 248" stroke={INK} strokeOpacity="0.7" strokeWidth="0.7" fill="none" />

      {/* yol kenarında otlar */}
      {!snow &&
        [150, 158, 300, 306].map((x) => <path key={x} d={`M${x} 430 l-3 -9 M${x} 430 l0 -11 M${x} 430 l3 -8`} stroke="#5f7f3e" strokeWidth="1.5" />)}
    </g>
  );
}
