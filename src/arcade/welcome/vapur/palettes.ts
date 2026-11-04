import type { Phase } from '../../mahalle/places';

/*
 * Vapur sahnesinin ölçüleri ve günün saatine göre renkleri. Her katman 900 birim yüksekliğinde
 * çizilir ve ekranın yüksekliğine ölçeklenir: ufuk her ekranda aynı yerde kalır. Uzak katmanlar
 * ufuk pusuna (haze) karışır; gece taş yapılar ışıklandırılır, pencereler yanar.
 */

export const H = 900;
/** Ufuk ve tarihi yarımadanın kıyısı. */
export const HORIZON = 522;
/** Rota boyunca kayan katmanların boyları: yakın olan daha çok yol alır. */
export const FAR_W = 4800;
export const MID_W = 9600;
export const NEAR_W = 14400;

/** Bir tur kaç saniye: Karaköy'den Kadıköy'e. */
export const TRIP = 240;

/** Rota üzerindeki yerler ve yolculuğun hangi anında ekranın ortasından geçtikleri (0–1). */
export const LANDMARKS = {
  galata: 0.0,
  suleymaniye: (2900 - 800) / (MID_W - 1600),
  topkapi: (4450 - 800) / (MID_W - 1600),
  sultanahmet: (5900 - 800) / (MID_W - 1600),
  kizKulesi: (9300 - 800) / (NEAR_W - 1600),
  haydarpasa: (11200 - 800) / (NEAR_W - 1600),
};

export interface Palette {
  /** Gökyüzü: tepe, orta, ufuk. */
  sky: [string, string, string];
  sun: string;
  sunGlow: string;
  /** Güneş (ya da ay) gökyüzünde nerede: yüzde. */
  sunAt: [number, number];
  sunR: number;
  moon: boolean;
  cloud: string;
  cloudShade: string;
  haze: string;
  far: string;
  /** Şehir dokusunun cephe renkleri. */
  city: string[];
  roof: string;
  /** Cami ve kule taşı. */
  stone: string;
  /** Kurşun kubbe. */
  lead: string;
  tree: string;
  waterTop: string;
  water: string;
  waterDeep: string;
  waveLight: string;
  waveDark: string;
  glitter: string;
  /** Gece: pencereler ve anıtlar yanar. */
  lit: boolean;
  window: string;
  light: string;
  /** Gece ışıklandırılmış taşın rengi. */
  flood: string;
  /** Arayüz yazısı ve arkasındaki hale. */
  text: string;
  halo: string;
  /** Martının tüyü (gece biraz söner). */
  gull: string;
}

export const PALETTES: Record<Phase, Palette> = {
  sabah: {
    sky: ['#9fb3d4', '#e6c4c2', '#f8dcc0'],
    sun: '#fff1d2',
    sunGlow: 'rgba(255, 214, 170, 0.55)',
    sunAt: [17, 47],
    sunR: 40,
    moon: false,
    cloud: '#fdeee6',
    cloudShade: '#d7b0b2',
    haze: '#efd6c8',
    far: '#b3a8ba',
    city: ['#ead9c5', '#e3c4ae', '#d9cbb8', '#f0e3d0', '#cfb9a8', '#dcc6b2'],
    roof: '#b9765c',
    stone: '#e3d7c6',
    lead: '#8d96a3',
    tree: '#6d8068',
    waterTop: '#ecd0c2',
    water: '#8ba7b4',
    waterDeep: '#365f70',
    waveLight: 'rgba(255, 240, 226, 0.55)',
    waveDark: 'rgba(28, 58, 74, 0.28)',
    glitter: '#fff4de',
    lit: false,
    window: '#5c6a75',
    light: '#f7cf7f',
    flood: '#e9d3b0',
    text: '#24302f',
    halo: 'rgba(255, 246, 236, 0.75)',
    gull: '#ffffff',
  },
  gunduz: {
    sky: ['#5b93c6', '#9cc3e1', '#dfeaee'],
    sun: '#fffbea',
    sunGlow: 'rgba(255, 250, 225, 0.6)',
    sunAt: [80, 14],
    sunR: 34,
    moon: false,
    cloud: '#ffffff',
    cloudShade: '#c6d4e1',
    haze: '#dbe5e8',
    far: '#9db0bd',
    city: ['#f0e7d7', '#e8d4be', '#d9d3c7', '#f3ece1', '#d6c3ad', '#c9cfd3'],
    roof: '#b0654a',
    stone: '#e8dece',
    lead: '#86909b',
    tree: '#5c7853',
    waterTop: '#bcd3da',
    water: '#4b879d',
    waterDeep: '#1b4c64',
    waveLight: 'rgba(255, 255, 255, 0.6)',
    waveDark: 'rgba(10, 42, 60, 0.3)',
    glitter: '#ffffff',
    lit: false,
    window: '#4f5d68',
    light: '#f7cf7f',
    flood: '#e8dece',
    text: '#1c2b2a',
    halo: 'rgba(255, 255, 255, 0.7)',
    gull: '#ffffff',
  },
  aksam: {
    sky: ['#3c477a', '#ae6f8c', '#f6aa68'],
    sun: '#ffd27c',
    sunGlow: 'rgba(255, 160, 90, 0.6)',
    sunAt: [66, 55],
    sunR: 54,
    moon: false,
    cloud: '#ffc4a2',
    cloudShade: '#8d688a',
    haze: '#eaa98a',
    far: '#7b6680',
    city: ['#c99b86', '#b88d7e', '#a98b84', '#d3aa8f', '#9f8380'],
    roof: '#7d4436',
    stone: '#d4ab92',
    lead: '#6c6878',
    tree: '#4a5045',
    waterTop: '#e8a684',
    water: '#676993',
    waterDeep: '#262f55',
    waveLight: 'rgba(255, 202, 150, 0.55)',
    waveDark: 'rgba(18, 18, 48, 0.32)',
    glitter: '#ffd89c',
    lit: true,
    window: '#3b3446',
    light: '#ffd07e',
    flood: '#f2c890',
    text: '#fdf3e4',
    halo: 'rgba(30, 20, 40, 0.55)',
    gull: '#f6ece6',
  },
  gece: {
    sky: ['#060a17', '#131b35', '#2b3453'],
    sun: '#f4efdc',
    sunGlow: 'rgba(220, 225, 255, 0.22)',
    sunAt: [78, 16],
    sunR: 24,
    moon: true,
    cloud: '#2c3453',
    cloudShade: '#141a30',
    haze: '#2b3251',
    far: '#151b2d',
    city: ['#1c2233', '#20263a', '#1a1f2e', '#232a3d'],
    roof: '#171b26',
    stone: '#2b3142',
    lead: '#293041',
    tree: '#111a1c',
    waterTop: '#2c3453',
    water: '#111a32',
    waterDeep: '#050a17',
    waveLight: 'rgba(150, 172, 225, 0.35)',
    waveDark: 'rgba(0, 0, 0, 0.35)',
    glitter: '#e8ecff',
    lit: true,
    window: '#141824',
    light: '#ffcf7a',
    flood: '#eab979',
    text: '#f3ecdc',
    halo: 'rgba(5, 8, 20, 0.6)',
    gull: '#c9cede',
  },
};
