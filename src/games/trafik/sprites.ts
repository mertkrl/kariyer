import { crossPoint, inPoint, pose } from './junction';
import { CAR_COLORS, CITY, DIRS, SIDE_W, PED_COLORS, turnOf, type Car, type Ped, type SignalState } from './model';
import { shade } from './facade';
import type { Scenery } from './scenery';
import { backlogOf, type Sim } from './sim';
import { sidePose } from './sides';

/*
 * Her karede değişenler: kuşbakışı araçlar (gövde, camlar, tavan, aynalar, farlar; frende yanan
 * stoplar, dönerken yanıp sönen sinyaller; taksinin tepe lambası, dolmuşun uzun tavanı, otobüsün
 * klimaları, ambulansın tepe lambası), şemsiyeli ya da şemsiyesiz yayalar, sinyal direkleri ve
 * yaya ışıkları, kazalar, akşam ışıkları ve yağmur. Kolların ucundaki kuyruk etiketleri ekran
 * pikselinde çizilir ki her boyutta okunsun.
 */

export const LIGHT: Record<SignalState, string> = { green: '#36e07a', amber: '#ffb81c', red: '#ff4b3a' };

export function bodyPose(c: Car): [number, number, number] {
  const f = pose(c.path, c.s);
  const b = pose(c.path, c.s - c.len);
  return [(f[0] + b[0]) / 2, (f[1] + b[1]) / 2, Math.atan2(f[1] - b[1], f[0] - b[0])];
}

export const blink = (t: number, hz = 1.4) => Math.floor(t * hz * 2) % 2 === 0;

/** Aracın görünüşü: yoldaki araç da, ara sokakta bekleyen ya da sokağa sapan da aynı çizilir. */
type Look = Pick<Car, 'id' | 'kind' | 'len' | 'color' | 'braking' | 'crashed' | 'broken'>;

export function drawCar(ctx: CanvasRenderingContext2D, c: Car, t: number) {
  let [x, y, a] = bodyPose(c);
  // ara sokaktan katılan: ilk metrelerde sokaktaki duruşundan şeride döner
  if (c.enter) {
    const k = Math.min(1, Math.max(0, (c.s - c.enter.s) / 7));
    if (k < 1) {
      const e = k * k * (3 - 2 * k);
      let da = a - c.enter.a;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      x = c.enter.x + (x - c.enter.x) * e;
      y = c.enter.y + (y - c.enter.y) * e;
      a = c.enter.a + da * e;
    }
  }
  const turn = turnOf(c.mv);
  const near = c.s > c.path.stop - 35 && c.s < c.path.boxOut + 2;
  const out = c.out !== undefined && c.s > c.out - 30;
  drawBody(ctx, c, x, y, a, t, out ? 1 : turn !== 'T' && near ? (turn === 'L' ? -1 : 1) : 0);
}

/** Ara sokaklar: ağızda ana yola çıkmayı bekleyenler (sağ sinyalde) ve sokağa sapıp uzaklaşanlar. */
export function drawSideCars(ctx: CanvasRenderingContext2D, sim: Sim, t: number, sea?: Scenery['sea']) {
  const sg = sea ? (sea.dir === 'S' ? 1 : -1) : 0;
  for (const x of sim.sides) {
    if (x.side !== 1) continue;
    // ağızdaki kural: dur levhası ve çizgisi ya da kapalı ağızda bariyer
    const g0 = sim.j.legs[x.leg]!;
    const P = (a: number, l: number): [number, number] => [g0.u[0] * a + g0.rin[0] * l, g0.u[1] * a + g0.rin[1] * l];
    if (x.rule === 'closed') barrier(ctx, P(x.at - SIDE_W / 2, g0.inW + 2.4), P(x.at + SIDE_W / 2, g0.inW + 2.4), t);
    if (x.rule === 'stop') {
      const a = P(x.at - SIDE_W / 2 + 0.2, g0.inW + 2.1);
      const b = P(x.at - 0.2, g0.inW + 2.1);
      ctx.strokeStyle = 'rgba(244,241,234,0.95)';
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
      const [sx, sy] = P(x.at - SIDE_W / 2 - 0.9, g0.inW + 1.6);
      ctx.fillStyle = '#c8322a';
      ctx.strokeStyle = '#f4f1ea';
      ctx.lineWidth = 0.1;
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const an = Math.PI / 8 + (k * Math.PI) / 4;
        const px = sx + Math.cos(an) * 0.55;
        const py = sy - 0.4 + Math.sin(an) * 0.55;
        if (k) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    let back = 0;
    x.queue.slice(0, 8).forEach((c, k) => {
      const len = LEN_OF[c.kind] ?? 4.4;
      const [px, py, pa] = sidePose(sim, x, 0, len);
      // sıradakiler ağızdan geriye, sokağın içine doğru
      const g = sim.j.legs[x.leg]!;
      const d = back;
      back += len + 2.2;
      drawBody(ctx, { id: c.id, kind: c.kind, len, color: c.color, braking: true }, px + g.rin[0] * d, py + g.rin[1] * d, pa, t, k === 0 ? 1 : 0);
    });
  }
  for (const gh of sim.ghosts) {
    const p = { pts: gh.pts, cum: gh.cum } as Car['path'];
    const f = pose(p, gh.d);
    // denize giden yolda araç sahil yolunda kaybolur
    if (sea && f[1] * sg > sea.at - 12) continue;
    const b = pose(p, gh.d - gh.len);
    drawBody(ctx, { id: gh.id, kind: gh.kind, len: gh.len, color: gh.color, braking: false }, (f[0] + b[0]) / 2, (f[1] + b[1]) / 2, Math.atan2(f[1] - b[1], f[0] - b[0]), t, gh.side && gh.d < 20 ? 1 : 0);
  }
}

const LEN_OF: Partial<Record<Car['kind'], number>> = { car: 4.4, taxi: 4.6, dolmus: 6.6, truck: 7.2 };

/**
 * Simülasyonun dışındaki şehir: kolların ucunun ötesinde, ana yolun uzantısında kavşağa doğru gelen
 * akım (kolun talebi kadar sık) ve arka sokaklarda iki yönlü seyrek akım. Yalnızca görüntüdür; araç
 * kolun ucuna varınca solar, orada simülasyonun aracı yola çıkar. Konumlar sim saatinden hesaplanır:
 * oyun durunca şehir de durur. Uzaktan (`coarse`) her araç tek dikdörtgen.
 */
export function drawCity(ctx: CanvasRenderingContext2D, sim: Sim, sc: Scenery, B: { x0: number; x1: number; y0: number; y1: number }, t: number, coarse: boolean): [number, number, number][] {
  const T = sim.t;
  // akşam farları için görünen araçlar
  const seen: [number, number, number][] = [];
  const sg = sc.sea ? (sc.sea.dir === 'S' ? 1 : -1) : 0;
  const car = (x: number, y: number, a: number, id: number, alpha: number) => {
    if (x < B.x0 - 8 || x > B.x1 + 8 || y < B.y0 - 8 || y > B.y1 + 8 || alpha <= 0) return;
    seen.push([x, y, a]);
    ctx.globalAlpha = Math.min(1, alpha);
    const kind = id % 9 === 0 ? 'taxi' : id % 23 === 0 ? 'dolmus' : 'car';
    const len = LEN_OF[kind] ?? 4.4;
    const color = (id * 7) % CAR_COLORS.length;
    if (coarse) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.fillStyle = kind === 'taxi' ? '#f2c014' : CAR_COLORS[color];
      ctx.fillRect(-len / 2, -0.95, len, 1.9);
      ctx.restore();
    } else drawBody(ctx, { id, kind, len, color, braking: false }, x, y, a, t, 0);
  };
  const wrap = (v: number, L: number) => ((v % L) + L) % L;
  // ana yolun uzantısı: kavşağa doğru gelenler. Kolun gerisinde bekleyenler (haritaya giremeyen kuyruk)
  // uzantıda duran araçlar olarak dizilir; akım kuyruğun sonunda biter.
  for (const d of DIRS) {
    const g = sim.j.legs[d];
    if (!g || sim.links[d] || sim.closed[d]) continue;
    const n0 = g.spec.lanes.length;
    const back = Math.ceil(backlogOf(sim, d) / n0);
    const a0 = Math.atan2(-g.u[1], -g.u[0]);
    for (let lane = 0; lane < n0; lane++)
      for (let k = 0; k < back; k++) {
        const [x, y] = inPoint(g, lane, g.len + 3 + k * 7);
        car(x, y, a0, 9000 + d.charCodeAt(0) * 53 + lane * 17 + k, 1);
      }
    const tail = back * 7 + 12;
    // denize giden ana yol sahil yolunda biter
    const end = sc.sea && Math.sign(g.u[1]) === sg ? sc.sea.at - 12 : CITY;
    const rate = sim.spec.demand.filter((m) => m.mv[0] === d).reduce((m, x) => m + (typeof x.rate === 'number' ? x.rate : x.rate[0][1]), 0);
    if (rate <= 0) continue;
    const v = g.spec.v ?? 13.9;
    const n = g.spec.lanes.length;
    const gap = Math.max(22, (v * 60) / ((rate * 0.72) / n));
    const L = end - g.len - tail;
    if (L < 40) continue;
    for (let lane = 0; lane < n; lane++)
      for (let k = 0; k * gap < L; k++) {
        const s = g.len + tail + wrap(k * gap + lane * gap * 0.37 - T * v, L);
        const [x, y] = inPoint(g, lane, s);
        car(x, y, a0, 7000 + d.charCodeAt(0) * 97 + lane * 31 + k, Math.min((s - g.len - tail) / 20, (end - s) / 30));
      }
  }
  // arka sokaklar
  const lat = SIDE_W / 4;
  sc.roads.forEach((rd, i) => {
    const [a0, a1] = [Math.min(rd.from, rd.to), Math.max(rd.from, rd.to)];
    const L = a1 - a0;
    const gap = 150 + (i % 4) * 40;
    const v = 7 + (i % 3);
    for (const dir of [1, -1])
      for (let k = 0; k * gap < L; k++) {
        const p = a0 + wrap(k * gap + i * 53 + (dir < 0 ? gap / 2 : 0) + dir * T * v, L);
        // sağdan akan trafik: dikey yolda aşağı inen batı yarıda, yatayda doğuya giden güney yarıda
        const [x, y] = rd.vertical ? [rd.at - dir * lat, p] : [p, rd.at + dir * lat];
        const a = rd.vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : dir > 0 ? 0 : Math.PI;
        car(x, y, a, i * 211 + k * 13 + (dir > 0 ? 0 : 5), Math.min(p - a0, a1 - p) / 15);
      }
  });
  ctx.globalAlpha = 1;
  // kıyıda vapurlar: açıkta ağır ağır geçer
  if (sc.sea)
    for (let k = 0; k < 3; k++) {
      const x = wrap(T * (3 + k) + k * 700, CITY * 2) - CITY;
      const y = sg * (sc.sea.at + 70 + k * 110);
      if (x < B.x0 - 40 || x > B.x1 + 40 || y < B.y0 - 20 || y > B.y1 + 20) continue;
      ferry(ctx, x, y, k % 2 ? Math.PI : 0);
    }
  return seen;
}

/** Şehir hatları vapuru: beyaz gövde, siyah bant, sarı bacalar; kuşbakışı. */
function ferry(ctx: CanvasRenderingContext2D, x: number, y: number, a: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.moveTo(-26, -3);
  ctx.lineTo(-48, -6);
  ctx.lineTo(-48, 6);
  ctx.lineTo(-26, 3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f4f1ea';
  ctx.beginPath();
  ctx.roundRect(-24, -5, 48, 10, 4.5);
  ctx.fill();
  ctx.fillStyle = '#23262b';
  ctx.fillRect(-24, -0.6, 48, 1.2);
  ctx.fillStyle = '#e9e5da';
  ctx.fillRect(-16, -3.6, 32, 7.2);
  ctx.fillStyle = '#f2c014';
  for (const fx of [-5, 5]) {
    ctx.beginPath();
    ctx.arc(fx, 0, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBody(ctx: CanvasRenderingContext2D, c: Look, x: number, y: number, a0: number, t: number, signal: -1 | 0 | 1) {
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
  const hazard = c.crashed !== undefined || !!c.broken;
  if ((signal || hazard) && blink(t)) {
    ctx.fillStyle = '#ffae1a';
    for (const side of hazard ? [-1, 1] : [signal]) {
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

/** Kırmızı-beyaz bariyer: `a`dan `b`ye, üstünde yanıp sönen sarı lamba. */
export function barrier(ctx: CanvasRenderingContext2D, a: [number, number], b: [number, number], t: number) {
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
