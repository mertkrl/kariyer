interface ShareCardData {
  endingTitle: string;
  performans: number;
  vicdan: number;
  totalProcessed: number;
  autoRejected: number;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
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

export function drawShareCard(canvas: HTMLCanvasElement, data: ShareCardData): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;

  ctx.fillStyle = '#1a1712';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#8a8375';
  ctx.font = '600 24px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('İK SİMÜLASYONU', 64, 100);
  ctx.fillStyle = '#5c584d';
  ctx.font = '20px Georgia, serif';
  ctx.fillText('Simülasyon Sona Erdi', 64, 132);

  ctx.strokeStyle = '#3a352c';
  ctx.beginPath();
  ctx.moveTo(64, 160);
  ctx.lineTo(W - 64, 160);
  ctx.stroke();

  ctx.fillStyle = '#f0ece0';
  ctx.font = '700 52px Georgia, serif';
  const titleEndY = wrapText(ctx, `"${data.endingTitle}"`, 64, 250, W - 128, 62);

  const scoreY = Math.max(titleEndY + 60, 420);
  ctx.textAlign = 'left';
  ctx.font = '700 64px Georgia, serif';
  ctx.fillStyle = '#4c7fb0';
  ctx.fillText(String(data.performans), 64, scoreY);
  ctx.font = '13px Georgia, serif';
  ctx.fillStyle = '#8a8375';
  ctx.fillText('PERFORMANS', 64, scoreY + 30);

  ctx.font = '700 64px Georgia, serif';
  ctx.fillStyle = '#3f6b63';
  ctx.fillText(String(data.vicdan), 340, scoreY);
  ctx.font = '13px Georgia, serif';
  ctx.fillStyle = '#8a8375';
  ctx.fillText('VİCDAN', 340, scoreY + 30);

  const statsY = scoreY + 100;
  ctx.strokeStyle = '#3a352c';
  ctx.beginPath();
  ctx.moveTo(64, statsY);
  ctx.lineTo(W - 64, statsY);
  ctx.stroke();

  ctx.font = '15px Georgia, serif';
  ctx.fillStyle = '#c9c2af';
  ctx.fillText(`Toplam CV işlendi: ${data.totalProcessed}`, 64, statsY + 50);
  ctx.fillStyle = '#a8402f';
  ctx.fillText(`Hiç açılmadan elendi: ${data.autoRejected}`, 64, statsY + 84);

  ctx.fillStyle = '#5c584d';
  ctx.font = '14px Georgia, serif';
  ctx.fillText('kariyerweb.oyunu — sistemin bir parçası mısın?', 64, H - 64);
}
