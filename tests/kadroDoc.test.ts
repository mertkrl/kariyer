import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderKadroDoc } from '../scripts/kadroDoc';

test('docs/kadrolar.md oyunun verisiyle aynı (eskidiyse: npm run docs:kadro)', () => {
  assert.equal(readFileSync(new URL('../docs/kadrolar.md', import.meta.url), 'utf8'), renderKadroDoc());
});
