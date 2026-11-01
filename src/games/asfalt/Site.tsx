import { H, ROAD, ROLLER_W, W, type VehicleKind, type Weather } from './model';

/*
 * Şantiyenin dekoru, dünyayla aynı koordinatlarda (320 × 135): arkada apartmanlar ve kırık
 * kaldırım, yolun altında toprağın kesiti; önde silindir ve trafiğe açılınca geçen araba.
 */

/** Sokağın iki ucu: genişleyen sahnenin kenarlarına eklenen apartmanlar. */
const BLOCKS = [
  { x: -36, w: 38, top: 28, color: '#cbb9a2' },
  { x: 4, w: 40, top: 22, color: '#d9c7a8' },
  { x: 46, w: 34, top: 34, color: '#c9b5a0' },
  { x: 82, w: 46, top: 16, color: '#e2d5bf' },
  { x: 130, w: 30, top: 30, color: '#cdb9a6' },
  { x: 162, w: 42, top: 20, color: '#d6c2a0' },
  { x: 206, w: 32, top: 36, color: '#c4b29c' },
  { x: 240, w: 36, top: 24, color: '#dccab0' },
];

export function Backdrop({ rain, weather = rain ? 'rain' : 'sun' }: { rain: boolean; weather?: Weather }) {
  const sky = weather === 'snow' ? ['#c3cad2', '#e4e8ec'] : weather === 'rain' ? ['#8d98a3', '#b9bec2'] : ['#a9cfe6', '#e6efe9'];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="asfalt-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[0]} />
          <stop offset="1" stopColor={sky[1]} />
        </linearGradient>
      </defs>
      <rect width={W} height={ROAD} fill="url(#asfalt-sky)" />
      {/* dekor eski 240'lık sahnenin koordinatlarında çizilir, genişleyen sahnenin ortasına kayar */}
      <g transform={`translate(${(W - 240) / 2} 0)`}>
      {BLOCKS.map((b) => (
        <g key={b.x}>
          <rect x={b.x} y={b.top} width={b.w} height={72 - b.top} fill={b.color} />
          <rect x={b.x - 1} y={b.top - 2} width={b.w + 2} height="2" fill="rgba(0,0,0,.12)" />
          {Array.from({ length: Math.floor((64 - b.top) / 9) }, (_, r) =>
            Array.from({ length: Math.floor((b.w - 4) / 8) }, (_, c) => <rect key={`${r}-${c}`} x={b.x + 4 + c * 8} y={b.top + 5 + r * 9} width="4" height="5" fill="rgba(60,70,80,.35)" />),
          )}
          {/* balkon korkulukları */}
          {Array.from({ length: Math.floor((64 - b.top) / 9) }, (_, r) => (
            <rect key={r} x={b.x + 2} y={b.top + 10 + r * 9} width={b.w - 4} height="1" fill="rgba(0,0,0,.14)" />
          ))}
        </g>
      ))}
      {/* karşı kaldırım: taşların yarısı oynamış */}
      <rect x={-(W - 240) / 2} y="72" width={W} height="6" fill="#b8b0a2" />
      {Array.from({ length: Math.ceil(W / 8) }, (_, k) => k - 5).map((k) => (
        <rect key={k} x={k * 8 + 0.5} y={k % 3 === 0 ? 72.6 : 72} width="7" height="5.5" fill={k % 5 === 2 ? '#9e968a' : '#c6beb0'} transform={k % 7 === 3 ? `rotate(${k % 2 ? 6 : -5} ${k * 8 + 4} 75)` : undefined} />
      ))}
      <rect x={-(W - 240) / 2} y="77.5" width={W} height="2.5" fill="#8c867c" />
      {/* direk, tabela, dubalar */}
      <rect x="190" y="38" width="1.6" height="34" fill="#5d6166" />
      <rect x="186" y="37" width="10" height="2" rx="1" fill="#5d6166" />
      <g transform="translate(150 58)">
        <rect x="-0.6" y="4" width="1.2" height="14" fill="#5d6166" />
        <path d="M0 -4 L7 8 L-7 8 Z" fill="#e8b000" stroke="#a83a24" strokeWidth="1.4" strokeLinejoin="round" />
        <rect x="-0.9" y="0" width="1.8" height="4.5" fill="#222" />
      </g>
      {[60, 176].map((x) => (
        <g key={x} transform={`translate(${x} 70)`}>
          <path d="M-3 8 L-1.2 0 L1.2 0 L3 8 Z" fill="#e2622b" />
          <rect x="-1.9" y="3" width="3.8" height="1.4" fill="#fff" />
        </g>
      ))}
      {/* muhtar: eller arkada, kasket */}
      <g transform="translate(24 52)">
        <rect x="-3.5" y="6" width="7" height="12" rx="3" fill="#5a5146" />
        <rect x="-2.6" y="17" width="2.2" height="5" fill="#3b352e" />
        <rect x="0.4" y="17" width="2.2" height="5" fill="#3b352e" />
        <circle cx="0" cy="3" r="3.2" fill="#e0b896" />
        <rect x="-3.6" y="-0.4" width="7.2" height="2" rx="1" fill="#3f3a33" />
        <rect x="-1.6" y="4.6" width="3.2" height="0.8" fill="#9a9a9a" />
      </g>
      </g>
      {/* yolun altındaki toprak kesiti: çukurun içinden görünür */}
      <rect x="0" y={ROAD} width={W} height={H - ROAD} fill="#3e2e22" />
    </svg>
  );
}

/** Silindir: `y` tamburun oturduğu yüzey; çukurun içinde çalışırken aşağı iner. */
/** Silindir; `vibe` açıkken tambur titrer ve altında titreşim çizgileri görünür. */
export function RollerSprite({ x, y, vibe = false }: { x: number; y: number; vibe?: boolean }) {
  const r = 5.5;
  return (
    <g transform={`translate(${x} ${y - ROAD})`}>
      {vibe && (
        <g stroke="rgba(255,255,255,.7)" strokeWidth="0.35" fill="none">
          <path d={`M-1.5 ${ROAD - 7} q-1 1 0 2 q1 1 0 2`} />
          <path d={`M${ROLLER_W + 1.5} ${ROAD - 7} q1 1 0 2 q-1 1 0 2`} />
        </g>
      )}
      {/* kabin */}
      <rect x="4" y={ROAD - 25} width="9" height="2" rx="1" fill="#2d2d2d" />
      <rect x="5" y={ROAD - 23} width="1" height="8" fill="#2d2d2d" />
      <rect x="11" y={ROAD - 23} width="1" height="8" fill="#2d2d2d" />
      <circle cx="8.5" cy={ROAD - 17.5} r="1.8" fill="#e0b896" />
      <rect x="2" y={ROAD - 15} width="13" height="5" rx="1.2" fill="#e6a813" />
      {/* tambur */}
      <rect x="0" y={ROAD - 2 * r} width={ROLLER_W} height={2 * r} rx={r} fill="#6f7377" />
      <rect x="1" y={ROAD - 2 * r + 1} width={ROLLER_W - 2} height="2" rx="1" fill="rgba(255,255,255,.25)" />
      <circle cx={ROLLER_W / 2} cy={ROAD - r} r="1.6" fill="#e6a813" />
    </g>
  );
}

/** Araçların ölçüsü (hücre): boy, iki tekerin soldan yeri, gövde yüksekliği, teker yarıçapı. */
export const VEHICLE: Record<VehicleKind, { len: number; wheels: [number, number]; h: number; r: number }> = {
  car: { len: 20, wheels: [4, 16], h: 7, r: 2.2 },
  dolmus: { len: 26, wheels: [5, 21], h: 12, r: 2.6 },
  bus: { len: 42, wheels: [8, 34], h: 15, r: 3 },
  truck: { len: 36, wheels: [6, 29], h: 14, r: 3 },
};

/** Yolun profili üstünde ilerleyen araç: iki tekeri profile oturur, gövde aradaki eğime yatar. */
export function CarSprite({ x, kind = 'dolmus', profile, shake }: { x: number; kind?: VehicleKind; profile: number[]; shake: number }) {
  const v = VEHICLE[kind];
  // teker altındaki en yüksek nokta: çukur tekerden darsa üstünden geçer, genişse içine düşer
  const ground = (cx: number) => {
    let top = H;
    for (let k = -2; k <= 2; k++) {
      const px = Math.round(cx + k);
      // sahnenin dışında yol düz devam eder
      top = Math.min(top, px >= 0 && px < W ? profile[px] : ROAD);
    }
    return top;
  };
  const [w1, w2] = v.wheels;
  const a = ground(x + w1);
  const b = ground(x + w2);
  const angle = (Math.atan2(b - a, w2 - w1) * 180) / Math.PI;
  const y = (a + b) / 2 - v.r + shake;
  const half = v.len / 2;
  const wheels = [w1 - half, w2 - half];
  return (
    <g transform={`translate(${x + half} ${y}) rotate(${angle})`}>
      {kind === 'dolmus' && (
        <>
          <path d="M-13 -1 L-13 -6 L-9 -7 L-6 -12 L7 -12 L10 -7 L13 -6 L13 -1 Z" fill="#f2c230" />
          <rect x="-5" y="-11" width="5.5" height="4" fill="#bfd7e6" />
          <rect x="1.5" y="-11" width="5" height="4" fill="#bfd7e6" />
          <rect x="-13" y="-4.5" width="26" height="1.4" fill="#2c3a4a" />
          <text x="0" y="-13" textAnchor="middle" fontSize="2.6" fontWeight="800" fill="#2c3a4a" fontFamily="monospace">
            KADIKÖY
          </text>
        </>
      )}
      {kind === 'car' && (
        <>
          <path d="M-10 -1 L-10 -4.5 L-6 -5 L-3 -8 L4 -8 L7 -5 L10 -4 L10 -1 Z" fill="#c94a3a" />
          <rect x="-2.4" y="-7.3" width="3" height="2.4" fill="#bfd7e6" />
          <rect x="1.2" y="-7.3" width="3" height="2.4" fill="#bfd7e6" />
        </>
      )}
      {kind === 'bus' && (
        <>
          <rect x={-half} y={-v.h} width={v.len} height={v.h - 1} rx="2" fill="#2f7fc1" />
          {Array.from({ length: 6 }, (_, k) => (
            <rect key={k} x={-half + 3 + k * 6.3} y={-v.h + 2.5} width="5" height="4.5" fill="#cfe4f2" />
          ))}
          <rect x={-half} y={-5} width={v.len} height="1.4" fill="#f2f2f2" />
          <text x="0" y={-v.h - 1} textAnchor="middle" fontSize="2.6" fontWeight="800" fill="#2c3a4a" fontFamily="monospace">
            İETT
          </text>
        </>
      )}
      {kind === 'truck' && (
        <>
          <rect x={-half} y={-v.h} width={v.len - 9} height={v.h - 2} rx="1" fill="#8b8f94" />
          <rect x={-half + 2} y={-v.h + 2} width={v.len - 13} height={v.h - 6} fill="#a2a6ab" />
          <path d={`M${half - 9} -1 L${half - 9} -10 L${half - 3} -10 L${half} -5 L${half} -1 Z`} fill="#e08a2b" />
          <rect x={half - 7.5} y="-8.6" width="4" height="3" fill="#cfe4f2" />
        </>
      )}
      {wheels.map((wx) => (
        <g key={wx}>
          <circle cx={wx} cy="0" r={v.r} fill="#222" />
          <circle cx={wx} cy="0" r={v.r * 0.4} fill="#999" />
        </g>
      ))}
    </g>
  );
}
