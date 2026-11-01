import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildJunction, clash, exitOf, hardClashes, yields } from '../src/games/trafik/junction';
import { LEVELS, PASS_SCORE } from '../src/games/trafik/levels';
import { DIRS, type MoveId, type Plan } from '../src/games/trafik/model';
import { applyPlan, breakdownNow, createSim, dispatch, moveOpen, planIssues, report, run, setHold, setManual, setMode, signal, skipTo, step, toggleLeg, type Sim } from '../src/games/trafik/sim';
import { makeScenery } from '../src/games/trafik/scenery';
import { OBL_Y } from '../src/games/trafik/facade';

const NS: MoveId[] = ['N.L', 'N.T', 'N.R', 'S.L', 'S.T', 'S.R'];
const EW: MoveId[] = ['E.L', 'E.T', 'E.R', 'W.L', 'W.T', 'W.R'];
const level = (id: string) => LEVELS.find((l) => l.spec.id === id)!;

/** Planı yükler, ambulans gelince onun evresine geçen bir oyuncu gibi oynar. */
function play(id: string, plan?: Plan) {
  const s = createSim(level(id).spec);
  if (plan) applyPlan(s, plan);
  while (!s.done) {
    step(s);
    if (!plan) continue;
    // olay çıkınca ekibe bildirir
    for (const i of s.incidents) if (!i.team && i.cleared === undefined) dispatch(s, i.id);
    // konvoy haberi gelince onun evresine geçip tutar, konvoy geçince bırakır
    const vip = s.vip.n > s.vip.passed || s.spec.events.some((e) => e.kind === 'motorcade' && e.at - s.t < 12 && e.at - s.t > 0);
    const vmv = s.spec.events.find((e) => e.kind === 'motorcade')?.kind === 'motorcade' ? (s.spec.events.find((e) => e.kind === 'motorcade') as { mv: MoveId }).mv : null;
    if (vmv) {
      const k = s.plan.phases.findIndex((p) => p.moves.includes(vmv));
      if (vip) {
        if (s.ctl.phase === k && s.ctl.stage === 'green') {
          if (!s.ctl.hold) setHold(s, true);
        } else if (s.ctl.next !== k) skipTo(s, k);
      } else if (s.ctl.hold) setHold(s, false);
    }
    const a = s.cars.find((c) => c.kind === 'ambulance' && c.s < c.path.stop);
    if (a) {
      const k = s.plan.phases.findIndex((p) => p.moves.includes(a.mv));
      if (k >= 0 && k !== s.ctl.phase && s.ctl.next !== k) skipTo(s, k);
    }
  }
  return { s, r: report(s) };
}

const GOOD: Record<string, Plan> = {
  moda: { phases: [{ moves: [...NS, 'E.P', 'W.P'], green: 30 }, { moves: [...EW, 'N.P', 'S.P'], green: 14 }], allRed: 2 },
  bagcilar: { phases: [{ moves: ['E.T', 'E.L', 'W.T', 'W.R', 'S.P'], green: 24 }, { moves: ['E.L', 'E.T', 'W.P'], green: 8 }, { moves: ['S.L', 'S.R', 'E.P', 'W.P'], green: 14 }], allRed: 2 },
  levent: { phases: [{ moves: ['N.L', 'S.L'], green: 8 }, { moves: ['N.T', 'N.R', 'S.T', 'S.R', 'E.P', 'W.P'], green: 36 }, { moves: [...EW], green: 16 }], allRed: 3 },
  cengelkoy: { phases: [{ moves: ['W.T', 'W.L', 'E.T', 'E.R', 'N.P', 'S.P'], green: 26 }, { moves: [...NS], green: 14 }], allRed: 3 },
  bahariye: { phases: [{ moves: [...NS, 'E.P', 'W.P'], green: 32 }, { moves: [...EW, 'N.P', 'S.P'], green: 16 }], allRed: 2 },
  atasehir: { phases: [{ moves: ['E.L', 'W.L'], green: 16 }, { moves: ['E.T', 'E.R', 'W.T', 'W.R', 'N.P', 'S.P'], green: 24 }, { moves: NS, green: 14 }], allRed: 2 },
  sisli: { phases: [{ moves: [...NS, 'E.P', 'W.P'], green: 28 }, { moves: [...EW, 'N.P', 'S.P'], green: 16 }], allRed: 2 },
  mecidiyekoy: { phases: [{ moves: ['N.L', 'S.L'], green: 8 }, { moves: ['N.T', 'N.R', 'S.T', 'S.R', 'E.P', 'W.P'], green: 28 }, { moves: EW, green: 14 }], allRed: 2 },
  besiktas: { phases: [{ moves: ['N.T', 'S.T', 'S.R', 'W.P'], green: 30 }, { moves: ['N.L', 'S.L'], green: 10 }, { moves: ['W.L', 'W.R', 'E.L', 'E.T', 'E.R', 'N.P', 'S.P'], green: 12 }], allRed: 1, sensor: true },
};

test('çakışma tablosu simetrik; karşı yönden düzle sola dönen izinli, dik düzler sert', () => {
  const all = DIRS.flatMap((d) => (['L', 'T', 'R', 'P'] as const).map((t) => `${d}.${t}` as MoveId));
  for (const a of all) for (const b of all) assert.equal(clash(a, b), clash(b, a), `${a} ${b}`);
  assert.equal(clash('N.T', 'S.T'), 'none');
  assert.equal(clash('N.T', 'E.T'), 'hard');
  assert.equal(clash('N.L', 'S.T'), 'soft');
  assert.ok(yields('N.L', 'S.T') && !yields('S.T', 'N.L'));
  // sağa dönen paralel geçitteki yayaya yol verir; geçidin kendi kolundan çıkan sert çakışır
  assert.equal(clash('N.R', 'W.P'), 'soft');
  assert.ok(yields('N.R', 'W.P'));
  assert.equal(clash('N.T', 'N.P'), 'hard');
  assert.equal(exitOf('N', 'L'), 'E');
  assert.equal(exitOf('W', 'R'), 'S');
});

test('her şeridin yolu var, sola dönen kutuda karşı şeride taşmadan bekler', () => {
  for (const l of LEVELS) {
    const j = buildJunction(l.spec.legs);
    for (const [d, leg] of Object.entries(l.spec.legs))
      leg.lanes.forEach((lanes, i) => {
        for (const t of lanes) if (j.legs[exitOf(d as 'N', t as 'L')]) assert.ok(j.paths.get(`${d}.${t}:${i}`), `${l.spec.id} ${d}.${t}:${i}`);
      });
    for (const [key, p] of j.paths) {
      if (key[2] === 'L') assert.ok(p.stop < p.wait && p.wait <= p.boxOut, `${l.spec.id} ${key}`);
      assert.ok(p.len > 250, l.spec.id);
    }
  }
});

test('açılış planlarında denetçinin reddedeceği çakışma yok; evresiz hareket uyarı verir', () => {
  for (const l of LEVELS) for (const p of l.spec.plan.phases) assert.deepEqual(hardClashes(p.moves), [], l.spec.id);
  const s = createSim(level('sisli').spec);
  assert.ok(planIssues(s, s.plan).warn.some((w) => w.includes('yaya')));
  assert.equal(planIssues(s, { phases: [{ moves: ['N.T', 'E.T'], green: 20 }], allRed: 2 }).hard.length, 1);
});

test('her kavşağın açılış planı kalır, düzeltilmiş plan geçer', () => {
  for (const l of LEVELS) {
    const bad = play(l.spec.id).r;
    const good = play(l.spec.id, GOOD[l.spec.id]).r;
    assert.ok(bad.score < PASS_SCORE, `${l.spec.id} kötü plan ${bad.score}`);
    assert.ok(good.score >= PASS_SCORE, `${l.spec.id} iyi plan ${good.score}`);
    assert.ok(good.score > bad.score + 10, l.spec.id);
  }
});

test('Ataşehir: korumalı sol evresi sola dönenlerin bekleyişini kısaltır', () => {
  const bad = play('atasehir').r;
  const good = play('atasehir', GOOD.atasehir).r;
  assert.equal(bad.worstMv?.endsWith('.L'), true);
  assert.ok(good.worst < bad.worst - 20);
});

test('Şişli: yaya evresi yokken yayalar kırmızıda geçer, varken beklemez', () => {
  const bad = play('sisli').r;
  const good = play('sisli', GOOD.sisli).r;
  assert.ok(bad.jay > 50);
  assert.equal(good.jay, 0);
  assert.ok(good.pedWait < bad.pedWait);
});

test('Mecidiyeköy: tüm kırmızı sıfırken kutuda kaza çıkar, iki saniyede azalır', () => {
  const zero = play('mecidiyekoy', { ...GOOD.mecidiyekoy, allRed: 0 }).r;
  const two = play('mecidiyekoy', GOOD.mecidiyekoy).r;
  assert.ok(zero.crashes >= 2, `${zero.crashes}`);
  assert.ok(two.crashes < zero.crashes);
  assert.equal(two.ambulanceLate, 0);
});

test('kontrolör: sarı ve tüm kırmızı sırayla gelir; tut yeşili sabitler, geç evreyi keser', () => {
  const s: Sim = createSim(level('bahariye').spec);
  const until = (f: () => boolean, max = 2000) => {
    for (let i = 0; i < max && !f(); i++) step(s);
  };
  assert.equal(signal(s, 'N.T'), 'green');
  assert.equal(signal(s, 'E.T'), 'red');
  until(() => s.ctl.stage === 'amber');
  assert.equal(signal(s, 'N.T'), 'amber');
  until(() => s.ctl.stage === 'allred');
  assert.equal(signal(s, 'N.T'), 'red');
  assert.equal(signal(s, 'E.T'), 'red');
  until(() => s.ctl.stage === 'green');
  assert.equal(s.ctl.phase, 1);
  setHold(s, true);
  for (let i = 0; i < 500; i++) step(s);
  assert.equal(s.ctl.phase, 1);
  assert.equal(s.ctl.stage, 'green');
  skipTo(s);
  until(() => s.ctl.phase === 0);
  assert.equal(s.ctl.phase, 0);
});

test('kaos olayları sırayla gelir; bekleyen kollar söylenir, korna çalar', () => {
  for (const l of LEVELS) l.spec.events.forEach((e, i) => i && assert.ok(e.at >= l.spec.events[i - 1].at, `${l.spec.id} ${e.kind}`));
  const kinds = new Set(LEVELS.flatMap((l) => l.spec.events.map((e) => e.kind)));
  for (const k of ['convoy', 'courier', 'parked'] as const) assert.ok(kinds.has(k), k);
  const s = createSim(level('sisli').spec);
  while (!s.done) step(s);
  assert.ok(s.log.some((x) => x.horn));
});

test('yol düzeni: kapanan yönün isteği ara sokağa sapar ve gecikme yazılır', () => {
  const s = createSim(level('moda').spec);
  setMode(s, 'W', 'kapali');
  assert.ok(!moveOpen(s, 'W.T') && !moveOpen(s, 'E.T') && !moveOpen(s, 'N.R'));
  setMode(s, 'E', 'giris');
  assert.ok(!moveOpen(s, 'N.L') && moveOpen(s, 'N.T'));
  run(s, 90);
  assert.ok(s.detour > 0);
  assert.ok(!s.cars.some((c) => c.mv[0] === 'W' || c.mv === 'N.R' || c.mv === 'S.L'));
  const open = createSim(level('moda').spec);
  run(open, 90);
  assert.ok(report(s).delay > report(open).delay);
});

test('elle kumanda: çakışan iki kola birlikte yeşil kutuda kaza çıkarır; kırmızıya önce sarıyla geçer', () => {
  const s = createSim(level('sisli').spec);
  run(s, 5);
  setManual(s, true);
  for (const d of ['N', 'S', 'E', 'W'] as const) if (s.manual![d]!.st === 'red') toggleLeg(s, d);
  assert.equal(signal(s, 'E.T'), 'green');
  assert.equal(signal(s, 'N.T'), 'green');
  run(s, 90);
  assert.ok(s.crashes.length > 0);
  toggleLeg(s, 'N');
  assert.equal(signal(s, 'N.T'), 'amber');
  run(s, 3.2);
  assert.equal(signal(s, 'N.T'), 'red');
  setManual(s, false);
  assert.equal(s.ctl.stage, 'allred');
});

test('olaya ekip gönderilince olay çabuk kalkar; gönderilmezse şerit uzun süre kapalı', () => {
  const pair = [true, false].map((send) => {
    const s = createSim(level('moda').spec);
    breakdownNow(s, 'N.T', 'arıza', 150);
    while (!s.incidents.length) step(s);
    const i = s.incidents[0];
    if (send) dispatch(s, i.id);
    while (i.cleared === undefined && s.t < 400) step(s);
    return i.cleared! - i.at;
  });
  assert.ok(pair[0] < 25, `ekiple ${pair[0]}`);
  assert.ok(pair[1] > 140, `ekipsiz ${pair[1]}`);
});

test('düğün konvoyu kolu kapatır, makam konvoyu ışığa bakmaz', () => {
  const w = createSim(level('bagcilar').spec);
  run(w, 90);
  assert.ok(w.incidents.some((i) => i.kind === 'wedding' && i.cleared === undefined));
  assert.ok(!w.cars.some((c) => c.mv[0] === 'S' && c.s > c.path.stop && c.s < c.path.boxOut && c.born > 80));
  const v = createSim(level('cengelkoy').spec);
  run(v);
  assert.equal(v.vip.n, 6);
  assert.ok(report(v).parts.some((p) => p.label === 'Konvoy'));
});

test('eğik bakışta yolun güneyindeki binaların çatısı yola taşmaz', () => {
  for (const l of LEVELS) {
    const j = buildJunction(l.spec.legs);
    const sc = makeScenery(j, l.spec.seed, l.spec.landmarks);
    for (const b of sc.blocks) {
      if (b.sy < 0 || !b.hRoad) continue;
      for (const k of sc.buildings) {
        if (k.landmark === 'cami' || k.x + k.w < b.x0 || k.x > b.x1 || k.y < b.y0) continue;
        assert.ok(k.y - (k.floors * 3 + 0.8) * OBL_Y >= b.cy, `${l.spec.id} çatı yolda`);
      }
    }
  }
});
