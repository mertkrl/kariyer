import { H, ROAD, ROLLER_W, W, type VehicleKind, type Weather } from './model';
import { VEHICLE } from './vehicles';
import { hash01 as hash } from '../../shared/random';
import { toneHex } from '../../shared/color';

/*
 * Şantiyenin dekoru, dünyayla aynı koordinatlarda (320 × 135), giriş ekranındaki mahalle maketinin
 * diliyle: mürekkep çevre çizgisi, toprak tonlu sıvalı cepheler, kiremit kırma çatılar, bacalar,
 * çanak antenler, yeşil panjurlar, demir korkuluklu balkonlar ve çamaşır ipleri; zemin katta bakkal,
 * döviz bürosu ve kepenk. Arkada camlı plaza ve vinç, önde elektrik direkleri ve sarkan teller.
 * Yolun altında toprağın kesiti; önde silindir ve trafiğe açılınca geçen araba.
 */

const INK = '#2a231d';
/** İnce mürekkep çizgisi (dünya biriminde; 800 piksel genişlikte ≈ 1 piksel). */
const LINE = { stroke: INK, strokeWidth: 0.35, strokeLinejoin: 'round' as const };
const FLOOR = 8.4;
const GROUND_FLOOR = 10;
/** Kaldırımın üstü: binalar buraya oturur. */
const WALK = 72;

type Shop = 'bakkal' | 'doviz' | 'kepenk' | 'kapi' | 'cay';
interface Block {
  x: number;
  w: number;
  floors: number;
  color: string;
  roof: 'tile' | 'flat' | 'slate';
  shop: Shop;
  /** Panjur rengi, yoksa panjursuz. */
  shutter?: string;
}

/** Sokağın apartmanları (eski 240'lık sahnenin koordinatları, genişleyen sahnenin ortasına kayar). */
const BLOCKS: Block[] = [
  { x: -40, w: 36, floors: 3, color: '#d9b98c', roof: 'tile', shop: 'kepenk', shutter: '#5f7d55' },
  { x: -3, w: 42, floors: 4, color: '#e1a98f', roof: 'tile', shop: 'bakkal' },
  { x: 40, w: 30, floors: 3, color: '#cfc3a8', roof: 'slate', shop: 'kapi', shutter: '#6a7f5a' },
  { x: 71, w: 44, floors: 4, color: '#e6c99a', roof: 'tile', shop: 'cay', shutter: '#5f7d55' },
  { x: 116, w: 34, floors: 4, color: '#d7a3a8', roof: 'tile', shop: 'doviz' },
  { x: 151, w: 40, floors: 4, color: '#c9b79a', roof: 'flat', shop: 'kepenk', shutter: '#7a6a4f' },
  { x: 192, w: 34, floors: 3, color: '#e4b590', roof: 'tile', shop: 'kapi', shutter: '#5f7d55' },
  { x: 227, w: 54, floors: 4, color: '#d8c6a4', roof: 'tile', shop: 'bakkal' },
];

/** #rrggbb rengini koyulaştırır (k < 0) ya da açar (k > 0). */
const tone = toneHex;

function Window({ x, y, shutter, lit, seed }: { x: number; y: number; shutter?: string; lit: boolean; seed: number }) {
  return (
    <g>
      {/* lento ve denizlik */}
      <rect x={x - 0.6} y={y - 0.9} width="5.6" height="0.8" fill="rgba(255,255,255,.35)" />
      <rect x={x} y={y} width="4.4" height="5.6" fill="#f3ead6" {...LINE} />
      <rect x={x + 0.6} y={y + 0.6} width="3.2" height="4.4" fill={lit ? 'url(#asfalt-lit)' : 'url(#asfalt-glass)'} />
      <line x1={x + 2.2} y1={y + 0.6} x2={x + 2.2} y2={y + 5} stroke="#f3ead6" strokeWidth="0.4" />
      {hash(seed) < 0.3 && <rect x={x + 0.6} y={y + 0.6} width="3.2" height="1.6" fill="#ece3d0" opacity="0.95" />}
      <rect x={x - 0.5} y={y + 5.6} width="5.4" height="0.7" fill="#eee6d4" {...LINE} strokeWidth={0.2} />
      {shutter && (
        <g fill={shutter} {...LINE} strokeWidth={0.25}>
          <rect x={x - 1.7} y={y} width="1.6" height="5.6" />
          <rect x={x + 4.5} y={y} width="1.6" height="5.6" />
        </g>
      )}
    </g>
  );
}

function Building({ b, i, snow }: { b: Block; i: number; snow: boolean }) {
  const top = WALK - GROUND_FLOOR - b.floors * FLOOR;
  const cols = Math.max(2, Math.floor((b.w - 3) / 8));
  const step = (b.w - 4) / cols;
  const right = b.x + b.w;
  return (
    <g>
      {/* cephe: sıva, sağa doğru hafif gölge, köşede kenar çizgisi */}
      <rect x={b.x} y={top} width={b.w} height={WALK - top} fill={b.color} />
      <rect x={b.x} y={top} width={b.w} height={WALK - top} fill="url(#asfalt-facade)" />
      {/* sıva lekeleri */}
      <ellipse cx={b.x + b.w * 0.3} cy={top + 8} rx={b.w * 0.18} ry="3" fill={tone(b.color, -0.12)} opacity="0.35" />
      <ellipse cx={b.x + b.w * 0.75} cy={WALK - 16} rx={b.w * 0.14} ry="4" fill={tone(b.color, -0.15)} opacity="0.3" />
      {/* kat silmeleri */}
      {Array.from({ length: b.floors }, (_, f) => (
        <rect key={f} x={b.x - 0.4} y={WALK - GROUND_FLOOR - f * FLOOR - 0.6} width={b.w + 0.8} height="0.9" fill={tone(b.color, 0.35)} {...LINE} strokeWidth={0.15} />
      ))}

      {/* pencereler ve balkonlar */}
      {Array.from({ length: b.floors }, (_, f) => {
        const y = WALK - GROUND_FLOOR - (f + 1) * FLOOR + 1.6;
        const balcony = f > 0 && (i + f) % 2 === 0;
        const bx0 = b.x + 2 + step * Math.floor((cols - 2) / 2) - 1;
        const bw = step * 2 + 2;
        return (
          <g key={f}>
            {Array.from({ length: cols }, (_, c) => (
              <Window key={c} x={b.x + 2 + step * c + (step - 4.4) / 2} y={y} shutter={b.shutter} lit={hash(i * 31 + f * 7 + c) < 0.18} seed={i * 17 + f * 5 + c} />
            ))}
            {balcony && (
              <g>
                <rect x={bx0} y={y + 6.2} width={bw} height="1" fill={tone(b.color, -0.25)} {...LINE} strokeWidth={0.25} />
                <g stroke={INK} strokeWidth="0.25">
                  <line x1={bx0} y1={y + 3.6} x2={bx0 + bw} y2={y + 3.6} />
                  {Array.from({ length: Math.floor(bw / 1.2) + 1 }, (_, k) => (
                    <line key={k} x1={bx0 + k * 1.2} y1={y + 3.6} x2={bx0 + k * 1.2} y2={y + 6.2} />
                  ))}
                </g>
                {/* saksı ya da çamaşır */}
                {hash(i + f * 3) < 0.5 ? (
                  <g>
                    <rect x={bx0 + 1} y={y + 2.4} width="1.6" height="1.2" fill="#b65a3a" {...LINE} strokeWidth={0.15} />
                    <circle cx={bx0 + 1.8} cy={y + 2} r="1" fill="#5e8a4e" />
                    <circle cx={bx0 + 2.6} cy={y + 2.3} r="0.7" fill="#d4544a" />
                  </g>
                ) : (
                  <g>
                    <path d={`M ${bx0 + 0.5} ${y + 0.6} Q ${bx0 + bw / 2} ${y + 1.4} ${bx0 + bw - 0.5} ${y + 0.6}`} stroke="#6b645a" strokeWidth="0.15" fill="none" />
                    {['#c94a3a', '#f3ead6', '#3b6894', '#e6b62f'].map((c, k) => (
                      <rect key={c} x={bx0 + 1.5 + k * (bw - 3) / 4} y={y + 0.9} width="1.4" height={k % 2 ? 1.8 : 2.4} fill={c} {...LINE} strokeWidth={0.12} />
                    ))}
                  </g>
                )}
              </g>
            )}
          </g>
        );
      })}

      {/* zemin kat: dükkân */}
      <rect x={b.x} y={WALK - GROUND_FLOOR} width={b.w} height={GROUND_FLOOR} fill={tone(b.color, -0.08)} />
      <Storefront b={b} />

      {/* klima ve çanak anten cephede */}
      {i % 3 === 1 && <rect x={right - 5} y={top + 10} width="3.4" height="2.4" fill="#ece8e0" {...LINE} strokeWidth={0.2} />}
      {/* yağmur borusu */}
      <rect x={right - 1.2} y={top + 1} width="0.8" height={WALK - top - 1} fill="#8f8a80" {...LINE} strokeWidth={0.15} />

      {/* çatı */}
      <Roof b={b} top={top} snow={snow} i={i} />

      {/* siluet: kalın mürekkep */}
      <rect x={b.x} y={top} width={b.w} height={WALK - top} fill="none" stroke={INK} strokeWidth="0.55" />
    </g>
  );
}

function Storefront({ b }: { b: Block }) {
  const y = WALK - GROUND_FLOOR;
  const cx = b.x + b.w / 2;
  if (b.shop === 'bakkal' || b.shop === 'cay') {
    const sign = b.shop === 'bakkal' ? 'BAKKAL' : 'ÇAY OCAĞI';
    const stripe = b.shop === 'bakkal' ? '#c8372d' : '#2f6b4f';
    const aw = b.w - 4;
    return (
      <g>
        {/* vitrin */}
        <rect x={b.x + 2} y={y + 3.4} width={aw} height="6.6" fill="#3a3431" {...LINE} />
        <rect x={b.x + 3} y={y + 4.6} width={aw * 0.55} height="4.4" fill="url(#asfalt-glass)" opacity="0.9" />
        <rect x={b.x + 4 + aw * 0.55} y={y + 4.6} width="3" height="5.4" fill="#6e4a2e" {...LINE} strokeWidth={0.2} />
        {/* tabela */}
        <rect x={b.x + 2} y={y + 0.3} width={aw} height="2.2" fill="#fbf6ea" {...LINE} />
        <text x={cx} y={y + 2} textAnchor="middle" fontSize="1.7" fontWeight="800" fill={stripe} fontFamily="monospace" letterSpacing="0.2">
          {sign}
        </text>
        {/* çizgili tente */}
        <g>
          <path d={`M ${b.x + 1} ${y + 2.6} L ${b.x + b.w - 1} ${y + 2.6} L ${b.x + b.w + 0.5} ${y + 5} L ${b.x - 0.5} ${y + 5} Z`} fill="#fbf6ea" {...LINE} />
          {Array.from({ length: Math.floor((b.w + 1) / 2.4) }, (_, k) => (
            <path key={k} d={`M ${b.x + 1 + k * 2.4} ${y + 2.6} h 1.2 l 0.3 2.4 h -1.2 Z`} fill={stripe} />
          ))}
          <path d={`M ${b.x - 0.5} ${y + 5} ${'q 0.6 0.9 1.2 0 '.repeat(Math.floor((b.w + 1) / 1.2))}`} fill="none" stroke={INK} strokeWidth="0.2" />
        </g>
        {/* kasalar */}
        {b.shop === 'bakkal' &&
          [0, 1, 2].map((k) => (
            <g key={k}>
              <rect x={b.x + 1.5 + k * 3.4} y={WALK - 2.4} width="3" height="2.4" fill="#c09a5e" {...LINE} strokeWidth={0.2} />
              <circle cx={b.x + 2.3 + k * 3.4} cy={WALK - 2.6} r="0.7" fill={['#e0832d', '#d4544a', '#8fb04e'][k]} />
              <circle cx={b.x + 3.6 + k * 3.4} cy={WALK - 2.6} r="0.7" fill={['#e0832d', '#d4544a', '#8fb04e'][k]} />
            </g>
          ))}
        {b.shop === 'cay' && (
          <g>
            <rect x={b.x + b.w - 8} y={WALK - 3.2} width="4" height="0.6" fill="#8b5a33" />
            <rect x={b.x + b.w - 7.6} y={WALK - 2.6} width="0.4" height="2.6" fill="#8b5a33" />
            <rect x={b.x + b.w - 4.6} y={WALK - 2.6} width="0.4" height="2.6" fill="#8b5a33" />
            <path d={`M ${b.x + b.w - 6.4} ${WALK - 4.6} h 1 l -0.15 1.4 h -0.7 Z`} fill="#c8372d" opacity="0.85" />
          </g>
        )}
      </g>
    );
  }
  if (b.shop === 'doviz') {
    return (
      <g>
        <rect x={b.x + 1.5} y={y + 0.4} width={b.w - 3} height="2.6" fill="#2d5a9a" {...LINE} />
        <text x={cx} y={y + 2.3} textAnchor="middle" fontSize="1.9" fontWeight="800" fill="#fbf6ea" fontFamily="monospace" letterSpacing="0.4">
          DÖVİZ
        </text>
        <rect x={b.x + 2} y={y + 3.6} width={b.w - 4} height="6.4" fill="url(#asfalt-glass)" {...LINE} />
        <rect x={b.x + 3.4} y={y + 4.6} width="5" height="2.6" fill="#1e2a36" {...LINE} strokeWidth={0.15} />
        <text x={b.x + 5.9} y={y + 6.3} textAnchor="middle" fontSize="1.1" fill="#7fe08a" fontFamily="monospace">
          $ € £
        </text>
        <rect x={b.x + b.w - 7} y={y + 3.6} width="3.4" height="6.4" fill="#4a6f9a" {...LINE} strokeWidth={0.2} />
      </g>
    );
  }
  if (b.shop === 'kepenk') {
    return (
      <g>
        <rect x={b.x + 2} y={y + 1.2} width={b.w * 0.6} height="8.8" fill="#9aa0a4" {...LINE} />
        {Array.from({ length: 11 }, (_, k) => (
          <line key={k} x1={b.x + 2} x2={b.x + 2 + b.w * 0.6} y1={y + 1.9 + k * 0.78} y2={y + 1.9 + k * 0.78} stroke="rgba(0,0,0,.22)" strokeWidth="0.2" />
        ))}
        {/* kepengin üstüne sprey yazı */}
        <path d={`M ${b.x + 4} ${y + 6} q 1.5 -2 3 0 t 3 0`} stroke="#2f5fa8" strokeWidth="0.4" fill="none" opacity="0.8" />
        <rect x={b.x + b.w * 0.6 + 4} y={y + 2.4} width="3.8" height="7.6" fill="#6e4a2e" {...LINE} strokeWidth={0.25} />
        <rect x={b.x + b.w * 0.6 + 4.6} y={y + 3} width="2.6" height="2.4" fill="url(#asfalt-glass)" />
      </g>
    );
  }
  // apartman kapısı: basamak, saçak, numara
  return (
    <g>
      <rect x={b.x + b.w / 2 - 3} y={y + 2.6} width="6" height="7.4" fill="#6e4a2e" {...LINE} />
      <rect x={b.x + b.w / 2 - 2.2} y={y + 3.4} width="4.4" height="3" fill="url(#asfalt-glass)" />
      <rect x={b.x + b.w / 2 - 4} y={y + 1.6} width="8" height="1" fill="#5d5650" {...LINE} strokeWidth={0.2} />
      <rect x={b.x + b.w / 2 + 3.6} y={y + 3.2} width="1.6" height="1" fill="#2d5a9a" />
      <Window x={b.x + 3} y={y + 2.4} shutter={b.shutter} lit={false} seed={b.x} />
      <Window x={b.x + b.w - 7.4} y={y + 2.4} shutter={b.shutter} lit={false} seed={b.x + 1} />
    </g>
  );
}

function Roof({ b, top, snow, i }: { b: Block; top: number; snow: boolean; i: number }) {
  const l = b.x - 1.4;
  const r = b.x + b.w + 1.4;
  if (b.roof === 'flat') {
    return (
      <g>
        <rect x={b.x - 0.6} y={top - 1.6} width={b.w + 1.2} height="1.8" fill={tone(b.color, -0.2)} {...LINE} />
        {/* su deposu ve antenler */}
        <rect x={b.x + 4} y={top - 5.4} width="6" height="3.8" rx="0.8" fill="#dcd6ca" {...LINE} strokeWidth={0.25} />
        <path d={`M ${b.x + b.w - 8} ${top - 1.6} v -7 M ${b.x + b.w - 10} ${top - 7} h 4 M ${b.x + b.w - 9.6} ${top - 5.4} h 3.2`} stroke={INK} strokeWidth="0.25" />
        {snow && <rect x={b.x - 0.6} y={top - 2.4} width={b.w + 1.2} height="0.9" rx="0.4" fill="#fbfbfb" />}
      </g>
    );
  }
  const h = Math.min(9, b.w * 0.2);
  const roof = `M ${l} ${top} L ${b.x + 5} ${top - h} L ${b.x + b.w - 5} ${top - h} L ${r} ${top} Z`;
  const fill = b.roof === 'slate' ? '#6f7a82' : '#b9573a';
  return (
    <g>
      {/* baca: çatının arkasında */}
      <rect x={b.x + b.w * 0.68} y={top - h - 3.2} width="2.6" height="5" fill={tone(b.color, -0.18)} {...LINE} strokeWidth={0.3} />
      <rect x={b.x + b.w * 0.68 - 0.4} y={top - h - 3.8} width="3.4" height="0.8" fill="#6f665c" {...LINE} strokeWidth={0.2} />
      <path d={roof} fill={fill} />
      <clipPath id={`asfalt-roof-${i}`}>
        <path d={roof} />
      </clipPath>
      <g clipPath={`url(#asfalt-roof-${i})`}>
        {/* kiremit sıraları */}
        {Array.from({ length: Math.ceil(h / 1.3) }, (_, k) => (
          <line key={k} x1={l} x2={r} y1={top - 0.6 - k * 1.3} y2={top - 0.6 - k * 1.3} stroke="rgba(60,20,10,.35)" strokeWidth="0.2" />
        ))}
        {Array.from({ length: Math.ceil((r - l) / 1.6) }, (_, k) => (
          <line key={k} x1={l + k * 1.6 + ((k % 2) * 0.8)} x2={l + k * 1.6 + ((k % 2) * 0.8)} y1={top - h} y2={top} stroke="rgba(60,20,10,.14)" strokeWidth="0.15" />
        ))}
        {/* ışık soldan: sol yarı açık */}
        <rect x={l} y={top - h} width={(r - l) * 0.45} height={h} fill="rgba(255,230,200,.12)" />
        {snow && <path d={`M ${l} ${top} L ${b.x + 5} ${top - h} L ${b.x + b.w - 5} ${top - h} L ${r} ${top} L ${r} ${top - 0.4} L ${b.x + b.w - 5} ${top - h + 1.4} L ${b.x + 5} ${top - h + 1.4} L ${l} ${top - 0.4} Z`} fill="#fbfbfb" />}
      </g>
      <path d={roof} fill="none" stroke={INK} strokeWidth="0.5" strokeLinejoin="round" />
      {/* saçak */}
      <rect x={l - 0.4} y={top - 0.4} width={r - l + 0.8} height="1" fill="#efe6d4" {...LINE} strokeWidth={0.25} />
      {/* çanak anten ve TV anteni */}
      <g transform={`translate(${b.x + b.w * 0.3} ${top - h * 0.55})`}>
        <ellipse cx="0" cy="0" rx="1.2" ry="1.5" fill="#ece8e0" {...LINE} strokeWidth={0.2} transform="rotate(-20)" />
        <line x1="0" y1="0" x2="1.4" y2="-0.6" stroke={INK} strokeWidth="0.15" />
      </g>
      {i % 2 === 0 && <path d={`M ${b.x + b.w * 0.5} ${top - h} v -5 M ${b.x + b.w * 0.5 - 2} ${top - h - 4.4} h 4 M ${b.x + b.w * 0.5 - 1.5} ${top - h - 3.2} h 3 M ${b.x + b.w * 0.5 - 1} ${top - h - 2} h 2`} stroke={INK} strokeWidth="0.2" />}
    </g>
  );
}

/** Elektrik direkleri: ahşap, travers ve izolatörler; teller aralarında sarkar. */
const POLES = [-22, 62, 146, 236];

export function Backdrop({ rain, weather = rain ? 'rain' : 'sun' }: { rain: boolean; weather?: Weather }) {
  const sky = weather === 'snow' ? ['#b9c2cc', '#e6e9ec'] : weather === 'rain' ? ['#7f8b97', '#b4b9bd'] : ['#9cc7e2', '#efe7d6'];
  const snow = weather === 'snow';
  const dim = weather !== 'sun';
  const off = (W - 240) / 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="asfalt-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[0]} />
          <stop offset="1" stopColor={sky[1]} />
        </linearGradient>
        <linearGradient id="asfalt-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c9dde4" />
          <stop offset="1" stopColor="#6f8f9e" />
        </linearGradient>
        <linearGradient id="asfalt-lit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe7a6" />
          <stop offset="1" stopColor="#efb45a" />
        </linearGradient>
        <linearGradient id="asfalt-facade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.1" />
          <stop offset="0.7" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#2a1a10" stopOpacity="0.14" />
        </linearGradient>
        <linearGradient id="asfalt-plaza" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6e93b4" />
          <stop offset="1" stopColor="#4a6f92" />
        </linearGradient>
        <pattern id="asfalt-pebbles" width="14" height="9" patternUnits="userSpaceOnUse">
          <ellipse cx="3" cy="2" rx="0.9" ry="0.5" fill="rgba(255,235,200,.12)" />
          <ellipse cx="10" cy="6" rx="0.6" ry="0.4" fill="rgba(0,0,0,.25)" />
          <ellipse cx="6" cy="7.5" rx="1.1" ry="0.6" fill="rgba(255,235,200,.08)" />
        </pattern>
      </defs>
      <rect width={W} height={ROAD} fill="url(#asfalt-sky)" />
      {/* bulutlar */}
      <g fill="#fff" opacity={dim ? 0.35 : 0.75}>
        {[
          [40, 12, 1],
          [150, 7, 0.8],
          [260, 15, 1.1],
        ].map(([x, y, k]) => (
          <g key={x} transform={`translate(${x} ${y}) scale(${k})`}>
            <ellipse cx="0" cy="0" rx="9" ry="2.6" />
            <ellipse cx="-3" cy="-1.8" rx="4" ry="2.6" />
            <ellipse cx="3" cy="-2.2" rx="4.6" ry="3" />
          </g>
        ))}
      </g>

      <g transform={`translate(${off} 0)`}>
        {/* uzakta: camlı plaza ve vinç, havanın içinde soluk */}
        <g opacity="0.55">
          <rect x="96" y="2" width="30" height="62" fill="url(#asfalt-plaza)" stroke="#3c5670" strokeWidth="0.35" />
          {Array.from({ length: 14 }, (_, k) => (
            <line key={k} x1="96" x2="126" y1={6 + k * 4.2} y2={6 + k * 4.2} stroke="rgba(255,255,255,.25)" strokeWidth="0.2" />
          ))}
          {Array.from({ length: 6 }, (_, k) => (
            <line key={k} y1="2" y2="64" x1={100 + k * 4.4} x2={100 + k * 4.4} stroke="rgba(20,40,60,.25)" strokeWidth="0.15" />
          ))}
          <rect x="104" y="-2" width="10" height="4" fill="#5d7c99" stroke="#3c5670" strokeWidth="0.3" />
          <line x1="111" y1="-2" x2="111" y2="-8" stroke="#3c5670" strokeWidth="0.25" />
          {/* vinç */}
          <g stroke="#9b4a2c" strokeWidth="0.35" fill="none">
            <path d="M 214 64 V 4 M 216.6 64 V 4" />
            {Array.from({ length: 15 }, (_, k) => (
              <path key={k} d={`M 214 ${64 - k * 4} L 216.6 ${60 - k * 4}`} />
            ))}
            <path d="M 180 4 H 250 M 180 6 H 250" />
            {Array.from({ length: 17 }, (_, k) => (
              <path key={k} d={`M ${180 + k * 4} 6 L ${182 + k * 4} 4`} />
            ))}
            <path d="M 215 -2 L 182 4 M 215 -2 L 248 4" strokeWidth="0.15" />
            <path d="M 192 6 V 26" strokeWidth="0.15" stroke="#555" />
          </g>
          <rect x="244" y="5" width="6" height="4" fill="#7a7f84" />
          <rect x="190" y="26" width="4" height="2.4" fill="#b65a3a" />
        </g>

        {BLOCKS.map((b, i) => (
          <Building key={b.x} b={b} i={i} snow={snow} />
        ))}

        {/* elektrik telleri ve direkler */}
        <g fill="none" stroke={INK} strokeWidth="0.18" opacity="0.8">
          {[0, 1.6].map((d) =>
            POLES.slice(0, -1).map((x, k) => <path key={`${d}-${x}`} d={`M ${x} ${30 + d} Q ${(x + POLES[k + 1]) / 2} ${36 + d} ${POLES[k + 1]} ${30 + d}`} />),
          )}
        </g>
        {POLES.map((x) => (
          <g key={x}>
            <rect x={x - 0.7} y="28" width="1.4" height={WALK - 28 + 1} fill="#7a5a3c" {...LINE} strokeWidth={0.25} />
            <rect x={x - 3.4} y="29.4" width="6.8" height="0.9" fill="#6a4c32" {...LINE} strokeWidth={0.2} />
            <circle cx={x - 2.8} cy="29.2" r="0.4" fill="#e9e4da" />
            <circle cx={x + 2.8} cy="29.2" r="0.4" fill="#e9e4da" />
            <rect x={x - 1.4} y="40" width="2.8" height="3.4" fill="#8f949a" {...LINE} strokeWidth={0.2} />
          </g>
        ))}

        {/* kaldırım: beton plaka, yarısı oynamış; bordür taşı */}
        <rect x={-off} y={WALK} width={W} height="6" fill="#bdb6aa" />
        {Array.from({ length: Math.ceil(W / 8) + 2 }, (_, k) => k - 6).map((k) => (
          <rect key={k} x={k * 8 + 0.4} y={k % 3 === 0 ? 72.6 : 72.2} width="7.2" height="5.2" fill={k % 5 === 2 ? '#a69e91' : '#c9c2b5'} stroke="rgba(42,35,29,.45)" strokeWidth="0.15" transform={k % 7 === 3 ? `rotate(${k % 2 ? 6 : -5} ${k * 8 + 4} 75)` : undefined} />
        ))}
        <rect x={-off} y="77.4" width={W} height="2.6" fill="#8c867c" />
        <line x1={-off} x2={W} y1="77.4" y2="77.4" stroke={INK} strokeWidth="0.3" />
        {snow && <rect x={-off} y="71.4" width={W} height="1.2" rx="0.5" fill="#f7f7f5" />}

        {/* tabela, dubalar ve ikaz şeridi */}
        <g transform="translate(150 58)">
          <rect x="-0.6" y="4" width="1.2" height="14" fill="#5d6166" {...LINE} strokeWidth={0.2} />
          <path d="M0 -4 L7 8 L-7 8 Z" fill="#e8b000" stroke="#a83a24" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M0 -4 L7 8 L-7 8 Z" fill="none" stroke={INK} strokeWidth="0.3" strokeLinejoin="round" transform="scale(1.12) translate(0 -0.4)" />
          <rect x="-0.9" y="0" width="1.8" height="4.5" fill="#222" />
        </g>
        {[60, 176].map((x) => (
          <g key={x} transform={`translate(${x} 70)`}>
            <rect x="-3.6" y="7.4" width="7.2" height="1" fill="#2d2d2d" />
            <path d="M-3 8 L-1.2 0 L1.2 0 L3 8 Z" fill="#e2622b" {...LINE} strokeWidth={0.25} />
            <rect x="-1.9" y="3" width="3.8" height="1.4" fill="#fff" />
          </g>
        ))}

        {/* muhtar: eller arkada, kasket; yanında sokak kedisi */}
        <g transform="translate(24 52)">
          <rect x="-3.5" y="6" width="7" height="12" rx="3" fill="#5a5146" {...LINE} strokeWidth={0.3} />
          <rect x="-2.6" y="17" width="2.2" height="5" fill="#3b352e" />
          <rect x="0.4" y="17" width="2.2" height="5" fill="#3b352e" />
          <circle cx="0" cy="3" r="3.2" fill="#e0b896" {...LINE} strokeWidth={0.3} />
          <path d="M -3.6 1.6 Q 0 -2.6 3.6 1.6 Z" fill="#3f3a33" {...LINE} strokeWidth={0.25} />
          <rect x="-1.6" y="4.6" width="3.2" height="0.8" fill="#9a9a9a" />
        </g>
        <g transform="translate(34 71.6)">
          <ellipse cx="0" cy="-1.2" rx="2" ry="1.2" fill="#d8893a" {...LINE} strokeWidth={0.2} />
          <circle cx="2" cy="-2.4" r="0.9" fill="#d8893a" {...LINE} strokeWidth={0.2} />
          <path d="M 1.5 -3.1 l 0.2 -0.8 l 0.4 0.6 M 2.3 -3.1 l 0.3 -0.8 l 0.3 0.7" fill="#d8893a" stroke={INK} strokeWidth="0.15" />
          <path d="M -2 -1.2 q -1.6 -0.4 -1.4 -2" fill="none" stroke="#d8893a" strokeWidth="0.5" strokeLinecap="round" />
        </g>
      </g>
      {/* yolun altındaki toprak kesiti: çukurun içinden görünür */}
      <rect x="0" y={ROAD} width={W} height={H - ROAD} fill="#3e2e22" />
      <rect x="0" y={ROAD} width={W} height={H - ROAD} fill="url(#asfalt-pebbles)" />
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
      <rect x="2" y={ROAD - 15} width="13" height="5" rx="1.2" fill="#e6a813" stroke={INK} strokeWidth="0.3" strokeLinejoin="round" />
      {/* tambur */}
      <rect x="0" y={ROAD - 2 * r} width={ROLLER_W} height={2 * r} rx={r} fill="#6f7377" stroke={INK} strokeWidth="0.3" strokeLinejoin="round" />
      <rect x="1" y={ROAD - 2 * r + 1} width={ROLLER_W - 2} height="2" rx="1" fill="rgba(255,255,255,.25)" />
      <circle cx={ROLLER_W / 2} cy={ROAD - r} r="1.6" fill="#e6a813" />
    </g>
  );
}

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
          <path d="M-13 -1 L-13 -6 L-9 -7 L-6 -12 L7 -12 L10 -7 L13 -6 L13 -1 Z" fill="#f2c230" stroke={INK} strokeWidth="0.3" strokeLinejoin="round" />
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
          <path d="M-10 -1 L-10 -4.5 L-6 -5 L-3 -8 L4 -8 L7 -5 L10 -4 L10 -1 Z" fill="#c94a3a" stroke={INK} strokeWidth="0.3" strokeLinejoin="round" />
          <rect x="-2.4" y="-7.3" width="3" height="2.4" fill="#bfd7e6" />
          <rect x="1.2" y="-7.3" width="3" height="2.4" fill="#bfd7e6" />
        </>
      )}
      {kind === 'bus' && (
        <>
          <rect x={-half} y={-v.h} width={v.len} height={v.h - 1} rx="2" fill="#2f7fc1" stroke={INK} strokeWidth="0.3" strokeLinejoin="round" />
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
          <rect x={-half} y={-v.h} width={v.len - 9} height={v.h - 2} rx="1" fill="#8b8f94" stroke={INK} strokeWidth="0.3" strokeLinejoin="round" />
          <rect x={-half + 2} y={-v.h + 2} width={v.len - 13} height={v.h - 6} fill="#a2a6ab" />
          <path d={`M${half - 9} -1 L${half - 9} -10 L${half - 3} -10 L${half} -5 L${half} -1 Z`} fill="#e08a2b" stroke={INK} strokeWidth="0.3" strokeLinejoin="round" />
          <rect x={half - 7.5} y="-8.6" width="4" height="3" fill="#cfe4f2" />
        </>
      )}
      {wheels.map((wx) => (
        <g key={wx}>
          <circle cx={wx} cy="0" r={v.r} fill="#222" stroke={INK} strokeWidth="0.3" />
          <circle cx={wx} cy="0" r={v.r * 0.4} fill="#999" />
        </g>
      ))}
    </g>
  );
}
