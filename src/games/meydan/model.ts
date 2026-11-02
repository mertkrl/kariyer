/*
 * Meydan Islahı'nın veri modeli. Bir meydan, karşıdan bakılan bir sokak cephesidir: binaların
 * biçimi (kat, pencere, çatı) ve kusurları (kaçak kat, sıvasız duvar, kapatılmış balkon, uyumsuz
 * kaplama, sac çatı eki, çatlak) meydana aittir. Oyuncu her binanın renklerini ve mimari/yapısal
 * seçimlerini (cephe malzemesi, doğrama, korkuluk, çatı, saçak, vitrin, aydınlatma, güçlendirme),
 * meydanın zeminini, yeşilini ve direklerini, cepheye asılan her şeyi değiştirir. Tasarım yalnızca
 * bunları taşır; tarayıcıdaki taslak `sanitize` ile bilinen alanlara indirgenir.
 */

export const W = 1200;
export const H = 700;
/** Kaldırımın üst çizgisi: binalar buraya oturur. */
export const GROUND = 560;
export const GRID = 4;
export const MAX_ITEMS = 120;
const MAX_TEXT = 40;
/** Çizimin bir pikseli kaç metre: maliyet hesabı cephe alanını buradan bulur. */
export const METER = 0.06;

export type PlaceId = 'bakirkoy' | 'rize' | 'izmir' | 'ankara' | 'diyarbakir';
export type SignKind = 'pano' | 'bayrak' | 'kutu' | 'tente' | 'folyo' | 'afis';
export type JunkKind = 'klima' | 'anten' | 'kablo' | 'gunes' | 'depo' | 'baca';
export type ItemKind = SignKind | JunkKind;
/** Çatı: düz teras, kornişli, kiremit kırma çatı ya da tek katlı dükkânların sac sundurması. */
export type Roof = 'duz' | 'kornis' | 'kirma' | 'sundurma';
/** Cephenin mimarisi: 70'lerin apartmanı, cumbalı apartman, tuğla, eski kâgir bina ya da cam giydirme. */
export type Facade = 'apartman' | 'cumba' | 'tugla' | 'tas' | 'cam';

/** Binanın sonradan edinilmiş kusurları: düzeltilmeden bırakılırsa puandan düşer. */
export interface Defects {
  /** Ruhsatsız eklenmiş üst kat: trapez sac, çıplak briket ya da PVC camlı kutu. */
  illegal?: 'sac' | 'briket' | 'pvc';
  /** Sıvası hiç yapılmamış ya da dökülmüş briket yamaları. */
  bare?: boolean;
  /** PVC ve camla eğreti kapatılmış balkonlar. */
  enclosed?: boolean;
  /** Bir katı kaplayan, binaya yabancı kaplama. */
  patch?: 'kompozit' | 'seramik';
  /** Çatı terasına çakılmış sac sundurma. */
  leanTo?: boolean;
  /** Taşıyıcıda ve duvarda çatlaklar. */
  cracked?: boolean;
}

/** Binanın meydana ait, değişmeyen biçimi. */
export interface BuildingShape {
  id: string;
  name: string;
  x: number;
  w: number;
  /** Zemin kat hariç kat sayısı; tek katlı dükkânda 0. */
  floors: number;
  floorH: number;
  groundH: number;
  /** Her kattaki pencere sayısı. */
  cols: number;
  balcony: boolean;
  roof: Roof;
  facade: Facade;
  /** Çatıda geri çekilmiş çatı katı. */
  penthouse?: boolean;
  /** Yapım yılı: mühendis notu ve deprem riski buradan. */
  year: number;
  /** Taşıyıcı sistemin zayıflığı: 0 sağlam, 2 ve üstü güçlendirilmeli. */
  risk: number;
  defects?: Defects;
}

/* ── Mimari seçenekler ── */

export interface Choice {
  label: string;
  /** Birim fiyat (₺); birim `OPTION_UNIT`ta. */
  cost: number;
  /** Mimarın ya da mühendisin bir cümlelik notu. */
  note: string;
  /** Estetik puana etkisi (bina başına). */
  look?: number;
}

const c = (label: string, cost: number, note: string, look = 0): Choice => ({ label, cost, note, look });

export const OPTIONS = {
  cladding: {
    label: 'Cephe malzemesi',
    who: 'Mimar',
    choices: {
      mevcut: c('Olduğu gibi', 0, 'Bugünkü sıva, boya ve yamalar kalır.'),
      siva: c('Boyalı ince sıva', 650, 'En ucuz temiz çözüm: yamalar kapanır, renk senin.', 1),
      mantolama: c('Mantolama', 1800, 'Taşyünü levha + sıva: ısı yalıtımı ve yangında A1 sınıfı.', 2),
      tas: c('Doğal taş', 4500, 'Bölgenin taşıyla giydirme; ağır, kalıcı, yere ait.', 3),
      tugla: c('Tuğla kaplama', 3200, 'Derzli harman tuğla: sıcak ve bakımsız yaşlanır.', 2),
      ahsap: c('Ahşap lambri', 3800, 'Isıl işlem görmüş çam; nemli iklimde bakımı ister.', 2),
      kompozit: c('Alüminyum kompozit', 2400, 'Hızlı ve parlak ama yangında risk, dokuya yabancı.', -4),
    },
  },
  windows: {
    label: 'Pencere doğraması',
    who: 'Mimar',
    choices: {
      mevcut: c('Olduğu gibi', 0, 'Karışık PVC, eski ahşap ve alüminyum bir arada.'),
      pvc: c('Beyaz PVC', 14000, 'Ucuz ve yalıtımlı; kalın kasa cepheyi düzleştirir.', 0),
      ahsap: c('Ahşap, kayıtlı', 26000, 'Kayıtlı çift kanat: tarihi cephede asıl doğrama budur.', 2),
      aluminyum: c('Antrasit alüminyum', 22000, 'İnce kasa, geniş cam; modern binada en temizi.', 1),
    },
  },
  railing: {
    label: 'Balkon korkuluğu',
    who: 'Mimar',
    choices: {
      mevcut: c('Olduğu gibi', 0, 'Bugünkü korkuluk ya da eğreti PVC kapatma kalır.'),
      ferforje: c('Ferforje', 18000, 'Dövme demir: eski apartmanın karakterini geri getirir.', 2),
      cam: c('Cam panel', 30000, 'Lamine cam + paslanmaz tutamak; manzarayı kesmez.', 1),
      dikme: c('İnce çelik dikme', 16000, 'Dikey lamalar, 11 cm aralık: çocuk güvenliği yönetmelikte.', 1),
      dolu: c('Dolu parapet', 12000, 'Cephe renginde dolu duvar; çamaşır ve klimayı gizler.', 0),
    },
  },
  roof: {
    label: 'Çatı',
    who: 'Mimar',
    choices: {
      mevcut: c('Olduğu gibi', 0, 'Bugünkü çatı ve üstündeki ekler kalır.'),
      kiremit: c('Kiremit kırma çatı', 2200, 'Ahşap konstrüksiyon, Marsilya kiremidi.', 1),
      teras: c('Parapetli teras', 1500, 'Su yalıtımı yenilenir, parapet düz biter.', 0),
      yesil: c('Yeşil çatı', 4200, 'Bitkili teras: yağmuru tutar, yazın serinletir.', 2),
      kornis: c('Kornişli saçak', 1800, 'Profilli korniş: eski kâgir binanın şapkası.', 1),
    },
  },
  eave: {
    label: 'Saçak',
    who: 'Mimar',
    choices: {
      yok: c('Saçaksız', 0, 'Yağmur doğrudan cepheden akar.'),
      ahsap: c('Ahşap saçak', 5000, 'Dışa taşan mertek uçları; yağmurlu iklimde cepheyi korur.', 1),
      beton: c('İnce beton saçak', 3500, 'Modernist düz saçak, altında gölge çizgisi.', 1),
      metal: c('Metal saçak', 4000, 'Galvaniz levha; ucuz ama ince görünür.', 0),
    },
  },
  shopfront: {
    label: 'Zemin kat vitrini',
    who: 'Mimar',
    choices: {
      mevcut: c('Olduğu gibi', 0, 'Dışarıdaki kepenk kutusu ve kalın doğrama.'),
      vitrin: c('İnce çelik vitrin', 120000, 'Kepenk içeride, siyah ince doğrama, tabela bandı tek.', 2),
      ahsap: c('Ahşap dükkân önü', 160000, 'Pilastırlı ahşap cephe, üstte yazı bandı.', 2),
    },
  },
  lighting: {
    label: 'Cephe aydınlatması',
    who: 'Mimar',
    choices: {
      yok: c('Yok', 0, 'Gece sokak lambası kadar.'),
      aplik: c('Duvar aplikleri', 40000, 'Zemin kat üstünde sıcak beyaz (2700 K) apliker.', 1),
      yikama: c('Cephe yıkama', 70000, 'Aşağıdan yukarı yumuşak ışık; pencereye vurmaz.', 1),
      renkli: c('Renkli LED şerit', 30000, 'Kat silmelerinde RGB şerit: belediyelerin gözdesi.', -3),
    },
  },
  structure: {
    label: 'Yapısal güçlendirme',
    who: 'İnşaat mühendisi',
    choices: {
      yok: c('Güçlendirme yok', 0, 'Taşıyıcı sistem olduğu gibi kalır.'),
      lif: c('Karbon lif sargı', 2200, 'Kolonlara lifli polimer: cepheden görünmez, hafif.', 0),
      perde: c('Betonarme perde', 4800, 'Yeni perde duvarlar ve kolon mantolama: en kalıcısı.', 0),
      celik: c('Çelik çapraz', 3000, 'Cepheye dıştan çelik X: hızlı, ama görünür.', -1),
    },
  },
  extra: {
    label: 'Kaçak kat',
    who: 'İnşaat mühendisi',
    choices: {
      birak: c('Olduğu gibi bırak', 0, 'Ruhsatsız, hesapsız ek yük binanın üstünde kalır.'),
      yik: c('Yık, çatıyı onar', 350000, 'Ek yük kalkar; bina projesindeki boyuna döner.', 0),
      uyumla: c('Ruhsatlandır, uyumla', 900000, 'Statik proje ve cephe uyumu: yük kalır, güçlendirme şart.', 0),
    },
  },
} satisfies Record<string, { label: string; who: string; choices: Record<string, Choice> }>;

export type OptionKey = keyof typeof OPTIONS;
export type ChoiceOf<K extends OptionKey> = keyof (typeof OPTIONS)[K]['choices'];

/** Oyuncunun bir bina için yaptığı her şey: boyalar ve mimari seçimler. */
export interface Spec {
  id: string;
  wall: string;
  /** Doğrama, korniş ve kat silmeleri. */
  trim: string;
  /** Zemin kattaki dükkân kaplaması. */
  shop: string;
  cladding: ChoiceOf<'cladding'>;
  windows: ChoiceOf<'windows'>;
  railing: ChoiceOf<'railing'>;
  roof: ChoiceOf<'roof'>;
  eave: ChoiceOf<'eave'>;
  shopfront: ChoiceOf<'shopfront'>;
  lighting: ChoiceOf<'lighting'>;
  structure: ChoiceOf<'structure'>;
  extra: ChoiceOf<'extra'>;
}

export type SpecKey = Exclude<keyof Spec, 'id' | 'wall' | 'trim' | 'shop'>;
export const SPEC_KEYS: SpecKey[] = ['cladding', 'windows', 'railing', 'roof', 'eave', 'shopfront', 'lighting', 'structure', 'extra'];
export const BLANK_SPEC: Omit<Spec, 'id' | 'wall' | 'trim' | 'shop'> = { cladding: 'mevcut', windows: 'mevcut', railing: 'mevcut', roof: 'mevcut', eave: 'yok', shopfront: 'mevcut', lighting: 'yok', structure: 'yok', extra: 'birak' };

/** Meydanın kendisi: zemin, yeşil ve direkler. */
export const SITE_OPTIONS = {
  paving: {
    label: 'Zemin kaplaması',
    choices: {
      mevcut: c('Olduğu gibi', 0, 'Yamalı asfalt, kırık parke, kaldırımda sökük taşlar.'),
      granit: c('Granit plak', 3500, 'Büyük gri plaklar: ağır trafiğe dayanır, kaymaz yüzey.', 6),
      arnavut: c('Arnavut kaldırımı', 2400, 'Elde dizilmiş küp taş: yavaşlatır, yağmuru emer.', 6),
      bazalt: c('Bazalt', 3800, 'Koyu volkanik taş: Güneydoğu sokaklarının kendi taşı.', 6),
      beton: c('Prefabrik beton', 1200, 'Kilitli parke: ucuz, ama her yer aynı.', 3),
    },
  },
  green: {
    label: 'Yeşil alan',
    choices: {
      yok: c('Yok', 0, 'Tek bir ağaç yok.'),
      agac: c('Ağaç sırası', 250000, 'Çınar ve ıhlamur: on yılda gölge yapar.', 5),
      saksi: c('Beton saksılar', 90000, 'Hızlı ama bakımsız kalınca çöp kutusuna döner.', 2),
      bahce: c('Yağmur bahçesi', 420000, 'Çim şeritler, ağaçlar ve banklar: su toprağa döner.', 7),
    },
  },
  lamps: {
    label: 'Sokak aydınlatması',
    choices: {
      mevcut: c('Olduğu gibi', 0, 'Galvaniz direk, turuncu sodyum lamba.'),
      klasik: c('Döküm fener', 300000, 'Tarihi dokuya uyan döküm direk ve fener.', 3),
      modern: c('İnce LED direk', 260000, 'Aşağı bakan, ışık kirliliği yapmayan armatür.', 3),
    },
  },
} satisfies Record<string, { label: string; choices: Record<string, Choice> }>;

export type SiteKey = keyof typeof SITE_OPTIONS;
export type Site = { [K in SiteKey]: keyof (typeof SITE_OPTIONS)[K]['choices'] };
export const BLANK_SITE: Site = { paving: 'mevcut', green: 'yok', lamps: 'mevcut' };

export interface Item {
  id: string;
  kind: ItemKind;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  /** Yazı rengi; tentede çizgilerin rengi. */
  color: string;
  text: string;
}

export interface Design {
  v: 2;
  place: PlaceId;
  specs: Spec[];
  site: Site;
  items: Item[];
}

export type Backdrop = 'istanbul' | 'karadeniz' | 'ege' | 'bozkir' | 'sur';
export type LandmarkKind = 'bayrak' | 'cay' | 'saat' | 'metro' | 'cesme';

export interface Place {
  id: PlaceId;
  title: string;
  district: string;
  /** Coğrafi bölge, ör. "Karadeniz". */
  region: string;
  blurb: string;
  backdrop: Backdrop;
  landmark: LandmarkKind;
  /** Bölgenin taşının rengi: doğal taş kaplama bunu kullanır. */
  stone: string;
  /** Mimarın bu bölge için önerdiği cephe malzemeleri. */
  local: ChoiceOf<'cladding'>[];
  buildings: BuildingShape[];
  /** Meydanın bugünkü hâli: oyun buradan başlar, karşılaştırma buna göre yapılır. */
  original: Design;
}

export const ITEM_KINDS: Record<ItemKind, { label: string; hint: string; junk: boolean; base: Omit<Item, 'id' | 'kind' | 'x' | 'y'> }> = {
  pano: { label: 'Pano tabela', hint: 'Vitrinin üstünde yatay', junk: false, base: { w: 200, h: 36, fill: '#2f3b45', color: '#f1ebe0', text: 'DÜKKÂN' } },
  bayrak: { label: 'Bayrak tabela', hint: 'Cepheden dik çıkan', junk: false, base: { w: 32, h: 110, fill: '#2f3b45', color: '#f1ebe0', text: 'OTEL' } },
  kutu: { label: 'Işıklı kutu', hint: 'Arkadan aydınlatmalı', junk: false, base: { w: 110, h: 40, fill: '#1f1f1f', color: '#f2c94c', text: 'KUTU' } },
  tente: { label: 'Tente', hint: 'Vitrini gölgeleyen bez', junk: false, base: { w: 150, h: 34, fill: '#7a2e2e', color: '#f1ebe0', text: '' } },
  folyo: { label: 'Cam folyo', hint: 'Vitrin camına yapışık', junk: false, base: { w: 120, h: 50, fill: '#00a2e8', color: '#ffffff', text: 'İNDİRİM' } },
  afis: { label: 'Vinil afiş', hint: 'Cepheye iple asılı', junk: false, base: { w: 140, h: 80, fill: '#ffffff', color: '#d50000', text: 'KİRALIK' } },
  klima: { label: 'Klima', hint: 'Dış ünite', junk: true, base: { w: 48, h: 34, fill: '#e9e8e2', color: '#8a8a84', text: '' } },
  anten: { label: 'Çanak anten', hint: 'Çatıda ya da balkonda', junk: true, base: { w: 36, h: 40, fill: '#e3e3de', color: '#6d6d68', text: '' } },
  kablo: { label: 'Kablo', hint: 'Binadan binaya sarkan', junk: true, base: { w: 200, h: 26, fill: '#1e1e1e', color: '#1e1e1e', text: '' } },
  gunes: { label: 'Güneş termosifonu', hint: 'Çatıda panel ve depo', junk: true, base: { w: 70, h: 44, fill: '#2c4a6e', color: '#e9e8e2', text: '' } },
  depo: { label: 'Su deposu', hint: 'Çatıdaki plastik tank', junk: true, base: { w: 40, h: 34, fill: '#3d7cc9', color: '#2b5c99', text: '' } },
  baca: { label: 'Soba borusu', hint: 'Pencereden çıkan', junk: true, base: { w: 30, h: 60, fill: '#5b5b58', color: '#2a2a28', text: '' } },
};

export const SIGN_KINDS: SignKind[] = ['pano', 'bayrak', 'kutu', 'tente', 'folyo', 'afis'];
export const isJunk = (kind: ItemKind) => ITEM_KINDS[kind].junk;

/** Cephe ve tabela için hazır renkler: Anadolu cephelerinin sakin tonları ve birkaç koyu tabela rengi. */
export const SWATCHES = ['#f1ebe0', '#e8d9b5', '#d9b77e', '#c98f6b', '#b5654a', '#a9b9a4', '#9fb3c2', '#8c8c88', '#5f6b73', '#2f3b45', '#2f4a3a', '#7a2e2e', '#6b4f3a', '#1f1f1f', '#ffffff'];

export const snap = (v: number) => Math.round(v / GRID) * GRID;

let seq = 0;
const newId = () => `m${Date.now().toString(36)}${(seq++).toString(36)}`;

export function makeItem(kind: ItemKind, at: Partial<Item> = {}): Item {
  const base = ITEM_KINDS[kind].base;
  return { ...base, x: 0, y: 0, ...at, kind, id: at.id ?? newId() };
}

// meydanın çizimi değişince eski taslaklar yeni binalara oturmaz: anahtar sürümle değişir
export const draftKey = (place: PlaceId) => `meydan:taslak:v3:${place}`;

/** Bir binanın gövdesinin üst kenarı (çatısız); ruhsatlanan kaçak kat gövdeye katılır. */
export const topOf = (b: BuildingShape, s?: Pick<Spec, 'extra'>) => GROUND - b.groundH - (b.floors + (b.defects?.illegal && s?.extra === 'uyumla' ? 1 : 0)) * b.floorH;

/** Bırakılmış kaçak kat gövdenin üstünde ayrı bir kutu olarak durur. */
export const hasIllegalBox = (b: BuildingShape, s: Pick<Spec, 'extra'>) => !!b.defects?.illegal && s.extra === 'birak';

/** Bir seçeneğin bu binada anlamı var mı: korkuluk balkonsuz binada, kaçak kat kusursuz binada gizlenir. */
export function applies(b: BuildingShape, key: SpecKey): boolean {
  if (key === 'railing') return b.balcony || !!b.defects?.enclosed;
  if (key === 'extra') return !!b.defects?.illegal;
  if (key === 'windows') return b.floors > 0;
  return true;
}

/** Ortası binanın genişliği içinde kalan öğeler: "bu cepheyi temizle" bunları söker. */
export function itemsOn(items: Item[], b: BuildingShape): Item[] {
  return items.filter((it) => {
    const cx = it.x + it.w / 2;
    return cx >= b.x && cx < b.x + b.w;
  });
}

export function withoutJunk(d: Design): Design {
  return { ...d, items: d.items.filter((it) => !isJunk(it.kind)) };
}

/**
 * Tabela yönetmeliği: her dükkâna vitrinin üstünde tek bir pano, aynı yükseklikte; afişler ve
 * cam folyolar sökülür, bayrak tabela, ışıklı kutu ve tente yerinde kalır.
 */
export function applySignCode(d: Design, place: Place): Design {
  const kept: Item[] = [];
  for (const b of place.buildings) {
    const on = itemsOn(d.items, b).filter((it) => !isJunk(it.kind));
    const pano = on.find((it) => it.kind === 'pano');
    const band = GROUND - b.groundH + 4;
    if (pano) kept.push({ ...pano, x: b.x + 10, w: b.w - 20, y: band, h: 24 });
    kept.push(...on.filter((it) => it.kind === 'bayrak' || it.kind === 'kutu' || it.kind === 'tente'));
  }
  // hiçbir binanın ortasına düşmeyen tabela (ör. meydanın dışında) da gider
  return { ...d, items: [...d.items.filter((it) => isJunk(it.kind)), ...kept] };
}

/** Meydanda kullanılan farklı renklerin sayısı: cephe, doğrama, dükkân ve tabelalar. */
export function colorCount(d: Design): number {
  const set = new Set<string>();
  for (const p of d.specs) [p.wall, p.trim, p.shop].forEach((c) => set.add(c));
  for (const it of d.items) if (!isJunk(it.kind)) set.add(it.fill);
  return set.size;
}

const HEX = /^#[0-9a-f]{6}$/i;
const color = (v: unknown, fallback: string) => (typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : fallback);
const num = (v: unknown, min: number, max: number, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback);
// eslint-disable-next-line no-control-regex
const text = (v: unknown, fallback: string) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, MAX_TEXT) : fallback);
const pick = <T extends string>(v: unknown, allowed: Record<string, unknown>, fallback: T): T => (typeof v === 'string' && Object.hasOwn(allowed, v) ? (v as T) : fallback);

/**
 * Tarayıcıdan okunan taslağı meydanın biçimine oturtur: bilinmeyen bina, seçenek ve öğe türleri
 * atılır, eksik ayarlar meydanın bugünkü hâlinden gelir, sayılar ve renkler sınırlanır.
 */
export function sanitize(raw: unknown, place: Place): Design | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r.v !== 2 || r.place !== place.id) return null;
  const given = Array.isArray(r.specs) ? (r.specs as Record<string, unknown>[]) : [];
  const specs = place.original.specs.map((def) => {
    const p = given.find((g) => g && typeof g === 'object' && g.id === def.id);
    if (!p) return def;
    const s: Spec = { id: def.id, wall: color(p.wall, def.wall), trim: color(p.trim, def.trim), shop: color(p.shop, def.shop), ...BLANK_SPEC };
    for (const k of SPEC_KEYS) (s as unknown as Record<string, string>)[k] = pick(p[k], OPTIONS[k].choices, def[k] as string);
    return s;
  });
  const rs = (r.site && typeof r.site === 'object' ? r.site : {}) as Record<string, unknown>;
  const site = { ...place.original.site };
  for (const k of Object.keys(SITE_OPTIONS) as SiteKey[]) (site as Record<string, string>)[k] = pick(rs[k], SITE_OPTIONS[k].choices, place.original.site[k]);
  const seen = new Set<string>();
  const items: Item[] = [];
  for (const raw of Array.isArray(r.items) ? r.items.slice(0, MAX_ITEMS) : []) {
    if (!raw || typeof raw !== 'object') continue;
    const it = raw as Record<string, unknown>;
    const kind = it.kind as ItemKind;
    if (typeof kind !== 'string' || !Object.hasOwn(ITEM_KINDS, kind)) continue;
    const base = ITEM_KINDS[kind].base;
    let id = typeof it.id === 'string' && /^[\w-]{1,32}$/.test(it.id) ? it.id : newId();
    if (seen.has(id)) id = newId();
    seen.add(id);
    items.push({
      id,
      kind,
      x: num(it.x, -W, W, 0),
      y: num(it.y, -H, H, 0),
      w: num(it.w, GRID * 2, W, base.w),
      h: num(it.h, GRID * 2, H, base.h),
      fill: color(it.fill, base.fill),
      color: color(it.color, base.color),
      text: text(it.text, base.text),
    });
  }
  return { v: 2, place: place.id, specs, site, items };
}
