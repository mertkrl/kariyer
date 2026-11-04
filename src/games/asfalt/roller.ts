import { EMPTY, GRAVEL, H, HOT, PACKED, ROAD, ROLLER_W, SET, SHRUNK, SOAKED, SOIL, W, clear, idx, lose, movable, surfaceAt, swap, type World } from './model';

/*
 * Silindir: yola iner, hızlanıp frenler, titreşimli ya da statik sıkıştırır; sıcak asfaltı ezer,
 * önündeki gevşek malzemeyi iter.
 */

/** Silindiri yola indirir ya da hedefini değiştirir. */
export function driveRoller(w: World, target: number) {
  const t = Math.max(0, Math.min(W - ROLLER_W, target));
  if (!w.roller) w.roller = { x: t < W / 2 ? 0 : W - ROLLER_W, y: ROAD, target: t, blocked: false, v: 0, vibe: true, idle: 0 };
  else w.roller.target = t;
}

/** Titreşimi açar ya da kapatır. */
export function toggleVibe(w: World) {
  if (w.roller) w.roller.vibe = !w.roller.vibe;
}

/** En yüksek hız, ivme ve fren (hücre/adım): tandem silindir yürüyüş hızında gider. */
export const ROLLER_MAX = 0.4;
const ROLLER_ACCEL = 0.012;
const ROLLER_BRAKE = 0.02;

export function moveRoller(w: World) {
  const r = w.roller;
  if (!r) return;
  r.blocked = false;
  // hedefe göre ivmelen ya da frene bas: durma mesafesi v²/2a kadar önce yavaşlamaya başlar
  const gap = r.target - r.x;
  const stop = (r.v * r.v) / (2 * ROLLER_BRAKE);
  const want = Math.abs(gap) < 0.05 ? 0 : Math.sign(gap) * (Math.abs(gap) <= stop + 0.05 ? 0 : ROLLER_MAX);
  if (Math.sign(want) !== Math.sign(r.v) && r.v !== 0) r.v = Math.sign(r.v) * Math.max(0, Math.abs(r.v) - ROLLER_BRAKE);
  else if (Math.abs(want) > Math.abs(r.v)) r.v = Math.sign(want) * Math.min(ROLLER_MAX, Math.abs(r.v) + ROLLER_ACCEL);
  else r.v = Math.sign(r.v) * Math.max(0, Math.abs(r.v) - ROLLER_BRAKE);
  // hedefe çok yakın ve yavaşken tam hedefte durur
  if (Math.abs(gap) < 0.4 && Math.abs(r.v) <= ROLLER_BRAKE) {
    r.x = r.target;
    r.v = 0;
  }
  const dir = Math.sign(r.v);
  if (dir !== 0) {
    const next = Math.max(0, Math.min(W - ROLLER_W, r.x + r.v));
    // önüne gelen sütunda yol hizasının üstünde donmuş asfalt varsa çıkamaz
    const lead = dir > 0 ? Math.floor(next) + ROLLER_W - 1 : Math.floor(next);
    if (lead !== (dir > 0 ? Math.floor(r.x) + ROLLER_W - 1 : Math.floor(r.x)) && hasSetAbove(w, lead)) {
      r.blocked = true;
      r.target = r.x;
      r.v = 0;
      w.events.add('blocked');
    } else r.x = next;
  }
  const moving = Math.abs(r.v) > 0.05;
  r.idle = moving ? 0 : r.idle + 1;
  const x0 = Math.floor(r.x);
  const front = dir < 0 ? x0 - 1 : x0 + ROLLER_W;
  // tambur altındaki en yüksek noktaya oturur: çukur tamburdan genişse içine iner, yerçekimiyle
  const ground = rollerGround(w, x0);
  r.y = ground > r.y ? Math.min(ground, r.y + 0.6) : ground;
  // sıkıştırma geçişle artar: yavaş geçen tambur daha çok sıkıştırır, duran tambur sıkıştırmaz
  const rate = moving ? (r.vibe ? VIBE_RATE : STATIC_RATE) * (ROLLER_MAX / Math.max(0.15, Math.abs(r.v))) * 0.6 : 0;
  const depth = r.vibe ? COMPACT_DEPTH : STATIC_DEPTH;
  for (let x = x0; x < x0 + ROLLER_W; x++) {
    // tamburun önüne katılan: yol hizasından OVERFILL hücreden yüksekte kalan her şey. Duran
    // tambur bir şey itmez; üstüne dökülen ancak yürüyünce önüne katılır
    if (moving)
      for (let y = 0; y < ROAD - OVERFILL; y++) {
        const i = idx(x, y);
        if (movable(w.cells[i]) || w.cells[i] === SET) shove(w, i, front, y);
      }
    // tamburun değmediği, daha derinde kalan sütun sıkışmaz
    if (rate > 0 && surfaceAt(w, x) <= r.y + REACH) compact(w, x, rate, depth);
    // yol hizasının biraz üstüne serilen fazlalık önce tamburun altında sıkışıp çöker (sıkışma
    // payı); sıkıştığı ya da soğuduğu hâlde hâlâ yol hizasının üstünde kalanı tambur düzler.
    // Donmuş asfalt itilmez, tümsek olarak kalır
    if (moving)
      for (let y = ROAD - OVERFILL; y < ROAD; y++) {
        const i = idx(x, y);
        const c = w.cells[i];
        if (movable(c) && (w.flags[i] & PACKED || (c === HOT && w.heat[i] < COMPACT_HEAT))) shove(w, i, front, y);
      }
  }
  // titreşimli tambur sıcak asfaltın üstünde durursa yüzeyi oyar: tambur izi
  if (!moving && r.vibe && r.idle > 0 && r.idle % 45 === 0) {
    const mid = x0 + (ROLLER_W >> 1);
    const top = surfaceAt(w, mid);
    const i = idx(mid, Math.min(H - 1, top));
    if (w.cells[i] === HOT && w.heat[i] >= COMPACT_HEAT && top <= ROAD + 1) {
      for (const dx of [-2, -1, 0, 1, 2]) {
        const t = surfaceAt(w, mid + dx);
        const j = idx(mid + dx, Math.min(H - 1, t));
        if (w.cells[j] === HOT) shove(w, j, mid + dx + (dx < 0 ? -3 : 3), t);
      }
      w.events.add('rollerMark');
    }
  }
}

/**
 * Silindir sütunu sıkıştırır, ama gerçekteki gibi:
 * - yalnızca yüzeyden COMPACT_DEPTH hücre derine işler; kalın dolgu tek seferde sıkışmaz,
 *   katman katman serilip her kat silindirlenmelidir;
 * - gevşek malzeme sıkışınca hacim kaybeder (SHRINK): yüzey alçalır, bu yüzden yol hizasının
 *   biraz üstüne kadar fazla dökülür;
 * - asfalt yalnızca sıcakken (COMPACT_HEAT üstü) sıkışır; soğumuş asfalt silindirle düzelmez.
 */
export function compact(w: World, x: number, rate = 100, depth = COMPACT_DEPTH) {
  const top = surfaceAt(w, x);
  if (top >= H) return;
  let loss = 0;
  for (let y = top; y < Math.min(H, top + depth); y++) {
    const i = idx(x, y);
    const c = w.cells[i];
    if (c !== SOIL && c !== GRAVEL && c !== HOT && c !== SET) break;
    if (w.flags[i] & PACKED) continue;
    if (c === SET || (c === HOT && w.heat[i] < COMPACT_HEAT)) continue;
    // suya doymuş toprak sıkışmaz: su kurumadan silindir boşa döner
    if (w.flags[i] & SOAKED) continue;
    // derindeki hücreye yük azalarak iner: yüzeyin hemen altı en hızlı sıkışır
    const k = 1 - ((y - top) / depth) * 0.5;
    w.dens[i] = Math.min(100, w.dens[i] + Math.max(1, Math.round(rate * k)));
    if (w.dens[i] < DENSE) continue;
    w.flags[i] |= PACKED;
    // hacim kaybı bir kez: yerinden oynayıp yeniden sıkışan malzeme ikinci kez küçülmez
    if (!(w.flags[i] & SHRUNK)) {
      w.flags[i] |= SHRUNK;
      loss += SHRINK[c];
    }
  }
  w.shrink[x] += loss;
  // biriken hacim kaybı bir hücreyi bulunca sütunun tepesinden bir hücre eksilir
  while (w.shrink[x] >= 1) {
    w.shrink[x] -= 1;
    const t = surfaceAt(w, x);
    if (t >= H) break;
    const i = idx(x, t);
    if (w.cells[i] !== SOIL && w.cells[i] !== GRAVEL && w.cells[i] !== HOT) break;
    // tepedeki hücre gider, altındaki sıkışmış hücrelere dokunulmaz
    clear(w, i);
  }
}

/** Tamburun ezdiği fazla dolgu yüksekliği (hücre) ve sıkıştırma derinliği: titreşimli ve statik. */
const OVERFILL = 3;
const COMPACT_DEPTH = 10;
const STATIC_DEPTH = 5;
/**
 * Sıkışma artışı (adım başına, en yüksek hızda): tambur bir sütunun üstünden ~40 adımda geçer.
 * Titreşimli iki-üç geçiş, statik dört-beş geçiş tam sıkıştırır. Yavaş gidince daha çok sıkışır.
 */
const VIBE_RATE = 1.6;
const STATIC_RATE = 0.9;
/** Bu sıkışmanın üstü PACKED sayılır (% Proctor ≈ 97). */
export const DENSE = 90;
/** Asfalt bu sıcaklığın altında sıkışmaz (SET_HEAT donma, 255 serim sıcaklığı). */
export const COMPACT_HEAT = 95;
/** Sıkışınca hacim kaybı: gevşek dolgu ve sıcak karışım. */
const SHRINK: Record<number, number> = { [SOIL]: 0.22, [GRAVEL]: 0.15, [HOT]: 0.2 };

/** Titreşimli tambur, oturduğu noktadan bu kadar derindeki çukurluğu da sıkıştırır (hücre). */
const REACH = 3;

/** Tamburun altındaki en yüksek yüzey (su sayılmaz); yol hizasının üstündeki fazlalık sayılmaz, onu tambur ezer. */
export function rollerGround(w: World, x0: number) {
  let g = H - 1;
  for (let x = Math.max(0, x0); x < Math.min(W, x0 + ROLLER_W); x++) g = Math.min(g, surfaceAt(w, x));
  return Math.max(ROAD, g);
}

/** Silindir ince donmuş tabakayı ezer geçer; üç hücreyi bulan donmuş tümsekte durur. */
const CRUSH = 2;

function hasSetAbove(w: World, x: number) {
  if (x < 0 || x >= W) return false;
  let n = 0;
  for (let y = 0; y < ROAD; y++) if (w.cells[idx(x, y)] === SET) n++;
  return n > CRUSH;
}

/** Silindirin altında kalanı önündeki sütuna, boş bulduğu ilk yere iter; yolun dışına iterse gider. */
function shove(w: World, i: number, fx: number, y: number) {
  if (fx < 0 || fx >= W) {
    lose(w, i);
    clear(w, i);
    return;
  }
  for (let yy = y; yy >= 0; yy--) {
    const j = idx(fx, yy);
    if (w.cells[j] === EMPTY) {
      swap(w, i, j);
      return;
    }
  }
  lose(w, i);
  clear(w, i);
}
