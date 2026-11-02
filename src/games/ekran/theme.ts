import type { Design, Kind, Widget } from './model';

/*
 * Hazır renk takımları ve okunurluk. Bir takım bütün ekranı tek tıkla boyar: koyu zeminli
 * bileşenler kurum rengine, açıklar yüzey rengine geçer, yazılar da durdukları zemine göre en okunur
 * renge. Okunurluk, her yazının arkasındaki renkle karşıtlığıdır (WCAG oranı); bekleme salonunda
 * üç metreden okunsun diye 4.5:1 altı zayıf sayılır.
 */

export interface Theme {
  id: string;
  label: string;
  bg: string;
  surface: string;
  strong: string;
  ink: string;
  onStrong: string;
  highlight: string;
}

export const THEMES: Theme[] = [
  { id: 'kurum', label: 'Kurum mavisi', bg: '#f3f6fa', surface: '#ffffff', strong: '#0e5a8a', ink: '#14212b', onStrong: '#ffffff', highlight: '#f2c500' },
  { id: 'gece', label: 'Gece', bg: '#0f1720', surface: '#1b2633', strong: '#2f7dd1', ink: '#e8eef5', onStrong: '#ffffff', highlight: '#ffd34d' },
  { id: 'kontrast', label: 'Yüksek karşıtlık', bg: '#000000', surface: '#111111', strong: '#ffd400', ink: '#ffffff', onStrong: '#000000', highlight: '#ffd400' },
  { id: 'saglik', label: 'Şifa yeşili', bg: '#eef6f1', surface: '#ffffff', strong: '#1f7a4d', ink: '#14261c', onStrong: '#ffffff', highlight: '#ffcf3f' },
  { id: 'sicak', label: 'Tuğla', bg: '#fbf6ef', surface: '#ffffff', strong: '#c0262d', ink: '#2a1d1a', onStrong: '#ffffff', highlight: '#f2a900' },
  { id: 'nostalji', label: '2004', bg: '#d4d0c8', surface: '#ffffff', strong: '#0a246a', ink: '#000000', onStrong: '#ffffff', highlight: '#ffff00' },
];

/** Yazısı olmayan bileşenler: okunurluk hesabına girmez. */
const SILENT: Kind[] = ['box', 'taskbar', 'video', 'lineMap'];
export const hasReadableText = (wd: Widget) => !SILENT.includes(wd.kind);

function rgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Bileşenin yazısının gerçekte üstünde durduğu renk: kendi zemini ya da altındaki en üstteki dolu bileşen. */
export function backdropOf(design: Design, wd: Widget): string {
  if (wd.fill !== 'none') return wd.fill;
  const cx = wd.x + wd.w / 2;
  const cy = wd.y + wd.h / 2;
  const i = design.widgets.indexOf(wd);
  for (let j = i - 1; j >= 0; j--) {
    const o = design.widgets[j];
    if (o.fill !== 'none' && cx >= o.x && cx <= o.x + o.w && cy >= o.y && cy <= o.y + o.h) return o.fill;
  }
  return design.bg;
}

/** Bir zeminde en okunur olan: siyah ya da beyaz. */
export const bestInk = (bg: string) => (contrast(bg, '#000000') >= contrast(bg, '#ffffff') ? '#000000' : '#ffffff');

export interface Readability {
  /** 0–100: yeterince karşıt ve büyük yazıların payı. */
  score: number;
  weak: Widget[];
}

export function readability(design: Design): Readability {
  const texts = design.widgets.filter(hasReadableText);
  if (!texts.length) return { score: 0, weak: [] };
  const weak = texts.filter((wd) => contrast(wd.color, backdropOf(design, wd)) < 4.5 || wd.size < 16);
  return { score: Math.round(((texts.length - weak.length) / texts.length) * 100), weak };
}

export function applyTheme(design: Design, t: Theme): Design {
  // önce zeminler, sonra yazılar: saydam bir yazı altındaki yeni rengi görsün
  const filled = design.widgets.map((wd) => (wd.fill === 'none' ? wd : { ...wd, fill: luminance(wd.fill) < 0.3 || wd.kind === 'ticker' || wd.kind === 'number' ? t.strong : t.surface }));
  const next: Design = { ...design, bg: t.bg, accent: t.strong, widgets: filled };
  next.widgets = filled.map((wd) => {
    const under = backdropOf(next, wd);
    const color = under === t.strong ? t.onStrong : wd.kind === 'lineMap' ? t.strong : t.ink;
    return { ...wd, color, accent: t.highlight };
  });
  return next;
}
