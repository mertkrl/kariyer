import { useCallback, useEffect, useRef, useState } from 'react';
import { MESSAGE_LINGER_MS } from './lunch';

/*
 * How the table answers you. No instructions — the table is there to be discovered: a line of
 * thought after each thing you do (it fades on its own), a little bump on what you touched, and
 * timers that are all cleared when you leave the room.
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

  /** Show a reaction line; it fades away on its own if nothing else happens. */
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
