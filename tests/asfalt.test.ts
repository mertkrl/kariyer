import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FILL_TO, chuteFull, EMPTY, GRAVEL, H, HOT, OLD, PACKED, ROAD, ROLLER_W, RUBBLE, SAW_REACH, SET, SOIL, TACK, W, WATER, WET, DENSE, ROLLER_MAX, bondOf, checklist, createWorld, dig, rake, tamp, soilIntrusion, surfaceTemp, probe, railSpill, driveRoller, holeVolume, idx, openToTraffic, pour, rubbleLeft, sawCut, spray, step, surfaceAt, type LevelSpec, type World } from '../src/games/asfalt/model';
import { crewTitle, LEVELS, PASS_SCORE } from '../src/games/asfalt/levels';

const SPEC: LevelSpec = { id: 'deneme', seed: 7, center: 120, half: 24, depth: 22 };
const run = (w: World, n: number) => {
  for (let k = 0; k < n; k++) step(w);
};
const count = (w: World, c: number) => w.cells.reduce((s, v) => s + (v === c ? 1 : 0), 0);

/** Çukuru kat kat, elle döşer: alt dolgu toprak, sonra mıcır, en üstte sıcak asfalt. */
function layer(w: World, from: number, to: number, c: number) {
  for (let x = w.hole[0]; x <= w.hole[1]; x++)
    for (let y = from; y < to; y++) {
      const i = idx(x, y);
      if (w.cells[i] !== EMPTY) continue;
      w.cells[i] = c;
      w.heat[i] = c === HOT ? 255 : 0;
      w.flags[i] = 0;
      w.used[c === SOIL ? 'soil' : c === GRAVEL ? 'gravel' : 'asphalt']++;
    }
}

/**
 * Silindiri çukurun üstünden gidip gelerek geçirir: oyuncunun yaptığı gibi her seferinde hedefe
 * varıp durana dek sürer. Sıkışma geçişle artar; titreşimli tamburla dört geçiş bir katı sıkıştırır.
 */
function rollPasses(w: World, n = 4) {
  driveRoller(w, 0);
  w.roller!.x = Math.max(0, w.hole[0] - ROLLER_W);
  w.roller!.v = 0;
  for (let k = 0; k < n; k++) {
    driveRoller(w, k % 2 === 0 ? w.hole[1] + 6 : w.hole[0] - ROLLER_W - 6);
    const r = w.roller!;
    for (let t = 0; t < 1500 && (r.x !== r.target || r.v !== 0); t++) step(w);
  }
}

/** Kenarları kırığın hemen gerisinden keser: içeriden dışarı ilk geçerli kesim. */
function cut(w: World) {
  for (const side of [-1, 1]) {
    const edge = side < 0 ? w.hole[0] : w.hole[1];
    for (let d = 1; d <= SAW_REACH; d++) if (sawCut(w, edge + side * d) === 'ok') break;
  }
}

/** Molozu kürekle alır gibi: moloz hücreleri boşalır. */
function clearRubble(w: World) {
  for (let i = 0; i < w.cells.length; i++)
    if (w.cells[i] === SOIL) {
      w.cells[i] = EMPTY;
      w.flags[i] = 0;
    }
}

/** Kenarlara ve tabana yapıştırıcı püskürtür. */
function tack(w: World) {
  for (let y = ROAD; y < ROAD + 4; y++) {
    spray(w, w.hole[0], y, 2);
    spray(w, w.hole[1], y, 2);
  }
  for (let x = w.hole[0]; x <= w.hole[1]; x += 2) spray(w, x, surfaceAt(w, x) - 1, 2);
}

test('aynı tohum aynı çukuru açar, çukur yol hizasından aşağıdadır', () => {
  const a = createWorld(SPEC);
  const b = createWorld(SPEC);
  assert.deepEqual(a.cells, b.cells);
  assert.ok(holeVolume(a) > 400);
  for (let x = 0; x < W; x++) assert.ok(surfaceAt(a, x) >= ROAD);
  for (const l of LEVELS) assert.ok(holeVolume(createWorld(l.spec)) > 300, l.spec.id);
});

test('dökülen toprak çukurun dibine iner, yolun üstünde kalmaz', () => {
  const w = createWorld(SPEC);
  for (let k = 0; k < 60; k++) pour(w, 'soil', 120, 40);
  run(w, 400);
  assert.equal(w.used.soil, count(w, SOIL) - createWorld(SPEC).cells.filter((c) => c === SOIL).length);
  for (let x = 0; x < W; x++) for (let y = 0; y < ROAD - 2; y++) assert.notEqual(w.cells[idx(x, y)], SOIL);
});

test('sıcak asfalt yayılır, soğur ve donar', () => {
  const w = createWorld(SPEC);
  for (let k = 0; k < 40; k++) {
    pour(w, 'asphalt', 120, 70);
    run(w, 3);
  }
  run(w, 2500);
  assert.equal(count(w, HOT), 0);
  assert.ok(w.used.asphalt > 100);
  assert.equal(count(w, SET), w.used.asphalt);
});

test('suya dökülen asfalt sulanır, muhtar fark eder', () => {
  const w = createWorld({ ...SPEC, waterTop: 6 });
  assert.ok(count(w, WATER) > 100);
  for (let k = 0; k < 20; k++) pour(w, 'asphalt', 120, 75);
  run(w, 200);
  assert.ok(w.events.has('wet'));
  assert.ok(w.flags.some((f, i) => (f & WET) !== 0 && (w.cells[i] === HOT || w.cells[i] === SET)));
});

test('yolun üstüne düşen su iki uçtan akıp gider', () => {
  const w = createWorld(SPEC);
  for (let x = 2; x < 30; x++) w.cells[idx(x, ROAD - 1)] = WATER;
  run(w, 600);
  for (let x = 0; x < 40; x++) assert.notEqual(w.cells[idx(x, ROAD - 1)], WATER);
});

test('silindir yol hizasının üstünü önüne katar, dolu sütunu sıkıştırır, donmuş tümsekte durur', () => {
  const w = createWorld(SPEC);
  layer(w, ROAD, H, GRAVEL);
  for (let x = w.hole[0]; x < w.hole[0] + 10; x++) w.cells[idx(x, ROAD - 3)] = SOIL;
  run(w, 5);
  // gidip gelerek dört geçiş: sıkışma geçişle artar
  for (const target of [w.hole[0] + 40, w.hole[0] - ROLLER_W, w.hole[0] + 40, w.hole[0] - ROLLER_W, w.hole[0] + 20]) {
    driveRoller(w, target);
    run(w, 400);
  }
  const r = w.roller!;
  assert.equal(r.x, w.hole[0] + 20);
  for (let x = Math.floor(r.x); x < r.x + ROLLER_W; x++) {
    assert.ok(surfaceAt(w, x) >= ROAD);
    assert.ok(w.flags[idx(x, ROAD + 2)] & PACKED);
  }
  // önünde ince donmuş bir sızıntı: ezer geçer; arkasında üç hücrelik donmuş tümsek: durur
  const film = Math.floor(r.x) + ROLLER_W + 2;
  w.cells[idx(film, ROAD - 1)] = SET;
  const wall = film + 6;
  for (let y = ROAD - 3; y < ROAD; y++) w.cells[idx(wall, y)] = SET;
  driveRoller(w, W);
  run(w, 200);
  assert.ok(w.events.has('blocked'));
  assert.ok(r.x + ROLLER_W <= wall + 1);
});

test('kat kat döşenip silindirlenen yama yüksek, tek seferde toprakla kapatılan düşük puan alır', () => {
  // gerçek serim: her kat ayrı silindirlenir, asfalt sıkışma payıyla yol hizasının üstüne serilir
  const good = createWorld(SPEC);
  const roll = () => rollPasses(good);
  // önce kenarlar kesilir, dipteki ve kesimden düşen moloz temizlenir
  cut(good);
  clearRubble(good);
  layer(good, ROAD + 12, H, SOIL);
  roll();
  layer(good, ROAD + 4, H, GRAVEL);
  roll();
  tack(good);
  layer(good, ROAD - 2, H, HOT);
  roll();
  run(good, 4500); // asfalt soğumadan yol açılmaz
  const g = openToTraffic(good);

  const bad = createWorld(SPEC);
  layer(bad, ROAD, H, SOIL);
  const b = openToTraffic(bad);

  assert.ok(g.score >= 85, `iyi yama ${g.score}: ${JSON.stringify({ ...g, profile: 0 })}`);
  assert.ok(b.score < 60, `kötü yama ${b.score}`);
  assert.ok(b.dips > g.dips);
  assert.ok(g.noGravel <= 2); // en sığ kenarda dipteki moloz kalır
  assert.ok(b.thin > 0);
  assert.equal(g.profile.length, W);
});

test('suyun içine dökülen yama trafiğe açılınca çöker', () => {
  const w = createWorld({ ...SPEC, waterTop: 4 });
  layer(w, ROAD, ROAD + 4, HOT);
  run(w, 30);
  const r = openToTraffic(w);
  assert.ok(r.wet > 0);
  assert.ok(r.dips > 0);
});

test('mesai sonu unvanı işlerin ortalamasına göre yükselir', () => {
  assert.equal(crewTitle([]).avg, 0);
  assert.equal(crewTitle([95, 92]).title, 'Asfaltın Ustası');
  assert.equal(crewTitle([80, 71]).avg, 76);
  assert.equal(crewTitle([80, 71]).title, 'Kıdemli Silindirci');
  assert.equal(crewTitle([60, 50]).title, 'Mesai Kurtaran');
  assert.equal(crewTitle([20, 40]).title, 'Kasis Mimarı');
});

test('mühendis senaryoları: silindirsiz, soğukken silindirlenen ve asfaltsız yama teslim alınmaz', () => {
  const roll = (w: World) => rollPasses(w);
  const build = (rollEach: boolean, coldAsphalt = false, asphalt = true) => {
    const w = createWorld(SPEC);
    cut(w);
    clearRubble(w);
    layer(w, ROAD + 12, H, SOIL);
    run(w, 30);
    if (rollEach) roll(w);
    layer(w, ROAD + (asphalt ? 4 : -2), H, GRAVEL);
    run(w, 30);
    if (rollEach) roll(w);
    if (asphalt) {
      tack(w);
      layer(w, ROAD - 2, H, HOT);
      run(w, coldAsphalt ? 3000 : 30);
      if (rollEach) roll(w);
      run(w, 4500); // asfalt soğusun
    }
    return openToTraffic(w);
  };
  assert.ok(build(true).score >= PASS_SCORE);
  assert.ok(build(false).score < PASS_SCORE, 'silindirsiz');
  assert.ok(build(true, true).score < PASS_SCORE, 'soğuk asfalt');
  // silindirlenip soğumadan trafiğe açılan asfalt iz yapar
  {
    const w = createWorld(SPEC);
    cut(w);
    clearRubble(w);
    layer(w, ROAD + 4, H, GRAVEL);
    roll(w);
    tack(w);
    layer(w, ROAD - 2, H, HOT);
    roll(w);
    const r = openToTraffic(w);
    assert.ok(r.hot > 10 && r.score < build(true).score, `sıcak trafik ${r.score}`);
  }
  assert.ok(build(true, false, false).score < PASS_SCORE, 'asfaltsız');
  assert.ok(openToTraffic(createWorld(SPEC)).stuck >= 0, 'boş çukur');
  // üç gün: iyi yama güneşte, yağmurda ve donda sağlam kalır; sadece toprak ilk günden çöker
  const good = build(true);
  assert.deepEqual(good.phases.map((p) => p.weather), ['sun', 'rain', 'snow']);
  assert.ok(good.phases.every((p) => p.dips === 0), JSON.stringify(good.phases));
  const soil = createWorld(SPEC);
  layer(soil, ROAD, H, SOIL);
  const s = openToTraffic(soil);
  assert.ok(s.phases[0].dips > 10);
  // çöken yamaya gelen araç gömülür: trafik durur, yol kapanır
  assert.ok(s.stuck >= 0 && s.phases.length < 3, JSON.stringify(s.phases));
});

test('kısıtlar: kemer sıkma ödeneği doğru ve ince bir yamaya yeter; raya saçılan sayılır ve puanı keser', () => {
  const kemer = LEVELS.find((l) => l.spec.id === 'kemer')!;
  assert.ok(kemer.strictBudget);
  // en ucuz doğru yama: iki kesim, moloz alınır; yol hizasının 30 cm altına kadar mıcır, altı
  // toprak; kenar ve taban yapıştırıcısı; üstte ince asfalt (sıkışma payıyla)
  const w = createWorld(kemer.spec);
  const roll = () => rollPasses(w);
  cut(w);
  clearRubble(w);
  layer(w, ROAD + 12, H, SOIL);
  roll();
  layer(w, ROAD + 3, H, GRAVEL);
  roll();
  tack(w);
  layer(w, ROAD - 1, H, HOT);
  roll();
  for (let k = 0; k < 4500; k++) step(w);
  const r = openToTraffic(w, kemer.budget);
  assert.ok(r.cost <= kemer.budget, `${r.cost} > ${kemer.budget}`);
  assert.ok(r.cost > kemer.budget * 0.8, `ödenek gevşek kalmasın: ${r.cost}`);
  assert.ok(r.score >= PASS_SCORE, `kemer yaması ${r.score}`);

  const tram = LEVELS.find((l) => l.spec.id === 'tramvay')!;
  const t = createWorld(tram.spec);
  assert.equal(railSpill(t), 0);
  for (let x = tram.spec.rail![0]; x < tram.spec.rail![0] + 6; x++) t.cells[idx(x, ROAD - 1)] = GRAVEL;
  assert.ok(railSpill(t) > 3);
});

test('gerçek yama sırası: kesilmeyen, yapıştırılmayan ve molozlu yama aynı dolgudan daha düşük puan alır', () => {
  const roll = (w: World) => rollPasses(w);
  const build = (proper: boolean) => {
    const w = createWorld(SPEC);
    if (proper) {
      cut(w);
      clearRubble(w);
    }
    layer(w, ROAD + 12, H, SOIL);
    roll(w);
    layer(w, ROAD + 4, H, GRAVEL);
    roll(w);
    if (proper) tack(w);
    layer(w, ROAD - 2, H, HOT);
    roll(w);
    for (let k = 0; k < 4500; k++) step(w);
    return openToTraffic(w);
  };
  const good = build(true);
  const sloppy = build(false);
  assert.equal(good.uncut, 0);
  assert.equal(good.unbonded, 0);
  assert.ok(good.untacked < 5, `taban ${good.untacked}`);
  assert.equal(good.rubble, 0);
  assert.equal(sloppy.uncut, 2);
  assert.equal(sloppy.unbonded, 2);
  assert.ok(sloppy.rubble > 0);
  assert.ok(good.score - sloppy.score >= 15, `${good.score} / ${sloppy.score}`);
});

test('kesme makinesi kırığın gerisinden keser, molozu çukura düşürür; kırık yerde ya da çok uzakta kesmez', () => {
  const w = createWorld(SPEC);
  const [h0, h1] = w.hole;
  assert.equal(sawCut(w, h0 + 3), 'inside');
  assert.equal(sawCut(w, h0 - SAW_REACH - 2), 'far');
  let at = -1;
  for (let d = 1; d <= SAW_REACH && at < 0; d++) {
    const r = sawCut(w, h0 - d);
    if (r === 'ok') at = h0 - d;
    else assert.equal(r, 'cracked');
  }
  assert.ok(at >= 0);
  assert.equal(w.hole[0], at + 1);
  assert.equal(w.hole[1], h1);
  for (let y = ROAD; y < ROAD + 4; y++) assert.equal(w.cells[idx(at, y)], OLD, 'kesim yüzü dik ve sağlam');
  assert.equal(sawCut(w, at - 1), 'done');
  assert.ok(rubbleLeft(w) > 0);
  assert.ok(w.cells.some((c, i) => c === SOIL && (w.flags[i] & RUBBLE) !== 0));
  assert.equal(checklist(w).cut, false);
});

test('yapıştırıcı yalnızca havaya bakan yüze sürülür; ölçüm karotu katmanları, sıcaklığı ve mastarı okur', () => {
  const w = createWorld(SPEC);
  const n = spray(w, w.hole[0] - 1, ROAD + 1, 3);
  assert.ok(n > 0);
  assert.equal(w.tackUsed, n);
  // yolun içindeki gömülü hücreye sürülmez
  assert.equal(w.flags[idx(10, ROAD + 6)] & TACK, 0);
  assert.equal(bondOf(w).left, true);
  clearRubble(w);
  layer(w, ROAD + 4, H, GRAVEL);
  layer(w, ROAD - 2, ROAD + 4, HOT);
  const p = probe(w, (w.hole[0] + w.hole[1]) >> 1);
  assert.equal(p.deviation, 50);
  assert.equal(p.layers[0].name, 'Asfalt');
  assert.equal(p.layers[0].cm, 15);
  assert.equal(p.layers[0].temp, 160);
  assert.equal(p.layers[1].name, 'Mıcır');
  assert.equal(p.layers[1].proctor, 85);
});

test('taşıyıcı tabakaya karışan toprak kademeli zararlıdır: 2,5 cm hafif, 10 cm tam', () => {
  const w = createWorld(SPEC);
  clearRubble(w);
  const x = (w.hole[0] + w.hole[1]) >> 1;
  assert.equal(soilIntrusion(w, x), 0);
  w.cells[idx(x, ROAD + 11)] = SOIL;
  assert.equal(soilIntrusion(w, x), 0.25);
  w.cells[idx(x, ROAD + 6)] = SOIL;
  assert.equal(soilIntrusion(w, x), 1);
});

test('görünürlük: atılan malzeme sayılır, fiş puanı düşüren nedenleri sıralar, yüzey sıcaklığı ölçülür', () => {
  const w = createWorld(SPEC);
  const x = (w.hole[0] + w.hole[1]) >> 1;
  const top = surfaceAt(w, x) - 3;
  pour(w, 'gravel', x, top, 3, 9);
  run(w, 60);
  assert.equal(w.wasted, 0);
  dig(w, x, surfaceAt(w, x), 4);
  assert.ok(w.wasted > 0, 'kürekle atılan mıcır boşa sayılır');
  // dipteki moloz bedava: atınca israf sayılmaz
  const fresh = createWorld(SPEC);
  for (let xx = fresh.hole[0]; xx <= fresh.hole[1]; xx++) dig(fresh, xx, surfaceAt(fresh, xx), 3);
  assert.equal(fresh.wasted, 0);

  const sloppy = createWorld(SPEC);
  layer(sloppy, ROAD, H, SOIL);
  const r = openToTraffic(sloppy);
  assert.ok(r.reasons.length >= 3);
  for (let k = 1; k < r.reasons.length; k++) assert.ok(r.reasons[k - 1].points >= r.reasons[k].points);
  assert.ok(r.reasons.some((m) => m.label.includes('Kenar kesilmedi')));

  const hot = createWorld(SPEC);
  clearRubble(hot);
  layer(hot, ROAD + 4, H, GRAVEL);
  layer(hot, ROAD, ROAD + 4, HOT);
  assert.equal(surfaceTemp(hot), 160);
  for (let xx = hot.hole[0]; xx <= hot.hole[1]; xx++) hot.heat[idx(xx, surfaceAt(hot, xx))] = 40;
  assert.ok(surfaceTemp(hot)! < 78, 'yüzey donunca iç sıcak olsa da sıkışmaz');
});

test('silindir fiziği: ivmelenir; sıkışma geçişle artar, titreşim derine işler; titreşimle sıcak asfaltta durmak iz bırakır', () => {
  const w = createWorld(SPEC);
  clearRubble(w);
  layer(w, ROAD, H, GRAVEL);
  driveRoller(w, 0);
  const r = w.roller!;
  r.x = w.hole[0] - ROLLER_W;
  driveRoller(w, w.hole[1] + 6);
  step(w);
  assert.ok(r.v > 0 && r.v < ROLLER_MAX / 2, `ilk adımda hız ${r.v}`);
  for (let t = 0; t < 1500 && (r.x !== r.target || r.v !== 0); t++) step(w);
  const mid = (w.hole[0] + w.hole[1]) >> 1;
  const top = surfaceAt(w, mid);
  const one = w.dens[idx(mid, top)];
  assert.ok(one > 0 && one < DENSE, `tek geçiş tam sıkıştırmaz: ${one}`);
  rollPasses(w, 4);
  assert.ok(w.dens[idx(mid, surfaceAt(w, mid))] >= DENSE);
  // titreşimli tambur derine işler, statik tambur yüzeyde kalır
  const depthOf = (vibe: boolean) => {
    const v = createWorld(SPEC);
    clearRubble(v);
    layer(v, ROAD, H, GRAVEL);
    rollPasses(v, 1);
    v.roller!.vibe = vibe;
    rollPasses(v, 4);
    const t = surfaceAt(v, mid);
    let d = 0;
    while (v.flags[idx(mid, t + d)] & PACKED) d++;
    return d;
  };
  assert.ok(depthOf(true) > depthOf(false), `${depthOf(true)} / ${depthOf(false)}`);

  // titreşim açık, sıcak asfaltın üstünde durmak tamburun altını oyar
  const hot = createWorld(SPEC);
  clearRubble(hot);
  layer(hot, ROAD + 4, H, GRAVEL);
  layer(hot, ROAD, ROAD + 4, HOT);
  driveRoller(hot, mid - ROLLER_W / 2);
  hot.roller!.x = mid - ROLLER_W / 2;
  for (let t = 0; t < 200; t++) step(hot);
  assert.ok(hot.events.has('rollerMark'));
});

test('su mıcırda kaybolmaz, dibe süzülür; doymuş toprak su emmez: çukurun suyu ancak motorla gider', () => {
  const w = createWorld({ ...SPEC, waterTop: 6 });
  const before = count(w, WATER);
  layer(w, ROAD + 14, H, GRAVEL);
  run(w, 600);
  // dipteki moloz bir miktar emer, mıcır hiç yutmaz
  assert.ok(count(w, WATER) > before * 0.6, `${count(w, WATER)} / ${before}`);
  const soil = createWorld(SPEC);
  clearRubble(soil);
  layer(soil, ROAD + 10, H, SOIL);
  for (let x = soil.hole[0]; x <= soil.hole[1]; x++) for (let y = ROAD + 4; y < ROAD + 10; y++) soil.cells[idx(x, y)] = WATER;
  const pool = count(soil, WATER);
  run(soil, 1500);
  assert.ok(count(soil, WATER) > pool * 0.5, 'doymuş toprak gölü yutmaz');
});

test('tırmık malzemeyi kaybetmeden düzler; tokmak silindirin inemediği dar hendeği sıkıştırır', () => {
  const w = createWorld(SPEC);
  clearRubble(w);
  layer(w, ROAD + 4, H, GRAVEL);
  const mid = (w.hole[0] + w.hole[1]) >> 1;
  for (let y = ROAD - 4; y < ROAD + 4; y++) if (w.cells[idx(mid, y)] === EMPTY) w.cells[idx(mid, y)] = GRAVEL;
  const n = count(w, GRAVEL);
  for (let k = 0; k < 40; k++) rake(w, mid);
  assert.equal(count(w, GRAVEL), n);
  assert.ok(surfaceAt(w, mid) >= ROAD + 1, `tepe ${surfaceAt(w, mid)}`);

  const trench = LEVELS.find((l) => l.spec.id === 'dogalgaz')!;
  const t = createWorld(trench.spec);
  clearRubble(t);
  const c = (t.hole[0] + t.hole[1]) >> 1;
  layer(t, ROAD + 30, H, SOIL);
  for (let k = 0; k < 120; k++) tamp(t, c, surfaceAt(t, c));
  assert.ok(t.flags[idx(c, surfaceAt(t, c))] & PACKED, 'tokmaklanan kat sıkışır');
});

test('oluğun ölçü kesicisi: malzeme ipe gelince oluk kapanır, fazlası dökülmez', () => {
  const w = createWorld(SPEC);
  let poured = 0;
  for (let k = 0; k < 4000; k++) {
    if (!chuteFull(w, 'soil', 120)) poured += pour(w, 'soil', 120, ROAD - 24, 2, 3);
    step(w);
  }
  assert.ok(poured > 0);
  // oluğun altı ipin biraz üstüne kadar dolar, yol hizasına taşmaz
  assert.ok(surfaceAt(w, 120) <= FILL_TO.soil + 1, `${surfaceAt(w, 120)}`);
  assert.ok(surfaceAt(w, 120) > ROAD + 4, `${surfaceAt(w, 120)}`);
});

test('kademeler: ilk iş rehberli ve kenarları kesik gelir; kesme ve ölçüm sonradan açılır', () => {
  const first = LEVELS[0];
  assert.ok(first.guided);
  const w = createWorld(first.spec);
  assert.ok(checklist(w).cut);
  assert.ok(!first.tools.includes('saw') && !first.tools.includes('probe'));
  const at = (t: string) => LEVELS.findIndex((l) => l.tools.includes(t as never));
  assert.ok(at('saw') > 0 && at('probe') > at('saw'));
  for (const l of LEVELS.slice(at('probe'))) assert.ok(l.tools.includes('probe'), l.spec.id);
});
