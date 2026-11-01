import { useEffect, useState, type CSSProperties, type RefObject } from 'react';
import s from './Decor.module.css';

/*
 * Kareli defter süslemesi: örgü kenarlık. Sayfa açıldıktan bir süre sonra, kırmızı kenar
 * çizgisinin hemen yanındaki boşluğa biri elle örgü çizer; kareli defter süsleme videolarındaki gibi üç adımda:
 *   1. siyah keçeli kalemle, iki kare genişliğindeki sütunun iki kenarına satır atlayarak kısa
 *      dikey çizgiler atılır;
 *   2. bu çizgiler çaprazlarla birleştirilir ve birbirinin üstünden, altından geçen iki şeritli
 *      bir örgü çıkar;
 *   3. şeritler renkli kalemlerle teker teker, gidip gelen karalamayla boyanır.
 * Hiçbir şey silinmez: alttan geçen şeridin çizgisi üstteki şeridin kenarında kesilir, boya da
 * yalnızca görünen yere sürülür; gerçekte keçeli kalemle nasıl çiziliyorsa öyle.
 * Çizgiler cetvelle değil elle çekilmiş gibidir: hafif titrer, uçları biraz taşar, kalınlığı
 * bastırmaya göre değişir. Hız da gerçek kalem hızıdır: her çizgi uzunluğu kadar sürer, aralarda
 * el kalkar; örgünün tamamı birkaç dakikada biter. Örgü sayfanın en altına kadar iner. Her şey
 * kâğıdın 22 px'lik karelerine oturur.
 */

/** Kâğıdın kare boyu: Salon.module.css'teki ızgarayla aynı olmalı. */
const CELL = 22;
const START_MS = 4000;
/** Keçeli kalemin hızı (px/sn): kenar çizgileri dikkatli, boya karalaması hızlı. */
const PEN_SPEED = 120;
const OUTLINE_SPEED = 95;
const SCRIBBLE_SPEED = 420;
/** Bir çizgiden ötekine geçerken elin kalkıp yeniden konması (ms). */
const LIFT_MS = 320;
const RECAP_MS = 900;
/** Sayfanın altında boş kalan kare sayısı: örgü en dibe kadar iner. */
const BOTTOM_CELLS = 0;

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

/** Tohumlu rastgele (mulberry32): aynı gün aynı el. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rand = () => number;
const px = ([x, y]: Pt): Pt => [x * CELL, y * CELL];
const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/**
 * Elle çekilmiş çizgi: uçları biraz taşar, ortası hafifçe kavislenir, yol boyunca ince titrer.
 * Noktalar ve çizginin uzunluğu döner (uzunluk çizim süresini belirler).
 */
function hand(from: Pt, to: Pt, r: Rand, overshoot = 1.6): { pts: Pt[]; len: number } {
  const len = dist(from, to);
  const ux = (to[0] - from[0]) / (len || 1);
  const uy = (to[1] - from[1]) / (len || 1);
  // dik yön: titreme ve kavis bunun üstünde
  const nx = -uy;
  const ny = ux;
  const o0 = r() * overshoot;
  const o1 = r() * overshoot;
  const a: Pt = [from[0] - ux * o0, from[1] - uy * o0];
  const b: Pt = [to[0] + ux * o1, to[1] + uy * o1];
  const bow = (r() - 0.5) * Math.min(2.4, len * 0.04);
  const n = Math.max(3, Math.round(len / 6));
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const wob = (r() - 0.5) * 0.7 + Math.sin(t * Math.PI) * bow;
    pts.push([a[0] + (b[0] - a[0]) * t + nx * wob, a[1] + (b[1] - a[1]) * t + ny * wob]);
  }
  return { pts, len: dist(a, b) };
}

/** Noktalardan yumuşak yol: aradaki orta noktalardan geçen ikinci derece eğriler. */
function smooth(pts: Pt[]): string {
  if (pts.length < 3) return `M${pts.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join(' L')}`;
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += ` Q${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L${last[0].toFixed(1)} ${last[1].toFixed(1)}`;
}

/** Çokgeni ağırlık merkezine doğru biraz küçültür: ortak kenarlar "içeride" sayılmasın. */
function shrink(poly: Pt[], by: number): Pt[] {
  const cx = poly.reduce((v, p) => v + p[0], 0) / poly.length;
  const cy = poly.reduce((v, p) => v + p[1], 0) / poly.length;
  return poly.map(([x, y]) => {
    const d = Math.hypot(x - cx, y - cy) || 1;
    return [x - ((x - cx) / d) * by, y - ((y - cy) / d) * by];
  });
}

/** Doğru parçasının (a→b) dışbükey çokgenin içinde kalan aralığı (Cyrus–Beck), t ∈ [0, 1]. */
function inside(a: Pt, b: Pt, poly: Pt[]): [number, number] | null {
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i];
    const [x1, y1] = poly[(i + 1) % poly.length];
    area += x0 * y1 - x1 * y0;
  }
  const sign = area > 0 ? 1 : -1;
  let t0 = 0;
  let t1 = 1;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    // içe bakan normal
    const nx = -(q[1] - p[1]) * sign;
    const ny = (q[0] - p[0]) * sign;
    const num = nx * (a[0] - p[0]) + ny * (a[1] - p[1]);
    const den = nx * dx + ny * dy;
    if (Math.abs(den) < 1e-9) {
      if (num < 0) return null;
      continue;
    }
    const t = -num / den;
    if (den > 0) t0 = Math.max(t0, t);
    else t1 = Math.min(t1, t);
    if (t0 >= t1) return null;
  }
  return [t0, t1];
}

/**
 * Kenarın görünen parçaları: üstten geçen şeritlerin altında kalan kısmı hiç çizilmez. Elle
 * örgü çizen de böyle yapar: alttaki şeridin çizgisini üstteki şeridin kenarında keser.
 */
function visible(a: Pt, b: Pt, over: Pt[][]): [Pt, Pt][] {
  let spans: [number, number][] = [[0, 1]];
  for (const poly of over) {
    const hit = inside(a, b, poly);
    if (!hit) continue;
    spans = spans.flatMap(([s0, s1]): [number, number][] => {
      if (hit[1] <= s0 || hit[0] >= s1) return [[s0, s1]];
      const out: [number, number][] = [];
      if (hit[0] > s0) out.push([s0, hit[0]]);
      if (hit[1] < s1) out.push([hit[1], s1]);
      return out;
    });
  }
  const at = (t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  return spans.filter(([s0, s1]) => (s1 - s0) * dist(a, b) > 2.5).map(([s0, s1]) => [at(s0), at(s1)]);
}

/**
 * Boya karalaması: şeridin içini yukarıdan aşağı gidip gelen sık zikzakla doldurur. Uçlar
 * kenara kadar uzanıp biraz taşar (kırpılır), aralık ve eğim her gidişte biraz değişir.
 */
function scribble(poly: Pt[], r: Rand): { d: string; len: number } {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const [x0, x1] = [Math.min(...xs) - 3, Math.max(...xs) + 3];
  const [y0, y1] = [Math.min(...ys) - 2, Math.max(...ys) + 2];
  const pts: Pt[] = [];
  let y = y0;
  let left = true;
  while (y < y1) {
    pts.push([left ? x0 + r() * 3 : x1 - r() * 3, y + (r() - 0.5) * 1.4]);
    y += 2.6 + r() * 1.4;
    left = !left;
  }
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += dist(pts[i - 1], pts[i]);
  return { d: `M${pts.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join(' L')}`, len };
}

interface Place {
  x: number;
  y: number;
  rows: number;
  vertical: boolean;
}

const snap = (v: number) => Math.round(v / CELL) * CELL;

/** Örgünün yeri: kırmızı kenar çizgisinin sağında, başlıktan sayfanın en altına kadar. */
function place(page: HTMLElement): Place | null {
  const box = page.getBoundingClientRect();
  const head = page.querySelector('header')?.getBoundingClientRect();
  if (!head) return null;
  const margin = parseFloat(getComputedStyle(page).getPropertyValue('--margin')) || 66;
  const x = Math.ceil(margin / CELL) * CELL + CELL;
  const y = snap(head.top - box.top);
  // örgünün kutusu (6 px payıyla) sayfanın içinde kalır: sayfayı uzatıp kendini büyütmez
  const bottom = Math.floor((page.scrollHeight - 8) / CELL) * CELL - BOTTOM_CELLS * CELL;
  return { x, y, rows: Math.floor((bottom - y) / CELL), vertical: true };
}

interface Stroke {
  d: string;
  /** Başlama ve sürme (ms). */
  at: number;
  dur: number;
  width: number;
}

interface Piece {
  poly: string;
  /** Üstten geçen şeritler: boya bunların altına taşmaz. */
  over: string[];
  lines: Stroke[];
  paint: Stroke;
  ink: string;
}

const polyPath = (poly: Pt[]) => `M${poly.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join(' L')} Z`;

/** Bütün çizimin planı: hangi çizgi ne zaman başlar, ne kadar sürer. */
function plan(rows: number, day: number) {
  const r = rng(day * 7919 + rows);
  const { caps, segs } = braid(rows);
  const pens = PENS[day % PENS.length];
  const polys = segs.map((sg) => sg.pts.map(px));
  // sonra çizilen parça üsttedir; komşu birkaç parça dışında kesişme olmaz
  const overOf = (i: number) => polys.slice(i + 1, i + 4);
  let t = 0;
  const capStrokes: Stroke[] = caps.map(([a, b]) => {
    const h = hand(px(a), px(b), r);
    const st = { d: smooth(h.pts), at: t, dur: (h.len / PEN_SPEED) * 1000, width: 2.8 + r() * 0.8 };
    t += st.dur + LIFT_MS * (0.6 + r() * 0.8);
    return st;
  });
  t += RECAP_MS;
  const pieces: Piece[] = polys.map((poly, i) => {
    const cut = overOf(i).map((p) => shrink(p, 0.8));
    const lines: Stroke[] = [];
    poly.forEach((p, k) => {
      for (const [a, b] of visible(p, poly[(k + 1) % poly.length], cut)) {
        const h = hand(a, b, r, 0.7);
        const st = { d: smooth(h.pts), at: t, dur: (h.len / OUTLINE_SPEED) * 1000, width: 2.7 + r() * 0.9 };
        lines.push(st);
        // köşede kalem pek kalkmaz, kesilen yerde kalkar
        t += st.dur + LIFT_MS * (0.25 + r() * 0.4);
      }
    });
    t += LIFT_MS * 0.6;
    return { poly: polyPath(poly), over: overOf(i).map(polyPath), lines, paint: { d: '', at: 0, dur: 0, width: 0 }, ink: pens[segs[i].strand] };
  });
  t += RECAP_MS;
  // boya: önce bir şeridin bütün parçaları, sonra öbür kalemle öbür şerit
  for (const strand of [0, 1] as const)
    segs.forEach((sg, i) => {
      if (sg.strand !== strand) return;
      const sc = scribble(polys[i], r);
      pieces[i].paint = { d: sc.d, at: t, dur: (sc.len / SCRIBBLE_SPEED) * 1000, width: 3 + r() * 0.6 };
      t += pieces[i].paint.dur + LIFT_MS * 0.5;
    });
  return { capStrokes, pieces };
}

const timing = (st: Stroke) => ({ ['--d' as string]: `${Math.round(st.at)}ms`, ['--t' as string]: `${Math.round(st.dur)}ms`, strokeWidth: st.width }) as CSSProperties;

export function Decor({ page, day }: { page: RefObject<HTMLElement | null>; day: number }) {
  const [at, setAt] = useState<Place | null>(null);

  useEffect(() => {
    const el = page.current;
    if (!el) return;
    const t = window.setTimeout(() => setAt(place(el)), START_MS);
    // pencere ya da sayfa boyu değişince örgü yeni yerine ve boyuna taşınır
    const update = () => setAt((cur) => {
      if (!cur) return cur;
      const next = place(el);
      return next && (next.x !== cur.x || next.y !== cur.y || next.rows !== cur.rows) ? next : cur;
    });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      window.clearTimeout(t);
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [page]);

  if (!at || at.rows < 6) return null;
  const { capStrokes, pieces } = plan(at.rows, day);
  const len = at.rows * CELL;
  const [w, h] = at.vertical ? [CELL * 2, len] : [len, CELL * 2];
  const pad = 6;

  return (
    <div className={s.layer} aria-hidden="true">
      <svg className={s.braid} style={{ left: at.x - pad, top: at.y - pad, width: w + pad * 2, height: h + pad * 2 }} viewBox={`${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2}`}>
        <defs>
          {/* boya maskesi: parçanın içi, üstten geçen şeritler hariç */}
          {pieces.map((p, i) => (
            <mask key={i} id={`braid-${day}-${i}`} maskUnits="userSpaceOnUse" x={-pad} y={-pad} width={w + pad * 2} height={h + pad * 2}>
              <path d={p.poly} fill="#fff" />
              {p.over.map((o, k) => (
                <path key={k} d={o} fill="#000" />
              ))}
            </mask>
          ))}
        </defs>
        {/* 1. kenarlara kısa dikey çizgiler */}
        {capStrokes.map((st, i) => (
          <path key={`c${i}`} className={s.pen} d={st.d} pathLength={1} style={timing(st)} />
        ))}
        {/* 3. renkli karalama: çizgilerin altında, yalnızca görünen yerde */}
        {pieces.map((p, i) => (
          <path key={`p${i}`} className={s.paint} d={p.paint.d} pathLength={1} mask={`url(#braid-${day}-${i})`} style={{ ...timing(p.paint), stroke: p.ink }} />
        ))}
        {/* 2. çaprazlar: alttan geçen şeridin çizgisi kesişmede kesilir */}
        {pieces.flatMap((p, i) => p.lines.map((st, k) => <path key={`s${i}-${k}`} className={s.pen} d={st.d} pathLength={1} style={timing(st)} />))}
      </svg>
    </div>
  );
}
