import { useEffect, useRef } from 'react';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Bir açılır pencerenin klavye görgüsü: Escape kapatır, açılınca odak içeri geçer, kapanınca
 * odağı daha önce kim tuttuysa (çekmece, telefon simgesi) ona döner. Döndürülen ref'i pencerenin
 * paneline bağla.
 */
export function useDialog<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true });
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close.current();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (before?.isConnected) before.focus({ preventScroll: true });
    };
  }, []);

  return ref;
}
