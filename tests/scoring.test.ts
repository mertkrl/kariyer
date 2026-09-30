import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONSIDERED_SECONDS, decisionEffect } from '../src/game/engine/scoring';
import { candidates } from '../src/game/data/candidates';
import { candidateDetails } from '../src/game/data/candidateDetails';

const FAIR_FLAG = new Set(['okan', 'serkan', 'emre', 'volkan']);
const SPECIAL = new Set(['okan', 'onur']);
const ids = Object.keys(candidates);
const fitOf = (id: string) => candidateDetails[id]?.hireFit ?? 3;
const hasty = { secondsSpent: 0, referenceChecked: false };
const read = { secondsSpent: CONSIDERED_SECONDS, referenceChecked: false };
const checked = { secondsSpent: 0, referenceChecked: true };

test('her aday ve her karar için sonuç tanımlı ve adlı', () => {
  for (const id of ids) {
    for (const d of ['approve', 'reject'] as const) {
      const e = decisionEffect(id, d, hasty);
      assert.ok(Number.isFinite(e.performans) && Number.isFinite(e.vicdan), id);
      assert.ok(e.reason.startsWith(candidates[id].name.split(' ')[0]), `${id}: ${e.reason}`);
    }
  }
});

test('müdürün yeğenini almak performans kazandırır, vicdan kaybettirir', () => {
  const e = decisionEffect('okan', 'approve', read);
  assert.ok(e.performans > 0 && e.vicdan < 0);
  const r = decisionEffect('okan', 'reject', read);
  assert.ok(r.performans < 0 && r.vicdan > 0);
});

test('güçlü ve haksız işaretli adayı okumadan elemek, okuyarak elemekten pahalı', () => {
  const strong = ids.filter((id) => !SPECIAL.has(id) && !FAIR_FLAG.has(id) && fitOf(id) >= 3);
  assert.ok(strong.length > 0);
  for (const id of strong) {
    assert.ok(decisionEffect(id, 'reject', hasty).vicdan < decisionEffect(id, 'reject', read).vicdan, id);
  }
});

test('referans kontrolü hiçbir kararı kötüleştirmez', () => {
  for (const id of ids) {
    for (const d of ['approve', 'reject'] as const) {
      assert.ok(decisionEffect(id, d, checked).vicdan >= decisionEffect(id, d, hasty).vicdan, `${id} ${d}`);
    }
  }
});

test('zayıf dosyaya mülakat hakkı vermek performans kaybettirir', () => {
  const weak = ids.filter((id) => !SPECIAL.has(id) && fitOf(id) <= 2);
  assert.ok(weak.length > 0);
  for (const id of weak) assert.ok(decisionEffect(id, 'approve', read).performans < 0, id);
});
