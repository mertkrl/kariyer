import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../../components/ui/motion';
import { applyView, lampHeads, paintCanopy, paintGround, type View } from './paint';
import { makeScenery } from './scenery';
import type { Sim } from './sim';
import { drawAmbulanceGlow, drawCar, drawCrashes, drawNight, drawPed, drawQueueTags, drawRain, drawSignals } from './sprites';
import styles from './TrafikGame.module.css';

/*
 * Kavşağın tam ekran görüntüsü. Kamera sabittir: kavşak, üst şerit ve alttaki kontrolör paneli
 * arasında kalan alana oturur, ekranın gerisi yollar ve apartmanlarla dolar. Zemin ve ağaç
 * taçları boyut değişince bir kez çizilir; her karede aralarına araçlar, yayalar, sinyaller,
 * akşam ışıkları ve yağmur gelir.
 */

/** Üstteki şerit ve alttaki panelin CSS piksel yüksekliği: kavşak aradaki alana ortalanır. */
const TOP = 64;
const BOTTOM = 200;

export function Scene({ sim }: { sim: Sim }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current!;
    const ctx = el.getContext('2d')!;
    const scenery = makeScenery(sim.j, sim.spec.seed);
    const lamps = lampHeads(scenery);
    const dusk = sim.spec.dusk ?? 0;
    // hareketi azaltan oyuncu: yağmur, flaşörler ve yanıp sönen ışıklar durur, trafik akar
    const still = prefersReducedMotion();
    let view: View = { k: 1, cx: 0, cy: 0, w: 1, h: 1 };
    let ground: HTMLCanvasElement | null = null;
    let canopy: HTMLCanvasElement | null = null;
    let dpr = 1;
    let raf = 0;
    let timer = 0;

    const fit = () => {
      const r = el.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(r.width * dpr));
      const h = Math.max(1, Math.round(r.height * dpr));
      el.width = w;
      el.height = h;
      const narrow = r.width <= 760;
      const top = narrow ? 104 : TOP;
      const bottom = narrow ? 230 : BOTTOM;
      const free = Math.max(160, r.height - top - bottom);
      // kutunun çevresinde kuyruğun ilk ~30 metresi görünsün: dar sokakta yakın, bulvarda uzak
      // (yerleşim henüz oturmadıysa genişlik 0 gelir; ölçek sıfıra düşmesin)
      const { x0, x1, y0, y1 } = sim.j.box;
      const R = Math.max(-x0, x1, -y0, y1) + 32;
      const kc = Math.max(1, Math.min(r.width / 2 / (R + 6), free / 2 / R));
      const k = kc * dpr;
      const midScreen = top + free / 2;
      view = { k, cx: 0, cy: (r.height / 2 - midScreen) / kc, w, h };
      ground = null;
      canopy = null;
      clearTimeout(timer);
      // boyut değişirken her karede yeniden çizmesin: kısa bir bekleme
      timer = window.setTimeout(() => {
        ground = paintGround(sim.j, scenery, view, dusk, sim.spec.seed);
        canopy = paintCanopy(sim.j, scenery, view, sim.spec.seed);
      }, 60);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);

    const frame = (now: number) => {
      const t = still ? 0 : now / 1000;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (ground) ctx.drawImage(ground, 0, 0);
      else {
        ctx.fillStyle = '#4b4d52';
        ctx.fillRect(0, 0, view.w, view.h);
      }
      applyView(ctx, view);
      drawAmbulanceGlow(ctx, sim, t);
      for (const p of sim.peds) drawPed(ctx, sim, p, t);
      for (const c of sim.cars) drawCar(ctx, c, t);
      drawCrashes(ctx, sim, t);
      drawSignals(ctx, sim, t);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (canopy) ctx.drawImage(canopy, 0, 0);
      drawNight(ctx, sim, view, lamps, dusk);
      if (sim.spec.rain) drawRain(ctx, view, t);
      drawQueueTags(ctx, sim, view, dpr);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      ro.disconnect();
    };
  }, [sim]);

  return <canvas ref={canvas} className={styles.canvas} aria-label="Kavşağın kuşbakışı görüntüsü" role="img" />;
}
