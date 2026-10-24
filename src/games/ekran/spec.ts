import { H, W, type Design, type Kind, type PresetId, type Widget } from './model';

/*
 * Zor mod: ihale şartnamesi. Her ekranın üç dosyası var; her dosyada kurumun istekleri birer
 * kuraldır ve tasarım üzerinde canlı denetlenir. "Kurula sun" denince kurul dört başlıkta puan
 * verir (şartnameye uyum, okunabilirlik, kontrast, düzen), resmî dilde bir rapor yazar ve kararını
 * mühürler. Hepsi saf fonksiyonlardır: yalnızca tasarıma bakar.
 */

// ── Ölçümler ────────────────────────────────────────────────────

const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(n >> 16) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
};

/** WCAG kontrast oranı, 1–21. */
export function contrast(a: string, b: string) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Yazısı ekranda okunacak bileşenler (hat haritası ve video kendi renklerini çizer). */
const TEXTUAL: Kind[] = ['text', 'clock', 'date', 'number', 'patient', 'queue', 'ticker', 'nextStop', 'terminus', 'stops'];
/** Ekranın asıl bilgisi: uzaktan okunması gerekenler. */
const PRIMARY: Kind[] = ['number', 'patient', 'nextStop', 'terminus', 'clock'];

const area = (wd: Widget) => Math.max(0, Math.min(wd.x + wd.w, W) - Math.max(wd.x, 0)) * Math.max(0, Math.min(wd.y + wd.h, H) - Math.max(wd.y, 0));
const share = (d: Design, kind: Kind) => d.widgets.filter((wd) => wd.kind === kind).reduce((s, wd) => s + area(wd), 0) / (W * H);
const has = (d: Design, kind: Kind) => d.widgets.some((wd) => wd.kind === kind && area(wd) > 0);
const of = (d: Design, kind: Kind) => d.widgets.filter((wd) => wd.kind === kind && area(wd) > 0);

/** Bileşenin yazısının altında kalan renk: kendi zemini, yoksa arkasındaki dolu kutu, yoksa ekran. */
export function backdrop(d: Design, wd: Widget): string {
  if (wd.fill !== 'none') return wd.fill;
  const cx = wd.x + wd.w / 2;
  const cy = wd.y + wd.h / 2;
  const i = d.widgets.indexOf(wd);
  for (let k = i - 1; k >= 0; k--) {
    const b = d.widgets[k];
    if (b.fill !== 'none' && b.kind !== 'video' && cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h) return b.fill;
  }
  return d.bg;
}

const textual = (d: Design) => d.widgets.filter((wd) => TEXTUAL.includes(wd.kind) && area(wd) > 0);
const minContrast = (d: Design) => Math.min(21, ...textual(d).map((wd) => contrast(wd.color, backdrop(d, wd))));
const texts = (d: Design) => d.widgets.map((wd) => wd.text.toLocaleLowerCase('tr-TR')).join(' ');

/** Yazılı bileşenlerin birbirinin üstüne binmesi (küçüğün alanının %15'inden fazlası). */
export function overlaps(d: Design): number {
  const list = textual(d);
  let n = 0;
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
      const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
      if (ix * iy > 0.15 * Math.min(a.w * a.h, b.w * b.h)) n++;
    }
  return n;
}

/** Yazının kaplayacağı yaklaşık genişlik, karakter sayısından (en uzun durak ya da ad için pay bırakılır). */
const SAMPLE: Partial<Record<Kind, number>> = { clock: 5, date: 10, number: 3, patient: 15, nextStop: 14, terminus: 12 };
function textWidth(wd: Widget) {
  const chars = wd.kind === 'text' ? Math.max(...wd.text.split('\n').map((l) => l.length)) : (SAMPLE[wd.kind] ?? 0) + (wd.text ? wd.text.length + 1 : 0);
  return chars * wd.size * 0.58;
}

/** Yazısı kutusuna sığmayan bileşenler (kayan yazı ve listeler kendini keser). */
export function overflowing(d: Design): number {
  return textual(d).filter((wd) => SAMPLE[wd.kind] !== undefined || wd.kind === 'text').filter((wd) => textWidth(wd) > wd.w * 1.08 || wd.size * 1.1 > wd.h * 1.15).length;
}

const offscreen = (d: Design) => d.widgets.filter((wd) => wd.x < -8 || wd.y < -8 || wd.x + wd.w > W + 8 || wd.y + wd.h > H + 8).length;

// ── Kurallar ve dosyalar ────────────────────────────────────────

export interface Rule {
  text: string;
  ok: (d: Design) => boolean;
}

export interface Task {
  id: string;
  preset: PresetId;
  no: string;
  title: string;
  /** Kurumdan gelen yazı: dosyanın hikâyesi. */
  brief: string;
  from: string;
  rules: Rule[];
}

const r = (text: string, ok: (d: Design) => boolean): Rule => ({ text, ok });
const pct = (n: number) => `%${Math.round(n * 100)}`;

const R = {
  has: (kind: Kind, label: string) => r(`${label} ekranda olmalı.`, (d) => has(d, kind)),
  size: (kind: Kind, label: string, min: number) => r(`${label} en az ${min} punto olmalı.`, (d) => has(d, kind) && of(d, kind).every((wd) => wd.size >= min)),
  share: (kind: Kind, label: string, min: number) => r(`${label} ekranın en az ${pct(min)}'ini kaplamalı.`, (d) => share(d, kind) >= min),
  contrast: (min: number) => r(`Bütün yazılar zeminine göre en az ${min}:1 kontrastta olmalı.`, (d) => minContrast(d) >= min),
  masked: r('Hasta adları yıldızlı olmalı (KVKK).', (d) => of(d, 'patient').concat(of(d, 'queue')).every((wd) => wd.mask) && has(d, 'patient')),
  max: (n: number) => r(`Ekranda en fazla ${n} bileşen olmalı.`, (d) => d.widgets.length <= n),
  motion: r('Ekran geçişli çalışmalı (durak ya da çağrı kartları).', (d) => d.motion === 'gecisli'),
  dark: r('Zemin koyu olmalı (gece gözü yormasın).', (d) => lum(d.bg) < 0.08),
  says: (words: string[], label: string) => r(`${label}`, (d) => words.some((w) => texts(d).includes(w))),
  tidy: r('Yazılar kutusuna sığmalı, birbirinin üstüne binmemeli, ekrandan taşmamalı.', (d) => overlaps(d) === 0 && offscreen(d) === 0 && overflowing(d) === 0),
};

export const TASKS: Task[] = [
  {
    id: 'hastane-1',
    preset: 'hastane',
    no: '2026/EKR-0101',
    title: 'Koridordaki teyze',
    from: 'Başhekimlik',
    brief: 'Koridorun öbür ucundan bakan hastalarımız numaranın geçip geçmediğini anlayamıyor. Numara uzaktan okunacak, saat de görünecek.',
    rules: [R.size('number', 'Sıra numarası', 120), R.has('patient', 'Hasta adı'), R.has('clock', 'Saat'), R.contrast(4.5)],
  },
  {
    id: 'hastane-2',
    preset: 'hastane',
    no: '2026/EKR-0102',
    title: 'KVKK denetimi',
    from: 'Hukuk Müşavirliği',
    brief: 'Denetimde ekranda açık isim görülmüştür. Adlar gizlenecek; yine de hasta sırasını takip edebilmeli, doktorun adı da yazmalı.',
    rules: [R.masked, R.has('queue', 'Sıradakiler listesi'), R.says(['dr', 'doktor', 'hekim'], 'Doktorun adı yazmalı ("Dr." geçen bir yazı).'), R.tidy],
  },
  {
    id: 'hastane-3',
    preset: 'hastane',
    no: '2026/EKR-0103',
    title: 'Müdürün logosu',
    from: 'Hastane Müdürlüğü',
    brief: 'Kurumsal kimliğimiz ekranda yeterince temsil edilmemektedir. Logo büyüyecek. Hastalar da şikâyet etmesin, numara yine okunsun.',
    rules: [R.share('logo', 'Logo', 0.2), R.size('number', 'Sıra numarası', 100), R.max(12), R.tidy],
  },
  {
    id: 'metrobus-1',
    preset: 'metrobus',
    no: '2026/EKR-0201',
    title: 'Ayakta yolcu',
    from: 'Hat İşletme Müdürlüğü',
    brief: 'Kalabalıkta tavan ekranını kafasını kaldırıp okuyan yolcu, gelecek durağı bir bakışta görmeli.',
    rules: [R.size('nextStop', 'Gelecek durak', 48), R.has('clock', 'Saat'), R.contrast(4.5), R.tidy],
  },
  {
    id: 'metrobus-2',
    preset: 'metrobus',
    no: '2026/EKR-0202',
    title: 'Reklam geliri',
    from: 'Gelir Daire Başkanlığı',
    brief: 'Video reklam sözleşmemiz sürmektedir; reklam alanı küçültülemez. Bilgiler bu alanın dışına sığdırılacak.',
    rules: [R.share('video', 'Video alanı', 0.35), R.size('nextStop', 'Gelecek durak', 40), R.has('stops', 'Durak listesi'), R.tidy],
  },
  {
    id: 'metrobus-3',
    preset: 'metrobus',
    no: '2026/EKR-0203',
    title: 'Akıllı ekran projesi',
    from: 'Bilgi İşlem Dairesi',
    brief: '"Akıllı ekran" projesi kapsamında ekranlar durağa yaklaşınca kendiliğinden değişecek, bütün hat görünecek, duyurular akacak.',
    rules: [R.motion, R.has('lineMap', 'Hat haritası'), R.has('ticker', 'Kayan duyuru'), R.contrast(4.5)],
  },
  {
    id: 'otobus-1',
    preset: 'otobus',
    no: '2026/EKR-0301',
    title: '57 durak',
    from: 'Ulaşım Planlama',
    brief: '98G hattı 57 duraktır. Yolcu nerede olduğunu ve nereye gittiğini her an bilmeli.',
    rules: [R.has('terminus', 'Son durak'), R.has('lineMap', 'Hat haritası'), R.size('nextStop', 'Gelecek durak', 36), R.tidy],
  },
  {
    id: 'otobus-2',
    preset: 'otobus',
    no: '2026/EKR-0302',
    title: 'Gece seferi',
    from: 'Sürücü Temsilciliği',
    brief: 'Gece seferlerinde parlak ekran sürücünün aynasına yansıyor. Ekran koyu olacak, yazılar yine net okunacak.',
    rules: [R.dark, R.contrast(7), R.size('nextStop', 'Gelecek durak', 40), R.max(14)],
  },
  {
    id: 'otobus-3',
    preset: 'otobus',
    no: '2026/EKR-0303',
    title: 'Başkanın mesajı',
    from: 'Basın Müşavirliği',
    brief: 'Kandil mesajımız bütün araçlarda yayınlanacak; logomuz da görünecek. Yolcu bilgisi bundan zarar görmesin.',
    rules: [R.has('ticker', 'Kayan yazı'), R.share('logo', 'Logo', 0.06), R.size('nextStop', 'Gelecek durak', 44), R.tidy],
  },
  {
    id: 'marmaray-1',
    preset: 'marmaray',
    no: '2026/EKR-0401',
    title: 'Turist sezonu',
    from: 'Turizm Koordinasyon',
    brief: 'Yabancı yolcularımız istasyonları kaçırıyor. Ekranda İngilizce bilgi bulunacak; gelecek istasyon büyük yazacak.',
    rules: [R.says(['next', 'stop', 'station'], 'İngilizce bilgi olmalı ("Next", "Stop" ya da "Station" geçen bir yazı).'), R.size('nextStop', 'Gelecek istasyon', 44), R.contrast(4.5), R.tidy],
  },
  {
    id: 'marmaray-2',
    preset: 'marmaray',
    no: '2026/EKR-0402',
    title: '43 istasyon',
    from: 'Hat Bakım Şefliği',
    brief: 'Haritada 43 istasyonun hepsi görünüyor ama yolcu sıradakini bulamıyor. Harita büyük kalacak; gelecek istasyon ayrıca, iri harflerle yazacak.',
    rules: [R.share('lineMap', 'Hat haritası', 0.4), R.size('nextStop', 'Gelecek istasyon', 40), R.has('terminus', 'Son istasyon'), R.tidy],
  },
  {
    id: 'marmaray-3',
    preset: 'marmaray',
    no: '2026/EKR-0403',
    title: 'Kapı uyarısı',
    from: 'Yolcu Hizmetleri',
    brief: 'Yolcular kapının hangi taraftan açılacağını bilmiyor. Ekran istasyona yaklaşınca uyaracak; saat ve tarih de duracak.',
    rules: [R.motion, R.has('clock', 'Saat'), R.has('date', 'Tarih'), R.contrast(4.5)],
  },
];

export const taskById = (id: string) => TASKS.find((t) => t.id === id);

// ── Kurul değerlendirmesi ───────────────────────────────────────

export interface Score {
  label: string;
  value: number;
}

export type Verdict = 'kabul' | 'sartli' | 'ret';

export interface Report {
  passed: boolean[];
  scores: Score[];
  total: number;
  stars: 0 | 1 | 2 | 3;
  verdict: Verdict;
  notes: string[];
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

const NOTES: Record<string, string[]> = {
  Okunabilirlik: ['Kurul üyelerinden ikisi yazıları okumak için gözlüklerini değiştirmek zorunda kalmıştır.', 'Asıl bilgilerin puntosunun artırılması tavsiye edilir.'],
  Kontrast: ['Bazı yazılar zeminine karışmaktadır; toplantı salonunun ışığı kapatılınca hiç görünmemiştir.', 'Renk seçimi estetik bulunmuş, ancak okunaklı bulunmamıştır.'],
  Düzen: ['Bazı yazılar kutusundan taşmakta, komşu bilgilerin üzerine binmektedir; kurul hangisinin önce okunacağına karar verememiştir.', 'Ekrandan taşan öğeler duvara yansıtılamamaktadır.'],
  'Şartnameye uyum': ['Şartnamenin bazı maddeleri yerine getirilmemiştir; ilgili birime iade edilmiştir.', 'Kurum talebi ile tasarım arasında belirgin farklar tespit edilmiştir.'],
};

const PRAISE = ['Ekranın uzaktan bile okunabildiği kurul üyelerince teyit edilmiştir.', 'Tasarım, yıllardır ilk kez bir ekranın gerçekten bilgi verdiği şeklinde değerlendirilmiştir.', 'Kurul, mevcut ekranla kıyaslandığında "gece ile gündüz" ifadesini oybirliğiyle kabul etmiştir.'];

export function evaluate(d: Design, task: Task): Report {
  const passed = task.rules.map((rule) => rule.ok(d));
  const primary = d.widgets.filter((wd) => PRIMARY.includes(wd.kind) && area(wd) > 0);
  const minPrimary = primary.length ? Math.min(...primary.map((wd) => wd.size)) : 0;
  const scores: Score[] = [
    { label: 'Şartnameye uyum', value: Math.round((passed.filter(Boolean).length / passed.length) * 100) },
    { label: 'Okunabilirlik', value: Math.round(clamp01((minPrimary - 14) / (40 - 14)) * 100) },
    { label: 'Kontrast', value: textual(d).length ? Math.round(clamp01((minContrast(d) - 2) / (7 - 2)) * 100) : 0 },
    { label: 'Düzen', value: Math.max(0, 100 - overlaps(d) * 25 - offscreen(d) * 20 - overflowing(d) * 25) },
  ];
  const quality = (scores[1].value + scores[2].value + scores[3].value) / 3;
  const total = Math.round(scores[0].value * 0.5 + quality * 0.5);
  const all = passed.every(Boolean);
  // üç yıldız için hiçbir başlık zayıf kalmamalı: taşan bir yazı tam puanı engeller
  const solid = scores.every((sc) => sc.value >= 80);
  const stars = !all ? 0 : total >= 90 && solid ? 3 : total >= 75 ? 2 : 1;
  const verdict: Verdict = !all ? 'ret' : stars >= 2 ? 'kabul' : 'sartli';
  // rapor: en zayıf iki başlığın notu; iyi geçtiyse bir de övgü
  const weak = [...scores].sort((a, b) => a.value - b.value).filter((s) => s.value < 80);
  const seed = Math.round(total + d.widgets.length);
  const notes = weak.slice(0, 2).map((s, i) => NOTES[s.label][(seed + i) % NOTES[s.label].length]);
  if (verdict === 'kabul') notes.push(PRAISE[seed % PRAISE.length]);
  return { passed, scores, total, stars, verdict, notes };
}

// ── İlerleme ────────────────────────────────────────────────────

export type Progress = Record<string, number>;
export const PROGRESS_KEY = 'kariyerweb-ekran-zor-v1';

/** Bir ekranın ilk dosyası hep açık; sonrakiler bir öncekinden en az bir yıldızla açılır. */
export function unlocked(task: Task, progress: Progress): boolean {
  const list = TASKS.filter((t) => t.preset === task.preset);
  const i = list.indexOf(task);
  return i <= 0 || (progress[list[i - 1].id] ?? 0) > 0;
}

export function loadProgress(): Progress {
  try {
    const raw = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '{}');
    const out: Progress = {};
    for (const t of TASKS) if (typeof raw?.[t.id] === 'number') out[t.id] = Math.max(0, Math.min(3, Math.round(raw[t.id])));
    return out;
  } catch {
    return {};
  }
}

export function saveStars(id: string, stars: number): Progress {
  const p = loadProgress();
  p[id] = Math.max(p[id] ?? 0, stars);
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    /* depolama yok */
  }
  return p;
}
