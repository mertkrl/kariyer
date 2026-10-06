import type { ArtKind } from './artKinds';

/*
 * Gün gün Kariyergram içeriği. Her iş gününün kendi havası, kendi dedikodusu ve kendi şehir
 * haberleri var: Pazartesi'nin gün batımı, Salı'nın rüzgârı ve köprü trafiği, Çarşamba'nın yağmuru ve
 * servis kilitlenmesi, Perşembe'nin karı. Birkaç müdavim (anket, yapay zekâ sponsoru) her gün yeni
 * bir açıdan geri gelir.
 */

export interface Author {
  name: string;
  initials: string;
  color: string;
}

export interface PostSeed {
  author: Author;
  handle: string;
  text: string;
  photo?: ArtKind;
  likes: number;
  time: string;
  tags: string[];
  place?: string;
  sponsored?: boolean;
  comments?: { author: string; text: string }[];
  poll?: { question: string; options: { label: string; votes: number }[] };
}

export interface StorySeed {
  who: string;
  color: string;
  photo: ArtKind;
  text: string;
}

export interface DayContent {
  stories: StorySeed[];
  feed: PostSeed[];
  more: PostSeed[];
  notes: { who: string; color: string; text: string; photo?: ArtKind }[];
}

export const AYSE: Author = { name: 'Ayşe Demir', initials: 'AD', color: '#b3766b' };
export const EMRE: Author = { name: 'Emre Yıldız', initials: 'EY', color: '#4c7fb0' };
export const SELIN: Author = { name: 'Selin Aksoy', initials: 'SA', color: '#7c6a8c' };
const KG: Author = { name: 'Kariyer Günlüğü', initials: 'KG', color: '#3f6b63' };
const TRAFIK: Author = { name: 'İstanbul Trafik', initials: 'İT', color: '#e0574a' };
const PLAZA: Author = { name: 'Plaza Hayatı', initials: 'PH', color: '#7c6a8c' };
const HAVA: Author = { name: 'İstanbul Hava', initials: 'HV', color: '#4c7fb0' };
const HIREBOT: Author = { name: 'HireBot 3000', initials: 'HB', color: '#1a1a2e' };
const LEZZET: Author = { name: 'Ataşehir Lezzetleri', initials: 'AL', color: '#c07b4a' };
const BEYAZ: Author = { name: 'Beyaz Yaka Dertleri', initials: 'BY', color: '#5c6b7a' };
const VAPUR: Author = { name: 'Vapur Saatleri', initials: 'VS', color: '#2f6f9f' };

const poll = (question: string, ...opts: [string, number][]) => ({ question, options: opts.map(([label, votes]) => ({ label, votes })) });

export const SOCIAL_DAYS: DayContent[] = [
  // Pazartesi: açık hava, Boğaz'da gün batımı
  {
    stories: [
      { who: 'Ayşe', color: AYSE.color, photo: 'metrobus', text: 'Pazartesi 07:45 · köprü yine kilit, metrobüs tıklım tıklım 😩' },
      { who: 'Emre', color: EMRE.color, photo: 'coffee', text: 'Kahve makinesi: bozuk. Hafta harika başladı ☕💀' },
      { who: 'Annem', color: '#e8b4a8', photo: 'tea', text: 'Çay demlendi, akşam gel 🍃' },
      { who: 'Selin', color: SELIN.color, photo: 'bosphorus', text: 'Hava bugün çok güzel, mesai bitsin de sahile inelim ☀️' },
    ],
    feed: [
      { author: AYSE, handle: 'aysedemir', place: 'Ortaköy', photo: 'bosphorus', text: 'Pazartesiyi Boğaz manzarasıyla kapatmak 🌅 #istanbul #mesaibitti', likes: 184, time: '1 sa', tags: ['istanbul', 'mesaibitti'], comments: [{ author: 'emre.yildiz', text: 'Bu manzaraya bu mesai değer 😍' }] },
      { author: KG, handle: 'kariyergunlugu', text: 'Anket: Yapay zekâ ile ön eleme adil mi? 🤖', likes: 324, time: '2 sa', tags: ['İKhayatı'], poll: poll('Yapay zekâ ile ön eleme adil mi?', ['Evet, hızlı ve tarafsız', 212], ['Hayır, insan bakmalı', 468], ['Karma sistem olmalı', 351]) },
      { author: EMRE, handle: 'emre.yildiz', place: 'Tavrinsa Labs', photo: 'coffee', text: 'Haftanın ilk günü, kahve makinesinin ilk arızası. Gelenek bozulmadı ☕🪦 #plazahayatı', likes: 91, time: '3 sa', tags: ['plazahayatı'], comments: [{ author: 'aysedemir', text: 'Dilekçe yazalım bence 📝' }] },
      { author: HIREBOT, handle: 'hirebot', sponsored: true, photo: 'desk', text: "10.000 CV'yi 3 saniyede eleyin. İnsan hatasına son! 🚀 (İnsan dokunuşuna da.)", likes: 12, time: 'Sponsorlu', tags: ['İKhayatı'] },
      { author: SELIN, handle: 'selinaksoy', place: 'Balat', photo: 'cat', text: "Balat'ın müdürü bu, izin almadan geçilmiyor 🐈 #istanbul", likes: 402, time: '5 sa', tags: ['istanbul'] },
      { author: BEYAZ, handle: 'beyazyakadertleri', text: 'Pazartesi 09:00 toplantısının gündemi: "Bu hafta neleri konuşacağız?" konulu toplantı. 🙃 #plazahayatı', likes: 2310, time: '6 sa', tags: ['plazahayatı'] },
      { author: LEZZET, handle: 'atasehirlezzetleri', place: 'Ataşehir', photo: 'lunch', text: 'Bugün tabldotta: mercimek, kuru fasulye-pilav, cacık. Çıkışta ayran bedava 🥣 #plazahayatı', likes: 146, time: '7 sa', tags: ['plazahayatı'] },
      { author: TRAFIK, handle: 'istanbultrafik', photo: 'traffic', text: 'Pazartesi akşamı 15 Temmuz Köprüsü Avrupa yönünde yoğunluk %82. Sahil yolu alternatif. 🚗 #istanbul', likes: 58, time: '8 sa', tags: ['istanbul'] },
    ],
    more: [
      { author: PLAZA, handle: 'plazahayati', photo: 'desk', text: 'Maili "Merhaba, umarım iyisinizdir" diye başlatıp tehdit gibi bitirmek: kurumsal dil 101 📧 #plazahayatı', likes: 1203, time: 'şimdi', tags: ['plazahayatı'] },
      { author: HAVA, handle: 'istanbulhava', photo: 'bosphorus', text: 'Hafta açık ve güneşli başladı. Çarşamba yağmur, perşembe kar geliyor ⛅ #istanbul', likes: 88, time: 'şimdi', tags: ['istanbul'] },
      { author: EMRE, handle: 'emre.yildiz', place: 'Karaköy iskelesi', photo: 'ferry', text: 'Cuma planı: vapur, simit, martı. Katılan? 🐟 #mesaibitti', likes: 23, time: 'şimdi', tags: ['mesaibitti', 'istanbul'] },
    ],
    notes: [
      { who: 'aysedemir', color: AYSE.color, text: 'seni takip etmeye başladı.' },
      { who: 'emre.yildiz', color: EMRE.color, text: 'bir gönderinden bahsetti: "Kahve makinesi…"', photo: 'coffee' },
    ],
  },
  // Salı: rüzgârlı ve gri, metrobüs günü
  {
    stories: [
      { who: 'Emre', color: EMRE.color, photo: 'metrobus', text: 'Metrobüste ayakta 45 dk = bedava fitness 🏋️' },
      { who: 'Selin', color: SELIN.color, photo: 'desk', text: 'Bugün 11 toplantım var. Yaşarsam görüşürüz 🫠' },
      { who: 'Ayşe', color: AYSE.color, photo: 'lunch', text: 'Tabldotta bugün karnıyarık 🍆 günüm güzelleşti' },
      { who: 'Annem', color: '#e8b4a8', photo: 'cat', text: 'Komşunun kedisi yine bizim balkonda 🐈' },
    ],
    feed: [
      { author: HAVA, handle: 'istanbulhava', photo: 'ferry', text: 'Poyraz esiyor! Bazı vapur seferlerinde aksama olabilir. Şemsiye değil, rüzgârlık günü 🌬️ #istanbul', likes: 204, time: '40 dk', tags: ['istanbul'] },
      { author: EMRE, handle: 'emre.yildiz', place: 'Söğütlüçeşme', photo: 'metrobus', text: 'Metrobüste biri kulaklıksız dizi izledi. Hepimiz izledik. Final çok iyiydi 📱 #istanbul', likes: 512, time: '1 sa', tags: ['istanbul'], comments: [{ author: 'selinaksoy', text: 'Hangi diziydi 😂' }] },
      { author: KG, handle: 'kariyergunlugu', text: 'Anket: Bir ilana kaç kez başvurup ses çıkmadı? 📭', likes: 890, time: '2 sa', tags: ['işarıyorum'], poll: poll('Kaç başvurudan geri dönüş alamadınız?', ['10\'dan az', 120], ['10–50 arası', 402], ['50\'den fazla', 611]) },
      { author: HIREBOT, handle: 'hirebot', sponsored: true, photo: 'desk', text: 'ATS skoru %60 altındaki adaylar mı? Onları siz hiç görmeyin, biz görmeyelim, kimse görmesin 🤖✨', likes: 7, time: 'Sponsorlu', tags: ['İKhayatı'] },
      { author: SELIN, handle: 'selinaksoy', place: 'Tavrinsa Labs', photo: 'desk', text: "Toplantıdan toplantıya koşarken bir toplantı daha ayarlandı: 'Toplantılar hakkında toplantı' 🙃 #plazahayatı", likes: 330, time: '3 sa', tags: ['plazahayatı'] },
      { author: BEYAZ, handle: 'beyazyakadertleri', text: 'Maaş zammı: %0. Kahve fiyatı: %40. Motivasyon: 🫥 #plazahayatı', likes: 4100, time: '4 sa', tags: ['plazahayatı'] },
      { author: AYSE, handle: 'aysedemir', place: 'Ataşehir', photo: 'lunch', text: 'Karnıyarık günü moralimi düzeltti. Tabldot > terapi 🍆 #plazahayatı', likes: 97, time: '5 sa', tags: ['plazahayatı'] },
      { author: TRAFIK, handle: 'istanbultrafik', photo: 'metrobus', text: 'Söğütlüçeşme–Zincirlikuyu hattında köprü geçişinde yoğunluk sürüyor. Ek seferler yolda. 🚌 #istanbul', likes: 58, time: '6 sa', tags: ['istanbul'] },
    ],
    more: [
      { author: PLAZA, handle: 'plazahayati', photo: 'coffee', text: '"Bir dakikan var mı?" diye başlayan konuşmaların ortalama süresi: 47 dakika ⏱️ #plazahayatı', likes: 980, time: 'şimdi', tags: ['plazahayatı'] },
      { author: VAPUR, handle: 'vapursaatleri', photo: 'ferry', text: 'Rüzgâr nedeniyle Kadıköy–Karaköy seferleri 10 dk rötarlı. Martılar zamanında 🕊️ #istanbul', likes: 144, time: 'şimdi', tags: ['istanbul'] },
      { author: SELIN, handle: 'selinaksoy', place: 'Kadıköy', photo: 'cat', text: 'Kadıköy çarşısında bir kedi beni seçti. Artık onun İK uzmanıyım 🐈 #istanbul', likes: 612, time: 'şimdi', tags: ['istanbul'] },
    ],
    notes: [
      { who: 'selinaksoy', color: SELIN.color, text: 'gönderini beğendi.' },
      { who: 'kariyergunlugu', color: KG.color, text: 'bir ankette senin görüşünü soruyor.' },
    ],
  },
  // Çarşamba: yağmur ve her plazanın 17:30'da kalkan servisi
  {
    stories: [
      { who: 'Ayşe', color: AYSE.color, photo: 'rain', text: 'Şemsiyemi evde unuttum. Klasik ☔' },
      { who: 'Emre', color: EMRE.color, photo: 'servis', text: 'Servis kuyruğu köprü bağlantısını kilitledi 🚐🚐🚐' },
      { who: 'Selin', color: SELIN.color, photo: 'tea', text: 'Yağmurlu gün + çay = hayatta kalma kiti ☕' },
      { who: 'Annem', color: '#e8b4a8', photo: 'rain', text: 'Yağmurda ıslanma, montunu giy! 🧥' },
    ],
    feed: [
      { author: TRAFIK, handle: 'istanbultrafik', photo: 'servis', text: '17:30 itibarıyla Ataşehir–Kozyatağı aksında personel servisleri nedeniyle trafik kilit. D-100 Cd. yoğunluk %94 🚐 #istanbul', likes: 612, time: '20 dk', tags: ['istanbul'], comments: [{ author: 'emre.yildiz', text: 'Servisteyim, 20 dakikadır aynı yerdeyiz 😭' }] },
      { author: HAVA, handle: 'istanbulhava', photo: 'rain', text: 'Sağanak uyarısı! Akşam saatlerinde yağış kuvvetleniyor, alt geçitlerde su birikintisine dikkat ☔ #istanbul', likes: 340, time: '1 sa', tags: ['istanbul'] },
      { author: EMRE, handle: 'emre.yildiz', place: 'Servis durağı', photo: 'servis', text: 'Servisim 17:30\'da kalkacaktı. 17:55. Yağmur. Durak. Ben. 🚐🌧️ #mesaibitti', likes: 211, time: '1 sa', tags: ['mesaibitti'] },
      { author: KG, handle: 'kariyergunlugu', text: 'Anket: İşe nasıl gidiyorsunuz? 🚇', likes: 540, time: '2 sa', tags: ['İKhayatı'], poll: poll('İşe nasıl gidiyorsunuz?', ['Servis', 390], ['Metro/metrobüs', 610], ['Araba', 280], ['Vapur', 95]) },
      { author: HIREBOT, handle: 'hirebot', sponsored: true, photo: 'desk', text: '"Maaş beklentisi yüksek" adayları otomatik eleyin. Bütçeniz rahat, vicdanınız… o bizim işimiz değil 🤖', likes: 4, time: 'Sponsorlu', tags: ['İKhayatı'] },
      { author: AYSE, handle: 'aysedemir', place: 'Ataşehir', photo: 'rain', text: 'Plazanın önünde 400 kişi aynı anda şemsiye açtı. Hepimiz birbirimizi dürttük ☔😂 #plazahayatı', likes: 176, time: '3 sa', tags: ['plazahayatı'] },
      { author: BEYAZ, handle: 'beyazyakadertleri', text: 'Servis şoförü müziği açtığında ya o gün güzel geçer ya da 1 saat trafikte arabesk dinlersin 🎶🚐', likes: 3300, time: '4 sa', tags: ['plazahayatı'] },
      { author: SELIN, handle: 'selinaksoy', place: 'Tavrinsa Labs', photo: 'tea', text: 'Yağmur camlara vururken çay molası. Bu anı kimse toplantıya çeviremez ☕🌧️', likes: 144, time: '5 sa', tags: ['mesaibitti'] },
    ],
    more: [
      { author: PLAZA, handle: 'plazahayati', photo: 'servis', text: 'Servis kaçırmanın 5 evresi: inkâr, koşu, öfke, taksi fiyatı, kabulleniş 🚐 #plazahayatı', likes: 2200, time: 'şimdi', tags: ['plazahayatı'] },
      { author: TRAFIK, handle: 'istanbultrafik', photo: 'traffic', text: 'Yağış nedeniyle E-5\'te ortalama hız 11 km/s. Metro seferleri normal 🚇 #istanbul', likes: 402, time: 'şimdi', tags: ['istanbul'] },
      { author: LEZZET, handle: 'atasehirlezzetleri', place: 'Ataşehir', photo: 'lunch', text: 'Yağmurlu günün vazgeçilmezi: sıcak mercimek çorbası, bol limon 🍋 #plazahayatı', likes: 230, time: 'şimdi', tags: ['plazahayatı'] },
    ],
    notes: [
      { who: 'emre.yildiz', color: EMRE.color, text: 'seni bir gönderide etiketledi: "servis kuyruğu"', photo: 'servis' },
      { who: 'aysedemir', color: AYSE.color, text: 'hikâyene tepki verdi: ☔' },
    ],
  },
  // Perşembe: şehrin üstünde kar, vapurlar hâlâ çalışıyor
  {
    stories: [
      { who: 'Selin', color: SELIN.color, photo: 'snow', text: 'KAR YAĞIYOR ❄️ İstanbul yine durdu' },
      { who: 'Emre', color: EMRE.color, photo: 'ferry', text: 'Karaköy\'den son vapur. Yetiştim mi? Yetiştim 🏃‍♂️⛴' },
      { who: 'Ayşe', color: AYSE.color, photo: 'tea', text: 'Kar + çay + simit = İstanbul kışı ☕' },
      { who: 'Annem', color: '#e8b4a8', photo: 'snow', text: 'Kaygan yollar, dikkat et yavrum ❄️' },
    ],
    feed: [
      { author: HAVA, handle: 'istanbulhava', photo: 'snow', text: 'Kar yağışı etkili! Yüksek kesimlerde 10 cm\'yi bulabilir. Toplu taşıma önerilir ❄️ #istanbul', likes: 1204, time: '30 dk', tags: ['istanbul'] },
      { author: SELIN, handle: 'selinaksoy', place: 'Galata', photo: 'snow', text: 'Galata karlar altında. Bu şehir bazen çok güzel, bazen çok yorucu ❄️ #istanbul', likes: 890, time: '1 sa', tags: ['istanbul'], comments: [{ author: 'aysedemir', text: 'Çok güzel kare 😍' }] },
      { author: VAPUR, handle: 'vapursaatleri', photo: 'ferry', text: 'Kara rağmen Karaköy–Kadıköy seferleri devam ediyor. Son vapur 21:00 ⛴ #istanbul', likes: 402, time: '2 sa', tags: ['istanbul'] },
      { author: KG, handle: 'kariyergunlugu', text: 'Anket: Kar yağınca ofise gelmeli miyiz? ❄️', likes: 1330, time: '2 sa', tags: ['İKhayatı'], poll: poll('Kar yağınca ne olmalı?', ['Uzaktan çalışma', 980], ['Ofise gelinmeli', 110], ['Tatil ilan edilmeli 😄', 760]) },
      { author: HIREBOT, handle: 'hirebot', sponsored: true, photo: 'desk', text: 'Yapay zekâmız bugün biraz yorgun. Ama merak etmeyin, ön elemeye hiç ara vermiyoruz 🤖❄️', likes: 3, time: 'Sponsorlu', tags: ['İKhayatı'] },
      { author: EMRE, handle: 'emre.yildiz', place: 'Karaköy', photo: 'ferry', text: 'Vapurda simit + martı + kar. Mesai bitti, hayat başladı ⛴❄️ #mesaibitti', likes: 301, time: '3 sa', tags: ['mesaibitti'] },
      { author: BEYAZ, handle: 'beyazyakadertleri', text: 'Kar yüzünden 2 saat yolda kaldım, "bugün evden çalışsaydın ya" dedi müdür. Keşke dün söyleseydin 🙃', likes: 5100, time: '4 sa', tags: ['plazahayatı'] },
      { author: AYSE, handle: 'aysedemir', place: 'Tavrinsa Labs', photo: 'coffee', text: 'Kahve makinesi tamir edildi!!! Kar yağdı, mucizeler olur ☕✨ #plazahayatı', likes: 402, time: '5 sa', tags: ['plazahayatı'] },
    ],
    more: [
      { author: TRAFIK, handle: 'istanbultrafik', photo: 'traffic', text: 'Kar nedeniyle köprü bağlantı yollarında zincirleme yavaşlama. Sabırlı olun 🚗❄️ #istanbul', likes: 512, time: 'şimdi', tags: ['istanbul'] },
      { author: PLAZA, handle: 'plazahayati', photo: 'snow', text: 'Kar yağınca plazada herkes camın önünde. 5 dakikalık çocukluk 🥹 #plazahayatı', likes: 1880, time: 'şimdi', tags: ['plazahayatı'] },
      { author: SELIN, handle: 'selinaksoy', place: 'Kadıköy', photo: 'cat', text: 'Kedi kardan kaçıp kafeye sığındı, ben de. İkimiz de sıcak süt 🐈🥛', likes: 740, time: 'şimdi', tags: ['istanbul'] },
    ],
    notes: [
      { who: 'selinaksoy', color: SELIN.color, text: 'bir kar fotoğrafı paylaştı.', photo: 'snow' },
      { who: 'vapursaatleri', color: VAPUR.color, text: 'Son vapur 21:00! Hatırlatma ⛴' },
    ],
  },
];

export const REJECTION_POSTS = [
  'Bugün bir ret e-postası daha. Otomatik, isimsiz, açıklamasız. Yine de umudumu kaybetmiyorum. 💪 #işarıyorum',
  "CV'mi 40. kez güncelledim. Belki bu sefer bir insan okur 🙃 #işarıyorum",
  '"Başvurunuz değerlendirildi." Kim değerlendirdi, ne kadar sürede? Bilmek isterdim. #işarıyorum',
  'Mülakata bile çağrılmadan elendim. Deneyim şartı: 5 yıl. Pozisyon: junior. 🤷 #işarıyorum',
  'Kahvemi aldım, ilanları açtım, yeniden başlıyoruz ☕ #işarıyorum',
  'Bugünkü ret mailinde adım bile yanlış yazılmıştı. En azından okumuşlar mı acaba? 🤔 #işarıyorum',
];
