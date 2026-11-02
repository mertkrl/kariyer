import { METER, OPTIONS, SITE_OPTIONS, W, applies, isJunk, itemsOn, colorCount, type BuildingShape, type Choice, type Defects, type Design, type Place, type Spec, type SpecKey } from './model';

/*
 * Projenin raporu: mimarın estetik puanı, mühendisin deprem değerlendirmesi ve yaklaşık keşif
 * bedeli. Hepsi düz kurallar; amaç oyuncuya neyin neden iyi ya da kötü olduğunu söylemek.
 */

export const DEFECT_LABEL: Record<keyof Defects, string> = {
  illegal: 'Ruhsatsız kaçak kat',
  bare: 'Sıvasız briket duvar',
  enclosed: 'PVC ile kapatılmış balkonlar',
  patch: 'Uyumsuz cephe kaplaması',
  leanTo: 'Çatıda sac sundurma',
  cracked: 'Taşıyıcıda çatlaklar',
};

/** Binanın her kusuru için: hâlâ açık mı? Seçimler onları kapatana dek açık kalır. */
export function defectState(b: BuildingShape, s: Spec): Partial<Record<keyof Defects, boolean>> {
  const d = b.defects ?? {};
  const out: Partial<Record<keyof Defects, boolean>> = {};
  if (d.illegal) out.illegal = s.extra === 'birak';
  if (d.bare) out.bare = s.cladding === 'mevcut';
  if (d.patch) out.patch = s.cladding === 'mevcut';
  if (d.enclosed) out.enclosed = s.railing === 'mevcut';
  if (d.leanTo) out.leanTo = s.roof === 'mevcut';
  if (d.cracked) out.cracked = s.structure === 'yok';
  return out;
}

export function openDefects(b: BuildingShape, s: Spec): (keyof Defects)[] {
  return (Object.entries(defectState(b, s)) as [keyof Defects, boolean][]).filter(([, open]) => open).map(([k]) => k);
}

export function defectCount(b: BuildingShape): number {
  return Object.values(b.defects ?? {}).filter(Boolean).length;
}

/** Mühendisin bakışı: güçlendirilmeyen, üstüne yük binen, çatlamış bina riskli sayılır. */
export function seismic(b: BuildingShape, s: Spec): { safe: boolean; note: string } {
  if (b.floors === 0 && !b.defects?.cracked) return { safe: true, note: 'Tek katlı hafif yapı.' };
  if (s.structure !== 'yok') return { safe: true, note: `${OPTIONS.structure.choices[s.structure].label} ile güçlendirildi.` };
  const load = b.defects?.illegal && s.extra !== 'yik' ? 1 : 0;
  const level = b.risk + load + (b.defects?.cracked ? 1 : 0);
  if (level < 2) return { safe: true, note: `${b.year} yapımı, taşıyıcısı yeterli görünüyor.` };
  const why = [b.year < 2000 ? `${b.year} öncesi yönetmelik` : '', load ? (s.extra === 'uyumla' ? 'ruhsatlanan katın yükü' : 'kaçak katın yükü') : '', b.defects?.cracked ? 'kolonlarda çatlak' : ''].filter(Boolean);
  return { safe: false, note: `Riskli: ${why.join(', ') || 'zayıf taşıyıcı'}. Güçlendirme önerilir.` };
}

/** Seçeneğin birimi: cephe m², pencere adedi, balkon adedi, çatı m², saçak metresi ya da götürü. */
function quantity(b: BuildingShape, key: SpecKey, s: Spec): number {
  const width = b.w * METER;
  const height = (b.floors + (s.extra === 'uyumla' ? 1 : 0)) * b.floorH * METER;
  switch (key) {
    case 'cladding':
      return Math.round(width * Math.max(height, 3));
    case 'windows':
      return b.floors * (b.facade === 'cumba' ? 4 : b.cols);
    case 'railing':
      return b.floors * b.cols;
    case 'roof':
      return Math.round(width * 10);
    case 'eave':
      return Math.round(width);
    case 'structure':
      return Math.round(width * 10 * Math.max(1, b.floors + 1));
    default:
      return 1;
  }
}

export const costOf = (b: BuildingShape, key: SpecKey, s: Spec): Choice | null => (applies(b, key) ? ((OPTIONS[key].choices as Record<string, Choice>)[s[key] as string] ?? null) : null);

export function buildingCost(b: BuildingShape, s: Spec): number {
  let sum = 0;
  for (const key of Object.keys(OPTIONS) as SpecKey[]) {
    const ch = costOf(b, key, s);
    if (ch) sum += ch.cost * quantity(b, key, s);
  }
  return sum;
}

const SITE_AREA = W * METER * 8;

export function siteCost(d: Design): number {
  return SITE_OPTIONS.paving.choices[d.site.paving].cost * SITE_AREA + SITE_OPTIONS.green.choices[d.site.green].cost + SITE_OPTIONS.lamps.choices[d.site.lamps].cost;
}

/** "₺4,8 milyon" gibi okunur bir bedel. */
export function formatCost(tl: number): string {
  if (tl >= 1e6) return `₺${(tl / 1e6).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} milyon`;
  if (tl >= 1e3) return `₺${Math.round(tl / 1e3).toLocaleString('tr-TR')} bin`;
  return `₺${Math.round(tl)}`;
}

/**
 * Mimarın estetik puanı (0–100): kirlilik, afiş, tabela yığını, açık kusur ve renk kalabalığı
 * düşürür; iyi malzeme (bölgenin malzemesiyse daha çok), meydanın zemini, yeşili ve direkleri artırır.
 */
export function lookScore(place: Place, d: Design): number {
  let s = 100;
  s -= Math.min(20, d.items.filter((it) => isJunk(it.kind)).length);
  s -= d.items.filter((it) => it.kind === 'afis').length * 1.5;
  s -= d.items.filter((it) => it.kind === 'folyo').length * 0.7;
  let look = 0;
  place.buildings.forEach((b, i) => {
    const sp = d.specs[i];
    const signs = itemsOn(d.items, b).filter((it) => !isJunk(it.kind) && it.kind !== 'tente').length;
    s -= Math.max(0, signs - 2) * 1.5;
    s -= openDefects(b, sp).reduce((a, k) => a + (k === 'illegal' ? 6 : 3.5), 0);
    for (const key of Object.keys(OPTIONS) as SpecKey[]) {
      const ch = costOf(b, key, sp);
      // yöresel olmayan malzeme iyi de olsa yere ait değildir: katkısı bir puanla sınırlı
      if (ch?.look) look += key === 'cladding' && ch.look > 0 && !place.local.includes(sp.cladding) ? 1 : ch.look;
    }
  });
  s += (look / place.buildings.length) * 1.6;
  s -= Math.min(15, Math.max(0, colorCount(d) - 10) * 0.6);
  for (const k of Object.keys(SITE_OPTIONS) as (keyof typeof SITE_OPTIONS)[]) {
    const ch = (SITE_OPTIONS[k].choices as Record<string, Choice>)[d.site[k]];
    s += ch.look ? ch.look : -4;
  }
  return Math.max(0, Math.min(100, Math.round(s)));
}

export interface Report {
  score: number;
  scoreBefore: number;
  safe: number;
  safeBefore: number;
  total: number;
  defectsOpen: number;
  defectsBefore: number;
  cost: number;
  signsBefore: number;
  signsAfter: number;
  junkRemoved: number;
  colorsBefore: number;
  colorsAfter: number;
  /** Projenin öne çıkan kararları: kart ve bülten bunları sayar. */
  works: string[];
  title: string;
  note: string;
}

function summary(place: Place, d: Design) {
  const safe = place.buildings.filter((b, i) => seismic(b, d.specs[i]).safe).length;
  const defects = place.buildings.reduce((a, b, i) => a + openDefects(b, d.specs[i]).length, 0);
  return { score: lookScore(place, d), safe, defects };
}

/** Paylaşılan kartın özeti: meydanın bugünkü hâliyle oyuncunun hâli arasındaki fark ve bir unvan. */
export function makeover(place: Place, d: Design): Report {
  const o = place.original;
  const before = summary(place, o);
  const now = summary(place, d);
  const signs = (x: Design) => x.items.filter((it) => !isJunk(it.kind)).length;
  const junk = (x: Design) => x.items.filter((it) => isJunk(it.kind)).length;
  const removed = Math.max(0, junk(o) - junk(d));
  const cost = place.buildings.reduce((a, b, i) => a + buildingCost(b, d.specs[i]), 0) + siteCost(d) + removed * 2500;
  const count = (key: SpecKey, pred: (v: string) => boolean) => place.buildings.filter((b, i) => applies(b, key) && pred(d.specs[i][key] as string)).length;

  const works: string[] = [];
  const razed = count('extra', (v) => v === 'yik');
  if (razed) works.push(`${razed} kaçak kat yıkıldı`);
  const braced = count('structure', (v) => v !== 'yok');
  if (braced) works.push(`${braced} bina güçlendirildi`);
  const clad = count('cladding', (v) => v !== 'mevcut');
  if (clad) works.push(`${clad} cephe yenilendi`);
  if (removed) works.push(`${removed} klima, anten, depo söküldü`);
  if (d.site.paving !== 'mevcut') works.push(`Zemin: ${SITE_OPTIONS.paving.choices[d.site.paving].label.toLocaleLowerCase('tr-TR')}`);
  if (d.site.green !== 'yok') works.push(SITE_OPTIONS.green.choices[d.site.green].label);
  const windows = count('windows', (v) => v !== 'mevcut');
  if (windows) works.push(`${windows} binada yeni doğrama`);

  const r = {
    score: now.score,
    scoreBefore: before.score,
    safe: now.safe,
    safeBefore: before.safe,
    total: place.buildings.length,
    defectsOpen: now.defects,
    defectsBefore: before.defects,
    cost,
    signsBefore: signs(o),
    signsAfter: signs(d),
    junkRemoved: removed,
    colorsBefore: colorCount(o),
    colorsAfter: colorCount(d),
    works,
  };
  const same = JSON.stringify(o) === JSON.stringify(d);
  const allJunk = junk(d) === 0 && junk(o) > 0;
  const shiny = count('cladding', (v) => v === 'kompozit') + count('lighting', (v) => v === 'renkli');
  let title: string;
  let note: string;
  if (same) [title, note] = ['Dokunulmamış Meydan', 'Hiçbir şeye dokunmadın. Belediye bunu da bir proje olarak açılışa çıkarır.'];
  else if (r.signsAfter > r.signsBefore + 2) [title, note] = ['Tabela Cenneti', 'Meydanın asıl sorunu tabela azlığıymış. Sen çözdün.'];
  else if (shiny >= 3) [title, note] = ['Kompozit ve LED Belediyesi', 'Her şey parlıyor, gece renk değiştiriyor. İlk yangına kadar çok modern.'];
  else if (now.score >= 80 && now.safe === r.total) [title, note] = ['Şehir Plancısı', 'Kusurlar kapandı, binalar ayakta kalacak, meydan nefes alıyor.'];
  else if (now.safe === r.total && before.safe < r.total) [title, note] = ['Deprem Mühendisi', 'Cephe biraz dağınık ama her bina sarsıntıya hazır. Önce can, sonra boya.'];
  else if (now.score >= 70) [title, note] = ['Restorasyon Mimarı', 'Meydan yerine ait görünüyor; birkaç bina hâlâ mühendis bekliyor.'];
  else if (razed && razed === count('extra', () => true)) [title, note] = ['Kaçak Kat Avcısı', 'Ruhsatsız ne varsa indi. Kat malikleri toplantısı fırtınalı geçecek.'];
  else if (allJunk) [title, note] = ['Klima Avcısı', 'Cephelerde tek bir dış ünite kalmadı. Yazın kimin serinleyeceği ayrı bir konu.'];
  else [title, note] = ['Rötuşçu', 'Birkaç dokunuş yaptın. Esnaf yine de tabelasının küçüldüğünü söylüyor.'];
  return { ...r, title, note };
}
