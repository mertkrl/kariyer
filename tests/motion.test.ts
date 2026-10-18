/*
 * Hareketi azaltmayı seçen oyuncu: CSS animasyonları global.css'te durur, JavaScript ile çizilen
 * her sahne ve sayaç da components/ui/motion.ts'e sorar. Yeni bir requestAnimationFrame döngüsü
 * bu soruyu sormadan eklenemez.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../src', import.meta.url).pathname;
const sources = readdirSync(root, { recursive: true, encoding: 'utf8' })
  .filter((f) => /\.tsx?$/.test(f))
  .map((f) => ({ f, code: readFileSync(join(root, f), 'utf8') }));

// hareket değil: odağı ekran açılınca bir kez yerleştirmek için kare beklenir
const NOT_MOTION = new Set(['components/ui/useScreenFocus.ts']);

test('her animasyon döngüsü hareket azaltma tercihini sorar', () => {
  const missing = sources
    .filter(({ f, code }) => code.includes('requestAnimationFrame(') && !NOT_MOTION.has(f) && !code.includes('prefersReducedMotion'))
    .map(({ f }) => f);
  assert.deepEqual(missing, []);
});

test('tercih tek yerden okunur', () => {
  const raw = sources.filter(({ f, code }) => f !== 'components/ui/motion.ts' && code.includes('prefers-reduced-motion')).map(({ f }) => f);
  assert.deepEqual(raw, []);
});
