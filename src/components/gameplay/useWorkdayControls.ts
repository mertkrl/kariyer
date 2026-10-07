import { useEffect, useRef, type RefObject } from 'react';
import { useGameStore } from '../../game/store/store';

/*
 * Mesainin klavyesi ve saati: masa ile bilgisayar arasında odağın nereye düştüğü, Cmd/Ctrl+Z ile
 * geri alma, Esc ile masaya dönüş, sekme gizlenince duraklama ve saniyede bir tick.
 */
export function useWorkdayControls({
  view,
  setView,
  phoneOpen,
  paused,
  deskLayerRef,
  pcLayerRef,
}: {
  view: 'desk' | 'pc';
  setView: (view: 'desk' | 'pc') => void;
  phoneOpen: boolean;
  paused: boolean;
  deskLayerRef: RefObject<HTMLDivElement | null>;
  pcLayerRef: RefObject<HTMLDivElement | null>;
}) {
  const tick = useGameStore((s) => s.tick);
  const shownView = useRef(view);
  const wasAtPc = useRef(false);

  // Bilgisayara dönmek (ya da geri dönmek) diğer katmanı etkisiz kılar ve klavye odağı sayfaya
  // düşer; bunun yerine odak, döndüğün tarafın ilk kontrolüne gider.
  useEffect(() => {
    if (shownView.current === view) return;
    shownView.current = view;
    const layer = (view === 'pc' ? pcLayerRef : deskLayerRef).current;
    const active = document.activeElement;
    if (!layer || (active && active !== document.body && layer.contains(active))) return;
    layer.querySelector<HTMLElement>('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')?.focus({ preventScroll: true });
  }, [view, deskLayerRef, pcLayerRef]);

  // bilgisayardan masaya dönünce klavye kaldığı yerden devam eder: bilgisayardan
  useEffect(() => {
    if (view === 'pc') wasAtPc.current = true;
    else if (wasAtPc.current) {
      wasAtPc.current = false;
      document.querySelector<HTMLButtonElement>('button[data-key="b"]')?.focus({ preventScroll: true });
    }
  }, [view]);

  // Cmd/Ctrl+Z açık adaydaki kararı geri alır.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        useGameStore.getState().undoDecision();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Esc bilgisayardan masaya döndürür (üstte tuşu isteyen başka bir şey yoksa).
  useEffect(() => {
    if (view !== 'pc') return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape' || phoneOpen || paused) return;
      setView('desk');
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, phoneOpen, paused, setView]);

  useEffect(() => {
    const interval = setInterval(() => tick(), 1000);
    return () => clearInterval(interval);
  }, [tick]);

  // gizli bir sekme, mesaiyi oyuncunun arkasından işletmez
  useEffect(() => {
    function onVisibility() {
      const s = useGameStore.getState();
      if (document.hidden && !s.paused) s.togglePause();
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);
}
