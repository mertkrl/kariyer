import { legOf, moveOfKey, type Dir, type MoveId } from './model';
import type { Sim } from './sim';

/*
 * Kavşağın göstergeleri ve vardiya puanı: kollardaki kuyruk, harekete göre gecikme, hizmet
 * düzeyi, yaya bekleyişi; tutanakta gecikme, yaya, güvenlik ve ambulans kalemleri.
 */

/** Kolun gerisinde bekleyen araç sayısı. */
export function backlogOf(s: Sim, d: Dir) {
  return Object.entries(s.backlog).reduce((m, [k, l]) => (moveOfKey(k)[0] === d ? m + l.length : m), 0);
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
  let oldest = Object.entries(s.backlog).reduce((m, [k, l]) => (moveOfKey(k)[0] === d && l.length ? Math.max(m, s.t - l[0]) : m), 0);
  // ara sokakların ağzında bekleyenler de kolun kuyruğu
  let side = 0;
  for (const x of s.sides)
    if (x.leg === d)
      for (const c of x.queue) {
        side++;
        oldest = Math.max(oldest, s.t - c.born);
      }
  return { n: n + back + side, wait: Math.max(wait, oldest) };
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
  // yoldakiler: yalnızca kuyruğa girmiş (durmuş) olanlar; serbest akan araç uzun yolda ortalamayı sulandırmasın
  for (const c of s.cars) if (c.crashed === undefined && c.kind !== 'ambulance' && c.waited > 0) add(c.mv, Math.max(0, s.t - c.born - (c.s / c.path.len) * c.free));
  for (const [k, l] of Object.entries(s.backlog)) for (const b of l) add(moveOfKey(k), s.t - b);
  for (const x of s.sides) for (const c of x.queue) add(c.mv, s.t - c.born);
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
  return { avg: n ? sum / n : 0, worst, worstMv, byLeg, n, sum };
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
  /** En çok bekleyen yönün kavşağı (ağda). */
  worstAt: string;
  los: string;
  delivered: number;
  /** Kapalı yol yüzünden ara sokaklara sapan araç. */
  detour: number;
  workHits: number;
  pedWait: number;
  jay: number;
  crashes: number;
  /** Ara sokaktan sabrı tükenip araya dalan sürücü. */
  cutIns: number;
  pedHits: number;
  ambulanceLate: number;
  jammed: Dir | null;
  /** Kol kol ortalama gecikme (sn): korna haritası. */
  legs: { dir: Dir; name: string; delay: number }[];
  parts: { label: string; got: number; max: number }[];
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Sürücünün hissettiği bekleyiş: ortalama ve en çok bekleyen yön karışımı (sn). */
export const feltDelay = (avg: number, worst: number) => avg * 0.6 + worst * 0.4;

/** Sürücülerin sabrı 0–1: 14 saniyenin altında tam, 48 saniyede biter. Gösterge de puan da bunu kullanır. */
export const patience = (felt: number) => clamp01((48 - felt) / 34);

/**
 * Tutanak: tek kavşak ya da ağın bütün kavşakları birlikte. Gecikme araç sayısına göre
 * ağırlıklanır, en çok bekleyen yön bütün ağda aranır; kazalar, ambulans, konvoy ve yol
 * çalışması toplanır.
 */
export function report(input: Sim | Sim[]): Report {
  const sims = Array.isArray(input) ? input : [input];
  const multi = sims.length > 1;
  let n = 0;
  let sum = 0;
  let worst = 0;
  let worstMv: MoveId | null = null;
  let worstAt = '';
  const legs: Report['legs'] = [];
  for (const s of sims) {
    const d = delays(s);
    n += d.n;
    sum += d.sum;
    if (d.worst > worst) {
      worst = d.worst;
      worstMv = d.worstMv;
      worstAt = s.name;
    }
    // komşuya bağlanan kollar ağın içidir: korna haritasında yalnızca dış kollar
    for (const dir of Object.keys(s.spec.legs) as Dir[]) if (!s.links[dir]) legs.push({ dir, name: multi ? `${s.name} · ${s.spec.legs[dir]!.name}` : s.spec.legs[dir]!.name, delay: d.byLeg[dir] ?? 0 });
  }
  const avg = n ? sum / n : 0;
  const pedN = sims.reduce((m, s) => m + s.pedDone + s.peds.length, 0);
  const pedWait = pedN ? sims.reduce((m, s) => m + avgPedWait(s) * (s.pedDone + s.peds.length), 0) / pedN : 0;
  const jay = sims.reduce((m, s) => m + s.jay, 0);
  const all = sims.flatMap((s) => s.crashes);
  const pedHits = all.filter((c) => c.ped).length;
  const crashes = all.length - pedHits;
  // ara sokaktan sabrı tükenip araya dalan: kaza olmasa da güvenlikten düşer
  const cutIns = sims.reduce((m, s) => m + s.cutIns, 0);
  const late = sims.reduce((m, s) => m + s.ambulance.filter((a) => a.late).length + Object.entries(s.backlog).filter(([k, l]) => k.startsWith('amb:') && l.length).length + s.cars.filter((c) => c.kind === 'ambulance' && s.t - c.born - (c.s / c.path.len) * c.free > 25).length, 0);
  const events = sims.flatMap((s) => s.spec.events);
  const hasPeds = sims.some((s) => s.spec.peds.length > 0);
  const hasAmb = events.some((e) => e.kind === 'ambulance');
  const hasVip = events.some((e) => e.kind === 'motorcade');
  const hasWork = events.some((e) => e.kind === 'roadwork');
  // konvoyda geçemeyen (hâlâ yolda ya da kolun gerisinde) araç durmuş sayılır
  const vipStopped = sims.reduce((m, s) => m + s.vip.stopped + s.vip.n - s.vip.passed, 0);
  const vipCrash = sims.some((s) => s.vip.crash);
  const workHits = sims.reduce((m, s) => m + s.workHits, 0);
  const jammed = sims.find((s) => s.jammed)?.jammed ?? null;
  // gecikme puanı ortalamanın ve en kötü hareketin karışımından: unutulan kol puanı düşürür
  const felt = feltDelay(avg, worst);
  const dMax = 80 - (hasAmb ? 10 : 0) - (hasVip ? 10 : 0) - (hasWork ? 10 : 0);
  const parts = [
    { label: 'Araç gecikmesi', got: Math.round(dMax * patience(felt)), max: dMax },
    { label: 'Yaya bekleyişi', got: hasPeds ? Math.round(Math.max(0, 10 * clamp01((75 - pedWait) / 45) - jay * 0.5)) : 10, max: 10 },
    { label: 'Güvenlik', got: Math.max(0, 10 - crashes * 6 - pedHits * 10 - cutIns), max: 10 },
    ...(hasAmb ? [{ label: 'Ambulans', got: Math.max(0, 10 - late * 5), max: 10 }] : []),
    ...(hasVip ? [{ label: 'Konvoy', got: vipCrash ? 0 : Math.max(0, 10 - vipStopped * 2), max: 10 }] : []),
    ...(hasWork ? [{ label: 'Yol çalışması', got: Math.max(0, 10 - workHits), max: 10 }] : []),
  ];
  let score = parts.reduce((m, p) => m + p.got, 0);
  if (jammed) score = Math.min(score, 25);
  if (pedHits) score = Math.min(score, 35);
  if (vipCrash) score = Math.min(score, 40);
  const delivered = multi ? sims.reduce((m, s) => m + s.exited, 0) : sims[0].delivered;
  const detour = sims.reduce((m, s) => m + s.detour, 0);
  return { score, delay: avg, worst, worstMv, worstAt, los: los(avg), delivered, detour, pedWait, jay, crashes, cutIns, pedHits, ambulanceLate: late, workHits, jammed, legs, parts };
}
