import { test } from 'node:test';
import assert from 'node:assert/strict';
import { around, newMines, neighbours, reveal, toggleFlag } from '../src/arcade/notebook/mines';

const seq = () => {
  let x = 7;
  return () => (x = (x * 9301 + 49297) % 233280) / 233280;
};

test('mayın tarlası: ilk açılan hücre ve komşuları mayın olmaz', () => {
  const m = reveal(newMines(), 40, seq());
  assert.equal(m.mine.filter(Boolean).length, 10);
  for (const j of [40, ...neighbours(m, 40)]) assert.equal(m.mine[j], false);
  assert.equal(m.state, 'play');
});

test('mayın tarlası: boş hücre çevresini de açar', () => {
  const m = reveal(newMines(), 40, seq());
  assert.equal(around(m, 40), 0);
  assert.ok(m.open.filter(Boolean).length > 1);
});

test('mayın tarlası: mayına basınca oyun biter, bayraklı hücre açılmaz', () => {
  let m = reveal(newMines(), 40, seq());
  const bomb = m.mine.indexOf(true);
  m = toggleFlag(m, bomb);
  assert.equal(reveal(m, bomb), m);
  m = toggleFlag(m, bomb);
  assert.equal(reveal(m, bomb).state, 'lost');
});

test('mayın tarlası: mayınsız bütün hücreler açılınca kazanılır', () => {
  let m = reveal(newMines(), 40, seq());
  m.mine.forEach((b, j) => {
    if (!b) m = reveal(m, j);
  });
  assert.equal(m.state, 'won');
});
