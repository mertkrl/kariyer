/*
 * Raporu paylaş: tablonun görünen ilk satırlarını Excel ekranı gibi bir PNG'ye çizer. Köşesine
 * sitenin adresi yazılır; oyuncu bunu indirip ofis arkadaşına atabilir. Dış kütüphane yok, düz canvas.
 */

export type ShotCell = { text: string; bold?: boolean; num?: boolean; color?: string; fill?: string; struck?: boolean };

const GREEN = '#217346';
const COL_W = 118;
const ROW_H = 24;
const HEAD_W = 40;

export function drawSheet(name: string, rows: ShotCell[][], site: string): Promise<Blob | null> {
  const cols = rows[0]?.length ?? 0;
  const w = HEAD_W + cols * COL_W;
  const top = 44 + 30;
  const h = top + (rows.length + 1) * ROW_H + 40;
  const canvas = document.createElement('canvas');
  const k = 2;
  canvas.width = w * k;
  canvas.height = h * k;
  const g = canvas.getContext('2d');
  if (!g) return Promise.resolve(null);
  g.scale(k, k);
  g.fillStyle = '#fff';
  g.fillRect(0, 0, w, h);

  // başlık çubuğu ve şerit
  g.fillStyle = GREEN;
  g.fillRect(0, 0, w, 44);
  g.fillStyle = '#fff';
  g.font = '600 14px "Segoe UI", system-ui, sans-serif';
  g.textBaseline = 'middle';
  g.fillText(`X   ${name}`, 14, 22);
  g.fillStyle = '#f3f3f3';
  g.fillRect(0, 44, w, 30);
  g.fillStyle = '#444';
  g.font = '12px "Segoe UI", system-ui, sans-serif';
  g.fillText('Dosya   Giriş   Ekle   Formüller   Veri   Gözden Geçir   Görünüm', 14, 59);

  // sütun ve satır başlıkları
  const y0 = top;
  g.fillStyle = '#f3f3f3';
  g.fillRect(0, y0, w, ROW_H);
  g.fillRect(0, y0, HEAD_W, (rows.length + 1) * ROW_H);
  g.fillStyle = '#555';
  g.textAlign = 'center';
  for (let c = 0; c < cols; c++) g.fillText(String.fromCharCode(65 + c), HEAD_W + c * COL_W + COL_W / 2, y0 + ROW_H / 2);
  rows.forEach((_, r) => g.fillText(String(r + 1), HEAD_W / 2, y0 + (r + 1) * ROW_H + ROW_H / 2));

  // hücreler
  rows.forEach((row, r) =>
    row.forEach((cell, c) => {
      const x = HEAD_W + c * COL_W;
      const y = y0 + (r + 1) * ROW_H;
      if (cell.fill) {
        g.fillStyle = cell.fill;
        g.fillRect(x, y, COL_W, ROW_H);
      }
      if (!cell.text) return;
      g.save();
      g.beginPath();
      g.rect(x, y, COL_W, ROW_H);
      g.clip();
      g.fillStyle = cell.color ?? (cell.text.startsWith('#') ? '#c00000' : '#222');
      g.font = `${cell.bold ? '700 ' : ''}13px Calibri, "Segoe UI", sans-serif`;
      g.textAlign = cell.num ? 'right' : 'left';
      const tx = cell.num ? x + COL_W - 5 : x + 5;
      g.fillText(cell.text, tx, y + ROW_H / 2);
      if (cell.struck) {
        const m = g.measureText(cell.text).width;
        g.fillRect(cell.num ? tx - m : tx, y + ROW_H / 2, m, 1);
      }
      g.restore();
    }),
  );

  // ızgara
  g.strokeStyle = '#dcdcdc';
  g.lineWidth = 1;
  for (let c = 0; c <= cols; c++) {
    const x = HEAD_W + c * COL_W + 0.5;
    g.beginPath();
    g.moveTo(x, y0);
    g.lineTo(x, y0 + (rows.length + 1) * ROW_H);
    g.stroke();
  }
  for (let r = 0; r <= rows.length + 1; r++) {
    const y = y0 + r * ROW_H + 0.5;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(w, y);
    g.stroke();
  }

  // imza
  g.fillStyle = GREEN;
  g.fillRect(0, h - 32, w, 32);
  g.fillStyle = '#fff';
  g.textAlign = 'left';
  g.font = '600 13px "Segoe UI", system-ui, sans-serif';
  g.fillText('Bu rapor mesai dışında hazırlanmıştır.', 14, h - 16);
  g.textAlign = 'right';
  g.fillText(`Mesai Dışı · ${site}`, w - 14, h - 16);

  return new Promise((done) => canvas.toBlob(done, 'image/png'));
}
