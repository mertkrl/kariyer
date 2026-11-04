import { test } from 'node:test';
import assert from 'node:assert/strict';
import { darkness, NIGHT_OWL, sunTimes, windowsOn } from '../src/arcade/welcome/nightClock';
import { WINDOWS } from '../src/arcade/welcome/windows';

/** İstanbul saatiyle 4 Kasım 2026 (UTC+3): gün doğumu 07:37, batımı 17:58. */
const at = (h: number, m = 0) => new Date(Date.UTC(2026, 10, 4, h - 3, m));
const homes = (h: number, m = 0, overtime = false) => windowsOn(at(h, m), overtime).filter((on, i) => on && WINDOWS[i][0] !== 'plaza').length;
const plaza = (h: number, overtime: boolean) => windowsOn(at(h), overtime).filter((on, i) => on && WINDOWS[i][0] === 'plaza').length;

test('güneş İstanbul\'un o günkü doğuş ve batışını izler', () => {
  const nov = sunTimes(at(12));
  assert.ok(Math.abs(nov.rise - (7 * 60 + 37)) <= 5 && Math.abs(nov.set - (17 * 60 + 58)) <= 5);
  const jun = sunTimes(new Date(Date.UTC(2026, 5, 21, 9)));
  assert.ok(jun.rise < 5 * 60 + 45 && jun.set > 20 * 60 + 30, 'yazın gün uzun');
});

test('mahalle gün batımında kararır, sabah aydınlanır', () => {
  assert.equal(darkness(at(12)), 0);
  assert.equal(darkness(at(17, 20)), 0);
  const mid = darkness(at(18, 13));
  assert.ok(mid > 0.4 && mid < 0.6, `batıştan sonra yarı karanlık: ${mid}`);
  assert.equal(darkness(at(19, 30)), 1);
  assert.equal(darkness(at(3)), 1);
  const dawn = darkness(at(7, 22));
  assert.ok(dawn > 0.4 && dawn < 0.6, `şafakta yarı karanlık: ${dawn}`);
  assert.equal(darkness(at(9)), 0);
  // haziranda 19:00 hâlâ gündüz
  assert.equal(darkness(new Date(Date.UTC(2026, 5, 21, 16))), 0);
});

test('evlerin ışıkları akşam yanar, gece ilerledikçe söner', () => {
  assert.equal(homes(16, 30), 0);
  const evening = homes(21);
  assert.ok(evening > WINDOWS.length / 2, `21:00'de ${evening} ışık`);
  assert.ok(homes(22, 30) < evening);
  assert.ok(homes(23, 30) < homes(22, 30));
  assert.ok(homes(0, 30) < homes(23, 30) / 2, 'gece yarısı çoğu söner');
});

test('01:00 ile 03:00 arası yalnızca uykusuz pencere yanar', () => {
  for (const h of [1, 2, 3]) {
    const on = windowsOn(at(h), false);
    assert.equal(on.filter(Boolean).length, 1);
    assert.equal(on[NIGHT_OWL], true);
  }
  assert.notEqual(WINDOWS[NIGHT_OWL][0], 'plaza');
});

test('plazanın ışıkları yalnızca fazla mesaide yanar', () => {
  assert.equal(plaza(21, false), 0);
  assert.ok(plaza(21, true) > 0);
  assert.ok(plaza(14, true) > 0);
});
