/*
 * Pre-rendered A4 résumé textures for the paper simulation: a photo, a name and title, section
 * headings, body text, skill chips — plus the blank back of a sheet and an "ELENDİ" stamp.
 */

export const PAPER_W = 58;
export const PAPER_H = 82;
const RES = 2.4;

const NAMES = ['Elif Yıldız', 'Mert Aydın', 'Zeynep Kaya', 'Burak Demir', 'Selin Öztürk', 'Can Arslan', 'Ayşe Çelik', 'Emre Şahin', 'Deniz Koç', 'Nazlı Erdem', 'Oğuz Kurt', 'İrem Aksoy'];
const TITLES = ['Yazılım Geliştirici', 'Muhasebe Uzmanı', 'Pazarlama Uzmanı', 'Veri Analisti', 'Satış Temsilcisi', 'İK Asistanı', 'Grafik Tasarımcı', 'Proje Yöneticisi'];
const ACCENTS = ['#2f5f8f', '#2d6b5e', '#8a4f44', '#5f4f7a', '#8a6d1c', '#3f6f4f'];
const SKIN = ['#e8c4a4', '#d9a882', '#c08a64', '#f0d2b8'];
const HAIR = ['#2b1d14', '#4a3222', '#6b4a2a', '#1a1a1a', '#8a5a2a'];

export interface PaperTextures {
  fronts: HTMLCanvasElement[];
  glitch: HTMLCanvasElement;
  back: HTMLCanvasElement;
  stamp: HTMLCanvasElement;
  stampError: HTMLCanvasElement;
  shadows: HTMLCanvasElement[];
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.round(w * RES);
  c.height = Math.round(h * RES);
  const g = c.getContext('2d')!;
  g.scale(RES, RES);
  return { c, g };
}

function paper(g: CanvasRenderingContext2D, tint = '#fbf9f3') {
  const gr = g.createLinearGradient(0, 0, PAPER_W, PAPER_H);
  gr.addColorStop(0, tint);
  gr.addColorStop(1, '#efebe1');
  g.fillStyle = gr;
  g.fillRect(0, 0, PAPER_W, PAPER_H);
  // paper grain
  for (let i = 0; i < 90; i++) {
    g.fillStyle = `rgba(120,110,90,${(Math.random() * 0.05).toFixed(3)})`;
    g.fillRect(Math.random() * PAPER_W, Math.random() * PAPER_H, 0.6, 0.6);
  }
}

function lines(g: CanvasRenderingContext2D, x: number, y: number, w: number, n: number, color = '#b9b2a4') {
  g.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const lw = w * (i === n - 1 ? 0.55 + Math.random() * 0.2 : 0.82 + Math.random() * 0.18);
    g.fillRect(x, y + i * 2.3, lw, 0.9);
  }
  return y + n * 2.3;
}

function front(i: number, tint?: string): HTMLCanvasElement {
  const { c, g } = canvas(PAPER_W, PAPER_H);
  paper(g, tint);
  const accent = ACCENTS[i % ACCENTS.length];
  // header band
  g.fillStyle = accent;
  g.fillRect(0, 0, PAPER_W, 2.2);
  // photo
  g.fillStyle = '#dfe3e8';
  g.fillRect(4, 5, 12, 15);
  g.fillStyle = SKIN[i % SKIN.length];
  g.beginPath();
  g.arc(10, 11, 3.4, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = HAIR[i % HAIR.length];
  g.beginPath();
  g.arc(10, 10, 3.6, Math.PI, 0);
  g.fill();
  g.fillStyle = accent;
  g.beginPath();
  g.ellipse(10, 20, 5.6, 4.4, 0, Math.PI, 0);
  g.fill();
  // name + title
  g.fillStyle = '#23201b';
  g.font = '700 5.2px "Work Sans", Arial, sans-serif';
  g.fillText(NAMES[i % NAMES.length], 19, 9.5, PAPER_W - 22);
  g.fillStyle = accent;
  g.font = '600 3.4px "Work Sans", Arial, sans-serif';
  g.fillText(TITLES[i % TITLES.length], 19, 14, PAPER_W - 22);
  g.fillStyle = '#8f887a';
  g.font = '3px Arial, sans-serif';
  g.fillText('İstanbul · 05xx xxx xx xx', 19, 18.5, PAPER_W - 22);
  let y = 25;
  for (const head of ['DENEYİM', 'EĞİTİM', 'YETENEKLER']) {
    g.fillStyle = accent;
    g.font = '800 3.2px "Work Sans", Arial, sans-serif';
    g.fillText(head, 4, y);
    g.fillRect(4, y + 1, PAPER_W - 8, 0.35);
    y += 3.4;
    if (head === 'YETENEKLER') {
      let x = 4;
      for (let k = 0; k < 5; k++) {
        const w = 7 + Math.random() * 6;
        if (x + w > PAPER_W - 4) break;
        g.fillStyle = '#e4ecef';
        g.fillRect(x, y - 0.4, w, 3);
        x += w + 1.4;
      }
      y += 5;
    } else {
      y = lines(g, 4, y, PAPER_W - 8, head === 'DENEYİM' ? 5 : 3) + 2.6;
    }
  }
  lines(g, 4, y, PAPER_W - 8, 2, '#d3cdc1');
  return c;
}

function stamp(text: string, color: string): HTMLCanvasElement {
  const { c, g } = canvas(40, 16);
  g.translate(20, 8);
  g.rotate(-0.28);
  g.strokeStyle = color;
  g.lineWidth = 1.3;
  g.strokeRect(-17, -5.5, 34, 11);
  g.fillStyle = color;
  g.font = '900 7px "JetBrains Mono", monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 0, 0.4);
  // ink texture: knock out a few specks
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 70; i++) {
    g.fillStyle = `rgba(0,0,0,${(0.3 + Math.random() * 0.6).toFixed(2)})`;
    g.fillRect(Math.random() * 40 - 20, Math.random() * 16 - 8, 0.7, 0.7);
  }
  return c;
}

function shadow(blur: number): HTMLCanvasElement {
  const pad = 14;
  const c = document.createElement('canvas');
  c.width = (PAPER_W + pad * 2) * 2;
  c.height = (PAPER_H + pad * 2) * 2;
  const g = c.getContext('2d')!;
  g.scale(2, 2);
  g.filter = `blur(${blur}px)`;
  g.fillStyle = 'rgba(0,0,0,1)';
  g.fillRect(pad, pad, PAPER_W, PAPER_H);
  return c;
}

let cache: PaperTextures | null = null;

export function paperTextures(): PaperTextures {
  if (cache) return cache;
  const back = canvas(PAPER_W, PAPER_H);
  paper(back.g, '#f4f1ea');
  back.g.globalAlpha = 0.18;
  back.g.translate(PAPER_W, 0);
  back.g.scale(-1, 1);
  lines(back.g, 4, 26, PAPER_W - 8, 14, '#9d968a');
  cache = {
    fronts: Array.from({ length: 10 }, (_, i) => front(i)),
    glitch: front(3, '#f6e2dc'),
    back: back.c,
    stamp: stamp('ELENDİ', '#b8392a'),
    stampError: stamp('HATA', '#b8392a'),
    shadows: [shadow(0.8), shadow(3), shadow(7)],
  };
  return cache;
}

export const SHADOW_PAD = 14;
