import * as snd from '../sounds';
import { clamp, depthScale, dist, G, INK, inside, pick, rand, shadow, type Host, type Pt, type Thing } from './core';
import { drawFigure, randomLook, type Look } from './figure';

/*
 * Top oynayan iki çocuk. Top gerçek bir cisim gibi davranır: yerçekimiyle düşer, sekerken enerji
 * kaybeder, yerde sürtünmeyle yavaşlar, döner, çarpınca ezilip açılır. Çocuklar topu durdurur,
 * arkadaşına havadan atar, kaçarsa koşar; yola kaçarsa arabalar durur.
 */

/** Sağdaki meydancık (çocukların oyun yeri) ve yol: top bunların dışına çıkamaz. */
export const PLAZA: [number, number][] = [
  [528, 745],
  [560, 690],
  [578, 634],
  [592, 586],
  [668, 536],
  [668, 652],
  [762, 672],
  [632, 778],
];
export const ROAD: [number, number][] = [
  [455, 724],
  [470, 688],
  [481, 660],
  [492, 633],
  [500, 594],
  [512, 562],
  [540, 522],
  [600, 506],
  [664, 472],
  [668, 532],
  [592, 586],
  [578, 634],
  [560, 690],
  [528, 745],
  [508, 762],
  [462, 762],
];

/** Top: yerde sekip yuvarlanır (çekim, sekme, sürtünme, dönme); çarpınca ezilip açılır. */
export class Ball implements Thing {
  x = 606;
  y = 744;
  z = 0;
  vx = 0;
  vy = 0;
  vz = 0;
  spin = 0;
  squash = 0;
  depth = 744;
  held: Kid | null = null;

  update(h: Host, dt: number) {
    if (this.held) {
      this.x = this.held.x + this.held.dir * 3;
      this.y = this.held.y + 0.5;
      this.z = 9;
      this.vx = this.vy = this.vz = 0;
      this.depth = this.y + 0.1;
      return;
    }
    this.vz -= G * dt;
    this.z += this.vz * dt;
    if (this.z <= 0) {
      this.z = 0;
      if (this.vz < -40) {
        this.squash = clamp(-this.vz / 300, 0, 0.45);
        if (h.sound) snd.bounce(clamp(-this.vz / 260, 0.1, 1));
      }
      this.vz = this.vz < -40 ? -this.vz * 0.55 : 0;
      // yerde: sürtünme
      const f = Math.pow(0.18, dt);
      this.vx *= f;
      this.vy *= f;
    }
    const nx = this.x + this.vx * dt;
    const ny = this.y + this.vy * dt;
    // meydancığın ve yolun dışına çıkamaz: sınırdan seker
    if (!inside(nx, ny, PLAZA) && !inside(nx, ny, ROAD)) {
      this.vx *= -0.6;
      this.vy *= -0.6;
    } else {
      this.x = nx;
      this.y = ny;
    }
    this.spin += Math.hypot(this.vx, this.vy) * dt * 0.35 * Math.sign(this.vx || 1);
    this.squash = Math.max(0, this.squash - dt * 3);
    this.depth = this.y;
  }

  get resting() {
    return !this.held && this.z === 0 && Math.hypot(this.vx, this.vy) < 4;
  }

  /** Topu (x, y)'ye düşecek biçimde havalandır. */
  lob(tx: number, ty: number, T = 0.9) {
    this.held = null;
    this.vx = (tx - this.x) / T;
    this.vy = (ty - this.y) / T;
    this.z = Math.max(this.z, 4);
    this.vz = 0.5 * G * T;
  }

  hit(x: number, y: number) {
    return dist(x, y, this.x, this.y - this.z - 2.5) < 9;
  }

  draw(g: CanvasRenderingContext2D, h: Host) {
    const n = h.night;
    const k = depthScale(this.y);
    const r = 2.8 * k;
    shadow(g, this.x, this.y, r * (1.1 - this.z / 120), r * 0.45, clamp(0.3 - this.z / 200, 0.08, 0.3));
    g.save();
    g.translate(this.x, this.y - this.z - r * (1 - this.squash));
    g.scale(1 + this.squash, 1 - this.squash);
    g.fillStyle = n.c('#f4f2ec');
    g.strokeStyle = n.c(INK);
    g.lineWidth = 0.6;
    g.beginPath();
    g.arc(0, 0, r, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.rotate(this.spin);
    g.fillStyle = n.c('#1d1d1f');
    g.beginPath();
    g.arc(0, 0, r * 0.38, 0, Math.PI * 2);
    g.fill();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.beginPath();
      g.arc(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82, r * 0.22, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }
}

/** Top oynayan çocuk: topu durdurur, kısa bir an bekler, arkadaşına havadan atar; kaçarsa koşar. */
export class Kid implements Thing {
  look: Look;
  depth = 0;
  phase = 0;
  dir = 1;
  hold = 0;
  x: number;
  y: number;
  readonly home: Pt;
  constructor(x: number, y: number, home: Pt) {
    this.x = x;
    this.y = y;
    this.home = home;
    this.look = randomLook('kid');
  }

  update() {}

  /** Oyun adımı: topu izler, durdurur, arkadaşına atar. */
  step(dt: number, ball: Ball, mate: Kid) {
    let tx = this.home.x;
    let ty = this.home.y;
    const free = !ball.held;
    const mine = ball.held === this;
    const near = dist(ball.x, ball.y, this.x, this.y);
    // top kendine doğru geliyorsa ya da yakınında duruyorsa: ona koş
    const toward = (ball.vx * (this.x - ball.x) + ball.vy * (this.y - ball.y)) > 0;
    const chase = free && ((ball.resting && near < 150 && dist(ball.x, ball.y, mate.x, mate.y) >= near) || (toward && near < 70));
    if (chase) {
      tx = ball.x;
      ty = ball.y;
    }
    if (mine) {
      this.hold -= dt;
      if (this.hold <= 0) {
        // arkadaşına havadan at
        ball.held = null;
        ball.lob(mate.home.x + rand(-6, 6), mate.home.y + rand(-4, 4), rand(0.75, 1));
        this.phase += 1.2;
      }
    } else if (free && near < 6 && ball.z < 6) {
      ball.held = this;
      this.hold = rand(0.6, 1.4);
    }
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    const run = chase ? 34 : 18;
    if (d > 1) {
      const step = Math.min(d, run * dt);
      this.x += (dx / d) * step;
      this.y += (dy / d) * step;
      if (Math.abs(dx) > 0.4) this.dir = dx > 0 ? 1 : -1;
      this.phase += step / 2.4;
    } else this.dir = mate.x > this.x ? 1 : -1;
    this.depth = this.y;
  }

  get onRoad() {
    return inside(this.x, this.y, ROAD);
  }

  hit(x: number, y: number) {
    return Math.abs(x - this.x) < 6 && y > this.y - 20 && y < this.y + 3;
  }

  tap(h: Host) {
    h.say('Çocuk', pick(['Abi kale sen ol!', 'Gol değildi, direkten döndü!', 'Topu atar mısın? Atma, araba geliyor!']), { x: this.x, y: this.y - 24 });
  }

  draw(g: CanvasRenderingContext2D, h: Host) {
    drawFigure(g, h, this.x, this.y, this.look, { phase: this.phase, walking: true, dir: this.dir });
  }
}
