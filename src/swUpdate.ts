/*
 * Çevrimdışı oyun ve güncellemeler. Derlenmiş oyun, dosyalarını tarayıcıda tutan bir service
 * worker kaydeder (sw.js, vite.config.ts yazar). Yeni bir derleme, süren bir haftanın üzerine
 * hemen geçmez, bekler; karşılama ekranı onu önerir, yoksa bir sonraki ziyarette devreye girer.
 */
import { useSyncExternalStore } from 'react';

let waiting: ServiceWorker | null = null;
const listeners = new Set<() => void>();

function offer(worker: ServiceWorker) {
  waiting = worker;
  listeners.forEach((l) => l());
}

const SW_URL = './sw.js';

/**
 * Sayfanın güvenlik politikası (csp.ts) script adreslerini yalnızca bir Trusted Types
 * politikasından geçirir, o da yalnızca bu: service worker'ın kendi adresini geçirir, başka
 * hiçbirini kabul etmez.
 */
function swUrl(): string {
  const tt = (window as { trustedTypes?: { createPolicy: (name: string, rules: { createScriptURL: (url: string) => string }) => { createScriptURL: (url: string) => unknown } } }).trustedTypes;
  if (!tt) return SW_URL;
  const policy = tt.createPolicy('sen-iksin-sw', {
    createScriptURL: (url) => {
      if (url !== SW_URL) throw new TypeError(`İzin verilmeyen betik adresi: ${url}`);
      return url;
    },
  });
  return policy.createScriptURL(SW_URL) as string;
}

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    let url: string;
    try {
      url = swUrl();
    } catch {
      return; // politika oluşturulamadı: çevrimdışı kopya olmadan oynamaya devam
    }
    navigator.serviceWorker
      .register(url)
      .then((reg) => {
        // yalnızca güncelleme sorulur: ilk kurulumda değiştirilecek çalışan bir sayfa yoktur
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

/** Bekleyen derlemeye geçer; devraldığında sayfayı yeniden yükler. */
export function applyUpdate() {
  if (!waiting) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
  waiting.postMessage('skip-waiting');
}

/** Daha yeni bir derleme indirilmiş ve bekliyorsa true. */
export function useUpdateReady() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => waiting !== null,
  );
}
