/*
 * Ekran İhalesi'nin veri modeli: bir ekran tasarımı, 1024×768'lik sanal bir yüzeyde duran
 * bileşenlerin listesidir. Editör, canlı önizleme, PNG ve paylaşım bağlantısı hep bu modeli
 * kullanır. Paylaşılan bağlantıdan gelen tasarım başkasının elinden çıkar: `sanitize` onu
 * yalnızca bilinen alanlara, sınırlı sayılara ve renklere indirger.
 */

export const W = 1024;
export const H = 768;
export const GRID = 8;
export const MAX_WIDGETS = 80;
const MAX_TEXT = 300;

export type Kind = 'box' | 'text' | 'clock' | 'date' | 'number' | 'patient' | 'queue' | 'ticker' | 'logo' | 'taskbar' | 'nextStop' | 'terminus' | 'stops' | 'lineMap' | 'video';
export type Align = 'start' | 'middle' | 'end';
export type FontId = 'sans' | 'tahoma' | 'serif' | 'mono' | 'round' | 'heavy';
export type SceneId = 'bogaz' | 'kis';
export type Motion = 'sabit' | 'gecisli';
export type PresetId = 'hastane' | 'metrobus' | 'otobus' | 'marmaray';

export interface Widget {
  id: string;
  kind: Kind;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Zemin: `#rrggbb` ya da saydam için `none`. */
  fill: string;
  color: string;
  size: number;
  bold: boolean;
  align: Align;
  font: FontId;
  radius: number;
  /** Yazı; sıra numarasında ve listede numaranın önüne gelir. */
  text: string;
  /** Hasta adı ve sıradakiler: KVKK gereği adı yıldızla. */
  mask: boolean;
  /** Vurgu: duraklarda şimdiki durak, hat haritasında araç. */
  accent: string;
  /** Video alanında oynayan manzara. */
  scene: SceneId;
}

export interface Design {
  v: 1;
  preset: PresetId;
  bg: string;
  /** Sabit: ekran hep aynı düzende. Geçişli: durakta ya da çağrıda tam ekran kayan kartlar. */
  motion: Motion;
  /** Geçiş kartlarının rengi. */
  accent: string;
  widgets: Widget[];
}

export const SCENES: Record<SceneId, string> = { bogaz: 'Boğaz köprüsü', kis: 'Karlı orman' };

/** Her ekranın kendi kurum rengi: geçiş kartları bununla açılır. */
export const PRESET_ACCENT: Record<PresetId, string> = { hastane: '#0e5a8a', metrobus: '#1d3f8f', otobus: '#1d2a44', marmaray: '#c0262d' };

export const FONTS: Record<FontId, { label: string; css: string }> = {
  sans: { label: 'Arial', css: 'Arial, Helvetica, sans-serif' },
  tahoma: { label: 'Tahoma (2004)', css: 'Tahoma, Verdana, sans-serif' },
  round: { label: 'Trebuchet', css: '"Trebuchet MS", "Segoe UI", sans-serif' },
  heavy: { label: 'Kalın başlık', css: '"Arial Black", Impact, sans-serif' },
  serif: { label: 'Tırnaklı', css: 'Georgia, "Times New Roman", serif' },
  mono: { label: 'Daktilo', css: '"Courier New", monospace' },
};

/** Bileşen hangi ekranlarda anlamlı: hepsinde, hastanede ya da ulaşım ekranlarında. */
export type Scope = 'all' | 'hastane' | 'yol';
export const scopeOf = (preset: PresetId): Exclude<Scope, 'all'> => (preset === 'hastane' ? 'hastane' : 'yol');

/** Bileşen paleti: editördeki ekleme düğmeleri ve yeni bileşenin ilk hâli. */
export const KINDS: Record<Kind, { label: string; hint: string; scope: Scope; base: Partial<Widget> }> = {
  text: { scope: 'all', label: 'Yazı', hint: 'Başlık, poliklinik adı, doktor', base: { w: 360, h: 64, text: 'Yeni yazı', size: 32 } },
  box: { scope: 'all', label: 'Kutu', hint: 'Zemin, şerit, çerçeve', base: { w: 240, h: 160, fill: '#0e5a8a', text: '' } },
  clock: { scope: 'all', label: 'Saat', hint: 'Canlı saat', base: { w: 200, h: 80, size: 48, bold: true, text: '' } },
  date: { scope: 'all', label: 'Tarih', hint: 'Bugünün tarihi', base: { w: 240, h: 48, size: 24, text: '' } },
  number: { scope: 'hastane', label: 'Sıra numarası', hint: 'Muayenedeki numara', base: { w: 220, h: 160, size: 96, bold: true, align: 'middle', fill: '#0e5a8a', color: '#ffffff', text: '' } },
  patient: { scope: 'hastane', label: 'Hasta adı', hint: 'Çağrılan hasta', base: { w: 520, h: 120, size: 48, bold: true, align: 'middle', text: '', mask: true } },
  queue: { scope: 'hastane', label: 'Sıradakiler', hint: 'Bekleyenler listesi', base: { w: 560, h: 180, size: 28, fill: '#ffffff', text: '', mask: true } },
  ticker: { scope: 'all', label: 'Kayan yazı', hint: 'Duyuru bandı', base: { w: W, h: 64, size: 28, fill: '#14212b', color: '#ffd34d', text: 'Lütfen sıra numaranız ekranda görününce muayene odasına giriniz.' } },
  logo: { scope: 'all', label: 'Logo', hint: 'Kurum amblemi', base: { w: 120, h: 120, fill: '#c0392b', color: '#ffffff', radius: 16, text: 'H' } },
  nextStop: { scope: 'yol', label: 'Gelecek durak', hint: 'Yazısı önüne gelir', base: { w: 560, h: 80, size: 36, bold: true, text: 'Gelecek durak:' } },
  terminus: { scope: 'yol', label: 'Son durak', hint: 'Hattın gittiği yer', base: { w: 360, h: 80, size: 44, bold: true, text: '' } },
  stops: { scope: 'yol', label: 'Durak listesi', hint: 'Sıradaki duraklar', base: { w: 240, h: 480, size: 20, fill: '#ffffff', accent: '#f2c500', text: '' } },
  lineMap: { scope: 'yol', label: 'Hat haritası', hint: 'Bütün hat, araç üstünde', base: { x: 24, w: 976, h: 360, size: 16, color: '#1f3fbf', accent: '#e0262d', text: '' } },
  video: { scope: 'all', label: 'Video / reklam', hint: 'Hareketli görüntü alanı', base: { w: 480, h: 320, fill: '#9cc3e4', color: '#ffffff', text: 'REKLAM' } },
  taskbar: { scope: 'hastane', label: 'Görev çubuğu', hint: 'Nostalji: Windows hâlâ açık', base: { x: 0, y: H - 40, w: W, h: 40, fill: '#1c2b3a', color: '#ffffff', size: 16, text: '' } },
};

const DEFAULTS: Omit<Widget, 'id' | 'kind'> = {
  x: 0,
  y: 0,
  w: 200,
  h: 80,
  fill: 'none',
  color: '#14212b',
  size: 28,
  bold: false,
  align: 'start',
  font: 'sans',
  radius: 0,
  text: '',
  mask: false,
  accent: '#e74c3c',
  scene: 'bogaz',
};

let counter = 0;
export const newId = () => `${Date.now().toString(36).slice(-5)}${(counter++).toString(36)}`;

export function makeWidget(kind: Kind, props: Partial<Widget> = {}): Widget {
  return { ...DEFAULTS, ...KINDS[kind].base, ...props, id: props.id ?? newId(), kind };
}

/** Tarayıcıda saklanan taslağın anahtarı, ekran başına bir tane. */
export const draftKey = (preset: string) => `ekran:taslak:${preset}`;

export const snap = (n: number) => Math.round(n / GRID) * GRID;

// ── Hazır ekranlar ──────────────────────────────────────────────

export interface Preset {
  id: PresetId;
  title: string;
  place: string;
  ready: boolean;
}

export const PRESETS: Preset[] = [
  { id: 'hastane', title: 'Hastane sıra ekranı', place: 'Genel Cerrahi Polikliniği 2', ready: true },
  { id: 'metrobus', title: 'Metrobüs ekranı', place: 'Gelecek durak: Fikirtepe', ready: true },
  { id: 'otobus', title: 'Belediye otobüsü', place: '98G · Bakırköy → Giyimkent', ready: true },
  { id: 'marmaray', title: 'Marmaray hat ekranı', place: 'Son istasyon: Gebze', ready: true },
];

const w = makeWidget;

/** Bugün duvarda asılı olan, fotoğraftaki gibi: gri başlık, yeşil "Muayene" şeridi, boş "Sıradaki" satırları. */
function hospitalCurrent(preset: PresetId): Design {
  const g = { font: 'tahoma' as const, color: '#333333' };
  // "Sıradaki" satırları: gri kenarlık için bir piksel büyük gri kutu, üstünde beyaz satır
  const row = (y: number) => [w('box', { x: 24, y, w: 976, h: 52, fill: '#bdbdbd' }), w('text', { ...g, x: 26, y: y + 2, w: 972, h: 48, fill: '#ffffff', size: 22, text: 'Sıradaki' })];
  return {
    v: 1,
    preset,
    bg: '#f4f4f4',
    motion: 'sabit',
    accent: PRESET_ACCENT[preset],
    widgets: [
      w('box', { x: 0, y: 0, w: W, h: 72, fill: '#e6e8ea' }),
      w('text', { ...g, x: 8, y: 0, w: 600, h: 36, size: 17, color: '#555555', text: 'GENEL CERRAHİ POL.' }),
      w('clock', { ...g, x: 736, y: 4, w: 272, h: 68, size: 56, bold: true, align: 'end', color: '#1a1a1a' }),
      w('text', { ...g, x: 24, y: 80, w: 150, h: 38, fill: '#cfe9d3', radius: 3, size: 21, align: 'middle', text: 'Muayene' }),
      w('box', { x: 24, y: 118, w: 976, h: 100, fill: '#bfe3c6' }),
      w('number', { ...g, x: 24, y: 118, w: 200, h: 100, fill: 'none', size: 54, bold: true, align: 'start', color: '#222222' }),
      w('patient', { ...g, x: 250, y: 118, w: 560, h: 100, fill: 'none', size: 38, bold: false, align: 'start', color: '#2a2a2a' }),
      w('date', { ...g, x: 816, y: 196, w: 168, h: 30, fill: '#ffffff', size: 16, align: 'middle' }),
      ...row(244),
      ...row(304),
      w('text', { ...g, x: 162, y: 616, w: 700, h: 60, size: 30, align: 'middle', text: 'OP.DR STETO SKOPOĞLU' }),
    ],
  };
}

/** Metrobüs: üstte gelecek durak, ortada kar manzaralı video, sağda dar durak şeridi. */
function metrobusCurrent(preset: PresetId): Design {
  const navy = '#14244a';
  const white = '#ffffff';
  return {
    v: 1,
    preset,
    bg: '#0b1630',
    motion: 'sabit',
    accent: PRESET_ACCENT[preset],
    widgets: [
      w('box', { x: 0, y: 0, w: W, h: 72, fill: navy }),
      w('logo', { x: 16, y: 10, w: 52, h: 52, fill: navy, color: '#f39c12', text: 'M' }),
      w('nextStop', { x: 80, y: 0, w: 640, h: 72, size: 28, bold: true, color: white, text: 'GELECEK DURAK' }),
      w('clock', { x: 824, y: 0, w: 184, h: 72, size: 44, bold: true, align: 'end', color: white }),
      w('video', { x: 0, y: 72, w: 824, h: 632, fill: '#cfe0ee', color: '#ffffff', text: '', scene: 'kis' }),
      w('stops', { x: 824, y: 72, w: 200, h: 632, fill: white, color: '#1a2b55', accent: '#fbd1cc', size: 15, bold: true }),
      w('box', { x: 0, y: 704, w: W, h: 64, fill: navy }),
      w('text', { x: 16, y: 704, w: 260, h: 64, size: 14, color: '#9fb0cf', text: 'Akıllı kart dolum: 0850 ...' }),
      w('text', { x: 276, y: 704, w: 548, h: 64, size: 16, color: '#cfd6e6', align: 'middle', text: 'SÖĞÜTLÜÇEŞME - BEYLİKDÜZÜ' }),
      w('date', { x: 824, y: 704, w: 200, h: 64, size: 16, color: white, align: 'middle' }),
    ],
  };
}

/** Belediye otobüsü: hat numarası, ok ve son durak; solda sarı vurgulu durak listesi, sağda video. */
function busCurrent(preset: PresetId): Design {
  const ink = '#1d2a44';
  const white = '#ffffff';
  return {
    v: 1,
    preset,
    bg: '#cfd4da',
    motion: 'sabit',
    accent: PRESET_ACCENT[preset],
    widgets: [
      w('text', { x: 0, y: 0, w: 136, h: 88, fill: ink, color: white, size: 40, bold: true, align: 'middle', text: '98G' }),
      w('terminus', { x: 136, y: 0, w: 600, h: 88, fill: white, color: ink, size: 44, bold: true, text: '→' }),
      w('date', { x: 744, y: 0, w: 280, h: 40, fill: '#f3f3f3', size: 20, color: '#444444', align: 'end' }),
      w('clock', { x: 744, y: 40, w: 280, h: 48, fill: '#f3f3f3', size: 36, bold: true, color: ink, align: 'end' }),
      w('stops', { x: 0, y: 96, w: 296, h: 560, fill: white, color: '#333333', accent: '#f2d12e', size: 20, bold: true }),
      w('video', { x: 304, y: 96, w: 720, h: 560, fill: '#9cc3e4', color: '#ffffff', text: '', scene: 'bogaz' }),
      w('box', { x: 0, y: 664, w: W, h: 104, fill: '#3b4352' }),
      w('nextStop', { x: 0, y: 664, w: 700, h: 104, color: white, size: 26, bold: false, text: 'Sonraki Durak / Next Stop:' }),
      w('text', { x: 700, y: 664, w: 324, h: 104, color: '#f2d12e', size: 20, align: 'end', text: 'Aktarma: Metrobüs' }),
    ],
  };
}

/** Marmaray: kırmızı başlık, beyaz zeminde kıvrılan hat; geçilen duraklar gri, şimdiki kırmızı. */
function marmarayCurrent(preset: PresetId): Design {
  const red = '#c0262d';
  const white = '#ffffff';
  return {
    v: 1,
    preset,
    bg: '#ffffff',
    motion: 'sabit',
    accent: PRESET_ACCENT[preset],
    widgets: [
      w('box', { x: 0, y: 0, w: W, h: 96, fill: red }),
      w('logo', { x: 16, y: 12, w: 72, h: 72, fill: white, color: red, radius: 4, text: 'M' }),
      w('date', { x: 100, y: 0, w: 176, h: 96, size: 26, bold: true, color: white }),
      w('clock', { x: 268, y: 0, w: 100, h: 96, size: 26, bold: true, color: white }),
      w('text', { x: 368, y: 0, w: 220, h: 96, size: 26, bold: true, color: white, text: 'Son İstasyon' }),
      w('terminus', { x: 600, y: 0, w: 408, h: 96, size: 56, bold: true, color: white, align: 'end' }),
      w('lineMap', { x: 24, y: 120, w: 976, h: 500, size: 17, bold: true, color: '#1f3fbf', accent: '#e0262d' }),
      w('text', { x: 520, y: 656, w: 480, h: 72, size: 36, bold: true, color: '#1f3fbf', align: 'end', text: 'Train Number : 3030' }),
    ],
  };
}

/** Bugün duvarda ya da tavanda asılı olan ekran. */
export function currentDesign(preset: PresetId = 'hastane'): Design {
  if (preset === 'metrobus') return metrobusCurrent(preset);
  if (preset === 'otobus') return busCurrent(preset);
  if (preset === 'marmaray') return marmarayCurrent(preset);
  return hospitalCurrent(preset);
}

/** Editörün örneği: aynı bilgiler, okunur hâli. */
export function sampleDesign(preset: PresetId = 'hastane'): Design {
  return preset === 'hastane' ? hospitalSample(preset) : transitSample(preset);
}

/** Ulaşım ekranlarının örneği: büyük "gelecek durak", altında bütün hat, kenarda saat. */
function transitSample(preset: PresetId): Design {
  const dark = '#101820';
  const white = '#ffffff';
  const yellow = '#ffd34d';
  return {
    v: 1,
    preset,
    bg: '#f4f6f8',
    motion: 'gecisli',
    accent: PRESET_ACCENT[preset],
    widgets: [
      w('box', { x: 0, y: 0, w: W, h: 220, fill: dark }),
      w('text', { x: 40, y: 24, w: 600, h: 40, size: 22, color: '#9aa7b4', text: 'GELECEK DURAK' }),
      w('nextStop', { x: 40, y: 64, w: 720, h: 120, size: 76, bold: true, color: white, text: '' }),
      w('clock', { x: 760, y: 24, w: 224, h: 80, size: 56, bold: true, align: 'end', color: white }),
      w('terminus', { x: 600, y: 120, w: 384, h: 64, size: 26, color: yellow, align: 'end', text: 'Son durak:' }),
      w('lineMap', { x: 24, y: 252, w: 976, h: 420, size: 16, bold: true, color: '#1f3fbf', accent: '#e0262d' }),
      w('ticker', { x: 0, y: 696, h: 72, fill: dark, color: yellow, text: 'Lütfen inecek yolculara yol veriniz. · Kapı kapanırken binmeye çalışmayınız. · İyi yolculuklar.' }),
    ],
  };
}

export function blankDesign(preset: PresetId = 'hastane'): Design {
  return { v: 1, preset, bg: '#0f2a3d', motion: 'sabit', accent: PRESET_ACCENT[preset], widgets: [] };
}

function hospitalSample(preset: PresetId): Design {
  const white = '#ffffff';
  const ink = '#14212b';
  const muted = '#5a6b7a';
  const navy = '#0e5a8a';
  return {
    v: 1,
    preset,
    bg: '#f5f7fa',
    motion: 'gecisli',
    accent: PRESET_ACCENT[preset],
    widgets: [
      w('box', { x: 0, y: 0, w: W, h: 96, fill: navy }),
      w('logo', { x: 24, y: 16, w: 64, h: 64, fill: white, color: navy, radius: 14, size: 40 }),
      w('text', { x: 104, y: 0, w: 640, h: 96, size: 34, bold: true, color: white, text: 'Genel Cerrahi Polikliniği 2' }),
      w('clock', { x: 760, y: 0, w: 232, h: 96, size: 52, bold: true, align: 'end', color: white }),
      w('text', { x: 40, y: 128, w: 300, h: 40, size: 22, color: muted, text: 'MUAYENEDE' }),
      w('text', { x: 400, y: 128, w: 584, h: 40, size: 22, color: muted, align: 'end', text: 'Op. Dr. Steto Skopoğlu' }),
      w('number', { x: 40, y: 176, w: 300, h: 220, fill: navy, radius: 24, color: white, size: 132 }),
      w('patient', { x: 368, y: 176, w: 616, h: 220, fill: white, radius: 24, color: ink, size: 56 }),
      w('text', { x: 40, y: 424, w: 300, h: 40, size: 22, color: muted, text: 'SIRADAKİLER' }),
      w('date', { x: 584, y: 424, w: 400, h: 40, size: 22, color: muted, align: 'end' }),
      w('queue', { x: 40, y: 472, w: 944, h: 184, fill: white, radius: 16, color: ink, size: 30 }),
      w('ticker', { x: 0, y: 688, h: 80, text: 'Lütfen sıra numaranız ekranda görününce muayene odasına giriniz. · Randevu saatinizden 15 dakika önce gelmeniz rica olunur.' }),
    ],
  };
}

// ── Dışarıdan gelen tasarımı temizleme ──────────────────────────

const COLOR = /^#[0-9a-f]{6}$/i;
const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const num = (x: unknown, min: number, max: number, fallback: number) => (typeof x === 'number' && Number.isFinite(x) ? Math.round(Math.min(max, Math.max(min, x))) : fallback);
const color = (x: unknown, fallback: string, allowNone = false) => (typeof x === 'string' && (COLOR.test(x) || (allowNone && x === 'none')) ? x.toLowerCase() : fallback);
const oneOf = <T extends string>(x: unknown, list: readonly T[], fallback: T): T => (list.includes(x as T) ? (x as T) : fallback);
// kontrol karakterleri atılır; yalnızca satır sonu kalır
const printable = (c: string) => c === '\n' || (c >= ' ' && c !== '\u007f');
const text = (x: unknown) => (typeof x === 'string' ? [...x].filter(printable).join('').slice(0, MAX_TEXT) : '');

const KIND_IDS = Object.keys(KINDS) as Kind[];
const FONT_IDS = Object.keys(FONTS) as FontId[];
const PRESET_IDS = PRESETS.map((p) => p.id);

function cleanWidget(x: unknown): Widget | null {
  if (!isRecord(x) || !KIND_IDS.includes(x.kind as Kind)) return null;
  return {
    id: typeof x.id === 'string' && /^[a-z0-9]{1,16}$/.test(x.id) ? x.id : newId(),
    kind: x.kind as Kind,
    x: num(x.x, -W, W, 0),
    y: num(x.y, -H, H, 0),
    w: num(x.w, GRID, W * 2, 200),
    h: num(x.h, GRID, H * 2, 80),
    fill: color(x.fill, 'none', true),
    color: color(x.color, DEFAULTS.color),
    size: num(x.size, 6, 300, DEFAULTS.size),
    bold: x.bold === true,
    align: oneOf(x.align, ['start', 'middle', 'end'] as const, 'start'),
    font: oneOf(x.font, FONT_IDS, 'sans'),
    radius: num(x.radius, 0, 400, 0),
    text: text(x.text),
    mask: x.mask === true,
    accent: color(x.accent, DEFAULTS.accent),
    scene: oneOf(x.scene, Object.keys(SCENES) as SceneId[], 'bogaz'),
  };
}

/** Bilinmeyen alanları atar, sayıları sınırlar; tasarım değilse null. */
export function sanitize(x: unknown): Design | null {
  if (!isRecord(x) || x.v !== 1 || !Array.isArray(x.widgets)) return null;
  const widgets = x.widgets.slice(0, MAX_WIDGETS).map(cleanWidget).filter((wd): wd is Widget => wd !== null);
  // aynı kimlik iki kez gelirse seçme ve sürükleme karışmasın
  const seen = new Set<string>();
  for (const wd of widgets) {
    if (seen.has(wd.id)) wd.id = newId();
    seen.add(wd.id);
  }
  const preset = oneOf(x.preset, PRESET_IDS, 'hastane');
  return { v: 1, preset, bg: color(x.bg, '#0f2a3d'), motion: oneOf(x.motion, ['sabit', 'gecisli'] as const, 'sabit'), accent: color(x.accent, PRESET_ACCENT[preset]), widgets };
}
