import type { Phase } from '../../mahalle/places';

/*
 * Vapur sahnesinin ölçüleri ve günün saatine göre renkleri (Scene.tsx, Vapur.tsx). Sabah pembe ve
 * kayısı, öğlen açık mavi, akşam mor ve turuncu, gece lacivert; akşam ve gece pencereler ve köprü
 * yanar.
 */

export const TILE_W = 3200;
export const TILE_H = 900;
/** Yalıların suya değdiği çizgi. */
export const SHORE = 588;

export interface Palette {
  skyTop: string;
  skyLow: string;
  sun: string;
  far: string;
  farLine: string;
  mid: string;
  midLine: string;
  houses: string[];
  roof: string;
  tree: string;
  quay: string;
  water: string;
  waterDeep: string;
  wave: string;
  window: string;
  /** Gece: pencerelerde ve köprüde ışık. */
  lit: boolean;
  /** Güneş (ya da ay) gökyüzünde nerede: yüzde. */
  sunAt: [number, number];
  sunR: number;
  moon: boolean;
  /** Arayüz yazısının rengi. */
  text: string;
}

export const PALETTES: Record<Phase, Palette> = {
  sabah: {
    skyTop: '#e9c9b8',
    skyLow: '#f6e6cf',
    sun: '#f8d29a',
    far: '#c7b4b4',
    farLine: '#a9969a',
    mid: '#b39f9c',
    midLine: '#8a7775',
    houses: ['#d8b48c', '#b9644a', '#ece3d1', '#a9b39e', '#e0bf98'],
    roof: '#7e4a36',
    tree: '#6f7e5e',
    quay: '#b8ad9c',
    water: '#94b4b4',
    waterDeep: '#5d8790',
    wave: 'rgba(255,248,236,.55)',
    window: '#4f5a60',
    lit: false,
    sunAt: [22, 44],
    sunR: 46,
    moon: false,
    text: '#2b2a26',
  },
  gunduz: {
    skyTop: '#9cc6da',
    skyLow: '#e6eee6',
    sun: '#fff4d6',
    far: '#a9bcc0',
    farLine: '#8aa0a6',
    mid: '#97a3a0',
    midLine: '#6f7c7a',
    houses: ['#d2a87a', '#a84f39', '#ece5d4', '#9fae98', '#d9b48a'],
    roof: '#6e3f2e',
    tree: '#5c7350',
    quay: '#aaa394',
    water: '#5b93a1',
    waterDeep: '#2f6474',
    wave: 'rgba(255,255,255,.55)',
    window: '#3f4a52',
    lit: false,
    sunAt: [78, 16],
    sunR: 38,
    moon: false,
    text: '#1f2d2a',
  },
  aksam: {
    skyTop: '#6f5f93',
    skyLow: '#f2b47c',
    sun: '#f59a55',
    far: '#8c6f88',
    farLine: '#6c5470',
    mid: '#6d566b',
    midLine: '#4c3b4f',
    houses: ['#b7805e', '#8e3f31', '#d6c2ae', '#87907e', '#c49470'],
    roof: '#4f2c25',
    tree: '#4b5544',
    quay: '#8a7a74',
    water: '#79739a',
    waterDeep: '#3d4469',
    wave: 'rgba(255,214,170,.5)',
    window: '#3b3240',
    lit: true,
    sunAt: [70, 58],
    sunR: 62,
    moon: false,
    text: '#fdf3e4',
  },
  gece: {
    skyTop: '#0f1527',
    skyLow: '#2b3452',
    sun: '#f3ecd2',
    far: '#1d2437',
    farLine: '#2f3850',
    mid: '#1b2132',
    midLine: '#30394f',
    houses: ['#3b3a44', '#4a2f33', '#4b4c55', '#353f3e', '#433d3d'],
    roof: '#1d1a20',
    tree: '#1b2422',
    quay: '#2f3340',
    water: '#18233a',
    waterDeep: '#0a1120',
    wave: 'rgba(170,190,230,.35)',
    window: '#1a1d26',
    lit: true,
    sunAt: [80, 18],
    sunR: 26,
    moon: true,
    text: '#f3ecdc',
  },
};
