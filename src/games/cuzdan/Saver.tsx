import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../../components/ui/motion';
import type { Year } from './data';
import type { Theme } from './model';
import { FlatSaver } from './SaverFlat';
import { GlassSaver } from './SaverGlass';
import s from './Shell.module.css';

/*
 * 2002–2005'in ekran koruyucusu, "Para Yağmuru": derin lacivert boşlukta banknotlar ve bozukluklar
 * yıldız alanı gibi üstümüze uçar; önünde "Cüzdan TL" cüzdanı süzülür, kenara çarpınca seker
 * ve rengi değişir, cebinden birkaç bozuk para düşer. Köşeye tam çarparsa cüzdan patlar gibi açılır:
 * banknotlar ve bozukluklar etrafa saçılıp yere yağar. Köşeye çok yaklaştığında köşeye oturtulur ki
 * o an arada bir gelsin. Hareket azaltılınca cüzdan ortada durur.
 */

const COLORS = ['#ff4d4d', '#ffb627', '#f4ff3a', '#3df58c', '#4ff0ff', '#6a8cff', '#ff4fa8'];
const NOTES = ['#8e3553', '#35618c', '#7a5626', '#2c6656', '#5f4785'];
const BASE_W = 262;
const BASE_H = 96;

interface Bit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  life: number;
  note: boolean;
  color: string;
}

function drawLogo(c: CanvasRenderingContext2D, x: number, y: number, color: string, k: number) {
  c.save();
  c.translate(x, y);
  c.scale(k, k);
  const g = c.createLinearGradient(0, 14, 0, 84);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.12, color);
  g.addColorStop(1, 'rgba(0,0,0,.55)');
  // cepten çıkan iki banknot
  c.fillStyle = '#5b8f5a';
  c.save();
  c.translate(30, 16);
  c.rotate(-0.18);
  c.fillRect(-4, -14, 50, 22);
  c.restore();
  c.fillStyle = '#e9efe0';
  c.fillRect(12, 2, 54, 22);
  c.strokeStyle = '#6a8a5a';
  c.lineWidth = 1.2;
  c.strokeRect(15, 5, 48, 16);
  c.fillStyle = '#4c6b3c';
  c.font = 'bold 13px Tahoma, sans-serif';
  c.fillText('₺', 35, 18);
  // cüzdan gövdesi: renk + üstten ışık
  c.fillStyle = color;
  c.beginPath();
  c.roundRect(0, 14, 92, 70, 12);
  c.fill();
  c.fillStyle = g;
  c.globalAlpha = 0.45;
  c.fill();
  c.globalAlpha = 1;
  // dikiş
  c.setLineDash([3, 3]);
  c.strokeStyle = 'rgba(255,255,255,.55)';
  c.beginPath();
  c.roundRect(5, 19, 82, 60, 9);
  c.stroke();
  c.setLineDash([]);
  // kapak ve çıtçıt
  c.fillStyle = 'rgba(0,0,0,.3)';
  c.beginPath();
  c.roundRect(50, 36, 48, 28, 9);
  c.fill();
  c.fillStyle = color;
  c.beginPath();
  c.roundRect(52, 38, 44, 22, 8);
  c.fill();
  c.fillStyle = '#e8c547';
  c.beginPath();
  c.arc(84, 49, 5, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#a7841d';
  c.stroke();
  // yazı: Cüzdan TL
  c.fillStyle = color;
  c.font = 'italic bold 34px "Trebuchet MS", sans-serif';
  c.fillText('Cüzdan', 112, 52);
  const w = c.measureText('Cüzdan').width;
  c.fillStyle = '#fff';
  c.font = 'bold 18px "Trebuchet MS", sans-serif';
  c.fillText('TL', 116 + w, 34);
  c.fillStyle = 'rgba(255,255,255,.7)';
  c.font = '12px Tahoma, sans-serif';
  c.fillText('1.000.000 → 1', 114, 76);
  c.restore();
}

function drawBit(c: CanvasRenderingContext2D, b: Bit) {
  c.save();
  c.globalAlpha = Math.min(1, b.life);
  c.translate(b.x, b.y);
  c.rotate(b.rot);
  if (b.note) {
    c.fillStyle = b.color;
    c.fillRect(-18, -9, 36, 18);
    c.strokeStyle = 'rgba(255,255,255,.6)';
    c.strokeRect(-15, -6, 30, 12);
    c.fillStyle = '#fff';
    c.font = 'bold 10px Tahoma, sans-serif';
    c.fillText('₺', -3, 4);
  } else {
    c.scale(Math.abs(Math.cos(b.rot * 2)) * 0.8 + 0.2, 1);
    c.fillStyle = '#e8c547';
    c.beginPath();
    c.arc(0, 0, 8, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#a7841d';
    c.stroke();
  }
  c.restore();
}

export function WalletSaver() {
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
    // geniş ekranda cüzdan büyür
    const k = W() > 1100 ? 1.5 : W() > 700 ? 1.2 : 0.9;
    const LOGO_W = BASE_W * k;
    const LOGO_H = BASE_H * k;

    let color = 0;
    if (prefersReducedMotion()) {
      c.fillStyle = '#000';
      c.fillRect(0, 0, W(), H());
      drawLogo(c, (W() - LOGO_W) / 2, (H() - LOGO_H) / 2, COLORS[0], k);
      return () => window.removeEventListener('resize', resize);
    }

    let x = Math.random() * (W() - LOGO_W);
    let y = Math.random() * (H() - LOGO_H);
    let vx = 2.2;
    let vy = 1.7;
    const bits: Bit[] = [];
    // arka plan: üstümüze uçan banknotlar ve bozukluklar (perspektifli yıldız alanı)
    const stars = Array.from({ length: 70 }, () => ({ x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: Math.random() * 2 + 0.1, note: Math.random() < 0.45, c: NOTES[Math.floor(Math.random() * NOTES.length)], r: Math.random() * 6 }));
    const field = (w: number, h: number) => {
      const cx = w / 2;
      const cy = h / 2;
      for (const st of stars) {
        st.z -= 0.006;
        st.r += 0.02;
        if (st.z <= 0.08) {
          st.z = 2.1;
          st.x = (Math.random() - 0.5) * 2;
          st.y = (Math.random() - 0.5) * 2;
        }
        const px = cx + (st.x / st.z) * cx * 0.6;
        const py = cy + (st.y / st.z) * cy * 0.6;
        const k = Math.min(1.6, 0.25 / st.z);
        if (px < -60 || px > w + 60 || py < -60 || py > h + 60) continue;
        c.save();
        c.globalAlpha = Math.min(1, (2.1 - st.z) * 0.7) * 0.75;
        c.translate(px, py);
        c.rotate(st.r);
        c.scale(k, k);
        if (st.note) {
          c.fillStyle = st.c;
          c.fillRect(-26, -13, 52, 26);
          c.strokeStyle = 'rgba(255,255,255,.5)';
          c.lineWidth = 2;
          c.strokeRect(-21, -8, 42, 16);
          c.fillStyle = 'rgba(255,255,255,.8)';
          c.font = 'bold 14px Tahoma, sans-serif';
          c.fillText('₺', -4, 5);
        } else {
          c.scale(Math.abs(Math.cos(st.r)) * 0.8 + 0.2, 1);
          c.fillStyle = '#e8c547';
          c.beginPath();
          c.arc(0, 0, 12, 0, Math.PI * 2);
          c.fill();
          c.strokeStyle = '#a7841d';
          c.lineWidth = 2;
          c.stroke();
        }
        c.restore();
      }
    };
    const spill = (cx: number, cy: number, count: number, notes: boolean) => {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 2 + Math.random() * (notes ? 9 : 4);
        bits.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (notes ? 4 : 1), rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, life: 3 + Math.random() * 2, note: notes && Math.random() < 0.55, color: NOTES[i % NOTES.length] });
      }
    };

    let raf = 0;
    const frame = () => {
      const w = W();
      const h = H();
      x += vx;
      y += vy;
      let hitX = false;
      let hitY = false;
      if (x <= 0 || x + LOGO_W >= w) {
        vx = -vx;
        x = Math.max(0, Math.min(w - LOGO_W, x));
        hitX = true;
      }
      if (y <= 0 || y + LOGO_H >= h) {
        vy = -vy;
        y = Math.max(0, Math.min(h - LOGO_H, y));
        hitY = true;
      }
      // köşeye çok yakın sekişi köşeye oturt: o büyük an arada bir gelsin
      if (hitX !== hitY) {
        const nearY = y < 24 || y + LOGO_H > h - 24;
        const nearX = x < 24 || x + LOGO_W > w - 24;
        if ((hitX && nearY) || (hitY && nearX)) {
          if (hitX) {
            y = y < 24 ? 0 : h - LOGO_H;
            vy = y === 0 ? Math.abs(vy) : -Math.abs(vy);
          } else {
            x = x < 24 ? 0 : w - LOGO_W;
            vx = x === 0 ? Math.abs(vx) : -Math.abs(vx);
          }
          hitX = hitY = true;
        }
      }
      if (hitX || hitY) {
        color = (color + 1) % COLORS.length;
        const cx = x + LOGO_W / 2;
        const cy = y + LOGO_H / 2;
        if (hitX && hitY) spill(cx, cy, 90, true);
        else spill(cx, cy, 6, false);
      }

      const bg = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
      bg.addColorStop(0, '#0b1a3a');
      bg.addColorStop(1, '#000');
      c.fillStyle = bg;
      c.fillRect(0, 0, w, h);
      field(w, h);
      for (let i = bits.length - 1; i >= 0; i--) {
        const b = bits[i];
        b.vy += 0.18;
        b.vx *= 0.99;
        b.x += b.vx;
        b.y += b.vy;
        b.rot += b.vr;
        if (b.y > h - 10) {
          b.y = h - 10;
          b.vy *= -0.35;
          b.vx *= 0.7;
          b.life -= 0.04;
        }
        b.life -= 0.006;
        if (b.life <= 0) bits.splice(i, 1);
        else drawBit(c, b);
      }
      drawLogo(c, x, y, COLORS[color], k);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className={s.saver} aria-hidden="true">
      <canvas ref={ref} className={s.saverCanvas} />
    </div>
  );
}

/** Saatin yılına göre ekran koruyucu: 2002 seken cüzdan, 2008–2012 cam baloncuklar, 2016 sonrası kilit ekranı. */
export function Saver({ theme, year }: { theme: Theme; year: Year }) {
  if (theme === 'luna') return <WalletSaver />;
  if (theme === 'glass') return <GlassSaver year={year} />;
  return <FlatSaver year={year} />;
}
