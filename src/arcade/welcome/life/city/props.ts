import * as snd from '../sounds';
import { chance, depthScale, dist, glow, INK, inside, pick, rand, type Host, type Pt, type Thing } from './core';
import { PLAZA, ROAD } from './play';

/*
 * Sabit noktalar ve küçük eşyalar: bacalar (duman, halka), anten, ikaz lambaları, vinç, kepçe,
 * "Riskli Yapıdır" tabelası, durak ekranı, çukur ve rüzgârda takla atan gazete.
 */

const CHIMNEYS: Pt[] = [
  { x: 390, y: 261 },
  { x: 224, y: 303 },
  { x: 309, y: 302 },
  { x: 358, y: 340 },
  { x: 432, y: 351 },
];

/** Bacalar duman verir; dokununca bir duman halkası çıkar. */
export class Chimneys implements Thing {
  depth = 0;
  private acc = CHIMNEYS.map(() => rand(0, 1));
  private low: boolean;
  constructor(low: boolean) {
    this.low = low;
  }

  update(h: Host, dt: number) {
    const count = this.low ? 2 : CHIMNEYS.length;
    for (let i = 0; i < count; i++) {
      this.acc[i] -= dt;
      if (this.acc[i] > 0) continue;
      this.acc[i] = (this.low ? 1.1 : 0.55) * (h.dark > 0.6 ? 1.4 : 1) * rand(0.7, 1.3);
      const c = CHIMNEYS[i];
      h.fx.add({ k: 'smoke', x: c.x + rand(-1.5, 1.5), y: c.y - 2, vx: h.wind * 6, vy: rand(-12, -6), r: rand(2, 3), grow: rand(2, 3.2), max: rand(4, 6.5) });
    }
  }

  private near(x: number, y: number) {
    return CHIMNEYS.find((c) => Math.abs(x - c.x) < 9 && y < c.y + 8 && y > c.y - 26);
  }

  hit(x: number, y: number) {
    return !!this.near(x, y);
  }

  tapAt(h: Host, x: number, y: number) {
    const c = this.near(x, y) ?? CHIMNEYS[0];
    h.fx.add({ k: 'ring', x: c.x, y: c.y - 4, vx: 0, vy: -16, r: 3, grow: 9, max: 5 });
    if (h.sound) snd.puff();
    const at = { x: c.x, y: c.y - 20 };
    h.say('Soba borusu', pick(['Kombi değil soba, abi. Halka halka çıkar.', 'Bu halkayı ben yaptım; sıra sende.']), at);
    h.secret('duman', at);
  }

  draw() {}
}

/** Sabit noktalar: anten, plazanın ikaz lambası, vinç, kepçe, tabela, durak ekranı. */
export class Spots implements Thing {
  depth = 0;
  private exhaust = 0;
  update(h: Host, dt: number) {
    // kepçenin egzozu: rölantide arada bir is
    this.exhaust -= dt;
    if (this.exhaust <= 0) {
      this.exhaust = rand(0.5, 1.4);
      h.fx.add({ k: 'exhaust', x: 974, y: 514, vx: h.wind * 4, vy: -12, r: 1.6, grow: 4, max: 1.4 });
    }
  }

  draw(g: CanvasRenderingContext2D, h: Host) {
    // ikaz lambaları: plaza anteni ve vinç tepesi, gece daha parlak
    const on = Math.floor(h.t / 0.9) % 2 === 0;
    for (const [x, y] of [
      [536, 40],
      [893, 18],
    ]) {
      g.fillStyle = on ? '#ff3b2e' : '#7a2a24';
      g.beginPath();
      g.arc(x, y, 1.8, 0, Math.PI * 2);
      g.fill();
      if (on) glow(g, 'rgb(255,60,40)', x, y, 8 + h.dark * 10, 0.5 + h.dark * 0.4);
    }
    // durak ekranı gece yeşil yanar
    if (h.dark > 0.4) glow(g, 'rgb(80,230,120)', 499, 556, 9, 0.35 * h.dark);
  }

  which(x: number, y: number): string | null {
    if (dist(x, y, 240, 272) < 15) return 'anten';
    if (dist(x, y, 537, 40) < 16) return 'wifi';
    if ((x > 860 && x < 912 && y > 30 && y < 82) || (x > 690 && x < 1010 && y > 36 && y < 70)) return 'vinc';
    if (dist(x, y, 952, 545) < 32) return 'kepce';
    if (x > 782 && x < 848 && y > 462 && y < 572) return 'tabela';
    return null;
  }

  hit(x: number, y: number) {
    return this.which(x, y) !== null;
  }

  tapAt(h: Host, x: number, y: number) {
    const id = this.which(x, y);
    if (!id) return;
    switch (id) {
      case 'anten':
        for (let i = 0; i < 3; i++) h.fx.add({ k: 'signal', x: 240, y: 266, r: 2 + i * 4, grow: 14, max: 1.2 });
        if (h.sound) snd.blip();
        h.say('Çanak anten', 'Maç çekmiyor. Amca balkona çıktı, anteni çeviriyor.', { x: 240, y: 250 });
        h.secret('anten', { x: 240, y: 250 });
        break;
      case 'wifi':
        for (let i = 0; i < 3; i++) h.fx.add({ k: 'signal', x: 537, y: 38, r: 2 + i * 4, grow: 16, max: 1.2 });
        if (h.sound) snd.blip();
        h.say('Plaza anteni', 'Wi-Fi: KASM_Misafir · Şifre: mesaibitti', { x: 537, y: 60 });
        h.secret('wifi', { x: 537, y: 60 });
        break;
      case 'vinc':
        if (h.sound) snd.creak();
        h.say('Vinççi', pick(['Biraz sağa… biraz daha… tamam, öyle kalsın.', 'Yukarıdan her şey görünüyor. Mesela sen.']), { x: 890, y: 84 });
        h.secret('vinc', { x: 890, y: 84 });
        break;
      case 'kepce':
        h.fx.dust(930, 566, 12, 12);
        for (let i = 0; i < 4; i++) h.fx.add({ k: 'exhaust', x: 974, y: 514, vx: rand(-4, 4), vy: -20, r: 2, grow: 6, max: 1.6 });
        if (h.sound) snd.rumble();
        h.say('Kepçe operatörü', pick(['Abi şu an çay molasındayım, sonra kazarız.', 'Kazdık, doldurduk, yine kazacağız. İhale böyle.']), { x: 950, y: 505 });
        h.secret('kepce', { x: 950, y: 505 });
        break;
      case 'tabela':
        h.fx.add({ k: 'chunk', x: 806 + rand(-6, 6), y: 560, vx: rand(-14, 6), vy: 10, r: 3.2, vr: rand(-6, 6), max: 4, floor: 650, color: '#cbbfa8' });
        h.fx.dust(806, 562, 4, 4);
        if (h.sound) window.setTimeout(snd.thud, 450);
        h.say('Riskli yapı', pick(['Tabelanın kendisi de riskli, dikkat et.', 'Sıva düştü. Müteahhit "kozmetik" diyor.']), { x: 815, y: 465 });
        h.secret('tabela', { x: 815, y: 465 });
        break;
    }
  }
}

/** Çukur: yama ekibi gelir, yamar; ilk geçen araba yamayı bozar. */
export class Pothole implements Thing {
  depth = 690;
  readonly at = { x: 520, y: 697 };
  state: 'open' | 'patching' | 'patched' | 'broken' = 'open';
  update() {}

  hit(x: number, y: number) {
    return Math.abs(x - this.at.x) < 17 && Math.abs(y - this.at.y) < 9;
  }

  draw(g: CanvasRenderingContext2D, h: Host) {
    if (this.state === 'open' || this.state === 'patching') {
      // birikintide ışık oynar
      if (h.rain > 0.1) glow(g, 'rgb(200,220,245)', this.at.x, this.at.y, 10, 0.12 * h.rain);
      return;
    }
    g.fillStyle = h.night.c('#38383b');
    g.strokeStyle = h.night.c('#1e1e20');
    g.lineWidth = 0.6;
    g.beginPath();
    g.ellipse(this.at.x, this.at.y, 14, 6, -0.12, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    if (this.state === 'broken') {
      g.strokeStyle = h.night.c('#16161a');
      g.lineWidth = 0.8;
      g.beginPath();
      g.moveTo(this.at.x - 9, this.at.y - 1);
      g.lineTo(this.at.x - 2, this.at.y + 1);
      g.lineTo(this.at.x + 3, this.at.y - 2);
      g.lineTo(this.at.x + 10, this.at.y + 1);
      g.moveTo(this.at.x - 2, this.at.y + 1);
      g.lineTo(this.at.x, this.at.y + 4);
      g.stroke();
    }
  }
}

/** Rüzgârda takla atan gazete: sağanakta havalanır, döner, yere düşer. */
export class Newspaper implements Thing {
  x = 720;
  y = 664;
  z = 0;
  vx = 0;
  vy = 0;
  vz = 0;
  spin = 0;
  flip = 0;
  depth = 664;
  private rest = rand(2, 6);

  update(h: Host, dt: number) {
    const w = h.wind;
    const strong = Math.abs(w) > 0.55 || h.rain > 0.4;
    this.rest -= dt;
    if (this.z <= 0 && this.rest <= 0 && strong) {
      this.vz = rand(30, 70);
      this.vx = -Math.abs(w) * rand(30, 60) - 10;
      this.vy = rand(4, 18);
      this.spin = rand(4, 9) * (chance(0.5) ? 1 : -1);
      this.rest = rand(0.6, 2.4);
    }
    this.vz -= 120 * dt;
    this.z = Math.max(0, this.z + this.vz * dt);
    const drag = this.z > 0 ? 0.8 : 4;
    this.vx *= Math.pow(Math.exp(-drag), dt);
    this.vy *= Math.pow(Math.exp(-drag), dt);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.z > 0) this.flip += this.spin * dt;
    else {
      this.vz = 0;
      this.flip = Math.round(this.flip / Math.PI) * Math.PI;
    }
    // meydancıktan çıkınca baştan
    if (this.x < 470 || this.y > 770 || (!inside(this.x, this.y, PLAZA) && !inside(this.x, this.y, ROAD))) {
      this.x = rand(700, 740);
      this.y = rand(660, 690);
      this.z = 0;
      this.vx = this.vy = 0;
      this.rest = rand(6, 14);
    }
    this.depth = this.y;
  }

  hit(x: number, y: number) {
    return dist(x, y, this.x, this.y - this.z - 1) < 10;
  }

  tap(h: Host) {
    this.vz = 90;
    this.vx = -40;
    this.spin = 8;
    this.rest = 1;
    if (h.sound) snd.rustle();
    const at = { x: this.x, y: this.y - 20 };
    h.say('Gazete', pick(['Manşet: “Mesai saatleri esnetildi.” Esnetilen sensin.', 'Manşet: “Simide zam yok!” Altında küçük harflerle: şimdilik.', 'Spor sayfası: “Transferde son dakika.” Her gün son dakika.']), at);
    h.secret('gazete', at);
  }

  draw(g: CanvasRenderingContext2D, h: Host) {
    const n = h.night;
    const k = depthScale(this.y);
    g.save();
    g.translate(this.x, this.y - this.z);
    const c = Math.cos(this.flip);
    g.rotate(Math.sin(this.flip * 0.5) * 0.5);
    g.scale(k, k * (this.z > 0 ? 0.6 + Math.abs(Math.sin(this.flip)) * 0.4 : 0.42));
    g.fillStyle = n.c(c > 0 ? '#ece6d6' : '#ddd5c2');
    g.strokeStyle = n.c(INK);
    g.lineWidth = 0.5;
    g.fillRect(-6, -4, 12 * Math.max(0.25, Math.abs(c)), 8);
    g.strokeRect(-6, -4, 12 * Math.max(0.25, Math.abs(c)), 8);
    g.fillStyle = n.c('#6b665e');
    for (let i = 0; i < 4; i++) g.fillRect(-5, -2.8 + i * 1.8, 8 * Math.max(0.2, Math.abs(c)), 0.6);
    g.restore();
  }
}
