import { cycleOf, cyclePos, faulty, nextIndex } from './controller';
import { crossTime, yields } from './junction';
import { allRedAt, amberAt, DIFFICULTY, legOf, LIMITS, MIN_GREEN, PED_START, PED_V, turnOf, type MoveId, type Plan } from './model';
import type { Sim } from './sim';

/*
 * Trafik mühendisinin hesapları, sade adlarla. Sayım: her yönden dakikada kaç araç geliyor.
 * Doluluk: evrenin yeşili, gelen aracın ne kadarını geçirebiliyor (%100'ü aşarsa kuyruk büyür).
 * Öneri: Webster yöntemiyle döngü ve yeşil dağılımı; sarı, fren mesafesinden; tüm kırmızı, kutunun
 * boyundan. Testlerdeki "iyi oyuncu" bu önerileri kullanır.
 */

/** Bir şeridin yeşilde saniyede geçirebildiği araç (saatte ~1800). Dönüşte biraz az. */
export const SAT = 0.5;
const SAT_TURN = 0.42;

/** Sayım: hareketin dakikadaki aracı. İlk yarım dakikada sayım azken bölümün beklenen talebiyle karışır. */
export function flowOf(s: Sim, mv: MoveId) {
  const l = s.counts[mv] ?? [];
  const win = Math.min(60, Math.max(1, s.t));
  const seen = l.filter((t) => s.t - t <= win).length;
  const d = s.spec.demand.find((x) => x.mv === mv);
  const plan = d ? (typeof d.rate === 'number' ? d.rate : d.rate[0][1]) * DIFFICULTY[s.diff].demand : 0;
  const w = Math.min(1, s.t / 30);
  return ((seen / win) * 60) * w + plan * (1 - w);
}

/** Evrenin yükü (akım oranı): kollardan en sıkışığı. Kolun aracı, evrede kullanabildiği şeritlere bölünür. */
export function loadOf(s: Sim, moves: MoveId[]) {
  let y = 0;
  const legs = new Set(moves.filter((m) => turnOf(m) !== 'P').map(legOf));
  for (const d of legs) {
    const g = s.j.legs[d];
    if (!g) continue;
    const mine = moves.filter((m) => legOf(m) === d && turnOf(m) !== 'P');
    // izinli sola dönüş (karşıdan geleni bekleyen) iki kat yer kaplar
    const q = mine.reduce((m, mv) => m + (flowOf(s, mv) / 60) * (moves.some((o) => o !== mv && yields(mv, o)) ? 2 : 1), 0);
    const lanes = g.spec.lanes.filter((l) => mine.some((mv) => l.includes(turnOf(mv)))).length;
    if (!lanes) continue;
    const sat = mine.every((mv) => turnOf(mv) !== 'T') ? SAT_TURN : SAT;
    y = Math.max(y, q / (lanes * sat));
  }
  return y;
}

/** Kayıp süre: her evre geçişinde kimsenin geçemediği saniye (sarının sonu ve tüm kırmızı). */
const lostOf = (plan: Plan) => plan.phases.reduce((m, _, i) => m + amberAt(plan, i) + allRedAt(plan, i), 0);

/** Yayanın karşıya geçebilmesi için evrenin en kısa yeşili. */
function pedMin(s: Sim, moves: MoveId[]) {
  return moves.filter((m) => turnOf(m) === 'P').reduce((m, mv) => Math.max(m, Math.ceil(PED_START + crossTime(s.j.legs[legOf(mv)]!, PED_V) * 0.5)), MIN_GREEN);
}

export interface Advice {
  /** Evre evre yük, doluluk (0–1+) ve önerilen yeşil. */
  phases: { load: number; dos: number; green: number }[];
  cycle: number;
  /** Önerilen sarı ve tüm kırmızı. */
  amber: number;
  allRed: number;
  /** Toplam yük: 0,9'u aşarsa kavşak bu talebi taşımaz, ne yapılsa kuyruk olur. */
  total: number;
}

/**
 * Webster: döngü = (1,5 × kayıp + 5) / (1 − toplam yük); yeşil, evrelere yükleri oranında. Sarı
 * = 1 + hız / 6 (algılama ve fren); tüm kırmızı = (kutu + kamyon boyu) / dönüş hızı.
 */
export function advise(s: Sim): Advice {
  const plan = s.plan;
  const loads = plan.phases.map((p) => loadOf(s, p.moves));
  const total = loads.reduce((a, b) => a + b, 0);
  const L = lostOf(plan);
  // şehir içinde döngü 40–90 saniyede tutulur: uzun döngüde kısa yolların kuyruğu komşuya taşar
  const C0 = Math.max(40, Math.min(90, total < 0.92 ? (1.5 * L + 5) / (1 - total) : 90));
  const eff = C0 - L;
  const greens = plan.phases.map((p, i) => Math.round(Math.max(pedMin(s, p.moves), Math.min(LIMITS.green[1], total > 0 ? (eff * loads[i]) / total : eff / plan.phases.length))));
  const C = cycleOf(plan);
  const phases = plan.phases.map((p, i) => ({ load: loads[i], dos: p.green > 0 ? (loads[i] * C) / p.green : 0, green: greens[i] }));
  const v = Math.max(...Object.values(s.j.legs).map((g) => g.spec.v ?? 13.9));
  const box = Math.max(s.j.box.x1 - s.j.box.x0, s.j.box.y1 - s.j.box.y0);
  return {
    phases,
    cycle: Math.round(greens.reduce((a, b) => a + b, 0) + L),
    amber: Math.max(LIMITS.amber[0], Math.min(LIMITS.amber[1], Math.round(1 + v / 6))),
    allRed: Math.max(1, Math.min(LIMITS.allRed[1], Math.round((box + 7) / 8))),
    total,
  };
}

/**
 * Işığın adı panelde: yeşil verdiği yollar ("Altıyol · Moda"). Yalnızca sola dönüş yakıyorsa bu da
 * yazılır (aynı yolların düz ışığından ayrılsın); yalnızca yaya geçidi yakıyorsa "Yayalar".
 */
export function lightName(s: Sim, i: number) {
  const moves = s.plan.phases[i]?.moves ?? [];
  const cars = moves.filter((m) => turnOf(m) !== 'P');
  const names = [...new Set(cars.map((m) => s.spec.legs[legOf(m)]?.name))].filter(Boolean).join(' · ');
  if (!cars.length) return 'Yayalar';
  return cars.every((m) => turnOf(m) === 'L') ? `${names} · sola dönüş` : names;
}

/**
 * Işığın yeşile kaç saniye kaldığı (oyuncu dokunmazsa). Yeşil "kalsın" diye tutuluyorsa ya da arıza
 * varsa null: ne zaman biteceğini oyuncu bilir.
 */
export function untilGreen(s: Sim, i: number): number | null {
  const { ctl, plan } = s;
  if (faulty(s) || ctl.hold || plan.phases[i]?.off) return null;
  const n = plan.phases.length;
  const g = (k: number) => plan.phases[k].green;
  const tail = (k: number) => amberAt(plan, k) + allRedAt(plan, k);
  const c = ctl.phase;
  let t = ctl.stage === 'green' ? Math.max(ctl.cut ? MIN_GREEN - ctl.t : g(c) + (ctl.bonus ?? 0) - ctl.t, 0) + tail(c) : ctl.stage === 'amber' ? tail(c) - ctl.t : allRedAt(plan, c) - ctl.t;
  let k = nextIndex(s);
  for (let guard = 0; k !== i && guard < n; guard++) {
    if (!plan.phases[k].off) t += g(k) + tail(k);
    k = (k + 1) % n;
  }
  return Math.max(0, t);
}

/* ───────────── Yeşil dalga ───────────── */

/** Caddenin ana evresi: doğuya düz giden (W.T) yeşil yanan evre. */
export const mainPhase = (s: Sim) => s.plan.phases.findIndex((p) => p.moves.includes('W.T'));

/** İki kavşak arası yolculuk süresi (sn): hız sınırının ~%90'ıyla. */
export function travel(sims: Sim[], xs: number[], i: number) {
  let t = 0;
  for (let k = 1; k <= i; k++) t += (xs[k] - xs[k - 1]) / ((sims[k].spec.legs.W?.v ?? 12) * 0.9);
  return t;
}

/**
 * Yeşil dalga: bütün kavşakların döngüsü en uzununa eşitlenir (fark ana evrenin yeşiline, sığmazsa
 * öbürlerine), sonra her kavşağın ana yeşili, ilk kavşaktan oraya yolculuk süresi kadar kaydırılır.
 * Kayma bir anda değil, sonraki birkaç evrenin yeşili uzatılıp kısılarak yapılır (geçiş döngüsü).
 */
export function greenWave(sims: Sim[], xs: number[]) {
  const C = Math.max(...sims.map((s) => cycleOf(s.plan)));
  for (const s of sims) {
    let diff = C - cycleOf(s.plan);
    const m = mainPhase(s);
    const phases = s.plan.phases.map((p) => ({ ...p }));
    const order = [m, ...phases.map((_, i) => i).filter((i) => i !== m)].filter((i) => i >= 0);
    for (const i of order) {
      const add = Math.min(diff, LIMITS.green[1] - phases[i].green);
      phases[i].green += add;
      diff -= add;
    }
    s.plan = { ...s.plan, phases };
  }
  const m0 = mainPhase(sims[0]);
  const base = cyclePos(sims[0], m0);
  sims.forEach((s, i) => {
    s.ctl.hold = false;
    s.ctl.next = null;
    s.ctl.cut = false;
    if (!i) {
      s.ctl.shift = 0;
      return;
    }
    const want = (((base - travel(sims, xs, i)) % C) + C) % C;
    const now = cyclePos(s, mainPhase(s));
    // ileride ise geri çek (yeşili uzat), geride ise öne al (kıs): kısa olan yoldan
    let lag = (((now - want) % C) + C) % C;
    if (lag > C / 2) lag -= C;
    s.ctl.shift = lag;
  });
}

/** Kavşağın dalgadan kayması (sn): 0'a yakınsa araç yeşile denk gelir. */
export function waveError(sims: Sim[], xs: number[], i: number) {
  const C = cycleOf(sims[0].plan);
  if (!i || cycleOf(sims[i].plan) !== C) return i ? Infinity : 0;
  const want = cyclePos(sims[0], mainPhase(sims[0])) - travel(sims, xs, i);
  let e = (((cyclePos(sims[i], mainPhase(sims[i])) - want) % C) + C) % C;
  if (e > C / 2) e -= C;
  return e;
}
