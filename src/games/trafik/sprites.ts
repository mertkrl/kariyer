import { crossPoint, inPoint, pose } from './junction';
import { CAR_COLORS, DIRS, PED_COLORS, turnOf, type Car, type Dir, type MoveId, type Ped, type SignalState } from './model';
import { shade } from './facade';
import { applyView, type View } from './paint';
import { backlogOf, queueOf, signal, type Sim } from './sim';

/*
 * Her karede değişenler: kuşbakışı araçlar (gövde, camlar, tavan, aynalar, farlar; frende yanan
 * stoplar, dönerken yanıp sönen sinyaller; taksinin tepe lambası, dolmuşun uzun tavanı, otobüsün
 * klimaları, ambulansın tepe lambası), şemsiyeli ya da şemsiyesiz yayalar, sinyal direkleri ve
 * yaya ışıkları, kazalar, akşam ışıkları ve yağmur. Kolların ucundaki kuyruk etiketleri ekran
 * pikselinde çizilir ki her boyutta okunsun.
 */

export const LIGHT: Record<SignalState, string> = { green: '#36e07a', amber: '#ffb81c', red: '#ff4b3a' };

function bodyPose(c: Car): [number, number, number] {
  const f = pose(c.path, c.s);
  const b = pose(c.path, c.s - c.len);
  return [(f[0] + b[0]) / 2, (f[1] + b[1]) / 2, Math.atan2(f[1] - b[1], f[0] - b[0])];
}

const blink = (t: number, hz = 1.4) => Math.floor(t * hz * 2) % 2 === 0;

export function drawCar(ctx: CanvasRenderingContext2D, c: Car, t: number) {
  const [x, y, a0] = bodyPose(c);
  // kazalı araç biraz yan döner
  const a = a0 + (c.crashed !== undefined ? (((c.id * 53) % 7) - 3) * 0.12 : 0);
  const L = c.len;
  const W = c.kind === 'bus' ? 2.5 : c.kind === 'truck' || c.kind === 'ambulance' ? 2.15 : c.kind === 'dolmus' ? 2 : 1.82;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.fillStyle = 'rgba(10,10,14,0.38)';
  ctx.beginPath();
  ctx.roundRect(-L / 2 + 0.3, -W / 2 + 0.35, L, W, 0.6);
  ctx.fill();

  const color = c.kind === 'taxi' ? '#f2c014' : c.kind === 'dolmus' ? '#f1e7b6' : c.kind === 'bus' ? '#eeeeea' : c.kind === 'ambulance' || c.kind === 'police' ? '#f6f6f2' : c.kind === 'vip' ? '#15171b' : CAR_COLORS[c.color];
  const g = ctx.createLinearGradient(0, -W / 2, 0, W / 2);
  g.addColorStop(0, shade(color, 0.72));
  g.addColorStop(0.35, color);
  g.addColorStop(0.65, color);
  g.addColorStop(1, shade(color, 0.72));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(-L / 2, -W / 2, L, W, c.kind === 'bus' ? 0.45 : 0.62);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 0.06;
  ctx.stroke();

  const glass = '#1b232d';
  if (c.kind === 'bus') {
    ctx.fillStyle = '#c3302a';
    ctx.fillRect(L / 2 - 0.5, -W / 2, 0.5, W);
    ctx.fillRect(-L / 2, -W / 2, 0.35, W);
    ctx.fillStyle = glass;
    ctx.fillRect(-L / 2 + 0.6, -W / 2 + 0.02, L - 1.4, 0.22);
    ctx.fillRect(-L / 2 + 0.6, W / 2 - 0.24, L - 1.4, 0.22);
    ctx.fillStyle = '#c9cbc8';
    ctx.fillRect(-1.6, -0.75, 2.6, 1.5);
    ctx.fillRect(2.2, -0.6, 1.4, 1.2);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    for (let q = -1.4; q < 1; q += 0.4) {
      ctx.moveTo(q, -0.7);
      ctx.lineTo(q, 0.7);
    }
    ctx.stroke();
  } else if (c.kind === 'truck') {
    ctx.fillStyle = shade(CAR_COLORS[c.color], 1);
    ctx.fillRect(L / 2 - 2, -W / 2, 2, W);
    ctx.fillStyle = glass;
    ctx.fillRect(L / 2 - 1, -W / 2 + 0.15, 0.45, W - 0.3);
    ctx.fillStyle = '#dcdbd5';
    ctx.fillRect(-L / 2, -W / 2, L - 2.15, W);
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    for (let q = -L / 2 + 0.6; q < L / 2 - 2.2; q += 0.6) {
      ctx.moveTo(q, -W / 2);
      ctx.lineTo(q, W / 2);
    }
    ctx.stroke();
  } else {
    const long = c.kind === 'dolmus' || c.kind === 'ambulance';
    // ön cam, tavan, arka cam
    const wsF = long ? L / 2 - 0.7 : L * 0.3;
    const wsB = long ? L / 2 - 1.5 : L * 0.12;
    ctx.fillStyle = glass;
    ctx.beginPath();
    ctx.moveTo(wsF, -W / 2 + 0.2);
    ctx.lineTo(wsF, W / 2 - 0.2);
    ctx.lineTo(wsB, W / 2 - 0.12);
    ctx.lineTo(wsB, -W / 2 + 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(160,190,220,0.35)';
    ctx.fillRect(wsB + 0.08, -W / 2 + 0.3, (wsF - wsB) * 0.35, W * 0.3);
    const roofB = long ? -L / 2 + 0.3 : -L * 0.24;
    ctx.fillStyle = shade(color, 1.06);
    ctx.fillRect(roofB, -W / 2 + 0.16, wsB - roofB, W - 0.32);
    ctx.fillStyle = glass;
    ctx.fillRect(wsB - 0.04, -W / 2 + 0.04, roofB - wsB + 0.08, 0.12);
    ctx.fillRect(wsB - 0.04, W / 2 - 0.16, roofB - wsB + 0.08, 0.12);
    if (!long) {
      ctx.beginPath();
      ctx.moveTo(roofB, -W / 2 + 0.2);
      ctx.lineTo(roofB, W / 2 - 0.2);
      ctx.lineTo(-L * 0.36, W / 2 - 0.3);
      ctx.lineTo(-L * 0.36, -W / 2 + 0.3);
      ctx.closePath();
      ctx.fill();
    }
    if (c.kind === 'taxi') {
      ctx.fillStyle = '#fbfbf5';
      ctx.fillRect(-0.45, -0.32, 0.65, 0.64);
      ctx.fillStyle = '#1b1b1b';
      ctx.fillRect(-0.45, -0.32, 0.65, 0.12);
      ctx.fillRect(-0.45, 0.2, 0.65, 0.12);
    }
    if (c.kind === 'dolmus') {
      ctx.fillStyle = '#2c7a8c';
      ctx.fillRect(-L / 2 + 0.2, -W / 2, L - 1.2, 0.1);
      ctx.fillRect(-L / 2 + 0.2, W / 2 - 0.1, L - 1.2, 0.1);
    }
    if (c.kind === 'police') {
      ctx.fillStyle = '#1f4fa0';
      ctx.fillRect(-L / 2 + 0.3, -W / 2, L - 0.8, 0.2);
      ctx.fillRect(-L / 2 + 0.3, W / 2 - 0.2, L - 0.8, 0.2);
    }
    if (c.kind === 'police' || c.kind === 'vip') {
      const on = blink(t, 3);
      ctx.fillStyle = on ? '#3a7bff' : c.kind === 'police' ? '#ff3a2e' : '#0e0f12';
      ctx.fillRect(-0.3, -W / 2 + 0.25, 0.3, W / 2 - 0.25);
      ctx.fillStyle = on ? (c.kind === 'police' ? '#ff3a2e' : '#0e0f12') : '#3a7bff';
      ctx.fillRect(-0.3, 0, 0.3, W / 2 - 0.25);
      if (c.kind === 'vip') {
        // ön çamurlukta bayrak
        ctx.fillStyle = '#e30a17';
        ctx.fillRect(L / 2 - 0.9, -W / 2 - 0.35, 0.6, 0.38);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(L / 2 - 0.62, -W / 2 - 0.16, 0.09, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (c.kind === 'ambulance') {
      ctx.fillStyle = '#d93a2b';
      ctx.fillRect(-L / 2 + 0.3, -W / 2, L - 1.2, 0.16);
      ctx.fillRect(-L / 2 + 0.3, W / 2 - 0.16, L - 1.2, 0.16);
      ctx.fillRect(-1.6, -0.12, 1.2, 0.24);
      ctx.fillRect(-1.12, -0.6, 0.24, 1.2);
      const on = blink(t, 3);
      ctx.fillStyle = on ? '#3a7bff' : '#ff3a2e';
      ctx.fillRect(wsB - 0.5, -W / 2 + 0.2, 0.35, W / 2 - 0.2);
      ctx.fillStyle = on ? '#ff3a2e' : '#3a7bff';
      ctx.fillRect(wsB - 0.5, 0, 0.35, W / 2 - 0.2);
    }
    // aynalar
    ctx.fillStyle = shade(color, 0.8);
    ctx.fillRect(wsF - 0.3, -W / 2 - 0.16, 0.22, 0.18);
    ctx.fillRect(wsF - 0.3, W / 2 - 0.02, 0.22, 0.18);
  }
  // farlar, stoplar, sinyaller
  ctx.fillStyle = '#fff6d8';
  ctx.fillRect(L / 2 - 0.12, -W / 2 + 0.18, 0.12, 0.42);
  ctx.fillRect(L / 2 - 0.12, W / 2 - 0.6, 0.12, 0.42);
  const brake = c.braking || c.crashed !== undefined;
  ctx.fillStyle = brake ? '#ff2a1a' : '#8a1d16';
  ctx.fillRect(-L / 2, -W / 2 + 0.16, 0.13, 0.45);
  ctx.fillRect(-L / 2, W / 2 - 0.61, 0.13, 0.45);
  const turn = turnOf(c.mv);
  const near = c.s > c.path.stop - 35 && c.s < c.path.boxOut + 2;
  const hazard = c.crashed !== undefined || !!c.broken;
  if (((turn !== 'T' && near) || hazard) && blink(t)) {
    ctx.fillStyle = '#ffae1a';
    for (const side of hazard ? [-1, 1] : [turn === 'L' ? -1 : 1]) {
      ctx.fillRect(L / 2 - 0.3, side < 0 ? -W / 2 - 0.02 : W / 2 - 0.16, 0.3, 0.18);
      ctx.fillRect(-L / 2, side < 0 ? -W / 2 - 0.02 : W / 2 - 0.16, 0.3, 0.18);
    }
  }
  ctx.restore();
}

export function drawPed(ctx: CanvasRenderingContext2D, sim: Sim, p: Ped, t: number) {
  const g = sim.j.legs[p.leg]!;
  const width = g.inW + g.outW + 2;
  // bekleyen yayalar kaldırımda küme olur
  const wait = !p.walking;
  const tt = wait ? (p.dir > 0 ? -0.03 - ((p.id * 17) % 10) / width / 3 : 1.03 + ((p.id * 17) % 10) / width / 3) : p.t;
  const [x, y] = crossPoint(g, tt, p.side);
  const dx = g.rout[0] * p.dir;
  const dy = g.rout[1] * p.dir;
  const a = Math.atan2(dy, dx);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  // kuşbakışında görünsün diye yayalar biraz iri çizilir
  ctx.scale(1.35, 1.35);
  if (p.hit) {
    ctx.fillStyle = PED_COLORS[p.color];
    ctx.fillRect(-0.8, -0.2, 1.6, 0.4);
    ctx.restore();
    return;
  }
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0.12, 0.12, 0.32, 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
  if (p.walking) {
    const ph = Math.sin(t * 9 * p.speed + p.id) * 0.22;
    ctx.fillStyle = '#26262a';
    ctx.beginPath();
    ctx.ellipse(ph, -0.11, 0.13, 0.07, 0, 0, Math.PI * 2);
    ctx.ellipse(-ph, 0.11, 0.13, 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (sim.spec.rain && (p.id % 3 !== 0)) {
    ctx.fillStyle = PED_COLORS[(p.color + 3) % PED_COLORS.length];
    ctx.beginPath();
    ctx.arc(0, 0, 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos((k / 6) * Math.PI * 2) * 0.55, Math.sin((k / 6) * Math.PI * 2) * 0.55);
    }
    ctx.stroke();
  } else {
    ctx.fillStyle = PED_COLORS[p.color];
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.17, 0.27, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = (p.id * 7) % 4 === 0 ? '#c9a46a' : '#2a2018';
    ctx.beginPath();
    ctx.arc(0.02, 0, 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

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
      const slot = st === 'red' ? -0.52 : st === 'amber' ? 0 : 0.52;
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
export function drawNight(ctx: CanvasRenderingContext2D, sim: Sim, view: View, lamps: [number, number][], dusk: number) {
  if (dusk <= 0) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = `rgba(14,20,44,${0.55 * dusk})`;
  ctx.fillRect(0, 0, view.w, view.h);
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

/** Kolların kuyruk etiketleri: araç sayısı, en uzun bekleyiş, gerideki araçlar. */
export function drawQueueTags(ctx: CanvasRenderingContext2D, sim: Sim, view: View, dpr: number) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const fs = Math.round(12 * dpr);
  ctx.font = `600 ${fs}px "Work Sans Variable", "Helvetica Neue", Arial, sans-serif`;
  ctx.textBaseline = 'middle';
  for (const d of DIRS) {
    const g = sim.j.legs[d];
    if (!g) continue;
    const q = queueOf(sim, d);
    const back = backlogOf(sim, d);
    const wx = g.u[0] * (g.stop + 26) - g.rout[0] * (g.inW + 2.4);
    const wy = g.u[1] * (g.stop + 26) - g.rout[1] * (g.inW + 2.4);
    let sx = view.w / 2 + (wx - view.cx) * view.k;
    let sy = view.h / 2 + (wy - view.cy) * view.k;
    const text = `${q.wait > 45 ? '📢 ' : ''}${g.spec.name} · ${q.n} araç · ${Math.round(q.wait)} sn${back ? ` · +${back} geride` : ''}`;
    const tw = ctx.measureText(text).width + 22 * dpr;
    const th = 24 * dpr;
    sx = Math.max(8 * dpr + tw / 2, Math.min(view.w - 8 * dpr - tw / 2, sx));
    sy = Math.max(70 * dpr, Math.min(view.h - 190 * dpr, sy));
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

/** Kırmızı-beyaz bariyer: `a`dan `b`ye, üstünde yanıp sönen sarı lamba. */
function barrier(ctx: CanvasRenderingContext2D, a: [number, number], b: [number, number], t: number) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  ctx.save();
  ctx.translate(a[0], a[1]);
  ctx.rotate(Math.atan2(b[1] - a[1], b[0] - a[0]));
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(0.2, 0.25, len, 0.55);
  for (let u = 0, k = 0; u < len; u += 0.8, k++) {
    ctx.fillStyle = k % 2 ? '#f4f1e8' : '#d8261c';
    ctx.fillRect(u, -0.27, Math.min(0.8, len - u), 0.55);
  }
  if (blink(t, 1)) {
    ctx.fillStyle = '#ffc21a';
    for (const u of [0.3, len - 0.3]) {
      ctx.beginPath();
      ctx.arc(u, 0, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Kolların yol düzeni: kapanan yönün şeritlerine bariyer, kapının önüne "girilmez" tabelası. */
export function drawBarriers(ctx: CanvasRenderingContext2D, sim: Sim, t: number) {
  for (const d of DIRS) {
    const g = sim.j.legs[d];
    const m = sim.mode[d] ?? 'iki';
    if (!g || m === 'iki') continue;
    const s0 = g.stop + 6;
    const across = (lat0: number, lat1: number): [[number, number], [number, number]] => [
      [g.u[0] * s0 + g.rin[0] * lat0, g.u[1] * s0 + g.rin[1] * lat0],
      [g.u[0] * s0 + g.rin[0] * lat1, g.u[1] * s0 + g.rin[1] * lat1],
    ];
    if (m === 'cikis' || m === 'kapali') {
      const [a, b] = across(g.half + 0.3, g.inW - 0.3);
      barrier(ctx, a, b, t);
    }
    if (m === 'giris' || m === 'kapali') {
      const [a, b] = across(-g.half - 0.3, -g.outW + 0.3);
      barrier(ctx, a, b, t);
      // girilmez tabelası: kırmızı daire, beyaz bant
      const [x, y] = [g.u[0] * (g.stop + 3) + g.rout[0] * (g.outW + 1.2), g.u[1] * (g.stop + 3) + g.rout[1] * (g.outW + 1.2)];
      ctx.fillStyle = '#d8261c';
      ctx.beginPath();
      ctx.arc(x, y, 0.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(x - 0.5, y - 0.14, 1, 0.28);
    }
  }
}

/** Düğün: süslü araçlar, halay çeken kalabalık, davulcu. Arıza ve çift sıra park: üçgen. */
export function drawIncidents(ctx: CanvasRenderingContext2D, sim: Sim, t: number) {
  for (const i of sim.incidents) {
    if (i.cleared !== undefined) continue;
    if (i.kind === 'wedding' && i.leg) {
      const g = sim.j.legs[i.leg]!;
      const along = (s: number, lat: number): [number, number] => [g.u[0] * s + g.rin[0] * lat, g.u[1] * s + g.rin[1] * lat];
      // yolda çapraz duran süslü araçlar
      for (const [s, lat, a] of [
        [g.stop + 30, 0, 0.5],
        [g.stop + 37, -2.4, -0.3],
        [g.stop + 35, 2.4, 0.2],
      ] as const) {
        const [x, y] = along(s, lat);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.atan2(g.u[1], g.u[0]) + a);
        ctx.fillStyle = '#f4f2ec';
        ctx.beginPath();
        ctx.roundRect(-2.2, -0.9, 4.4, 1.8, 0.6);
        ctx.fill();
        ctx.fillStyle = '#1b232d';
        ctx.fillRect(0.6, -0.75, 0.7, 1.5);
        // kurdeleler
        ctx.strokeStyle = '#e8487a';
        ctx.lineWidth = 0.14;
        ctx.beginPath();
        ctx.moveTo(-2.1, -0.85);
        ctx.lineTo(2.1, 0.85);
        ctx.moveTo(-2.1, 0.85);
        ctx.lineTo(2.1, -0.85);
        ctx.stroke();
        ctx.fillStyle = '#ffd1df';
        ctx.beginPath();
        ctx.arc(0, 0, 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // halay: el ele dönen bir yay
      const [hx, hy] = along(g.stop + 22, 0);
      for (let k = 0; k < 12; k++) {
        const a = Math.PI * 0.15 + (k / 11) * Math.PI * 1.3 + Math.sin(t * 2) * 0.12;
        const bob = Math.sin(t * 6 + k) * 0.12;
        ctx.fillStyle = PED_COLORS[k % PED_COLORS.length];
        ctx.beginPath();
        ctx.arc(hx + Math.cos(a) * 3.2, hy + Math.sin(a) * 3.2 + bob, 0.36, 0, Math.PI * 2);
        ctx.fill();
      }
      // mendil sallayan halaybaşı ve davulcu
      ctx.fillStyle = '#d8261c';
      ctx.fillRect(hx + Math.cos(Math.PI * 0.15) * 3.2 + 0.3, hy + Math.sin(Math.PI * 0.15) * 3.2 - 0.6 + Math.sin(t * 8) * 0.25, 0.4, 0.4);
      ctx.fillStyle = '#8a5a2b';
      ctx.beginPath();
      ctx.arc(hx, hy, 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f2e6c8';
      ctx.lineWidth = 0.1;
      ctx.stroke();
    }
    if (i.kind === 'breakdown' || i.kind === 'parked') {
      ctx.save();
      ctx.translate(i.x, i.y);
      ctx.fillStyle = '#e8362a';
      ctx.beginPath();
      ctx.moveTo(0, 3.4);
      ctx.lineTo(0.6, 4.4);
      ctx.lineTo(-0.6, 4.4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      const pulse = (t * 0.9) % 1;
      ctx.strokeStyle = `rgba(255,190,40,${(1 - pulse) * 0.8})`;
      ctx.lineWidth = 0.3;
      ctx.beginPath();
      ctx.arc(i.x, i.y, 2 + pulse * 5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

/** Trafik ekibi: tepe lambalı ekip aracı olay yerine gider, varınca dubalar dizilir, memur iner. */
export function drawTeams(ctx: CanvasRenderingContext2D, sim: Sim, t: number) {
  for (const i of sim.incidents) {
    if (!i.team || i.cleared !== undefined) continue;
    const { sent, arrive, from } = i.team;
    const go = Math.max(0, Math.min(1, (sim.t - sent - 3) / Math.max(0.1, arrive - sent - 3)));
    if (sim.t < sent + 3) continue;
    // olayın biraz gerisinde durur
    const dx = i.x - from[0];
    const dy = i.y - from[1];
    const dl = Math.hypot(dx, dy) || 1;
    const tx = i.x - (dx / dl) * 5;
    const ty = i.y - (dy / dl) * 5;
    const x = from[0] + (tx - from[0]) * go;
    const y = from[1] + (ty - from[1]) * go;
    const a = Math.atan2(dy, dx);
    const on = blink(t, 3);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 8);
    glow.addColorStop(0, on ? 'rgba(60,120,255,0.4)' : 'rgba(255,60,40,0.4)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.fillStyle = 'rgba(10,10,14,0.38)';
    ctx.fillRect(-2.1, -0.65, 4.6, 1.9);
    ctx.fillStyle = '#f6f6f2';
    ctx.beginPath();
    ctx.roundRect(-2.4, -0.95, 4.8, 1.9, 0.6);
    ctx.fill();
    ctx.fillStyle = '#1f4fa0';
    ctx.fillRect(-2.2, -0.95, 4.2, 0.22);
    ctx.fillRect(-2.2, 0.73, 4.2, 0.22);
    ctx.fillStyle = '#1b232d';
    ctx.fillRect(0.7, -0.75, 0.7, 1.5);
    ctx.fillStyle = on ? '#3a7bff' : '#ff3a2e';
    ctx.fillRect(-0.4, -0.7, 0.35, 0.7);
    ctx.fillStyle = on ? '#ff3a2e' : '#3a7bff';
    ctx.fillRect(-0.4, 0, 0.35, 0.7);
    ctx.restore();
    if (go >= 1) {
      // dubalar ve fosforlu yelekli memur
      for (let k = -1; k <= 1; k++) {
        const cx = tx + Math.cos(a + Math.PI / 2) * k * 1.6 + Math.cos(a) * 2.6;
        const cy = ty + Math.sin(a + Math.PI / 2) * k * 1.6 + Math.sin(a) * 2.6;
        ctx.fillStyle = '#ff7a1a';
        ctx.beginPath();
        ctx.arc(cx, cy, 0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx, cy, 0.14, 0, Math.PI * 2);
        ctx.fill();
      }
      const wave = Math.sin(t * 5) * 0.4;
      ctx.fillStyle = '#d8f23a';
      ctx.beginPath();
      ctx.arc(i.x + Math.cos(a + 1.2) * 2.4, i.y + Math.sin(a + 1.2) * 2.4 + wave * 0.2, 0.42, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
