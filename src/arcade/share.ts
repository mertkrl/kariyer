import { GAMES, SITE_NAME } from './games';
import { slugOf, type GameRoute } from './slugs';
import { BODY, DISPLAY, MONO, round, wrap } from './cardKit';

/*
 * Oyunların ortak sonuç kartı: oyun bitince oyuncunun paylaştığı 1080×1350 bir görsel (telefonda
 * akışa da hikâyeye de sığar). Üstte oyunun adı ve rengi, ortada kâğıt üstünde unvan ve puanlar,
 * altta bir soru ve oyunun paylaşım sayfasının adresi (gamePages.ts). Telefonda sistemin paylaşım
 * menüsü açılır; başka yerde kart indirilir, metin panoya kopyalanır. Hiçbir şey bir yere gönderilmez.
 */

export interface ResultCard {
  route: GameRoute;
  /** Kâğıdın üst satırı, ör. "Aday Profil Raporu". */
  kicker: string;
  /** Unvan: kartın en büyük yazısı. */
  title: string;
  note?: string;
  /** En fazla üç sayı; `tone` sayının rengi. */
  stats: { label: string; value: string; tone?: string }[];
  /** Kâğıda notun yerine konan aynı boyda resimler (ör. meydanın önce ve sonrası): tek karede yan yana dilimlenir. */
  pictures?: { label: string; image: CanvasImageSource; w: number; h: number }[];
  /** Kartın altındaki davet, ör. "Sen kaç alırsın?" */
  question: string;
  /** Paylaşım menüsüne ya da panoya giden metin; adres sona eklenir. */
  text: string;
  /** Oyunun kendi kart çizimi: verilirse ortak tasarımın yerine 1080×1350 tuvale bu çizilir. */
  paint?: (ctx: CanvasRenderingContext2D, link: string) => void;
}

export const CARD_W = 1080;
export const CARD_H = 1350;

const INK = '#221f1b';
const PAPER = '#fbf8f0';
const MUTED = '#6e664d';

/** Oyunun paylaşım sayfası: bağlantı önizlemesinde oyunun kendi görseli çıkar, açılınca oyuna geçer. */
export function shareLink(route: GameRoute): string {
  const dir = window.location.pathname.replace(/[^/]*$/, '');
  return `${window.location.origin}${dir}oyun/${slugOf(route)}/`;
}

/** Kartın rengi: games.ts'teki CSS değişkeninin bugünkü değeri. */
function colorOf(route: GameRoute): string {
  const v = GAMES.find((g) => g.route === route)?.color ?? '';
  const name = /var\((--[\w-]+)\)/.exec(v)?.[1];
  return (name && getComputedStyle(document.documentElement).getPropertyValue(name).trim()) || v || INK;
}

/** En büyük yazının sığdığı boyut: iki satırı geçmesin. */
function fitTitle(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): { size: number; lines: string[] } {
  for (let size = 104; size > 52; size -= 6) {
    ctx.font = `700 ${size}px ${DISPLAY}`;
    const lines = wrap(ctx, text, maxWidth);
    if (lines.length <= 2) return { size, lines };
  }
  ctx.font = `700 52px ${DISPLAY}`;
  return { size: 52, lines: wrap(ctx, text, maxWidth).slice(0, 3) };
}

export function drawResultCard(canvas: HTMLCanvasElement, card: ResultCard) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  if (card.paint) {
    card.paint(ctx, shareLink(card.route).replace(/^https?:\/\//, '').replace(/\/$/, ''));
    return;
  }
  const game = GAMES.find((g) => g.route === card.route)!;
  const color = colorOf(card.route);
  const pad = 72;
  const inner = CARD_W - pad * 2;

  // zemin: oyunun rengi, üstünde salonun noktalı dokusu
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  for (let y = 11; y < CARD_H; y += 22) for (let x = 11; x < CARD_W; x += 22) ctx.fillRect(x, y, 2, 2);

  // üst: site ve oyun
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255,255,255,.78)';
  ctx.font = `600 24px ${MONO}`;
  ctx.fillText(`${SITE_NAME.toLocaleUpperCase('tr-TR')} · DOSYA ${String(game.file).padStart(3, '0')}`, pad, 104);
  ctx.fillStyle = PAPER;
  ctx.font = `700 60px ${DISPLAY}`;
  ctx.fillText(game.title, pad, 176);

  // kâğıt
  const top = 228;
  const bottom = CARD_H - 210;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.22)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = PAPER;
  round(ctx, pad - 24, top, inner + 48, bottom - top, 28);
  ctx.fill();
  ctx.restore();

  const x = pad + 32;
  const w = inner - 64;
  let y = top + 76;
  ctx.fillStyle = MUTED;
  ctx.font = `600 24px ${MONO}`;
  ctx.fillText(card.kicker.toLocaleUpperCase('tr-TR'), x, y);
  y += 30;

  if (card.pictures?.length) {
    // unvan üstte; resimler aynı kareyi yan yana dilimler (oyundaki önce/sonra sürgüsü gibi)
    ctx.fillStyle = INK;
    ctx.font = `700 60px ${DISPLAY}`;
    ctx.fillText(wrap(ctx, card.title, w)[0], x, y + 52);
    y += 92;
    const first = card.pictures[0];
    const ph = Math.min((w * first.h) / first.w, bottom - 220 - y);
    const pw = (ph * first.w) / first.h;
    const px = x + (w - pw) / 2;
    const slice = pw / card.pictures.length;
    ctx.save();
    round(ctx, px, y, pw, ph, 14);
    ctx.clip();
    card.pictures.forEach((p, i) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(px + slice * i, y, slice, ph);
      ctx.clip();
      ctx.drawImage(p.image, px, y, pw, ph);
      ctx.restore();
      if (i) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(px + slice * i - 2, y, 4, ph);
      }
    });
    ctx.restore();
    ctx.font = `700 22px ${MONO}`;
    card.pictures.forEach((p, i) => {
      const tw = ctx.measureText(p.label).width + 28;
      const lx = i ? px + slice * (i + 1) - tw - 14 : px + 14;
      ctx.fillStyle = 'rgba(16,14,11,.78)';
      round(ctx, lx, y + 14, tw, 38, 8);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(p.label, lx + 14, y + 41);
    });
  } else {
    // unvan ve not, kâğıdın üst satırıyla sayılar arasında ortalanır (biraz yukarıda)
    const t = fitTitle(ctx, card.title, w);
    ctx.font = `400 34px ${BODY}`;
    const note = card.note ? wrap(ctx, card.note, w).slice(0, 4) : [];
    const block = t.lines.length * t.size * 1.02 + (note.length ? 36 + note.length * 48 : 0);
    y += Math.max(40, (bottom - 210 - y - block) * 0.42);
    ctx.fillStyle = INK;
    ctx.font = `700 ${t.size}px ${DISPLAY}`;
    for (const line of t.lines) {
      y += t.size * 0.9;
      ctx.fillText(line, x, y);
      y += t.size * 0.12;
    }
    y += 36;
    ctx.fillStyle = '#4a453b';
    ctx.font = `400 34px ${BODY}`;
    for (const line of note) {
      y += 48;
      ctx.fillText(line, x, y);
    }
  }

  // sayılar: kâğıdın altına, eşit sütunlar
  const stats = card.stats.slice(0, 3);
  if (stats.length) {
    const sy = bottom - 70;
    ctx.strokeStyle = '#e3dcc6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, sy - 120);
    ctx.lineTo(x + w, sy - 120);
    ctx.stroke();
    const col = w / stats.length;
    stats.forEach((s, i) => {
      const cx = x + col * i;
      ctx.fillStyle = s.tone ?? INK;
      let size = 92;
      ctx.font = `700 ${size}px ${DISPLAY}`;
      while (ctx.measureText(s.value).width > col - 24 && size > 36) ctx.font = `700 ${(size -= 4)}px ${DISPLAY}`;
      ctx.fillText(s.value, cx, sy - 14);
      ctx.fillStyle = MUTED;
      ctx.font = `600 20px ${MONO}`;
      ctx.fillText(s.label.toLocaleUpperCase('tr-TR'), cx, sy + 22);
    });
  }

  // alt: davet ve adres
  ctx.fillStyle = PAPER;
  ctx.font = `700 44px ${DISPLAY}`;
  ctx.fillText(card.question, pad, CARD_H - 118);
  ctx.fillStyle = 'rgba(255,255,255,.82)';
  ctx.font = `500 26px ${BODY}`;
  ctx.fillText(shareLink(card.route).replace(/^https?:\/\//, '').replace(/\/$/, ''), pad, CARD_H - 70);
}

/** Oyunun yazı tipleri ilk kullanımda iner: tuval onları almadan çizmesin. */
async function fontsReady() {
  try {
    await Promise.all([document.fonts.load(`700 60px ${DISPLAY}`), document.fonts.load(`400 32px ${BODY}`), document.fonts.load(`600 24px ${MONO}`), document.fonts.load(`700 40px 'Caveat'`)]);
  } catch {
    // yedek yazı tipleri devralır
  }
}

/** Bir SVG'yi (oyunun kendi çizimi) tuvale konabilecek bir resme çevirir. */
export async function svgImage(svg: SVGSVGElement): Promise<HTMLImageElement> {
  const source = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('SVG resme çevrilemedi'));
      img.src = url;
    });
    return img;
  } finally {
    // resim çözüldü; adres artık gerekmez
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

export type ShareOutcome = 'shared' | 'saved' | 'cancelled';

/** Kartı çizer; telefonda paylaşım menüsünü açar, başka yerde kartı indirir ve metni panoya koyar. */
export async function shareResult(card: ResultCard): Promise<ShareOutcome> {
  await fontsReady();
  const canvas = document.createElement('canvas');
  drawResultCard(canvas, card);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Kart oluşturulamadı');
  const link = shareLink(card.route);
  const text = `${card.text} ${link}`;
  const file = new File([blob], `mesai-disi-${slugOf(card.route)}.png`, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      // izin verilmedi (ör. uzun süren çizimden sonra): indirmeye düş
    }
  }
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = file.name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // pano kapalı: kart yine indi
  }
  return 'saved';
}
