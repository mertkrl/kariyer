/*
 * The web build as one zip, ready to upload to itch.io (Kind of project: HTML) or any host that
 * takes an archive. Run `npm run package`: it builds first. Uses the system `zip`, which macOS
 * and Linux have; nothing to install. itch.io plays the game in a frame from its own address, so
 * the zip leaves out `_headers` (a Netlify/Cloudflare file that would refuse that frame).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const out = resolve('release', `sen-iksin-${version}-web.zip`);
mkdirSync('release', { recursive: true });
rmSync(out, { force: true });

try {
  // index.html at the zip's root, as itch.io expects
  execFileSync('zip', ['-r', '-X', '-q', out, '.', '-x', '_headers', '-x', '*.DS_Store', '-x', '*.map'], { cwd: 'dist', stdio: 'inherit' });
} catch {
  console.error('zip bulunamadı ya da çalışmadı. dist/ klasörünü (index.html kökte olacak şekilde) elle sıkıştırabilirsin.');
  process.exit(1);
}

const mb = (statSync(out).size / 1024 / 1024).toFixed(1);
console.log(`Paket hazır: release/sen-iksin-${version}-web.zip (${mb} MB)`);
