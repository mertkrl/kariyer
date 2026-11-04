import { useId, useMemo, type CSSProperties } from 'react';
import { Painter, rng } from './paint';
import type { Palette } from './palettes';
import s from './Scene.module.css';

/*
 * Gökyüzü: üç duraklı renk geçişi, büyük ve yumuşak bir güneş halesi (gece ay ve yıldızlar),
 * yavaşça sürüklenen bulutlar. Bulutlar daire kümelerinden yapılır; alt kenarları gölgede kalır.
 */

function Clouds({ p }: { p: Palette }) {
  const art = useMemo(() => {
    const P = new Painter();
    const rand = rng(77);
    for (let i = 0; i < 11; i++) {
      const cx = 140 + i * 290 + rand() * 120;
      const cy = 90 + rand() * 250;
      const w = 90 + rand() * 170;
      const puffs = 5 + Math.floor(rand() * 5);
      for (let k = 0; k < puffs; k++) {
        const x = cx - w / 2 + (k / (puffs - 1)) * w;
        const r = (w / puffs) * (0.8 + rand() * 0.9) * (1 - Math.abs(k / (puffs - 1) - 0.5));
        P.at(0).circle(p.cloudShade, x, cy + 4, r + 6);
        P.at(1).circle(p.cloud, x - 2, cy - r * 0.25, r + 4);
      }
      P.at(2).rect(p.cloudShade, cx - w * 0.55, cy + 2, w * 1.1, 14);
    }
    return P;
  }, [p]);
  const tile = (
    <svg className={s.cloudTile} viewBox="0 0 3200 420" aria-hidden="true">
      {art.entries().map(([fill, d], i) => (
        <path key={i} d={d} fill={fill} />
      ))}
    </svg>
  );
  return (
    <div className={s.clouds} style={{ opacity: p.moon ? 0.35 : 0.85 } as CSSProperties}>
      <div className={s.cloudTrack}>
        {tile}
        {tile}
      </div>
    </div>
  );
}

function Stars() {
  const d = useMemo(() => {
    const rand = rng(5);
    const a: string[] = [];
    const b: string[] = [];
    for (let i = 0; i < 160; i++) {
      const x = rand() * 1600;
      const y = rand() * 440;
      const r = 0.5 + rand() * 1.3;
      (i % 2 ? a : b).push(`M${x.toFixed(0)} ${y.toFixed(0)}m-${r} 0a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 -${2 * r} 0`);
    }
    return [a.join(''), b.join('')];
  }, []);
  return (
    <svg className={s.stars} viewBox="0 0 1600 520" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
      <path d={d[0]} fill="#fff" className={s.twinkle} />
      <path d={d[1]} fill="#dfe6ff" className={s.twinkle2} />
    </svg>
  );
}

export function Sky({ p, low }: { p: Palette; low: boolean }) {
  const id = useId().replace(/\W/g, '');
  const [sx, sy] = p.sunAt;
  return (
    <>
      <div className={s.sky} />
      {p.moon && <Stars />}
      <div className={s.glow} style={{ left: `${sx}%`, top: `${sy}%`, background: `radial-gradient(circle, ${p.sunGlow} 0%, transparent 62%)` } as CSSProperties} />
      <svg className={s.sun} style={{ left: `${sx}%`, top: `${sy}%`, width: p.sunR * 2, height: p.sunR * 2 } as CSSProperties} viewBox="-50 -50 100 100" aria-hidden="true">
        <defs>
          <radialGradient id={`${id}-disc`} cx="40%" cy="38%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.6" stopColor={p.sun} />
            <stop offset="1" stopColor={p.sun} stopOpacity={p.moon ? 1 : 0.85} />
          </radialGradient>
        </defs>
        <circle r={50} fill={`url(#${id}-disc)`} />
        {p.moon && (
          <g fill="#c9c4b2" opacity={0.45}>
            <circle cx={-14} cy={-10} r={9} />
            <circle cx={16} cy={8} r={6} />
            <circle cx={-4} cy={20} r={5} />
            <circle cx={22} cy={-18} r={4} />
          </g>
        )}
      </svg>
      {!low && <Clouds p={p} />}
    </>
  );
}
