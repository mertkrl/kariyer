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

/** Mahalle maketinin mürekkebi: binaların çevre çizgisi. */
export const INK = '#2a231d';

/** Yüzeyi mürekkeple çevreler (çizgi kalınlığı metre). */
function ink(ctx: CanvasRenderingContext2D, pts: [number, number][], w = 0.16) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = w;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.closePath();
  ctx.stroke();
}

/** Yeşil ve lacivert ahşap panjurlar: binanın tohumundan seçilir, bazı binalarda yok. */
const SHUTTERS = ['#5f7d55', '#6a7f5a', '#4f6f7a', '#7a5a3c'];

/** `coarse`: uzaktan bakışta (bütün harita) yalnızca yüzler ve düz renk çatı; pencere, balkon, tabela yok. */
export function building(ctx: CanvasRenderingContext2D, b: Building, dusk: number, coarse = false) {
  if (b.landmark === 'cami' && !coarse) return mosque(ctx, b, dusk);
  const r = rng(b.seed);
  const H = b.floors * 3 + 0.8;
  const ox = H * OBL_X;
  const oy = -H * OBL_Y;
  const { x, y, w, d } = b;
  const west: [number, number][] = [
    [x, y],
    [x, y + d],
    [x + ox, y + d + oy],
    [x + ox, y + oy],
  ];
  const south: [number, number][] = [
    [x, y + d],
    [x + w, y + d],
    [x + w + ox, y + d + oy],
    [x + ox, y + d + oy],
  ];
  const fill = (pts: [number, number][]) => {
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    ctx.fill();
  };
  if (coarse) {
    ctx.fillStyle = shade(b.color, 0.68);
    fill(west);
    ctx.fillStyle = b.color;
    fill(south);
    ctx.fillStyle = b.roof === 'tile' ? '#b9573a' : b.slab;
    ctx.fillRect(x + ox, y + oy, w, d);
    ink(ctx, [[x, y + d], [x + w, y + d], [x + w + ox, y + d + oy], [x + w + ox, y + oy], [x + ox, y + oy], [x, y]], 0.3);
    return;
  }
  // batı yüzü (gölgede): sıva, dibe doğru koyulaşır
  const wg = ctx.createLinearGradient(x, y + d, x + ox, y + d + oy);
  wg.addColorStop(0, shade(b.color, 0.58));
  wg.addColorStop(1, shade(b.color, 0.74));
  ctx.fillStyle = wg;
  fill(west);
  // güney yüzü: cephe, yerel çerçevede (u sağa, v yukarı)
  const shutter = r() < 0.6 ? SHUTTERS[Math.floor(r() * SHUTTERS.length)] : undefined;
  ctx.save();
  ctx.transform(1, 0, ox / H, oy / H, x, y + d);
  ctx.fillStyle = b.color;
  ctx.fillRect(0, 0, w, H);
  // ışık soldan: cephe sağa doğru hafifçe gölgelenir
  const fg = ctx.createLinearGradient(0, 0, w, 0);
  fg.addColorStop(0, 'rgba(255,255,255,0.1)');
  fg.addColorStop(0.7, 'rgba(0,0,0,0)');
  fg.addColorStop(1, 'rgba(42,26,16,0.16)');
  ctx.fillStyle = fg;
  ctx.fillRect(0, 0, w, H);
  // sıva lekeleri: yağmur izi ve kabaran boya
  for (let k = 0; k < 3; k++) {
    ctx.fillStyle = shade(b.color, 0.86 + r() * 0.06);
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.ellipse(r() * w, 1 + r() * (H - 2), 0.8 + r() * w * 0.15, 0.4 + r() * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // kat silmeleri: açık renk bant, mürekkep altı
  for (let f = 1; f < b.floors; f++) {
    ctx.fillStyle = shade(b.color, 1.1);
    ctx.fillRect(0, f * 3 - 0.14, w, 0.24);
    ctx.fillStyle = 'rgba(42,35,29,0.35)';
    ctx.fillRect(0, f * 3 - 0.16, w, 0.04);
  }
  // zemin kat
  ctx.fillStyle = shade(b.color, 0.92);
  ctx.fillRect(0, 0, w, 2.9);
  if (b.shop) {
    const g = ctx.createLinearGradient(0, 0, 0, 2.7);
    g.addColorStop(0, dusk > 0.3 ? '#f2d58a' : '#2d3944');
    g.addColorStop(1, dusk > 0.3 ? '#b88a3a' : '#6f8f9e');
    ctx.fillStyle = g;
    ctx.fillRect(0.5, 0.15, w - 1, 2.4);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.08;
    ctx.strokeRect(0.5, 0.15, w - 1, 2.4);
    ctx.fillStyle = 'rgba(243,234,214,0.7)';
    for (let u = 1.5; u < w - 1; u += 3.5) ctx.fillRect(u, 0.15, 0.14, 2.4);
    // tente: şeritli, alt kenarı fistolu
    ctx.fillStyle = '#fbf6ea';
    ctx.fillRect(0.2, 2.45, w - 0.4, 0.8);
    for (let u = 0.2, k = 0; u < w - 0.2; u += 0.8, k++)
      if (k % 2 === 0) {
        ctx.fillStyle = b.shop.awning;
        ctx.fillRect(u, 2.45, Math.min(0.4, w - 0.2 - u), 0.8);
      }
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.07;
    ctx.beginPath();
    ctx.moveTo(0.2, 2.45);
    for (let u = 0.2; u < w - 0.4; u += 0.6) ctx.quadraticCurveTo(u + 0.3, 2.2, u + 0.6, 2.45);
    ctx.lineTo(w - 0.2, 3.25);
    ctx.lineTo(0.2, 3.25);
    ctx.closePath();
    ctx.stroke();
    // tabela: krem zemin, renkli yazı (dükkân adı mürekkep çerçevede)
    ctx.fillStyle = '#fbf6ea';
    ctx.fillRect(0.4, 3.3, w - 0.8, 0.95);
    ctx.strokeRect(0.4, 3.3, w - 0.8, 0.95);
    ctx.save();
    ctx.scale(1, -1);
    ctx.fillStyle = b.shop.name === 'ECZANE' ? '#2f8f4f' : b.shop.awning;
    ctx.font = `800 0.78px "Work Sans Variable", "Helvetica Neue", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.shop.name, w / 2, -3.77, w - 1.4);
    ctx.restore();
  } else {
    // apartman kapısı: ahşap kanat, camlı üst, saçak
    ctx.fillStyle = '#6e4a2e';
    ctx.fillRect(w / 2 - 0.75, 0, 1.5, 2.3);
    ctx.fillStyle = '#9fb8c4';
    ctx.fillRect(w / 2 - 0.5, 1.2, 1, 0.8);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.07;
    ctx.strokeRect(w / 2 - 0.75, 0, 1.5, 2.3);
    ctx.fillStyle = '#5d5650';
    ctx.fillRect(w / 2 - 1.1, 2.3, 2.2, 0.28);
  }
  // pencereler, balkonlar, klimalar
  const bays = Math.max(2, Math.floor(w / 3.1));
  const bw = w / bays;
  for (let f = 1; f < b.floors; f++) {
    for (let k = 0; k < bays; k++) {
      const u = k * bw;
      const balcony = (k + (f % 2)) % b.balcony === 0 && bays > 2;
      const lit = dusk > 0.2 && r() < 0.45;
      const gw = bw * (balcony ? 0.42 : 0.44);
      const gh = balcony ? 2.1 : 1.45;
      const v0 = f * 3 + (balcony ? 0.25 : 0.85);
      const gx = u + (bw - gw) / 2;
      // kasa, cam ve orta kayıt
      ctx.fillStyle = '#f3ead6';
      ctx.fillRect(gx - 0.14, v0 - 0.14, gw + 0.28, gh + 0.28);
      ctx.fillStyle = lit ? (r() < 0.5 ? '#ffe7a6' : '#efb45a') : r() < 0.15 ? '#3a3f45' : '#7d97a6';
      ctx.fillRect(gx, v0, gw, gh);
      if (!lit) {
        ctx.fillStyle = 'rgba(201,221,228,0.55)';
        ctx.fillRect(gx, v0 + gh * 0.5, gw * 0.45, gh * 0.45);
      }
      ctx.fillStyle = '#f3ead6';
      ctx.fillRect(gx + gw / 2 - 0.05, v0, 0.1, gh);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.07;
      ctx.strokeRect(gx - 0.14, v0 - 0.14, gw + 0.28, gh + 0.28);
      // denizlik
      ctx.fillStyle = '#eee6d4';
      ctx.fillRect(gx - 0.25, v0 - 0.32, gw + 0.5, 0.2);
      // panjur kanatları
      if (shutter && !balcony && bw - gw > 1) {
        ctx.fillStyle = shutter;
        ctx.fillRect(gx - 0.62, v0 - 0.14, 0.46, gh + 0.28);
        ctx.fillRect(gx + gw + 0.16, v0 - 0.14, 0.46, gh + 0.28);
        ctx.lineWidth = 0.05;
        ctx.strokeRect(gx - 0.62, v0 - 0.14, 0.46, gh + 0.28);
        ctx.strokeRect(gx + gw + 0.16, v0 - 0.14, 0.46, gh + 0.28);
      }
      if (balcony) {
        // beton döşeme ve demir korkuluk
        ctx.fillStyle = shade(b.color, 0.72);
        ctx.fillRect(u + bw * 0.06, f * 3 - 0.05, bw * 0.88, 0.32);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 0.06;
        ctx.strokeRect(u + bw * 0.06, f * 3 - 0.05, bw * 0.88, 0.32);
        ctx.lineWidth = 0.06;
        ctx.beginPath();
        ctx.moveTo(u + bw * 0.06, f * 3 + 1.1);
        ctx.lineTo(u + bw * 0.94, f * 3 + 1.1);
        for (let q = u + bw * 0.1; q < u + bw * 0.92; q += 0.3) {
          ctx.moveTo(q, f * 3 + 0.27);
          ctx.lineTo(q, f * 3 + 1.1);
        }
        ctx.stroke();
        if (r() < 0.45) {
          // çamaşır ipi ve mandallı çamaşırlar
          ctx.strokeStyle = '#6b645a';
          ctx.lineWidth = 0.04;
          ctx.beginPath();
          ctx.moveTo(u + bw * 0.12, f * 3 + 2.2);
          ctx.quadraticCurveTo(u + bw / 2, f * 3 + 1.9, u + bw * 0.88, f * 3 + 2.2);
          ctx.stroke();
          for (let q = 0; q < 4; q++) {
            ctx.fillStyle = ['#c94a3a', '#f3ead6', '#3b6894', '#e6b62f'][Math.floor(r() * 4)];
            const hgt = q % 2 ? 0.5 : 0.7;
            ctx.fillRect(u + bw * 0.2 + q * bw * 0.17, f * 3 + 2.05 - hgt, 0.36, hgt);
          }
        } else if (r() < 0.5) {
          // saksıda sardunya
          ctx.fillStyle = '#b65a3a';
          ctx.fillRect(u + bw * 0.16, f * 3 + 0.27, 0.45, 0.35);
          ctx.fillStyle = '#5e8a4e';
          ctx.beginPath();
          ctx.arc(u + bw * 0.16 + 0.22, f * 3 + 0.8, 0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#d4544a';
          ctx.beginPath();
          ctx.arc(u + bw * 0.16 + 0.4, f * 3 + 0.9, 0.16, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (r() < 0.22) {
        ctx.fillStyle = '#ece8e0';
        ctx.fillRect(u + bw * 0.78, f * 3 + 0.5, 0.75, 0.55);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 0.05;
        ctx.strokeRect(u + bw * 0.78, f * 3 + 0.5, 0.75, 0.55);
        ctx.fillStyle = '#9a9a96';
        ctx.fillRect(u + bw * 0.8, f * 3 + 0.6, 0.3, 0.3);
      }
    }
  }
  // yağmur borusu ve saçak silmesi
  ctx.fillStyle = '#8f8a80';
  ctx.fillRect(w - 0.45, 0, 0.25, H - 0.6);
  ctx.fillStyle = shade(b.color, 1.12);
  ctx.fillRect(0, H - 0.6, w, 0.6);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.06;
  ctx.strokeRect(0, H - 0.6, w, 0.6);
  ctx.restore();
  ink(ctx, west, 0.12);
  ink(ctx, south, 0.16);

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
          [1.04, [[rx, ry], [rx + ridge, ry + ridge], [rx, ry + d]]],
          [0.62, [[rx + w, ry], [rx + w - ridge, ry + ridge], [rx + w, ry + d]]],
        ]
      : [
          [1.04, [[rx, ry], [rx + ridge, ry + ridge], [rx + ridge, ry + d - ridge], [rx, ry + d]]],
          [0.62, [[rx + w, ry], [rx + w - ridge, ry + ridge], [rx + w - ridge, ry + d - ridge], [rx + w, ry + d]]],
          [0.95, [[rx, ry], [rx + w, ry], [rx + ridge, ry + ridge]]],
          [0.72, [[rx, ry + d], [rx + w, ry + d], [rx + ridge, ry + d - ridge]]],
        ];
    const tile = b.landmark === 'kosk' ? '#8a3f2c' : '#b9573a';
    for (const [f, pts] of facets) {
      ctx.fillStyle = shade(tile, f);
      fill(pts);
    }
    // kiremit sıraları: yatay oluklar ve şaşırtmalı derzler, çatının içine kırpılır
    ctx.save();
    ctx.beginPath();
    ctx.rect(rx, ry, w, d);
    ctx.clip();
    ctx.strokeStyle = 'rgba(60,20,10,0.38)';
    ctx.lineWidth = 0.07;
    ctx.beginPath();
    for (let q = ry + 0.55; q < ry + d; q += 0.55) {
      ctx.moveTo(rx, q);
      ctx.lineTo(rx + w, q);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(60,20,10,0.16)';
    ctx.beginPath();
    for (let q = ry, n = 0; q < ry + d; q += 0.55, n++)
      for (let p = rx + (n % 2) * 0.35; p < rx + w; p += 0.7) {
        ctx.moveTo(p, q);
        ctx.lineTo(p, q + 0.55);
      }
    ctx.stroke();
    ctx.restore();
    // mahya ve kırma çizgileri mürekkeple
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.1;
    ctx.beginPath();
    for (const [, pts] of facets) {
      pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      ctx.closePath();
    }
    ctx.stroke();
    // baca: kuzey yamaçta, sıvalı gövde ve koyu başlık
    const cx0 = rx + w * (0.6 + r() * 0.2);
    const cy0 = ry + d * 0.3;
    ctx.fillStyle = shade(b.color, 0.8);
    ctx.fillRect(cx0, cy0 - 1.2, 0.9, 1.4);
    ctx.fillStyle = '#6f665c';
    ctx.fillRect(cx0 - 0.15, cy0 - 1.4, 1.2, 0.3);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.07;
    ctx.strokeRect(cx0, cy0 - 1.2, 0.9, 1.4);
    ctx.strokeRect(cx0 - 0.15, cy0 - 1.4, 1.2, 0.3);
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
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.08;
    ctx.strokeRect(rx + 0.45, ry + 0.45, w - 0.9, d - 0.9);
    // asansör ve merdiven kulesi
    const px = rx + w * (0.3 + r() * 0.3);
    const py = ry + d * (0.3 + r() * 0.3);
    ctx.fillStyle = shade(b.color, 0.75);
    ctx.fillRect(px + 0.4, py + 2.2, 3, 0.9);
    ctx.fillStyle = '#d9d2c4';
    ctx.fillRect(px + 0.8, py - 0.2, 3, 2.6);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.08;
    ctx.strokeRect(px + 0.8, py - 0.2, 3, 2.6);
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
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.06;
      ctx.strokeRect(sx, sy + 0.7, 2.2, 1.6);
      ctx.fillStyle = '#ecebe6';
      ctx.beginPath();
      ctx.roundRect(sx - 0.1, sy, 2.4, 0.65, 0.3);
      ctx.fill();
      ctx.stroke();
    }
    // su depoları: beyaz silindir
    for (const [u, vv] of b.tanks) {
      const tx = rx + 1 + u * (w - 2);
      const ty = ry + 1 + vv * (d - 2);
      ctx.fillStyle = '#d9d7cf';
      ctx.fillRect(tx - 0.6, ty, 1.2, 0.55);
      ctx.fillStyle = '#f5f4ef';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.05;
      ctx.beginPath();
      ctx.ellipse(tx, ty, 0.6, 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  // çatının çevre çizgisi
  ink(ctx, [[rx, ry], [rx + w, ry], [rx + w, ry + d], [rx, ry + d]], 0.16);
  for (const [u, vv] of b.dishes) {
    const dx = rx + u * w;
    const dy = ry + vv * d;
    ctx.fillStyle = '#ece8e0';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    ctx.ellipse(dx, dy, 0.48, 0.38, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(dx, dy);
    ctx.lineTo(dx + 0.45, dy - 0.2);
    ctx.stroke();
  }
}
