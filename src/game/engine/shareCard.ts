/*
 * The result card a player shares at the end: the ending, both scores, what the week cost, and
 * where to play. Drawn on a canvas in the game's own type (Fraunces, Work Sans), so it looks
 * like the game rather than like a browser default.
 */

export const GAME_NAME = "Sen İK'sin";

interface ShareCardData {
  endingTitle: string;
  performans: number;
  vicdan: number;
  totalProcessed: number;
  autoRejected: number;
  /** Where the game lives, printed at the bottom (no seed or other query). */
  url: string;
}

const DISPLAY = "'Fraunces', Georgia, serif";
const BODY = "'Work Sans', system-ui, sans-serif";

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
  return currentY + lineHeight;
}

/** The game's fonts are bundled but load on first use: make sure the canvas gets them. */
async function fontsReady() {
  try {
    await Promise.all([document.fonts.load(`700 52px ${DISPLAY}`), document.fonts.load(`600 24px ${BODY}`), document.fonts.load(`400 15px ${BODY}`)]);
  } catch {
    // the fallback fonts in DISPLAY/BODY take over
  }
}

export function drawShareCard(canvas: HTMLCanvasElement, data: ShareCardData): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;

  ctx.fillStyle = '#1a1712';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#c9a227';
  ctx.font = `700 40px ${DISPLAY}`;
  ctx.fillText(GAME_NAME, 64, 104);
  ctx.fillStyle = '#8a8375';
  ctx.font = `500 20px ${BODY}`;
  ctx.fillText('5 günlük bir işe alım simülasyonu · haftanın sonu', 64, 140);

  ctx.strokeStyle = '#3a352c';
  ctx.beginPath();
  ctx.moveTo(64, 172);
  ctx.lineTo(W - 64, 172);
  ctx.stroke();

  ctx.fillStyle = '#f0ece0';
  ctx.font = `700 54px ${DISPLAY}`;
  const titleEndY = wrapText(ctx, `"${data.endingTitle}"`, 64, 262, W - 128, 64);

  const scoreY = Math.max(titleEndY + 60, 430);
  ctx.font = `700 72px ${DISPLAY}`;
  ctx.fillStyle = '#5b8fc2';
  ctx.fillText(String(data.performans), 64, scoreY);
  ctx.fillStyle = '#4f8a7e';
  ctx.fillText(String(data.vicdan), 340, scoreY);
  ctx.font = `600 16px ${BODY}`;
  ctx.fillStyle = '#8a8375';
  ctx.fillText('PERFORMANS', 64, scoreY + 34);
  ctx.fillText('VİCDAN', 340, scoreY + 34);

  const statsY = scoreY + 100;
  ctx.strokeStyle = '#3a352c';
  ctx.beginPath();
  ctx.moveTo(64, statsY);
  ctx.lineTo(W - 64, statsY);
  ctx.stroke();

  ctx.font = `400 22px ${BODY}`;
  ctx.fillStyle = '#c9c2af';
  ctx.fillText(`Karar verdiğin dosya: ${data.totalProcessed.toLocaleString('tr-TR')}`, 64, statsY + 56);
  ctx.fillStyle = '#d26a55';
  ctx.fillText(`Hiçbir insanın açmadığı başvuru: ${data.autoRejected.toLocaleString('tr-TR')}`, 64, statsY + 94);

  ctx.fillStyle = '#8a8375';
  ctx.font = `500 20px ${BODY}`;
  ctx.fillText('Sen olsan ne yapardın?', 64, H - 100);
  ctx.fillStyle = '#c9a227';
  ctx.font = `600 22px ${BODY}`;
  ctx.fillText(data.url, 64, H - 64);
}

/** Draws the card and hands it back as a PNG. */
export async function shareCardImage(canvas: HTMLCanvasElement, data: ShareCardData): Promise<Blob | null> {
  await fontsReady();
  drawShareCard(canvas, data);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
