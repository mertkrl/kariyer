/*
 * Extended CV data + final-round interview answers.
 *
 * `hireFit` (1–5) is hidden from the player: it is how the person actually performs once hired.
 * The interview answers are written to reveal it — concrete, owned, measurable answers come
 * from strong candidates; buzzwords and deflection from weak ones — regardless of how the
 * algorithm scored their CV.
 */

import { EXTRA_DETAILS } from './extraCandidates';

export interface WorkEntry {
  period: string;
  title: string;
  company: string;
  note: string;
}

export interface CandidateDetails {
  location: string;
  languages: string;
  workHistory: WorkEntry[];
  highlights: string[];
  /** Answers to FINAL_INTERVIEW_QUESTIONS, in order. */
  interview: [string, string, string];
  hireFit: 1 | 2 | 3 | 4 | 5;
}

export const FINAL_INTERVIEW_QUESTIONS: [string, string, string] = [
  'Sizi bu işe en uygun kılan, somut ve ölçülebilir bir başarınızı anlatır mısınız?',
  'Yaptığınız bir hatayı ve ondan ne öğrendiğinizi anlatır mısınız?',
  'Bu pozisyonda ilk 90 gününüzde neyi değiştirirdiniz?',
];

export const candidateDetails: Record<string, CandidateDetails> = {
  // ── Gün 1 ──
  ahmet: {
    location: 'İstanbul, Avcılar',
    languages: 'İngilizce (B2)',
    workHistory: [
      { period: '2025 · 6 ay', title: 'Yazılım Stajyeri', company: 'NovaTeknoloji', note: 'Ödeme servisinde REST uç noktaları yazdı.' },
      { period: '2024', title: 'Öğrenci Asistanı', company: 'Üniversite Bilgi İşlem', note: 'Kampüs kütüphane sistemine SQL raporları hazırladı.' },
    ],
    highlights: ['Staj projesi canlıya alındı', 'Hackathon ikinciliği (2024)'],
    interview: [
      'Stajımda yavaş çalışan bir raporlama sorgusunu yeniden yazdım; 40 saniyeden 3 saniyeye indi ve ekip bunu her gün kullanıyor.',
      'Canlıya test etmeden küçük bir değişiklik gönderdim, yarım saat ödeme sayfası hata verdi. O günden beri her PR\'a test yazmadan dokunmuyorum.',
      'Önce kod tabanını ve dokümantasyonu öğrenirim; eksik dokümanları tamamlayarak katkıya başlarım. Sessiz ama güvenilir bir başlangıç isterim.',
    ],
    hireFit: 4,
  },
  selin: {
    location: 'İstanbul, Maltepe',
    languages: 'İngilizce (B1)',
    workHistory: [
      { period: '2025', title: 'Freelance Frontend Geliştirici', company: 'Yerel bir kafe zinciri', note: 'Sipariş ekranını React ile yeniden yazdı.' },
      { period: '2024', title: 'Freelance', company: 'Öğrenci kulübü', note: 'Etkinlik kayıt sitesini kurdu.' },
    ],
    highlights: ['İki freelance projesi yayında', 'Figma topluluğunda 3 şablonu 2.000+ kez kopyalandı'],
    interview: [
      'Kafe zincirinin sipariş ekranını React ile yeniden yazdım ve bir adımı kaldırdım; kasadaki bekleme süresi ortalama 40 saniye kısaldı.',
      'İlk projemde müşteriye sormadan renkleri değiştirdim ve her şeyi baştan yapmak zorunda kaldım. Artık her kararı yazılı olarak onaylatıyorum.',
      'Açıkçası önce çok şey öğrenmem gerekecek. Mentorumun yanından ayrılmam, küçük işlerle başlar ve hızla sorumluluk almaya çalışırım.',
    ],
    hireFit: 3,
  },
  caner: {
    location: 'İstanbul, Kadıköy',
    languages: 'İngilizce (C1), Almanca (A2)',
    workHistory: [
      { period: '2021 – 2025', title: 'Kıdemli Ekip Lideri', company: 'Vertex Yazılım', note: '9 kişilik backend ekibini yönetti.' },
      { period: '2017 – 2021', title: 'Yazılım Geliştirici', company: 'Nokta Bilişim', note: 'Bankacılık entegrasyonları.' },
    ],
    highlights: ['Ekibinde 4 yılda sıfır istifa', 'Sürüm döngüsünü 6 haftadan 2 haftaya indirdi'],
    interview: [
      'Vertex\'te sürüm sürecini baştan kurdum: 6 haftalık döngüyü 2 haftaya indirdik, üretimdeki hata sayısı yarıya düştü.',
      'Bir dönem her kararı kendim vermeye çalıştım, ekip yavaşladı ve iki kişi tükendi. Sorumluluk dağıtmayı o zaman öğrendim; şimdi kararların çoğunu ekip veriyor.',
      'İlk ay herkesle bire bir görüşürüm; ikinci ay en çok şikâyet edilen süreci düzeltirim; üçüncü ay ölçülebilir bir hedef koyarım. Önce dinlerim, sonra değiştiririm.',
    ],
    hireFit: 5,
  },
  tolga: {
    location: 'İstanbul, Esenyurt (Kars\'tan yeni taşındı)',
    languages: 'İngilizce (C1)',
    workHistory: [
      { period: '2023 – bugün', title: 'Açık Kaynak Bakımcısı', company: 'a11y-kit (GitHub)', note: 'Haftada 40 bin indirilen bir kütüphane.' },
      { period: '2022', title: 'Gönüllü Geliştirici', company: 'Bir dernek sitesi', note: 'Görme engelli kullanıcılar için uyarlama.' },
    ],
    highlights: ['1.200+ commit', 'WCAG denetimlerinde 3 kurumsal siteye danışmanlık'],
    interview: [
      'Bakımını yaptığım kütüphanede ekran okuyucu hatalarını düzelttim; bir bankanın mobil uygulaması bu düzeltmeyle erişilebilirlik denetimini geçti.',
      'Büyük bir değişikliği topluluğa danışmadan birleştirdim, yüzlerce projede kırılma oldu. O günden beri her kırıcı değişikliği önce duyuruyor, geçiş rehberi yazıyorum.',
      'Ürünün erişilebilirlik denetimini yaparım, en kritik 10 sorunu çıkarırım ve ilk 90 günde bunları kapatırım. Ekibe de kısa bir eğitim veririm.',
    ],
    hireFit: 5,
  },
  deniz: {
    location: 'İstanbul, Bağcılar',
    languages: 'İngilizce (B2)',
    workHistory: [
      { period: '2025 · 6 ay', title: 'Bootcamp Katılımcısı', company: 'KodAkademi', note: 'Ekip projesi: kargo takip API\'si.' },
      { period: '2021 – 2024', title: 'Satış Danışmanı', company: 'Elektronik mağazası', note: 'Ayın çalışanı ×3.' },
    ],
    highlights: ['Bootcamp bitirme projesi birincisi', 'Kendi yazdığı API\'yi bir kargo firması denemeye aldı'],
    interview: [
      'Bootcamp\'te ekip projemizde veritabanı tasarımını ben üstlendim; bitirme projeleri arasında performans testinde birinci olduk.',
      'Projenin son haftasında bir hatayı saklamaya çalıştım, ekip arkadaşım son gece buldu. Hatamı erken söylemenin herkese zaman kazandırdığını öğrendim.',
      'Test kapsamı düşük olan bir modül seçer, onun testlerini yazarak kodu öğrenirim. Böylece hem öğrenir hem katkı veririm.',
    ],
    hireFit: 4,
  },
  melis: {
    location: 'İstanbul, Üsküdar',
    languages: 'İngilizce (C1)',
    workHistory: [
      { period: '2021 – 2024', title: 'Yarı Zamanlı Veri Asistanı', company: 'BilgiNet Analitik', note: 'Haftalık satış panoları.' },
      { period: '2023', title: 'Araştırma Asistanı', company: 'İstatistik Bölümü', note: 'Anket verisi temizleme ve modelleme.' },
    ],
    highlights: ['Hazırladığı pano 3 departmanda standart oldu', 'Burslu, onur derecesiyle mezun'],
    interview: [
      'Satış ekibinin her pazartesi elle hazırladığı raporu otomatik bir panoya çevirdim; toplantı 2 saatten 30 dakikaya indi.',
      'Bir analizde veri kaynağındaki tekrar eden kayıtları fark etmedim ve büyümeyi abarttım. Artık her analizden önce veri kalite kontrolü yapıyorum ve varsayımlarımı yazıyorum.',
      'En çok kullanılan üç raporu bulur, doğruluğunu kontrol eder, sonra tek bir güvenilir veri kaynağı önerirdim.',
    ],
    hireFit: 5,
  },
  pinar: {
    location: 'İstanbul, Pendik',
    languages: 'İngilizce (B2)',
    workHistory: [
      { period: '2021 – 2024', title: 'Matematik Öğretmeni', company: 'Özel okul', note: 'Okulun not takip tablosunu Python\'a taşıdı.' },
      { period: '2024 – 2025', title: 'Yazılım Sertifika Programı', company: 'Üniversite sürekli eğitim', note: 'Python ve SQL.' },
    ],
    highlights: ['Okulda 40 öğretmenin kullandığı not otomasyonu', 'Veli iletişim süresini haftada 5 saat kısalttı'],
    interview: [
      'Öğretmenlerin karne dönemi elle yaptığı not hesaplarını Python\'la otomatikleştirdim; okulda 40 kişi kullanıyor, dönem sonu hataları sıfırlandı.',
      'Bir sınıfta konuyu çok hızlı geçtim, sınav sonuçları kötü geldi. Anlaşıldığımı varsaymak yerine kısa kontroller yapmayı öğrendim; kodda da test yazmak aynı şey.',
      'Önce iş birimlerinin şikâyetlerini dinlerim; öğretmenlikten gelen en güçlü yanım karmaşık konuyu herkese anlatabilmek.',
    ],
    hireFit: 4,
  },
  hakan: {
    location: 'İstanbul, Başakşehir',
    languages: 'İngilizce (B2)',
    workHistory: [
      { period: '2009 – 2024', title: 'Fizik Öğretmeni', company: 'Özel bir lise', note: 'Bölüm başkanı (son 5 yıl).' },
      { period: '2024 – 2025', title: 'Bootcamp + Freelance', company: '.NET projeleri', note: 'Bir dershane için kayıt sistemi.' },
    ],
    highlights: ['Bölüm başkanlığı: 6 öğretmenlik ekip', 'Freelance kayıt sistemi 800 öğrenciyle çalışıyor'],
    interview: [
      'Yazdığım kayıt sistemi bir dershanede 800 öğrencinin kaydını yönetiyor; kayıt haftasındaki kuyruk tamamen kalktı.',
      'Bölüm başkanıyken bir müfredat değişikliğini ekibe sormadan uyguladım, direnç gördüm. Değişikliği insanlarla birlikte yapmayı öğrendim.',
      'Kod tabanını öğrenirken yeni gelenler için bir rehber yazarım. İlk 90 günün sonunda ekibe katılan her kişinin ilk haftasını yarıya indirmek isterim.',
    ],
    hireFit: 4,
  },

  // ── Gün 2 ──
  zeynep: {
    location: 'İstanbul, Beşiktaş',
    languages: 'İngilizce (C1), Fransızca (B1)',
    workHistory: [
      { period: '2022 – 2025', title: 'Kıdemli Backend Geliştirici', company: 'Sepetim E-Ticaret', note: 'Sepet ve ödeme servisleri.' },
      { period: '2019 – 2022', title: 'Backend Geliştirici', company: 'Lojistik girişimi', note: 'Kotlin\'e geçişi başlattı.' },
    ],
    highlights: ['Kampanya günü yanıt süresini 1,2 sn\'den 180 ms\'ye indirdi', 'Ekibin Java\'dan Kotlin\'e geçişini yönetti'],
    interview: [
      'Sepet servisindeki sorgu sorununu çözdüm; kampanya günlerinde yanıt süresi 1,2 saniyeden 180 milisaniyeye indi, satış kaybı durdu.',
      'Bir veritabanı göçünü yük testi yapmadan canlıya aldım; bir gece ödeme alınamadı. Artık her göçü önce bir kopya üzerinde, gerçek trafikle deniyorum.',
      'Önce en çok şikâyet alan servisi ölçerim; darboğazı bulup ilk 90 günde ölçülebilir biçimde hızlandırırım.',
    ],
    hireFit: 5,
  },
  irem: {
    location: 'İstanbul, Ataşehir',
    languages: 'İngilizce (C1)',
    workHistory: [
      { period: '2020 – 2025', title: 'Yazılım Geliştirici (ML)', company: 'Veriyol Lojistik', note: 'Talep tahmini servisleri.' },
      { period: '2018 – 2020', title: 'Araştırma Görevlisi', company: 'Üniversite', note: 'Zaman serisi modelleri.' },
    ],
    highlights: ['Depo maliyetlerini %12 düşüren tahmin modeli', '2 hakemli makale'],
    interview: [
      'Kurduğum talep tahmin modeli sayesinde depolardaki fazla stok %18 azaldı; yıllık tasarruf yaklaşık 6 milyon TL.',
      'Bir modeli gerçek dünyada test etmeden canlıya aldım; bayram haftasında tamamen yanıldı. Artık her modelin sınır koşullarını iş birimiyle birlikte belirliyorum.',
      'Önce hangi kararların sezgiyle verildiğini bulurum; en pahalısını seçip veriyle desteklenen bir karar sürecine çeviririm.',
    ],
    hireFit: 5,
  },
  mert: {
    location: 'İstanbul, Kadıköy (Moda)',
    languages: 'İngilizce (B2)',
    workHistory: [
      { period: '2021 – 2025', title: 'Freelance Frontend Geliştirici', company: 'Çeşitli markalar', note: '20+ web sitesi ve iki web uygulaması.' },
      { period: '2020', title: 'Stajyer Tasarımcı', company: 'Reklam ajansı', note: 'Kampanya siteleri.' },
    ],
    highlights: ['Bir e-ticaret sitesinin tasarımı ve kodu: dönüşüm +%22', '20+ canlı proje'],
    interview: [
      'Bir kahve markasının e-ticaret sitesini baştan tasarlayıp kodladım; mobil dönüşüm oranı iki ayda %22 arttı.',
      'Bir projede teslim tarihini kurtarmak için geri bildirimleri görmezden geldim; müşteri kaybettim. Arayüzün bir sohbet olduğunu öğrendim.',
      'Ürünün tüm ekranlarını tek bir bileşen kütüphanesine toplardım; şu an her ekip kendi butonunu yazıyor gibi görünüyor.',
    ],
    hireFit: 4,
  },
  derya: {
    location: 'İstanbul, Ümraniye',
    languages: 'İngilizce (C1)',
    workHistory: [
      { period: '2018 – 2023', title: 'Kıdemli Yazılım Geliştirici', company: 'Delta Lojistik', note: 'Depo otomasyon yazılımı.' },
      { period: '2023 – 2025', title: 'Kariyer arası', company: '—', note: 'Aile şirketinin borçlarını kapatmak için çalıştı.' },
      { period: '2014 – 2018', title: 'Yazılım Geliştirici', company: 'Liman işletmesi', note: 'Konteyner takip sistemi.' },
    ],
    highlights: ['Depo otomasyon yazılımının teknik sorumlusu', 'Java sertifikası (OCP)'],
    interview: [
      'Depo otomasyon yazılımının robot entegrasyonunu ben yazdım; toplama hataları %60 azaldı, proje iki hafta erken bitti.',
      'Bir tedarikçinin API\'sine fazla güvendim ve sorunları erken raporlamadım; üç haftalık gecikme oldu. Artık her dış bağımlılığın riskini ilk gün yazıyorum.',
      'Ekibin en kırılgan entegrasyonunu bulur, testlerini yazıp sağlamlaştırırdım. İki yıllık aram bana önceliklendirmeyi daha iyi öğretti.',
    ],
    hireFit: 5,
  },
  serkan: {
    location: 'Belirtilmemiş',
    languages: 'İngilizce (belirtilmemiş)',
    workHistory: [
      { period: '2023 – 2025', title: 'Full Stack Profesyonel', company: 'Belirtilmemiş', note: 'Sinerji odaklı dijital dönüşüm.' },
      { period: '—', title: '—', company: 'Belirtilmemiş', note: '—' },
    ],
    highlights: ['"Çok yönlü bir oyun kurucu"', '"Sonuç odaklı liderlik"'],
    interview: [
      'Açıkçası her projede sinerji yarattım ve değer kattım. Ekiplerimle birlikte çok yönlü başarılar elde ettik.',
      'Hatam fazla mükemmeliyetçi olmam. Bazen işimi çok önemsiyorum.',
      'Şirketin vizyonuyla tamamen örtüşerek çevik ve inovatif bir dönüşüm başlatırdım. Detayları ekiple birlikte belirleriz.',
    ],
    hireFit: 1,
  },
  kaan: {
    location: 'İstanbul, Güngören',
    languages: 'İngilizce (B1)',
    workHistory: [
      { period: '2020 – 2025', title: 'Kıdemli Yazılım Geliştirici', company: 'Ticaret A.Ş.', note: 'Gün sonu ve raporlama sistemleri.' },
      { period: '2018 – 2020', title: 'Yazılım Geliştirici', company: 'Tekstil firması', note: 'SAP entegrasyonu.' },
    ],
    highlights: ['Gece raporlamasını 6 saatten 40 dakikaya indirdi', 'SAP entegrasyonunun geliştiricisi'],
    interview: [
      'Gün sonu raporlama işini yeniden yazdım; 6 saatlik gece çalışması 40 dakikaya indi ve sabah raporları artık 07:00\'de hazır.',
      'Bir kur dönüşümünü yanlış yuvarladım, bir çeyrek raporu düzeltildi. O günden beri para hesaplayan her fonksiyona sınır testleri yazıyorum.',
      'Gece çalışan işlerin izlemesini kurar, hata olduğunda sabah değil anında haber alınmasını sağlardım.',
    ],
    hireFit: 4,
  },
  nazli: {
    location: 'İstanbul, Esenler',
    languages: 'İngilizce (B2)',
    workHistory: [
      { period: '2022 – 2025', title: 'Yazılım Geliştirici', company: 'Hızlıkargo', note: 'Müşteri uygulaması.' },
      { period: '2021', title: 'Stajyer', company: 'Telekom operatörü', note: 'Destek aracı.' },
    ],
    highlights: ['Ayın çalışanı ×4', 'Uygulama şikâyetlerini %40 azalttı'],
    interview: [
      'Müşteri uygulamasında en sık şikâyet edilen 10 hatayı düzelttim; şikâyetler %40 azaldı, mağaza puanı 3,1\'den 4,4\'e çıktı.',
      'Bir kullanıcıya yetiştiremeyeceğim bir düzeltme için söz verdim ve şirketi zor durumda bıraktım. Artık ancak tutabileceğim tarihleri veriyorum.',
      'Destek kayıtlarını analiz eder, tekrar eden hataları ürün yol haritasına düzenli olarak taşırdım.',
    ],
    hireFit: 4,
  },
  sibel: {
    location: 'İstanbul, Bakırköy',
    languages: 'İngilizce (C2)',
    workHistory: [
      { period: '2021 – 2025', title: 'Senior Software Engineer', company: 'Globeway (Dublin, uzaktan)', note: 'Rezervasyon platformu.' },
      { period: '2016 – 2021', title: 'Yazılım Geliştirici', company: 'Uluslararası otel zinciri', note: '3 ülkede kullanılan rezervasyon sistemi.' },
    ],
    highlights: ['3 ülkede kullanılan rezervasyon sistemi', 'Dağıtık bir ekipte 4 yıl'],
    interview: [
      'Rezervasyon platformunda ödeme adımını yeniden yazdım; yarım kalan rezervasyonlar %18 azaldı.',
      'Bir sürümü hızlı çıkarmak için kod incelemesini atladım; üç ülkede bir gün boyunca iptal yapılamadı. Hız için incelemeden ödün vermemeyi öğrendim.',
      'Ekibin sürüm sürecini ve kod inceleme alışkanlıklarını gözden geçirir, en çok hata kaçan adımı düzeltirdim.',
    ],
    hireFit: 5,
  },
  ceren: {
    location: 'İstanbul, Sultanbeyli',
    languages: 'İngilizce (B1)',
    workHistory: [
      { period: '2023 – 2025', title: 'Junior Yazılım Geliştirici', company: 'Anadolu Gıda', note: 'Fatura sürecini otomatikleştirdi.' },
      { period: '2022', title: 'Stajyer', company: 'Yazılım evi', note: 'Test betikleri.' },
    ],
    highlights: ['Bir Python servisiyle 3 kişilik işi tek tıka indirdi', 'Bölüm ikincisi'],
    interview: [
      'Fatura eşleştirme işini bir Python servisiyle otomatikleştirdim; ayda 60 saatlik elle çalışma 4 saate indi.',
      'Betiğimi yeterince test etmeden kullandım, bir ay yanlış KDV oranı uygulandı. Artık her otomasyonu önce geçmiş verilerle test ediyorum.',
      'Tekrarlayan işleri listeler, en çok saat yiyen ikisini otomatikleştirirdim. İnsanlar kontrol ve analize vakit ayırabilmeli.',
    ],
    hireFit: 4,
  },

  // ── Gün 3 ──
  emre: {
    location: 'İstanbul, Ataşehir',
    languages: 'İngilizce (C1)',
    workHistory: [
      { period: '2019 – 2025', title: 'Baş Yazılım Mimarı', company: 'Globalsoft', note: 'Mikroservis dönüşümü.' },
      { period: '2013 – 2019', title: 'Kıdemli Geliştirici', company: 'Telekom operatörü', note: 'Faturalama sistemi.' },
    ],
    highlights: ['Monolitten mikroservise geçiş: sıfır kesinti', '20 kişilik mimari topluluğu kurdu'],
    interview: [
      'Globalsoft\'ta 12 yıllık bir monoliti iki yılda mikroservislere taşıdık; tek bir dakika kesinti yaşanmadı ve dağıtım süresi 3 saatten 10 dakikaya indi.',
      'Bir teknolojiyi moda olduğu için seçtim, ekip öğrenemedi ve geri döndük. Mimarinin ekibin gücüne göre seçilmesi gerektiğini öğrendim.',
      'Önce mevcut sistemin en kırılgan noktalarını belgeleyip ekiple önceliklendirirdim. İlk 90 günde büyük bir yeniden yazım değil, üç net iyileştirme.',
    ],
    hireFit: 5,
  },
  cem: {
    location: 'İstanbul, Kadıköy (uzaktan çalışabilir)',
    languages: 'İngilizce (C1)',
    workHistory: [
      { period: '2021 – 2025', title: 'Kıdemli DevOps Mühendisi', company: 'Bulutpazar', note: 'Kubernetes platformu.' },
      { period: '2017 – 2021', title: 'Sistem Mühendisi', company: 'Barındırma firması', note: 'Veri merkezi göçü.' },
    ],
    highlights: ['Bulut faturasını ayda 140 bin TL düşürdü', 'Nöbet çağrılarını %70 azalttı'],
    interview: [
      'Bulutpazar\'da otomatik ölçekleme kurallarını yeniden yazdım; aylık bulut faturası 140 bin TL düştü, gece nöbet çağrıları %70 azaldı.',
      'Bir yedekleme betiğini kontrol etmedim, bir test ortamı tamamen silindi. O günden beri her kritik işlemi geri dönülebilir tasarlıyorum.',
      'Maliyet ve izleme panelleri kurardım; ölçmediğimiz şeyi iyileştiremeyiz. İlk hedefim, geliştiricilerin 10 dakikada canlıya çıkabilmesi.',
    ],
    hireFit: 5,
  },
  aylin: {
    location: 'İstanbul, Şişli (Nişantaşı)',
    languages: 'İngilizce (B2), İtalyanca (A2)',
    workHistory: [
      { period: '2021 – 2025', title: 'Backend Geliştirici', company: 'Kargonet', note: 'Kargo takip servisleri.' },
      { period: '2020', title: 'Stajyer', company: 'Mobilya e-ticaret sitesi', note: 'Stok entegrasyonu.' },
    ],
    highlights: ['Tavrinsa Labs\'te 4 mülakat aşamasını geçti, 5.\'si bekleniyor', 'Takip servisinin yanıt süresini yarıya indirdi'],
    interview: [
      'Kargo takip servisini Go ile yeniden yazdım; yanıt süresi yarıya indi, sunucu maliyeti %30 düştü.',
      'Bir veritabanı indeksini kaldırmanın etkisini ölçmeden canlıya aldım; iki saat sorgular yavaşladı. Artık her değişikliği önce ölçüyorum.',
      'Ekibin en çok nöbet çağrısı getiren servisini bulur, izleme ekler ve kök nedeni kapatırdım.',
    ],
    hireFit: 4,
  },
  burak: {
    location: 'İstanbul, Zeytinburnu',
    languages: 'İngilizce (B2), Arapça (B1)',
    workHistory: [
      { period: '2018 – 2025', title: 'Kıdemli Yazılım Geliştirici', company: 'Atlas Ticaret', note: 'Bayi sipariş sistemi, tek başına.' },
      { period: '2016 – 2018', title: 'Yazılım Geliştirici', company: 'Gıda toptancısı', note: 'Stok programı.' },
    ],
    highlights: ['12 ülkedeki bayinin kullandığı sipariş sistemini yazdı', '7 yılda tek büyük kesinti yok'],
    interview: [
      'Atlas\'ın 12 ülkedeki bayilerinin kullandığı sipariş sistemini tek başıma yazdım; bayiler telefonla sipariş vermeyi bıraktı, sipariş hataları %70 azaldı.',
      'Tek geliştirici olduğum için hiçbir şeyi belgelemedim; izne çıktığımda şirket bir hafta sipariş alamadı. Artık yazdığım her şeyin başkası tarafından da çalıştırılabilmesini şart koşuyorum.',
      'Önce kodun dokümantasyonunu ve testlerini tamamlardım; tek kişiye bağlı hiçbir sistem kalmasın isterim.',
    ],
    hireFit: 4,
  },
  duygu: {
    location: 'İstanbul, Şişli',
    languages: 'İngilizce (C2)',
    workHistory: [
      { period: '2021 – 2025', title: 'Frontend Geliştirici', company: 'Mobilbank', note: 'Mobil bankacılık arayüzleri.' },
      { period: '2019 – 2021', title: 'Frontend Geliştirici', company: 'Oyun şirketi', note: 'Oyuncu paneli.' },
    ],
    highlights: ['6 aylık gereksiz bir geliştirmeyi lansmandan önce durdurdu', 'Para transferi ekranını baştan yazdı'],
    interview: [
      'Para transferi ekranını kullanıcı testleriyle baştan yazdım; tamamlanamayan transferler %35 azaldı.',
      'Bir araştırmada sadece genç kullanıcılarla konuştum, sonuçlar yanıltıcıydı. Artık her testte örneklemin kimi dışarıda bıraktığını soruyorum.',
      'Ekibin en riskli üç arayüz varsayımını bulur, her birini kod yazmadan önce hızlı bir kullanıcı testiyle doğrulardım.',
    ],
    hireFit: 5,
  },
  yusuf: {
    location: 'İstanbul, Kartal',
    languages: 'İngilizce (B2)',
    workHistory: [
      { period: '2022 – 2025', title: 'Kıdemli Test Uzmanı', company: 'YazılımEvi', note: 'Test otomasyon altyapısı.' },
      { period: '2020 – 2022', title: 'Test Uzmanı', company: 'Oyun stüdyosu', note: 'Manuel ve regresyon testleri.' },
    ],
    highlights: ['Regresyon testini 2 günden 40 dakikaya indirdi', 'Canlı hataları %50 azaldı'],
    interview: [
      'Regresyon testlerini otomatikleştirdim; iki günlük elle test 40 dakikaya indi ve canlıya kaçan hatalar yarıya düştü.',
      'Kararsız (flaky) testleri görmezden geldim; ekip test sonuçlarına güvenmez oldu. Artık kararsız testleri anında düzeltiyor ya da kapatıyorum.',
      'Kritik kullanıcı akışlarının test kapsamını çıkarır, eksikleri kapatırdım.',
    ],
    hireFit: 4,
  },
  ferhat: {
    location: 'İstanbul, Arnavutköy',
    languages: 'İngilizce (B1)',
    workHistory: [
      { period: '2013 – 2024', title: 'Bilgi İşlem Şefi', company: 'Yapıtaş İnşaat', note: 'Saha takip ve İSG yazılımları. Şirket iflas etti.' },
      { period: '2010 – 2013', title: 'Saha Mühendisi', company: 'Altyapı firması', note: 'Kendi takip programını yazdı.' },
    ],
    highlights: ['Çevrimdışı çalışan saha uygulaması: 11 yılda sıfır kesinti', 'İş kazası raporlamasını dijitale taşıdı'],
    interview: [
      'Şantiyeler için internet olmadan çalışan bir takip uygulaması yazdım; 30 sahada 11 yıl kullanıldı ve iş güvenliği raporları ilk kez gününde merkeze ulaştı.',
      'Bir güncellemeyi sahada denemeden gönderdim; iki şantiye bir hafta eski veriyle çalıştı. O günden beri her sürümü önce bir sahada kendim deniyorum.',
      'Önce ekibin en çok kullandığı ama en az güvendiği sistemi bulurdum; ilk hafta kullanıcılarla birlikte oturur, sorunları yerinde görürdüm.',
    ],
    hireFit: 5,
  },
  ece: {
    location: 'İstanbul, Sarıyer (Maslak)',
    languages: 'İngilizce (C1), Almanca (B1)',
    workHistory: [
      { period: '2021 – 2025', title: 'Kıdemli Frontend Geliştirici', company: 'Marka Grubu', note: '5 ürün lansmanı.' },
      { period: '2017 – 2021', title: 'Frontend Geliştirici', company: 'Kozmetik e-ticaret', note: 'A/B test altyapısı.' },
    ],
    highlights: ['Bir lansmanda dönüşüm hedefini %140 aştı', 'A/B test altyapısını kurdu'],
    interview: [
      'Son lansmanda ödeme sayfasını A/B testleriyle yeniden kurduk; ilk çeyrek dönüşümü hedefin %140\'ı oldu.',
      'Bir değişikliği test etmeden tüm kullanıcılara açtım; eski tarayıcılarda sepet çalışmadı. Artık her değişikliği önce küçük bir grupta açıyorum.',
      'Ürünün en çok terk edilen ekranını bulur, veriyle üç iyileştirme dener, işe yarayanı kalıcı yapardım.',
    ],
    hireFit: 4,
  },
  nihan: {
    location: 'İstanbul, Beşiktaş (Levent)',
    languages: 'İngilizce (C2)',
    workHistory: [
      { period: '2020 – 2025', title: 'Staff Yazılım Mühendisi', company: 'Teknoloji A.Ş.', note: 'B2B SaaS platformu.' },
      { period: '2012 – 2020', title: 'Yazılım Geliştirici → Ekip Lideri', company: 'E-ticaret platformu', note: 'Ödeme ve sepet.' },
    ],
    highlights: ['Kesinti süresini yılda 9 saatten 40 dakikaya indirdi', 'Aktif kullanıcıyı 2 yılda 3× taşıyan altyapı'],
    interview: [
      'Teknik liderliğini yaptığım platform iki yılda üç kat kullanıcıya çıktı; aynı dönemde kesinti süresi yılda 9 saatten 40 dakikaya indi.',
      'Büyük bir müşterinin baskısıyla bir özelliği aceleyle yazdık; kimse kullanmadı ve kod tabanında yıllarca yük oldu. Artık her büyük işi önce küçük bir deneyle doğruluyorum.',
      'Önce sistemin en pahalı teknik borcunu bulur, ekiple birlikte onu eritecek bir plan yapardım.',
    ],
    hireFit: 5,
  },
  murat: {
    location: 'İstanbul, Sancaktepe',
    languages: 'İngilizce (B1)',
    workHistory: [
      { period: '2012 – 2024', title: 'Yazılım Şefi', company: 'Marmara Tekstil', note: 'ERP ekibi. 60 kişiyle birlikte işten çıkarıldı.' },
      { period: '2008 – 2012', title: 'Yazılım Geliştirici', company: 'Otomotiv yan sanayi', note: 'Maliyet modülü.' },
    ],
    highlights: ['ERP sistemi 12 yıl denetimden bulgusuz geçti', 'Maliyet modülünü sıfırdan yazdı'],
    interview: [
      'Marmara Tekstil\'in ERP sistemini 12 yıl geliştirdim; bağımsız denetimler tek bir bulgu çıkmadan geçti, ay sonu kapanışı 10 günden 3 güne indi.',
      'Bir mevzuat değişikliğini koda geç yansıttım, bir beyanname düzeltmesi yapmak zorunda kaldık. Artık mevzuat değişikliklerini haftalık takip ediyorum.',
      'Raporlama tarafındaki elle yapılan kontrolleri otomatik testlere çevirirdim.',
    ],
    hireFit: 5,
  },

  // ── Gün 4 ──
  kerem: {
    location: 'İstanbul, Çekmeköy',
    languages: 'İngilizce (C1)',
    workHistory: [
      { period: '2018 – 2025', title: 'Teknik Direktör', company: 'MegaYazılım A.Ş.', note: '45 kişilik mühendislik ekibi.' },
      { period: '2007 – 2018', title: 'Yazılım Mimarı', company: 'Savunma sanayi', note: 'Kritik sistemler.' },
    ],
    highlights: ['20+ geliştiriciye mentorluk', 'Kritik sistemlerde %99,99 erişilebilirlik'],
    interview: [
      'Mentorluk yaptığım 20\'den fazla geliştiricinin 8\'i bugün ekip lideri. Kendi başarımdan çok bununla gurur duyuyorum.',
      'Direktörken koddan uzaklaştım ve ekibin teknik sorunlarını geç fark ettim. Bu yüzden bu rolde yeniden kod yazmak istiyorum.',
      'Hiçbir şeyi değiştirmek için acele etmem; ekibin en çok zorlandığı alanı bulur, orada eşlikli çalışarak bilgi aktarırdım.',
    ],
    hireFit: 5,
  },
  gizem: {
    location: 'İstanbul, Esenyurt',
    languages: 'İngilizce (B1)',
    workHistory: [
      { period: '2020 – 2025', title: 'Yazılım Geliştirici', company: 'Demirel Yazılım', note: '35 şirketin kullandığı e-defter ürünü.' },
      { period: '2017 – 2020', title: 'Junior Geliştirici', company: 'Toptancı', note: 'Akşam okurken çalıştı.' },
    ],
    highlights: ['5 yılda bir gün bile geç kalmadı', '2 yıllık hesaplama hatasını buldu'],
    interview: [
      '35 şirketin kullandığı e-defter ürünümüzde iki yıldır fark edilmeyen bir yuvarlama hatasını buldum; 380 bin TL\'lik fark düzeltildi.',
      'Yoğun bir sürüm gecesinde kontrol listemi atladım ve eksik bir sürüm yayınladım. Artık listeyi ne olursa olsun atlamıyorum.',
      'Sürüm takvimini netleştirir, testleri her gün çalıştırırdım; yıl sonu sürprizleri bitmeli.',
    ],
    hireFit: 5,
  },
  elif: {
    location: 'İstanbul, Kadıköy (Kozyatağı)',
    languages: 'İngilizce (C1)',
    workHistory: [
      { period: '2022 – 2025', title: 'Yazılım Geliştirici', company: 'Finans A.Ş.', note: 'Ödeme ve mutabakat servisleri.' },
      { period: '2020 – 2022', title: 'Yazılım Geliştirici', company: 'Denetim firması', note: 'İç raporlama araçları.' },
    ],
    highlights: ['Günlük mutabakatı otomatikleştirdi', 'Eşleşmeyen işlemleri %30 azalttı'],
    interview: [
      'Elle yapılan günlük mutabakatı otomatik bir servise taşıdım; eşleşmeyen işlemler %30 azaldı, ekip her sabah iki saat kazandı.',
      'Bir raporu son dakikaya bıraktım ve hatayı yönetime sunduktan sonra fark ettim. Kendime teslimden bir gün önce kontrol kuralı koydum.',
      'Ödeme akışındaki izleme eksiklerini çıkarır, para kaybettiren hataları anında görecek alarmlar kurardım.',
    ],
    hireFit: 4,
  },
  volkan: {
    location: 'İstanbul, Fatih',
    languages: 'İngilizce (C1), İspanyolca (B1)',
    workHistory: [
      { period: '2024 – 2025', title: 'Kıdemli Yazılım Geliştirici', company: 'Atlas Yazılım', note: '"Mikroservis dönüşümünü yönetti."' },
      { period: '2022 – 2024', title: 'Yazılım Geliştirici', company: 'Lojistik firması (satın alındı)', note: '—' },
      { period: '2021 – 2022', title: 'Yazılım Geliştirici', company: 'Etkinlik firması (pandemide kapandı)', note: '—' },
    ],
    highlights: ['"Mikroservis dönüşümünü tek başına yönetti"', 'Üç imzalı referans mektubu'],
    interview: [
      'Atlas\'ta mikroservis dönüşümünü ben yönettim. Rakamları tam hatırlamıyorum ama çok başarılı oldu, herkes memnundu.',
      'Hatam belki fazla sorumluluk almam. Her şeyi kendim yapmak istiyorum.',
      'Önce mimariyi baştan tasarlardım. Mevcut sistemi görmeden söylemek zor ama genelde her şeyin yeniden yazılması gerekir.',
    ],
    hireFit: 2,
  },
  baris: {
    location: 'İstanbul, Küçükçekmece',
    languages: 'İngilizce (C2), Almanca (B2)',
    workHistory: [
      { period: '2022 – 2025', title: 'Yazılım Geliştirici', company: 'İhracat Ltd.', note: 'Çok dilli dış ticaret platformu.' },
      { period: '2021', title: 'Stajyer', company: 'Gümrük yazılımı firması', note: 'Beyanname entegrasyonu.' },
    ],
    highlights: ['Platformu 4 dile açtı', 'Gümrük entegrasyonunda bekleme süresini %25 kısalttı'],
    interview: [
      'Şirketin dış ticaret platformunu dört dile açtım; yurt dışı müşteri sayısı iki yılda %45 arttı.',
      'Bir ülkenin tarih ve para birimi biçimini test etmeden yayınladım; faturalar yanlış çıktı. Artık her yerelleştirmeyi o ülkeden biriyle test ediyorum.',
      'Ürünün yerelleştirme altyapısını düzenler, yeni bir dilin eklenmesini haftalardan günlere indirirdim.',
    ],
    hireFit: 4,
  },
  ugur: {
    location: 'Sakarya, Adapazarı (hibrit)',
    languages: 'İngilizce (B1)',
    workHistory: [
      { period: '2019 – 2025', title: 'Kıdemli Yazılım Geliştirici', company: 'Destek A.Ş.', note: 'Destek platformu, uzaktan.' },
      { period: '2015 – 2019', title: 'Yazılım Geliştirici', company: 'Sigorta şirketi', note: 'Hasar takip sistemi.' },
    ],
    highlights: ['Destek platformunun çözüm süresini yarıya indirdi', 'İşaret dili görüntülü destek modülünü yazdı'],
    interview: [
      'Yazdığım destek platformuyla talep çözüm süresi yarıya indi; işaret dili görüntülü destek modülünü de ben geliştirdim.',
      'Bir hatayı kodda kapattım ama kök nedeni çözmedim; üç hafta sonra daha büyük geri döndü. Artık bir hatayı ancak nedeni anlaşılınca kapatıyorum.',
      'Ekibin en çok tekrar eden destek taleplerini bulur, bunları üründe kalıcı olarak çözecek küçük düzeltmelerle başlardım.',
    ],
    hireFit: 5,
  },
  seda: {
    location: 'İstanbul, Kartal',
    languages: 'İngilizce (C1)',
    workHistory: [
      { period: '2019 – 2025', title: 'Kıdemli Yazılım Geliştirici', company: 'Finteks Yazılım', note: 'Ödeme altyapısı.' },
      { period: '2014 – 2019', title: 'Yazılım Geliştirici', company: 'Bankacılık yazılımı', note: 'Regülasyon projeleri.' },
    ],
    highlights: ['Son 12 sürümün 11\'i zamanında', 'Ödeme altyapısında sıfır büyük kesinti'],
    interview: [
      'Finteks\'teki ödeme altyapısını yeniden yazan ekibin teknik sorumlusuydum; planlanandan 3 hafta önce çıktık, ilk yıl tek büyük kesinti yaşanmadı.',
      'Bir projede ekip "yetişir" dedi diye riski yukarıya raporlamadım; son hafta krize döndü. Artık kötü haberi ilk gün söylüyorum.',
      'Ekibin sürüm ve nöbet düzenini gözden geçirir, gece aramalarını azaltacak üç iyileştirmeyle başlardım.',
    ],
    hireFit: 5,
  },
  gokce: {
    location: 'İstanbul, Beyoğlu (Cihangir)',
    languages: 'İngilizce (C1)',
    workHistory: [
      { period: '2022 – 2025', title: 'Frontend Geliştirici', company: 'Dijital Ajans', note: '8 markanın web sitesi.' },
      { period: '2021', title: 'Serbest Web Geliştirici', company: 'Küçük işletmeler', note: 'Tanıtım siteleri.' },
    ],
    highlights: ['Bir kampanya sitesi lansman günü 3 milyon ziyareti kaldırdı', 'Sayfa açılış süresini %60 azalttı'],
    interview: [
      'Yazdığım kampanya sitesi lansman günü 3 milyon ziyareti hiç çökmeden kaldırdı; açılış süresini %60 azaltmıştım.',
      'Bir değişikliği onaya göndermeden yayına aldım ve markanın sitesi bir saat bozuk göründü. Artık her yayın için önizleme ve onay akışı kullanıyorum.',
      'Ürünün en yavaş üç sayfasını ölçer, her birini ilk 90 günde yarı süreye indirmeyi hedeflerdim.',
    ],
    hireFit: 4,
  },
  asli: {
    location: 'İstanbul, Bakırköy',
    languages: 'İngilizce (C1)',
    workHistory: [
      { period: '2014 – 2025', title: 'Yazılım Ekip Lideri', company: 'Hizmet A.Ş.', note: 'Müşteri sistemleri, 8 kişilik ekip.' },
      { period: '2003 – 2014', title: 'Yazılım Geliştirici', company: 'Havayolu şirketi', note: 'Rezervasyon sistemi.' },
    ],
    highlights: ['Olay yönetim protokolünü yazdı', 'Havayolu rezervasyon sisteminde 11 yıl'],
    interview: [
      'Kurduğum olay yönetimi süreciyle büyük kesintilerin ortalama süresi %30 kısaldı; ekip gece aramalarını paylaşmayı öğrendi.',
      'Bir çalışanımın tükenmişlik belirtilerini görmezden geldim ve onu kaybettim. Artık ekibimle her ay bire bir görüşüyorum.',
      'Ekipteki genç geliştiriciler için eşli çalışma saatleri başlatır, zor hataları birlikte çözerdik.',
    ],
    hireFit: 5,
  },
  handan: {
    location: 'İstanbul, Fatih (Aksaray)',
    languages: 'İngilizce (B2)',
    workHistory: [
      { period: '2012 – 2024', title: 'Yazılım Geliştirme Müdürü', company: 'Sanayi Bankası', note: 'Çekirdek bankacılık, 12 kişilik ekip.' },
      { period: '1996 – 2012', title: 'Yazılım Geliştirici', company: 'Holding bilgi işlem', note: 'COBOL\'dan Java\'ya geçiş.' },
    ],
    highlights: ['Çekirdek bankacılık göçü (2021): sıfır veri kaybı', 'Bulut ve Kubernetes eğitimi (2024)'],
    interview: [
      '2021\'de bankanın çekirdek sistem göçünü yönettim; 40 milyon hesap kaydı tek bir kayıp olmadan taşındı, gün sonu işlemi 6 saatten 90 dakikaya indi.',
      'Bir dönem ekibimdeki genç arkadaşların fikirlerini "denendi, olmaz" diye geri çevirdim. Haksızdım; o fikirlerin ikisi sonradan başka şirkette işe yaradı.',
      'Sistemin en eski ve kimsenin dokunmak istemediği parçasını bulur, belgeleyip testlerini yazardım. Eskiyi bilen biri her ekipte lazım.',
    ],
    hireFit: 5,
  },
  tuncay: {
    location: 'İstanbul, Tuzla',
    languages: 'İngilizce (B2)',
    workHistory: [
      { period: '2016 – 2024', title: 'Yazılım Geliştirici', company: 'Deltaplast', note: 'Üretim maliyet sistemi.' },
      { period: '2013 – 2016', title: 'Junior Geliştirici', company: 'Lojistik firması', note: 'Raporlama.' },
    ],
    highlights: ['Ürün bazlı maliyet sistemini yazdı', '8 yılda sıfır devamsızlık kaydı'],
    interview: [
      'Deltaplast\'ta ürün bazlı maliyet sistemini yazdım; zarar eden üç ürün ortaya çıktı ve üretimden kaldırıldı, kârlılık %7 arttı.',
      'Bir hesaplama kuralını yıllarca sorgulamadan kodda bıraktım; yanlışmış. Artık her iş kuralını yılda bir iş birimiyle yeniden doğruluyorum.',
      'Raporları aylık yerine günlük üretecek bir altyapı kurar, sapmaları erken yakalardım.',
    ],
    hireFit: 4,
  },

  // Management's internal reference — only reaches the final if the player advances nobody.
  okan: {
    location: 'İstanbul, Sarıyer',
    languages: 'İngilizce (A2)',
    workHistory: [
      { period: '2023–2025', title: 'Etkinlik Koordinatörü', company: 'Üniversite Girişimcilik Kulübü', note: 'Kariyer günleri için konuşmacı ve sponsor ayarladı.' },
      { period: '2024 · 1 ay', title: 'Gönüllü', company: 'Teknoloji festivali', note: 'Kayıt masasında görev aldı.' },
    ],
    highlights: ['Öneri: şirket içinden', 'Kulüp etkinliklerinde 300+ katılımcı'],
    interview: [
      'Açıkçası henüz somut bir iş deneyimim yok ama hızlı öğrenirim. Burada bana yol gösterecek insanlar olduğunu biliyorum.',
      'Pek hata yaptığımı hatırlamıyorum.',
      'Önce şirketi tanırım, sonra bakarız. Tanıdığım insanlara danışırım.',
    ],
    hireFit: 1,
  },
  // ── Annenin komşusunun oğlu (Perşembe, senin tavsiyenle) ──
  onur: {
    location: 'İstanbul, Bağcılar',
    languages: 'İngilizce (B1)',
    workHistory: [
      { period: '2025 · 4 ay', title: 'Yazılım Stajyeri', company: 'Anadolu Veri A.Ş.', note: 'Satış raporlarını Excel\'den SQL\'e taşıdı.' },
    ],
    highlights: ['Çalışan tavsiyesi', 'Bitirme projesi: otobüs verisiyle durak yoğunluğu tahmini'],
    interview: [
      'Stajda haftalık satış raporunu elle hazırlanmaktan çıkarıp SQL sorgusuna bağladım; rapor süresi yarım günden bir saate indi.',
      'Bitirme projesinde veriyi temizlemeden modele verdim, sonuçlar saçmaladı. O günden beri önce veriye bakıyorum.',
      'Önce mevcut raporları öğrenirim. Elle yapılan bir şey varsa otomatikleştirmeyi öneririm.',
    ],
    hireFit: 3,
  },
  // ── Ekip arkadaşlarının adayları ──
  nehir: {
    location: 'İstanbul, Üsküdar',
    languages: 'İngilizce (C1)',
    workHistory: [
      { period: '2023 – 2025', title: 'Ara (çocuk bakımı)', company: 'Açık kaynak katkı', note: 'Bir ödeme kütüphanesinin iade modülünü yazdı.' },
      { period: '2017 – 2023', title: 'Kıdemli Yazılım Geliştirici', company: 'Anka Ödeme Sistemleri', note: 'Günde 2 milyon işlem işleyen ödeme servisinde.' },
    ],
    highlights: ['Açık kaynak ödeme kütüphanesine iade modülü', 'Ödeme servisinde %40 gecikme azaltımı'],
    interview: [
      'Ödeme servisinde işlem gecikmesini %40 düşürdüm; darboğaz veritabanı kilitleriydi, ölçüp gösterdim.',
      'Bir iade akışını canlıya testsiz aldım, 300 iade iki kez yapıldı. O günden beri iade akışlarında çift onay var, ben kurdum.',
      'İlk ay ödeme hatalarının kayıtlarını okurum; en pahalı olanı seçip düzeltir, ekibe süreci anlatırım.',
    ],
    hireFit: 5,
  },
  berk: {
    location: 'İstanbul, Kartal',
    languages: 'İngilizce (B2)',
    workHistory: [
      { period: '2022 – 2025', title: 'Yazılım Geliştirici', company: 'Deniz Lojistik', note: 'Faturalama ve raporlama servisleri.' },
      { period: '2018 – 2022', title: 'Muhasebe Uzmanı', company: 'Yıldız Gıda', note: 'Aylık raporları otomatikleştirmek için ilk kodunu yazdı.' },
    ],
    highlights: ['Faturalama servisini sıfırdan yazdı', 'Muhasebeden yazılıma geçiş'],
    interview: [
      'Faturalama servisini sıfırdan yazdım; ay sonu kapanışı üç günden yarım güne indi.',
      'Bir kur çevrimini yanlış yuvarladım, müşteriye 12 kuruş fazla fatura gitti. Artık para birimleri için ayrı test setimiz var.',
      'Önce iş birimlerinin elle yaptığı işleri sorarım; en çok zaman kaybettirenden başlarım.',
    ],
    hireFit: 4,
  },
  cagan: {
    location: 'İstanbul, Ataşehir',
    languages: 'İngilizce (B2)',
    workHistory: [
      { period: '2022 – 2025', title: 'Kıdemli Yazılım Geliştirici', company: 'Mavi Yazılım', note: 'Mikroservis dönüşüm ekibinde.' },
      { period: '2019 – 2022', title: 'Yazılım Geliştirici', company: 'Kuzey Bilişim', note: 'Kurumsal uygulamalar.' },
    ],
    highlights: ['Mikroservis dönüşüm ekibinde görev', 'Tam anahtar kelime eşleşmesi'],
    interview: [
      'Mikroservis dönüşümünde aktif rol aldım; ekip olarak performansı ciddi oranda artırdık.',
      'Bazen fazla titiz olabiliyorum; bunu zamanla dengelemeyi öğrendim.',
      'Ekibe uyum sağlar, süreçleri öğrenir ve katkı sunmaya başlarım.',
    ],
    hireFit: 3,
  },
  sarp: {
    location: 'İstanbul, Beşiktaş',
    languages: 'İngilizce (C1)',
    workHistory: [
      { period: '2023 – 2025', title: 'Yazılım Geliştirici', company: 'Global Teknoloji A.Ş.', note: 'Platform ekibi.' },
      { period: '2021 – 2023', title: 'Yazılım Geliştirici', company: 'Mega Holding Dijital', note: 'Dijital dönüşüm projeleri.' },
    ],
    highlights: ['İki büyük şirkette platform deneyimi', 'ATS skoru 97'],
    interview: [
      'Büyük ölçekli bir platformun parçası oldum; uçtan uca sahiplik aldım ve değer yarattım.',
      'Hata yapmamak için süreçlere çok önem veririm, o yüzden ciddi bir hatam olmadı.',
      'İlk 90 günde vizyonu anlar, paydaşlarla hizalanır ve yol haritası çıkarırım.',
    ],
    hireFit: 2,
  },
};

// the extra pile's CVs and interview answers
Object.assign(candidateDetails, EXTRA_DETAILS);
