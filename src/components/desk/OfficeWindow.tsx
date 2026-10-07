import { useEffect, useRef } from 'react';
import { WORKDAY_END_MIN } from '../../game/time';
import { prefersReducedMotion } from '../ui/motion';

/*
 * Ofis penceresi: Ataşehir Finans Merkezi'nin kuleleri. Gökyüzü saati izler (soluk
 * bir kış sabahı, düz bir öğlen, üç buçukta altın, beşte mavi) ve günün havasını; hava kararırken
 * ofis ışıkları kat kat yanar. Çarşamba camdan yağmur süzülür, Perşembe kar geçer.
 */

export type WindowWeather = 'sunny' | 'windy' | 'rainy' | 'snowy' | 'cloudy';

const VW = 560;
const VH = 340;

type RGB = [number, number, number];
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

/** Mesai boyunca dakikaya göre gökyüzünün ana renkleri (üst, ufuk). */
const SKY: [number, RGB, RGB][] = [
  [0, [120, 150, 190], [236, 206, 180]],
  [90, [104, 150, 204], [206, 222, 236]],
  [300, [92, 146, 208], [196, 218, 238]],
  [430, [96, 132, 190], [240, 200, 150]],
  [490, [70, 84, 140], [250, 150, 110]],
  [520, [36, 46, 92], [190, 110, 110]],
  [WORKDAY_END_MIN, [16, 22, 52], [70, 64, 104]],
];

function skyAt(min: number): [RGB, RGB] {
  for (let i = 1; i < SKY.length; i++) {
    if (min <= SKY[i][0]) {
      const [m0, t0, h0] = SKY[i - 1];
      const [m1, t1, h1] = SKY[i];
      const f = (min - m0) / (m1 - m0);
      return [mix(t0, t1, f), mix(h0, h1, f)];
    }
  }
  return [SKY[SKY.length - 1][1], SKY[SKY.length - 1][2]];
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

interface Tower {
  x: number;
  w: number;
  top: number;
  depth: number;
  glass: RGB;
  crown: number;
  floors: { y: number; lit: number; warm: boolean }[];
  cols: number;
}

function makeTowers(): Tower[] {
  const r = rng(77);
  const out: Tower[] = [];
  // üç sıra: puslu uzak silüet, Levent kümesi, sokağın karşısındaki ofis bloğu
  const rows = [
    { n: 11, top: [120, 210], w: [28, 60], depth: 0 },
    { n: 7, top: [30, 150], w: [46, 90], depth: 1 },
    { n: 3, top: [150, 230], w: [140, 220], depth: 2 },
  ];
  for (const row of rows) {
    for (let i = 0; i < row.n; i++) {
      const w = row.w[0] + r() * (row.w[1] - row.w[0]);
      const x = row.depth === 2 ? -40 + i * 250 + r() * 60 : -20 + r() * (VW + 20);
      const top = row.top[0] + r() * (row.top[1] - row.top[0]);
      const glass: RGB = row.depth === 0 ? [150, 160, 180] : r() < 0.5 ? [70, 110, 140] : r() < 0.5 ? [90, 120, 130] : [120, 128, 140];
      const floorH = row.depth === 2 ? 14 : row.depth === 1 ? 7 : 4;
      const floors = [];
      for (let y = top + 6; y < VH; y += floorH) floors.push({ y, lit: r(), warm: r() < 0.3 });
      out.push({ x, w, top, depth: row.depth, glass, crown: r(), floors, cols: Math.max(3, Math.round(w / (row.depth === 2 ? 16 : 8))) });
    }
  }
  return out.sort((a, b) => a.depth - b.depth);
}

export function OfficeWindow({ minutes, weather, className }: { minutes: number; weather: WindowWeather; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const minRef = useRef(minutes);
  useEffect(() => {
    minRef.current = minutes;
  }, [minutes]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const g = canvas.getContext('2d');
    if (!g) return;
    const towers = makeTowers();
    const r = rng(5);
    const flakes = Array.from({ length: weather === 'snowy' ? 170 : weather === 'rainy' ? 140 : 0 }, () => ({ x: r() * VW, y: r() * VH, z: 0.4 + r() * 0.8, p: r() * 6 }));
    const drops = Array.from({ length: weather === 'rainy' ? 60 : 0 }, () => ({ x: r() * VW, y: r() * VH, s: 1 + r() * 2.6, v: 0, hold: r() * 4 }));
    const clouds = Array.from({ length: 7 }, () => ({ x: r() * VW * 1.4 - 100, y: 10 + r() * 110, w: 120 + r() * 200, h: 20 + r() * 26 }));
    const birds = Array.from({ length: weather === 'sunny' ? 4 : 0 }, () => ({ x: r() * VW, y: 60 + r() * 60, v: 12 + r() * 10, p: r() * 6 }));
    const overcast = weather === 'rainy' || weather === 'snowy' ? 0.75 : weather === 'windy' ? 0.35 : weather === 'cloudy' ? 0.45 : 0.05;
    const wind = weather === 'windy' ? 1 : weather === 'rainy' ? 0.5 : 0.25;

    let raf = 0;
    let last = performance.now();
    let t = 0;
    let skip = false;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const still = prefersReducedMotion();
    const frame = (now: number) => {
      // hareket azaltılmışsa pencere tek bir kare olarak çizilir ve öyle kalır
      if (!still) raf = requestAnimationFrame(frame);
      skip = !skip && !still;
      if (skip) return; // bir pencere için 30 fps yeter
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      t += dt;
      const min = minRef.current;
      g.setTransform(canvas.width / VW, 0, 0, canvas.height / VH, 0, 0);

      // gökyüzü
      let [top, hor] = skyAt(min);
      const grey: RGB = [150, 156, 166];
      top = mix(top, mix(grey, top, 0.3), overcast);
      hor = mix(hor, mix(grey, hor, 0.45), overcast);
      const sky = g.createLinearGradient(0, 0, 0, VH);
      sky.addColorStop(0, css(top));
      sky.addColorStop(0.75, css(hor));
      sky.addColorStop(1, css(mix(hor, [255, 255, 255], 0.1)));
      g.fillStyle = sky;
      g.fillRect(0, 0, VW, VH);
      const dusk = Math.max(0, Math.min(1, (min - 430) / 110));

      // alçak kış güneşi, batıda (sağda), günün sonunda kulelerin arkasında
      if (overcast < 0.6) {
        const sx = 420 + (min / WORKDAY_END_MIN) * 120;
        const sy = 70 + Math.pow(min / WORKDAY_END_MIN, 2) * 220;
        const sun = g.createRadialGradient(sx, sy, 0, sx, sy, 160);
        sun.addColorStop(0, css(mix([255, 250, 230], [255, 170, 100], dusk), 0.9 * (1 - overcast)));
        sun.addColorStop(0.12, css([255, 220, 170], 0.35 * (1 - overcast)));
        sun.addColorStop(1, 'rgba(255,200,150,0)');
        g.fillStyle = sun;
        g.fillRect(0, 0, VW, VH);
      }

      // rüzgârla süzülen bulutlar
      for (const c of clouds) {
        c.x += dt * (4 + wind * 14) * (0.5 + c.y / 200);
        if (c.x - c.w > VW) c.x = -c.w * 1.2;
        const cg = g.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.w * 0.6);
        const cc = mix(mix([255, 255, 255], [255, 190, 150], dusk * 0.7), [40, 44, 60], Math.max(0, (min - 500) / 60));
        cg.addColorStop(0, css(cc, 0.18 + overcast * 0.45));
        cg.addColorStop(1, css(cc, 0));
        g.fillStyle = cg;
        g.beginPath();
        g.ellipse(c.x, c.y, c.w * 0.6, c.h, 0, 0, Math.PI * 2);
        g.fill();
      }

      // açık bir sabahta kuşlar
      g.strokeStyle = 'rgba(40,44,56,0.7)';
      g.lineWidth = 1;
      for (const b of birds) {
        b.x += b.v * dt;
        b.p += dt * 7;
        if (b.x > VW + 20) b.x = -20;
        const f = Math.sin(b.p) * 2.5;
        g.beginPath();
        g.moveTo(b.x - 5, b.y - f);
        g.quadraticCurveTo(b.x - 2, b.y - 2, b.x, b.y);
        g.quadraticCurveTo(b.x + 2, b.y - 2, b.x + 5, b.y - f);
        g.stroke();
      }

      // kuleler
      const haze = css(mix(hor, [200, 204, 214], overcast * 0.6));
      for (const tw of towers) {
        const shade = tw.depth === 0 ? 0.55 : tw.depth === 1 ? 0.8 : 1;
        const body = mix(tw.glass, top, tw.depth === 0 ? 0.55 : 0.18);
        const lit = mix(body, [14, 18, 30], dusk * 0.75);
        const bg = g.createLinearGradient(tw.x, 0, tw.x + tw.w, 0);
        bg.addColorStop(0, css(mix(lit, [255, 255, 255], 0.12 * (1 - dusk))));
        bg.addColorStop(0.55, css(lit));
        bg.addColorStop(1, css(mix(lit, [0, 0, 0], 0.25)));
        g.fillStyle = bg;
        g.fillRect(tw.x, tw.top, tw.w, VH - tw.top);
        // bazı kulelerde bir taç ya da eğik bir çatı
        if (tw.depth === 1 && tw.crown > 0.55) {
          g.beginPath();
          g.moveTo(tw.x, tw.top);
          g.lineTo(tw.x + tw.w * (tw.crown > 0.8 ? 0.5 : 1), tw.top - 22);
          g.lineTo(tw.x + tw.w, tw.top);
          g.fill();
        }
        // giydirme cephede yansıyan gökyüzü
        if (tw.depth > 0) {
          const rf = g.createLinearGradient(0, tw.top, 0, VH);
          rf.addColorStop(0, css(hor, 0.28 * (1 - dusk)));
          rf.addColorStop(1, css(hor, 0));
          g.fillStyle = rf;
          g.fillRect(tw.x + tw.w * 0.1, tw.top, tw.w * 0.4, VH - tw.top);
        }
        // katlar: gündüz kayıtlar, hava kararınca ofis ışıkları
        const cw = tw.w / tw.cols;
        for (const fl of tw.floors) {
          g.fillStyle = `rgba(10,14,22,${0.18 * shade})`;
          g.fillRect(tw.x, fl.y, tw.w, tw.depth === 2 ? 2 : 1);
          const on = fl.lit < 0.25 + dusk * 0.6;
          if (!on) continue;
          const a = (0.25 + dusk * 0.65) * shade;
          g.fillStyle = fl.warm ? `rgba(255,214,150,${a})` : `rgba(226,236,255,${a})`;
          const h = tw.depth === 2 ? 9 : tw.depth === 1 ? 4 : 2;
          for (let c = 0; c < tw.cols; c++) {
            if ((c * 7 + Math.floor(fl.lit * 97)) % 5 === 0) continue;
            g.fillRect(tw.x + c * cw + 1, fl.y + 2, cw - 2, h);
          }
        }
        // uzunlarda kırmızı uçak ikaz ışıkları
        if (tw.depth === 1 && tw.top < 80 && Math.sin(t * 2.4 + tw.x) > 0.2) {
          g.fillStyle = `rgba(255,60,50,${0.5 + dusk * 0.5})`;
          g.beginPath();
          g.arc(tw.x + tw.w / 2, tw.top - 2, 1.6, 0, Math.PI * 2);
          g.fill();
        }
        if (tw.depth === 0) {
          g.fillStyle = haze;
          g.globalAlpha = 0.35;
          g.fillRect(tw.x, tw.top, tw.w, VH - tw.top);
          g.globalAlpha = 1;
        }
      }

      // havadaki hava durumu
      if (weather === 'snowy') {
        g.fillStyle = 'rgba(255,255,255,0.85)';
        for (const f of flakes) {
          f.y += dt * 22 * f.z;
          f.x += dt * (Math.sin(t * 0.8 + f.p) * 8 + 6) * f.z;
          if (f.y > VH) {
            f.y = -4;
            f.x = Math.random() * VW;
          }
          if (f.x > VW) f.x -= VW;
          g.beginPath();
          g.arc(f.x, f.y, 0.8 + f.z * 1.3, 0, Math.PI * 2);
          g.fill();
        }
      } else if (weather === 'rainy') {
        g.strokeStyle = 'rgba(210,220,236,0.35)';
        g.lineWidth = 0.8;
        g.beginPath();
        for (const f of flakes) {
          f.y += dt * 420 * f.z;
          f.x += dt * 60 * f.z;
          if (f.y > VH) {
            f.y = -10;
            f.x = Math.random() * VW;
          }
          if (f.x > VW) f.x -= VW;
          g.moveTo(f.x, f.y);
          g.lineTo(f.x - 2.2 * f.z, f.y - 11 * f.z);
        }
        g.stroke();
        // camdaki damlalar, ara ara aşağı kayıyor
        for (const d of drops) {
          if (d.hold > 0) d.hold -= dt;
          else {
            d.v = Math.min(90, d.v + dt * 140);
            d.y += d.v * dt;
            if (Math.random() < dt * 1.5) {
              d.hold = Math.random() * 2;
              d.v = 0;
            }
            if (d.y > VH + 5) {
              d.y = -5;
              d.x = Math.random() * VW;
            }
          }
          g.fillStyle = 'rgba(20,26,40,0.28)';
          g.beginPath();
          g.ellipse(d.x, d.y + d.s * 0.3, d.s, d.s * 1.2, 0, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = 'rgba(255,255,255,0.55)';
          g.beginPath();
          g.arc(d.x - d.s * 0.35, d.y - d.s * 0.3, d.s * 0.35, 0, Math.PI * 2);
          g.fill();
        }
      }
      if (overcast > 0.5) {
        g.fillStyle = `rgba(200,206,216,${(overcast - 0.5) * 0.35})`;
        g.fillRect(0, 0, VW, VH);
      }
      // camın kendisi: odanın soluk bir yansıması
      const glass = g.createLinearGradient(0, 0, VW, VH);
      glass.addColorStop(0, 'rgba(255,255,255,0.06)');
      glass.addColorStop(0.45, 'rgba(255,255,255,0)');
      glass.addColorStop(0.5, 'rgba(255,255,255,0.05)');
      glass.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = glass;
      g.fillRect(0, 0, VW, VH);
    };
    // pencere görünmezken çizecek bir şey yok (kaydırılmış ya da paneli gizli)
    const io = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(raf);
      if (entry.isIntersecting) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    });
    io.observe(canvas);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [weather]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
