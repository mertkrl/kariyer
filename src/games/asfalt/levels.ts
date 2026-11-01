import type { LevelSpec, Report } from './model';

/*
 * İş emirleri ve muhtarın lafları. Her iş bir çukur; aralarında ekip ertesi sabah yolun yeniden
 * kazıldığını görür.
 */

export type Tool = 'saw' | 'shovel' | 'pump' | 'soil' | 'gravel' | 'tamper' | 'tack' | 'asphalt' | 'rake' | 'roller' | 'probe';

export interface Level {
  spec: LevelSpec;
  place: string;
  title: string;
  /** İş emrindeki açıklama. */
  order: string;
  tools: Tool[];
  /** Ödenek (₺). */
  budget: number;
  /** Kemer sıkma: ödenek dolunca malzeme gelmez. */
  strictBudget?: boolean;
  /** Mıcır kamyonu bu saniyede gelir; o zamana kadar mıcır yok. */
  gravelAfterSec?: number;
  /** İş bitince, bir sonraki işin başında okunan haber. */
  after: string;
}

export const LEVELS: Level[] = [
  {
    spec: { id: 'mahalle', seed: 1923, center: 162, half: 26, depth: 24 },
    place: 'Kadıköy, Moda · Ara sokak',
    title: 'Mahalle çukuru',
    order: 'Vatandaş üç aydır şikâyet ediyor; çukura giren arabanın tamponu hâlâ içinde. Önce kırık kenarları kesme makinesiyle düz kes, molozu al. Altına toprak, üstüne mıcır: toprak yol hizasının en az 30 cm altında kalsın, her katı silindirle. Kenarlara ve tabana yapıştırıcı sür, en üste asfalt. Asfalt 78 °C\'nin altına inmeden silindiri geçir, soğuyunca trafiğe aç.',
    tools: ['saw', 'shovel', 'soil', 'gravel', 'tamper', 'tack', 'asphalt', 'rake', 'roller', 'probe'],
    budget: 175_000,
    after: 'Ertesi sabah 07.40: İSKİ ekibi yamanın tam ortasını kazdı. "Boru değişecekmiş."',
  },
  {
    spec: { id: 'yagmur', seed: 1453, center: 158, half: 34, depth: 26, waterTop: 9, rainSec: 35, deadlineSec: 120 },
    place: 'Bakırköy · Ana cadde',
    title: 'Yağmurdan sonra',
    order: 'Çukur gölete dönmüş, yağmur hâlâ yağıyor. Başkan iki dakika sonra kurdele kesecek. Suyu çek, yağmurun dinmesini bekle ya da beklemeden dök. Karar senin.',
    tools: ['saw', 'shovel', 'pump', 'soil', 'gravel', 'tamper', 'tack', 'asphalt', 'rake', 'roller', 'probe'],
    budget: 240_000,
    after: 'Açılıştan bir hafta sonra: doğalgaz ekibi geldi. Sen kazmayı görmeden yamanın fotoğrafını çektin, hatıra.',
  },
  {
    spec: { id: 'dogalgaz', seed: 1071, center: 168, half: 14, depth: 40 },
    place: 'Üsküdar, Kuzguncuk · Boru hattı',
    title: 'Doğalgaz kazısının üstü',
    order: 'Doğalgaz ekibi boruyu döşemiş, hendeği öylece bırakmış. Dar ve derin: silindir dibe inmez: toprağı ince ince dök, her katı tokmakla sıkıştır. Yoksa ilk kamyonda yama hendeğe oturur.',
    tools: ['saw', 'shovel', 'soil', 'gravel', 'tamper', 'tack', 'asphalt', 'rake', 'roller', 'probe'],
    budget: 150_000,
    after: 'İki gün sonra: aynı hendeği bu kez internet altyapısı için açtılar. "Koordinasyon toplantısı" önümüzdeki ay.',
  },
  {
    spec: { id: 'kis', seed: 1881, center: 160, half: 30, depth: 22, cold: 0.2 },
    place: 'Sarıyer, Zekeriyaköy · Kış sabahı',
    title: 'Kış yaması',
    order: 'Hava eksi iki derece. Asfalt kamyondan inerken donmaya başlıyor. Az az dök, hemen silindirle; beklersen silindir taşın üstünden zıplar.',
    tools: ['saw', 'shovel', 'soil', 'gravel', 'tamper', 'tack', 'asphalt', 'rake', 'roller', 'probe'],
    budget: 200_000,
    after: 'Bahar geldi: kış yamalarının yarısı tuz ve donla dağıldı. Seninki hâlâ yerinde mi, birazdan göreceğiz.',
  },
  {
    spec: { id: 'secim', seed: 2024, center: 160, half: 44, depth: 20, deadlineSec: 100 },
    place: 'Esenyurt · Ana bulvar, gece 02.00',
    title: 'Seçim öncesi gece mesaisi',
    order: 'Seçime üç gün var. Bulvarın en geniş çukuru sabah kameralar gelmeden kapanacak. Süre dar, ödenek bol: hızlı ama dikkatli.',
    tools: ['saw', 'shovel', 'soil', 'gravel', 'tamper', 'tack', 'asphalt', 'rake', 'roller', 'probe'],
    budget: 320_000,
    after: 'Seçimden bir hafta sonra: bulvarın öbür ucunda yeni bir çukur açıldı. Kimse fotoğraf çekmeye gelmedi.',
  },
  {
    spec: { id: 'tramvay', seed: 1914, center: 140, half: 24, depth: 22, rail: [172, 236] },
    place: 'Kadıköy, Moda · Tramvay hattı',
    title: 'Rayın dibindeki çukur',
    order: 'Çukur nostaljik tramvayın rayına iki adım. Tramvay her on dakikada geçiyor: raya tek kova düşerse sefer durur, vatman da seni haberlere çıkarır. Dikkatli dök.',
    tools: ['saw', 'shovel', 'soil', 'gravel', 'tamper', 'tack', 'asphalt', 'rake', 'roller', 'probe'],
    budget: 170_000,
    after: 'Ertesi gün: tramvay her zamanki gibi geçti. Vatman yamaya bakıp el salladı; bu belediyede nadir bir an.',
  },
  {
    spec: { id: 'kemer', seed: 1994, center: 160, half: 24, depth: 20 },
    place: 'Ümraniye · Ara sokak',
    title: 'Kemer sıkma',
    order: 'Yılın son çukuru, ödenek neredeyse bitmiş. Bu sefer ek ödenek yok: para bitince kamyon geri döner. Toprağı akıllıca kullan: yol hizasının 30 cm altına kadar mıcır, altı toprak. Asfaltı ince ama yeterli dök.',
    tools: ['saw', 'shovel', 'soil', 'gravel', 'tamper', 'tack', 'asphalt', 'rake', 'roller', 'probe'],
    budget: 150_000,
    strictBudget: true,
    after: 'Yeni yılın ilk iş emri: "Geçen yılın yamalarını yeniden yap." Ödenek iki katına çıkmış.',
  },
  {
    spec: { id: 'micir', seed: 2008, center: 160, half: 30, depth: 22, deadlineSec: 110 },
    place: 'Kartal · Sahil yolu',
    title: 'Mıcır kamyonu gecikti',
    order: 'Mıcır kamyonu E-5’te trafiğe takıldı, 45 saniye sonra gelir. Açılışa iki dakika var. Bekleyip doğru mu yaparsın, mıcırsız döküp yetiştirir misin?',
    tools: ['saw', 'shovel', 'soil', 'gravel', 'tamper', 'tack', 'asphalt', 'rake', 'roller', 'probe'],
    budget: 220_000,
    gravelAfterSec: 45,
    after: 'Kamyon şoförü ertesi gün aradı: "Abi trafik vardı." Sen zaten biliyordun.',
  },
];

export const TOOL_LABEL: Record<Tool, { name: string; hint: string }> = {
  saw: { name: 'Kesme', hint: 'Kırık kenarın gerisi' },
  shovel: { name: 'Kürek', hint: 'Moloz ve fazlalık' },
  pump: { name: 'Su motoru', hint: 'Suyu çek' },
  soil: { name: 'Toprak', hint: 'Alt dolgu, ucuz' },
  gravel: { name: 'Mıcır', hint: 'Asfaltın yatağı' },
  tack: { name: 'Yapıştırıcı', hint: 'Kenar ve taban' },
  tamper: { name: 'Tokmak', hint: 'Dar yer, kenar dibi' },
  asphalt: { name: 'Sıcak asfalt', hint: '160 °C' },
  rake: { name: 'Tırmık', hint: 'Yüzeyi düzle' },
  roller: { name: 'Silindir', hint: 'Sürükle · V titreşim' },
  probe: { name: 'Ölçüm', hint: 'Karot, °C, mastar' },
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
  budgetLock: 'Ödenek bitti, kamyon geri döndü. Ek ödenek yok evladım; elindekiyle bitir.',
  rail: 'Rayın üstüne malzeme düştü! Tramvay vatmanı kornaya bastı.',
  gravelLate: 'Mıcır kamyonu trafikte. Bekle ya da mıcırsız dök, sen bilirsin.',
  gravelHere: 'Mıcır geldi! Kamyon kapıda.',
  sawOk: 'Kenar dimdik kesildi. Kırık asfalt söküldü, molozu çukurda; kürekle al.',
  sawDone: 'Bu yan zaten kesildi evladım.',
  sawFar: 'O kadar geriden kesersen sağlam yolu da sökersin. Kırık kenarın hemen gerisinden kes.',
  sawCracked: 'Orası zaten kırık. Kesimi sağlam asfalta, kırığın gerisine at.',
  sawInside: 'Kesme makinesi yolun üstünde çalışır; çukurun içinde kesecek bir şey yok.',
  rollerMark: 'Titreşim açıkken sıcak asfaltın üstünde durulmaz evladım, tambur yolu oydu. Ya yürü ya titreşimi kapat.',
  waste: 'Kürekle attığın da, silindirin yola ittiği de para evladım. Az az dök, ölçerek.',
  tackFirst: 'Yapıştırıcı sürülmeden asfalt dökülürse kenardan ayrılır. Kenarlar ve taban parlak siyah olmalı.',
};

/** İşi teslim almak için kontrol mühendisinin istediği en düşük yama puanı. */
export const PASS_SCORE = 60;

/** Fişin altındaki hüküm: puan ve en büyük kusura göre. */
export function verdict(r: Report): string {
  if (r.rail > 3) return 'Rayın üstüne malzeme saçıldı; tramvay bir saat durdu, yolcular yürüdü. Yama sağlam ama haberlere sen çıktın.';
  if (r.stuck >= 0 && r.phases.length > 0 && r.phases[0].dips > 0) return 'Yama trafiğin altında çöktü, araç içine gömüldü. Yol kapandı, ekip yeniden çağrıldı.';
  if (r.stuck >= 0) return 'İlk araba çukura gömüldü, vinç çağrıldı. Yol bir hafta kapalı; çukur yerinde duruyor.';
  if (r.bare > 6) return 'Üstüne asfalt dökülmeyen toprak ilk tekerlekte ezildi, yol çamur oldu.';
  if (r.soilBase > 10) return 'Asfaltın altına toprak doldurulmuş. Kontrol mühendisi karot aldı, raporuna "taşıyıcı tabaka yok" yazdı.';
  if (r.uncut === 2 && r.unbonded === 2) return 'Kenar ne kesilmiş ne yapıştırılmış. İlk donda su kenardan girdi, yama eski yoldan ayrıldı.';
  if (r.rubble > 15) return 'Molozun üstüne dolgu yapılmış. Karot alınınca altından kırık asfalt parçaları çıktı.';
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
