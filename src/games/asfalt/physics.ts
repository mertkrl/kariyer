import { EMPTY, GRAVEL, H, HOT, PACKED, SET, SET_HEAT, SOAKED, SOIL, TICKS_PER_SEC, W, WATER, WET, clear, idx, swap, sinkable, type Cell, type World } from './model';
import { moveRoller } from './roller';

/*
 * Dünyanın bir adımı: taneler düşer ve yığılır, su akar ve süzülür, sıcak asfalt yayılıp soğur,
 * yağmur yağar, silindir ilerler.
 */

/** Yerçekimi (hücre/adım²) ve düşüşün son hızı (hücre/adım). */
const GRAVITY = 0.12;
const MAX_FALL = 5;

/**
 * Yerçekimi: hücre hızlanarak düşer, bir adımda hızı kadar hücre iner. Düştüyse yeni yerini,
 * duruyorsa -1 döner; durunca çarpma hızını `impact`e yazar.
 */
let impact = 0;
function fall(w: World, i: number, through: (c: Cell) => boolean): number {
  const { cells } = w;
  const v = Math.min(MAX_FALL, w.vel[i] + GRAVITY);
  const n = Math.max(1, v | 0);
  let j = i;
  for (let k = 0; k < n && j + W < cells.length && through(cells[j + W]); k++) {
    swap(w, j, j + W);
    j += W;
  }
  if (j !== i) {
    w.vel[j] = v;
    return j;
  }
  impact = w.vel[i];
  w.vel[i] = 0;
  return -1;
}

/**
 * Taneli malzeme. Yığılma açısı malzemeye göre: kuru toprak yapışkandır, ancak iki hücrelik
 * bir boşluğa dökülür (dik yamaç); mıcır yuvarlaktır, tek hücrelik boşluğa bile kayar (yayvan
 * yamaç); ıslanan toprak çamurlaşıp mıcır gibi akar. Kayan tane hız kazanır, düz yerde
 * sürtünmeyle yavaşlayarak bir süre daha yuvarlanır; sert düşen tane yana savrulur.
 */
function grain(w: World, x: number, i: number, cohesive: boolean) {
  const { cells, hvel } = w;
  const below = i + W;
  if (fall(w, i, sinkable) >= 0) return;
  if (w.flags[i] & PACKED) {
    hvel[i] = 0;
    return;
  }
  const wet = (w.flags[i] & SOAKED) !== 0 || (x > 0 && cells[i - 1] === WATER) || (x < W - 1 && cells[i + 1] === WATER) || (i >= W && cells[i - W] === WATER);
  const sticky = cohesive && !wet;
  // çarpınca yatay hız kazanır: yere sert düşen tane rastgele bir yana fırlar
  if (impact > 2) hvel[i] += (w.rng() < 0.5 ? -1 : 1) * impact * (sticky ? 0.12 : 0.3);
  const pref = hvel[i] !== 0 ? Math.sign(hvel[i]) : w.rng() < 0.5 ? -1 : 1;
  for (const dx of [pref, -pref]) {
    const nx = x + dx;
    if (nx < 0 || nx >= W) continue;
    if (!sinkable(cells[i + dx]) || !sinkable(cells[below + dx])) continue;
    const deep = below + W + dx < cells.length && sinkable(cells[below + W + dx]);
    if (sticky && !deep && Math.abs(hvel[i]) < 0.5) continue;
    swap(w, i, below + dx);
    const j = below + dx;
    hvel[j] = hvel[j] * 0.8 + dx * (sticky ? 0.25 : 0.45);
    w.vel[j] = Math.max(w.vel[j], impact * 0.3);
    return;
  }
  // düz yerde yuvarlanma: hız bitene ya da bir engele çarpana dek
  const v = hvel[i];
  if (Math.abs(v) > 0.3) {
    const dx = Math.sign(v);
    const nx = x + dx;
    hvel[i] = v * (sticky ? 0.35 : 0.7);
    if (nx >= 0 && nx < W && sinkable(cells[i + dx]) && w.rng() < Math.abs(v)) swap(w, i, i + dx);
    return;
  }
  hvel[i] = 0;
}

const SPREAD = 6;
/** Asfaltın soğuma hızı çarpanı: 1 iken yazın sıkıştırma süresi ~15 sn, 0,6 iken ~25 sn. */
const COOL_SCALE = 0.6;

function water(w: World, x: number, i: number) {
  const { cells } = w;
  const below = i + W;
  if (fall(w, i, (c) => c === EMPTY) >= 0) return;
  // geçirgenlik: su mıcırın boşluklarından aşağı süzülür ama kaybolmaz, mıcırın dibinde birikir
  // (mıcır suya batar, su yukarı çıkar). Toprak suyu bir kez emer ve doyar; doymuş toprak emmez,
  // su üstünde göllenir. Çukurdaki su ancak su motoruyla ya da yolun ucundan akarak gider.
  const under = cells[below];
  if (under === GRAVEL && w.rng() < 0.06) return swap(w, i, below);
  if (under === SOIL && !(w.flags[below] & SOAKED) && w.rng() < 0.015) {
    w.flags[below] |= SOAKED;
    w.flags[below] &= ~PACKED;
    return clear(w, i);
  }
  const d = w.rng() < 0.5 ? -1 : 1;
  for (const dx of [d, -d]) {
    const nx = x + dx;
    if (nx < 0 || nx >= W) return clear(w, i); // yolun ucundan akıp gider
    if (cells[below + dx] === EMPTY) return swap(w, i, below + dx);
  }
  for (const dx of [d, -d]) {
    // su yatayda hızlı yayılır: yüzeyi düzleşene dek kenara akar
    for (let k = 1; k <= SPREAD; k++) {
      const nx = x + dx * k;
      if (nx < 0 || nx >= W) return clear(w, i);
      if (cells[i + dx * k] !== EMPTY) {
        if (k > 1) return swap(w, i, i + dx * (k - 1));
        break;
      }
      if (k === SPREAD || cells[below + dx * k] === EMPTY) return swap(w, i, i + dx * k);
    }
  }
}

function asphalt(w: World, x: number, y: number, i: number) {
  const { cells, heat, flags } = w;
  // soğuma: havaya bakan yüz daha çabuk soğur, suya değen bir anda soğur ve sulanır
  let cool = w.rng() < 0.12 ? 1 : 0;
  if (w.spec.cold && w.rng() < w.spec.cold) cool++;
  if (y > 0 && cells[i - W] === EMPTY && w.rng() < 0.15) cool++;
  const touchesWater = cells[i + W] === WATER || (y > 0 && cells[i - W] === WATER) || (x > 0 && cells[i - 1] === WATER) || (x < W - 1 && cells[i + 1] === WATER);
  if (touchesWater) {
    cool += 6;
    if (!(flags[i] & WET)) {
      flags[i] |= WET;
      w.events.add('wet');
    }
  }
  // ısı iletimi: soğuk zemine değen yüz ısı kaybeder, sıcak komşuyla ısı paylaşılır
  for (const j of [i + W, i - 1, i + 1]) {
    if (j < 0 || j >= cells.length) continue;
    const c = cells[j];
    if (c === HOT || c === SET) {
      // ısı sıcaktan soğuğa akar, toplamı korunur (donmuş komşu ısıyı yalnızca alır)
      const t = Math.trunc((heat[j] - heat[i]) / 8);
      heat[i] += t;
      if (c === HOT) heat[j] -= t;
      else if (t < 0) heat[j] = Math.min(SET_HEAT - 1, heat[j] - t);
    } else if (c !== EMPTY && c !== WATER && w.rng() < 0.1) cool++;
  }
  // asfalt kalın serilmiş bir kütle: soğuması dakikalar sürer, oyunda yazın ~25 sn sıkıştırılabilir
  if (cool > 0 && cool < 6 && w.rng() > COOL_SCALE) cool = 0;
  heat[i] = Math.max(0, heat[i] - cool);
  if (heat[i] < SET_HEAT) {
    cells[i] = SET;
    return;
  }
  const below = i + W;
  if (fall(w, i, sinkable) >= 0) return;
  if (flags[i] & PACKED) return;
  const d = w.rng() < 0.5 ? -1 : 1;
  // sıcak karışım taneli bir kütledir: bal gibi akmaz, biraz yığılır; kürek ve tırmıkla yayılır
  if (impact > 2 || w.rng() < 0.3) {
    for (const dx of [d, -d]) {
      const nx = x + dx;
      if (nx < 0 || nx >= W) continue;
      if (sinkable(cells[below + dx]) && sinkable(cells[i + dx])) return swap(w, i, below + dx);
    }
  }
  // sıcakken yayılır: sıcaklık düştükçe ağırlaşır
  const flow = ((heat[i] - 90) / 165) * 0.1;
  if (flow > 0 && w.rng() < flow) {
    const nx = x + d;
    if (nx >= 0 && nx < W && cells[i + d] === EMPTY) return swap(w, i, i + d);
  }
}

/** Dünyayı bir adım ilerletir: aşağıdan yukarı tarar, yönü her adımda değişir. */
export function step(w: World) {
  w.tick++;
  const t = w.tick & 255;
  const ltr = (w.tick & 1) === 0;
  const { cells, stamp } = w;
  for (let y = H - 2; y >= 0; y--) {
    for (let k = 0; k < W; k++) {
      const x = ltr ? k : W - 1 - k;
      const i = y * W + x;
      const c = cells[i];
      if (c < SOIL || c === SET || stamp[i] === t) continue;
      if (c === WATER) water(w, x, i);
      else if (c === HOT) asphalt(w, x, y, i);
      else grain(w, x, i, c === SOIL);
    }
  }
  rain(w);
  moveRoller(w);
}

export const raining = (w: World) => w.tick < (w.spec.rainSec ?? 0) * TICKS_PER_SEC;

function rain(w: World) {
  // trafik senaryosunun sağanağı işin yağmurundan sert yağar
  const storm = w.weather === 'rain';
  if (!storm && !raining(w)) return;
  for (let k = 0; k < (storm ? 7 : 3); k++) {
    if (w.rng() < 0.5) continue;
    const i = idx((w.rng() * W) | 0, 0);
    if (w.cells[i] === EMPTY) w.cells[i] = WATER;
  }
}
