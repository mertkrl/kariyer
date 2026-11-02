import { DT, type Difficulty, type Dir, type LegSpec, type LevelSpec, type LogLine, type NetSpec } from './model';
import { createSim, report, say, step, type Report, type Sim } from './sim';

/*
 * Kavşak ağı: doğu-batı yönünde bir sıra boyunca dizilmiş kavşaklar. Her kavşağın kendi
 * simülasyonu ve kontrolörü vardır; komşu iki kavşağın birbirine bakan kolları (soldakinin doğu,
 * sağdakinin batı kolu) aynı yolun iki yarısıdır. Birinden çıkan araç öbürünün kuyruğuna girer,
 * yol dolunca kuyruk geri taşar. Kapatılan yol iki uçtan da kapanır; trafik öbür yollara çevrilir.
 */

export interface Net {
  spec: NetSpec;
  sims: Sim[];
  t: number;
  done: boolean;
}

export function createNet(spec: NetSpec, diff: Difficulty = 'normal'): Net {
  const nodes = [...spec.nodes].sort((a, b) => a.x - b.x);
  const first = nodes[0].id;
  const sims = nodes.map((n, i) => {
    const legs: Partial<Record<Dir, LegSpec>> = { ...n.legs };
    // komşuya bakan kolun boyu: iki kavşak arasındaki yolun yarısı
    const prev = nodes[i - 1];
    const next = nodes[i + 1];
    if (prev && legs.W) legs.W = { ...legs.W, len: (n.x - prev.x) / 2 };
    if (next && legs.E) legs.E = { ...legs.E, len: (next.x - n.x) / 2 };
    const one: LevelSpec = {
      id: n.id,
      seed: spec.seed + i * 101,
      legs,
      demand: n.demand,
      peds: n.peds,
      events: spec.events.filter((e) => (e.node ?? first) === n.id),
      plan: n.plan,
      duration: spec.duration,
      dusk: spec.dusk,
      rain: spec.rain,
      bold: spec.bold,
      landmarks: n.landmarks,
      city: spec.city,
    };
    const s = createSim(one, diff);
    s.name = n.name;
    return s;
  });
  for (let i = 0; i + 1 < sims.length; i++) {
    const a = sims[i];
    const b = sims[i + 1];
    if (a.j.legs.E && b.j.legs.W) {
      a.links.E = { sim: b, leg: 'W' };
      b.links.W = { sim: a, leg: 'E' };
    }
  }
  return { spec, sims, t: 0, done: false };
}

/** Kavşağın dünyadaki yeri (m). */
export const nodeX = (net: Net, s: Sim) => net.spec.nodes.find((n) => n.id === s.node)!.x;

export function stepNet(net: Net) {
  if (net.done) return;
  for (const s of net.sims) step(s);
  net.t = net.sims[0].t;
  // bir kavşak kilitlenince ya da süre dolunca vardiya biter
  if (net.sims.some((s) => s.done)) {
    net.done = true;
    for (const s of net.sims) s.done = true;
  }
}

export function runNet(net: Net, seconds = net.spec.duration) {
  const end = net.t + seconds;
  while (net.t < end - DT / 2 && !net.done) stepNet(net);
  return net;
}

/** Kolu kapatır ya da açar; komşuya bağlanan yol iki ucundan birlikte kapanır. */
export function setClosed(s: Sim, d: Dir, closed: boolean) {
  if (!s.j.legs[d] || !!s.closed[d] === closed) return;
  s.closed[d] = closed;
  const link = s.links[d];
  if (link) link.sim.closed[link.leg] = closed;
  const name = s.spec.legs[d]!.name;
  say(s, closed ? `${name} kolu trafiğe kapatıldı: bariyerler kondu, sürücüler öbür yollara çevriliyor.` : `${name} kolu yeniden trafiğe açıldı.`, closed ? 'info' : 'good');
}

/** Bütün kavşakların kaydı, yeniden eskiye; ağda satırın başında kavşağın adı. */
export function netLog(net: Net): (LogLine & { at: string })[] {
  const multi = net.sims.length > 1;
  return net.sims
    .flatMap((s) => s.log.map((l) => ({ ...l, at: multi ? s.name : '' })))
    .sort((a, b) => b.t - a.t);
}

export const netReport = (net: Net): Report => report(net.sims);
