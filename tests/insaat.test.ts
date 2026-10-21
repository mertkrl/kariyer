import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DUE_YEARS, FLOOR_STEPS, STAGES, TOTAL, WORK_TOTAL, floorStepAt, idleAt, speechAt, stageAt, stageProgress, watchersAt, workAt } from '../src/games/insaat/data';

test('inşaat aşamaları sırayla gelir ve iş bitmeden başlar', () => {
  assert.equal(STAGES[0].at, 0);
  STAGES.forEach((st, i) => {
    assert.ok(st.lines.length > 0, st.id);
    if (i) assert.ok(st.at > STAGES[i - 1].at, st.id);
  });
  assert.ok(STAGES[STAGES.length - 1].at < WORK_TOTAL);
  assert.equal(new Set(STAGES.map((s) => s.id)).size, STAGES.length);
  FLOOR_STEPS.forEach((st, i) => i && assert.ok(st.at > FLOOR_STEPS[i - 1].at));
});

test('iş saati yalnızca şantiye çalışırken ilerler', () => {
  let last = 0;
  for (let t = 0; t <= TOTAL; t += 0.5) {
    const w = workAt(t);
    assert.ok(w >= last - 1e-9, `t=${t}`);
    last = w;
  }
  assert.ok(Math.abs(workAt(TOTAL) - WORK_TOTAL) < 0.2);
  // gece, yağmur ya da kar varken iş durur: gerçek süre iş süresinden uzundur
  assert.ok(TOTAL > WORK_TOTAL + 30);
  const idle = Array.from({ length: Math.floor(TOTAL) }, (_, t) => idleAt(t)).filter(Boolean);
  assert.ok(idle.includes('night') && idle.includes('rain') && idle.includes('snow'));
});

test('zamana göre aşama, kat adımı ve konuşan amca tutarlıdır', () => {
  for (let t = 0; t <= TOTAL; t += 0.5) {
    const w = workAt(t);
    const i = stageAt(w);
    assert.ok(STAGES[i].at <= w + 1e-9);
    const p = stageProgress(w, i);
    assert.ok(p >= 0 && p <= 1);
    const fs = floorStepAt(w);
    assert.equal(fs !== null, STAGES[i].id === 'karkas');
    const sp = speechAt(t);
    assert.ok(sp.text.length > 0);
    assert.ok(sp.who >= 0 && sp.who < watchersAt(t));
  }
});

test('teslim tarihi hep ileri ertelenir', () => {
  DUE_YEARS.forEach((y, i) => i && assert.ok(y > DUE_YEARS[i - 1]));
});
