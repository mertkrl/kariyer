import { blot, clamp, G, glow, noise, rand, type Night } from './core';

/*
 * Parçacıklar: bacadan çıkan duman (kaldırma kuvveti, rüzgâr, girdap), simitçinin buharı, egzoz,
 * toz, kaynak kıvılcımı (yerçekimi, sekme, soğudukça kızaran renk), yağmur damlası ve zemine
 * çarpınca sıçrayan minik damlalar, su birikintisinde halka, duman halkası, düşen sıva parçası,
 * kırıntı, tüy ve uyuyan köpeğin "z"leri. Hepsi tek dizide, sabit bir üst sınırla.
 */

export type Kind =
  | 'smoke'
  | 'steam'
  | 'exhaust'
  | 'dust'
  | 'spark'
  | 'rain'
  | 'splash'
  | 'crumb'
  | 'ring'
  | 'ripple'
  | 'chunk'
  | 'feather'
  | 'zzz'
  | 'signal';

export interface Particle {
  k: Kind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  r: number;
  grow: number;
  /** Zemin: kıvılcım ve kırıntı burada seker, yağmur burada sıçrar. */
  floor: number;
  seed: number;
  rot: number;
  vr: number;
  hits: number;
  color: string;
  /** Yağmur: su birikintisine düşer mi (halka bırakır). */
  wet?: boolean;
}

export interface FxEnv {
  t: number;
  wind: number;
}

const ARC_COLD = ['rgb(255,252,235)', 'rgb(255,226,140)', 'rgb(255,170,60)', 'rgb(220,90,30)'];

export class Fx {
  ps: Particle[] = [];
  private cap: number;
  constructor(cap: number) {
    this.cap = cap;
  }

  add(p: Partial<Particle> & Pick<Particle, 'k' | 'x' | 'y'>) {
    if (this.ps.length >= this.cap) return;
    this.ps.push({
      vx: 0,
      vy: 0,
      life: 0,
      max: 1,
      r: 1,
      grow: 0,
      floor: 9999,
      seed: Math.random() * 100,
      rot: 0,
      vr: 0,
      hits: 0,
      color: 'rgb(255,255,255)',
      ...p,
    });
  }

  /** Kıvılcım demeti: kaynak noktasından aşağı ve yana saçılır. */
  sparks(x: number, y: number, floor: number, n: number, power = 1) {
    for (let i = 0; i < n; i++) {
      const a = rand(-Math.PI * 0.95, -Math.PI * 0.05);
      const sp = rand(40, 150) * power;
      this.add({ k: 'spark', x, y, vx: Math.cos(a) * sp * rand(0.6, 1.4), vy: Math.sin(a) * sp * 0.6 + rand(-20, 30), max: rand(0.45, 1.1), floor });
    }
  }

  dust(x: number, y: number, n: number, spread = 10) {
    for (let i = 0; i < n; i++) this.add({ k: 'dust', x: x + rand(-spread, spread), y: y + rand(-3, 3), vx: rand(-14, 14), vy: rand(-12, -2), r: rand(2, 4), grow: rand(5, 10), max: rand(0.9, 1.6) });
  }

  update(dt: number, env: FxEnv) {
    const { wind, t } = env;
    const out: Particle[] = [];
    for (const p of this.ps) {
      p.life += dt;
      if (p.life >= p.max) {
        if (p.k === 'rain') this.land(p, out);
        continue;
      }
      switch (p.k) {
        case 'smoke':
        case 'steam':
        case 'exhaust': {
          const k = p.life / p.max;
          const drift = (wind * (p.k === 'steam' ? 10 : 16) + noise(t * 0.6 + p.seed, 3) * 7) * (0.4 + k);
          p.vx += (drift - p.vx) * 0.9 * dt;
          p.vy += (p.k === 'exhaust' ? -2 : -7) * (1 - k) * dt;
          p.vy *= 1 - 0.35 * dt;
          p.r += p.grow * dt;
          break;
        }
        case 'dust':
          p.vx *= 1 - 1.8 * dt;
          p.vy = p.vy * (1 - 1.2 * dt) - 3 * dt;
          p.r += p.grow * dt;
          break;
        case 'spark':
        case 'crumb':
        case 'chunk':
        case 'splash':
          p.vy += G * dt;
          if (p.k === 'spark') p.vx *= 1 - 0.6 * dt;
          if (p.y + p.vy * dt >= p.floor && p.vy > 0) {
            p.y = p.floor;
            p.hits++;
            const e = p.k === 'spark' ? 0.35 : p.k === 'chunk' ? 0.25 : 0.3;
            if (p.k === 'chunk' && p.hits === 1) this.dust(p.x, p.y, 5, 4);
            if (p.k === 'splash') {
              p.life = p.max;
              continue;
            }
            p.vy = Math.abs(p.vy) < 30 ? 0 : -p.vy * e;
            p.vx *= 0.55;
            p.vr *= 0.5;
          }
          p.rot += p.vr * dt;
          break;
        case 'rain':
          if (p.y >= p.floor) {
            this.land(p, out);
            continue;
          }
          break;
        case 'ring':
          p.vx += (wind * 10 - p.vx) * 0.5 * dt;
          p.vy *= 1 - 0.25 * dt;
          p.r += p.grow * dt * (1 - p.life / p.max);
          break;
        case 'ripple':
        case 'signal':
          p.r += p.grow * dt;
          break;
        case 'feather':
          p.vy += (24 - p.vy) * 2 * dt;
          p.vx = Math.sin(t * 3.2 + p.seed) * 18 + wind * 14;
          p.rot = Math.sin(t * 3.2 + p.seed) * 0.9;
          if (p.y >= p.floor) {
            p.y = p.floor;
            p.vx = 0;
            p.vy = 0;
          }
          break;
        case 'zzz':
          p.vx = Math.sin(t * 2 + p.seed) * 5;
          p.vy = -9;
          break;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      out.push(p);
    }
    this.ps = out;
  }

  /** Damla yere değdi: minik sıçrantılar, birikintiyse halka. */
  private land(p: Particle, out: Particle[]) {
    const n = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < n && out.length < this.cap; i++)
      out.push({ ...p, k: 'splash', x: p.x, y: p.floor - 0.5, vx: rand(-22, 22), vy: rand(-55, -25), life: 0, max: 0.4, r: 0.7, floor: p.floor + rand(-1, 1.5) });
    if (p.wet && out.length < this.cap) out.push({ ...p, k: 'ripple', x: p.x, y: p.floor, vx: 0, vy: 0, life: 0, max: 0.7, r: 0.6, grow: 9 });
  }

  /** Arka katman: duman, buhar ve duman halkası (binaların hemen üstünde). */
  drawBack(g: CanvasRenderingContext2D, night: Night) {
    const dark = night.dark;
    for (const p of this.ps) {
      const k = p.life / p.max;
      if (p.k === 'smoke') {
        const a = Math.sin(Math.PI * Math.min(1, k * 1.3)) * (0.42 - dark * 0.18);
        blot(g, dark > 0.5 ? 'rgb(150,158,182)' : 'rgb(172,168,162)', p.x, p.y, p.r, a);
        blot(g, dark > 0.5 ? 'rgb(190,196,216)' : 'rgb(236,233,226)', p.x - p.r * 0.2, p.y - p.r * 0.25, p.r * 0.6, a * 0.7);
      } else if (p.k === 'steam') {
        blot(g, 'rgb(255,255,255)', p.x, p.y, p.r, Math.sin(Math.PI * k) * 0.42);
      } else if (p.k === 'exhaust') {
        blot(g, 'rgb(96,96,104)', p.x, p.y, p.r, Math.sin(Math.PI * k) * 0.3);
      } else if (p.k === 'ring') {
        const a = Math.sin(Math.PI * Math.min(1, k * 1.15)) * 0.7;
        const wob = Math.sin(p.life * 3 + p.seed) * 0.08;
        g.save();
        g.translate(p.x, p.y);
        g.rotate(wob);
        g.strokeStyle = dark > 0.5 ? `rgba(170,176,200,${a})` : `rgba(240,238,232,${a})`;
        g.lineWidth = 2.6 + p.r * 0.18;
        g.beginPath();
        g.ellipse(0, 0, p.r, p.r * 0.42, 0, 0, Math.PI * 2);
        g.stroke();
        g.strokeStyle = dark > 0.5 ? `rgba(120,126,150,${a * 0.6})` : `rgba(200,196,190,${a * 0.6})`;
        g.lineWidth = 1;
        g.beginPath();
        g.ellipse(0, p.r * 0.08, p.r * 0.86, p.r * 0.32, 0, 0, Math.PI);
        g.stroke();
        g.restore();
      } else if (p.k === 'signal') {
        const a = (1 - k) * 0.85;
        g.strokeStyle = `rgba(255,255,255,${a})`;
        g.lineWidth = 1.4;
        g.beginPath();
        g.arc(p.x, p.y, p.r, -Math.PI * 0.82, -Math.PI * 0.18);
        g.stroke();
      }
    }
  }

  /** Ön katman: kıvılcım, yağmur, sıçrantı, toz, kırıntı, sıva, tüy, halka. */
  drawFront(g: CanvasRenderingContext2D, night: Night) {
    const dark = night.dark;
    g.lineCap = 'round';
    // yağmur: hepsi tek yolda
    g.strokeStyle = dark > 0.5 ? 'rgba(170,190,225,0.5)' : 'rgba(104,124,156,0.45)';
    g.lineWidth = 0.9;
    g.beginPath();
    for (const p of this.ps) {
      if (p.k !== 'rain') continue;
      g.moveTo(p.x - p.vx * 0.024, p.y - p.vy * 0.024);
      g.lineTo(p.x, p.y);
    }
    g.stroke();
    for (const p of this.ps) {
      const k = p.life / p.max;
      switch (p.k) {
        case 'spark': {
          const c = ARC_COLD[clamp(Math.floor(k * ARC_COLD.length), 0, ARC_COLD.length - 1)];
          const op = g.globalCompositeOperation;
          g.globalCompositeOperation = 'lighter';
          g.strokeStyle = c;
          g.globalAlpha = 1 - k * 0.7;
          g.lineWidth = 1.2;
          g.beginPath();
          g.moveTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
          g.lineTo(p.x, p.y);
          g.stroke();
          g.globalAlpha = 1;
          g.globalCompositeOperation = op;
          if (dark > 0.3) glow(g, 'rgb(255,180,90)', p.x, p.y, 4, (1 - k) * 0.35 * dark);
          break;
        }
        case 'splash':
          g.fillStyle = `rgba(215,228,245,${0.8 * (1 - k)})`;
          g.fillRect(p.x - 0.6, p.y - 0.6, 1.2, 1.2);
          break;
        case 'ripple':
          g.strokeStyle = `rgba(220,232,246,${0.6 * (1 - k)})`;
          g.lineWidth = 0.8;
          g.beginPath();
          g.ellipse(p.x, p.y, p.r, p.r * 0.38, 0, 0, Math.PI * 2);
          g.stroke();
          break;
        case 'dust':
          blot(g, dark > 0.5 ? 'rgb(120,112,100)' : 'rgb(198,174,134)', p.x, p.y, p.r, Math.sin(Math.PI * k) * 0.5);
          break;
        case 'crumb':
          g.fillStyle = p.color;
          g.globalAlpha = k > 0.75 ? (1 - k) * 4 : 1;
          g.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
          g.globalAlpha = 1;
          break;
        case 'chunk':
          g.save();
          g.translate(p.x, p.y);
          g.rotate(p.rot);
          g.globalAlpha = k > 0.8 ? (1 - k) * 5 : 1;
          g.fillStyle = night.c(p.color);
          g.strokeStyle = night.c('#2a2420');
          g.lineWidth = 0.8;
          g.beginPath();
          g.moveTo(-p.r, -p.r * 0.6);
          g.lineTo(p.r * 0.8, -p.r);
          g.lineTo(p.r, p.r * 0.5);
          g.lineTo(-p.r * 0.4, p.r * 0.8);
          g.closePath();
          g.fill();
          g.stroke();
          g.restore();
          break;
        case 'feather':
          g.save();
          g.translate(p.x, p.y);
          g.rotate(p.rot);
          g.globalAlpha = k > 0.8 ? (1 - k) * 5 : 0.95;
          g.fillStyle = night.c('#e9ebee');
          g.beginPath();
          g.ellipse(0, 0, 2.4, 0.9, 0, 0, Math.PI * 2);
          g.fill();
          g.strokeStyle = night.c('#9aa0a8');
          g.lineWidth = 0.4;
          g.beginPath();
          g.moveTo(-2.4, 0);
          g.lineTo(2.4, 0);
          g.stroke();
          g.restore();
          break;
        case 'zzz':
          g.fillStyle = `rgba(250,246,236,${Math.sin(Math.PI * k) * 0.9})`;
          g.font = `700 ${(5 + k * 4).toFixed(1)}px 'Manrope', Arial, sans-serif`;
          g.fillText('z', p.x, p.y);
          break;
      }
    }
  }
}
