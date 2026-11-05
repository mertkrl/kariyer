import * as snd from '../sounds';
import { chance, clamp, lerp, pick, poly, rand, type Host } from './core';
import { CROSSING, ROUTES, TrafficLight } from './signal';
import { Vehicle, type Kind } from './vehicle';

/*
 * Trafik. Köşedeki ışık döner (yeşil, sarı, kırmızı); kırmızıda yayalar karşıya geçer. İki şerit:
 * yan sokaktan gelip ana yoldan aşağı inen (R1) ve ana yoldan çıkıp yan sokağa dönen (R2). Araçlar
 * önündekini "akıllı sürücü modeli"yle izler: istedikleri hıza ivmelenir, aradaki boşluğa ve hız
 * farkına göre yavaşlar, ışıkta, durakta, yaya geçidinde ve yola kaçan topun önünde durur.
 * Gövde yaylı bir süspansiyonun üstündedir: frende burnu eğilir, kalkışta arkası çöker, çukurda
 * önce ön, sonra arka teker zıplar. Yeşil yanınca öndeki geç kalkarsa arkadaki korna çalar.
 */


/**
 * Trafik yönetimi: araç üretimi, IDM ile takip, ışık, durak, yaya geçidi ve yoldaki engeller.
 * Dışarıdan her kare `crossing` (geçitteki yaya var mı) ve `blocks` (yoldaki top, işçi) verilir.
 */
export class Traffic {
  light = new TrafficLight();
  cars: Vehicle[] = [];
  /** Yaya geçidinde biri var mı (people.ts her kare yazar). */
  crossing = false;
  /** Yoldaki engeller: hangi şerit, nerede. */
  blocks: { route: number; s: number }[] = [];
  /** Otobüs durağında bekleyenler binsin: City dinler. */
  onBusStop: (() => void) | null = null;
  onHonk: ((v: Vehicle) => void) | null = null;
  onBump: (() => void) | null = null;
  private spawn = [rand(0.2, 2), rand(1, 3)];
  private low: boolean;

  constructor(low: boolean) {
    this.low = low;
  }

  private make(route: number) {
    const r = ROUTES[route];
    const roll = Math.random();
    const kind: Kind = route === 0 && roll < 0.1 ? 'bus' : roll < 0.45 ? 'car' : roll < 0.66 ? 'taxi' : roll < 0.82 ? 'dolmus' : roll < 0.95 ? 'kurye' : 'car';
    const v = new Vehicle(kind, r, route);
    v.onBump = () => this.onBump?.();
    return v;
  }

  update(h: Host, dt: number) {
    const L = this.light;
    L.update(dt);
    // üretim: şeridin başı boşsa
    for (let i = 0; i < 2; i++) {
      this.spawn[i] -= dt;
      if (this.spawn[i] > 0) continue;
      const lane = this.cars.filter((c) => c.lane === i);
      const last = lane.reduce((m, c) => Math.min(m, c.s), Infinity);
      if (lane.length < (this.low ? 2 : 4) && last > 60) this.cars.push(this.make(i));
      this.spawn[i] = this.low ? rand(7, 15) : rand(3.5, 10);
    }

    if (L.turnedGreen) {
      // yeşil yandı: kuyruğun önündekinin tepkisi geç kalabilir, arkadaki kornaya basar
      for (let i = 0; i < 2; i++) {
        const q = this.cars.filter((c) => c.lane === i && c.v < 3 && c.s < ROUTES[i].stop + 2 && c.s > ROUTES[i].stop - 140).sort((a, b) => b.s - a.s);
        const react = rand(0.3, 1.9);
        q.forEach((c, k) => (c.wait = react + k * 0.4));
        if (q.length > 1 && react > 1.15) {
          const back = q[1];
          window.setTimeout(() => {
            if (back.dead) return;
            back.honk = 0.9;
            this.onHonk?.(back);
          }, 1000);
        }
      }
    }

    for (const c of this.cars) {
      const r = c.route;
      const half = c.len / 2;
      let gap = Infinity;
      let dv = 0;
      // önündeki araç
      for (const o of this.cars)
        if (o !== c && o.lane === c.lane && o.s > c.s) {
          const d = o.s - c.s - (o.len + c.len) / 2;
          if (d < gap) {
            gap = d;
            dv = c.v - o.v;
          }
        }
      const wall = (s: number) => {
        const d = s - c.s - half;
        if (d > -2 && d < gap) {
          gap = Math.max(0.1, d);
          dv = c.v;
        }
      };
      // ışık: kırmızıda durur, sarıda rahat durabiliyorsa durur
      const toStop = r.stop - c.s - half;
      if (toStop > -1) {
        if (L.state === 'red') wall(r.stop);
        else if (L.state === 'yellow' && (c.v * c.v) / (2 * c.spec.dec * 0.7) < toStop) wall(r.stop);
      }
      // geçitteki yaya
      if (this.crossing && r.cross - c.s - half > -1) wall(r.cross - 6);
      // yoldaki top ya da işçi
      for (const b of this.blocks) if (b.route === c.lane && b.s - c.s - half > -1) wall(b.s - 10);
      // otobüs durağı
      if (c.kind === 'bus' && r.bus !== undefined && !c.served) {
        if (c.dwell > 0) {
          c.dwell -= dt;
          if (c.dwell <= 0) c.served = true;
          wall(c.s + half + 0.5);
        } else if (r.bus - c.s - half < 12 && c.v < 4) {
          c.dwell = 5.5;
          if (h.sound) snd.busBrake();
          this.onBusStop?.();
        } else wall(r.bus);
      }
      let a = gap === Infinity ? c.idm(1e6, 0) : c.idm(gap, dv);
      if (c.wait > 0) {
        c.wait -= dt;
        a = Math.min(a, -c.v * 4);
      }
      if (c.hard > 0) {
        c.hard -= dt;
        a = c.hard > 0.7 ? -c.spec.dec * 1.6 : Math.min(a, 0);
      }
      c.acc = clamp(a, -c.spec.dec * 1.7, c.spec.acc);
      c.update(h, dt);
    }
    this.cars = this.cars.filter((c) => !c.dead);
    // "herkese yeşil": geçitte yaya varken korna yağmuru
    if (L.chaos > 0 && this.crossing && chance(dt * 1.5)) {
      const c = pick(this.cars);
      if (c && c.honk <= 0) {
        c.honk = 0.7;
        if (h.sound) snd.carHorn(clamp((c.at().x / 576) - 1, -1, 1));
      }
    }
  }

  /** Bir noktanın hangi şeritte ve nerede olduğu (yola kaçan top için). */
  onRoad(x: number, y: number): { route: number; s: number } | null {
    for (let i = 0; i < ROUTES.length; i++) {
      const n = ROUTES[i].path.nearest(x, y);
      if (n.d < 16) return { route: i, s: n.s };
    }
    return null;
  }

  /** Yaya geçidinin silik çizgileri (boyalı yolda yok; şehir onu çizer). */
  drawCrossing(g: CanvasRenderingContext2D, h: Host) {
    const [a, b] = CROSSING;
    g.save();
    g.fillStyle = `rgba(240,236,226,${0.55 - h.dark * 0.3})`;
    const n = 7;
    for (let i = 0; i < n; i++) {
      const t0 = (i + 0.15) / n;
      const t1 = (i + 0.7) / n;
      const p0 = { x: lerp(a.x, b.x, t0), y: lerp(a.y, b.y, t0) };
      const p1 = { x: lerp(a.x, b.x, t1), y: lerp(a.y, b.y, t1) };
      const dx = 2.4;
      const dy = -9;
      poly(g, [
        { x: p0.x - dx, y: p0.y - dy * 0.5 },
        { x: p1.x - dx, y: p1.y - dy * 0.5 },
        { x: p1.x + dx, y: p1.y + dy * 0.5 },
        { x: p0.x + dx, y: p0.y + dy * 0.5 },
      ]);
      g.fill();
    }
    g.restore();
  }
}
