import { useEffect, useRef } from 'react';
import { paperTextures } from './paperTextures';
import { makeIn, makeOut, stepIn, stepOut, type ClearZone, type Point, type Sheet } from './paperPhysics';
import { createPaperRenderer, type PaperView } from './paperRender';
import styles from './PaperStorm.module.css';

/*
 * Real-time paper simulation for the application-flood screen, drawn on one canvas.
 *
 * Every sheet is a thin plate in 3D above the desk (the screen): it has a height, a velocity and
 * an orientation (yaw + two tilts). The camera looks straight down with perspective, so sheets
 * that fly high come closer and grow; a directional light shades them by their tilt and casts a
 * shadow on the desk that drifts away and softens with height.
 *
 * mode "in"  — CVs are sucked into the AI core: a tightening, accelerating vortex from beyond the
 *              screen edges; they tumble, lose height and vanish into the core.
 * mode "out" — the core blasts rejected CVs out. Launch: ballistic with gravity and orientation-
 *              dependent air drag (edge-on slices through the air, broadside brakes hard), while
 *              tumbling. Once slow and falling, a sheet flutters down like a leaf — a pendulum
 *              sway of its tilts driving a side-to-side glide. It lands, slides, flattens, and
 *              gets stamped. Sheets pile up on each other; about a third sail off-screen.
 *
 * The motion lives in paperPhysics.ts, the drawing in paperRender.ts; this component owns the
 * canvas, the animation loop and the callbacks.
 */

export type { ClearZone, Point };

interface PaperStormProps {
  mode: 'in' | 'out';
  origin: Point;
  count: number;
  /** "in": seconds over which the CVs keep arriving. */
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
  // The core's position is captured at mount; a resize mid-flight must not restart the simulation.
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
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let landings = 0;
    const clampPan = (x: number) => Math.max(-1, Math.min(1, (x - view.vw / 2) / (view.vw / 2)));

    function frameOut(t: number, dt: number) {
      let alive = false;
      for (const s of sheets) {
        if (s.state === 'gone') continue;
        // two substeps keep the fast launches stable
        for (let i = 0; i < 2; i++) {
          if (stepOut(s, t, dt / 2, view.vw, view.vh)) callbacks.current.onLand?.(clampPan(s.x), landings++);
        }
        const st = s.state as Sheet['state'];
        if (st !== 'gone' && (st !== 'landed' || t - s.landedAt < 0.8)) alive = true;
      }
      draw.clear();
      const live = sheets.filter((s) => s.state !== 'gone' && s.state !== 'wait');
      // landed first (in landing order), then airborne sheets low to high
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
