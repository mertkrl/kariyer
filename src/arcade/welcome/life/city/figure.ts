import { depthScale, INK, pick, rand, shadow, type Host } from './core';

/*
 * İnsan figürü: yandan görünüş, yürüyüş döngüsü (bacaklar ve kollar ters fazda sallanır, gövde
 * adım başına hafifçe iner kalkar), dinlenirken nefes ve ağırlık değiştirme. Saç, başörtüsü,
 * kasket; çanta, evrak çantası, baston, file, gazete; yağmurda şemsiye (rüzgârda ters dönebilir).
 * Boy 26 birim kabul edilir, derinliğe göre küçülür.
 */

export type Hair = 'short' | 'long' | 'bald' | 'scarf' | 'cap' | 'bun';
export type Prop = 'none' | 'bag' | 'briefcase' | 'phone' | 'cane' | 'newspaper' | 'file';

export interface Look {
  skin: string;
  hair: string;
  style: Hair;
  top: string;
  bottom: string;
  shoes: string;
  /** Boy: yetişkin 24–28, çocuk 16–18. */
  h: number;
  kid: boolean;
  elder: boolean;
  skirt: boolean;
  prop: Prop;
  umbrella: string;
  scarf: string;
}

const SKIN = ['#e9c4a2', '#d9a982', '#c48a62', '#a8714c', '#f0d2b6'];
const HAIR = ['#2b211b', '#3d2b1f', '#5a3e2b', '#1b1714', '#8a6a4a'];
const TOP = ['#3f5f8a', '#a8432f', '#4f6b4a', '#d9c6a2', '#6b4d7a', '#2f3640', '#c98b2e', '#8c8f94', '#b8653a', '#e6e1d4'];
const BOTTOM = ['#2c3444', '#3a3430', '#5a4a3a', '#262a30', '#6b6f78'];
const UMBRELLA = ['#c43c2c', '#2f4f7a', '#1f2a24', '#d9a62e', '#5a3f6e', '#e8e2d4'];

export function randomLook(kind: 'adult' | 'kid' | 'elder' = 'adult'): Look {
  const woman = Math.random() < 0.5;
  const kid = kind === 'kid';
  const elder = kind === 'elder';
  const style: Hair = kid ? (woman ? 'long' : 'short') : elder ? (woman ? 'scarf' : pick(['cap', 'bald'] as const)) : woman ? pick(['long', 'bun', 'scarf', 'long'] as const) : pick(['short', 'short', 'cap', 'bald'] as const);
  return {
    skin: pick(SKIN),
    hair: elder ? pick(['#d8d4cc', '#b9b4aa', '#8c877e']) : pick(HAIR),
    style,
    top: pick(TOP),
    bottom: pick(BOTTOM),
    shoes: pick(['#1d1a17', '#3a2a1f', '#5a4636', '#e6e2da']),
    h: kid ? rand(15, 18) : elder ? rand(23, 25) : rand(24.5, 28),
    kid,
    elder,
    skirt: woman && !kid && Math.random() < 0.45,
    prop: kid ? 'none' : elder ? pick(['cane', 'file', 'none'] as const) : pick(['none', 'none', 'bag', 'briefcase', 'phone', 'newspaper', 'file'] as const),
    umbrella: pick(UMBRELLA),
    scarf: pick(['#7a3b4a', '#2f5a6e', '#c9a35a', '#5a6e3a', '#e6dccb', '#8a4a2a']),
  };
}

export interface Pose {
  /** Yürüyüş evresi (radyan) ve yürüyor mu. */
  phase: number;
  walking: boolean;
  /** +1 sağa, −1 sola bakar. */
  dir: number;
  /** Şemsiye: 0 kapalı, 1 açık; ters döndüyse 1. */
  umbrella?: number;
  flipped?: number;
  /** Elinde ne var: tepsi (açısıyla), simit, ekmek, kürek, top. */
  carry?: 'tray' | 'simit' | 'bread' | 'shovel' | 'none';
  trayTilt?: number;
  /** Eğilme (çalışırken) 0…1, kol kaldırma (seslenirken) 0…1. */
  bend?: number;
  wave?: number;
  /** Önlük (bakkal), yelek (yol işçisi), baret. */
  apron?: string;
  vest?: boolean;
  helmet?: boolean;
  t?: number;
}

/** Figürü ayaklarının ortası (x, y) zemine basacak şekilde çizer. */
export function drawFigure(g: CanvasRenderingContext2D, h: Host, x: number, y: number, look: Look, pose: Pose) {
  const n = h.night;
  const s = (look.h / 26) * depthScale(y);
  const ink = n.c(INK);
  const dir = pose.dir >= 0 ? 1 : -1;
  const ph = pose.phase;
  const walk = pose.walking ? 1 : 0;
  const t = pose.t ?? h.t;
  const bend = pose.bend ?? 0;
  const bob = walk ? -Math.abs(Math.sin(ph)) * 0.7 * s : Math.sin(t * 1.8 + x) * 0.25 * s;
  const leg = (look.kid ? 7.4 : 10.4) * s;
  const torso = (look.kid ? 6.6 : 9) * s;
  const hipY = y - leg + bob;
  const shY = hipY - torso + bend * 3 * s;
  const lean = (look.elder ? 1.2 : 0.4) * s * dir + bend * 3.5 * s * dir;
  const headR = (look.kid ? 2.5 : 2.6) * s;
  const head = { x: x + lean + dir * bend * 1.5 * s, y: shY - headR - 0.9 * s };

  shadow(g, x, y, 4.6 * s, 1.5 * s, 0.26);

  // bacaklar: öndeki ve arkadaki
  const stride = (look.kid ? 2.6 : 3.3) * s * walk;
  const legPos = (k: number) => {
    const a = Math.sin(ph + k * Math.PI);
    const lift = Math.max(0, Math.cos(ph + k * Math.PI)) * 1.5 * s * walk;
    return { fx: x + a * stride * dir + (walk ? 0 : (k ? -1 : 1) * 0.9 * s), fy: y - lift };
  };
  const drawLeg = (k: number, color: string) => {
    const { fx, fy } = legPos(k);
    const hx = x + (k ? -0.6 : 0.6) * s * dir;
    const kx = (hx + fx) / 2 + dir * 1.1 * s * walk;
    const ky = (hipY + fy) / 2;
    g.strokeStyle = color;
    g.lineWidth = 2.3 * s;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(hx, hipY);
    g.quadraticCurveTo(kx, ky, fx, fy - 0.8 * s);
    g.stroke();
    g.fillStyle = n.c(look.shoes);
    g.beginPath();
    g.ellipse(fx + dir * 0.7 * s, fy - 0.5 * s, 1.5 * s, 0.75 * s, 0, 0, Math.PI * 2);
    g.fill();
  };
  drawLeg(1, n.c(shadeOf(look.bottom)));

  // arkadaki kol
  const swing = Math.sin(ph) * 2.4 * s * walk;
  const arm = (front: boolean, color: string) => {
    const sx = x + lean * 0.8 + (front ? 0.4 : -0.6) * s * dir;
    const sy = shY + 1 * s;
    let hx = sx + (front ? -swing : swing) * dir;
    let hy = sy + 7.2 * s;
    if (front && pose.wave) {
      hx = sx + dir * 2 * s;
      hy = sy - 6 * s * pose.wave + Math.sin(t * 14) * 0.8 * s;
    }
    if (front && (pose.carry === 'tray' || pose.carry === 'bread')) {
      hx = sx + dir * 5 * s;
      hy = sy + 4.6 * s;
    }
    if (front && pose.carry === 'shovel') {
      hx = sx + dir * (3 + Math.sin(t * 5) * 2) * s;
      hy = sy + 6 * s;
    }
    if (front && pose.umbrella && pose.umbrella > 0) {
      hx = sx + dir * 1.2 * s;
      hy = sy + 1.5 * s - pose.umbrella * 3 * s;
    }
    if (front && look.prop === 'phone' && !pose.umbrella) {
      hx = head.x + dir * 1.6 * s;
      hy = head.y + 1 * s;
    }
    g.strokeStyle = color;
    g.lineWidth = 1.8 * s;
    g.beginPath();
    g.moveTo(sx, sy);
    g.lineTo((sx + hx) / 2 + dir * 0.6 * s, (sy + hy) / 2);
    g.lineTo(hx, hy);
    g.stroke();
    g.fillStyle = n.c(look.skin);
    g.beginPath();
    g.arc(hx, hy, 0.85 * s, 0, Math.PI * 2);
    g.fill();
    return { hx, hy };
  };
  arm(false, n.c(shadeOf(look.top)));

  // gövde
  g.fillStyle = n.c(pose.vest ? '#f07a1a' : look.top);
  g.strokeStyle = ink;
  g.lineWidth = 0.7;
  g.beginPath();
  g.moveTo(x - 2.4 * s + lean * 0.2, hipY + 0.6 * s);
  g.lineTo(x + 2.4 * s + lean * 0.2, hipY + 0.6 * s);
  g.lineTo(x + 2.1 * s + lean, shY + 1.2 * s);
  g.quadraticCurveTo(x + lean, shY - 0.4 * s, x - 2.1 * s + lean, shY + 1.2 * s);
  g.closePath();
  g.fill();
  g.stroke();
  if (pose.vest) {
    g.strokeStyle = n.c('#f4f1e6');
    g.lineWidth = 0.9 * s;
    g.beginPath();
    g.moveTo(x - 2.3 * s + lean * 0.4, hipY - 2.4 * s);
    g.lineTo(x + 2.3 * s + lean * 0.4, hipY - 2.4 * s);
    g.stroke();
  }
  if (pose.apron) {
    g.fillStyle = n.c(pose.apron);
    g.fillRect(x - 1.2 * s + lean * 0.5 + dir * 0.8 * s, shY + 3 * s, 2.6 * s, torso - 1 * s);
  }
  // etek ya da pantolon üstü
  if (look.skirt) {
    g.fillStyle = n.c(look.bottom);
    g.beginPath();
    g.moveTo(x - 2.3 * s, hipY);
    g.lineTo(x + 2.3 * s, hipY);
    g.lineTo(x + 3.2 * s, hipY + 5.4 * s);
    g.lineTo(x - 3.2 * s, hipY + 5.4 * s);
    g.closePath();
    g.fill();
  }
  drawLeg(0, n.c(look.bottom));

  // baş ve saç
  g.fillStyle = n.c(look.skin);
  g.beginPath();
  g.arc(head.x, head.y, headR, 0, Math.PI * 2);
  g.fill();
  const hair = n.c(look.hair);
  g.fillStyle = hair;
  switch (look.style) {
    case 'short':
      g.beginPath();
      g.arc(head.x - dir * 0.3 * s, head.y - 0.4 * s, headR * 1.02, Math.PI * 1.05, Math.PI * 1.95);
      g.fill();
      g.fillRect(head.x - dir * headR - (dir < 0 ? 0 : 0.6 * s), head.y - 1.2 * s, 0.9 * s, 2 * s);
      break;
    case 'long':
      g.beginPath();
      g.arc(head.x - dir * 0.3 * s, head.y - 0.3 * s, headR * 1.05, Math.PI * 0.95, Math.PI * 2.05);
      g.fill();
      g.fillRect(head.x - dir * (headR - 0.3 * s) - 1.2 * s, head.y - 0.6 * s, 2.4 * s, 5.2 * s);
      break;
    case 'bun':
      g.beginPath();
      g.arc(head.x - dir * 0.3 * s, head.y - 0.4 * s, headR * 1.03, Math.PI * 1, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.arc(head.x - dir * headR * 0.9, head.y - headR * 0.7, 1.3 * s, 0, Math.PI * 2);
      g.fill();
      break;
    case 'bald':
      g.fillRect(head.x - dir * headR - 0.3 * s, head.y - 0.6 * s, 1 * s, 1.8 * s);
      break;
    case 'cap':
      g.fillStyle = n.c('#4a4540');
      g.beginPath();
      g.ellipse(head.x, head.y - headR * 0.55, headR * 1.15, headR * 0.6, 0, Math.PI, Math.PI * 2);
      g.fill();
      g.fillRect(head.x + (dir > 0 ? 0 : -headR * 1.6), head.y - headR * 0.62, headR * 1.6, 0.8 * s);
      break;
    case 'scarf': {
      g.fillStyle = n.c(look.scarf);
      g.beginPath();
      g.arc(head.x, head.y - 0.2 * s, headR * 1.22, Math.PI * 0.75, Math.PI * 2.25 - (dir > 0 ? 0.5 : 0));
      g.lineTo(head.x - dir * 0.6 * s, head.y + headR * 1.7);
      g.closePath();
      g.fill();
      g.fillStyle = n.c(look.skin);
      g.beginPath();
      g.arc(head.x + dir * 0.7 * s, head.y + 0.2 * s, headR * 0.62, 0, Math.PI * 2);
      g.fill();
      break;
    }
  }
  if (pose.helmet) {
    g.fillStyle = n.c('#f2c21b');
    g.beginPath();
    g.ellipse(head.x, head.y - headR * 0.35, headR * 1.25, headR * 0.85, 0, Math.PI, Math.PI * 2);
    g.fill();
    g.fillRect(head.x - headR * 1.4, head.y - headR * 0.4, headR * 2.8, 0.7 * s);
  }
  // göz
  g.fillStyle = n.c('#1d1a17');
  g.fillRect(head.x + dir * headR * 0.45 - 0.35 * s, head.y - 0.3 * s, 0.7 * s, 0.7 * s);
  g.strokeStyle = ink;
  g.lineWidth = 0.6;
  g.beginPath();
  g.arc(head.x, head.y, headR, 0, Math.PI * 2);
  g.stroke();

  // öndeki kol ve eşyalar
  const hand = arm(true, n.c(look.top));
  const prop = pose.carry && pose.carry !== 'none' ? pose.carry : look.prop;
  drawProp(g, h, hand.hx, hand.hy, s, dir, prop, pose, y);

  if (pose.umbrella && pose.umbrella > 0) drawUmbrella(g, h, hand.hx, hand.hy, head.y, s, look.umbrella, pose.umbrella, pose.flipped ?? 0);
}

function drawProp(g: CanvasRenderingContext2D, h: Host, hx: number, hy: number, s: number, dir: number, prop: string, pose: Pose, footY: number) {
  const n = h.night;
  const ink = n.c(INK);
  g.lineWidth = 0.6;
  g.strokeStyle = ink;
  switch (prop) {
    case 'bag':
      g.fillStyle = n.c('#8a4a2a');
      g.fillRect(hx - 1.5 * s, hy, 3 * s, 3.4 * s);
      g.strokeRect(hx - 1.5 * s, hy, 3 * s, 3.4 * s);
      break;
    case 'briefcase':
      g.fillStyle = n.c('#2b2420');
      g.fillRect(hx - 2.4 * s, hy + 0.4 * s, 4.8 * s, 3.2 * s);
      break;
    case 'file':
      g.strokeStyle = n.c('#cfc8b8');
      g.beginPath();
      g.arc(hx, hy + 2.6 * s, 2.2 * s, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = n.c('#e8901f');
      for (const [a, b] of [
        [-0.8, 2.2],
        [0.9, 2.8],
        [0, 3.6],
      ]) {
        g.beginPath();
        g.arc(hx + a * s, hy + b * s, 0.9 * s, 0, Math.PI * 2);
        g.fill();
      }
      break;
    case 'newspaper':
      g.fillStyle = n.c('#ece6d6');
      g.fillRect(hx - dir * 3 * s, hy - 3 * s, 3 * s, 4.2 * s);
      break;
    case 'phone':
      g.fillStyle = n.c('#1d1d20');
      g.fillRect(hx - 0.6 * s, hy - 1.4 * s, 1.2 * s, 2.2 * s);
      if (h.dark > 0.4) {
        g.fillStyle = 'rgba(190,220,255,0.8)';
        g.fillRect(hx - 0.4 * s, hy - 1.2 * s, 0.8 * s, 1.6 * s);
      }
      break;
    case 'cane':
      g.strokeStyle = n.c('#5a3e2b');
      g.lineWidth = 0.9 * s;
      g.beginPath();
      g.moveTo(hx, hy);
      g.lineTo(hx + dir * 1.8 * s, footY);
      g.stroke();
      break;
    case 'tray': {
      // çay tepsisi: elde dengede, içinde ince belli bardaklar
      const tilt = pose.trayTilt ?? 0;
      g.save();
      g.translate(hx + dir * 1.5 * s, hy - 0.6 * s);
      g.rotate(tilt);
      g.strokeStyle = n.c('#b9bec4');
      g.lineWidth = 0.7 * s;
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(0, -9 * s, 0, -11 * s);
      g.stroke();
      g.fillStyle = n.c('#c9ced3');
      g.beginPath();
      g.ellipse(0, 0, 5.4 * s, 1.2 * s, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      for (const gx of [-3, 0, 3]) {
        g.fillStyle = n.c('#b8431c');
        g.beginPath();
        g.moveTo((gx - 0.9) * s, -0.5 * s);
        g.lineTo((gx + 0.9) * s, -0.5 * s);
        g.lineTo((gx + 0.5) * s, -1.8 * s);
        g.lineTo((gx + 1) * s, -3 * s);
        g.lineTo((gx - 1) * s, -3 * s);
        g.lineTo((gx - 0.5) * s, -1.8 * s);
        g.closePath();
        g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.6)';
        g.lineWidth = 0.4;
        g.stroke();
      }
      g.restore();
      break;
    }
    case 'simit':
      g.strokeStyle = n.c('#a65a24');
      g.lineWidth = 1.3 * s;
      g.beginPath();
      g.ellipse(hx + dir * 1.2 * s, hy - 1.4 * s, 2.2 * s, 1.6 * s, 0, 0, Math.PI * 2);
      g.stroke();
      break;
    case 'bread':
      g.fillStyle = n.c('#d49a52');
      g.beginPath();
      g.ellipse(hx + dir * 0.5 * s, hy - 0.6 * s, 3.2 * s, 1.2 * s, -0.3 * dir, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      break;
    case 'shovel':
      g.strokeStyle = n.c('#6b4a2a');
      g.lineWidth = 0.9 * s;
      g.beginPath();
      g.moveTo(hx, hy - 4 * s);
      g.lineTo(hx + dir * 3 * s, footY - 0.5 * s);
      g.stroke();
      g.fillStyle = n.c('#8a8f96');
      g.fillRect(hx + dir * 3 * s - 1.4 * s, footY - 1.8 * s, 2.8 * s, 1.8 * s);
      break;
  }
}

/** Şemsiye: açılırken taç genişler; ters dönünce kubbesi yukarı kıvrılır ve titrer. */
function drawUmbrella(g: CanvasRenderingContext2D, h: Host, hx: number, hy: number, headY: number, s: number, color: string, open: number, flipped: number) {
  const n = h.night;
  const topY = headY - 4.6 * s;
  const rx = 7.6 * s * open;
  const wob = flipped ? Math.sin(h.t * 22) * 1.2 * s : 0;
  g.strokeStyle = n.c('#2b2420');
  g.lineWidth = 0.7 * s;
  g.beginPath();
  g.moveTo(hx, hy + 1.5 * s);
  g.lineTo(hx, topY);
  g.stroke();
  g.fillStyle = n.c(color);
  g.strokeStyle = n.c(INK);
  g.lineWidth = 0.6;
  g.beginPath();
  if (flipped > 0) {
    const cup = 4.2 * s * flipped;
    g.moveTo(hx - rx + wob, topY - cup);
    g.quadraticCurveTo(hx, topY + 2.2 * s, hx + rx + wob, topY - cup);
    g.lineTo(hx + rx * 0.8 + wob, topY - cup - 1 * s);
    g.quadraticCurveTo(hx, topY + 0.4 * s, hx - rx * 0.8 + wob, topY - cup - 1 * s);
  } else {
    g.moveTo(hx - rx, topY + 0.6 * s);
    g.quadraticCurveTo(hx - rx * 0.9, topY - 4.6 * s * open, hx, topY - 4.8 * s * open);
    g.quadraticCurveTo(hx + rx * 0.9, topY - 4.6 * s * open, hx + rx, topY + 0.6 * s);
    // fırfırlı kenar
    for (let i = 3; i >= 0; i--) {
      const a = hx - rx + (rx * 2 * i) / 4;
      g.quadraticCurveTo(a + rx / 4, topY + 2 * s, a, topY + 0.6 * s);
    }
  }
  g.closePath();
  g.fill();
  g.stroke();
}

/** Renk kodunu biraz koyulaştırır (arkadaki kol ve bacak). */
function shadeOf(hex: string) {
  const v = parseInt(hex.slice(1), 16);
  const r = Math.round(((v >> 16) & 255) * 0.78);
  const g = Math.round(((v >> 8) & 255) * 0.78);
  const b = Math.round((v & 255) * 0.78);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
