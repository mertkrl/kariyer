import { linkFull, say, speedOf, type Sim } from './sim';
import { faulty, signal } from './controller';
import { addIncident } from './incidentSim';
import { clash, crossPoint, exitOf, pose, yields } from './junction';
import { ACCEL, amberAt, BRAKE, CRASH_CLEAR, DIR_NAME, DT, GAP, GAP_ACCEPT, HARD_BRAKE, HEADWAY, legOf, moveName, SIDE_W, TURN_V, turnOf, type Car, type Kind, type Turn } from './model';

/*
 * Sürüş: bir aracın önündeki engeli görmesi, sola dönüşte boşluk kollaması, yayaya yol vermesi,
 * hızlanıp frenlemesi ve kavşak kutusunda çarpışmalar.
 */

/** Kutudaki iki aracın gövdeleri çakışıyor mu: orta noktalar arası uzaklık. */
const center = (c: Car) => pose(c.path, c.s - c.len / 2);

/** Duran ya da yavaş bir aracın `d` metreyi alması: hızlanarak, en çok `vmax` ile. */
function timeTo(d: number, v: number, a: number, vmax: number) {
  if (d <= 0) return 0;
  const tUp = (vmax - v) / a;
  const dUp = v * tUp + 0.5 * a * tUp * tUp;
  if (d <= dUp) return (-v + Math.sqrt(v * v + 2 * a * d)) / a;
  return tUp + (d - dUp) / vmax;
}

/**
 * Sola dönen, karşıdan gelen akımda kutuyu boşaltacak kadar boşluk var mı: kendi kutudan çıkış
 * süresine pay eklenir, karşıdakinin çakışma yerine varış süresiyle kıyaslanır.
 */
function canGoLeft(s: Sim, c: Car) {
  const mine = timeTo(c.path.boxOut - c.s, c.v, ACCEL * 0.8, TURN_V) + 1;
  for (const o of s.cars) {
    if (o === c || !yields(c.mv, o.mv) || o.s >= o.path.boxOut - 2 || o.crashed !== undefined) continue;
    // kutunun içinde ilerleyen: bekle; kutuda duran (o da tıkanmış) beklenmez
    if (o.s > o.path.stop + 0.3) {
      if (o.v > 0.5) return false;
      continue;
    }
    const sig = signal(s, o.mv);
    const comes = sig === 'green' || o.amber === 'go';
    if (!comes) continue;
    const theirs = timeTo(o.path.stop - o.s + 6, o.v, ACCEL, speedOf(s, legOf(o.mv)));
    if (theirs < Math.max(GAP_ACCEPT, mine)) return false;
  }
  return true;
}

function pedBlocks(s: Sim, x: Car['path']['cross'][number]) {
  const g = s.j.legs[x.leg]!;
  const width = g.inW + g.outW + 2;
  const me = x.at * width;
  for (const p of s.peds) {
    if (p.leg !== x.leg || !p.walking || p.hit) continue;
    const at = p.t * width;
    const d = (me - at) * p.dir;
    // yaya aracın geçeceği yere geliyor ya da tam önünde
    if (Math.abs(d) < 3 || (d > 0 && d < 4 + p.speed * 4)) return true;
  }
  return false;
}

function obstacle(s: Sim, c: Car): { gap: number; v: number } {
  let gap = Infinity;
  let vl = 0;
  const ahead = (g: number, v: number) => {
    if (g < gap) {
      gap = g;
      vl = v;
    }
  };
  const p = c.path;
  const before = c.s < p.stop + 0.2;
  // önündeki araçlar: aynı gelen şerit, aynı yol, aynı giden şerit
  const exitLeg = exitOf(legOf(c.mv), turnOf(c.mv) as Turn);
  for (const o of s.cars) {
    if (o === c) continue;
    let g = Infinity;
    if (o.path === p) {
      if (o.s > c.s) g = o.s - o.len - c.s;
    } else if (before && legOf(o.mv) === legOf(c.mv) && o.lane === c.lane && o.s > c.s) {
      // aynı şeritten başka yöne giden: kutuya girene kadar önümde; kutunun ortasında bekleyen
      // sola dönen ortak şeridi tıkar
      if (o.s < o.path.stop + 0.2 || o.s - o.len < p.stop + 5) g = o.s - o.len - c.s;
      else if (o.s < o.path.boxOut && turnOf(o.mv) === 'L' && o.v < 1.5) g = p.stop - c.s - 0.3;
    } else if (o.s > o.path.boxOut - 1 && exitOf(legOf(o.mv), turnOf(o.mv) as Turn) === exitLeg && o.path.pts[o.path.pts.length - 1][0] === p.pts[p.pts.length - 1][0] && o.path.pts[o.path.pts.length - 1][1] === p.pts[p.pts.length - 1][1]) {
      const mine = c.s - p.boxOut;
      const theirs = o.s - o.path.boxOut;
      if (theirs > mine) g = theirs - o.len - mine;
    }
    if (g < Infinity) ahead(g, o.crashed ? 0 : o.v);
  }
  const stopAt = (x: number) => ahead(x - c.s - 0.3, 0);
  const vip = c.kind === 'vip' || c.kind === 'police' || c.kind === 'ambulance';
  // düğün konvoyu kolu kapattı: gelen, halayın gerisinde; o kola dönecek olan çizgide bekler
  if ((s.block[legOf(c.mv)] ?? 0) > s.t && c.s < p.stop - 22) stopAt(p.stop - 26);
  if (before && !vip && ((s.block[exitLeg] ?? 0) > s.t || s.closeOut[exitLeg])) stopAt(p.stop);
  // komşu kavşağa giden yol doldu: yolun ucunda durur, arkası kuyruk olur
  if (c.s > p.boxOut && linkFull(s, exitLeg)) stopAt(p.len - 0.5);
  // çıkışı tıkalıysa kutuya girmez (kavşağı kilitlemesin): çıkışın başında duran araç var
  if (before && !vip && s.cars.some((o) => o !== c && o.s > o.path.boxOut && o.s < o.path.boxOut + 12 && o.v < 1 && exitOf(legOf(o.mv), turnOf(o.mv) as Turn) === exitLeg)) stopAt(p.stop);
  if (before && (c.kind === 'vip' || c.kind === 'police')) {
    // konvoy ışığa bakmaz; yalnızca kutuda kaza varsa durur
    if (s.cars.some((o) => o.crashed !== undefined && p.box.some(([x, y]) => Math.hypot(center(o)[0] - x, center(o)[1] - y) < 3.5))) stopAt(p.stop);
  } else if (before && faulty(s)) {
    // arıza: dur, bak, geç; geçiş hakkını stepFault verir
    if (c.amber !== 'go') stopAt(p.stop);
  } else if (before) {
    const sig = signal(s, c.mv);
    const dist = p.stop - c.s;
    if (sig === 'green') c.amber = undefined;
    else if (sig === 'amber') {
      if (!c.amber) {
        const need = (c.v * c.v) / (2 * BRAKE);
        c.amber = dist < need * 0.95 || (c.bold && dist < c.v * (amberAt(s.plan, s.ctl.phase) - s.ctl.t)) ? 'go' : 'stop';
      }
      if (c.amber === 'stop') stopAt(p.stop);
    } else if (c.amber !== 'go' || c.v < 3 || dist > c.v * (c.bold ? 1.2 : 0.6) + 1) {
      c.amber = 'stop';
      stopAt(p.stop);
    }
    // kutuda kaza varsa girmez; çizgide duran, önünden geçen kutuda kalmış aracı bekler (hızla
    // gelen bakmaz: tüm kırmızı kısaysa çarpışma buradan çıkar)
    // her sürücü bakmaz: aceleci olan ve dalgın her beş kişiden biri yeşili görünce basar
    const look = c.v < 2 && dist < 4 && !c.bold && c.id % 5 !== 0;
    if (s.cars.some((o) => (o.crashed !== undefined || (look && o.s > o.path.stop && o.s - o.len < o.path.boxOut && legOf(o.mv) !== legOf(c.mv) && clash(o.mv, c.mv) !== 'none')) && p.box.some(([x, y]) => Math.hypot(center(o)[0] - x, center(o)[1] - y) < 3.5))) stopAt(p.stop);
  }
  // sola dönen karşıdan geleni bekler: biri kutunun ortasına çıkar, arkadaki çizgide kalır
  if (turnOf(c.mv) === 'L' && c.s < p.wait && !canGoLeft(s, c)) {
    const inside = s.cars.some((o) => o !== c && o.path === p && o.s > p.stop && o.s < p.boxOut);
    stopAt(before && inside ? p.stop : p.wait);
  }
  for (const x of p.cross) if (c.s < x.s0 && x.s0 - c.s < 30 && pedBlocks(s, x)) stopAt(x.s0 - 0.8);
  // ara sokağın ağzını tıkamaz: kuyruk ağıza dayanınca, sokakta bekleyen varsa ağzın berisinde durur
  if (before && c.v < 4)
    for (const x of s.sides) {
      if (x.side !== 1 || x.leg !== legOf(c.mv) || !x.queue[0]?.head || s.t - x.queue[0].head < 4) continue;
      const mouth = s.j.legs[x.leg]!.len - (x.at + SIDE_W / 2 + 1);
      if (c.s < mouth && mouth - c.s < 12) stopAt(mouth);
    }
  return { gap, v: vl };
}

export function stepCar(s: Sim, c: Car) {
  if (c.crashed !== undefined || c.broken) {
    c.v = 0;
    return;
  }
  const p = c.path;
  // sıradaki arıza: kolun ortasında, duruş çizgisine varmadan
  const bk = s.breakNext.findIndex((b) => b.mv === c.mv);
  if (bk >= 0 && c.kind !== 'ambulance' && c.kind !== 'vip' && c.kind !== 'police' && c.s > p.stop - 70 && c.s < p.stop - 12) {
    const b = s.breakNext.splice(bk, 1)[0];
    c.broken = true;
    c.v = 0;
    const [x, y] = pose(p, c.s - c.len / 2);
    addIncident(s, 'breakdown', x, y, b.text, b.sec, [c.id], legOf(c.mv));
    say(s, b.text, 'bad', true);
    return;
  }
  const turn = turnOf(c.mv);
  let v0 = speedOf(s, legOf(c.mv)) * (c.kind === 'bus' || c.kind === 'truck' ? 0.85 : 1);
  if (turn !== 'T') {
    if (c.s < p.stop) v0 = Math.min(v0, Math.sqrt(TURN_V * TURN_V + 2 * 1.6 * (p.stop - c.s)));
    else if (c.s < p.boxOut) v0 = Math.min(v0, TURN_V);
  }
  const { gap, v: vl } = obstacle(s, c);
  const rain = s.wet ? 1.35 : 1;
  const a0 = c.kind === 'bus' || c.kind === 'truck' ? ACCEL * 0.6 : ACCEL;
  let a = a0 * (1 - Math.pow(c.v / v0, 4));
  if (gap < Infinity) {
    const star = GAP + c.v * HEADWAY * rain + (c.v * (c.v - vl)) / (2 * Math.sqrt(a0 * BRAKE));
    a -= a0 * Math.pow(Math.max(0, star) / Math.max(0.1, gap), 2);
  }
  a = Math.max(-HARD_BRAKE / rain, a);
  c.braking = a < -0.6 || c.v < 0.5;
  c.v = Math.max(0, c.v + a * DT);
  if (gap < 0.05 && c.v < 1) c.v = 0;
  const was = c.s;
  c.s += c.v * DT;
  if (was < p.stop && c.s >= p.stop) c.entry = signal(s, c.mv);
  if (c.v < 1.2 && (c.kind !== 'vip' && c.kind !== 'police' ? true : c.s > p.stop - 40)) c.waited += DT;
}

/** Gövdenin önden arkaya birkaç noktası: uzun araçta daha çok. */
export function body(c: Car): [number, number][] {
  const n = c.len > 8 ? 5 : 3;
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const [x, y] = pose(c.path, c.s - 0.6 - ((c.len - 1.2) * i) / (n - 1));
    out.push([x, y]);
  }
  return out;
}

export function checkCrashes(s: Sim) {
  const { x0, x1, y0, y1 } = s.j.box;
  const inside = ([x, y]: [number, number]) => x > x0 - 1.5 && x < x1 + 1.5 && y > y0 - 1.5 && y < y1 + 1.5;
  const inBox = s.cars.filter((c) => c.s > c.path.stop - 1 && c.s - c.len < c.path.boxOut + 1);
  const bodies = new Map(inBox.map((c) => [c, body(c)]));
  for (let i = 0; i < inBox.length; i++)
    for (let k = i + 1; k < inBox.length; k++) {
      const a = inBox[i];
      const b = inBox[k];
      if (legOf(a.mv) === legOf(b.mv) || clash(a.mv, b.mv) === 'none') continue;
      if (a.crashed !== undefined && b.crashed !== undefined) continue;
      if (a.v < 0.5 && b.v < 0.5) continue;
      let hit: [number, number] | null = null;
      for (const pa of bodies.get(a)!)
        for (const pb of bodies.get(b)!) if (!hit && Math.hypot(pa[0] - pb[0], pa[1] - pb[1]) < 1.7 && (inside(pa) || inside(pb))) hit = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2];
      if (!hit) continue;
      a.crashed ??= s.t;
      b.crashed ??= s.t;
      s.crashes.push({ at: s.t, x: hit[0], y: hit[1], cars: [a.id, b.id] });
      if ([a, b].some((c) => c.kind === 'vip' || c.kind === 'police')) {
        s.vip.crash = true;
        say(s, 'Konvoy aracına çarpıldı! Koruma ekibi araçtan indi, kavşak karıştı.', 'bad');
      }
      const near = s.incidents.find((i) => i.kind === 'crash' && i.cleared === undefined && Math.hypot(i.x - hit![0], i.y - hit![1]) < 6);
      if (near) near.cars.push(a.id, b.id);
      else addIncident(s, 'crash', hit[0], hit[1], `Kavşağın ortasında kaza: ${KIND_NAME[a.kind]} ile ${KIND_NAME[b.kind]}.`, CRASH_CLEAR, [a.id, b.id]);
      const late = [a, b].find((c) => c.entry && c.entry !== 'green');
      const left = [a, b].find((c) => turnOf(c.mv) === 'L');
      const stuck = [a, b].find((c) => c.entry === 'green' && signal(s, c.mv) === 'red');
      if (stuck && !late) say(s, `Kaza! Kutuda kalan ${KIND_NAME[stuck.kind]} (${moveName(stuck.mv)}) çıkamadan çapraz yön yeşile döndü. Bu genişlikte kavşakta tüm kırmızı uzun olmalı.`, 'bad');
      else if (late) say(s, `Kaza! ${moveName(late.mv)} giden ${KIND_NAME[late.kind]} ${late.entry === 'red' ? 'kırmızıda' : 'sarının sonunda'} kutuya girdi, ${moveName(late === a ? b.mv : a.mv)} yeşilde kalkanla çarpıştı. Tüm kırmızı yetmedi.`, 'bad');
      else if (left) say(s, `Kaza! ${moveName(left.mv)} dönen ${KIND_NAME[left.kind]} karşıdan geleni yanlış kolladı.`, 'bad');
      else say(s, `Kaza! ${moveName(a.mv)} ile ${moveName(b.mv)} kutuda çarpıştı.`, 'bad');
    }
  for (const p of s.peds) {
    if (!p.walking || p.hit) continue;
    const g = s.j.legs[p.leg]!;
    const [px, py] = crossPoint(g, p.t, p.side);
    for (const c of s.cars) {
      if (c.v < 2 || c.crashed !== undefined || !c.path.cross.some((x) => x.leg === p.leg && c.s > x.s0 - 1 && c.s - c.len < x.s1)) continue;
      // yalnızca aracın önü çarpar; yayalar yanından geçen aracın gövdesine yürümez
      if (!body(c).slice(0, 2).some(([x, y]) => Math.hypot(x - px, y - py) < 1.4)) continue;
      p.hit = true;
      p.since = s.t;
      c.crashed = s.t;
      s.crashes.push({ at: s.t, x: px, y: py, cars: [c.id], ped: true });
      addIncident(s, 'crash', px, py, `${DIR_NAME[p.leg]} geçidinde yayaya çarpıldı.`, CRASH_CLEAR, [c.id]);
      say(s, `${DIR_NAME[p.leg]} geçidinde yayaya çarpıldı! ${p.jay ? 'Kırmızıda geçen yaya, sabrı tükenmişti.' : 'Yaya yeşilde yoldaydı.'} Ambulans çağrıldı.`, 'bad');
      break;
    }
  }
}

export const KIND_NAME: Record<Kind, string> = { car: 'otomobil', taxi: 'taksi', dolmus: 'dolmuş', truck: 'kamyonet', bus: 'otobüs', ambulance: 'ambulans', vip: 'makam aracı', police: 'polis aracı' };
