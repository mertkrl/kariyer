import * as snd from '../sounds';
import { chance, clamp, dist, INK, inside, pick, rand, type Host, type Pt, type Thing } from './core';
import { drawFigure, randomLook, type Look } from './figure';
import { ROAD } from './play';

/*
 * Teyze ve sepet (balkondan iple sarkıtılan sepet: boyu değişen bir sarkaç), sepete ekmek koyan
 * bakkal Şükrü ve çukuru yamamaya gelen yol işçisi.
 */

/**
 * Teyze ve sepet: balkondan iple sepet sarkıtır. İp boyu değişen bir sarkaç: açı ivmesi
 * −(g/L)·sin θ, boy uzarken salınım söner, kısalırken büyür. Sepet inince bakkal Şükrü çıkar,
 * ekmeği koyar, sepet yukarı çekilir.
 */
export class Basket implements Thing {
  readonly anchor = { x: 447, y: 511 };
  L = 4;
  th = 0;
  thV = 0;
  depth = 655;
  state: 'idle' | 'call' | 'down' | 'wait' | 'up' = 'idle';
  private t = rand(35, 60);
  bread = false;
  sukru: { x: number; y: number; phase: number; dir: number; step: 'out' | 'put' | 'back' | 'none'; t: number } = { x: 458, y: 648, phase: 0, dir: -1, step: 'none', t: 0 };
  private sukruLook: Look = { ...randomLook('adult'), style: 'bald', top: '#3f5f8a', bottom: '#2c2620', prop: 'none', skirt: false, h: 25 };
  private teyzeLook: Look = { ...randomLook('elder'), style: 'scarf' };
  private maxL = 136;

  start(h: Host, byTap: boolean) {
    if (this.state !== 'idle') {
      // inerken dokunulursa sallanır
      this.thV += 1.3;
      if (h.sound) snd.creak();
      return false;
    }
    this.state = 'call';
    this.t = 1.6;
    const at = { x: this.anchor.x, y: this.anchor.y - 14 };
    h.say('Teyze', pick(['Şükrü! İki ekmek, bir de gazete. Parası sepette!', 'Şükrü oğlum, yarım ekmek, bir de süt. Deftere yaz!', 'Şükrü! Sepeti sallama bu sefer, yumurta var!']), at);
    if (byTap) h.secret('sepet', at);
    return true;
  }

  update(h: Host, dt: number) {
    const g = 400;
    // değişken boylu sarkaç
    const Ldot = this.state === 'down' ? 46 : this.state === 'up' ? -52 : 0;
    const L = Math.max(4, this.L);
    this.thV += (-(g / L) * Math.sin(this.th) - 0.6 * this.thV - (2 * Ldot * this.thV) / L + (h.wind * 18) / L) * dt;
    this.th = clamp(this.th + this.thV * dt, -0.9, 0.9);
    this.L = clamp(this.L + Ldot * dt, 4, this.maxL);
    this.t -= dt;
    const s = this.sukru;
    switch (this.state) {
      case 'idle':
        if (this.t <= 0) this.start(h, false);
        break;
      case 'call':
        if (this.t <= 0) this.state = 'down';
        break;
      case 'down':
        if (this.L >= this.maxL) {
          this.state = 'wait';
          s.step = 'out';
          s.x = 470;
          s.y = 646;
          s.t = 0;
        }
        break;
      case 'wait': {
        const bx = this.anchor.x + Math.sin(this.th) * this.L;
        if (s.step === 'out') {
          const d = bx + 7 - s.x;
          s.dir = d > 0 ? 1 : -1;
          s.x += Math.sign(d) * Math.min(Math.abs(d), 16 * dt);
          s.y += (657 - s.y) * dt * 2;
          s.phase += 16 * dt * 0.3;
          if (Math.abs(d) < 1) {
            s.step = 'put';
            s.t = 1.4;
            s.dir = -1;
            h.say('Bakkal Şükrü', pick(['Tamam abla, deftere yazdım!', 'Ekmek sıcak abla, gazete de bugünkü.', 'Süt bitti abla, ayran koydum.']), { x: s.x, y: s.y - 32 });
          }
        } else if (s.step === 'put') {
          s.t -= dt;
          if (s.t < 0.7) this.bread = true;
          if (s.t <= 0) s.step = 'back';
        } else if (s.step === 'back') {
          const d = 470 - s.x;
          s.dir = d > 0 ? 1 : -1;
          s.x += Math.sign(d) * Math.min(Math.abs(d), 16 * dt);
          s.phase += 16 * dt * 0.3;
          if (Math.abs(d) < 1) {
            s.step = 'none';
            this.state = 'up';
          }
        }
        break;
      }
      case 'up':
        if (this.L <= 4.5) {
          this.state = 'idle';
          this.bread = false;
          this.t = rand(80, 130);
        }
        break;
    }
  }

  get basket(): Pt {
    return { x: this.anchor.x + Math.sin(this.th) * this.L, y: this.anchor.y + Math.cos(this.th) * this.L };
  }

  hit(x: number, y: number) {
    const b = this.basket;
    return dist(x, y, this.anchor.x - 4, this.anchor.y - 8) < 13 || (this.state !== 'idle' && dist(x, y, b.x, b.y + 4) < 10);
  }

  tap(h: Host) {
    this.start(h, true);
  }

  draw(g: CanvasRenderingContext2D, h: Host) {
    const n = h.night;
    const ink = n.c(INK);
    // balkondaki teyze (yalnızca iş başındayken)
    if (this.state !== 'idle' || this.L > 5) {
      const tx = this.anchor.x - 5;
      const ty = this.anchor.y + 2;
      g.save();
      g.beginPath();
      g.rect(tx - 12, ty - 30, 24, 30);
      g.clip();
      drawFigure(g, h, tx, ty + 8, this.teyzeLook, { phase: 0, walking: false, dir: 1, wave: this.state === 'call' ? 1 : 0 });
      g.restore();
    }
    if (this.L > 5) {
      const b = this.basket;
      g.strokeStyle = n.c('#d8cfb8');
      g.lineWidth = 0.6;
      g.beginPath();
      g.moveTo(this.anchor.x, this.anchor.y);
      g.lineTo(b.x, b.y);
      g.stroke();
      // sepet: hasır örgü
      g.save();
      g.translate(b.x, b.y);
      g.rotate(this.th * 0.6);
      g.strokeStyle = n.c('#8a6a3a');
      g.lineWidth = 0.6;
      g.beginPath();
      g.moveTo(-4.5, 2);
      g.quadraticCurveTo(0, -5, 4.5, 2);
      g.stroke();
      g.fillStyle = n.c('#c9a160');
      g.strokeStyle = ink;
      g.beginPath();
      g.moveTo(-5, 2);
      g.lineTo(5, 2);
      g.lineTo(4, 8);
      g.lineTo(-4, 8);
      g.closePath();
      g.fill();
      g.stroke();
      g.strokeStyle = n.c('#9a7a44');
      g.lineWidth = 0.5;
      for (const yy of [4, 6]) {
        g.beginPath();
        g.moveTo(-4.6, yy);
        g.lineTo(4.6, yy);
        g.stroke();
      }
      if (this.bread) {
        g.fillStyle = n.c('#d49a52');
        g.beginPath();
        g.ellipse(-1, 1.4, 3.6, 1.3, -0.2, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = n.c('#ece6d6');
        g.fillRect(1.5, -1.5, 2.5, 3.4);
      }
      g.restore();
    }
    const s = this.sukru;
    if (s.step !== 'none') drawFigure(g, h, s.x, s.y, this.sukruLook, { phase: s.phase, walking: s.step !== 'put', dir: s.dir, apron: '#f4f1e6', carry: s.step === 'out' || s.step === 'put' ? 'bread' : 'none' });
  }
}

/** Yama işçisi: çukura gider, kürekle yamar, geri döner. */
export class Worker implements Thing {
  x = 590;
  y = 716;
  depth = 716;
  dead = false;
  look: Look = { ...randomLook('adult'), style: 'short', top: '#f07a1a', bottom: '#2c3444', prop: 'none', skirt: false, h: 26 };
  phase = 0;
  dir = -1;
  state: 'go' | 'work' | 'back' = 'go';
  t = 0;
  readonly hole: Pt;
  readonly done: () => void;
  constructor(hole: Pt, done: () => void) {
    this.hole = hole;
    this.done = done;
  }

  update(h: Host, dt: number) {
    const tg = this.state === 'back' ? { x: 590, y: 716 } : { x: this.hole.x + 10, y: this.hole.y + 2 };
    if (this.state === 'work') {
      this.t -= dt;
      if (chance(dt * 3)) h.fx.dust(this.hole.x, this.hole.y, 1, 4);
      if (this.t <= 0) {
        this.state = 'back';
        this.done();
      }
    } else {
      const dx = tg.x - this.x;
      const dy = tg.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 1.5) {
        if (this.state === 'go') {
          this.state = 'work';
          this.t = 3.2;
          this.dir = -1;
        } else this.dead = true;
      } else {
        const step = Math.min(d, 20 * dt);
        this.x += (dx / d) * step;
        this.y += (dy / d) * step;
        this.dir = dx > 0 ? 1 : -1;
        this.phase += step / 3;
      }
    }
    this.depth = this.y;
  }

  get onRoad() {
    return inside(this.x, this.y, ROAD);
  }

  hit(x: number, y: number) {
    return Math.abs(x - this.x) < 7 && y > this.y - 30 && y < this.y + 3;
  }

  tap(h: Host) {
    if (h.sound) snd.thud();
    const at = { x: this.x, y: this.y - 32 };
    h.say('Yama ekibi', pick(['Yamıyoruz abi, üç aydır sıradaydınız!', 'Asfalt sıcak, kürek hazır. Arabalar beklesin!', 'Bu çukuru yamamak bizim, açmak İSKİ’nin işi.']), at);
    h.secret('cukur', at);
  }

  draw(g: CanvasRenderingContext2D, h: Host) {
    drawFigure(g, h, this.x, this.y, this.look, { phase: this.phase, walking: this.state !== 'work', dir: this.dir, carry: 'shovel', vest: true, helmet: true, bend: this.state === 'work' ? 0.6 + Math.sin(h.t * 5) * 0.2 : 0 });
  }
}
