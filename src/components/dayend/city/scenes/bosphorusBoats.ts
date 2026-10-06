import { glow, glowRect } from '../kit';
import { depthScale, type SmallBoat } from './bosphorus';

/** The boats on the Bosphorus at dusk: small motor and fishing boats, and the Şehir Hatları vapur. */

export function boat(g: CanvasRenderingContext2D, b: SmallBoat, t: number) {
  const s = depthScale(b.y);
  const dir = Math.sign(b.v) || 1;
  const L = b.len * s;
  const bob = Math.sin(t * 1.3 + b.x * 0.05) * 0.6 * s;
  g.save();
  g.translate(b.x, b.y + bob);
  g.scale(dir, 1);
  // wake: two pale lines opening out behind
  g.strokeStyle = `rgba(255,220,200,${0.18 + 0.1 * Math.sin(t * 3)})`;
  g.lineWidth = Math.max(0.6, s);
  g.beginPath();
  g.moveTo(-L, 0.5 * s);
  g.lineTo(-L * 4, -2 * s);
  g.moveTo(-L, 1.5 * s);
  g.lineTo(-L * 4, 4 * s);
  g.stroke();
  // hull and cabin
  g.fillStyle = b.kind ? '#2d3c5a' : '#d9d2c8';
  g.beginPath();
  g.moveTo(-L, -1.5 * s);
  g.lineTo(L * 0.7, -1.5 * s);
  g.lineTo(L, -3 * s);
  g.lineTo(L * 0.8, 1.5 * s);
  g.lineTo(-L * 0.95, 1.5 * s);
  g.closePath();
  g.fill();
  g.fillStyle = b.kind ? '#cfc6b8' : '#efe8dc';
  g.fillRect(-L * 0.5, -5 * s, L * 0.6, 3.5 * s);
  g.globalCompositeOperation = 'lighter';
  glow(g, -L * 0.2, -3.4 * s, 2.6 * s, [255, 214, 150], 0.7);
  // navigation lights: a white masthead, green to starboard / red to port as seen from the side
  glow(g, L * 0.1, -8 * s, 2.2 * s, [255, 240, 220], 0.9, true);
  glow(g, L * 0.75, -2.5 * s, 1.8 * s, dir > 0 ? [60, 255, 120] : [255, 50, 40], 0.9);
  glowRect(g, 0, 14 * s, 2.4 * s, 24 * s, [255, 220, 170], 0.18);
  g.globalCompositeOperation = 'source-over';
  g.restore();
}

/** A Şehir Hatları vapur side-on at dusk: dark hull, cream upper works, two rows of warm windows. */
export function ferry(g: CanvasRenderingContext2D, x: number, y: number, s: number, dir: 1 | -1, moving: boolean, t: number) {
  const sway = Math.sin(t * 0.9) * 1.2 * s;
  g.save();
  g.translate(x, y + sway);
  g.scale(s * dir, s);
  g.globalCompositeOperation = 'lighter';
  if (moving) {
    // wake behind the stern and the bow wave
    glowRect(g, -170, 20, 220, 10, [255, 210, 180], 0.22);
    g.strokeStyle = 'rgba(255,225,205,0.35)';
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(-72, 18);
    g.lineTo(-260, 10);
    g.moveTo(-72, 22);
    g.lineTo(-260, 32);
    g.moveTo(80, 18);
    g.quadraticCurveTo(88, 24, 74, 26);
    g.stroke();
  }
  g.globalCompositeOperation = 'source-over';
  // hull: black below, a white band, a raked bow at +x
  g.fillStyle = '#16181f';
  g.beginPath();
  g.moveTo(-72, 8);
  g.lineTo(80, 8);
  g.lineTo(72, 22);
  g.lineTo(-66, 22);
  g.quadraticCurveTo(-72, 18, -72, 8);
  g.fill();
  g.fillStyle = '#ece6da';
  g.fillRect(-72, 2, 150, 7);
  // main deck house and windows
  g.fillStyle = '#e4ddcf';
  g.fillRect(-60, -14, 124, 16);
  g.fillStyle = '#ffd08a';
  for (let i = 0; i < 15; i++) g.fillRect(-56 + i * 8, -10, 5, 7);
  // upper deck, its windows, the wheelhouse forward
  g.fillStyle = '#ddd5c6';
  g.fillRect(-44, -28, 92, 14);
  g.fillStyle = '#f6c47c';
  for (let i = 0; i < 10; i++) g.fillRect(-40 + i * 8, -25, 5, 6);
  g.fillStyle = '#e8e1d3';
  g.fillRect(34, -38, 16, 10);
  g.fillStyle = '#2b3442';
  g.fillRect(36, -36, 12, 4);
  // railing on the top deck
  g.strokeStyle = 'rgba(240,235,225,0.7)';
  g.lineWidth = 0.8;
  g.beginPath();
  g.moveTo(-44, -32);
  g.lineTo(32, -32);
  for (let i = -44; i <= 32; i += 6) {
    g.moveTo(i, -32);
    g.lineTo(i, -28);
  }
  g.stroke();
  // funnel: cream with a black top
  g.fillStyle = '#d9c38f';
  g.beginPath();
  g.moveTo(-8, -28);
  g.lineTo(-6, -50);
  g.lineTo(8, -50);
  g.lineTo(8, -28);
  g.fill();
  g.fillStyle = '#121212';
  g.fillRect(-6, -54, 14, 6);
  // mast with its white light, the flag at the stern
  g.strokeStyle = '#d8d2c4';
  g.beginPath();
  g.moveTo(52, -38);
  g.lineTo(52, -58);
  g.stroke();
  g.fillStyle = '#c8202a';
  g.fillRect(-74, -6, 7, 5);
  g.globalCompositeOperation = 'lighter';
  glow(g, 52, -59, 4, [255, 245, 225], 0.95, true);
  glow(g, 76, -2, 3, [60, 255, 120], 0.8);
  glowRect(g, 0, -6, 190, 34, [255, 190, 120], 0.22);
  // the windows' reflection broken up by the swell
  for (let i = 0; i < 15; i++) glowRect(g, -54 + i * 8, 34 + Math.sin(t * 3 + i) * 2, 5, 22, [255, 190, 120], 0.16);
  g.globalCompositeOperation = 'source-over';
  g.restore();
}
