import { CARD_H, CARD_W } from '../../arcade/share';

/*
 * UyumMetre'nin paylaşım kartı: masaya bırakılmış resmî bir "Aday Değerlendirme Belgesi". Antetli
 * başlık ve barkodlu belge numarası, büyük karar, iki puan göstergesi (şirket ve sağduyu), bölüm
 * çubukları ve belgeye eğik basılmış lastik mühür. Köşede, belgenin üstüne yapıştırılmış sarı bir not
 * oyuncunun arkadaşına sorusunu el yazısıyla sorar.
 */

export interface UyumCardData {
  title: string;
  line: string;
  company: number;
  sense: number;
  passed: boolean;
  passMark: number;
  reportNo: string;
  date: string;
  sections: { title: string; company: number; sense: number }[];
}

const BLUE = '#2b62c0';
const GREEN = '#2f7a4e';
const RED = '#b8432f';
const INK = '#1d2733';
const MUTED = '#5d6b7c';
const LINE = '#dfe5ee';
const SOFT = '#eef1f6';
const BODY = "'Work Sans', system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";
const HAND = "'Caveat', 'Comic Sans MS', cursive";

function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > max && line) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

/** Belge numarasından türeyen, her kartta aynı kalan barkod. */
function barcode(ctx: CanvasRenderingContext2D, seed: string, x: number, y: number, w: number, h: number) {
  let n = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  let cx = x;
  ctx.fillStyle = INK;
  while (cx < x + w) {
    n = (n * 1103515245 + 12345) >>> 0;
    const bar = 2 + (n % 3) * 2;
    const gap = 2 + ((n >>> 4) % 3) * 2;
    if (cx + bar > x + w) break;
    ctx.fillRect(cx, y, bar, h);
    cx += bar + gap;
  }
}

/** Yarım daire gösterge: ince gri yay, üstünde puan kadar renkli yay, ortada rakam. */
function gauge(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, value: number, color: string, label: string, note: string) {
  ctx.lineCap = 'round';
  ctx.lineWidth = 26;
  ctx.strokeStyle = SOFT;
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 0);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, Math.PI + (Math.PI * Math.max(1, value)) / 100);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.font = `800 88px ${BODY}`;
  ctx.fillText(String(value), cx, cy - 6);
  ctx.fillStyle = INK;
  ctx.font = `700 26px ${BODY}`;
  ctx.fillText(label, cx, cy + 48);
  ctx.fillStyle = MUTED;
  ctx.font = `500 21px ${BODY}`;
  ctx.fillText(note, cx, cy + 80);
  ctx.textAlign = 'left';
}

export function paintUyumCard(d: UyumCardData) {
  return (ctx: CanvasRenderingContext2D, link: string) => {
    ctx.textBaseline = 'alphabetic';

    // masa: kurumsal mavi, ince çapraz desen
    const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
    bg.addColorStop(0, '#2b62c0');
    bg.addColorStop(1, '#173b78');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
    ctx.strokeStyle = 'rgba(255,255,255,.05)';
    ctx.lineWidth = 2;
    for (let i = -CARD_H; i < CARD_W; i += 34) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + CARD_H, CARD_H);
      ctx.stroke();
    }

    // belge: hafif eğik, gölgeli beyaz kâğıt
    const px = 84;
    const py = 96;
    const pw = CARD_W - px * 2;
    const ph = CARD_H - py - 150;
    ctx.save();
    ctx.translate(CARD_W / 2, py + ph / 2);
    ctx.rotate(-0.012);
    ctx.translate(-CARD_W / 2, -(py + ph / 2));
    ctx.shadowColor = 'rgba(5,20,50,.35)';
    ctx.shadowBlur = 50;
    ctx.shadowOffsetY = 18;
    ctx.fillStyle = '#fff';
    round(ctx, px, py, pw, ph, 14);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    const x = px + 56;
    const w = pw - 112;

    // antet: logo, platform adı, barkod
    ctx.fillStyle = BLUE;
    round(ctx, x, py + 52, 52, 52, 12);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x + 26, py + 78, 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + 26, py + 78, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.font = `800 34px ${BODY}`;
    ctx.fillText('UyumMetre', x + 70, py + 80);
    ctx.fillStyle = MUTED;
    ctx.font = `500 18px ${BODY}`;
    ctx.fillText('Yetenek Ölçüm ve Kültür Uyum Platformu', x + 70, py + 104);
    barcode(ctx, d.reportNo, x + w - 210, py + 54, 210, 40);
    ctx.fillStyle = MUTED;
    ctx.font = `500 17px ${MONO}`;
    ctx.textAlign = 'right';
    ctx.fillText(d.reportNo, x + w, py + 118);
    ctx.textAlign = 'left';

    // antetin altında çift çizgi
    let y = py + 150;
    ctx.fillStyle = BLUE;
    ctx.fillRect(x, y, w, 4);
    ctx.fillStyle = LINE;
    ctx.fillRect(x, y + 10, w, 1);

    // belge başlığı ve karar
    y += 70;
    ctx.fillStyle = BLUE;
    ctx.font = `700 22px ${MONO}`;
    ctx.fillText('ADAY PROFİL RAPORU · GİZLİ', x, y);
    ctx.fillStyle = MUTED;
    ctx.font = `500 20px ${BODY}`;
    ctx.textAlign = 'right';
    ctx.fillText(d.date, x + w, y);
    ctx.textAlign = 'left';

    let size = 92;
    ctx.font = `800 ${size}px ${BODY}`;
    // sağda mühre yer kalır
    const tw = w - 390;
    while (ctx.measureText(d.title).width > tw && size > 48) ctx.font = `800 ${(size -= 4)}px ${BODY}`;
    y += size + 14;
    ctx.fillStyle = INK;
    ctx.fillText(d.title, x, y);

    ctx.font = `400 28px ${BODY}`;
    ctx.fillStyle = MUTED;
    const lines = wrap(ctx, `“${d.line}”`, tw).slice(0, 3);
    for (const l of lines) {
      y += 42;
      ctx.fillText(l, x, y);
    }

    // iki gösterge
    y += 200;
    gauge(ctx, x + w * 0.25, y, 128, d.company, BLUE, 'Şirket puanı', 'Kararı bu verir');
    gauge(ctx, x + w * 0.75, y, 128, d.sense, GREEN, 'Sağduyu puanı', 'Karara etkisi: yok');
    ctx.fillStyle = LINE;
    ctx.fillRect(x + w / 2, y - 120, 1, 200);

    // bölümler
    y += 140;
    ctx.fillStyle = LINE;
    ctx.fillRect(x, y, w, 1);
    y += 48;
    ctx.fillStyle = INK;
    ctx.font = `700 20px ${MONO}`;
    ctx.fillText('BÖLÜM SONUÇLARI', x, y);
    ctx.font = `500 18px ${BODY}`;
    ctx.fillStyle = BLUE;
    ctx.textAlign = 'right';
    ctx.fillText('● şirket', x + w - 120, y);
    ctx.fillStyle = GREEN;
    ctx.fillText('● sağduyu', x + w, y);
    ctx.textAlign = 'left';
    const label = 270;
    const bw = w - label - 70;
    for (const s of d.sections) {
      y += 52;
      ctx.fillStyle = INK;
      ctx.font = `600 23px ${BODY}`;
      ctx.fillText(s.title, x, y + 4);
      for (const [i, v, c] of [
        [0, s.company, BLUE],
        [1, s.sense, GREEN],
      ] as const) {
        const by = y - 12 + i * 14;
        ctx.fillStyle = SOFT;
        round(ctx, x + label, by, bw, 9, 5);
        ctx.fill();
        ctx.fillStyle = c;
        round(ctx, x + label, by, Math.max(9, (bw * v) / 100), 9, 5);
        ctx.fill();
      }
      ctx.font = `700 18px ${MONO}`;
      ctx.textAlign = 'right';
      ctx.fillStyle = BLUE;
      ctx.fillText(String(s.company), x + w, y - 3);
      ctx.fillStyle = GREEN;
      ctx.fillText(String(s.sense), x + w, y + 15);
      ctx.textAlign = 'left';
    }

    // dipnot
    ctx.fillStyle = MUTED;
    ctx.font = `italic 400 18px ${BODY}`;
    ctx.fillText('Otomatik değerlendirilmiştir. İtiraz süresi geçmiştir.', x, py + ph - 44);

    // mühür: belgeye eğik basılmış, kenarları aşınmış çift çerçeve
    const sc = d.passed ? GREEN : RED;
    const word = d.passed ? 'UYGUN' : 'UYGUN DEĞİL';
    ctx.save();
    ctx.font = `800 46px ${MONO}`;
    const sw = ctx.measureText(word).width + 64;
    // mühür sağ kenara yaslanır; başlık bloğu onun solunda kalır
    ctx.translate(x + w - sw / 2 + 6, py + 320);
    ctx.rotate(-0.16);
    ctx.globalAlpha = 0.86;
    ctx.strokeStyle = sc;
    ctx.lineWidth = 6;
    round(ctx, -sw / 2, -52, sw, 104, 12);
    ctx.stroke();
    ctx.lineWidth = 2;
    round(ctx, -sw / 2 + 10, -42, sw - 20, 84, 8);
    ctx.stroke();
    ctx.fillStyle = sc;
    ctx.textAlign = 'center';
    ctx.fillText(word, 0, 12);
    ctx.font = `700 16px ${MONO}`;
    ctx.fillText(`EŞİK ${d.passMark} · İTİRAZ EDİLEMEZ`, 0, 34);
    // aşınma: mürekkebin tutmadığı küçük beyaz lekeler
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'destination-out';
    let n = d.company * 97 + 13;
    for (let i = 0; i < 70; i++) {
      n = (n * 1103515245 + 12345) >>> 0;
      const rx = ((n % 1000) / 1000 - 0.5) * sw;
      const ry = (((n >>> 10) % 1000) / 1000 - 0.5) * 104;
      ctx.beginPath();
      ctx.arc(rx, ry, 1 + ((n >>> 20) % 3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.restore();

    // yapışkan not: belgenin sağ alt köşesine, eğik
    ctx.save();
    ctx.translate(CARD_W - 200, CARD_H - 112);
    ctx.rotate(0.07);
    ctx.shadowColor = 'rgba(0,0,0,.28)';
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = '#ffe36b';
    ctx.fillRect(-140, -84, 280, 168);
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = 'rgba(0,0,0,.06)';
    ctx.fillRect(-140, -84, 280, 22);
    ctx.fillStyle = '#2a2a2a';
    ctx.textAlign = 'center';
    ctx.font = `700 50px ${HAND}`;
    ctx.fillText('Sen kaç', 0, 4);
    ctx.fillText('alırsın?', 0, 52);
    ctx.restore();

    // alt: adres
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.font = `600 26px ${BODY}`;
    ctx.textAlign = 'left';
    ctx.fillText('Mesai Dışı · UyumMetre', px, CARD_H - 82);
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.font = `500 22px ${BODY}`;
    ctx.fillText(link, px, CARD_H - 48);
  };
}
