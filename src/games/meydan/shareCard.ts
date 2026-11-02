import { CARD_H, CARD_W } from '../../arcade/share';
import { formatCost, type Report } from './report';

/*
 * Meydan Islahı'nın paylaşım kartı: çizim masasına bantlanmış bir kentsel tasarım paftası. Üstte
 * proje başlığı ve pafta künyesi, ortada meydanın yeni hâli büyük, eski hâli köşesine iliştirilmiş
 * bir fotoğraf; altta mimarın estetik puanı, mühendisin deprem çizelgesi ve keşif bedeli, yapılan
 * işler, antet kutusu ve üstüne basılmış imar mührü. Köşedeki sarı not arkadaşa soruyu sorar.
 */

export interface MeydanCardData {
  place: string;
  region: string;
  before: CanvasImageSource;
  after: CanvasImageSource;
  r: Report;
  date: string;
}

const INK = '#1f2a2c';
const MUTED = '#66706a';
const LINE = '#d9d2bf';
const PAPER = '#f7f3e8';
const GREEN = '#3f6b63';
const RED = '#b8432f';
const AMBER = '#c27a1a';
const DISPLAY = "'Fraunces', Georgia, serif";
const BODY = "'Work Sans', system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";
const HAND = "'Caveat', 'Comic Sans MS', cursive";

function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function fit(ctx: CanvasRenderingContext2D, text: string, weight: string, family: string, size: number, max: number, min = 24): number {
  ctx.font = `${weight} ${size}px ${family}`;
  while (ctx.measureText(text).width > max && size > min) ctx.font = `${weight} ${(size -= 2)}px ${family}`;
  return size;
}

/** Bantla tutturulmuş fotoğraf: beyaz kenar, altında el yazısıyla etiket. */
function polaroid(ctx: CanvasRenderingContext2D, img: CanvasImageSource, x: number, y: number, w: number, label: string, tilt: number) {
  const h = (w * 7) / 12;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(tilt);
  ctx.shadowColor = 'rgba(0,0,0,.35)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = '#fff';
  ctx.fillRect(-w / 2 - 12, -h / 2 - 12, w + 24, h + 58);
  ctx.shadowColor = 'transparent';
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.fillStyle = INK;
  ctx.font = `700 34px ${HAND}`;
  ctx.textAlign = 'center';
  ctx.fillText(label, 0, h / 2 + 36);
  // bant
  ctx.fillStyle = 'rgba(240,228,190,.82)';
  ctx.rotate(-0.08);
  ctx.fillRect(-60, -h / 2 - 28, 120, 30);
  ctx.restore();
  ctx.textAlign = 'left';
}

export function paintMeydanCard(d: MeydanCardData) {
  const { r } = d;
  return (ctx: CanvasRenderingContext2D, link: string) => {
    ctx.textBaseline = 'alphabetic';

    // çizim masası: koyu yeşil kesim altlığı, ince ızgara
    ctx.fillStyle = '#2c4641';
    ctx.fillRect(0, 0, CARD_W, CARD_H);
    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i < CARD_W; i += 30) {
      ctx.beginPath();
      ctx.moveTo(i + 0.5, 0);
      ctx.lineTo(i + 0.5, CARD_H);
      ctx.stroke();
    }
    for (let i = 0; i < CARD_H; i += 30) {
      ctx.beginPath();
      ctx.moveTo(0, i + 0.5);
      ctx.lineTo(CARD_W, i + 0.5);
      ctx.stroke();
    }

    // pafta: hafif eğik kâğıt, çift çerçeve
    const px = 52;
    const py = 64;
    const pw = CARD_W - px * 2;
    const ph = 1110;
    ctx.save();
    ctx.translate(CARD_W / 2, py + ph / 2);
    ctx.rotate(-0.008);
    ctx.translate(-CARD_W / 2, -(py + ph / 2));
    ctx.shadowColor = 'rgba(0,0,0,.4)';
    ctx.shadowBlur = 50;
    ctx.shadowOffsetY = 18;
    ctx.fillStyle = PAPER;
    ctx.fillRect(px, py, pw, ph);
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.strokeRect(px + 18, py + 18, pw - 36, ph - 36);
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 26, py + 26, pw - 52, ph - 52);

    const x = px + 48;
    const w = pw - 96;

    // başlık: proje türü, unvan, yer; sağda pafta künyesi
    ctx.fillStyle = GREEN;
    ctx.font = `700 20px ${MONO}`;
    ctx.fillText('KENTSEL TASARIM PROJESİ · CEPHE ISLAHI', x, py + 76);
    ctx.fillStyle = INK;
    // sağda mühre yer kalır
    const size = fit(ctx, r.title, '700', DISPLAY, 64, w - 330, 38);
    ctx.fillText(r.title, x, py + 76 + size + 8);
    ctx.fillStyle = MUTED;
    ctx.font = `500 24px ${BODY}`;
    ctx.fillText(`${d.place} · ${d.region}`, x, py + 76 + size + 46);

    // yeni hâl büyük; eski hâl köşede bantlı fotoğraf
    const iy = py + 230;
    const ih = (w * 7) / 12;
    ctx.drawImage(d.after, x, iy, w, ih);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, iy, w, ih);
    ctx.fillStyle = 'rgba(16,14,11,.78)';
    round(ctx, x + w - 128, iy + 14, 114, 38, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `700 22px ${MONO}`;
    ctx.fillText('SONRA', x + w - 112, iy + 41);
    polaroid(ctx, d.before, x - 10, iy + ih - 150, 300, 'önce', -0.06);

    // ölçüler: estetik puan, deprem çizelgesi, keşif bedeli
    const sy = iy + ih + 56;
    const col = w / 3;
    const head = (cx: number, text: string) => {
      ctx.fillStyle = MUTED;
      ctx.font = `600 17px ${MONO}`;
      ctx.fillText(text, cx, sy);
    };
    head(x + 310, 'ESTETİK PUAN');
    ctx.fillStyle = r.score >= 60 ? GREEN : r.score >= 35 ? AMBER : RED;
    ctx.font = `700 70px ${DISPLAY}`;
    ctx.fillText(String(r.score), x + 310, sy + 70);
    const sw = ctx.measureText(String(r.score)).width;
    ctx.fillStyle = MUTED;
    ctx.font = `500 22px ${BODY}`;
    ctx.fillText(`/100 · önce ${r.scoreBefore}`, x + 318 + sw, sy + 68);
    ctx.fillStyle = LINE;
    round(ctx, x + 310, sy + 90, col + 20, 10, 5);
    ctx.fill();
    ctx.fillStyle = r.score >= 60 ? GREEN : r.score >= 35 ? AMBER : RED;
    round(ctx, x + 310, sy + 90, Math.max(10, ((col + 20) * r.score) / 100), 10, 5);
    ctx.fill();

    const dx = x + 310 + col + 60;
    head(dx, 'DEPREM GÜVENLİĞİ');
    ctx.fillStyle = r.safe === r.total ? GREEN : RED;
    ctx.font = `700 70px ${DISPLAY}`;
    ctx.fillText(`${r.safe}/${r.total}`, dx, sy + 70);
    for (let i = 0; i < r.total; i++) {
      ctx.fillStyle = i < r.safe ? GREEN : RED;
      ctx.fillRect(dx + i * 26, sy + 88, 20, 14);
    }

    // yapılan işler
    let ly = sy + 136;
    ctx.fillStyle = INK;
    ctx.font = `700 18px ${MONO}`;
    ctx.fillText('YAPILAN İŞLER', x, ly);
    ctx.font = `500 24px ${BODY}`;
    const works = r.works.length ? r.works.slice(0, 4) : ['Hiçbir şeye dokunulmadı'];
    for (const item of works) {
      ly += 34;
      ctx.fillStyle = GREEN;
      ctx.fillText('✓', x, ly);
      ctx.fillStyle = INK;
      ctx.fillText(item, x + 30, ly);
    }

    // antet kutusu: keşif bedeli, açık kusur, çizen ve onaylayan
    const tx = x + w - 380;
    const ty = sy + 130;
    const rows: [string, string][] = [
      ['Keşif bedeli', formatCost(r.cost)],
      ['Açık kusur', `${r.defectsOpen} (önce ${r.defectsBefore})`],
      ['Sökülen', `${r.junkRemoved} parça`],
      ['Pafta · tarih', `1/1 · ${d.date}`],
    ];
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.strokeRect(tx, ty, 380, rows.length * 38);
    rows.forEach(([k, v], i) => {
      const ry = ty + i * 38;
      if (i) {
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tx, ry);
        ctx.lineTo(tx + 380, ry);
        ctx.stroke();
      }
      ctx.fillStyle = MUTED;
      ctx.font = `600 16px ${MONO}`;
      ctx.fillText(k.toLocaleUpperCase('tr-TR'), tx + 14, ry + 25);
      ctx.fillStyle = INK;
      ctx.font = `700 22px ${BODY}`;
      ctx.textAlign = 'right';
      ctx.fillText(v, tx + 366, ry + 26);
      ctx.textAlign = 'left';
    });

    // imar mührü: başlığın sağına eğik basılmış
    const ok = r.score >= 60 && r.safe === r.total;
    const word = r.works.length === 0 ? 'İŞLEM YOK' : ok ? 'ONAYLANDI' : 'REVİZYON';
    const sc = r.works.length === 0 ? MUTED : ok ? GREEN : AMBER;
    ctx.save();
    ctx.font = `800 40px ${MONO}`;
    const mw = ctx.measureText(word).width + 56;
    ctx.translate(x + w - mw / 2 + 4, py + 130);
    ctx.rotate(-0.14);
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = sc;
    ctx.lineWidth = 5;
    round(ctx, -mw / 2, -44, mw, 88, 10);
    ctx.stroke();
    ctx.fillStyle = sc;
    ctx.textAlign = 'center';
    ctx.fillText(word, 0, 8);
    ctx.font = `700 14px ${MONO}`;
    ctx.fillText('İMAR VE ŞEHİRCİLİK MÜDÜRLÜĞÜ', 0, 30);
    ctx.restore();

    ctx.restore();

    // yapışkan not
    ctx.save();
    ctx.translate(CARD_W - 190, CARD_H - 100);
    ctx.rotate(0.06);
    ctx.shadowColor = 'rgba(0,0,0,.3)';
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = '#ffe36b';
    ctx.fillRect(-150, -80, 300, 160);
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = 'rgba(0,0,0,.06)';
    ctx.fillRect(-150, -80, 300, 22);
    ctx.fillStyle = '#2a2a2a';
    ctx.textAlign = 'center';
    ctx.font = `700 36px ${HAND}`;
    ctx.fillText('Senin meydanın', 0, 4);
    ctx.fillText('nasıl olurdu?', 0, 46);
    ctx.restore();

    // alt: adres
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.font = `600 26px ${BODY}`;
    ctx.fillText('Mesai Dışı · Meydan Islahı', px, CARD_H - 92);
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.font = `500 22px ${BODY}`;
    ctx.fillText(link, px, CARD_H - 58);
  };
}
