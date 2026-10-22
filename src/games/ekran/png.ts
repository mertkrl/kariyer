import { H, W } from './model';

/** Ekranın PNG'si: SVG'yi resme, resmi iki kat çözünürlükte tuvale çizer. */
export async function screenPng(svg: SVGSVGElement): Promise<Blob> {
  const source = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('SVG resme çevrilemedi'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = W * 2;
    canvas.height = H * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Tuval yok');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG oluşturulamadı'))), 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}
