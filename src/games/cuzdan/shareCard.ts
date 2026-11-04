import { CARD_W } from '../../arcade/share';
import { DISPLAY, HAND, MONO, clampLines, fitBlock, fitFont, footer, leader, paper, round, stamp } from '../../arcade/cardKit';

/*
 * Cüzdan Zamanı'nın paylaşım kartı: mutfak masasındaki muşambanın üstüne dökülmüş eski bir cüzdan.
 * Üstte sararmış, uydurma bir "hatıra banknotu" (gerçek bir paranın taklidi değildir; üstünde
 * tedavülde olmadığı yazar), ortada 2002 tarihli bakkal fişi: başlık, unvan, satırlar ve toplam.
 * Günlük sepette fişin altına doğru/yanlış kutucukları basılır. Köşedeki mühür fişi "enflasyona
 * uyarlanmış" diye onaylar.
 */

export interface CuzdanCardData {
  kicker: string;
  title: string;
  note?: string;
  /** Günlük sepet: her tur doğru mu? (emoji yerine kutucuk çizilir) */
  marks?: boolean[];
  rows: [string, string][];
  question: string;
  /** Mührün iki satırı. */
  seal: [string, string];
  seed: number;
}

const INK = '#26221c';
const PAPER = '#fffcf3';
const MUTED = '#6e664d';
const NOTE = '#d8c79a';
const RED = '#a8402f';
const GREEN = '#2f7a4e';

function tablecloth(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#e9e1cc';
  ctx.fillRect(0, 0, CARD_W, 1190);
  ctx.fillStyle = 'rgba(176,72,56,.28)';
  for (let x = 0; x < CARD_W; x += 120) ctx.fillRect(x, 0, 60, 1190);
  for (let y = 0; y < 1190; y += 120) ctx.fillRect(0, y, CARD_W, 60);
}

function banknote(ctx: CanvasRenderingContext2D, seed: number) {
  ctx.save();
  ctx.translate(560, 330);
  ctx.rotate(0.06);
  const w = 760;
  const h = 300;
  ctx.shadowColor = 'rgba(0,0,0,.25)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = NOTE;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#7a6a45';
  ctx.lineWidth = 3;
  ctx.strokeRect(-w / 2 + 16, -h / 2 + 16, w - 32, h - 32);
  // giyoş: iç içe dalgalar
  ctx.strokeStyle = 'rgba(122,106,69,.35)';
  ctx.lineWidth = 1.5;
  for (let k = 0; k < 12; k++) {
    ctx.beginPath();
    for (let x = -w / 2 + 30; x <= w / 2 - 30; x += 8) ctx.lineTo(x, -h / 2 + 60 + k * 16 + Math.sin(x / 26 + k) * 6);
    ctx.stroke();
  }
  // filigran yerine güleç bir simit
  ctx.strokeStyle = '#7a5a33';
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.arc(w / 2 - 140, 0, 62, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#f1e7c9';
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    ctx.fillRect(w / 2 - 140 + Math.cos(a) * 62 - 2, Math.sin(a) * 62 - 1, 4, 2);
  }
  ctx.fillStyle = '#4d4128';
  ctx.font = `800 26px ${MONO}`;
  ctx.fillText('HATIRA BANKNOTU', -w / 2 + 44, -h / 2 + 60);
  ctx.font = `800 64px ${DISPLAY}`;
  ctx.fillText('BEŞ MİLYON', -w / 2 + 40, 20);
  ctx.font = `700 30px ${DISPLAY}`;
  ctx.fillText('ESKİ TÜRK LİRASI · 2002', -w / 2 + 44, 66);
  ctx.font = `600 16px ${MONO}`;
  ctx.fillText(`TEDAVÜLDE DEĞİLDİR · SERİ A ${String(100000 + ((seed * 7919) % 900000))}`, -w / 2 + 44, h / 2 - 34);
  ctx.restore();
}

export function paintCuzdanCard(d: CuzdanCardData) {
  return (ctx: CanvasRenderingContext2D, link: string) => {
    ctx.textBaseline = 'alphabetic';
    tablecloth(ctx);
    ctx.fillStyle = INK;
    ctx.font = `700 24px ${MONO}`;
    ctx.fillText('MESAİ DIŞI · CÜZDAN ZAMANI', 72, 86);
    banknote(ctx, d.seed);

    // fiş
    const pw = 640;
    const ph = 690;
    paper(ctx, 220, 450, pw, ph, -0.03, PAPER, () => {
      const x = 44;
      const w = pw - 88;
      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.font = `800 26px ${MONO}`;
      ctx.fillText('ÇARŞI BAKKALİYESİ', pw / 2, 52);
      ctx.font = `500 17px ${MONO}`;
      ctx.fillText('04.11.2002 · 08:41 · KASA 1', pw / 2, 80);
      fitFont(ctx, d.kicker.toLocaleUpperCase('tr-TR'), w, '700', 19, MONO, 13);
      ctx.fillText(d.kicker.toLocaleUpperCase('tr-TR'), pw / 2, 116);
      ctx.textAlign = 'left';
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 134);
      ctx.lineTo(x + w, 134);
      ctx.stroke();
      ctx.setLineDash([]);

      const t = fitBlock(ctx, d.title, w, '800', 72, DISPLAY, 2, 40);
      let y = 140;
      for (const l of t.lines) {
        y += t.size * 1.02;
        ctx.fillText(l, x, y);
      }
      y += 16;
      if (d.marks?.length) {
        const s = 54;
        d.marks.forEach((ok, i) => {
          ctx.fillStyle = ok ? GREEN : RED;
          round(ctx, x + i * (s + 14), y, s, s, 8);
          ctx.fill();
          ctx.fillStyle = PAPER;
          ctx.font = `800 32px ${MONO}`;
          ctx.textAlign = 'center';
          ctx.fillText(ok ? '✓' : '✗', x + i * (s + 14) + s / 2, y + 39);
          ctx.textAlign = 'left';
        });
        y += s + 16;
      } else if (d.note) {
        ctx.fillStyle = '#4a453b';
        ctx.font = `600 30px ${HAND}`;
        for (const l of clampLines(ctx, d.note, w, 3)) {
          y += 34;
          ctx.fillText(l, x, y);
        }
        y += 12;
      }
      y += 34;
      for (const [l, v] of d.rows.slice(0, 3)) {
        ctx.fillStyle = INK;
        ctx.font = `700 24px ${MONO}`;
        leader(ctx, l.toLocaleUpperCase('tr-TR'), v, x, y, w, '#aaa29a');
        y += 46;
      }
      // mühür: satırların hemen altına, fişin dip yazılarına değmeden
      stamp(ctx, pw / 2 + 70, Math.min(y + 46, ph - 128), -0.12, d.seal, RED, d.seed, 28);
      ctx.fillStyle = MUTED;
      ctx.font = `500 16px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.fillText('KDV DAHİLDİR · ÜSTÜ KALSIN', pw / 2, ph - 56);
      ctx.fillText('MALİ DEĞERİ YOKTUR, MANEVİ DEĞERİ ÇOK', pw / 2, ph - 32);
      ctx.textAlign = 'left';
    });

    footer(ctx, 1190, INK, d.question, link);
  };
}
