import * as snd from '../sounds';
import { chance, clamp, depthScale, glow, pick, rand, type Host, type Pt, type Thing } from './core';
import { drawFigure, randomLook, type Look } from './figure';
import { CROSSING } from './signal';

/*
 * Yayalar: kaldırımdaki bir yol ağında kapıdan kapıya yürür (kahvehane, pembe binanın kapısı,
 * bakkal, döviz bürosu, otobüs durağı, simitçi). Yaya geçidinde ışık kırmızı olana kadar bekler,
 * sonra karşıya geçer; durakta otobüsü bekler ve biner; yağmurda şemsiye açar, rüzgârda şemsiyesi
 * ters dönebilir.
 */

export const N: Record<string, Pt> = {
  shop: { x: 212, y: 603 },
  w1: { x: 178, y: 625 },
  w2: { x: 268, y: 643 },
  door: { x: 351, y: 651 },
  w3: { x: 395, y: 668 },
  bakkal: { x: 452, y: 663 },
  corner: { x: 466, y: 650 },
  curbL: CROSSING[0],
  stop: { x: 491, y: 603 },
  curbR: CROSSING[1],
  r1: { x: 600, y: 654 },
  cart: { x: 592, y: 708 },
  r2: { x: 660, y: 692 },
  doviz: { x: 712, y: 670 },
  r3: { x: 602, y: 748 },
};
const E: [string, string][] = [
  ['shop', 'w1'],
  ['shop', 'w2'],
  ['w1', 'w2'],
  ['w2', 'door'],
  ['door', 'w3'],
  ['w3', 'bakkal'],
  ['bakkal', 'corner'],
  ['corner', 'curbL'],
  ['curbL', 'stop'],
  ['curbL', 'curbR'],
  ['curbR', 'r1'],
  ['r1', 'cart'],
  ['r1', 'r2'],
  ['r2', 'doviz'],
  ['cart', 'r3'],
  ['r3', 'r2'],
  ['cart', 'r2'],
];
const DOORS = ['shop', 'door', 'bakkal', 'doviz', 'stop', 'cart'];

function route(from: string, to: string): string[] {
  const prev = new Map<string, string>([[from, '']]);
  const q = [from];
  while (q.length) {
    const a = q.shift()!;
    if (a === to) break;
    for (const [x, y] of E) {
      const b = x === a ? y : y === a ? x : null;
      if (b && !prev.has(b)) {
        prev.set(b, a);
        q.push(b);
      }
    }
  }
  const out: string[] = [];
  for (let c = to; c; c = prev.get(c) ?? '') out.unshift(c);
  return out;
}

export class Walker implements Thing {
  look: Look;
  x: number;
  y: number;
  depth = 0;
  dead = false;
  phase = rand(0, 6);
  dir = 1;
  speed: number;
  alpha = 0;
  path: string[];
  idx = 0;
  wait = 0;
  /** Geçitte mi (arabalar durur). */
  crossing = false;
  waitingBus = false;
  boarding: Pt | null = null;
  umbrella = 0;
  flipped = 0;
  leaving = false;

  constructor(from: string, to: string, kind?: 'adult' | 'kid' | 'elder') {
    this.look = randomLook(kind ?? (chance(0.12) ? 'elder' : chance(0.1) ? 'kid' : 'adult'));
    this.path = route(from, to);
    const p = N[from];
    this.x = p.x + rand(-3, 3);
    this.y = p.y + rand(-2, 2);
    this.speed = this.look.elder ? rand(9, 12) : this.look.kid ? rand(20, 26) : rand(15, 21);
  }

  get target(): Pt | null {
    if (this.boarding) return this.boarding;
    const name = this.path[this.idx];
    return name ? N[name] : null;
  }

  update(h: Host, dt: number) {
    this.umbrella = clamp(this.umbrella + (h.rain > 0.25 ? dt * 2 : -dt * 1.5), 0, 1);
    this.flipped = Math.max(0, this.flipped - dt * 0.4);
    if (this.leaving) {
      this.alpha -= dt * 2;
      if (this.alpha <= 0) this.dead = true;
      return;
    }
    this.alpha = Math.min(1, this.alpha + dt * 2);
    if (this.flipped > 0.6) return;
    if (this.wait > 0) {
      this.wait -= dt;
      return;
    }
    const tg = this.target;
    if (!tg) {
      this.leaving = true;
      return;
    }
    // yaya geçidi: karşıya ancak araçlara kırmızı yanınca
    const here = this.path[this.idx - 1];
    const next = this.path[this.idx];
    const onCross = (here === 'curbL' && next === 'curbR') || (here === 'curbR' && next === 'curbL');
    if (onCross && !this.crossing) {
      if (h.light !== 'red' && !h.chaos) return;
      this.crossing = true;
    }
    const dx = tg.x - this.x;
    const dy = tg.y - this.y;
    const d = Math.hypot(dx, dy);
    const sp = this.speed * (h.rain > 0.3 ? 1.3 : 1) * (this.crossing ? 1.25 : 1);
    if (d < 1.5) {
      this.crossing = false;
      if (this.boarding) {
        this.leaving = true;
        return;
      }
      this.idx++;
      const reached = this.path[this.idx - 1];
      if (this.idx >= this.path.length) {
        if (reached === 'stop') {
          this.waitingBus = true;
          this.wait = 9999;
        } else if (reached === 'cart') {
          // simit alır, yoluna devam eder
          this.wait = rand(2, 4);
          this.path = route('cart', pick(['doviz', 'r3', 'curbR', 'r2']));
          this.idx = 1;
        } else this.leaving = true;
      } else if (chance(0.15)) this.wait = rand(0.5, 2);
      return;
    }
    const step = Math.min(d, sp * dt);
    this.x += (dx / d) * step;
    this.y += (dy / d) * step;
    if (Math.abs(dx) > 0.4) this.dir = dx > 0 ? 1 : -1;
    this.phase += (step / (3.3 * (this.look.h / 26))) * 1.05;
    this.depth = this.y;
  }

  hit(x: number, y: number) {
    const s = (this.look.h / 26) * depthScale(this.y);
    return Math.abs(x - this.x) < 5 * s + 2 && y < this.y + 3 && y > this.y - 30 * s - (this.umbrella > 0 ? 8 : 0);
  }

  tap(h: Host) {
    const at = { x: this.x, y: this.y - 32 };
    if (this.waitingBus) {
      h.say('Durakta bekleyen', pick(['Ekranda “3 dk” yazıyor. Yarım saattir 3 dk yazıyor.', 'Ekran “Yakında” diyor. Ne zaman? Yakında.']), at);
      h.secret('ekran', at);
      return;
    }
    if (this.umbrella > 0.6) {
      this.flipped = 1.2;
      if (h.sound) snd.umbrellaPop();
      h.say('Yağmurdaki yaya', pick(['Şemsiyem ters döndü! Lodos mu bu?', 'Üç yüz liralık şemsiye, bir rüzgâra dayanmadı.']), at);
      h.secret('semsiye', at);
      return;
    }
    this.wait = Math.max(this.wait, 1.6);
    h.say(
      'Yoldan geçen',
      pick(
        this.look.kid
          ? ['Abi, top oynar mısın?', 'Annem bakkala yolladı, ne alacaktım unuttum.']
          : this.look.elder
            ? ['Evladım, saat kaç oldu?', 'Eskiden burası bostandı, bostan.', 'Bu dolmuş Üsküdar’a gider mi?']
            : ['Kusura bakma, acelem var.', 'Bakkal açık mı, biliyor musun?', 'Mesaiden çıktım, nihayet!', 'Telefonum şarjda kaldı, saat kaç?'],
      ),
      at,
    );
  }

  draw(g: CanvasRenderingContext2D, h: Host) {
    if (this.alpha <= 0) return;
    g.globalAlpha = this.alpha;
    drawFigure(g, h, this.x, this.y, this.look, {
      phase: this.phase,
      walking: this.wait <= 0 && !this.waitingBus && this.flipped < 0.6 && !this.leaving,
      dir: this.dir,
      umbrella: this.umbrella,
      flipped: this.flipped > 0 ? 1 : 0,
      t: h.t + this.x,
    });
    g.globalAlpha = 1;
  }
}

/** Kaldırımdaki yayaları üretir, durağa ve geçide bakar. */
export class Crowd {
  walkers: Walker[] = [];
  private spawn = 0.5;

  private low: boolean;

  constructor(low: boolean) {
    this.low = low;
    // açılışta birkaç kişi zaten yolda olsun
    for (let i = 0; i < (low ? 3 : 6); i++) {
      const w = this.make();
      w.alpha = 1;
      // yolun ortasından başlasın
      const steps = Math.floor(rand(0, w.path.length - 1));
      if (steps > 0) {
        w.idx = steps;
        const p = N[w.path[steps - 1]];
        w.x = p.x;
        w.y = p.y;
      }
      this.walkers.push(w);
    }
  }

  private make() {
    const from = pick(DOORS);
    let to = pick(DOORS);
    while (to === from) to = pick(DOORS);
    return new Walker(from, to);
  }

  update(h: Host, dt: number) {
    this.spawn -= dt;
    const cap = (this.low ? 5 : 9) - (h.dark > 0.7 ? 3 : 0) - (h.rain > 0.5 ? 2 : 0);
    if (this.spawn <= 0) {
      if (this.walkers.length < cap) this.walkers.push(this.make());
      this.spawn = this.low ? rand(9, 16) : rand(3.5, 8);
    }
    for (const w of this.walkers) w.update(h, dt);
    this.walkers = this.walkers.filter((w) => !w.dead);
  }

  get crossing() {
    return this.walkers.some((w) => w.crossing);
  }

  /** Otobüs geldi: durakta bekleyenler kapıya yürür ve biner; bir iki kişi de iner. */
  board(door: Pt) {
    for (const w of this.walkers)
      if (w.waitingBus) {
        w.waitingBus = false;
        w.wait = rand(0.2, 1.2);
        w.boarding = { x: door.x + rand(-2, 2), y: door.y };
      }
    const off = Math.floor(rand(0, 2.6));
    for (let i = 0; i < off; i++) {
      const w = new Walker('stop', pick(['shop', 'door', 'bakkal', 'doviz', 'cart']));
      w.x = door.x;
      w.y = door.y;
      w.wait = 1 + i * 0.8;
      this.walkers.push(w);
    }
  }
}

/** Gece sokak lambalarının etrafında dönen pervaneler. */
export function drawMoths(g: CanvasRenderingContext2D, h: Host) {
  if (h.dark < 0.55) return;
  for (const [cx, cy] of [
    [515, 463],
    [485, 566],
  ]) {
    glow(g, 'rgb(255,214,140)', cx, cy, 16, 0.18 * h.dark);
    for (let i = 0; i < 5; i++) {
      const a = h.t * (2.2 + i * 0.4) + i * 1.7;
      const r = 5 + i * 1.6 + Math.sin(h.t * 3 + i) * 1.5;
      g.fillStyle = 'rgba(255,240,210,0.9)';
      g.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a * 1.3) * r * 0.6, 1, 1);
    }
  }
}
