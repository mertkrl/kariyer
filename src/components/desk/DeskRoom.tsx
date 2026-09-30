import { useEffect, useRef } from 'react';

/*
 * The room around the desk, painted once per size. An open-plan office corner seen from the
 * chair: a painted wall down to a skirting board, grey-blue carpet tiles running away to the
 * wall in true perspective, a suspended ceiling with its light panels, a low fabric partition
 * behind the desk only, and the light-oak desk itself — its top evenly lit by the ceiling
 * lights (no hot spots, no dark corners), its front edge and the shade underneath.
 */

export const STAGE_W = 1600;
export const STAGE_H = 900;
export const WALL_BOTTOM = 392;
export const DESK_BACK = 470;
export const DESK_FRONT = 806;
/** The room is painted this far past the stage on every side, so a wide screen never runs out of office. */
export const EXTEND_X = 900;
export const EXTEND_Y = 400;
/** What the camera always keeps in frame: the whole desk plus a little air. */
export const FIT_W = 1700;
export const FIT_H = 1010;
/** Eye level: where the partition rail sits and where the room's receding lines meet. */
const HORIZON = 388;
const VPX = STAGE_W / 2;
/** Where the far wall meets the floor (the wall stands just behind the partition). */
export const FLOOR_LINE = 606;
const CEILING = -160;
// the desk: slightly wider at the front than at the back
const DESK_BL = -20;
const DESK_BR = STAGE_W + 20;
const DESK_FL = -70;
const DESK_FR = STAGE_W + 70;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const X0 = -EXTEND_X;
const X1 = STAGE_W + EXTEND_X;
const Y0 = -EXTEND_Y;
const Y1 = STAGE_H + EXTEND_Y;

/** A point on the floor straight out from wall position x at screen depth y. */
const floorX = (xAtWall: number, y: number) => VPX + (xAtWall - VPX) * ((y - HORIZON) / (FLOOR_LINE - HORIZON));

function paintCeiling(g: CanvasRenderingContext2D) {
  g.fillStyle = '#e4e2dc';
  g.fillRect(X0, Y0, X1 - X0, CEILING - Y0);
  // grid of acoustic tiles receding towards the wall
  g.strokeStyle = 'rgba(120,114,104,0.45)';
  g.lineWidth = 2;
  for (let k = 0; k < 7; k++) {
    const y = HORIZON - (HORIZON - CEILING) / (1 - k * 0.16);
    if (y < Y0) break;
    g.beginPath();
    g.moveTo(X0, y);
    g.lineTo(X1, y);
    g.stroke();
  }
  for (let i = -16; i <= 16; i++) {
    const xw = VPX + i * 130;
    g.beginPath();
    g.moveTo(xw, CEILING);
    g.lineTo(VPX + (xw - VPX) * 2.4, Y0);
    g.stroke();
  }
  // two light panels
  for (const cx of [VPX - 480, VPX + 480]) {
    const glow = g.createLinearGradient(0, Y0, 0, CEILING);
    glow.addColorStop(0, 'rgba(255,254,248,1)');
    glow.addColorStop(1, 'rgba(252,250,240,0.9)');
    g.fillStyle = glow;
    g.beginPath();
    g.moveTo(cx - 170, CEILING - 30);
    g.lineTo(cx + 170, CEILING - 30);
    g.lineTo(cx + 230, CEILING - 130);
    g.lineTo(cx - 230, CEILING - 130);
    g.closePath();
    g.fill();
  }
  const cornice = g.createLinearGradient(0, CEILING, 0, CEILING + 30);
  cornice.addColorStop(0, 'rgba(40,34,26,0.25)');
  cornice.addColorStop(1, 'rgba(40,34,26,0)');
  g.fillStyle = cornice;
  g.fillRect(X0, CEILING, X1 - X0, 30);
}

function paintWall(g: CanvasRenderingContext2D, r: () => number) {
  const wall = g.createLinearGradient(0, CEILING, 0, FLOOR_LINE);
  wall.addColorStop(0, '#c9c2b5');
  wall.addColorStop(0.5, '#d8d1c4');
  wall.addColorStop(1, '#cfc8bb');
  g.fillStyle = wall;
  g.fillRect(X0, CEILING, X1 - X0, FLOOR_LINE - CEILING);
  // daylight from the window washes the wall to its right a little
  const day = g.createRadialGradient(1250, 180, 60, 1250, 180, 900);
  day.addColorStop(0, 'rgba(255,252,242,0.35)');
  day.addColorStop(1, 'rgba(255,252,242,0)');
  g.fillStyle = day;
  g.fillRect(X0, CEILING, X1 - X0, FLOOR_LINE - CEILING);
  for (let i = 0; i < 26000; i++) {
    g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.035)';
    g.fillRect(X0 + r() * (X1 - X0), CEILING + r() * (FLOOR_LINE - CEILING), 1.5, 1.5);
  }
  // skirting board
  g.fillStyle = '#9d968a';
  g.fillRect(X0, FLOOR_LINE - 12, X1 - X0, 12);
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.fillRect(X0, FLOOR_LINE - 12, X1 - X0, 2);
}

function paintFloor(g: CanvasRenderingContext2D, r: () => number) {
  const base = g.createLinearGradient(0, FLOOR_LINE, 0, Y1);
  base.addColorStop(0, '#5d6573');
  base.addColorStop(1, '#474e5b');
  g.fillStyle = base;
  g.fillRect(X0, FLOOR_LINE, X1 - X0, Y1 - FLOOR_LINE);
  // carpet tiles, quarter-turned so neighbours differ a shade; rows spaced by perspective
  const rows: number[] = [FLOOR_LINE];
  for (let k = 1; k < 40; k++) {
    const y = HORIZON + (FLOOR_LINE - HORIZON) / (1 - k * 0.14);
    if (y > Y1 || !isFinite(y) || y < 0) break;
    rows.push(y);
  }
  rows.push(Y1);
  const tile = 70; // width of a tile where it meets the wall
  for (let k = 0; k < rows.length - 1; k++) {
    const ya = rows[k];
    const yb = rows[k + 1];
    for (let i = -60; i <= 60; i++) {
      const xa = VPX + i * tile;
      const p = [floorX(xa, ya), floorX(xa + tile, ya), floorX(xa + tile, yb), floorX(xa, yb)];
      if (Math.max(...p) < X0 || Math.min(...p) > X1) continue;
      g.fillStyle = (i + k) % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)';
      g.beginPath();
      g.moveTo(p[0], ya);
      g.lineTo(p[1], ya);
      g.lineTo(p[2], yb);
      g.lineTo(p[3], yb);
      g.closePath();
      g.fill();
    }
  }
  g.strokeStyle = 'rgba(30,34,42,0.25)';
  g.lineWidth = 1;
  for (const y of rows) {
    g.beginPath();
    g.moveTo(X0, y);
    g.lineTo(X1, y);
    g.stroke();
  }
  for (let i = -60; i <= 60; i++) {
    const xa = VPX + i * tile;
    g.beginPath();
    g.moveTo(xa, FLOOR_LINE);
    g.lineTo(floorX(xa, Y1), Y1);
    g.stroke();
  }
  // carpet fibre
  for (let i = 0; i < 30000; i++) {
    const y = FLOOR_LINE + r() * (Y1 - FLOOR_LINE);
    g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.07)';
    const s = 1 + ((y - FLOOR_LINE) / (Y1 - FLOOR_LINE)) * 2;
    g.fillRect(X0 + r() * (X1 - X0), y, s, s);
  }
  // soft shadow along the skirting and the light pooling from the ceiling panels
  const sk = g.createLinearGradient(0, FLOOR_LINE, 0, FLOOR_LINE + 30);
  sk.addColorStop(0, 'rgba(20,20,26,0.35)');
  sk.addColorStop(1, 'rgba(20,20,26,0)');
  g.fillStyle = sk;
  g.fillRect(X0, FLOOR_LINE, X1 - X0, 30);
}

function paintPartition(g: CanvasRenderingContext2D, r: () => number) {
  // a low fabric screen behind the desk only; its posts run down to the floor at the ends
  const fab = g.createLinearGradient(0, WALL_BOTTOM, 0, DESK_BACK);
  fab.addColorStop(0, '#5d6776');
  fab.addColorStop(1, '#4d5663');
  g.fillStyle = fab;
  g.fillRect(DESK_BL, WALL_BOTTOM, DESK_BR - DESK_BL, FLOOR_LINE - WALL_BOTTOM);
  for (let i = 0; i < 16000; i++) {
    g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)';
    g.fillRect(DESK_BL + r() * (DESK_BR - DESK_BL), WALL_BOTTOM + r() * (FLOOR_LINE - WALL_BOTTOM), 2, 1);
  }
  const rail = g.createLinearGradient(0, WALL_BOTTOM - 8, 0, WALL_BOTTOM + 4);
  rail.addColorStop(0, '#eceef0');
  rail.addColorStop(0.5, '#adb1b8');
  rail.addColorStop(1, '#6d727a');
  g.fillStyle = rail;
  g.fillRect(DESK_BL - 8, WALL_BOTTOM - 8, DESK_BR - DESK_BL + 16, 12);
  for (const x of [DESK_BL - 8, DESK_BR - 4]) {
    const post = g.createLinearGradient(x, 0, x + 12, 0);
    post.addColorStop(0, '#c3c7cc');
    post.addColorStop(1, '#7b8088');
    g.fillStyle = post;
    g.fillRect(x, WALL_BOTTOM - 8, 12, FLOOR_LINE + 6 - WALL_BOTTOM);
    g.fillStyle = '#3b3e44';
    g.fillRect(x - 4, FLOOR_LINE + 2, 20, 6);
  }
}

function paintDesk(g: CanvasRenderingContext2D, r: () => number) {
  // under the desk: modesty panel in shade, the floor beneath darker still
  const under = g.createLinearGradient(0, DESK_FRONT, 0, Y1);
  under.addColorStop(0, '#1d1812');
  under.addColorStop(0.35, '#2a241c');
  under.addColorStop(1, '#343844');
  g.fillStyle = under;
  g.fillRect(DESK_FL + 30, DESK_FRONT, DESK_FR - DESK_FL - 60, Y1 - DESK_FRONT);
  // the desk's end panels, in laminate, running down to the carpet
  for (const [x, w] of [
    [DESK_FL, 34],
    [DESK_FR - 34, 34],
  ] as const) {
    const end = g.createLinearGradient(x, 0, x + w, 0);
    end.addColorStop(0, '#8a6a46');
    end.addColorStop(1, '#6f5335');
    g.fillStyle = end;
    g.fillRect(x, DESK_FRONT, w, Y1 - DESK_FRONT);
  }

  // top: even ceiling light, a touch brighter towards you — no vignette, no hot spot
  g.save();
  g.beginPath();
  g.moveTo(DESK_BL, DESK_BACK);
  g.lineTo(DESK_BR, DESK_BACK);
  g.lineTo(DESK_FR, DESK_FRONT);
  g.lineTo(DESK_FL, DESK_FRONT);
  g.closePath();
  g.clip();
  const top = g.createLinearGradient(0, DESK_BACK, 0, DESK_FRONT);
  top.addColorStop(0, '#bf9c72');
  top.addColorStop(1, '#d2b287');
  g.fillStyle = top;
  g.fillRect(DESK_FL, DESK_BACK, DESK_FR - DESK_FL, DESK_FRONT - DESK_BACK);
  const span = DESK_FRONT - DESK_BACK;
  for (let i = 0; i < 620; i++) {
    const y = DESK_BACK + Math.pow(r(), 1.8) * span;
    const near = (y - DESK_BACK) / span;
    const x0 = DESK_FL + r() * (DESK_FR - DESK_FL + 400) - 300;
    const len = 200 + r() * 900;
    g.strokeStyle = r() < 0.6 ? `rgba(110,72,36,${0.05 + near * 0.07})` : `rgba(255,236,200,${0.04 + near * 0.05})`;
    g.lineWidth = 0.5 + near * (0.8 + r() * 1.4);
    g.beginPath();
    g.moveTo(x0, y);
    const wob = (1 + near * 3) * (r() - 0.5);
    g.bezierCurveTo(x0 + len * 0.3, y + wob * 2, x0 + len * 0.7, y - wob * 2, x0 + len, y + wob);
    g.stroke();
  }
  // just a thin contact shadow where the top meets the partition
  const sh = g.createLinearGradient(0, DESK_BACK, 0, DESK_BACK + 18);
  sh.addColorStop(0, 'rgba(30,20,10,0.35)');
  sh.addColorStop(1, 'rgba(30,20,10,0)');
  g.fillStyle = sh;
  g.fillRect(DESK_FL, DESK_BACK, DESK_FR - DESK_FL, 18);
  g.restore();

  // front edge band
  const edge = g.createLinearGradient(0, DESK_FRONT, 0, DESK_FRONT + 16);
  edge.addColorStop(0, '#f0dcc0');
  edge.addColorStop(0.15, '#b89168');
  edge.addColorStop(1, '#7a5a38');
  g.fillStyle = edge;
  g.fillRect(DESK_FL, DESK_FRONT, DESK_FR - DESK_FL, 16);
  // the side edges of the top, seen at an angle
  g.fillStyle = '#9c7a52';
  for (const [a, b] of [
    [DESK_BL, DESK_FL],
    [DESK_BR, DESK_FR],
  ] as const) {
    const d = a < VPX ? -1 : 1;
    g.beginPath();
    g.moveTo(a, DESK_BACK);
    g.lineTo(b, DESK_FRONT);
    g.lineTo(b, DESK_FRONT + 16);
    g.lineTo(b + d * 2, DESK_FRONT + 16);
    g.lineTo(a + d * 2, DESK_BACK + 4);
    g.closePath();
    g.fill();
  }
}

function paint(g: CanvasRenderingContext2D) {
  const r = rng(42);
  paintCeiling(g);
  paintWall(g, r);
  paintFloor(g, r);
  paintPartition(g, r);
  paintDesk(g, r);
}

export function DeskRoom({ className, scale }: { className?: string; scale: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const k = Math.max(0.3, scale) * dpr;
    const w = Math.round((X1 - X0) * k);
    const h = Math.round((Y1 - Y0) * k);
    if (canvas.width === w && canvas.height === h) return;
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext('2d');
    if (!g) return;
    g.setTransform(k, 0, 0, k, EXTEND_X * k, EXTEND_Y * k);
    paint(g);
  }, [scale]);
  return <canvas ref={ref} className={className} style={{ left: X0, top: Y0, width: X1 - X0, height: Y1 - Y0 }} aria-hidden="true" />;
}
