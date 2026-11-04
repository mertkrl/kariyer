/*
 * Bakkalın görünüm ayarları: yazı boyutu, yüksek kontrast, büyük kasa tuşları ve hareketi azaltma.
 * Tarayıcıda saklanır; saklanamazsa bu oturumda geçerlidir. Ayarlar oyunun kök öğesine data-*
 * öznitelikleri olarak yazılır, stil dosyaları buna göre büyütür ve sadeleştirir.
 */

import { readJson, writeJson } from '../../shared/storage';

export type TextSize = 'normal' | 'lg' | 'xl';

export interface View {
  text: TextSize;
  contrast: boolean;
  bigKeys: boolean;
  calm: boolean;
}

export const VIEW_DEFAULT: View = { text: 'normal', contrast: false, bigKeys: false, calm: false };

const VIEW_KEY = 'kariyerweb-bakkal-gorunum';

export function loadView(): View {
  const raw = readJson(VIEW_KEY) as Partial<Record<keyof View, unknown>> | null;
  if (!raw || typeof raw !== 'object') return VIEW_DEFAULT;
  return {
    text: raw.text === 'lg' || raw.text === 'xl' ? raw.text : 'normal',
    contrast: raw.contrast === true,
    bigKeys: raw.bigKeys === true,
    calm: raw.calm === true,
  };
}

export const saveView = (v: View) => writeJson(VIEW_KEY, v);

/** Kök öğeye yazılacak öznitelikler. */
export const viewAttrs = (v: View) => ({
  'data-text': v.text,
  'data-contrast': v.contrast ? '' : undefined,
  'data-bigkeys': v.bigKeys ? '' : undefined,
  'data-calm': v.calm ? '' : undefined,
});
