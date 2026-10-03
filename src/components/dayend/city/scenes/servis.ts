import { H, PAD, W, glow, glowRect, makeRng, pick, range, rgba, vGradient, type Cam, type RGB } from '../kit';
import type { CityScene } from '../scene';

/*
 * Wednesday, 17:50 — inside the company servis, stuck on Büyükdere Caddesi in the rain.
 * You look out of the side window: the servis next to you, taxis, brake lights, plaza lobbies,
 * neon, umbrellas on the pavement. The world outside is drawn small and scaled up, which is
 * exactly how it looks through wet glass; raindrops on the pane are little lenses that show
 * the street upside down, and rivulets run down in jerks. The bus creeps, stops, creeps.
 */

// The window, in stage coordinates
const WIN = { x: 130, y: 118, w: 1340, h: 520 };
const PILLAR = 812;
// The outside world is rendered into a small buffer (wet-glass blur for free)
const BW = 420;
const BH = 164;
const KB = 5.2; // px per metre: buildings across the street
const KS = 9; // pavement
const KC = 19; // next lane
const STRIP_M = 700; // length of the pre-rendered street

type VKind = 'car' | 'taxi' | 'servis' | 'van';

interface Car {
  rx: number;
  v: number;
  kind: VKind;
  len: number;
  body: RGB;
  brake: number;
}

const PAINT: RGB[] = [
  [205, 206, 210],
  [30, 30, 34],
  [118, 124, 134],
  [150, 22, 26],
  [26, 44, 88],
  [90, 60, 40],
];

export function servisScene(): CityScene {
  const r = makeRng(3131);
  let s = 0; // our position along the road (m)
  let vs = 0; // our speed
  let go = false;
  let phaseT = 2;

  // the next lane, positions relative to us (m, positive = ahead = to the left of the window)
  const cars: Car[] = [];
  for (let x = -38; x < 42; ) {
    const roll = r();
    const kind: VKind = roll < 0.35 ? 'servis' : roll < 0.55 ? 'taxi' : roll < 0.65 ? 'van' : 'car';
    const len = kind === 'servis' ? 8.4 : kind === 'van' ? 5.2 : 4.5;
    cars.push({ rx: x + len / 2, v: 0, kind, len, body: kind === 'servis' ? [234, 234, 228] : kind === 'taxi' ? [236, 184, 20] : pick(r, PAINT), brake: 1 });
    x += len + range(r, 1.2, 2.6);
  }

  // raindrops on the glass
  const drops = Array.from({ length: 170 }, () => ({ x: range(r, WIN.x, WIN.x + WIN.w), y: range(r, WIN.y, WIN.y + WIN.h), r: Math.pow(r(), 2.2) * 9 + 1.6 }));
  const rivulets = Array.from({ length: 14 }, () => ({ x: range(r, WIN.x + 20, WIN.x + WIN.w - 20), y: range(r, WIN.y, WIN.y + WIN.h), vy: 0, pause: range(r, 0, 2), r: range(r, 3, 6), trail: [] as { x: number; y: number }[] }));

  let buffer: HTMLCanvasElement;
  let bctx: CanvasRenderingContext2D;
  let buildings: HTMLCanvasElement;
  let pavement: HTMLCanvasElement;
  let interior: HTMLCanvasElement;

  const buildStrips = () => {
    const rb = makeRng(12);
    // buildings across the street, one long strip
    buildings = document.createElement('canvas');
    buildings.width = Math.round(STRIP_M * KB);
    buildings.height = BH;
    const b = buildings.getContext('2d')!;
    b.fillStyle = vGradient(b, 0, 40, [
      [0, '#2b1f26'],
      [1, '#4a3334'],
    ]);
    b.fillRect(0, 0, buildings.width, 40);
    const SIGNS: [string, RGB][] = [
      ['ECZANE', [60, 255, 120]],
      ['DÖNER', [255, 120, 40]],
      ['KAFE', [255, 190, 90]],
      ['MARKET', [90, 200, 255]],
      ['BANKA', [120, 170, 255]],
      ['SİMİT', [255, 210, 120]],
      ['KUAFÖR', [255, 90, 200]],
    ];
    for (let x = 0; x < buildings.width; ) {
      const w = range(rb, 18, 44) * KB;
      const glass = rb() < 0.6;
      const top = range(rb, -10, 30);
      b.fillStyle = glass ? '#1d2436' : '#3a3130';
      b.fillRect(x, top, w - 2, 96 - top);
      for (let y = top + 4; y < 80; y += 7) {
        const floorLit = rb() < 0.6;
        for (let wx = x + 3; wx < x + w - 6; wx += 5) {
          const lit = floorLit ? rb() < 0.85 : rb() < 0.1;
          b.fillStyle = lit ? rgba(glass ? ([210, 228, 255] as RGB) : ([255, 206, 140] as RGB), range(rb, 0.5, 0.9)) : 'rgba(20,24,34,0.9)';
          b.fillRect(wx, y, 3.4, 4.2);
        }
      }
      // lobby / shop at street level
      b.fillStyle = 'rgba(255,214,160,0.85)';
      b.fillRect(x + 4, 82, w - 10, 14);
      if (rb() < 0.7) {
        const [name, c] = pick(rb, SIGNS);
        b.fillStyle = '#0d0c10';
        b.fillRect(x + 6, 74, Math.min(w - 12, 40), 7);
        b.fillStyle = rgba(c);
        b.font = '700 6px sans-serif';
        b.textBaseline = 'middle';
        b.fillText(name, x + 8, 77.6, Math.min(w - 16, 36));
        b.globalCompositeOperation = 'lighter';
        glowRect(b, x + 6 + Math.min(w - 12, 40) / 2, 77, Math.min(w - 12, 40) * 1.4, 18, c, 0.5);
        b.globalCompositeOperation = 'source-over';
      }
      x += w;
    }
    // pavement strip: kerb, lamp posts, bus stop, bollards
    pavement = document.createElement('canvas');
    pavement.width = Math.round(STRIP_M * KS);
    pavement.height = BH;
    const p = pavement.getContext('2d')!;
    p.fillStyle = vGradient(p, 96, 118, [
      [0, '#2c2a30'],
      [1, '#3a3840'],
    ]);
    p.fillRect(0, 96, pavement.width, 22);
    p.fillStyle = '#56545c';
    p.fillRect(0, 117, pavement.width, 3);
    for (let x = 30; x < pavement.width; x += 30 * KS) {
      p.fillStyle = '#16151a';
      p.fillRect(x, 20, 2.2, 97);
      p.fillRect(x - 10, 20, 12, 2);
      p.globalCompositeOperation = 'lighter';
      glow(p, x - 9, 23, 14, [235, 238, 255], 0.9, true);
      glowRect(p, x - 9, 112, 70, 14, [210, 220, 245], 0.2);
      p.globalCompositeOperation = 'source-over';
    }
    for (let x = 200; x < pavement.width; x += 170 * KS) {
      // bus stop with a lit ad panel
      p.fillStyle = 'rgba(160,190,210,0.15)';
      p.fillRect(x, 70, 60, 46);
      p.fillStyle = '#16151a';
      p.fillRect(x, 68, 62, 3);
      p.fillStyle = 'rgba(250,246,236,0.9)';
      p.fillRect(x + 44, 76, 14, 32);
      p.globalCompositeOperation = 'lighter';
      glowRect(p, x + 51, 92, 40, 50, [255, 250, 235], 0.35);
      p.globalCompositeOperation = 'source-over';
    }
  };

  const drawStrip = (g: CanvasRenderingContext2D, strip: HTMLCanvasElement, k: number, offsetM: number) => {
    const L = strip.width;
    // screen x = BW/2 − (X − s)·k  →  the strip's origin sits at BW/2 + s·k (mod its length)
    let x0 = (((BW / 2 + (s + offsetM) * k) % L) + L) % L;
    x0 -= L;
    g.drawImage(strip, x0, 0);
    if (x0 + L < BW) g.drawImage(strip, x0 + L, 0);
    if (x0 + L * 2 < BW) g.drawImage(strip, x0 + L * 2, 0);
  };

  function sideCar(g: CanvasRenderingContext2D, c: Car, t: number) {
    // front of the car points left (ahead); rear on the right
    const x = BW / 2 - c.rx * KC - (c.len * KC) / 2;
    const len = c.len * KC;
    const ground = 158;
    if (x > BW + 10 || x + len < -10) return;
    const shade = (f: number) => rgba([c.body[0] * f, c.body[1] * f, c.body[2] * f]);
    if (c.kind === 'servis' || c.kind === 'van') {
      const h = (c.kind === 'servis' ? 2.85 : 2.2) * KC;
      g.fillStyle = shade(0.5);
      g.beginPath();
      g.roundRect(x, ground - h, len, h - 6, [10, 5, 3, 3]);
      g.fill();
      // dark tinted window band: nothing inside shows, only the street reflected in it
      g.fillStyle = c.kind === 'servis' ? '#161a22' : '#1a1f28';
      g.fillRect(x + 12, ground - h + 8, len - 22, h * 0.36);
      if (c.kind === 'servis') {
        g.fillStyle = 'rgba(190,200,225,0.12)';
        g.fillRect(x + 12, ground - h + 8, len - 22, h * 0.09);
        g.fillStyle = 'rgba(255,170,120,0.07)';
        g.fillRect(x + 12, ground - h + 8 + h * 0.27, len - 22, h * 0.09);
        g.fillStyle = 'rgba(8,9,12,0.9)';
        for (let px = x + 12 + (len - 22) / 3; px < x + len - 12; px += (len - 22) / 3) g.fillRect(px, ground - h + 8, 2.5, h * 0.36);
        g.fillStyle = 'rgba(40,80,150,0.8)';
        g.fillRect(x + 4, ground - h * 0.42, len - 8, 3);
        g.fillStyle = '#121216';
        g.fillRect(x + 6, ground - h + 1, 40, 7);
        g.fillStyle = '#ffae4a';
        g.font = '800 5.5px monospace';
        g.textBaseline = 'middle';
        g.fillText('SERVİS', x + 9, ground - h + 4.6);
      }
    } else {
      // sedan profile: body + cabin
      g.fillStyle = shade(0.42);
      g.beginPath();
      g.moveTo(x + 4, ground - 8);
      g.lineTo(x + 2, ground - 20);
      g.quadraticCurveTo(x + 6, ground - 26, x + len * 0.22, ground - 27);
      g.lineTo(x + len * 0.34, ground - 40);
      g.lineTo(x + len * 0.72, ground - 41);
      g.lineTo(x + len * 0.88, ground - 28);
      g.quadraticCurveTo(x + len - 2, ground - 26, x + len - 2, ground - 16);
      g.lineTo(x + len - 4, ground - 8);
      g.closePath();
      g.fill();
      g.fillStyle = '#141922';
      g.beginPath();
      g.moveTo(x + len * 0.36, ground - 37);
      g.lineTo(x + len * 0.52, ground - 38);
      g.lineTo(x + len * 0.52, ground - 28);
      g.lineTo(x + len * 0.27, ground - 28);
      g.closePath();
      g.moveTo(x + len * 0.55, ground - 38);
      g.lineTo(x + len * 0.7, ground - 38);
      g.lineTo(x + len * 0.83, ground - 28);
      g.lineTo(x + len * 0.55, ground - 28);
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.fillRect(x + 6, ground - 24, len - 12, 1.2);
      if (c.kind === 'taxi') {
        g.fillStyle = '#ffe08a';
        g.fillRect(x + len * 0.45, ground - 45, 14, 4);
      }
    }
    // wheels
    g.fillStyle = '#0b0b0e';
    for (const wx of [x + len * 0.18, x + len * 0.8]) {
      g.beginPath();
      g.arc(wx, ground - 4, 7, 0, Math.PI * 2);
      g.fill();
    }
    // lights: tail (right end), head (left end)
    g.globalCompositeOperation = 'lighter';
    const tail = 0.55 + c.brake * 0.45;
    glow(g, x + len - 2, ground - 20, 6 + c.brake * 6, [255, 34, 26], tail, true);
    glowRect(g, x + len - 2, ground + 4, 10, 24, [255, 40, 30], 0.35 * tail);
    glow(g, x + 3, ground - 18, 8, [255, 240, 220], 0.9, true);
    glowRect(g, x - 30, ground - 4, 80, 10, [255, 230, 200], 0.18);
    if (c.kind === 'taxi') glow(g, x + len * 0.45 + 7, ground - 43, 8, [255, 214, 90], 0.7);
    if (c.kind === 'servis' || c.kind === 'van') {
      if (Math.sin(t * 5 + c.rx) > 0) glow(g, x + len - 3, ground - 30, 7, [255, 170, 40], 0.9, true);
    }
    g.globalCompositeOperation = 'source-over';
  }

  return {
    caption: 'Servisin içinden · Büyükdere Caddesi — 40 dakikadır aynı plazanın önündeyiz.',
    build(px) {
      buffer = document.createElement('canvas');
      buffer.width = BW;
      buffer.height = BH;
      bctx = buffer.getContext('2d')!;
      buildStrips();
      // the bus interior, drawn once at full resolution
      interior = document.createElement('canvas');
      interior.width = Math.ceil((W + PAD * 2) * px);
      interior.height = Math.ceil((H + PAD * 2) * px);
      const g = interior.getContext('2d')!;
      g.setTransform(px, 0, 0, px, PAD * px, PAD * px);
      // walls, with the window cut out
      g.fillStyle = vGradient(g, -PAD, H + PAD, [
        [0, '#0d0e14'],
        [0.15, '#1a1c26'],
        [0.7, '#20222c'],
        [1, '#0c0d12'],
      ]);
      g.beginPath();
      g.rect(-PAD, -PAD, W + PAD * 2, H + PAD * 2);
      g.roundRect(WIN.x, WIN.y, PILLAR - WIN.x - 14, WIN.h, 26);
      g.roundRect(PILLAR + 14, WIN.y, WIN.x + WIN.w - PILLAR - 14, WIN.h, 26);
      g.fill('evenodd');
      // rubber seals
      g.strokeStyle = '#050507';
      g.lineWidth = 12;
      g.beginPath();
      g.roundRect(WIN.x, WIN.y, PILLAR - WIN.x - 14, WIN.h, 26);
      g.roundRect(PILLAR + 14, WIN.y, WIN.x + WIN.w - PILLAR - 14, WIN.h, 26);
      g.stroke();
      // sliding upper panes
      g.fillStyle = '#08080b';
      g.fillRect(WIN.x, WIN.y + 118, PILLAR - WIN.x - 14, 7);
      g.fillRect(PILLAR + 14, WIN.y + 118, WIN.x + WIN.w - PILLAR - 14, 7);
      g.fillStyle = '#3a3c46';
      g.fillRect(WIN.x + 40, WIN.y + 112, 30, 6);
      // ceiling with its blue LED strip and luggage rack
      g.fillStyle = '#07080c';
      g.fillRect(-PAD, -PAD, W + PAD * 2, 70 + PAD);
      g.fillStyle = '#12131a';
      g.fillRect(-PAD, 70, W + PAD * 2, 16);
      // curtain gathered at the right
      for (let i = 0; i < 9; i++) {
        g.fillStyle = i % 2 ? '#2c3c5a' : '#344668';
        g.fillRect(WIN.x + WIN.w - 70 + i * 9, WIN.y - 16, 10, WIN.h + 30);
      }
      g.fillStyle = '#1d2638';
      g.fillRect(WIN.x + WIN.w - 76, WIN.y + WIN.h * 0.45, 86, 12);
      // window sill + handrail
      g.fillStyle = '#2a2c36';
      g.fillRect(-PAD, WIN.y + WIN.h + 6, W + PAD * 2, 26);
      g.fillStyle = 'rgba(255,255,255,0.08)';
      g.fillRect(-PAD, WIN.y + WIN.h + 6, W + PAD * 2, 2);
      g.strokeStyle = '#8a8d98';
      g.lineWidth = 7;
      g.beginPath();
      g.moveTo(-PAD, 60);
      g.lineTo(W + PAD, 60);
      g.stroke();
      // a colleague in the seat ahead, head against the window, half asleep
      g.fillStyle = '#0b0c12';
      g.beginPath();
      g.ellipse(150, 520, 44, 52, -0.35, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#16121a';
      g.beginPath();
      g.ellipse(140, 492, 44, 38, -0.35, Math.PI * 1.05, Math.PI * 2.05);
      g.fill();
      g.strokeStyle = 'rgba(140,170,230,0.45)';
      g.lineWidth = 3;
      g.beginPath();
      g.ellipse(150, 520, 44, 52, -0.35, Math.PI * 1.2, Math.PI * 1.75);
      g.stroke();
      g.fillStyle = '#0b0c12';
      g.beginPath();
      g.roundRect(60, 560, 200, 140, 60);
      g.fill();
      // seat in front of us: seat back + headrest with the obligatory lace cover
      const seat = g.createLinearGradient(0, 600, 0, H + PAD);
      seat.addColorStop(0, '#2b3854');
      seat.addColorStop(1, '#141b2a');
      g.fillStyle = seat;
      g.beginPath();
      g.roundRect(-60, 640, 640, 400, 46);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.08)';
      g.lineWidth = 3;
      g.beginPath();
      g.roundRect(-40, 660, 600, 380, 40);
      g.stroke();
      g.fillStyle = '#2d3b5a';
      g.beginPath();
      g.roundRect(200, 560, 280, 140, 34);
      g.fill();
      g.fillStyle = 'rgba(238,236,228,0.92)';
      g.beginPath();
      g.roundRect(226, 574, 228, 66, 16);
      g.fill();
      g.strokeStyle = 'rgba(180,176,166,0.9)';
      g.setLineDash([3, 4]);
      g.lineWidth = 2;
      g.beginPath();
      g.roundRect(232, 580, 216, 54, 12);
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = '#7d8290';
      g.font = '800 22px "Work Sans", sans-serif';
      g.textAlign = 'center';
      g.fillText('TAVRINSA LABS', 340, 614);
      g.textAlign = 'left';
      // grab handle on top of the seat
      g.strokeStyle = '#a8abb6';
      g.lineWidth = 8;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(500, 650);
      g.quadraticCurveTo(540, 612, 580, 650);
      g.stroke();
      // our neighbour's shoulder, bottom right
      g.fillStyle = '#0a0b10';
      g.beginPath();
      g.ellipse(1440, 950, 320, 180, -0.1, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(255,170,110,0.25)';
      g.lineWidth = 4;
      g.beginPath();
      g.ellipse(1440, 950, 320, 180, -0.1, Math.PI * 1.1, Math.PI * 1.45);
      g.stroke();
    },
    update(dt) {
      // stop-and-go: creep a few metres, wait, creep again
      phaseT -= dt;
      if (phaseT <= 0) {
        go = !go;
        phaseT = go ? range(r, 2.5, 5) : range(r, 4, 9);
      }
      const target = go ? 2.6 : 0;
      vs += (target - vs) * Math.min(1, dt * (go ? 0.9 : 1.6));
      s += vs * dt;
      // the next lane moves in its own rhythm, bunched behind whoever's ahead
      cars.sort((a, b) => b.rx - a.rx);
      for (let i = 0; i < cars.length; i++) {
        const c = cars[i];
        const ahead = cars[i - 1];
        const gap = ahead ? ahead.rx - ahead.len / 2 - (c.rx + c.len / 2) : 99;
        const want = gap > 2.2 ? Math.min(3.2, (gap - 1.8) * 0.9) * (0.6 + 0.4 * Math.sin(s * 0.3 + i)) : 0;
        c.v += (want - c.v) * Math.min(1, dt * 1.4);
        c.brake += ((c.v < 0.4 || want < c.v - 0.3 ? 1 : 0) - c.brake) * Math.min(1, dt * 5);
        c.rx += (c.v - vs) * dt;
      }
      // wrap cars that fall far behind / pull far ahead
      for (const c of cars) {
        if (c.rx < -44) c.rx += 88;
        if (c.rx > 44) c.rx -= 88;
      }
      // rivulets: stick, then slide, gathering speed
      for (const d of rivulets) {
        if (d.pause > 0) {
          d.pause -= dt;
          continue;
        }
        d.vy = Math.min(220, d.vy + 260 * dt);
        d.y += d.vy * dt;
        d.x += vs * 6 * dt;
        d.trail.push({ x: d.x, y: d.y });
        if (d.trail.length > 40) d.trail.shift();
        if (Math.random() < dt * 1.2) {
          d.pause = range(r, 0.2, 1.2);
          d.vy = 0;
        }
        if (d.y > WIN.y + WIN.h) {
          d.y = WIN.y - 5;
          d.x = range(r, WIN.x + 20, WIN.x + WIN.w - 20);
          d.trail = [];
          d.pause = range(r, 0, 3);
        }
      }
      // fresh drops keep landing on the glass
      for (const d of drops) {
        if (Math.random() < dt * 0.25) {
          d.x = range(r, WIN.x, WIN.x + WIN.w);
          d.y = range(r, WIN.y, WIN.y + WIN.h);
        }
        d.x += vs * 2 * dt;
      }
    },
    draw(g, t, cam: Cam) {
      // ── the street, small ──
      const b = bctx;
      b.setTransform(1, 0, 0, 1, 0, 0);
      b.fillStyle = '#231a20';
      b.fillRect(0, 0, BW, BH);
      drawStrip(b, buildings, KB, 0);
      drawStrip(b, pavement, KS, 0);
      // wet road
      b.fillStyle = vGradient(b, 120, BH, [
        [0, '#2a262c'],
        [1, '#121115'],
      ]);
      b.fillRect(0, 120, BW, BH - 120);
      // the next lane
      for (const c of cars) sideCar(b, c, t);
      // rain outside
      b.strokeStyle = 'rgba(200,210,230,0.25)';
      b.lineWidth = 0.6;
      b.beginPath();
      for (let i = 0; i < 70; i++) {
        const x = (i * 37.3 + t * 40) % BW;
        const y = (i * 53.1 + t * 260) % BH;
        b.moveTo(x, y);
        b.lineTo(x - 1.5 - vs, y - 6);
      }
      b.stroke();

      g.save();
      g.translate(cam.x * 0.3, cam.y * 0.3);
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = 'high';
      g.drawImage(buffer, WIN.x - 20, WIN.y - 10, WIN.w + 40, WIN.h + 20);
      g.restore();

      // ── the glass: condensation, drops, rivulets, reflections ──
      g.save();
      g.beginPath();
      g.roundRect(WIN.x, WIN.y, PILLAR - WIN.x - 14, WIN.h, 26);
      g.roundRect(PILLAR + 14, WIN.y, WIN.x + WIN.w - PILLAR - 14, WIN.h, 26);
      g.clip();
      const fog = g.createLinearGradient(0, WIN.y, 0, WIN.y + WIN.h);
      fog.addColorStop(0, 'rgba(170,180,200,0.12)');
      fog.addColorStop(0.7, 'rgba(170,180,200,0.05)');
      fog.addColorStop(1, 'rgba(190,200,220,0.22)');
      g.fillStyle = fog;
      g.fillRect(WIN.x, WIN.y, WIN.w, WIN.h);
      const sx = BW / (WIN.w + 40);
      const sy = BH / (WIN.h + 20);
      for (const d of drops) {
        // each drop is a tiny lens: the street behind it, flipped
        const bx = (d.x - (WIN.x - 20)) * sx;
        const by = (d.y - (WIN.y - 10)) * sy;
        g.save();
        g.beginPath();
        g.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        g.clip();
        g.translate(d.x, d.y);
        g.scale(1, -1);
        const span = d.r * 5;
        g.drawImage(buffer, bx - span * sx, by - span * sy, span * 2 * sx, span * 2 * sy, -d.r, -d.r, d.r * 2, d.r * 2);
        g.restore();
        g.strokeStyle = 'rgba(0,0,0,0.35)';
        g.lineWidth = Math.max(0.6, d.r * 0.18);
        g.beginPath();
        g.arc(d.x, d.y + d.r * 0.1, d.r * 0.92, 0.15 * Math.PI, 0.85 * Math.PI);
        g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.55)';
        g.beginPath();
        g.arc(d.x - d.r * 0.35, d.y - d.r * 0.4, Math.max(0.6, d.r * 0.2), 0, Math.PI * 2);
        g.fill();
      }
      for (const d of rivulets) {
        if (d.trail.length > 1) {
          g.strokeStyle = 'rgba(200,210,230,0.18)';
          g.lineWidth = d.r * 0.7;
          g.lineCap = 'round';
          g.beginPath();
          g.moveTo(d.trail[0].x, d.trail[0].y);
          for (const p of d.trail) g.lineTo(p.x, p.y);
          g.stroke();
        }
        g.fillStyle = 'rgba(210,220,240,0.35)';
        g.beginPath();
        g.ellipse(d.x, d.y, d.r * 0.8, d.r * 1.15, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.6)';
        g.beginPath();
        g.arc(d.x - d.r * 0.3, d.y - d.r * 0.4, d.r * 0.22, 0, Math.PI * 2);
        g.fill();
      }
      // the bus's own blue LED strip reflected in the glass
      g.globalCompositeOperation = 'lighter';
      glowRect(g, W / 2, WIN.y + 40, WIN.w * 1.1, 26, [70, 110, 200], 0.18);
      g.globalCompositeOperation = 'source-over';
      g.restore();

      // ── inside the bus ──
      g.drawImage(interior, -PAD, -PAD, W + PAD * 2, H + PAD * 2);
      g.globalCompositeOperation = 'lighter';
      glowRect(g, W / 2, 78, W * 1.2, 10, [80, 120, 230], 0.6);
      glowRect(g, W / 2, 96, W * 1.2, 60, [60, 90, 200], 0.14);
      // the colleague's phone lighting up their face
      glow(g, 175, 548, 40, [150, 200, 255], 0.5);
      glowRect(g, 196, 566, 18, 11, [210, 230, 255], 0.9);
      // street light washing over the sill as we creep past
      const wash = 0.12 + 0.08 * Math.sin(s * 0.9);
      glowRect(g, 900, WIN.y + WIN.h + 18, 1400, 40, [255, 170, 110], wash);
      g.globalCompositeOperation = 'source-over';
    },
  };
}
