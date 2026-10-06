import { useEffect } from 'react';

/*
 * Oyundaki her açılır pencere (oryantasyon, telefon, ayarlar, toplantı, işe alım onayı, rapor,
 * döndürme ipucu) için tek bir klavye kuralı: `aria-modal="true"` olan görünür bir
 * `role="dialog"` açıkken Tab ve Shift+Tab onun kontrolleri arasında döner ve arkasındaki sayfaya
 * hiç ulaşmaz. Odak hâlâ dışarıdaysa (pencere üzerinde olduğun bir şeyin üstüne açıldıysa) ilk
 * Tab içeri gider. App'te bir kez kurulur.
 */

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const visible = (el: Element) => el.getClientRects().length > 0 && !el.closest('[inert]');

/** Üstteki açılır pencere: belge sırasındaki son açık olan. */
export function topModal(doc: Document = document): HTMLElement | null {
  const open = [...doc.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')].filter(visible);
  return open[open.length - 1] ?? null;
}

/** `modal` içinde `active`ten Tab'ın (ya da Shift+Tab'ın) nereye gideceği; tarayıcının taşımasına izin vermek için null. */
export function nextInModal(modal: HTMLElement, active: Element | null, back: boolean): HTMLElement | null {
  const items = [...modal.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(visible);
  if (!items.length) return modal;
  const first = items[0];
  const last = items[items.length - 1];
  if (!active || !modal.contains(active)) return back ? last : first;
  if (!back && active === last) return first;
  if (back && active === first) return last;
  return null;
}

export function useModalTrap() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || e.defaultPrevented) return;
      const modal = topModal();
      if (!modal) return;
      const to = nextInModal(modal, document.activeElement, e.shiftKey);
      if (!to) return;
      e.preventDefault();
      if (to === modal && !modal.hasAttribute('tabindex')) modal.setAttribute('tabindex', '-1');
      to.focus({ preventScroll: true });
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}
