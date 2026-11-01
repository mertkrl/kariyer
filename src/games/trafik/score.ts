import { legOf, type Dir, type MoveId } from './model';
import type { Sim } from './sim';

/*
 * Kavşağın göstergeleri ve vardiya puanı: kollardaki kuyruk, harekete göre gecikme, hizmet
 * düzeyi, yaya bekleyişi; tutanakta gecikme, yaya, güvenlik ve ambulans kalemleri.
 */

/** Kolun gerisinde bekleyen araç sayısı. */
export function backlogOf(s: Sim, d: Dir) {
  return Object.entries(s.backlog).reduce((m, [k, l]) => (k.replace(/^(amb|bus|vip):/, '')[0] === d ? m + l.length : m), 0);
}

/** Kolda kuyrukta duran araçlar ve en uzun bekleyenin süresi. */
export function queueOf(s: Sim, d: Dir) {
  let n = 0;
  let wait = 0;
  for (const c of s.cars)
    if (legOf(c.mv) === d && c.s < c.path.stop && c.v < 2) {
      n++;
      wait = Math.max(wait, c.waited);
    }
  const back = backlogOf(s, d);
  const oldest = Object.entries(s.backlog).reduce((m, [k, l]) => (k.replace(/^(amb|bus|vip):/, '')[0] === d && l.length ? Math.max(m, s.t - l[0]) : m), 0);
  return { n: n + back, wait: Math.max(wait, oldest) };
}

/** Hizmet düzeyi: araç başına gecikmeye göre A–F (kavşak kapasite kılavuzlarındaki gibi). */
export function los(delay: number) {
  return delay <= 10 ? 'A' : delay <= 20 ? 'B' : delay <= 35 ? 'C' : delay <= 55 ? 'D' : delay <= 80 ? 'E' : 'F';
}

/**
 * Gecikme: varanlar, yoldakiler ve kolun gerisinde bekleyenler birlikte. Ortalamanın yanında en
 * kötü hareket de döner: mühendis kavşağı en çok bekleyen kola göre yargılar.
 */
export function delays(s: Sim) {
  const by: Record<string, { n: number; sum: number }> = {};
  for (const [k, v] of Object.entries(s.byMove)) by[k] = { ...v };
  const add = (mv: string, d: number) => {
    const m = (by[mv] ??= { n: 0, sum: 0 });
    m.n++;
    m.sum += d;
  };
  for (const c of s.cars) if (c.crashed === undefined && c.kind !== 'ambulance') add(c.mv, Math.max(0, s.t - c.born - (c.s / c.path.len) * c.free));
  for (const [k, l] of Object.entries(s.backlog)) for (const b of l) add(k.replace(/^(amb|bus|vip):/, ''), s.t - b);
  let n = 0;
  let sum = 0;
  let worst = 0;
  let worstMv: MoveId | null = null;
  for (const [k, v] of Object.entries(by)) {
    n += v.n;
    sum += v.sum;
    const d = v.sum / v.n;
    if (v.n >= 3 && d > worst) {
      worst = d;
      worstMv = k as MoveId;
    }
  }
  // kol kol ortalama gecikme: tutanaktaki korna haritası
  const legs: Partial<Record<Dir, { n: number; sum: number }>> = {};
  for (const [k, v] of Object.entries(by)) {
    const l = (legs[legOf(k as MoveId)] ??= { n: 0, sum: 0 });
    l.n += v.n;
    l.sum += v.sum;
  }
  const byLeg = Object.fromEntries(Object.entries(legs).map(([d, v]) => [d, v.n ? v.sum / v.n : 0])) as Partial<Record<Dir, number>>;
  return { avg: n ? sum / n : 0, worst, worstMv, byLeg };
}

export const avgDelay = (s: Sim) => delays(s).avg;

export function avgPedWait(s: Sim) {
  let sum = s.pedWait;
  let n = s.pedDone + s.peds.filter((p) => p.walking).length;
  for (const p of s.peds)
    if (!p.walking) {
      sum += s.t - p.since;
      n++;
    }
  return n ? sum / n : 0;
}

export interface Report {
  score: number;
  delay: number;
  worst: number;
  worstMv: MoveId | null;
  los: string;
  delivered: number;
  pedWait: number;
  jay: number;
  crashes: number;
  pedHits: number;
  ambulanceLate: number;
  jammed: Dir | null;
  /** Kol kol ortalama gecikme (sn): korna haritası. */
  legs: { dir: Dir; name: string; delay: number }[];
  parts: { label: string; got: number; max: number }[];
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function report(s: Sim): Report {
  const { avg, worst, worstMv, byLeg } = delays(s);
  const legs = (Object.keys(s.spec.legs) as Dir[]).map((d) => ({ dir: d, name: s.spec.legs[d]?.name ?? d, delay: byLeg[d] ?? 0 }));
  const pedWait = avgPedWait(s);
  const pedHits = s.crashes.filter((c) => c.ped).length;
  const crashes = s.crashes.length - pedHits;
  const late = s.ambulance.filter((a) => a.late).length + Object.entries(s.backlog).filter(([k, l]) => k.startsWith('amb:') && l.length).length + s.cars.filter((c) => c.kind === 'ambulance' && s.t - c.born > 25).length;
  const hasPeds = s.spec.peds.length > 0;
  const hasAmb = s.spec.events.some((e) => e.kind === 'ambulance');
  const hasVip = s.spec.events.some((e) => e.kind === 'motorcade');
  // konvoyda geçemeyen (hâlâ yolda ya da kolun gerisinde) araç durmuş sayılır
  const vipLeft = s.vip.n - s.vip.passed;
  // gecikme puanı ortalamanın ve en kötü hareketin karışımından: unutulan kol puanı düşürür
  const felt = avg * 0.6 + worst * 0.4;
  const dMax = 70 - (hasAmb ? 10 : 0) - (hasVip ? 10 : 0);
  const parts = [
    { label: 'Araç gecikmesi', got: Math.round(dMax * clamp01((60 - felt) / 42)), max: dMax },
    { label: 'Yaya bekleyişi', got: hasPeds ? Math.round(Math.max(0, 15 * clamp01((75 - avgPedWait(s)) / 45) - s.jay * 0.5)) : 15, max: 15 },
    { label: 'Güvenlik', got: Math.max(0, 15 - crashes * 8 - pedHits * 15), max: 15 },
    ...(hasAmb ? [{ label: 'Ambulans', got: Math.max(0, 10 - late * 5), max: 10 }] : []),
    ...(hasVip ? [{ label: 'Konvoy', got: s.vip.crash ? 0 : Math.max(0, 10 - (s.vip.stopped + vipLeft) * 2), max: 10 }] : []),
  ];
  let score = parts.reduce((m, p) => m + p.got, 0);
  if (s.jammed) score = Math.min(score, 25);
  if (pedHits) score = Math.min(score, 35);
  if (s.vip.crash) score = Math.min(score, 40);
  return { score, delay: avg, worst, worstMv, los: los(avg), delivered: s.delivered, pedWait, jay: s.jay, crashes, pedHits, ambulanceLate: late, jammed: s.jammed, legs, parts };
}
