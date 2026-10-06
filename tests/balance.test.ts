/*
 * İki puan oyuncuları birbirinden ayırmalı. Farklı alışkanlıkları olan botlar aynı haftaları oynar;
 * testler bitirdikleri sırayı ve kimsenin puanının duvara dayanmadığını kontrol eder, böylece dengeyi
 * bozan tek bir sayı değişikliği burada ortaya çıkar.
 *
 * Performans: şirketin sistemine ne kadar yakın uyduğun. Vicdan: ne kadar dikkatli karar verdiğin.
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
/** Sistemin bir vekil yüzünden aşağı ittiği güçlü bir dosya: haftanın konusu olan insanlar. */
const deserving = (id: string) => isWronglyFlagged(id) && isStrong(id);
const quick = () => 2;
const careful = () => CONSIDERED_SECONDS + 1;

const STYLES: Record<string, (seed: number) => BotStyle> = {
  /** Sistemin dediğini okumadan yapar. */
  hastyFollower: () => ({ read: quick, decide: (id) => (priority(id) ? 'approve' : 'reject'), comply: () => true }),
  /** Sistemin dediğini, her dosyayı okuduktan sonra yapar. */
  carefulFollower: () => ({ read: careful, decide: (id) => (priority(id) ? 'approve' : 'reject'), comply: () => true }),
  /** Okur, sistemin seçtiklerini ve işaretlediklerinin bazılarını alır, müdüre yarı yarıya evet der. */
  balanced: (seed) => {
    const rand = rngFor(seed, 'balanced');
    return { read: careful, decide: (id) => (priority(id) || (deserving(id) && rand() < 0.4) ? 'approve' : 'reject'), comply: () => rand() < 0.5 };
  },
  /** Her şeyi okur, her hakkı sistemin haksızca işaretlediği birine verir, her ricayı reddeder. */
  advocate: () => ({ read: careful, decide: (id) => (deserving(id) ? 'approve' : 'reject'), comply: () => false }),
  /** Hiçbir şeye karar vermez. */
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

// Aralıklar bilerek dar değil, geniş de değil: okuyarak güçlü birini bulan oyuncu Ümit'in notuyla
// biraz geri kazanır (SPOTTED_PERFORMANS), ama sisteme uyan yine en yukarıdadır.
test('performans sisteme uyumu ölçer: takipçi > dengeli > savunucu', () => {
  assert.ok(carefulFollower.p > balanced.p + 5, JSON.stringify(results));
  assert.ok(balanced.p > advocate.p + 5, JSON.stringify(results));
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
