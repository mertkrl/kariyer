/*
 * Teneffüs oyunları: adam asmaca (toplantı asmaca), noktalar ve kutular, kâğıt futbolu. Oyuncu
 * bilgisayara karşı oynar. Saf mantıktır, test edilebilir; rastgelelik dışarıdan verilir.
 *
 * Adam asmaca: kurumsal bir sözcük. Her yanlış harf takvime bir toplantı daveti ekler; takvim
 * dolunca (MAX_WRONG) oyun biter.
 *
 * Noktalar ve kutular: DOT_N×DOT_N nokta. Sırası gelen iki komşu nokta arasına çizgi çeker; bir
 * kutunun dördüncü kenarını çeken kutuyu alır ve bir daha oynar. Bilgisayar alabileceği kutuyu
 * alır, yoksa rakibine üç kenarlı kutu bırakmayan bir çizgi arar, o da yoksa en az kutu veren
 * çizgiyi çeker.
 *
 * Demir para futbolu, yandan: masa (zemin) yatay bir çizgidir. Para solda zeminde dik durur;
 * kale sağda zemine dik basan iki parmaktır. Paraya fiske vurulunca para döne döne havalanır ve
 * yay (ters U) çizer: kaleye düz gidilemez, ön parmak yolu keser; bombeli atılır, para iki parmağın
 * arasına düşerse goldür. Parmağa çarpan seker, zemine düşen sekip kayar ve durur, masadan çıkan
 * düşer. Bölüm bölüm zorlaşır (LEVELS): kale uzaklaşır ve daralır, rüzgâr parayı iter, arada bir
 * kitap durur, el sallanır, üstte alçak bir raf yüksek bombeyi keser. İleri bölümlerde kale iki
 * elle kurulur: kenardaki iki parmak direk, ortadaki parmak kalecidir ve durmadan sağa sola gider;
 * para iki aralıktan birine düşerse goldür. Her bölüm beş atıştır; yeterince gol atan geçer.
 */

export type PaperKind = 'asmaca' | 'kutu' | 'futbol';
export const PAPER_TITLES: Record<PaperKind, string> = { asmaca: 'Toplantı asmaca', kutu: 'Noktalar ve kutular', futbol: 'Demir para futbolu' };

// --- Adam asmaca ---

export const ALPHABET = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'.split('');
export const MAX_WRONG = 7;

export const WORDS = [
  'SİNERJİ',
  'HİZALANMA',
  'ÇEVİK',
  'PAYDAŞ',
  'VİZYON',
  'MİSYON',
  'İNOVASYON',
  'DÖNÜŞÜM',
  'VERİMLİLİK',
  'STRATEJİ',
  'MOTİVASYON',
  'PERFORMANS',
  'ÖNCELİKLENDİRME',
  'KATMA DEĞER',
  'YOL HARİTASI',
  'GERİ BİLDİRİM',
  'BEYİN FIRTINASI',
  'KONFOR ALANI',
  'ÇEYREK HEDEFİ',
  'ODAK',
  'ETKİLEŞİM',
  'ÖLÇEKLENME',
  'KAZAN KAZAN',
  'DİJİTAL DÖNÜŞÜM',
  'TAKIM RUHU',
  'PROAKTİF',
];

/** Her yanlış harfin takvime eklediği davet: saat ve başlık. Sonuncusu takvimi doldurur. */
export const INVITES: [string, string][] = [
  ['09:00', 'Kısa bir senkron (1 saat)'],
  ['10:30', 'Hizalanma toplantısı'],
  ['11:30', 'Toplantı öncesi ön toplantı'],
  ['13:00', 'Öğle arası beyin fırtınası'],
  ['14:00', 'Bu bir e-posta olabilirdi'],
  ['15:30', 'Haftalık durum (ek oturum)'],
  ['17:00', 'Toplantılar hakkında toplantı'],
];

export interface Hangman {
  word: string;
  guessed: string[];
}

export const newHangman = (r: () => number): Hangman => ({ word: WORDS[Math.floor(r() * WORDS.length)], guessed: [] });

export const wrongOf = (h: Hangman) => h.guessed.filter((c) => !h.word.includes(c)).length;

export function hangmanState(h: Hangman): 'won' | 'lost' | null {
  if (wrongOf(h) >= MAX_WRONG) return 'lost';
  return [...h.word].every((c) => c === ' ' || h.guessed.includes(c)) ? 'won' : null;
}

export function guess(h: Hangman, c: string): Hangman {
  if (!ALPHABET.includes(c) || h.guessed.includes(c) || hangmanState(h)) return h;
  return { ...h, guessed: [...h.guessed, c] };
}

/** Klavyeden gelen tuş: Türkçe büyük harfe çevrilir (i → İ, ı → I); harf değilse null. */
export function letterOf(key: string): string | null {
  if (key.length !== 1) return null;
  const c = key.toLocaleUpperCase('tr-TR');
  return ALPHABET.includes(c) ? c : null;
}

// --- Noktalar ve kutular ---

export const DOT_N = 5;
const B = DOT_N - 1;
/** Yatay çizgiler: `h` + satır·B + sütun; dikey: `v` + satır·DOT_N + sütun. Kimliği bir dizedir. */
export const H_COUNT = DOT_N * B;
export const V_COUNT = B * DOT_N;

export type Side = 'me' | 'pc';

export interface Dots {
  /** Çekilen çizgiler: kimlik → çeken. */
  lines: Record<string, Side>;
  /** Kutular (satır·B + sütun) → alan. */
  boxes: (Side | null)[];
  turn: Side;
}

export const newDots = (): Dots => ({ lines: {}, boxes: Array(B * B).fill(null), turn: 'me' });

export const allLines = (): string[] => [...Array.from({ length: H_COUNT }, (_, i) => `h${i}`), ...Array.from({ length: V_COUNT }, (_, i) => `v${i}`)];

/** Kutunun dört kenarı. */
const sidesOf = (box: number) => {
  const r = Math.floor(box / B);
  const c = box % B;
  return [`h${r * B + c}`, `h${(r + 1) * B + c}`, `v${r * DOT_N + c}`, `v${r * DOT_N + c + 1}`];
};

/** Çizginin kenarı olduğu kutular (bir ya da iki). */
export function boxesOf(id: string): number[] {
  const n = Number(id.slice(1));
  const out: number[] = [];
  if (id[0] === 'h') {
    const r = Math.floor(n / B);
    const c = n % B;
    if (r > 0) out.push((r - 1) * B + c);
    if (r < B) out.push(r * B + c);
  } else {
    const r = Math.floor(n / DOT_N);
    const c = n % DOT_N;
    if (c > 0) out.push(r * B + c - 1);
    if (c < B) out.push(r * B + c);
  }
  return out;
}

const drawn = (lines: Record<string, Side>, box: number) => sidesOf(box).filter((l) => lines[l]).length;

export function drawLine(d: Dots, id: string, who: Side): Dots {
  if (d.lines[id] || dotsOver(d)) return d;
  const lines = { ...d.lines, [id]: who };
  const boxes = [...d.boxes];
  let made = 0;
  for (const b of boxesOf(id))
    if (drawn(lines, b) === 4) {
      boxes[b] = who;
      made++;
    }
  return { lines, boxes, turn: made ? who : who === 'me' ? 'pc' : 'me' };
}

export const dotsOver = (d: Dots) => d.boxes.every(Boolean);

export const dotsScore = (d: Dots) => ({ me: d.boxes.filter((b) => b === 'me').length, pc: d.boxes.filter((b) => b === 'pc').length });

/** Bilgisayarın çizgisi. */
export function dotsMove(d: Dots, r: () => number): string | null {
  const free = allLines().filter((l) => !d.lines[l]);
  if (!free.length) return null;
  const pick = (list: string[]) => list[Math.floor(r() * list.length)];
  const taking = free.filter((l) => boxesOf(l).some((b) => drawn(d.lines, b) === 3));
  if (taking.length) return pick(taking);
  const safe = free.filter((l) => boxesOf(l).every((b) => drawn(d.lines, b) < 2));
  if (safe.length) return pick(safe);
  // hepsi kutu veriyor: rakibin art arda alacağı en kısa zinciri aç
  const cost = (l: string) => {
    let g: Dots = drawLine({ ...d, turn: 'pc' }, l, 'pc');
    let n = 0;
    for (;;) {
      const t = allLines().find((x) => !g.lines[x] && boxesOf(x).some((b) => drawn(g.lines, b) === 3));
      if (!t) return n;
      const before = dotsScore(g).me;
      g = drawLine({ ...g, turn: 'me' }, t, 'me');
      n += dotsScore(g).me - before;
    }
  };
  const costs = free.map((l) => [l, cost(l)] as const);
  const least = Math.min(...costs.map((c) => c[1]));
  return pick(costs.filter((c) => c[1] === least).map((c) => c[0]));
}

// --- Demir para futbolu ---

/** Masa (px, yandan; y zeminden yukarı), paranın yarıçapı, parmakların yarı kalınlığı ve boyu. */
export const TABLE_W = 760;
export const COIN_X = 60;
export const COIN_R = 10;
export const FINGER_R = 11;
export const FINGER_H = 78;
/** Yerçekimi (px/sn²), en sert fiske, zeminde kayarken sürtünme. */
export const GRAVITY = 900;
export const MAX_SPEED = 820;
export const SLIDE = 520;
export const SHOTS = 5;
/** Bir atış en çok bu kadar sürer (sn): para bir yerde takılsa da atış biter. */
export const MAX_FLIGHT = 8;

export interface Level {
  name: string;
  /** Bölümün başında kâğıda yazılan not. */
  note: string;
  /** Kale uzaklığı aralığı ve parmakların arası. */
  near: number;
  far: number;
  gap: number;
  /** Rüzgâr: havadaki paraya yatay ivme (px/sn²), her atışta bu aralıktan, yönü rastgele. */
  wind?: [number, number];
  /** Arada dikili kitap: kaleye uzaklığı ve boyu. */
  book?: { before: number; h: number };
  /** Alçak raf: paranın çıkabileceği en yüksek yer (zeminden). */
  ceiling?: number;
  /** Sallanan el: genlik (px) ve hız (radyan/sn). */
  sway?: [number, number];
  /** Kaleci: iki direğin ortasında durmadan sağa sola giden parmağın hızı (radyan/sn). */
  keeper?: number;
  /** Bölümü geçmek için gereken gol. */
  need: number;
}

export const LEVELS: Level[] = [
  { name: 'Teneffüs', note: 'Isınma: kale yakın, aralık geniş.', near: 300, far: 380, gap: 70, need: 2 },
  { name: 'Arka sıra', note: 'Kale arka sırada: uzak ve dar.', near: 430, far: 560, gap: 56, need: 3 },
  { name: 'Pencere açık', note: 'Rüzgâr var: havadaki parayı iter. Oka bak.', near: 360, far: 480, gap: 60, wind: [110, 230], need: 3 },
  { name: 'Kitap duvarı', note: 'Araya Matematik kitabı dikildi: üstünden aşır.', near: 380, far: 520, gap: 58, book: { before: 110, h: 104 }, need: 3 },
  { name: 'Sallanan el', note: 'Rakip parmaklarını kıpırdatıyor: zamanla.', near: 360, far: 480, gap: 58, sway: [34, 2.2], need: 3 },
  { name: 'Alçak raf', note: 'Üstte raf var: yüksek bombe yok, alçaktan sok.', near: 340, far: 460, gap: 60, ceiling: 170, need: 3 },
  { name: 'Müdür kapıda', note: 'Rüzgâr, kitap, sallanan el.', near: 400, far: 520, gap: 58, wind: [60, 140], book: { before: 120, h: 90 }, sway: [22, 1.8], need: 3 },
  { name: 'Kaleci geldi', note: 'Kale artık iki elle kuruldu: ortadaki parmak kaleci, durmadan gidip geliyor.', near: 330, far: 430, gap: 124, keeper: 1.5, need: 3 },
  { name: 'Hızlı kaleci', note: 'Kaleci hızlandı, kale uzaklaştı.', near: 400, far: 500, gap: 116, keeper: 2.4, need: 3 },
  { name: 'Rüzgârlı derbi', note: 'Kaleci ve rüzgâr birlikte.', near: 360, far: 470, gap: 116, keeper: 2.1, wind: [70, 150], need: 3 },
  { name: 'Final', note: 'Kitap, rüzgâr ve en hızlı kaleci. Dört gol lazım.', near: 400, far: 500, gap: 112, keeper: 2.9, wind: [50, 120], book: { before: 110, h: 86 }, need: 4 },
];

export interface Goal {
  /** İki parmağın arasının ortası ve aradaki boşluk (parmakların iç kenarları arası). */
  x: number;
  gap: number;
  /** Bu atışın şartları (bölümden). */
  wind: number;
  book: { x: number; w: number; h: number } | null;
  ceiling: number | null;
  sway: [number, number] | null;
  keeper: number | null;
  /** Sallanan elin ve kalecinin atış başındaki evresi (sn). */
  phase: number;
}

export interface Coin {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Atış başından beri geçen süre (sn). */
  t: number;
  /** Dönüşün açısı (çizim için): para havada kendi çevresinde döner. */
  spin: number;
  post: boolean;
  /** Yolda çarptığı engel: kaçan atışın sebebi. */
  hit: 'kitap' | 'raf' | 'kaleci' | null;
  result: CoinResult | null;
}

export type CoinResult = 'gol' | 'direk' | 'kısa' | 'uzun' | 'düştü' | 'kitap' | 'raf' | 'kaleci';

export const restingCoin = (): Coin => ({ x: COIN_X, y: COIN_R, vx: 0, vy: 0, t: 0, spin: 0, post: false, hit: null, result: null });

/** Bölümün bir atışının kalesi ve şartları; uzaklık ve rüzgâr rastgele. */
export function goalFor(level: Level, r: () => number): Goal {
  const x = level.near + r() * (level.far - level.near);
  const wind = level.wind ? (level.wind[0] + r() * (level.wind[1] - level.wind[0])) * (r() < 0.5 ? -1 : 1) : 0;
  return {
    x,
    gap: level.gap,
    wind,
    book: level.book ? { x: x - level.gap / 2 - FINGER_R * 2 - level.book.before, w: 22, h: level.book.h } : null,
    ceiling: level.ceiling ?? null,
    sway: level.sway ?? null,
    keeper: level.keeper ?? null,
    phase: 0,
  };
}

/** Sallanan elin `t` anındaki kaymasi. */
export const swayAt = (g: Goal, t: number) => (g.sway ? g.sway[0] * Math.sin(g.sway[1] * (g.phase + t)) : 0);

/** İki direk parmağın orta çizgisinin x'i (önce yakın parmak), `t` anında. */
export const fingers = (g: Goal, t = 0): [number, number] => {
  const c = g.x + swayAt(g, t);
  return [c - g.gap / 2 - FINGER_R, c + g.gap / 2 + FINGER_R];
};

/** Kalecinin x'i (`t` anında): iki direğin arasında, neredeyse birine değene dek gider gelir. */
export const keeperAt = (g: Goal, t = 0): number | null =>
  g.keeper === null ? null : g.x + swayAt(g, t) + (g.gap / 2 - FINGER_R - 3) * Math.sin(g.keeper * (g.phase + t));

/** Fiske: açı (radyan, 0 yatay, π/2 dik yukarı) ve güç (0–1). */
export function flick(c: Coin, angle: number, power: number): Coin {
  const s = Math.max(0.08, Math.min(1, power)) * MAX_SPEED;
  return { ...c, vx: Math.cos(angle) * s, vy: Math.sin(angle) * s, t: 0, post: false, hit: null, result: null };
}

export const moving = (c: Coin) => !c.result && (c.vx !== 0 || c.vy !== 0);

/** Çemberi bir noktadan dışarı iter, hızı o yönde sektirir; çarptıysa true. */
function bounceOff(s: { x: number; y: number; vx: number; vy: number }, px: number, py: number, r: number, e: number): boolean {
  const dx = s.x - px;
  const dy = s.y - py;
  const d = Math.hypot(dx, dy);
  if (d >= r || d === 0) return false;
  const nx = dx / d;
  const ny = dy / d;
  const vn = s.vx * nx + s.vy * ny;
  if (vn < 0) {
    s.vx -= (1 + e) * vn * nx;
    s.vy -= (1 + e) * vn * ny;
  }
  s.x = px + nx * r;
  s.y = py + ny * r;
  return vn < 0;
}

/** Fizik adımı (dt saniye). */
export function stepCoin(c: Coin, g: Goal, dt: number): Coin {
  if (!moving(c)) return c;
  const t = c.t + dt;
  const s = { x: c.x, y: c.y, vx: c.vx, vy: c.vy };
  const flying = c.y > COIN_R + 0.5;
  s.vy -= GRAVITY * dt;
  if (flying) s.vx += g.wind * dt;
  s.x += s.vx * dt;
  s.y += s.vy * dt;
  let { post } = c;
  let { hit } = c;
  // zemin: sert düşen seker, yavaşı kayar
  if (s.y <= COIN_R) {
    s.y = COIN_R;
    if (s.vy < -90) {
      s.vy = -s.vy * 0.35;
      s.vx *= 0.7;
    } else {
      s.vy = 0;
      s.vx = Math.sign(s.vx) * Math.max(0, Math.abs(s.vx) - SLIDE * dt);
    }
  }
  // alçak raf: kafayı vuran para aşağı seker
  if (g.ceiling !== null && s.y > g.ceiling - COIN_R) {
    s.y = g.ceiling - COIN_R;
    if (s.vy > 0) s.vy = -s.vy * 0.3;
    hit = 'raf';
  }
  // kitap: dik duran dikdörtgen; en yakın noktasından seker
  if (g.book) {
    const b = g.book;
    const px = Math.max(b.x, Math.min(b.x + b.w, s.x));
    const py = Math.max(0, Math.min(b.h, s.y));
    if (bounceOff(s, px, py, COIN_R, 0.35)) hit = 'kitap';
  }
  // parmaklar: tepesi yuvarlak dik çubuk (kapsül); para çarpınca seker
  for (const fx of fingers(g, t)) {
    const cy = Math.max(0, Math.min(FINGER_H - FINGER_R, s.y));
    const dx = s.x - fx;
    if (bounceOff(s, fx, cy, COIN_R + FINGER_R, 0.4)) {
      // parmağın tepesinde dengede kalmaz: bir yana kayar
      if (Math.abs(s.vx) < 40) s.vx = dx >= 0 ? 40 : -40;
      post = true;
    }
  }
  // kaleci: ortadaki parmak; çarpan para seker
  const kx = keeperAt(g, t);
  if (kx !== null) {
    const cy = Math.max(0, Math.min(FINGER_H - FINGER_R, s.y));
    const dx = s.x - kx;
    if (bounceOff(s, kx, cy, COIN_R + FINGER_R, 0.4)) {
      if (Math.abs(s.vx) < 40) s.vx = dx >= 0 ? 40 : -40;
      hit = 'kaleci';
    }
  }
  const spin = c.spin + (s.y > COIN_R + 1 ? 14 : Math.abs(s.vx) / 30) * dt;
  const why = hit === 'kaleci' ? 'kaleci' : post ? 'direk' : hit;
  const base = { ...c, x: s.x, y: s.y, t, spin, post, hit };
  const [near, far] = fingers(g, t);
  const end = (result: CoinResult) => ({ ...base, vx: 0, vy: 0, result });
  // iki parmağın arasına indi: gol
  if (s.x > near + FINGER_R && s.x < far - FINGER_R && s.y < FINGER_H * 0.7) return { ...end('gol'), y: COIN_R };
  if (s.x < -COIN_R || s.x > TABLE_W + COIN_R) return end('düştü');
  const stopped = s.y <= COIN_R && s.vy === 0 && Math.abs(s.vx) < 5;
  if (stopped || t > MAX_FLIGHT) return end(why ?? (s.x < near ? 'kısa' : 'uzun'));
  return { ...base, vx: s.vx, vy: s.vy };
}

/** Bir atışı sonuna kadar oynatır (testler, hareketi azaltma ve yolun ilk parçası için). */
export function simulate(c: Coin, g: Goal, dt = 1 / 120, limit = 4000): Coin {
  let s = c;
  for (let i = 0; i < limit && moving(s); i++) s = stepCoin(s, g, dt);
  return s;
}

/** Atışın kaydı: ulaşılan en ileri bölüm (0'dan). */
const LEVEL_KEY = 'kariyerweb-para-bolum-v1';
export function loadLevel(): number {
  try {
    const n = Number(localStorage.getItem(LEVEL_KEY));
    return Number.isInteger(n) && n > 0 && n < LEVELS.length ? n : 0;
  } catch {
    return 0;
  }
}
export function saveLevel(n: number) {
  try {
    if (n > loadLevel()) localStorage.setItem(LEVEL_KEY, String(Math.min(n, LEVELS.length - 1)));
  } catch {
    // kayıt yoksa bölüm baştan başlar
  }
}
