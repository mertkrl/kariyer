import { WORK_START_HOUR } from '../../../../game/time';

/*
 * "Trafik" uygulaması için İstanbul: 360×300 harita uzayında kıyılar, parklar, yollar, sokaklar,
 * işe gidiş rotaları ve ilçe etiketleri; artı günün saatini ve havayı yoğunluğa ve yolculuk
 * sürelerine çeviren trafik modeli. Saf veri ve matematik, React yok.
 */

export const W = 360;
export const H = 300;

export type Pt = [number, number];

/** Catmull-Rom → kübik Bézier; elle yerleştirilmiş kıyı noktaları yumuşak kıyı çizgilerine dönüşür. */
export function smooth(pts: Pt[], closed = false) {
  const p = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < p.length - 2; i++) {
    const [x0, y0] = p[i - 1];
    const [x1, y1] = p[i];
    const [x2, y2] = p[i + 1];
    const [x3, y3] = p[i + 2];
    d += ` C${(x1 + (x2 - x0) / 6).toFixed(1)} ${(y1 + (y2 - y0) / 6).toFixed(1)} ${(x2 - (x3 - x1) / 6).toFixed(1)} ${(y2 - (y3 - y1) / 6).toFixed(1)} ${x2} ${y2}`;
  }
  return closed ? `${d} Z` : d;
}

// Marmara + Boğaz tek bir su kütlesi olarak (köşeler çerçevenin dışına itilmiş).
export const SEA = smooth(
  [
    [-30, 238], [40, 236], [80, 240], [120, 235], [150, 239], [174, 234], [186, 228],
    [191, 214], [189, 196], [190, 178], [193, 160], [196, 142], [197, 124], [199, 106], [203, 88], [205, 70], [210, 50], [216, 28], [220, 6], [222, -30],
    [252, -30], [248, 6], [240, 26], [234, 46], [229, 64], [227, 82], [226, 100], [223, 120], [221, 140], [218, 160], [215, 180], [213, 200], [211, 218], [210, 232],
    [216, 244], [224, 254], [236, 250], [256, 258], [286, 262], [322, 266], [390, 270],
    [390, 330], [-30, 330],
  ],
  true,
);
export const HALIC = smooth(
  [
    [191, 214], [172, 206], [156, 198], [141, 188], [129, 179], [118, 171], [116, 175],
    [126, 186], [140, 198], [156, 208], [172, 217], [186, 227],
  ],
  true,
);

export const PARKS = [
  smooth([[10, 4], [60, -4], [110, 8], [120, 34], [96, 52], [48, 50], [14, 36]], true), // Belgrad Ormanı
  smooth([[266, 6], [330, 0], [370, 20], [360, 56], [312, 60], [276, 40]], true), // Beykoz korusu
  smooth([[183, 146], [192, 147], [192, 158], [183, 157]], true), // Yıldız Parkı
  smooth([[194, 62], [202, 60], [201, 74], [194, 72]], true), // Emirgan
  smooth([[236, 188], [250, 184], [256, 196], [244, 204], [234, 198]], true), // Çamlıca
  smooth([[246, 212], [258, 210], [260, 220], [248, 222]], true), // Validebağ
];

export interface Road {
  name: string;
  d: string;
  base: number;
  rush: number;
  kind: 'highway' | 'arterial';
}

export const ROADS: Road[] = [
  { name: 'Büyükdere Cd.', d: smooth([[180, 44], [184, 70], [186, 96], [189, 118], [192, 138]]), base: 0.5, rush: 0.42, kind: 'arterial' },
  { name: '15 Temmuz Şehitler Köprüsü', d: 'M192 138 L226 136', base: 0.55, rush: 0.45, kind: 'highway' },
  { name: 'D-100 Anadolu', d: smooth([[226, 136], [242, 146], [262, 164], [286, 190], [312, 206], [380, 216]]), base: 0.45, rush: 0.45, kind: 'highway' },
  { name: 'TEM Avrupa', d: smooth([[-20, 112], [60, 106], [120, 98], [160, 88], [186, 78], [198, 74]]), base: 0.35, rush: 0.4, kind: 'highway' },
  { name: 'FSM Köprüsü', d: 'M198 74 L234 70', base: 0.45, rush: 0.45, kind: 'highway' },
  { name: 'TEM Anadolu', d: smooth([[234, 70], [258, 88], [278, 122], [296, 164], [310, 204]]), base: 0.35, rush: 0.4, kind: 'highway' },
  { name: 'D-100 Avrupa', d: smooth([[-20, 212], [40, 212], [90, 204], [130, 188], [158, 168], [176, 150], [192, 138]]), base: 0.5, rush: 0.4, kind: 'highway' },
  { name: 'Sahil Yolu', d: smooth([[-20, 233], [60, 231], [120, 229], [160, 230], [180, 226]]), base: 0.3, rush: 0.35, kind: 'arterial' },
  { name: 'Basın Ekspres Yolu', d: smooth([[60, 106], [54, 128], [46, 152], [42, 180], [40, 212]]), base: 0.45, rush: 0.4, kind: 'arterial' },
  { name: 'Kadıköy bağlantısı', d: smooth([[286, 190], [270, 204], [254, 222], [238, 240]]), base: 0.4, rush: 0.35, kind: 'arterial' },
];

// Küçük ara yollar (trafik katmanı yok): haritaya gerçek sokak dokusunu verir.
export const STREETS = [
  smooth([[182, 226], [188, 206], [190, 186], [191, 164], [192, 150]]),
  smooth([[224, 138], [222, 170], [219, 200], [216, 222], [230, 244]]),
  smooth([[100, 150], [140, 150], [176, 150]]),
  smooth([[60, 160], [100, 170], [130, 188]]),
  smooth([[120, 98], [130, 130], [140, 160], [158, 168]]),
  smooth([[262, 164], [300, 140], [360, 132]]),
  smooth([[244, 250], [270, 240], [312, 206]]),
  smooth([[150, 60], [160, 88]]),
];

export interface Route {
  id: string;
  label: string;
  mode: 'car' | 'bus' | 'rail';
  via: string;
  km: string;
  d: string;
  /** Yoğunluğu bu rotayı yavaşlatan yolların sıraları (boş = trafikten etkilenmez). */
  roads: number[];
  baseMinutes: number;
  /** Süre baloncuğunun durduğu yer. */
  tag: Pt;
}

// Yol indeksleri: 1 15 Temmuz Köprüsü · 2 D-100 Anadolu · 3 TEM Avrupa · 4 FSM Köprüsü · 5 TEM Anadolu · 6 D-100 Avrupa · 8 Basın Ekspres
// Ofis Anadolu yakasında (Ataşehir Finans Merkezi), ev Avrupa yakasında (Bağcılar): her rota Boğaz'ı geçer.
export const ROUTES: Route[] = [
  {
    id: 'carD100', label: 'D-100', mode: 'car', via: 'D-100 · 15 Temmuz Şehitler Köprüsü · Basın Ekspres üzerinden', km: '36,8 km',
    d: smooth([[312, 198], [312, 206], [286, 190], [262, 164], [242, 146], [226, 136], [192, 138], [176, 150], [158, 168], [130, 188], [90, 204], [56, 210], [42, 186], [46, 152]]),
    roads: [2, 1, 6, 8], baseMinutes: 52, tag: [128, 200],
  },
  {
    id: 'carTem', label: 'TEM', mode: 'car', via: 'TEM · Fatih Sultan Mehmet Köprüsü · Mahmutbey üzerinden', km: '41,2 km',
    d: smooth([[312, 198], [310, 204], [296, 164], [278, 122], [258, 88], [234, 70], [198, 74], [186, 78], [160, 88], [120, 98], [60, 106], [54, 128], [46, 152]]),
    roads: [5, 4, 3, 8], baseMinutes: 56, tag: [278, 104],
  },
  {
    id: 'bus', label: 'Metrobüs+T1', mode: 'bus', via: 'Söğütlüçeşme → köprü → Cevizlibağ metrobüs · T1 tramvay Bağcılar', km: '38,5 km',
    d: smooth([[312, 198], [296, 214], [266, 234], [268, 204], [262, 164], [242, 146], [226, 136], [192, 138], [176, 152], [158, 170], [134, 192], [108, 200], [80, 184], [58, 166], [46, 152]]),
    roads: [], baseMinutes: 82, tag: [212, 124],
  },
  {
    id: 'rail', label: 'Marmaray', mode: 'rail', via: 'M4 Kozyatağı → Ayrılık Çeşmesi · Marmaray Yenikapı · M1B Bağcılar', km: '34,9 km',
    d: smooth([[312, 198], [292, 214], [266, 226], [248, 226], [224, 212], [200, 214], [180, 218], [156, 222], [120, 214], [84, 192], [58, 170], [46, 152]]),
    roads: [], baseMinutes: 74, tag: [214, 236],
  },
];

export const OFFICE: Pt = [312, 198];
export const HOME: Pt = [46, 152];

export const DISTRICTS: { name: string; at: Pt }[] = [
  { name: 'SARIYER', at: [178, 30] }, { name: 'MASLAK', at: [160, 62] }, { name: 'LEVENT', at: [166, 110] },
  { name: 'KAĞITHANE', at: [138, 128] }, { name: 'ŞİŞLİ', at: [164, 156] }, { name: 'BEŞİKTAŞ', at: [174, 176] },
  { name: 'BEYOĞLU', at: [160, 196] }, { name: 'FATİH', at: [130, 218] }, { name: 'EYÜPSULTAN', at: [100, 160] },
  { name: 'BAĞCILAR', at: [22, 140] }, { name: 'BAKIRKÖY', at: [50, 224] }, { name: 'AVCILAR', at: [14, 190] },
  { name: 'BEYKOZ', at: [276, 72] }, { name: 'KAVACIK', at: [244, 96] }, { name: 'ÜMRANİYE', at: [300, 146] },
  { name: 'ÜSKÜDAR', at: [240, 176] }, { name: 'ATAŞEHİR', at: [318, 190] }, { name: 'KADIKÖY', at: [262, 244] },
];

export function congestionColor(c: number) {
  return c < 0.45 ? '#2fb266' : c < 0.7 ? '#f5a623' : c < 0.85 ? '#e8542f' : '#a4161a';
}

/** Bir mesai dakikasının saati, mesai sonuna sınırlanmadan. */
export function arrival(workdayMinutes: number) {
  const t = WORK_START_HOUR * 60 + workdayMinutes;
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
}

export const MODE_ICON = { car: '🚗', bus: '🚌', rail: '🚇' } as const;

export interface Incident {
  at: Pt;
  label: string;
  icon: string;
}

/**
 * Bir mesai dakikasındaki trafik: yoğunluk 15:30'dan itibaren artar ve 17:00–18:00'de zirve
 * yapar; kötü hava her yolu yavaşlatır. Metrobüs köprüyü kendi şeridinde geçer, trafikten az etkilenir;
 * Marmaray Boğaz'ın altından geçer: trafikten de havadan da etkilenmez, yalnızca akşam kalabalığında aktarmalar uzar.
 */
export function trafficAt(minutes: number, weatherPenalty: number) {
  const rush = Math.max(0, Math.min(1, (minutes - 450) / 90));
  const levels = ROADS.map((r) => Math.min(1, r.base + r.rush * rush + weatherPenalty));
  const eta = (r: Route) => {
    if (r.mode === 'rail') return Math.round(r.baseMinutes * (1 + rush * 0.1));
    if (r.mode === 'bus') return Math.round(r.baseMinutes * (1 + rush * 0.15 + weatherPenalty * 0.5));
    const avg = r.roads.reduce((s, i) => s + levels[i], 0) / r.roads.length;
    return Math.round(r.baseMinutes * (0.7 + avg * 1.1));
  };
  const available = ROUTES;
  const best = available.reduce((a, b) => (eta(a) <= eta(b) ? a : b));
  const incidents: Incident[] = [
    ...(rush > 0.3 ? [{ at: [140, 182] as Pt, label: 'Kaza · D-100 Okmeydanı, sol şerit kapalı', icon: '!' }] : []),
    ...(rush > 0.2 ? [{ at: [209, 131] as Pt, label: '15 Temmuz Köprüsü · Avrupa yönü kilit, köprü geçişi 45 dk', icon: '!' }] : []),
    { at: [96, 102], label: 'Yol çalışması · TEM Mahmutbey, 2 şerit kapalı', icon: '⛏' },
    ...(weatherPenalty > 0.1 ? [{ at: [74, 232] as Pt, label: 'Kaygan yol · Sahil Yolu Yeşilköy', icon: '≋' }] : []),
    ...(weatherPenalty >= 0.25 ? [{ at: [44, 182] as Pt, label: 'Su birikintisi · Basın Ekspres Yolu, tek şerit açık', icon: '≋' }] : []),
  ];
  return { rush, levels, eta, available, best, incidents };
}
