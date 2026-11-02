import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  INVITES,
  MAX_WRONG,
  WORDS,
  ALPHABET,
  allLines,
  dotsMove,
  dotsOver,
  dotsScore,
  drawLine,
  guess,
  hangmanState,
  letterOf,
  newDots,
  wrongOf,
  fingers,
  keeperAt,
  flick,
  goalFor,
  LEVELS,
  type Goal,
  restingCoin,
  simulate,
} from '../src/arcade/notebook/paperGames';

test('asmaca: sözcükler alfabeden, her yanlışa bir davet', () => {
  assert.equal(INVITES.length, MAX_WRONG);
  for (const w of WORDS) for (const c of w) assert.ok(c === ' ' || ALPHABET.includes(c), `${w}: ${c}`);
  let h = { word: 'ÇEVİK', guessed: [] as string[] };
  for (const c of 'ÇEVİK') h = guess(h, c);
  assert.equal(hangmanState(h), 'won');
  h = { word: 'ODAK', guessed: [] };
  for (const c of 'BCÇEFGĞ') h = guess(h, c);
  assert.equal(wrongOf(h), MAX_WRONG);
  assert.equal(hangmanState(h), 'lost');
  assert.equal(guess(h, 'O'), h);
  assert.equal(letterOf('i'), 'İ');
  assert.equal(letterOf('ı'), 'I');
  assert.equal(letterOf('1'), null);
});

test('kutular: dördüncü kenarı çeken kutuyu alır ve bir daha oynar', () => {
  let d = newDots();
  d = drawLine(d, 'h0', 'me');
  d = drawLine(d, 'h4', 'pc');
  d = drawLine(d, 'v0', 'me');
  assert.equal(d.turn, 'pc');
  assert.equal(dotsMove(d, () => 0), 'v1');
  d = drawLine(d, 'v1', 'pc');
  assert.equal(d.boxes[0], 'pc');
  assert.equal(d.turn, 'pc');
});

test('kutular: bilgisayara karşı oyun sonuna kadar oynanır', () => {
  let d = newDots();
  let r = 1;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  while (!dotsOver(d)) d = drawLine(d, dotsMove(d, rnd)!, d.turn);
  const sc = dotsScore(d);
  assert.equal(sc.me + sc.pc, 16);
  assert.equal(Object.keys(d.lines).length, allLines().length);
});

const base = { wind: 0, book: null, ceiling: null, sway: null, keeper: null, phase: 0 };

/** Kaleye giren bir atış ara (açı ve güç ızgarası; oyundaki gibi açı 12°–75°). */
const findGoal = (g: Goal) => {
  for (let a = 0.21; a <= 1.3; a += 0.02) for (let p = 0.1; p <= 1; p += 0.01) if (simulate(flick(restingCoin(), a, p), g).result === 'gol') return { a, p };
  return null;
};

test('para futbolu: yerden düz vuruş ön parmağa takılır, bombeli atış iki parmağın arasına düşer', () => {
  const g = { ...base, x: 420, gap: 60 };
  for (let p = 0.2; p <= 1; p += 0.1) assert.notEqual(simulate(flick(restingCoin(), 0, p), g).result, 'gol');
  const shot = findGoal(g);
  assert.ok(shot, 'bombeli bir gol bulunmalı');
  assert.ok(shot.a > 0.3);
});

test('para futbolu: her bölümün her kalesinin bir golü vardır', () => {
  LEVELS.forEach((level, i) => {
    for (const seq of [[0, 0, 0], [1, 0.9, 0.9], [0.5, 0.5, 0.1], [0.2, 1, 0.6]]) {
      let k = 0;
      const g = goalFor(level, () => seq[k++ % seq.length]);
      assert.ok(findGoal(g), `${i + 1}. bölüm ${level.name}: ${JSON.stringify(seq)}`);
    }
  });
});

test('para futbolu: hiçbir atış takılı kalmaz', () => {
  for (const level of LEVELS) {
    const g = goalFor(level, () => 0.5);
    for (let a = -0.3; a <= 3.4; a += 0.1)
      for (let p = 0.05; p <= 1; p += 0.1) {
        const end = simulate(flick(restingCoin(), a, p), g, 1 / 60);
        assert.ok(end.result, `${level.name} ${a} ${p}`);
      }
  }
});

test('para futbolu: parmağın tepesine düşen para orada takılı kalmaz', () => {
  const g = { ...base, x: 420, gap: 60 };
  const [near] = fingers(g);
  const end = simulate({ ...restingCoin(), x: near, y: 160, vy: -1 }, g);
  assert.ok(end.result, 'para durmalı');
  assert.ok(end.post);
});

test('para futbolu: rüzgâr parayı iter, kitap ve raf yolu keser', () => {
  const calm = { ...base, x: 420, gap: 60 };
  const shot = flick(restingCoin(), 0.9, 0.7);
  const still = simulate(shot, calm);
  const blown = simulate(shot, { ...calm, wind: 200 });
  assert.notEqual(Math.round(still.x), Math.round(blown.x));
  assert.equal(simulate(flick(restingCoin(), 0.3, 0.6), { ...calm, book: { x: 250, w: 22, h: 104 } }).result, 'kitap');
  assert.equal(simulate(flick(restingCoin(), 1.3, 1), { ...calm, ceiling: 170 }).result === 'gol', false);
});

test('para futbolu: kaleci gidip gelir, para çarparsa kurtarır; iki yandan da girilir', () => {
  const g = { ...base, x: 400, gap: 124, keeper: 2 };
  const xs = [0, 0.4, 0.8, 1.2, 1.6].map((t) => keeperAt(g, t)!);
  assert.ok(Math.max(...xs) - Math.min(...xs) > 40);
  const results = new Set<string>();
  for (let a = 0.2; a <= 1.4; a += 0.02) for (let p = 0.2; p <= 1; p += 0.02) results.add(simulate(flick(restingCoin(), a, p), g).result!);
  assert.ok(results.has('kaleci') && results.has('gol'));
});

test('para futbolu: bölümler zorlaşır', () => {
  assert.ok(LEVELS.length >= 10);
  assert.ok(LEVELS.slice(-4).every((l) => l.keeper));
  assert.ok(LEVELS.at(-1)!.need >= LEVELS[0].need);
});

test('para futbolu: kısa ve düşme', () => {
  const g = { ...base, x: 420, gap: 60 };
  assert.equal(simulate(flick(restingCoin(), 0.8, 0.3), g).result, 'kısa');
  assert.equal(simulate(flick(restingCoin(), Math.PI - 0.5, 0.6), g).result, 'düştü');
});
