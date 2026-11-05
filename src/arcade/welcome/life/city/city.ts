import * as snd from '../sounds';
import { Basket, Worker } from './basket';
import { Flock, Gull } from './birds';
import { chance, clamp, dist, inside, Night, noise, pick, rand, sampleIn, type Host, type Pt, type Thing } from './core';
import { Gondola, Office, Ticker, TV, Welder } from './facade';
import { Fx } from './fx';
import { Laundry } from './laundry';
import { BlackCat, Cat, Dog } from './pets';
import { Ball, Kid, PLAZA, ROAD } from './play';
import { Chimneys, Newspaper, Pothole, Spots } from './props';
import { Traffic } from './traffic';
import { Baloncu, Cayci, Simitci } from './vendors';
import { Crowd, drawMoths } from './walkers';

/*
 * Şehrin kendisi: her şeyi günceller, derinliğe göre sıralayıp çizer, dokunuşu doğru şeye iletir.
 * Ortam: rüzgâr yumuşak bir gürültüyle eser, arada sağanaklar gelir; ara ara yağmur başlar
 * (damlalar gerçek zemin noktalarına düşer, sıçrar, çukurdaki suya halka bırakır), yayalar
 * şemsiye açar. Işık kırmızıya dönünce yayalar geçer, arabalar bekler; yola kaçan top ya da
 * yamacı arabaları durdurur.
 */

export interface Hooks {
  say(who: string, text: string, at: Pt): void;
  secret(id: string, at: Pt): void;
}

/** Yağmurun düştüğü yerler: kaldırımlar, yol, meydancık, sağdaki toprak, plazanın çatısı. */
const GROUND: [number, number][][] = [
  [
    [112, 622],
    [160, 598],
    [382, 645],
    [480, 592],
    [500, 594],
    [492, 633],
    [470, 688],
    [455, 724],
  ],
  ROAD,
  PLAZA,
  [
    [860, 560],
    [940, 505],
    [1040, 520],
    [960, 590],
  ],
  [
    [434, 128],
    [535, 60],
    [645, 110],
    [552, 163],
  ],
];
const AREAS = GROUND.map((p) => {
  const xs = p.map((q) => q[0]);
  const ys = p.map((q) => q[1]);
  return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
});
const TOTAL = AREAS.reduce((a, b) => a + b, 0);

export class City implements Host {
  t = 0;
  wind = 0.3;
  rain = 0;
  dark = 0;
  low: boolean;
  sound = false;
  night = new Night();
  fx: Fx;
  light: 'green' | 'yellow' | 'red' = 'green';
  chaos = false;

  traffic: Traffic;
  crowd: Crowd;
  simitci = new Simitci();
  cayci = new Cayci();
  ball = new Ball();
  kids: [Kid, Kid];
  baloncu = new Baloncu();
  basket = new Basket();
  flock: Flock;
  cat = new Cat();
  dog = new Dog();
  gulls: Gull[] = [];
  blackCat = new BlackCat();
  laundry: Laundry;
  gondola = new Gondola();
  welder = new Welder();
  ticker = new Ticker();
  tv = new TV();
  office = new Office();
  chimneys: Chimneys;
  spots = new Spots();
  pothole = new Pothole();
  paper = new Newspaper();
  worker: Worker | null = null;

  private gust = 0;
  private gustT = rand(15, 30);
  private rainT = rand(120, 260);
  private rainOn = 0;
  private rainGoal = 0;
  private dropAcc = 0;
  private gullT = rand(8, 30);
  private patchT = rand(20, 60);

  private hooks: Hooks;

  constructor(hooks: Hooks, low: boolean) {
    this.hooks = hooks;
    this.low = low;
    this.fx = new Fx(low ? 360 : 1100);
    this.traffic = new Traffic(low);
    this.crowd = new Crowd(low);
    this.flock = new Flock(low ? 5 : 8);
    this.laundry = new Laundry(low);
    this.chimneys = new Chimneys(low);
    this.kids = [new Kid(604, 744, { x: 604, y: 744 }), new Kid(684, 706, { x: 684, y: 706 })];
    this.ball.held = this.kids[0];
    this.traffic.onBusStop = () => this.crowd.board({ x: 513, y: 604 });
    this.traffic.onHonk = (v) => {
      if (this.sound) snd.carHorn();
      const at = v.at();
      this.say('Arkadaki şoför', pick(['Yeşil yandı, uyuma!', 'Hadi abi, yeşilin daha yeşili yok!', 'Kornaya basmasam kalkmayacaktı.']), at);
      this.secret('korna', at);
    };
    this.traffic.onBump = () => {
      if (this.pothole.state !== 'patched') return;
      this.pothole.state = 'broken';
      this.fx.dust(this.pothole.at.x, this.pothole.at.y, 6, 8);
      const at = { x: 540, y: 664 };
      this.say('Yama ekibi', pick(['Yamadık abi. Yarın İSKİ kazacak zaten.', 'Daha soğumamıştı ki! Neyse, haftaya yine geliriz.']), at);
      this.secret('cukur', at);
    };
  }

  say(who: string, text: string, at: Pt) {
    this.hooks.say(who, text, at);
  }

  secret(id: string, at: Pt) {
    this.hooks.secret(id, at);
  }

  /** Yağmuru hemen başlat (geliştirirken denemek için). */
  forceRain() {
    this.rainT = 0;
  }

  update(dt: number) {
    this.t += dt;
    this.night.set(this.dark);
    // rüzgâr: yumuşak taban, ara ara sağanak
    this.gustT -= dt;
    if (this.gustT <= 0) {
      this.gust = rand(0.6, 1.1);
      this.gustT = rand(18, 40);
    }
    this.gust = Math.max(0, this.gust - dt * 0.22);
    const base = 0.22 + noise(this.t * 0.04, 1) * 0.28;
    this.wind = clamp(base + this.gust * Math.sin(Math.min(1, this.gust) * Math.PI * 0.5) + this.rain * 0.3, -1, 1.4);

    this.weather(dt);

    this.light = this.traffic.light.state;
    this.chaos = this.traffic.light.chaos > 0;

    // trafik engelleri: geçitteki yayalar, yoldaki top ve çocuk, yamacı
    this.traffic.crossing = this.crowd.crossing;
    const blocks: { route: number; s: number }[] = [];
    const add = (x: number, y: number) => {
      if (!inside(x, y, ROAD)) return;
      const r = this.traffic.onRoad(x, y);
      if (r) blocks.push(r);
    };
    if (!this.ball.held) add(this.ball.x, this.ball.y);
    for (const k of this.kids) add(k.x, k.y);
    if (this.worker) add(this.worker.x, this.worker.y);
    this.traffic.blocks = blocks;

    this.traffic.update(this, dt);
    this.crowd.update(this, dt);
    this.simitci.update(this, dt);
    this.cayci.update(this, dt);
    this.ball.update(this, dt);
    this.kids[0].step(dt, this.ball, this.kids[1]);
    this.kids[1].step(dt, this.ball, this.kids[0]);
    this.baloncu.update(this, dt);
    this.basket.update(this, dt);
    this.flock.update(this, dt);
    this.cat.update(this, dt);
    this.dog.update(this, dt);
    this.blackCat.update(this, dt);
    this.laundry.update(this, dt);
    this.gondola.update(this, dt);
    this.welder.update(this, dt);
    this.tv.update(this, dt);
    this.office.update(this, dt);
    this.chimneys.update(this, dt);
    this.spots.update(this, dt);
    this.paper.update(this, dt);
    this.patchT -= dt;
    if (this.patchT <= 0) {
      this.patch();
      this.patchT = rand(150, 260);
    }
    if (this.worker) {
      this.worker.update(this, dt);
      if (this.worker.dead) this.worker = null;
    }
    // martılar: ara ara tepeden süzülür
    this.gullT -= dt;
    if (this.gullT <= 0) {
      this.gulls.push(new Gull(() => this.steal()));
      this.gullT = rand(35, 90);
      if (this.sound && chance(0.6)) window.setTimeout(snd.gull, 1500);
    }
    for (const g of this.gulls) g.update(this, dt);
    this.gulls = this.gulls.filter((g) => !g.dead);
    this.fx.update(dt, this);
  }

  private steal() {
    if (this.sound) snd.gull();
    this.simitci.call = 1.5;
    const at = { x: 632, y: 652 };
    this.say('Simitçi', pick(['Hırsız martı! Yine mi sen?', 'Martı simidi kaptı! Parasını kim verecek?']), at);
    this.secret('marti', at);
  }

  private weather(dt: number) {
    this.rainT -= dt;
    if (this.rainT <= 0) {
      if (this.rainGoal > 0) {
        this.rainGoal = 0;
        this.rainT = rand(200, 420);
      } else {
        this.rainGoal = rand(0.55, 1);
        this.rainT = rand(40, 75);
        this.rainOn = 0;
      }
    }
    const before = this.rain;
    this.rain += (this.rainGoal - this.rain) * dt * (this.rainGoal > this.rain ? 0.35 : 0.25);
    if (this.rain < 0.004) this.rain = 0;
    if (before < 0.15 && this.rain >= 0.15 && this.rainGoal > 0) {
      const at = { x: 560, y: 240 };
      this.say('Hava', pick(['Yağmur başladı. Şemsiyesi olan dışarı, olmayan bakkala.', 'Yağmur! Çamaşırlar ıslanacak, teyze balkona koşuyor.']), at);
      this.secret('yagmur', at);
    }
    if (this.sound) {
      if (this.rain > 0.08 && !this.rainOn) {
        this.rainOn = 1;
        snd.rain(true);
        if (chance(0.5)) window.setTimeout(snd.thunder, rand(2000, 9000));
      } else if (this.rain <= 0.06 && this.rainOn) {
        this.rainOn = 0;
        snd.rain(false);
      }
    } else if (this.rainOn) {
      this.rainOn = 0;
      snd.rain(false);
    }
    // damlalar: zemin noktası seçilir, rüzgâra göre eğik düşer
    this.dropAcc += this.rain * (this.low ? 150 : 420) * dt;
    while (this.dropAcc >= 1) {
      this.dropAcc--;
      let r = Math.random() * TOTAL;
      let i = 0;
      while (r > AREAS[i] && i < AREAS.length - 1) r -= AREAS[i++];
      const land = sampleIn(GROUND[i]);
      const vy = rand(560, 680);
      const vx = this.wind * 90;
      const fall = rand(0.35, 0.75);
      const wet = dist(land.x, land.y, this.pothole.at.x, this.pothole.at.y) < 14;
      this.fx.add({ k: 'rain', x: land.x - vx * fall, y: land.y - vy * fall, vx, vy, max: fall + 0.2, floor: land.y, wet });
    }
  }

  /** Çizim sırası: duman, yol çizgileri, derinliğe göre her şey, ön parçacıklar. */
  draw(g: CanvasRenderingContext2D) {
    this.fx.drawBack(g, this.night);
    this.traffic.drawCrossing(g, this);
    this.pothole.draw(g, this);
    const things = this.things();
    things.sort((a, b) => a.depth - b.depth);
    for (const t of things) t.draw(g, this);
    this.fx.drawFront(g, this.night);
    drawMoths(g, this);
  }

  /** Çizilen ve dokunulabilen her şey. */
  things(): Thing[] {
    const light: Thing = {
      depth: 560,
      update: () => {},
      draw: (g) => this.traffic.light.draw(g, this),
      hit: (x, y) => this.traffic.light.hit(x, y),
      tap: () => {
        const at = { x: 612, y: 528 };
        if (this.traffic.light.tap(this) === 'chaos') {
          this.say('Trafik ışığı', 'Herkese yeşil! Kavşak Amiri bu işe ne der?', at);
          this.secret('isik', at);
        } else this.say('Yaya butonu', pick(['Lütfen bekleyiniz…', 'Bastın. Işık seni duydu, birazdan.', 'Bekleyiniz. (Basmak hızlandırmaz, ama rahatlatır.)']), at);
      },
    };
    return [
      ...this.traffic.cars,
      ...this.crowd.walkers,
      this.simitci,
      this.cayci,
      this.ball,
      ...this.kids,
      this.baloncu,
      this.basket,
      ...this.flock.things(),
      this.cat,
      this.dog,
      ...this.gulls,
      this.blackCat,
      this.laundry,
      this.gondola,
      this.welder,
      this.ticker,
      this.tv,
      this.office,
      this.spots,
      this.paper,
      light,
      ...(this.worker ? [this.worker] : []),
    ];
  }

  /** Yama ekibi: ara ara gelip çukuru yamar (çukurun kendisi Yama Ekibi'nin durağı). */
  private patch() {
    if (this.pothole.state === 'patching' || this.pothole.state === 'patched' || this.worker) return;
    this.pothole.state = 'patching';
    this.worker = new Worker(this.pothole.at, () => {
      this.pothole.state = 'patched';
      this.fx.dust(this.pothole.at.x, this.pothole.at.y, 5, 8);
    });
  }

  /** Dokunma: önde olandan arkaya doğru ilk isabet. */
  tap(x: number, y: number): boolean {
    // önce yere yakın, sonra uzak şeyler (önde olan önce)
    const things = this.things().filter((t) => t.hit && t.hit(x, y));
    things.sort((a, b) => b.depth - a.depth);
    if (this.chimneys.hit(x, y) && !things.length) {
      this.chimneys.tapAt(this, x, y);
      return true;
    }
    if (this.flock.hit(x, y) && (!things.length || things[0].depth < 600)) {
      this.flock.scare(this);
      const b = this.flock.birds[0];
      const at = { x: b.x, y: b.y - 16 };
      this.say('Güvercinler', pick(['Pırrr! Simit kırıntısı yoksa biz yokuz.', 'Pırrr! Plazanın çatısı boşaldı, biri yem getirsin.']), at);
      this.secret('guvercin', at);
      return true;
    }
    const top = things[0];
    if (!top) return false;
    if (top === this.spots) this.spots.tapAt(this, x, y);
    else if (top === this.ball) this.kick();
    else top.tap?.(this);
    return true;
  }

  /** Topa dokunuldu: yola doğru sert bir şut. */
  private kick() {
    const b = this.ball;
    b.held = null;
    const tx = rand(505, 545);
    const ty = rand(640, 720);
    const d = Math.hypot(tx - b.x, ty - b.y) || 1;
    b.vx = ((tx - b.x) / d) * 150;
    b.vy = ((ty - b.y) / d) * 150;
    b.vz = 120;
    b.z = Math.max(b.z, 2);
    if (this.sound) snd.kick();
    const at = { x: b.x, y: b.y - 26 };
    this.say('Çocuklar', pick(['Abi topu atma, araba geliyor!', 'Gooool! …Yola gitti ama.', 'Top yola kaçtı! Kim alacak?']), at);
    this.secret('top', at);
  }

  hover(x: number, y: number): boolean {
    return this.chimneys.hit(x, y) || this.flock.hit(x, y) || this.things().some((t) => t.hit && t.hit(x, y));
  }
}
