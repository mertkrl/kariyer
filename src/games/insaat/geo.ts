import { mixHex } from '../../shared/color';
/** Sahnenin ortak ölçüleri (SVG birimi, görüntü 1200×640). */
export const GROUND = 520;
export const LEFT = 430;
export const WIDTH = 300;
export const FLOOR_H = 48;
/** Binanın yan cephesi: sağa ve yukarı kayan derinlik. */
export const DX = 34;
export const DY = -20;
export const PIT = 70;
/** Kolonların cephe boyunca yeri (0 sol, 1 sağ). */
export const COLS = [0, 0.25, 0.5, 0.75, 1];
/** Her kattaki dört pencerenin soldan uzaklığı. */
export const WINDOWS = [26, 96, 166, 236];

export const clamp = (n: number) => Math.min(1, Math.max(0, n));

/** İki renk arasında ara renk (#rrggbb); oran 0–1'e kırpılır. */
export const mix = mixHex;
