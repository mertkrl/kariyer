import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useGameStore } from '../src/game/store';
import { REPLY_BACK, candidateReplies } from '../src/game/rejectionMails';

const s = () => useGameStore.getState();

function withReply() {
  s().restart();
  const reply = candidateReplies({ ahmet: 'standard', gokce: 'personal', deniz: 'standard' }, 0, 540)[0];
  assert.ok(reply, 'yanıt yazan aday yok');
  useGameStore.setState({ extraMails: [reply], performans: 50, vicdan: 50 });
  return reply;
}

test('adayın yanıtına dönülür: gönderilenlere düşer, puan değişir, ikinci kez yanıtlanmaz', () => {
  const reply = withReply();
  s().answerCandidateMail(reply.id, 'reason');
  const sent = s().extraMails.find((m) => m.id === `answer-${reply.id}`);
  assert.ok(sent && sent.folder === 'sent' && sent.body.length > 40);
  const effect = REPLY_BACK.find((o) => o.kind === 'reason')!.effect;
  assert.equal(s().performans, 50 + effect.performans);
  assert.equal(s().vicdan, 50 + effect.vicdan);
  s().answerCandidateMail(reply.id, 'warm');
  assert.equal(s().extraMails.filter((m) => m.id.startsWith('answer-')).length, 1);
  assert.equal(s().vicdan, 50 + effect.vicdan);
});

test('her yanıt türü adayın adıyla ve geçerli bir metinle gider', () => {
  for (const o of REPLY_BACK) {
    const reply = withReply();
    s().answerCandidateMail(reply.id, o.kind);
    const sent = s().extraMails.find((m) => m.id === `answer-${reply.id}`)!;
    assert.ok(sent.body.includes(reply.from.split(' ')[0]), o.kind);
    assert.doesNotMatch(sent.body, /undefined|null/, o.kind);
  }
});
