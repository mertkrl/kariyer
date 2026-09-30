import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/** Every file under `dir`, as paths relative to it. */
function filesIn(dir: string, root = dir): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? filesIn(path, root) : [relative(root, path)]
  })
}

/*
 * Offline play without a PWA library: at build time this writes `sw.js`, a service worker that
 * keeps the whole game (the page, its scripts, styles, fonts, icons and audio) in the browser's
 * cache. The cache is named after a hash of the file list, so a new build replaces the old one.
 * The page itself is fetched from the network first; a new build waits for the player (swUpdate.ts).
 */
function offlineCache(): Plugin {
  return {
    name: 'offline-cache',
    apply: 'build',
    generateBundle(_, bundle) {
      const files = [...Object.keys(bundle), ...filesIn('public')].filter((f) => !f.endsWith('.map') && f !== '.DS_Store' && f !== 'og.png' && f !== 'audio/theme.m4a')
      const version = createHash('sha256').update(files.join('|')).digest('hex').slice(0, 12)
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
  // everything else is fingerprinted or static: the cached copy is the right one
  event.respondWith(caches.match(request, { ignoreSearch: true }).then((hit) => hit ?? fetch(request)));
});
`
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
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
  plugins: [react(), offlineCache()],
})
