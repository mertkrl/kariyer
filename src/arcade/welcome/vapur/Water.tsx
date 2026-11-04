import { useMemo, type CSSProperties } from 'react';
import { rng } from './paint';
import type { Palette } from './palettes';
import s from './Scene.module.css';

/*
 * Suyun hareketi: ufka doğru küçülüp sıklaşan dalgalar (her dalga bir parlak tepe ve altında
 * koyu bir çukur), güneşin ya da ayın suya düşen titrek yolu, vapurun gövdesinden açılan köpük.
 * Dalga katmanları sürekli kayar (rota katmanlarından bağımsız).
 */

/** Bir dalga karosu: `from`–`to` arasında, derinleştikçe büyüyen dalgalar. */
function waveTile(seed: number, n: number, from: number, to: number, size: number) {
  const rand = rng(seed);
  const light: string[][] = [[], [], []];
  const dark: string[][] = [[], [], []];
  for (let i = 0; i < n; i++) {
    const depth = rand() ** 1.7;
    const y = from + depth * (to - from);
    const w = (5 + depth * 46) * size * (0.6 + rand() * 0.8);
    const a = (0.8 + depth * 4.5) * size;
    const x = rand() * (3200 - w);
    const bin = depth < 0.33 ? 0 : depth < 0.66 ? 1 : 2;
    light[bin].push(`M${x.toFixed(0)} ${y.toFixed(1)}q${(w / 2).toFixed(1)} ${(-a).toFixed(1)} ${w.toFixed(1)} 0`);
    dark[bin].push(`M${(x + w * 0.2).toFixed(0)} ${(y + a * 0.9).toFixed(1)}q${(w * 0.35).toFixed(1)} ${(a * 0.6).toFixed(1)} ${(w * 0.7).toFixed(1)} 0`);
  }
  return { light: light.map((l) => l.join('')), dark: dark.map((l) => l.join('')) };
}

function Loop({ speed, children, className }: { speed: number; children: React.ReactNode; className?: string }) {
  const tile = (
    <svg className={s.loopTile} viewBox="0 0 3200 900" aria-hidden="true">
      {children}
    </svg>
  );
  return (
    <div className={`${s.loop} ${className ?? ''}`}>
      <div className={s.loopTrack} style={{ animationDuration: `${speed}s` } as CSSProperties}>
        {tile}
        {tile}
      </div>
    </div>
  );
}

export function Waves({ p, low }: { p: Palette; low: boolean }) {
  const far = useMemo(() => waveTile(11, low ? 260 : 520, 526, 650, 0.55), [low]);
  const near = useMemo(() => waveTile(23, low ? 120 : 240, 600, 900, 1.25), [low]);
  const widths = [0.9, 1.5, 2.4];
  const draw = (t: { light: string[]; dark: string[] }, k: number) =>
    [0, 1, 2].map((b) => (
      <g key={b} fill="none" strokeLinecap="round">
        <path d={t.dark[b]} stroke={p.waveDark} strokeWidth={widths[b] * k} />
        <path d={t.light[b]} stroke={p.waveLight} strokeWidth={widths[b] * k * 0.8} />
      </g>
    ));
  return (
    <>
      <Loop speed={90}>{draw(far, 0.7)}</Loop>
      <Loop speed={34}>{draw(near, 1.2)}</Loop>
    </>
  );
}

/** Gövdeden açılan köpük: güvertenin hemen altında, hızlı kayan beyaz çizgiler. */
export function Wake({ p }: { p: Palette }) {
  const d = useMemo(() => {
    const rand = rng(41);
    const a: string[] = [];
    for (let i = 0; i < 90; i++) {
      const y = 790 + rand() * 110;
      const w = 30 + rand() * 140;
      const x = rand() * (3200 - w);
      a.push(`M${x.toFixed(0)} ${y.toFixed(0)}c${(w * 0.3).toFixed(0)} -3 ${(w * 0.7).toFixed(0)} 3 ${w.toFixed(0)} 0`);
    }
    return a.join('');
  }, []);
  return (
    <Loop speed={9} className={s.wake}>
      <path d={d} fill="none" stroke={p.moon ? 'rgba(200,210,235,.35)' : 'rgba(255,255,255,.7)'} strokeWidth={3} strokeLinecap="round" />
    </Loop>
  );
}

/** Güneşin (ayın) suya düşen yolu: ufuktan aşağı genişleyen, titreşen pırıltılar. */
export function Glitter({ p }: { p: Palette }) {
  const groups = useMemo(() => {
    const rand = rng(3);
    const g: string[][] = [[], [], []];
    for (let i = 0; i < 260; i++) {
      const depth = rand() ** 1.4;
      const y = depth * 380;
      const spread = 8 + depth * 120;
      const x = 200 + (rand() - 0.5) * 2 * spread * (0.4 + rand() * 0.6);
      const w = 2 + depth * 16 * rand();
      g[i % 3].push(`M${x.toFixed(1)} ${y.toFixed(1)}h${w.toFixed(1)}v${(1 + depth * 1.6).toFixed(1)}h${(-w).toFixed(1)}z`);
    }
    return g.map((a) => a.join(''));
  }, []);
  const sunLow = p.sunAt[1] > 40;
  return (
    <svg className={s.glitter} style={{ left: `${p.sunAt[0]}%`, opacity: p.moon ? 0.55 : sunLow ? 1 : 0.8 } as CSSProperties} viewBox="0 0 400 380" preserveAspectRatio="none" aria-hidden="true">
      {groups.map((d, i) => (
        <path key={i} d={d} fill={p.glitter} className={s[`glint${i}`]} />
      ))}
    </svg>
  );
}
