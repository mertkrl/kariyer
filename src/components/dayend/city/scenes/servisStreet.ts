import { BH, KB, KS, STRIP_M } from './servisLayout';
import { glow, glowRect, makeRng, pick, range, rgba, vGradient, type RGB } from '../kit';

/**
 * The street outside, pre-rendered as two long strips that scroll past: the buildings across
 * the road (plaza lobbies, neon, shops) and the pavement with its umbrellas.
 */
export function paintStreet(): { buildings: HTMLCanvasElement; pavement: HTMLCanvasElement } {
  const rb = makeRng(12);
  // buildings across the street, one long strip
  const buildings = document.createElement('canvas');
  buildings.width = Math.round(STRIP_M * KB);
  buildings.height = BH;
  const b = buildings.getContext('2d')!;
  b.fillStyle = vGradient(b, 0, 40, [
    [0, '#2b1f26'],
    [1, '#4a3334'],
  ]);
  b.fillRect(0, 0, buildings.width, 40);
  const SIGNS: [string, RGB][] = [
    ['ECZANE', [60, 255, 120]],
    ['DÖNER', [255, 120, 40]],
    ['KAFE', [255, 190, 90]],
    ['MARKET', [90, 200, 255]],
    ['BANKA', [120, 170, 255]],
    ['SİMİT', [255, 210, 120]],
    ['KUAFÖR', [255, 90, 200]],
  ];
  for (let x = 0; x < buildings.width; ) {
    const w = range(rb, 18, 44) * KB;
    const glass = rb() < 0.6;
    const top = range(rb, -10, 30);
    b.fillStyle = glass ? '#1d2436' : '#3a3130';
    b.fillRect(x, top, w - 2, 96 - top);
    for (let y = top + 4; y < 80; y += 7) {
      const floorLit = rb() < 0.6;
      for (let wx = x + 3; wx < x + w - 6; wx += 5) {
        const lit = floorLit ? rb() < 0.85 : rb() < 0.1;
        b.fillStyle = lit ? rgba(glass ? ([210, 228, 255] as RGB) : ([255, 206, 140] as RGB), range(rb, 0.5, 0.9)) : 'rgba(20,24,34,0.9)';
        b.fillRect(wx, y, 3.4, 4.2);
      }
    }
    // shops at street level: each its own light, some already shuttered for the night
    b.fillStyle = '#17141a';
    b.fillRect(x, 80, w - 2, 16);
    for (let sx = x + 3; sx < x + w - 8; ) {
      const sw = Math.min(x + w - 5 - sx, range(rb, 14, 30));
      if (rb() < 0.22) {
        // a rolled-down steel shutter
        b.fillStyle = '#4a4850';
        b.fillRect(sx, 83, sw, 13);
        b.fillStyle = 'rgba(0,0,0,0.3)';
        for (let ly = 84; ly < 96; ly += 1.6) b.fillRect(sx, ly, sw, 0.5);
      } else {
        const tone = pick(rb, [
          [255, 214, 160],
          [255, 236, 200],
          [210, 232, 255],
          [255, 190, 130],
        ] as RGB[]);
        const shop = b.createLinearGradient(0, 83, 0, 96);
        shop.addColorStop(0, rgba(tone, 0.95));
        shop.addColorStop(1, rgba(tone, 0.6));
        b.fillStyle = shop;
        b.fillRect(sx, 83, sw, 13);
        // shelves and people's shapes inside, the mullions, the door
        b.fillStyle = 'rgba(60,40,30,0.35)';
        for (let k = 0; k < 3; k++) b.fillRect(sx + range(rb, 1, sw - 4), range(rb, 86, 91), range(rb, 2, 5), range(rb, 3, 8));
        b.fillStyle = '#211d22';
        for (let mx = sx + 6; mx < sx + sw - 2; mx += 6) b.fillRect(mx, 83, 0.8, 13);
        b.fillRect(sx + sw * 0.62, 84, sw * 0.18, 12);
        // a striped awning on some
        if (rb() < 0.4) {
          const [ar, ag, ab] = pick(rb, [
            [170, 40, 40],
            [40, 110, 80],
            [40, 70, 150],
          ] as RGB[]);
          for (let ax = sx - 1; ax < sx + sw + 1; ax += 2) {
            b.fillStyle = (ax - sx) % 4 < 2 ? `rgb(${ar},${ag},${ab})` : '#e9e2d4';
            b.beginPath();
            b.moveTo(ax, 81);
            b.lineTo(ax + 2, 81);
            b.lineTo(ax + 2.6, 84.5);
            b.lineTo(ax + 0.6, 84.5);
            b.fill();
          }
        }
      }
      sx += sw + 1.5;
    }
    if (rb() < 0.7) {
      const [name, c] = pick(rb, SIGNS);
      b.fillStyle = '#0d0c10';
      b.fillRect(x + 6, 74, Math.min(w - 12, 40), 7);
      b.fillStyle = rgba(c);
      b.font = '700 6px sans-serif';
      b.textBaseline = 'middle';
      b.fillText(name, x + 8, 77.6, Math.min(w - 16, 36));
      b.globalCompositeOperation = 'lighter';
      glowRect(b, x + 6 + Math.min(w - 12, 40) / 2, 77, Math.min(w - 12, 40) * 1.4, 18, c, 0.5);
      b.globalCompositeOperation = 'source-over';
    }
    x += w;
  }
  // pavement strip: kerb, lamp posts, bus stop, bollards
  const pavement = document.createElement('canvas');
  pavement.width = Math.round(STRIP_M * KS);
  pavement.height = BH;
  const p = pavement.getContext('2d')!;
  p.fillStyle = vGradient(p, 96, 118, [
    [0, '#2c2a30'],
    [1, '#3a3840'],
  ]);
  p.fillRect(0, 96, pavement.width, 22);
  p.fillStyle = '#56545c';
  p.fillRect(0, 117, pavement.width, 3);
  for (let x = 30; x < pavement.width; x += 30 * KS) {
    p.fillStyle = '#16151a';
    p.fillRect(x, 20, 2.2, 97);
    p.fillRect(x - 10, 20, 12, 2);
    p.globalCompositeOperation = 'lighter';
    glow(p, x - 9, 23, 14, [235, 238, 255], 0.9, true);
    glowRect(p, x - 9, 112, 70, 14, [210, 220, 245], 0.2);
    p.globalCompositeOperation = 'source-over';
  }
  for (let x = 200; x < pavement.width; x += 170 * KS) {
    // bus stop with a lit ad panel
    p.fillStyle = 'rgba(160,190,210,0.15)';
    p.fillRect(x, 70, 60, 46);
    p.fillStyle = '#16151a';
    p.fillRect(x, 68, 62, 3);
    p.fillStyle = 'rgba(250,246,236,0.9)';
    p.fillRect(x + 44, 76, 14, 32);
    p.globalCompositeOperation = 'lighter';
    glowRect(p, x + 51, 92, 40, 50, [255, 250, 235], 0.35);
    p.globalCompositeOperation = 'source-over';
  }
  return { buildings, pavement };
}
