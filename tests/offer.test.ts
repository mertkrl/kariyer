/*
 * Cuma 18:40: Hakan Bey'in ne teklif edebileceği haftaya, ne olacağı Defne'nin cevabına bağlıdır;
 * o gece annenle telefon konuşması da bunu duyar.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conditionHolds, offerOpening, offerReply, offerWithheld, type OfferContext } from '../src/game/events/offer';
import { buildCall, type WeekSummary } from '../src/game/events/weekend';

const ctx = (over: Partial<OfferContext> = {}): OfferContext => ({ performans: 60, refusals: 1, complies: 1, reform: null, hiredNephew: false, ...over });

test('teklif: batan bir haftada teklif yok; dört kapı ancak teklif varsa açılır', () => {
  assert.equal(offerWithheld(ctx({ performans: 20 })), true);
  assert.equal(offerWithheld(ctx({ performans: 50, refusals: 5 })), true);
  assert.equal(offerWithheld(ctx()), false);
  assert.deepEqual(offerOpening(ctx()).options.map((o) => o.id), ['accept', 'condition', 'ayse', 'quit']);
  assert.deepEqual(offerOpening(ctx({ performans: 20 })).options.map((o) => o.id), ['nod', 'walk']);
  assert.equal(offerReply(ctx({ performans: 20 }), 'nod').result?.outcome, 'notOffered');
});

test('teklif: şart Perşembe\'nin önerisidir; tablo denetimi hiç kabul edilmez', () => {
  assert.equal(conditionHolds(ctx({ reform: { kind: 'structured', accepted: true } })), true);
  assert.equal(conditionHolds(ctx({ reform: { kind: 'blind', accepted: false }, performans: 70, refusals: 2 })), true);
  assert.equal(conditionHolds(ctx({ reform: { kind: 'blind', accepted: false }, performans: 50 })), false);
  assert.equal(conditionHolds(ctx({ reform: { kind: 'audit', accepted: false }, performans: 99, refusals: 0 })), false);
  assert.equal(conditionHolds(ctx()), false, 'öneri yoksa şart tabloyu açmaktır');
  assert.match(offerOpening(ctx({ reform: { kind: 'structured', accepted: true } })).options[1].label, /yapılandırılmış/);
});

test('teklif: reddedilen şartın ardından son bir soru gelir', () => {
  const r = offerReply(ctx(), 'condition');
  assert.equal(r.result, undefined);
  assert.deepEqual(r.next?.options.map((o) => o.id), ['sign', 'refuse']);
  assert.equal(offerReply(ctx(), 'sign').result?.outcome, 'stayAfterRefusal');
  assert.equal(offerReply(ctx(), 'refuse').result?.outcome, 'reformRefused');
  assert.equal(offerReply(ctx({ reform: { kind: 'structured', accepted: true } }), 'condition').result?.outcome, 'stayReform');
});

const week = (over: Partial<WeekSummary> = {}): WeekSummary => ({
  hiredName: 'Nehir', processed: 40, autoRejected: 1800, refusals: 1, complies: 1, vicdan: 60, performans: 60,
  momMessages: 0, momAnswered: 0, aiUses: 3, events: 0, dmHonest: 0, dmIgnored: 0, offer: null, ...over,
});

test('annenle telefon: kadro haberini duyar; ayrıldıysan son seçenek yeni başvurulardır', () => {
  const text = (w: WeekSummary) => JSON.stringify(buildCall(w));
  assert.doesNotMatch(text(week()), /deneme süren bugün bitiyordu/);
  assert.match(text(week({ offer: 'gaveToAyse' })), /Ayşe'ye bıraktım/);
  const last = (w: WeekSummary) => {
    const steps = buildCall(w).filter((s) => s.kind === 'choice');
    return steps[steps.length - 1].kind === 'choice' ? steps[steps.length - 1].choices.map((c) => c.tag) : [];
  };
  assert.deepEqual(last(week({ offer: 'stay' })), ['breakfast', 'sleep', 'quit']);
  assert.deepEqual(last(week({ offer: 'quit' })), ['breakfast', 'sleep', 'search']);
});
