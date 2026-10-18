/*
 * Yerleşim stratejisi (docs/yerlesim.md), test olarak tutulur: her stil dosyası aynı birkaç genişlik
 * ve yükseklikte kırılır ve birçok bileşenin paylaştığı çerçeve ölçüleri tek bir yerden gelir.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../src', import.meta.url).pathname;
const sheets = readdirSync(root, { recursive: true, encoding: 'utf8' })
  .filter((f) => f.endsWith('.css'))
  .map((f) => ({ f, css: readFileSync(join(root, f), 'utf8') }));

const WIDTHS = [1240, 1100, 960, 760, 560];
const HEIGHTS = [820, 520];

test('her stil dosyası yalnızca ortak kırılma noktalarını kullanır', () => {
  const stray: string[] = [];
  for (const { f, css } of sheets) {
    const queries = [...css.matchAll(/@media[^{]*/g)].map((m) => m[0]).join(' ');
    for (const [, kind, dim, px] of queries.matchAll(/(min|max)-(width|height):\s*(\d+)px/g)) {
      // bir min- sorgusu eşleşen max- sorgusundan bir piksel sonra başlar (960px'ten sonra 961px)
      const value = Number(px) - (kind === 'min' ? 1 : 0);
      if (!(dim === 'width' ? WIDTHS : HEIGHTS).includes(value)) stray.push(`${f}: ${kind}-${dim}: ${px}px`);
    }
  }
  assert.deepEqual(stray, [], 'listede olmayan kırılma noktası: styles/layout.css ve docs/yerlesim.md');
});

test('çerçeve ölçüleri tek yerde tanımlı, başka yerde yeniden tanımlanmaz', () => {
  const layout = sheets.find((s) => s.f === join('styles', 'layout.css'))!.css;
  const shared = ['--frame-topbar', '--pc-titlebar', '--pc-taskbar', '--pc-task', '--pc-side'];
  for (const v of shared) assert.match(layout, new RegExp(`${v}:`), `${v} layout.css'te yok`);
  const elsewhere = sheets.filter((s) => s.f !== join('styles', 'layout.css')).flatMap(({ f, css }) => shared.filter((v) => new RegExp(`${v}\\s*:`).test(css)).map((v) => `${f}: ${v}`));
  assert.deepEqual(elsewhere, []);
});

// Bir stil dosyası 800 satırı geçerse bileşenine bölünmeli (GameplayScreen.module.css nasıl bölündüyse)
const MAX_SHEET_LINES = 800;

test('hiçbir stil dosyası bölünmeden büyümez', () => {
  const big = sheets.filter(({ css }) => css.split('\n').length > MAX_SHEET_LINES).map(({ f }) => f);
  assert.deepEqual(big, []);
});
