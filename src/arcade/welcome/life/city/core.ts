/*
 * Yaşayan mahallenin çekirdeği: matematik, yumuşak gürültü, yol izleme, maketin izometrik zeminine
 * izdüşüm, gece renk karartması ve yumuşak parçacık fırçaları. Her şey maket görselinin
 * koordinatlarında (1152 × 928) yaşar; Life.tsx tuvali görselin üstüne aynı ölçekle oturtur.
 */

export const W = 1152;
export const H = 928;
/** Küçük cisimler için yerçekimi (görsel pikseli / sn²). */
export const G = 420;
export const INK = '#2a2420';

export type Pt = { x: number; y: number };

/**
 * Şehrin her şeye açtığı kapı: saat, rüzgâr, yağmur, gece, parçacıklar; konuşma balonu, bulunan
 * sır ve sesin açık olup olmadığı. (City bunu uygular; modüller birbirini içe aktarmadan konuşur.)
 */
export interface Host {
  t: number;
  /** −1…1: eksi sola, artı sağa esiyor. */
  wind: number;
  /** 0…1 yağmurun şiddeti. */
  rain: number;
  dark: number;
  low: boolean;
  /** Sesler çalsın mı (ses açık, sekme görünür, ilk dokunuş olmuş). */
  sound: boolean;
  night: Night;
  fx: import('./fx').Fx;
  /** Köşedeki ışık (yayalar kırmızıyı bekler) ve "herkese yeşil" karmaşası. */
  light: 'green' | 'yellow' | 'red';
  chaos: boolean;
  say(who: string, text: string, at: Pt): void;
  secret(id: string, at: Pt): void;
}

/** Şehirde yaşayan her şey: derinliğine göre sıralanıp çizilir. */
export interface Thing {
  /** Zeminde durduğu yerin ekran y'si: küçük olan önce (arkada) çizilir. */
  depth: number;
  update(h: Host, dt: number): void;
  draw(g: CanvasRenderingContext2D, h: Host): void;
  /** (x, y) bu şeyin üstünde mi. */
  hit?(x: number, y: number): boolean;
  tap?(h: Host): void;
  dead?: boolean;
}

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];
export const chance = (p: number) => Math.random() < p;
export const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);

function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Yumuşak tek boyutlu gürültü: −1…1, aynı tohumla aynı eğri. */
export function noise(x: number, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const a = hash(i + seed * 57.3);
  const b = hash(i + 1 + seed * 57.3);
  return (a + (b - a) * smooth(f)) * 2 - 1;
}

/** Kırık çizgi yol: yay uzunluğuyla konum ve doğrultu. */
export class Path {
  readonly pts: Pt[];
  readonly cum: number[];
  readonly len: number;

  constructor(points: [number, number][]) {
    this.pts = points.map(([x, y]) => ({ x, y }));
    this.cum = [0];
    for (let i = 1; i < this.pts.length; i++) this.cum.push(this.cum[i - 1] + dist(this.pts[i].x, this.pts[i].y, this.pts[i - 1].x, this.pts[i - 1].y));
    this.len = this.cum[this.cum.length - 1];
  }

  /** s uzunluğundaki nokta ve birim doğrultu (köşelerde yumuşatılmış). */
  at(s: number): { x: number; y: number; tx: number; ty: number } {
    const d = clamp(s, 0, this.len);
    let i = 1;
    while (i < this.cum.length - 1 && this.cum[i] < d) i++;
    const a = this.pts[i - 1];
    const b = this.pts[i];
    const seg = this.cum[i] - this.cum[i - 1] || 1;
    const t = (d - this.cum[i - 1]) / seg;
    let tx = (b.x - a.x) / seg;
    let ty = (b.y - a.y) / seg;
    // köşeye yaklaşırken bir sonraki doğrultuya kayar: araçlar dönüşte savrulmaz
    if (t > 0.6 && i < this.pts.length - 1) {
      const c = this.pts[i + 1];
      const seg2 = this.cum[i + 1] - this.cum[i] || 1;
      const k = smooth((t - 0.6) / 0.4) * 0.5;
      tx = lerp(tx, (c.x - b.x) / seg2, k);
      ty = lerp(ty, (c.y - b.y) / seg2, k);
    } else if (t < 0.4 && i > 1) {
      const z = this.pts[i - 2];
      const seg0 = this.cum[i - 1] - this.cum[i - 2] || 1;
      const k = smooth((0.4 - t) / 0.4) * 0.5;
      tx = lerp(tx, (a.x - z.x) / seg0, k);
      ty = lerp(ty, (a.y - z.y) / seg0, k);
    }
    const n = Math.hypot(tx, ty) || 1;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, tx: tx / n, ty: ty / n };
  }

  /** Bir noktanın yol üstündeki en yakın uzunluğu ve yoldan uzaklığı. */
  nearest(x: number, y: number): { s: number; d: number } {
    let best = { s: 0, d: Infinity };
    for (let i = 1; i < this.pts.length; i++) {
      const a = this.pts[i - 1];
      const b = this.pts[i];
      const vx = b.x - a.x;
      const vy = b.y - a.y;
      const l2 = vx * vx + vy * vy || 1;
      const t = clamp(((x - a.x) * vx + (y - a.y) * vy) / l2, 0, 1);
      const d = dist(x, y, a.x + vx * t, a.y + vy * t);
      if (d < best.d) best = { s: this.cum[i - 1] + Math.sqrt(l2) * t, d };
    }
    return best;
  }
}

/*
 * Maketin zemini: ana yol boyunca bize doğru (U), yolun karşısına sağa (V), yukarı (Z). Ekranda
 * U aşağı ve hafif sola, V sağa ve hafif yukarı düşer. Araçlar bu tabanda kutu olarak çizilir:
 * hangi yüzü görüneceği kameranın yönüne göre hesaplanır.
 */
export const GU = { x: -0.2025, y: 0.72 };
export const GV = { x: 1, y: -0.08 };
const DET = GU.x * GV.y - GU.y * GV.x;
/** Kameraya bakan yatay yön (U, V düzleminde). */
export const CAM = { u: 0.98, v: 0.2 };

/** Ekrandaki bir doğrultuyu zemin doğrultusuna çevirir (birim). */
export function worldDir(tx: number, ty: number): [number, number] {
  const a = (tx * GV.y - ty * GV.x) / DET;
  const b = (GU.x * ty - GU.y * tx) / DET;
  const n = Math.hypot(a, b) || 1;
  return [a / n, b / n];
}

/** Zemindeki bir noktadan (u, v, z) kaydırılmış ekran noktası. */
export function proj(o: Pt, u: number, v: number, z: number): Pt {
  return { x: o.x + u * GU.x + v * GV.x, y: o.y + u * GU.y + v * GV.y - z };
}

/** Uzaklaştıkça küçülme: maketin üst kısmındaki şeyler biraz daha küçük. */
export const depthScale = (y: number) => 0.78 + 0.32 * clamp((y - 440) / 320, 0, 1);

function rgbOf(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

/** İki rengi karıştırır. */
export function mixHex(a: string, b: string, t: number): string {
  const x = rgbOf(a);
  const y = rgbOf(b);
  return `rgb(${Math.round(x[0] + (y[0] - x[0]) * t)},${Math.round(x[1] + (y[1] - x[1]) * t)},${Math.round(x[2] + (y[2] - x[2]) * t)})`;
}

export const shadeHex = (c: string, k: number) => mixHex(c, k > 0 ? '#ffffff' : '#000000', Math.abs(k));

/**
 * Gece karartması: renkler maketin gece boyasına (lacivert) doğru çekilir. Her karede yeniden
 * hesaplanmasın diye karanlık 0,05'lik adımlara yuvarlanır ve sonuçlar saklanır.
 */
export class Night {
  dark = 0;
  private step = -1;
  private cache = new Map<string, string>();

  set(dark: number) {
    const step = Math.round(dark * 20);
    this.dark = dark;
    if (step !== this.step) {
      this.step = step;
      this.cache.clear();
    }
  }

  c(hex: string): string {
    let v = this.cache.get(hex);
    if (!v) {
      const [r, g, b] = rgbOf(hex);
      const k = (this.step / 20) * 0.62;
      // gece: maviye çeker, parlaklığı düşürür
      v = `rgb(${Math.round(r + (34 - r) * k)},${Math.round(g + (40 - g) * k)},${Math.round(b + (66 - b) * k)})`;
      this.cache.set(hex, v);
    }
    return v;
  }
}

const sprites = new Map<string, HTMLCanvasElement>();

/** Yumuşak, kenarı sönen daire fırçası (duman, buhar, ışık halesi). */
export function soft(color: string): HTMLCanvasElement {
  let c = sprites.get(color);
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, color);
    gr.addColorStop(0.45, color.replace(/rgb\(([^)]+)\)/, 'rgba($1,0.55)'));
    gr.addColorStop(1, color.replace(/rgb\(([^)]+)\)/, 'rgba($1,0)'));
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    sprites.set(color, c);
  }
  return c;
}

/** Yumuşak fırçayla bir leke: (x, y) merkez, r yarıçap. */
export function blot(g: CanvasRenderingContext2D, color: string, x: number, y: number, r: number, alpha: number) {
  if (alpha <= 0.002 || r <= 0.2) return;
  g.globalAlpha = alpha;
  g.drawImage(soft(color), x - r, y - r, r * 2, r * 2);
  g.globalAlpha = 1;
}

/** Zemine düşen yumuşak gölge. */
export function shadow(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, alpha = 0.28) {
  g.save();
  g.globalAlpha = alpha;
  g.fillStyle = '#1a120a';
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

export function poly(g: CanvasRenderingContext2D, pts: Pt[]) {
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
}

/** Noktanın çokgenin içinde olup olmadığı. */
export function inside(x: number, y: number, pts: [number, number][]) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/** Çokgenin içinden rastgele bir nokta (yağmurun düştüğü yer). */
export function sampleIn(pts: [number, number][]): Pt {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  for (let k = 0; k < 20; k++) {
    const x = rand(x0, x1);
    const y = rand(y0, y1);
    if (inside(x, y, pts)) return { x, y };
  }
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
}

/** Işık saçan bir şeyin halesi: üst üste binince parlar. */
export function glow(g: CanvasRenderingContext2D, color: string, x: number, y: number, r: number, alpha: number) {
  if (alpha <= 0.01) return;
  const op = g.globalCompositeOperation;
  g.globalCompositeOperation = 'lighter';
  blot(g, color, x, y, r, alpha);
  g.globalCompositeOperation = op;
}
