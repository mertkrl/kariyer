/*
 * Vapur sahnesinin çizim yardımcıları. Binlerce küçük şekil (şehir dokusu, pencereler, dalgalar)
 * tek tek SVG öğesi olursa tarayıcı yorulur: Painter aynı renkteki şekilleri tek bir yolda
 * (path) toplar, sahne birkaç yüz öğeyle çizilir.
 */

/** Sabit tohumlu sözde rastgele: kıyı her açılışta aynı. */
export function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

/** İki rengi `t` oranında karıştırır (0: a, 1: b). */
export function mix(a: string, b: string, t: number): string {
  const x = rgb(a);
  const y = rgb(b);
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

/** Rengi açar (k > 0) ya da koyulaştırır (k < 0). */
export const shade = (c: string, k: number) => mix(c, k > 0 ? '#ffffff' : '#000000', Math.abs(k));

const f = (n: number) => Math.round(n * 10) / 10;

/**
 * Aynı renkteki dikdörtgen ve çokgenleri tek yolda toplayan çizici. Üst üste binen şekiller için
 * derinlik (`at`) verilir: önce küçük derinlikler çizilir; aynı derinlikte renkler ilk geldikleri
 * sırayla.
 */
export class Painter {
  private paths = new Map<string, { z: number; fill: string; d: string[] }>();
  private z = 0;

  /** Bundan sonraki şekillerin derinliği. */
  at(z: number) {
    this.z = z;
    return this;
  }

  private add(fill: string, d: string) {
    const key = `${this.z}|${fill}`;
    let item = this.paths.get(key);
    if (!item) this.paths.set(key, (item = { z: this.z, fill, d: [] }));
    item.d.push(d);
  }

  rect(fill: string, x: number, y: number, w: number, h: number) {
    this.add(fill, `M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}z`);
  }

  poly(fill: string, pts: [number, number][]) {
    this.add(fill, `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}z`);
  }

  /** Yay biçimli çatı ya da kubbe: (x, y) tabanın sol ucu. */
  dome(fill: string, x: number, y: number, w: number, h: number) {
    this.add(fill, `M${f(x)} ${f(y)}C${f(x)} ${f(y - h * 1.33)} ${f(x + w)} ${f(y - h * 1.33)} ${f(x + w)} ${f(y)}z`);
  }

  circle(fill: string, x: number, y: number, r: number) {
    this.add(fill, `M${f(x - r)} ${f(y)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0z`);
  }

  ellipse(fill: string, x: number, y: number, rx: number, ry: number) {
    this.add(fill, `M${f(x - rx)} ${f(y)}a${f(rx)} ${f(ry)} 0 1 0 ${f(2 * rx)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-2 * rx)} 0z`);
  }

  /** Toplanan şekiller: her renk tek bir yol. */
  entries(): [string, string][] {
    return [...this.paths.values()].sort((a, b) => a.z - b.z).map((item) => [item.fill, item.d.join('')]);
  }
}
