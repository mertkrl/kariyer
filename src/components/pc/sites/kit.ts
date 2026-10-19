/*
 * Sitelerin ortak küçük araçları: sahte bir ağ isteğinin gecikmesi. Site kapanınca bekleyen
 * istekler susar.
 */
import { useEffect, useRef } from 'react';

/** `later(fn, ms)`: fn'i ms sonra çalıştırır; bileşen kapanınca iptal eder. */
export function useLater() {
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  return (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
}

/** Türk lirası: 1.250 TL */
export const tl = (n: number) => `${n.toLocaleString('tr-TR')} TL`;

/** Adayların sitelerindeki fotoğraflar: public/sites altında, oyunun kendi sunucusundan. */
export const photo = (path: string) => `${import.meta.env.BASE_URL}sites/${path}`;
