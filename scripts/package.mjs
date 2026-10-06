/*
 * Web derlemesi tek bir zip olarak; itch.io'ya (Proje türü: HTML) ya da arşiv kabul eden herhangi
 * bir sunucuya yüklenmeye hazır. `npm run package` ile çalıştır: önce derler. macOS ve Linux'ta olan
 * sistem `zip`ini kullanır; kurulacak bir şey yok. itch.io oyunu kendi adresinden bir çerçevede
 * oynatır; bu yüzden zip `_headers`ı dışarıda bırakır (o çerçeveyi reddedecek bir Netlify/Cloudflare dosyası).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const out = resolve('release', `sen-iksin-${version}-web.zip`);
mkdirSync('release', { recursive: true });
rmSync(out, { force: true });

try {
  // itch.io'nun beklediği gibi index.html zip'in kökünde
  execFileSync('zip', ['-r', '-X', '-q', out, '.', '-x', '_headers', '-x', '*.DS_Store', '-x', '*.map'], { cwd: 'dist', stdio: 'inherit' });
} catch {
  console.error('zip bulunamadı ya da çalışmadı. dist/ klasörünü (index.html kökte olacak şekilde) elle sıkıştırabilirsin.');
  process.exit(1);
}

const mb = (statSync(out).size / 1024 / 1024).toFixed(1);
console.log(`Paket hazır: release/sen-iksin-${version}-web.zip (${mb} MB)`);
