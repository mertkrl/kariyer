import type { JobDraft } from '../types';

/**
 * İlanın nasıl yazıldığı yüzünden hiç başvurmayanlar. Hikâyenin tekrar eden karakterleri yine de
 * başvurur; listedeki diğer herkes bu hafta kuyruğunda yoktur.
 */
export const AD_EFFECT: Record<string, { skip: (c: { id: string; age: number }) => boolean; note: string }> = {
  enerjik: {
    skip: (c) => c.age >= 40 || ['tuncay', 'ugur'].includes(c.id),
    note: 'İlandaki "genç, dinamik ekip" ve "esnek (uzun) çalışma saatleri" vurgusu yüzünden 40 yaş üstü, yarı zamanlı ya da uzaktan çalışmak isteyen adayların çoğu hiç başvurmadı.',
  },
  sonuc: {
    skip: (c) => ['selin', 'deniz', 'pinar', 'hakan', 'ceren', 'melis'].includes(c.id),
    note: 'İlandaki "kanıtlanmış performans geçmişi" ve "performansa bağlı maaş" vurgusu yüzünden yeni mezunların, kariyer değiştirenlerin ve yarı zamanlı deneyimi olanların çoğu hiç başvurmadı.',
  },
};

export const jobDrafts: JobDraft[] = [
  {
    id: 'standart',
    title: 'Yazılım Geliştirici',
    tag: 'Standart İlan',
    accent: '#4C7FB0',
    companyLine: 'Tavrinsa Labs Inc.',
    location: 'İstanbul (Hibrit)',
    employmentType: 'Tam Zamanlı',
    salary: { min: 35000, max: 55000 },
    summary:
      'Ekibimize katılacak yazılım geliştiriciler arıyoruz. Deneyim seviyesi pozisyona göre değerlendirilecektir.',
    aboutRole:
      'Tavrinsa Labs Inc. olarak ürün ekibimizi büyütüyoruz. Backend ve entegrasyon süreçlerinde görev alacak, kod kalitesine önem veren bir yazılım geliştirici arıyoruz. Başvurular İnsan Kaynakları ekibi tarafından standart süreçle değerlendirilecektir.',
    responsibilities: [
      'Mevcut ürün altyapısının geliştirilmesi ve bakımı',
      'Kod incelemelerine (code review) katılım',
      'Diğer ekiplerle (tasarım, QA, ürün) koordineli çalışma',
      'Teknik dokümantasyonun güncel tutulması',
    ],
    requirements: [
      'İlgili alanda önceki deneyim',
      'En az bir modern programlama dilinde yetkinlik',
      'Takım çalışmasına yatkınlık',
      'Sözlü ve yazılı iletişim becerisi',
    ],
    benefits: [
      'Özel sağlık sigortası (kullanacak vakti bulursan)',
      'Hibrit çalışma imkanı ("hibrit"in ofis günü ağırlıklı olduğu türden)',
      'Yasal asgari izin hakları — tam da kanunun izin verdiği kadar, gramı fazlası yok',
      'Enflasyona yetişip yetişmeyeceği sürpriz olan bir yemek kartı',
    ],
  },
  {
    id: 'enerjik',
    title: 'Yazılım Geliştirici — Enerjik, Genç Bir Ekip!',
    tag: 'Kurum Kültürü Vurgulu',
    accent: '#B3766B',
    companyLine: 'Tavrinsa Labs Inc.',
    location: 'İstanbul (Ofisten)',
    employmentType: 'Tam Zamanlı',
    salary: { min: 32000, max: 48000 },
    summary:
      'Hızlı tempoya ayak uydurabilecek, "aile gibi" bir ekipte çalışmak isteyen dinamik adaylar arıyoruz.',
    aboutRole:
      'Genç, dinamik ve tutkulu bir ekibiz! "Mesai" kelimesini değil, "tutku" kelimesini seviyoruz. Şirketimizde herkes birbirine aile gibi bağlı — bu yüzden bazen fazla mesai bile bir yük değil, bir "ekip ruhu" göstergesi sayılır. Enerjini işine katabilecek, esnek çalışma saatlerine (ve bazen esnek olmayan uzun günlere) açık adaylar arıyoruz.',
    responsibilities: [
      'Hızlı tempolu, değişken önceliklere sahip projelerde görev almak',
      'Ekip aktivitelerine ve "gönüllü" mesai sürelerine katılım',
      'Günlük stand-up toplantılarında enerjik katılım',
      'Birden fazla proje arasında hızlı geçiş yapabilme',
    ],
    requirements: [
      'Esnek çalışma saatlerine açık olmak',
      'Yüksek enerji ve "pozitif tutum"',
      'Belirsizliğe karşı toleranslı olmak',
      'Genç ve dinamik ekip kültürüne uyum',
    ],
    benefits: [
      'Sınırsız kahve (uykusuzluğun resmi çözümü)',
      '"Aile ortamı" (mesai kavramını da aileden saydık)',
      'Haftalık ekip yemekleri — Cuma 21:00, hâlâ ofisteysen zaten oradasın',
      'Esnek çalışma saatleri (esnekliğin yönü hep aynı: daha fazla)',
    ],
  },
  {
    id: 'sonuc',
    title: 'Yazılım Geliştirici — Sonuç Odaklı',
    tag: 'Performans Vurgulu',
    accent: '#3F6B63',
    companyLine: 'Tavrinsa Labs Inc.',
    location: 'İstanbul (Ofisten)',
    employmentType: 'Tam Zamanlı',
    salary: { min: 30000, max: 50000, extra: 'performans primi' },
    summary:
      'Hedeflere ulaşmayı önceliklendiren, rekabetçi bir ortamda çalışabilecek profesyoneller arıyoruz.',
    aboutRole:
      'Sonuç odaklı bir kültürümüz var: rakamlar konuşur. Hedeflerini tutturan, rekabetçi ortamdan güç alan, "iyi" değil "en iyi" olmayı hedefleyen profesyoneller arıyoruz. Performans değerlendirmelerimiz düzenli ve şeffaftır — ölçemediğimiz şeyi yönetemeyiz.',
    responsibilities: [
      'Belirlenen KPI ve hedeflerin üzerinde performans göstermek',
      'Haftalık/aylık performans değerlendirmelerine katılım',
      'Rekabetçi bir ortamda bireysel sonuç üretmek',
      'Hedef gerçekleşme raporlarını düzenli sunmak',
    ],
    requirements: [
      'Kanıtlanmış performans geçmişi',
      'Hedef odaklı çalışma disiplini',
      'Baskı altında sonuç üretebilme',
      'Rekabetçi ortamlara yatkınlık',
    ],
    benefits: [
      'Performansa dayalı prim sistemi (performans genelde "yeterli" bulunmaz)',
      'Hedef üstü başarıda ek ödül — hedef de bir sonraki çeyrekte üstüne çıkar',
      '"Şeffaf" değerlendirme süreci (şeffaflık tek taraflı işler)',
      'Yükselme fırsatı — bir sonraki çeyrekte, söz veriyoruz',
    ],
  },
];

/** Bir ilanın basıldığı hâliyle maaşı: "35.000 – 55.000 TL", üstüne gelenlerle. */
export function salaryText({ salary }: Pick<JobDraft, 'salary'>) {
  const tl = (n: number) => n.toLocaleString('tr-TR');
  return `${tl(salary.min)} – ${tl(salary.max)} TL${salary.extra ? ` + ${salary.extra}` : ''}`;
}
