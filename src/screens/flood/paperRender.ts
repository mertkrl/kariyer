import { PAPER_H, PAPER_W, SHADOW_PAD, type paperTextures } from './paperTextures';
import { CAMERA, LIGHT, clamp, pose, type Sheet } from './paperPhysics';

/*
 * Kâğıt sayfalarını 2D canvas'a çizer: masanın üstündeki bir kameradan perspektif izdüşüm,
 * ışık doğrultusunda düşen gölge, eğime göre gölgelendirme, parlama ve iniş damgası.
 */

type Vec3 = [number, number, number];
type Vec2 = readonly [number, number];

export interface PaperView {
  vw: number;
  vh: number;
  dpr: number;
}

export function createPaperRenderer(g: CanvasRenderingContext2D, tex: ReturnType<typeof paperTextures>, view: PaperView) {
  const project = (p: Vec3) => {
    const k = CAMERA / Math.max(200, CAMERA - p[2]);
    return [view.vw / 2 + (p[0] - view.vw / 2) * k, view.vh / 2 + (p[1] - view.vh / 2) * k] as const;
  };

  const affine = (tl: Vec2, tr: Vec2, bl: Vec2) => {
    const { dpr } = view;
    g.setTransform(((tr[0] - tl[0]) / PAPER_W) * dpr, ((tr[1] - tl[1]) / PAPER_W) * dpr, ((bl[0] - tl[0]) / PAPER_H) * dpr, ((bl[1] - tl[1]) / PAPER_H) * dpr, tl[0] * dpr, tl[1] * dpr);
  };

  const face = (s: Sheet, faceUp: boolean) => (faceUp ? (s.glitch ? tex.glitch : tex.fronts[s.tex % tex.fronts.length]) : tex.back);

  function drawShadow(s: Sheet, shrink: number, fade: number) {
    const { tl, tr, bl } = pose(s, shrink);
    const drop = (p: Vec3): Vec3 => [p[0] - (p[2] * LIGHT[0]) / LIGHT[2], p[1] - (p[2] * LIGHT[1]) / LIGHT[2], 0];
    const h = Math.max(0, s.z);
    const sprite = h < 25 ? tex.shadows[0] : h < 170 ? tex.shadows[1] : tex.shadows[2];
    affine(project(drop(tl)), project(drop(tr)), project(drop(bl)));
    g.globalAlpha = (0.3 * (1 - Math.min(1, h / 900)) + 0.06) * fade;
    g.drawImage(sprite, -SHADOW_PAD, -SHADOW_PAD, PAPER_W + SHADOW_PAD * 2, PAPER_H + SHADOW_PAD * 2);
  }

  function drawSheet(s: Sheet, shrink: number, fade: number, t: number) {
    const { dpr } = view;
    const { tl, tr, bl, n: nrm } = pose(s, shrink);
    const ptl = project(tl);
    const ptr = project(tr);
    const pbl = project(bl);
    const pbr = [ptr[0] + pbl[0] - ptl[0], ptr[1] + pbl[1] - ptl[1]] as const;
    const area = (ptr[0] - ptl[0]) * (pbl[1] - ptl[1]) - (ptr[1] - ptl[1]) * (pbl[0] - ptl[0]);
    const faceUp = nrm[2] >= 0;
    // ışıktan gelen parlaklık, sayfa ışığı yakaladığında parlama
    const nl = (faceUp ? 1 : -1) * (nrm[0] * LIGHT[0] + nrm[1] * LIGHT[1] + nrm[2] * LIGHT[2]);
    const bright = 0.6 + 0.4 * Math.max(0, nl);
    const hx = LIGHT[0];
    const hy = LIGHT[1];
    const hz = LIGHT[2] + 1;
    const hl = Math.hypot(hx, hy, hz);
    const spec = Math.pow(Math.max(0, ((faceUp ? 1 : -1) * (nrm[0] * hx + nrm[1] * hy + nrm[2] * hz)) / hl), 30);

    if (Math.abs(area) < 6) {
      // yan dönük: yalnızca kâğıdın ışığı yakalayan kenarı
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.globalAlpha = 0.8 * fade;
      g.strokeStyle = '#f3efe6';
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(ptl[0], ptl[1]);
      g.lineTo(pbr[0], pbr[1]);
      g.stroke();
      return;
    }
    // hızlı sayfalar için hareket bulanıklığı
    const speed = Math.hypot(s.vx, s.vy);
    if (s.state === 'fly' && speed > 900) {
      const k = 0.014;
      affine([ptl[0] - s.vx * k, ptl[1] - s.vy * k], [ptr[0] - s.vx * k, ptr[1] - s.vy * k], [pbl[0] - s.vx * k, pbl[1] - s.vy * k]);
      g.globalAlpha = 0.22 * fade;
      g.drawImage(face(s, faceUp), 0, 0, PAPER_W, PAPER_H);
    }
    affine(ptl, ptr, pbl);
    g.globalAlpha = fade;
    g.drawImage(face(s, faceUp), 0, 0, PAPER_W, PAPER_H);
    // yüzü yukarı indiğinde damga
    if (s.state === 'landed' && faceUp) {
      const k = clamp((t - s.landedAt - 0.15) / 0.22, 0, 1);
      if (k > 0) {
        const back = 1 + 1.7 * (k - 1) ** 3 + 0.7 * (k - 1) ** 2;
        const sc = 1.9 - 0.9 * back;
        const w = 40 * sc * 0.95;
        const h = 16 * sc * 0.95;
        g.globalAlpha = k * 0.9 * fade;
        g.drawImage(s.glitch ? tex.stampError : tex.stamp, PAPER_W / 2 - w / 2, PAPER_H * 0.56 - h / 2, w, h);
      }
    }
    // sayfanın üstünden gölgelendirme geçişi
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.beginPath();
    g.moveTo(ptl[0], ptl[1]);
    g.lineTo(ptr[0], ptr[1]);
    g.lineTo(pbr[0], pbr[1]);
    g.lineTo(pbl[0], pbl[1]);
    g.closePath();
    g.globalAlpha = (1 - bright) * fade;
    g.fillStyle = '#1b160f';
    g.fill();
    if (spec > 0.02) {
      g.globalAlpha = spec * 0.45 * fade;
      g.fillStyle = '#ffffff';
      g.fill();
    }
    g.globalAlpha = 0.18 * fade;
    g.strokeStyle = '#8a8272';
    g.lineWidth = 0.5;
    g.stroke();
  }

  function clear() {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, g.canvas.width, g.canvas.height);
  }

  return { drawShadow, drawSheet, clear };
}
