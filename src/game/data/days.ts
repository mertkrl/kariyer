import type { DayConfig } from '../types';

/** Across days 1–4 at most this many candidates can be advanced to the final. */
export const FINALIST_LIMIT = 10;

export const days: DayConfig[] = [
  {
    day: 1,
    dayName: 'Pazartesi',
    ruleText: 'Junior pozisyon için minimum 5 yıl deneyim şart.',
    memoFrom: 'Hakan Kaya, İK Müdürü',
    memoTo: 'İşe Alım Uzmanı (siz)',
    memoBody:
      'Tavrinsa Labs\'a hoş geldiniz. Deneme süreniz bugün başlıyor; masanız hazırlandı, sistem yetkileriniz tanımlandı.\n\nAçık pozisyonumuza 340 başvuru aldık. Yapay zekâ destekli ön eleme sistemimiz bunları sizin için birkaç dosyaya indirdi. Göreviniz bu dosyaları sonuçlandırmak: uygun gördüklerinizi cuma günkü mülakatlara çağırın, diğerlerini eleyin. Günde en fazla 3, hafta boyunca en fazla 10 aday çağırabilirsiniz. Cuma günü bu adaylar arasından yalnızca 1 kişiyi işe alacağız.\n\nMesai 08:00–17:00, öğle arası 12:00–13:00. Saat 17:00\'de açık dosya kalırsa tamamlanana kadar, en geç 20:00\'ye dek mesainiz uzar; fazla mesai ücreti ödenmez. Gün içinde sizi dahili hattan arayabilirim; bazı konular telefonda daha rahat konuşuluyor.',
    goals: [
      'Tüm dosyaları 17:00\'ye kadar sonuçlandır.',
      'Bugün en fazla 3 adayı mülakata çağır (haftalık toplam 10).',
      'Dosya başına süreyi kısa tut; kuyruk bekletilmez.',
    ],
    approvalLimit: 3,
    candidateIds: ['ahmet', 'selin', 'caner', 'gokce', 'deniz', 'melis', 'hakan'],
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
      'Bugün en fazla 3 adayı mülakata çağır; haftalık kontenjanı gözet.',
      'ATS eşiğinin altındaki dosyalarda gerekçesiz karar verme.',
    ],
    approvalLimit: 3,
    candidateIds: ['zeynep', 'irem', 'mert', 'derya', 'serkan', 'kerem', 'okan', 'nazli', 'ceren', 'sibel'],
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
      'Bugün en fazla 3 adayı mülakata çağır; kontenjanı unutma.',
      'Maaş beklentisini bütçeyle birlikte değerlendir.',
    ],
    approvalLimit: 3,
    candidateIds: ['emre', 'cem', 'aylin', 'nihan', 'burak', 'duygu', 'yusuf', 'murat', 'ferhat', 'seda'],
    companyQuestions: [
      'Maaş beklentinizin gerekçesi nedir?',
      'Bu teklifi neden kabul etmelisiniz, biz neden sizi seçmeliyiz?',
    ],
    applicationTarget: 890,
  },
  {
    day: 4,
    dayName: 'Perşembe',
    ruleText: "Öncelik: yurt dışı deneyimi ve düşük ayrılma riski.",
    memoFrom: 'Hakan Kaya, İK Müdürü',
    memoTo: 'İşe Alım Uzmanı (siz)',
    memoBody:
      'Yapay Zekâ Analiz Sistemi gece arızalandı; bilgi işlem ekibi çalışıyor ama bugün düzelmesi beklenmiyor. Dosyaları skor ve sistem önerisi olmadan, kendi değerlendirmenizle sonuçlandıracaksınız. Bu nedenle bugün bütün ekip 19:00\'a kadar mesaide kalacaktır.\n\nBugün mülakat davetleri için son gün; yarın çağırdığınız adaylarla görüşeceğiz. Yazılı bir kriter eklemiyorum. Kurum kültürümüzü artık tanıyorsunuz: uzun vadede bizimle kalacak, ekibe uyum sağlayacak profillere öncelik verin.',
    goals: [
      'Tüm dosyaları 17:00\'ye kadar sonuçlandır.',
      'Son mülakat davetlerini yap; bugünden sonra kontenjan kapanıyor.',
      'Sistem önerisi yok: her kararı kendi değerlendirmenle ver.',
    ],
    approvalLimit: 3,
    aiDown: true,
    candidateIds: ['kaan', 'gizem', 'asli', 'elif', 'volkan', 'baris', 'handan', 'ugur', 'tolga', 'tuncay', 'ece'],
    companyQuestions: [
      'Uzun vadede bu şirkette kalmayı düşünüyor musunuz?',
      'Kişisel hayatınız iş temponuzu etkiler mi?',
    ],
    applicationTarget: 1240,
  },
  {
    day: 5,
    dayName: 'Cuma',
    ruleText: 'Mülakat günü: bütçe kesildi, tek kadro açık. Mülakata gelenler arasından 1 kişi işe alınacak.',
    memoFrom: 'Hakan Kaya, İK Müdürü',
    memoTo: 'İşe Alım Uzmanı (siz)',
    memoBody:
      'Bugün mülakat günü. Hafta boyunca çağırdığınız adaylar sırayla gelecek; sorularınızı sorup cevaplarını değerlendireceksiniz. Görüşmelerde ben ve yazılım ekip lideri Levent Arslan da bulunacağız. Öneriyi siz sunacaksınız; kararı üçümüz birlikte vereceğiz.\n\nHolding dün akşam bütçeyi revize etti: yalnızca 1 kadro açık ve pozisyonun maaş tavanı aylık 50.000 TL. Bugün skor, sıralama ya da sistem önerisi yok; yalnızca adayların cevapları ve sizin kararınız.\n\nVereceğiniz karar geri alınamaz. Deneme sürenizin değerlendirmesini de bugün yapacağım.',
    goals: [
      'Adayların mülakat cevaplarını oku.',
      'Yalnızca 1 kişiyi işe al.',
      'Kararının sonuçlarıyla yüzleş.',
    ],
    candidateIds: [],
    companyQuestions: [],
    applicationTarget: 0,
    final: true,
  },
];
