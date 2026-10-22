import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY, GRAVEL, H, HOT, PACKED, ROAD, ROLLER_W, SET, SOIL, W, WATER, WET, createWorld, driveRoller, holeVolume, idx, openToTraffic, pour, step, surfaceAt, type LevelSpec, type World } from '../src/games/asfalt/model';
import { LEVELS } from '../src/games/asfalt/levels';

const SPEC: LevelSpec = { id: 'deneme', seed: 7, center: 120, half: 24, depth: 22 };
const run = (w: World, n: number) => {
  for (let k = 0; k < n; k++) step(w);
};
const count = (w: World, c: number) => w.cells.reduce((s, v) => s + (v === c ? 1 : 0), 0);

/** Çukuru kat kat, elle döşer: alt dolgu toprak, sonra mıcır, en üstte sıcak asfalt. */
function layer(w: World, from: number, to: number, c: number) {
  for (let x = w.hole[0]; x <= w.hole[1]; x++)
    for (let y = from; y < to; y++) {
      const i = idx(x, y);
      if (w.cells[i] !== EMPTY) continue;
      w.cells[i] = c;
      w.heat[i] = c === HOT ? 255 : 0;
    }
}

test('aynı tohum aynı çukuru açar, çukur yol hizasından aşağıdadır', () => {
  const a = createWorld(SPEC);
  const b = createWorld(SPEC);
  assert.deepEqual(a.cells, b.cells);
  assert.ok(holeVolume(a) > 400);
  for (let x = 0; x < W; x++) assert.ok(surfaceAt(a, x) >= ROAD);
  for (const l of LEVELS) assert.ok(holeVolume(createWorld(l.spec)) > 300, l.spec.id);
});

test('dökülen toprak çukurun dibine iner, yolun üstünde kalmaz', () => {
  const w = createWorld(SPEC);
  for (let k = 0; k < 60; k++) pour(w, 'soil', 120, 40);
  run(w, 400);
  assert.equal(w.used.soil, count(w, SOIL) - createWorld(SPEC).cells.filter((c) => c === SOIL).length);
  for (let x = 0; x < W; x++) for (let y = 0; y < ROAD - 2; y++) assert.notEqual(w.cells[idx(x, y)], SOIL);
});

test('sıcak asfalt yayılır, soğur ve donar', () => {
  const w = createWorld(SPEC);
  for (let k = 0; k < 40; k++) {
    pour(w, 'asphalt', 120, 70);
    run(w, 3);
  }
  run(w, 2500);
  assert.equal(count(w, HOT), 0);
  assert.ok(w.used.asphalt > 100);
  assert.equal(count(w, SET), w.used.asphalt);
});

test('suya dökülen asfalt sulanır, muhtar fark eder', () => {
  const w = createWorld({ ...SPEC, waterTop: 6 });
  assert.ok(count(w, WATER) > 100);
  for (let k = 0; k < 20; k++) pour(w, 'asphalt', 120, 75);
  run(w, 200);
  assert.ok(w.events.has('wet'));
  assert.ok(w.flags.some((f, i) => (f & WET) !== 0 && (w.cells[i] === HOT || w.cells[i] === SET)));
});

test('yolun üstüne düşen su iki uçtan akıp gider', () => {
  const w = createWorld(SPEC);
  for (let x = 2; x < 30; x++) w.cells[idx(x, ROAD - 1)] = WATER;
  run(w, 600);
  for (let x = 0; x < 40; x++) assert.notEqual(w.cells[idx(x, ROAD - 1)], WATER);
});

test('silindir yol hizasının üstünü önüne katar, dolu sütunu sıkıştırır, donmuş tümsekte durur', () => {
  const w = createWorld(SPEC);
  layer(w, ROAD, H, GRAVEL);
  for (let x = w.hole[0]; x < w.hole[0] + 10; x++) w.cells[idx(x, ROAD - 3)] = SOIL;
  run(w, 5);
  driveRoller(w, w.hole[0] + 20);
  run(w, 400);
  const r = w.roller!;
  assert.equal(r.x, w.hole[0] + 20);
  for (let x = Math.floor(r.x); x < r.x + ROLLER_W; x++) {
    assert.ok(surfaceAt(w, x) >= ROAD);
    assert.ok(w.flags[idx(x, ROAD + 2)] & PACKED);
  }
  // önünde ince donmuş bir sızıntı: ezer geçer; arkasında üç hücrelik donmuş tümsek: durur
  const film = Math.floor(r.x) + ROLLER_W + 2;
  w.cells[idx(film, ROAD - 1)] = SET;
  const wall = film + 6;
  for (let y = ROAD - 3; y < ROAD; y++) w.cells[idx(wall, y)] = SET;
  driveRoller(w, W);
  run(w, 200);
  assert.ok(w.events.has('blocked'));
  assert.ok(r.x + ROLLER_W <= wall + 1);
});

test('kat kat döşenip silindirlenen yama yüksek, tek seferde toprakla kapatılan düşük puan alır', () => {
  const good = createWorld(SPEC);
  layer(good, ROAD + 8, H, SOIL);
  layer(good, ROAD + 4, ROAD + 8, GRAVEL);
  layer(good, ROAD, ROAD + 4, HOT);
  driveRoller(good, 0);
  good.roller!.x = 0;
  driveRoller(good, W - ROLLER_W);
  run(good, 800);
  const g = openToTraffic(good);

  const bad = createWorld(SPEC);
  layer(bad, ROAD, H, SOIL);
  const b = openToTraffic(bad);

  assert.ok(g.score >= 85, `iyi yama ${g.score}: ${JSON.stringify({ ...g, profile: 0 })}`);
  assert.ok(b.score < 60, `kötü yama ${b.score}`);
  assert.ok(b.dips > g.dips);
  assert.ok(g.noGravel <= 2); // en sığ kenarda dipteki moloz kalır
  assert.ok(b.thin > 0);
  assert.equal(g.profile.length, W);
});

test('suyun içine dökülen yama trafiğe açılınca çöker', () => {
  const w = createWorld({ ...SPEC, waterTop: 4 });
  layer(w, ROAD, ROAD + 4, HOT);
  run(w, 30);
  const r = openToTraffic(w);
  assert.ok(r.wet > 0);
  assert.ok(r.dips > 0);
});
