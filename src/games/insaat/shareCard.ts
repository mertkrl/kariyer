import { CARD_H, CARD_W } from '../../arcade/share';
import { toneHex } from '../../shared/color';

/*
 * İnşaat İzleme'nin paylaşım kartı: akşamüstü, teslim edilmiş apartman ve yanında şantiye tabelası.
 * Tabelada proje, ertelenen teslim yılları (üstü çizili) ve izleyicinin karnesi var; üstüne kırmızı
 * "İSKÂN ALINDI" mührü basılmış. Önde, sırtı dönük amcalar binaya bakıyor. Üstte ve zeminde şantiye
 * şeridi; altta koyu bir bantta soru ve adres.
 */

export interface InsaatCardData {
  name: string;
  sign: string;
  parcel: string;
  floors: number;
  paint: string;
  due: number[];
  days: number;
  watchers: number;
}

const INK = '#221f1b';
const PAPER = '#fbf6ea';
const NAVY = '#3b6894';
const RED = '#c43c2c';
const MUTED = '#6e664d';
const DISPLAY = "'Fraunces', Georgia, serif";
const BODY = "'Work Sans', system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";

/** Kartta zeminin çizgisi. */
const GROUND = 1080;

function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Sarı-siyah şantiye şeridi. */
function hazard(ctx: CanvasRenderingContext2D, y: number, h: number) {
  ctx.save();
  ctx.fillStyle = '#ecb83a';
  ctx.fillRect(0, y, CARD_W, h);
  ctx.beginPath();
  ctx.rect(0, y, CARD_W, h);
  ctx.clip();
  ctx.fillStyle = INK;
  for (let x = -h; x < CARD_W + h; x += h * 2) {
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + h, y);
    ctx.lineTo(x + h * 2, y);
    ctx.lineTo(x + h, y + h);
    ctx.fill();
  }
  ctx.restore();
}

/** Teslim edilmiş apartman: boyalı cephe, kat bantları, pencereler, balkonlar, kiremit çatı. */
function building(ctx: CanvasRenderingContext2D, d: InsaatCardData) {
  const x = 96;
  const w = 380;
  const side = 56;
  const fh = Math.min(92, 620 / d.floors);
  const top = GROUND - fh * d.floors;
  ctx.lineJoin = 'round';

  // gölge
  ctx.fillStyle = 'rgba(40,30,60,.28)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2 + 50, GROUND + 8, w * 0.62, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // yan cephe
  ctx.fillStyle = shade(d.paint, -0.22);
  ctx.beginPath();
  ctx.moveTo(x + w, GROUND);
  ctx.lineTo(x + w + side, GROUND - 30);
  ctx.lineTo(x + w + side, top - 30);
  ctx.lineTo(x + w, top);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.stroke();

  // ön cephe
  ctx.fillStyle = d.paint;
  ctx.fillRect(x, top, w, GROUND - top);
  // akşam ışığı: sağa doğru hafif koyulaşır
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, 'rgba(255,220,170,.18)');
  g.addColorStop(1, 'rgba(60,40,70,.16)');
  ctx.fillStyle = g;
  ctx.fillRect(x, top, w, GROUND - top);

  for (let k = 0; k < d.floors; k++) {
    const y1 = GROUND - fh * (k + 1);
    // kat bandı
    if (k > 0) {
      ctx.fillStyle = '#f1e9da';
      ctx.fillRect(x - 6, GROUND - fh * k - 4, w + 12, 7);
    }
    // pencereler: zemin katta ortadaki yerine kapı
    const cols = [0.16, 0.5, 0.84];
    cols.forEach((c, i) => {
      const ww = w * 0.2;
      const wx = x + w * c - ww / 2;
      if (k === 0 && i === 1) {
        ctx.fillStyle = '#6e4a2e';
        ctx.fillRect(wx + 6, GROUND - fh * 0.82, ww - 12, fh * 0.82);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.4;
        ctx.strokeRect(wx + 6, GROUND - fh * 0.82, ww - 12, fh * 0.82);
        return;
      }
      const wy = y1 + fh * 0.2;
      const wh = fh * 0.52;
      ctx.fillStyle = '#f3ead6';
      ctx.fillRect(wx, wy, ww, wh);
      const glass = ctx.createLinearGradient(0, wy, 0, wy + wh);
      // pencerede yanan ışık: bazıları
      const lit = (k * 3 + i) % 4 === 1;
      glass.addColorStop(0, lit ? '#ffe7a6' : '#b9d0d8');
      glass.addColorStop(1, lit ? '#f2b85e' : '#7f9fae');
      ctx.fillStyle = glass;
      ctx.fillRect(wx + 5, wy + 5, ww - 10, wh - 10);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.strokeRect(wx, wy, ww, wh);
      ctx.fillStyle = '#f3ead6';
      ctx.fillRect(wx + ww / 2 - 2, wy, 4, wh);
      // denizlik
      ctx.fillStyle = '#e8e2d2';
      ctx.fillRect(wx - 5, wy + wh, ww + 10, 5);
    });
    // balkon korkuluğu: üst katlarda ortada
    if (k > 0) {
      const bx = x + w * 0.3;
      const bw = w * 0.4;
      const by = GROUND - fh * k - 4;
      ctx.fillStyle = shade(d.paint, -0.35);
      ctx.fillRect(bx, by - 5, bw, 6);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx, by - fh * 0.3);
      ctx.lineTo(bx + bw, by - fh * 0.3);
      for (let i = 0; i <= 12; i++) {
        ctx.moveTo(bx + (bw * i) / 12, by - fh * 0.3);
        ctx.lineTo(bx + (bw * i) / 12, by - 4);
      }
      ctx.stroke();
    }
  }

  // subasman
  ctx.fillStyle = '#8f8a80';
  ctx.fillRect(x - 3, GROUND - 18, w + 6, 18);
  // siluet
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.strokeRect(x, top, w, GROUND - top);

  // çatı: kiremit, yan yüzü gölgede
  const peak = top - 120;
  ctx.fillStyle = shade('#b5603f', -0.3);
  ctx.beginPath();
  ctx.moveTo(x + w + 20, top);
  ctx.lineTo(x + w + 20 + side, top - 30);
  ctx.lineTo(x + w / 2 + side, peak - 30);
  ctx.lineTo(x + w / 2, peak);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = '#b5603f';
  ctx.beginPath();
  ctx.moveTo(x - 24, top);
  ctx.lineTo(x + w / 2, peak);
  ctx.lineTo(x + w + 24, top);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(80,30,15,.35)';
  ctx.lineWidth = 2;
  for (let y = top - 14; y > peak; y -= 16) {
    ctx.beginPath();
    ctx.moveTo(x - 30, y);
    ctx.lineTo(x + w + 30, y);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x - 24, top);
  ctx.lineTo(x + w / 2, peak);
  ctx.lineTo(x + w + 24, top);
  ctx.closePath();
  ctx.stroke();
  // saçak
  ctx.fillStyle = '#f1e9da';
  ctx.fillRect(x - 28, top - 3, w + 56, 9);
  ctx.strokeRect(x - 28, top - 3, w + 56, 9);
}

/** #rrggbb rengini açar (k > 0) ya da koyulaştırır (k < 0). */
const shade = toneHex;

/** Sırtı dönük amca: kasket, omuz, ense. */
function amca(ctx: CanvasRenderingContext2D, cx: number, base: number, s: number, coat: string, cap: string) {
  ctx.save();
  ctx.translate(cx, base);
  ctx.scale(s, s);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.moveTo(-46, 0);
  ctx.quadraticCurveTo(-46, -62, 0, -66);
  ctx.quadraticCurveTo(46, -62, 46, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#d9a982';
  ctx.beginPath();
  ctx.arc(0, -86, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = cap;
  ctx.beginPath();
  ctx.ellipse(0, -100, 27, 14, 0, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function paintInsaatCard(d: InsaatCardData) {
  return (ctx: CanvasRenderingContext2D, link: string) => {
    ctx.textBaseline = 'alphabetic';

    // gökyüzü: akşamüstü, şantiye kapandı
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, '#5d6fa3');
    sky.addColorStop(0.55, '#e7a87e');
    sky.addColorStop(1, '#f6d6a3');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, CARD_W, GROUND);
    // güneş, binanın arkasında batıyor
    ctx.fillStyle = 'rgba(255,236,190,.85)';
    ctx.beginPath();
    ctx.arc(820, 900, 70, 0, Math.PI * 2);
    ctx.fill();
    // uzak tepeler
    ctx.fillStyle = '#9c8aa6';
    ctx.beginPath();
    ctx.moveTo(0, GROUND - 120);
    ctx.quadraticCurveTo(260, GROUND - 220, 540, GROUND - 130);
    ctx.quadraticCurveTo(820, GROUND - 40, CARD_W, GROUND - 170);
    ctx.lineTo(CARD_W, GROUND);
    ctx.lineTo(0, GROUND);
    ctx.fill();

    // zemin
    ctx.fillStyle = '#8a6a48';
    ctx.fillRect(0, GROUND, CARD_W, CARD_H - GROUND);
    ctx.fillStyle = 'rgba(0,0,0,.1)';
    for (let i = 0; i < 70; i++) ctx.fillRect((i * 151) % CARD_W, GROUND + 14 + ((i * 37) % 90), 4 + (i % 3) * 3, 3);

    hazard(ctx, 0, 30);

    // başlık
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.font = `700 24px ${MONO}`;
    ctx.fillText('MESAİ DIŞI · İNŞAAT İZLEME', 72, 96);
    ctx.fillStyle = PAPER;
    ctx.font = `800 92px ${DISPLAY}`;
    ctx.fillText('Örnek Vatandaş', 68, 192);

    building(ctx, d);

    // tabela: binanın sağında, iki ayak üstünde
    const sx = 560;
    const sy = 300;
    const sw = 440;
    const sh = 560;
    ctx.fillStyle = '#5d5650';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    for (const px of [sx + 50, sx + sw - 64]) {
      ctx.fillRect(px, sy + sh - 4, 14, GROUND - sy - sh + 4);
      ctx.strokeRect(px, sy + sh - 4, 14, GROUND - sy - sh + 4);
    }
    ctx.save();
    ctx.shadowColor = 'rgba(30,20,40,.35)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 12;
    ctx.fillStyle = PAPER;
    round(ctx, sx, sy, sw, sh, 10);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = NAVY;
    ctx.beginPath();
    ctx.roundRect(sx, sy, sw, 64, [10, 10, 0, 0]);
    ctx.fill();
    ctx.lineWidth = 5;
    round(ctx, sx, sy, sw, sh, 10);
    ctx.stroke();
    ctx.fillStyle = PAPER;
    ctx.textAlign = 'center';
    ctx.font = `800 28px ${MONO}`;
    ctx.fillText('TESLİM EDİLDİ', sx + sw / 2, sy + 43);

    const cx = sx + sw / 2;
    let y = sy + 116;
    ctx.fillStyle = INK;
    let size = 36;
    ctx.font = `800 ${size}px ${MONO}`;
    while (ctx.measureText(d.sign).width > sw - 48 && size > 22) ctx.font = `800 ${(size -= 2)}px ${MONO}`;
    ctx.fillText(d.sign, cx, y);
    y += 40;
    ctx.fillStyle = MUTED;
    ctx.font = `500 20px ${MONO}`;
    ctx.fillText(d.parcel.toLocaleUpperCase('tr-TR'), cx, y);

    // teslim yılları: sonuncusu dışında hepsinin üstü çizili
    y += 62;
    ctx.fillStyle = MUTED;
    ctx.font = `700 18px ${MONO}`;
    ctx.fillText('TESLİM TARİHİ', cx, y);
    y += 46;
    ctx.font = `700 26px ${MONO}`;
    const years = d.due.map(String);
    const gap = 12;
    const widths = years.map((s) => ctx.measureText(s).width);
    let yx = cx - (widths.reduce((a, b) => a + b, 0) + gap * (years.length - 1)) / 2;
    ctx.textAlign = 'left';
    years.forEach((s, i) => {
      const last = i === years.length - 1;
      ctx.fillStyle = last ? RED : '#9a958a';
      ctx.fillText(s, yx, y);
      if (last) {
        ctx.strokeStyle = RED;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(yx + widths[i] / 2, y - 10, widths[i] / 2 + 9, 21, -0.08, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#7a756b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(yx - 3, y - 10);
        ctx.lineTo(yx + widths[i] + 3, y - 10);
        ctx.stroke();
      }
      yx += widths[i] + gap;
    });
    ctx.textAlign = 'center';

    // izleyicinin karnesi: üç kutu
    y += 56;
    ctx.fillStyle = '#e3dcc6';
    ctx.fillRect(sx + 28, y, sw - 56, 2);
    const stats: [string, string][] = [
      [d.days.toLocaleString('tr-TR'), 'GÜN İZLEDİ'],
      [String(d.watchers), 'AMCA'],
      ['0', 'MÜDAHALE'],
    ];
    const col = (sw - 56) / 3;
    stats.forEach(([v, l], i) => {
      const mx = sx + 28 + col * i + col / 2;
      ctx.fillStyle = INK;
      let fs = 58;
      ctx.font = `800 ${fs}px ${DISPLAY}`;
      while (ctx.measureText(v).width > col - 12 && fs > 30) ctx.font = `800 ${(fs -= 4)}px ${DISPLAY}`;
      ctx.fillText(v, mx, y + 88);
      ctx.fillStyle = MUTED;
      ctx.font = `700 15px ${MONO}`;
      ctx.fillText(l, mx, y + 118);
    });
    ctx.fillStyle = MUTED;
    ctx.font = `500 16px ${MONO}`;
    ctx.fillText('ŞANTİYE ŞEFİ: İNŞ. MÜH. A. YILMAZ', cx, y + 152);

    // mühür: tabelanın üstüne eğik basılmış
    ctx.save();
    ctx.translate(sx + sw - 150, sy + sh + 4);
    ctx.rotate(-0.2);
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = RED;
    ctx.fillStyle = RED;
    ctx.lineWidth = 5;
    round(ctx, -118, -40, 236, 80, 10);
    ctx.stroke();
    ctx.lineWidth = 2;
    round(ctx, -108, -31, 216, 62, 6);
    ctx.stroke();
    ctx.font = `800 34px ${MONO}`;
    ctx.fillText('İSKÂN ALINDI', 0, 12);
    ctx.globalCompositeOperation = 'destination-out';
    let n = d.days * 31 + 7;
    for (let i = 0; i < 60; i++) {
      n = (n * 1103515245 + 12345) >>> 0;
      ctx.beginPath();
      ctx.arc(((n % 1000) / 1000 - 0.5) * 236, (((n >>> 10) % 1000) / 1000 - 0.5) * 80, 1 + ((n >>> 20) % 3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.textAlign = 'left';

    // zeminde şantiye şeridi ve izleyen amcalar (sırtı dönük)
    ctx.strokeStyle = RED;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, GROUND + 40);
    ctx.lineTo(CARD_W, GROUND + 40);
    ctx.stroke();
    ctx.strokeStyle = PAPER;
    ctx.setLineDash([22, 22]);
    ctx.stroke();
    ctx.setLineDash([]);
    const coats = ['#5b6b7a', '#7a5a3f', '#4d5b45', '#6a4e5e', '#3f4e66', '#806a4c', '#55606b'];
    const caps = ['#2f2b27', '#45403a', '#3a3530'];
    const count = Math.max(3, Math.min(7, d.watchers));
    for (let i = 0; i < count; i++) {
      const ax = 110 + (i * (CARD_W - 220)) / (count - 1);
      amca(ctx, ax, 1180 + (i % 2) * 8, 1.05, coats[i % coats.length], caps[i % caps.length]);
    }

    // alt bant: soru ve adres
    ctx.fillStyle = INK;
    ctx.fillRect(0, 1186, CARD_W, CARD_H - 1186);
    hazard(ctx, 1186, 14);
    ctx.fillStyle = PAPER;
    ctx.font = `700 46px ${DISPLAY}`;
    ctx.fillText('Sen kaç gün dayanırsın?', 72, 1268);
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.font = `500 24px ${BODY}`;
    ctx.fillText(link, 72, 1312);
  };
}
