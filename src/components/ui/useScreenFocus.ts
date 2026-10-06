import { useEffect, useRef, useState } from 'react';
import type { GamePhase } from '../../game/types';

/*
 * Oyun başka bir ekrana geçince basılan düğme kaybolur ve klavye odağı sayfaya düşer: ekran
 * okuyucu kullanan biri hiçbir şey duymaz ve Tab'a en baştan başlamak zorunda kalır. Bu, odağı yeni
 * ekranın başlığına (ya da ekranın kendisine) taşır ve kibar bir canlı bölge için kısa bir ad verir;
 * böylece değişiklik duyulur ve bir sonraki Tab yeni ekrana girer.
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

/** Yeni ekranı ne kadar süre arayacağı (ekranlar tembel yüklenir). */
const WAIT_MS = 1500;

/** Odağı `root`un ilk başlığına ya da kökün kendisine taşır; gidecek bir yer bulduysa true. */
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
    // bir ziyaretin ilk ekranı sayfanın kendisidir: odağı tarayıcının koyduğu yerde bırak
    if (shown.current === phase) return;
    shown.current = phase;
    setAnnouncement(SCREEN_NAMES[phase]);
    const started = performance.now();
    // basılan düğme: sonraki ekran yüklenirken bir iki kare daha kalabilir
    const before = document.activeElement;
    let raf = 0;
    const tryFocus = () => {
      const root = mainRef.current;
      const active = document.activeElement;
      const lost = !active || active === document.body || !document.contains(active);
      // odağı kendisi yerleştiren bir ekran (bir pencere, bir giriş alanı) onu korur
      if (root && !lost && active !== before) return;
      if (root && lost && focusScreen(root)) return;
      if (performance.now() - started < WAIT_MS) raf = requestAnimationFrame(tryFocus);
    };
    raf = requestAnimationFrame(tryFocus);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // Ekran içinde de: odaktaki düğmeyi kaldıran bir adım ("Memoyu Oku →" yerini memoya bırakırken)
  // odağı sayfaya düşürürdü; bunun yerine ekranın başlığına gider.
  useEffect(() => {
    const root = mainRef.current;
    if (!root) return;
    // tarayıcılar odaktaki öğe kaldırılınca focusout'u güvenilir şekilde tetiklemez; bu yüzden
    // ekrandaki kaldırmaları izle ve odağın nereye gittiğine bak
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
