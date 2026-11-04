import { useId, useMemo, type ReactNode } from 'react';
import { ayasofya, bridge, galata, haydarpasa, kizKulesi, mosque, pier, tone, topkapi, walls, type Tone } from './landmarks';
import { mix, Painter, rng, shade } from './paint';
import { FAR_W, H, HORIZON, MID_W, NEAR_W, type Palette } from './palettes';

/*
 * Karaköy'den Kadıköy'e rota: üç katman, yolculuk boyunca bir kez kayar (Scene.tsx).
 *   Uzak: Beyoğlu sırtı, Haliç'in içi, Marmara'da Adalar ve demirli gemiler, Çamlıca tepeleri.
 *   Orta: Galata Kulesi ve Karaköy, Galata Köprüsü, Yeni Cami, Süleymaniye, Sirkeci, surlar ve
 *         Topkapı, Ayasofya, Sultanahmet; Marmara açıklığından sonra Anadolu yakası.
 *   Yakın: Karaköy iskelesi, şamandıralar ve balıkçı kayıkları, Kız Kulesi, Haydarpaşa, Kadıköy
 *          iskelesi.
 * Uzaklık pusla verilir; orta ve yakın katman suya yansır (gündüz ters bir kopya, gece yanan
 * pencerelerin ve anıtların titrek ışık sütunları).
 */

/** Orta katmanın kıyısı ve yansıma ekseni. */
const MID_BASE = 524;
/** Yakın katmandaki her şey bu çizgide suya oturur. */
const NEAR_BASE = 562;

type Ground = (x: number) => number;

/** Noktalar arasında doğrusal yükselti. */
function ground(points: [number, number][]): Ground {
  return (x) => {
    for (let i = 1; i < points.length; i++) {
      const [x1, y1] = points[i];
      const [x0, y0] = points[i - 1];
      if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / Math.max(1, x1 - x0);
    }
    return points[points.length - 1][1];
  };
}

function hill(P: Painter, color: string, g: Ground, x0: number, x1: number, base: number) {
  const pts: [number, number][] = [[x0, base]];
  for (let x = x0; x <= x1; x += 20) pts.push([x, g(x)]);
  pts.push([x1, g(x1)], [x1, base]);
  P.poly(color, pts);
}

/**
 * Şehir dokusu: tepeden kıyıya sıra sıra binalar (arkadakiler pusa karışır, öndekiler büyür),
 * kiremit çatılar, pencereler ve ağaçlar. Gece pencerelerin bir kısmı yanar; kıyıya yakın yanan
 * pencereler suya ışık sütunu düşürür.
 */
function city(P: Painter, glints: Painter, p: Palette, hz: number, rand: () => number, x0: number, x1: number, g: Ground, base: number, rows: number, z: number) {
  for (let row = 0; row < rows; row++) {
    const k = rows === 1 ? 1 : row / (rows - 1);
    const haze = hz * (1.25 - k * 0.55);
    const size = 0.75 + k * 0.6;
    for (let x = x0; x < x1; ) {
      const w = (9 + rand() * 16) * size;
      const top0 = g(x + w / 2);
      const y = top0 + (base - top0) * k * 0.92;
      const h = (10 + rand() * 20) * size;
      const face = mix(p.city[Math.floor(rand() * p.city.length)], p.haze, Math.min(1, haze));
      P.at(z + row * 3).rect(face, x, y - h, w, h + (base - y) + 2);
      P.rect(shade(face, -0.12), x + w * 0.72, y - h, w * 0.28, h + (base - y) + 2);
      if (rand() < 0.55) P.poly(mix(p.roof, p.haze, Math.min(1, haze)), [
        [x - 1, y - h],
        [x + w * 0.5, y - h - w * 0.28],
        [x + w + 1, y - h],
      ]);
      // pencereler
      const cols = Math.max(1, Math.floor(w / (5 * size)));
      const floors = Math.max(1, Math.floor(h / (7 * size)));
      for (let f = 0; f < floors; f++)
        for (let c = 0; c < cols; c++) {
          const on = p.lit && rand() < 0.3;
          if (!on && (p.lit || rand() < 0.25)) continue;
          const wx = x + 2 * size + c * ((w - 3 * size) / cols);
          const wy = y - h + 3 * size + f * 7 * size;
          P.at(z + row * 3 + 1).rect(on ? mix(p.light, p.haze, haze * 0.4) : mix(p.window, p.haze, Math.min(1, haze)), wx, wy, 1.6 * size, 2.6 * size);
          if (on && row === rows - 1 && base - wy < 70 && rand() < 0.5) glints.rect(p.light, wx - 1, base + (base - wy) * 0.6, 3.6, 1.6);
        }
      if (rand() < 0.12) P.at(z + row * 3 + 2).circle(mix(p.tree, p.haze, Math.min(1, haze * 0.8)), x + rand() * w, y - h * 0.3, 5 * size + rand() * 6);
      x += w + rand() * 3;
    }
  }
}

/** Gece anıtın suya düşen ışık sütunu: aşağı indikçe titrek ve seyrek. */
function column(glints: Painter, color: string, x: number, base: number, width: number, depth: number) {
  for (let y = base + 3; y < base + depth; y += 5) {
    const w = width * (1 - (y - base) / depth) * (0.6 + ((x * 7 + y) % 5) / 10);
    glints.rect(color, x - w / 2 + ((y * 3) % 7) - 3, y, w, 1.8);
  }
}

function Paths({ painter }: { painter: Painter }) {
  return (
    <>
      {painter.entries().map(([fill, d], i) => (
        <path key={i} d={d} fill={fill} />
      ))}
    </>
  );
}

/** Suyun yüzeyi: ufukta gökyüzünü yansıtan açık renk, derine doğru koyulaşır. */
function WaterBand({ id, p, y, w }: { id: string; p: Palette; y: number; w: number }) {
  return (
    <>
      <linearGradient id={id} x1="0" y1={y} x2="0" y2={H} gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor={p.waterTop} />
        <stop offset="0.28" stopColor={p.water} />
        <stop offset="1" stopColor={p.waterDeep} />
      </linearGradient>
      <rect x={0} y={y} width={w} height={H - y} fill={`url(#${id})`} />
    </>
  );
}

/**
 * Yansıma: kara suyun yüzeyinde ters çevrilir. Bir maske onu yatay, kırık şeritlere böler
 * (dalgalar yansımayı parçalar) ve derine indikçe söndürür; açık suya çizgi düşmez.
 */
function Reflection({ id, of, axis, w, depth, opacity }: { id: string; of: string; axis: number; w: number; depth: number; opacity: number }) {
  const gaps: string[] = [];
  for (let y = axis + 3; y < axis + depth; y += 4 + Math.floor((y - axis) / 26)) gaps.push(`M0 ${y}h${w}`);
  return (
    <>
      <linearGradient id={`${id}-fade`} x1="0" y1={axis} x2="0" y2={axis + depth} gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#fff" stopOpacity={1} />
        <stop offset="1" stopColor="#fff" stopOpacity={0} />
      </linearGradient>
      <mask id={`${id}-mask`} maskUnits="userSpaceOnUse" x={0} y={axis} width={w} height={depth}>
        <rect x={0} y={axis} width={w} height={depth} fill={`url(#${id}-fade)`} />
        <path d={gaps.join('')} stroke="#000" strokeWidth={1.8} />
      </mask>
      <g mask={`url(#${id}-mask)`}>
        <use href={`#${of}`} transform={`matrix(1 0 0 -1 0 ${axis * 2})`} opacity={opacity} />
      </g>
    </>
  );
}

export function Far({ p }: { p: Palette }) {
  const id = useId().replace(/\W/g, '');
  const art = useMemo(() => {
    const P = new Painter();
    const rand = rng(17);
    const hz = 0.62;
    const far = mix(p.far, p.haze, 0.35);
    const g = ground([
      [0, 438],
      [500, 418],
      [1100, 432],
      [1500, 470],
      [1900, 462],
      [2500, 486],
      [3100, 506],
      [3300, 520],
      [3900, 521],
      [4000, 500],
      [4300, 452],
      [4500, 440],
      [4800, 462],
    ]);
    P.at(0);
    hill(P, far, g, 0, FAR_W, HORIZON + 2);
    // tepelerdeki silik şehir
    for (let x = 0; x < FAR_W; x += 2 + rand() * 3) {
      const top = g(x);
      if (top > 505) continue;
      for (let k = 0; k < 3; k++) {
        const y = top + 4 + rand() * (HORIZON - top - 4);
        const h = 1.5 + rand() * 3.5;
        P.at(1).rect(mix(mix(p.city[Math.floor(rand() * p.city.length)], far, 0.45), p.haze, hz), x, y - h, 2 + rand() * 4, h);
        if (p.lit && rand() < 0.2) P.at(2).rect(mix(p.light, p.haze, 0.35), x + 1, y - h + 0.5, 1, 1);
      }
    }
    // Adalar: Marmara'da silik tümsekler
    for (const [x, w, h] of [
      [3380, 160, 9],
      [3580, 120, 12],
      [3740, 200, 15],
    ])
      P.at(0).poly(mix(far, p.haze, 0.45), [
        [x, HORIZON + 1],
        [x + w * 0.3, HORIZON - h],
        [x + w * 0.7, HORIZON - h * 0.8],
        [x + w, HORIZON + 1],
      ]);
    // demirli gemiler
    for (const x of [2700, 2980, 3260, 3500]) {
      const c = mix(p.lit ? '#0e1220' : '#4c5560', p.haze, 0.5);
      P.at(3).rect(c, x, HORIZON - 5, 46, 5);
      P.rect(c, x + 30, HORIZON - 12, 12, 7);
      if (p.lit) P.at(4).rect(p.light, x + 34, HORIZON - 10, 2, 2);
    }
    // Çamlıca'da kuleler
    P.at(3).rect(mix('#8a8f99', p.haze, 0.5), 4480, 400, 4, 42);
    P.rect(mix('#8a8f99', p.haze, 0.5), 4476, 410, 12, 6);
    return P;
  }, [p]);
  return (
    <>
      <Paths painter={art} />
      <rect x={0} y={HORIZON} width={FAR_W} height={H - HORIZON} fill={p.waterTop} />
      <linearGradient id={`${id}-haze`} x1="0" y1="380" x2="0" y2={HORIZON} gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor={p.haze} stopOpacity={0} />
        <stop offset="1" stopColor={p.haze} stopOpacity={0.55} />
      </linearGradient>
      <rect x={0} y={380} width={FAR_W} height={HORIZON - 380} fill={`url(#${id}-haze)`} />
    </>
  );
}

export function Mid({ p }: { p: Palette }) {
  const id = useId().replace(/\W/g, '');
  const { land, glints, glows } = useMemo(() => {
    const P = new Painter();
    const G = new Painter();
    const glows: [number, number, number][] = [];
    const rand = rng(29);
    const hz = 0.3;
    const t: Tone = tone(p, hz);
    const g = ground([
      [0, 470],
      [300, 428],
      [700, 392],
      [1100, 428],
      [1380, 500],
      [1440, 524],
      [1980, 524],
      [2060, 500],
      [2400, 470],
      [2900, 430],
      [3300, 452],
      [3700, 478],
      [3950, 496],
      [4150, 476],
      [4500, 462],
      [4900, 470],
      [5200, 462],
      [5550, 442],
      [6150, 446],
      [6550, 480],
      [6950, 506],
      [7120, 524],
      [7500, 524],
      [7650, 502],
      [8300, 484],
      [9000, 468],
      [9600, 478],
    ]);
    const land = mix(p.city[0], p.haze, 0.5);
    // tepeler ve şehir
    for (const [a, b] of [
      [0, 1440],
      [1980, 7120],
      [7500, MID_W],
    ]) {
      P.at(0);
      hill(P, land, g, a, b, MID_BASE + 2);
      city(P, G, p, hz, rand, a, b, g, MID_BASE, 4, 1);
    }
    // anıtlar: şehrin önünde, kendi derinliklerinde
    galata(P, t, 720, g(720) + 6, 1, 20);
    bridge(P, t, 1400, 2020, MID_BASE - 12, 20);
    mosque(P, t, 2250, MID_BASE - 2, { r: 36, minarets: [{ dx: -48, h: 118, b: 3 }, { dx: 48, h: 118, b: 3 }], small: 3 }, 30);
    mosque(
      P,
      t,
      2900,
      g(2900) + 8,
      {
        r: 50,
        minarets: [
          { dx: -64, h: 150, b: 3 },
          { dx: 64, h: 150, b: 3 },
          { dx: -128, h: 118, b: 2 },
          { dx: 128, h: 118, b: 2 },
        ],
        small: 3,
      },
      30,
    );
    mosque(P, t, 3480, g(3480) + 8, { r: 20, minarets: [{ dx: 28, h: 64, b: 1 }], half: false, small: 1 }, 30);
    walls(P, t, 3880, 5300, MID_BASE + 1, 45);
    topkapi(P, t, 4120, g(4400) + 14, 760, rand, 30);
    ayasofya(P, t, 5560, g(5560) + 10, 46, 30);
    mosque(
      P,
      t,
      6160,
      g(6160) + 10,
      {
        r: 44,
        minarets: [
          { dx: -170, h: 112, b: 2 },
          { dx: 170, h: 112, b: 2 },
          { dx: -112, h: 130, b: 3 },
          { dx: 112, h: 130, b: 3 },
          { dx: -58, h: 140, b: 3 },
          { dx: 58, h: 140, b: 3 },
        ],
        small: 4,
      },
      30,
    );
    mosque(P, t, 8320, g(8320) + 8, { r: 18, minarets: [{ dx: 26, h: 58, b: 1 }], half: false, small: 1 }, 30);
    // kıyı rıhtımı
    P.at(48);
    for (const [a, b] of [
      [0, 1440],
      [1980, 7120],
      [7500, MID_W],
    ])
      P.rect(mix(t.wall, p.haze, 0.2), a, MID_BASE - 3, b - a, 5);
    if (p.lit) {
      // ışıklandırılmış anıtların halesi ve suya düşen sütunları
      for (const [x, y, w] of [
        [720, 300, 40],
        [2250, 480, 90],
        [2900, 380, 120],
        [5560, 400, 110],
        [6160, 410, 120],
        [4440, 360, 24],
      ]) {
        glows.push([x, y, w]);
        column(G, mix(p.flood, p.light, 0.4), x, MID_BASE, w * 0.5, 120);
      }
    }
    return { land: P, glints: G, glows };
  }, [p]);
  return (
    <>
      {/* gece ışıklandırılmış anıtların arkasındaki yumuşak hale */}
      <radialGradient id={`${id}-glow`}>
        <stop offset="0" stopColor={p.flood} stopOpacity={0.32} />
        <stop offset="0.5" stopColor={p.flood} stopOpacity={0.1} />
        <stop offset="1" stopColor={p.flood} stopOpacity={0} />
      </radialGradient>
      {glows.map(([x, y, w]) => (
        <ellipse key={x} cx={x} cy={y} rx={w * 1.6} ry={w * 1.1} fill={`url(#${id}-glow)`} />
      ))}
      <g id={`${id}-land`}>
        <Paths painter={land} />
      </g>
      <WaterBand id={`${id}-water`} p={p} y={MID_BASE} w={MID_W} />
      <Reflection id={`${id}-refl`} of={`${id}-land`} axis={MID_BASE} w={MID_W} depth={150} opacity={p.lit ? 0.4 : 0.32} />
      <g className="glints">
        <Paths painter={glints} />
      </g>
    </>
  );
}

/** Yakın katmandaki iskele tabelası. */
function Sign({ x, y, text, p }: { x: number; y: number; text: string; p: Palette }) {
  return (
    <g>
      <rect x={x - 66} y={y - 17} width={132} height={24} rx={2} fill={p.lit ? '#1f3a5a' : '#21466d'} stroke="#e9e4d6" strokeWidth={1.5} />
      <text x={x} y={y + 1} textAnchor="middle" fill="#f5f1e6" fontFamily="'Manrope', Arial, sans-serif" fontWeight={800} fontSize={14} letterSpacing={2}>
        {text}
      </text>
    </g>
  );
}

export function Near({ p, children }: { p: Palette; children?: ReactNode }) {
  const id = useId().replace(/\W/g, '');
  const { art, glints } = useMemo(() => {
    const P = new Painter();
    const G = new Painter();
    const rand = rng(53);
    const t = tone(p, 0.08);
    // Karaköy ve Kadıköy kıyısı: iskelenin arkasında büyük binalar
    const flat = () => NEAR_BASE - 30;
    city(P, G, p, 0.12, rand, -20, 1500, flat, NEAR_BASE - 4, 2, 0);
    city(P, G, p, 0.12, rand, 12300, NEAR_W + 20, flat, NEAR_BASE - 4, 2, 0);
    pier(P, t, 260, NEAR_BASE, 1, 10);
    kizKulesi(P, t, 9300, NEAR_BASE, 1.3, 10);
    haydarpasa(P, t, 11050, NEAR_BASE, 0.95, 10);
    pier(P, t, 13420, NEAR_BASE, 1.15, 10);
    if (p.lit) {
      for (const [x, w] of [
        [9300, 44],
        [11220, 60],
        [13600, 60],
        [410, 50],
      ])
        column(G, mix(p.flood, p.light, 0.5), x, NEAR_BASE, w, 170);
    }
    // şamandıralar
    for (const x of [1900, 4100, 6900, 10400]) {
      P.at(20).poly('#c43c2c', [
        [x - 7, NEAR_BASE + 4],
        [x - 4, NEAR_BASE - 16],
        [x + 4, NEAR_BASE - 16],
        [x + 7, NEAR_BASE + 4],
      ]);
      P.rect('#f2efe6', x - 5, NEAR_BASE - 10, 10, 4);
      if (p.lit) P.at(21).circle('#ffd27a', x, NEAR_BASE - 19, 2.6);
    }
    return { art: P, glints: G };
  }, [p]);
  return (
    <>
      <g id={`${id}-near`}>
        <Paths painter={art} />
        <Sign x={410} y={NEAR_BASE - 112} text="KARAKÖY" p={p} />
        <Sign x={13620} y={NEAR_BASE - 128} text="KADIKÖY" p={p} />
        {children}
      </g>
      <Reflection id={`${id}-refl`} of={`${id}-near`} axis={NEAR_BASE} w={NEAR_W} depth={200} opacity={0.4} />
      <g className="glints">
        <Paths painter={glints} />
      </g>
    </>
  );
}
