import { glow, glowRect, rgba, type RGB } from '../kit';

/** Karaköy's moving lights: broken gold dashes of reflection on the Golden Horn, and the night ferry. */

const streaks = new Map<string, HTMLCanvasElement>();
/** A soft horizontal dash of light: flat bright core, feathered ends — one broken ripple of reflection. */
function streak(c: RGB) {
  const key = c.join();
  let s = streaks.get(key);
  if (s) return s;
  s = document.createElement('canvas');
  s.width = 64;
  s.height = 12;
  const g = s.getContext('2d')!;
  const gx = g.createLinearGradient(0, 0, 64, 0);
  gx.addColorStop(0, rgba(c, 0));
  gx.addColorStop(0.25, rgba(c, 0.9));
  gx.addColorStop(0.5, rgba([255, (c[1] + 255) / 2, (c[2] + 200) / 2], 1));
  gx.addColorStop(0.75, rgba(c, 0.9));
  gx.addColorStop(1, rgba(c, 0));
  g.fillStyle = gx;
  g.fillRect(0, 0, 64, 12);
  g.globalCompositeOperation = 'destination-in';
  const gy = g.createLinearGradient(0, 0, 0, 12);
  gy.addColorStop(0, 'rgba(0,0,0,0)');
  gy.addColorStop(0.5, 'rgba(0,0,0,1)');
  gy.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gy;
  g.fillRect(0, 0, 64, 12);
  streaks.set(key, s);
  return s;
}
export const dash = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: RGB, a: number) => {
  if (a < 0.02 || w < 0.5) return;
  g.globalAlpha = a > 1 ? 1 : a;
  g.drawImage(streak(c), x - w / 2, y - h / 2, w, h);
  g.globalAlpha = 1;
};

/** A Şehir Hatları ferry side-on at night: dark hull, black band, two decks of warm windows, cream funnel with a black top. */
export function ferry(g: CanvasRenderingContext2D, x: number, y: number, s: number, t: number) {
  if (s < 0.08 || x < -300) return;
  const fade = g.globalAlpha;
  g.save();
  g.translate(x, y + Math.sin(t * 0.8) * s);
  g.scale(s, s);
  g.scale(-1, 1);
  g.fillStyle = '#9b978d';
  g.beginPath();
  g.moveTo(-110, -2);
  g.lineTo(118, -2);
  g.quadraticCurveTo(130, 6, 120, 20);
  g.lineTo(-104, 20);
  g.quadraticCurveTo(-120, 8, -110, -2);
  g.fill();
  g.fillStyle = '#0d1018';
  g.fillRect(-106, 14, 222, 7);
  g.fillStyle = '#8e897e';
  g.fillRect(-92, -24, 190, 22);
  g.fillStyle = '#827d72';
  g.fillRect(-64, -37, 128, 13);
  g.fillStyle = 'rgba(220,224,232,0.8)';
  g.fillRect(-95, -27, 196, 3);
  g.fillStyle = '#b89440';
  g.fillRect(96, -58, 3, 34);
  g.fillStyle = '#b8ad92';
  g.fillRect(-10, -62, 20, 26);
  g.fillStyle = '#0d1018';
  g.fillRect(-10, -62, 20, 6);
  g.fillStyle = '#ffd08e';
  for (let i = 0; i < 18; i++) g.fillRect(-98 + i * 12, 2, 7, 8);
  for (let i = 0; i < 14; i++) g.fillRect(-86 + i * 13, -19, 8, 10);
  g.globalCompositeOperation = 'lighter';
  glowRect(g, 0, -6, 320, 60, [255, 190, 120], 0.22 * fade);
  for (let i = 0; i < 18; i += 2) dash(g, -94 + i * 12 + Math.sin(t * 2 + i) * 3, 30 + (i % 4) * 6, 22, 5, [255, 190, 120], 0.5 * fade);
  glow(g, 118, 2, 10, [255, 240, 210], 0.9 * fade, true);
  glow(g, 98, -58, 6, [255, 90, 80], 0.8 * fade, true);
  g.globalCompositeOperation = 'source-over';
  g.restore();
}
