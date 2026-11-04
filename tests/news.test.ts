import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newsFor, HEADLINES, PENDING } from '../src/arcade/news';
import { GAMES } from '../src/arcade/games';
import { PROGRESS_VERSION, type Progress } from '../src/arcade/progress';

const p = (played: Progress['played']): Progress => ({ v: PROGRESS_VERSION, played });

test('her oyunun manşeti ve çağrısı var', () => {
  for (const g of GAMES) {
    assert.ok(HEADLINES[g.route]?.length > 10, g.route);
    assert.ok(PENDING[g.route]?.length > 10, g.route);
  }
});

test('hiç oyun yokken bir durak çağırır; sayaç sıfır', () => {
  const n = newsFor(p({}), 3);
  assert.equal(n.done, 0);
  assert.equal(n.total, GAMES.length);
  assert.equal(n.line, PENDING[n.route]);
});

test('bitirilen oyunun manşeti çıkar (çift günlerde en sonuncusu); aynı gün aynı satır', () => {
  const prog = p({ bakkal: { result: 'x', at: 1, plays: 1 }, asfalt: { result: 'y', at: 5, plays: 1 } });
  const n = newsFor(prog, 4);
  assert.equal(n.done, 2);
  assert.equal(n.route, 'asfalt');
  assert.equal(n.line, HEADLINES.asfalt);
  assert.deepEqual(newsFor(prog, 7), newsFor(prog, 7));
  // tek günlerde bitirilmemiş bir durak çağrılır
  assert.equal(newsFor(prog, 7).line, PENDING[newsFor(prog, 7).route]);
});

test('hepsi bitince yalnızca manşetler', () => {
  const all = Object.fromEntries(GAMES.map((g, i) => [g.route, { result: 'x', at: i, plays: 1 }]));
  for (let d = 0; d < 12; d++) assert.equal(newsFor(p(all), d).line, HEADLINES[newsFor(p(all), d).route]);
});
