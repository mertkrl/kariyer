import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseProgress, PROGRESS_KEY, withPlayed } from '../src/arcade/progress';
import { dayGame, toneOf } from '../src/arcade/notebook/notebook';
import { dailyNote } from '../src/arcade/notebook/daily';
import { GAMES } from '../src/arcade/games';
import { STORAGE_PREFIX } from '../src/game/lib/privacy';

const ROUTES = GAMES.map((g) => g.route);


test('defter kaydı sitenin önekiyle tutulur, bozuk ya da yabancı veri boş sayılır', () => {
  assert.ok(PROGRESS_KEY.startsWith(STORAGE_PREFIX));
  assert.deepEqual(parseProgress(null, ROUTES), { played: {} });
  assert.deepEqual(parseProgress('{bozuk', ROUTES), { played: {} });
  const p = parseProgress(JSON.stringify({ played: { test: { result: 'Uyum Riski', at: 5 }, yok: { result: 'x', at: 1 }, bakkal: { result: 3 } }, stickers: { ilk: 7 }, __proto__: { x: 1 } }), ROUTES);
  assert.deepEqual(p, { played: { test: { result: 'Uyum Riski', at: 5 } } });
});

test('oyun bitince sonucu yazılır, eski kayıt değişmez, uzun sonuç kısalır', () => {
  const p0 = parseProgress(null, ROUTES);
  const p1 = withPlayed(p0, 'test', 'Uyum Riski', 10);
  assert.equal(p1.played.test?.result, 'Uyum Riski');
  assert.deepEqual(p0, { played: {} });
  assert.equal(withPlayed(p1, 'bakkal', 'x'.repeat(200), 11).played.bakkal?.result.length, 60);
});

test('günün notu ve dosyası gün içinde sabit, ertesi gün değişir', () => {
  const a = new Date(2026, 9, 25, 9);
  const b = new Date(2026, 9, 25, 23);
  const c = new Date(2026, 9, 26, 9);
  assert.equal(dailyNote(a), dailyNote(b));
  assert.equal(dayGame(a), dayGame(b));
  assert.notEqual(dailyNote(a), dailyNote(c));
  assert.notEqual(dayGame(a), dayGame(c));
  assert.ok(ROUTES.includes(dayGame(c)));
});

test('saate göre ton: mesai, akşam, gece ve hafta sonu', () => {
  assert.equal(toneOf(new Date(2026, 9, 26, 10)), 'work'); // Pazartesi
  assert.equal(toneOf(new Date(2026, 9, 26, 19)), 'evening');
  assert.equal(toneOf(new Date(2026, 9, 26, 23)), 'night');
  assert.equal(toneOf(new Date(2026, 9, 25, 14)), 'weekend'); // Pazar
});
