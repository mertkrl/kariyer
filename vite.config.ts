import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { CSP } from './csp.ts'

/** `dir` altındaki her dosya, ona göreli yollar olarak. */
function filesIn(dir: string, root = dir): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? filesIn(path, root) : [relative(root, path)]
  })
}

/*
 * PWA kütüphanesi olmadan çevrimdışı oyun: derleme sırasında bu, oyunun tamamını (sayfa, scriptleri,
 * stilleri, yazı tipleri ve simgeleri) tarayıcının önbelleğinde tutan bir service worker olan
 * `sw.js`'i yazar. Müzik ve yağmur (birkaç MB) bu ilk indirmenin parçası değildir: her biri ilk
 * çaldığında saklanır, böylece mobil veri kullanan bir telefon belki hiç duymayacağı sesi indirmez.
 * Önbellek dosya listesinin bir özetiyle adlandırılır, böylece yeni bir derleme eskisinin yerini alır.
 * Sayfanın kendisi önce ağdan alınır; yeni bir derleme oyuncuyu bekler (swUpdate.ts).
 */
function offlineCache(): Plugin {
  return {
    name: 'offline-cache',
    apply: 'build',
    generateBundle(_, bundle) {
      const all = [...Object.keys(bundle), ...filesIn('public')].filter((f) => !f.endsWith('.map') && !f.endsWith('.DS_Store') && f !== 'og.png' && f !== '_headers')
      const files = all.filter((f) => !f.startsWith('audio/'))
      const version = createHash('sha256').update(all.join('|')).digest('hex').slice(0, 12)
      const source = `const CACHE = 'sen-iksin-${version}';
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
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

/*
 * Yalnızca yayınlanan sayfanın ihtiyaç duyduğu şeyler. İçerik Güvenliği Politikası (csp.ts) yalnızca
 * derleme sırasında eklenir; geliştirme sunucusu politikanın engelleyeceği stiller ve bir websocket
 * ekler. SITE_URL ayarlıysa (derlemenin yayınlandığı adres, ör. SITE_URL=https://sen-iksin.example
 * npm run build), paylaşım önizlemesi sosyal sitelerdeki bağlantı önizlemelerinin istediği mutlak
 * adresleri alır.
 */

function publishedPage(): Plugin {
  return {
    name: 'published-page',
    apply: 'build',
    transformIndexHtml: {
      // Vite sayfanın kendi adreslerini göreli olanlarla değiştirdikten sonra
      order: 'post',
      handler(html) {
        let out = html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`)
        const site = process.env.SITE_URL?.replace(/\/+$/, '')
        if (site) {
          out = out
            .replace(/content="\.?\/og\.png"/g, `content="${site}/og.png"`)
            .replace('<meta property="og:type"', `<link rel="canonical" href="${site}/" />\n    <meta property="og:url" content="${site}/" />\n    <meta property="og:type"`)
        }
        return out
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // göreli yollar, böylece derleme herhangi bir statik sunucunun herhangi bir klasöründen çalışır
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify((JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version),
  },
  plugins: [react(), offlineCache(), publishedPage()],
})
