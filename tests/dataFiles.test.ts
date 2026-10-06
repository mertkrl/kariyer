/*
 * The candidates' JSON files: a writer's slip (a misspelt field, a value the game doesn't know,
 * a missing answer, the same id twice) is refused at load, naming the candidate and the field.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { candidates, checkCandidate } from '../src/game/data/candidates';
import { candidateDetails, checkDetails } from '../src/game/data/candidateDetails';
import { DataError, flattenSections } from '../src/game/data/validate';

const ahmet = () => structuredClone(candidates.ahmet);
const details = () => structuredClone(candidateDetails.ahmet);

test('aday dosyası: geçerli kayıt olduğu gibi kabul edilir', () => {
  assert.deepEqual(checkCandidate('ahmet', ahmet()), candidates.ahmet);
  assert.deepEqual(checkDetails('ahmet', details()), candidateDetails.ahmet);
});

test('aday dosyası: bilinmeyen öneri değeri adıyla birlikte reddedilir', () => {
  assert.throws(() => checkCandidate('ahmet', { ...ahmet(), verdict: 'maybe' }), (e: Error) => e instanceof DataError && /"ahmet"\.verdict/.test(e.message));
});

test('aday dosyası: yanlış yazılmış alan adı yakalanır', () => {
  const { motivation, ...rest } = ahmet();
  assert.throws(() => checkCandidate('ahmet', { ...rest, motivaton: motivation }), /tanınmayan alan.*motivaton/);
});

test('aday dosyası: kimlik anahtarıyla aynı olmalı, eksik sonuç notu kabul edilmez', () => {
  assert.throws(() => checkCandidate('ahmet', { ...ahmet(), id: 'mehmet' }), /"ahmet"\.id/);
  assert.throws(() => checkCandidate('ahmet', { ...ahmet(), outcomeNote: { approve: 'x' } }), /outcomeNote/);
  assert.throws(() => checkCandidate('ahmet', { ...ahmet(), age: '24' }), /age/);
});

test('mülakat dosyası: üç cevap ve 1–5 arası uyum gerekir', () => {
  assert.throws(() => checkDetails('ahmet', { ...details(), interview: ['tek cevap'] }), /interview/);
  assert.throws(() => checkDetails('ahmet', { ...details(), hireFit: 7 }), /hireFit/);
  assert.throws(() => checkDetails('ahmet', { ...details(), workHistory: [{ period: '2024', title: 'X', company: '' , note: 'n' }] }), /workHistory\[0\]/);
});

test('başlıklar düzleştirilir; aynı kimlik iki başlıkta olamaz', () => {
  assert.deepEqual(Object.keys(flattenSections('x.json', { 'Gün 1': { a: {}, b: {} }, 'Gün 2': { c: {} } })), ['a', 'b', 'c']);
  assert.throws(() => flattenSections('x.json', { 'Gün 1': { a: {} }, 'Gün 2': { a: {} } }), /"a" iki kez/);
});
