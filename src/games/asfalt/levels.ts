import type { LevelSpec, Report } from './model';

/*
 * İş emirleri ve muhtarın lafları. Her iş bir çukur; aralarında ekip ertesi sabah yolun yeniden
 * kazıldığını görür.
 */

export type Tool = 'soil' | 'gravel' | 'asphalt' | 'shovel' | 'pump' | 'roller';

export interface Level {
  spec: LevelSpec;
  place: string;
  title: string;
  /** İş emrindeki açıklama. */
  order: string;
  tools: Tool[];
  /** Ödenek (₺). */
  budget: number;
  /** İş bitince, bir sonraki işin başında okunan haber. */
  after: string;
}

export const LEVELS: Level[] = [
  {
    spec: { id: 'mahalle', seed: 1923, center: 162, half: 26, depth: 24 },
    place: 'Kadıköy, Moda · Ara sokak',
    title: 'Mahalle çukuru',
    order: 'Vatandaş üç aydır şikâyet ediyor; çukura giren arabanın tamponu hâlâ içinde. Altına toprak, üstüne mıcır, en üste asfalt. Asfalt soğumadan silindiri geçir.',
    tools: ['soil', 'gravel', 'asphalt', 'shovel', 'roller'],
    budget: 175_000,
    after: 'Ertesi sabah 07.40: İSKİ ekibi yamanın tam ortasını kazdı. "Boru değişecekmiş."',
  },
  {
    spec: { id: 'yagmur', seed: 1453, center: 158, half: 34, depth: 26, waterTop: 9, rainSec: 35, deadlineSec: 120 },
    place: 'Bakırköy · Ana cadde',
    title: 'Yağmurdan sonra',
    order: 'Çukur gölete dönmüş, yağmur hâlâ yağıyor. Başkan iki dakika sonra kurdele kesecek. Suyu çek, yağmurun dinmesini bekle ya da beklemeden dök. Karar senin.',
    tools: ['soil', 'gravel', 'asphalt', 'shovel', 'pump', 'roller'],
    budget: 240_000,
    after: 'Açılıştan bir hafta sonra: doğalgaz ekibi geldi. Sen kazmayı görmeden yamanın fotoğrafını çektin, hatıra.',
  },
  {
    spec: { id: 'dogalgaz', seed: 1071, center: 168, half: 14, depth: 40 },
    place: 'Üsküdar, Kuzguncuk · Boru hattı',
    title: 'Doğalgaz kazısının üstü',
    order: 'Doğalgaz ekibi boruyu döşemiş, hendeği öylece bırakmış. Dar ve derin: toprağı sık sık silindirle, yoksa ilk kamyonda yama hendeğe oturur.',
    tools: ['soil', 'gravel', 'asphalt', 'shovel', 'roller'],
    budget: 150_000,
    after: 'İki gün sonra: aynı hendeği bu kez internet altyapısı için açtılar. "Koordinasyon toplantısı" önümüzdeki ay.',
  },
  {
    spec: { id: 'kis', seed: 1881, center: 160, half: 30, depth: 22, cold: 0.35 },
    place: 'Sarıyer, Zekeriyaköy · Kış sabahı',
    title: 'Kış yaması',
    order: 'Hava eksi iki derece. Asfalt kamyondan inerken donmaya başlıyor. Az az dök, hemen silindirle; beklersen silindir taşın üstünden zıplar.',
    tools: ['soil', 'gravel', 'asphalt', 'shovel', 'roller'],
    budget: 200_000,
    after: 'Bahar geldi: kış yamalarının yarısı tuz ve donla dağıldı. Seninki hâlâ yerinde mi, birazdan göreceğiz.',
  },
  {
    spec: { id: 'secim', seed: 2024, center: 160, half: 44, depth: 20, deadlineSec: 100 },
    place: 'Esenyurt · Ana bulvar, gece 02.00',
    title: 'Seçim öncesi gece mesaisi',
    order: 'Seçime üç gün var. Bulvarın en geniş çukuru sabah kameralar gelmeden kapanacak. Süre dar, ödenek bol: hızlı ama dikkatli.',
    tools: ['soil', 'gravel', 'asphalt', 'shovel', 'roller'],
    budget: 320_000,
    after: 'Seçimden bir hafta sonra: bulvarın öbür ucunda yeni bir çukur açıldı. Kimse fotoğraf çekmeye gelmedi.',
  },
];

export const TOOL_LABEL: Record<Tool, { name: string; hint: string; key: string }> = {
  soil: { name: 'Toprak', hint: 'Alt dolgu, ucuz', key: '1' },
  gravel: { name: 'Mıcır', hint: 'Asfaltın yatağı', key: '2' },
  asphalt: { name: 'Sıcak asfalt', hint: 'Soğumadan silindirle', key: '3' },
  shovel: { name: 'Kürek', hint: 'Fazlayı al', key: '4' },
  pump: { name: 'Su motoru', hint: 'Suyu çek', key: '5' },
  roller: { name: 'Silindir', hint: 'Sürükle ya da ← →', key: '6' },
};

/** Muhtarın anlık lafları: dünya bir olayı ilk gördüğünde bir kez söyler. */
export const REMARKS: Record<string, string> = {
  start: 'Hayırlı işler. Ben buradayım, karışmam. Sadece bakarım.',
  wet: 'Evladım suyun üstüne asfalt mı dökülür? Neyse, sen bilirsin.',
  blocked: 'Asfalt donmuş, silindir çıkamıyor. Biz buna tümsek demeyiz, hız kesici deriz.',
  rainStop: 'Yağmur dindi. Şimdi dökersen tutar.',
  deadline: 'Başkan geliyor, kurdele hazır! Ne varsa o.',
  spill: 'Yola dökülen de para, haberin olsun.',
  collapse: 'Yama çöktü, araç içine gömüldü! Yol trafiğe kapatıldı.',
  stuck: 'Araba çukura gömüldü! Çukur dolmadan yol mu açılır evladım?',
  overBudget: 'Ödenek bitti. Ek ödenek yazısı çıktı, imzaya gitti.',
};

/** İşi teslim almak için kontrol mühendisinin istediği en düşük yama puanı. */
export const PASS_SCORE = 60;

/** Fişin altındaki hüküm: puan ve en büyük kusura göre. */
export function verdict(r: Report): string {
  if (r.stuck >= 0 && r.phases.length > 0 && r.phases[0].dips > 0) return 'Yama trafiğin altında çöktü, araç içine gömüldü. Yol kapandı, ekip yeniden çağrıldı.';
  if (r.stuck >= 0) return 'İlk araba çukura gömüldü, vinç çağrıldı. Yol bir hafta kapalı; çukur yerinde duruyor.';
  if (r.bare > 6) return 'Üstüne asfalt dökülmeyen toprak ilk tekerlekte ezildi, yol çamur oldu.';
  if (r.soilBase > 10) return 'Asfaltın altına toprak doldurulmuş. Kontrol mühendisi karot aldı, raporuna "taşıyıcı tabaka yok" yazdı.';
  if (r.hot > 10) return 'Asfalt soğumadan trafiğe açıldı; otobüs geçince tekerlek izi oluk oldu. Asfalt soğumadan yol açılmaz.';
  if (r.unpacked > 10) return 'Silindir geçmeyen dolgu ilk otobüste oturdu. Kontrol mühendisi sıkışma deneyine bile gerek görmedi.';
  if (r.thin > 10) return 'Asfalt kağıt gibi ince serilmiş. İlk kışta çatlar, bahara çukur geri gelir.';
  if (r.score >= 90) return 'Muhtar arabasıyla iki kere geçti, ikincisinde gözlerini kapattı. Haberlere çıkmayacak kadar iyi.';
  if (r.wet > 4) return 'Suya dökülen asfalt ilk tekerlekte dağıldı. Çukur eski hâline döndü; sadece rengi değişti.';
  if (r.dips > r.bumps && r.dips > 6) return 'Yama oturdu, çukur geri geldi. Vatandaş fark etmedi bile: zaten oradaydı.';
  if (r.bumps > 6) return 'Ortaya bir tümsek çıktı. Belediye tabela astı: "Dikkat, kasis."';
  if (r.noGravel > 6) return 'Mıcır serilmediği için asfalt bir yağmur sonra çatlar. O zamana kadar seçim geçmiş olur.';
  if (r.score >= 70) return 'Fena değil. Dolmuş yavaşlamadan geçti; şoför sadece bir kere söylendi.';
  return 'Araba geçti, ama nasıl geçti… Şikâyet hattı şimdiden çalıyor.';
}

/** Mesai sonu unvanı: işlerin ortalamasına göre; paylaşılan kartın başlığı. */
export function crewTitle(scores: number[]): { title: string; note: string; avg: number } {
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  if (avg >= 90) return { avg, title: 'Asfaltın Ustası', note: 'Yamanın nerede olduğunu kimse bulamadı. Belediye seni başka ilçeye kaptırmamak için zam düşünüyor.' };
  if (avg >= 75) return { avg, title: 'Kıdemli Silindirci', note: 'Dolmuşlar yavaşlamadan geçiyor. Muhtar seni kahvede adınla anıyor.' };
  if (avg >= 55) return { avg, title: 'Mesai Kurtaran', note: 'Çukur kapandı sayılır. Bir sonraki yağmura kadar sorun yok.' };
  return { avg, title: 'Kasis Mimarı', note: 'Yaptığın her yama trafiği yavaşlatıyor. Belediye buna yol güvenliği diyor.' };
}
