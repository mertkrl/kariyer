import * as snd from '../sounds';
import { chance, clamp, dist, glow, INK, lerp, noise, pick, rand, type Host, type Pt, type Thing } from './core';
import { drawFigure, randomLook, type Look } from './figure';

/*
 * Cephelerdeki hayat: plazanın camında cam silme sepeti (iki ipe asılı sarkaç), inşaatta
 * kaynakçı ve çekiççi, döviz bürosunun 2002 kurlu LED şeridi, gece televizyon ışığı ("GOL!") ve
 * plazada fazla mesai yapan biri.
 */

/** Plazanın camında cam silme sepeti: iki ipe asılı platform, sarkaç gibi salınır. */
export class Gondola implements Thing {
  depth = 170;
  private F = { x: 552, y: 162 };
  private e = { x: 0.873, y: -0.488 };
  D = 120;
  private dir = 1;
  private pause = 0;
  th = 0;
  thV = 0;
  private look: Look = { ...randomLook('adult'), style: 'short', top: '#2f5a8a', prop: 'none', skirt: false, h: 25 };

  private attach(u: number): Pt {
    return { x: this.F.x + this.e.x * u, y: this.F.y + this.e.y * u };
  }

  /** Gece cam silinmez: sepet çatıya çekilmiş, görünmez. */
  private off(h: Host) {
    return h.dark > 0.6;
  }

  update(h: Host, dt: number) {
    if (this.off(h)) {
      this.D = 60;
      this.dir = 1;
      return;
    }
    // sıra sıra iner: her katta durup siler; dibe varınca yukarı çıkar
    if (this.pause > 0) this.pause -= dt;
    else {
      this.D += this.dir * (this.dir > 0 ? 9 : 26) * dt;
      if (this.dir > 0 && Math.floor(this.D / 38) !== Math.floor((this.D - 9 * dt) / 38)) this.pause = rand(2.5, 4.5);
      if (this.D > 270) this.dir = -1;
      if (this.D < 60) {
        this.dir = 1;
        this.pause = 3;
      }
    }
    const L = this.D;
    this.thV += (-(400 / L) * Math.sin(this.th) - 0.35 * this.thV + (h.wind * 14) / L) * dt;
    this.th = clamp(this.th + this.thV * dt, -0.35, 0.35);
  }

  private platform() {
    const a1 = this.attach(30);
    const a2 = this.attach(58);
    const mx = (a1.x + a2.x) / 2;
    const my = (a1.y + a2.y) / 2;
    const rot = (p: Pt): Pt => {
      const dx = p.x - mx;
      const dy = p.y - my;
      const c = Math.cos(this.th);
      const s = Math.sin(this.th);
      return { x: mx + dx * c - dy * s, y: my + dx * s + dy * c };
    };
    return { a1, a2, p1: rot({ x: a1.x, y: a1.y + this.D }), p2: rot({ x: a2.x, y: a2.y + this.D }) };
  }

  private night = false;

  hit(x: number, y: number) {
    if (this.night) return false;
    const { p1, p2 } = this.platform();
    return x > Math.min(p1.x, p2.x) - 6 && x < Math.max(p1.x, p2.x) + 8 && y > Math.min(p1.y, p2.y) - 22 && y < Math.max(p1.y, p2.y) + 8;
  }

  tap(h: Host) {
    this.thV += 1.4;
    if (h.sound) snd.creak();
    const { p1 } = this.platform();
    const at = { x: p1.x + 8, y: p1.y - 26 };
    h.say('Camcı', pick(['Abi sallamayın, on dördüncü kattayız!', 'Cam temiz, patron hâlâ dışarıyı görmüyor.', 'Bu katı sildim, aşağıdakini rüzgâr silsin.']), at);
    h.secret('camci', at);
  }

  draw(g: CanvasRenderingContext2D, h: Host) {
    this.night = this.off(h);
    if (this.night) return;
    const n = h.night;
    const ink = n.c(INK);
    const { a1, a2, p1, p2 } = this.platform();
    const out = { x: 4.4, y: 2.8 };
    g.strokeStyle = n.c('#3a3632');
    g.lineWidth = 0.6;
    g.beginPath();
    g.moveTo(a1.x, a1.y);
    g.lineTo(p1.x, p1.y - 9);
    g.moveTo(a2.x, a2.y);
    g.lineTo(p2.x, p2.y - 9);
    g.stroke();
    // işçi: platformun ortasında, silecek camda gidip gelir
    const mid = { x: (p1.x + p2.x) / 2 + out.x * 0.5, y: (p1.y + p2.y) / 2 + out.y * 0.5 };
    drawFigure(g, h, mid.x, mid.y, this.look, { phase: 0, walking: false, dir: -1, wave: this.pause > 0 ? 1 : 0.4, helmet: true });
    if (this.pause > 0) {
      const sx = mid.x - 4 + Math.sin(h.t * 5) * 4;
      const sy = mid.y - 22 + Math.cos(h.t * 5) * 1.5;
      g.strokeStyle = n.c('#2b2420');
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(sx - 2.5, sy - 1);
      g.lineTo(sx + 2.5, sy + 1);
      g.stroke();
    }
    // platform: taban, ön levha, korkuluk
    g.fillStyle = n.c('#9aa1a8');
    g.strokeStyle = ink;
    g.lineWidth = 0.6;
    g.beginPath();
    g.moveTo(p1.x, p1.y);
    g.lineTo(p2.x, p2.y);
    g.lineTo(p2.x + out.x, p2.y + out.y);
    g.lineTo(p1.x + out.x, p1.y + out.y);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = n.c('#f0c419');
    g.beginPath();
    g.moveTo(p1.x + out.x, p1.y + out.y);
    g.lineTo(p2.x + out.x, p2.y + out.y);
    g.lineTo(p2.x + out.x, p2.y + out.y + 3.4);
    g.lineTo(p1.x + out.x, p1.y + out.y + 3.4);
    g.closePath();
    g.fill();
    g.stroke();
    g.strokeStyle = n.c('#6b7178');
    g.lineWidth = 0.7;
    g.beginPath();
    g.moveTo(p1.x + out.x, p1.y + out.y - 8);
    g.lineTo(p2.x + out.x, p2.y + out.y - 8);
    for (const t of [0, 0.5, 1]) {
      const x = lerp(p1.x, p2.x, t) + out.x;
      const y = lerp(p1.y, p2.y, t) + out.y;
      g.moveTo(x, y);
      g.lineTo(x, y - 8);
    }
    g.stroke();
  }
}

/** İnşaatta kaynakçı (kıvılcım yağmuru) ve çekiççi. */
export class Welder implements Thing {
  depth = 452;
  readonly at = { x: 885, y: 452 };
  private on = 0;
  private off = rand(1, 3);
  private hammer = rand(0, 3);
  private wLook: Look = { ...randomLook('adult'), style: 'short', top: '#4a5560', prop: 'none', skirt: false, h: 24 };
  private hLook: Look = { ...randomLook('adult'), style: 'short', top: '#8a6a3a', prop: 'none', skirt: false, h: 24 };

  update(h: Host, dt: number) {
    if (this.on > 0) {
      this.on -= dt;
      const rate = h.low ? 14 : 34;
      const nsp = Math.floor(rate * dt + Math.random());
      h.fx.sparks(this.at.x - 6, this.at.y - 5, this.at.y + 1, nsp);
      if (h.sound && chance(dt * 9)) snd.crackle();
      if (this.on <= 0) this.off = rand(2.5, 6);
    } else {
      this.off -= dt;
      if (this.off <= 0) this.on = rand(1.6, 3.6);
    }
    this.hammer -= dt;
    if (this.hammer < 0) this.hammer = rand(2, 5);
    if (this.hammer < 1.2 && Math.floor(this.hammer * 3) !== Math.floor((this.hammer + dt) * 3) && h.sound) snd.hammer();
  }

  hit(x: number, y: number) {
    return dist(x, y, this.at.x - 2, this.at.y - 10) < 16;
  }

  tap(h: Host) {
    this.on = Math.max(this.on, 2);
    h.fx.sparks(this.at.x - 6, this.at.y - 5, this.at.y + 1, h.low ? 30 : 70, 1.5);
    if (h.sound) snd.crackle();
    const at = { x: this.at.x, y: this.at.y - 30 };
    h.say('Kaynakçı', pick(['Bakma, gözün kamaşır! Mesai dışı kaynak, çift ücret.', 'Bu kolonu kaynatıyorum, bina deprem yönetmeliğine girecek. Belki.']), at);
    h.secret('kaynak', at);
  }

  draw(g: CanvasRenderingContext2D, h: Host) {
    const { x, y } = this.at;
    drawFigure(g, h, x, y, this.wLook, { phase: 0, walking: false, dir: -1, bend: 0.7, helmet: true });
    // kaynak maskesi
    g.fillStyle = h.night.c('#1b1d20');
    g.fillRect(x - 6.4, y - 21, 2.6, 4);
    if (this.on > 0) {
      const f = 0.6 + Math.random() * 0.4;
      glow(g, 'rgb(190,220,255)', x - 6, y - 5, 10 + Math.random() * 6, 0.75 * f);
      g.fillStyle = '#ffffff';
      g.fillRect(x - 7, y - 6, 2, 2);
    }
    // çekiççi: bir kat yukarıda
    const hx = 862;
    const hy = 414;
    const swing = this.hammer < 1.2 ? Math.abs(Math.sin(this.hammer * Math.PI * 3)) : 0;
    drawFigure(g, h, hx, hy, this.hLook, { phase: 0, walking: false, dir: 1, bend: 0.4, helmet: true, wave: swing });
  }
}

/** Döviz bürosunun camında kayan LED şerit: kurlar 2002'den kalma. */
export class Ticker implements Thing {
  depth = 640;
  private text = 'USD 1.650.000 ▲  EUR 1.540.000 ▼  GBP 2.410.000 ▲  ALTIN 14.950.000 ▲  ';
  private w = 0;
  update() {}

  /** Şeridin sol yarısı (sağ yarısı döviz bürosunun durağının altında). */
  hit(x: number, y: number) {
    return x > 664 && x < 690 && y > 612 && y < 640;
  }

  tap(h: Host) {
    if (h.sound) snd.blip();
    const at = { x: 700, y: 606 };
    h.say('Dövizci', pick(['Kurlar 2002’den kalma. Dolar bir milyon altı yüz elli bin, kaçırma!', 'Altın on dört milyon. Al, yastık altına koy.']), at);
    h.secret('doviz', at);
  }

  draw(g: CanvasRenderingContext2D, h: Host) {
    g.save();
    g.transform(1, 0.255, 0, 1, 671, 620);
    g.fillStyle = '#121212';
    g.fillRect(0, 0, 44, 7);
    g.beginPath();
    g.rect(0.5, 0.5, 43, 6);
    g.clip();
    g.font = "700 5.6px 'JetBrains Mono', ui-monospace, monospace";
    if (!this.w) this.w = g.measureText(this.text).width;
    const off = (h.t * 12) % this.w;
    g.fillStyle = '#ffb02e';
    g.fillText(this.text + this.text, 44 - off - 44, 5.6);
    // LED nokta dokusu
    g.fillStyle = 'rgba(0,0,0,0.45)';
    for (let x = 0; x < 44; x += 1.1) g.fillRect(x, 0, 0.35, 7);
    g.fillRect(0, 2.3, 44, 0.3);
    g.fillRect(0, 4.6, 44, 0.3);
    g.restore();
    if (h.dark > 0.3) glow(g, 'rgb(255,170,50)', 696, 630, 18, 0.25 * h.dark);
  }
}

/** Pencere: parlak bir dörtgen (bina cephesinin eğimiyle). */
function pane(g: CanvasRenderingContext2D, x: number, y: number, w: number, hgt: number, slope: number) {
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x + w, y + w * slope);
  g.lineTo(x + w, y + w * slope + hgt);
  g.lineTo(x, y + hgt);
  g.closePath();
}

const WINDOWS_L: [number, number, number, number, number][] = [
  [250, 522, 18, 27, 0.18],
  [186, 430, 16, 26, 0.18],
  [300, 455, 18, 27, 0.18],
  [396, 528, 18, 28, 0.2],
  [458, 470, 16, 27, -0.5],
];

/** Gece: bir pencerede televizyonun mavi titrek ışığı; dokununca bütün mahalle "GOL!" der. */
export class TV implements Thing {
  depth = 560;
  goal = 0;
  update(_h: Host, dt: number) {
    this.goal = Math.max(0, this.goal - dt);
  }

  hit(x: number, y: number) {
    return x > 246 && x < 272 && y > 518 && y < 556;
  }

  tap(h: Host) {
    if (h.dark < 0.5) {
      h.say('Pencereden', 'Maç akşam, şimdi dizi var.', { x: 260, y: 512 });
      return;
    }
    this.goal = 2.4;
    if (h.sound) snd.cheer();
    const at = { x: 262, y: 508 };
    h.say('Bütün mahalle', pick(['GOOOL! (Hangi takım? Herkesin kendi takımı.)', 'GOOOOL! …Ofsayt mı? Hakem kör!']), at);
    h.secret('mac', at);
  }

  draw(g: CanvasRenderingContext2D, h: Host) {
    if (h.dark < 0.45) return;
    const a = clamp((h.dark - 0.45) / 0.3, 0, 1);
    const f = 0.55 + noise(h.t * 7, 4) * 0.25 + (Math.random() < 0.05 ? 0.2 : 0);
    const [x, y, w, hh, sl] = WINDOWS_L[0];
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = `rgba(120,170,255,${0.42 * a * f})`;
    pane(g, x, y, w, hh, sl);
    g.fill();
    glow(g, 'rgb(110,160,255)', x + w / 2, y + hh / 2, 22, 0.35 * a * f);
    if (this.goal > 0) {
      const on = Math.floor(this.goal * 6) % 2 === 0;
      for (const [wx, wy, ww, wh, ws] of WINDOWS_L) {
        g.fillStyle = on ? 'rgba(255,236,170,0.55)' : 'rgba(255,236,170,0.2)';
        pane(g, wx, wy, ww, wh, ws);
        g.fill();
      }
    }
    g.restore();
  }
}

/** Gece plazada fazla mesai yapan biri: masası ve başı; dokununca ışığı söner, geri yanar. */
export class Office implements Thing {
  depth = 340;
  off = 0;
  private F = { x: 552, y: 162 };
  update(_h: Host, dt: number) {
    this.off = Math.max(0, this.off - dt);
  }

  private corners() {
    const e = { x: 0.873, y: -0.488 };
    const P = (u: number, v: number) => ({ x: this.F.x + e.x * u, y: this.F.y + e.y * u + v });
    return [P(62, 198), P(76, 198), P(76, 216), P(62, 216)];
  }

  hit(x: number, y: number) {
    const c = this.corners();
    return x > c[0].x - 4 && x < c[1].x + 4 && y > c[1].y - 4 && y < c[3].y + 4;
  }

  tap(h: Host) {
    const at = { x: this.corners()[0].x + 6, y: this.corners()[0].y - 12 };
    if (h.dark < 0.5) {
      h.say('Plazadan', 'Gündüz burası toplantı odası. Toplantıdayız.', at);
      return;
    }
    this.off = 2.2;
    if (h.sound) snd.lampOn();
    h.say('Plazadan', pick(['Kapatma! Daha sunum bitmedi!', 'Biri hâlâ çalışıyor. Işığı kapatma, kızar.']), at);
    h.secret('plaza', at);
  }

  draw(g: CanvasRenderingContext2D, h: Host) {
    if (h.dark < 0.45 || this.off > 0) return;
    const a = clamp((h.dark - 0.45) / 0.3, 0, 1);
    const c = this.corners();
    g.save();
    g.globalAlpha = a;
    g.fillStyle = 'rgba(255,224,150,0.85)';
    g.beginPath();
    g.moveTo(c[0].x, c[0].y);
    for (const p of c) g.lineTo(p.x, p.y);
    g.closePath();
    g.fill();
    // masada biri: baş ve ekran
    g.fillStyle = '#2a2420';
    g.beginPath();
    g.arc(c[0].x + 5, c[3].y - 8, 1.8, 0, Math.PI * 2);
    g.fill();
    g.fillRect(c[0].x + 3.6, c[3].y - 6, 3, 4);
    g.fillStyle = 'rgba(160,210,255,0.9)';
    g.fillRect(c[0].x + 8.5, c[3].y - 9, 3, 2.2);
    g.restore();
    glow(g, 'rgb(255,214,140)', (c[0].x + c[2].x) / 2, (c[0].y + c[2].y) / 2, 14, 0.25 * a);
  }
}
