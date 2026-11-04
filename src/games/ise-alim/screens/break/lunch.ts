/*
 * Yemek masasının sayıları ve cümleleri: kaç lokma, kaç yudum ve kaç küp şeker olduğu,
 * tepsinin bölmelerinin nerede durduğu ve yemek yerken aklından geçenler.
 */
import type { SoupKind } from '../../game/data/lunchMenus';

/** Bir yudum, dolu bir bardağın beşte birini alır. */
export const SIP_VOLUME = 0.2;
/** Bir tepki cümlesinin, başka bir etkileşim olmadan ekranda kaldığı süre. */
export const MESSAGE_LINGER_MS = 4200;
export const TEA_HOT_MS = 45_000;
export const SOUP_SIPS = 5;
export const BREAD_BITES = 3;
export const AYRAN_SIPS = 4;
export const MAX_SUGAR = 5;

export const DISH_BITES = { main: 5, side: 4, salad: 3, meze: 3, dessert: 3 } as const;
export type DishKey = keyof typeof DISH_BITES;

/** Tabldot tepsisinin bölmeleri, tepsinin kendi (sıkıştırılmamış) koordinatlarında. */
export const COMPARTMENTS: Record<DishKey, { x: number; y: number; w: number; h: number }> = {
  salad: { x: -240, y: -150, w: 152, h: 108 },
  meze: { x: -76, y: -150, w: 152, h: 108 },
  dessert: { x: 88, y: -150, w: 152, h: 108 },
  main: { x: -240, y: -26, w: 236, h: 176 },
  side: { x: 4, y: -26, w: 236, h: 176 },
};

export const SOUP_COLORS: Record<SoupKind, { surface: string; speck: string }> = {
  mercimek: { surface: '#e2922c', speck: '#b8401c' },
  ezogelin: { surface: '#c8612c', speck: '#8f3a17' },
  yayla: { surface: '#f0e8d0', speck: '#6b8f3e' },
  domates: { surface: '#c33a22', speck: '#f3e2c8' },
  tarhana: { surface: '#b9542c', speck: '#7e3316' },
};

export const TEA_LINES = [
  'Tavşan kanı, tam kıvamında.',
  'Oh be… İlaç gibi geldi.',
  'İnce belli bardakta sıcacık çay. Mesai unutuldu.',
  'Bir yudum daha. Adaylar biraz bekleyebilir.',
];

export const DISH_LINES: Record<DishKey, (name: string) => string[]> = {
  main: (n) => [`${n}… Anneninki kadar olmasa da fena değil.`, `${n} bugün iyi olmuş, aşçıya selam.`],
  side: (n) => [`${n} olmadan tabldot olmaz.`, `${n} tane tane, tam kıvamında.`],
  salad: (n) => [`${n}, üstüne biraz limon iyi giderdi.`, `Taze taze ${n.toLowerCase()}.`],
  meze: (n) => [`${n} ile her şey daha güzel.`, `Bir çatal ${n.toLowerCase()}.`],
  dessert: (n) => [`${n}! Tatlısız mola olmaz.`, `${n} tam da ihtiyacın olan şeydi.`],
};

export function pick<T>(list: T[]) {
  return list[Math.floor(Math.random() * list.length)];
}

export const GLASS_PATH =
  'M-28,-120 C-28,-98 -18,-88 -18,-70 C-18,-54 -27,-44 -26,-25 C-25,-9 -20,0 -18,0 L18,0 C20,0 25,-9 26,-25 C27,-44 18,-54 18,-70 C18,-88 28,-98 28,-120 Z';
