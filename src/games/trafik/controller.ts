import { crossTime, hardClashes } from './junction';
import { AMBER, DIR_NAME, DT, legOf, MIN_GREEN, moveName, PED_START, PED_V, turnOf, type Dir, type MoveId, type Plan, type SignalState } from './model';
import type { Sim } from './sim';

/*
 * Kavşak kontrolörü: evreler sırayla yeşil, sarı ve tüm kırmızıdan geçer. Bir sonraki evrede de
 * yeşil olan hareket geçişte yanmaya devam eder. Yaya ışığı, yayanın karşıya varabileceği son
 * ana kadar yeşil kalır, sonra yanıp söner. Sensörlü planda kimsenin beklemediği evre atlanır.
 * Elle müdahale: "tut" yeşili sabitler, "geç" en kısa yeşil dolunca keser.
 */

export const clonePlan = (p: Plan): Plan => ({ ...p, phases: p.phases.map((f) => ({ ...f, moves: [...f.moves] })) });

const nextIndex = (s: Sim) => s.ctl.next ?? (s.ctl.phase + 1) % s.plan.phases.length;

/** Evrenin geçidinde yayanın yürümeye başlayabileceği süre: yeşil eksi karşıya varma süresi. */
export function walkTime(s: Sim, leg: Dir, green: number) {
  const g = s.j.legs[leg];
  return g ? green - crossTime(g, PED_V) : 0;
}

export function signal(s: Sim, mv: MoveId): SignalState {
  if (s.manual) {
    // elle kumanda: araç ışığı kolun ışığı; yaya, bütün kollar kırmızıyken yürür
    if (turnOf(mv) !== 'P') return s.manual[legOf(mv)]?.st ?? 'red';
    return Object.values(s.manual).every((m) => m.st === 'red') ? 'green' : 'red';
  }
  const { ctl, plan } = s;
  const cur = plan.phases[ctl.phase];
  if (!cur?.moves.includes(mv)) return 'red';
  const ped = turnOf(mv) === 'P';
  const carry = plan.phases[nextIndex(s)]?.moves.includes(mv) && nextIndex(s) !== ctl.phase;
  if (ctl.stage === 'green') {
    if (!ped) return 'green';
    if (carry) return 'green';
    return ctl.hold || (ctl.t < Math.max(PED_START, walkTime(s, legOf(mv), cur.green)) && !ctl.cut) ? 'green' : 'amber';
  }
  if (carry) return 'green';
  return ctl.stage === 'amber' && !ped ? 'amber' : 'red';
}

function demandFor(s: Sim, moves: MoveId[]) {
  for (const m of moves) {
    if (turnOf(m) === 'P') {
      if (s.peds.some((p) => p.leg === legOf(m) && !p.walking)) return true;
      continue;
    }
    if (s.cars.some((c) => c.mv === m && c.s < c.path.stop && c.path.stop - c.s < 60)) return true;
    if (s.backlog[m]?.length) return true;
  }
  return false;
}

export function stepController(s: Sim) {
  const { ctl, plan } = s;
  const n = plan.phases.length;
  ctl.t += DT;
  const cur = plan.phases[ctl.phase];
  if (ctl.stage === 'green') {
    if (plan.sensor && !ctl.hold && ctl.t >= MIN_GREEN && !demandFor(s, cur.moves) && demandFor(s, plan.phases.flatMap((p, i) => (i === ctl.phase ? [] : p.moves)))) ctl.cut = true;
    const over = ctl.cut ? ctl.t >= MIN_GREEN : !ctl.hold && ctl.t >= cur.green;
    if (over && n > 1) {
      // sensörlü planda kimsenin beklemediği evreler atlanır
      if (plan.sensor && ctl.next === null) {
        let k = (ctl.phase + 1) % n;
        for (let i = 0; i < n - 1 && !demandFor(s, plan.phases[k].moves); i++) k = (k + 1) % n;
        ctl.next = k === ctl.phase ? (ctl.phase + 1) % n : k;
      }
      ctl.stage = 'amber';
      ctl.t = 0;
    }
  } else if (ctl.stage === 'amber') {
    if (ctl.t >= AMBER) {
      ctl.stage = 'allred';
      ctl.t = 0;
    }
  }
  if (ctl.stage === 'allred' && ctl.t >= plan.allRed) {
    ctl.phase = nextIndex(s);
    ctl.next = null;
    ctl.cut = false;
    ctl.stage = 'green';
    ctl.t = 0;
  }
}

/** Yeşili en kısa süre dolunca kes; `to` verilirse sıradaki evre o olur. */
export function skipTo(s: Sim, to?: number) {
  if (to !== undefined) {
    if (to === s.ctl.phase && s.ctl.stage === 'green') return;
    s.ctl.next = to;
  }
  if (s.ctl.stage === 'green') s.ctl.cut = true;
  s.ctl.hold = false;
}

export function setHold(s: Sim, hold: boolean) {
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

/** Planın sorunları: denetçinin reddettikleri (sert) ve uyarılar. */
export function planIssues(s: Sim, plan: Plan): { hard: string[]; warn: string[] } {
  const hard: string[] = [];
  const warn: string[] = [];
  plan.phases.forEach((p, i) => {
    for (const [a, b] of hardClashes(p.moves)) hard.push(`${i + 1}. evre: ${moveName(a)} ile ${moveName(b)} çakışır`);
    for (const m of p.moves)
      if (turnOf(m) === 'P') {
        const need = Math.ceil(PED_START + crossTime(s.j.legs[legOf(m)]!, PED_V));
        if (p.green < need) warn.push(`${i + 1}. evre: ${DIR_NAME[legOf(m)]} geçidi için yeşil kısa (en az ${need} sn)`);
      }
  });
  const served = new Set(plan.phases.flatMap((p) => p.moves));
  for (const m of s.j.moves) if (!served.has(m) && (turnOf(m) === 'P' ? s.spec.peds.some((d) => d.leg === legOf(m)) : s.spec.demand.some((d) => d.mv === m))) warn.push(`${moveName(m)} hiçbir evrede yeşil yanmıyor`);
  if (plan.allRed < 1) warn.push('Tüm kırmızı yok: sarının sonunda geçen kutuda kalır');
  return { hard, warn };
}

/** Döngü: evrelerin yeşili, sarısı ve tüm kırmızısı toplamı. */
export function cycleOf(plan: Plan) {
  return plan.phases.reduce((m, p) => m + p.green + AMBER + plan.allRed, 0);
}
