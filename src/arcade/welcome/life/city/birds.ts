import * as snd from '../sounds';
import { chance, clamp, depthScale, dist, INK, lerp, pick, rand, shadow, type Host, type Pt, type Thing } from './core';

/*
 * Kuşlar. Güvercinler plazanın çatı kenarında, damlarda ve simitçinin önünde gagalanır; ara ara
 * (ya da ürkünce) sürü halinde havalanıp plazanın çevresinde döner (ayrılma, hedefe yönelme),
 * sonra yavaşlayıp kanat açarak yeni yerlerine konar. Martı tepeden süzülerek geçer; dokununca
 * simitçinin camekânına dalıp bir simit kapar.
 */

const PERCH: Pt[] = [
  { x: 468, y: 137 },
  { x: 485, y: 142 },
  { x: 503, y: 147 },
  { x: 521, y: 152 },
  { x: 578, y: 147 },
  { x: 597, y: 137 },
  { x: 380, y: 248 },
  { x: 398, y: 252 },
  { x: 596, y: 742 },
  { x: 606, y: 748 },
  { x: 586, y: 736 },
  { x: 616, y: 754 },
];

interface Pigeon {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spot: number;
  fly: boolean;
  flap: number;
  peck: number;
  dir: number;
  off: Pt;
  shade: string;
}

/** Güvercin sürüsü: tek bir şey olarak güncellenir, her kuş ayrı derinlikte çizilir. */
export class Flock {
  birds: Pigeon[] = [];
  state: 'rest' | 'circle' | 'return' = 'rest';
  private t = rand(40, 80);
  private orbit = 0;

  constructor(n: number) {
    const spots = [...PERCH.keys()].sort(() => Math.random() - 0.5);
    for (let i = 0; i < n; i++) {
      const s = PERCH[spots[i]];
      this.birds.push({ x: s.x, y: s.y, vx: 0, vy: 0, spot: spots[i], fly: false, flap: rand(0, 6), peck: rand(0, 3), dir: chance(0.5) ? 1 : -1, off: { x: rand(-40, 40), y: rand(-18, 18) }, shade: pick(['#8b94a2', '#9aa1ab', '#7c8390', '#a8a49c']) });
    }
  }

  /** Ürküt: hepsi havalanır. */
  scare(h: Host) {
    if (this.state === 'circle') return;
    this.state = 'circle';
    this.t = rand(7, 12);
    for (const b of this.birds) {
      b.fly = true;
      b.vx = rand(-40, 40);
      b.vy = rand(-90, -50);
      if (chance(0.5)) h.fx.add({ k: 'feather', x: b.x, y: b.y, vy: -10, max: rand(3, 5), floor: b.y > 600 ? b.y + 2 : b.y + 140 });
    }
    if (h.sound) snd.flap();
  }

  update(h: Host, dt: number) {
    this.t -= dt;
    if (this.state === 'rest' && this.t <= 0) this.scare(h);
    if (this.state === 'circle') {
      this.orbit += dt * 0.55;
      if (this.t <= 0) {
        this.state = 'return';
        const spots = [...PERCH.keys()].sort(() => Math.random() - 0.5);
        this.birds.forEach((b, i) => (b.spot = spots[i]));
      }
    }
    const cx = 560 + Math.cos(this.orbit) * 190;
    const cy = 230 + Math.sin(this.orbit) * 70;
    let landed = 0;
    for (const b of this.birds) {
      if (!b.fly) {
        landed++;
        // yerde: gagalar, ara ara seker, döner
        b.peck += dt;
        if (b.peck > 3 && chance(dt * 0.6)) {
          b.peck = 0;
          b.dir = chance(0.5) ? 1 : -1;
        }
        continue;
      }
      b.flap += dt * 18;
      let tx: number;
      let ty: number;
      let maxV = 95;
      if (this.state === 'circle') {
        tx = cx + b.off.x;
        ty = cy + b.off.y;
      } else {
        const s = PERCH[b.spot];
        tx = s.x;
        ty = s.y;
        const d = dist(b.x, b.y, tx, ty);
        maxV = clamp(d * 1.6, 12, 95);
        if (d < 2) {
          b.fly = false;
          b.x = tx;
          b.y = ty;
          b.vx = b.vy = 0;
          continue;
        }
      }
      // hedefe yönel, komşulardan ayrıl
      let ax = (tx - b.x) * 1.4 - b.vx * 0.9;
      let ay = (ty - b.y) * 1.4 - b.vy * 0.9;
      for (const o of this.birds) {
        if (o === b || !o.fly) continue;
        const dx = b.x - o.x;
        const dy = b.y - o.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 140 && d2 > 0.01) {
          ax += (dx / d2) * 900;
          ay += (dy / d2) * 900;
        }
      }
      b.vx += ax * dt;
      b.vy += ay * dt;
      const v = Math.hypot(b.vx, b.vy);
      if (v > maxV) {
        b.vx *= maxV / v;
        b.vy *= maxV / v;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (Math.abs(b.vx) > 3) b.dir = b.vx > 0 ? 1 : -1;
    }
    if (this.state === 'return' && landed === this.birds.length) {
      this.state = 'rest';
      this.t = rand(55, 110);
    }
  }

  things(): Thing[] {
    return this.birds.map((b) => ({
      depth: b.fly ? 50 : b.y,
      update: () => {},
      draw: (g: CanvasRenderingContext2D, h: Host) => drawPigeon(g, h, b, this.state === 'return'),
    }));
  }

  hit(x: number, y: number) {
    return this.birds.some((b) => dist(x, y, b.x, b.y - 2) < 9);
  }
}

function drawPigeon(g: CanvasRenderingContext2D, h: Host, b: Pigeon, landing: boolean) {
  const n = h.night;
  const k = b.y > 500 ? depthScale(b.y) : 0.85;
  const ink = n.c(INK);
  g.save();
  g.translate(b.x, b.y);
  g.scale(b.dir * k, k);
  if (!b.fly) {
    // oturan güvercin: gövde, kanat çizgileri, yanardöner boyun, gagalama
    const peck = b.peck < 0.5 ? Math.sin((b.peck / 0.5) * Math.PI) : 0;
    if (b.y > 500) shadow(g, 0, 0.4, 4.5, 1.2, 0.22);
    g.fillStyle = n.c(b.shade);
    g.strokeStyle = ink;
    g.lineWidth = 0.5;
    g.beginPath();
    g.ellipse(-0.5, -2.8, 4.4, 2.6, -0.15, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = n.c('#4a515c');
    g.beginPath();
    g.moveTo(-4.4, -3.4);
    g.lineTo(-7.2, -2.2);
    g.lineTo(-4, -1.6);
    g.closePath();
    g.fill();
    g.strokeStyle = n.c('#3c424c');
    g.lineWidth = 0.6;
    g.beginPath();
    g.moveTo(-2.6, -3.4);
    g.lineTo(0.4, -2.8);
    g.moveTo(-2.4, -2.2);
    g.lineTo(0.2, -1.8);
    g.stroke();
    const hx = 3.4 + peck * 1.2;
    const hy = -5.4 + peck * 3.4;
    g.fillStyle = n.c('#5b7d6a');
    g.beginPath();
    g.ellipse(2.4, -4 + peck * 1.5, 1.6, 2, 0.3, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = n.c('#7c8592');
    g.beginPath();
    g.arc(hx, hy, 1.5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = n.c('#d8c9a8');
    g.fillRect(hx + 1.3, hy - 0.1, 1.2, 0.6);
    g.fillStyle = '#e8902a';
    g.fillRect(hx + 0.3, hy - 0.6, 0.6, 0.6);
    g.strokeStyle = n.c('#c46a6a');
    g.lineWidth = 0.5;
    g.beginPath();
    g.moveTo(-0.5, -0.4);
    g.lineTo(-0.4, 0);
    g.moveTo(0.8, -0.4);
    g.lineTo(0.9, 0);
    g.stroke();
  } else {
    // uçan güvercin: kanat çırpar; konarken kanatları açık, gövdesi dik
    const a = landing ? -0.6 : Math.sin(b.flap) * 0.9;
    g.fillStyle = n.c(b.shade);
    g.strokeStyle = ink;
    g.lineWidth = 0.5;
    g.beginPath();
    g.ellipse(0, 0, 4.2, 1.8, landing ? -0.5 : 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    for (const side of [-1, 1]) {
      g.fillStyle = n.c(side > 0 ? '#a8aeb8' : '#7f8794');
      g.beginPath();
      g.moveTo(-1, -0.4);
      g.lineTo(-3.5, -0.4 - side * 0.3 - 7 * Math.cos(a) * (side > 0 ? 1 : 0.7));
      g.lineTo(1.6, -0.6 - Math.sin(a) * 2);
      g.closePath();
      g.fill();
      g.stroke();
    }
    g.fillStyle = n.c('#7c8592');
    g.beginPath();
    g.arc(4.2, -0.8, 1.3, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

/** Martı: maketin üstünden süzülerek geçer; dokunulursa simit kapmaya dalar. */
export class Gull implements Thing {
  x = -40;
  y = 90;
  vx = 60;
  depth = 40;
  dead = false;
  flap = 0;
  private dive: { t: number; from: Pt } | null = null;
  carrying = false;
  private base: number;
  private onSteal: () => void;

  constructor(onSteal: () => void) {
    this.onSteal = onSteal;
    const left = chance(0.5);
    this.x = left ? -30 : 1180;
    this.vx = (left ? 1 : -1) * rand(48, 70);
    this.base = rand(40, 170);
    this.y = this.base;
  }

  update(_h: Host, dt: number) {
    this.flap += dt;
    if (this.dive) {
      const d = this.dive;
      d.t += dt;
      const target = { x: 636, y: 676 };
      if (d.t < 1.2) {
        const k = d.t / 1.2;
        const e = k * k * (3 - 2 * k);
        this.x = lerp(d.from.x, target.x, e);
        this.y = lerp(d.from.y, target.y, e) - Math.sin(e * Math.PI) * 40;
      } else {
        if (!this.carrying) {
          this.carrying = true;
          this.onSteal();
        }
        const k = (d.t - 1.2) / 1.8;
        this.x = target.x + Math.sign(this.vx) * k * 380;
        this.y = target.y - k * 560;
        if (k >= 1) this.dead = true;
      }
      return;
    }
    this.x += this.vx * dt;
    this.y = this.base + Math.sin(this.flap * 0.9) * 8;
    if (this.x < -60 || this.x > 1220) this.dead = true;
  }

  hit(x: number, y: number) {
    return !this.dive && dist(x, y, this.x, this.y) < 16;
  }

  tap(h: Host) {
    if (this.dive) return;
    this.dive = { t: 0, from: { x: this.x, y: this.y } };
    if (h.sound) snd.gull();
  }

  draw(g: CanvasRenderingContext2D, h: Host) {
    const n = h.night;
    const ink = n.c(INK);
    const glide = this.dive ? (this.dive.t < 1.1 ? 1 : 0) : Math.sin(this.flap * 0.6) > 0.3 ? 1 : 0;
    const a = glide ? -0.25 : Math.sin(this.flap * 9) * 0.7;
    const dir = Math.sign(this.vx) || 1;
    g.save();
    g.translate(this.x, this.y);
    g.scale(dir, 1);
    for (const side of [-1, 1]) {
      g.save();
      g.scale(side, 1);
      g.rotate(a);
      g.fillStyle = n.c('#aab3bc');
      g.strokeStyle = ink;
      g.lineWidth = 0.5;
      g.beginPath();
      g.moveTo(1, -1);
      g.quadraticCurveTo(8, -6, 15, -3);
      g.lineTo(18, -1.4);
      g.quadraticCurveTo(10, 0.8, 1, 1.4);
      g.closePath();
      g.fill();
      g.stroke();
      g.fillStyle = n.c('#1d1f24');
      g.beginPath();
      g.moveTo(13.5, -3.3);
      g.lineTo(18, -1.4);
      g.lineTo(13, -0.2);
      g.closePath();
      g.fill();
      g.restore();
    }
    g.fillStyle = n.c('#f4f4f2');
    g.strokeStyle = ink;
    g.lineWidth = 0.5;
    g.beginPath();
    g.ellipse(0, 0, 6, 2.2, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.beginPath();
    g.arc(5.6, -1, 1.8, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#f2c331';
    g.fillRect(7, -1.1, 2.6, 0.9);
    if (this.carrying) {
      g.strokeStyle = n.c('#a65a24');
      g.lineWidth = 1.1;
      g.beginPath();
      g.ellipse(10.5, 0.4, 2.2, 1.5, 0, 0, Math.PI * 2);
      g.stroke();
    }
    g.restore();
  }
}
