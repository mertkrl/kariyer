import * as snd from '../sounds';
import { clamp, INK, lerp, noise, pick, rand, type Host, type Thing } from './core';

/*
 * Sokağın üstüne gerilmiş çamaşır ipi. İp ve çamaşırlar kumaş benzetimiyle sallanır: Verlet
 * tümlevi (hız, önceki konumdan çıkar), komşu düğümler arasında uzaklık kısıtları, yerçekimi,
 * rüzgâr ve her düğüme ayrı esen sağanak. Mandallar köşeleri ipe tutar; dokununca bir çorap
 * rüzgâra kapılıp sokağa düşer.
 */

interface Node {
  x: number;
  y: number;
  px: number;
  py: number;
  pin: boolean;
}

function node(x: number, y: number, pin = false): Node {
  return { x, y, px: x, py: y, pin };
}

function integrate(ns: Node[], dt: number, ax: (n: Node, i: number) => number, ay: number, damp = 0.985) {
  const dt2 = dt * dt;
  ns.forEach((n, i) => {
    if (n.pin) return;
    const vx = (n.x - n.px) * damp;
    const vy = (n.y - n.py) * damp;
    n.px = n.x;
    n.py = n.y;
    n.x += vx + ax(n, i) * dt2;
    n.y += vy + ay * dt2;
  });
}

function link(a: Node, b: Node, rest: number) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy) || 0.0001;
  const diff = (d - rest) / d;
  const wa = a.pin ? 0 : b.pin ? 1 : 0.5;
  const wb = b.pin ? 0 : a.pin ? 1 : 0.5;
  a.x += dx * diff * wa;
  a.y += dy * diff * wa;
  b.x -= dx * diff * wb;
  b.y -= dy * diff * wb;
}

type ClothKind = 'towel' | 'shirt' | 'sock' | 'pants' | 'don';

interface Cloth {
  kind: ClothKind;
  cols: number;
  rows: number;
  cell: number;
  ns: Node[];
  color: string;
  /** İpte nereye mandallı (düğüm sırası, kesirli) ve eni. */
  at: number;
  w: number;
  free: boolean;
  floor: number;
  life: number;
}

/** Sokağın üstüne gerilmiş çamaşır ipi. */
export class Laundry implements Thing {
  depth = 470;
  rope: Node[] = [];
  clothes: Cloth[] = [];
  private rest: number;
  private A = { x: 478, y: 456 };
  private B = { x: 676, y: 477 };
  private low: boolean;

  constructor(low: boolean) {
    this.low = low;
    const n = 26;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      this.rope.push(node(lerp(this.A.x, this.B.x, t), lerp(this.A.y, this.B.y, t) + Math.sin(t * Math.PI) * 20, i === 0 || i === n - 1));
    }
    this.rest = (Math.hypot(this.B.x - this.A.x, this.B.y - this.A.y) * 1.035) / (n - 1);
    // trafik ışığının önü (düğüm 15–20) boş kalır
    const items: [ClothKind, number, string][] = [
      ['towel', 1.3, '#3f6fa8'],
      ['shirt', 2.8, '#efeae0'],
      ['sock', 4.5, '#c43c2c'],
      ['pants', 5.4, '#3d5a80'],
      ['don', 7.1, '#f4f2ec'],
      ['towel', 8.4, '#e0b04a'],
      ['shirt', 20.7, '#d9a62e'],
      ['sock', 22.2, '#2f4f7a'],
      ['towel', 22.9, '#c96a8a'],
    ];
    for (const [kind, at, color] of items) this.clothes.push(this.make(kind, at, color));
  }

  /** İpin kesirli bir düğüm sırasındaki noktası. */
  private ropeAt(f: number) {
    const i = Math.min(this.rope.length - 2, Math.max(0, Math.floor(f)));
    const t = f - i;
    return { x: lerp(this.rope[i].x, this.rope[i + 1].x, t), y: lerp(this.rope[i].y, this.rope[i + 1].y, t) };
  }

  /** Çamaşır: gerçek oranlarda (bir insan 26 birim boyunda). */
  private make(kind: ClothKind, at: number, color: string): Cloth {
    const dims: Record<ClothKind, [number, number, number]> = { towel: [4, 5, 9], shirt: [4, 5, 10.5], sock: [2, 4, 3], pants: [4, 6, 10], don: [3, 3, 7] };
    const [cols, rows, w] = dims[kind];
    const cell = w / (cols - 1);
    const pa = this.ropeAt(at);
    const ns: Node[] = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) ns.push(node(pa.x + c * cell, pa.y + r * cell * (kind === 'sock' ? 1.3 : 1)));
    return { kind, cols, rows, cell, ns, color, at, w, free: false, floor: 0, life: 0 };
  }

  update(h: Host, dt: number) {
    const steps = this.low ? 1 : 2;
    const sdt = dt / steps;
    for (let s = 0; s < steps; s++) {
      // ip: çamaşırların ağırlığıyla sarkar
      const heavy = new Set<number>();
      for (const c of this.clothes) if (!c.free) for (let i = Math.floor(c.at); i <= Math.ceil(c.at + c.w / this.rest); i++) heavy.add(i);
      integrate(
        this.rope,
        sdt,
        (_n, i) => h.wind * 24 * (heavy.has(i) ? 1.4 : 0.6),
        360,
      );
      for (const c of this.clothes) {
        const gust = (_n: Node, i: number) => {
          const w = h.wind * 70 + noise(h.t * 2.4 + i * 0.7 + c.at, 9) * 40 * (0.4 + Math.abs(h.wind));
          return w * (c.free ? 0.5 : 1);
        };
        integrate(c.ns, sdt, gust, c.free ? 140 : 300, 0.982);
        if (c.free) {
          c.life += sdt;
          for (const n of c.ns)
            if (n.y > c.floor) {
              n.y = c.floor;
              n.py = n.y;
              n.px = lerp(n.px, n.x, 0.6);
            }
        }
      }
      for (let it = 0; it < (this.low ? 2 : 3); it++) {
        for (let i = 1; i < this.rope.length; i++) link(this.rope[i - 1], this.rope[i], this.rest);
        for (const c of this.clothes) {
          const { cols, rows, cell, ns } = c;
          const vr = c.kind === 'sock' ? cell * 1.3 : cell;
          for (let r = 0; r < rows; r++)
            for (let k = 0; k < cols; k++) {
              const i = r * cols + k;
              if (k < cols - 1) link(ns[i], ns[i + 1], cell);
              if (r < rows - 1) link(ns[i], ns[i + cols], vr);
            }
          if (!c.free) {
            // mandallar: üst köşeler ipe tutturulmuş
            const pa = this.ropeAt(c.at);
            const pb = this.ropeAt(c.at + c.w / this.rest);
            ns[0].x = pa.x;
            ns[0].y = pa.y;
            ns[cols - 1].x = pb.x;
            ns[cols - 1].y = pb.y;
          }
        }
      }
    }
    // düşen çamaşır bir süre yerde kalır, sonra teyze yenisini asar
    for (let i = 0; i < this.clothes.length; i++) {
      const c = this.clothes[i];
      if (c.free && c.life > 14) this.clothes[i] = this.make(c.kind, c.at, c.color);
    }
  }

  hit(x: number, y: number) {
    return this.clothes.some((c) => {
      if (c.free) return false;
      const xs = c.ns.map((n) => n.x);
      const ys = c.ns.map((n) => n.y);
      return x > Math.min(...xs) - 3 && x < Math.max(...xs) + 3 && y > Math.min(...ys) - 3 && y < Math.max(...ys) + 3;
    });
  }

  tap(h: Host) {
    // bir çorap ya da don rüzgâra kapılır
    const loose = this.clothes.filter((c) => !c.free);
    const c = loose.find((x) => x.kind === 'sock') ?? loose.find((x) => x.kind === 'don') ?? pick(loose);
    if (!c) return;
    c.free = true;
    c.floor = rand(596, 640);
    c.life = 0;
    for (const n of c.ns) {
      n.px -= h.wind * 1.5 + 0.8;
      n.py += 0.6;
    }
    if (h.sound) snd.rustle();
    const at = { x: this.A.x - 6, y: this.A.y - 18 };
    h.say('Balkondan', pick(['Çorabım! Kim aldı çorabımı?!', 'Bir rüzgâr esti, donum karşı apartmana gitti!', 'Çamaşırlara dokunma, daha kurumadı!']), at);
    h.secret('camasir', at);
  }

  draw(g: CanvasRenderingContext2D, h: Host) {
    const n = h.night;
    const ink = n.c(INK);
    g.strokeStyle = n.c('#5a524a');
    g.lineWidth = 0.7;
    g.beginPath();
    g.moveTo(this.rope[0].x, this.rope[0].y);
    for (const r of this.rope) g.lineTo(r.x, r.y);
    g.stroke();
    for (const c of this.clothes) drawCloth(g, h, c, ink);
  }
}

function drawCloth(g: CanvasRenderingContext2D, h: Host, c: Cloth, ink: string) {
  const n = h.night;
  const { cols, rows, ns } = c;
  const at = (r: number, k: number) => ns[r * cols + k];
  const left = Array.from({ length: rows }, (_, r) => at(r, 0));
  const right = Array.from({ length: rows }, (_, r) => at(r, cols - 1));
  const top = Array.from({ length: cols }, (_, k) => at(0, k));
  const bottom = Array.from({ length: cols }, (_, k) => at(rows - 1, k));
  const fade = c.free && c.life > 11 ? clamp(1 - (c.life - 11) / 3, 0, 1) : 1;
  g.globalAlpha = fade;
  g.fillStyle = n.c(c.color);
  g.strokeStyle = ink;
  g.lineWidth = 0.55;
  g.beginPath();
  if (c.kind === 'pants') {
    // pantolon: ortadan iki paça
    const m = at(Math.floor(rows / 2), 1);
    const m2 = at(Math.floor(rows / 2), 2);
    g.moveTo(top[0].x, top[0].y);
    for (const p of top) g.lineTo(p.x, p.y);
    for (const p of right) g.lineTo(p.x, p.y);
    g.lineTo(bottom[2].x, bottom[2].y);
    g.lineTo((m.x + m2.x) / 2, (m.y + m2.y) / 2);
    g.lineTo(bottom[1].x, bottom[1].y);
    for (let r = rows - 1; r >= 0; r--) g.lineTo(left[r].x, left[r].y);
  } else if (c.kind === 'sock') {
    // çorap: aşağıda topuğu yana kıvrılır
    for (const p of left) g.lineTo(p.x, p.y);
    const b = bottom[1];
    g.lineTo(b.x + 3.2, b.y + 0.6);
    g.lineTo(b.x + 3.4, b.y - 1.8);
    for (let r = rows - 1; r >= 0; r--) g.lineTo(right[r].x, right[r].y);
  } else {
    for (const p of top) g.lineTo(p.x, p.y);
    for (const p of right) g.lineTo(p.x, p.y);
    for (let k = cols - 1; k >= 0; k--) g.lineTo(bottom[k].x, bottom[k].y);
    for (let r = rows - 1; r >= 0; r--) g.lineTo(left[r].x, left[r].y);
  }
  g.closePath();
  g.fill();
  g.stroke();
  // kıvrım gölgeleri: sütunlar arasında hafif koyu şeritler
  g.strokeStyle = 'rgba(0,0,0,0.12)';
  g.lineWidth = 0.8;
  for (let k = 1; k < cols - 1; k++) {
    g.beginPath();
    for (let r = 0; r < rows; r++) {
      const p = at(r, k);
      if (r) g.lineTo(p.x, p.y);
      else g.moveTo(p.x, p.y);
    }
    g.stroke();
  }
  if (c.kind === 'shirt') {
    // kollar ve yaka
    for (const [corner, side] of [
      [at(0, 0), -1],
      [at(0, cols - 1), 1],
    ] as const) {
      const below = side < 0 ? at(1, 0) : at(1, cols - 1);
      g.fillStyle = n.c(c.color);
      g.strokeStyle = ink;
      g.beginPath();
      g.moveTo(corner.x, corner.y);
      g.lineTo(corner.x + side * 3.4, corner.y + 1.4);
      g.lineTo(below.x + side * 3.4, below.y + 2);
      g.lineTo(below.x, below.y);
      g.closePath();
      g.fill();
      g.stroke();
    }
    const m = { x: (top[1].x + top[2].x) / 2, y: (top[1].y + top[2].y) / 2 };
    g.strokeStyle = ink;
    g.beginPath();
    g.moveTo(m.x - 1.4, m.y);
    g.lineTo(m.x, m.y + 2);
    g.lineTo(m.x + 1.4, m.y);
    g.stroke();
  } else if (c.kind === 'don') {
    g.fillStyle = n.c('#c43c2c');
    for (let r = 0; r < rows - 1; r++)
      for (let k = 0; k < cols - 1; k++) {
        const p = at(r, k);
        const q = at(r + 1, k + 1);
        g.beginPath();
        g.arc((p.x + q.x) / 2, (p.y + q.y) / 2, 0.8, 0, Math.PI * 2);
        g.fill();
      }
  } else if (c.kind === 'towel') {
    g.strokeStyle = n.c('#f4f1e6');
    g.lineWidth = 0.7;
    g.beginPath();
    const a = at(rows - 2, 0);
    const b = at(rows - 2, cols - 1);
    g.moveTo(a.x, a.y + 1);
    g.lineTo(b.x, b.y + 1);
    g.stroke();
  }
  // mandallar
  if (!c.free) {
    g.fillStyle = n.c('#e8d9a8');
    for (const p of [top[0], top[cols - 1]]) g.fillRect(p.x - 0.6, p.y - 1.6, 1.2, 2.6);
  }
  g.globalAlpha = 1;
}
