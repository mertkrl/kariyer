import type { CSSProperties } from 'react';

/*
 * Bir kişinin renginin üstünde baş harfler: beyaz koyu renklerde okunur ama altın ya da kum
 * renginde okunmaz; bu yüzden yazı, beyaz ile sayfanın mürekkebinden arka planla hangisi daha
 * fazla kontrast yapıyorsa onu alır. İkisinin de 4.5:1'e ulaşmadığı bir ara ton (tozlu mavi,
 * adaçayı) beyaz okunana kadar biraz koyulaştırılır: kişi rengini korur, bir ton koyusuyla.
 */

const AA = 4.5;

const INK = '#221f1b';
const WHITE = '#ffffff';

function luminance(hex: string): number | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const ch = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a) ?? 0;
  const lb = luminance(b) ?? 0;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** `background` üzerinde en iyi okunan yazı rengi (beyaz ya da mürekkep). */
export function inkOn(background: string): string {
  if (luminance(background) === null) return WHITE;
  return contrastRatio(WHITE, background) >= contrastRatio(INK, background) ? WHITE : INK;
}

/** `hex`, `f` (0–1) kadar siyaha doğru koyulaştırılmış. */
function darken(hex: string, f: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const ch = (v: number) => Math.round(v * (1 - f)).toString(16).padStart(2, '0');
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

/** Aralarında en az 4.5:1 olan, `background`a olabildiğince yakın bir arka plan ve yazı rengi çifti. */
export function readablePair(background: string): { background: string; color: string } {
  if (luminance(background) === null) return { background, color: WHITE };
  const color = inkOn(background);
  if (contrastRatio(color, background) >= AA) return { background, color };
  for (let f = 0.04; f < 0.6; f += 0.04) {
    const deeper = darken(background, f);
    if (contrastRatio(WHITE, deeper) >= AA) return { background: deeper, color: WHITE };
  }
  return { background: darken(background, 0.6), color: WHITE };
}

export const avatarStyle = (background: string, extra?: CSSProperties): CSSProperties => ({ ...readablePair(background), ...extra });
