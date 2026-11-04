import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseProgress, PROGRESS_KEY, PROGRESS_VERSION, withPlayed } from '../src/arcade/progress';
import { GAMES } from '../src/arcade/games';
import { STORAGE_PREFIX } from '../src/shared/privacy';

const ROUTES = GAMES.map((g) => g.route);
const EMPTY = { v: PROGRESS_VERSION, played: {} };

test('defter kaydı sitenin önekiyle tutulur, bozuk ya da yabancı veri boş sayılır', () => {
  assert.ok(PROGRESS_KEY.startsWith(STORAGE_PREFIX));
  assert.deepEqual(parseProgress(null, ROUTES), EMPTY);
  assert.deepEqual(parseProgress('{bozuk', ROUTES), EMPTY);
  const p = parseProgress(JSON.stringify({ played: { test: { result: 'Uyum Riski', at: 5 }, yok: { result: 'x', at: 1 }, bakkal: { result: 3 } }, stickers: { ilk: 7 }, __proto__: { x: 1 } }), ROUTES);
  // ilk sürümün kaydı (v ve plays yok) okunur: bir kez bitirilmiş sayılır
  assert.deepEqual(p, { v: PROGRESS_VERSION, played: { test: { result: 'Uyum Riski', at: 5, plays: 1 } } });
});

test('oyun bitince sonucu yazılır, eski kayıt değişmez, uzun sonuç kısalır', () => {
  const p0 = parseProgress(null, ROUTES);
  const p1 = withPlayed(p0, 'test', 'Uyum Riski', 10);
  assert.equal(p1.played.test?.result, 'Uyum Riski');
  assert.deepEqual(p0, EMPTY);
  assert.equal(withPlayed(p1, 'bakkal', 'x'.repeat(200), 11).played.bakkal?.result.length, 60);
});

test('sonuç şeması: sayısal puan ve kaç kez bitirildiği', () => {
  const p1 = withPlayed(parseProgress(null, ROUTES), 'bakkal', 'Mahallenin Bakkalı', 1, 2340);
  const p2 = withPlayed(p1, 'bakkal', 'Batık Bakkal', 2);
  assert.deepEqual(p1.played.bakkal, { result: 'Mahallenin Bakkalı', at: 1, plays: 1, score: 2340 });
  assert.deepEqual(p2.played.bakkal, { result: 'Batık Bakkal', at: 2, plays: 2 });
  // kayda yazılıp okununca aynı; bozuk puan ve sayı atılır
  assert.deepEqual(parseProgress(JSON.stringify(p1), ROUTES), p1);
  const odd = parseProgress(JSON.stringify({ played: { bakkal: { result: 'x', at: 1, score: 'çok', plays: -3 } } }), ROUTES);
  assert.deepEqual(odd.played.bakkal, { result: 'x', at: 1, plays: 1 });
});
