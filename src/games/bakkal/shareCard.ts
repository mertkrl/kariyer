import { CARD_W } from '../../arcade/share';
import { DISPLAY, HAND, MONO, clampLines, fitBlock, fitFont, footer, leader, paper, stamp, tape } from '../../arcade/cardKit';

/*
 * Köy Bakkalı'nın paylaşım kartı: ahşap tezgâhın üstünde açık duran veresiye defteri. Sayfanın
 * başında Şükrü Amca'nın verdiği unvan, altında kurşun kalemle defterin hükümleri ve kahvede
 * anlatılanlar. Sağ altta yazar kasadan kopmuş kıvrık bir kasa fişi: gün, kasa, açık veresiye,
 * itibar, esnaf ahlakı. Dükkân battıysa fişin üstüne "KEPENK İNDİ" mührü basılır.
 */

export interface BakkalCardData {
  title: string;
  note: string;
  days: number;
  money: string;
  moneyNegative: boolean;
  unpaid: string;
  rep: number;
  ethics: string;
  lines: string[];
  bankrupt: boolean;
  date: string;
}

const INK = '#2a2420';
const PENCIL = '#3f4a5c';
const PAPER = '#f6efdc';
const RULE = '#b9cbe0';
const MARGIN = '#d26a5a';
const RED = '#a8402f';
const GREEN = '#2f7a4e';

function counter(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, 0, 0, 1190);
  g.addColorStop(0, '#8a5a34');
  g.addColorStop(1, '#6b4325');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CARD_W, 1190);
  // tahta damarları
  ctx.strokeStyle = 'rgba(40,22,10,.22)';
  ctx.lineWidth = 2;
  for (let y = 30; y < 1190; y += 46) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= CARD_W; x += 60) ctx.lineTo(x, y + Math.sin(x / 90 + y) * 6);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(40,22,10,.35)';
  for (let y = 0; y < 1190; y += 230) ctx.fillRect(0, y, CARD_W, 3);
}

export function paintBakkalCard(d: BakkalCardData) {
  return (ctx: CanvasRenderingContext2D, link: string) => {
    ctx.textBaseline = 'alphabetic';
    counter(ctx);
    ctx.fillStyle = 'rgba(255,240,215,.85)';
    ctx.font = `700 24px ${MONO}`;
    ctx.fillText('MESAİ DIŞI · KÖY BAKKALI', 72, 92);
    ctx.fillStyle = PAPER;
    ctx.font = `800 76px ${DISPLAY}`;
    ctx.fillText(d.bankrupt ? 'Kepenk indi' : 'Defter kapandı', 68, 172);

    // veresiye defteri sayfası
    const pw = 610;
    const ph = 820;
    paper(ctx, 60, 220, pw, ph, -0.025, PAPER, () => {
      ctx.strokeStyle = RULE;
      ctx.lineWidth = 2;
      for (let y = 150; y < ph - 20; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(pw, y);
        ctx.stroke();
      }
      ctx.strokeStyle = MARGIN;
      ctx.beginPath();
      ctx.moveTo(96, 0);
      ctx.lineTo(96, ph);
      ctx.stroke();
      // spiral delikleri
      ctx.fillStyle = '#6b4325';
      for (let y = 40; y < ph; y += 70) {
        ctx.beginPath();
        ctx.arc(36, y, 11, 0, Math.PI * 2);
        ctx.fill();
      }
      const x = 120;
      const w = pw - x - 40;
      ctx.fillStyle = MARGIN;
      ctx.font = `700 20px ${MONO}`;
      ctx.fillText(`VERESİYE DEFTERİ · ${d.days}. GÜN`, x, 52);
      ctx.textAlign = 'right';
      ctx.fillStyle = PENCIL;
      ctx.font = `600 30px ${HAND}`;
      ctx.fillText(d.date, x + w, 52);
      ctx.textAlign = 'left';
      const t = fitBlock(ctx, d.title, w, '800', 60, DISPLAY, 2, 34);
      ctx.fillStyle = INK;
      let ty = 132 - (t.lines.length - 1) * t.size;
      ty = Math.max(ty, 82 + t.size * 0.8);
      for (const l of t.lines) {
        ctx.fillText(l, x, ty);
        ty += t.size * 1.04;
      }

      // satırlar: kurşun kalem el yazısı, çizgilerin üstünde
      ctx.fillStyle = PENCIL;
      ctx.font = `600 34px ${HAND}`;
      const entries = [d.note, ...d.lines];
      // ilk el yazısı satırı unvanın altındaki ilk çizgiye oturur
      let y = 192;
      while (y - 40 < ty - t.size * 0.9) y += 50;
      outer: for (const e of entries) {
        for (const l of clampLines(ctx, `– ${e}`, w, 3)) {
          if (y > ph - 90) break outer;
          ctx.fillText(l, x, y);
          y += 50;
        }
      }
      ctx.save();
      ctx.translate(x + w - 150, ph - 40);
      ctx.rotate(-0.06);
      ctx.fillStyle = INK;
      ctx.font = `700 38px ${HAND}`;
      ctx.fillText('— Şükrü A.', 0, 0);
      ctx.restore();
    });
    tape(ctx, 365, 222, 0.04, 180);

    // kasa fişi: kıvrık, sağ altta
    const rw = 370;
    const rh = 500;
    paper(ctx, 680, 470, rw, rh, 0.05, '#fffdf6', () => {
      const x = 32;
      const w = rw - 64;
      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.font = `800 24px ${MONO}`;
      ctx.fillText('ŞÜKRÜ BAKKALİYESİ', rw / 2, 50);
      ctx.font = `500 16px ${MONO}`;
      ctx.fillText('MERKEZ MAH. ÇEŞME YANI', rw / 2, 76);
      ctx.fillText('* * * KASA FİŞİ * * *', rw / 2, 110);
      ctx.textAlign = 'left';
      const rows: [string, string, string?][] = [
        ['GÜN', String(d.days)],
        ['KASA', d.money, d.moneyNegative ? RED : GREEN],
        ['AÇIK VERESİYE', d.unpaid],
        ['İTİBAR', `${d.rep}/100`],
      ];
      let y = 160;
      for (const [l, v, c] of rows) {
        ctx.fillStyle = c ?? INK;
        ctx.font = `700 22px ${MONO}`;
        leader(ctx, l, v, x, y, w, '#aaa29a');
        y += 44;
      }
      ctx.fillStyle = INK;
      ctx.font = `500 16px ${MONO}`;
      ctx.fillText('ESNAF AHLAKI', x, y + 4);
      fitFont(ctx, d.ethics, w, '800', 30, DISPLAY);
      ctx.fillText(d.ethics, x, y + 44);
      ctx.font = `500 16px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.fillText('YİNE BEKLERİZ', rw / 2, rh - 54);
      ctx.fillText('MALİ DEĞERİ YOKTUR', rw / 2, rh - 30);
      ctx.textAlign = 'left';
      // yırtık alt kenar
      ctx.fillStyle = '#6b4325';
      ctx.beginPath();
      ctx.moveTo(0, rh);
      for (let i = 0; i <= 20; i++) ctx.lineTo((rw / 20) * i, rh - (i % 2 ? 10 : 0));
      ctx.lineTo(rw, rh + 2);
      ctx.lineTo(0, rh + 2);
      ctx.fill();
    });
    if (d.bankrupt) stamp(ctx, 860, 1080, -0.22, ['KEPENK İNDİ', 'KASA EKSİDE'], RED, d.days, 32);

    footer(ctx, 1190, '#2a1a0f', 'Sen kaç gün dayanırdın?', link);
  };
}
