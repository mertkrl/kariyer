/*
 * Kâğıda elle çizilen işareti tanır: X, S ya da O. Girdi bir ya da birkaç kalem darbesidir (her
 * darbe [x, y] noktaları). Kurallar basittir, el titremesine dayanıklıdır:
 *   O: tek darbe, başı ile sonu buluşur, yolu kutusunun çevresine yakın uzunluktadır.
 *   S: tek darbe, kapanmaz; giderken yatayda en az iki kez yön değiştirir, dikeyde çoğunlukla
 *      tek yöne iner (ya da çıkar).
 *   X: iki darbe; ikisi de aşağı yukarı düz, biri "\" öteki "/" yönünde ve birbirini keser.
 * Çok küçük karalama ya da başka bir şey null'dır. Saf mantıktır, test edilebilir.
 */

export type Pt = [number, number];
export type Glyph = 'X' | 'S' | 'O';

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
    if (straight(a) && straight(b) && big(a) && big(b) && slope(a) * slope(b) < 0 && crosses(a[0], a[a.length - 1], b[0], b[b.length - 1])) return 'X';
    return null;
  }

  const s = used[0];
  const len = length(s);
  const closed = dist(s[0], s[s.length - 1]) < size * 0.35;
  if (closed && len > size * 2.2) return 'O';
  const t = size * 0.12;
  if (!closed && reversals(s, 0, t) >= 2 && reversals(s, 1, t) <= 1 && box.h > box.w * 0.8) return 'S';
  return null;
}
