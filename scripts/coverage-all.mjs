/*
 * Dürüst kapsam: Node'un kapsam raporu yalnızca testlerin yüklediği dosyaları sayar; hiç yüklenmeyen
 * dosya (çoğu .tsx bileşeni) rapora girmez ve oran olduğundan yüksek görünür. Bu betik testleri lcov
 * çıktısıyla çalıştırır, sonra src/ altındaki her .ts/.tsx dosyasını sayar: yüklenmeyenin bütün kod
 * satırları kapsanmamış sayılır. Ölçüdür, eşik değil (CI'ın eşiği `npm run test:coverage`).
 * Arayüz uçtan uca testlerle (npm run e2e) denenir; bu sayı onları içermez.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

mkdirSync('coverage', { recursive: true });
const tests = readdirSync('tests', { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.test.ts')).map((f) => join('tests', f));
execFileSync(
  process.execPath,
  ['--import', './tests/setup/register.mjs', '--test', '--experimental-test-coverage', '--test-coverage-include=src/**', '--test-reporter=lcov', '--test-reporter-destination=coverage/lcov.info', ...tests],
  { stdio: ['ignore', 'ignore', 'inherit'] },
);

/** lcov: dosya → { bulunan, kapsanan } satır. */
const covered = new Map();
let file = '';
for (const line of readFileSync('coverage/lcov.info', 'utf8').split('\n')) {
  if (line.startsWith('SF:')) {
    file = relative(process.cwd(), resolve(line.slice(3)));
    covered.set(file, { found: 0, hit: 0 });
  } else if (line.startsWith('LF:')) covered.get(file).found = Number(line.slice(3));
  else if (line.startsWith('LH:')) covered.get(file).hit = Number(line.slice(3));
}

/** Yüklenmeyen dosyanın kod satırı: boş ve yorum satırları hariç. */
const codeLines = (path) => {
  let inBlock = false;
  return readFileSync(path, 'utf8').split('\n').filter((raw) => {
    const l = raw.trim();
    if (inBlock) {
      if (l.includes('*/')) inBlock = false;
      return false;
    }
    if (l.startsWith('/*')) {
      inBlock = !l.includes('*/');
      return false;
    }
    return l !== '' && !l.startsWith('//') && !l.startsWith('*');
  }).length;
};

const all = readdirSync('src', { recursive: true, encoding: 'utf8' }).filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith('.d.ts')).map((f) => join('src', f));
let found = 0;
let hit = 0;
let loadedFound = 0;
let loadedHit = 0;
const byDir = new Map();
for (const f of all) {
  const c = covered.get(f) ?? { found: codeLines(f), hit: 0 };
  const loaded = covered.has(f);
  found += c.found;
  hit += c.hit;
  if (loaded) {
    loadedFound += c.found;
    loadedHit += c.hit;
  }
  const dir = f.split('/').slice(1, f.startsWith('src/games/') ? 3 : 2).join('/');
  const d = byDir.get(dir) ?? { found: 0, hit: 0, files: 0, loaded: 0 };
  d.found += c.found;
  d.hit += c.hit;
  d.files++;
  d.loaded += loaded ? 1 : 0;
  byDir.set(dir, d);
}
const pct = (h, f) => `${f ? ((100 * h) / f).toFixed(1) : '0.0'}%`;
console.log(`Testlerin yüklediği dosyalar: ${pct(loadedHit, loadedFound)} satır (${covered.size} dosya)`);
console.log(`Bütün kaynak:                 ${pct(hit, found)} satır (${all.length} dosya; yüklenmeyen dosya %0 sayılır)\n`);
for (const [dir, d] of [...byDir].sort((a, b) => a[1].hit / a[1].found - b[1].hit / b[1].found)) console.log(`  ${pct(d.hit, d.found).padStart(6)}  ${dir.padEnd(22)} ${d.loaded}/${d.files} dosya testte`);
