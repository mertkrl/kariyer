/*
 * Köylülerin huyları: her biri kendi sözüyle konuşur, kesesi tipine göre biraz geniş ya da dar;
 * kimi pazarlıksız almaz, kimi bayatı fark edip şikâyet eder. Saf veridir.
 */

/**
 * Her köylünün kendi huyu: kesesinin genişliği tipinin tavanını biraz oynatır (`ceil`), kapıdan ilk
 * girişte kendi sözüyle selam verir (`hello`), sonraki gelişlerinde kendi lafını eder (`habit`).
 */
export interface Character {
  trait: string;
  ceil: number;
  hello: string;
  habit: string;
  /** Pazarlıksız almaz: ilk söylenen fiyat ne olursa olsun bir kez pazarlık eder. */
  haggle?: boolean;
  /** Titiz ya da şikâyetçi: eline bayat mal geçerse mutlaka belediyeye şikâyet eder. */
  fussy?: boolean;
}

export const CHARACTERS: Record<string, Character> = {
  ayse: { trait: 'cömert', ceil: 0.06, hello: 'Hoş geldin evladım, Şükrü Amca seni çok överdi.', habit: 'Torunlara bir şey alayım dedim.' },
  fatma: { trait: 'unutkan', ceil: 0, hello: 'Aaa, yeni bakkal! Ne alacaktım ben… dur hatırlayayım.', habit: 'Listeyi evde unuttum yine, aklımda kalanı söyleyeyim.' },
  hatice: { trait: 'titiz', ceil: -0.03, hello: 'Raflar tozlu olmasın evladım, Şükrü Amca her sabah silerdi.', habit: 'Son kullanma tarihine bakarım ben, haberin olsun.' , fussy: true },
  zehra: { trait: 'dedikoducu', ceil: 0.02, hello: 'Duydun mu, muhtarın oğlu şehirden kız almış!', habit: 'Kimseye söyleme ama… neyse, sonra anlatırım.' , fussy: true },
  emine: { trait: 'tutumlu', ceil: -0.05, hello: 'Kuruşu kuruşuna hesap ederim, ona göre.', habit: 'Pazardan daha ucuza bulamazsam senden alırım.' , haggle: true },
  nazmiye: { trait: 'dualı', ceil: 0.03, hello: 'Allah işini rast getirsin yavrum.', habit: 'Dizlerim ağrıyor ama sana uğramadan olmaz.' },
  hasan: { trait: 'otoriter', ceil: 0.05, hello: 'Muhtar olarak hayırlı olsun diyeyim, köyü üzme.', habit: 'Köyün bütün işi bende, çabuk olalım.' , fussy: true },
  imam: { trait: 'sabırlı', ceil: 0.04, hello: 'Selamünaleyküm, hayırlı bereketli olsun.', habit: 'Acelem yok evladım, sırayla.' },
  riza: { trait: 'pinti', ceil: -0.07, hello: 'Şükrü Amca bana hep indirim yapardı, bilesin.', habit: 'Her şey ateş pahası, bizim mahsul yerinde sayıyor.' , haggle: true },
  mehmet: { trait: 'dürüst', ceil: 0.02, hello: 'Kolay gelsin, ben sözümün eriyim.', habit: 'Tarladan geliyorum, bir çay içsem iyi olurdu.' },
  osman: { trait: 'huysuz', ceil: -0.04, hello: 'Bakalım sen de Şükrü Amca gibi insaflı mısın.', habit: 'Of, bu dizler… çabuk ver de gideyim.' , fussy: true },
  ismail: { trait: 'şakacı', ceil: 0.03, hello: 'Şükrü Amca memlekete gitti, sen de bakkala geldin, hah!', habit: 'Bugün de yüzün gülüyor, bereket gelir.' },
  kadir: { trait: 'aceleci', ceil: 0.01, hello: 'Traktör çalışıyor, çabuk!', habit: 'Motoru kapatmadım, hızlı olalım.' },
  ali: { trait: 'yaramaz', ceil: -0.02, hello: 'Abi, kediyi sevebilir miyim?', habit: 'Kedin uyuyor mu yine?' },
  elif: { trait: 'utangaç', ceil: 0, hello: '…Merhaba. Annem gönderdi.', habit: '…Ben yine geldim.' },
  emre: { trait: 'meraklı', ceil: 0, hello: 'Abi bu kasa kaç yaşında? Hep böyle mi çınlıyor?', habit: 'Abi bugün kaç müşteri geldi?' },
  zeynep: { trait: 'hesapçı', ceil: -0.03, hello: 'Annem parayı saydırdı, ben de matematikte iyiyim.', habit: 'Bu sefer kafadan hesaplayacağım, dikkat et.' , fussy: true },
  kerem: { trait: 'beş parasız', ceil: -0.04, hello: 'Abi öğrenciyim, bir bakarsın bana.', habit: 'Burs daha yatmadı abi.' , haggle: true },
  busra: { trait: 'kibar', ceil: 0.03, hello: 'İyi günler, dükkânı çok güzel toparlamışsınız.', habit: 'Merhabalar, nasılsınız?' },
  murat: { trait: 'kabadayı', ceil: 0.02, hello: 'N\'aber bakkal, motor dışarıda, uzatmayalım.', habit: 'Yine ben, tanıdın mı?' },
  selma: { trait: 'nazik', ceil: 0.04, hello: 'Günaydın, okul servisi beklerken uğradım.', habit: 'Çocuklar sizi çok seviyor.' },
  burak: { trait: 'kuşkucu', ceil: -0.02, hello: 'Merhaba. Kasabadaki fiyatlara bakarak geldim.', habit: 'Fiyatlara internetten baktım, söyleyeyim.' , fussy: true },
  veli: { trait: 'az konuşan', ceil: 0, hello: 'Selam.', habit: 'Hı.' },
  durmus: { trait: 'pazarlıkçı', ceil: -0.06, hello: 'Söyle bakalım, ama ilk fiyatı söyleme, ikincisini söyle.', habit: 'Pazarlıksız alışveriş olmaz, bilirsin.' , haggle: true },
  sevgi: { trait: 'telaşlı', ceil: 0.02, hello: 'Kaynanam bekliyor, yemek ocakta!', habit: 'Ay, yine geç kaldım!' },
  merve: { trait: 'savurgan', ceil: 0.07, hello: 'Şehirde her şey iki katı, burası cennet!', habit: 'Canım çekti, aldım gidiyorum.' },
  huseyin: { trait: 'nostaljik', ceil: -0.02, hello: 'Biz gençken ekmek on kuruştu evlat.', habit: 'Eskiden bu dükkânda gaz lambası satılırdı.' },
  cemal: { trait: 'geveze', ceil: 0.03, hello: 'Kahveden geliyorum, maç kaç kaç bitti biliyor musun?', habit: 'Kahvede bugün senin fiyatları konuştuk.' , haggle: true },
  selin: { trait: 'fotoğrafçı', ceil: 0.05, hello: 'Ay ne şirin dükkân, fotoğraf çekebilir miyim?', habit: 'Yine geldim, bu köyü çok sevdim!' },
  can: { trait: 'zengin', ceil: 0.1, hello: 'Merhaba, kartla ödeyebiliyor muyum? Yok mu? Peki.', habit: 'Nakit buldum bu sefer.' },
  turist: { trait: 'kaybolmuş', ceil: 0.02, hello: 'Pardon, kasabaya bu yoldan mı gidiliyor?', habit: 'Yine yolu kaybettim galiba.' },
  jonas: { trait: 'yabancı', ceil: 0.08, hello: 'Merhaba! Türkçem az, pardon.', habit: 'Tekrar merhaba! Çok güzel köy.' },
  sinan: { trait: 'yolcu', ceil: 0.04, hello: 'Yol uzun, şöyle bir mola verdim. Burası neresi?', habit: 'Yine bu yoldan geçtim.' },
  ece: { trait: 'gezgin', ceil: 0, hello: 'Sırt çantamla köy köy geziyorum, ne güzel bir dükkân!', habit: 'Yine geldim!' },
  anna: { trait: 'yabancı', ceil: 0.08, hello: 'Hello! Ee… merhaba! Türkçe biraz.', habit: 'Merhaba again!' },
  tom: { trait: 'motorcu', ceil: 0.05, hello: 'Merhaba, en yakın benzinlik ne kadar uzakta?', habit: 'Motor yine yolda kaldı.' },
  rustem: { trait: 'hayırsever', ceil: 0.2, hello: 'Selamünaleyküm, Almanya\'dan geldim.', habit: 'Yine ben geldim.' },
  zabita: { trait: 'memur', ceil: 0, hello: 'Belediyeden geliyorum.', habit: 'Yine ben.' },
  vergi: { trait: 'titiz memur', ceil: 0, hello: 'Maliye\'den geliyorum.', habit: 'Defterler hazır mı?' },
};

export const characterOf = (id: string): Character => CHARACTERS[id] ?? { trait: '', ceil: 0, hello: '', habit: '' };

/** Pazarlıkçının karşı teklifi: söylenen fiyatın onda biri aşağısı, beşe yuvarlanır. */
export const haggleOffer = (price: number) => (price <= 10 ? Math.max(1, price - 1) : Math.min(price - 1, Math.floor((price * 0.9) / 5) * 5));

/** Eline bayat mal geçen şikâyet eder mi: titiz olan hep, öteki üçte bir ihtimalle. */
export const complains = (who: string, roll: number) => !!characterOf(who).fussy || roll < 0.35;

