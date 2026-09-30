import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { audioEngine } from '../../../audio/audioEngine';
import { WORK_START_HOUR, WORKDAY_END_MIN } from '../../../game/time';
import styles from './TrafficApp.module.css';

/*
 * "Trafik" — a navigation-app style map of Istanbul. Light land, blue water (Bosphorus, Golden
 * Horn, Marmara), parks, a street texture, yellow highways with a live traffic layer on top, and
 * the commute from the Levent office to home in Moda/Kadıköy. Pinch-free zoom (+/−, wheel) and
 * drag to pan. Congestion builds from 15:30 and weather makes everything slower.
 */

const W = 360;
const H = 300;

type Pt = [number, number];

/** Catmull-Rom → cubic Bézier, so hand-placed coast points become smooth shorelines. */
function smooth(pts: Pt[], closed = false) {
  const p = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < p.length - 2; i++) {
    const [x0, y0] = p[i - 1];
    const [x1, y1] = p[i];
    const [x2, y2] = p[i + 1];
    const [x3, y3] = p[i + 2];
    d += ` C${(x1 + (x2 - x0) / 6).toFixed(1)} ${(y1 + (y2 - y0) / 6).toFixed(1)} ${(x2 - (x3 - x1) / 6).toFixed(1)} ${(y2 - (y3 - y1) / 6).toFixed(1)} ${x2} ${y2}`;
  }
  return closed ? `${d} Z` : d;
}

// Marmara + Bosphorus as one water body (corners pushed outside the frame).
const SEA = smooth(
  [
    [-30, 238], [40, 236], [80, 240], [120, 235], [150, 239], [174, 234], [186, 228],
    [191, 214], [189, 196], [190, 178], [193, 160], [196, 142], [197, 124], [199, 106], [203, 88], [205, 70], [210, 50], [216, 28], [220, 6], [222, -30],
    [252, -30], [248, 6], [240, 26], [234, 46], [229, 64], [227, 82], [226, 100], [223, 120], [221, 140], [218, 160], [215, 180], [213, 200], [211, 218], [210, 232],
    [216, 244], [224, 254], [236, 250], [256, 258], [286, 262], [322, 266], [390, 270],
    [390, 330], [-30, 330],
  ],
  true,
);
const HALIC = smooth(
  [
    [191, 214], [172, 206], [156, 198], [141, 188], [129, 179], [118, 171], [116, 175],
    [126, 186], [140, 198], [156, 208], [172, 217], [186, 227],
  ],
  true,
);

const PARKS = [
  smooth([[10, 4], [60, -4], [110, 8], [120, 34], [96, 52], [48, 50], [14, 36]], true), // Belgrad Ormanı
  smooth([[266, 6], [330, 0], [370, 20], [360, 56], [312, 60], [276, 40]], true), // Beykoz korusu
  smooth([[183, 146], [192, 147], [192, 158], [183, 157]], true), // Yıldız Parkı
  smooth([[194, 62], [202, 60], [201, 74], [194, 72]], true), // Emirgan
  smooth([[236, 188], [250, 184], [256, 196], [244, 204], [234, 198]], true), // Çamlıca
  smooth([[246, 212], [258, 210], [260, 220], [248, 222]], true), // Validebağ
];

interface Road {
  name: string;
  d: string;
  base: number;
  rush: number;
  kind: 'highway' | 'arterial';
}

const ROADS: Road[] = [
  { name: 'Büyükdere Cd.', d: smooth([[180, 44], [184, 70], [186, 96], [189, 118], [192, 138]]), base: 0.5, rush: 0.42, kind: 'arterial' },
  { name: '15 Temmuz Şehitler Köprüsü', d: 'M192 138 L226 136', base: 0.55, rush: 0.45, kind: 'highway' },
  { name: 'D-100 Anadolu', d: smooth([[226, 136], [242, 146], [262, 164], [286, 190], [312, 206], [380, 216]]), base: 0.45, rush: 0.45, kind: 'highway' },
  { name: 'TEM Avrupa', d: smooth([[-20, 112], [60, 106], [120, 98], [160, 88], [186, 78], [198, 74]]), base: 0.35, rush: 0.4, kind: 'highway' },
  { name: 'FSM Köprüsü', d: 'M198 74 L234 70', base: 0.45, rush: 0.45, kind: 'highway' },
  { name: 'TEM Anadolu', d: smooth([[234, 70], [258, 88], [278, 122], [296, 164], [310, 204]]), base: 0.35, rush: 0.4, kind: 'highway' },
  { name: 'D-100 Avrupa', d: smooth([[-20, 212], [40, 212], [90, 204], [130, 188], [158, 168], [176, 150], [192, 138]]), base: 0.5, rush: 0.4, kind: 'highway' },
  { name: 'Sahil Yolu', d: smooth([[-20, 233], [60, 231], [120, 229], [160, 230], [180, 226]]), base: 0.3, rush: 0.35, kind: 'arterial' },
  { name: 'Kadıköy bağlantısı', d: smooth([[286, 190], [270, 204], [254, 222], [238, 240]]), base: 0.4, rush: 0.35, kind: 'arterial' },
];

// Minor arterials (no traffic layer) — give the map its texture of real streets.
const STREETS = [
  smooth([[182, 226], [188, 206], [190, 186], [191, 164], [192, 150]]),
  smooth([[224, 138], [222, 170], [219, 200], [216, 222], [230, 244]]),
  smooth([[100, 150], [140, 150], [176, 150]]),
  smooth([[60, 160], [100, 170], [130, 188]]),
  smooth([[120, 98], [130, 130], [140, 160], [158, 168]]),
  smooth([[262, 164], [300, 140], [360, 132]]),
  smooth([[244, 250], [270, 240], [312, 206]]),
  smooth([[40, 212], [50, 170], [60, 106]]),
  smooth([[150, 60], [160, 88]]),
];

interface Route {
  id: string;
  label: string;
  mode: 'car' | 'bus' | 'ferry';
  via: string;
  km: string;
  d: string;
  /** Road indices whose congestion slows this route (empty = unaffected by traffic). */
  roads: number[];
  baseMinutes: number;
  /** Where the time bubble sits. */
  tag: Pt;
}

const ROUTES: Route[] = [
  {
    id: 'car15', label: 'Araba', mode: 'car', via: '15 Temmuz Köprüsü üzerinden', km: '17,4 km',
    d: smooth([[186, 100], [189, 118], [192, 138], [226, 136], [242, 146], [262, 164], [286, 190], [270, 204], [254, 222], [238, 242]]),
    roads: [0, 1, 2, 8], baseMinutes: 30, tag: [250, 150],
  },
  {
    id: 'carFsm', label: 'Araba', mode: 'car', via: 'FSM Köprüsü · TEM üzerinden', km: '24,1 km',
    d: smooth([[186, 100], [185, 84], [198, 74], [234, 70], [258, 88], [278, 122], [296, 164], [304, 196], [286, 190], [270, 204], [254, 222], [238, 242]]),
    roads: [0, 4, 5, 8], baseMinutes: 34, tag: [286, 118],
  },
  {
    id: 'bus', label: 'Metrobüs', mode: 'bus', via: 'Zincirlikuyu → Söğütlüçeşme', km: '16,8 km',
    d: smooth([[186, 100], [189, 118], [192, 138], [226, 136], [242, 148], [260, 168], [268, 196], [252, 224], [238, 242]]),
    roads: [], baseMinutes: 44, tag: [270, 200],
  },
  {
    id: 'ferry', label: 'Metro + Vapur', mode: 'ferry', via: 'M2 Şişhane · Karaköy iskelesi', km: '11,2 km',
    d: smooth([[186, 100], [184, 130], [181, 160], [178, 186], [180, 204], [184, 216], [196, 226], [214, 236], [230, 242], [238, 242]]),
    roads: [], baseMinutes: 48, tag: [150, 190],
  },
];

const OFFICE: Pt = [186, 100];
const HOME: Pt = [238, 242];

const DISTRICTS: { name: string; at: Pt }[] = [
  { name: 'SARIYER', at: [178, 30] }, { name: 'MASLAK', at: [160, 62] }, { name: 'LEVENT', at: [166, 110] },
  { name: 'KAĞITHANE', at: [138, 128] }, { name: 'ŞİŞLİ', at: [164, 156] }, { name: 'BEŞİKTAŞ', at: [174, 176] },
  { name: 'BEYOĞLU', at: [160, 196] }, { name: 'FATİH', at: [130, 218] }, { name: 'EYÜPSULTAN', at: [100, 160] },
  { name: 'BAĞCILAR', at: [44, 150] }, { name: 'BAKIRKÖY', at: [50, 224] }, { name: 'AVCILAR', at: [14, 190] },
  { name: 'BEYKOZ', at: [276, 72] }, { name: 'KAVACIK', at: [244, 96] }, { name: 'ÜMRANİYE', at: [300, 146] },
  { name: 'ÜSKÜDAR', at: [240, 176] }, { name: 'ATAŞEHİR', at: [318, 190] }, { name: 'KADIKÖY', at: [262, 244] },
];

function congestionColor(c: number) {
  return c < 0.45 ? '#2fb266' : c < 0.7 ? '#f5a623' : c < 0.85 ? '#e8542f' : '#a4161a';
}

/** Clock time for a workday minute, not clamped to the end of the shift. */
function arrival(workdayMinutes: number) {
  const t = WORK_START_HOUR * 60 + workdayMinutes;
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
}

const MODE_ICON = { car: '🚗', bus: '🚌', ferry: '⛴' } as const;

const HOME_VIEW = { x: -116, y: -80, k: 1.4 };

interface View {
  x: number;
  y: number;
  k: number;
}

function clampView(v: View): View {
  const k = Math.min(3.2, Math.max(1, v.k));
  return { k, x: Math.min(0, Math.max(W * (1 - k), v.x)), y: Math.min(0, Math.max(H * (1 - k), v.y)) };
}

export function TrafficApp({ minutes, weatherPenalty }: { minutes: number; weatherPenalty: number }) {
  const [routeId, setRouteId] = useState('car15');
  const [incident, setIncident] = useState<string | null>(null);
  const [view, setView] = useState<View>(HOME_VIEW);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ px: number; py: number; v: View } | null>(null);

  // Rush builds from 15:30 and peaks at 17:00–18:00.
  const rush = Math.max(0, Math.min(1, (minutes - 450) / 90));
  const levels = ROADS.map((r) => Math.min(1, r.base + r.rush * rush + weatherPenalty));
  const ferryCancelled = weatherPenalty >= 0.25;
  const eta = (r: Route) => {
    if (r.mode === 'ferry') return Math.round(r.baseMinutes * (1 + weatherPenalty * 1.2));
    if (r.mode === 'bus') return Math.round(r.baseMinutes * (1 + rush * 0.15 + weatherPenalty * 0.5));
    const avg = r.roads.reduce((s, i) => s + levels[i], 0) / r.roads.length;
    return Math.round(r.baseMinutes * (0.7 + avg * 1.1));
  };
  const available = ROUTES.filter((r) => !(r.mode === 'ferry' && ferryCancelled));
  const route = available.find((r) => r.id === routeId) ?? available[0];
  const best = available.reduce((a, b) => (eta(a) <= eta(b) ? a : b));
  const normal = Math.round(route.baseMinutes * 0.95);
  const delay = eta(route) - normal;

  const incidents = [
    ...(rush > 0.3 ? [{ at: [210, 137] as Pt, label: 'Kaza · 15 Temmuz Köprüsü Anadolu yönü, sağ şerit kapalı', icon: '!' }] : []),
    { at: [96, 102] as Pt, label: 'Yol çalışması · TEM Mahmutbey, 2 şerit kapalı', icon: '⛏' },
    ...(weatherPenalty > 0.1 ? [{ at: [74, 232] as Pt, label: 'Kaygan yol · Sahil Yolu Yeşilköy', icon: '≋' }] : []),
    ...(ferryCancelled ? [{ at: [206, 236] as Pt, label: 'Olumsuz hava · Karaköy–Kadıköy vapur seferleri iptal', icon: '⛴' }] : []),
  ];

  function zoom(factor: number, cx = W / 2, cy = H / 2) {
    setView((v) => {
      const k = Math.min(3.2, Math.max(1, v.k * factor));
      return clampView({ k, x: cx - ((cx - v.x) * k) / v.k, y: cy - ((cy - v.y) * k) / v.k });
    });
  }

  function toMap(e: { clientX: number; clientY: number }) {
    const rect = svgRef.current!.getBoundingClientRect();
    // viewBox is sliced to the wider axis
    const s = Math.max(W / rect.width, H / rect.height);
    return { s, x: (e.clientX - rect.left) * s - (rect.width * s - W) / 2, y: (e.clientY - rect.top) * s - (rect.height * s - H) / 2 };
  }

  function onPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    drag.current = { px: e.clientX, py: e.clientY, v: view };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (!drag.current) return;
    const { s } = toMap(e);
    const { px, py, v } = drag.current;
    setView(clampView({ ...v, x: v.x + (e.clientX - px) * s, y: v.y + (e.clientY - py) * s }));
  }

  // Wheel zoom around the cursor (non-passive so the app body doesn't scroll).
  const zoomRef = useRef({ zoom, toMap });
  useEffect(() => {
    zoomRef.current = { zoom, toMap };
  });
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = zoomRef.current.toMap(e);
      zoomRef.current.zoom(e.deltaY < 0 ? 1.18 : 1 / 1.18, p.x, p.y);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const k = view.k;
  const label = (size: number) => ({ fontSize: size / k });

  return (
    <div className={styles.traffic}>
      <div className={styles.search}>
        <span className={styles.searchDots}>
          <i className={styles.dotFrom} />
          <i className={styles.dotLine} />
          <i className={styles.dotTo} />
        </span>
        <span className={styles.searchFields}>
          <span>Ofis · Levent</span>
          <span>Ev · Moda, Kadıköy</span>
        </span>
        <span className={styles.live}>
          <i /> CANLI
        </span>
      </div>

      <div className={styles.mapWrap}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid slice"
          className={styles.map}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
        >
          <defs>
            <pattern id="trBlocksA" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(14)">
              <rect width="9" height="9" fill="#efece5" />
              <rect x="0.7" y="0.7" width="7.6" height="7.6" rx="0.6" fill="#e6e2d9" />
            </pattern>
            <pattern id="trBlocksB" width="7" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-18)">
              <rect width="7" height="10" fill="#efece5" />
              <rect x="0.6" y="0.6" width="5.8" height="8.8" rx="0.6" fill="#e5e1d7" />
            </pattern>
            <pattern id="trBlocksC" width="10" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(32)">
              <rect width="10" height="8" fill="#efece5" />
              <rect x="0.7" y="0.7" width="8.6" height="6.6" rx="0.6" fill="#e6e2d9" />
            </pattern>
            <radialGradient id="trPulse">
              <stop offset="0" stopColor="#1a73e8" stopOpacity="0.35" />
              <stop offset="1" stopColor="#1a73e8" stopOpacity="0" />
            </radialGradient>
          </defs>

          <g transform={`translate(${view.x} ${view.y}) scale(${k})`}>
            {/* Land with district-specific street grids */}
            <rect x="-40" y="-40" width={W + 80} height={H + 80} fill="#f1efe9" />
            <rect x="-40" y="40" width="190" height="220" fill="url(#trBlocksA)" />
            <rect x="130" y="40" width="80" height="200" fill="url(#trBlocksB)" />
            <rect x="200" y="60" width="200" height="200" fill="url(#trBlocksC)" />

            {PARKS.map((d, i) => (
              <path key={i} d={d} fill="#c9e7c1" />
            ))}

            {/* Water */}
            <path d={SEA} fill="#aad3df" />
            <path d={HALIC} fill="#aad3df" />
            <path d={SEA} fill="none" stroke="#9cc6d3" strokeWidth={0.8} />
            <circle cx="206" cy="227" r="1.1" fill="#f1efe9" stroke="#9cc6d3" strokeWidth="0.3" />
            <ellipse cx="300" cy="292" rx="7" ry="4" fill="#f1efe9" />
            <ellipse cx="318" cy="286" rx="4" ry="2.5" fill="#f1efe9" />

            {/* Streets */}
            {STREETS.map((d, i) => (
              <g key={i}>
                <path d={d} fill="none" stroke="#d9d4c8" strokeWidth={2.4} strokeLinecap="round" />
                <path d={d} fill="none" stroke="#ffffff" strokeWidth={1.6} strokeLinecap="round" />
              </g>
            ))}
            {/* Galata bridge */}
            <path d="M178 224 L186 214" stroke="#ffffff" strokeWidth={1.6} />

            {/* Roads: casing + base + traffic layer + flow */}
            {ROADS.map((r, i) => {
              const hw = r.kind === 'highway';
              return (
                <g key={r.name}>
                  <path d={r.d} fill="none" stroke={hw ? '#e0a93b' : '#d6d0c2'} strokeWidth={hw ? 5 : 3.6} strokeLinecap="round" />
                  <path d={r.d} fill="none" stroke={hw ? '#fcd97c' : '#ffffff'} strokeWidth={hw ? 3.6 : 2.6} strokeLinecap="round" />
                  <path d={r.d} fill="none" stroke={congestionColor(levels[i])} strokeWidth={hw ? 2.2 : 1.6} strokeLinecap="round" />
                  <path
                    d={r.d}
                    fill="none"
                    stroke="#ffffff"
                    strokeOpacity={0.55}
                    strokeWidth={0.7}
                    strokeDasharray="0.8 5"
                    strokeLinecap="round"
                    className={styles.flow}
                    style={{ animationDuration: `${(1.2 + levels[i] * 6).toFixed(1)}s` }}
                  />
                </g>
              );
            })}

            {/* Rail: M2 metro + Marmaray, ferry line */}
            <path d={smooth([[186, 100], [184, 130], [181, 160], [178, 186], [180, 204]])} fill="none" stroke="#3aa655" strokeWidth={1} strokeDasharray="3 1.5" />
            <path d="M184 216 Q210 222 230 242" fill="none" stroke={ferryCancelled ? '#c0392b' : '#3b7fbf'} strokeWidth={0.9} strokeDasharray="1.6 1.6" />

            {/* Alternative routes (grey), then the selected route in blue */}
            {available
              .filter((r) => r.id !== route.id)
              .map((r) => (
                <g key={r.id} className={styles.altRoute} onClick={() => setRouteId(r.id)}>
                  <path d={r.d} fill="none" stroke="#ffffff" strokeWidth={4.6} strokeLinecap="round" strokeLinejoin="round" />
                  <path d={r.d} fill="none" stroke="#a9bfdc" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={r.mode === 'car' ? undefined : '0.1 4'} />
                  <path d={r.d} fill="none" stroke="transparent" strokeWidth={12} />
                </g>
              ))}
            <path d={route.d} fill="none" stroke="#ffffff" strokeWidth={5.4} strokeLinecap="round" strokeLinejoin="round" />
            <path
              d={route.d}
              fill="none"
              stroke="#1a73e8"
              strokeWidth={route.mode === 'car' ? 3.6 : 3.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={route.mode === 'car' ? undefined : '0.1 4.4'}
              className={styles.routeDraw}
              key={route.id}
            />

            {/* Labels */}
            <text x="206" y="112" transform="rotate(-82 206 112)" className={styles.water} style={label(6)}>
              İstanbul Boğazı
            </text>
            <text x="92" y="270" className={styles.water} style={label(7.5)}>
              Marmara Denizi
            </text>
            <text x="148" y="200" transform="rotate(33 148 200)" className={styles.water} style={label(4.6)}>
              Haliç
            </text>
            {DISTRICTS.map((d) => (
              <text key={d.name} x={d.at[0]} y={d.at[1]} className={styles.district} style={label(5.2)}>
                {d.name}
              </text>
            ))}

            {/* Incidents */}
            {incidents.map((inc) => (
              <g
                key={inc.label}
                transform={`translate(${inc.at[0]} ${inc.at[1]}) scale(${1 / k})`}
                className={styles.incident}
                onClick={(e) => {
                  e.stopPropagation();
                  setIncident(inc.label);
                  audioEngine.playUi('click');
                }}
              >
                <circle r="6.5" fill="#fff" stroke="#e8542f" strokeWidth="1.4" />
                <text y="2.6" className={styles.incidentIcon}>
                  {inc.icon}
                </text>
              </g>
            ))}

            {/* Time bubbles */}
            {available.map((r) => {
              const on = r.id === route.id;
              return (
                <g key={r.id} transform={`translate(${r.tag[0]} ${r.tag[1]}) scale(${1 / k})`} className={styles.bubble} onClick={() => setRouteId(r.id)}>
                  <rect x="-20" y="-8" width="40" height="16" rx="5" fill={on ? '#1a73e8' : '#ffffff'} stroke={on ? '#1a73e8' : '#c5ccd6'} strokeWidth="0.8" />
                  <text y="3.3" className={on ? styles.bubbleOn : styles.bubbleText}>
                    {MODE_ICON[r.mode]} {eta(r)} dk
                  </text>
                </g>
              );
            })}

            {/* Home pin + you (office) */}
            <g transform={`translate(${HOME[0]} ${HOME[1]}) scale(${1 / k})`}>
              <path d="M0 0 C-2 -5 -7 -8 -7 -13 A7 7 0 1 1 7 -13 C7 -8 2 -5 0 0 Z" fill="#ea4335" stroke="#b3261e" strokeWidth="0.8" />
              <circle cy="-13" r="2.6" fill="#7a1a14" />
              <text y="-23" className={styles.pinLabel}>Ev</text>
            </g>
            <g transform={`translate(${OFFICE[0]} ${OFFICE[1]}) scale(${1 / k})`}>
              <circle r="16" fill="url(#trPulse)" className={styles.pulse} />
              <circle r="5.2" fill="#ffffff" />
              <circle r="3.8" fill="#1a73e8" />
              <text y="-9" className={styles.pinLabel}>Ofis</text>
            </g>
          </g>
        </svg>

        <div className={styles.controls}>
          <button onClick={() => zoom(1.35)} aria-label="Yakınlaştır">
            +
          </button>
          <button onClick={() => zoom(1 / 1.35)} aria-label="Uzaklaştır">
            −
          </button>
        </div>
        <button className={styles.recenter} onClick={() => setView(HOME_VIEW)} aria-label="Konumuma dön">
          <svg viewBox="0 0 20 20">
            <circle cx="10" cy="10" r="4" fill="#1a73e8" />
            <circle cx="10" cy="10" r="7" fill="none" stroke="#1a73e8" strokeWidth="1.6" />
            <path d="M10 1v3M10 16v3M1 10h3M16 10h3" stroke="#1a73e8" strokeWidth="1.6" />
          </svg>
        </button>
        <div className={styles.scale}>
          <i />
          {k > 2 ? '500 m' : '1 km'}
        </div>
        <div className={styles.legend}>
          <span>Hızlı</span>
          <i style={{ background: '#2fb266' }} />
          <i style={{ background: '#f5a623' }} />
          <i style={{ background: '#e8542f' }} />
          <i style={{ background: '#a4161a' }} />
          <span>Yavaş</span>
        </div>
        {incident && (
          <button className={styles.toast} onClick={() => setIncident(null)}>
            {incident}
          </button>
        )}
      </div>

      <div className={styles.sheet}>
        <span className={styles.grabber} />
        <div className={styles.modes}>
          {ROUTES.map((r) => {
            const off = r.mode === 'ferry' && ferryCancelled;
            return (
              <button
                key={r.id}
                disabled={off}
                className={`${styles.mode} ${r.id === route.id ? styles.modeOn : ''}`}
                onClick={() => {
                  setRouteId(r.id);
                  audioEngine.playUi('select', 1);
                }}
              >
                <span>{MODE_ICON[r.mode]}</span>
                <strong className="mono">{off ? 'İptal' : `${eta(r)} dk`}</strong>
                <small>{r.id === 'carFsm' ? 'TEM' : r.label}</small>
              </button>
            );
          })}
        </div>
        <div className={styles.summary}>
          <div>
            <strong className={styles.bigEta} style={{ color: delay > 8 ? '#d93025' : delay > 3 ? '#e37400' : '#188038' }}>
              {eta(route)} dk
            </strong>
            <span className={styles.km}>({route.km})</span>
          </div>
          <span className={styles.via}>{route.via}</span>
          <span className={styles.note}>
            {route.id === best.id ? 'Mevcut trafik koşullarına göre en hızlı rota. ' : ''}
            {route.mode === 'car'
              ? delay > 3
                ? `Normalden ${delay} dk daha yavaş${rush > 0.5 ? ' · akşam trafiği zirvede' : ''}.`
                : 'Trafik normal seyrinde.'
              : route.mode === 'bus'
                ? 'Ayrı yolda ilerler, trafikten az etkilenir.'
                : 'Trafikten etkilenmez; hava koşullarına bağlı.'}
          </span>
        </div>
        <div className={styles.arrive}>
          <span>Mesai bitince çıkarsan tahmini varış</span>
          <strong className="mono">{arrival(Math.max(minutes, WORKDAY_END_MIN) + eta(route))}</strong>
        </div>
      </div>
    </div>
  );
}
