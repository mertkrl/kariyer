import type { Building } from './scenery';
import { rng } from './sim';

/*
 * Bir apartmanın eğik kuşbakışı çizimi: gölgedeki batı yüzü, güney cephesi (zemin katta dükkân
 * camı, şeritli tente ve tabela ya da apartman kapısı; katlarda pencere, balkon, çamaşır, klima)
 * ve çatı (kiremit ya da düz: parapet, asansör kulesi, güneş enerjili termosifon, su deposu,
 * çanak anten). Akşam olunca pencerelerin bir kısmı yanar.
 */

/** Eğik bakış: bir metre yükseklik ekranda bu kadar yukarı ve sağa kayar. */
export const OBL_Y = 0.42;
export const OBL_X = 0.12;

export function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (s: number) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f)));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

/** Köşedeki cami: taş avlu, kubbeli harim, yarım kubbeler ve köşede şerefeli minare. */
function mosque(ctx: CanvasRenderingContext2D, b: Building, dusk: number) {
  const { x, y, w, d } = b;
  // avlu: taş döşeme, çevresinde alçak duvar
  ctx.fillStyle = '#dcd4c2';
  ctx.fillRect(x, y, w, d);
  ctx.strokeStyle = '#b9b09c';
  ctx.lineWidth = 0.35;
  ctx.strokeRect(x + 0.2, y + 0.2, w - 0.4, d - 0.4);
  // şadırvan
  ctx.fillStyle = '#9fb3b8';
  ctx.beginPath();
  ctx.arc(x + w * 0.22, y + d * 0.5, 1.4, 0, Math.PI * 2);
  ctx.fill();
  // harim: avlunun gerisinde bir kutu
  const hx = x + w * 0.42;
  const hy = y + 2;
  const hw = w * 0.54;
  const hd = d - 4;
  const H = 9;
  const ox = H * OBL_X;
  const oy = -H * OBL_Y;
  ctx.fillStyle = shade(b.color, 0.7);
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(hx, hy + hd);
  ctx.lineTo(hx + ox, hy + hd + oy);
  ctx.lineTo(hx + ox, hy + oy);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.transform(1, 0, ox / H, oy / H, hx, hy + hd);
  ctx.fillStyle = b.color;
  ctx.fillRect(0, 0, hw, H);
  // kemerli pencereler, iki sıra
  for (const v0 of [1.4, 5.2])
    for (let u = 1.2; u < hw - 1.2; u += 2.2) {
      ctx.fillStyle = dusk > 0.3 ? '#f5d58c' : '#4b5b66';
      ctx.beginPath();
      ctx.moveTo(u, v0);
      ctx.lineTo(u + 1, v0);
      ctx.lineTo(u + 1, v0 + 1.8);
      ctx.arc(u + 0.5, v0 + 1.8, 0.5, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
    }
  ctx.restore();
  const rx = hx + ox;
  const ry = hy + oy;
  ctx.fillStyle = shade(b.color, 0.9);
  ctx.fillRect(rx, ry, hw, hd);
  // yarım kubbeler ve ana kubbe: kurşun gri
  const cx = rx + hw / 2;
  const cy = ry + hd / 2;
  const R = Math.min(hw, hd) * 0.36;
  const dome = (px: number, py: number, rr: number) => {
    const g = ctx.createRadialGradient(px - rr * 0.35, py - rr * 0.55, rr * 0.1, px, py - rr * 0.2, rr);
    g.addColorStop(0, '#b7c2c9');
    g.addColorStop(1, '#56636d');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(px, py - rr * 0.25, rr, rr * 0.92, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  for (const [dx, dy] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ])
    dome(cx + dx * R * 1.05, cy + dy * R * 0.95, R * 0.45);
  dome(cx, cy, R);
  ctx.strokeStyle = '#d6b44a';
  ctx.lineWidth = 0.18;
  ctx.beginPath();
  ctx.moveTo(cx, cy - R * 1.15);
  ctx.lineTo(cx, cy - R * 1.6);
  ctx.stroke();
  // minare: kavşağa uzak köşede, çatı kuzeye eğik görünür
  const mx = Math.abs(x) > Math.abs(x + w) ? x + 1.5 : x + w - 1.5;
  const my = Math.abs(y) > Math.abs(y + d) ? y + 1.5 : y + d - 1.5;
  const top = 30;
  const tx = mx + top * OBL_X;
  const ty = my - top * OBL_Y;
  ctx.strokeStyle = 'rgba(20,20,26,0.25)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(mx, my);
  ctx.lineTo(mx + top * 0.32, my + top * 0.18);
  ctx.stroke();
  ctx.strokeStyle = '#ece6d8';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(mx, my);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.strokeStyle = shade('#ece6d8', 0.7);
  ctx.lineWidth = 0.25;
  ctx.beginPath();
  ctx.moveTo(mx + 0.4, my);
  ctx.lineTo(tx + 0.4, ty);
  ctx.stroke();
  // şerefe ve külah
  const sh = 22;
  ctx.fillStyle = '#d9d2c2';
  ctx.beginPath();
  ctx.ellipse(mx + sh * OBL_X, my - sh * OBL_Y, 1.05, 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5d6a74';
  ctx.beginPath();
  ctx.moveTo(tx - 0.55, ty);
  ctx.lineTo(tx + 0.55, ty);
  ctx.lineTo(tx + 0.5 * OBL_X * 8, ty - 3.2);
  ctx.closePath();
  ctx.fill();
}

/** `coarse`: uzaktan bakışta (bütün harita) yalnızca yüzler ve düz renk çatı; pencere, balkon, tabela yok. */
export function building(ctx: CanvasRenderingContext2D, b: Building, dusk: number, coarse = false) {
  if (b.landmark === 'cami' && !coarse) return mosque(ctx, b, dusk);
  const r = rng(b.seed);
  const H = b.floors * 3 + 0.8;
  const ox = H * OBL_X;
  const oy = -H * OBL_Y;
  const { x, y, w, d } = b;
  if (coarse) {
    ctx.fillStyle = shade(b.color, 0.68);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + d);
    ctx.lineTo(x + ox, y + d + oy);
    ctx.lineTo(x + ox, y + oy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.moveTo(x, y + d);
    ctx.lineTo(x + w, y + d);
    ctx.lineTo(x + w + ox, y + d + oy);
    ctx.lineTo(x + ox, y + d + oy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = b.roof === 'tile' ? '#a24e36' : b.slab;
    ctx.fillRect(x + ox, y + oy, w, d);
    return;
  }
  // batı yüzü (gölgede)
  ctx.fillStyle = shade(b.color, 0.68);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + d);
  ctx.lineTo(x + ox, y + d + oy);
  ctx.lineTo(x + ox, y + oy);
  ctx.closePath();
  ctx.fill();
  // güney yüzü: cephe, yerel çerçevede (u sağa, v yukarı)
  ctx.save();
  ctx.transform(1, 0, ox / H, oy / H, x, y + d);
  ctx.fillStyle = b.color;
  ctx.fillRect(0, 0, w, H);
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  for (let f = 1; f < b.floors; f++) ctx.fillRect(0, f * 3 - 0.12, w, 0.24);
  // zemin kat
  if (b.shop) {
    const g = ctx.createLinearGradient(0, 0, 0, 2.7);
    g.addColorStop(0, dusk > 0.3 ? '#f2d58a' : '#2d3944');
    g.addColorStop(1, dusk > 0.3 ? '#b88a3a' : '#51606c');
    ctx.fillStyle = g;
    ctx.fillRect(0.5, 0.15, w - 1, 2.5);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let u = 1.5; u < w - 1; u += 3.5) ctx.fillRect(u, 0.15, 0.12, 2.5);
    // tente: şeritli
    for (let u = 0.3, k = 0; u < w - 0.3; u += 0.8, k++) {
      ctx.fillStyle = k % 2 ? '#f2eee4' : b.shop.awning;
      ctx.fillRect(u, 2.55, Math.min(0.8, w - 0.3 - u), 0.7);
    }
    ctx.fillStyle = '#1f2227';
    ctx.fillRect(0.4, 3.25, w - 0.8, 0.95);
    ctx.save();
    ctx.scale(1, -1);
    ctx.fillStyle = b.shop.name === 'ECZANE' ? '#52d07a' : '#f4efe2';
    ctx.font = `700 0.82px "Work Sans Variable", "Helvetica Neue", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.shop.name, w / 2, -3.72, w - 1.4);
    ctx.restore();
  } else {
    ctx.fillStyle = '#5b4a3a';
    ctx.fillRect(w / 2 - 0.7, 0, 1.4, 2.3);
    ctx.fillStyle = '#e8e2d4';
    ctx.fillRect(w / 2 - 1, 2.3, 2, 0.25);
  }
  // pencereler, balkonlar, klimalar
  const bays = Math.max(2, Math.floor(w / 3.1));
  const bw = w / bays;
  for (let f = 1; f < b.floors; f++) {
    for (let k = 0; k < bays; k++) {
      const u = k * bw;
      const balcony = (k + (f % 2)) % b.balcony === 0 && bays > 2;
      const lit = dusk > 0.2 && r() < 0.45;
      const gw = bw * (balcony ? 0.42 : 0.5);
      const gh = balcony ? 2.1 : 1.45;
      const v0 = f * 3 + (balcony ? 0.25 : 0.85);
      ctx.fillStyle = '#f1ede4';
      ctx.fillRect(u + (bw - gw) / 2 - 0.12, v0 - 0.12, gw + 0.24, gh + 0.24);
      ctx.fillStyle = lit ? (r() < 0.5 ? '#ffd98a' : '#f6c870') : r() < 0.15 ? '#3a3f45' : '#7d93a1';
      ctx.fillRect(u + (bw - gw) / 2, v0, gw, gh);
      if (!lit) {
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.fillRect(u + (bw - gw) / 2, v0 + gh * 0.55, gw * 0.45, gh * 0.4);
      }
      if (balcony) {
        ctx.fillStyle = shade(b.color, 0.82);
        ctx.fillRect(u + bw * 0.08, f * 3, bw * 0.84, 0.28);
        ctx.strokeStyle = 'rgba(40,40,44,0.8)';
        ctx.lineWidth = 0.08;
        ctx.beginPath();
        ctx.moveTo(u + bw * 0.08, f * 3 + 1.05);
        ctx.lineTo(u + bw * 0.92, f * 3 + 1.05);
        for (let q = u + bw * 0.12; q < u + bw * 0.9; q += 0.25) {
          ctx.moveTo(q, f * 3 + 0.28);
          ctx.lineTo(q, f * 3 + 1.05);
        }
        ctx.stroke();
        if (r() < 0.35) {
          // çamaşır ya da saksı
          for (let q = 0; q < 4; q++) {
            ctx.fillStyle = ['#c84a3a', '#3f78b0', '#f0e6c8', '#4f8a4a'][Math.floor(r() * 4)];
            ctx.fillRect(u + bw * 0.2 + q * 0.45, f * 3 + 0.55, 0.32, 0.4);
          }
        }
      } else if (r() < 0.22) {
        ctx.fillStyle = '#f4f4f0';
        ctx.fillRect(u + bw * 0.78, f * 3 + 0.5, 0.75, 0.55);
        ctx.fillStyle = '#9a9a96';
        ctx.fillRect(u + bw * 0.8, f * 3 + 0.6, 0.3, 0.3);
      }
    }
  }
  ctx.fillStyle = shade(b.color, 0.86);
  ctx.fillRect(0, H - 0.6, w, 0.6);
  ctx.restore();

  // çatı
  const rx = x + ox;
  const ry = y + oy;
  if (b.roof === 'tile') {
    const ridge = Math.min(w, d) / 2;
    const long = w >= d;
    const facets: [number, [number, number][]][] = long
      ? [
          [0.95, [[rx, ry], [rx + w, ry], [rx + w - ridge, ry + ridge], [rx + ridge, ry + ridge]]],
          [0.72, [[rx, ry + d], [rx + w, ry + d], [rx + w - ridge, ry + ridge], [rx + ridge, ry + ridge]]],
          [0.82, [[rx, ry], [rx + ridge, ry + ridge], [rx, ry + d]]],
          [0.62, [[rx + w, ry], [rx + w - ridge, ry + ridge], [rx + w, ry + d]]],
        ]
      : [
          [0.82, [[rx, ry], [rx + ridge, ry + ridge], [rx + ridge, ry + d - ridge], [rx, ry + d]]],
          [0.62, [[rx + w, ry], [rx + w - ridge, ry + ridge], [rx + w - ridge, ry + d - ridge], [rx + w, ry + d]]],
          [0.95, [[rx, ry], [rx + w, ry], [rx + ridge, ry + ridge]]],
          [0.72, [[rx, ry + d], [rx + w, ry + d], [rx + ridge, ry + d - ridge]]],
        ];
    for (const [f, pts] of facets) {
      ctx.fillStyle = shade(b.landmark === 'kosk' ? '#8a3f2c' : '#b4563a', f);
      ctx.beginPath();
      pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(70,30,20,0.35)';
    ctx.lineWidth = 0.06;
    for (let q = ry + 0.5; q < ry + d; q += 0.5) {
      ctx.beginPath();
      ctx.moveTo(rx, q);
      ctx.lineTo(rx + w, q);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = shade(b.color, 0.92);
    ctx.fillRect(rx, ry, w, d);
    ctx.fillStyle = b.slab;
    ctx.fillRect(rx + 0.45, ry + 0.45, w - 0.9, d - 0.9);
    // parapetin gölgesi, eski yamalar ve su lekeleri
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(rx + 0.45, ry + 0.45, w - 0.9, 0.5);
    ctx.fillRect(rx + 0.45, ry + 0.45, 0.4, d - 0.9);
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.08)';
      ctx.fillRect(rx + 1 + r() * (w - 4), ry + 1 + r() * (d - 4), 1.5 + r() * 3, 1 + r() * 2.5);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    for (let q = rx + 2.5; q < rx + w - 0.5; q += 2.5) {
      ctx.moveTo(q, ry + 0.5);
      ctx.lineTo(q, ry + d - 0.5);
    }
    ctx.stroke();
    // asansör ve merdiven kulesi
    const px = rx + w * (0.3 + r() * 0.3);
    const py = ry + d * (0.3 + r() * 0.3);
    ctx.fillStyle = shade(b.color, 0.75);
    ctx.fillRect(px + 0.4, py + 2.2, 3, 0.9);
    ctx.fillStyle = '#c9c4b9';
    ctx.fillRect(px + 0.8, py - 0.2, 3, 2.6);
    // güneş enerjili termosifon: koyu panel, üstünde beyaz depo
    for (const [u, vv] of b.solar) {
      const sx = rx + u * (w - 3);
      const sy = ry + vv * (d - 3);
      ctx.fillStyle = '#1e3350';
      ctx.fillRect(sx, sy + 0.7, 2.2, 1.6);
      ctx.strokeStyle = 'rgba(160,190,220,0.5)';
      ctx.lineWidth = 0.05;
      ctx.beginPath();
      for (let q = 0.45; q < 2.2; q += 0.45) {
        ctx.moveTo(sx + q, sy + 0.7);
        ctx.lineTo(sx + q, sy + 2.3);
      }
      ctx.stroke();
      ctx.fillStyle = '#ecebe6';
      ctx.beginPath();
      ctx.roundRect(sx - 0.1, sy, 2.4, 0.65, 0.3);
      ctx.fill();
    }
    // su depoları: beyaz silindir
    for (const [u, vv] of b.tanks) {
      const tx = rx + 1 + u * (w - 2);
      const ty = ry + 1 + vv * (d - 2);
      ctx.fillStyle = '#d9d7cf';
      ctx.fillRect(tx - 0.6, ty, 1.2, 0.55);
      ctx.fillStyle = '#f5f4ef';
      ctx.beginPath();
      ctx.ellipse(tx, ty, 0.6, 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const [u, vv] of b.dishes) {
    const dx = rx + u * w;
    const dy = ry + vv * d;
    ctx.fillStyle = '#e8e8e4';
    ctx.beginPath();
    ctx.arc(dx, dy, 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9b9b96';
    ctx.beginPath();
    ctx.arc(dx + 0.1, dy + 0.05, 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
}
