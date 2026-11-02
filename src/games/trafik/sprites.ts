import { crossPoint, inPoint, pose } from './junction';
import { CAR_COLORS, CITY, DIRS, SIDE_W, PED_COLORS, turnOf, type Car, type Dir, type MoveId, type Ped, type SignalState } from './model';
import { shade } from './facade';
import { applyView, type View } from './paint';
import type { Scenery } from './scenery';
import { backlogOf, queueOf, sidePose, signal, type Sim } from './sim';
import { faulty } from './controller';

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
