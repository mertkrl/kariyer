import { SITE_NAME } from '../../arcade/games';
import { CARD_H, CARD_W } from '../../arcade/share';

/*
 * Ekran İhalesi'nin paylaşım kartı: işin teslim edildiği an. Fayanslı bir bekleme salonu duvarında
 * (ulaşım ekranlarında vagon tavanında) iki askıya asılı monitör yeni tasarımı gösterir; eski hâli
 * köşeye bantlanmış bir fotoğraftır. Altta ihale teslim tutanağı: okunurluk, bileşen sayısı ve ekran
 * türü; tutanağa eğik basılmış kabul mührü. Sarı not arkadaşa sorar: sen olsan nasıl yapardın?
 */

export interface EkranCardData {
  title: string;
  place: string;
  transit: boolean;
  before: CanvasImageSource;
  after: CanvasImageSource;
  score: number;
  widgets: number;
  motion: string;
  accent: string;
  date: string;
  no: string;
}

const INK = '#1d2733';
const MUTED = '#5d6b7c';
const PAPER = '#fbf8f0';
const GREEN = '#2f7a4e';
const AMBER = '#b9741a';
const RED = '#b8432f';
const BODY = "'Work Sans', system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";
const DISPLAY = "'Fraunces', Georgia, serif";
const HAND = "'Caveat', 'Comic Sans MS', cursive";

function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function fit(ctx: CanvasRenderingContext2D, text: string, weight: string, family: string, size: number, max: number, min = 28): number {
  ctx.font = `${weight} ${size}px ${family}`;
  while (ctx.measureText(text).width > max && size > min) ctx.font = `${weight} ${(size -= 2)}px ${family}`;
  return size;
}

/** Duvar: hastanede açık yeşil fayans, ulaşımda koyu vagon paneli ve tutunma borusu. */
function wall(ctx: CanvasRenderingContext2D, transit: boolean, accent: string) {
  ctx.fillStyle = transit ? '#27303b' : '#dfe9e3';
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  if (transit) {
    ctx.fillStyle = 'rgba(255,255,255,.05)';
    for (let x = 0; x < CARD_W; x += 180) ctx.fillRect(x, 0, 2, CARD_H);
    // tavan şeridi ve boru
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, CARD_W, 18);
    const g = ctx.createLinearGradient(0, 96, 0, 112);
    g.addColorStop(0, '#e8edf2');
    g.addColorStop(1, '#8c97a3');
    ctx.fillStyle = g;
    ctx.fillRect(0, 96, CARD_W, 16);
  } else {
    ctx.strokeStyle = 'rgba(40,70,55,.12)';
    ctx.lineWidth = 2;
    for (let y = 0; y < CARD_H; y += 72) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CARD_W, y);
      ctx.stroke();
      for (let x = (y / 72) % 2 ? 0 : 36; x < CARD_W; x += 72) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 72);
        ctx.stroke();
      }
    }
    // bel hizasında kurum renginde şerit
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(0, 846, CARD_W, 14);
    ctx.globalAlpha = 1;
  }
}

function photo(ctx: CanvasRenderingContext2D, img: CanvasImageSource, x: number, y: number, w: number, tilt: number) {
  const h = (w * 3) / 4;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(tilt);
  ctx.shadowColor = 'rgba(0,0,0,.35)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = '#fff';
  ctx.fillRect(-w / 2 - 12, -h / 2 - 12, w + 24, h + 60);
  ctx.shadowColor = 'transparent';
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.fillStyle = INK;
  ctx.font = `700 34px ${HAND}`;
  ctx.textAlign = 'center';
  ctx.fillText('eskisi', 0, h / 2 + 38);
  ctx.fillStyle = 'rgba(240,228,190,.85)';
  ctx.rotate(0.1);
  ctx.fillRect(-56, -h / 2 - 26, 112, 28);
  ctx.restore();
  ctx.textAlign = 'left';
}

function stamp(ctx: CanvasRenderingContext2D, cx: number, cy: number, text: string, color: string) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.16);
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 5;
  round(ctx, -150, -46, 300, 92, 10);
  ctx.stroke();
  ctx.lineWidth = 2;
  round(ctx, -140, -36, 280, 72, 6);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.font = `800 ${text.length > 10 ? 30 : 38}px ${MONO}`;
  ctx.fillText(text, 0, 13);
  ctx.restore();
  ctx.textAlign = 'left';
}

export function paintEkranCard(d: EkranCardData) {
  return (ctx: CanvasRenderingContext2D, link: string) => {
    ctx.textBaseline = 'alphabetic';
    wall(ctx, d.transit, d.accent);
    const light = d.transit ? '#eef1f5' : INK;
    const soft = d.transit ? 'rgba(238,241,245,.7)' : MUTED;

    // başlık
    ctx.fillStyle = soft;
    ctx.font = `700 22px ${MONO}`;
    ctx.fillText('EKRAN İHALESİ · YENİ TASARIM', 64, 168);
    ctx.fillStyle = light;
    const size = fit(ctx, d.title, '700', DISPLAY, 66, CARD_W - 128, 40);
    ctx.fillText(d.title, 64, 168 + size + 8);
    ctx.fillStyle = soft;
    ctx.font = `500 26px ${BODY}`;
    ctx.fillText(d.place, 64, 168 + size + 48);

    // askılar ve monitör
    const mw = 820;
    const mh = (mw * 3) / 4;
    const mx = (CARD_W - mw) / 2;
    const my = 336;
    // askılar başlığın altından iner
    const top = my - 34;
    ctx.fillStyle = d.transit ? '#9aa5b1' : '#7b8a83';
    ctx.fillRect(mx + 150, top, 10, my - top);
    ctx.fillRect(mx + mw - 160, top, 10, my - top);
    ctx.fillRect(mx + 130, top - 6, 50, 8);
    ctx.fillRect(mx + mw - 180, top - 6, 50, 8);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.45)';
    ctx.shadowBlur = 50;
    ctx.shadowOffsetY = 22;
    ctx.fillStyle = '#121418';
    round(ctx, mx - 22, my - 22, mw + 44, mh + 44, 18);
    ctx.fill();
    ctx.restore();
    ctx.drawImage(d.after, mx, my, mw, mh);
    // cam parıltısı
    const glare = ctx.createLinearGradient(mx, my, mx + mw * 0.6, my + mh);
    glare.addColorStop(0, 'rgba(255,255,255,.14)');
    glare.addColorStop(0.45, 'rgba(255,255,255,0)');
    ctx.fillStyle = glare;
    ctx.fillRect(mx, my, mw, mh);
    // CANLI ışığı
    ctx.fillStyle = '#e0262d';
    ctx.beginPath();
    ctx.arc(mx + mw - 6, my + mh + 11, 5, 0, Math.PI * 2);
    ctx.fill();

    photo(ctx, d.before, 40, my + mh - 120, 250, -0.07);

    // teslim tutanağı
    const ty = my + mh + 58;
    const tx = 330;
    const tw = CARD_W - tx - 48;
    const th = CARD_H - ty - 96;
    ctx.save();
    ctx.translate(tx + tw / 2, ty + th / 2);
    ctx.rotate(0.012);
    ctx.shadowColor = 'rgba(0,0,0,.3)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = PAPER;
    ctx.fillRect(-tw / 2, -th / 2, tw, th);
    ctx.restore();
    ctx.fillStyle = MUTED;
    ctx.font = `600 17px ${MONO}`;
    ctx.fillText(`TESLİM TUTANAĞI · NO ${d.no} · ${d.date}`, tx + 28, ty + 40);
    const cells: [string, string, string][] = [
      ['OKUNURLUK', `%${d.score}`, d.score >= 80 ? GREEN : d.score >= 50 ? AMBER : RED],
      ['BİLEŞEN', String(d.widgets), INK],
      ['TÜR', d.motion, INK],
    ];
    const cw = (tw - 56) / 3;
    cells.forEach(([label, value, color], i) => {
      const cx = tx + 28 + cw * i;
      ctx.fillStyle = MUTED;
      ctx.font = `600 16px ${MONO}`;
      ctx.fillText(label, cx, ty + 92);
      ctx.fillStyle = color;
      fit(ctx, value, '700', BODY, 52, cw - 16, 28);
      ctx.fillText(value, cx, ty + 150);
    });
    stamp(ctx, tx + tw - 150, ty + th - 50, d.score >= 80 ? 'KABUL' : 'ŞERHLİ KABUL', d.score >= 80 ? GREEN : AMBER);

    // sarı not
    ctx.save();
    ctx.translate(176, CARD_H - 176);
    ctx.rotate(-0.05);
    ctx.shadowColor = 'rgba(0,0,0,.25)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#ffe680';
    ctx.fillRect(-120, -64, 240, 128);
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.font = `700 34px ${HAND}`;
    ctx.fillText('Sen olsan', 0, -10);
    ctx.fillText('nasıl yapardın?', 0, 30);
    ctx.restore();
    ctx.textAlign = 'left';

    // alt satır
    ctx.fillStyle = soft;
    ctx.font = `600 22px ${MONO}`;
    ctx.fillText(link, 64, CARD_H - 40);
    ctx.textAlign = 'right';
    ctx.fillText(SITE_NAME.toLocaleUpperCase('tr-TR'), CARD_W - 64, CARD_H - 40);
    ctx.textAlign = 'left';
  };
}
