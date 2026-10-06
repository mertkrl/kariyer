/** Where things sit in the servis scene: the window on the stage, and the outside world's buffer and scales. */

// The window, in stage coordinates
export const WIN = { x: 130, y: 118, w: 1340, h: 520 };
export const PILLAR = 812;
// The outside world is rendered into a small buffer (wet-glass blur for free)
export const BW = 420;
export const BH = 164;
export const KB = 5.2; // px per metre: buildings across the street
export const KS = 9; // pavement
export const KC = 19; // next lane
export const STRIP_M = 700; // length of the pre-rendered street
