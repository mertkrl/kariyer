import { makeRng, range, vGradient, type Cam } from '../kit';
import type { CityScene } from '../scene';
import { BH, BW, KB, KS, WIN } from './servisLayout';
import { makeCars, sideCar } from './servisCars';
import { paintStreet } from './servisStreet';

/*
 * Çarşamba, 17:50: yağmurda sıkışmış şirket servisi. Ekranın tamamı servisin yan camıdır; içerisi
 * (koltuklar, tavan, duvarlar) görünmez, yalnızca ıslak camdan dışarısı görünür: yanındaki servis, taksiler, fren lambaları, plaza lobileri, neon, kaldırımda
 * şemsiyeler. Dışarıdaki dünya küçük çizilip büyütülür; ıslak camdan tam da böyle görünür. Camdaki
 * yağmur damlaları sokağı ters gösteren küçük mercekler, akıntılar sarsılarak aşağı iner. Otobüs
 * sürünür, durur, sürünür.
 */

export function servisScene(): CityScene {
  const r = makeRng(3131);
  let s = 0; // yol boyunca konumumuz (m)
  let vs = 0; // hızımız
  let go = false;
  let phaseT = 2;

  const cars = makeCars(r);

  // camdaki yağmur damlaları
  const drops = Array.from({ length: 170 }, () => ({ x: range(r, WIN.x, WIN.x + WIN.w), y: range(r, WIN.y, WIN.y + WIN.h), r: Math.pow(r(), 2.2) * 9 + 1.6 }));
  const rivulets = Array.from({ length: 14 }, () => ({ x: range(r, WIN.x + 20, WIN.x + WIN.w - 20), y: range(r, WIN.y, WIN.y + WIN.h), vy: 0, pause: range(r, 0, 2), r: range(r, 3, 6), trail: [] as { x: number; y: number }[] }));

  let buffer: HTMLCanvasElement;
  let bctx: CanvasRenderingContext2D;
  let buildings: HTMLCanvasElement;
  let pavement: HTMLCanvasElement;

  const drawStrip = (g: CanvasRenderingContext2D, strip: HTMLCanvasElement, k: number, offsetM: number) => {
    const L = strip.width;
    // ekran x = BW/2 − (X − s)·k  →  şeridin başlangıcı BW/2 + s·k'da durur (uzunluğuna göre mod)
    let x0 = (((BW / 2 + (s + offsetM) * k) % L) + L) % L;
    x0 -= L;
    g.drawImage(strip, x0, 0);
    if (x0 + L < BW) g.drawImage(strip, x0 + L, 0);
    if (x0 + L * 2 < BW) g.drawImage(strip, x0 + L * 2, 0);
  };

  return {
    caption: 'Servisin camından · Büyükdere Caddesi — 40 dakikadır aynı plazanın önündeyiz.',
    build() {
      buffer = document.createElement('canvas');
      buffer.width = BW;
      buffer.height = BH;
      bctx = buffer.getContext('2d')!;
      ({ buildings, pavement } = paintStreet());
    },
    update(dt) {
      // dur-kalk: birkaç metre sürün, bekle, yine sürün
      phaseT -= dt;
      if (phaseT <= 0) {
        go = !go;
        phaseT = go ? range(r, 2.5, 5) : range(r, 4, 9);
      }
      const target = go ? 2.6 : 0;
      vs += (target - vs) * Math.min(1, dt * (go ? 0.9 : 1.6));
      s += vs * dt;
      // yan şerit kendi ritminde ilerler, öndekinin arkasında yığılır
      cars.sort((a, b) => b.rx - a.rx);
      for (let i = 0; i < cars.length; i++) {
        const c = cars[i];
        const ahead = cars[i - 1];
        const gap = ahead ? ahead.rx - ahead.len / 2 - (c.rx + c.len / 2) : 99;
        const want = gap > 2.2 ? Math.min(3.2, (gap - 1.8) * 0.9) * (0.6 + 0.4 * Math.sin(s * 0.3 + i)) : 0;
        c.v += (want - c.v) * Math.min(1, dt * 1.4);
        c.brake += ((c.v < 0.4 || want < c.v - 0.3 ? 1 : 0) - c.brake) * Math.min(1, dt * 5);
        c.rx += (c.v - vs) * dt;
      }
      // çok geride kalan / çok öne geçen arabaları sar
      for (const c of cars) {
        if (c.rx < -44) c.rx += 88;
        if (c.rx > 44) c.rx -= 88;
      }
      // akıntılar: tutun, sonra hızlanarak kay
      for (const d of rivulets) {
        if (d.pause > 0) {
          d.pause -= dt;
          continue;
        }
        d.vy = Math.min(220, d.vy + 260 * dt);
        d.y += d.vy * dt;
        d.x += vs * 6 * dt;
        d.trail.push({ x: d.x, y: d.y });
        if (d.trail.length > 40) d.trail.shift();
        if (Math.random() < dt * 1.2) {
          d.pause = range(r, 0.2, 1.2);
          d.vy = 0;
        }
        if (d.y > WIN.y + WIN.h) {
          d.y = WIN.y - 5;
          d.x = range(r, WIN.x + 20, WIN.x + WIN.w - 20);
          d.trail = [];
          d.pause = range(r, 0, 3);
        }
      }
      // cama yeni damlalar düşmeye devam eder
      for (const d of drops) {
        if (Math.random() < dt * 0.25) {
          d.x = range(r, WIN.x, WIN.x + WIN.w);
          d.y = range(r, WIN.y, WIN.y + WIN.h);
        }
        d.x += vs * 2 * dt;
      }
    },
    draw(g, t, cam: Cam) {
      // ── sokak, küçük ──
      const b = bctx;
      b.setTransform(1, 0, 0, 1, 0, 0);
      b.fillStyle = '#231a20';
      b.fillRect(0, 0, BW, BH);
      drawStrip(b, buildings, KB, 0);
      drawStrip(b, pavement, KS, 0);
      // ıslak yol
      b.fillStyle = vGradient(b, 120, BH, [
        [0, '#2a262c'],
        [1, '#121115'],
      ]);
      b.fillRect(0, 120, BW, BH - 120);
      // yan şerit
      for (const c of cars) sideCar(b, c, t);
      // dışarıda yağmur
      b.strokeStyle = 'rgba(200,210,230,0.25)';
      b.lineWidth = 0.6;
      b.beginPath();
      for (let i = 0; i < 70; i++) {
        const x = (i * 37.3 + t * 40) % BW;
        const y = (i * 53.1 + t * 260) % BH;
        b.moveTo(x, y);
        b.lineTo(x - 1.5 - vs, y - 6);
      }
      b.stroke();

      g.save();
      g.translate(cam.x * 0.3, cam.y * 0.3);
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = 'high';
      g.drawImage(buffer, WIN.x - 20, WIN.y - 10, WIN.w + 40, WIN.h + 20);
      g.restore();

      // ── cam: buğu, damlalar, akıntılar, yansımalar ──
      g.save();
      g.beginPath();
      g.rect(WIN.x, WIN.y, WIN.w, WIN.h);
      g.clip();
      const fog = g.createLinearGradient(0, WIN.y, 0, WIN.y + WIN.h);
      fog.addColorStop(0, 'rgba(170,180,200,0.12)');
      fog.addColorStop(0.7, 'rgba(170,180,200,0.05)');
      fog.addColorStop(1, 'rgba(190,200,220,0.22)');
      g.fillStyle = fog;
      g.fillRect(WIN.x, WIN.y, WIN.w, WIN.h);
      const sx = BW / (WIN.w + 40);
      const sy = BH / (WIN.h + 20);
      for (const d of drops) {
        // her damla küçük bir mercek: arkasındaki sokak, ters dönmüş
        const bx = (d.x - (WIN.x - 20)) * sx;
        const by = (d.y - (WIN.y - 10)) * sy;
        g.save();
        g.beginPath();
        g.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        g.clip();
        g.translate(d.x, d.y);
        g.scale(1, -1);
        const span = d.r * 5;
        g.drawImage(buffer, bx - span * sx, by - span * sy, span * 2 * sx, span * 2 * sy, -d.r, -d.r, d.r * 2, d.r * 2);
        g.restore();
        g.strokeStyle = 'rgba(0,0,0,0.35)';
        g.lineWidth = Math.max(0.6, d.r * 0.18);
        g.beginPath();
        g.arc(d.x, d.y + d.r * 0.1, d.r * 0.92, 0.15 * Math.PI, 0.85 * Math.PI);
        g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.55)';
        g.beginPath();
        g.arc(d.x - d.r * 0.35, d.y - d.r * 0.4, Math.max(0.6, d.r * 0.2), 0, Math.PI * 2);
        g.fill();
      }
      for (const d of rivulets) {
        if (d.trail.length > 1) {
          g.strokeStyle = 'rgba(200,210,230,0.18)';
          g.lineWidth = d.r * 0.7;
          g.lineCap = 'round';
          g.beginPath();
          g.moveTo(d.trail[0].x, d.trail[0].y);
          for (const p of d.trail) g.lineTo(p.x, p.y);
          g.stroke();
        }
        g.fillStyle = 'rgba(210,220,240,0.35)';
        g.beginPath();
        g.ellipse(d.x, d.y, d.r * 0.8, d.r * 1.15, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.6)';
        g.beginPath();
        g.arc(d.x - d.r * 0.3, d.y - d.r * 0.4, d.r * 0.22, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
    },
  };
}
