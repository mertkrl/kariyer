/*
 * Offline play and updates. The built game registers a service worker (sw.js, written by
 * vite.config.ts) that keeps its files in the browser. A new build waits instead of taking over
 * a running week; the welcome screen offers it, and it applies on the next visit otherwise.
 */
import { useSyncExternalStore } from 'react';

let waiting: ServiceWorker | null = null;
const listeners = new Set<() => void>();

function offer(worker: ServiceWorker) {
  waiting = worker;
  listeners.forEach((l) => l());
}

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        // only an update needs asking about: the first install has no running page to replace
        if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const next = reg.installing;
          next?.addEventListener('statechange', () => {
            if (next.state === 'installed' && navigator.serviceWorker.controller) offer(next);
          });
        });
      })
      .catch(() => {
        // no service worker (private window, file://): the game still runs, just not offline
      });
  });
}

/** Switches to the waiting build and reloads once it has taken over. */
export function applyUpdate() {
  if (!waiting) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
  waiting.postMessage('skip-waiting');
}

/** True when a newer build is downloaded and waiting. */
export function useUpdateReady() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => waiting !== null,
  );
}
