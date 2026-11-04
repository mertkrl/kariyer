/* Okuma boyutu: metin ağırlıklı her ekranın yazı boyutlarına uygulanan çarpan, oturumlar arasında saklanır. */

import { readText, writeText } from './storage';

export const TEXT_SCALES = [
  { value: 1, label: 'Normal' },
  { value: 1.15, label: 'Büyük' },
  { value: 1.3, label: 'Çok büyük' },
] as const;

const KEY = 'kariyerweb-text-scale';

export function loadTextScale(): number {
  const v = Number(readText(KEY));
  return TEXT_SCALES.some((s) => s.value === v) ? v : 1;
}

/** Ayarlar'dan seçilince saklanır; açılışta yalnızca uygulanır, "Verilerimi sil" sonrası anahtar geri yazılmasın. */
export function applyTextScale(value: number, persist = true) {
  document.documentElement.style.setProperty('--ts', String(value));
  if (!persist) return;
  writeText(KEY, String(value));
}
