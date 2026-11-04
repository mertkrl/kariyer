import { createRef, useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { prefersReducedMotion } from '../../../components/ui/motion';
import { Gull, type GullParts } from './Gull';
import { rng } from './paint';
import * as snd from './sounds';

/*
 * Güvertenin üstündeki uçuşlar, kare kare (requestAnimationFrame). İki üç martı vapurla birlikte
 * süzülür: yerleri hafifçe salınır, arada birkaç kez kanat çırpar. Simit atılınca: simit dört
 * parçaya bölünür, kırıntılar küpeştenin üstüne dökülür, parçalar sırayla havaya atılır; her
 * parçaya bir martı süzülerek dalar, parçayı tam tepe noktasında gagasıyla kapar ve kanat çırparak
 * uzaklaşır. Süzülen martılar birkaç saniye sonra geri gelir. Hareketi azalt diyende uçuş yok.
 */

/** Simidin küpeştedeki yeri (Deck.tsx ile aynı). */
export const SIMIT: [number, number] = [690, 776];
const OUT: [number, number] = [46, 15];
const IN: [number, number] = [17, 5.5];
const G = 900;

type Vec = [number, number];

interface Piece {
  d: string;
  seeds: string;
  edge: string;
  c: Vec;
}

/** Simidin dört parçası: dış ve iç elipsin dilimleri, kırık kenarlar zikzaklı. */
function pieces(): Piece[] {
  const rand = rng(8);
  const at = (r: Vec, a: number): Vec => [r[0] * Math.cos(a), r[1] * Math.sin(a) - (r === IN ? 1.5 : 0)];
  const out: Piece[] = [];
  for (let i = 0; i < 4; i++) {
    const a0 = ((-10 + i * 90 + 3) * Math.PI) / 180;
    const a1 = ((80 + i * 90 - 3) * Math.PI) / 180;
    const am = (a0 + a1) / 2;
    const c: Vec = [((OUT[0] + IN[0]) / 2) * Math.cos(am), ((OUT[1] + IN[1]) / 2) * Math.sin(am)];
    const pts: Vec[] = [];
    for (let k = 0; k <= 10; k++) pts.push(at(OUT, a0 + ((a1 - a0) * k) / 10));
    const jag = (a: number, from: Vec, to: Vec) => {
      for (let k = 1; k < 4; k++) {
        const t = k / 4;
        const j = (rand() - 0.5) * 4;
        pts.push([from[0] + (to[0] - from[0]) * t + j * Math.cos(a + Math.PI / 2), from[1] + (to[1] - from[1]) * t + j * 0.4]);
      }
    };
    jag(a1, at(OUT, a1), at(IN, a1));
    for (let k = 10; k >= 0; k--) pts.push(at(IN, a0 + ((a1 - a0) * k) / 10));
    jag(a0, at(IN, a0), at(OUT, a0));
    const rel = pts.map(([x, y]) => `${(x - c[0]).toFixed(1)} ${(y - c[1]).toFixed(1)}`);
    const seeds: string[] = [];
    for (let k = 0; k < 14; k++) {
      const a = a0 + rand() * (a1 - a0);
      const r = 0.2 + rand() * 0.7;
      const x = (IN[0] + (OUT[0] - IN[0]) * r) * Math.cos(a) - c[0];
      const y = (IN[1] + (OUT[1] - IN[1]) * r) * Math.sin(a) - c[1] - 2;
      seeds.push(`M${(x - 1.6).toFixed(1)} ${y.toFixed(1)}a1.6 0.9 0 1 0 3.2 0a1.6 0.9 0 1 0 -3.2 0`);
    }
    const e0 = at(OUT, a1);
    const e1 = at(IN, a1);
    out.push({
      d: `M${rel.join('L')}Z`,
      seeds: seeds.join(''),
      edge: `M${(e0[0] - c[0]).toFixed(1)} ${(e0[1] - c[1]).toFixed(1)}L${(e1[0] - c[0]).toFixed(1)} ${(e1[1] - c[1]).toFixed(1)}`,
      c,
    });
  }
  return out;
}

interface Bird {
  parts: GullParts & { root: RefObject<SVGGElement | null>; body: RefObject<SVGGElement | null>; left: RefObject<SVGGElement | null>; right: RefObject<SVGGElement | null> };
  home: Vec | null;
  scale: number;
  mode: 'hover' | 'dive' | 'leave' | 'gone' | 'return';
  pos: Vec;
  /** Kanat çırpma: başlangıç anı ve süresi. */
  flapUntil: number;
  nextFlap: number;
  path: { p0: Vec; p1: Vec; p2: Vec; t0: number; dur: number } | null;
  carry: number;
  phase: number;
}

interface Flying {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  /** Atılış anı (ms) ve kapılma anı. */
  throwAt: number;
  catchAt: number;
  state: 'held' | 'thrown' | 'caught' | 'gone';
  bird: number;
}

const bez = (a: Vec, b: Vec, c: Vec, t: number): Vec => [(1 - t) ** 2 * a[0] + 2 * t * (1 - t) * b[0] + t * t * c[0], (1 - t) ** 2 * a[1] + 2 * t * (1 - t) * b[1] + t * t * c[1]];

function makeBirds(): Bird[] {
  const homes: (Vec | null)[] = [[930, 214], [650, 318], [300, 160], null, null];
  const scales = [0.68, 0.56, 0.34, 0.66, 0.62];
  return homes.map((home, i) => ({
    parts: { root: createRef<SVGGElement>(), body: createRef<SVGGElement>(), left: createRef<SVGGElement>(), right: createRef<SVGGElement>() },
    home,
    scale: scales[i],
    mode: home ? 'hover' : 'gone',
    pos: home ?? [0, 0],
    flapUntil: 0,
    nextFlap: 1500 + i * 1700,
    path: null,
    carry: -1,
    phase: i * 1.7,
  }));
}

export function useFlight({ still, tint, facing }: { still: boolean; tint: string; facing: 1 | -1 }) {
  // kuşlar ve parçalar bir kez kurulur; her kare doğrudan öğelerin özniteliklerini değiştirir
  const [{ parts, birds, pieceRefs, crumbRefs }] = useState(() => {
    const parts = pieces();
    return {
      parts,
      birds: makeBirds(),
      pieceRefs: parts.map(() => createRef<SVGGElement>()),
      crumbRefs: Array.from({ length: 16 }, () => createRef<SVGCircleElement>()),
    };
  });
  const flying = useRef<Flying[]>([]);
  const crumbs = useRef<{ x: number; y: number; vx: number; vy: number; landed: number }[]>([]);
  const thrownAt = useRef(0);
  const face = useRef(facing);
  useEffect(() => {
    face.current = facing;
  }, [facing]);

  useEffect(() => {
    if (still || prefersReducedMotion()) return;
    let raf = 0;
    let last = performance.now();
    const start = last;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const T = (now - start) / 1000;
      // ── martılar
      birds.forEach((b, i) => {
        const el = b.parts.root.current;
        if (!el) return;
        let x = b.pos[0];
        let y = b.pos[1];
        let dir: number = face.current;
        let bank = 0;
        if (b.mode === 'hover' && b.home) {
          x = b.home[0] + 64 * Math.sin(0.11 * T + b.phase);
          y = b.home[1] + 20 * Math.sin(0.23 * T + b.phase * 2) + 4 * Math.sin(1.3 * T + b.phase);
          bank = 4 * Math.sin(0.23 * T + b.phase * 2);
        } else if (b.path) {
          const t = Math.min(1, (now - b.path.t0) / b.path.dur);
          const e = b.mode === 'dive' ? t * t * (3 - 2 * t) : t;
          [x, y] = bez(b.path.p0, b.path.p1, b.path.p2, e);
          const [nx, ny] = bez(b.path.p0, b.path.p1, b.path.p2, Math.min(1, e + 0.02));
          if (Math.abs(nx - x) > 0.01) dir = nx > x ? 1 : -1;
          bank = Math.max(-28, Math.min(28, (Math.atan2(ny - y, Math.abs(nx - x) + 0.001) * 180) / Math.PI)) * dir;
          if (t >= 1) {
            if (b.mode === 'dive') {
              // tam tepe noktasında: gaga parçayı kapar
              const f = flying.current.find((p) => p.bird === i && p.state === 'thrown');
              if (f) {
                f.state = 'caught';
                b.carry = flying.current.indexOf(f);
                snd.gull(0.9);
              }
              const side = x > 800 ? 1 : -1;
              b.mode = 'leave';
              b.flapUntil = now + 1600;
              snd.flaps(6);
              b.path = { p0: [x, y], p1: [x + side * 300, y - 30], p2: [x + side * 1000, y - 430], t0: now, dur: 1700 };
            } else if (b.mode === 'leave') {
              b.mode = 'gone';
              b.path = null;
              if (b.carry >= 0) flying.current[b.carry].state = 'gone';
              b.carry = -1;
              if (b.home) {
                // birkaç saniye sonra yanından süzülerek geri gelir
                const home = b.home;
                window.setTimeout(() => {
                  b.mode = 'return';
                  b.path = { p0: [home[0] - face.current * 900, home[1] - 160], p1: [home[0] - face.current * 300, home[1] + 60], p2: [home[0] + 64 * Math.sin(0.11 * ((performance.now() - start) / 1000 + 2.6) + b.phase), home[1]], t0: performance.now(), dur: 2600 };
                }, 5000 + i * 1500);
              }
            } else if (b.mode === 'return') {
              b.mode = 'hover';
              b.path = null;
            }
          }
        }
        b.pos = [x, y];
        el.style.display = b.mode === 'gone' ? 'none' : '';
        el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${bank.toFixed(1)}) scale(${b.scale})`);
        b.parts.body.current?.setAttribute('transform', `scale(${dir} 1)`);
        // kanat: süzülürken hafif yukarı, çırparken güçlü vuruşlar
        if (b.mode === 'hover' && now > b.nextFlap) {
          b.flapUntil = now + 900 + Math.random() * 700;
          b.nextFlap = now + 3500 + Math.random() * 4500;
        }
        const flapping = now < b.flapUntil || b.mode === 'return';
        const angle = flapping ? 8 + 34 * Math.sin(now / 48 + b.phase) : b.mode === 'dive' ? -24 : -9 + 3 * Math.sin(now / 420 + b.phase);
        b.parts.left.current?.setAttribute('transform', `rotate(${angle.toFixed(1)} 4 0)`);
        b.parts.right.current?.setAttribute('transform', `rotate(${angle.toFixed(1)} 4 0)`);
      });

      // ── simit parçaları
      flying.current.forEach((f, i) => {
        const el = pieceRefs[i].current;
        if (!el) return;
        const since = (now - thrownAt.current) / 1000;
        if (f.state === 'held') {
          // kırılma: parçalar merkezden biraz ayrılır
          const k = Math.min(1, since / 0.3);
          const c = parts[i].c;
          f.x = SIMIT[0] + c[0] * (1 + 0.45 * k);
          f.y = SIMIT[1] + c[1] * (1 + 0.45 * k) - 10 * k;
          f.rot = (i % 2 ? 1 : -1) * 8 * k;
          if (now >= f.throwAt) {
            f.state = 'thrown';
            snd.whoosh();
          }
        } else if (f.state === 'thrown') {
          f.vy += G * dt;
          f.x += f.vx * dt;
          f.y += f.vy * dt;
          f.rot += f.vr * dt;
        } else if (f.state === 'caught') {
          const b = birds[f.bird];
          const dir = b.pos[0] > 800 ? 1 : -1;
          f.x = b.pos[0] + 40 * b.scale * dir;
          f.y = b.pos[1] - 1 * b.scale;
          f.rot = dir * 10;
        }
        el.style.display = f.state === 'gone' ? 'none' : '';
        el.setAttribute('transform', `translate(${f.x.toFixed(1)} ${f.y.toFixed(1)}) rotate(${f.rot.toFixed(0)}) scale(${f.state === 'caught' ? 0.5 : 1})`);
      });

      // ── kırıntılar küpeştenin üstüne dökülür
      crumbs.current.forEach((c, i) => {
        const el = crumbRefs[i].current;
        if (!el) return;
        if (!c.landed) {
          c.vy += G * dt;
          c.x += c.vx * dt;
          c.y += c.vy * dt;
          if (c.y >= SIMIT[1] + 14) {
            c.y = SIMIT[1] + 14;
            c.landed = now;
          }
        }
        const fade = c.landed ? Math.max(0, 1 - (now - c.landed) / 2500) : 1;
        el.setAttribute('cx', c.x.toFixed(1));
        el.setAttribute('cy', c.y.toFixed(1));
        el.setAttribute('opacity', fade.toFixed(2));
      });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [still, parts, birds, pieceRefs, crumbRefs]);

  /** Simidi böl, at: her parçaya bir martı. */
  const throwSimit = useCallback(() => {
    if (still || prefersReducedMotion()) return;
    const now = performance.now();
    thrownAt.current = now;
    snd.tear();
    const rand = Math.random;
    crumbs.current = crumbRefs.map(() => ({ x: SIMIT[0] + (rand() - 0.5) * 60, y: SIMIT[1] - 6, vx: (rand() - 0.5) * 160, vy: -60 - rand() * 160, landed: 0 }));
    // martılar: ilk ikisi yanımızda süzülenler, ötekiler yandan gelir
    const order = [0, 1, 3, 4];
    flying.current = parts.map((_, i) => {
      const throwAt = now + 520 + i * 420;
      const vx = [-250, -70, 150, 330][i] + (rand() - 0.5) * 60;
      const vy = -760 - rand() * 90;
      const lift = 0.62;
      const catchAt = throwAt + lift * 1000;
      const start: Vec = [SIMIT[0] + parts[i].c[0] * 1.45, SIMIT[1] + parts[i].c[1] * 1.45 - 10];
      const target: Vec = [start[0] + vx * lift, start[1] + vy * lift + 0.5 * G * lift * lift];
      const bi = order[i];
      const b = birds[bi];
      const dur = 1000;
      const begin = catchAt - dur;
      window.setTimeout(() => {
        const side = target[0] > 800 ? 1 : -1;
        const p0: Vec = b.mode === 'hover' ? [...b.pos] : [target[0] + side * 760, target[1] - 200];
        b.mode = 'dive';
        b.carry = -1;
        b.path = { p0, p1: [(p0[0] + target[0]) / 2, Math.max(p0[1], target[1]) + 110], p2: target, t0: performance.now(), dur: Math.max(400, catchAt - performance.now()) };
      }, Math.max(0, begin - now));
      return { x: start[0], y: start[1], vx, vy, rot: 0, vr: (rand() < 0.5 ? -1 : 1) * (280 + rand() * 360), throwAt, catchAt, state: 'held' as const, bird: bi };
    });
  }, [parts, still, birds, crumbRefs]);

  const gulls: ReactNode = birds.map((b, i) => <Gull key={i} rootRef={b.parts.root} bodyRef={b.parts.body} leftRef={b.parts.left} rightRef={b.parts.right} tint={tint} />);

  const flyingPieces: ReactNode = (
    <g>
      {crumbRefs.map((r, i) => (
        <circle key={i} ref={r} r={i % 3 ? 1.4 : 2.2} fill={i % 3 ? '#f2e2b8' : '#a8682f'} opacity={0} />
      ))}
      {parts.map((p, i) => (
        <g key={i} ref={pieceRefs[i]} style={{ display: 'none' }}>
          <path d={p.d} fill="url(#vapur-simit)" stroke="#5a3215" strokeWidth={1} />
          <path d={p.edge} stroke="#f0d9a6" strokeWidth={3} strokeLinecap="round" />
          <path d={p.seeds} fill="#f6e7bf" />
        </g>
      ))}
    </g>
  );

  return { gulls, pieces: flyingPieces, throwSimit };
}
