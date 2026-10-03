/*
 * A whole week played by a bot, tick by tick, the way the screens drive the store: open each
 * file, read for a while, decide, answer what blocks the clock. Same seed, same week.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useGameStore } from '../src/game/store';
import { FINALIST_LIMIT } from '../src/game/data/days';
import { playWeek, type BotStyle, type Run } from './support/bot';
import { rngFor } from '../src/game/rng';

const store = useGameStore;

/** The three bots these tests use: read briefly, then approve, reject, or a bit of both. */
function bot(seed: number, kind: 'approve' | 'reject' | 'mixed'): BotStyle {
  const rand = rngFor(seed, 'bot');
  return {
    read: () => 7,
    decide: () => (kind === 'approve' || (kind === 'mixed' && rand() < 0.35) ? 'approve' : 'reject'),
    comply: () => true,
  };
}
const playStyle = (seed: number, kind: 'approve' | 'reject' | 'mixed', difficulty: 'normal' | 'hard' = 'normal'): Run => playWeek(seed, bot(seed, kind), difficulty);

for (const style of ['approve', 'reject', 'mixed'] as const) {
  test(`hafta sonuna kadar oynanır (${style})`, () => {
    const run = playStyle(12345, style);
    assert.ok(run.scoresSeen.every((v) => v >= 0 && v <= 100), 'puan 0–100 dışına çıktı');
    assert.equal(new Set(run.finalists).size, run.finalists.length, 'aynı finalist iki kez');
    const byPlayer = store.getState().finalists.filter((f) => !f.byManager).length;
    assert.ok(byPlayer <= FINALIST_LIMIT, `kontenjan aşıldı: ${byPlayer}`);
  });
}

test('zor modda da hafta tamamlanır', () => {
  const run = playStyle(2024, 'mixed', 'hard');
  assert.equal(store.getState().difficulty, 'hard');
  assert.ok(store.getState().week.events > 0, 'zor modda sürpriz olay yaşanmadı');
  assert.ok(run.scoresSeen.every((v) => v >= 0 && v <= 100));
});

test('aynı tohum aynı haftayı üretir', () => {
  const a = playStyle(777, 'mixed');
  const b = playStyle(777, 'mixed');
  assert.deepEqual(a.trace, b.trace);
  assert.deepEqual(a.finalists, b.finalists);
});

test('onaylayan ve reddeden oyuncu farklı yerlere varır', () => {
  const yes = playStyle(99, 'approve');
  const no = playStyle(99, 'reject');
  assert.notDeepEqual(yes.trace, no.trace);
  assert.ok(yes.finalists.length > no.finalists.length);
});


test('gerçek bir haftanın gün başı kaydı eksiksiz geri yüklenir', async () => {
  const { loadSave } = await import('../src/game/store');
  playStyle(31, 'mixed');
  const save = loadSave();
  assert.ok(save, 'son gün başı kaydı geçersiz sayıldı');
  const kept = Object.keys(save.data).sort();
  const written = Object.keys(JSON.parse(localStorage.getItem('kariyerweb-save')!).data).sort();
  assert.deepEqual(kept, written, 'kaydın bazı alanları yüklenirken düştü');
});

test('aynı haftayı yeniden oynamak aynı tohumu ve kadroyu verir', () => {
  const s = useGameStore.getState;
  s().restart();
  s().startGame();
  const { seed, lineups } = s();
  s().restart();
  s().startGame(seed);
  assert.equal(s().seed, seed);
  assert.deepEqual(s().lineups, lineups);
});
