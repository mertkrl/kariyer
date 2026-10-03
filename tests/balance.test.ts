/*
 * The two scores have to tell players apart. Bots with different habits play the same weeks;
 * the tests check the order they finish in and that nobody's score runs into a wall, so a
 * change to any single number that breaks the balance shows up here.
 *
 * Performans: how closely you followed the company's system. Vicdan: how carefully you decided.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { candidates } from '../src/game/data/candidates';
import { CONSIDERED_SECONDS, isStrong, isWronglyFlagged, systemVerdict } from '../src/game/engine/scoring';
import { FIRED_BELOW, getEnding } from '../src/game/engine/ending';
import { rngFor } from '../src/game/rng';
import { playWeek, type BotStyle } from './support/bot';

const SEEDS = [7919, 15838, 23757];
const priority = (id: string) => systemVerdict(candidates[id]) === 'priority';
/** A strong file the system pushed down for a proxy: the people the week is about. */
const deserving = (id: string) => isWronglyFlagged(id) && isStrong(id);
const quick = () => 2;
const careful = () => CONSIDERED_SECONDS + 1;

const STYLES: Record<string, (seed: number) => BotStyle> = {
  /** Does what the system says, without reading. */
  hastyFollower: () => ({ read: quick, decide: (id) => (priority(id) ? 'approve' : 'reject'), comply: () => true }),
  /** Does what the system says — after reading every file. */
  carefulFollower: () => ({ read: careful, decide: (id) => (priority(id) ? 'approve' : 'reject'), comply: () => true }),
  /** Reads, takes the system's picks and some of the people it flagged, says yes to the manager half the time. */
  balanced: (seed) => {
    const rand = rngFor(seed, 'balanced');
    return { read: careful, decide: (id) => (priority(id) || (deserving(id) && rand() < 0.4) ? 'approve' : 'reject'), comply: () => rand() < 0.5 };
  },
  /** Reads everything, gives every slot to someone the system flagged unfairly, refuses every favour. */
  advocate: () => ({ read: careful, decide: (id) => (deserving(id) ? 'approve' : 'reject'), comply: () => false }),
  /** Never decides anything. */
  idle: () => ({ read: () => Infinity, decide: () => 'reject', comply: () => true }),
};

const average = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const results = Object.fromEntries(
  Object.entries(STYLES).map(([name, style]) => {
    const runs = SEEDS.map((seed) => playWeek(seed, style(seed)));
    return [name, { p: average(runs.map((r) => r.performans)), v: average(runs.map((r) => r.vicdan)) }];
  }),
);
const { hastyFollower, carefulFollower, balanced, advocate, idle } = results;
if (process.env.BALANCE) console.log(results);

test('performans sisteme uyumu ölçer: takipçi > dengeli > savunucu', () => {
  assert.ok(carefulFollower.p > balanced.p + 10, JSON.stringify(results));
  assert.ok(balanced.p > advocate.p + 10, JSON.stringify(results));
});

test('vicdan özeni ölçer: savunucu > dengeli > okuyan takipçi > okumayan takipçi', () => {
  assert.ok(advocate.v > balanced.v, JSON.stringify(results));
  assert.ok(balanced.v > carefulFollower.v + 15, JSON.stringify(results));
  assert.ok(carefulFollower.v > hastyFollower.v + 20, JSON.stringify(results));
});

test('okumak performansı değiştirmez, yalnızca vicdanı', () => {
  assert.ok(Math.abs(carefulFollower.p - hastyFollower.p) <= 2, JSON.stringify(results));
});

test('hiç çalışmayan oyuncu kovulur', () => {
  assert.ok(idle.p < FIRED_BELOW, JSON.stringify(results));
});

test('orta yoldaki oyuncunun puanları duvara dayanmaz', () => {
  for (const score of [balanced.p, balanced.v, carefulFollower.v, advocate.p]) assert.ok(score > 15 && score < 95, JSON.stringify(results));
});

test('her oyun tarzı kendi sonuna varır', () => {
  const ending = (r: { p: number; v: number }, hireFit: number, refusals = 0) =>
    getEnding(Math.round(r.p), Math.round(r.v), { refusals, hireFit, aiUses: 0, weekendChoice: null, difficulty: 'normal' }).title;
  assert.match(ending(hastyFollower, 4), /sistemin mükemmel/);
  assert.match(ending(carefulFollower, 4), /Terfi/);
  assert.match(ending(balanced, 5), /hayatı değiştirdin|Terfi/);
  assert.match(ending(idle, 3), /çıkarıldın/);
});
