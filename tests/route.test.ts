import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isUnknownHash, routeOf } from '../src/arcade/route';

test('salonun kendi adresleri bilinmeyen sayılmaz', () => {
  for (const h of ['', '#', '#/', '#/mahalle', '#/mahalle/']) assert.equal(isUnknownHash(h), false, h);
});

test('oyun adresleri (sorgu ve sondaki eğik çizgiyle) bilinir', () => {
  for (const h of ['#/bakkal', '#/bakkal/', '#/ekran?t=abc', '#/ise-alim']) assert.equal(isUnknownHash(h), false, h);
  assert.equal(routeOf('#/ekran?t=abc'), 'ekran');
});

test('eski ya da yanlış yazılmış adres bilinmeyen sayılır ve salona düşer', () => {
  for (const h of ['#/olmayan-sayfa', '#/Bakkal', '#/bakkal/eski', '#/trafikk']) {
    assert.equal(isUnknownHash(h), true, h);
    assert.equal(routeOf(h), 'arcade');
  }
});
