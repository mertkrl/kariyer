import { BASE, CM_PER_CELL, EMPTY, GRAVEL, GROUND, H, HOT, OLD, PACKED, ROAD, RUBBLE, SET, SOIL, TACK, W, WATER, idx, readColumn, surfaceAt, tempC, type World } from './model';
import { TRAFFIC_HEAT, soilIntrusion } from './traffic';
import { bondOf, rubbleLeft } from './tools';

/*
 * Çukura bakmak: hacmi, şişle ölçülen katmanlar, iş sırasının kontrol listesi ve yüzey sıcaklığı.
 */

/** Çukurun yol hizasına kadar hacmi: ödenek ve kaba tahmin için. */
export function holeVolume(w: World) {
  let v = 0;
  for (let x = w.hole[0]; x <= w.hole[1]; x++) for (let y = ROAD; y < H; y++) if (w.cells[idx(x, y)] === EMPTY || w.cells[idx(x, y)] === WATER) v++;
  return v;
}

// --- ölçüm ve iş sırası ---

export interface ProbeLayer {
  name: string;
  cm: number;
  /** Gevşek dolguda sıkışma (% Proctor): 98 tam sıkışmış, 85 hiç silindir görmemiş. */
  proctor?: number;
  /** Asfaltta ortalama sıcaklık (°C). */
  temp?: number;
  tacked?: boolean;
}

export interface Probe {
  x: number;
  /** Yüzeyin yol hizasından sapması (mm): artı tümsek, eksi çukur. */
  deviation: number;
  layers: ProbeLayer[];
  /** Taşıyıcı tabaka: yüzeyden ilk toprağa (ya da tabii zemine) kadar asfalt ve mıcır (cm). */
  carrier: number;
}

const LAYER_NAME: Record<number, string> = { [HOT]: 'Asfalt', [SET]: 'Asfalt', [GRAVEL]: 'Mıcır', [SOIL]: 'Toprak dolgu', [WATER]: 'Su', [OLD]: 'Eski asfalt', [BASE]: 'Eski temel', [GROUND]: 'Tabii zemin' };

/**
 * Karot: sütunu yüzeyden aşağı okur, katman katman kalınlık (cm), gevşek dolguda sıkışma
 * (% Proctor), asfaltta sıcaklık (°C). Moloz ayrı katman sayılır. Tabii zemine inince durur.
 */
export function probe(w: World, cx: number): Probe {
  const x = Math.max(0, Math.min(W - 1, Math.round(cx)));
  const surface = surfaceAt(w, x);
  let y = 0;
  while (y < H && w.cells[idx(x, y)] === EMPTY) y++;
  const layers: ProbeLayer[] = [];
  let cur: { name: string; n: number; packed: number; heat: number; loose: boolean; tack: boolean } | null = null;
  const flush = () => {
    if (!cur) return;
    const l: ProbeLayer = { name: cur.name, cm: Math.round(cur.n * CM_PER_CELL * 10) / 10 };
    if (cur.loose) l.proctor = Math.round(85 + (13 * cur.packed) / cur.n);
    if (cur.name === 'Asfalt') l.temp = tempC(cur.heat / cur.n);
    if (cur.tack) l.tacked = true;
    layers.push(l);
    cur = null;
  };
  for (; y < H; y++) {
    const i = idx(x, y);
    const c = w.cells[i];
    if (c === EMPTY) continue;
    const name = c === SOIL && w.flags[i] & RUBBLE ? 'Moloz' : LAYER_NAME[c];
    if (!cur || cur.name !== name) {
      flush();
      if (c === GROUND) {
        layers.push({ name, cm: 0 });
        break;
      }
      cur = { name, n: 0, packed: 0, heat: 0, loose: c === SOIL || c === GRAVEL || c === HOT || c === SET, tack: false };
    }
    cur.n++;
    cur.packed += w.dens[i] / 100;
    if (w.flags[i] & TACK) cur.tack = true;
    cur.heat += c === HOT || c === SET ? w.heat[i] : 0;
  }
  flush();
  let c = surface;
  while (c < H && w.cells[idx(x, c)] !== SOIL && w.cells[idx(x, c)] !== GROUND) c++;
  return { x, deviation: Math.round((ROAD - surface) * CM_PER_CELL * 10), layers, carrier: Math.round((c - surface) * CM_PER_CELL * 10) / 10 };
}

export type StepKey = 'water' | 'cut' | 'rubble' | 'base' | 'tack' | 'asphalt' | 'roll' | 'cool';

/**
 * İş sırasının durumu: sahada kontrol mühendisinin baktığı gibi. Arayüz biten adımı işaretler;
 * puan yine trafikten sonra verilir.
 */
export function checklist(w: World): Record<StepKey, boolean> {
  const [h0, h1] = w.hole;
  let water = 0;
  let deep = 0;
  let asphaltCols = 0;
  let packedTop = 0;
  let hot = 0;
  const n = h1 - h0 + 1;
  for (let x = h0; x <= h1; x++) {
    for (let y = 0; y < H; y++) if (w.cells[idx(x, y)] === WATER) water++;
    const col = readColumn(w, x);
    // dolgu: asfaltlık yer kalacak kadar dolu, taşıyıcı bölgede toprak yok, asfaltın altı sıkışmış
    let loose = 0;
    for (let y = col.surface + col.asphalt; y < H; y++) {
      const c = w.cells[idx(x, y)];
      if (c !== SOIL && c !== GRAVEL) break;
      if (!(w.flags[idx(x, y)] & PACKED)) loose++;
    }
    if ((col.asphalt === 0 && col.surface > ROAD + 6) || soilIntrusion(w, x, col.surface) >= 0.5 || loose > 3) deep++;
    if (col.asphalt >= 3 && col.surface <= ROAD + 1) asphaltCols++;
    if (col.asphalt > 0 && w.flags[idx(x, col.surface)] & PACKED) packedTop++;
    for (let y = col.surface; y < col.surface + col.asphalt; y++) if (w.cells[idx(x, y)] === HOT && w.heat[idx(x, y)] > TRAFFIC_HEAT) hot++;
  }
  const bond = bondOf(w);
  // asfalt dökülmeden önce taban: sütunların yüzeyi sürülmüş mü
  let topTacked = 0;
  for (let x = h0; x <= h1; x++) if (w.flags[idx(x, Math.min(H - 1, surfaceAt(w, x)))] & TACK) topTacked++;
  const baseTack = bond.cols > 0 ? bond.base : topTacked / n;
  return {
    water: water === 0,
    cut: w.cuts.left !== null && w.cuts.right !== null,
    rubble: rubbleLeft(w) === 0,
    base: deep === 0,
    tack: bond.left && bond.right && baseTack >= 0.7,
    asphalt: asphaltCols >= n * 0.9,
    roll: asphaltCols > 0 && packedTop >= asphaltCols * 0.8,
    cool: asphaltCols > 0 && hot === 0,
  };
}

/**
 * Yamanın yüzey sıcaklığı (°C): her sütunun en üstteki yeni asfalt hücresi. Silindirin değdiği
 * yer burası; içi sıcak kalsa da yüzey donduysa sıkışmaz. Yüzeyde yeni asfalt yoksa null.
 */
export function surfaceTemp(w: World): number | null {
  let sum = 0;
  let n = 0;
  let hot = false;
  for (let x = w.hole[0]; x <= w.hole[1]; x++) {
    const i = idx(x, Math.min(H - 1, surfaceAt(w, x)));
    if (w.cells[i] !== HOT && w.cells[i] !== SET) continue;
    if (w.cells[i] === HOT) hot = true;
    sum += w.heat[i];
    n++;
  }
  return n && hot ? tempC(sum / n) : null;
}

/** Çukurdaki sıcak asfaltın ortalama sıcaklığı (°C); sıcak asfalt yoksa null. */
export function patchTemp(w: World): number | null {
  let sum = 0;
  let n = 0;
  for (let x = w.hole[0]; x <= w.hole[1]; x++)
    for (let y = 0; y < H; y++) {
      const i = idx(x, y);
      if (w.cells[i] === HOT) {
        sum += w.heat[i];
        n++;
      }
    }
  return n ? tempC(sum / n) : null;
}
