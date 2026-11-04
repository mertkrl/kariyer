/*
 * Uçtan uca testler: derlenmiş siteyi (dist/) önizleme sunucusunda açar, e2e/*.e2e.ts testlerini
 * gerçek bir tarayıcıyla (Playwright, Chromium) çalıştırır, sunucuyu kapatır. Önce `npm run build`.
 * Tarayıcı yoksa: `npx playwright install chromium`.
 */
import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';

const PORT = 4190;
if (!existsSync('dist/index.html')) {
  console.error('dist/ yok: önce `npm run build`.');
  process.exit(1);
}
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const stop = () => server.kill();
process.on('exit', stop);

// sunucu ayağa kalkana kadar bekle
const base = `http://localhost:${PORT}/`;
for (let i = 0; i < 60; i++) {
  try {
    if ((await fetch(base)).ok) break;
  } catch {
    // daha açılmadı
  }
  await new Promise((ok) => setTimeout(ok, 250));
}

const files = readdirSync('e2e').filter((f) => f.endsWith('.e2e.ts')).map((f) => `e2e/${f}`);
const tests = spawn(process.execPath, ['--import', './tests/setup/register.mjs', '--test', '--test-concurrency=1', ...files], {
  stdio: 'inherit',
  env: { ...process.env, E2E_BASE: base },
});
tests.on('exit', (code) => {
  stop();
  process.exit(code ?? 1);
});
