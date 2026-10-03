/*
 * Everything the game keeps lives in this browser under keys starting with "kariyerweb-": the
 * day's checkpoint, achievements, sound and reading-size settings. Nothing is sent anywhere.
 * This removes all of it, for a player who wants the device to forget the game — the offline
 * copy too (the service worker and the files it cached), so nothing of the game stays behind.
 */
export const STORAGE_PREFIX = 'kariyerweb-';
/** The offline copy's caches (named in vite.config.ts). */
export const CACHE_PREFIX = 'sen-iksin-';

export async function clearAllGameData() {
  for (const pick of [() => localStorage, () => sessionStorage]) {
    try {
      const storage = pick();
      Array.from({ length: storage.length }, (_, i) => storage.key(i) ?? '')
        .filter((key) => key.startsWith(STORAGE_PREFIX))
        .forEach((key) => storage.removeItem(key));
    } catch {
      // storage unavailable: there was nothing kept either
    }
  }
  try {
    if ('caches' in globalThis) {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith(CACHE_PREFIX)).map((n) => caches.delete(n)));
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    // no offline copy to remove (private window, file://)
  }
}
