/*
 * İnşaat İzleme'nin takvimi. İki saat vardır:
 *  - gerçek saat `t`: sahnenin geçen saniyesi; gün döngüsü, hava ve trafik ona bağlıdır;
 *  - iş saati `w`: yalnızca çalışılan anlarda ilerler. Gece, yağmur ve kar günlerinde şantiye
 *    durur, bina da bekler. Aşamalar iş saatine göre dizilir.
 * Oyuncu hiçbir şey yapmaz; sahne bu takvime göre kendiliğinden ilerler. Süreler saniyedir.
 */

export interface Stage {
  id: string;
  title: string;
  /** Aşamanın başladığı an (iş saati). */
  at: number;
  /** Bu aşamada izleyenlerin söyledikleri; sırayla gelir. */
  lines: string[];
}

/** Kaba inşaatta bir katın süresi (iş saati). */
export const FLOOR_SECONDS = 16;

/** Altı katlı apartmanın takvimi; başka kat sayısında kaba inşaattan sonrası kayar. */
const BASE_FLOORS = 6;
const BASE_STAGES: Stage[] = [
  {
    id: 'arsa',
    title: 'Boş arsa',
    at: 0,
    lines: ['Burası eskiden bostandı.', 'Duydun mu, buraya altı kat dikeceklermiş.'],
  },
  {
    id: 'etut',
    title: 'Zemin etüdü',
    at: 6,
    lines: ['Sondaj yapıyorlar, petrol mü çıkacak?', 'Zemin sağlam, ben buranın çocuğuyum.', 'Eskiden burada dere vardı, yazsınlar.'],
  },
  {
    id: 'aplikasyon',
    title: 'Aplikasyon ve şantiye kurulumu',
    at: 16,
    lines: ['İp gerdiler, kazık çaktılar.', 'Çit çektiler, artık göremeyeceğiz. Delik var ama.', 'Konteyner geldi, şef orada oturacak.'],
  },
  {
    id: 'hafriyat',
    title: 'Hafriyat ve iksa',
    at: 24,
    lines: ['Kepçeci iyi ama sağa fazla yükleniyor.', 'Bu toprak killi, söyleyeyim de.', 'Kamyon kaçıncı sefer, saydın mı?', 'Yan apartmana kazık çaktılar, iyi ettiler.', 'Çukur derin oldu, otopark yapacaklar.'],
  },
  {
    id: 'temel',
    title: 'Radye temel',
    at: 46,
    lines: ['Altına kara bir şey serdiler, yalıtımmış.', 'Demir az, ben görüyorum.', 'Pompa geldi, bugün döküm var.', 'Betonu sulamaları lazım, yazın çatlar.', 'Usta! O tarafa bir kova daha!'],
  },
  {
    id: 'karkas',
    title: 'Kaba inşaat',
    at: 72,
    lines: [
      'Kolon ince olmuş bu.',
      'Kontrolcü geldi, demirleri tek tek saydı.',
      'Kalıbı erken söktüler, yazık.',
      'Kat kat çıkıyor maşallah.',
      'Kat irtifakı var mı acaba?',
      'Dördüncü katı benim damada versinler.',
      'Vinççi çay molasında, ben de çay alayım.',
      'Pompacı benim köylü, iyi çocuktur.',
      'Bizim apartman da böyleydi, 99’da çatladı.',
    ],
  },
  {
    id: 'duvar',
    title: 'Duvar örme',
    at: 168,
    lines: ['Tuğla değil bu, gazbeton.', 'Harç az, bunu not edin.', 'Ses yalıtımı yok, komşuyu duyarsın.', 'Usta iyi örüyor, Sivaslı herhalde.'],
  },
  {
    id: 'cati',
    title: 'Çatı',
    at: 196,
    lines: ['Kiremit Marsilya mı, değil mi?', 'Çatı katı dubleks olacak, en pahalısı orası.'],
  },
  {
    id: 'pencere',
    title: 'Doğrama ve balkon',
    at: 210,
    lines: ['PVC iyi, alüminyum terletir.', 'Balkonu kapatırlar sonra, görürsün.', 'Güney cephe mi bu? Değil.'],
  },
  {
    id: 'tesisat',
    title: 'Mekanik ve elektrik tesisatı',
    at: 224,
    lines: ['Kablolar bakır mı alüminyum mu?', 'Doğalgaz hattı geldi, kombi yeri neresi?', 'Asansör de koyuyorlar, iyi, dizlerim tutmuyor.'],
  },
  {
    id: 'siva',
    title: 'Mantolama ve dış cephe',
    at: 242,
    lines: ['Mantolama yaptılar, iyi.', 'Rengi güzel ama bir ton açık olmalıydı.', 'Somon renk her yerde artık.'],
  },
  {
    id: 'ince',
    title: 'İnce işler',
    at: 258,
    lines: ['Seramikler İtalyan diyorlar, Çanakkale bence.', 'Alçıcı iyi, köşeleri düz.', 'Mutfak dolabı geldi, beyaz parlak, iz yapar.'],
  },
  {
    id: 'peyzaj',
    title: 'Peyzaj ve çevre',
    at: 280,
    lines: ['Ağaç diktiler, üç günde kurur.', 'Rampa yapmışlar, tekerlekli sandalye çıkar.', 'Bank koysalar biz de otururduk.'],
  },
  {
    id: 'teslim',
    title: 'Denetim ve teslim',
    at: 292,
    lines: ['Hayırlı olsun.', 'Klimaları da taktılar bak.', 'Ben yine de bir bakardım temeline.', 'Karşıya da inşaat başlıyormuş, yarın oraya gideriz.'],
  },
];

/** Altı katta işin bittiği an (iş saati): teslimden sonra kısa bir duruş, sonra son ekran. */
const BASE_TOTAL = 306;

/*
 * Şantiyeler: aynı takvim, başka bina. Kat sayısı, cephe rengi, tabela ve amcaların lafları
 * şantiyeye göre değişir. Seçili şantiyenin takvimi bir `Plan` değeridir (`planFor`); modülde
 * değişen bir durum yoktur, ekranlar ve hesaplar planı parametre olarak alır.
 */
export interface Project {
  id: string;
  name: string;
  parcel: string;
  /** Tabeladaki ikinci satır. */
  sign: string;
  floors: number;
  /** Bir katın brüt alanı (m²): metraj bu alandan hesaplanır. */
  area: number;
  paint: string;
  paintSide: string;
  /** Tabeladaki teslim yılları: inşaat ilerledikçe ertelenir. */
  due: number[];
  /** Aşamaya özel laflar: verilen aşamada varsayılanın yerine geçer. */
  lines?: Partial<Record<string, string[]>>;
  /** Teslim tutanağındaki cümle. */
  ending: string;
  /** On yıl sonrası: binanın ne hâle geldiği (haber başlığı ve metni). */
  future: { title: string; text: string };
}

export const PROJECTS: Project[] = [
  {
    id: 'huzur',
    name: 'Huzur Evleri',
    parcel: 'Ada 412, Parsel 7',
    sign: 'HUZUR EVLERİ · 6 KAT',
    floors: 6,
    area: 380,
    paint: '#e7a98e',
    paintSide: '#c78a70',
    due: [2019, 2021, 2023, 2025, 2026],
    ending: 'Bir apartmanı temelden çatıya izledi. Hiçbir şeye karışmadı. Kolonun ince olduğunu yalnızca söyledi.',
    future: {
      title: 'Huzur Evleri’nde balkonlar kapandı, klimalar çoğaldı',
      text: 'On yıl sonra: altı balkonun beşi camla kapatılmış, cephede on dört klima var. Somon renk griye dönmüş. Apartman toplantısında “kentsel dönüşüm” kelimesi ilk kez geçti. Kolonun ince olduğunu söyleyen amca, haklı çıkmayı beklemekten yoruldu.',
    },
  },
  {
    id: 'kule',
    name: 'Mavi Kule Rezidans',
    parcel: 'Ada 88, Parsel 3',
    sign: 'MAVİ KULE REZİDANS · 8 KAT',
    floors: 8,
    area: 520,
    paint: '#9fb8cc',
    paintSide: '#7f98ad',
    due: [2024, 2026, 2028, 2030, 2031],
    lines: {
      arsa: ['Burası eskiden çocuk parkıydı.', 'Rezidans yapacaklarmış, havuzlu, concierge’li.'],
      hafriyat: ['Üç kat otopark kazıyorlar, metro geçse durur.', 'Kamyonlar gece de çalışıyor, ruhsatı var mı?'],
      siva: ['Cam giydirme olacaktı, boyayla geçiştirdiler.', 'Bu mavi denize benzemiyor ama.'],
      teslim: ['Dairelerin hepsi satılmış, kimse oturmuyor.', 'Havuz çatıdaymış, kimse görmedi.', 'Bizim mahalleye gölge düştü, öğleden sonra güneş yok.'],
    },
    ending: 'Sekiz katlı bir rezidansı izledi. Havuzu hiç görmedi. Gölgesinde oturdu.',
    future: {
      title: 'Mavi Kule’nin havuzu hâlâ açılmadı',
      text: 'On yıl sonra: dairelerin yarısı kısa süreli kiralık. Çatıdaki havuz “bakımda”. Karşı apartmanın balkonuna öğleden sonra güneş düşmüyor; komşular akşam çayını artık parkta içiyor. Parkın yarısı otopark girişi oldu.',
    },
  },
  {
    id: 'okul',
    name: 'Gül Sokak İlkokulu',
    parcel: 'Ada 15, Parsel 1',
    sign: 'GÜL SOKAK İLKOKULU · 3 KAT',
    floors: 3,
    area: 1100,
    paint: '#f0c75e',
    paintSide: '#c9a440',
    due: [2022, 2023, 2024, 2025, 2026],
    lines: {
      arsa: ['Eski okulu yıktılar, depreme dayanıksızmış.', 'Çocuklar bu yıl konteynerde okuyacak.'],
      karkas: ['Okulda kolon kalın olur, öyle olmalı.', 'Üç kat yeter, merdiveni çocuklar çıkacak.', 'Müteahhit belediye başkanının kuzeni.'],
      cati: ['Çatıya güneş paneli koyacaklardı. Koymadılar.'],
      teslim: ['Seçimden bir hafta önce açıldı.', 'Torunum buraya gidecek, inşallah sağlamdır.', 'Bahçesi küçük ama boyası güzel.'],
    },
    ending: 'Bir okulu temelden çatıya izledi. Kurdeleyi başkan kesti, alkışı amcalar tuttu.',
    future: {
      title: 'Gül Sokak İlkokulu ilk mezunlarını verdi',
      text: 'On yıl sonra: okulun ilk öğrencileri liseyi bitirdi. Bahçedeki fidanlar ağaç oldu, sarı boya biraz soldu ama binada tek çatlak yok. İnşaatı izleyen amcalardan biri bugün okulun bekçisi; “Ben bu kolonları gördüm” diye anlatıyor.',
    },
  },
];


/**
 * Kaba inşaatta bir katın alt adımları: katın kendi süresi içindeki başlangıç oranları. Bina
 * çizimi kalıbı 0.18'de, döşeme demirini 0.34'te, dökümü 0.46'da, prizi 0.62'de, sökümü 0.86'da okur.
 */
export const FLOOR_STEPS = [
  { id: 'aks', at: 0, title: 'Aks aplikasyonu' },
  { id: 'rebar', at: 0.03, title: 'Kolon ve perde demiri' },
  { id: 'form', at: 0.18, title: 'Kalıp ve dikme' },
  { id: 'mesh', at: 0.34, title: 'Döşeme demiri ve tesisat boşlukları' },
  { id: 'check', at: 0.41, title: 'Yapı denetim demir kontrolü' },
  { id: 'pour', at: 0.46, title: 'Beton döküm' },
  { id: 'cure', at: 0.62, title: 'Kür ve priz' },
  { id: 'strip', at: 0.86, title: 'Kalıp sökümü' },
] as const;

/** Alt adımların sırası (FLOOR_STEPS içindeki yer): Building, Site ve konuşmalar bunları okur. */
export const FLOOR_STEP = { aks: 0, rebar: 1, form: 2, mesh: 3, check: 4, pour: 5, cure: 6, strip: 7 } as const;

/** Gerçek saatte şantiye takvimi: saniye başına gün. */
export const DAYS_PER_SECOND = 6;

/* ── gün ve hava ── */

/** Görsel bir günün uzunluğu (saniye). Bir günün sonunda gece olur, iş durur. */
export const DAY_LENGTH = 32;
const NIGHT = [0.72, 0.94] as const;

/** Günün evresi (0 sabah, ~0.4 öğle, 0.72 akşam, 0.94'e kadar gece). Sahne sabah açılır. */
export const dayPhase = (t: number) => ((t + 2) % DAY_LENGTH) / DAY_LENGTH;
export const isNight = (t: number) => {
  const p = dayPhase(t);
  return p >= NIGHT[0] && p < NIGHT[1];
};

export type Weather = 'clear' | 'rain' | 'snow';
/** Kötü hava günleri (gerçek saat): yağmurda beton dökülmez, karda şantiye kapanır. */
export const WEATHER: { from: number; to: number; kind: Exclude<Weather, 'clear'> }[] = [
  { from: 104, to: 116, kind: 'rain' },
  { from: 196, to: 205, kind: 'snow' },
  { from: 268, to: 275, kind: 'rain' },
];
export const weatherAt = (t: number): Weather => WEATHER.find((x) => t >= x.from && t < x.to)?.kind ?? 'clear';

export type Idle = 'night' | 'rain' | 'snow' | null;
/** Şantiyenin neden durduğu (ya da çalışıyorsa null). */
export const idleAt = (t: number): Idle => {
  const w = weatherAt(t);
  if (w !== 'clear') return w;
  return isNight(t) ? 'night' : null;
};

/* ── iş saati tablosu: gerçek saatten iş saatine ── */

const STEP = 0.1;

/** Bir şantiyenin takvimi: kat sayısına göre kayan aşamalar ve gerçek saatten iş saatine tablo. */
export interface Plan {
  project: Project;
  floors: number;
  stages: Stage[];
  /** İşin bittiği an (iş saati). */
  workTotal: number;
  /** Gerçek saatte o ana kadar çalışılan süre, STEP saniyede bir. */
  work: number[];
  /** Sahnenin sonu (gerçek saat): iş bitince. */
  total: number;
}

/** Şantiyenin takvimi: kat sayısına göre takvim kayar, lafları şantiyenin kendisinden gelir. */
export function planFor(id: string): Plan {
  const project = PROJECTS.find((p) => p.id === id) ?? PROJECTS[0];
  const shift = (project.floors - BASE_FLOORS) * FLOOR_SECONDS;
  const karkas = BASE_STAGES.findIndex((st) => st.id === 'karkas');
  const stages = BASE_STAGES.map((st, i) => ({ ...st, at: i > karkas ? st.at + shift : st.at, lines: project.lines?.[st.id] ?? st.lines }));
  const workTotal = BASE_TOTAL + shift;
  const work = [0];
  for (let i = 1; work[i - 1] < workTotal; i++) work.push(work[i - 1] + (idleAt((i - 1) * STEP) ? 0 : STEP));
  return { project, floors: project.floors, stages, workTotal, work, total: (work.length - 1) * STEP };
}

/** Gerçek saatte o ana kadar çalışılan süre. */
export const workAt = ({ work, workTotal }: Plan, t: number) => {
  const i = Math.min(work.length - 1, Math.max(0, Math.floor(t / STEP)));
  const next = work[Math.min(work.length - 1, i + 1)];
  return Math.min(workTotal, work[i] + (next - work[i]) * ((t - i * STEP) / STEP));
};

/* ── aşamalar ── */

export const stageAt = ({ stages }: Plan, w: number) => {
  let i = 0;
  while (i + 1 < stages.length && stages[i + 1].at <= w) i++;
  return i;
};

/** Kaba inşaatın başladığı an (iş saati). */
export const karkasAt = (plan: Plan) => plan.stages.find((st) => st.id === 'karkas')!.at;

/** Bir aşamanın içindeki ilerleme (0–1). */
export const stageProgress = ({ stages, workTotal }: Plan, w: number, i: number) => {
  const start = stages[i].at;
  const end = i + 1 < stages.length ? stages[i + 1].at : workTotal;
  return Math.min(1, Math.max(0, (w - start) / (end - start)));
};

/** Bir aşamanın bitmişlik oranı: başlamadıysa 0, bittiyse 1. */
export const doneOf = (plan: Plan, w: number, id: string) => {
  const i = plan.stages.findIndex((st) => st.id === id);
  const now = stageAt(plan, w);
  return i < now ? 1 : i > now ? 0 : stageProgress(plan, w, i);
};

/** Kaba inşaatta şu an hangi kat ve hangi alt adım (kaba inşaat dışında null). */
export const floorStepAt = (plan: Plan, w: number) => {
  if (plan.stages[stageAt(plan, w)].id !== 'karkas') return null;
  const f = (w - karkasAt(plan)) / FLOOR_SECONDS;
  const floor = Math.min(plan.floors - 1, Math.floor(f));
  const p = f - floor;
  let step = 0;
  while (step + 1 < FLOOR_STEPS.length && FLOOR_STEPS[step + 1].at <= p) step++;
  return { floor, step, p: (p - FLOOR_STEPS[step].at) / ((FLOOR_STEPS[step + 1]?.at ?? 1) - FLOOR_STEPS[step].at), id: FLOOR_STEPS[step].id, title: FLOOR_STEPS[step].title };
};

/**
 * Metraj: kat alanından kaba ama gerçekçi miktarlar. Radye 80 cm ve bina izinden taşkın; her kat
 * döşeme, kiriş, kolon ve perdeyle m² başına ~0,33 m³ beton; donatı m³ başına ~120 kg; transmikser
 * 9 m³; her döküm günü ve her 100 m³ için altı küp (üçü 7, üçü 28 günlük kırım).
 */
export function quantities(floors: number, area: number) {
  const pours = [area * 1.2 * 0.8, ...Array.from({ length: floors }, () => area * 0.33)];
  const concrete = pours.reduce((a, b) => a + b, 0);
  const excavation = area * 1.3 * 4.5;
  return {
    excavation: Math.round(excavation),
    trucks: Math.ceil(excavation / 15),
    concrete: Math.round(concrete),
    steel: Math.round(concrete * 0.12),
    mixers: pours.reduce((n, m) => n + Math.ceil(m / 9), 0),
    cubes: pours.reduce((n, m) => n + 6 * Math.max(1, Math.ceil(m / 100)), 0),
    inspections: floors + 1,
  };
}

/* ── izleyenler ── */

/** İzleyen amca sayısı: ilk gün iki kişi, kaba inşaatın ortasında yedi; gece bir kişi kalır. */
export const watchersAt = (t: number) => (isNight(t) ? 1 : Math.min(7, 2 + Math.floor(t / 40)));

/** Şantiye dururken söylenenler. */
const IDLE_LINES: Record<Exclude<Idle, null> | 'priz', string[]> = {
  night: ['Gece de çalışsalar biterdi.', 'Bekçi uyuyor, ben görüyorum.', 'Yarın sabah yine gelirim.'],
  rain: ['Yağmurda beton dökülmez, doğru yapıyorlar.', 'Bugün de iş yok.', 'Şemsiyeyi unuttum, olsun.'],
  snow: ['Kar yağdı, şantiye tatil.', 'Bizim zamanımızda karda da çalışırdık.'],
  priz: ['Beton prizini bekliyorlar, acele etme.', 'Üç gündür kimse yok.', 'Beton kendi kendine kurur, izle.'],
};

/** Şu anda konuşan amca ve söylediği. Şantiye duruyorsa durma sebebine dair konuşulur. */
export function speechAt(plan: Plan, t: number) {
  const idle = idleAt(t);
  const w = workAt(plan, t);
  const fs = floorStepAt(plan, w);
  const why = idle ?? (fs?.step === FLOOR_STEP.cure ? 'priz' : null);
  if (why) {
    const lines = IDLE_LINES[why];
    const k = Math.floor(t / 5) % lines.length;
    return { id: `${why}-${Math.floor(t / 5)}`, text: lines[k], who: Math.floor(t / 5) % watchersAt(t) };
  }
  const i = stageAt(plan, w);
  const st = plan.stages[i];
  const k = Math.min(st.lines.length - 1, Math.floor(stageProgress(plan, w, i) * st.lines.length));
  const before = plan.stages.slice(0, i).reduce((n, x) => n + x.lines.length, 0);
  return { id: `l-${before + k}`, text: st.lines[k], who: (before + k) % watchersAt(t) };
}

/** Yerdeki kar örtüsü (0–1): kar yağarken birikir, sonra yavaşça erir. */
export function snowCoverAt(t: number) {
  let cover = 0;
  for (const x of WEATHER) {
    if (x.kind !== 'snow' || t < x.from) continue;
    const built = Math.min(1, (Math.min(t, x.to) - x.from) / 5);
    const melt = t > x.to ? Math.max(0, 1 - (t - x.to) / 25) : 1;
    cover = Math.max(cover, built * melt);
  }
  return cover;
}
