import type { ReactNode } from 'react';
import type { SceneId, Widget } from './model';
import { hash01 as rnd } from '../../shared/random';

/*
 * Video alanının manzaraları: düz SVG, degradeler ve katmanlarla; hareket `seconds`'a bağlı olduğu
 * için PNG'de de aynı kare çıkar. Boğaz: gün batımında asma köprü, üstünde akan trafik, altında
 * vapur. Karlı orman: katman katman dağlar, karlı çamlar, yağan kar.
 */

interface Frame {
  wd: Widget;
  seconds: number;
  /** Kesirli konumdan sanal koordinata. */
  X: (f: number) => number;
  Y: (f: number) => number;
  id: (name: string) => string;
}

/** Bir sırt çizgisi: sin dalgalarından, alttan kapalı. */
function ridge({ X, Y }: Frame, base: number, amp: number, seed: number, steps = 24) {
  let d = `M${X(0)} ${Y(1)}`;
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const y = base + amp * (Math.sin(f * 6.3 + seed) * 0.6 + Math.sin(f * 13.7 + seed * 2) * 0.25 + (rnd(seed * 50 + i) - 0.5) * 0.3);
    d += ` L${X(f)} ${Y(y)}`;
  }
  return `${d} L${X(1)} ${Y(1)} Z`;
}

function Bosphorus(fr: Frame) {
  const { wd, seconds, X, Y, id } = fr;
  const deck = 0.585;
  const towers = [0.2, 0.8];
  // ana kablo: iki kule arasında sarkan eğri; askı halatları ondan güverteye iner
  const cable = (u: number) => ({ x: (1 - u) ** 2 * towers[0] + 2 * u * (1 - u) * 0.5 + u ** 2 * towers[1], y: (1 - u) ** 2 * 0.17 + 2 * u * (1 - u) * 0.95 + u ** 2 * 0.17 });
  const hangers = Array.from({ length: 23 }, (_, k) => cable((k + 1) / 24));
  const shore = Array.from({ length: 34 }, (_, i) => ({ f: i / 34, h: 0.03 + rnd(i) * 0.07, w: 0.018 + rnd(i + 99) * 0.012 }));
  const cars = Array.from({ length: 14 }, (_, i) => {
    const dir = i % 2 ? 1 : -1;
    const speed = 0.05 + rnd(i + 7) * 0.04;
    const f = (((rnd(i + 3) + dir * seconds * speed) % 1.2) + 1.2) % 1.2 - 0.1;
    return { f, dir, color: ['#d9d9d9', '#b8312f', '#2c3e50', '#f1c40f', '#ecf0f1', '#34495e'][i % 6] };
  });
  const ferry = ((seconds * 0.012 + 0.15) % 1.3) - 0.15;
  return (
    <>
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3d5a89" />
          <stop offset="0.45" stopColor="#c98aa0" />
          <stop offset="0.75" stopColor="#f6b36b" />
          <stop offset="1" stopColor="#fbd38d" />
        </linearGradient>
        <linearGradient id={id('sea')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c27b72" />
          <stop offset="0.25" stopColor="#4d5f86" />
          <stop offset="1" stopColor="#1b2a45" />
        </linearGradient>
        <radialGradient id={id('sun')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff4d6" />
          <stop offset="0.35" stopColor="#ffd28a" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffb36b" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x={X(0)} y={Y(0)} width={wd.w} height={wd.h} fill={`url(#${id('sky')})`} />
      <circle cx={X(0.62)} cy={Y(0.5)} r={wd.w * 0.16} fill={`url(#${id('sun')})`} />
      {[0, 1, 2].map((k) => {
        const x = ((rnd(k + 40) + seconds * 0.004 * (k + 1)) % 1.3) - 0.15;
        return <ellipse key={k} cx={X(x)} cy={Y(0.12 + k * 0.08)} rx={wd.w * (0.12 - k * 0.02)} ry={wd.h * 0.018} fill="#ffe3d0" fillOpacity={0.35} />;
      })}
      {/* karşı kıyı: tepeler ve pencereleri yanan binalar */}
      <path d={ridge(fr, 0.53, 0.05, 2)} fill="#5b4a6b" />
      {shore.map((b, i) => (
        <g key={i}>
          <rect x={X(b.f)} y={Y(0.6 - b.h)} width={wd.w * b.w} height={wd.h * b.h} fill="#3e3150" />
          {rnd(i + 5) > 0.4 && <rect x={X(b.f) + wd.w * b.w * 0.3} y={Y(0.6 - b.h * 0.7)} width={2} height={2} fill="#ffd98a" />}
          {rnd(i + 8) > 0.5 && <rect x={X(b.f) + wd.w * b.w * 0.6} y={Y(0.6 - b.h * 0.4)} width={2} height={2} fill="#ffd98a" />}
        </g>
      ))}
      <rect x={X(0)} y={Y(0.6)} width={wd.w} height={wd.h * 0.4} fill={`url(#${id('sea')})`} />
      {/* denizde güneşin yansıması ve kıpırdayan dalgalar */}
      {Array.from({ length: 26 }, (_, i) => {
        const y = 0.62 + (i / 26) * 0.36;
        const spread = 0.04 + (y - 0.6) * 0.5;
        const x = 0.62 + Math.sin(seconds * 1.3 + i * 1.7) * spread * 0.4;
        return <rect key={i} x={X(x - spread * 0.3)} y={Y(y)} width={wd.w * spread * 0.6 * (0.4 + rnd(i) * 0.6)} height={1.5 + y * 2} fill="#ffd9a0" fillOpacity={0.55 - (y - 0.6)} />;
      })}
      {Array.from({ length: 18 }, (_, i) => (
        <rect key={`w${i}`} x={X((rnd(i + 70) + seconds * 0.01) % 1)} y={Y(0.66 + rnd(i + 80) * 0.32)} width={wd.w * 0.03} height={1.5} fill="#ffffff" fillOpacity={0.18} />
      ))}
      {/* vapur */}
      <g transform={`translate(${X(ferry)} ${Y(0.8)})`}>
        <path d={`M${-wd.w * 0.09} 0 L${wd.w * 0.09} 0 L${wd.w * 0.075} ${wd.h * 0.035} L${-wd.w * 0.08} ${wd.h * 0.035} Z`} fill="#f4f1ea" />
        <rect x={-wd.w * 0.088} y={wd.h * 0.012} width={wd.w * 0.176} height={wd.h * 0.006} fill="#b8312f" />
        <rect x={-wd.w * 0.06} y={-wd.h * 0.03} width={wd.w * 0.11} height={wd.h * 0.03} fill="#ece6d8" />
        {Array.from({ length: 7 }, (_, k) => (
          <rect key={k} x={-wd.w * 0.055 + k * wd.w * 0.015} y={-wd.h * 0.022} width={wd.w * 0.008} height={wd.h * 0.01} fill="#34495e" />
        ))}
        <rect x={wd.w * 0.005} y={-wd.h * 0.06} width={wd.w * 0.016} height={wd.h * 0.03} fill="#2c2c2c" />
        <rect x={wd.w * 0.005} y={-wd.h * 0.05} width={wd.w * 0.016} height={wd.h * 0.006} fill="#f0b429" />
        <path d={`M${-wd.w * 0.09} ${wd.h * 0.033} Q${-wd.w * 0.2} ${wd.h * 0.03} ${-wd.w * 0.3} ${wd.h * 0.045}`} stroke="#ffffff" strokeOpacity={0.35} strokeWidth={2} fill="none" />
      </g>
      {/* köprü: kuleler, ana kablo, askılar, güverte ve trafik */}
      {hangers.map((p, k) => (
        <line key={k} x1={X(p.x)} y1={Y(p.y)} x2={X(p.x)} y2={Y(deck)} stroke="#2a2433" strokeWidth={1} strokeOpacity={0.8} />
      ))}
      <path d={`M${X(-0.05)} ${Y(0.56)} Q${X(0.1)} ${Y(0.42)} ${X(towers[0])} ${Y(0.17)} Q${X(0.5)} ${Y(0.95)} ${X(towers[1])} ${Y(0.17)} Q${X(0.9)} ${Y(0.42)} ${X(1.05)} ${Y(0.56)}`} stroke="#2a2433" strokeWidth={3} fill="none" />
      {towers.map((t) => (
        <g key={t} fill="#2a2433">
          <rect x={X(t) - 7} y={Y(0.15)} width={5} height={wd.h * 0.5} />
          <rect x={X(t) + 2} y={Y(0.15)} width={5} height={wd.h * 0.5} />
          {[0.2, 0.36, 0.5].map((y) => (
            <rect key={y} x={X(t) - 7} y={Y(y)} width={14} height={3} />
          ))}
        </g>
      ))}
      <rect x={X(0)} y={Y(deck)} width={wd.w} height={wd.h * 0.022} fill="#2a2433" />
      <rect x={X(0)} y={Y(deck) - 2} width={wd.w} height={2} fill="#5c536b" />
      {cars.map((c, i) => (
        <g key={i} transform={`translate(${X(c.f)} ${Y(deck) - (c.dir > 0 ? 7 : 5)})`}>
          <rect x={0} y={0} width={14} height={5} rx={1.5} fill={c.color} />
          <rect x={c.dir > 0 ? 13 : -1} y={1.5} width={2} height={2} fill={c.dir > 0 ? '#fff6c8' : '#ff4d4d'} />
        </g>
      ))}
    </>
  );
}

function Pine({ x, y, s }: { x: number; y: number; s: number }) {
  const tier = (k: number) => {
    const w = s * (0.55 - k * 0.12);
    const top = y - s * (0.35 + k * 0.28);
    const bot = top + s * 0.42;
    return (
      <g key={k}>
        <path d={`M${x} ${top} L${x + w} ${bot} L${x - w} ${bot} Z`} fill="#1f3d2e" />
        <path d={`M${x} ${top} L${x + w * 0.55} ${top + (bot - top) * 0.55} Q${x} ${top + (bot - top) * 0.7} ${x - w * 0.55} ${top + (bot - top) * 0.55} Z`} fill="#f4f8fb" />
      </g>
    );
  };
  return (
    <g>
      <rect x={x - s * 0.04} y={y - s * 0.1} width={s * 0.08} height={s * 0.14} fill="#4a3426" />
      {[0, 1, 2].map(tier)}
    </g>
  );
}

function Winter(fr: Frame) {
  const { wd, seconds, X, Y, id } = fr;
  const trees = [
    { f: 0.08, y: 0.86, s: 0.28 },
    { f: 0.2, y: 0.9, s: 0.36 },
    { f: 0.33, y: 0.8, s: 0.2 },
    { f: 0.58, y: 0.82, s: 0.22 },
    { f: 0.7, y: 0.93, s: 0.4 },
    { f: 0.86, y: 0.85, s: 0.26 },
    { f: 0.46, y: 0.76, s: 0.14 },
  ];
  return (
    <>
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7fa6cf" />
          <stop offset="0.6" stopColor="#c9dcee" />
          <stop offset="1" stopColor="#eef4fa" />
        </linearGradient>
        <linearGradient id={id('snow')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d6e3ef" />
        </linearGradient>
      </defs>
      <rect x={X(0)} y={Y(0)} width={wd.w} height={wd.h} fill={`url(#${id('sky')})`} />
      <circle cx={X(0.78)} cy={Y(0.2)} r={wd.h * 0.07} fill="#fffaf0" fillOpacity={0.85} />
      <path d={ridge(fr, 0.42, 0.12, 1)} fill="#a9bfd6" />
      <path d={ridge(fr, 0.52, 0.09, 4)} fill="#c7d6e5" />
      {Array.from({ length: 30 }, (_, i) => (
        <Pine key={`f${i}`} x={X(i / 29)} y={Y(0.66 + rnd(i) * 0.03)} s={wd.h * (0.06 + rnd(i + 3) * 0.04)} />
      ))}
      <path d={ridge(fr, 0.7, 0.05, 7)} fill={`url(#${id('snow')})`} />
      {trees.map((t, i) => (
        <Pine key={i} x={X(t.f)} y={Y(t.y)} s={wd.h * t.s} />
      ))}
      <path d={ridge(fr, 0.9, 0.03, 9)} fill="#ffffff" />
      {/* yağan kar: her tane kendi hızında düşer, hafifçe salınır */}
      {Array.from({ length: 70 }, (_, i) => {
        const sp = 0.05 + rnd(i + 11) * 0.08;
        const y = (rnd(i + 21) + seconds * sp) % 1;
        const x = (rnd(i + 31) + Math.sin(seconds * 0.8 + i) * 0.01 + 1) % 1;
        return <circle key={`s${i}`} cx={X(x)} cy={Y(y)} r={1 + rnd(i + 41) * 2.2} fill="#ffffff" fillOpacity={0.85} />;
      })}
    </>
  );
}

export function Scene({ wd, seconds, scene }: { wd: Widget; seconds: number; scene: SceneId }): ReactNode {
  const fr: Frame = { wd, seconds, X: (f) => wd.x + wd.w * f, Y: (f) => wd.y + wd.h * f, id: (n) => `${n}-${wd.id}` };
  return scene === 'kis' ? <Winter {...fr} /> : <Bosphorus {...fr} />;
}
