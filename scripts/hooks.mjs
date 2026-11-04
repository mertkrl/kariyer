/*
 * `npm install` sonrası (prepare): bu klonda git kancalarını .githooks'a bağlar, böylece her
 * `git push` önce `npm run ci`'ı çalıştırır. CI'da, git klasörü olmayan kopyada (zip) ya da kanca
 * zaten bağlıysa hiçbir şey yapmaz. Acil durumda: `git push --no-verify`.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

if (process.env.CI || !existsSync('.git')) process.exit(0);
try {
  const now = execFileSync('git', ['config', '--get', 'core.hooksPath'], { encoding: 'utf8' }).trim();
  if (now === '.githooks') process.exit(0);
} catch {
  // ayarlı değil
}
try {
  execFileSync('git', ['config', 'core.hooksPath', '.githooks']);
  console.log('git kancaları bağlandı: her push önce `npm run ci` çalıştırır (atlamak için --no-verify).');
} catch {
  // git yok: kanca bağlanmadan da çalışılır
}
