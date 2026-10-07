import { useEffect, useRef } from 'react';
import { audioEngine } from '../../audio/audioEngine';
import { H, W } from './city/kit';
import type { CityScene } from './city/scene';
import { bridgeScene } from './city/scenes/bridge';
import { e5Scene } from './city/scenes/e5';
import { karakoyScene } from './city/scenes/karakoy';
import { servisScene } from './city/scenes/servis';
import styles from './DayEndBackdrop.module.css';
import { prefersReducedMotion } from '../ui/motion';

/*
 * Gün sonu arka planı: canvas'ta çizilen canlı bir İstanbul akşam trafiği, her gün için bir sahne.
 * Sabit katmanlar (gökyüzü, silüet, yol) her yeniden boyutlandırmada bir kez çizilir; trafik,
 * kalabalık, hava, su ve ışıklar her karede canlandırılıp çizilir, yavaş bir kamera kaymasıyla.
 */

const SCENES: (() => CityScene)[] = [bridgeScene, e5Scene, servisScene, karakoyScene];
const CAPTIONS = [
  'Ortaköy · 15 Temmuz Şehitler Köprüsü — Avrupa yakasına dönüş başladı, köprü kilit.',
  'Zincirlikuyu · E-5 — köprüden inen metrobüs tıklım tıklım, Bağcılar daha çok uzak.',
  'Servisin içinden · Ataşehir — 40 dakikadır köprü bağlantısında bekliyoruz.',
  'Karaköy İskelesi · Kar yağıyor — son vapura yetişmeye çalışanlar.',
];
/** Yavaş yaklaşma için pay, böylece katmanlar son yakınlaşmaya yetecek netlikte çizilir. */
const MAX_ZOOM = 1.06;

export function DayEndBackdrop({ dayIndex }: { dayIndex: number }) {
  const index = (dayIndex % SCENES.length) as 0 | 1 | 2 | 3;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Akşam trafiğinin ses manzarası rapor ekrandayken çalar.
  useEffect(() => audioEngine.startRushHourAmbience(index), [index]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const g = canvas.getContext('2d', { alpha: false });
    if (!g) return;
    const scene = SCENES[index]();
    const still = prefersReducedMotion();
    let base = 1;
    let raf = 0;
    let last = performance.now();
    let t = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const cw = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const ch = Math.max(1, Math.round(canvas.clientHeight * dpr));
      canvas.width = cw;
      canvas.height = ch;
      base = Math.max(cw / W, ch / H);
      scene.build(base * MAX_ZOOM);
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      scene.update(dt, t);
      const cw = canvas.width;
      const ch = canvas.height;
      // yavaş, sinematik bir yaklaşma ve elde tutulmuş gibi bir kayma
      const zoom = 1 + (MAX_ZOOM - 1) * (1 - Math.exp(-t / 35));
      const s = base * zoom;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = '#000';
      g.fillRect(0, 0, cw, ch);
      g.setTransform(s, 0, 0, s, cw / 2 - (W / 2) * s, ch / 2 - (H / 2) * s);
      const cam = { x: Math.sin(t * 0.05) * 18 + Math.sin(t * 0.13) * 4, y: Math.sin(t * 0.037) * 6 };
      scene.draw(g, t, cam);
      if (!still) raf = requestAnimationFrame(frame);
    };

    resize();
    // ilk kare yaşanmış görünsün diye simülasyonu ısıt
    for (let i = 0; i < 40; i++) scene.update(0.05, i * 0.05);
    raf = requestAnimationFrame(frame);
    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 150);
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
    };
  }, [index]);

  return (
    <div className={styles.backdrop} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.vignette} />
      <div className={styles.grain} />
      <div className={styles.caption}>{CAPTIONS[index]}</div>
    </div>
  );
}
