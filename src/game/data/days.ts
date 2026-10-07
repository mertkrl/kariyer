import type { DayConfig } from '../types';

/** Tek mülakat kuralı: Perşembe, test sonuçlarıyla, en fazla bu kadar davet. Teste geçirmenin sınırı yoktur. */
export const INVITE_LIMIT = 3;

export const days: DayConfig[] = [
  {
    day: 1,
    dayName: 'Pazartesi',
    ruleText: 'Junior pozisyon için minimum 5 yıl deneyim şart.',
    memoFrom: 'Hakan Kaya, İK Müdürü',
    memoTo: 'İşe Alım Uzmanı (siz)',
    memoBody:
      'Tavrinsa Labs\'a hoş geldiniz. Deneme süreniz bugün başlıyor; masanız hazırlandı, sistem yetkileriniz tanımlandı.\n\nAçık pozisyonumuza 340 başvuru aldık. Yapay zekâ destekli ön eleme sistemimiz bunları sizin için birkaç dosyaya indirdi. Göreviniz bu dosyaları sonuçlandırmak: uygun gördüklerinizi bir sonraki aşamaya, Genel Yetenek ve Uyum Değerlendirmesi\'ne geçirin, diğerlerini eleyin. Teste geçirebileceğiniz kişi sayısında sınır yok. Sonuçlar ertesi sabah Değerlendirme uygulamasına düşer; mülakat davetlerini Perşembe, test puanlarına bakarak yapacağız. Cuma günü mülakata gelenler arasından yalnızca 1 kişiyi işe alacağız.\n\nMesai 08:00–17:00, öğle arası 12:00–13:00. Saat 17:00\'de açık dosya kalırsa tamamlanana kadar, en geç 20:00\'ye dek mesainiz uzar; fazla mesai ücreti ödenmez. Gün içinde sizi dahili hattan arayabilirim; bazı konular telefonda daha rahat konuşuluyor.',
    goals: [
      'Tüm dosyaları 17:00\'ye kadar sonuçlandır.',
      'Uygun gördüklerini teste geçir, gerisini ele.',
      'Dosya başına süreyi kısa tut; kuyruk bekletilmez.',
    ],
    candidateIds: ['ahmet', 'selin', 'caner', 'gokce', 'tolga', 'deniz', 'melis', 'baris', 'hakan'],
    companyQuestions: [
      'Bu pozisyonda sizi motive eden nedir?',
      'Kendinizi 5 yıl sonra nerede görüyorsunuz?',
    ],
    applicationTarget: 340,
  },
  {
    day: 2,
    dayName: 'Salı',
    ruleText: "ATS skoru %60'ın altında olan adaylar otomatik elenir.",
    memoFrom: 'Hakan Kaya, İK Müdürü',
    memoTo: 'İşe Alım Uzmanı (siz)',
    memoBody:
      'Dünkü raporunuz elime ulaştı. İlk gün için makul.\n\nBu sabahtan itibaren ATS eşiği %60. Eşiğin altında kalan başvurular sistem tarafından işaretlenir; son onay yine sizdedir, ancak işaretli bir dosyayı ilerletecekseniz gerekçenizin sağlam olması gerekir. Hedeflerini tutturan ekip arkadaşlarımızın deneme süreci değerlendirmesinde bunun karşılığını gördüğünü hatırlatırım.',
    goals: [
      'Tüm dosyaları 17:00\'ye kadar sonuçlandır.',
      'Uygun gördüklerini teste geçir, gerisini ele.',
      'ATS eşiğinin altındaki dosyalarda gerekçesiz karar verme.',
    ],
    candidateIds: ['zeynep', 'irem', 'mert', 'derya', 'serkan', 'volkan', 'kerem', 'okan', 'nazli', 'ceren', 'sibel'],
    companyQuestions: [
      'Neden bu şirkette çalışmak istiyorsunuz?',
      'Güçlü ve zayıf yönleriniz nelerdir?',
    ],
    applicationTarget: 610,
  },
  {
    day: 3,
    dayName: 'Çarşamba',
    ruleText: "Maaş beklentisi 'yüksek' olanlar görüşmeye alınmaz.",
    memoFrom: 'Hakan Kaya, İK Müdürü',
    memoTo: 'İşe Alım Uzmanı (siz)',
    memoBody:
      'Dün akşam holdingle bütçe toplantısı yaptık. Pozisyonun bütçe rakamını paylaşamıyorum; ancak maaş beklentisi "yüksek" olan adaylar bu dönem mülakata alınmayacak. Yüksek ile uygun arasındaki çizgiyi sizin takdirinize bırakıyorum.\n\nDosyaların 17:00\'ye kadar kapatılmasını bekliyorum.',
    goals: [
      'Tüm dosyaları 17:00\'ye kadar sonuçlandır.',
      'Uygun gördüklerini teste geçir, gerisini ele.',
      'Maaş beklentisini bütçeyle birlikte değerlendir.',
    ],
    candidateIds: ['ozan', 'cem', 'aylin', 'nihan', 'burak', 'duygu', 'ece', 'yusuf', 'murat', 'ferhat', 'seda'],
    companyQuestions: [
      'Maaş beklentinizin gerekçesi nedir?',
      'Bu teklifi neden kabul etmelisiniz, biz neden sizi seçmeliyiz?',
    ],
    applicationTarget: 890,
  },
  {
    day: 4,
    dayName: 'Perşembe',
    ruleText: "Test puanı 70'in altında olanlar mülakata çağrılmaz.",
    memoFrom: 'Hakan Kaya, İK Müdürü',
    memoTo: 'İşe Alım Uzmanı (siz)',
    memoBody:
      'Yapay Zekâ Analiz Sistemi gece arızalandı; bilgi işlem ekibi çalışıyor ama bugün düzelmesi beklenmiyor. Neyse ki elimizde nesnel bir ölçüt var: Genel Yetenek ve Uyum Değerlendirmesi sonuçları tamamlandı. Bugün yeni dosya yok. Teste geçirdiğiniz adaylar puanlarıyla birlikte portalınızda.\n\nBugün mülakat davetleri için son gün: en fazla 3 adayı yarınki mülakatlara çağırın. Test puanı 70\'in altında kalanlar mülakata çağrılmaz; sayılar ortada, uzun tartışmaya gerek görmüyorum. Ekip bugün 19:00\'a kadar mesaide kalacaktır.',
    goals: [
      'Teste geçenlerin dosyalarını sonuçlandır: çağır ya da çağırma.',
      'En fazla 3 adayı yarınki mülakata çağır.',
      'Puanlar Değerlendirme uygulamasında; cevap kâğıtlarına bakabilirsin.',
    ],
    approvalLimit: INVITE_LIMIT,
    selection: true,
    aiDown: true,
    // yeni dosya yok: kuyruk sabah, Pazartesi–Çarşamba teste geçenlerden kurulur
    candidateIds: [],
    companyQuestions: [
      'Uzun vadede bu şirkette kalmayı düşünüyor musunuz?',
      'Kişisel hayatınız iş temponuzu etkiler mi?',
    ],
    applicationTarget: 0,
  },
  {
    day: 5,
    dayName: 'Cuma',
    ruleText: 'Mülakat günü: bütçe kesildi, tek kadro açık. Mülakata gelenler arasından 1 kişi işe alınacak.',
    memoFrom: 'Hakan Kaya, İK Müdürü',
    memoTo: 'İşe Alım Uzmanı (siz)',
    memoBody:
      'Bugün mülakat günü. Herkes kendi adayının görüşmesini yapacak: siz çağırdığınız adaylarla, Ayşe ve Emre kendi kısa listeleriyle, ben önerdiğim adaylarla görüşeceğim. Her görüşmede teknik soruları yazılım ekip lideri Ümit Arslan, uyum sorularını ben soracağım.\n\nHolding dün akşam bütçeyi revize etti: yalnızca 1 kadro açık ve pozisyonun maaş tavanı aylık 50.000 TL. Gün sonunda kurul, görüşmelerdeki puanları birlikte değerlendirip kararı verecek.\n\nKurul kararı geri alınamaz. Deneme sürenizin değerlendirmesini de bugün yapacağım.',
    goals: [
      'Kendi adaylarınla görüş; soruların bitince söz Ümit Bey\'de.',
      'Her görüşmeyi puanla; kurul puanlarla karar verecek.',
      'Kararın sonuçlarıyla yüzleş.',
    ],
    candidateIds: [],
    companyQuestions: [],
    applicationTarget: 0,
    final: true,
  },
];
