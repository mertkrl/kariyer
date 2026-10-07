import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BREAK_END_MIN, BREAK_START_MIN, OVERTIME_END_MIN, formatClock, isBreakTime } from '../src/game/lib/time';
import { accusative, firstName, genitive } from '../src/game/lib/turkish';

test('saat biçimi mesai başlangıcından sayılır', () => {
  assert.equal(formatClock(0), '08:00');
  assert.equal(formatClock(BREAK_START_MIN), '12:00');
  assert.equal(formatClock(90.9), '09:30');
});

test('saat fazla mesai sınırında durur', () => {
  assert.equal(formatClock(OVERTIME_END_MIN + 100), '20:00');
});

test('öğle arası 12:00 dahil, 13:00 hariç', () => {
  assert.equal(isBreakTime(BREAK_START_MIN - 1), false);
  assert.equal(isBreakTime(BREAK_START_MIN), true);
  assert.equal(isBreakTime(BREAK_END_MIN), false);
});

test('Türkçe ek uyumu', () => {
  assert.equal(accusative('Nihan'), "Nihan'ı");
  assert.equal(accusative('Ece'), "Ece'yi");
  assert.equal(accusative('Duygu'), "Duygu'yu");
  assert.equal(accusative('Cem'), "Cem'i");
  assert.equal(genitive('Ece'), "Ece'nin");
  assert.equal(genitive('Onur'), "Onur'un");
  assert.equal(firstName('Defne Aral'), 'Defne');
});
