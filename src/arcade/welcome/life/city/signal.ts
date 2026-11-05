import * as snd from '../sounds';
import { glow, INK, Path, rand, type Host, type Pt } from './core';

/*
 * Köşedeki trafik ışığı (yeşil, sarı, kırmızı; üç hızlı dokunuşta "herkese yeşil"), iki şerit ve
 * üstlerindeki durma çizgisi, yaya geçidi, otobüs durağı ve çukurun teker izine denk geldiği yer.
 */

export type Signal = 'green' | 'yellow' | 'red';

const DUR: Record<Signal, number> = { green: 11, yellow: 2.6, red: 9 };

export class TrafficLight {
  state: Signal = 'green';
  t = rand(0, 6);
  /** "Herkese yeşil" kalan süresi. */
  chaos = 0;
  private taps: number[] = [];
  /** Yeşile döndüğü an (Traffic kuyruğa tepki süreleri dağıtır). */
  turnedGreen = false;

  update(dt: number) {
    this.turnedGreen = false;
    this.pressed = Math.max(0, this.pressed - dt);
    if (this.chaos > 0) {
      this.chaos -= dt;
      if (this.state !== 'green') this.turnedGreen = true;
      this.state = 'green';
      if (this.chaos <= 0) this.t = 0;
      return;
    }
    this.t += dt;
    if (this.t > DUR[this.state]) {
      this.t = 0;
      this.state = this.state === 'green' ? 'yellow' : this.state === 'yellow' ? 'red' : 'green';
      if (this.state === 'green') this.turnedGreen = true;
    }
  }

  /** Direkteki yaya butonu (ışığın kendisi Kavşak Amiri'nin durağı; ona dokunan oyuna girer). */
  hit(x: number, y: number) {
    return x > 604 && x < 620 && y > 530 && y < 554;
  }

  /**
   * Yaya butonu: bir basış yeşili kısaltır, ışık birazdan kırmızıya döner. Üç hızlı basış:
   * bütün yönlere yeşil.
   */
  tap(h: Host): 'chaos' | 'wait' {
    const now = h.t;
    this.taps = [...this.taps.filter((t) => now - t < 2.2), now];
    this.pressed = 1.2;
    if (h.sound) snd.blip();
    if (this.taps.length >= 3) {
      this.taps = [];
      this.chaos = 7;
      return 'chaos';
    }
    if (this.state === 'green') this.t = Math.max(this.t, DUR.green - 1.6);
    return 'wait';
  }

  /** Basıldığında butonun ışığı bir an yanar. */
  pressed = 0;

  draw(g: CanvasRenderingContext2D, h: Host) {
    const night = h.night;
    const x = 616;
    // direkteki yaya butonu: sarı kutu, el işareti
    g.fillStyle = night.c('#f2c21b');
    g.strokeStyle = night.c(INK);
    g.lineWidth = 0.6;
    g.beginPath();
    g.roundRect(609.6, 536, 5.6, 8, 1);
    g.fill();
    g.stroke();
    g.fillStyle = this.pressed > 0 ? '#ff5a3a' : night.c('#2a2420');
    g.beginPath();
    g.arc(612.4, 541.6, 1.3, 0, Math.PI * 2);
    g.fill();
    if (this.pressed > 0) glow(g, 'rgb(255,110,60)', 612.4, 541.6, 5, 0.6);
    // boyalı lambaların üstüne kendi gövdemiz
    g.fillStyle = night.c('#23272b');
    g.strokeStyle = night.c(INK);
    g.lineWidth = 0.9;
    g.beginPath();
    g.roundRect(610.6, 483.8, 10.8, 30.6, 2.2);
    g.fill();
    g.stroke();
    const lamps: [Signal, number, string, string][] = [
      ['red', 489.6, '#ff3b2e', '#4a1f1b'],
      ['yellow', 498.8, '#ffc21f', '#4a3c1a'],
      ['green', 508, '#33e07a', '#1b3a26'],
    ];
    const blink = this.chaos > 0 && Math.floor(h.t * 4) % 2 === 0;
    for (const [state, y, on, off] of lamps) {
      const lit = this.chaos > 0 ? state === 'green' && !blink : this.state === state;
      g.fillStyle = lit ? on : off;
      g.beginPath();
      g.arc(x, y, 2.9, 0, Math.PI * 2);
      g.fill();
      // siperlik
      g.strokeStyle = night.c('#15181b');
      g.lineWidth = 1.2;
      g.beginPath();
      g.arc(x, y + 0.4, 3.6, Math.PI * 1.05, Math.PI * 1.95);
      g.stroke();
      if (lit) {
        g.fillStyle = 'rgba(255,255,255,0.7)';
        g.beginPath();
        g.arc(x - 0.9, y - 0.9, 0.9, 0, Math.PI * 2);
        g.fill();
        const c = state === 'red' ? 'rgb(255,70,50)' : state === 'yellow' ? 'rgb(255,200,60)' : 'rgb(60,240,130)';
        glow(g, c, x, y, 7 + h.dark * 10, 0.45 + h.dark * 0.45);
      }
    }
  }
}

/** Şeritler (görselin koordinatlarında) ve üstlerindeki durma çizgileri. */
const R1 = new Path([
  [648, 496],
  [640, 500],
  [612, 515],
  [588, 528],
  [562, 545],
  [541, 564],
  [528, 590],
  [519, 620],
  [509, 652],
  [497, 685],
  [484, 712],
  [470, 736],
  [456, 758],
]);
const R2 = new Path([
  [512, 758],
  [523, 728],
  [535, 700],
  [546, 670],
  [556, 640],
  [563, 612],
  [571, 588],
  [585, 568],
  [606, 553],
  [630, 538],
  [652, 525],
  [656, 523],
]);

export interface Route {
  path: Path;
  /** Işıkta durma çizgisi. */
  stop: number;
  /** Yaya geçidi. */
  cross: number;
  /** Otobüs durağı (yalnız R1). */
  bus?: number;
  /** Çukurun teker izine denk geldiği yer (yalnız R2). */
  bump?: number;
}

export const ROUTES: Route[] = [
  { path: R1, stop: R1.nearest(624, 509).s, cross: R1.nearest(514, 636).s, bus: R1.nearest(524, 606).s },
  { path: R2, stop: R2.nearest(553, 655).s, cross: R2.nearest(557, 637).s, bump: R2.nearest(536, 697).s },
];

/** Yaya geçidinin iki ucu (people.ts da kullanır). */
export const CROSSING: [Pt, Pt] = [
  { x: 488, y: 629 },
  { x: 578, y: 634 },
];
