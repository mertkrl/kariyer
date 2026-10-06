import { useEffect, useRef, useState } from 'react';
import type { GamePhase } from '../../game/types';

/*
 * When the game moves to another screen, the button that was pressed disappears and keyboard
 * focus falls back to the page: a screen-reader user hears nothing and has to start tabbing
 * from the top. This moves focus to the new screen's heading (or the screen itself) and gives
 * a short spoken name for a polite live region, so the change is heard and the next Tab goes
 * into the new screen.
 */

export const SCREEN_NAMES: Record<GamePhase, string> = {
  welcome: 'Giriş',
  jobSelect: 'İlan seçimi',
  applicationFlood: 'Başvuru akışı',
  briefing: 'Günün memosu',
  gameplay: 'Masa: başvuru değerlendirme',
  finalRound: 'Final mülakatları',
  dayEnd: 'Gün sonu',
  offer: 'Kapıda Hakan Bey',
  weekend: 'Hafta sonu',
  final: 'Haftanın sonu',
};

/** How long to keep looking for the new screen (screens load lazily). */
const WAIT_MS = 1500;

/** Moves focus into `root`'s first heading, or the root itself; true if it found somewhere to go. */
export function focusScreen(root: HTMLElement): boolean {
  const target = root.querySelector<HTMLElement>('h1, h2, [data-screen-focus]') ?? (root.firstElementChild as HTMLElement | null);
  if (!target) return false;
  if (!target.hasAttribute('tabindex') && !target.matches('a[href], button, input, select, textarea')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
  return true;
}

export function useScreenFocus(phase: GamePhase) {
  const mainRef = useRef<HTMLElement>(null);
  const [announcement, setAnnouncement] = useState('');
  const shown = useRef(phase);

  useEffect(() => {
    // the first screen of a visit is the page itself: leave focus where the browser put it
    if (shown.current === phase) return;
    shown.current = phase;
    setAnnouncement(SCREEN_NAMES[phase]);
    const started = performance.now();
    // the button that was pressed: it may linger a frame or two while the next screen loads
    const before = document.activeElement;
    let raf = 0;
    const tryFocus = () => {
      const root = mainRef.current;
      const active = document.activeElement;
      const lost = !active || active === document.body || !document.contains(active);
      // a screen that placed focus itself (a dialog, an input) keeps it
      if (root && !lost && active !== before) return;
      if (root && lost && focusScreen(root)) return;
      if (performance.now() - started < WAIT_MS) raf = requestAnimationFrame(tryFocus);
    };
    raf = requestAnimationFrame(tryFocus);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // Within a screen, too: a step that removes the focused button ("Memoyu Oku →" giving way to
  // the memo) would drop focus to the page; it goes to the screen's heading instead.
  useEffect(() => {
    const root = mainRef.current;
    if (!root) return;
    // browsers don't reliably fire focusout when the focused element is removed, so watch the
    // screen for removals and check where focus went
    let last: Element | null = null;
    const onFocusIn = (e: FocusEvent) => {
      last = e.target as Element;
    };
    const observer = new MutationObserver(() => {
      if (last && !document.contains(last) && document.activeElement === document.body) {
        last = null;
        focusScreen(root);
      }
    });
    document.addEventListener('focusin', onFocusIn);
    observer.observe(root.parentElement ?? root, { childList: true, subtree: true });
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      observer.disconnect();
    };
  }, []);

  return { mainRef, announcement };
}
