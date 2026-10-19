/*
 * Derlemenin yazdığı service worker'ın (sw.js) kaynağı; vite.config.ts onu derlenen dosyaların
 * listesiyle çağırır, tests/security.test.ts de aynı işlevi doğrudan denetler: yalnızca oyunun kendi
 * adresinden GET istekleri önbelleğe girer, müzik ilk indirmede yoktur ve her yeni dosya listesi
 * yeni bir önbellek adı alır.
 */
import { createHash } from 'node:crypto'

/** Önbelleğe hiç girmeyecek dosyalar: kaynak haritaları, macOS çöpü, paylaşım görseli, sunucu başlıkları. */
export function cacheableFiles(all: string[]): string[] {
  return all.filter((f) => !f.endsWith('.map') && !f.endsWith('.DS_Store') && f !== 'og.png' && f !== '_headers')
}

export function serviceWorkerSource(bundleFiles: string[]): string {
  const all = cacheableFiles(bundleFiles)
  // müzik ve adayların sitelerindeki fotoğraflar ilk açılışta inmez: ilk kullanıldıklarında saklanır
  const files = all.filter((f) => !f.startsWith('audio/') && !f.startsWith('sites/'))
  const version = createHash('sha256').update(all.join('|')).digest('hex').slice(0, 12)
  return `const CACHE = 'sen-iksin-${version}';
const FILES = ${JSON.stringify(['./', ...files.map((f) => './' + f)])};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
});

// a new build waits until the page says so (the welcome screen's "Yenile") or every tab is closed:
// taking over a running week would leave it asking for files the new build no longer has
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  // the page: fresh when online, the cached copy when not
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('./', { cacheName: CACHE })));
    return;
  }
  // everything else is fingerprinted or static: the cached copy is the right one; what isn't
  // cached yet (the music, the rain) is kept the first time it arrives whole
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(
      (hit) =>
        hit ??
        fetch(request).then((response) => {
          if (response.status === 200 && !request.headers.has('range')) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
          }
          return response;
        }),
    ),
  );
});
`
}
