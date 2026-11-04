import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cityTalk } from '../src/games/bakkal/cityTalk';
import { PROGRESS_VERSION } from '../src/arcade/progress';
import { VILLAGERS } from '../src/games/bakkal/data';

const none = { v: PROGRESS_VERSION, played: {} };
const all = { v: PROGRESS_VERSION, played: Object.fromEntries(['asfalt', 'trafik', 'iseAlim', 'cuzdan'].map((r) => [r, { result: 'x', at: 1, plays: 1 }])) };

test('ilk gün (tanıtım) kimse şehirden konuşmaz', () => {
  for (const v of VILLAGERS) assert.equal(cityTalk(1, v.id, none), null);
});

test('seyrek ama otuz günde birkaç kez; bitirilen oyuna göre cümle değişir', () => {
  const said = [];
  for (let d = 2; d <= 30; d++) for (const v of VILLAGERS) { const a = cityTalk(d, v.id, none); if (a) said.push([d, v.id, a]); }
  const share = said.length / (29 * VILLAGERS.length);
  assert.ok(said.length >= 3 && share < 0.06, `${said.length} kez, %${Math.round(share * 100)}`);
  for (const [d, id, before] of said) {
    const after = cityTalk(d as number, id as string, all);
    assert.ok(after && after !== before, `${before} → ${after}`);
  }
});
