import { memo, type MouseEvent } from 'react';
import { Defs, FarCity, Foreground, PlaneTree, Sky, Street, Traffic, Walkers } from './Backdrop';
import { LitWindows, Windows, type GridProps } from './kit';
import { PlaceArt } from './Buildings';
import { PLACES, VIEW_H, VIEW_W, type Phase, type Place, type PlaceId } from './places';
import s from './Scene.module.css';

/*
 * Mahallenin tamamı tek bir SVG: arkadan öne gökyüzü, ufuk, arka sıradaki binalar, kaldırım, yol,
 * trafik, öndeki kaldırım. Tıklanan her yer bir bağlantıdır: klavyeyle de gezilir, Enter içeri sokar.
 */

/** Arka sıradaki, oyunu olmayan apartmanlar: boşlukları doldurur, derinlik verir. */
function BackRow() {
  const a: GridProps = { x: 330, y: 352, cols: 3, rows: 1, w: 26, h: 30, gx: 22, gy: 0, seed: 11, ratio: 0.6 };
  const b: GridProps = { x: 1110, y: 322, cols: 2, rows: 2, w: 24, h: 30, gx: 26, gy: 38, seed: 13, ratio: 0.5 };
  return (
    <g className={s.decor}>
      <g className={s.body}>
        <rect x="318" y="336" width="168" height="120" fill="#b7ae9e" />
        <rect x="314" y="330" width="176" height="8" fill="#9d9483" />
        <Windows {...a} frame="#d8d0bf" sill={false} />
        <rect x="1098" y="306" width="110" height="170" fill="#a9a497" />
        <rect x="1094" y="300" width="118" height="8" fill="#8e8a7e" />
        <Windows {...b} frame="#cbc6b8" sill={false} />
        <path d="M1150 300 V270 M1140 278 H1160 M1144 286 H1156" stroke="#666" strokeWidth="1.5" />
      </g>
      <g className={s.emit}>
        <LitWindows {...a} />
        <LitWindows {...b} />
      </g>
    </g>
  );
}

/** Işığın arkasındaki iki apartman ve köşedeki eczane. */
function RightRow() {
  const a: GridProps = { x: 1222, y: 380, cols: 3, rows: 4, w: 30, h: 42, gx: 14, gy: 32, seed: 31, ratio: 0.5 };
  const b: GridProps = { x: 1362, y: 440, cols: 5, rows: 3, w: 32, h: 44, gx: 18, gy: 30, seed: 37, ratio: 0.45 };
  return (
    <g className={s.decor}>
      <g className={s.body}>
        <rect x="1204" y="360" width="140" height="362" fill="#9db7a3" />
        <rect x="1200" y="352" width="148" height="10" fill="#7f9a86" />
        <Windows {...a} />
        <rect x="1204" y="640" width="140" height="82" fill="#7f9a86" />
        <rect x="1214" y="654" width="88" height="22" fill="#f6f4ee" />
        <text x="1258" y="670" fontSize="12" textAnchor="middle" fill="#c8402f" fontWeight="900" letterSpacing="2" fontFamily="var(--font-body)">ECZANE</text>
        <rect x="1214" y="682" width="60" height="40" fill="#cfe3e8" className={s.glass} />
        <rect x="1282" y="682" width="52" height="40" fill="#5a6870" />
        <rect x="1342" y="420" width="258" height="302" fill="#e2b596" />
        <rect x="1338" y="412" width="262" height="10" fill="#c49879" />
        <Windows {...b} />
        {[0, 1, 2].map((r) => (
          <path key={r} d={`M1356 ${490 + r * 74} H1600`} stroke="rgba(0,0,0,.12)" strokeWidth="4" />
        ))}
        <path d="M1420 412 V380 M1408 388 H1432" stroke="#666" strokeWidth="1.5" />
        <rect x="1330" y="644" width="20" height="20" rx="2" fill="#2c8a4a" />
        <path d="M1340 648 V660 M1334 654 H1346" stroke="#fff" strokeWidth="3" />
      </g>
      <g className={s.emit}>
        <LitWindows {...a} />
        <LitWindows {...b} />
        <rect className={s.lit} x="1330" y="644" width="20" height="20" rx="2" fill="#3cff7a" fillOpacity="0.8" />
        <circle className={s.lamp} cx="1340" cy="654" r="22" fill="#3cff7a" fillOpacity="0.22" />
      </g>
    </g>
  );
}

export interface SceneProps {
  phase: Phase;
  active: PlaceId | null;
  hrefOf: (p: Place) => string;
  labelOf: (p: Place) => string;
  onHover: (id: PlaceId | null) => void;
  onPick: (e: MouseEvent<Element>, p: Place) => void;
}

const ORDER: (PlaceId | 'tree' | 'right' | 'traffic' | 'walkers' | 'front')[] = ['santiye', 'bakkal', 'meydan', 'plaza', 'tree', 'doviz', 'right', 'durak', 'walkers', 'cukur', 'traffic', 'isik', 'front'];

export const Scene = memo(function Scene({ phase, active, hrefOf, labelOf, onHover, onPick }: SceneProps) {
  return (
    <svg className={`${s.svg} ${s[phase]}`} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMax meet" role="group" aria-label="Mahalle">
      <Defs />
      <Sky phase={phase} />
      <FarCity />
      <BackRow />
      <Street />
      {ORDER.map((k) => {
        if (k === 'tree') return <PlaneTree key={k} />;
        if (k === 'right') return <RightRow key={k} />;
        if (k === 'traffic') return <Traffic key={k} />;
        if (k === 'walkers') return <Walkers key={k} />;
        if (k === 'front') return <Foreground key={k} />;
        const p = PLACES.find((x) => x.id === k)!;
        return (
          <a
            key={k}
            href={hrefOf(p)}
            className={`${s.spot} ${active === p.id ? s.on : ''}`}
            aria-label={labelOf(p)}
            onPointerEnter={() => onHover(p.id)}
            onPointerLeave={() => onHover(null)}
            onFocus={() => onHover(p.id)}
            onBlur={() => onHover(null)}
            onClick={(e) => onPick(e, p)}
          >
            <PlaceArt id={p.id} />
          </a>
        );
      })}
    </svg>
  );
});
