import { useId, useMemo, type ReactNode } from 'react';
import type { FoodKind } from '../../game/data/lunchMenus';

/*
 * Tabldot food renderer. Each dish is a "recipe":
 *   base   — an irregular mound (noise-perturbed blob) shaded with a radial gradient,
 *            a contact shadow on the steel, and an optional glossy sauce sheen;
 *   layers — pieces (beans, grains, köfte, leaves…) each drawn with its own drop shadow,
 *            body and specular highlight so they read as 3D;
 *   dust   — fine garnish (cinnamon, paprika, dill) scattered on top.
 * Drawn in the tray's squashed coordinates, so everything is naturally foreshortened.
 * As the portion is eaten the mound shrinks and pieces disappear, leaving a smear.
 */

type PieceShape =
  | 'bean'
  | 'chickpea'
  | 'grain'
  | 'orzo'
  | 'chunk'
  | 'leaf'
  | 'tomatoWedge'
  | 'cucumber'
  | 'onionRing'
  | 'pepperStrip'
  | 'kofte'
  | 'potato'
  | 'tomatoSlice'
  | 'eggplant'
  | 'pickle'
  | 'carrot'
  | 'diamond'
  | 'roll'
  | 'blob';

interface Layer {
  shape: PieceShape;
  count: number;
  colors: string[];
  size: number;
  /** Fraction of the mound radius the pieces spread over. */
  spread?: number;
  /** Lay pieces out in an even row instead of scattering (big items: köfte, eggplants). */
  row?: boolean;
  shadow?: boolean;
}

interface Recipe {
  base: { light: string; mid: string; dark: string; glossy: boolean; height: number } | null;
  layers: Layer[];
  dust?: { color: string; count: number; size: number }[];
}

const RECIPES: Record<FoodKind, Recipe> = {
  fasulye: {
    base: { light: '#e27a4c', mid: '#bf4a2c', dark: '#8a2e1c', glossy: true, height: 0.9 },
    layers: [
      { shape: 'bean', count: 44, colors: ['#f4ead2', '#efe2c3', '#f7efdb'], size: 12 },
      { shape: 'chunk', count: 6, colors: ['#7a4128', '#6a371f'], size: 13 },
    ],
    dust: [{ color: '#9e2a14', count: 30, size: 1.4 }],
  },
  nohut: {
    base: { light: '#dc8350', mid: '#bd5d31', dark: '#8e3e20', glossy: true, height: 0.9 },
    layers: [
      { shape: 'chickpea', count: 36, colors: ['#e8c47c', '#e0b766', '#edcd8d'], size: 10 },
      { shape: 'chunk', count: 7, colors: ['#6e3b25', '#7d4630'], size: 15 },
    ],
    dust: [{ color: '#8a2a12', count: 20, size: 1.3 }],
  },
  sote: {
    base: { light: '#e39c55', mid: '#c7762f', dark: '#9a551f', glossy: true, height: 0.85 },
    layers: [
      { shape: 'chunk', count: 13, colors: ['#f2d7a6', '#ebc98f', '#f5deb3'], size: 20 },
      { shape: 'pepperStrip', count: 8, colors: ['#4f8d38', '#5f9e45'], size: 22 },
      { shape: 'pepperStrip', count: 6, colors: ['#c73a22', '#d24a2c'], size: 20 },
      { shape: 'onionRing', count: 4, colors: ['#efe0c8'], size: 12 },
    ],
    dust: [{ color: '#3f7d2c', count: 16, size: 1.6 }],
  },
  karniyarik: {
    base: { light: '#d8604a', mid: '#b24530', dark: '#7e2d1c', glossy: true, height: 0.6 },
    layers: [{ shape: 'eggplant', count: 2, colors: ['#3d2140'], size: 84, row: true, spread: 0.55 }],
    dust: [{ color: '#3f7d2c', count: 14, size: 1.8 }],
  },
  kofte: {
    base: { light: '#dd8a57', mid: '#c35a30', dark: '#983f20', glossy: true, height: 0.55 },
    layers: [
      { shape: 'potato', count: 6, colors: ['#e9c46a', '#e2b95a'], size: 24 },
      { shape: 'kofte', count: 6, colors: ['#6b3b24', '#5e321d'], size: 30, row: false, spread: 0.6 },
      { shape: 'tomatoSlice', count: 3, colors: ['#cc3a20'], size: 20 },
      { shape: 'pepperStrip', count: 3, colors: ['#4f8d38'], size: 28 },
    ],
  },
  pilav: {
    base: { light: '#ffffff', mid: '#f4eee0', dark: '#d8cdb3', glossy: false, height: 1.1 },
    layers: [
      { shape: 'orzo', count: 16, colors: ['#c9914f', '#b98040'], size: 9 },
      { shape: 'grain', count: 110, colors: ['#fffef9', '#fbf7ea', '#f6f0df'], size: 7, shadow: false },
    ],
  },
  bulgur: {
    base: { light: '#e0bd82', mid: '#c99d5f', dark: '#a57a41', glossy: false, height: 1.05 },
    layers: [
      { shape: 'grain', count: 100, colors: ['#b38443', '#dcb479', '#c7964f'], size: 5, shadow: false },
      { shape: 'blob', count: 10, colors: ['#b33c1f'], size: 5 },
    ],
    dust: [{ color: '#3f7d2c', count: 14, size: 1.8 }],
  },
  salata: {
    base: { light: '#e9f1d6', mid: '#d6e5bb', dark: '#b6cc92', glossy: true, height: 0.5 },
    layers: [
      { shape: 'leaf', count: 7, colors: ['#8cc063', '#79b04f', '#9fcc73'], size: 34 },
      { shape: 'tomatoWedge', count: 7, colors: ['#d2351f'], size: 16 },
      { shape: 'cucumber', count: 7, colors: ['#86b94f'], size: 14 },
      { shape: 'onionRing', count: 4, colors: ['#e9d9ef'], size: 14 },
    ],
    dust: [{ color: '#3f7d2c', count: 18, size: 1.8 }],
  },
  tursu: {
    base: { light: '#f3ebc4', mid: '#e3d49c', dark: '#c6b36e', glossy: true, height: 0.35 },
    layers: [
      { shape: 'pickle', count: 5, colors: ['#7c9b3b', '#6e8c31'], size: 36 },
      { shape: 'carrot', count: 5, colors: ['#e07b28'], size: 13 },
      { shape: 'pepperStrip', count: 3, colors: ['#c9412a'], size: 22 },
    ],
  },
  cacik: {
    base: { light: '#ffffff', mid: '#f6f5ee', dark: '#dcd8c8', glossy: true, height: 0.45 },
    layers: [
      { shape: 'blob', count: 22, colors: ['#a6c77a', '#b8d38f'], size: 5, shadow: false },
    ],
    dust: [
      { color: '#4f8634', count: 30, size: 1.3 },
      { color: '#d8c14a', count: 3, size: 4 },
    ],
  },
  yogurt: {
    base: { light: '#ffffff', mid: '#faf9f4', dark: '#e0dccd', glossy: true, height: 0.5 },
    layers: [],
    dust: [
      { color: '#9b2d2d', count: 18, size: 1.2 },
      { color: '#d8c14a', count: 2, size: 4.5 },
    ],
  },
  sutlac: {
    base: { light: '#f8eed6', mid: '#efdcb4', dark: '#cfae76', glossy: false, height: 0.55 },
    layers: [{ shape: 'blob', count: 9, colors: ['#b87632', '#c98a3e', '#a8662a'], size: 18, shadow: false }],
    dust: [{ color: '#8b5a2b', count: 40, size: 1.1 }],
  },
  kazandibi: {
    base: { light: '#f0dcb0', mid: '#e3c690', dark: '#c29d5c', glossy: false, height: 0.45 },
    layers: [{ shape: 'roll', count: 3, colors: ['#b36e2a'], size: 46, row: true, spread: 0.55 }],
    dust: [{ color: '#7a4a22', count: 26, size: 1.2 }],
  },
  serbetli: {
    base: { light: '#f5d38a', mid: '#e5ad52', dark: '#bf8434', glossy: true, height: 0.35 },
    layers: [{ shape: 'diamond', count: 5, colors: ['#d99a3a', '#cf8f30'], size: 30, row: true, spread: 0.62 }],
    dust: [{ color: '#7fa33e', count: 26, size: 1.6 }],
  },
};

// ── helpers ──────────────────────────────────────────────────────────────────

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Closed smooth blob through noisy radial points (Catmull-Rom → cubic Bézier). */
function blobPath(cx: number, cy: number, rx: number, ry: number, rand: () => number, jag = 0.1, points = 14) {
  const pts = Array.from({ length: points }, (_, i) => {
    const a = (i / points) * Math.PI * 2;
    const k = 1 + (rand() - 0.5) * 2 * jag;
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
  });
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < points; i++) {
    const p0 = pts[(i - 1 + points) % points];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % points];
    const p3 = pts[(i + 2) % points];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return `${d} Z`;
}

const HIGHLIGHT = 'rgba(255, 255, 255, 0.45)';
const SHADOW = 'rgba(40, 20, 10, 0.28)';

/** Draws one piece centred on 0,0 (caller positions/rotates it). */
function Piece({ shape, size: s, color, rand }: { shape: PieceShape; size: number; color: string; rand: () => number }): ReactNode {
  switch (shape) {
    case 'bean':
      return (
        <>
          <path d={`M${-s / 2} 0 C${-s / 2} ${-s / 3} ${s / 2} ${-s / 3} ${s / 2} 0 C${s / 2} ${s / 3} ${s / 8} ${s / 5} 0 ${s / 7} C${-s / 8} ${s / 5} ${-s / 2} ${s / 3} ${-s / 2} 0 Z`} fill={color} stroke="#d6c49c" strokeWidth="0.6" />
          <ellipse cx={-s / 8} cy={-s / 7} rx={s / 5} ry={s / 12} fill={HIGHLIGHT} />
        </>
      );
    case 'chickpea':
      return (
        <>
          <circle r={s / 2} fill={color} stroke="#c49a48" strokeWidth="0.6" />
          <path d={`M${s * 0.15} ${-s * 0.45} q${s * 0.12} ${-s * 0.12} ${s * 0.2} 0`} stroke="#b88a3e" strokeWidth="0.8" fill="none" />
          <circle cx={-s / 6} cy={-s / 6} r={s / 6} fill={HIGHLIGHT} />
        </>
      );
    case 'grain':
      return <ellipse rx={s / 2} ry={s / 5.5} fill={color} stroke="rgba(160,140,100,0.25)" strokeWidth="0.4" />;
    case 'orzo':
      return <ellipse rx={s / 2} ry={s / 6} fill={color} />;
    case 'chunk': {
      const d = blobPath(0, 0, s / 2, s / 2.6, rand, 0.25, 7);
      return (
        <>
          <path d={d} fill={color} />
          <path d={blobPath(-s / 8, -s / 8, s / 5, s / 9, rand, 0.3, 6)} fill={HIGHLIGHT} opacity="0.7" />
        </>
      );
    }
    case 'leaf': {
      const d = `M${-s / 2} 0 C${-s / 3} ${-s / 2.5} ${s / 3} ${-s / 2.2} ${s / 2} ${-s / 12} C${s / 2.6} ${s / 6} ${s / 5} ${s / 4} ${s / 10} ${s / 5} C0 ${s / 3.2} ${-s / 4} ${s / 5} ${-s / 2} 0 Z`;
      return (
        <>
          <path d={d} fill={color} stroke="rgba(60,110,40,0.5)" strokeWidth="0.8" />
          <path d={`M${-s / 2.4} 0 Q0 ${-s / 14} ${s / 2.3} ${-s / 14}`} stroke="#d4ebb8" strokeWidth="1" fill="none" opacity="0.8" />
        </>
      );
    }
    case 'tomatoWedge':
      return (
        <>
          <path d={`M${-s / 2} ${s / 5} Q0 ${-s / 1.6} ${s / 2} ${s / 5} Z`} fill={color} />
          <path d={`M${-s / 3} ${s / 7} Q0 ${-s / 3} ${s / 3} ${s / 7} Z`} fill="#ea6a4e" />
          {[-s / 6, 0, s / 6].map((x) => (
            <ellipse key={x} cx={x} cy={s / 12} rx={s / 22} ry={s / 16} fill="#f6d27a" />
          ))}
        </>
      );
    case 'cucumber':
      return (
        <>
          <circle r={s / 2} fill={color} />
          <circle r={s / 2.5} fill="#dff0c4" />
          {Array.from({ length: 6 }).map((_, i) => {
            const a = (i / 6) * Math.PI * 2;
            return <ellipse key={i} cx={Math.cos(a) * s * 0.18} cy={Math.sin(a) * s * 0.18} rx={s / 18} ry={s / 12} fill="#b8d890" transform={`rotate(${(a * 180) / Math.PI} ${Math.cos(a) * s * 0.18} ${Math.sin(a) * s * 0.18})`} />;
          })}
          <circle cx={-s / 6} cy={-s / 6} r={s / 8} fill={HIGHLIGHT} />
        </>
      );
    case 'onionRing':
      return <ellipse rx={s / 2} ry={s / 2.4} fill="none" stroke={color} strokeWidth={s / 7} opacity="0.95" />;
    case 'pepperStrip':
      return (
        <>
          <path d={`M${-s / 2} 0 Q0 ${-s / 5} ${s / 2} 0`} stroke={color} strokeWidth={s / 4.5} strokeLinecap="round" fill="none" />
          <path d={`M${-s / 3} ${-s / 12} Q0 ${-s / 4} ${s / 3} ${-s / 12}`} stroke={HIGHLIGHT} strokeWidth={s / 16} strokeLinecap="round" fill="none" />
        </>
      );
    case 'kofte':
      return (
        <>
          <ellipse rx={s / 2} ry={s / 3.2} fill={color} />
          {[-s / 4, 0, s / 4].map((x) => (
            <line key={x} x1={x - s / 10} y1={-s / 5} x2={x + s / 10} y2={s / 5} stroke="#2d170c" strokeWidth={s / 16} strokeLinecap="round" opacity="0.8" />
          ))}
          <ellipse cx={-s / 7} cy={-s / 8} rx={s / 5} ry={s / 12} fill="rgba(255,220,180,0.3)" />
        </>
      );
    case 'potato':
      return (
        <>
          <rect x={-s / 2} y={-s / 3.4} width={s} height={s / 1.7} rx={s / 5} fill={color} />
          <rect x={-s / 2.4} y={-s / 4.5} width={s / 1.3} height={s / 6} rx={s / 12} fill="rgba(255,245,200,0.5)" />
          <path d={`M${-s / 2.2} ${s / 5} h${s / 1.1}`} stroke="#c9913a" strokeWidth={s / 14} opacity="0.7" />
        </>
      );
    case 'tomatoSlice':
      return (
        <>
          <circle r={s / 2} fill={color} />
          <circle r={s / 2.6} fill="#e8705a" />
          {Array.from({ length: 5 }).map((_, i) => {
            const a = (i / 5) * Math.PI * 2;
            return <ellipse key={i} cx={Math.cos(a) * s * 0.2} cy={Math.sin(a) * s * 0.2} rx={s / 14} ry={s / 10} fill="#f6d27a" />;
          })}
        </>
      );
    case 'eggplant':
      return (
        <>
          <path d={`M${-s / 2} 0 C${-s / 2} ${-s / 4} ${s / 2.2} ${-s / 4} ${s / 2} ${-s / 20} C${s / 2} ${s / 5} ${-s / 2} ${s / 5} ${-s / 2} 0 Z`} fill={color} stroke="#1f0d21" strokeWidth="1" />
          <path d={`M${-s / 2.4} ${-s / 7} C${-s / 5} ${-s / 4.4} ${s / 5} ${-s / 4.4} ${s / 2.6} ${-s / 7}`} stroke="rgba(230,200,240,0.55)" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* Mince filling */}
          <path d={blobPath(0, -s / 40, s / 2.6, s / 9, rand, 0.18, 12)} fill="#7e3a22" />
          {Array.from({ length: 14 }).map((_, i) => (
            <circle key={i} cx={(rand() - 0.5) * s * 0.66} cy={(rand() - 0.5) * s * 0.14} r={1.4 + rand() * 1.2} fill={rand() > 0.5 ? '#5e2a17' : '#9a4a2c'} />
          ))}
          {/* Tomato slice + green pepper on top */}
          <circle cx={-s / 7} cy={-s / 30} r={s / 12} fill="#d23a20" />
          <circle cx={-s / 7} cy={-s / 30} r={s / 18} fill="#ec7a5f" />
          <path d={`M${s / 18} ${-s / 20} Q${s / 6} ${-s / 7} ${s / 3.4} ${-s / 22}`} stroke="#4f8d38" strokeWidth={s / 16} strokeLinecap="round" fill="none" />
        </>
      );
    case 'pickle':
      return (
        <>
          <ellipse rx={s / 2} ry={s / 7} fill={color} stroke="#56702a" strokeWidth="0.8" />
          {[-s / 4, -s / 12, s / 12, s / 4].map((x) => (
            <line key={x} x1={x} y1={-s / 10} x2={x + s / 30} y2={s / 10} stroke="#56702a" strokeWidth="0.7" opacity="0.7" />
          ))}
          <ellipse cx={-s / 8} cy={-s / 16} rx={s / 4} ry={s / 30} fill={HIGHLIGHT} />
        </>
      );
    case 'carrot':
      return (
        <>
          <circle r={s / 2} fill={color} />
          <circle r={s / 3.6} fill="none" stroke="#f3a15a" strokeWidth={s / 14} />
          <circle cx={-s / 6} cy={-s / 6} r={s / 8} fill={HIGHLIGHT} />
        </>
      );
    case 'diamond':
      return (
        <>
          <path d={`M0 ${-s / 2.4} L${s / 2} 0 L0 ${s / 2.4} L${-s / 2} 0 Z`} fill={color} stroke="#a8702a" strokeWidth="1" />
          <path d={`M0 ${-s / 3.4} L${s / 2.9} 0 L0 ${s / 3.4} L${-s / 2.9} 0 Z`} fill="#efc36e" />
          <path d={`M${-s / 5} ${-s / 10} L0 ${-s / 4.5} L${s / 6} ${-s / 12}`} stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <circle cx="0" cy="0" r={s / 14} fill="#7fa33e" />
        </>
      );
    case 'roll':
      return (
        <>
          <rect x={-s / 2} y={-s / 6} width={s} height={s / 3} rx={s / 6} fill="#e9cf9f" />
          <rect x={-s / 2} y={-s / 6} width={s} height={s / 5.5} rx={s / 11} fill={color} />
          <path d={`M${-s / 2.6} ${-s / 12} h${s / 1.3}`} stroke="rgba(255,230,190,0.55)" strokeWidth="1.3" strokeLinecap="round" />
          <circle cx={s / 2.2} cy="0" r={s / 7} fill="#e9cf9f" stroke={color} strokeWidth="1.2" />
        </>
      );
    case 'blob':
      return <path d={blobPath(0, 0, s / 2, s / 2.4, rand, 0.3, 7)} fill={color} />;
  }
}

interface FoodPileProps {
  kind: FoodKind;
  x: number;
  y: number;
  w: number;
  h: number;
  /** 0 = eaten, 1 = full portion. */
  ratio: number;
  seed: number;
}

export function FoodPile({ kind, x, y, w, h, ratio, seed }: FoodPileProps) {
  const recipe = RECIPES[kind];
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rx = w * 0.42;
  const ry = h * 0.38;

  // Everything random is generated once per dish so it never reshuffles.
  const layout = useMemo(() => {
    const rand = mulberry32(seed);
    const outline = blobPath(0, 0, 1, 1, rand, 0.09, 16);
    const sheen = [0, 1, 2].map(() => ({ x: -0.35 + rand() * 0.4, y: -0.45 + rand() * 0.3, w: 0.18 + rand() * 0.2, rot: -20 + rand() * 25 }));
    const pieces = recipe.layers.flatMap((layer, li) =>
      Array.from({ length: layer.count }, (_, i) => {
        const spread = layer.spread ?? 0.82;
        let px: number;
        let py: number;
        if (layer.row) {
          px = ((i + 0.5) / layer.count - 0.5) * 2 * spread + (rand() - 0.5) * 0.06;
          py = (rand() - 0.5) * 0.18;
        } else {
          const a = rand() * Math.PI * 2;
          const r = Math.sqrt(rand()) * spread;
          px = Math.cos(a) * r;
          py = Math.sin(a) * r;
        }
        return {
          key: `${li}-${i}`,
          layer,
          px,
          py,
          rot: layer.row ? (rand() - 0.5) * 16 : rand() * 360,
          color: layer.colors[i % layer.colors.length],
          scale: 0.85 + rand() * 0.3,
          seed: Math.floor(rand() * 1e9),
          order: li + i / layer.count,
        };
      }),
    );
    const dust = (recipe.dust ?? []).flatMap((d, di) =>
      Array.from({ length: d.count }, (_, i) => {
        const a = rand() * Math.PI * 2;
        const r = Math.sqrt(rand()) * 0.8;
        return { key: `${di}-${i}`, x: Math.cos(a) * r, y: Math.sin(a) * r, size: d.size * (0.6 + rand() * 0.8), color: d.color };
      }),
    );
    return { outline, sheen, pieces, dust };
  }, [seed, recipe]);

  if (ratio <= 0) {
    return (
      <g>
        <path d={layout.outline} transform={`translate(${cx} ${cy}) scale(${rx * 0.55} ${ry * 0.35})`} fill={recipe.base?.dark ?? '#999'} opacity="0.22" />
        <ellipse cx={cx - rx * 0.25} cy={cy + ry * 0.15} rx={rx * 0.1} ry={ry * 0.06} fill={recipe.base?.mid ?? '#999'} opacity="0.3" />
      </g>
    );
  }

  const s = 0.42 + 0.58 * ratio;
  const mrx = rx * s;
  const mry = ry * s;
  const visibleFraction = ratio;
  const baseId = `food-${uid}`;

  return (
    <g>
      {recipe.base && (
        <defs>
          <radialGradient id={baseId} cx="40%" cy="35%" r="70%">
            <stop offset="0" stopColor={recipe.base.light} />
            <stop offset="0.55" stopColor={recipe.base.mid} />
            <stop offset="1" stopColor={recipe.base.dark} />
          </radialGradient>
        </defs>
      )}

      {/* Contact shadow on the steel */}
      <path d={layout.outline} transform={`translate(${cx + 3} ${cy + 6}) scale(${mrx * 1.02} ${mry * 1.02})`} fill={SHADOW} />

      {recipe.base && (
        <>
          <path d={layout.outline} transform={`translate(${cx} ${cy}) scale(${mrx} ${mry})`} fill={`url(#${baseId})`} />
          {/* Mound volume: a lighter crown for heaped dishes */}
          {recipe.base.height > 0.8 && (
            <ellipse cx={cx - mrx * 0.12} cy={cy - mry * 0.15} rx={mrx * 0.55} ry={mry * 0.5} fill={recipe.base.light} opacity="0.35" />
          )}
        </>
      )}

      {layout.pieces
        .filter((p) => p.order - Math.floor(p.order) < visibleFraction || p.layer.count === 1)
        .map((p) => {
          const px = cx + p.px * mrx;
          const py = cy + p.py * mry;
          const size = p.layer.size * p.scale * (0.75 + 0.25 * s);
          const rand = mulberry32(p.seed);
          return (
            <g key={p.key} transform={`translate(${px.toFixed(1)} ${py.toFixed(1)}) rotate(${p.rot.toFixed(1)})`}>
              {p.layer.shadow !== false && (
                <g transform="translate(1.5 2.5)" opacity="0.35">
                  <Piece shape={p.layer.shape} size={size} color="#2a1408" rand={mulberry32(p.seed)} />
                </g>
              )}
              <Piece shape={p.layer.shape} size={size} color={p.color} rand={rand} />
            </g>
          );
        })}

      {/* Glossy sauce sheen */}
      {recipe.base?.glossy &&
        layout.sheen.map((h, i) => (
          <ellipse
            key={i}
            cx={cx + h.x * mrx}
            cy={cy + h.y * mry}
            rx={h.w * mrx}
            ry={h.w * mry * 0.28}
            fill="#ffffff"
            opacity={0.22 - i * 0.05}
            transform={`rotate(${h.rot} ${cx + h.x * mrx} ${cy + h.y * mry})`}
          />
        ))}

      {layout.dust
        .filter((_, i) => i / layout.dust.length < visibleFraction)
        .map((d) => (
          <circle key={d.key} cx={cx + d.x * mrx} cy={cy + d.y * mry} r={d.size} fill={d.color} opacity="0.85" />
        ))}
    </g>
  );
}
