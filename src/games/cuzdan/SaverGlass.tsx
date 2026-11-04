import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../../shared/motion';
import { ITEMS, type Year } from './data';
import { money } from './model';
import s from './Shell.module.css';

/*
 * 2009–2012'nin ekran koruyucusu: kutup ışığı perdeleri dalgalanır, ortada dev bir cam ₺ sikkesi
 * döner ve yansıması altında titreşir; alttan cam baloncuklar
 * yükselir. Büyük baloncukların içinde o yılın bir fiyatı yazar ("Simit 1 TL"); üstte sönerken
 * küçük bir parıltı bırakır. Hareket azaltılınca tek kare: perde ve birkaç duran baloncuk.
 */

interface Bubble {
  x: number;
  y: number;
  r: number;
  vy: number;
  phase: number;
  label: string | null;
  hue: number;
}

/** Ortada dönen cam ₺ sikkesi: yatay ölçek kosinüsle daralıp genişler, altında soluk yansıması. */
function drawCoin(c: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const R = Math.min(w, h) * 0.16;
  const cx = w / 2;
  const cy = h * 0.42;
  const sx = Math.cos(t / 1800);
  for (const mirror of [false, true]) {
    c.save();
    c.translate(cx, mirror ? cy + R * 2.25 : cy);
    c.scale(Math.max(0.04, Math.abs(sx)), mirror ? -0.55 : 1);
    c.globalAlpha = mirror ? 0.18 : 0.9;
    const g = c.createLinearGradient(-R, -R, R, R);
    g.addColorStop(0, 'rgba(255,240,190,.95)');
    g.addColorStop(0.45, 'rgba(232,185,35,.55)');
    g.addColorStop(1, 'rgba(120,80,10,.75)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(0, 0, R, 0, Math.PI * 2);
    c.fill();
    c.lineWidth = R * 0.08;
    c.strokeStyle = 'rgba(255,255,255,.55)';
    c.stroke();
    c.beginPath();
    c.arc(0, 0, R * 0.8, 0, Math.PI * 2);
    c.lineWidth = 2;
    c.strokeStyle = 'rgba(255,255,255,.35)';
    c.stroke();
    if (Math.abs(sx) > 0.25) {
      c.fillStyle = 'rgba(255,255,255,.9)';
      c.font = `700 ${Math.round(R * 1.1)}px "Segoe UI", Tahoma, sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('₺', 0, R * 0.05);
    }
    // cam parlaması
    c.fillStyle = 'rgba(255,255,255,.35)';
    c.beginPath();
    c.ellipse(-R * 0.25, -R * 0.45, R * 0.6, R * 0.25, -0.5, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
}

function drawBubble(c: CanvasRenderingContext2D, b: Bubble, t: number) {
  const x = b.x + Math.sin(t / 900 + b.phase) * 14;
  const g = c.createRadialGradient(x - b.r * 0.35, b.y - b.r * 0.4, b.r * 0.1, x, b.y, b.r);
  g.addColorStop(0, 'rgba(255,255,255,.55)');
  g.addColorStop(0.35, `hsla(${b.hue},90%,70%,.18)`);
  g.addColorStop(0.92, `hsla(${b.hue},90%,75%,.32)`);
  g.addColorStop(1, 'rgba(255,255,255,.7)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, b.y, b.r, 0, Math.PI * 2);
  c.fill();
  // üst parlama
  c.fillStyle = 'rgba(255,255,255,.5)';
  c.beginPath();
  c.ellipse(x - b.r * 0.3, b.y - b.r * 0.55, b.r * 0.42, b.r * 0.18, -0.4, 0, Math.PI * 2);
  c.fill();
  if (b.label) {
    c.fillStyle = 'rgba(255,255,255,.95)';
    c.textAlign = 'center';
    c.font = `600 ${Math.round(b.r * 0.24)}px "Segoe UI", Tahoma, sans-serif`;
    const [a, p] = b.label.split('\n');
    c.fillText(a, x, b.y - b.r * 0.02);
    c.font = `700 ${Math.round(b.r * 0.3)}px "Segoe UI", Tahoma, sans-serif`;
    c.fillText(p, x, b.y + b.r * 0.32);
    c.textAlign = 'start';
  }
}

export function GlassSaver({ year }: { year: Year }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const c = cv?.getContext('2d');
    if (!cv || !c) return;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      cv.width = cv.clientWidth * dpr;
      cv.height = cv.clientHeight * dpr;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    const W = () => cv.clientWidth;
    const H = () => cv.clientHeight;
    let k = 0;
    const spawn = (y?: number): Bubble => {
      const big = Math.random() < 0.4;
      const it = ITEMS[k++ % ITEMS.length];
      return { x: Math.random() * W(), y: y ?? H() + 80, r: big ? 56 + Math.random() * 30 : 8 + Math.random() * 22, vy: big ? 0.35 + Math.random() * 0.3 : 0.6 + Math.random() * 0.8, phase: Math.random() * 6, label: big ? `${it.name}\n${money(it.prices[year], year)}` : null, hue: 160 + Math.random() * 60 };
    };
    const bubbles = Array.from({ length: 22 }, () => spawn(Math.random() * H()));

    const aurora = (t: number) => {
      const w = W();
      const h = H();
      const bg = c.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#020c18');
      bg.addColorStop(1, '#06243a');
      c.fillStyle = bg;
      c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = 'lighter';
      for (let band = 0; band < 3; band++) {
        c.beginPath();
        c.moveTo(0, h);
        for (let x = 0; x <= w; x += 20) c.lineTo(x, h * (0.35 + band * 0.12) + Math.sin(x / (180 + band * 60) + t / (2400 + band * 900)) * 60 + Math.sin(x / 90 + t / 1700) * 12);
        c.lineTo(w, h);
        c.closePath();
        const g = c.createLinearGradient(0, h * 0.2, 0, h);
        g.addColorStop(0, `hsla(${150 + band * 40},90%,60%,.0)`);
        g.addColorStop(0.3, `hsla(${150 + band * 40},95%,58%,.32)`);
        g.addColorStop(1, 'rgba(2,12,24,0)');
        c.fillStyle = g;
        c.fill();
      }
      c.globalCompositeOperation = 'source-over';
    };

    if (prefersReducedMotion()) {
      aurora(0);
      drawCoin(c, W(), H(), 0);
      bubbles.forEach((b) => drawBubble(c, b, 0));
      return () => window.removeEventListener('resize', resize);
    }

    let raf = 0;
    const frame = (t: number) => {
      aurora(t);
      drawCoin(c, W(), H(), t);
      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i];
        b.y -= b.vy;
        if (b.y < -b.r - 20) bubbles[i] = spawn();
        drawBubble(c, b, t);
      }
      c.fillStyle = 'rgba(255,255,255,.75)';
      c.font = '300 15px "Segoe UI", Tahoma, sans-serif';
      c.fillText(`Cüzdan TL Cam · ${year}`, 24, H() - 24);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [year]);

  return (
    <div className={s.saver} aria-hidden="true">
      <canvas ref={ref} className={s.saverCanvas} />
    </div>
  );
}
