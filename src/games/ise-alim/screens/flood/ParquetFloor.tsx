import { useEffect, useRef } from 'react';
import styles from './ParquetFloor.module.css';

/*
 * CV'lerin düştüğü ofis zemini: şaşırtmalı derzlerle döşenmiş geniş meşe tahtalar; her tahtanın
 * kendi tonu, akan damarları ve ara ara budakları, pahlı derzler, saten vernik parlaklığı ve
 * jaluzilerden eğik giren ikindi güneşi. Her yeniden boyutlandırmada bir kez çizilir.
 */

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function plank(g: CanvasRenderingContext2D, r: () => number, x: number, y: number, w: number, h: number) {
  // ton: doğal farklılıklarıyla bal rengi meşe
  const hue = 28 + r() * 8;
  const sat = 38 + r() * 14;
  const light = 34 + r() * 14;
  const base = g.createLinearGradient(x, y, x, y + h);
  base.addColorStop(0, `hsl(${hue} ${sat}% ${light + 3}%)`);
  base.addColorStop(0.5, `hsl(${hue} ${sat}% ${light}%)`);
  base.addColorStop(1, `hsl(${hue} ${sat}% ${light - 4}%)`);
  g.fillStyle = base;
  g.fillRect(x, y, w, h);

  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  // akan damar: tahta boyunca uzun dalgalı çizgiler, yer yer katedral kemerleri
  const lines = 16 + Math.floor(r() * 10);
  const phase = r() * 100;
  for (let i = 0; i < lines; i++) {
    const gy = y + (i / lines) * h + r() * 2;
    const amp = 1 + r() * 3;
    const freq = 0.004 + r() * 0.01;
    g.strokeStyle = `hsla(${hue - 4}, ${sat + 10}%, ${light - 14 - r() * 8}%, ${0.18 + r() * 0.25})`;
    g.lineWidth = 0.5 + r() * 1.1;
    g.beginPath();
    for (let gx = x; gx <= x + w; gx += 6) {
      const yy = gy + Math.sin((gx + phase) * freq + i * 0.7) * amp + Math.sin((gx + phase * 2) * freq * 3.1) * amp * 0.3;
      if (gx === x) g.moveTo(gx, yy);
      else g.lineTo(gx, yy);
    }
    g.stroke();
  }
  // katedral deseni: iç içe kemerler
  if (r() < 0.55) {
    const cx = x + w * (0.25 + r() * 0.5);
    const cy = y + h * (0.3 + r() * 0.4);
    for (let k = 0; k < 7; k++) {
      g.strokeStyle = `hsla(${hue - 6}, ${sat + 8}%, ${light - 16}%, ${0.14 + r() * 0.12})`;
      g.lineWidth = 0.8;
      g.beginPath();
      g.ellipse(cx, cy, 30 + k * 26, 3 + k * 2.4, 0, 0, Math.PI * 2);
      g.stroke();
    }
  }
  // budaklar
  if (r() < 0.22) {
    const kx = x + r() * w;
    const ky = y + h * (0.25 + r() * 0.5);
    const kr = 2 + r() * 3.5;
    g.fillStyle = `hsl(${hue - 8} ${sat + 12}% ${light - 22}%)`;
    g.beginPath();
    g.ellipse(kx, ky, kr * 1.6, kr, 0, 0, Math.PI * 2);
    g.fill();
    for (let k = 1; k < 4; k++) {
      g.strokeStyle = `hsla(${hue - 6}, ${sat + 10}%, ${light - 16}%, 0.3)`;
      g.beginPath();
      g.ellipse(kx, ky, kr * 1.6 + k * 4, kr + k * 2, 0, 0, Math.PI * 2);
      g.stroke();
    }
  }
  // gözenekler / benekler
  for (let i = 0; i < w * h * 0.004; i++) {
    g.fillStyle = `rgba(40,22,10,${(r() * 0.18).toFixed(3)})`;
    g.fillRect(x + r() * w, y + r() * h, 1 + r() * 3, 0.6);
  }
  g.restore();

  // pahlı kenarlar: üst kenar açık, alt kenar ve uçlar koyu
  g.fillStyle = 'rgba(255,230,190,0.16)';
  g.fillRect(x, y, w, 1);
  g.fillStyle = 'rgba(20,10,4,0.55)';
  g.fillRect(x, y + h - 1.2, w, 1.2);
  g.fillRect(x + w - 1.2, y, 1.2, h);
}

function paint(canvas: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  canvas.width = Math.round(vw * dpr);
  canvas.height = Math.round(vh * dpr);
  const g = canvas.getContext('2d');
  if (!g) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const r = rng(2026);
  const rowH = 46;
  for (let y = -rowH * 0.3, row = 0; y < vh; y += rowH, row++) {
    let x = -r() * 420;
    while (x < vw) {
      const w = 300 + r() * 360;
      plank(g, r, x, y, w, rowH);
      x += w;
    }
  }
  // saten vernik parlaklığı: geniş ve yumuşak bir yansıma
  const sheen = g.createRadialGradient(vw * 0.62, vh * 0.28, 0, vw * 0.62, vh * 0.28, Math.max(vw, vh) * 0.7);
  sheen.addColorStop(0, 'rgba(255,236,200,0.16)');
  sheen.addColorStop(1, 'rgba(255,236,200,0)');
  g.fillStyle = sheen;
  g.fillRect(0, 0, vw, vh);
  // jaluzilerden giren ikindi güneşi: yumuşak kenarlı eğik parlak şeritler
  g.save();
  g.translate(vw * 0.55, -vh * 0.1);
  g.rotate(0.42);
  g.globalCompositeOperation = 'soft-light';
  for (let i = 0; i < 9; i++) {
    const by = i * 58;
    const band = g.createLinearGradient(0, by, 0, by + 30);
    band.addColorStop(0, 'rgba(255,220,160,0)');
    band.addColorStop(0.5, 'rgba(255,214,150,0.9)');
    band.addColorStop(1, 'rgba(255,220,160,0)');
    g.fillStyle = band;
    g.fillRect(-vw * 0.1, by, vw * 0.9, 30);
  }
  g.restore();
  g.save();
  g.translate(vw * 0.55, -vh * 0.1);
  g.rotate(0.42);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {
    const by = i * 58;
    const band = g.createLinearGradient(0, by, 0, by + 30);
    band.addColorStop(0, 'rgba(255,190,120,0)');
    band.addColorStop(0.5, 'rgba(255,190,120,0.08)');
    band.addColorStop(1, 'rgba(255,190,120,0)');
    g.fillStyle = band;
    g.fillRect(-vw * 0.1, by, vw * 0.9, 30);
  }
  g.restore();
  // oda kenarlara doğru gölgeye düşer, arayüzün durduğu yerde bir gölge havuzu
  const vig = g.createRadialGradient(vw / 2, vh * 0.45, Math.min(vw, vh) * 0.25, vw / 2, vh * 0.45, Math.max(vw, vh) * 0.78);
  vig.addColorStop(0, 'rgba(8,5,3,0)');
  vig.addColorStop(1, 'rgba(8,5,3,0.72)');
  g.fillStyle = vig;
  g.fillRect(0, 0, vw, vh);
  const ui = g.createRadialGradient(vw / 2, vh * 0.42, 0, vw / 2, vh * 0.42, Math.min(vw, vh) * 0.42);
  ui.addColorStop(0, 'rgba(10,7,4,0.55)');
  ui.addColorStop(1, 'rgba(10,7,4,0)');
  g.fillStyle = ui;
  g.fillRect(0, 0, vw, vh);
}

export function ParquetFloor() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    paint(canvas);
    let timer = 0;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => paint(canvas), 150);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', onResize);
    };
  }, []);
  return <canvas ref={ref} className={styles.floor} aria-hidden="true" />;
}
