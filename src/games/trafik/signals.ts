import { LIGHT, blink, bodyPose } from './sprites';
import { crossPoint, inPoint, pose } from './junction';
import { DIRS, type Car, type Dir, type MoveId, type SignalState } from './model';
import { applyView, type View } from './paint';
import { backlogOf, queueOf, signal, type Sim } from './sim';
import { faulty } from './controller';

/*
 * Kavşağın üstüne çizilenler: ışıklar, kazalar, gece ve yağmur, ambulansın ışığı, seçili hareketlerin
 * okları ve kuyruk bantları ile etiketleri.
 */

/** Kolun bir şeridinin ışığı: şeritteki hareketlerin en iyisi. */
function laneState(sim: Sim, d: Dir, lane: string): SignalState {
  const order: SignalState[] = ['green', 'amber', 'red'];
  let best = 2;
  for (const t of lane) best = Math.min(best, order.indexOf(signal(sim, `${d}.${t}` as MoveId)));
  return order[best];
}

export function drawSignals(ctx: CanvasRenderingContext2D, sim: Sim, t: number) {
  for (const g of Object.values(sim.j.legs)) {
    const n = g.spec.lanes.length;
    // duruş çizgisinin üstünde ince renkli şerit: hangi şerit ne yanıyor, bir bakışta
    g.spec.lanes.forEach((l, i) => {
      const st = laneState(sim, g.dir, l);
      if (faulty(sim) && !blink(t, 1)) return;
      const [x, y] = inPoint(g, i, g.stop + 0.9);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.atan2(g.u[1], g.u[0]));
      ctx.fillStyle = LIGHT[st];
      ctx.globalAlpha = 0.85;
      ctx.fillRect(-0.25, -1.4, 0.5, 2.8);
      ctx.restore();
    });
    // direk ve kol: sağ kaldırımdan şeritlerin üstüne uzanır
    const base = inPoint(g, n - 1, g.stop - 1);
    const pole: [number, number] = [base[0] + g.rin[0] * (LANE_HALF + 1.1), base[1] + g.rin[1] * (LANE_HALF + 1.1)];
    const tip = inPoint(g, 0, g.stop - 1);
    ctx.strokeStyle = '#2e3034';
    ctx.lineWidth = 0.22;
    ctx.beginPath();
    ctx.moveTo(pole[0], pole[1]);
    ctx.lineTo(tip[0] - g.rin[0] * 0.8, tip[1] - g.rin[1] * 0.8);
    ctx.stroke();
    ctx.fillStyle = '#26282c';
    ctx.beginPath();
    ctx.arc(pole[0], pole[1], 0.28, 0, Math.PI * 2);
    ctx.fill();
    g.spec.lanes.forEach((l, i) => {
      const st = laneState(sim, g.dir, l);
      const [x, y] = inPoint(g, i, g.stop - 1);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.atan2(-g.u[1], -g.u[0]));
      ctx.fillStyle = '#17181b';
      ctx.beginPath();
      ctx.roundRect(-0.35, -0.85, 0.7, 1.7, 0.18);
      ctx.fill();
      // arızada sarı flaşör: yanar, söner
      const slot = faulty(sim) && !blink(t, 1) ? 9 : st === 'red' ? -0.52 : st === 'amber' ? 0 : 0.52;
      for (const q of [-0.52, 0, 0.52]) {
        ctx.fillStyle = q === slot ? LIGHT[st] : '#33353a';
        ctx.beginPath();
        ctx.arc(0, q, 0.22, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
    // yaya ışıkları: geçidin iki ucunda
    if (g.crosswalk) {
      const st = signal(sim, `${g.dir}.P`);
      const flash = st === 'amber';
      const on = st === 'green' || (flash && blink(t, 1.6));
      for (const tt of [-0.08, 1.08]) {
        const [x, y] = crossPoint(g, tt, -2.6);
        ctx.fillStyle = '#1a1b1e';
        ctx.beginPath();
        ctx.roundRect(x - 0.32, y - 0.32, 0.64, 0.64, 0.12);
        ctx.fill();
        ctx.fillStyle = on ? LIGHT.green : st === 'red' || flash ? (flash ? '#2a2c30' : LIGHT.red) : '#2a2c30';
        ctx.beginPath();
        ctx.arc(x, y, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

const LANE_HALF = 3.3 / 2;

export function drawCrashes(ctx: CanvasRenderingContext2D, sim: Sim, t: number) {
  for (const c of sim.incidents) {
    if (c.kind !== 'crash' || c.cleared !== undefined) continue;
    ctx.fillStyle = 'rgba(220,230,235,0.75)';
    for (let k = 0; k < 9; k++) {
      const a = k * 2.4 + c.at;
      const r = 0.6 + ((k * 37) % 10) / 6;
      ctx.fillRect(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r, 0.12, 0.12);
    }
    // uyarı üçgeni
    ctx.save();
    ctx.translate(c.x - 3.5, c.y + 2.5);
    ctx.fillStyle = '#e8362a';
    ctx.beginPath();
    ctx.moveTo(0, -0.6);
    ctx.lineTo(0.55, 0.4);
    ctx.lineTo(-0.55, 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    const pulse = (t * 1.2) % 1;
    ctx.strokeStyle = `rgba(255,70,50,${(1 - pulse) * 0.8})`;
    ctx.lineWidth = 0.35;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 2 + pulse * 6, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** Akşam: sahne kararır, lambalar, farlar, stoplar ve sinyaller parlar. */
export function drawNight(ctx: CanvasRenderingContext2D, sim: Sim, view: View, lamps: [number, number][], dusk: number, shade = true, city: [number, number, number][] = []) {
  if (dusk <= 0) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // ağda kararma bir kez, ışıklar her kavşakta
  if (shade) {
    ctx.fillStyle = `rgba(14,20,44,${0.55 * dusk})`;
    ctx.fillRect(0, 0, view.w, view.h);
  }
  applyView(ctx, view);
  ctx.globalCompositeOperation = 'lighter';
  const glow = (x: number, y: number, r: number, rgb: string, a: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  for (const [x, y] of lamps) glow(x, y, 9, '255,196,120', 0.22 * dusk);
  for (const c of sim.cars) {
    const [x, y, a] = bodyPose(c);
    const fx = x + Math.cos(a) * c.len * 0.5;
    const fy = y + Math.sin(a) * c.len * 0.5;
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(a);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 11);
    g.addColorStop(0, `rgba(255,240,200,${0.3 * dusk})`);
    g.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -0.8);
    ctx.lineTo(11, -3.5);
    ctx.lineTo(11, 3.5);
    ctx.lineTo(0, 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    const bx = x - Math.cos(a) * c.len * 0.5;
    const by = y - Math.sin(a) * c.len * 0.5;
    glow(bx, by, c.braking ? 2.6 : 1.4, '255,40,30', (c.braking ? 0.5 : 0.25) * dusk);
  }
  // şehrin öbür araçları: ucuz far, yalnızca önde bir ışık lekesi ve arkada kırmızı nokta
  const ghosts = sim.ghosts.map((gh) => pose({ pts: gh.pts, cum: gh.cum } as Car['path'], gh.d));
  // uzaktan yüzlerce araç görünür: farların ilk birkaç yüzü yeter
  for (const [x, y, a] of [...city.slice(0, 260), ...ghosts.slice(0, 140)]) {
    glow(x + Math.cos(a) * 6, y + Math.sin(a) * 6, 5, '255,240,200', 0.22 * dusk);
    glow(x - Math.cos(a) * 2.4, y - Math.sin(a) * 2.4, 1.2, '255,40,30', 0.3 * dusk);
  }
  for (const g of Object.values(sim.j.legs))
    g.spec.lanes.forEach((l, i) => {
      const st = laneState(sim, g.dir, l);
      const [x, y] = inPoint(g, i, g.stop - 1);
      glow(x, y, 3, st === 'green' ? '60,230,120' : st === 'amber' ? '255,180,40' : '255,70,50', 0.45 * dusk);
    });
  ctx.restore();
}

export function drawAmbulanceGlow(ctx: CanvasRenderingContext2D, sim: Sim, t: number) {
  for (const c of sim.cars) {
    if (c.kind !== 'ambulance' && c.kind !== 'police') continue;
    const [x, y] = bodyPose(c);
    const on = blink(t, 3);
    const g = ctx.createRadialGradient(x, y, 0, x, y, 9);
    g.addColorStop(0, on ? 'rgba(60,120,255,0.35)' : 'rgba(255,60,40,0.35)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Yağmur: ekran pikselinde eğik çizgiler. */
export function drawRain(ctx: CanvasRenderingContext2D, view: View, t: number) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'rgba(70,90,110,0.12)';
  ctx.fillRect(0, 0, view.w, view.h);
  ctx.strokeStyle = 'rgba(200,215,230,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const n = Math.round((view.w * view.h) / 9000);
  for (let i = 0; i < n; i++) {
    const sx = (i * 7919) % view.w;
    const sy = ((i * 104729) % view.h + t * 900) % view.h;
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx - 4, sy + 14);
  }
  ctx.stroke();
  ctx.restore();
}

/** Işık kartının yolları: gelen şeritten kutudan geçip çıkışa, yeşil parlayan şerit ve ok başı. */
export function drawMoves(ctx: CanvasRenderingContext2D, sim: Sim, moves: MoveId[], t: number) {
  const pulse = 0.45 + 0.2 * Math.sin(t * 5);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [key, p] of sim.j.paths) {
    if (!moves.includes(key.split(':')[0] as MoveId)) continue;
    const from = Math.max(0, p.stop - 40);
    const to = Math.min(p.len, p.boxOut + 14);
    ctx.strokeStyle = `rgba(54,224,122,${pulse})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let s = from; s <= to; s += 1) {
      const [x, y] = pose(p, s);
      if (s === from) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    const [x, y, a] = pose(p, to);
    ctx.fillStyle = `rgba(54,224,122,${pulse + 0.2})`;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * 2.2, y + Math.sin(a) * 2.2);
    ctx.lineTo(x + Math.cos(a + 2.4) * 1.6, y + Math.sin(a + 2.4) * 1.6);
    ctx.lineTo(x + Math.cos(a - 2.4) * 1.6, y + Math.sin(a - 2.4) * 1.6);
    ctx.closePath();
    ctx.fill();
  }
  // yaya hareketleri: geçidin üstünde
  for (const mv of moves) {
    if (mv[2] !== 'P') continue;
    const g = sim.j.legs[mv[0] as Dir];
    if (!g) continue;
    const a = crossPoint(g, 0);
    const b = crossPoint(g, 1);
    ctx.strokeStyle = `rgba(54,224,122,${pulse})`;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([1, 1]);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

/**
 * Kuyruk şeridi: her gelen şeritte duruş çizgisinden kuyruğun sonuna kadar yarı saydam bant; rengi
 * en uzun bekleyene göre sarıdan kırmızıya. Kolun gerisine taşan kuyruk da bantta.
 */
export function drawQueueBands(ctx: CanvasRenderingContext2D, sim: Sim) {
  for (const d of DIRS) {
    const g = sim.j.legs[d];
    if (!g) continue;
    const n = g.spec.lanes.length;
    const back = sim.links[d] ? 0 : (Math.ceil(backlogOf(sim, d) / n) * 7);
    for (let lane = 0; lane < n; lane++) {
      let s0 = Infinity;
      let wait = 0;
      // duruş çizgisinden geriye kesintisiz duran araçlar
      const q = sim.cars.filter((c) => c.mv[0] === d && c.lane === lane && c.s < c.path.stop && c.v < 2).sort((a, b) => b.s - a.s);
      let edge = g.len - g.stop;
      for (const c of q) {
        if (edge - c.s > 14) break;
        s0 = c.s - c.len;
        edge = s0;
        wait = Math.max(wait, c.waited);
      }
      if (!Number.isFinite(s0) || wait < 3) continue;
      const far = s0 <= 8 ? g.len + back : g.len - s0;
      const tone = wait > 60 ? '226,85,63' : wait > 30 ? '240,140,40' : '255,196,64';
      const a = inPoint(g, lane, g.stop);
      const b = inPoint(g, lane, far);
      ctx.strokeStyle = `rgba(${tone},0.32)`;
      ctx.lineWidth = 3;
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
  }
}

/** Kolların kuyruk etiketleri: araç sayısı, en uzun bekleyiş, gerideki araçlar. */
export function drawQueueTags(ctx: CanvasRenderingContext2D, sim: Sim, view: View, dpr: number, compact = false) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const fs = Math.round(12 * dpr);
  ctx.font = `600 ${fs}px "Work Sans Variable", "Helvetica Neue", Arial, sans-serif`;
  ctx.textBaseline = 'middle';
  for (const d of DIRS) {
    const g = sim.j.legs[d];
    // komşuya giden yolun kuyruğu haritada görünür: etiket yalnızca dış kollarda
    if (!g || sim.links[d]) continue;
    const q = queueOf(sim, d);
    const back = backlogOf(sim, d);
    const wx = g.u[0] * (g.stop + 26) - g.rout[0] * (g.inW + 2.4);
    const wy = g.u[1] * (g.stop + 26) - g.rout[1] * (g.inW + 2.4);
    const sx = view.w / 2 + (wx - view.cx) * view.k;
    const sy = view.h / 2 + (wy - view.cy) * view.k;
    const text = compact ? `${q.wait > 45 ? '📢 ' : ''}${q.n} araç · ${Math.round(q.wait)} sn` : `${q.wait > 45 ? '📢 ' : ''}${g.spec.name} · ${q.n} araç · ${Math.round(q.wait)} sn${back ? ` · +${back} geride` : ''}`;
    const tw = ctx.measureText(text).width + 22 * dpr;
    const th = 24 * dpr;
    // etiket yolun üstünde durur: kamera kayınca yolla birlikte kayar, ekrandan çıkınca çizilmez
    if (sx + tw / 2 < 0 || sx - tw / 2 > view.w || sy < 0 || sy > view.h) continue;
    const tone = q.wait > 60 || back > 6 ? '#e2553f' : q.wait > 30 ? '#e6a813' : '#3fae63';
    ctx.fillStyle = 'rgba(18,20,24,0.82)';
    ctx.beginPath();
    ctx.roundRect(sx - tw / 2, sy - th / 2, tw, th, th / 2);
    ctx.fill();
    ctx.fillStyle = tone;
    ctx.beginPath();
    ctx.arc(sx - tw / 2 + 11 * dpr, sy, 4 * dpr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f1eee6';
    ctx.textAlign = 'left';
    ctx.fillText(text, sx - tw / 2 + 19 * dpr, sy + dpr);
  }
  ctx.restore();
}
