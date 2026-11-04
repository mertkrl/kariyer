/*
 * Oyunların kendi paylaşım kartlarının (shareCard.ts) ortak fırça takımı: yazı tipleri, sarma,
 * sığdırma, eğik mühür, alt bant. Yalnızca oyunların tembel paketlerindeki kart dosyaları içe aktarır;
 * giriş ekranı paketine girmez.
 */

export const DISPLAY = "'Fraunces', Georgia, serif";
export const BODY = "'Work Sans', system-ui, sans-serif";
export const MONO = "'JetBrains Mono', ui-monospace, monospace";
export const HAND = "'Caveat', 'Comic Sans MS', cursive";

export function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Satırları en fazla `max` satıra sarar; taşarsa son satırı üç noktayla keser. */
export function clampLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, max: number): string[] {
  const lines = wrap(ctx, text, maxWidth);
  if (lines.length <= max) return lines;
  const out = lines.slice(0, max);
  let last = out[max - 1];
  while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.replace(/\s*\S+$/, '');
  out[max - 1] = `${last}…`;
  return out;
}

/** Tek satırlık yazıyı genişliğe sığana dek küçültür; seçilen boyutu döndürür. */
export function fitFont(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, weight: string, size: number, family: string, min = 16): number {
  ctx.font = `${weight} ${size}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && size > min) ctx.font = `${weight} ${(size -= 2)}px ${family}`;
  return size;
}

/** Çok satırlık unvanı en fazla `lines` satıra sığacak boyutta sarar. */
export function fitBlock(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, weight: string, size: number, family: string, lines = 2, min = 36) {
  for (; size > min; size -= 4) {
    ctx.font = `${weight} ${size}px ${family}`;
    const l = wrap(ctx, text, maxWidth);
    if (l.length <= lines) return { size, lines: l };
  }
  ctx.font = `${weight} ${min}px ${family}`;
  return { size: min, lines: clampLines(ctx, text, maxWidth, lines) };
}

/** Sol ve sağ yazı arasına noktalı çizgi: fiş ve defter satırı. */
export function leader(ctx: CanvasRenderingContext2D, left: string, right: string, x: number, y: number, w: number, color: string) {
  const rw = ctx.measureText(right).width;
  let l = left;
  while (l && ctx.measureText(l).width > w - rw - 40) l = l.slice(0, -1);
  if (l !== left) l = `${l.trimEnd()}…`;
  ctx.textAlign = 'left';
  ctx.fillText(l, x, y);
  ctx.textAlign = 'right';
  ctx.fillText(right, x + w, y);
  ctx.textAlign = 'left';
  const from = x + ctx.measureText(l).width + 12;
  const to = x + w - rw - 12;
  if (to > from) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([2, 8]);
    ctx.beginPath();
    ctx.moveTo(from, y - 6);
    ctx.lineTo(to, y - 6);
    ctx.stroke();
    ctx.restore();
  }
}

/** Eğik basılmış, mürekkebi yer yer tutmamış dikdörtgen mühür. */
export function stamp(ctx: CanvasRenderingContext2D, x: number, y: number, rot: number, lines: string[], color: string, seed: number, size = 34) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.font = `800 ${size}px ${MONO}`;
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 56;
  const h = lines.length * size * 1.15 + 34;
  ctx.globalAlpha = 0.86;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 5;
  round(ctx, -w / 2, -h / 2, w, h, 10);
  ctx.stroke();
  ctx.lineWidth = 2;
  round(ctx, -w / 2 + 9, -h / 2 + 9, w - 18, h - 18, 6);
  ctx.stroke();
  ctx.textAlign = 'center';
  lines.forEach((l, i) => {
    ctx.font = `800 ${i ? Math.round(size * 0.6) : size}px ${MONO}`;
    ctx.fillText(l, 0, -h / 2 + 17 + size * 0.95 + i * size * 1.1);
  });
  ctx.globalCompositeOperation = 'destination-out';
  let n = seed * 31 + 7;
  for (let i = 0; i < 70; i++) {
    n = (n * 1103515245 + 12345) >>> 0;
    ctx.beginPath();
    ctx.arc(((n % 1000) / 1000 - 0.5) * w, (((n >>> 10) % 1000) / 1000 - 0.5) * h, 1 + ((n >>> 20) % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Kâğıt: gölgeli, hafif eğik dikdörtgen; çizimi `draw` içinde kâğıdın kendi koordinatlarında yapılır. */
export function paper(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rot: number, fill: string, draw: () => void) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(rot);
  ctx.translate(-w / 2, -h / 2);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.32)';
  ctx.shadowBlur = 34;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  draw();
  ctx.restore();
}

/** Yapışkan bant parçası. */
export function tape(ctx: CanvasRenderingContext2D, x: number, y: number, rot: number, w = 150) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = 'rgba(235,226,196,.72)';
  ctx.fillRect(-w / 2, -20, w, 40);
  ctx.restore();
}

/** Alt bant: koyu zeminde soru (sığana dek küçülür) ve adres. */
export function footer(ctx: CanvasRenderingContext2D, top: number, bg: string, question: string, link: string, fg = '#fbf6ea') {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  ctx.fillStyle = bg;
  ctx.fillRect(0, top, W, H - top);
  ctx.textAlign = 'left';
  ctx.fillStyle = fg;
  const lines = (() => {
    for (let s = 46; s >= 30; s -= 2) {
      ctx.font = `700 ${s}px ${DISPLAY}`;
      const l = wrap(ctx, question, W - 144);
      if (l.length === 1 || (l.length === 2 && s <= 36)) return { s, l };
    }
    ctx.font = `700 30px ${DISPLAY}`;
    return { s: 30, l: clampLines(ctx, question, W - 144, 2) };
  })();
  const linkY = H - 42;
  let y = linkY - 48 - (lines.l.length - 1) * lines.s * 1.1;
  for (const l of lines.l) {
    ctx.fillText(l, 72, y);
    y += lines.s * 1.1;
  }
  ctx.globalAlpha = 0.72;
  ctx.font = `500 24px ${BODY}`;
  ctx.fillText(link, 72, linkY);
  ctx.globalAlpha = 1;
}
