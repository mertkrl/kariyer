/*
 * Kâğıda elle çizilen işareti tanır: X, S, O, M, kare (□) ya da üçgen (△). Girdi bir ya da birkaç
 * kalem darbesidir (her darbe [x, y] noktaları). Kurallar basittir, el titremesine dayanıklıdır:
 *   O, □, △: tek darbe, başı ile sonu buluşur, yolu kutusunun çevresine yakın uzunluktadır. Köşe
 *      sayısı ayırır: çemberin köşesi yoktur, karenin dört, üçgenin üç (corners).
 *   S: tek darbe, kapanmaz; giderken yatayda en az iki kez yön değiştirir, dikeyde çoğunlukla
 *      tek yöne iner (ya da çıkar).
 *   M: tek darbe, kapanmaz; dikeyde en az üç kez yön değiştirir, yatayda tek yöne gider (W de olur).
 *   X: iki darbe; ikisi de aşağı yukarı düz ve çapraz, biri "\" öteki "/" yönünde ve birbirini keser.
 * Çok küçük karalama ya da başka bir şey null'dır. Saf mantıktır, test edilebilir.
 */

export type Pt = [number, number];
export type Glyph = 'X' | 'S' | 'O' | 'M' | '□' | '△';

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const length = (s: Pt[]) => s.reduce((n, p, i) => (i ? n + dist(s[i - 1], p) : 0), 0);

export function bounds(strokes: Pt[][]) {
  const all = strokes.flat();
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  const x1 = Math.max(...xs);
  const y1 = Math.max(...ys);
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

/** Bir eksende yön değiştirme sayısı: ufak titremeler (eşiğin altı) sayılmaz. */
function reversals(s: Pt[], axis: 0 | 1, threshold: number): number {
  let dir = 0;
  let anchor = s[0][axis];
  let count = 0;
  for (const p of s) {
    const d = p[axis] - anchor;
    if (Math.abs(d) < threshold) continue;
    const sign = Math.sign(d);
    if (dir && sign !== dir) count++;
    dir = sign;
    anchor = p[axis];
  }
  return count;
}

/** İki doğru parçası kesişir mi. */
function crosses(a: Pt, b: Pt, c: Pt, d: Pt) {
  const o = (p: Pt, q: Pt, r: Pt) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b);
}

/** Darbeyi yol boyunca eşit aralıklı `n` noktaya böler: çizim hızı sonucu değiştirmesin. */
function resample(s: Pt[], n: number): Pt[] {
  const step = length(s) / n;
  const out: Pt[] = [s[0]];
  let need = step;
  for (let i = 1; i < s.length && out.length < n; i++) {
    let a = s[i - 1];
    const b = s[i];
    let d = dist(a, b);
    while (d >= need && out.length < n) {
      const p: Pt = [a[0] + ((b[0] - a[0]) * need) / d, a[1] + ((b[1] - a[1]) * need) / d];
      out.push(p);
      a = p;
      d = dist(a, b);
      need = step;
    }
    need -= d;
  }
  return out;
}

/** Kapalı darbenin köşe sayısı: yönün birden (55°'den çok) döndüğü yerler; komşu noktalar tek köşedir. */
export function corners(s: Pt[]): number {
  const n = 48;
  const k = 3;
  const p = resample(s, n);
  const turn = p.map((q, i) => {
    const a = p[(i - k + n) % n];
    const b = p[(i + k) % n];
    const d = Math.atan2(b[1] - q[1], b[0] - q[0]) - Math.atan2(q[1] - a[1], q[0] - a[0]);
    return Math.abs(Math.atan2(Math.sin(d), Math.cos(d)));
  });
  const sharp = turn.map((x) => x > (55 * Math.PI) / 180);
  // döngünün başı bir köşenin ortasına denk gelmesin: köşe olmayan bir noktadan başla
  const start = sharp.indexOf(false);
  if (start < 0) return 0;
  let count = 0;
  for (let i = 1; i <= n; i++) if (sharp[(start + i) % n] && !sharp[(start + i - 1) % n]) count++;
  return count;
}

/** En küçük işaret boyu (px): bundan küçüğü kazara dokunuş sayılır. */
export const MIN_SIZE = 14;

export function recognize(strokes: Pt[][]): Glyph | null {
  const used = strokes.filter((s) => s.length > 1);
  if (!used.length) return null;
  const box = bounds(used);
  const size = Math.max(box.w, box.h);
  if (size < MIN_SIZE) return null;

  if (used.length >= 2) {
    const [a, b] = [...used].sort((p, q) => length(q) - length(p));
    const straight = (s: Pt[]) => dist(s[0], s[s.length - 1]) / Math.max(1, length(s)) > 0.8;
    const slope = (s: Pt[]) => Math.sign((s[s.length - 1][0] - s[0][0]) * (s[s.length - 1][1] - s[0][1]));
    const big = (s: Pt[]) => dist(s[0], s[s.length - 1]) > size * 0.5;
    // ikisi de çapraz (yataydan 20°–70°): yatay ve dikey çizgiden oluşan T ya da + X sayılmaz
    const diagonal = (s: Pt[]) => {
      const deg = (Math.atan2(Math.abs(s[s.length - 1][1] - s[0][1]), Math.abs(s[s.length - 1][0] - s[0][0])) * 180) / Math.PI;
      return deg > 20 && deg < 70;
    };
    if (straight(a) && straight(b) && big(a) && big(b) && diagonal(a) && diagonal(b) && slope(a) * slope(b) < 0 && crosses(a[0], a[a.length - 1], b[0], b[b.length - 1])) return 'X';
    return null;
  }

  const s = used[0];
  const len = length(s);
  const closed = dist(s[0], s[s.length - 1]) < size * 0.35;
  if (closed && len > size * 2.2) {
    const k = corners(s);
    return k === 3 ? '△' : k === 4 || k === 5 ? '□' : k <= 1 ? 'O' : null;
  }
  const t = size * 0.12;
  if (!closed && reversals(s, 0, t) >= 2 && reversals(s, 1, t) <= 1 && box.h > box.w * 0.8) return 'S';
  if (!closed && reversals(s, 1, t) >= 3 && reversals(s, 0, t) <= 1 && box.w > box.h * 0.5) return 'M';
  return null;
}
