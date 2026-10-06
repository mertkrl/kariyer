import { H, PAD, W, glow, glowRect, makeRng, range, vGradient, type Cam } from '../kit';
import type { CityScene } from '../scene';
import { BH, BW, KB, KS, PILLAR, WIN } from './servisLayout';
import { makeCars, sideCar } from './servisCars';
import { paintStreet } from './servisStreet';

/*
 * Çarşamba, 17:50: yağmurda Büyükdere Caddesi'nde sıkışmış şirket servisinin içi. Yan pencereden
 * dışarı bakıyorsun: yanındaki servis, taksiler, fren lambaları, plaza lobileri, neon, kaldırımda
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
  let interior: HTMLCanvasElement;

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
    caption: 'Servisin içinden · Büyükdere Caddesi — 40 dakikadır aynı plazanın önündeyiz.',
    build(px) {
      buffer = document.createElement('canvas');
      buffer.width = BW;
      buffer.height = BH;
      bctx = buffer.getContext('2d')!;
      ({ buildings, pavement } = paintStreet());
      // otobüsün içi, tam çözünürlükte bir kez çizilir
      interior = document.createElement('canvas');
      interior.width = Math.ceil((W + PAD * 2) * px);
      interior.height = Math.ceil((H + PAD * 2) * px);
      const g = interior.getContext('2d')!;
      g.setTransform(px, 0, 0, px, PAD * px, PAD * px);
      // pencere oyulmuş duvarlar
      g.fillStyle = vGradient(g, -PAD, H + PAD, [
        [0, '#0d0e14'],
        [0.15, '#1a1c26'],
        [0.7, '#20222c'],
        [1, '#0c0d12'],
      ]);
      g.beginPath();
      g.rect(-PAD, -PAD, W + PAD * 2, H + PAD * 2);
      g.roundRect(WIN.x, WIN.y, PILLAR - WIN.x - 14, WIN.h, 26);
      g.roundRect(PILLAR + 14, WIN.y, WIN.x + WIN.w - PILLAR - 14, WIN.h, 26);
      g.fill('evenodd');
      // lastik contalar
      g.strokeStyle = '#050507';
      g.lineWidth = 12;
      g.beginPath();
      g.roundRect(WIN.x, WIN.y, PILLAR - WIN.x - 14, WIN.h, 26);
      g.roundRect(PILLAR + 14, WIN.y, WIN.x + WIN.w - PILLAR - 14, WIN.h, 26);
      g.stroke();
      // sürgülü üst camlar
      g.fillStyle = '#08080b';
      g.fillRect(WIN.x, WIN.y + 118, PILLAR - WIN.x - 14, 7);
      g.fillRect(PILLAR + 14, WIN.y + 118, WIN.x + WIN.w - PILLAR - 14, 7);
      g.fillStyle = '#3a3c46';
      g.fillRect(WIN.x + 40, WIN.y + 112, 30, 6);
      // mavi LED şeridi ve bagaj rafıyla tavan
      g.fillStyle = '#07080c';
      g.fillRect(-PAD, -PAD, W + PAD * 2, 70 + PAD);
      g.fillStyle = '#12131a';
      g.fillRect(-PAD, 70, W + PAD * 2, 16);
      // sağda toplanmış perde
      for (let i = 0; i < 9; i++) {
        g.fillStyle = i % 2 ? '#2c3c5a' : '#344668';
        g.fillRect(WIN.x + WIN.w - 70 + i * 9, WIN.y - 16, 10, WIN.h + 30);
      }
      g.fillStyle = '#1d2638';
      g.fillRect(WIN.x + WIN.w - 76, WIN.y + WIN.h * 0.45, 86, 12);
      // pencere eşiği + tutamak
      g.fillStyle = '#2a2c36';
      g.fillRect(-PAD, WIN.y + WIN.h + 6, W + PAD * 2, 26);
      g.fillStyle = 'rgba(255,255,255,0.08)';
      g.fillRect(-PAD, WIN.y + WIN.h + 6, W + PAD * 2, 2);
      g.strokeStyle = '#8a8d98';
      g.lineWidth = 7;
      g.beginPath();
      g.moveTo(-PAD, 60);
      g.lineTo(W + PAD, 60);
      g.stroke();
      // duvar panelleri: kalıplanmış plastik, yaklaşık her metrede bir ek yeri, biraz parlaklık
      g.strokeStyle = 'rgba(0,0,0,0.35)';
      g.lineWidth = 2;
      for (const x of [WIN.x - 70, PILLAR, WIN.x + WIN.w + 50]) {
        g.beginPath();
        g.moveTo(x, WIN.y + WIN.h + 34);
        g.lineTo(x, H + PAD);
        g.stroke();
      }
      g.fillStyle = 'rgba(255,255,255,0.025)';
      g.fillRect(-PAD, WIN.y + WIN.h + 40, W + PAD * 2, 40);
      // lastik contaların içinde alüminyum kenarlık
      const trim = g.createLinearGradient(0, WIN.y, 0, WIN.y + WIN.h);
      trim.addColorStop(0, 'rgba(170,176,190,0.55)');
      trim.addColorStop(0.5, 'rgba(90,94,106,0.4)');
      trim.addColorStop(1, 'rgba(150,156,170,0.5)');
      g.strokeStyle = trim;
      g.lineWidth = 3;
      g.beginPath();
      g.roundRect(WIN.x + 7, WIN.y + 7, PILLAR - WIN.x - 28, WIN.h - 14, 20);
      g.roundRect(PILLAR + 21, WIN.y + 7, WIN.x + WIN.w - PILLAR - 28, WIN.h - 14, 20);
      g.stroke();
      // camda parlama: kabin ışığı onu yukarıdan yakalıyor
      for (const [x0, x1] of [
        [WIN.x, PILLAR - 14],
        [PILLAR + 14, WIN.x + WIN.w],
      ]) {
        const glare = g.createLinearGradient(x0, WIN.y, x0 + (x1 - x0) * 0.6, WIN.y + WIN.h);
        glare.addColorStop(0, 'rgba(200,215,255,0.07)');
        glare.addColorStop(0.35, 'rgba(200,215,255,0.015)');
        glare.addColorStop(1, 'rgba(200,215,255,0)');
        g.fillStyle = glare;
        g.beginPath();
        g.roundRect(x0 + 8, WIN.y + 8, x1 - x0 - 16, WIN.h - 16, 20);
        g.fill();
      }
      // tavan: bagaj rafının rayları, havalandırma ve okuma lambaları, mavi LED şeridi
      g.fillStyle = '#1b1d26';
      g.fillRect(-PAD, 18, W + PAD * 2, 34);
      g.strokeStyle = '#4c505c';
      g.lineWidth = 3;
      for (const y of [24, 40]) {
        g.beginPath();
        g.moveTo(-PAD, y);
        g.lineTo(W + PAD, y);
        g.stroke();
      }
      for (let x = 40; x < W; x += 230) {
        // koltuk sırası başına bir havalandırma ızgarası ve bir okuma lambası
        g.fillStyle = '#0c0d12';
        g.beginPath();
        g.roundRect(x, 74, 64, 10, 4);
        g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.07)';
        g.lineWidth = 1;
        for (let k = 6; k < 64; k += 8) {
          g.beginPath();
          g.moveTo(x + k, 75);
          g.lineTo(x + k, 83);
          g.stroke();
        }
        g.fillStyle = '#23252f';
        g.beginPath();
        g.arc(x + 96, 80, 7, 0, Math.PI * 2);
        g.fill();
      }
      glowRect(g, W / 2, 88, W * 1.2, 10, [80, 130, 255], 0.35);
      g.fillStyle = 'rgba(120,165,255,0.85)';
      g.fillRect(-PAD, 86, W + PAD * 2, 2);
      // önümüzdeki koltuk: kalıplanmış bir kabuk, dikişli panelli kumaş sırt, üstünde
      // olmazsa olmaz dantel örtüsüyle kafalık ve tutma kolu
      const shell = g.createLinearGradient(0, 600, 0, H + PAD);
      shell.addColorStop(0, '#1f2533');
      shell.addColorStop(1, '#0d1018');
      g.fillStyle = shell;
      g.beginPath();
      g.roundRect(-70, 628, 660, 420, 52);
      g.fill();
      const fabric = g.createLinearGradient(0, 650, 0, H + PAD);
      fabric.addColorStop(0, '#30406a');
      fabric.addColorStop(0.5, '#25335a');
      fabric.addColorStop(1, '#141d33');
      g.fillStyle = fabric;
      g.beginPath();
      g.roundRect(-44, 650, 608, 400, 42);
      g.fill();
      // dokuma desen: ince çapraz iplikler
      g.save();
      g.beginPath();
      g.roundRect(-44, 650, 608, 400, 42);
      g.clip();
      g.strokeStyle = 'rgba(255,255,255,0.035)';
      g.lineWidth = 1;
      for (let k = -400; k < 700; k += 7) {
        g.beginPath();
        g.moveTo(k, 650);
        g.lineTo(k + 400, 1050);
        g.stroke();
      }
      g.restore();
      // dikişli paneller
      g.strokeStyle = 'rgba(10,14,24,0.6)';
      g.lineWidth = 3;
      g.setLineDash([6, 5]);
      for (const x of [140, 380]) {
        g.beginPath();
        g.moveTo(x, 700);
        g.lineTo(x, H + PAD);
        g.stroke();
      }
      g.setLineDash([]);
      g.fillStyle = 'rgba(255,255,255,0.06)';
      g.beginPath();
      g.roundRect(-30, 656, 580, 6, 3);
      g.fill();
      // kafalık
      const head = g.createLinearGradient(0, 548, 0, 700);
      head.addColorStop(0, '#36487a');
      head.addColorStop(1, '#22305a');
      g.fillStyle = head;
      g.beginPath();
      g.roundRect(196, 548, 288, 150, 40);
      g.fill();
      g.fillStyle = 'rgba(238,236,228,0.92)';
      g.beginPath();
      g.roundRect(222, 566, 236, 68, 16);
      g.fill();
      g.strokeStyle = 'rgba(180,176,166,0.9)';
      g.setLineDash([3, 4]);
      g.lineWidth = 2;
      g.beginPath();
      g.roundRect(228, 572, 224, 56, 12);
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = '#7d8290';
      g.font = '800 22px "Work Sans", sans-serif';
      g.textAlign = 'center';
      g.fillText('TAVRINSA LABS', 340, 607);
      g.textAlign = 'left';
      // koltuğun üstünde krom boyunca parlayan tutma kolu
      g.lineCap = 'round';
      g.strokeStyle = '#6f727c';
      g.lineWidth = 10;
      g.beginPath();
      g.moveTo(500, 650);
      g.quadraticCurveTo(540, 608, 580, 650);
      g.stroke();
      g.strokeStyle = 'rgba(235,238,245,0.7)';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(506, 642);
      g.quadraticCurveTo(540, 612, 572, 640);
      g.stroke();
      // koridorun karşısında, karanlıkta bir sonraki sıranın koltuğunun kenarı
      g.fillStyle = '#121624';
      g.beginPath();
      g.roundRect(1380, 700, 360, 420, 50);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.04)';
      g.beginPath();
      g.roundRect(1392, 712, 340, 6, 3);
      g.fill();
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
      g.roundRect(WIN.x, WIN.y, PILLAR - WIN.x - 14, WIN.h, 26);
      g.roundRect(PILLAR + 14, WIN.y, WIN.x + WIN.w - PILLAR - 14, WIN.h, 26);
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
      // otobüsün kendi mavi LED şeridi camda yansıyor
      g.globalCompositeOperation = 'lighter';
      glowRect(g, W / 2, WIN.y + 40, WIN.w * 1.1, 26, [70, 110, 200], 0.18);
      g.globalCompositeOperation = 'source-over';
      g.restore();

      // ── otobüsün içi ──
      g.drawImage(interior, -PAD, -PAD, W + PAD * 2, H + PAD * 2);
      g.globalCompositeOperation = 'lighter';
      glowRect(g, W / 2, 78, W * 1.2, 10, [80, 120, 230], 0.6);
      glowRect(g, W / 2, 96, W * 1.2, 60, [60, 90, 200], 0.14);
      // iş arkadaşının telefonu yüzünü aydınlatıyor
      glow(g, 175, 548, 40, [150, 200, 255], 0.5);
      glowRect(g, 196, 566, 18, 11, [210, 230, 255], 0.9);
      // sürünerek geçerken sokak ışığı eşiğin üstünden kayıyor
      const wash = 0.12 + 0.08 * Math.sin(s * 0.9);
      glowRect(g, 900, WIN.y + WIN.h + 18, 1400, 40, [255, 170, 110], wash);
      g.globalCompositeOperation = 'source-over';
    },
  };
}
