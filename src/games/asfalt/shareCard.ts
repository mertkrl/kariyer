import { CARD_W } from '../../arcade/share';
import { BODY, DISPLAY, HAND, MONO, clampLines, fitBlock, fitFont, footer, leader, paper, stamp, tape } from '../../arcade/cardKit';

/*
 * Yama Ekibi'nin paylaşım kartı: mesai sonunda yeni dökülmüş asfaltın üstüne bırakılmış belediye
 * yama teslim fişi. Fişte ekibin unvanı, ustabaşının notu ve her işin puanı; altında kabul mührü
 * ("bir sonraki kazıya kadar"). Fişin altında yamanın kesiti: asfalt, yapıştırıcı, mıcır, toprak.
 */

export interface AsfaltCardData {
  title: string;
  note: string;
  avg: number;
  jobs: { place: string; title: string; score: number }[];
  date: string;
}

const INK = '#221f1b';
const PAPER = '#fbf6ea';
const MUTED = '#6e664d';
const RED = '#a8402f';
const YELLOW = '#e9b730';

function crossSection(ctx: CanvasRenderingContext2D, top: number) {
  const x = 72;
  const w = CARD_W - 144;
  const layers: [string, string, number][] = [
    ['ASFALT 5 cm', '#2b2a29', 34],
    ['YAPIŞTIRICI', '#5a3d22', 10],
    ['MICIR 15 cm', '#9c9483', 44],
    ['TOPRAK', '#7d5c3c', 52],
  ];
  ctx.fillStyle = 'rgba(251,246,234,.75)';
  ctx.font = `700 18px ${MONO}`;
  ctx.fillText('YAMA KESİTİ · ÖLÇEK YOK', x, top - 14);
  let y = top;
  for (const [, color, h] of layers) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    // doku: mıcırda taşlar, toprakta lekeler
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    for (let i = 0; i < 90; i++) ctx.fillRect(x + ((i * 97 + h * 13) % w), y + ((i * 29) % Math.max(4, h - 4)), 3 + (i % 3) * 2, 3);
    y += h;
  }
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 3;
  ctx.strokeRect(x, top, w, y - top);
  // katman etiketleri: sağda, okla
  y = top;
  ctx.font = `700 17px ${MONO}`;
  for (const [label, , h] of layers) {
    const ly = y + h / 2 + 6;
    const tw = ctx.measureText(label).width + 20;
    ctx.fillStyle = PAPER;
    ctx.fillRect(x + w - tw - 14, ly - 18, tw, 26);
    ctx.fillStyle = INK;
    ctx.fillText(label, x + w - tw - 4, ly + 1);
    y += h;
  }
}

export function paintAsfaltCard(d: AsfaltCardData) {
  return (ctx: CanvasRenderingContext2D, link: string) => {
    ctx.textBaseline = 'alphabetic';
    // zemin: taze asfalt, ortada sarı şerit
    ctx.fillStyle = '#34322f';
    ctx.fillRect(0, 0, CARD_W, 1350);
    for (let i = 0; i < 1600; i++) {
      ctx.fillStyle = i % 3 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.22)';
      ctx.fillRect((i * 389) % CARD_W, (i * 211) % 1180, 2 + (i % 3), 2);
    }
    ctx.fillStyle = YELLOW;
    for (let y = -20; y < 1180; y += 120) ctx.fillRect(CARD_W - 84, y, 18, 70);

    ctx.fillStyle = 'rgba(251,246,234,.8)';
    ctx.font = `700 24px ${MONO}`;
    ctx.fillText('MESAİ DIŞI · YAMA EKİBİ', 72, 92);
    ctx.fillStyle = PAPER;
    ctx.font = `800 80px ${DISPLAY}`;
    ctx.fillText('Mesai bitti', 68, 176);

    // fiş
    const pw = 860;
    const ph = 720;
    paper(ctx, 92, 222, pw, ph, -0.018, PAPER, () => {
      const x = 52;
      const w = pw - 104;
      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.font = `700 20px ${MONO}`;
      ctx.fillText('FEN İŞLERİ MÜDÜRLÜĞÜ · YOL BAKIM ŞEFLİĞİ', pw / 2, 56);
      ctx.font = `800 34px ${DISPLAY}`;
      ctx.fillText('Yama Teslim ve Hakediş Fişi', pw / 2, 100);
      ctx.textAlign = 'left';
      ctx.fillStyle = MUTED;
      ctx.font = `500 18px ${MONO}`;
      ctx.fillText(`TARİH ${d.date}`, x, 136);
      ctx.textAlign = 'right';
      ctx.fillText(`FİŞ NO ${String(1000 + d.avg * 37).padStart(5, '0')}`, x + w, 136);
      ctx.textAlign = 'left';
      ctx.fillStyle = INK;
      ctx.fillRect(x, 150, w, 3);

      ctx.fillStyle = MUTED;
      ctx.font = `700 18px ${MONO}`;
      ctx.fillText('EKİBİN UNVANI', x, 196);
      const t = fitBlock(ctx, d.title, w, '800', 76, DISPLAY, 1, 44);
      ctx.fillStyle = INK;
      ctx.fillText(t.lines[0], x, 196 + t.size * 0.95);
      ctx.fillStyle = '#4a453b';
      ctx.font = `600 32px ${HAND}`;
      let y = 196 + t.size + 44;
      for (const l of clampLines(ctx, `“${d.note}” — Ustabaşı Hayri`, w, 2)) {
        ctx.fillText(l, x, y);
        y += 36;
      }

      // işler: son beşi, puanıyla
      y += 18;
      ctx.fillStyle = '#e3dcc6';
      ctx.fillRect(x, y, w, 2);
      y += 40;
      const jobs = d.jobs.slice(-5);
      // sağda mühre yer kalsın
      const lw = w - 300;
      for (const j of jobs) {
        ctx.font = `500 22px ${BODY}`;
        ctx.fillStyle = INK;
        leader(ctx, j.place, `${j.score}`, x, y, lw, '#b8ae95');
        y += 40;
      }
      if (!jobs.length) {
        ctx.font = `500 22px ${BODY}`;
        ctx.fillStyle = MUTED;
        ctx.fillText('Bugün çukur bulunamadı.', x, y);
      }
      ctx.fillStyle = INK;
      ctx.fillRect(x, ph - 96, w, 3);
      ctx.font = `700 22px ${MONO}`;
      ctx.fillText('ORTALAMA', x, ph - 46);
      ctx.fillStyle = RED;
      ctx.textAlign = 'right';
      fitFont(ctx, `${d.avg}/100`, 300, '800', 52, DISPLAY);
      ctx.fillText(`${d.avg}/100`, x + w, ph - 38);
      ctx.textAlign = 'left';
    });
    tape(ctx, 170, 236, -0.3);
    tape(ctx, 880, 226, 0.25);
    stamp(ctx, 830, 744, -0.14, ['KABUL', 'BİR SONRAKİ', 'KAZIYA KADAR'], RED, d.avg + 3, 38);

    crossSection(ctx, 1012);
    footer(ctx, 1190, '#1c1b19', 'Senin yaman kaç gün dayanır?', link);
    ctx.fillStyle = YELLOW;
    ctx.fillRect(0, 1190, CARD_W, 8);
  };
}
