/*
 * CHANGELOG.md'den bir sürümün bölümünü yazdırır (release.yml sürüm notu olarak kullanır).
 *   node scripts/release-notes.mjs v1.1.0
 */
import { readFileSync } from 'node:fs';

const version = (process.argv[2] ?? '').replace(/^v/, '');
const log = readFileSync('CHANGELOG.md', 'utf8');
const start = log.indexOf(`## [${version}]`);
if (start < 0) {
  console.error(`CHANGELOG.md'de ${version} bölümü yok`);
  process.exit(1);
}
const next = log.indexOf('\n## [', start + 1);
console.log(log.slice(log.indexOf('\n', start) + 1, next < 0 ? undefined : next).trim());
