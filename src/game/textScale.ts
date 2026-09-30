/* Reading size: a multiplier on the font sizes of every text-heavy screen, kept between sessions. */

export const TEXT_SCALES = [
  { value: 1, label: 'Normal' },
  { value: 1.15, label: 'Büyük' },
  { value: 1.3, label: 'Çok büyük' },
] as const;

const KEY = 'kariyerweb-text-scale';

export function loadTextScale(): number {
  try {
    const v = Number(window.localStorage.getItem(KEY));
    return TEXT_SCALES.some((s) => s.value === v) ? v : 1;
  } catch {
    return 1;
  }
}

export function applyTextScale(value: number) {
  document.documentElement.style.setProperty('--ts', String(value));
  try {
    window.localStorage.setItem(KEY, String(value));
  } catch {
    // private mode: the size still applies for this session
  }
}
