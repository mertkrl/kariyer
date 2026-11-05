import * as snd from '../sounds';
import { chance, clamp, depthScale, glow, INK, lerp, pick, rand, shadow, type Host, type Pt, type Thing } from './core';

/*
 * Mahallenin kedisi ve köpeği. Tekir oturur, kuyruğunu sallar, yalanır, dolaşır, dokununca
 * kasaların üstüne sıçrar. Karabaş kıvrılıp uyur, nefes alıp verir; dokununca kalkar, kuyruk
 * sallar, havlar. Gece çatıda kara kedi, gözleri parlar.
 */

/** Tekir: oturur, kuyruk sallar, yalanır, dolaşır; dokununca sıçrar. */
export class Cat implements Thing {
  x = 232;
  y = 630;
  depth = 630;
  dir = 1;
  state: 'sit' | 'walk' | 'groom' | 'jump' = 'sit';
  private t = rand(4, 9);
  private tx = 232;
  private ty = 630;
  private jump: { x0: number; y0: number; x1: number; y1: number; t: number } | null = null;
  phase = 0;
  blink = 0;
  private spots: Pt[] = [
    { x: 232, y: 630 },
    { x: 338, y: 657 },
    { x: 182, y: 620 },
    { x: 420, y: 672 },
  ];
  /** Kasaların üstü: sıçradığı yer. */
  private high: Pt = { x: 458, y: 604 };

  update(_h: Host, dt: number) {
    this.t -= dt;
    this.blink = Math.max(0, this.blink - dt);
    if (chance(dt * 0.25)) this.blink = 0.18;
    if (this.state === 'jump' && this.jump) {
      const j = this.jump;
      j.t += dt / 0.65;
      const k = Math.min(1, j.t);
      this.x = lerp(j.x0, j.x1, k);
      this.y = lerp(j.y0, j.y1, k);
      if (k >= 1) {
        this.state = 'sit';
        this.jump = null;
        this.t = rand(6, 10);
      }
    } else if (this.state === 'walk') {
      const dx = this.tx - this.x;
      const dy = this.ty - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 1) {
        this.state = chance(0.4) ? 'groom' : 'sit';
        this.t = rand(5, 12);
      } else {
        const step = Math.min(d, 13 * dt);
        this.x += (dx / d) * step;
        this.y += (dy / d) * step;
        this.dir = dx > 0 ? 1 : -1;
        this.phase += step / 2;
      }
    } else if (this.t <= 0) {
      if (this.y < 620 && this.x > 440) {
        // kasaların üstünden in
        this.leap(this.spots[3]);
      } else {
        const s = pick(this.spots);
        this.tx = s.x;
        this.ty = s.y;
        this.state = 'walk';
      }
    }
    this.depth = this.state === 'jump' ? Math.max(this.y, 640) : this.y;
  }

  private leap(to: Pt) {
    this.jump = { x0: this.x, y0: this.y, x1: to.x, y1: to.y, t: 0 };
    this.state = 'jump';
    this.dir = to.x > this.x ? 1 : -1;
  }

  hit(x: number, y: number) {
    return Math.abs(x - this.x) < 11 && y > this.y - 16 && y < this.y + 3;
  }

  tap(h: Host) {
    if (h.sound) snd.meow();
    const at = { x: this.x, y: this.y - 20 };
    h.say('Tekir', pick(['Miyav. (Mahallenin kedisi seni onayladı.)', 'Mrrr… (Bakkalın kedisiyim, bakkal benim.)', 'Miyav! (Simit kırıntısı var mı?)']), at);
    h.secret('kedi', at);
    if (this.state !== 'jump') this.leap(this.y > 620 ? this.high : this.spots[3]);
  }

  draw(g: CanvasRenderingContext2D, h: Host) {
    const n = h.night;
    const ink = n.c(INK);
    let lift = 0;
    if (this.state === 'jump' && this.jump) lift = Math.sin(Math.min(1, this.jump.t) * Math.PI) * 26;
    const k = depthScale(this.y);
    shadow(g, this.x, this.y, 6 * k, 1.6 * k, 0.22 * (1 - lift / 40));
    g.save();
    g.translate(this.x, this.y - lift);
    g.scale(this.dir * k, k);
    const fur = n.c('#8d8a83');
    const stripe = n.c('#5c5852');
    g.strokeStyle = ink;
    g.lineWidth = 0.6;
    // kuyruk: S kıvrımlı, salınır
    const sw = Math.sin(h.t * (this.state === 'walk' ? 4 : 1.7)) * 3;
    g.strokeStyle = fur;
    g.lineWidth = 1.8;
    g.lineCap = 'round';
    g.beginPath();
    if (this.state === 'sit' || this.state === 'groom') {
      g.moveTo(-4, -1);
      g.quadraticCurveTo(-9, -1 + sw * 0.3, -8 + sw, -6);
    } else {
      g.moveTo(-6, -6);
      g.quadraticCurveTo(-11, -9, -12 + sw, -12);
    }
    g.stroke();
    g.fillStyle = fur;
    g.strokeStyle = ink;
    g.lineWidth = 0.6;
    if (this.state === 'sit' || this.state === 'groom') {
      // oturan kedi: arka kalça, dik göğüs
      g.beginPath();
      g.ellipse(-1.5, -3.4, 4.6, 3.4, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.beginPath();
      g.ellipse(2.2, -6.4, 2.6, 4.4, 0.2, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillStyle = stripe;
      for (const [x, y] of [
        [-3, -5.2],
        [-1, -5.8],
        [1, -5.6],
      ])
        g.fillRect(x, y, 0.9, 2.2);
    } else {
      // yürüyen ya da sıçrayan kedi: uzun gövde, dört bacak
      const st = this.state === 'jump' ? 1 : 0;
      for (const [lx, ph] of [
        [-4, 0],
        [-2.5, Math.PI],
        [3, Math.PI],
        [4.5, 0],
      ]) {
        const a = st ? (lx < 0 ? -0.8 : 0.8) : Math.sin(this.phase + ph) * 0.5;
        g.strokeStyle = fur;
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(lx, -4);
        g.lineTo(lx + Math.sin(a) * 3, -4 + Math.cos(a) * 4);
        g.stroke();
      }
      g.fillStyle = fur;
      g.strokeStyle = ink;
      g.lineWidth = 0.6;
      g.beginPath();
      g.ellipse(0, -5.6, 6.4, 2.8, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillStyle = stripe;
      for (const x of [-3, -1, 1, 3]) g.fillRect(x, -8, 0.9, 2.4);
    }
    // baş, kulaklar, göz
    const hx = this.state === 'sit' || this.state === 'groom' ? 3.2 : 6.6;
    const hy = this.state === 'sit' || this.state === 'groom' ? -11.2 + (this.state === 'groom' ? Math.sin(h.t * 6) * 0.8 : 0) : -7.6;
    g.fillStyle = fur;
    g.strokeStyle = ink;
    g.beginPath();
    g.arc(hx, hy, 2.7, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    for (const ex of [-1.6, 1.2]) {
      g.beginPath();
      g.moveTo(hx + ex - 0.8, hy - 1.8);
      g.lineTo(hx + ex + 0.1, hy - 4.6);
      g.lineTo(hx + ex + 1.2, hy - 1.6);
      g.closePath();
      g.fill();
      g.stroke();
    }
    g.fillStyle = this.blink > 0 ? fur : n.c('#e9d36a');
    g.fillRect(hx + 0.9, hy - 0.6, 1, this.blink > 0 ? 0.3 : 1);
    if (this.state === 'groom') {
      // pati yalama
      g.fillStyle = fur;
      g.beginPath();
      g.ellipse(hx + 1.8, hy + 2.4 + Math.sin(h.t * 6) * 0.6, 1.2, 1.6, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }
}

/** Karabaş: kıvrılıp uyur; dokununca kalkar, kuyruk sallar, havlar, sonra yine yatar. */
export class Dog implements Thing {
  x = 706;
  y = 702;
  depth = 702;
  state: 'sleep' | 'wake' | 'stand' | 'lie' = 'sleep';
  private t = 0;
  private z = 0;

  update(h: Host, dt: number) {
    this.t += dt;
    if (this.state === 'sleep') {
      this.z -= dt;
      if (this.z <= 0) {
        this.z = rand(2.4, 3.6);
        h.fx.add({ k: 'zzz', x: this.x + 6, y: this.y - 10, max: 2.6, r: 1 });
      }
    } else if (this.state === 'wake' && this.t > 0.5) {
      this.state = 'stand';
      this.t = 0;
    } else if (this.state === 'stand') {
      if (this.t > 0.4 && this.t - dt <= 0.4 && h.sound) snd.bark();
      if (this.t > 1.6 && this.t - dt <= 1.6 && h.sound) snd.bark();
      if (this.t > 3.4) {
        this.state = 'lie';
        this.t = 0;
      }
    } else if (this.state === 'lie' && this.t > 0.7) {
      this.state = 'sleep';
      this.t = 0;
    }
  }

  hit(x: number, y: number) {
    return Math.abs(x - this.x) < 14 && y > this.y - 16 && y < this.y + 4;
  }

  tap(h: Host) {
    if (this.state !== 'sleep') return;
    this.state = 'wake';
    this.t = 0;
    const at = { x: this.x, y: this.y - 22 };
    h.say('Karabaş', pick(['Hav! (Kulağında küpe var: belediyenin köpeği.)', 'Hav hav! (Simitçinin bekçisiyim, maaşım simit.)', 'Mmh… hav. (Uyutmadınız ki.)']), at);
    h.secret('kopek', at);
  }

  draw(g: CanvasRenderingContext2D, h: Host) {
    const n = h.night;
    const ink = n.c(INK);
    const k = depthScale(this.y);
    const fur = n.c('#3b2d22');
    const tan = n.c('#b78a5a');
    shadow(g, this.x, this.y, 12 * k, 2.6 * k, 0.26);
    g.save();
    g.translate(this.x, this.y);
    g.scale(-k, k);
    g.strokeStyle = ink;
    g.lineWidth = 0.6;
    const up = this.state === 'stand' ? 1 : this.state === 'wake' ? Math.min(1, this.t / 0.5) : this.state === 'lie' ? 1 - Math.min(1, this.t / 0.7) : 0;
    const breathe = this.state === 'sleep' ? Math.sin(this.t * 2.2) * 0.5 : 0;
    if (up < 0.5) {
      // yatan köpek: kıvrık gövde, başı patilerinde
      g.fillStyle = fur;
      g.beginPath();
      g.ellipse(0, -4.4 - breathe * 0.5, 10.5, 4.2 + breathe, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.strokeStyle = fur;
      g.lineWidth = 2;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(-9, -3);
      g.quadraticCurveTo(-12, -1, -9, 0.5);
      g.stroke();
      const lift = up * 8;
      g.fillStyle = fur;
      g.strokeStyle = ink;
      g.lineWidth = 0.6;
      g.beginPath();
      g.ellipse(9, -3.4 - lift, 4, 3.2, 0.2, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillStyle = tan;
      g.beginPath();
      g.ellipse(12, -2.6 - lift, 2.2, 1.6, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = fur;
      g.beginPath();
      g.ellipse(7.5, -6 - lift, 1.8, 2.8, -0.6, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#f2c21b';
      g.fillRect(7.6, -7 - lift, 1.4, 1.2);
    } else {
      // ayakta: dört bacak, kuyruk hızlı sallanır, başı kalkık
      const wag = Math.sin(h.t * 22) * 5;
      g.strokeStyle = fur;
      g.lineWidth = 2;
      g.lineCap = 'round';
      for (const lx of [-6, -3.5, 4.5, 7]) {
        g.beginPath();
        g.moveTo(lx, -6);
        g.lineTo(lx, 0);
        g.stroke();
      }
      g.beginPath();
      g.moveTo(-9, -9);
      g.quadraticCurveTo(-13, -13, -12 + wag * 0.4, -17 + Math.abs(wag) * 0.2);
      g.stroke();
      g.fillStyle = fur;
      g.strokeStyle = ink;
      g.lineWidth = 0.6;
      g.beginPath();
      g.ellipse(0, -9, 10, 4.2, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.beginPath();
      g.ellipse(10.5, -13.5, 3.8, 3.4, 0.3, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillStyle = tan;
      g.beginPath();
      g.ellipse(13.6, -12.4, 2.4, 1.7, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = fur;
      g.beginPath();
      g.ellipse(9, -16.6, 1.6, 2.8, -0.4, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#f2c21b';
      g.fillRect(9.2, -17.4, 1.4, 1.2);
      g.fillStyle = n.c('#1b1714');
      g.fillRect(12, -14.6, 0.9, 0.9);
      if (this.t % 1.2 < 0.3) {
        g.fillStyle = n.c('#c44a4a');
        g.fillRect(13.8, -11.4, 1.6, 1.4);
      }
    }
    g.restore();
  }
}

/** Gece çatıdaki kara kedi: gözleri sarı sarı parlar, kuyruğu kıvrılır. */
export class BlackCat implements Thing {
  x = 336;
  y = 310;
  depth = 310;
  blink = 0;

  update(_h: Host, dt: number) {
    this.blink = Math.max(0, this.blink - dt);
    if (chance(dt * 0.3)) this.blink = 0.15;
  }

  hit(x: number, y: number) {
    return Math.abs(x - this.x) < 9 && y > this.y - 14 && y < this.y + 3;
  }

  tap(h: Host) {
    this.blink = 0.5;
    if (h.sound) snd.purr();
    const at = { x: this.x, y: this.y - 18 };
    h.say('Kara kedi', pick(['Mırr. (Gece vardiyası bende.)', 'Mırr… (Önünden geçmedim, sen geçtin.)']), at);
    h.secret('kara-kedi', at);
  }

  draw(g: CanvasRenderingContext2D, h: Host) {
    if (h.dark < 0.55) return;
    const a = clamp((h.dark - 0.55) / 0.2, 0, 1);
    g.globalAlpha = a;
    g.fillStyle = '#0d0f14';
    g.save();
    g.translate(this.x, this.y);
    g.beginPath();
    g.ellipse(0, -3.4, 4.2, 3.2, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(-1.4, -6.6, 2.4, 3.8, -0.2, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(-2, -10.6, 2.4, 0, Math.PI * 2);
    g.fill();
    for (const ex of [-3.4, -0.8]) {
      g.beginPath();
      g.moveTo(ex - 0.8, -12);
      g.lineTo(ex, -14.6);
      g.lineTo(ex + 0.9, -12);
      g.fill();
    }
    g.strokeStyle = '#0d0f14';
    g.lineWidth = 1.5;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(3.4, -1.5);
    g.quadraticCurveTo(8, -3 + Math.sin(h.t * 1.4) * 2, 6.5, -8);
    g.stroke();
    if (this.blink <= 0) {
      for (const ex of [-3, -1]) {
        g.fillStyle = '#ffd84a';
        g.fillRect(ex - 0.5, -11, 1, 1);
        glow(g, 'rgb(255,210,70)', ex, -10.5, 3, 0.6);
      }
    }
    g.restore();
    g.globalAlpha = 1;
  }
}
