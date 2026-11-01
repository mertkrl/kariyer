/*
 * Bakkalın görünüm ayarları: yazı boyutu, yüksek kontrast, büyük kasa tuşları ve hareketi azaltma.
 * Tarayıcıda saklanır; saklanamazsa bu oturumda geçerlidir. Ayarlar oyunun kök öğesine data-*
 * öznitelikleri olarak yazılır, stil dosyaları buna göre büyütür ve sadeleştirir.
 */

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
  try {
    const raw = JSON.parse(localStorage.getItem(VIEW_KEY) ?? 'null');
    if (!raw || typeof raw !== 'object') return VIEW_DEFAULT;
    return {
      text: raw.text === 'lg' || raw.text === 'xl' ? raw.text : 'normal',
      contrast: raw.contrast === true,
      bigKeys: raw.bigKeys === true,
      calm: raw.calm === true,
    };
  } catch {
    return VIEW_DEFAULT;
  }
}

export function saveView(v: View) {
  try {
    localStorage.setItem(VIEW_KEY, JSON.stringify(v));
  } catch {
    // saklanamazsa ayar yalnızca bu oturumda geçerli
  }
}

/** Kök öğeye yazılacak öznitelikler. */
export const viewAttrs = (v: View) => ({
  'data-text': v.text,
  'data-contrast': v.contrast ? '' : undefined,
  'data-bigkeys': v.bigKeys ? '' : undefined,
  'data-calm': v.calm ? '' : undefined,
});
