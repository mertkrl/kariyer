import { useEffect, useLayoutEffect, useRef } from 'react';
import { prefersReducedMotion } from '../../shared/motion';
import { applyView, bounds, paintGround, type View } from './paint';
import { lampHeads, paintCanopy } from './canopy';
import { makeScenery, WORLD, type Scenery } from './scenery';
import { clampCam, ZOOM_MAX, ZOOM_MIN, type Camera } from './camera';
import { nodeX, type Net } from './net';
import type { MoveId } from './model';
import { drawAmbulanceGlow, drawMoves, drawQueueBands, drawCrashes, drawNight, drawQueueTags, drawRain, drawSignals } from './signals';
import { drawBarriers, drawIncidents, drawTeams } from './incidentSprites';
import { drawCar, drawCity, drawSideCars, drawPed } from './sprites';
import styles from './TrafikGame.module.css';

/*
 * Caddenin tam ekran görüntüsü: kavşaklar doğu-batı yönünde yan yana. Açılışta kamera bütün ağı
 * üst şerit ile alttaki kontrol paneli arasına sığdırır; tekerlek ya da +/− yakınlaştırır, sürükleyince
 * harita kayar, kavşağa dokununca o kavşak seçilir. Uzaklaşınca yolların tamamı ve çevredeki mahalle
 * görünür. Her kavşağın zemini ve ağaç taçları kendi mahallesiyle ayrı çizilir, iki kavşak arasındaki
 * yolun ortasından kesilip yan yana basılır. Zemin ekranın biraz dışına taşkın çizilir; kamera
 * değişince kısa bir beklemeden sonra yeniden çizilir, o arada eski çizim kaydırılır. Kaydırma taşkını
 * aşarsa beklemeden çizilir.
 */

/** Üstteki şerit ve alttaki panelin CSS piksel yüksekliği: harita aradaki alana oturur. */
const TOP = 64;
const BOTTOM = 200;

/** Zeminin ekran dışına taşan payı (ekranın oranı, her yanda). */
const OVERSCAN = 0.2;

export function Scene({
  net,
  selected,
  onSelect,
  camera,
  onCamera,
  onFloor,
  highlight = null,
}: {
  net: Net;
  selected: number;
  onSelect: (i: number) => void;
  camera: Camera;
  onCamera: (c: Camera) => void;
  /** Bu ekranda en uzak yakınlık (bütün harita). */
  onFloor: (zoom: number) => void;
  /** Üstüne gelinen ışık kartının hareketleri: seçili kavşakta yolları parlar. */
  highlight?: MoveId[] | null;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  // kamera ve seçim her karede okunur; efekt yeniden kurulmasın (refler çizimden önce güncellenir)
  const cam = useRef(camera);
  const sel = useRef(selected);
  const lit = useRef(highlight);
  const handlers = useRef({ onSelect, onCamera, onFloor });
  useLayoutEffect(() => {
    cam.current = camera;
    sel.current = selected;
    lit.current = highlight;
    handlers.current = { onSelect, onCamera, onFloor };
  });

  useEffect(() => {
    const el = canvas.current!;
    const ctx = el.getContext('2d')!;
    const sims = net.sims;
    const xs = sims.map((s) => nodeX(net, s));
    // her kavşağın hücresi: komşuyla arasındaki yolun ortasına kadar
    const cells = xs.map((x, i) => ({ x0: i ? (xs[i - 1] + x) / 2 : -Infinity, x1: i + 1 < xs.length ? (x + xs[i + 1]) / 2 : Infinity }));
    const scenes: Scenery[] = sims.map((s, i) =>
      makeScenery(s.j, s.spec.seed, s.spec.landmarks, {
        ...(Number.isFinite(cells[i].x0) ? { W: xs[i] - cells[i].x0 - 1 } : {}),
        ...(Number.isFinite(cells[i].x1) ? { E: cells[i].x1 - xs[i] - 1 } : {}),
      }, s.sides, s.spec.city),
    );
    const lamps = scenes.map((sc) => lampHeads(sc));
    const dusk = net.spec.dusk ?? 0;
    // hareketi azaltan oyuncu: yağmur, flaşörler ve yanıp sönen ışıklar durur, trafik akar
    const still = prefersReducedMotion();
    let base: View = { k: 1, cx: 0, cy: 0, w: 1, h: 1 };
    let view: View = base;
    let ground: { img: HTMLCanvasElement; canopy: HTMLCanvasElement; v: View } | null = null;
    let dpr = 1;
    let raf = 0;
    let timer = 0;
    let painted = 0;
    let key = '';
    let narrow = false;
    let floor = ZOOM_MIN;
    const local = (v: View, i: number): View => ({ ...v, cx: v.cx - xs[i] });

    /** Bütün ağın sığdığı kamera. */
    const fit = () => {
      const r = el.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(r.width * dpr));
      const h = Math.max(1, Math.round(r.height * dpr));
      el.width = w;
      el.height = h;
      narrow = r.width <= 760;
      const top = narrow ? 104 : TOP;
      const bottom = narrow ? 340 : BOTTOM;
      const free = Math.max(160, r.height - top - bottom);
      // tek kavşakta kutunun çevresinde kuyruğun ilk ~30 metresi; ağda bütün cadde
      const boxR = Math.max(...sims.map((s) => Math.max(-s.j.box.x0, s.j.box.x1, -s.j.box.y0, s.j.box.y1))) + 32;
      const halfW = (xs[xs.length - 1] - xs[0]) / 2 + boxR;
      const kc = Math.max(0.6, Math.min(r.width / 2 / (halfW + 6), free / 2 / boxR));
      base = { k: kc * dpr, cx: (xs[0] + xs[xs.length - 1]) / 2, cy: (r.height / 2 - (top + free / 2)) / kc, w, h };
      // bütün harita: bütün şehir görünür, ama ekran çizilmiş şehrin dışına taşmaz
      const span = (xs[xs.length - 1] - xs[0]) / 2;
      const edge = Math.max(r.width / 2 / ((span + WORLD - 20) * kc), r.height / 2 / ((WORLD - 20) * kc));
      floor = Math.min(1, Math.max(ZOOM_MIN, edge));
      handlers.current.onFloor(floor);
      key = '';
    };

    /** Zemini ve taçları şimdiki kameraya göre, ekranın dışına taşkın çizer: her kavşak kendi hücresinde. */
    const repaint = (cam: View) => {
      const v: View = { ...cam, w: Math.round(cam.w * (1 + 2 * OVERSCAN)), h: Math.round(cam.h * (1 + 2 * OVERSCAN)) };
      const img = document.createElement('canvas');
      img.width = v.w;
      img.height = v.h;
      const canopy = document.createElement('canvas');
      canopy.width = v.w;
      canopy.height = v.h;
      const gi = img.getContext('2d')!;
      const gc = canopy.getContext('2d')!;
      sims.forEach((s, i) => {
        const lv = local(v, i);
        const sx0 = Number.isFinite(cells[i].x0) ? v.w / 2 + (cells[i].x0 - v.cx) * v.k : 0;
        const sx1 = Number.isFinite(cells[i].x1) ? v.w / 2 + (cells[i].x1 - v.cx) * v.k : v.w;
        if (sx1 < 0 || sx0 > v.w) return;
        const a = Math.max(0, Math.floor(sx0));
        const b = Math.min(v.w, Math.ceil(sx1));
        if (b <= a) return;
        // yalnızca hücrenin görünen dilimi çizilir
        const slice: View = { ...lv, w: b - a, cx: lv.cx + ((a + b) / 2 - v.w / 2) / v.k };
        gi.drawImage(paintGround(s.j, scenes[i], slice, dusk, s.spec.seed), a, 0);
        gc.drawImage(paintCanopy(s.j, scenes[i], slice, s.spec.seed), a, 0);
      });
      ground = { img, canopy, v };
      painted = performance.now();
    };

    /** Eski zemin şimdiki ekranı hâlâ tamamen örtüyor mu (aynı yakınlık, kayma taşkının içinde). */
    const covered = (v: View) => {
      if (!ground) return false;
      const g = ground.v;
      if (Math.abs(v.k / g.k - 1) > 1e-6) return false;
      return Math.abs(v.cx - g.cx) * v.k <= (g.w - v.w) / 2 && Math.abs(v.cy - g.cy) * v.k <= (g.h - v.h) / 2;
    };

    fit();
    const ro = new ResizeObserver(() => {
      fit();
      ground = null;
    });
    ro.observe(el);

    /** Eski zemini yeni kameraya taşır (yeniden çizim gelene kadar). */
    const blit = (img: HTMLCanvasElement, from: View) => {
      const s = view.k / from.k;
      const ox = view.w / 2 + (from.cx - view.cx) * view.k - (from.w / 2) * s;
      const oy = view.h / 2 + (from.cy - view.cy) * view.k - (from.h / 2) * s;
      ctx.setTransform(s, 0, 0, s, ox, oy);
      ctx.drawImage(img, 0, 0);
    };

    const frame = (now: number) => {
      const t = still ? 0 : now / 1000;
      const c = cam.current;
      view = { ...base, k: base.k * c.zoom, cx: base.cx + c.dx, cy: base.cy + c.dy };
      // yakınlaşınca harita tutulup kaydırılır; ağda kavşağa dokunmak seçer
      el.style.cursor = c.zoom > floor * 1.001 ? (drag?.moved ? 'grabbing' : 'grab') : sims.length > 1 ? 'pointer' : 'default';
      const k = `${view.k.toFixed(4)}|${view.cx.toFixed(2)}|${view.cy.toFixed(2)}|${view.w}|${view.h}`;
      if (k !== key) {
        key = k;
        clearTimeout(timer);
        // kamera dururken bir kez çizilir: kaydırırken her karede değil. Kaydırma taşkını aşar ya da
        // yakınlık değişirse en geç ~1/10 saniyede bir yeniden çizilir; ekranın kenarı boş kalmasın.
        const v = view;
        const wait = !ground ? 0 : covered(v) ? 140 : Math.max(0, 100 - (now - painted));
        timer = window.setTimeout(() => repaint(v), wait);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#4b4d52';
      ctx.fillRect(0, 0, view.w, view.h);
      if (ground) blit(ground.img, ground.v);
      // akşam farları: şehrin simülasyon dışı araçları da
      const city: [number, number, number][][] = [];
      sims.forEach((s, i) => {
        applyView(ctx, view);
        ctx.translate(xs[i], 0);
        drawAmbulanceGlow(ctx, s, t);
        for (const p of s.peds) drawPed(ctx, s, p, t);
        drawQueueBands(ctx, s);
        if (i === sel.current && lit.current) drawMoves(ctx, s, lit.current, t);
        city[i] = drawCity(ctx, s, scenes[i], bounds(local(view, i)), t, view.k < 1.5);
        drawSideCars(ctx, s, t, scenes[i].sea);
        for (const car of s.cars) drawCar(ctx, car, t);
        drawIncidents(ctx, s, t);
        drawBarriers(ctx, s, t);
        drawCrashes(ctx, s, t);
        drawTeams(ctx, s, t);
        drawSignals(ctx, s, t);
      });
      if (ground) blit(ground.canopy, ground.v);
      // uzaktan ana yollar sokak ızgarasında kaybolmasın: üstlerine ince bir vurgu, kavşağa halka
      if (view.k < 0.9 * dpr) drawArteries(ctx, view);
      sims.forEach((s, i) => drawNight(ctx, s, local(view, i), lamps[i], dusk, i === 0, city[i]));
      // yağmur bölümün ortasında da başlayabilir
      if (sims.some((s) => s.wet)) drawRain(ctx, view, t);
      // çok uzaktan etiketler üst üste biner: yalnızca kavşak adları kalır
      if (view.k >= 1.2 * dpr) sims.forEach((s, i) => drawQueueTags(ctx, s, local(view, i), dpr, sims.length > 1 && (c.zoom < 1.6 || narrow)));
      if (sims.length > 1) drawNodeTags(ctx, view, dpr);
      raf = requestAnimationFrame(frame);
    };

    /** Ana yollar ve kavşaklar, bütün harita görünümünde: ekran pikselinde ince sarı çizgi. */
    const drawArteries = (cx: CanvasRenderingContext2D, v: View) => {
      cx.save();
      cx.setTransform(1, 0, 0, 1, 0, 0);
      cx.strokeStyle = 'rgba(255,196,64,0.55)';
      cx.lineWidth = 3 * dpr;
      cx.lineCap = 'round';
      const px = (x: number, y: number): [number, number] => [v.w / 2 + (x - v.cx) * v.k, v.h / 2 + (y - v.cy) * v.k];
      cx.beginPath();
      sims.forEach((s, i) => {
        for (const g of Object.values(s.j.legs)) {
          // komşuya giden yol iki kavşağın ortasında buluşur
          const sea = scenes[i].sea;
          const wet = sea && Math.sign(g.u[1]) === (sea.dir === 'S' ? 1 : -1);
          const len = s.links[g.dir] ? g.len : wet ? sea.at - 8 : WORLD;
          const a = px(xs[i], 0);
          const b = px(xs[i] + g.u[0] * len, g.u[1] * len);
          cx.moveTo(a[0], a[1]);
          cx.lineTo(b[0], b[1]);
        }
      });
      cx.stroke();
      cx.fillStyle = '#ffc440';
      cx.strokeStyle = 'rgba(18,20,24,0.8)';
      cx.lineWidth = 2 * dpr;
      for (const x of xs) {
        const [a, b] = px(x, 0);
        cx.beginPath();
        cx.arc(a, b, 6 * dpr, 0, Math.PI * 2);
        cx.fill();
        cx.stroke();
      }
      cx.restore();
    };

    /** Ağda kavşakların adları: seçili olan vurgulu, kavşağın üstünde. */
    const drawNodeTags = (cx: CanvasRenderingContext2D, v: View, d: number) => {
      cx.save();
      cx.setTransform(1, 0, 0, 1, 0, 0);
      cx.font = `700 ${Math.round(13 * d)}px "Work Sans Variable", "Helvetica Neue", Arial, sans-serif`;
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      sims.forEach((s, i) => {
        const x = v.w / 2 + (xs[i] - v.cx) * v.k;
        const y = v.h / 2 + (s.j.box.y0 - 9 - v.cy) * v.k;
        const on = i === sel.current;
        const text = `${i + 1} · ${s.name}`;
        const tw = cx.measureText(text).width + 20 * d;
        const th = 24 * d;
        cx.fillStyle = on ? '#f1eee6' : 'rgba(18,20,24,0.82)';
        cx.strokeStyle = on ? '#36e07a' : 'rgba(255,255,255,0.25)';
        cx.lineWidth = 2 * d;
        cx.beginPath();
        cx.roundRect(x - tw / 2, y - th / 2, tw, th, th / 2);
        cx.fill();
        cx.stroke();
        cx.fillStyle = on ? '#111' : '#f1eee6';
        cx.fillText(text, x, y + d);
      });
      cx.restore();
    };

    raf = requestAnimationFrame(frame);

    // dokunma: kısa dokunuş kavşağı seçer, sürükleme haritayı kaydırır, tekerlek yakınlaştırır
    let drag: { x: number; y: number; dx: number; dy: number; moved: boolean } | null = null;
    const toWorld = (px: number, py: number) => [view.cx + (px * dpr - view.w / 2) / view.k, view.cy + (py * dpr - view.h / 2) / view.k];
    const down = (e: PointerEvent) => {
      drag = { x: e.clientX, y: e.clientY, dx: cam.current.dx, dy: cam.current.dy, moved: false };
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      const mx = e.clientX - drag.x;
      const my = e.clientY - drag.y;
      if (Math.hypot(mx, my) > 6) drag.moved = true;
      if (!drag.moved) return;
      handlers.current.onCamera(clampCam({ ...cam.current, dx: drag.dx - (mx * dpr) / view.k, dy: drag.dy - (my * dpr) / view.k }, xs, floor));
    };
    const up = (e: PointerEvent) => {
      if (drag && !drag.moved) {
        const r = el.getBoundingClientRect();
        const [wx] = toWorld(e.clientX - r.left, e.clientY - r.top);
        let best = 0;
        xs.forEach((x, i) => {
          if (Math.abs(x - wx) < Math.abs(xs[best] - wx)) best = i;
        });
        handlers.current.onSelect(best);
      }
      drag = null;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const c = cam.current;
      const zoom = Math.max(floor, Math.min(ZOOM_MAX, c.zoom * Math.exp(-e.deltaY * 0.0015)));
      // imlecin altındaki nokta yerinde kalsın
      const r = el.getBoundingClientRect();
      const [wx, wy] = toWorld(e.clientX - r.left, e.clientY - r.top);
      const k1 = base.k * zoom;
      const px = (e.clientX - r.left) * dpr;
      const py = (e.clientY - r.top) * dpr;
      handlers.current.onCamera(clampCam({ zoom, dx: wx - (px - view.w / 2) / k1 - base.cx, dy: wy - (py - view.h / 2) / k1 - base.cy }, xs, floor));
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      ro.disconnect();
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
    };
  }, [net]);

  return <canvas ref={canvas} className={styles.canvas} aria-label="Caddenin kuşbakışı görüntüsü: kavşağa dokunarak seç, sürükleyerek kaydır" role="img" />;
}
