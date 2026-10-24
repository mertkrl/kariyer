import { useEffect, useState, type CSSProperties, type RefObject } from 'react';
import s from './Decor.module.css';

/*
 * Kareli defter süslemesi: örgü kenarlık. Sayfa açıldıktan bir süre sonra, spiral telin hemen
 * yanındaki boşluğa biri elle örgü çizer; kareli defter süsleme videolarındaki gibi üç adımda:
 *   1. siyah keçeli kalemle, iki kare genişliğindeki sütunun iki kenarına satır atlayarak kısa
 *      dikey çizgiler atılır;
 *   2. bu çizgiler çaprazlarla birleştirilir ve birbirinin üstünden, altından geçen iki şeritli
 *      bir örgü çıkar;
 *   3. şeritler renkli kalemlerle teker teker boyanır.
 * Her şey kâğıdın 22 px'lik karelerine oturur. Telefonda yan boşluk olmadığı için örgü yatay
 * çizilir, dolabın altına.
 */

/** Kâğıdın kare boyu: Salon.module.css'teki ızgarayla aynı olmalı. */
const CELL = 22;
const START_MS = 4000;
const CAP_MS = 40;
const SEG_MS = 75;
const PAINT_MS = 60;

/** Kalem takımları (bir şerit, öbür şerit): her gün başkası. */
const PENS: [string, string][] = [
  ['#ef4a86', '#2f9be8'],
  ['#e5484d', '#30a46c'],
  ['#f5a524', '#8e4ec6'],
  ['#ef4a86', '#30b5c8'],
];

type Pt = [number, number];

interface Seg {
  pts: Pt[];
  strand: 0 | 1;
}

/**
 * Örgünün parçaları (kare biriminde, sütun 0–2 genişliğinde). Her şerit iki kenar arasında
 * zikzak çizer; bir parça bir kenardan öbürüne iki satır iner. Kesişmelerde sırayla bir şerit
 * üstte kalır: önce alttaki çizilir, üstteki onu örter.
 */
function braid(rows: number): { caps: Pt[][]; segs: Seg[] } {
  const caps: Pt[][] = [];
  for (let r = 0; r + 1 <= rows; r += 2) {
    caps.push([[0, r], [0, r + 1]]);
    caps.push([[2, r], [2, r + 1]]);
  }
  const segs: Seg[] = [];
  for (let k = 0; 2 * k + 3 <= rows; k++) {
    const r = 2 * k;
    // k çiftken A şeridi soldan sağa (\), B sağdan sola (/); tekken tersi
    const down: Pt[] = [[0, r], [2, r + 2], [2, r + 3], [0, r + 1]];
    const up: Pt[] = [[2, r], [0, r + 2], [0, r + 3], [2, r + 1]];
    const [a, b] = k % 2 ? [up, down] : [down, up];
    // A ve B sırayla üste çıkar: önce alttaki çizilir
    if (k % 2) segs.push({ pts: a, strand: 0 }, { pts: b, strand: 1 });
    else segs.push({ pts: b, strand: 1 }, { pts: a, strand: 0 });
  }
  return { caps, segs };
}

interface Place {
  x: number;
  y: number;
  rows: number;
  vertical: boolean;
}

const snap = (v: number) => Math.round(v / CELL) * CELL;

/** Örgünün yeri: geniş ekranda spiralin yanındaki boşluk, dar ekranda dolabın altı. */
function place(page: HTMLElement): Place | null {
  const box = page.getBoundingClientRect();
  const grid = page.querySelector('main ul')?.getBoundingClientRect();
  const head = page.querySelector('header')?.getBoundingClientRect();
  if (!grid || !head) return null;
  const left = grid.left - box.left;
  const x = snap(left - CELL * 2 - 28);
  if (x >= 56) {
    const y = snap(head.top - box.top);
    return { x, y, rows: Math.floor((snap(grid.bottom - box.top) - y) / CELL), vertical: true };
  }
  const y = snap(grid.bottom - box.top + 40);
  const x0 = snap(left) + CELL;
  return { x: x0, y, rows: Math.floor((snap(grid.right - box.left) - x0 - CELL) / CELL), vertical: false };
}

const pathOf = (pts: Pt[], close = true) => `M${pts.map(([x, y]) => `${x * CELL} ${y * CELL}`).join(' L')}${close ? ' Z' : ''}`;

export function Decor({ page, day }: { page: RefObject<HTMLElement | null>; day: number }) {
  const [at, setAt] = useState<Place | null>(null);

  useEffect(() => {
    const el = page.current;
    if (!el) return;
    const t = window.setTimeout(() => setAt(place(el)), START_MS);
    // pencere değişince örgü yeni yerine taşınır
    const onResize = () => setAt((cur) => (cur ? place(el) : cur));
    window.addEventListener('resize', onResize);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', onResize);
    };
  }, [page]);

  if (!at || at.rows < 6) return null;
  const { caps, segs } = braid(at.rows);
  const pens = PENS[day % PENS.length];
  const len = at.rows * CELL;
  const [w, h] = at.vertical ? [CELL * 2, len] : [len, CELL * 2];
  const capsDone = caps.length * CAP_MS;
  const segsDone = capsDone + segs.length * SEG_MS;
  const delay = (ms: number) => ({ ['--d' as string]: `${ms}ms` }) as CSSProperties;

  return (
    <div className={s.layer} aria-hidden="true">
      <svg className={s.braid} style={{ left: at.x - 2, top: at.y - 2, width: w + 4, height: h + 4 }} viewBox={`-2 -2 ${w + 4} ${h + 4}`}>
        <g transform={at.vertical ? undefined : `translate(${len} 0) rotate(90)`}>
          {/* 1. kenarlara kısa dikey çizgiler */}
          {caps.map((c, i) => (
            <path key={`c${i}`} className={s.cap} d={pathOf(c, false)} pathLength={1} style={delay(i * CAP_MS)} />
          ))}
          {/* 2. çaprazlar ve kesişmeler; 3. boya */}
          {segs.map((sg, i) => (
            <path
              key={`s${i}`}
              className={s.seg}
              d={pathOf(sg.pts)}
              pathLength={1}
              style={{ ...delay(capsDone + i * SEG_MS), ['--paint' as string]: `${segsDone + i * PAINT_MS}ms`, ['--ink' as string]: pens[sg.strand] }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
