/*
 * Bağlantı önizlemesi görsellerini yeniden üretir: çalışan geliştirme sunucusundaki
 * `scripts/og/index.html` sayfasını (src/og/OgCard.tsx) başsız Chrome'la 1200×630 fotoğraflar.
 * Çıktı: public/og.png (site) ve public/og/<oyun>.png. Oyun eklenince ya da kart çizimi değişince:
 *
 *   npm run dev            (başka bir sekmede)
 *   npm run og             (adres değiştiyse: OG_DEV=http://localhost:5174 npm run og)
 *
 * Chrome yolu CHROME ile değiştirilebilir. Görseller depoya girer; derleme onları olduğu gibi kopyalar.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SLUGS } from '../src/arcade/slugs.ts';

const dev = (process.env.OG_DEV ?? 'http://localhost:5174').replace(/\/+$/, '');
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = mkdtempSync(join(tmpdir(), 'og-chrome-'));
mkdirSync('public/og', { recursive: true });

const shoot = (query, out) => {
  execFileSync(chrome, [
    '--headless=new',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--window-size=1200,630',
    '--virtual-time-budget=4000',
    `--user-data-dir=${profile}`,
    `--screenshot=${join(process.cwd(), out)}`,
    `${dev}/scripts/og/index.html${query}`,
  ], { stdio: 'ignore' });
  console.log(`  ${out}`);
};

try {
  shoot('', 'public/og.png');
  for (const [route, slug] of Object.entries(SLUGS)) shoot(`?g=${route}`, `public/og/${slug}.png`);
} finally {
  rmSync(profile, { recursive: true, force: true });
}
