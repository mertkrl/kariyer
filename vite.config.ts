import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { CSP } from './csp.ts'
import { gamePages } from './gamePages.ts'
import { serviceWorkerSource } from './serviceWorker.ts'

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
      const all = [...Object.keys(bundle), ...filesIn('public')]
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: serviceWorkerSource(all) })
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

/*
 * Oyunların paylaşım sayfaları (gamePages.ts): derlemede `oyun/<ad>/index.html` olarak yazılır,
 * geliştirme sunucusunda da aynı adreslerden sunulur ki paylaşım bağlantıları orada da çalışsın.
 */
function sharePages(): Plugin {
  const site = () => process.env.SITE_URL?.replace(/\/+$/, '')
  return {
    name: 'share-pages',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0].replace(/^\//, '')
        const page = path && gamePages()[path.endsWith('/') ? `${path}index.html` : path]
        if (!page) return next()
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(page)
      })
    },
    generateBundle() {
      for (const [fileName, source] of Object.entries(gamePages(site()))) this.emitFile({ type: 'asset', fileName, source })
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
  plugins: [react(), sharePages(), offlineCache(), publishedPage()],
})
