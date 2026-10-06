/*
 * Başvuru yağmurunun kâğıt fiziği, canvas olmadan adım adım: çekirdekten fırlatılan CV'ler
 * çekirdeğin alanının dışında masaya iner, içeri çekilen CV'lerin hepsi çekirdeğe ulaşır.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeIn, makeOut, stepIn, stepOut } from '../src/screens/flood/paperPhysics';

const VW = 1280;
const VH = 800;
const ORIGIN = { x: VW / 2, y: VH / 2 };
const CLEAR = { halfWidth: 160, above: 120, below: 160 };

test('kâğıt fırtınası: dışarı atılanların çoğu masaya iner, kalanı ekrandan çıkar', () => {
  const sheets = makeOut(ORIGIN, VW, VH, 60, false, CLEAR);
  const reports = new Map<number, number>();
  for (let t = 0; t < 8; t += 1 / 60) {
    sheets.forEach((s, i) => {
      if (s.state !== 'gone' && stepOut(s, t, 1 / 120, VW, VH)) reports.set(i, (reports.get(i) ?? 0) + 1);
    });
  }
  const landers = sheets.filter((s) => s.lands).length;
  assert.ok(landers > 30 && landers < 50, `${landers} kâğıt inmeli`);
  for (const s of sheets) assert.ok(s.state === 'landed' || s.state === 'gone', `kâğıt havada kaldı: ${s.state}`);
  assert.ok([...reports.values()].every((n) => n === 1), 'her iniş bir kez bildirilir');
  sheets.forEach((s, i) => s.state === 'landed' && assert.ok(reports.has(i), 'inen her kâğıt bildirilir'));
  for (const s of sheets.filter((x) => x.state === 'landed')) assert.equal(s.z, 0);
});

test('kâğıt fırtınası: inecek kâğıtların hedefi çekirdeğin alanının dışında', () => {
  const sheets = makeOut(ORIGIN, VW, VH, 80, true, CLEAR);
  const inClear = sheets.filter(
    (s) => s.lands && Math.abs(s.tx - ORIGIN.x) < CLEAR.halfWidth + 30 && s.ty > ORIGIN.y - CLEAR.above && s.ty < ORIGIN.y + CLEAR.below,
  );
  assert.equal(inClear.length, 0);
});

test('kâğıt fırtınası: içeri çekilen her CV çekirdeğe ulaşır', () => {
  const sheets = makeIn(ORIGIN, VW, VH, 40, 1.8);
  let absorbed = 0;
  for (let t = 0; t < 4; t += 1 / 60) {
    for (const s of sheets) {
      if (s.absorbed) continue;
      const r = stepIn(s, t, ORIGIN);
      if (r === 'absorbed') absorbed++;
      else if (r !== 'waiting') {
        assert.ok(r.fade >= 0 && r.fade <= 1);
        assert.ok(r.shrink > 0 && r.shrink <= 1);
      }
    }
  }
  assert.equal(absorbed, 40);
});
