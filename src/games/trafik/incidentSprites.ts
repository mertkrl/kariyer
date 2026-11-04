import { barrier, blink } from './sprites';
import { CAR_COLORS, DIRS, PED_COLORS } from './model';
import type { Sim } from './sim';

/*
 * Olayların çizimi: bariyerler, yoldaki olaylar ve olay yerine giden ekipler (motosikletli polis,
 * çekici, koniler).
 */

/** Kapatılan kollar: gelen ve giden şeritlere bariyer, giden yarının önüne "girilmez" tabelası. */
export function drawBarriers(ctx: CanvasRenderingContext2D, sim: Sim, t: number) {
  for (const d of DIRS) {
    const g = sim.j.legs[d];
    if (!g || !sim.closed[d]) continue;
    const s0 = g.stop + 6;
    const across = (lat0: number, lat1: number): [[number, number], [number, number]] => [
      [g.u[0] * s0 + g.rin[0] * lat0, g.u[1] * s0 + g.rin[1] * lat0],
      [g.u[0] * s0 + g.rin[0] * lat1, g.u[1] * s0 + g.rin[1] * lat1],
    ];
    const [a, b] = across(g.half + 0.3, g.inW - 0.3);
    barrier(ctx, a, b, t);
    const [c, e] = across(-g.half - 0.3, -g.outW + 0.3);
    barrier(ctx, c, e, t);
    const [x, y] = [g.u[0] * (g.stop + 3) + g.rout[0] * (g.outW + 1.2), g.u[1] * (g.stop + 3) + g.rout[1] * (g.outW + 1.2)];
    ctx.fillStyle = '#d8261c';
    ctx.beginPath();
    ctx.arc(x, y, 0.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(x - 0.5, y - 0.14, 1, 0.28);
  }
}

/** Düğün: süslü araçlar, halay çeken kalabalık, davulcu. Arıza ve çift sıra park: üçgen. */
export function drawIncidents(ctx: CanvasRenderingContext2D, sim: Sim, t: number) {
  for (const i of sim.incidents) {
    if (i.cleared !== undefined) continue;
    if (i.kind === 'fault') {
      // kontrolör dolabı: kapağı açık, içinden kıvılcım
      ctx.fillStyle = '#5d636b';
      ctx.fillRect(i.x - 0.7, i.y - 0.5, 1.4, 1);
      ctx.fillStyle = '#2a2d31';
      ctx.fillRect(i.x - 0.55, i.y - 0.38, 1.1, 0.76);
      if (blink(t, 2.3)) {
        ctx.fillStyle = '#ffe27a';
        ctx.beginPath();
        ctx.arc(i.x + 0.2, i.y - 0.1, 0.32, 0, Math.PI * 2);
        ctx.fill();
      }
      continue;
    }
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

/** Kırık çizgi üstünde 0–1 arası bir konum ve yön. */
function onPath(pts: [number, number][], f: number): [number, number, number] {
  const seg = pts.slice(1).map((p, k) => Math.hypot(p[0] - pts[k][0], p[1] - pts[k][1]));
  let d = Math.max(0, Math.min(1, f)) * seg.reduce((a, b) => a + b, 0);
  for (let k = 0; k < seg.length; k++) {
    const [a, b] = [pts[k], pts[k + 1]];
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    if (d <= seg[k] || k === seg.length - 1) {
      const q = seg[k] ? Math.min(1, d / seg[k]) : 1;
      return [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q, ang];
    }
    d -= seg[k];
  }
  return [pts[0][0], pts[0][1], 0];
}

function cone(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#ff7a1a';
  ctx.beginPath();
  ctx.arc(x, y, 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x, y, 0.13, 0, Math.PI * 2);
  ctx.fill();
}

/** Polis motosikleti: dar gövde, mavi-kırmızı tepe lambası; şeritlerin arasından geçer. */
function moto(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, t: number) {
  const on = blink(t, 3);
  const glow = ctx.createRadialGradient(x, y, 0, x, y, 6);
  glow.addColorStop(0, on ? 'rgba(60,120,255,0.45)' : 'rgba(255,60,40,0.45)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.fillStyle = 'rgba(10,10,14,0.35)';
  ctx.fillRect(-0.9, -0.2, 2.1, 0.75);
  ctx.fillStyle = '#f6f6f2';
  ctx.beginPath();
  ctx.roundRect(-1.1, -0.38, 2.2, 0.76, 0.3);
  ctx.fill();
  ctx.fillStyle = '#1f4fa0';
  ctx.fillRect(-0.9, -0.38, 1.6, 0.14);
  // sürücü: fosforlu yelek, beyaz kask
  ctx.fillStyle = '#d8f23a';
  ctx.beginPath();
  ctx.arc(-0.15, 0, 0.36, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(0.05, 0, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = on ? '#3a7bff' : '#ff3a2e';
  ctx.fillRect(-1.05, -0.3, 0.22, 0.6);
  ctx.restore();
}

/** Çekici: kabin, boş ya da yüklü kasa, sarı tepe lambası. */
function towTruck(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, t: number, load: number | undefined) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.fillStyle = 'rgba(10,10,14,0.38)';
  ctx.fillRect(-3.3, -0.85, 7, 2.1);
  ctx.fillStyle = '#e8b21a';
  ctx.beginPath();
  ctx.roundRect(1.6, -1.1, 1.9, 2.2, 0.4);
  ctx.fill();
  ctx.fillStyle = '#1b232d';
  ctx.fillRect(2.7, -0.95, 0.5, 1.9);
  ctx.fillStyle = '#5c6066';
  ctx.fillRect(-3.6, -1.1, 5.1, 2.2);
  ctx.strokeStyle = '#3a3d42';
  ctx.lineWidth = 0.12;
  ctx.strokeRect(-3.5, -1, 4.9, 2);
  if (load !== undefined) {
    // yüklü araç: kasanın üstünde, biraz yan
    ctx.fillStyle = CAR_COLORS[load] ?? '#9aa0a8';
    ctx.beginPath();
    ctx.roundRect(-3.3, -0.85, 4.3, 1.7, 0.5);
    ctx.fill();
    ctx.fillStyle = '#1b232d';
    ctx.fillRect(-0.6, -0.7, 0.6, 1.4);
  }
  ctx.fillStyle = blink(t, 2) ? '#ffc21a' : '#8a6a10';
  ctx.fillRect(2.1, -0.3, 0.4, 0.6);
  ctx.restore();
}

/**
 * Trafik ekipleri: polis motosikleti şeritlerin arasından olay yerine gelir, dubaları dizer.
 * Çekicili olaylarda polis bir kolun giden şeridini dubalarla kapatır; şerit boşalınca çekici
 * o şeritten gelir, aracı yükler, aynı yoldan geri çıkar.
 */
export function drawTeams(ctx: CanvasRenderingContext2D, sim: Sim, t: number) {
  for (const i of sim.incidents) {
    const team = i.team;
    if (!team) continue;
    const ride = (sim.t - team.sent - 3) / Math.max(0.1, team.arrive - team.sent - 3);
    if (ride < 0) continue;
    const [mx, my, ma] = onPath(team.moto, ride);
    const g = sim.j.legs[team.leg];
    if (ride >= 1 && g) {
      // kapatılan giden şeridin ağzına dubalar
      if (team.tow && sim.closeOut[team.leg]) {
        for (let k = 0; k < 4; k++) {
          const lat = g.half + 0.4 + (k / 3) * (g.outW - g.half - 0.8);
          cone(ctx, g.u[0] * (g.edge + 1.5) + g.rout[0] * lat, g.u[1] * (g.edge + 1.5) + g.rout[1] * lat);
        }
      }
      for (let k = -1; k <= 1; k++) cone(ctx, i.x + Math.cos(ma + Math.PI / 2) * k * 1.6 - Math.cos(ma) * 2.4, i.y + Math.sin(ma + Math.PI / 2) * k * 1.6 - Math.sin(ma) * 2.4);
    }
    if (i.cleared === undefined || team.tow) moto(ctx, mx, my, ma, t);
    const tow = team.tow;
    if (!tow || tow.start === undefined) continue;
    let pos: [number, number, number];
    let loaded: number | undefined;
    if (tow.leave === undefined || sim.t < tow.leave) pos = onPath(tow.path, (sim.t - tow.start) / Math.max(0.1, tow.arrive! - tow.start));
    else {
      if (sim.t >= tow.done!) continue;
      const back = [...tow.path].reverse();
      pos = onPath(back, (sim.t - tow.leave) / Math.max(0.1, tow.done! - tow.leave));
      loaded = tow.color ?? 6;
    }
    // gelirken yüzü olaya, giderken yüzü dışarı
    towTruck(ctx, pos[0], pos[1], pos[2], t, loaded ?? (tow.leave !== undefined && sim.t >= tow.arrive! ? tow.color ?? 6 : undefined));
  }
}
