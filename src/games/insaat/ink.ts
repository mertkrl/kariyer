import { mix } from './geo';

/*
 * Sahnenin çizim dili, giriş ekranındaki maketle aynı: her şeyin çevresinde koyu kahve mürekkep
 * (siluette kalın, ayrıntıda ince), ışık sol üstten sıcak, gölge soğuk ve morumsu; üstüne kâğıt ve
 * guaj dokusu biner (Scene, `PAPER`).
 */

export const INK = '#2e211b';
const LIGHT = '#fff1d6';
const COOL = '#34385a';

/** Işık alan yüzün tonu. */
export const lit = (c: string, k = 0.14) => mix(c, LIGHT, k);
/** Gölgedeki yüzün tonu: kararmaz, soğur. */
export const cool = (c: string, k = 0.26) => mix(c, COOL, k);
/** Uzaktaki çizginin mürekkebi: havanın rengine karışır. */
export const inkFar = (air: string, k: number) => mix(INK, air, k);

/** Kâğıt ve guaj dokusu: döşenen küçük bir görsel (public/insaat/kagit.webp). */
export const PAPER = `${import.meta.env.BASE_URL}insaat/kagit.webp`;
