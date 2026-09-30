import { useEffect, useRef } from 'react';
import { glow, makeRng, vGradient, type Rng } from '../../components/dayend/city/kit';

/*
 * The view from your living-room window on Friday night: not the Bosphorus — the block across
 * the street. Apartments crammed wall to wall at every height, satellite dishes and AC boxes,
 * an illegal extra floor in a different colour, laundry strung between balconies, cables over
 * the street, a crane in the distance. Right opposite, a building already emptied for demolition:
 * blind windows, a bricked-up corner, and the white banner every Istanbul street knows.
 */

const VW = 800;
const VH = 520;

type RGB = [number, number, number];
const rgb = ([r, g, b]: RGB, a = 1) => `rgba(${r},${g},${b},${a})`;

interface Win {
  x: number;
  y: number;
  w: number;
  h: number;
  lit: boolean;
  warm: boolean;
  tv: boolean;
}

/** One apartment block: a lit front and a shadowed side face, plaster grain, framed windows,
 * balconies with iron railings, a shuttered shop at street level, rooftop clutter. */
function block(b: CanvasRenderingContext2D, r: Rng, x: number, w: number, top: number, color: RGB, wins: Win[], extraFloor?: RGB) {
  const floorH = 30;
  const side = 14;
  const shade = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];
  // side face in shadow, then the front
  b.fillStyle = rgb(shade(color, 0.55));
  b.beginPath();
  b.moveTo(x + w, top);
  b.lineTo(x + w + side, top + 8);
  b.lineTo(x + w + side, VH);
  b.lineTo(x + w, VH);
  b.fill();
  const grad = b.createLinearGradient(0, top, 0, VH);
  grad.addColorStop(0, rgb(shade(color, 0.8)));
  grad.addColorStop(1, rgb(shade(color, 1.05)));
  b.fillStyle = grad;
  b.fillRect(x, top, w, VH - top);
  // plaster grain and rain streaks
  for (let i = 0; i < (w * (VH - top)) / 60; i++) {
    b.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)';
    b.fillRect(x + r() * w, top + r() * (VH - top), 1.2, 1.2);
  }
  for (let i = 0; i < 4; i++) {
    b.fillStyle = 'rgba(0,0,0,0.06)';
    b.fillRect(x + r() * w, top, 2 + r() * 3, (VH - top) * (0.3 + r() * 0.5));
  }
  if (extraFloor) {
    // the illegal floor: a different colour, a different window, no eaves
    b.fillStyle = rgb(extraFloor);
    b.fillRect(x + 6, top - floorH, w - 12, floorH);
    b.fillStyle = 'rgba(0,0,0,0.25)';
    b.fillRect(x + 6, top - 2, w - 12, 2);
    top -= floorH;
  }
  // rooftop: parapet, water tank, dish, antenna
  b.fillStyle = rgb(shade(color, 0.6));
  b.fillRect(x - 2, top - 4, w + 4, 4);
  if (r() < 0.7) {
    b.fillStyle = '#2b2d33';
    b.fillRect(x + w * 0.2, top - 18, 24, 14);
    b.fillStyle = '#3a3d44';
    b.fillRect(x + w * 0.2, top - 18, 24, 3);
  }
  if (r() < 0.8) {
    b.fillStyle = '#c9c6bd';
    b.beginPath();
    b.ellipse(x + w * 0.65, top - 10, 9, 6, -0.5, 0, Math.PI * 2);
    b.fill();
    b.strokeStyle = '#8f8c84';
    b.beginPath();
    b.moveTo(x + w * 0.65, top - 10);
    b.lineTo(x + w * 0.65 + 6, top - 2);
    b.stroke();
  }
  b.strokeStyle = 'rgba(20,20,24,0.9)';
  b.beginPath();
  b.moveTo(x + w * 0.85, top - 4);
  b.lineTo(x + w * 0.85, top - 30);
  b.moveTo(x + w * 0.85 - 8, top - 24);
  b.lineTo(x + w * 0.85 + 8, top - 24);
  b.stroke();

  const cols = Math.max(2, Math.floor((w - 14) / 30));
  const gap = (w - cols * 18) / (cols + 1);
  const shopTop = VH - 44;
  for (let fy = top + 10; fy < shopTop - 20; fy += floorH) {
    for (let c = 0; c < cols; c++) {
      const wx = x + gap + c * (18 + gap);
      const lit = r() < 0.42;
      const warm = r() < 0.78;
      // white PVC frame and a sill
      b.fillStyle = '#d9d6ce';
      b.fillRect(wx - 2, fy - 2, 22, 20);
      b.fillStyle = 'rgba(0,0,0,0.25)';
      b.fillRect(wx - 3, fy + 18, 24, 2);
      wins.push({ x: wx, y: fy, w: 18, h: 16, lit, warm, tv: lit && !warm && r() < 0.4 });
      if (r() < 0.12) {
        b.fillStyle = '#e2dfd6';
        b.fillRect(wx + 21, fy + 5, 12, 9);
        b.fillStyle = 'rgba(0,0,0,0.3)';
        b.fillRect(wx + 23, fy + 7, 8, 5);
      }
    }
    // a balcony every other floor: slab + iron railing
    if (((fy - top) / floorH) % 2 < 1) {
      b.fillStyle = 'rgba(0,0,0,0.35)';
      b.fillRect(x + 4, fy + 23, w * 0.45, 3);
      b.strokeStyle = 'rgba(25,25,28,0.85)';
      b.lineWidth = 1;
      b.beginPath();
      b.moveTo(x + 4, fy + 14);
      b.lineTo(x + 4 + w * 0.45, fy + 14);
      for (let rx = x + 6; rx < x + 4 + w * 0.45; rx += 4) {
        b.moveTo(rx, fy + 14);
        b.lineTo(rx, fy + 23);
      }
      b.stroke();
    }
  }
  // street level: a shop with its shutter down, a lit sign on one
  b.fillStyle = '#2a2a2e';
  b.fillRect(x + 6, shopTop, w - 12, 34);
  b.strokeStyle = 'rgba(255,255,255,0.08)';
  for (let yy = shopTop + 3; yy < shopTop + 34; yy += 3) {
    b.beginPath();
    b.moveTo(x + 6, yy);
    b.lineTo(x + w - 6, yy);
    b.stroke();
  }
  if (r() < 0.5) {
    b.fillStyle = r() < 0.5 ? '#e8d27a' : '#c9e0f2';
    b.fillRect(x + 12, shopTop - 12, w * 0.5, 9);
  }
}

/** The emptied building opposite, with the banner. */
function condemned(b: CanvasRenderingContext2D, r: Rng) {
  const x = 150;
  const w = 260;
  const top = 120;
  // granite-chip facade
  b.fillStyle = '#6f6b66';
  b.fillRect(x, top, w, VH - top);
  for (let i = 0; i < 1400; i++) {
    b.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)';
    b.fillRect(x + r() * w, top + r() * (VH - top), 1.5, 1.5);
  }
  // blind windows: frames already torn out
  for (let fy = top + 18; fy < VH - 30; fy += 58) {
    for (const wx of [x + 14, x + w - 70]) {
      b.fillStyle = '#16140f';
      b.fillRect(wx, fy, 56, 36);
      b.fillStyle = 'rgba(0,0,0,0.3)';
      b.fillRect(wx, fy + 36, 56, 5);
    }
  }
  // a bricked-up bay on the right
  b.fillStyle = '#8a4a34';
  b.fillRect(x + w - 70, top + 18, 56, 36);
  b.strokeStyle = 'rgba(40,20,10,0.5)';
  b.lineWidth = 1;
  for (let yy = top + 22; yy < top + 54; yy += 6) {
    b.beginPath();
    b.moveTo(x + w - 70, yy);
    b.lineTo(x + w - 14, yy);
    b.stroke();
  }

  // the banner, drawn a quarter larger so it reads through the window
  b.save();
  const ox = x + 52;
  b.translate(ox, top + 20);
  b.scale(1.3, 1.3);
  b.translate(-ox, -(top + 20));
  const bx = x + 52;
  const bw = 120;
  const by = top + 20;
  const bh = 190;
  b.fillStyle = 'rgba(0,0,0,0.35)';
  b.fillRect(bx + 4, by + 4, bw, bh);
  b.fillStyle = '#f1efe8';
  b.fillRect(bx, by, bw, bh);
  // ropes at the corners
  b.strokeStyle = '#d8d4c8';
  b.beginPath();
  b.moveTo(bx, by);
  b.lineTo(bx - 12, by - 14);
  b.moveTo(bx + bw, by);
  b.lineTo(bx + bw + 12, by - 14);
  b.moveTo(bx, by + bh);
  b.lineTo(bx - 16, by + bh + 20);
  b.stroke();
  const cx = bx + bw / 2;
  const line = (text: string, y: number, size: number, color: string, weight = 800) => {
    b.fillStyle = color;
    b.font = `${weight} ${size}px "Work Sans", Arial, sans-serif`;
    b.textAlign = 'center';
    b.fillText(text, cx, y, bw - 10);
  };
  line('BU BİNA', by + 22, 16, '#2b2d33');
  line('KENTSEL DÖNÜŞÜM', by + 54, 11, '#2b2d33');
  line('PROJESİ OLARAK', by + 68, 10, '#2b2d33');
  line('YÜKLENİCİ', by + 92, 17, '#c8412b', 900);
  line('FİRMA', by + 110, 17, '#2b2d33', 900);
  line('TARAFINDAN YAPILMAKTADIR.', by + 128, 7, '#c8412b', 800);
  line('ÇEVREYE VERDİĞİMİZ', by + 148, 8, '#2b2d33', 700);
  line('RAHATSIZLIKTAN DOLAYI', by + 160, 8, '#2b2d33', 700);
  line('ÖZÜR DİLERİZ...', by + 172, 8, '#2b2d33', 700);
  // the banner sags a little in the middle
  b.fillStyle = 'rgba(0,0,0,0.06)';
  b.fillRect(bx, by + bh * 0.45, bw, 14);
  b.restore();
}

export function WindowView({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const g = canvas.getContext('2d');
    if (!g) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = VW * dpr;
    canvas.height = VH * dpr;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // static backdrop
    const bg = document.createElement('canvas');
    bg.width = canvas.width;
    bg.height = canvas.height;
    const b = bg.getContext('2d')!;
    b.scale(dpr, dpr);
    const r = makeRng(41);

    // a city sky: no stars, the low clouds lit orange from below
    b.fillStyle = vGradient(b, 0, VH, [
      [0, '#0c0f1a'],
      [0.45, '#241f2c'],
      [1, '#4b3328'],
    ]);
    b.fillRect(0, 0, VW, VH);

    // far layer: a wall of blocks, windows as specks
    const far: Win[] = [];
    for (let x = -10; x < VW; ) {
      const w = 40 + r() * 60;
      const top = 150 + r() * 90;
      b.fillStyle = '#1b1c24';
      b.fillRect(x, top, w, VH - top);
      for (let yy = top + 6; yy < VH; yy += 12)
        for (let xx = x + 5; xx < x + w - 5; xx += 9) if (r() < 0.25) far.push({ x: xx, y: yy, w: 3, h: 4, lit: true, warm: r() < 0.8, tv: false });
      x += w - 4;
    }
    for (const f of far) {
      b.fillStyle = f.warm ? 'rgba(255,196,120,0.55)' : 'rgba(170,200,255,0.45)';
      b.fillRect(f.x, f.y, f.w, f.h);
    }

    // far on the skyline: a mosque's dome and two minarets, hazy
    b.fillStyle = '#23222b';
    b.beginPath();
    b.arc(470, 150, 34, Math.PI, 0);
    b.fill();
    b.fillRect(436, 150, 68, 14);
    for (const mx of [424, 516]) {
      b.fillRect(mx - 4, 70, 8, 94);
      b.beginPath();
      b.moveTo(mx - 5, 70);
      b.lineTo(mx, 48);
      b.lineTo(mx + 5, 70);
      b.fill();
      b.fillRect(mx - 7, 104, 14, 4);
    }
    glow(b, 424, 100, 10, [255, 220, 150], 0.25);
    glow(b, 516, 100, 10, [255, 220, 150], 0.25);

    // the crane
    b.strokeStyle = '#141419';
    b.lineWidth = 3;
    b.beginPath();
    b.moveTo(640, VH);
    b.lineTo(640, 60);
    b.moveTo(560, 70);
    b.lineTo(780, 70);
    b.stroke();
    b.lineWidth = 1;
    b.beginPath();
    b.moveTo(640, 60);
    b.lineTo(580, 70);
    b.moveTo(640, 60);
    b.lineTo(760, 70);
    b.moveTo(720, 70);
    b.lineTo(720, 130);
    b.stroke();

    // mid layer: the blocks around the emptied one, wall to wall
    const wins: Win[] = [];
    const palette: RGB[] = [
      [150, 134, 112],
      [122, 112, 104],
      [168, 128, 118],
      [110, 118, 120],
      [146, 140, 118],
    ];
    block(b, r, -10, 170, 170, palette[0], wins, [176, 150, 120]);
    block(b, r, 410, 130, 90, palette[2], wins);
    block(b, r, 536, 150, 150, palette[3], wins, [150, 160, 150]);
    block(b, r, 682, 130, 110, palette[4], wins);
    for (const w of wins) {
      b.fillStyle = w.lit ? (w.warm ? '#f2c883' : '#9fb8d8') : '#1e1c1a';
      b.fillRect(w.x, w.y, w.w, w.h);
      if (w.lit) {
        // a curtain in some lit windows
        if (r() < 0.5) {
          b.fillStyle = 'rgba(120,60,40,0.35)';
          b.fillRect(w.x, w.y, w.w * 0.4, w.h);
        }
      }
    }

    // the building opposite, and the banner on it
    condemned(b, r);

    // laundry between two balconies on the left block
    b.strokeStyle = 'rgba(220,220,210,0.6)';
    b.beginPath();
    b.moveTo(20, 312);
    b.quadraticCurveTo(80, 322, 140, 312);
    b.stroke();
    for (let i = 0; i < 6; i++) {
      b.fillStyle = ['#c24b3a', '#e8e3d6', '#3b5b8a', '#e8c24a', '#e8e3d6', '#6a8a5a'][i];
      b.fillRect(28 + i * 18, 314 + Math.sin(i) * 2, 10, 14 + (i % 2) * 5);
    }

    // cables over the street
    b.strokeStyle = 'rgba(10,10,12,0.8)';
    b.lineWidth = 1.2;
    for (const [y0, y1, sag] of [
      [260, 230, 40],
      [300, 280, 30],
    ]) {
      b.beginPath();
      b.moveTo(0, y0);
      b.quadraticCurveTo(VW / 2, (y0 + y1) / 2 + sag, VW, y1);
      b.stroke();
    }

    // the pavement and a parked car
    b.fillStyle = '#3a3634';
    b.fillRect(0, VH - 10, VW, 10);
    b.fillStyle = '#1a1b20';
    b.beginPath();
    b.moveTo(470, VH - 8);
    b.lineTo(478, VH - 26);
    b.lineTo(505, VH - 36);
    b.lineTo(560, VH - 36);
    b.lineTo(582, VH - 24);
    b.lineTo(600, VH - 22);
    b.lineTo(602, VH - 8);
    b.fill();
    b.fillStyle = 'rgba(160,190,220,0.35)';
    b.fillRect(510, VH - 33, 45, 9);
    b.fillStyle = '#0c0c0e';
    b.beginPath();
    b.arc(500, VH - 8, 8, 0, Math.PI * 2);
    b.arc(575, VH - 8, 8, 0, Math.PI * 2);
    b.fill();
    // a thin haze the street light hangs in
    b.fillStyle = vGradient(b, 280, VH, [
      [0, 'rgba(120,90,70,0)'],
      [1, 'rgba(120,90,70,0.28)'],
    ]);
    b.fillRect(0, 280, VW, VH - 280);

    // a street tree in the foreground, bare branches against the light
    b.strokeStyle = '#0f0e0d';
    b.lineCap = 'round';
    const branch = (x: number, y: number, len: number, ang: number, w: number, depth: number) => {
      if (depth === 0 || len < 6) return;
      const x2 = x + Math.cos(ang) * len;
      const y2 = y + Math.sin(ang) * len;
      b.lineWidth = w;
      b.beginPath();
      b.moveTo(x, y);
      b.lineTo(x2, y2);
      b.stroke();
      branch(x2, y2, len * 0.72, ang - 0.4 - r() * 0.2, w * 0.68, depth - 1);
      branch(x2, y2, len * 0.7, ang + 0.35 + r() * 0.2, w * 0.66, depth - 1);
    };
    branch(760, VH, 110, -Math.PI / 2 - 0.08, 9, 6);

    // the street light below, catching the banner
    b.globalCompositeOperation = 'lighter';
    glow(b, 300, 470, 220, [255, 170, 90], 0.35);
    glow(b, 280, 230, 150, [255, 200, 140], 0.18);
    b.globalCompositeOperation = 'source-over';

    // a few windows change during the evening; one is a TV
    const live = wins.filter((w) => w.tv || r() < 0.08);
    const phase = live.map(() => r() * 40);

    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      const t = (now - start) / 1000;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.drawImage(bg, 0, 0, VW, VH);
      live.forEach((w, i) => {
        if (w.tv) {
          const f = 0.35 + 0.35 * Math.abs(Math.sin(t * 7 + phase[i]) * Math.sin(t * 3.1 + i));
          g.fillStyle = `rgba(150,190,255,${f})`;
          g.fillRect(w.x, w.y, w.w, w.h);
        } else {
          const on = Math.sin(t / 6 + phase[i]) > 0;
          g.fillStyle = on ? '#f2c883' : '#1e1c1a';
          g.fillRect(w.x, w.y, w.w, w.h);
        }
      });
      // the crane's warning light
      if (Math.floor(t * 1.2) % 2 === 0) glow(g, 640, 58, 7, [255, 60, 50], 0.9, true);
      if (!still) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
