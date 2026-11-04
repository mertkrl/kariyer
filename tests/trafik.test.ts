import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildJunction, clash, exitOf, hardClashes, yields } from '../src/games/trafik/junction';
import { LEVELS, PASS_SCORE, starsOf } from '../src/games/trafik/levels';
import { DIRS, MIN_GREEN, moveOfKey, type Difficulty, type MoveId, type NetSpec } from '../src/games/trafik/model';
import { cycleOf, forecast, redOf } from '../src/games/trafik/controller';
import { createNet, netReport, nodeX, runNet, setClosed, stepNet, type Net } from '../src/games/trafik/net';
import { applyPlan, breakdownNow, dispatch, fire, report, run, setHold, signal, skipTo, speedOf, step, type Sim } from '../src/games/trafik/sim';
import { advise, greenWave, mainPhase, waveError } from '../src/games/trafik/engineer';
import { makeScenery } from '../src/games/trafik/scenery';
import { freeLevel } from '../src/games/trafik/free';
import { setSideRule } from '../src/games/trafik/sim';
import { OBL_Y } from '../src/games/trafik/facade';

const level = (id: string) => LEVELS.find((l) => l.spec.id === id)!;
/** Bölümün ilk (ya da adı verilen) kavşağının simülasyonu, kendi başına adımlanır. */
const one = (id: string, spec: Partial<NetSpec> = {}) => createNet({ ...level(id).spec, ...spec }).sims[0];
const nodeOf = (net: Net, id: string) => net.sims.find((s) => s.node === id)!;

/** Evrenin araç hareketlerinde bekleyen araç: haritada duranlar ve kolun gerisindekiler. */
const waiting = (s: Sim, moves: MoveId[]) =>
  s.cars.filter((c) => moves.includes(c.mv) && c.s < c.path.stop && c.v < 2).length + Object.entries(s.backlog).reduce((m, [k, l]) => (moves.includes(moveOfKey(k)) ? m + l.length : m), 0);

/** İyi bir oyuncunun süreleri: kavşak kavşak, evre evre yeşil. */
const TUNED: Record<string, number[][]> = {
  atasehir: [[8, 22, 12]],
  bagcilar: [[26, 14], [30, 12]],
  levent: [[14, 28, 14], [14, 28, 14]],
  sahil: [[26, 12], [26, 12], [26, 12]],
  kusdili: [[8, 30, 16]],
  incirli: [[22, 18], [20, 16]],
  vatan: [[30, 12], [30, 12], [30, 12], [30, 12]],
  mecidiyekoy: [[24, 14], [24, 14], [24, 14]],
};

/**
 * Oyuncu: olay çıkınca ekip çağırır, yol çalışmasından önce kolu kapatıp bitince açar, ambulansın
 * kartına dokunur, konvoy gelirken yolundaki her kavşakta sahil yolunu yakıp tutar; yanan yön
 * boşalınca en kalabalık evrenin kartına dokunur. `tuned` ise önce süreleri dağıtır; `idle` hiç dokunmaz.
 */
function play(id: string, opts: { idle?: boolean; tuned?: boolean; diff?: Difficulty } = {}) {
  const spec = level(id).spec;
  const net = createNet(spec, opts.diff);
  // iyi oyuncu mühendis notunu da dinler: sarı ve tüm kırmızı önerilen değerde
  if (opts.tuned && TUNED[id]) for (const [k, s] of net.sims.entries()) applyPlan(s, { ...s.plan, amber: advise(s).amber, allRed: advise(s).allRed, phases: s.plan.phases.map((p, j) => ({ ...p, green: TUNED[id][k][j] })) });
  const vipEv = spec.events.find((e) => e.kind === 'motorcade');
  const work = spec.events.find((e) => e.kind === 'roadwork');
  while (!net.done) {
    stepNet(net);
    if (opts.idle) continue;
    if (work?.kind === 'roadwork') {
      const s = nodeOf(net, work.node!);
      const on = net.t > work.at - 8 && net.t < work.at + work.sec;
      if (on !== !!s.closed[work.leg]) setClosed(s, work.leg, on);
    }
    net.sims.forEach((s, k) => {
      for (const x of s.incidents) if (!x.team && x.cleared === undefined) dispatch(s, x.id);
      if (vipEv) {
        const ph = s.plan.phases.findIndex((p) => p.moves.includes('W.T'));
        const coming = net.sims.slice(0, k + 1).some((u) => u.cars.some((c) => c.kind === 'vip' || c.kind === 'police') || Object.entries(u.backlog).some(([key, l]) => l.length && /^(vip|pol):/.test(key)));
        const soon = vipEv.at - net.t < 15 + k * 12 && vipEv.at - net.t > 0;
        if (coming || soon) {
          if (s.ctl.phase === ph && s.ctl.stage === 'green') {
            if (!s.ctl.hold) setHold(s, true);
          } else if (s.ctl.next !== ph) skipTo(s, ph);
          return;
        } else if (s.ctl.hold) setHold(s, false);
      }
      const a = s.cars.find((c) => c.kind === 'ambulance' && c.s < c.path.stop);
      if (a) {
        const ph = s.plan.phases.findIndex((p) => p.moves.includes(a.mv));
        if (ph !== s.ctl.phase && s.ctl.next !== ph) skipTo(s, ph);
        return;
      }
      if (Math.round(s.t * 10) % 10 !== 0 || s.ctl.stage !== 'green' || s.ctl.t < MIN_GREEN + 1 || s.ctl.next !== null) return;
      const q = s.plan.phases.map((p) => waiting(s, p.moves.filter((m) => m[2] !== 'P')));
      let best = -1;
      q.forEach((v, j) => {
        if (j !== s.ctl.phase && (best < 0 || v > q[best])) best = j;
      });
      if (best >= 0 && q[s.ctl.phase] <= 1 && q[best] >= 3) skipTo(s, best);
    });
  }
  return { net, r: netReport(net) };
}

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
  for (const l of LEVELS)
    for (const s of createNet(l.spec).sims) {
      for (const [d, leg] of Object.entries(s.spec.legs))
        leg.lanes.forEach((lanes, i) => {
          for (const t of lanes) if (s.j.legs[exitOf(d as 'N', t as 'L')]) assert.ok(s.j.paths.get(`${d}.${t}:${i}`), `${s.node} ${d}.${t}:${i}`);
        });
      for (const [key, p] of s.j.paths) {
        if (key[2] === 'L') assert.ok(p.stop < p.wait && p.wait <= p.boxOut, `${s.node} ${key}`);
        // kısa yol: Mecidiyeköy'de iki kavşak arası 120 metre, kolun yarısı 60
        assert.ok(p.len > 110, `${s.node} ${key}`);
      }
    }
});

test('dokuz bölüm kavşaktan caddeye büyür, araçlar sırayla açılır; evreler çakışmaz, her hareket bir evrede yanar', () => {
  assert.equal(LEVELS.length, 9);
  assert.deepEqual(
    LEVELS.map((l) => l.spec.nodes.length),
    [1, 1, 2, 2, 3, 1, 2, 4, 3],
  );
  assert.deepEqual(
    LEVELS.map((l) => `${l.spec.tools.timing ? 'S' : '-'}${l.spec.tools.roads ? 'Y' : '-'}${l.spec.tools.detect ? 'D' : '-'}${l.spec.tools.wave ? 'W' : '-'}`),
    ['S---', 'S---', 'S---', 'SY--', 'SY--', 'SYD-', 'SYD-', 'SYDW', 'SYDW'],
  );
  for (const l of LEVELS) {
    assert.ok(l.spec.duration <= 130, `${l.spec.id} ${l.spec.duration} sn`);
    assert.ok(l.job.length > 40 && l.tip.length > 20, l.spec.id);
    for (const n of l.spec.nodes) {
      for (const p of n.plan.phases) assert.deepEqual(hardClashes(p.moves), [], `${l.spec.id} ${n.id}`);
      const served = new Set(n.plan.phases.flatMap((p) => p.moves));
      const j = buildJunction(n.legs);
      for (const m of j.moves) if (m[2] !== 'P') assert.ok(served.has(m), `${n.id} ${m} hiçbir evrede yok`);
    }
    // olaylar sırayla; olayın kavşağı ağda var
    l.spec.events.forEach((e, i) => {
      if (i) assert.ok(e.at >= l.spec.events[i - 1].at, `${l.spec.id} ${e.kind}`);
      if (e.node) assert.ok(l.spec.nodes.some((n) => n.id === e.node), `${l.spec.id} ${e.node}`);
    });
  }
});

test('komşu kavşakların birbirine bakan kolları aynı yolun iki yarısı: şeritler eşleşir, uçlar buluşur', () => {
  for (const l of LEVELS) {
    const net = createNet(l.spec);
    for (const [i, a] of net.sims.entries()) {
      const b = net.sims[i + 1];
      if (!b) continue;
      assert.ok(a.links.E?.sim === b && b.links.W?.sim === a, `${l.spec.id} bağlantı`);
      const ea = a.spec.legs.E!;
      const wb = b.spec.legs.W!;
      assert.equal(ea.out, wb.lanes.length, `${a.node}→${b.node} şerit`);
      assert.equal(wb.out, ea.lanes.length, `${b.node}→${a.node} şerit`);
      assert.equal(ea.median ?? 0, wb.median ?? 0);
      // soldakinin doğuya çıkan yolunun ucu, sağdakinin batıdan gelen yolunun başı
      const gap = l.spec.nodes.find((n) => n.id === b.node)!.x - l.spec.nodes.find((n) => n.id === a.node)!.x;
      const out = [...a.j.paths.entries()].find(([k]) => exitOf(k[0] as 'N', k[2] as 'L') === 'E')![1];
      const inn = [...b.j.paths.entries()].find(([k]) => k[0] === 'W')![1];
      assert.ok(Math.abs(out.pts[out.pts.length - 1][0] - (inn.pts[0][0] + gap)) < 0.01, `${a.node} uç`);
    }
  }
});

test('ağda araç kavşaktan kavşağa geçer; komşunun kuyruğu dolunca yolun ucunda bekler', () => {
  const net = runNet(createNet(level('bagcilar').spec));
  const [meydan, salon] = net.sims;
  // Meydan'dan doğuya çıkanlar Düğün Salonu'na batıdan girip kavşağı geçti, tersi de (yollar uzun:
  // kimi hâlâ çıkış yolunda)
  const crossed = (s: Sim, mv: MoveId) => (s.byMove[mv]?.n ?? 0) + s.cars.filter((c) => c.mv === mv && c.s > c.path.boxOut).length;
  assert.ok(crossed(salon, 'W.T') > 3, 'Meydan → Salon');
  assert.ok(crossed(meydan, 'E.T') > 2, 'Salon → Meydan');
  assert.ok(meydan.exited > 0 && salon.exited > 0);
  // salonun batı kolunu tıka: Meydan'dan gelenler yolun ucunda dizilir
  const spec = level('bagcilar').spec;
  // salonun dış talebi yok (kendi kolu kilitlenmesin), batıdan gelene beş saniye yeşil
  const s = createNet({ ...spec, events: [], duration: 999, nodes: spec.nodes.map((n) => (n.id === 'salon' ? { ...n, demand: [] } : n)) });
  const [a, b] = s.sims;
  b.plan = { ...b.plan, phases: b.plan.phases.map((p, i) => ({ ...p, green: i === 0 ? 5 : 60 })) };
  runNet(s, 600);
  assert.ok(a.cars.some((c) => c.mv[0] !== 'E' && exitOf(c.mv[0] as 'N', c.mv[2] as 'L') === 'E' && c.s > c.path.len - 20 && c.v < 0.5), 'kuyruk geri taştı');
});

test('kapatılan yol iki ucundan kapanır; dış koldan gelen sapar, kapalı kola dönecek olan öbür yöne çevrilir', () => {
  const net = createNet({ ...level('levent').spec, events: [] });
  const [z, lv] = net.sims;
  setClosed(z, 'E', true);
  assert.ok(z.closed.E && lv.closed.W);
  setClosed(z, 'E', false);
  assert.ok(!z.closed.E && !lv.closed.W);
  setClosed(lv, 'N', true);
  const from = net.t;
  runNet(net, 60);
  assert.ok(lv.detour > 0, 'Çarşı’dan gelenler saptı');
  // kapandıktan sonra doğan hiçbir araç Çarşı'ya dönmedi
  const intoN = lv.cars.filter((c) => c.born > from + 1 && exitOf(c.mv[0] as 'N', c.mv[2] as 'L') === 'N');
  assert.equal(intoN.length, 0);
  assert.ok(lv.log.some((l) => l.text.includes('kapatıldı')));
});

test('yol çalışması: kol açık kalırsa işçilerin yanından araç geçer ve puan düşer; kapatan oyuncu tam alır', () => {
  const idle = play('levent', { idle: true }).r;
  const good = play('levent').r;
  const part = (r: typeof idle) => r.parts.find((p) => p.label === 'Yol çalışması')!;
  assert.ok(idle.workHits > 3, `${idle.workHits}`);
  assert.ok(part(idle).got < part(idle).max);
  assert.equal(good.workHits, 0);
  assert.equal(part(good).got, part(good).max);
});

test('ışık süreleri: sarı ve tüm kırmızı ayarlanır, kırmızı döngünün geri kalanıdır', () => {
  const s = one('atasehir', { events: [] });
  applyPlan(s, { ...s.plan, amber: 5, allRed: 3 });
  assert.equal(cycleOf(s.plan), s.plan.phases.reduce((m, p) => m + p.green, 0) + 3 * (5 + 3));
  assert.equal(redOf(s.plan, 0), cycleOf(s.plan) - s.plan.phases[0].green - 5);
  run(s, s.plan.phases[0].green + 0.05);
  assert.equal(s.ctl.stage, 'amber');
  run(s, 4.8);
  assert.equal(s.ctl.stage, 'amber', 'sarı beş saniye sürer');
  run(s, 0.3);
  assert.equal(s.ctl.stage, 'allred');
  run(s, 3);
  assert.equal(s.ctl.stage, 'green');
  assert.equal(s.ctl.phase, 1);
});

test('hiç dokunmayan kalır; süreleri dağıtıp kartlara dokunan geçer', () => {
  for (const l of LEVELS) {
    const idle = play(l.spec.id, { idle: true }).r;
    const good = play(l.spec.id, { tuned: true }).r;
    assert.ok(idle.score < PASS_SCORE, `${l.spec.id} dokunmadan ${idle.score}`);
    assert.ok(good.score >= PASS_SCORE + 5, `${l.spec.id} iyi oyuncu ${good.score}`);
    assert.ok(good.score > idle.score + 10, l.spec.id);
  }
});

test('Bahariye: süreleri değiştirmeden yalnızca kalabalığa yeşil yakmak bile iki yıldız getirir', () => {
  assert.ok(starsOf(play('bahariye').r.score) >= 2);
});

test('yıldızlar geçer nottan sayılır', () => {
  assert.deepEqual(
    [59, 60, 73, 74, 86, 87].map((s) => starsOf(s)),
    [0, 1, 1, 2, 2, 3],
  );
  assert.equal(starsOf(69, 70), 0);
});

test('kontrolör: sarı ve tüm kırmızı sırayla gelir; tut yeşili sabitler, geç evreyi keser', () => {
  const s = one('bahariye');
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

test('bekleyen kollar söylenir, korna çalar', () => {
  const s = one('bahariye');
  while (!s.done) step(s);
  assert.ok(s.log.some((x) => x.horn));
});

test('yanan yeşil tutulunca bitmez; başka evreye dokununca güvenle oraya geçilir', () => {
  const net = createNet(level('sahil').spec);
  const s = net.sims[0];
  runNet(net, 2);
  setHold(s, true);
  runNet(net, 40);
  assert.equal(s.ctl.phase, 0);
  assert.equal(signal(s, 'W.T'), 'green');
  skipTo(s, 1);
  assert.equal(s.ctl.hold, false);
  runNet(net, 3);
  assert.equal(signal(s, 'W.T'), 'amber');
  runNet(net, 4);
  assert.equal(s.ctl.phase, 1);
  assert.equal(signal(s, 'N.L'), 'green');
});

/** Olayların sonunu görmek için: bölüm süresi uzun, süreleri dengeli Ataşehir (çok şeritli, kilitlenmez). */
function long() {
  const s = one('atasehir', { duration: 999, events: [] });
  applyPlan(s, { ...s.plan, phases: s.plan.phases.map((p, i) => ({ ...p, green: [8, 26, 10][i] })) });
  return s;
}

test('olaya ekip gönderilince olay çabuk kalkar; gönderilmezse şerit uzun süre kapalı', () => {
  const pair = [true, false].map((send) => {
    const s = long();
    breakdownNow(s, 'E.T', 'arıza', 150);
    while (!s.incidents.length && !s.done) step(s);
    const i = s.incidents[0];
    if (send) dispatch(s, i.id);
    while (i.cleared === undefined && s.t < 400 && !s.done) step(s);
    return i.cleared! - i.at;
  });
  assert.ok(pair[0] < 30, `ekiple ${pair[0]}`);
  assert.ok(pair[1] > 140, `ekipsiz ${pair[1]}`);
});

test('düğün konvoyu kolu kapatır; makam konvoyu ışığa bakmaz ve caddeyi baştan sona geçer', () => {
  const w = runNet(createNet(level('bagcilar').spec), 90);
  const salon = w.sims[1];
  assert.ok(salon.incidents.some((i) => i.kind === 'wedding' && i.cleared === undefined));
  assert.ok(!salon.cars.some((c) => c.mv[0] === 'S' && c.s > c.path.stop && c.s < c.path.boxOut && c.born > 45));
  const v = play('sahil', { tuned: true });
  const [k, b, c] = v.net.sims;
  assert.equal(k.vip.n, 5);
  assert.equal(k.vip.passed, 5);
  // konvoy (polis ve dört makam aracı) üç kavşaktan da geçti
  assert.ok(b.vip.passed === 5 && c.vip.passed === 5, `${b.vip.passed} ${c.vip.passed}`);
  assert.ok(v.r.parts.some((p) => p.label === 'Konvoy'));
});

test('eğik bakışta yolun güneyindeki binaların çatısı yola taşmaz; mahalle komşu kavşağa taşmaz', () => {
  for (const l of LEVELS) {
    const xs = l.spec.nodes.map((n) => n.x);
    l.spec.nodes.forEach((n, i) => {
      const j = buildJunction(n.legs);
      const reach = { ...(i ? { W: (xs[i] - xs[i - 1]) / 2 - 1 } : {}), ...(i + 1 < xs.length ? { E: (xs[i + 1] - xs[i]) / 2 - 1 } : {}) };
      const sc = makeScenery(j, l.spec.seed, n.landmarks, reach);
      for (const b of sc.blocks) {
        if (b.sy < 0 || !b.hRoad) continue;
        for (const k of sc.buildings) {
          if (k.landmark === 'cami' || k.x + k.w < b.x0 || k.x > b.x1 || k.y < b.y0) continue;
          assert.ok(k.y - (k.floors * 3 + 0.8) * OBL_Y >= b.cy, `${n.id} çatı yolda`);
        }
      }
      for (const k of sc.buildings) {
        if (reach.E) assert.ok(k.x + k.w <= reach.E + 2, `${n.id} doğuya taştı`);
        if (reach.W) assert.ok(k.x >= -reach.W - 2, `${n.id} batıya taştı`);
      }
    });
  }
});

test('zorluk: rahatta aynı plan daha az gecikir; çekici kapatılan şeritten gelir, iş bitince şerit açılır', () => {
  const r = report(run(createNet(level('bahariye').spec, 'rahat').sims[0]));
  const n = report(run(createNet(level('bahariye').spec, 'normal').sims[0]));
  assert.ok(r.score > n.score, `${r.score} ${n.score}`);
  const s = long();
  breakdownNow(s, 'E.T', 'arıza');
  while (!s.incidents.length && !s.done) step(s);
  const i = s.incidents[0];
  dispatch(s, i.id);
  let closed = false;
  while ((i.team!.tow!.done === undefined || s.t < i.team!.tow!.done) && s.t < 400 && !s.done) {
    step(s);
    closed ||= !!s.closeOut[i.team!.leg];
  }
  assert.ok(closed && i.cleared !== undefined && !s.closeOut[i.team!.leg]);
});

test('sinyal arızası: ışıklar sarı flaşörde, kavşak dur-bak-geç işler ve kaza olmaz; ekip gelince ışıklar tüm kırmızıyla açılır', () => {
  const s = one('incirli', { events: [], duration: 999 });
  run(s, 20);
  fire(s, { at: 0, kind: 'fault', sec: 300, text: 'arıza' });
  assert.equal(signal(s, 'W.T'), 'amber');
  assert.equal(signal(s, 'N.P'), 'red');
  // kavşağa giren araçlar: duruş çizgisini geçen
  const crossed = new Set<number>();
  for (let k = 0; k < 600; k++) {
    step(s);
    for (const c of s.cars) if (c.s > c.path.stop) crossed.add(c.id);
  }
  assert.equal(s.crashes.length, 0, 'dur-bak-geçte kaza');
  assert.ok(crossed.size > 12, `arızada geçen ${crossed.size}`);
  const f = s.incidents.find((i) => i.kind === 'fault')!;
  dispatch(s, f.id);
  while (f.cleared === undefined && s.t < 200) step(s);
  assert.ok(f.cleared! - f.team!.sent < 30, 'usta çabuk onardı');
  assert.equal(s.ctl.stage, 'allred');
  run(s, 5);
  assert.notEqual(signal(s, 'W.T'), 'amber');
});

test('dedektör: akım kesilen yeşil erken biter, kimsenin beklemediği evre atlanır', () => {
  const quiet = (actuated: boolean) => {
    const s = one('kusdili', { events: [], duration: 999 });
    s.spec = { ...s.spec, demand: s.spec.demand.filter((d) => d.mv[0] === 'N' || d.mv[0] === 'S'), peds: [] };
    // açılışta yola çıkmış doğu-batı araçları da kalksın
    s.cars = s.cars.filter((c) => c.mv[0] === 'N' || c.mv[0] === 'S');
    applyPlan(s, { ...s.plan, actuated });
    let greenEW = 0;
    for (let k = 0; k < 1500; k++) {
      step(s);
      if (s.ctl.phase === 2 && s.ctl.stage === 'green') greenEW += 0.1;
    }
    return { greenEW, s };
  };
  const fixed = quiet(false);
  const act = quiet(true);
  // doğu-batıda kimse yok: dedektör o evreyi hiç yakmaz, sabit plan 38 saniyesini harcar
  assert.ok(fixed.greenEW > 60, `sabit ${fixed.greenEW}`);
  assert.ok(act.greenEW < 1, `dedektör ${act.greenEW}`);
  assert.ok(report(act.s).delay < report(fixed.s).delay);
});

test('mühendis önerisi: kalabalık ışığa çok yeşil, sarı ve tüm kırmızı sınırlarda', () => {
  const s = one('bahariye', { events: [] });
  run(s, 40);
  const a = advise(s);
  assert.ok(a.phases[0].green > a.phases[1].green, 'kuzey-güney kalabalık');
  assert.ok(a.phases[0].dos > 1, 'ters plan kalabalığı taşımıyor');
  assert.ok(a.amber >= 3 && a.amber <= 6 && a.allRed >= 1 && a.allRed <= 5);
});

test('yeşil dalga: döngüler eşitlenir, birkaç evrede her kavşak ana yeşilini yolculuk süresi kadar geç yakar', () => {
  const net = createNet({ ...level('vatan').spec, events: [] });
  const xs = net.sims.map((s) => nodeX(net, s));
  runNet(net, 12);
  greenWave(net.sims, xs);
  const C = cycleOf(net.sims[0].plan);
  for (const s of net.sims) assert.equal(cycleOf(s.plan), C);
  runNet(net, C * 3);
  for (let i = 1; i < net.sims.length; i++) assert.ok(Math.abs(waveError(net.sims, xs, i)) < 1.5, `${net.sims[i].node} ${waveError(net.sims, xs, i)}`);
  // çizelge: ikinci kavşağın ana yeşili, ilkininkinden yolculuk süresi kadar sonra başlar
  const g0 = forecast(net.sims[0], 'W.T', C * 2, 0.5);
  const g1 = forecast(net.sims[1], 'W.T', C * 2, 0.5);
  const start = (g: string[]) => g.findIndex((x, k) => k > 0 && x === 'green' && g[k - 1] !== 'green');
  const lag = (((start(g1) - start(g0)) * 0.5) % C + C) % C;
  assert.ok(Math.abs(lag - (xs[1] - xs[0]) / (13 * 0.9)) < 2, `ofset ${lag}`);
  assert.ok(mainPhase(net.sims[0]) >= 0);
});

test('yağmur bölümün ortasında başlar: araçlar yavaşlar', () => {
  const s = one('kusdili', { events: [] });
  const dry = speedOf(s, 'N');
  fire(s, { at: 0, kind: 'rain', text: 'yağmur' });
  assert.ok(s.wet && speedOf(s, 'N') < dry);
});

test('kırmızıda tutulan ışık sırası gelince atlanır; tek kalan ışık yeşilde kalır', () => {
  const s = one('atasehir', { events: [], duration: 999 });
  applyPlan(s, { ...s.plan, phases: s.plan.phases.map((p, i) => ({ ...p, off: i === 1 })) });
  const seen = new Set<number>();
  for (let k = 0; k < 2000; k++) {
    step(s);
    if (s.ctl.stage === 'green') seen.add(s.ctl.phase);
  }
  assert.ok(!seen.has(1), 'kırmızıda tutulan ışık yeşil yandı');
  assert.ok(seen.has(0) && seen.has(2));
  // yalnızca biri açık: yanan yeşil bitmez
  applyPlan(s, { ...s.plan, phases: s.plan.phases.map((p, i) => ({ ...p, off: i !== s.ctl.phase })) });
  while (s.ctl.stage !== 'green') step(s);
  const only = s.ctl.phase;
  run(s, 120);
  assert.equal(s.ctl.phase, only);
  assert.equal(s.ctl.stage, 'green');
});

test('her ışığın kendi sarısı ve hepsi kırmızısı: yalnızca o ışık söndükten sonra geçerli', () => {
  const s = one('bahariye', { events: [], duration: 999 });
  applyPlan(s, { ...s.plan, phases: s.plan.phases.map((p, i) => (i === 0 ? { ...p, amber: 6, allRed: 4 } : p)) });
  assert.equal(cycleOf(s.plan), s.plan.phases[0].green + 6 + 4 + s.plan.phases[1].green + 3 + 2);
  const time = (from: 'green' | 'amber', to: 'amber' | 'allred' | 'green') => {
    while (s.ctl.stage !== from) step(s);
    const t0 = s.t;
    while (s.ctl.stage !== to) step(s);
    return { phase: s.ctl.phase, sec: s.t - t0 };
  };
  // 0. ışığın sarısı 6, hepsi kırmızısı 4; 1. ışığınki kavşağın (3 ve 2)
  while (!(s.ctl.phase === 0 && s.ctl.stage === 'green')) step(s);
  assert.ok(Math.abs(time('amber', 'allred').sec - 6) < 0.15);
  assert.ok(Math.abs(time('allred', 'green').sec - 4) < 0.15);
  assert.ok(Math.abs(time('amber', 'allred').sec - 3) < 0.15);
  assert.ok(Math.abs(time('allred', 'green').sec - 2) < 0.15);
});

test('ara sokaklar: ışıksız; sokaktan çıkan yol verip katılır, kimi araç sokağa sapar; binalar sokağın üstüne düşmez', () => {
  const net = createNet(level('levent').spec);
  let merged = 0;
  let off = 0;
  const seen = new Set<number>();
  while (!net.done) {
    stepNet(net);
    for (const s of net.sims) {
      for (const c of s.cars)
        if (c.enter && !seen.has(c.id)) {
          seen.add(c.id);
          merged++;
        }
      for (const g of s.ghosts)
        if (g.side && !seen.has(-g.id)) {
          seen.add(-g.id);
          off++;
        }
      // katılan araç başka araçla üst üste binmez: şeritte önündekiyle arasında boşluk var
      for (const c of s.cars)
        if (c.enter && c.s - c.enter.s < 0.3)
          for (const o of s.cars) if (o !== c && o.path === c.path && o.s > c.s) assert.ok(o.s - o.len - c.s > 2, `${s.node} ${c.mv}`);
    }
  }
  assert.ok(merged > 10, `katılan ${merged}`);
  assert.ok(off > 3, `sapan ${off}`);
  for (const s of net.sims) {
    for (const x of s.sides) {
      const g = s.j.legs[x.leg]!;
      assert.ok(x.at > g.stop + 30 && x.at < g.len - 10, `${s.node} ${x.leg} ${x.at}`);
    }
    const sc = makeScenery(s.j, s.spec.seed, s.spec.landmarks, {}, s.sides);
    for (const t of sc.streets)
      for (const b of sc.buildings) assert.ok(b.x + b.w <= t.x0 || b.x >= t.x1 || b.y + b.d <= t.y0 || b.y >= t.y1, `${s.node} ${t.x.name} binası`);
  }
});

test('ara sokak kuralı: kapalı ağızdakiler dolaşır; dur levhasında araya dalan olmaz', () => {
  const run = (rule: 'yield' | 'stop' | 'closed') => {
    const net = createNet({ ...level('levent').spec, events: [], duration: 300 });
    for (const s of net.sims) s.sides.forEach((_, i) => setSideRule(s, i, rule));
    runNet(net);
    return net.sims;
  };
  const closed = run('closed');
  assert.ok(closed.every((s) => s.sides.every((x) => x.queue.length === 0)), 'kapalı sokakta bekleyen kalmaz');
  assert.ok(closed.every((s) => !s.cars.some((c) => c.enter)), 'kapalı sokaktan katılan olmaz');
  const stop = run('stop');
  assert.equal(stop.reduce((m, s) => m + s.cutIns, 0), 0);
  assert.ok(stop.every((s) => s.sides.every((x) => x.rule === 'stop')));
});

test('günün kavşağı: aynı gün aynı kavşak, başka gün başka; talep ve olaylar geçerli', () => {
  const a = freeLevel(20261102, true);
  const b = freeLevel(20261102, true);
  const c = freeLevel(20261103, true);
  assert.deepEqual(a.spec, b.spec);
  assert.notEqual(a.spec.seed, c.spec.seed);
  for (const l of [a, c, freeLevel(42, false)]) {
    for (let i = 1; i < l.spec.events.length; i++) assert.ok(l.spec.events[i].at >= l.spec.events[i - 1].at);
    const net = runNet(createNet(l.spec));
    assert.ok(net.sims.some((s) => s.delivered > 5), l.spec.id);
  }
});

test('kıyı semtinde deniz: kıyının ötesinde bina ve sokak yok; plazalı semtte yüksek binalar var', () => {
  const sahil = level('sahil').spec;
  const n = createNet(sahil).sims[0];
  const sc = makeScenery(n.j, n.spec.seed, n.spec.landmarks, {}, n.sides, sahil.city);
  const at = sahil.city!.sea!.at;
  assert.ok(sc.buildings.every((b) => b.y + b.d < at));
  assert.ok(sc.roads.every((r) => (r.vertical ? Math.max(r.from, r.to) < at : r.at < at)));
  assert.ok(sc.roads.some((r) => !r.vertical && Math.abs(r.at - (at - 8)) < 0.01), 'sahil yolu');
  const lev = level('levent').spec;
  const m = createNet(lev).sims[0];
  const tall = makeScenery(m.j, m.spec.seed, m.spec.landmarks, {}, m.sides, lev.city).buildings.filter((b) => b.floors >= 10).length;
  assert.ok(tall > 30, `plaza ${tall}`);
});
