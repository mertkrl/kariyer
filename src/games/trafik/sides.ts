import { KIND_NAME } from './driving';
import { legOpen, route, say, type Side, type Sim, pickLane, count, divert, LEN, CUT_IN, pickKind, addCar, rng } from './sim';
import { addIncident } from './incidentSim';
import { exitOf, pose, type Junction, type LegGeo } from './junction';
import { CAR_COLORS, CRASH_CLEAR, DT, legOf, SIDE_GAP, SIDE_LOOK, SIDE_W, DIFFICULTY, turnOf, type Car, type Dir, type SideStreet, type Turn } from './model';

/*
 * Ara sokaklar: ışıksız sokaklardan ana yola çıkmayı bekleyen araçlar ve ana yoldan sokağa sapanlar.
 */

const STREETS = ['Gül', 'Lale', 'Menekşe', 'Papatya', 'Çınar', 'Ihlamur', 'Akasya', 'Söğüt', 'Kavak', 'Nane', 'Fesleğen', 'Zambak', 'Yasemin', 'Defne', 'Erik', 'Dut', 'Leylak', 'Badem', 'Nar', 'Ayva'];

/**
 * Kolların ara sokakları, tohumdan: her kolda en çok iki tane, birbirinden en az 55 m uzak. Kimi iki
 * yana geçen sokak (dört yol ağzı), kimi yalnızca bir yanda; kimi kısa çıkmaz. Komşuya bağlanan
 * kolda (boyu verilmiş) iki kavşağın ortasına kadar.
 */
export function sideStreets(j: Junction, seed: number): SideStreet[] {
  const r = rng(seed * 31 + 7);
  const out: SideStreet[] = [];
  let k = Math.floor(r() * STREETS.length);
  for (const g of Object.values(j.legs)) {
    const hi = g.len - (g.spec.len !== undefined ? 14 : 40);
    let at = g.stop + 34 + r() * 30;
    let n = 0;
    while (at < hi && n < 2) {
      if (r() < 0.8) {
        const x = r();
        const sides: (1 | -1)[] = x < 0.4 ? [1, -1] : x < 0.72 ? [1] : [-1];
        const name = `${STREETS[k++ % STREETS.length]} Sk.`;
        const short = r() < 0.25;
        for (const side of sides) out.push({ leg: g.dir, at: Math.round(at), side, name, short });
        n++;
      }
      at += 55 + r() * 50;
    }
  }
  return out;
}

/* ───────────── Ara sokaklar ───────────── */

/** Ara sokağın ağzında, ana yola bakan sıradaki aracın duruşu (sokakta `k`. sırada). */
export function sidePose(s: Sim, x: Side | SideStreet, k: number, len = 4.4): [number, number, number] {
  const g = s.j.legs[x.leg]!;
  // sokaktan çıkan sağ şeritte: kavşağa yakın yarı
  const along = x.at - SIDE_W / 4;
  const lat = g.inW + 0.8 + len / 2 + k * 6.6;
  return [g.u[0] * along + g.rin[0] * lat, g.u[1] * along + g.rin[1] * lat, Math.atan2(g.rout[1], g.rout[0])];
}

/** Sokağa sapan aracın yolu: giden şeritten sağa kıvrılıp sokağın sağ şeridinde uzaklaşır. */
export function ghostPath(g: LegGeo, from: [number, number], at: number): [number, number][] {
  const along = at - SIDE_W / 4;
  const a0 = from[0] * g.u[0] + from[1] * g.u[1];
  const l0 = from[0] * g.rout[0] + from[1] * g.rout[1];
  const pt = (a: number, l: number): [number, number] => [g.u[0] * a + g.rout[0] * l, g.u[1] * a + g.rout[1] * l];
  const pts: [number, number][] = [pt(a0 - 8, l0)];
  // dörtte bir eğri: şeritten sokağın şeridine
  const l1 = g.outW + 3;
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const a = (1 - t) * (1 - t) * a0 + 2 * (1 - t) * t * along + t * t * along;
    const l = (1 - t) * (1 - t) * l0 + 2 * (1 - t) * t * l0 + t * t * l1;
    pts.push(pt(a, l));
  }
  pts.push(pt(along, g.outW + 60));
  return pts;
}

export function stepSides(s: Sim) {
  for (const x of s.sides) {
    if (x.side !== 1) continue;
    const g = s.j.legs[x.leg]!;
    // komşuya bağlanan koldaki sokağın kendi küçük talebi (kolun ucundan gelen talep yok)
    if (s.links[x.leg]) {
      x.acc += (1.2 * DIFFICULTY[s.diff].demand * DT * (0.5 + s.rand())) / 60;
      if (x.acc >= 1) {
        x.acc -= 1;
        const t = route(s, x.leg);
        if (t) {
          const k = pickKind(s);
          x.queue.push({ mv: `${x.leg}.${t}`, born: s.t, kind: k === 'bus' ? 'car' : k, color: Math.floor(s.rand() * CAR_COLORS.length), id: s.nextId++ });
          count(s, `${x.leg}.${t}`);
        }
      }
    }
    const head = x.queue[0];
    if (!head) continue;
    // kapalı kol ya da kapalı ağız: sokaktakiler başka sokaklardan dolaşır
    if (!legOpen(s, x.leg) || x.rule === 'closed') {
      for (const c of x.queue.splice(0)) divert(s, c.mv, c.born);
      continue;
    }
    if (!legOpen(s, exitOf(x.leg, turnOf(head.mv) as Turn))) {
      const t = route(s, x.leg, turnOf(head.mv) as Turn);
      if (!t) {
        x.queue.shift();
        divert(s, head.mv, head.born);
        continue;
      }
      head.mv = `${x.leg}.${t}`;
    }
    head.head ??= s.t;
    const stop = x.rule === 'stop';
    if (s.t - head.head < SIDE_LOOK * (stop ? 2.5 : 1)) continue;
    // sabrı tükenen sürücü (yalnızca yol ver levhasında) küçük boşluğa dalar
    const rash = !stop && s.t - head.head > CUT_IN;
    const turn = turnOf(head.mv);
    const curb = g.spec.lanes.length - 1;
    const lane = g.spec.lanes[curb].includes(turn) ? curb : pickLane(s, head.mv);
    const path = s.j.paths.get(`${head.mv}:${lane}`);
    if (!path) {
      x.queue.shift();
      continue;
    }
    const len = LEN[head.kind];
    // ağızdan sağa dönünce şeritteki yeri: burnu sokağın biraz berisinde
    const at = g.len - (x.at - SIDE_W / 4 - 3);
    let ok = true;
    // arkadan gelen en yakın araç: araya girişin bedelini o öder
    let behind: Car | null = null;
    for (const c of s.cars) {
      if (legOf(c.mv) !== x.leg || c.lane !== lane || c.s > c.path.stop + 1) continue;
      if (c.s >= at - 0.5) {
        if (c.s - c.len - at < 3.5) ok = false;
      } else {
        const gap = at - len - c.s;
        if (gap < (rash ? 1.5 + c.v * 0.9 : 3 + c.v * SIDE_GAP * (stop ? 1.4 : 1))) ok = false;
        if (!behind || c.s > behind.s) behind = c;
      }
      if (!ok) break;
    }
    if (!ok) continue;
    x.queue.shift();
    const [px, py, pa] = sidePose(s, x, 0, len);
    const car = addCar(s, head.mv, lane, path, head.born, head.kind, at, 2.5, head.color, head.id);
    car.enter = { x: px, y: py, a: pa, s: at };
    const tight = behind && at - len - behind.s < 3 + behind.v * SIDE_GAP;
    if (rash && behind && tight) {
      s.cutIns++;
      // hızlı gelen duramaz: arkadan çarpar ve şerit kapanır
      if (behind.v > 7 && at - len - behind.s < behind.v * 0.7 && s.rand() < 0.4) {
        car.crashed = s.t;
        behind.crashed = s.t;
        const [hx, hy] = pose(path, at - len);
        s.crashes.push({ at: s.t, x: hx, y: hy, cars: [car.id, behind.id] });
        addIncident(s, 'crash', hx, hy, `${x.name} ağzında kaza: sokaktan dalan ${KIND_NAME[car.kind]} ile arkadan gelen ${KIND_NAME[behind.kind]}.`, CRASH_CLEAR, [car.id, behind.id], x.leg);
        say(s, `Kaza! ${x.name}’ta ${Math.round(s.t - head.head)} saniye bekleyen sürücü sabredemeyip araya daldı, arkadan gelen duramadı. Ağza DUR levhası koy ya da ana yolun kuyruğunu erit.`, 'bad', true);
      } else say(s, `${x.name}’ta ${Math.round(s.t - head.head)} saniye bekleyen sürücü sabredemedi, araya daldı: arkadaki sert fren yaptı.`, 'bad', true);
    }
  }
  for (const gh of s.ghosts) gh.d += gh.v * DT;
  s.ghosts = s.ghosts.filter((gh) => gh.d < gh.cum[gh.cum.length - 1]);
}

/** Kolun ara sokaklarında ana yola çıkmayı bekleyen araçlar. */
export const sideQueue = (s: Sim, d: Dir) => s.sides.filter((x) => x.leg === d).flatMap((x) => x.queue);
