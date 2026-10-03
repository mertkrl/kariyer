import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONSIDERED_SECONDS, decisionEffect, systemVerdict } from '../src/game/engine/scoring';
import { NEIGHBOUR_ID, NEPHEW_ID, candidates } from '../src/game/data/candidates';
import { candidateDetails } from '../src/game/data/candidateDetails';

const FAIR_FLAG = new Set(Object.values(candidates).filter((c) => c.flagIsFair).map((c) => c.id));
const SPECIAL = new Set([NEPHEW_ID, NEIGHBOUR_ID]);
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
  const e = decisionEffect(NEPHEW_ID, 'approve', read);
  assert.ok(e.performans > 0 && e.vicdan < 0);
  const r = decisionEffect(NEPHEW_ID, 'reject', read);
  assert.ok(r.performans < 0 && r.vicdan > 0);
});

test('güçlü ve haksız işaretli adayı okumadan elemek, okuyarak elemekten pahalı', () => {
  const strong = ids.filter((id) => !SPECIAL.has(id) && !FAIR_FLAG.has(id) && fitOf(id) >= 3 && systemVerdict(candidates[id]) !== 'priority');
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

test('her adayın sistem önerisi okunabiliyor', () => {
  for (const id of ids) assert.ok(systemVerdict(candidates[id]), `${id}: ${candidates[id].systemLine}`);
});

test('performans sistemin önerisini izler, dosyanın kalitesini değil', () => {
  for (const id of ids) {
    if (SPECIAL.has(id)) continue;
    const v = systemVerdict(candidates[id]);
    const approve = decisionEffect(id, 'approve', read).performans;
    const reject = decisionEffect(id, 'reject', read).performans;
    if (v === 'priority') assert.ok(approve > reject, id);
    if (v === 'low' || v === 'out') assert.ok(reject > approve, id);
    // reading longer never changes how the company scores a decision
    assert.equal(decisionEffect(id, 'reject', hasty).performans, reject, id);
  }
});

test('okuyarak verilen ret vicdandan yemez; okumadan verilen yer', () => {
  for (const id of ids) {
    if (SPECIAL.has(id)) continue;
    assert.ok(decisionEffect(id, 'reject', read).vicdan >= 0, id);
  }
});

test('işarete rağmen güçlü adaya şans vermek vicdan kazandırır, performans kaybettirir', () => {
  const flagged = ids.filter((id) => !SPECIAL.has(id) && !FAIR_FLAG.has(id) && fitOf(id) >= 4 && ['low', 'out'].includes(systemVerdict(candidates[id])!));
  assert.ok(flagged.length > 10);
  for (const id of flagged) {
    const e = decisionEffect(id, 'approve', read);
    assert.ok(e.vicdan > 0 && e.performans < 0, id);
  }
});
