import type { PointerEvent as ReactPointerEvent } from 'react';
import { Backdrop, Landmark, SkyDefs } from './Backdrop';
import { Building } from './Facade';
import { ItemView } from './Items';
import { GROUND, H, W, hasIllegalBox, topOf, type Design, type Place, type Site } from './model';
import { url } from './paint';

/*
 * Meydanın çizimi: bölgenin gökyüzü ve arka planı, binalar, cepheye asılanlar, kaldırım ve
 * meydan, ağaçlar, direkler ve meydanın simgesi. İnsan da araba da yok: meydan, fotoğrafı sabah
 * erkenden çekilmiş gibi boş. Her şey düz SVG; gerçekçilik ışıktan gelir: soldan vuran gün
 * ışığı, çıkıntıların altındaki gölgeler, pencere içleri, pervaz altı kirleri ve bütün cepheye
 * yayılan ince bir doku. Ortak boyalar ve dokular `SceneDefs` içindedir; her SVG onu bir kez
 * çizer. Editör aynı katmanları seçme ve sürükleme tutamaklarıyla çizer.
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

/**
 * Bir meydanın sahnesi. `defs` false ise ortak tanımlar (gradyan, desen) çizilmez: aynı sayfada
 * birden çok sahne varsa tanımlar bir kez, sayfada çizilir (MeydanGame); aynı kimlik tekrarlanmaz.
 */
export function Scene({ place, design, className, label, defs = true }: { place: Place; design: Design; className?: string; label?: string; defs?: boolean }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={label ?? `${place.district} ${place.title}`}>
      {defs && <SceneDefs />}
      <SceneLayers place={place} design={design} />
    </svg>
  );
}

export function SceneDefs() {
  return (
    <defs>
      <SkyDefs />
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
      {/* aşağıdan yukarı cephe yıkama ışığı */}
      <linearGradient id="meydan-wash" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor="#ffe2a0" stopOpacity="0.4" />
        <stop offset="0.5" stopColor="#ffe2a0" stopOpacity="0.1" />
        <stop offset="1" stopColor="#ffe2a0" stopOpacity="0" />
      </linearGradient>
      {/* eski cephede pervazlardan inen yağmur izleri */}
      <pattern id="meydan-streaks" width="46" height="120" patternUnits="userSpaceOnUse">
        <rect x="6" width="3" height="80" fill="#000" opacity="0.06" />
        <rect x="27" y="30" width="5" height="90" fill="#000" opacity="0.05" />
        <rect x="38" width="2" height="50" fill="#000" opacity="0.07" />
      </pattern>
      <pattern id="meydan-block" width="20" height="10" patternUnits="userSpaceOnUse">
        <rect width="20" height="10" fill="#9a9893" />
        <path d="M0 .5H20M0 5.5H20M.5 0V5M10.5 5V10" stroke="#5e5c58" strokeOpacity="0.55" />
        <rect x="3" y="2" width="4" height="2" fill="#6e6c68" opacity="0.5" />
      </pattern>
      <pattern id="meydan-plank" width="12" height="40" patternUnits="userSpaceOnUse">
        <rect width="6" height="40" fill="#fff" opacity="0.06" />
        <path d="M.5 0V40" stroke="#000" strokeOpacity="0.25" />
      </pattern>
      <pattern id="meydan-panel" width="40" height="28" patternUnits="userSpaceOnUse">
        <path d="M.5 0V28M0 .5H40" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.5" />
        <rect x="2" y="2" width="16" height="24" fill="#fff" opacity="0.12" />
      </pattern>
      <pattern id="meydan-ceramic" width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M.5 0V10M0 .5H10" stroke="#8a8478" strokeOpacity="0.5" />
      </pattern>
      <pattern id="meydan-sac" width="8" height="10" patternUnits="userSpaceOnUse">
        <rect width="3" height="10" fill="#fff" opacity="0.18" />
        <rect x="5" width="2" height="10" fill="#000" opacity="0.2" />
      </pattern>
      <pattern id="meydan-granit" width="48" height="16" patternUnits="userSpaceOnUse">
        <rect width="48" height="16" fill="#b9b6ae" />
        <rect width="24" height="8" fill="#c4c1b9" />
        <path d="M0 .5H48M.5 0V8M24.5 8V16M0 8.5H48" stroke="#8f8b84" strokeOpacity="0.6" />
      </pattern>
      <pattern id="meydan-arnavut" width="12" height="9" patternUnits="userSpaceOnUse">
        <rect width="12" height="9" fill="#6f6a62" />
        <rect x="1" y="1" width="9" height="3" rx="1.5" fill="#9b958a" />
        <rect x="-5" y="5.5" width="9" height="3" rx="1.5" fill="#8d877c" />
        <rect x="7" y="5.5" width="9" height="3" rx="1.5" fill="#a39d92" />
      </pattern>
      <pattern id="meydan-bazalt" width="40" height="16" patternUnits="userSpaceOnUse">
        <rect width="40" height="16" fill="#3e3c39" />
        <rect x="20" width="20" height="8" fill="#47443f" />
        <path d="M0 .5H40M.5 0V8M20.5 8V16M0 8.5H40" stroke="#1f1e1c" strokeOpacity="0.8" />
      </pattern>
      <pattern id="meydan-beton" width="20" height="10" patternUnits="userSpaceOnUse">
        <rect width="20" height="10" fill="#a9a39a" />
        <path d="M0 .5H20M0 5.5H20M.5 0V5M10.5 5V10" stroke="#7a756d" strokeOpacity="0.6" />
        <rect x="11" width="9" height="5" fill="#b0857a" opacity="0.35" />
      </pattern>
      <pattern id="meydan-brick" width="18" height="8" patternUnits="userSpaceOnUse">
        <path d="M0 .5H18M0 4.5H18M.5 0V4M9.5 4V8" stroke="#000" strokeOpacity="0.16" strokeWidth="1" />
      </pattern>
      <pattern id="meydan-ashlar" width="40" height="12" patternUnits="userSpaceOnUse">
        <path d="M0 .5H40M20.5 0V6M.5 6V12M0 6.5H40" stroke="#000" strokeOpacity="0.09" strokeWidth="1" />
      </pattern>
      <pattern id="meydan-paving" width="36" height="14" patternUnits="userSpaceOnUse">
        <rect width="36" height="14" fill="#a7a298" />
        <path d="M0 .5H36M.5 0V7M18.5 7V14M0 7.5H36" stroke="#000" strokeOpacity="0.12" />
        <rect x="19" y="8" width="16" height="5" fill="#8a857b" />
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
  const pickedIndex = picked?.type === 'building' ? place.buildings.findIndex((b) => b.id === picked.id) : -1;
  const pb = place.buildings[pickedIndex];
  const ps = design.specs[pickedIndex];
  const pickTop = pb && ps ? topOf(pb, ps) - 58 - (hasIllegalBox(pb, ps) ? pb.floorH : 0) : 0;
  return (
    <>
      <Backdrop kind={place.backdrop} />
      {place.buildings.map((b, i) => (
        <Building key={b.id} b={b} s={design.specs[i] ?? place.original.specs[i]} stone={place.stone} onDown={interact && ((e) => interact.onBuilding(b.id, e))} />
      ))}
      {design.items.map((it) => (
        <ItemView key={it.id} it={it} onDown={interact && ((e) => interact.onItem(it.id, e, 'move'))} />
      ))}
      <Street site={design.site} />
      <Landmark kind={place.landmark} />
      <Greenery site={design.site} />
      {pb && <rect x={pb.x + 1.5} y={pickTop} width={pb.w - 3} height={GROUND - pickTop} fill="none" stroke={PICK} strokeWidth="3" strokeDasharray="10 6" pointerEvents="none" />}
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

/* ── Sokak ve meydan ── */

const LAMPS = [165, 1010];

function Lamp({ x, kind }: { x: number; kind: Site['lamps'] }) {
  const base = H - 30;
  if (kind === 'klasik')
    return (
      <g>
        <rect x={x - 3} y={base - 200} width="6" height="200" fill="#1f2326" />
        <rect x={x - 9} y={base - 40} width="18" height="40" rx="3" fill="#1f2326" />
        <path d={`M${x - 14} ${base - 228} h28 l-5 26 h-18 Z`} fill="#f6dfa0" stroke="#1f2326" strokeWidth="3" />
        <path d={`M${x - 16} ${base - 228} L${x} ${base - 244} L${x + 16} ${base - 228} Z`} fill="#1f2326" />
        <ellipse cx={x} cy={base - 214} rx="30" ry="26" fill={url('glow')} />
      </g>
    );
  if (kind === 'modern')
    return (
      <g>
        <rect x={x - 2} y={base - 240} width="4" height="240" fill="#4d5459" />
        <rect x={x - 2} y={base - 242} width="40" height="5" rx="2" fill="#4d5459" />
        <rect x={x + 10} y={base - 237} width="26" height="2" fill="#fff6dc" />
      </g>
    );
  return (
    <g>
      <rect x={x - 2.5} y={base - 280} width="5" height="280" fill="#8d949a" />
      <rect x={x - 7} y={base - 12} width="14" height="12" fill="#6c7378" />
      <path d={`M${x} ${base - 276} Q${x - 4} ${base - 296} ${x - 30} ${base - 292} M${x} ${base - 276} Q${x + 4} ${base - 296} ${x + 30} ${base - 292}`} fill="none" stroke="#8d949a" strokeWidth="3.5" />
      <rect x={x - 42} y={base - 294} width="22" height="7" rx="2" fill="#6c7378" />
      <rect x={x + 20} y={base - 294} width="22" height="7" rx="2" fill="#6c7378" />
      <rect x={x - 40} y={base - 288} width="18" height="2" fill="#ffb347" />
      <rect x={x + 22} y={base - 288} width="18" height="2" fill="#ffb347" />
    </g>
  );
}

function Street({ site }: { site: Site }) {
  const lamps = LAMPS.map((x) => <Lamp key={x} x={x} kind={site.lamps} />);
  if (site.paving !== 'mevcut') {
    // yayalaştırılmış meydan: kaldırımdan meydana tek bir kaplama, araç yolu kalkar
    return (
      <g pointerEvents="none">
        <rect y={GROUND} width={W} height={H - GROUND} fill={url(site.paving)} />
        <rect y={GROUND} width={W} height={H - GROUND} fill={url('shade')} opacity="0.5" />
        <rect y={GROUND} width={W} height="4" fill="#000" opacity="0.18" />
        <rect y={ROAD + 10} width={W} height="3" fill="#fff" opacity="0.12" />
        {lamps}
      </g>
    );
  }
  // bugünkü hâl: yamalı kaldırım, çukurlu asfalt, çatlak meydan taşı
  const rows = [0, 8, 18, 30, 44, 60, 78, 98];
  return (
    <g pointerEvents="none">
      <rect y={GROUND} width={W} height={ROAD - GROUND} fill={url('paving')} />
      <rect y={GROUND} width={W} height="4" fill="#000" opacity="0.18" />
      <rect y={ROAD - 3} width={W} height="3" fill="#8e8a82" />
      <rect y={ROAD} width={W} height={PLAZA - ROAD} fill={url('asphalt')} />
      {[90, 420, 760, 1040].map((x, i) => (
        <path key={x} d={`M${x} ${ROAD + 6} l${30 + i * 6} -2 l8 12 l-26 8 l-18 -4 Z`} fill="#2e3033" opacity="0.8" />
      ))}
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={i * 130 + 24} y={ROAD + 15} width="60" height="3" fill="#e8e4d8" opacity="0.45" />
      ))}
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
      {[220, 520, 880].map((x) => (
        <path key={x} d={`M${x} ${PLAZA + 20} l14 10 l-6 12 l18 14`} stroke="#6f6b64" fill="none" strokeWidth="1.5" />
      ))}
      {lamps}
    </g>
  );
}

const TREES = [92, 330, 880, 1120];

function Greenery({ site }: { site: Site }) {
  if (site.green === 'yok') return null;
  const base = H - 14;
  return (
    <g pointerEvents="none">
      {site.green === 'bahce' && (
        <>
          <rect y={base - 8} width={W} height="22" fill="#6d9a46" />
          <rect y={base - 8} width={W} height="3" fill="#86b257" />
          {[230, 460, 760, 990].map((x) => (
            <g key={x}>
              <rect x={x} y={base - 26} width="52" height="5" fill="#7a5232" />
              <rect x={x} y={base - 18} width="52" height="3" fill="#7a5232" />
              <rect x={x + 4} y={base - 21} width="3" height="16" fill="#2b2e31" />
              <rect x={x + 45} y={base - 21} width="3" height="16" fill="#2b2e31" />
            </g>
          ))}
        </>
      )}
      {site.green === 'saksi'
        ? [70, 300, 470, 760, 930, 1140].map((x) => (
            <g key={x}>
              <rect x={x - 22} y={base - 30} width="44" height="30" fill="#b9b5ab" />
              <rect x={x - 24} y={base - 32} width="48" height="5" fill="#cfcbc1" />
              <ellipse cx={x} cy={base - 38} rx="22" ry="12" fill="#5f8a3e" />
              <ellipse cx={x - 8} cy={base - 42} rx="10" ry="7" fill="#76a04a" />
            </g>
          ))
        : TREES.map((x, i) => (
            <g key={x}>
              <ellipse cx={x} cy={base + 4} rx="34" ry="6" fill="#000" opacity="0.18" />
              <rect x={x - 3.5} y={base - 120} width="7" height="124" fill="#5a4a3a" />
              <rect x={x - 14} y={base - 2} width="28" height="6" fill="#5c5852" />
              <circle cx={x} cy={base - 150} r="44" fill="#5c7a32" />
              <circle cx={x - 18} cy={base - 166} r="28" fill="#6f8f3c" />
              <circle cx={x + 20} cy={base - 140} r="26" fill="#4f6b2c" />
              <circle cx={x - 6 + (i % 2) * 10} cy={base - 180} r="18" fill="#86a44a" />
            </g>
          ))}
    </g>
  );
}
