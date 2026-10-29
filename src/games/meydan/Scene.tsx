import type { PointerEvent as ReactPointerEvent } from 'react';
import { Building } from './Facade';
import { ItemView } from './Items';
import { GROUND, H, W, topOf, type Design, type Place, type PlaceId } from './model';
import { url } from './paint';

/*
 * Meydanın çizimi: bulutlu gökyüzü, arkadaki silüet ve meydanın simgesi, binalar, cepheye
 * asılanlar, kaldırım, yol ve meydan taşı. Her şey düz SVG; gerçekçilik ışıktan gelir: soldan
 * vuran bulutlu gün ışığı, çıkıntıların altındaki gölgeler, pencere içleri, pervaz altı kirleri
 * ve bütün cepheye yayılan ince bir doku. Ortak boyalar ve dokular `SceneDefs` içindedir; her
 * SVG onu bir kez çizer. Editör aynı katmanları seçme ve sürükleme tutamaklarıyla çizer.
 */

export type Pick = { type: 'building' | 'item'; id: string };
export type DragMode = 'move' | 'resize';

export interface Interact {
  picked: Pick | null;
  onBuilding: (id: string, e: ReactPointerEvent) => void;
  onItem: (id: string, e: ReactPointerEvent, mode: DragMode) => void;
}

const PICK = '#1e88e5';
const ROAD = GROUND + 14;
const PLAZA = GROUND + 46;

export function Scene({ place, design, className, label }: { place: Place; design: Design; className?: string; label?: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={label ?? `${place.district} ${place.title}`}>
      <SceneDefs />
      <SceneLayers place={place} design={design} />
    </svg>
  );
}

export function SceneDefs() {
  return (
    <defs>
      <linearGradient id="meydan-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#4f93d6" />
        <stop offset="0.65" stopColor="#9cc6ea" />
        <stop offset="1" stopColor="#d4e6f3" />
      </linearGradient>
      <linearGradient id="meydan-glass" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0" stopColor="#b9c6cf" />
        <stop offset="0.35" stopColor="#6d808e" />
        <stop offset="1" stopColor="#2a353d" />
      </linearGradient>
      <linearGradient id="meydan-curtain" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#a9c3d6" />
        <stop offset="0.45" stopColor="#5f87a6" />
        <stop offset="0.55" stopColor="#7ea0ba" />
        <stop offset="1" stopColor="#2f526e" />
      </linearGradient>
      <linearGradient id="meydan-shop" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#5a5248" />
        <stop offset="0.5" stopColor="#33322f" />
        <stop offset="1" stopColor="#15181a" />
      </linearGradient>
      {/* cephe ışığı: üst kat biraz açık, zemine doğru kirli ve gölgeli */}
      <linearGradient id="meydan-shade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.1" />
        <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.16" />
      </linearGradient>
      <linearGradient id="meydan-side" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#fff" stopOpacity="0.07" />
        <stop offset="0.85" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.14" />
      </linearGradient>
      <linearGradient id="meydan-stain" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#000" stopOpacity="0.2" />
        <stop offset="1" stopColor="#000" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="meydan-drop" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#000" stopOpacity="0.32" />
        <stop offset="1" stopColor="#000" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="meydan-face" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
        <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.18" />
      </linearGradient>
      <radialGradient id="meydan-glow" cx="0.5" cy="0.45" r="0.6">
        <stop offset="0" stopColor="#fff" stopOpacity="0.32" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="meydan-tile" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#8a4a36" />
        <stop offset="1" stopColor="#5e2f22" />
      </linearGradient>
      <linearGradient id="meydan-asphalt" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3f4246" />
        <stop offset="1" stopColor="#55585c" />
      </linearGradient>
      <linearGradient id="meydan-flag" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#000" stopOpacity="0" />
        <stop offset="0.35" stopColor="#000" stopOpacity="0.16" />
        <stop offset="0.6" stopColor="#fff" stopOpacity="0.12" />
        <stop offset="1" stopColor="#000" stopOpacity="0.2" />
      </linearGradient>
      <linearGradient id="meydan-steel" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#8d949a" />
        <stop offset="0.4" stopColor="#eef1f3" />
        <stop offset="1" stopColor="#6c7378" />
      </linearGradient>
      <linearGradient id="meydan-car" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.6" stopColor="#e4e6e8" />
        <stop offset="1" stopColor="#b9bdc1" />
      </linearGradient>
      <pattern id="meydan-brick" width="18" height="8" patternUnits="userSpaceOnUse">
        <path d="M0 .5H18M0 4.5H18M.5 0V4M9.5 4V8" stroke="#000" strokeOpacity="0.16" strokeWidth="1" />
      </pattern>
      <pattern id="meydan-ashlar" width="40" height="12" patternUnits="userSpaceOnUse">
        <path d="M0 .5H40M20.5 0V6M.5 6V12M0 6.5H40" stroke="#000" strokeOpacity="0.09" strokeWidth="1" />
      </pattern>
      <pattern id="meydan-paving" width="36" height="14" patternUnits="userSpaceOnUse">
        <rect width="36" height="14" fill="#a7a298" />
        <path d="M0 .5H36M.5 0V7M18.5 7V14M0 7.5H36" stroke="#000" strokeOpacity="0.12" />
      </pattern>
      {/* sıva ve taşın pürüzü: bütün cepheye tek bir katman olarak serilir */}
      <filter id="meydan-grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" stitchTiles="stitch" />
        <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.36 -0.14" />
      </filter>
    </defs>
  );
}

export function SceneLayers({ place, design, interact }: { place: Place; design: Design; interact?: Interact }) {
  const picked = interact?.picked;
  const pickedItem = picked?.type === 'item' ? design.items.find((it) => it.id === picked.id) : undefined;
  const pickedBuilding = picked?.type === 'building' ? place.buildings.find((b) => b.id === picked.id) : undefined;
  return (
    <>
      <Backdrop place={place.id} />
      {place.buildings.map((b) => (
        <Building key={b.id} b={b} p={design.paints.find((p) => p.id === b.id) ?? place.original.paints[0]} onDown={interact && ((e) => interact.onBuilding(b.id, e))} />
      ))}
      {design.items.map((it) => (
        <ItemView key={it.id} it={it} onDown={interact && ((e) => interact.onItem(it.id, e, 'move'))} />
      ))}
      <Street />
      <Landmark place={place.id} />
      {pickedBuilding && <rect x={pickedBuilding.x + 1.5} y={topOf(pickedBuilding) - 58} width={pickedBuilding.w - 3} height={GROUND - topOf(pickedBuilding) + 58} fill="none" stroke={PICK} strokeWidth="3" strokeDasharray="10 6" pointerEvents="none" />}
      {pickedItem && interact && (
        <g>
          <rect x={pickedItem.x - 3} y={pickedItem.y - 3} width={pickedItem.w + 6} height={pickedItem.h + 6} fill="none" stroke={PICK} strokeWidth="2" strokeDasharray="6 4" pointerEvents="none" />
          <rect
            x={pickedItem.x + pickedItem.w - 4}
            y={pickedItem.y + pickedItem.h - 4}
            width="12"
            height="12"
            rx="2"
            fill="#fff"
            stroke={PICK}
            strokeWidth="2"
            style={{ cursor: 'nwse-resize' }}
            onPointerDown={(e) => interact.onItem(pickedItem.id, e, 'resize')}
          />
        </g>
      )}
    </>
  );
}

/* ── Arka plan ── */

function Backdrop({ place }: { place: PlaceId }) {
  return (
    <g pointerEvents="none">
      <rect width={W} height={GROUND} fill={url('sky')} />
      {/* açık havada tek tük ince bulut */}
      <path d="M150 120 Q230 70 330 104 Q380 86 420 112 Q300 128 150 120 Z" fill="#fff" opacity="0.55" />
      <path d="M760 70 Q820 50 880 66 Q930 58 960 72 Q860 82 760 70 Z" fill="#fff" opacity="0.4" />
      {/* uzaktaki şehir: pusta kaybolan bloklar */}
      {[
        [0, 300, 120],
        [110, 270, 90],
        [190, 316, 140],
        [320, 250, 110],
        [440, 286, 120],
        [560, 230, 90],
        [640, 262, 130],
        [780, 220, 100],
        [880, 250, 110],
        [980, 300, 120],
        [1090, 270, 110],
      ].map(([x, top, w]) => (
        <g key={x}>
          <rect x={x} y={top} width={w} height={GROUND - top} fill="#b9c9d6" />
          {Array.from({ length: Math.floor((GROUND - top - 20) / 22) }, (_, i) => (
            <rect key={i} x={x + 8} y={top + 10 + i * 22} width={w - 16} height="6" fill="#aabccb" />
          ))}
        </g>
      ))}
      <rect y={200} width={W} height={GROUND - 200} fill="#dbe8f1" opacity="0.35" />
      {place === 'bakirkoy' && <Trees />}
    </g>
  );
}

/** İstasyonun ve dükkânların ardındaki selviler ve çınarlar. */
function Trees() {
  return (
    <g>
      {[
        [40, 300, 16],
        [72, 270, 18],
        [1010, 330, 14],
        [1180, 320, 16],
      ].map(([x, top, w]) => (
        <g key={x}>
          <path d={`M${x} ${top} C${x + w} ${top + 60} ${x + w} ${GROUND - 120} ${x + w * 0.6} ${GROUND - 60} L${x - w * 0.6} ${GROUND - 60} C${x - w} ${GROUND - 120} ${x - w} ${top + 60} ${x} ${top} Z`} fill="#2f4a32" />
          <path d={`M${x} ${top} C${x - w} ${top + 60} ${x - w} ${GROUND - 120} ${x - w * 0.6} ${GROUND - 60} L${x - w * 0.1} ${GROUND - 60} Z`} fill="#3f5f40" />
        </g>
      ))}
      {[
        [130, 380, 46],
        [1060, 400, 50],
        [1140, 390, 42],
      ].map(([cx, cy, r]) => (
        <g key={cx}>
          <rect x={cx - 3} y={cy} width="6" height={GROUND - cy} fill="#5a4a3a" />
          <circle cx={cx} cy={cy} r={r} fill="#6b8a3a" />
          <circle cx={cx - r * 0.35} cy={cy - r * 0.3} r={r * 0.6} fill="#86a44a" />
          <circle cx={cx + r * 0.4} cy={cy + r * 0.1} r={r * 0.5} fill="#5c7a32" />
        </g>
      ))}
    </g>
  );
}

/* ── Sokak ve meydan ── */

function Lamp({ x }: { x: number }) {
  const base = H - 30;
  return (
    <g>
      <rect x={x - 2.5} y={base - 280} width="5" height="280" fill="#3a3e42" />
      <rect x={x - 7} y={base - 12} width="14" height="12" fill="#2f3337" />
      <path d={`M${x} ${base - 276} Q${x - 4} ${base - 296} ${x - 30} ${base - 292} M${x} ${base - 276} Q${x + 4} ${base - 296} ${x + 30} ${base - 292}`} fill="none" stroke="#3a3e42" strokeWidth="3.5" />
      <rect x={x - 42} y={base - 294} width="22" height="7" rx="2" fill="#2f3337" />
      <rect x={x + 20} y={base - 294} width="22" height="7" rx="2" fill="#2f3337" />
    </g>
  );
}

function Person({ x, coat, legs = '#2b2d33', hair = '#2a211c', y = H - 6, k = 1 }: { x: number; coat: string; legs?: string; hair?: string; y?: number; k?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${k}) translate(${-x} ${-y})`}>
      <ellipse cx={x + 10} cy={y} rx="16" ry="3" fill="#000" opacity="0.25" />
      <rect x={x - 6} y={y - 34} width="5" height="34" rx="2" fill={legs} />
      <rect x={x + 1} y={y - 34} width="5" height="34" rx="2" fill={legs} opacity="0.85" />
      <path d={`M${x - 11} ${y - 30} Q${x - 12} ${y - 66} ${x} ${y - 70} Q${x + 12} ${y - 66} ${x + 11} ${y - 30} Z`} fill={coat} />
      <circle cx={x} cy={y - 78} r="8" fill="#c99a7c" />
      <path d={`M${x - 8} ${y - 80} Q${x} ${y - 92} ${x + 8} ${y - 80} Z`} fill={hair} />
    </g>
  );
}

function Car({ x }: { x: number }) {
  const y = PLAZA - 2;
  return (
    <g>
      <ellipse cx={x + 70} cy={y + 2} rx="74" ry="4" fill="#000" opacity="0.3" />
      <path d={`M${x} ${y - 10} Q${x} ${y - 30} ${x + 18} ${y - 32} L${x + 40} ${y - 34} Q${x + 52} ${y - 54} ${x + 76} ${y - 54} L${x + 104} ${y - 54} Q${x + 122} ${y - 52} ${x + 132} ${y - 34} Q${x + 142} ${y - 30} ${x + 142} ${y - 18} L${x + 142} ${y - 8} Z`} fill={url('car')} />
      <path d={`M${x + 46} ${y - 34} Q${x + 56} ${y - 50} ${x + 76} ${y - 50} L${x + 86} ${y - 50} L${x + 86} ${y - 34} Z M${x + 90} ${y - 34} L${x + 90} ${y - 50} L${x + 104} ${y - 50} Q${x + 118} ${y - 48} ${x + 126} ${y - 34} Z`} fill="#38444d" />
      <rect x={x} y={y - 14} width="142" height="3" fill="#000" opacity="0.12" />
      {[x + 30, x + 114].map((wx) => (
        <g key={wx}>
          <circle cx={wx} cy={y - 8} r="12" fill="#1c1c1c" />
          <circle cx={wx} cy={y - 8} r="6" fill="#a9adb1" />
        </g>
      ))}
      <rect x={x + 136} y={y - 28} width="6" height="5" rx="1" fill="#f5e6a8" />
    </g>
  );
}

/** Belediyenin beyaz stant çadırı: meydanın sol önünde. */
function Tent({ x }: { x: number }) {
  const base = H - 14;
  return (
    <g>
      <ellipse cx={x + 70} cy={base + 2} rx="80" ry="5" fill="#000" opacity="0.2" />
      {[x + 4, x + 136].map((px) => (
        <rect key={px} x={px} y={base - 70} width="3" height="70" fill="#c9ccce" />
      ))}
      <rect x={x} y={base - 70} width="140" height="22" fill="#f6f6f4" />
      <polygon points={`${x - 6},${base - 70} ${x + 146},${base - 70} ${x + 70},${base - 96}`} fill="#ffffff" />
      <polygon points={`${x + 70},${base - 96} ${x + 146},${base - 70} ${x + 70},${base - 70}`} fill="#000" opacity="0.06" />
      <rect x={x + 18} y={base - 66} width="104" height="14" fill="#fff" stroke="#c8102e" strokeWidth="1.5" />
      <rect x={x + 26} y={base - 61} width="88" height="4" fill="#c8102e" opacity="0.6" />
      <rect x={x + 10} y={base - 30} width="120" height="30" fill="#e8e8e6" />
      <rect x={x + 10} y={base - 30} width="120" height="4" fill="#fff" />
    </g>
  );
}

function Street() {
  // meydanın taş döşemesi: büyük gri plakalar, derinliğe doğru sıklaşan derzler
  const rows = [0, 8, 18, 30, 44, 60, 78, 98];
  return (
    <g pointerEvents="none">
      <rect y={GROUND} width={W} height={ROAD - GROUND} fill={url('paving')} />
      <rect y={GROUND} width={W} height="4" fill="#000" opacity="0.18" />
      <rect y={ROAD - 3} width={W} height="3" fill="#8e8a82" />
      <rect y={ROAD} width={W} height={PLAZA - ROAD} fill={url('asphalt')} />
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={i * 130 + 24} y={ROAD + 15} width="60" height="3" fill="#e8e4d8" opacity="0.65" />
      ))}
      <Car x={1010} />
      <rect y={PLAZA} width={W} height="5" fill="#8f8c86" />
      <rect y={PLAZA + 5} width={W} height={H - PLAZA - 5} fill="#bdbab3" />
      <rect y={PLAZA + 5} width={W} height={H - PLAZA - 5} fill={url('shade')} opacity="0.5" />
      <g stroke="#8f8b84" strokeWidth="1.2">
        {rows.map((r) => (
          <line key={r} x1="0" y1={PLAZA + 5 + r} x2={W} y2={PLAZA + 5 + r} />
        ))}
        {Array.from({ length: 25 }, (_, i) => {
          const top = i * 50;
          return <line key={i} x1={top} y1={PLAZA + 5} x2={600 + (top - 600) * 1.7} y2={H} />;
        })}
      </g>
      {/* bayrak direğinin güneşte uzayan gölgesi */}
      <polygon points={`606,${H - 26} 618,${H - 26} 1040,${PLAZA + 6} 1030,${PLAZA + 6}`} fill="#000" opacity="0.14" />
      <Lamp x={165} />
      <Lamp x={1010} />
      <Tent x={40} />
      <Person x={250} coat="#f2f2f0" legs="#3b4a63" />
      <Person x={330} coat="#8c3a3a" legs="#2b2d33" hair="#5a3a22" k={0.94} />
      <Person x={760} coat="#2d3a4a" legs="#cfc8b8" k={1.04} />
      <Person x={830} coat="#e8d9b5" legs="#2b2d33" hair="#1c1c1c" k={0.96} />
      <Person x={1140} coat="#c4d24a" legs="#2b2d33" />
    </g>
  );
}

/** Meydanın simgesi: tıklanmaz, tabelaların ve yolun önünde durur. */
function Landmark({ place }: { place: PlaceId }) {
  if (place === 'besiktas') return <Eagle />;
  if (place === 'eminonu') return <SimitCart />;
  if (place === 'mecidiyekoy') return <MetroTotem />;
  // Cumhuriyet Meydanı'nın yüksek bayrak direği ve dalgalanan dev bayrak
  const px = 612;
  const base = H - 24;
  const fx = px + 4;
  const fy = 40;
  const fw = 150;
  const fh = 100;
  const wave = (k: number) => Math.sin(k * Math.PI * 2) * 6;
  const top = Array.from({ length: 9 }, (_, i) => `${fx + (fw * i) / 8},${fy + wave(i / 8) + (i / 8) * 8}`).join(' ');
  const bottom = Array.from({ length: 9 }, (_, i) => `${fx + fw - (fw * i) / 8},${fy + fh + wave(1 - i / 8) + (1 - i / 8) * 4}`).join(' ');
  const cy = fy + fh / 2 + 3;
  return (
    <g pointerEvents="none">
      <ellipse cx={px} cy={base + 6} rx="46" ry="9" fill="#000" opacity="0.2" />
      <rect x={px - 40} y={base - 10} width="80" height="16" rx="4" fill="#d6d2c9" />
      <rect x={px - 40} y={base - 10} width="80" height="4" rx="2" fill="#efece5" />
      <rect x={px - 4} y={30} width="8" height={base - 40} fill={url('steel')} />
      <circle cx={px} cy={28} r="6" fill="#e6c25a" />
      <polygon points={`${top} ${bottom}`} fill="#e30a17" />
      <polygon points={`${top} ${bottom}`} fill={url('flag')} />
      {/* ay yıldız: bayrak oranlarına göre */}
      <circle cx={fx + fh * 0.5} cy={cy} r={fh * 0.25} fill="#fff" />
      <circle cx={fx + fh * 0.5625} cy={cy} r={fh * 0.2} fill="#e30a17" />
      <polygon
        points={Array.from({ length: 10 }, (_, i) => {
          const a = (i * Math.PI) / 5 + Math.PI;
          const r = i % 2 ? fh * 0.05 : fh * 0.125;
          return `${fx + fh * 0.7667 + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
        }).join(' ')}
        fill="#fff"
      />
    </g>
  );
}

/** Beşiktaş: meydanın ortasındaki kaidede kanatlarını açmış kartal. */
function Eagle() {
  const x = 600;
  const base = H - 24;
  return (
    <g pointerEvents="none">
      <ellipse cx={x} cy={base + 6} rx="60" ry="10" fill="#000" opacity="0.2" />
      <rect x={x - 46} y={base - 120} width="92" height="124" rx="4" fill="#d6d2c9" />
      <rect x={x - 54} y={base - 128} width="108" height="12" rx="3" fill="#efece5" />
      <rect x={x - 46} y={base - 10} width="92" height="14" fill="#bdb8ae" />
      {/* kartal: gövde, açık kanatlar, baş */}
      <path
        d={`M ${x} ${base - 200} C ${x - 20} ${base - 230}, ${x - 80} ${base - 250}, ${x - 130} ${base - 230} C ${x - 90} ${base - 220}, ${x - 60} ${base - 200}, ${x - 26} ${base - 170} L ${x - 14} ${base - 128} L ${x + 14} ${base - 128} L ${x + 26} ${base - 170} C ${x + 60} ${base - 200}, ${x + 90} ${base - 220}, ${x + 130} ${base - 230} C ${x + 80} ${base - 250}, ${x + 20} ${base - 230}, ${x} ${base - 200} Z`}
        fill="#2c2a27"
      />
      <circle cx={x} cy={base - 206} r="11" fill="#2c2a27" />
      <path d={`M ${x + 8} ${base - 208} l 12 4 l -12 3 Z`} fill="#c9a43a" />
    </g>
  );
}

/** Eminönü: kaldırımda camlı kırmızı simit arabası. */
function SimitCart() {
  const x = 560;
  const y = H - 110;
  return (
    <g pointerEvents="none">
      <ellipse cx={x + 60} cy={H - 16} rx="80" ry="8" fill="#000" opacity="0.2" />
      <rect x={x} y={y + 40} width="120" height="46" rx="4" fill="#c8102e" />
      <rect x={x + 6} y={y} width="108" height="42" rx="4" fill="#dfeef5" opacity="0.85" stroke="#8a1c1c" strokeWidth="3" />
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} cx={x + 22 + i * 26} cy={y + 26} r="10" fill="none" stroke="#b5752f" strokeWidth="6" />
      ))}
      <text x={x + 60} y={y + 70} textAnchor="middle" fontSize="16" fontWeight="800" fill="#fff" fontFamily="var(--font-display, serif)">
        SİMİT
      </text>
      <circle cx={x + 18} cy={H - 20} r="10" fill="#2c2a27" />
      <circle cx={x + 102} cy={H - 20} r="10" fill="#2c2a27" />
    </g>
  );
}

/** Mecidiyeköy: metro girişinin "M" totemi. */
function MetroTotem() {
  const x = 610;
  const base = H - 24;
  return (
    <g pointerEvents="none">
      <ellipse cx={x} cy={base + 6} rx="30" ry="6" fill="#000" opacity="0.2" />
      <rect x={x - 6} y={base - 170} width="12" height="176" fill={url('steel')} />
      <rect x={x - 34} y={base - 236} width="68" height="68" rx="10" fill="#c8102e" />
      <text x={x} y={base - 186} textAnchor="middle" fontSize="50" fontWeight="900" fill="#fff" fontFamily="sans-serif">
        M
      </text>
      <rect x={x - 70} y={base - 150} width="140" height="26" rx="4" fill="#1d2a44" />
      <text x={x} y={base - 132} textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff" fontFamily="sans-serif">
        MECİDİYEKÖY
      </text>
    </g>
  );
}
