import { useEffect, useRef } from 'react';
import { paperTextures } from './paperTextures';
import { makeIn, makeOut, stepIn, stepOut, type ClearZone, type Point, type Sheet } from './paperPhysics';
import { createPaperRenderer, type PaperView } from './paperRender';
import styles from './PaperStorm.module.css';
import { prefersReducedMotion } from '../../components/ui/motion';

/*
 * Başvuru yağmuru ekranı için gerçek zamanlı kâğıt simülasyonu, tek bir canvas'a çizilir.
 *
 * Her sayfa masanın (ekranın) üstünde 3B ince bir levhadır: yüksekliği, hızı ve yönelimi
 * (dönüş + iki eğim) vardır. Kamera perspektifle tam aşağı bakar; yükseğe uçan sayfalar yaklaşır
 * ve büyür. Yönlü bir ışık sayfaları eğimlerine göre gölgelendirir ve masaya, yükseldikçe
 * uzaklaşan ve yumuşayan bir gölge düşürür.
 *
 * "in" modu  — CV'ler yapay zekâ çekirdeğine çekilir: ekranın kenarlarının ötesinden gelen,
 *              daralan ve hızlanan bir girdap; takla atar, alçalır ve çekirdekte kaybolurlar.
 * "out" modu — çekirdek reddedilen CV'leri dışarı fırlatır. Fırlatma: yerçekimi ve yönelime bağlı
 *              hava direnciyle (yan dönük havayı yarar, düz yüzü sert frenler) balistik, takla
 *              atarak. Yavaşlayıp düşmeye başlayan sayfa bir yaprak gibi süzülür: eğimlerinin
 *              sarkaç salınımı onu yana yana kaydırır. İner, kayar, düzleşir ve damgalanır.
 *              Sayfalar üst üste yığılır; yaklaşık üçte biri ekrandan uçup gider.
 *
 * Hareket paperPhysics.ts'de, çizim paperRender.ts'de; bu bileşen canvas'ı, animasyon döngüsünü
 * ve geri çağrıları yönetir.
 */

export type { ClearZone, Point };

interface PaperStormProps {
  mode: 'in' | 'out';
  origin: Point;
  count: number;
  /** "in": CV'lerin gelmeye devam ettiği süre (saniye). */
  window?: number;
  chaotic?: boolean;
  clear?: ClearZone;
  onAbsorb?: (pan: number) => void;
  onLaunch?: (papers: { pan: number; delay: number }[]) => void;
  onLand?: (pan: number, index: number) => void;
}

export function PaperStorm({ mode, origin, count, window: spawnWindow = 1.8, chaotic = false, clear = { halfWidth: 0, above: 0, below: 0 }, onAbsorb, onLaunch, onLand }: PaperStormProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const callbacks = useRef({ onAbsorb, onLaunch, onLand });
  useEffect(() => {
    callbacks.current = { onAbsorb, onLaunch, onLand };
  });
  // Çekirdeğin konumu açılışta alınır; uçuş ortasında yeniden boyutlandırma simülasyonu baştan başlatmamalı.
  const setup = useRef({ origin, count, spawnWindow, chaotic, clear, mode });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const g: CanvasRenderingContext2D = ctx;
    const { origin: o, count: n, spawnWindow: win, chaotic: chaos, clear: cz, mode: m } = setup.current;
    const view: PaperView = { vw: 0, vh: 0, dpr: 1 };
    const size = () => {
      view.vw = window.innerWidth;
      view.vh = window.innerHeight;
      view.dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(view.vw * view.dpr);
      canvas.height = Math.round(view.vh * view.dpr);
    };
    size();
    window.addEventListener('resize', size);
    const draw = createPaperRenderer(g, paperTextures(), view);

    const sheets = m === 'in' ? makeIn(o, view.vw, view.vh, n, win) : makeOut(o, view.vw, view.vh, n, chaos, cz);
    if (m === 'out') callbacks.current.onLaunch?.(sheets.map((s) => ({ pan: s.pan, delay: s.spawn })));
    const reduced = prefersReducedMotion();
    let landings = 0;
    const clampPan = (x: number) => Math.max(-1, Math.min(1, (x - view.vw / 2) / (view.vw / 2)));

    function frameOut(t: number, dt: number) {
      let alive = false;
      for (const s of sheets) {
        if (s.state === 'gone') continue;
        // iki ara adım hızlı fırlatmaları kararlı tutar
        for (let i = 0; i < 2; i++) {
          if (stepOut(s, t, dt / 2, view.vw, view.vh)) callbacks.current.onLand?.(clampPan(s.x), landings++);
        }
        const st = s.state as Sheet['state'];
        if (st !== 'gone' && (st !== 'landed' || t - s.landedAt < 0.8)) alive = true;
      }
      draw.clear();
      const live = sheets.filter((s) => s.state !== 'gone' && s.state !== 'wait');
      // önce inenler (iniş sırasıyla), sonra havadakiler alçaktan yükseğe
      live.sort((p, q) => (p.state === 'landed' ? (q.state === 'landed' ? p.landedAt - q.landedAt : -1) : q.state === 'landed' ? 1 : p.z - q.z));
      for (const s of live) draw.drawShadow(s, 1, 1);
      for (const s of live) {
        const emerge = s.state === 'fly' ? Math.max(0.25, Math.min(1, (t - s.spawn) / 0.12)) : 1;
        draw.drawSheet(s, emerge, 1, t);
      }
      g.globalAlpha = 1;
      return alive;
    }

    function frameIn(t: number) {
      let alive = false;
      draw.clear();
      const drawList: { s: Sheet; shrink: number; fade: number }[] = [];
      for (const s of sheets) {
        if (s.absorbed) continue;
        const r = stepIn(s, t, o);
        if (r === 'absorbed') {
          callbacks.current.onAbsorb?.(s.pan);
          continue;
        }
        alive = true;
        if (r !== 'waiting') drawList.push({ s, ...r });
      }
      drawList.sort((p, q) => p.s.z - q.s.z);
      for (const d of drawList) draw.drawShadow(d.s, d.shrink, d.fade);
      for (const d of drawList) draw.drawSheet(d.s, d.shrink, d.fade, t);
      g.globalAlpha = 1;
      return alive;
    }

    if (reduced) {
      if (m === 'out') {
        for (const s of sheets) {
          if (!s.lands) continue;
          s.state = 'landed';
          s.x = s.tx;
          s.y = s.ty;
          s.z = 0;
          s.a = 0;
          s.b = 0;
          s.landedAt = -1;
        }
        frameOut(1, 0);
      }
      return () => window.removeEventListener('resize', size);
    }

    let raf = 0;
    let start = 0;
    let last = 0;
    const frame = (now: number) => {
      if (!start) start = last = now;
      const t = (now - start) / 1000;
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const alive = m === 'out' ? frameOut(t, dt) : frameIn(t);
      if (alive) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', size);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.layer} aria-hidden="true" />;
}
