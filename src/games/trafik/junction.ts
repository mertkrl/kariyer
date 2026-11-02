import { CROSSWALK_W, DIRS, LANE_W, LEG_LEN, legOf, moveName, turnOf, type Dir, type LegSpec, type MoveId, type Path, type Phase, type Turn } from './model';

/*
 * Kavşağın geometrisi ve çakışma tablosu. Her kolun bir dışa bakan birim yönü var; gelen şeritler
 * sürücünün sağında, giden şeritler karşı yarıda durur (sağdan akan trafik). Kutu, kolların
 * kesiştiği dikdörtgendir; her kolda kutudan sonra yaya geçidi, onun ardında duruş çizgisi gelir.
 * Bir aracın yolu üç parçadır: gelen şerit, kutudaki dönüş eğrisi, giden şerit.
 *
 * Çakışma tablosu gerçek kontrolörlerdeki gibidir: "sert" çakışan iki hareket aynı evrede yeşil
 * yanamaz (çakışma denetçisi izin vermez); "izinli" çakışmada biri ötekine yol verir: sola dönen
 * karşıdan geleni, dönen araç geçitteki yayayı bekler.
 */

export const IDX: Record<Dir, number> = { N: 0, E: 1, S: 2, W: 3 };
export const U: Record<Dir, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
const at = (i: number) => DIRS[(i + 4) % 4];
export const exitOf = (d: Dir, t: Turn): Dir => at(IDX[d] + (t === 'L' ? 1 : t === 'T' ? 2 : 3));

export interface LegGeo {
  dir: Dir;
  spec: LegSpec;
  u: [number, number];
  /** Gelen trafiğin sağı (kaldırım yönü) ve giden trafiğin sağı. */
  rin: [number, number];
  rout: [number, number];
  half: number;
  inW: number;
  outW: number;
  /** Kutunun bu koldaki kenarı, geçidin iki kenarı ve duruş çizgisi (merkezden uzaklık). */
  edge: number;
  cw0: number;
  cw1: number;
  stop: number;
  crosswalk: boolean;
  /** Kolun boyu: araçların doğduğu ve çıktığı uç. */
  len: number;
}

export interface Junction {
  legs: Partial<Record<Dir, LegGeo>>;
  /** Kutunun dört kenarı: x en az/en çok, y en az/en çok. */
  box: { x0: number; x1: number; y0: number; y1: number };
  moves: MoveId[];
  /** Hareketin yolları: gelen şerit numarasına göre. */
  paths: Map<string, Path>;
}

const add = (a: [number, number], b: [number, number], k = 1): [number, number] => [a[0] + b[0] * k, a[1] + b[1] * k];

export function inPoint(g: LegGeo, lane: number, s: number): [number, number] {
  return add(add([0, 0], g.u, s), g.rin, g.half + (lane + 0.5) * LANE_W);
}

export function outPoint(g: LegGeo, lane: number, s: number): [number, number] {
  return add(add([0, 0], g.u, s), g.rout, g.half + (lane + 0.5) * LANE_W);
}

/** Geçit üstündeki konum: 0 gelen yarının kaldırımı, 1 giden yarının kaldırımı. */
export function crossPoint(g: LegGeo, t: number, side = 0): [number, number] {
  const lat = -g.inW - 1 + t * (g.inW + g.outW + 2);
  return add(add([0, 0], g.u, (g.cw0 + g.cw1) / 2 + side), g.rout, lat);
}

export function buildJunction(legs: Partial<Record<Dir, LegSpec>>): Junction {
  const geo: Partial<Record<Dir, LegGeo>> = {};
  for (const d of DIRS) {
    const spec = legs[d];
    if (!spec) continue;
    const u = U[d];
    const half = (spec.median ?? 0) / 2;
    geo[d] = {
      dir: d,
      spec,
      u,
      rin: [u[1], -u[0]],
      rout: [-u[1], u[0]],
      half,
      inW: half + spec.lanes.length * LANE_W,
      outW: half + spec.out * LANE_W,
      edge: 0,
      cw0: 0,
      cw1: 0,
      stop: 0,
      crosswalk: spec.crosswalk !== false,
      len: spec.len ?? LEG_LEN,
    };
  }
  // kutunun kenarları: dik kolların o yana düşen yarı genişliklerinin en büyüğü
  const side = (d: Dir, toward: [number, number]) => {
    const g = geo[d];
    if (!g) return 0;
    return g.rin[0] * toward[0] + g.rin[1] * toward[1] > 0 ? g.inW : g.outW;
  };
  const ext = (d: Dir) => {
    const v = U[d];
    const across = d === 'N' || d === 'S' ? (['E', 'W'] as Dir[]) : (['N', 'S'] as Dir[]);
    return Math.max(4, ...across.map((a) => side(a, v)));
  };
  const box = { x0: -ext('W'), x1: ext('E'), y0: -ext('N'), y1: ext('S') };
  for (const g of Object.values(geo)) {
    g.edge = ext(g.dir) + 1.5;
    g.cw0 = g.edge + 1;
    g.cw1 = g.cw0 + CROSSWALK_W;
    g.stop = g.crosswalk ? g.cw1 + 1.5 : g.edge + 1;
  }

  const moves: MoveId[] = [];
  const paths = new Map<string, Path>();
  for (const g of Object.values(geo)) {
    for (const t of ['L', 'T', 'R'] as Turn[]) {
      const lanes = g.spec.lanes.map((l, i) => (l.includes(t) ? i : -1)).filter((i) => i >= 0);
      const e = geo[exitOf(g.dir, t)];
      if (!lanes.length || !e) continue;
      const mv = `${g.dir}.${t}` as MoveId;
      moves.push(mv);
      lanes.forEach((lane, k) => {
        const exitLane = t === 'L' ? 0 : t === 'R' ? e.spec.out - 1 : Math.max(0, Math.min(e.spec.out - 1, e.spec.out - lanes.length + k));
        paths.set(`${mv}:${lane}`, makePath(geo, g, lane, e, exitLane, t));
      });
    }
  }
  for (const g of Object.values(geo)) if (g.crosswalk) moves.push(`${g.dir}.P`);
  return { legs: geo, box, moves, paths };
}

function makePath(geo: Partial<Record<Dir, LegGeo>>, g: LegGeo, lane: number, e: LegGeo, exitLane: number, t: Turn): Path {
  const p0 = inPoint(g, lane, g.len);
  const p1 = inPoint(g, lane, g.stop);
  const p2 = outPoint(e, exitLane, e.stop);
  const p3 = outPoint(e, exitLane, e.len);
  const ctrl: [number, number] = t === 'T' ? [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2] : g.u[0] === 0 ? [p1[0], p2[1]] : [p2[0], p1[1]];
  const curve: [number, number][] = [];
  const N = 18;
  for (let i = 0; i <= N; i++) {
    const k = i / N;
    const a = (1 - k) * (1 - k);
    const b = 2 * (1 - k) * k;
    const c = k * k;
    curve.push([a * p1[0] + b * ctrl[0] + c * p2[0], a * p1[1] + b * ctrl[1] + c * p2[1]]);
  }
  const pts: [number, number][] = [p0, ...curve, p3];
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const stop = cum[1];
  const boxOut = cum[pts.length - 2];
  // sola dönen, gövdesi karşı yönün şeridine taşmadan bekleyebildiği son noktaya kadar ilerler
  let wait = stop + 2;
  if (t === 'L')
    curve.forEach((q, i) => {
      if (q[0] * g.rin[0] + q[1] * g.rin[1] >= g.half + 1) wait = Math.max(wait, cum[i + 1]);
    });
  const path: Path = { pts, cum, len: cum[cum.length - 1], stop, boxOut, wait, cross: [], box: curve };
  // yolun geçtiği yaya geçitleri: yarım metre adımlarla bant içinde mi diye bakılır
  for (const k of Object.values(geo)) {
    if (!k.crosswalk) continue;
    let s0 = -1;
    let s1 = -1;
    let lat = 0;
    for (let s = stop - 8; s < Math.min(path.len, boxOut + 8); s += 0.5) {
      const [x, y] = pose(path, s);
      const along = x * k.u[0] + y * k.u[1];
      const across = x * k.rout[0] + y * k.rout[1];
      if (along >= k.cw0 && along <= k.cw1 && across >= -k.inW && across <= k.outW) {
        if (s0 < 0) {
          s0 = s;
          lat = across;
        }
        s1 = s;
      }
    }
    if (s0 >= 0) path.cross.push({ leg: k.dir, s0: s0 - 0.5, s1: s1 + 0.5, at: (lat + k.inW + 1) / (k.inW + k.outW + 2) });
  }
  return path;
}

/** Yolun s metresindeki nokta ve yön açısı. */
export function pose(p: Path, s: number): [number, number, number] {
  const { pts, cum } = p;
  if (s <= 0) return [pts[0][0], pts[0][1], Math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0])];
  let i = 1;
  // gelen şerit uzun, kutu kısa: çoğu araç ilk parçada
  if (s > cum[1]) {
    i = 2;
    while (i < cum.length - 1 && cum[i] < s) i++;
  }
  const a = pts[i - 1];
  const b = pts[i];
  const seg = cum[i] - cum[i - 1] || 1;
  const k = Math.min(1, (s - cum[i - 1]) / seg);
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, Math.atan2(b[1] - a[1], b[0] - a[0])];
}

export type Clash = 'none' | 'soft' | 'hard';

/**
 * İki hareketin çakışması. Sert: aynı evrede yeşil yanamaz. İzinli: ilk hareket ikinciye yol verir
 * (ya da tersi); `yields` hangisinin beklediğini söyler.
 */
export function clash(a: MoveId, b: MoveId): Clash {
  const ta = turnOf(a);
  const tb = turnOf(b);
  const da = legOf(a);
  const db = legOf(b);
  if (ta === 'P' && tb === 'P') return 'none';
  if (ta === 'P' || tb === 'P') {
    const [p, m] = ta === 'P' ? [a, b] : [b, a];
    const k = legOf(p);
    const t = turnOf(m) as Turn;
    if (legOf(m) === k) return 'hard';
    if (exitOf(legOf(m), t) === k) return t === 'T' ? 'hard' : 'soft';
    return 'none';
  }
  const rel = (IDX[db] - IDX[da] + 4) % 4;
  if (rel === 0) return 'none';
  if (rel === 2) return (ta === 'L') !== (tb === 'L') ? 'soft' : 'none';
  // rel 1: b, a'nın solundaki koldan gelir; rel 3 bunun tersidir
  const [x, y] = rel === 1 ? [ta, tb] : [tb, ta];
  if (y === 'R') return 'none';
  if (x === 'R') return y === 'T' ? 'hard' : 'none';
  return 'hard';
}

/** İzinli çakışmada `a`, `b`'ye yol verir mi. */
export function yields(a: MoveId, b: MoveId): boolean {
  if (clash(a, b) !== 'soft') return false;
  if (turnOf(b) === 'P') return true;
  if (turnOf(a) === 'P') return false;
  return turnOf(a) === 'L';
}

/** Evredeki sert çakışmalar: denetçi bunları reddeder. */
export function hardClashes(moves: MoveId[]): [MoveId, MoveId][] {
  const out: [MoveId, MoveId][] = [];
  for (let i = 0; i < moves.length; i++) for (let j = i + 1; j < moves.length; j++) if (clash(moves[i], moves[j]) === 'hard') out.push([moves[i], moves[j]]);
  return out;
}

/** Evreye eklenince hangi harekete sert çakışır: düğmenin altındaki not. */
export function blockerOf(phase: Phase, mv: MoveId): MoveId | null {
  return phase.moves.find((m) => m !== mv && clash(m, mv) === 'hard') ?? null;
}

/** Geçidi karşıya geçmenin süresi: yeşilin başı + yürüme. */
export function crossTime(g: LegGeo, v: number) {
  return (g.inW + g.outW + 2) / v;
}

export const clashText = (a: MoveId, b: MoveId) => `${moveName(a)} ile ${moveName(b)} çakışır`;
