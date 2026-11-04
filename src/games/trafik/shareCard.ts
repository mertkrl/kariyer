import { CARD_W } from '../../arcade/share';
import { DISPLAY, HAND, MONO, clampLines, fitBlock, footer, paper, round } from '../../arcade/cardKit';

/*
 * Kavşak Amiri'nin paylaşım kartı: gece vardiyasının sonunda trafik kontrol merkezi. Arkada kamera
 * ekranlarından oluşan duvar, solda vardiyanın ortalamasına göre yanan bir trafik ışığı, sağda
 * vardiya raporu: unvan, amirin notu ve her kavşağın puan çubuğu. Altta yaya geçidi ve kornasına basan bir araba kuyruğu.
 */

export interface TrafikCardData {
  title: string;
  note: string;
  avg: number;
  junctions: { place: string; score: number }[];
  date: string;
}

const INK = '#1b2129';
const PAPER = '#f8f5ec';
const MUTED = '#5f6a75';
const GREEN = '#3a7d4c';
const AMBER = '#d99a24';
const RED = '#c0412f';

const toneOf = (s: number) => (s >= 72 ? GREEN : s >= 60 ? AMBER : RED);

function screens(ctx: CanvasRenderingContext2D) {
  // kamera duvarı: küçük ekranlarda yollar ve kuyruklar
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 6; c++) {
      const x = 24 + c * 176;
      const y = 214 + r * 128;
      ctx.fillStyle = '#0f1a24';
      ctx.fillRect(x, y, 164, 116);
      ctx.fillStyle = '#20384a';
      ctx.fillRect(x + 8, y + 50, 148, 18);
      ctx.fillRect(x + 72, y + 8, 18, 100);
      ctx.fillStyle = ['#e2c657', '#e46c4a', '#8fd0a0'][(r * 6 + c) % 3];
      for (let k = 0; k < 2 + ((r + c) % 4); k++) ctx.fillRect(x + 12 + k * 14, y + 55, 9, 7);
      ctx.fillStyle = 'rgba(160,220,255,.5)';
      ctx.font = `600 11px ${MONO}`;
      ctx.fillText(`KAM-${String(r * 6 + c + 1).padStart(2, '0')}`, x + 8, y + 18);
    }
}

function light(ctx: CanvasRenderingContext2D, x: number, y: number, on: number) {
  ctx.fillStyle = '#4a4f55';
  ctx.fillRect(x + 62, y + 470, 26, 1050 - y - 470);
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 4;
  ctx.fillStyle = '#262a2f';
  round(ctx, x, y, 150, 470, 26);
  ctx.fill();
  ctx.stroke();
  [RED, AMBER, GREEN].forEach((c, i) => {
    const cy = y + 85 + i * 150;
    // siperlik
    ctx.fillStyle = '#16191c';
    ctx.beginPath();
    ctx.ellipse(x + 75, cy - 44, 62, 18, 0, Math.PI, 0);
    ctx.fill();
    ctx.save();
    if (i === on) {
      ctx.shadowColor = c;
      ctx.shadowBlur = 60;
    }
    ctx.fillStyle = i === on ? c : '#3a3e43';
    ctx.globalAlpha = i === on ? 1 : 0.9;
    ctx.beginPath();
    ctx.arc(x + 75, cy, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x + 75, cy, 50, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function car(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.fillStyle = color;
  round(ctx, x, y - 40, 130, 40, 10);
  ctx.fill();
  ctx.stroke();
  round(ctx, x + 26, y - 66, 70, 30, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#bfe0ee';
  ctx.fillRect(x + 34, y - 60, 24, 18);
  ctx.fillRect(x + 64, y - 60, 24, 18);
  ctx.fillStyle = '#222';
  for (const wx of [x + 28, x + 102]) {
    ctx.beginPath();
    ctx.arc(wx, y, 14, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function paintTrafikCard(d: TrafikCardData) {
  return (ctx: CanvasRenderingContext2D, link: string) => {
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#16212c';
    ctx.fillRect(0, 0, CARD_W, 1350);
    screens(ctx);
    ctx.fillStyle = 'rgba(22,33,44,.55)';
    ctx.fillRect(0, 200, CARD_W, 540);

    ctx.fillStyle = 'rgba(200,230,255,.8)';
    ctx.font = `700 24px ${MONO}`;
    ctx.fillText('MESAİ DIŞI · KAVŞAK AMİRİ', 72, 92);
    ctx.fillStyle = PAPER;
    ctx.font = `800 76px ${DISPLAY}`;
    ctx.fillText('Vardiya devredildi', 68, 172);

    light(ctx, 60, 300, d.avg >= 72 ? 2 : d.avg >= 60 ? 1 : 0);

    // rapor
    const pw = 720;
    const ph = 740;
    paper(ctx, 290, 250, pw, ph, 0.015, PAPER, () => {
      const x = 46;
      const w = pw - 92;
      ctx.fillStyle = INK;
      ctx.fillRect(0, 0, pw, 70);
      ctx.fillStyle = PAPER;
      ctx.font = `800 22px ${MONO}`;
      ctx.fillText('TRAFİK KONTROL MERKEZİ', x, 44);
      ctx.textAlign = 'right';
      ctx.font = `600 18px ${MONO}`;
      ctx.fillText(d.date, x + w, 44);
      ctx.textAlign = 'left';
      ctx.fillStyle = MUTED;
      ctx.font = `700 18px ${MONO}`;
      ctx.fillText('VARDİYA SONU RAPORU · OPERATÖR UNVANI', x, 118);
      const t = fitBlock(ctx, d.title, w, '800', 66, DISPLAY, 2, 40);
      ctx.fillStyle = INK;
      let y = 118;
      for (const l of t.lines) {
        y += t.size * 1.02;
        ctx.fillText(l, x, y);
      }
      y += 46;
      ctx.fillStyle = '#3d4650';
      ctx.font = `600 32px ${HAND}`;
      for (const l of clampLines(ctx, `Amirin notu: ${d.note}`, w, 2)) {
        ctx.fillText(l, x, y);
        y += 36;
      }
      // kavşaklar
      y += 14;
      const rows = d.junctions.slice(0, 5);
      const barX = x + 300;
      const barW = w - 300 - 70;
      for (const j of rows) {
        ctx.fillStyle = INK;
        ctx.font = `600 19px ${MONO}`;
        let name = j.place.toLocaleUpperCase('tr-TR');
        if (ctx.measureText(name).width > 286) {
          while (ctx.measureText(`${name}…`).width > 286) name = name.slice(0, -1);
          name = `${name.trimEnd()}…`;
        }
        ctx.fillText(name, x, y + 18);
        ctx.fillStyle = '#e4ded0';
        ctx.fillRect(barX, y, barW, 22);
        ctx.fillStyle = toneOf(j.score);
        ctx.fillRect(barX, y, (barW * Math.max(0, Math.min(100, j.score))) / 100, 22);
        ctx.fillStyle = INK;
        ctx.font = `800 22px ${MONO}`;
        ctx.textAlign = 'right';
        ctx.fillText(String(j.score), x + w, y + 20);
        ctx.textAlign = 'left';
        y += 44;
      }
      ctx.fillStyle = INK;
      ctx.fillRect(x, ph - 92, w, 3);
      ctx.font = `700 22px ${MONO}`;
      ctx.fillText('VARDİYA ORTALAMASI', x, ph - 40);
      ctx.fillStyle = toneOf(d.avg);
      ctx.textAlign = 'right';
      ctx.font = `800 54px ${DISPLAY}`;
      ctx.fillText(String(d.avg), x + w, ph - 32);
      ctx.textAlign = 'left';
    });

    // yol: yaya geçidi ve kuyruk
    ctx.fillStyle = '#3a3c3f';
    ctx.fillRect(0, 1050, CARD_W, 120);
    ctx.fillStyle = '#e9e6dc';
    for (let x = 30; x < 300; x += 56) ctx.fillRect(x, 1062, 30, 96);
    ['#c0412f', '#3b6894', '#e9b730', '#5b8a5a'].forEach((c, i) => car(ctx, 340 + i * 175, 1146, c));
    ctx.fillStyle = PAPER;
    ctx.font = `700 34px ${HAND}`;
    ctx.fillText('dıııt!', 930, 1074);

    footer(ctx, 1170, '#0e151c', 'Sen olsan Büyükdere’de akşam zirvesine kaç saniye yeşil verirdin?', link);
  };
}
