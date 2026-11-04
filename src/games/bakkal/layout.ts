/*
 * Dükkân sahnesinin ortak ölçüleri, tek yerde. Sahne 1600 × 900 birimlik bir SVG; ekrana alttan
 * hizalı ve kırpılarak oturur (preserveAspectRatio="xMidYMax slice"). Eşyalar (kapı, raf, dolaplar,
 * tezgâh üstü, müşteri) ortada biraz küçültülmüş durur ki 4:3 ekranda da kapı ve dolap görünsün;
 * duvar, lambri ve tezgâh gövdesi tam genişlikte çizilir.
 */

/** Sahnenin genişliği ve yüksekliği (SVG birimi). */
export const SCENE_W = 1600;
export const SCENE_H = 900;

/** Eşyaların küçültülüp ortalandığı dönüşüm: önce kaydırma, sonra ölçek. */
const FIT_X = 160;
const FIT_Y = 180;
const FIT_SCALE = 0.8;
export const FIT = `translate(${FIT_X} ${FIT_Y}) scale(${FIT_SCALE})`;
/** Eşyaların koordinatındaki bir yüksekliğin tam sahnedeki karşılığı (lambri, tezgâh gövdesi). */
export const fitY = (y: number) => FIT_Y + y * FIT_SCALE;

/** Tezgâhın üst kenarı (eşya koordinatı): müşteri bunun arkasında kalır. */
export const COUNTER_Y = 690;

/** Dolapların ve saatin, kendi çizim koordinatlarından sahnedeki yerlerine kayması. */
export const FRIDGE_SHIFT = -76;
export const BREAD_SHIFT = 380;
export const CLOCK_AT = { x: 1254, y: -10 };
