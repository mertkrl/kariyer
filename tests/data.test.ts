import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NEIGHBOUR_ID, NEPHEW_ID, candidates } from '../src/game/data/candidates';

/** The label each verdict opens its system line with. Scoring reads `verdict`; players read the line. */
const LABELS = {
  priority: ['Öncelikli'],
  review: ['Ek inceleme', 'Süreç devam'],
  low: ['Düşük öncelik'],
  out: ['Değerlendirme dışı'],
};

test('her adayın sistem satırı kendi önerisiyle açılır', () => {
  for (const c of Object.values(candidates)) {
    const label = /^Öneri: ([^·]+?) ·/.exec(c.systemLine)?.[1];
    assert.ok(label && LABELS[c.verdict].includes(label), `${c.id}: verdict "${c.verdict}", satır "${c.systemLine}"`);
  }
});

test('hikâye rolleri verideki adaylara bağlı', () => {
  assert.equal(candidates[NEPHEW_ID].storyRole, 'nephew');
  assert.equal(candidates[NEIGHBOUR_ID].storyRole, 'neighbour');
});

// Same seed, same week: the game logic draws only from rng.ts. Visual and audio noise lives outside src/game.
test('oyun mantığı Math.random kullanmaz (rng.ts dışında)', () => {
  const root = new URL('../src/game', import.meta.url).pathname;
  const offenders = readdirSync(root, { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.tsx?$/.test(f) && f !== 'rng.ts')
    .filter((f) => /Math\.random\s*\(/.test(readFileSync(join(root, f), 'utf8')));
  assert.deepEqual(offenders, []);
});
