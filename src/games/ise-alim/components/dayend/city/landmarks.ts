import { type RGB, type Rng, rgba, mix, scale, range, pick, polyY, vGradient } from './paint';

/** Gün sonu sahneleri için İstanbul'un parçaları: yamaç mahalleleri, kuleler, camiler, Galata, martılar. */

/* ── Şehir parçaları ───────────────────────────────────────────────────────── */

export interface Light {
  x: number;
  y: number;
  c: RGB;
  a: number;
  r: number;
}

const WARM: RGB[] = [
  [255, 200, 130],
  [255, 214, 160],
  [255, 180, 110],
  [255, 226, 180],
];
const COOL: RGB[] = [
  [210, 230, 255],
  [190, 215, 255],
  [235, 240, 255],
];

/**
 * Alacakaranlıkta İstanbul gibi sıkış tıkış bir yamaç mahallesi: yokuşu tırmanan apartman sıraları,
 * uzak sıralar küçük ve puslu, yakın sıralar pencere ızgaralarıyla daha büyük, aralarında koyu ağaç
 * kümeleri. Sahne suya yansıtabilsin diye yanan pencerelerden bir örnek döndürür.
 */
export function hillTown(
  g: CanvasRenderingContext2D,
  r: Rng,
  o: {
    ridge: readonly (readonly [number, number])[];
    bottom: (x: number) => number;
    x0: number;
    x1: number;
    fill: string;
    house: RGB;
    density: number;
    warm?: number;
    haze?: RGB;
    hazeA?: number;
    size?: number;
    /** Her çatıda kar. */
    snow?: boolean;
  },
): Light[] {
  g.save();
  g.beginPath();
  g.moveTo(o.x0, o.bottom(o.x0));
  for (let x = o.x0; x <= o.x1; x += 6) g.lineTo(x, polyY(o.ridge, x));
  g.lineTo(o.x1, polyY(o.ridge, o.x1));
  for (let x = o.x1; x >= o.x0; x -= 6) g.lineTo(x, o.bottom(x));
  g.closePath();
  g.fillStyle = o.fill;
  g.fill();
  g.beginPath();
  g.moveTo(o.x0, o.bottom(o.x0));
  for (let x = o.x0; x <= o.x1; x += 6) g.lineTo(x, polyY(o.ridge, x) - 16);
  g.lineTo(o.x1, polyY(o.ridge, o.x1) - 16);
  for (let x = o.x1; x >= o.x0; x -= 6) g.lineTo(x, o.bottom(x));
  g.closePath();
  g.clip();
  const lights: Light[] = [];
  const top = Math.min(...o.ridge.map((p) => p[1]));
  let bot = 0;
  for (let x = o.x0; x <= o.x1; x += 20) bot = Math.max(bot, o.bottom(x));
  const size = o.size ?? 1;
  const haze = o.haze ?? [120, 100, 120];
  // sırtın tepesinden (uzak) kıyıya (yakın) sıralar; yakın bloklar uzaktakilerin üstüne biner
  for (let y = top - 6; y < bot + 20; ) {
    const d = Math.min(1, Math.max(0, (y - top) / Math.max(1, bot - top)));
    const s = size * (0.45 + d * 1.6);
    for (let x = o.x0 - 10; x < o.x1 + 10; ) {
      const ridgeY = polyY(o.ridge, x);
      const w = s * range(r, 7, 15);
      if (y > ridgeY - 6 && y < o.bottom(x) + 4) {
        if (r() < 0.1) {
          // ağaçlar
          g.fillStyle = rgba([22, 26, 30], 0.9);
          g.beginPath();
          g.ellipse(x + w / 2, y + s * 2, w * 0.7, s * range(r, 3, 5), 0, 0, Math.PI * 2);
          g.fill();
        } else if (r() < 0.8 * o.density) {
          const h = s * range(r, 6, 15) * (r() < 0.08 ? 2 : 1);
          const hz = (1 - d) * (o.hazeA ?? 0.3) * 0.7;
          const tone = scale(o.house, range(r, 0.6, 1.05));
          g.fillStyle = rgba(mix(tone, haze, hz));
          g.fillRect(x, y - h, w, h);
          g.fillStyle = rgba(mix(scale(tone, 1.5), haze, hz), 0.55);
          g.fillRect(x, y - h, w, Math.max(0.6, s * 0.45));
          if (o.snow) {
            g.fillStyle = rgba(mix([226, 232, 244], haze, hz * 0.6), 0.9);
            g.fillRect(x - s * 0.3, y - h - s * 0.9, w + s * 0.6, Math.max(0.8, s * 1.2));
          }
          // pencereler
          const cols = Math.max(1, Math.round(w / (s * 2.6)));
          const rows = Math.max(1, Math.round(h / (s * 3)));
          const ww = Math.max(0.8, s * 1.1);
          const wh = Math.max(0.7, s * 1.2);
          for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
              if (r() > 0.3) continue;
              const c = r() < (o.warm ?? 0.8) ? pick(r, WARM) : pick(r, COOL);
              const a = range(r, 0.5, 1) * (0.55 + d * 0.45);
              const wx = x + ((i + 0.5) * w) / cols - ww / 2;
              const wy = y - h + ((j + 0.55) * h) / rows - wh / 2;
              g.fillStyle = rgba(c, a);
              g.fillRect(wx, wy, ww, wh);
              if (lights.length < 3000 && r() < 0.35) lights.push({ x: wx + ww / 2, y: wy + wh / 2, c, a, r: ww });
            }
          }
        }
      }
      x += w + s * range(r, 1, 5);
    }
    y += s * range(r, 4, 6.5);
  }
  // dolambaçlı sokaklar boyunca dizilmiş sokak lambaları
  for (let k = 0; k < Math.round((o.x1 - o.x0) / 60); k++) {
    let x = range(r, o.x0, o.x1);
    let y = range(r, top, bot);
    const dir = r() < 0.5 ? 1 : -1;
    for (let i = 0; i < 26; i++) {
      x += dir * range(r, 5, 9);
      y += range(r, -2, 3.5);
      if (y < polyY(o.ridge, x) || y > o.bottom(x)) continue;
      g.fillStyle = 'rgba(255,170,90,0.9)';
      g.fillRect(x, y, 1.6, 1.6);
      if (lights.length < 3000 && r() < 0.4) lights.push({ x, y, c: [255, 170, 90], a: 0.9, r: 1.6 });
    }
  }
  // sırta doğru atmosferik pus
  g.fillStyle = vGradient(g, top - 10, top + (bot - top) * 0.55, [
    [0, rgba(haze, (o.hazeA ?? 0.3) * 0.9)],
    [1, rgba(haze, 0)],
  ]);
  g.fillRect(o.x0 - 10, top - 20, o.x1 - o.x0 + 20, bot - top + 40);
  g.restore();
  return lights;
}

/** Cam giydirme cepheli ve ışıklı ofis katlı modern bir kule. Çatı noktasını döndürür. */
export function tower(
  g: CanvasRenderingContext2D,
  r: Rng,
  x: number,
  baseY: number,
  w: number,
  h: number,
  o: { body: RGB; lit?: number; warm?: number; crown?: 'flat' | 'slant' | 'spire' | 'pyramid' | 'step'; haze?: number; floor?: number },
) {
  const top = baseY - h;
  const edge = scale(o.body, 1.35);
  const gr = g.createLinearGradient(x, 0, x + w, 0);
  gr.addColorStop(0, rgba(scale(o.body, 0.75)));
  gr.addColorStop(0.55, rgba(o.body));
  gr.addColorStop(1, rgba(edge));
  g.fillStyle = gr;
  g.beginPath();
  if (o.crown === 'slant') {
    g.moveTo(x, baseY);
    g.lineTo(x, top + w * 0.5);
    g.lineTo(x + w, top);
    g.lineTo(x + w, baseY);
  } else if (o.crown === 'pyramid') {
    g.moveTo(x, baseY);
    g.lineTo(x, top + w * 0.35);
    g.lineTo(x + w / 2, top - w * 0.25);
    g.lineTo(x + w, top + w * 0.35);
    g.lineTo(x + w, baseY);
  } else if (o.crown === 'step') {
    g.moveTo(x, baseY);
    g.lineTo(x, top + h * 0.12);
    g.lineTo(x + w * 0.15, top + h * 0.12);
    g.lineTo(x + w * 0.15, top);
    g.lineTo(x + w * 0.85, top);
    g.lineTo(x + w * 0.85, top + h * 0.12);
    g.lineTo(x + w, top + h * 0.12);
    g.lineTo(x + w, baseY);
  } else {
    g.rect(x, top, w, h);
  }
  g.closePath();
  g.fill();
  g.save();
  g.clip();
  // katlar
  const floorH = o.floor ?? Math.max(3, w / 9);
  const cols = Math.max(2, Math.round(w / 5));
  for (let fy = top + floorH; fy < baseY - 2; fy += floorH) {
    const floorLit = r() < (o.lit ?? 0.5);
    for (let c = 0; c < cols; c++) {
      if (!floorLit && r() > 0.12) continue;
      if (floorLit && r() < 0.18) continue;
      const col = r() < (o.warm ?? 0.35) ? pick(r, WARM) : pick(r, COOL);
      g.fillStyle = rgba(col, range(r, 0.35, 0.85));
      g.fillRect(x + (c * w) / cols + 0.8, fy - floorH * 0.72, w / cols - 1.4, floorH * 0.55);
    }
  }
  // cam yansıma parlaklığı
  const sheen = g.createLinearGradient(x, top, x + w, baseY);
  sheen.addColorStop(0, 'rgba(255,255,255,0.08)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
  sheen.addColorStop(1, 'rgba(255,255,255,0.04)');
  g.fillStyle = sheen;
  g.fillRect(x, top - w, w, h + w);
  if (o.haze) {
    g.fillStyle = `rgba(120,110,140,${o.haze})`;
    g.fillRect(x, top - w, w, h + w);
  }
  g.restore();
  if (o.crown === 'spire') {
    g.strokeStyle = rgba(edge);
    g.lineWidth = Math.max(1, w * 0.04);
    g.beginPath();
    g.moveTo(x + w / 2, top);
    g.lineTo(x + w / 2, top - h * 0.14);
    g.stroke();
    return { x: x + w / 2, y: top - h * 0.14 };
  }
  return { x: x + w / 2, y: o.crown === 'pyramid' ? top - w * 0.25 : top };
}

/** Işıklandırılmış Osmanlı camisi silüeti: kubbe, yarım kubbeler, şerefeli minareler. */
export function mosque(
  g: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  s: number,
  o: { stone: RGB; lit: RGB; litA: number; minarets: 2 | 4; windows?: boolean; minaretH?: number; snow?: boolean },
) {
  const body = g.createLinearGradient(0, baseY - 90 * s, 0, baseY);
  body.addColorStop(0, rgba(o.stone));
  body.addColorStop(1, rgba(mix(o.stone, o.lit, o.litA)));
  // kurşun kubbeler: yuvarlak gölgelendirme, aşağıdaki projektörlerle aydınlanmış
  const dome = g.createRadialGradient(x - 14 * s, baseY - 84 * s, 4 * s, x, baseY - 60 * s, 46 * s);
  dome.addColorStop(0, rgba(mix(scale(o.stone, 1.05), o.lit, o.litA * 0.5)));
  dome.addColorStop(0.6, rgba(scale(o.stone, 0.7)));
  dome.addColorStop(1, rgba(mix(scale(o.stone, 0.55), o.lit, o.litA * 0.6)));
  const snowCap = (cx: number, cy: number, rx: number, ry: number) => {
    if (!o.snow) return;
    g.save();
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, 0, Math.PI, 0);
    g.clip();
    const sg = g.createLinearGradient(0, cy - ry, 0, cy - ry * 0.35);
    sg.addColorStop(0, 'rgba(240,244,252,0.95)');
    sg.addColorStop(1, 'rgba(220,228,242,0.0)');
    g.fillStyle = sg;
    g.fillRect(cx - rx, cy - ry, rx * 2, ry * 0.75);
    g.restore();
  };
  const mh = (o.minaretH ?? 120) * s;
  const minaretXs = o.minarets === 4 ? [-92, -70, 70, 92] : [-72, 72];
  // arkadaki minareler
  for (const mx of minaretXs) {
    const cx = x + mx * s;
    const h = Math.abs(mx) > 80 ? mh * 0.82 : mh;
    g.fillStyle = body;
    g.fillRect(cx - 3 * s, baseY - h, 6 * s, h);
    g.fillStyle = rgba(mix(o.stone, o.lit, o.litA * 0.8));
    for (const f of [0.55, 0.75, 0.9].slice(0, Math.abs(mx) > 80 ? 2 : 3)) g.fillRect(cx - 5 * s, baseY - h * f, 10 * s, 2.2 * s);
    g.fillStyle = rgba(scale(o.stone, 0.6));
    g.beginPath();
    g.moveTo(cx - 3.6 * s, baseY - h);
    g.lineTo(cx, baseY - h - 22 * s);
    g.lineTo(cx + 3.6 * s, baseY - h);
    g.fill();
    if (o.snow) {
      g.fillStyle = 'rgba(236,241,250,0.9)';
      g.beginPath();
      g.moveTo(cx - 1.6 * s, baseY - h - 12 * s);
      g.lineTo(cx, baseY - h - 22 * s);
      g.lineTo(cx + 1.6 * s, baseY - h - 12 * s);
      g.fill();
      for (const f of [0.55, 0.75, 0.9]) g.fillRect(cx - 5 * s, baseY - h * f - 1 * s, 10 * s, 1 * s);
    }
  }
  // taban bloğu
  g.fillStyle = body;
  g.fillRect(x - 62 * s, baseY - 44 * s, 124 * s, 44 * s);
  // yarım kubbeler ve köşe kubbeleri
  g.fillStyle = dome;
  for (const [dx, rx, ry, by] of [
    [-40, 22, 17, 44],
    [40, 22, 17, 44],
    [-56, 8, 7, 44],
    [56, 8, 7, 44],
  ] as const) {
    g.beginPath();
    g.ellipse(x + dx * s, baseY - by * s, rx * s, ry * s, 0, Math.PI, 0);
    g.fill();
    snowCap(x + dx * s, baseY - by * s, rx * s, ry * s);
  }
  // kasnak + ana kubbe
  g.fillStyle = body;
  g.fillRect(x - 30 * s, baseY - 58 * s, 60 * s, 16 * s);
  g.fillStyle = dome;
  g.beginPath();
  g.ellipse(x, baseY - 58 * s, 34 * s, 32 * s, 0, Math.PI, 0);
  g.fill();
  snowCap(x, baseY - 58 * s, 34 * s, 32 * s);
  if (o.snow) {
    g.fillStyle = 'rgba(236,241,250,0.85)';
    g.fillRect(x - 62 * s, baseY - 45.5 * s, 124 * s, 1.6 * s);
  }
  g.strokeStyle = rgba(mix(o.stone, o.lit, o.litA));
  g.lineWidth = 1.4 * s;
  g.beginPath();
  g.moveTo(x, baseY - 90 * s);
  g.lineTo(x, baseY - 100 * s);
  g.stroke();
  if (o.windows) {
    g.fillStyle = rgba([255, 214, 150], 0.85);
    for (let i = -5; i <= 5; i++) {
      g.fillRect(x + i * 10 * s - 2 * s, baseY - 30 * s, 4 * s, 9 * s);
      if (Math.abs(i) < 3) g.fillRect(x + i * 10 * s - 1.5 * s, baseY - 54 * s, 3 * s, 7 * s);
    }
  }
}

/** Galata Kulesi: taş silindir, ışıklı şerefe, konik külah. */
export function galata(g: CanvasRenderingContext2D, x: number, baseY: number, s: number) {
  const stone = g.createLinearGradient(x - 13 * s, 0, x + 13 * s, 0);
  stone.addColorStop(0, '#6d5a4a');
  stone.addColorStop(0.5, '#d7b88f');
  stone.addColorStop(1, '#7a6250');
  g.fillStyle = stone;
  g.beginPath();
  g.moveTo(x - 14 * s, baseY);
  g.lineTo(x - 12 * s, baseY - 120 * s);
  g.lineTo(x + 12 * s, baseY - 120 * s);
  g.lineTo(x + 14 * s, baseY);
  g.fill();
  g.fillStyle = 'rgba(40,30,24,0.55)';
  for (let i = 0; i < 4; i++) g.fillRect(x - 2 * s, baseY - (30 + i * 24) * s, 4 * s, 7 * s);
  g.fillStyle = '#5a4a3d';
  g.fillRect(x - 15 * s, baseY - 124 * s, 30 * s, 4 * s);
  g.fillStyle = '#ffd89a';
  g.fillRect(x - 13 * s, baseY - 138 * s, 26 * s, 14 * s);
  g.fillStyle = 'rgba(60,40,30,0.8)';
  for (let i = -2; i <= 2; i++) g.fillRect(x + i * 5 * s - 0.8 * s, baseY - 138 * s, 1.6 * s, 14 * s);
  g.fillStyle = '#3d4552';
  g.beginPath();
  g.moveTo(x - 15 * s, baseY - 138 * s);
  g.lineTo(x, baseY - 182 * s);
  g.lineTo(x + 15 * s, baseY - 138 * s);
  g.fill();
}

/** Galata Kulesi'nin külahına ve şerefesine yerleşmiş kar. */
export function galataSnow(g: CanvasRenderingContext2D, x: number, baseY: number, s: number) {
  g.fillStyle = 'rgba(236,241,250,0.92)';
  g.beginPath();
  g.moveTo(x - 9 * s, baseY - 156 * s);
  g.lineTo(x, baseY - 182 * s);
  g.lineTo(x + 6 * s, baseY - 160 * s);
  g.lineTo(x + 2 * s, baseY - 158 * s);
  g.closePath();
  g.fill();
  g.fillRect(x - 15 * s, baseY - 125 * s, 30 * s, 1.5 * s);
}

/* ── Kuşlar ─────────────────────────────────────────────────────────────────── */

export function gull(g: CanvasRenderingContext2D, x: number, y: number, s: number, flap: number, color: string) {
  const tip = -Math.sin(flap) * 5 * s;
  g.strokeStyle = color;
  g.lineWidth = Math.max(1, 1.6 * s);
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x - 12 * s, y + tip);
  g.quadraticCurveTo(x - 6 * s, y - 4 * s - tip * 0.3, x, y);
  g.quadraticCurveTo(x + 6 * s, y - 4 * s - tip * 0.3, x + 12 * s, y + tip);
  g.stroke();
}
