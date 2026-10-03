import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { CSP } from './csp.ts'

/** Every file under `dir`, as paths relative to it. */
function filesIn(dir: string, root = dir): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? filesIn(path, root) : [relative(root, path)]
  })
}

/*
 * Offline play without a PWA library: at build time this writes `sw.js`, a service worker that
 * keeps the whole game (the page, its scripts, styles, fonts and icons) in the browser's cache.
 * The music and rain (a few MB) are not part of that first download: each is kept the first time
 * it plays, so a phone on mobile data doesn't fetch sound it may never hear. The cache is named
 * after a hash of the file list, so a new build replaces the old one. The page itself is fetched
 * from the network first; a new build waits for the player (swUpdate.ts).
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
 * What only the published page needs. The Content-Security-Policy (csp.ts), added at build
 * time only — the dev server injects styles and a websocket the policy would block. And when SITE_URL is set (the address the build is
 * published at, e.g. SITE_URL=https://sen-iksin.example npm run build), the share preview gets
 * absolute addresses, which link previews on social sites require.
 */

function publishedPage(): Plugin {
  return {
    name: 'published-page',
    apply: 'build',
    transformIndexHtml: {
      // after Vite has rewritten the page's own addresses to relative ones
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
  // relative paths, so the build works from any folder of any static host
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify((JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version),
  },
  plugins: [react(), offlineCache(), publishedPage()],
})
