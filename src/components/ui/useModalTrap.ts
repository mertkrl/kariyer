import { useEffect } from 'react';

/*
 * One keyboard rule for every modal in the game (orientation, phone, settings, meeting, hire
 * confirmation, report, rotate hint): while a visible `role="dialog"` with `aria-modal="true"`
 * is open, Tab and Shift+Tab cycle through its controls and never reach the page behind it.
 * When focus is still outside (the modal opened over something you were on), the first Tab
 * goes into it. Installed once, in App.
 */

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const visible = (el: Element) => el.getClientRects().length > 0 && !el.closest('[inert]');

/** The modal that is on top: the last open one in document order. */
export function topModal(doc: Document = document): HTMLElement | null {
  const open = [...doc.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')].filter(visible);
  return open[open.length - 1] ?? null;
}

/** Where Tab (or Shift+Tab) should go from `active` inside `modal`; null to let the browser move. */
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
