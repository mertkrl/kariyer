/*
 * Oyuncu geri bildirimiyle gelen kurallar: sorular cevapsız kalmaz, her adayın maaş beklentisi
 * yazılıdır, mülakat yükü eşit bölünür, toplantı selamlaşmayla açılır, istifa annene söylenir.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { managerQuickReplies, type QuickReply } from '../src/game/day/manager';
import { candidates } from '../src/game/data/candidates';
import { EXTRA_CANDIDATES } from '../src/game/data/extraCandidates';
import { handOver, ownerOf } from '../src/game/events/panel';
import { buildOpening } from '../src/game/events/meeting';
import { buildCall } from '../src/game/events/weekend';
import { inbox } from '../src/game/day/mail';
import { COLLEAGUES } from '../src/screens/final/interviewModel';
import type { Finalist } from '../src/game/store/storeTypes';

const unanswered = (replies: QuickReply[] | undefined): string[] =>
  (replies ?? []).flatMap((r) => [...(r.reaction.trim().endsWith('?') && !r.followUp?.length ? [r.reaction] : []), ...unanswered(r.followUp)]);

test('Hakan Bey bir soru sorarsa ona cevap verilebilir', () => {
  const left: string[] = [];
  for (const kind of ['greeting', 'lunch', 'openFiles'] as const)
    for (const tone of [0, 1, 2, 3] as const) for (const open of [0, 2]) left.push(...unanswered(managerQuickReplies(kind, tone, open)));
  assert.deepEqual(left, []);
});

test('telefon senaryosunda soru biçimindeki her tepkinin cevapları var', () => {
  const src = readFileSync(new URL('../src/game/data/phoneScript.ts', import.meta.url), 'utf8');
  const bare = src.split('\n').filter((l) => /reaction: '[^']*\?'/.test(l) && !l.includes('followUp'));
  assert.deepEqual(bare, []);
});

test('her adayın maaş beklentisi bir rakamla yazılı', () => {
  const all = { ...candidates, ...EXTRA_CANDIDATES };
  const missing = Object.values(all).filter((c) => !/\d{1,3}(\.\d{3})+\s*TL/.test(c.salary)).map((c) => `${c.id}: ${c.salary}`);
  assert.deepEqual(missing, []);
});

test('Cuma: Defne\'nin görüşmediği davetliler Ayşe ile Emre arasında eşit dağılır', () => {
  const rest: Finalist[] = ['a', 'b', 'c', 'd', 'e', 'f'].map((id, i) => ({ id, day: i + 1 }));
  const handed = handOver(rest, COLLEAGUES, []);
  const load = { ayse: 0, emre: 0 } as Record<string, number>;
  for (const f of [...COLLEAGUES, ...handed]) load[ownerOf(f, [])]++;
  assert.ok(Math.abs(load.ayse - load.emre) <= 1, JSON.stringify(load));
  assert.ok(handed.every((f) => f.handedOver));
});

test('toplantı bir anlatıcı cümlesiyle değil, selamlaşmayla başlar', () => {
  const lines = buildOpening({ files: 20, avg: 30, ai: 0.4 } as Parameters<typeof buildOpening>[0]);
  assert.notEqual(lines[0].who, 'room');
  assert.match(lines[0].text, /Merhaba/);
  assert.ok(!lines.some((l) => /ekranını paylaşıyor/.test(l.text)));
});

test('sahne notu yok: konuşmalarda "(kısa bir sessizlik)" gibi parantezler yazılmaz', () => {
  const files = ['src/game/day/story.ts', 'src/game/data/interviewExtras.ts', 'src/game/data/phoneScript.ts', 'src/game/events/weekend.ts'];
  const notes = files.flatMap((f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').match(/\((kısa|uzun|bir süre)[^)]*(sessizlik|duraksama|düşünüyor)\)/g) ?? []);
  assert.deepEqual(notes, []);
});

test('istifa ettiysen annen bunu konuşmanın başında duyar ve müdürünün memnuniyetini sormaz', () => {
  const steps = buildCall({ hiredName: null, processed: 20, autoRejected: 1800, refusals: 4, complies: 0, vicdan: 70, performans: 50, momMessages: 0, momAnswered: 0, aiUses: 3, events: 0, dmHonest: 0, dmIgnored: 0, offer: 'quit' });
  const text = steps.flatMap((s) => (s.kind === 'line' ? [s.line.text] : s.choices.map((c) => c.label)));
  const quitAt = text.findIndex((t) => /İstifa/.test(t));
  assert.ok(quitAt >= 0 && quitAt <= 6, `istifa ${quitAt}. satırda`);
  assert.ok(!text.some((t) => /Müdürün (hâlâ kızgın|memnun|nasıl)/.test(t)));
  assert.match(text[text.length - 1], /mektubu/);
});

test('gizlilik hatırlatması gönderilmez, kariyer platformunun e-postası spama düşmez', () => {
  const mails = inbox(5, 9999);
  assert.ok(!mails.some((m) => /belgelerinin gizliliği/.test(m.subject)));
  assert.ok(!mails.find((m) => m.id === 'flood')?.spam);
});
