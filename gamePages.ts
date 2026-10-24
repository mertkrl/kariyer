/*
 * Oyunların paylaşım sayfaları. Salon adresleri `#/test` gibi bir parça taşır ve bağlantı önizlemesi
 * yapan siteler (WhatsApp, X, LinkedIn…) parçayı görmez: hepsi aynı ana sayfayı, aynı görseli
 * gösterirdi. Bu yüzden her oyunun `oyun/<ad>/` altında küçük, scriptsiz bir sayfası vardır: kendi
 * başlığını, açıklamasını ve `og/<ad>.png` görselini taşır, açılınca da oyunun kendisine geçer.
 * vite.config.ts bunları derlemede yazar, geliştirme sunucusunda da aynı adresten sunar; oyunların
 * paylaştığı bağlantılar (src/arcade/share.ts) buraya gider.
 */
import { CSP } from './csp.ts'
import { GAMES, SITE_NAME, SITE_TAGLINE } from './src/arcade/games.ts'
import { slugOf } from './src/arcade/slugs.ts'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Derlemede yazılan sayfalar: yol → HTML. `site` (SITE_URL) verilmişse görsel ve adresler mutlak olur. */
export function gamePages(site?: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const g of GAMES) {
    const slug = slugOf(g.route)
    const image = site ? `${site}/og/${slug}.png` : `../../og/${slug}.png`
    const title = `${g.title} · ${SITE_NAME}`
    const target = `../../#/${slug}`
    const url = site ? `\n    <link rel="canonical" href="${site}/oyun/${slug}/" />\n    <meta property="og:url" content="${site}/oyun/${slug}/" />` : ''
    out[`oyun/${slug}/index.html`] = `<!doctype html>
<html lang="tr">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${CSP}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(g.blurb)}" />
    <meta name="referrer" content="no-referrer" />${url}
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="tr_TR" />
    <meta property="og:site_name" content="${esc(`${SITE_NAME} · ${SITE_TAGLINE}`)}" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(g.blurb)}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(g.blurb)}" />
    <meta name="twitter:image" content="${image}" />
    <meta http-equiv="refresh" content="0; url=${target}" />
  </head>
  <body>
    <p><a href="${target}">${esc(g.title)} açılıyor…</a></p>
  </body>
</html>
`
  }
  return out
}
