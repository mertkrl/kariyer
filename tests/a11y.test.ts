/*
 * Tarayıcı olmadan tutulabilen erişilebilirlik kuralları: baş harfler her kişinin renginde okunur
 * kalır ve oyun bir ekrana geçtiğinde her ekranın duyurulacak bir adı vardır.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avatarStyle, contrastRatio, inkOn, readablePair } from '../src/components/ui/avatarStyle';
import { SCREEN_NAMES } from '../src/components/ui/useScreenFocus';
import { candidates } from '../src/game/data/candidates';

test('erişilebilirlik: her adayın baş harfleri kendi renginde okunur (en az 4.5:1)', () => {
  for (const c of Object.values(candidates)) {
    const pair = readablePair(c.color);
    const ratio = contrastRatio(pair.color, pair.background);
    assert.ok(ratio >= 4.5, `${c.name} (${c.color}): ${ratio.toFixed(2)}:1`);
    // renk kişinin kalır: hiçbir zaman birkaç tondan fazla koyulaşmaz
    assert.ok(contrastRatio(pair.background, c.color) < 1.6, `${c.name}: ${c.color} → ${pair.background}`);
  }
});

test('erişilebilirlik: açık renkte koyu, koyu renkte beyaz yazı', () => {
  assert.equal(inkOn('#C9A227'), '#221f1b');
  assert.equal(inkOn('#1a2b4c'), '#ffffff');
  assert.deepEqual(avatarStyle('#1a2b4c', { opacity: 0.5 }), { background: '#1a2b4c', color: '#ffffff', opacity: 0.5 });
  assert.equal(inkOn('not-a-colour'), '#ffffff');
  assert.deepEqual(readablePair('#C9A227'), { background: '#C9A227', color: '#221f1b' });
  assert.notEqual(readablePair('#4C7FB0').background, '#4C7FB0');
});

test('erişilebilirlik: her ekranın duyurulacak bir adı var', () => {
  for (const [phase, name] of Object.entries(SCREEN_NAMES)) assert.ok(name.trim().length > 2, phase);
});
