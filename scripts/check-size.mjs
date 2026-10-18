/*
 * Paket bütçesi, kurulacak bir şey olmadan: `npm run build`'den sonra ilk ekranın ihtiyaç duyduğu
 * şeylerin (index.html'in scriptleri ve stilleri) gzip'li boyutu aşağıdaki bütçenin altında kalmalı.
 * Oyunun geri kalanı arka planda yüklenir ve yalnızca raporlanır.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET_KB = 90;
// oyunun çekirdeği (store, kurallar, aday verisi) ilk ekranın arkasından iner; yine de sınırsız büyümesin
const CORE_BUDGET_KB = 95;
const dist = 'dist';
const kb = (bytes) => Math.round(bytes / 102.4) / 10;
const gz = (path) => gzipSync(readFileSync(path)).length;

const html = readFileSync(join(dist, 'index.html'), 'utf8');
const initial = [...html.matchAll(/(?:src|href)="\.\/(assets\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]);
const initialBytes = initial.reduce((sum, f) => sum + gz(join(dist, f)), 0);

const all = readdirSync(join(dist, 'assets')).filter((f) => /\.(js|css)$/.test(f));
const rest = all.map((f) => ({ f, size: gz(join(dist, 'assets', f)) })).sort((a, b) => b.size - a.size);

console.log(`İlk açılış (gzip): ${kb(initialBytes)} KB / bütçe ${BUDGET_KB} KB`);
for (const f of initial) console.log(`  ${f}  ${kb(gz(join(dist, f)))} KB`);
console.log('En büyük parçalar:');
for (const { f, size } of rest.slice(0, 5)) console.log(`  ${f}  ${kb(size)} KB`);

const core = rest.find(({ f }) => /^store-.*\.js$/.test(f));
if (!core) {
  console.error('Oyun çekirdeği (store-*.js) bulunamadı: storeLoader.ts hâlâ ayrı bir parça mı yüklüyor?');
  process.exit(1);
}
console.log(`Oyun çekirdeği (gzip): ${kb(core.size)} KB / bütçe ${CORE_BUDGET_KB} KB`);
if (core.size > CORE_BUDGET_KB * 1024) {
  console.error(`Çekirdek bütçesi aşıldı: ${kb(core.size)} KB > ${CORE_BUDGET_KB} KB`);
  process.exit(1);
}

if (initialBytes > BUDGET_KB * 1024) {
  console.error(`Bütçe aşıldı: ${kb(initialBytes)} KB > ${BUDGET_KB} KB`);
  process.exit(1);
}
