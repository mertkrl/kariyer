import * as snd from '../sounds';
import { clamp, dist, INK, pick, rand, type Host, type Pt, type Thing } from './core';
import { drawFigure, randomLook, type Look } from './figure';
import { N } from './walkers';

/*
 * Esnaf: arabasının başında simitçi (buhar tüter, ara ara seslenir), tepsisiyle kahvehaneyle
 * bakkal arasında gidip gelen çaycı (tepsi sarkaç gibi sallanır, bir damla dökülmez) ve
 * balonları ipten kaldırma kuvvetiyle yükselen baloncu.
 */

/** Simitçi: arabasının başında, ara ara "Simiiit!" diye seslenir. */
export class Simitci implements Thing {
  x = 609;
  y = 720;
  depth = 720;
  look: Look = { ...randomLook('adult'), style: 'cap', top: '#efe9dc', bottom: '#3a3430', prop: 'none', skirt: false, h: 26 };
  call = 0;
  give = 0;
  private steam = 0;

  update(h: Host, dt: number) {
    this.call = Math.max(0, this.call - dt);
    this.give = Math.max(0, this.give - dt);
    this.steam -= dt;
    if (this.steam <= 0) {
      this.steam = h.low ? 0.6 : 0.28;
      h.fx.add({ k: 'steam', x: 636 + rand(-4, 4), y: 668, vy: -10, r: 1.6, grow: 3.2, max: rand(1.2, 1.8) });
    }
  }

  hit(x: number, y: number) {
    return (x > 600 && x < 654 && y > 664 && y < 730) || (Math.abs(x - this.x) < 6 && y > this.y - 30 && y < this.y + 3);
  }

  tap(h: Host) {
    this.give = 1.4;
    this.call = 1.2;
    if (h.sound) snd.bell();
    const at = { x: 632, y: 652 };
    h.say('Simitçi', pick(['Taze simiiit! Mesai dışına özel: iki simit, bir simit fiyatına.', 'Susamı bol, kendisi sıcak. Çayını da kap gel!', 'Simit var, çay yok. Çay ocağına sor.']), at);
    h.secret('simit', at);
  }

  draw(g: CanvasRenderingContext2D, h: Host) {
    drawFigure(g, h, this.x, this.y, this.look, { phase: 0, walking: false, dir: 1, carry: this.give > 0 ? 'simit' : 'none', wave: this.call > 0 ? Math.min(1, this.call * 2) : 0 });
  }
}

/** Çaycı: kahvehaneyle bakkal arasında tepsiyle gidip gelir; tepsi sallanır ama bir damla dökülmez. */
export class Cayci implements Thing {
  x = N.shop.x;
  y = N.shop.y;
  depth = 0;
  look: Look = { ...randomLook('adult'), style: 'short', top: '#f2eee4', bottom: '#2c2620', prop: 'none', skirt: false, h: 25.5 };
  private legs = ['shop', 'w2', 'door', 'w3', 'bakkal', 'w3', 'door', 'w2', 'shop'];
  private i = 1;
  private wait = 2;
  phase = 0;
  dir = 1;
  tilt = 0;
  tiltV = 0;
  private lastV = 0;

  update(_h: Host, dt: number) {
    // tepsi: sarkaç gibi; yürürken hızlanıp yavaşladıkça sallanır
    const tg = N[this.legs[this.i]];
    let v = 0;
    if (this.wait > 0) this.wait -= dt;
    else {
      const dx = tg.x - this.x;
      const dy = tg.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 1.5) {
        this.i = (this.i + 1) % this.legs.length;
        const at = this.legs[this.i - 1] ?? 'shop';
        if (at === 'bakkal' || at === 'shop') this.wait = at === 'shop' ? rand(4, 8) : 2.5;
      } else {
        const step = Math.min(d, 17 * dt);
        this.x += (dx / d) * step;
        this.y += (dy / d) * step;
        v = step / dt;
        if (Math.abs(dx) > 0.4) this.dir = dx > 0 ? 1 : -1;
        this.phase += step / 3.2;
      }
    }
    const accel = (v - this.lastV) / Math.max(dt, 0.001);
    this.lastV = v;
    this.tiltV += (-this.tilt * 60 - this.tiltV * 5 - accel * 0.0025 * this.dir + Math.sin(this.phase * 2) * 0.6 * (v > 0 ? 1 : 0)) * dt;
    this.tilt += this.tiltV * dt;
    this.depth = this.y;
  }

  hit(x: number, y: number) {
    return Math.abs(x - this.x) < 9 && y > this.y - 32 && y < this.y + 3;
  }

  tap(h: Host) {
    this.tiltV += 7;
    if (h.sound) snd.clinks();
    const at = { x: this.x, y: this.y - 34 };
    h.say('Çaycı', pick(['Ustayım abi, bir damla dökmem. Çay söyleyen?', 'Tepsi otuz yıllık, el yirmi yıllık. Dökülmez.', 'İki şekerli mi, açık mı?']), at);
    h.secret('cayci', at);
  }

  draw(g: CanvasRenderingContext2D, h: Host) {
    drawFigure(g, h, this.x, this.y, this.look, { phase: this.phase, walking: this.wait <= 0, dir: this.dir, carry: 'tray', trayTilt: clamp(this.tilt, -0.6, 0.6) });
  }
}

interface Balloon {
  x: number;
  y: number;
  px: number;
  py: number;
  len: number;
  color: string;
  free: boolean;
  life: number;
}

/** Baloncu: elinde ip ipe bağlı balonlar; balonlar kaldırma kuvvetiyle yükselir, rüzgârda salınır. */
export class Baloncu implements Thing {
  x = 296;
  y = 664;
  depth = 664;
  look: Look = { ...randomLook('adult'), style: 'cap', top: '#5a6e3a', prop: 'none', h: 26 };
  balloons: Balloon[] = [];
  private regrow = 0;

  constructor() {
    for (let i = 0; i < 6; i++) this.addBalloon();
  }

  get hand(): Pt {
    return { x: this.x + 4.5, y: this.y - 19 };
  }

  private addBalloon() {
    const hd = this.hand;
    const len = rand(18, 30);
    this.balloons.push({ x: hd.x + rand(-8, 8), y: hd.y - len, px: hd.x, py: hd.y - len, len, color: pick(['#e03a2e', '#f2c21b', '#2f7ad0', '#3aa35a', '#e86aa0', '#f07a1a', '#8a4ad0']), free: false, life: 0 });
  }

  update(h: Host, dt: number) {
    const hd = this.hand;
    const wind = h.wind * 26 + Math.sin(h.t * 1.3) * 4;
    for (const b of this.balloons) {
      // verlet: hız = konum farkı; kaldırma kuvveti yukarı, rüzgâr yana
      const vx = (b.x - b.px) * 0.96;
      const vy = (b.y - b.py) * 0.96;
      b.px = b.x;
      b.py = b.y;
      b.x += vx + wind * dt * dt * 6;
      b.y += vy - (b.free ? 70 : 90) * dt * dt;
      if (b.free) {
        b.life += dt;
        continue;
      }
      // ip: elden en fazla ip boyu kadar uzaklaşabilir
      const dx = b.x - hd.x;
      const dy = b.y - hd.y;
      const d = Math.hypot(dx, dy);
      if (d > b.len) {
        b.x = hd.x + (dx / d) * b.len;
        b.y = hd.y + (dy / d) * b.len;
      }
    }
    // balonlar birbirini iter
    for (let i = 0; i < this.balloons.length; i++)
      for (let j = i + 1; j < this.balloons.length; j++) {
        const a = this.balloons[i];
        const b = this.balloons[j];
        if (a.free || b.free) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.01;
        if (d < 8.5) {
          const p = (8.5 - d) * 0.5;
          a.x -= (dx / d) * p;
          a.y -= (dy / d) * p;
          b.x += (dx / d) * p;
          b.y += (dy / d) * p;
        }
      }
    this.balloons = this.balloons.filter((b) => !b.free || b.y > -40);
    this.regrow -= dt;
    if (this.regrow <= 0 && this.balloons.filter((b) => !b.free).length < 6) {
      this.addBalloon();
      this.regrow = 12;
    }
  }

  hit(x: number, y: number) {
    return this.balloons.some((b) => !b.free && dist(x, y, b.x, b.y) < 8) || (Math.abs(x - this.x) < 6 && y > this.y - 30 && y < this.y + 3);
  }

  tap(h: Host) {
    const held = this.balloons.filter((b) => !b.free);
    if (!held.length) return;
    const b = pick(held);
    b.free = true;
    b.py = b.y + 0.6;
    if (h.sound) snd.squeak();
    const at = { x: this.x, y: this.y - 52 };
    h.say('Baloncu', pick(['Bir tane kaçtı! Kaçan balonun parası yok, abi.', 'O balon plazaya gidiyor, terfi alacak.']), at);
    h.secret('balon', at);
    this.regrow = 6;
  }

  draw(g: CanvasRenderingContext2D, h: Host) {
    const n = h.night;
    const hd = this.hand;
    drawFigure(g, h, this.x, this.y, this.look, { phase: 0, walking: false, dir: 1, wave: 0 });
    for (const b of this.balloons) {
      const a = b.free ? clamp(1 - (b.life - 6) / 4, 0, 1) : 1;
      if (a <= 0) continue;
      g.globalAlpha = a;
      // ip: hafif sarkık
      g.strokeStyle = n.c('#e8e2d4');
      g.lineWidth = 0.5;
      g.beginPath();
      const ex = b.free ? b.x + Math.sin(h.t * 3 + b.len) * 3 : hd.x;
      const ey = b.free ? b.y + b.len * 0.8 : hd.y;
      g.moveTo(b.x, b.y + 4.8);
      g.quadraticCurveTo((b.x + ex) / 2 + 3, (b.y + ey) / 2, ex, ey);
      g.stroke();
      g.fillStyle = n.c(b.color);
      g.strokeStyle = n.c(INK);
      g.lineWidth = 0.5;
      g.beginPath();
      g.ellipse(b.x, b.y, 3.8, 4.7, Math.sin(h.t + b.len) * 0.08, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.beginPath();
      g.ellipse(b.x - 1.3, b.y - 1.8, 0.9, 1.5, -0.5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = n.c(b.color);
      g.beginPath();
      g.moveTo(b.x - 0.9, b.y + 5.2);
      g.lineTo(b.x + 0.9, b.y + 5.2);
      g.lineTo(b.x, b.y + 4.2);
      g.fill();
      g.globalAlpha = 1;
    }
  }
}
