import { EMPTY, GRAVEL, H, HOT, MATERIAL_CELL, OLD, PRICE, ROAD, RUBBLE, SAW_PRICE, SET, SOIL, TACK, TACK_PRICE, W, WATER, idx, readColumn, surfaceAt, type Material, type World, movable, lose, clear, swap } from './model';
import { compact } from './roller';

/*
 * Ustanın elindeki araçlar: dökmek, kazmak, oluktan doldurmak, tırmıklamak, tokmaklamak, suyu
 * çekmek, kenarı kesmek, yapıştırıcı püskürtmek; işin maliyeti, kalan moloz ve kenar bağı.
 */

/** İmlecin çevresine malzeme döker: yalnızca boş hücrelere, adım başına birkaç hücre. */
export function pour(w: World, mat: Material, cx: number, cy: number, radius = 3, count = 5) {
  let placed = 0;
  for (let k = 0; k < count * 3 && placed < count; k++) {
    const a = w.rng() * Math.PI * 2;
    const r = Math.sqrt(w.rng()) * radius;
    const x = Math.round(cx + Math.cos(a) * r);
    const y = Math.round(cy + Math.sin(a) * r);
    if (x < 0 || x >= W || y < 0 || y >= H) continue;
    const i = idx(x, y);
    if (w.cells[i] !== EMPTY) continue;
    w.cells[i] = MATERIAL_CELL[mat];
    w.heat[i] = mat === 'asphalt' ? 255 : 0;
    w.flags[i] = 0;
    placed++;
  }
  w.used[mat] += placed;
  return placed;
}

/** Kürek: gevşek her şeyi alır; donmuş asfaltı ancak kazmayla, yavaş yavaş. Eski yola dokunmaz. */
export function dig(w: World, cx: number, cy: number, radius = 4) {
  let removed = 0;
  for (let y = Math.max(0, Math.round(cy - radius)); y <= Math.min(H - 1, Math.round(cy + radius)); y++) {
    for (let x = Math.max(0, Math.round(cx - radius)); x <= Math.min(W - 1, Math.round(cx + radius)); x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > radius * radius) continue;
      const i = idx(x, y);
      const c = w.cells[i];
      if (movable(c) || (c === SET && w.rng() < 0.12)) {
        lose(w, i);
        clear(w, i);
        removed++;
      }
    }
  }
  return removed;
}

/** Kamyonun döküm oluğunun yüksekliği (satır): malzeme buradan akar, yerçekimiyle iner. */
export const CHUTE_Y = ROAD - 24;

/** Her malzemenin mastar ipi (satır): toprak 30 cm altta, mıcır 7,5 cm altta, asfalt sıkışma payıyla 2,5 cm üstte. */
export const FILL_TO: Record<Material, number> = { soil: ROAD + 12, gravel: ROAD + 3, asphalt: ROAD - 1 };

/**
 * Oluğun ölçü kesicisi: oluğun altındaki sütunlar (düşmekte olan malzeme de sayılarak) o malzemenin
 * ipine gelince kamyon dökmeyi keser. Fazla malzeme hiç yola çıkmaz; oyuncu oluğu boş yere çevirir.
 */
export function chuteFull(w: World, mat: Material, cx: number, radius = 2) {
  const x0 = Math.max(0, Math.round(cx - radius));
  const x1 = Math.min(W - 1, Math.round(cx + radius));
  let top = 0;
  let falling = 0;
  for (let x = x0; x <= x1; x++) {
    // oturmuş yüzey: alttan yukarı ilk boşluğa kadar; üstündekiler havada, düşüyor
    let y = H - 1;
    while (y >= 0 && w.cells[idx(x, y)] !== EMPTY && w.cells[idx(x, y)] !== WATER) y--;
    top += y + 1;
    for (let k = y; k >= CHUTE_Y; k--) {
      const c = w.cells[idx(x, k)];
      if (c !== EMPTY && c !== WATER) falling++;
    }
  }
  const n = x1 - x0 + 1;
  return top / n - falling / n <= FILL_TO[mat];
}

/**
 * Tırmık (tesviye): imlecin iki yanındaki en yüksek sütunun tepesindeki gevşek malzemeyi en
 * alçak sütunun üstüne çeker. Malzeme kaybolmaz; tırmıklanan yer gevşer, yeniden sıkıştırılmalı.
 */
export function rake(w: World, cx: number, radius = 6, moves = 2) {
  let n = 0;
  for (let k = 0; k < moves; k++) {
    let hi = -1;
    let lo = -1;
    for (let x = Math.max(0, Math.round(cx - radius)); x <= Math.min(W - 1, Math.round(cx + radius)); x++) {
      const s = surfaceAt(w, x);
      if (s >= H) continue;
      if (hi < 0 || s < surfaceAt(w, hi)) hi = x;
      if (lo < 0 || s > surfaceAt(w, lo)) lo = x;
    }
    if (hi < 0 || lo < 0 || surfaceAt(w, lo) - surfaceAt(w, hi) < 2) break;
    const i = idx(hi, surfaceAt(w, hi));
    const c = w.cells[i];
    if (c !== SOIL && c !== GRAVEL && c !== HOT) break;
    const j = idx(lo, surfaceAt(w, lo) - 1);
    if (w.cells[j] !== EMPTY) break;
    swap(w, i, j);
    n++;
  }
  return n;
}

/**
 * Tokmak (kurbağa): silindirin inemediği dar hendekte ve kenar diplerinde kullanılır. İmlecin
 * altındaki yedi sütunu yüzeyden 20 cm derine kadar sıkıştırır; yalnızca yüzeye yakınken.
 */
export function tamp(w: World, cx: number, cy: number) {
  let n = 0;
  for (let x = Math.max(0, Math.round(cx - 3)); x <= Math.min(W - 1, Math.round(cx + 3)); x++) {
    if (Math.abs(surfaceAt(w, x) - cy) > 6) continue;
    compact(w, x, TAMP_RATE, TAMP_DEPTH);
    n++;
  }
  return n;
}

/** Tokmağın adım başına sıkıştırması ve derinliği: 20 cm.lik bir katı birkaç saniyede sıkıştırır. */
const TAMP_RATE = 1.2;
const TAMP_DEPTH = 8;

/** Su motoru: çevresindeki suyu çeker. */
export function pump(w: World, cx: number, cy: number, radius = 6) {
  let removed = 0;
  for (let y = Math.max(0, Math.round(cy - radius)); y <= Math.min(H - 1, Math.round(cy + radius)); y++) {
    for (let x = Math.max(0, Math.round(cx - radius)); x <= Math.min(W - 1, Math.round(cx + radius)); x++) {
      const i = idx(x, y);
      if (w.cells[i] === WATER && (x - cx) ** 2 + (y - cy) ** 2 <= radius * radius) {
        clear(w, i);
        removed++;
      }
    }
  }
  return removed;
}

const exposed = (w: World, x: number, y: number) => (y > 0 && w.cells[idx(x, y - 1)] === EMPTY) || (x > 0 && w.cells[idx(x - 1, y)] === EMPTY) || (x < W - 1 && w.cells[idx(x + 1, y)] === EMPTY);

/**
 * Yapıştırıcı: bitüm emülsiyonu havaya bakan yüzlere (taban ve kesim kenarı) püskürtülür. Suya,
 * sıcak asfalta ve zaten sürülmüş yüze sürülmez. Üstüne dökülen asfalt buna yapışır.
 */
export function spray(w: World, cx: number, cy: number, radius = 4) {
  let n = 0;
  for (let y = Math.max(0, Math.round(cy - radius)); y <= Math.min(H - 1, Math.round(cy + radius)); y++)
    for (let x = Math.max(0, Math.round(cx - radius)); x <= Math.min(W - 1, Math.round(cx + radius)); x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > radius * radius) continue;
      const i = idx(x, y);
      const c = w.cells[i];
      if (c === EMPTY || c === WATER || c === HOT || w.flags[i] & TACK || !exposed(w, x, y)) continue;
      w.flags[i] |= TACK;
      n++;
    }
  w.tackUsed += n;
  return n;
}

/** İşin bedeli: malzeme, yapıştırıcı ve kesimler. */
export function costOf(w: World) {
  const cuts = (w.cuts.left !== null ? 1 : 0) + (w.cuts.right !== null ? 1 : 0);
  return (Object.keys(w.used) as Material[]).reduce((s, m) => s + w.used[m] * PRICE[m], 0) + w.tackUsed * TACK_PRICE + cuts * SAW_PRICE;
}

/** Çukurda kalan moloz (hücre). */
export function rubbleLeft(w: World) {
  let n = 0;
  for (let x = w.hole[0]; x <= w.hole[1]; x++) for (let y = ROAD; y < H; y++) if (w.flags[idx(x, y)] & RUBBLE && w.cells[idx(x, y)] === SOIL) n++;
  return n;
}

/**
 * Yapışma: kesim kenarlarının (iki yanın eski asfalt yüzü) ve asfaltın oturduğu tabanın
 * yapıştırıcılı olup olmadığı. Kenar, dört satırının en az ikisi sürülmüşse yapışık sayılır.
 */
export function bondOf(w: World) {
  const edge = (x: number) => {
    if (x < 0 || x >= W) return false;
    let n = 0;
    for (let y = ROAD; y < ROAD + 4; y++) if (w.cells[idx(x, y)] === OLD && w.flags[idx(x, y)] & TACK) n++;
    return n >= 2;
  };
  let cols = 0;
  let tacked = 0;
  for (let x = w.hole[0]; x <= w.hole[1]; x++) {
    const col = readColumn(w, x);
    if (col.asphalt === 0) continue;
    cols++;
    const under = idx(x, Math.min(H - 1, col.surface + col.asphalt));
    if (w.flags[under] & TACK) tacked++;
  }
  return { left: edge(w.hole[0] - 1), right: edge(w.hole[1] + 1), base: cols ? tacked / cols : 0, cols, untacked: cols - tacked };
}
