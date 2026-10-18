/* Okuma boyutu: metin ağırlıklı her ekranın yazı boyutlarına uygulanan çarpan, oturumlar arasında saklanır. */

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

/** Ayarlar'dan seçilince saklanır; açılışta yalnızca uygulanır, "Verilerimi sil" sonrası anahtar geri yazılmasın. */
export function applyTextScale(value: number, persist = true) {
  document.documentElement.style.setProperty('--ts', String(value));
  if (!persist) return;
  try {
    window.localStorage.setItem(KEY, String(value));
  } catch {
    // private mode: the size still applies for this session
  }
}
