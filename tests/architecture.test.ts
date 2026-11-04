/*
 * Katmanların bağımlılık yönü (docs/mimari.md):
 *   shared/  ← hiçbir şeye bağlı değil (yalnızca kendi içi ve paketler)
 *   arcade/  ← shared/
 *   games/X/ ← shared/, arcade/ (salonun kabuğu: kayıt, ilerleme, paylaşım, geri düğmesi)
 *   kök (main.tsx, Root.tsx) ← hepsi
 * Bir oyun başka bir oyunu, salon bir oyunun içini, ortak katman da oyunları ya da salonu import
 * edemez. Böylece bir oyun silinince ya da taşınınca yalnızca Root.tsx ve games.ts değişir.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';

const src = new URL('../src', import.meta.url).pathname;
const files = readdirSync(src, { recursive: true, encoding: 'utf8' }).filter((f) => /\.(ts|tsx)$/.test(f));
const SPEC = /(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g;

/** Dosyanın katmanı: 'shared', 'arcade', 'games/<ad>' ya da 'root'. */
const layerOf = (f: string) => {
  const [top, name] = f.split('/');
  if (top === 'games') return `games/${name}`;
  return top === 'shared' || top === 'arcade' ? top : 'root';
};

const edges = files.flatMap((f) =>
  [...readFileSync(join(src, f), 'utf8').matchAll(SPEC)].map((m) => ({ from: f, to: relative(src, normalize(join(src, dirname(f), m[1]))) })),
);

const allowed = (from: string, to: string) => {
  const a = layerOf(from);
  const b = layerOf(to);
  if (a === b || a === 'root') return true;
  if (b === 'shared') return true;
  if (b === 'arcade') return a.startsWith('games/');
  return false;
};

test('katmanlar yalnızca izin verilen yönde import eder', () => {
  const bad = edges.filter((e) => !allowed(e.from, e.to)).map((e) => `${e.from} → ${e.to}`);
  assert.deepEqual(bad, []);
});

test('her oyun kendi klasöründe: games/ altında oyun dışı dosya yok', () => {
  const loose = files.filter((f) => f.startsWith('games/') && f.split('/').length < 3);
  assert.deepEqual(loose, []);
});

test('tarayıcı deposuna yalnızca shared/storage.ts (ve "Verilerimi sil") dokunur', () => {
  const allowedFiles = new Set(['shared/storage.ts', 'shared/privacy.ts']);
  const direct = files.filter((f) => !allowedFiles.has(f) && /\b(localStorage|sessionStorage)\s*[.[]/.test(readFileSync(join(src, f), 'utf8')));
  assert.deepEqual(direct, []);
});
