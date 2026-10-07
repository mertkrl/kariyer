/** Servis sahnesinde şeylerin durduğu yer: cam ve dış dünyanın tamponu ile ölçekleri. */
import { H, PAD, W } from '../paint';

// Cam bütün sahneyi kaplar (kamera kayması için kenar payıyla birlikte): servisin içi görünmez
export const WIN = { x: -PAD, y: -PAD, w: W + PAD * 2, h: H + PAD * 2 };
// Dış dünya küçük bir tampona çizilir (ıslak cam bulanıklığı bedavaya gelir)
export const BW = 420;
export const BH = 164;
export const KB = 5.2; // metre başına px: sokağın karşısındaki binalar
export const KS = 9; // kaldırım
export const KC = 19; // yan şerit
export const STRIP_M = 700; // önceden çizilen sokağın uzunluğu
