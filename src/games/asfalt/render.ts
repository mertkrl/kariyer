import { BASE, GRAVEL, GROUND, H, HOT, OLD, PACKED, ROAD, SET, SET_HEAT, SOIL, W, WATER, WET, type World } from './model';

/*
 * Dünyayı tuvale hücre başına bir piksel çizer; tuval CSS ile pikselli büyütülür. Her hücrenin
 * kendi tonu vardır (mıcır benekli, toprak hafif dalgalı). Boş hücre saydamdır: arkada gökyüzü,
 * çukurun içinde toprağın kesiti görünür.
 */

type RGB = [number, number, number];

const BASE_RGB: Record<number, RGB> = {
  [GROUND]: [104, 76, 52],
  [BASE]: [132, 122, 106],
  [OLD]: [66, 66, 70],
  [SOIL]: [150, 106, 66],
  [GRAVEL]: [164, 158, 146],
  [SET]: [40, 40, 44],
  [WATER]: [70, 132, 186],
};
/** Hücreden hücreye ton oynaması. */
const GRAIN: Record<number, number> = { [GROUND]: 0.1, [BASE]: 0.14, [OLD]: 0.07, [SOIL]: 0.1, [GRAVEL]: 0.24, [SET]: 0.06, [WATER]: 0.05, [HOT]: 0.05 };
const HOT_RGB: RGB = [96, 66, 52];
const MARK: RGB = [226, 218, 190];

export function draw(ctx: CanvasRenderingContext2D, img: ImageData, w: World) {
  const d = img.data;
  const { cells, heat, flags, shade } = w;
  d.fill(0);
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    if (c === 0) continue;
    let rgb: RGB;
    if (c === HOT) {
      const t = Math.max(0, Math.min(1, (heat[i] - SET_HEAT) / (255 - SET_HEAT)));
      const s = BASE_RGB[SET];
      rgb = [s[0] + (HOT_RGB[0] - s[0]) * t, s[1] + (HOT_RGB[1] - s[1]) * t, s[2] + (HOT_RGB[2] - s[2]) * t];
    } else rgb = BASE_RGB[c];
    const y = (i / W) | 0;
    const x = i - y * W;
    // eski yolun şerit çizgisi: yalnızca yüzeyde, kesik kesik
    if (c === OLD && y === ROAD && ((x >> 3) & 3) === 0) rgb = MARK;
    let k = 1 + ((shade[i] - 128) / 128) * (GRAIN[c] ?? 0.08);
    if (flags[i] & PACKED) k *= 0.9;
    let [r, g, b] = rgb;
    if (flags[i] & WET) {
      // sulanmış asfalt: grimsi, lekeli
      const m = shade[i] & 1 ? 0.55 : 0.3;
      r += (128 - r) * m;
      g += (136 - g) * m;
      b += (146 - b) * m;
    }
    const o = i * 4;
    d[o] = r * k;
    d[o + 1] = g * k;
    d[o + 2] = b * k;
    d[o + 3] = c === WATER ? 205 : 255;
    // sıcak asfaltın buharı
    if (c === HOT && heat[i] > 170 && y > 0 && cells[i - W] === 0 && Math.random() < 0.05) {
      const u = o - W * 4;
      d[u] = d[u + 1] = d[u + 2] = 245;
      d[u + 3] = 120;
    }
  }
  ctx.putImageData(img, 0, 0);
}

export const newImage = (ctx: CanvasRenderingContext2D) => ctx.createImageData(W, H);
