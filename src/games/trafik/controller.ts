import { crossTime } from './junction';
import { allRedAt, amberAt, DT, legOf, MIN_GREEN, PED_START, PED_V, turnOf, type Dir, type MoveId, type Plan, type SignalState } from './model';
import type { Sim } from './sim';

/*
 * Kavşak kontrolörü: evreler sırayla yeşil, sarı ve tüm kırmızıdan geçer. Bir sonraki evrede de
 * yeşil olan hareket geçişte yanmaya devam eder. Yaya ışığı, yayanın karşıya varabileceği son
 * ana kadar yeşil kalır, sonra yanıp söner.
 * Oyuncunun müdahalesi: bir evreye geçmek (en kısa yeşil dolunca keser) ve yanan yeşili tutmak.
 * Dedektörlü kipte yeşil, yoldaki algılayıcı araç görmeyince erken biter (en uzun yeşil evrenin
 * süresidir) ve kimsenin beklemediği evre atlanır. Arızada ışıklar sarı flaşöre geçer.
 */

export const clonePlan = (p: Plan): Plan => ({ ...p, phases: p.phases.map((f) => ({ ...f, moves: [...f.moves] })) });

/** Sıradaki ışık: elle seçilen, yoksa kırmızıda tutulmayan ilk ışık (hepsi tutuluyorsa yanan kalır). */
export function nextIndex(s: Sim) {
  if (s.ctl.next !== null) return s.ctl.next;
  const n = s.plan.phases.length;
  for (let k = 1; k <= n; k++) {
    const i = (s.ctl.phase + k) % n;
    if (!s.plan.phases[i].off) return i;
  }
  return s.ctl.phase;
}

/** Dedektörün gördüğü: duruş çizgisine 40 metre kalan araç ya da kolun gerisinde bekleyen. */
export function calls(s: Sim, moves: MoveId[]) {
  const cars = moves.filter((m) => turnOf(m) !== 'P');
  if (s.cars.some((c) => cars.includes(c.mv) && c.s < c.path.stop + 0.5 && c.path.stop - c.s < 40 && c.crashed === undefined && !c.broken)) return true;
  if (Object.entries(s.backlog).some(([k, l]) => l.length && cars.includes(k.replace(/^(amb|bus|vip|pol):/, '') as MoveId))) return true;
  const legs = moves.filter((m) => turnOf(m) === 'P').map(legOf);
  return s.peds.some((p) => !p.walking && legs.includes(p.leg));
}

/** Yeşilin bu evrede gerçek süresi: plan artı yeşil dalga düzeltmesi. */
export const greenNow = (s: Sim) => (s.plan.phases[s.ctl.phase]?.green ?? 0) + (s.ctl.bonus ?? 0);

/** Arıza sürüyor mu: ışıklar sarı flaşörde. */
export const faulty = (s: Sim) => s.fault > s.t;

/** Dedektörlü kipte sıradaki evre: sıradan başlayıp çağrısı olan ilk evre (yoksa sıradaki). */
function nextCalled(s: Sim) {
  const n = s.plan.phases.length;
  if (s.ctl.next !== null || !s.plan.actuated) return nextIndex(s);
  for (let k = 1; k <= n; k++) {
    const i = (s.ctl.phase + k) % n;
    if (!s.plan.phases[i].off && calls(s, s.plan.phases[i].moves)) return i;
  }
  return nextIndex(s);
}

/** Dedektör yeşili bitirsin mi: en kısa yeşil geçti, akım kesildi, başka evrede bekleyen var. */
function gapOut(s: Sim) {
  const { ctl, plan } = s;
  if (!plan.actuated || ctl.hold || ctl.t < MIN_GREEN + 1) return false;
  const cur = plan.phases[ctl.phase];
  // akım kesildi: yeşil yanan yönlerde duruş çizgisine 3 saniyelik yolda araç yok
  const cars = cur.moves.filter((m) => turnOf(m) !== 'P');
  const flowing = s.cars.some((c) => cars.includes(c.mv) && c.s < c.path.stop + 0.5 && c.path.stop - c.s < Math.max(8, c.v * 3) && c.crashed === undefined && !c.broken);
  if (flowing) return false;
  return plan.phases.some((p, i) => i !== ctl.phase && calls(s, p.moves.filter((m) => !cur.moves.includes(m))));
}

/** Evrenin geçidinde yayanın yürümeye başlayabileceği süre: yeşil eksi karşıya varma süresi. */
export function walkTime(s: Sim, leg: Dir, green: number) {
  const g = s.j.legs[leg];
  return g ? green - crossTime(g, PED_V) : 0;
}

export function signal(s: Sim, mv: MoveId): SignalState {
  const { ctl, plan } = s;
  // arıza: araçlara sarı flaşör, yayalara ışık yok (kırmızı gibi bekler)
  if (faulty(s)) return turnOf(mv) === 'P' ? 'red' : 'amber';
  const cur = plan.phases[ctl.phase];
  if (!cur?.moves.includes(mv)) return 'red';
  const ped = turnOf(mv) === 'P';
  const carry = plan.phases[nextIndex(s)]?.moves.includes(mv) && nextIndex(s) !== ctl.phase;
  if (ctl.stage === 'green') {
    if (!ped) return 'green';
    if (carry) return 'green';
    return ctl.hold || (ctl.t < Math.max(PED_START, walkTime(s, legOf(mv), greenNow(s))) && !ctl.cut) ? 'green' : 'amber';
  }
  if (carry) return 'green';
  return ctl.stage === 'amber' && !ped ? 'amber' : 'red';
}

export function stepController(s: Sim) {
  const { ctl, plan } = s;
  const n = plan.phases.length;
  ctl.t += DT;
  if (ctl.stage === 'green') {
    // kırmızıda tutulmayan başka ışık yoksa yeşil yanmaya devam eder
    const over = ctl.cut ? ctl.t >= MIN_GREEN : !ctl.hold && (ctl.t >= greenNow(s) || gapOut(s));
    if (over && n > 1 && nextIndex(s) !== ctl.phase) {
      ctl.stage = 'amber';
      ctl.t = 0;
    }
  } else if (ctl.stage === 'amber') {
    if (ctl.t >= amberAt(plan, ctl.phase)) {
      ctl.stage = 'allred';
      ctl.t = 0;
    }
  }
  if (ctl.stage === 'allred' && ctl.t >= allRedAt(plan, ctl.phase)) {
    ctl.phase = nextCalled(s);
    ctl.next = null;
    ctl.cut = false;
    ctl.stage = 'green';
    ctl.t = 0;
    ctl.bonus = takeShift(s);
  }
}

/**
 * Yeşil dalgaya geçiş: dağıtılacak kaymanın bu evreye düşen payı. Uzatma evre başına en çok 15
 * saniye, kısma en kısa yeşile kadar; kalan bir sonraki evreye kalır.
 */
function takeShift(s: Sim) {
  const left = s.ctl.shift ?? 0;
  if (Math.abs(left) < 0.05) return 0;
  const g = s.plan.phases[s.ctl.phase].green;
  const b = left > 0 ? Math.min(left, 15) : Math.max(left, MIN_GREEN + 1 - g, -15);
  s.ctl.shift = left - b;
  return Math.round(b * 10) / 10;
}

/** Yeşili en kısa süre dolunca kes; `to` verilirse sıradaki evre o olur. */
export function skipTo(s: Sim, to?: number) {
  if (to !== undefined) {
    if (to === s.ctl.phase && s.ctl.stage === 'green') return;
    s.ctl.next = to;
  }
  // elle müdahale yeşil dalgaya geçişi bırakır
  s.ctl.shift = 0;
  if (s.ctl.stage === 'green') s.ctl.cut = true;
  s.ctl.hold = false;
}

/**
 * Işığı kırmızıda tutar ya da yeniden sıraya alır. Yeşil yanarken kırmızıda tutulan ışık en kısa
 * yeşil dolunca sarıya döner; sıradaki diye seçilmişse seçim kalkar.
 */
export function setOff(s: Sim, i: number, off: boolean) {
  s.plan = { ...s.plan, phases: s.plan.phases.map((p, k) => (k === i ? { ...p, off } : p)) };
  if (!off) return;
  if (s.ctl.next === i) s.ctl.next = null;
  if (s.ctl.phase === i && s.ctl.stage === 'green') skipTo(s);
}

export function setHold(s: Sim, hold: boolean) {
  if (hold) s.ctl.shift = 0;
  s.ctl.hold = hold;
  if (hold) s.ctl.cut = false;
}

/** Plan değişince kontrolör geçerli evrede kalır; evre silindiyse başa döner. */
export function applyPlan(s: Sim, plan: Plan) {
  s.plan = clonePlan(plan);
  if (s.ctl.phase >= plan.phases.length) {
    s.ctl.phase = 0;
    s.ctl.stage = 'green';
    s.ctl.t = 0;
  }
  if (s.ctl.next !== null && s.ctl.next >= plan.phases.length) s.ctl.next = null;
}

/** Döngü: evrelerin yeşili, sarısı ve tüm kırmızısı toplamı. */
export function cycleOf(plan: Plan) {
  return plan.phases.reduce((m, p, i) => m + p.green + amberAt(plan, i) + allRedAt(plan, i), 0);
}

/** Bir evrenin yönleri döngüde ne kadar kırmızı bekler: döngü eksi kendi yeşili ve sarısı. */
export const redOf = (plan: Plan, i: number) => cycleOf(plan) - plan.phases[i].green - amberAt(plan, i);

/**
 * Kontrolörün döngüdeki yeri: `from` evresinin yeşilinin başından bu yana geçen saniye (plana
 * göre; dalga düzeltmesi dahil). Yeşil dalga bununla ölçülür.
 */
export function cyclePos(s: Sim, from: number) {
  const { ctl, plan } = s;
  const n = plan.phases.length;
  let t = 0;
  for (let k = 0; k < n; k++) {
    const i = (from + k) % n;
    if (i === ctl.phase) break;
    t += plan.phases[i].green + amberAt(plan, i) + allRedAt(plan, i);
  }
  const g = plan.phases[ctl.phase].green;
  t += ctl.stage === 'green' ? Math.min(ctl.t, g) : ctl.stage === 'amber' ? g + ctl.t : g + amberAt(plan, ctl.phase) + ctl.t;
  return t % cycleOf(plan);
}

/**
 * Önümüzdeki `sec` saniyede bir hareketin ışığı: kontrolörün kopyası ileri sarılır (oyuncu
 * dokunmazsa). Zaman-yol çizelgesi bunu çizer; dedektörlü kipte gerçek ışık bundan sapabilir.
 */
export function forecast(s: Sim, mv: MoveId, sec: number, step = 1): SignalState[] {
  const ghost = { ...s, ctl: { ...s.ctl }, plan: s.plan, cars: [], peds: [], backlog: {}, fault: 0, t: 0 } as Sim;
  const out: SignalState[] = [];
  const every = Math.round(step / DT);
  for (let k = 0; k < sec / DT; k++) {
    if (k % every === 0) out.push(signal(ghost, mv));
    stepController(ghost);
  }
  return out;
}
