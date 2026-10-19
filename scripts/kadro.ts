/* docs/kadrolar.md'yi oyunun verisinden yeniden yazar. */
import { writeFileSync } from 'node:fs';
import { renderKadroDoc } from './kadroDoc';

writeFileSync(new URL('../docs/kadrolar.md', import.meta.url), renderKadroDoc());
console.log('docs/kadrolar.md güncellendi.');
