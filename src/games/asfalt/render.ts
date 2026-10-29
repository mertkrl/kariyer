import { BASE, EMPTY, GRAVEL, GROUND, H, HOT, OLD, PACKED, ROAD, SET, SET_HEAT, SOAKED, SOIL, W, WATER, WET, type World } from './model';

/*
 * Dünyayı tuvale çizer: her hücre SCALE × SCALE piksel. Hücrenin içi malzemesine göre dokulanır
 * (mıcırda ayrı ayrı taşlar, asfaltta parlayan agrega, toprakta ince taneler), sonra ışık
 * uygulanır: havaya bakan yüzün kenarı aydınlanır, yüzeyden derine indikçe kesit kararır (ortam
 * gölgesi). Su derinleştikçe koyulaşır, yüzeyi parlar. Sıcak asfalt koyu kızıl ve buharlıdır,
 * soğudukça grileşir. Boş hücre saydamdır: arkada gökyüzü ve kesitin dekoru görünür.
 */

export const SCALE = 3;
const PW = W * SCALE;

type RGB = [number, number, number];

const BASE_RGB: Record<number, RGB> = {
  [GROUND]: [98, 72, 50],
  [BASE]: [128, 120, 106],
  [OLD]: [62, 62, 66],
  [SOIL]: [140, 98, 62],
  [GRAVEL]: [150, 145, 134],
  [SET]: [44, 44, 48],
  [WATER]: [66, 124, 176],
};
const HOT_RGB: RGB = [92, 58, 44];
const MARK: RGB = [226, 218, 190];

/** Piksel başına sabit gürültü: hücre ve alt piksel konumundan, her karede aynı. */
function hash(x: number, y: number) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Mıcır taşları: 2 piksellik iri taneler, her taşın kendi tonu. */
function stone(px: number, py: number) {
  return hash(px >> 1, py >> 1);
}

const isAir = (c: number) => c === EMPTY;

/** `snow` (0–1): karın kalınlığı; karlı havada su da buz olarak çizilir. */
export function draw(ctx: CanvasRenderingContext2D, img: ImageData, w: World, snow = 0) {
  const frozen = w.weather === 'snow';
  const d = img.data;
  const { cells, heat, flags, shade } = w;
  d.fill(0);
  // her sütunda yüzeyden derinlik: ortam gölgesi için
  const depth = new Uint8Array(W * H);
  for (let x = 0; x < W; x++) {
    let k = 0;
    for (let y = 0; y < H; y++) {
      const c = cells[y * W + x];
      k = isAir(c) || c === WATER ? 0 : Math.min(k + 1, 40);
      depth[y * W + x] = k;
    }
  }
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    if (c === EMPTY) continue;
    const y = (i / W) | 0;
    const x = i - y * W;
    let rgb: RGB;
    if (c === HOT) {
      const t = Math.max(0, Math.min(1, (heat[i] - SET_HEAT) / (255 - SET_HEAT)));
      const s = BASE_RGB[SET];
      rgb = [s[0] + (HOT_RGB[0] - s[0]) * t, s[1] + (HOT_RGB[1] - s[1]) * t, s[2] + (HOT_RGB[2] - s[2]) * t];
    } else rgb = BASE_RGB[c];
    // eski yolun şerit çizgisi: yalnızca yüzeyde, kesik kesik
    if (c === OLD && y === ROAD && ((x >> 3) & 3) === 0) rgb = MARK;

    // ışık: havaya bakan üst kenar parlar; kesit derine indikçe kararır
    const airAbove = y > 0 && isAir(cells[i - W]);
    const airLeft = x > 0 && isAir(cells[i - 1]);
    const airRight = x < W - 1 && isAir(cells[i + 1]);
    const dep = depth[i];
    let light = 1 - Math.min(0.32, dep * 0.012);
    if (flags[i] & PACKED) light *= 0.93;
    const cellTone = 1 + ((shade[i] - 128) / 128) * 0.06;

    let wetMix = 0;
    if (flags[i] & WET) wetMix = shade[i] & 1 ? 0.5 : 0.3;
    // ıslak toprak ve mıcır koyulaşır
    const damp = (flags[i] & SOAKED) !== 0 || ((c === SOIL || c === GRAVEL) && ((y > 0 && cells[i - W] === WATER) || (x > 0 && cells[i - 1] === WATER) || (x < W - 1 && cells[i + 1] === WATER)));

    for (let sy = 0; sy < SCALE; sy++) {
      for (let sx = 0; sx < SCALE; sx++) {
        const px = x * SCALE + sx;
        const py = y * SCALE + sy;
        const n = hash(px, py);
        let k = cellTone * light;
        let [r, g, b] = rgb;
        let a = 255;
        switch (c) {
          case GRAVEL: {
            // taşlar ve aralarındaki gölge
            const st = stone(px, py);
            k *= 0.72 + st * 0.5;
            if (n < 0.12) k *= 0.6;
            break;
          }
          case SOIL:
          case GROUND:
            k *= 0.9 + n * 0.2;
            if (n > 0.94) k *= 1.25; // küçük çakıl
            break;
          case BASE:
            k *= 0.8 + stone(px, py) * 0.4;
            break;
          case OLD:
          case SET:
          case HOT:
            k *= 0.94 + n * 0.1;
            // agrega: asfaltın içinde açık renk taş noktaları
            if (n > 0.9) {
              r += 40;
              g += 38;
              b += 34;
            }
            break;
          case WATER: {
            if (frozen) {
              // buz: donuk, açık mavi-beyaz, çatlak çizgili
              r = 196;
              g = 222;
              b = 236;
              k = n > 0.93 ? 0.85 : 1;
              a = 245;
              break;
            }
            // derinleştikçe koyulaşır; yüzeyi parlar
            let dd = 0;
            for (let yy = y - 1; yy >= 0 && cells[yy * W + x] === WATER && dd < 12; yy--) dd++;
            k = 1 - dd * 0.035;
            a = 170 + dd * 6;
            if (dd === 0 && sy === 0) {
              r = g = b = 225;
              a = 230;
            } else if (n > 0.97) k *= 1.2;
            break;
          }
        }
        if (wetMix) {
          r += (128 - r) * wetMix;
          g += (136 - g) * wetMix;
          b += (146 - b) * wetMix;
        }
        if (damp) k *= 0.7;
        // havaya bakan kenarlar: üstte ışık, yanlarda hafif gölge
        if (c !== WATER) {
          if (airAbove && sy === 0) k *= 1.22;
          if (airLeft && sx === 0) k *= 1.08;
          if (airRight && sx === SCALE - 1) k *= 0.85;
        }
        const o = (py * PW + px) * 4;
        d[o] = Math.min(255, r * k);
        d[o + 1] = Math.min(255, g * k);
        d[o + 2] = Math.min(255, b * k);
        d[o + 3] = a;
      }
    }
    // sıcak asfaltın buharı: yüzeyin üstünde titreşen açık pikseller
    if (c === HOT && heat[i] > 150 && airAbove && Math.random() < 0.08) {
      const px = x * SCALE + ((Math.random() * SCALE) | 0);
      const py = y * SCALE - 1 - ((Math.random() * 4) | 0);
      if (py >= 0) {
        const o = (py * PW + px) * 4;
        d[o] = d[o + 1] = d[o + 2] = 240;
        d[o + 3] = 110;
      }
    }
  }
  if (snow > 0) drawSnow(d, w, snow);
  ctx.putImageData(img, 0, 0);
}

/** Kar örtüsü: her sütunun en üst yüzeyine yığılır, kenarları hafif dalgalı. */
function drawSnow(d: Uint8ClampedArray, w: World, snow: number) {
  const { cells } = w;
  const thick = snow * SCALE * 2.4;
  for (let px = 0; px < PW; px++) {
    const x = (px / SCALE) | 0;
    let y = 0;
    while (y < H && cells[y * W + x] === EMPTY) y++;
    if (y >= H) continue;
    const top = y * SCALE;
    const t = Math.round(thick * (0.75 + hash(px >> 2, 7) * 0.5));
    for (let k = 1; k <= t; k++) {
      const py = top - k;
      if (py < 0) break;
      const o = (py * PW + px) * 4;
      const v = k === t ? 236 : 250 - hash(px, py) * 14;
      d[o] = v;
      d[o + 1] = v;
      d[o + 2] = Math.min(255, v + 6);
      d[o + 3] = 255;
    }
  }
}

export const newImage = (ctx: CanvasRenderingContext2D) => ctx.createImageData(PW, H * SCALE);
