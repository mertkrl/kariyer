import { mix, shade, type Painter } from './paint';
import type { Palette } from './palettes';

/*
 * Rotadaki yapılar: camiler (kubbe, yarım kubbeler, şerefeli minareler), Galata Kulesi, Ayasofya,
 * Topkapı'nın mutfak bacaları ve Adalet Kulesi, surlar, Galata Köprüsü, Kız Kulesi, Haydarpaşa
 * Garı ve iskele binaları. Gerçek yapıların genel silüetleri; ölçüler sahnenin birimiyle (900
 * birim yükseklik). Uzaklık pusla verilir: `tone(p, hz)` renkleri ufkun rengine karıştırır.
 * Gece taş yapılar ışıklandırılır, kubbeler altından aydınlanır.
 */

export interface Tone {
  stone: string;
  stoneLight: string;
  stoneDark: string;
  lead: string;
  leadLight: string;
  leadDark: string;
  window: string;
  light: string;
  roof: string;
  tree: string;
  treeDark: string;
  gold: string;
  wall: string;
  lit: boolean;
}

export function tone(p: Palette, hz: number): Tone {
  const h = (c: string, k = 1) => mix(c, p.haze, Math.min(1, hz * k));
  const stone = p.lit ? mix(p.flood, p.haze, hz * 0.45) : h(p.stone);
  const lead = p.lit ? mix(mix(p.lead, p.flood, 0.45), p.haze, hz * 0.4) : h(p.lead);
  return {
    stone,
    stoneLight: shade(stone, 0.18),
    stoneDark: shade(stone, -0.18),
    lead,
    leadLight: shade(lead, p.lit ? 0.25 : 0.22),
    leadDark: shade(lead, -0.2),
    window: p.lit ? mix(p.light, p.haze, hz * 0.3) : h(p.window, 0.8),
    light: p.light,
    roof: h(p.roof),
    tree: h(p.tree, 0.8),
    treeDark: shade(h(p.tree, 0.8), -0.2),
    gold: p.lit ? '#ffe2a0' : h('#c9a24a', 0.7),
    wall: p.lit ? mix(mix(p.stone, p.flood, 0.5), p.haze, hz * 0.4) : h(shade(p.stone, -0.12)),
    lit: p.lit,
  };
}

/** Minare: incelen gövde, şerefeler, kurşun külah ve alem. */
export function minaret(P: Painter, t: Tone, x: number, base: number, h: number, w: number, balconies: number, z: number) {
  const top = base - h;
  P.at(z).rect(t.stoneLight, x - w / 2, top, w / 2, h);
  P.rect(t.stoneDark, x, top, w / 2, h);
  for (let i = 0; i < balconies; i++) {
    const y = top + h * (0.12 + i * 0.16);
    P.at(z + 1).rect(t.stone, x - w * 0.95, y, w * 1.9, w * 0.45);
    P.rect(t.stoneDark, x - w * 0.95, y + w * 0.45, w * 1.9, w * 0.3);
  }
  const cone = w * 5.2;
  P.at(z + 1).poly(t.leadLight, [
    [x - w * 0.55, top],
    [x, top - cone],
    [x, top],
  ]);
  P.poly(t.leadDark, [
    [x, top],
    [x, top - cone],
    [x + w * 0.55, top],
  ]);
  P.rect(t.gold, x - 0.6, top - cone - w * 1.2, 1.2, w * 1.2);
}

interface MosqueOpts {
  /** Ana kubbenin yarıçapı. */
  r: number;
  minarets: { dx: number; h: number; b: number }[];
  /** Ana kubbenin iki yanında yarım kubbe. */
  half?: boolean;
  /** Avlu ve yan kanatlardaki küçük kubbe sayısı (her yana). */
  small?: number;
  /** Ayasofya gibi kızıl taş. */
  body?: string;
}

/** Klasik Osmanlı camisi: kademeli kubbeler, kasnak, minareler. */
export function mosque(P: Painter, t: Tone, x: number, base: number, o: MosqueOpts, z: number) {
  const { r } = o;
  const body = o.body ?? t.stone;
  const bodyDark = shade(body, -0.15);
  const minW = r * 0.13;
  // arkadaki minareler önce
  for (const m of o.minarets.filter((m) => Math.abs(m.dx) > r * 1.6)) minaret(P, t, x + m.dx, base, m.h, minW * 0.9, m.b, z);
  // yan kanatlar ve avlu
  P.at(z + 2).rect(bodyDark, x - r * 2.1, base - r * 0.42, r * 4.2, r * 0.42);
  P.rect(body, x - r * 1.35, base - r * 0.82, r * 2.7, r * 0.82);
  // küçük kubbeler
  const small = o.small ?? 3;
  for (let i = 0; i < small; i++) {
    for (const side of [-1, 1]) {
      const cx = x + side * (r * 1.55 + i * r * 0.2);
      P.at(z + 3).dome(t.lead, cx - r * 0.09, base - r * 0.42, r * 0.18, r * 0.1);
    }
    for (const side of [-1, 1]) {
      const cx = x + side * (r * 0.95 + i * r * 0.16);
      P.dome(t.lead, cx - r * 0.12, base - r * 0.82, r * 0.24, r * 0.13);
    }
  }
  // pencere sıraları
  for (let i = -5; i <= 5; i++) {
    P.at(z + 3).rect(t.window, x + i * r * 0.22 - r * 0.03, base - r * 0.62, r * 0.06, r * 0.12);
    P.rect(t.window, x + i * r * 0.22 - r * 0.03, base - r * 0.32, r * 0.06, r * 0.14);
  }
  // yarım kubbeler
  if (o.half !== false) {
    for (const side of [-1, 1]) {
      const cx = x + side * r * 0.72;
      P.at(z + 4).dome(t.lead, cx - r * 0.55, base - r * 0.82, r * 1.1, r * 0.42);
      P.dome(t.leadLight, cx - r * 0.55, base - r * 0.82, r * 0.55, r * 0.38);
    }
  }
  // kasnak ve ana kubbe
  const drumTop = base - r * 1.08;
  P.at(z + 5).rect(body, x - r * 0.86, drumTop, r * 1.72, r * 0.3);
  for (let i = -6; i <= 6; i++) P.at(z + 6).rect(t.window, x + i * r * 0.13 - r * 0.025, drumTop + r * 0.08, r * 0.05, r * 0.13);
  P.at(z + 6).dome(t.lead, x - r * 0.9, drumTop, r * 1.8, r * 0.78);
  P.at(z + 7).dome(t.leadLight, x - r * 0.84, drumTop, r * 0.95, r * 0.7);
  P.dome(t.leadDark, x + r * 0.25, drumTop, r * 0.65, r * 0.42);
  P.at(z + 8).rect(t.gold, x - 0.7, drumTop - r * 1.04 - r * 0.3, 1.4, r * 0.32);
  // öndeki minareler
  for (const m of o.minarets.filter((m) => Math.abs(m.dx) <= r * 1.6)) minaret(P, t, x + m.dx, base, m.h, minW, m.b, z + 9);
}

/** Galata Kulesi: taş silindir, seyir balkonu, sivri kurşun külah. */
export function galata(P: Painter, t: Tone, x: number, base: number, s: number, z: number) {
  const w = 34 * s;
  const h = 118 * s;
  const top = base - h;
  P.at(z).rect(t.stoneLight, x - w / 2, top, w * 0.45, h);
  P.rect(t.stone, x - w / 2 + w * 0.45, top, w * 0.3, h);
  P.rect(t.stoneDark, x - w / 2 + w * 0.75, top, w * 0.25, h);
  for (let row = 0; row < 6; row++)
    for (let c = 0; c < 3; c++) P.at(z + 1).rect(t.window, x - w * 0.3 + c * w * 0.25, top + 22 * s + row * 15 * s, 3 * s, 6 * s);
  // seyir balkonu ve kemerli pencereler
  P.at(z + 1).rect(t.stoneDark, x - w * 0.62, top + 6 * s, w * 1.24, 5 * s);
  for (let c = 0; c < 5; c++) P.at(z + 2).rect(t.lit ? t.light : t.window, x - w * 0.42 + c * w * 0.2, top - 6 * s, 4 * s, 10 * s);
  P.at(z + 1).rect(t.stone, x - w * 0.5, top - 10 * s, w, 16 * s);
  P.at(z + 2).poly(t.leadLight, [
    [x - w * 0.56, top - 10 * s],
    [x, top - 62 * s],
    [x, top - 10 * s],
  ]);
  P.poly(t.leadDark, [
    [x, top - 10 * s],
    [x, top - 62 * s],
    [x + w * 0.56, top - 10 * s],
  ]);
  P.rect(t.gold, x - 0.7, top - 72 * s, 1.4, 10 * s);
}

/** Ayasofya: kızıl gövde, payandalar, basık büyük kubbe, dört farklı minare. */
export function ayasofya(P: Painter, t: Tone, x: number, base: number, r: number, z: number) {
  const red = t.lit ? mix(t.stone, '#e7a77a', 0.35) : mix(t.stone, '#c98f72', 0.65);
  minaret(P, t, x - r * 1.9, base, r * 1.75, r * 0.13, 1, z);
  minaret(P, t, x + r * 1.9, base, r * 1.75, r * 0.13, 1, z);
  P.at(z + 2).rect(shade(red, -0.15), x - r * 1.75, base - r * 0.55, r * 3.5, r * 0.55);
  P.rect(red, x - r * 1.2, base - r * 1.0, r * 2.4, r * 1.0);
  // payandalar
  for (const dx of [-1.3, -0.95, 0.85, 1.2]) P.at(z + 3).rect(shade(red, -0.08), x + dx * r, base - r * 1.18, r * 0.12, r * 1.18);
  for (let i = -5; i <= 5; i++) P.at(z + 3).rect(t.window, x + i * r * 0.2 - r * 0.03, base - r * 0.72, r * 0.06, r * 0.12);
  for (const side of [-1, 1]) P.at(z + 4).dome(t.lead, x + side * r * 0.75 - r * 0.45, base - r * 1.0, r * 0.9, r * 0.32);
  const drum = base - r * 1.22;
  P.at(z + 5).rect(red, x - r * 0.95, drum, r * 1.9, r * 0.24);
  for (let i = -8; i <= 8; i++) P.at(z + 6).rect(t.window, x + i * r * 0.105 - r * 0.02, drum + r * 0.06, r * 0.04, r * 0.11);
  P.at(z + 6).dome(t.lead, x - r * 1.0, drum, r * 2.0, r * 0.52);
  P.at(z + 7).dome(t.leadLight, x - r * 0.95, drum, r * 1.0, r * 0.46);
  P.rect(t.gold, x - 0.8, drum - r * 0.7 - r * 0.22, 1.6, r * 0.24);
  minaret(P, t, x - r * 1.45, base, r * 1.6, r * 0.11, 1, z + 9);
  minaret(P, t, x + r * 1.45, base, r * 1.6, r * 0.11, 1, z + 9);
}

/** Topkapı: ağaçlar arasında alçak saray çatıları, mutfak bacaları, Adalet Kulesi. */
export function topkapi(P: Painter, t: Tone, x: number, base: number, w: number, rand: () => number, z: number) {
  // ağaçlık
  for (let i = 0; i < w / 9; i++) {
    const cx = x + rand() * w;
    const r = 9 + rand() * 12;
    P.at(z).circle(rand() < 0.5 ? t.tree : t.treeDark, cx, base - 18 - rand() * 26, r);
  }
  // saray kanatları: kurşun kırma çatılar
  for (let i = 0; i < 6; i++) {
    const bx = x + w * 0.1 + i * w * 0.13;
    const bw = w * (0.08 + rand() * 0.04);
    const by = base - 30 - (i % 2) * 8;
    P.at(z + 1).rect(t.stone, bx, by, bw, 22);
    P.poly(t.lead, [
      [bx - 3, by],
      [bx + bw * 0.25, by - 12],
      [bx + bw * 0.75, by - 12],
      [bx + bw + 3, by],
    ]);
    for (let k = 0; k < 4; k++) P.at(z + 2).rect(t.window, bx + 4 + k * (bw - 8) / 4, by + 7, 3, 6);
  }
  // mutfak bacaları
  for (let i = 0; i < 9; i++) {
    const cx = x + w * 0.62 + i * 11;
    P.at(z + 2).rect(t.stone, cx, base - 62, 7, 16);
    P.poly(t.lead, [
      [cx - 1, base - 62],
      [cx + 3.5, base - 72],
      [cx + 8, base - 62],
    ]);
  }
  // Adalet Kulesi
  const tx = x + w * 0.36;
  const top = base - 128;
  P.at(z + 3).rect(t.stoneLight, tx - 10, top, 10, 98);
  P.rect(t.stoneDark, tx, top, 10, 98);
  for (let k = 0; k < 5; k++) P.at(z + 4).rect(t.lit ? t.light : t.window, tx - 6 + (k % 2) * 8, top + 10 + k * 14, 4, 7);
  P.at(z + 4).poly(t.leadLight, [
    [tx - 12, top],
    [tx, top - 46],
    [tx, top],
  ]);
  P.poly(t.leadDark, [
    [tx, top],
    [tx, top - 46],
    [tx + 12, top],
  ]);
  P.rect(t.gold, tx - 0.6, top - 54, 1.2, 8);
}

/** Kıyı boyunca mazgallı sur ve kuleleri. */
export function walls(P: Painter, t: Tone, x0: number, x1: number, base: number, z: number) {
  P.at(z).rect(t.wall, x0, base - 16, x1 - x0, 16);
  for (let x = x0; x < x1; x += 9) P.rect(t.wall, x, base - 20, 5, 4);
  for (let x = x0 + 40; x < x1; x += 150) {
    P.at(z + 1).rect(shade(t.wall, 0.08), x, base - 30, 16, 30);
    P.rect(shade(t.wall, -0.15), x + 11, base - 30, 5, 30);
    for (let k = 0; k < 3; k++) P.rect(t.wall, x + k * 6, base - 34, 4, 4);
  }
}

/** Galata Köprüsü: alçak, uzun tabliye, fener direkleri, ayaklar. */
export function bridge(P: Painter, t: Tone, x0: number, x1: number, deck: number, z: number) {
  P.at(z).rect(t.stoneDark, x0, deck, x1 - x0, 7);
  P.rect(t.stone, x0, deck - 3, x1 - x0, 3);
  for (let x = x0 + 20; x < x1; x += 46) P.rect(t.stoneDark, x, deck + 7, 6, 12);
  for (let x = x0 + 10; x < x1; x += 32) {
    P.at(z + 1).rect(t.wall, x, deck - 16, 1.4, 13);
    P.rect(t.lit ? t.light : t.wall, x - 1.5, deck - 18, 4.4, 2.4);
  }
  // ortadaki açılır kısım
  const mid = (x0 + x1) / 2;
  P.at(z + 1).rect(t.stone, mid - 34, deck - 22, 12, 22);
  P.rect(t.stone, mid + 22, deck - 22, 12, 22);
}

/** Kız Kulesi: kayalık adacık, kare gövde, sekizgen fener katı, külah. */
export function kizKulesi(P: Painter, t: Tone, x: number, base: number, s: number, z: number) {
  const rock = shade(mix('#6d6460', t.stone, 0.2), t.lit ? -0.35 : 0);
  P.at(z).poly(rock, [
    [x - 120 * s, base + 4],
    [x - 96 * s, base - 14 * s],
    [x - 40 * s, base - 22 * s],
    [x + 30 * s, base - 24 * s],
    [x + 100 * s, base - 12 * s],
    [x + 128 * s, base + 4],
  ]);
  P.poly(shade(rock, 0.15), [
    [x - 96 * s, base - 14 * s],
    [x - 40 * s, base - 22 * s],
    [x - 20 * s, base - 8 * s],
    [x - 80 * s, base - 4 * s],
  ]);
  // yan yapı
  const body = t.lit ? mix(t.stone, '#fff2d8', 0.4) : mix(t.stone, '#ffffff', 0.35);
  P.at(z + 1).rect(body, x - 80 * s, base - 62 * s, 70 * s, 40 * s);
  P.rect(shade(body, -0.12), x - 80 * s, base - 62 * s, 70 * s, 6 * s);
  P.dome(t.lead, x - 64 * s, base - 62 * s, 22 * s, 9 * s);
  for (let k = 0; k < 4; k++) P.at(z + 2).rect(t.window, x - 74 * s + k * 16 * s, base - 48 * s, 5 * s, 10 * s);
  // kule
  const top = base - 150 * s;
  P.at(z + 2).rect(body, x - 22 * s, base - 110 * s, 44 * s, 88 * s);
  P.rect(shade(body, -0.14), x + 8 * s, base - 110 * s, 14 * s, 88 * s);
  for (let k = 0; k < 3; k++) P.at(z + 3).rect(t.window, x - 12 * s + k * 10 * s, base - 96 * s, 4 * s, 12 * s);
  P.at(z + 3).rect(body, x - 14 * s, top, 28 * s, 40 * s);
  P.rect(shade(body, -0.14), x + 5 * s, top, 9 * s, 40 * s);
  for (let k = 0; k < 3; k++) P.at(z + 4).rect(t.lit ? t.light : t.window, x - 10 * s + k * 8 * s, top + 8 * s, 4 * s, 16 * s);
  P.at(z + 4).poly(t.leadLight, [
    [x - 17 * s, top],
    [x, top - 30 * s],
    [x, top],
  ]);
  P.poly(t.leadDark, [
    [x, top],
    [x, top - 30 * s],
    [x + 17 * s, top],
  ]);
  P.rect(t.gold, x - 1, top - 44 * s, 2, 14 * s);
}

/** Haydarpaşa Garı: uzun taş gövde, iki köşe kulesi ve sivri kırma çatıları. */
export function haydarpasa(P: Painter, t: Tone, x: number, base: number, s: number, z: number) {
  const stone = t.lit ? t.stone : mix(t.stone, '#cbbfae', 0.4);
  const w = 360 * s;
  const h = 110 * s;
  // rıhtım
  P.at(z).rect(shade(stone, -0.25), x - 40 * s, base - 14 * s, w + 80 * s, 14 * s);
  P.at(z + 1).rect(stone, x, base - h, w, h - 14 * s);
  P.rect(shade(stone, -0.12), x + w * 0.7, base - h, w * 0.3, h - 14 * s);
  // pencereler: sıra sıra kemerli
  for (let row = 0; row < 4; row++)
    for (let c = 0; c < 16; c++) P.at(z + 2).rect(t.lit && (row * 7 + c) % 3 === 0 ? t.light : t.window, x + 14 * s + c * 21 * s, base - h + 14 * s + row * 22 * s, 8 * s, 13 * s);
  // çatı
  P.at(z + 2).poly(t.leadDark, [
    [x - 4 * s, base - h],
    [x + 20 * s, base - h - 28 * s],
    [x + w - 20 * s, base - h - 28 * s],
    [x + w + 4 * s, base - h],
  ]);
  // köşe kuleleri
  for (const tx of [x - 6 * s, x + w - 50 * s]) {
    P.at(z + 3).rect(stone, tx, base - h - 40 * s, 56 * s, h + 26 * s);
    P.rect(shade(stone, -0.14), tx + 38 * s, base - h - 40 * s, 18 * s, h + 26 * s);
    for (let k = 0; k < 3; k++) P.at(z + 4).rect(t.lit ? t.light : t.window, tx + 10 * s + k * 14 * s, base - h - 26 * s, 7 * s, 16 * s);
    P.at(z + 4).poly(t.leadLight, [
      [tx - 4 * s, base - h - 40 * s],
      [tx + 28 * s, base - h - 112 * s],
      [tx + 28 * s, base - h - 40 * s],
    ]);
    P.poly(t.leadDark, [
      [tx + 28 * s, base - h - 40 * s],
      [tx + 28 * s, base - h - 112 * s],
      [tx + 60 * s, base - h - 40 * s],
    ]);
  }
  // mendirek ve kırmızı fener
  P.at(z).rect(shade(stone, -0.3), x + w + 60 * s, base - 8 * s, 260 * s, 8 * s);
  P.at(z + 1).rect(t.lit ? '#ff6a55' : '#c0392b', x + w + 300 * s, base - 46 * s, 14 * s, 38 * s);
  P.rect('#f2f0ea', x + w + 300 * s, base - 34 * s, 14 * s, 8 * s);
  P.rect(t.lit ? '#fff1b0' : '#e8e4d8', x + w + 302 * s, base - 54 * s, 10 * s, 8 * s);
}

/** İskele binası: kemerli kapılar, ahşap iskele, kırma çatı ve tabelası. */
export function pier(P: Painter, t: Tone, x: number, base: number, s: number, z: number) {
  const body = t.lit ? mix(t.stone, '#fff4dc', 0.3) : mix(t.stone, '#ffffff', 0.4);
  const w = 300 * s;
  const h = 96 * s;
  // ahşap iskele ve kazıklar
  P.at(z).rect(shade(t.roof, -0.35), x - 60 * s, base - 8 * s, w + 160 * s, 10 * s);
  for (let k = 0; k < 18; k++) P.rect(shade(t.roof, -0.5), x - 50 * s + k * 26 * s, base, 6 * s, 26 * s);
  P.at(z + 1).rect(body, x, base - h, w, h - 8 * s);
  P.rect(shade(body, -0.1), x + w * 0.78, base - h, w * 0.22, h - 8 * s);
  // kemerli kapılar
  for (let k = 0; k < 5; k++) {
    P.at(z + 2).rect(t.lit ? shade(t.light, -0.2) : shade(t.window, -0.2), x + 18 * s + k * 56 * s, base - 50 * s, 34 * s, 42 * s);
    P.dome(t.lit ? shade(t.light, -0.2) : shade(t.window, -0.2), x + 18 * s + k * 56 * s, base - 50 * s, 34 * s, 12 * s);
  }
  for (let k = 0; k < 7; k++) P.at(z + 2).rect(t.window, x + 16 * s + k * 40 * s, base - h + 12 * s, 14 * s, 16 * s);
  // çatı ve saçak
  P.at(z + 2).rect(shade(body, -0.25), x - 8 * s, base - h - 4 * s, w + 16 * s, 6 * s);
  P.poly(t.lead, [
    [x - 6 * s, base - h - 4 * s],
    [x + 40 * s, base - h - 40 * s],
    [x + w - 40 * s, base - h - 40 * s],
    [x + w + 6 * s, base - h - 4 * s],
  ]);
  P.poly(t.leadLight, [
    [x + 40 * s, base - h - 40 * s],
    [x + w * 0.5, base - h - 40 * s],
    [x + w * 0.45, base - h - 20 * s],
    [x + 20 * s, base - h - 20 * s],
  ]);
  // saat kulesi
  P.at(z + 3).rect(body, x + w * 0.5 - 16 * s, base - h - 74 * s, 32 * s, 40 * s);
  P.circle(t.lit ? '#fff4d6' : '#f8f6f0', x + w * 0.5, base - h - 56 * s, 9 * s);
  P.rect(t.window, x + w * 0.5 - 0.6, base - h - 62 * s, 1.2, 7 * s);
  P.poly(t.leadDark, [
    [x + w * 0.5 - 20 * s, base - h - 74 * s],
    [x + w * 0.5, base - h - 100 * s],
    [x + w * 0.5 + 20 * s, base - h - 74 * s],
  ]);
}
