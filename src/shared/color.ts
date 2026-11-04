/*
 * #rrggbb renkleriyle ortak hesaplar: iki renk arası, beyaza ya da siyaha doğru ton, WCAG parlaklığı
 * ve kontrast oranı. Oyunlar bunları kendi kopyalarıyla yazıyordu; sonuçları aynıdır.
 */

const channels = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const toHex = (c: number[]) => `#${c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;

/** `a` ile `b` arasında `t` (0–1, kırpılır) oranında ara renk. */
export function mixHex(a: string, b: string, t: number): string {
  const k = Math.max(0, Math.min(1, t));
  const x = channels(a);
  const y = channels(b);
  return toHex(x.map((v, i) => v + (y[i] - v) * k));
}

/** `k` > 0 ise beyaza, `k` < 0 ise siyaha doğru |k| (0–1) kadar. */
export function toneHex(hex: string, k: number): string {
  const t = k > 0 ? 255 : 0;
  return toHex(channels(hex).map((v) => v + (t - v) * Math.abs(k)));
}

/** WCAG göreli parlaklık (0–1). */
export function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG kontrast oranı (1–21). */
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
