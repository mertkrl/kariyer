import { useCallback, useEffect, useRef, useState } from 'react';
import { MESSAGE_LINGER_MS } from './lunch';

/*
 * Masanın sana cevabı. Talimat yok, masa keşfedilmek için orada: yaptığın her şeyden sonra
 * aklından geçen bir cümle (kendiliğinden solar), dokunduğun şeyde küçük bir sarsıntı ve odadan
 * çıkınca hepsi temizlenen zamanlayıcılar.
 */
export function useReactions() {
  const [bumped, setBumped] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; key: number } | null>(null);
  const messageTimer = useRef<number | null>(null);

  const timers = useRef<number[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((t) => window.clearTimeout(t));
      if (messageTimer.current) window.clearTimeout(messageTimer.current);
    };
  }, []);

  /** Bir tepki cümlesi göster; başka bir şey olmazsa kendiliğinden solar. */
  const say = useCallback((text: string) => {
    setMessage((m) => ({ text, key: (m?.key ?? 0) + 1 }));
    if (messageTimer.current) window.clearTimeout(messageTimer.current);
    messageTimer.current = window.setTimeout(() => setMessage(null), MESSAGE_LINGER_MS);
  }, []);

  const bump = useCallback(
    (key: string) => {
      setBumped(key);
      later(() => setBumped((b) => (b === key ? null : b)), 360);
    },
    [later],
  );

  return { message, say, bumped, bump, later };
}

export type Reactions = ReturnType<typeof useReactions>;
