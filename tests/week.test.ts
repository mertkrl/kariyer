/*
 * Bir bot tarafından tik tik oynanan bütün bir hafta, ekranların store'u yönettiği gibi: her dosyayı
 * aç, bir süre oku, karar ver, saati tutan her şeyi cevapla. Aynı tohum, aynı hafta.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { minutesPerTick, useGameStore } from '../src/game/store/store';
import { INVITE_LIMIT } from '../src/game/data/days';
import { playWeek, type BotStyle, type Run } from './support/bot';
import { rngFor } from '../src/game/lib/rng';

const store = useGameStore;

/** Bu testlerin kullandığı üç bot: kısa oku, sonra onayla, reddet ya da ikisinden biraz. */
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
    assert.ok(byPlayer <= INVITE_LIMIT, `kontenjan aşıldı: ${byPlayer}`);
  });
}

test('zor modda da hafta tamamlanır', () => {
  const run = playStyle(2024, 'mixed', 'hard');
  assert.equal(store.getState().difficulty, 'hard');
  assert.ok(store.getState().week.events > 0, 'zor modda sürpriz olay yaşanmadı');
  assert.ok(run.scoresSeen.every((v) => v >= 0 && v <= 100));
});

test('rahat modda saat yavaş akar ve hafta tamamlanır', () => {
  assert.ok(minutesPerTick('relaxed') < minutesPerTick('normal'));
  const run = playStyle(2024, 'mixed', 'relaxed');
  assert.equal(store.getState().difficulty, 'relaxed');
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
  const { loadSave } = await import('../src/game/store/store');
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
