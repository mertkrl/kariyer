/*
 * Mahallenin pencerelerinden düşülen laflar: günün saatine, haftanın gününe ve fazla mesaiye göre
 * değişir. Her biri kısa: balon maketin üstünde birkaç saniye kalır.
 */

export interface Quip {
  who: string;
  text: string;
}

const q = (who: string, text: string): Quip => ({ who, text });

const ALWAYS: Quip[] = [
  q('Üçüncü kattan', 'Çocuklar, top bahçeye düştü yine!'),
  q('Bakkal Şükrü', 'Ekmek bitti. Yarın erken gel.'),
  q('Balkondan', 'Çamaşırları kim aldı?!'),
  q('Yönetici', 'Aidatlar yine gecikti, haberiniz olsun.'),
  q('Kapıcı', 'Asansör bozuk. Merdiven sağlıklı.'),
  q('Karşı komşu', 'Bu çukur ne zaman kapanacak?'),
  q('Dövizci', 'Kur sabit. 2002’den beri.'),
  q('İkinci kattan', 'Wi-Fi şifresini kim değiştirdi?'),
  q('Simitçi', 'Simit var, çay yok. Çay ocağına sor.'),
  q('Muhtar', 'Su kesintisi yarın 9’dan 5’e. Belki.'),
  q('Şantiyeden', 'Teslim tarihi? Seneye. Kesin.'),
  q('Teyze', 'Evladım, bir bardak çay iç de öyle git.'),
];

const BY_TIME: { when: (d: Date) => boolean; quips: Quip[] }[] = [
  {
    when: (d) => d.getHours() >= 6 && d.getHours() < 10,
    quips: [q('Pencereden', 'Servis kaçtı mı?!'), q('Teyze', 'Çay demlendi, gelen alsın.'), q('Fırından', 'Pide sıcak, sıra uzun.')],
  },
  {
    when: (d) => d.getHours() >= 12 && d.getHours() < 14,
    quips: [q('Plazadan', 'Öğle arası 45 dakika; yemek 15, gerisi muhabbet.'), q('Esnaf lokantası', 'Kuru fasulye bitti, pilav kaldı.')],
  },
  {
    when: (d) => d.getHours() >= 17 && d.getHours() < 20,
    quips: [q('Mutfaktan', 'Akşama ne pişirelim?'), q('Radyo', 'Büyükdere kilit. Sahil de kilit. Her yer kilit.')],
  },
  {
    when: (d) => d.getHours() >= 22 || d.getHours() < 5,
    quips: [q('Alt kattan', 'Sessiz olun, millet uyuyor!'), q('Karşı pencere', 'Saat kaç olmuş, hâlâ ekranda mısın?'), q('Bekçi', 'Hayırlı geceler, kapıyı kilitleyin.')],
  },
  {
    when: (d) => d.getDay() === 1 && d.getHours() < 13,
    quips: [q('Kapıcı', 'Pazartesi sendromu bana da bulaştı.'), q('Plazadan', 'Haftaya “bir toplantı” ile başlıyoruz.')],
  },
  {
    when: (d) => d.getDay() === 5 && d.getHours() >= 15,
    quips: [q('Plazadan', 'Cuma akşamı! Kimse işten bahsetmesin.'), q('Bakkal Şükrü', 'Hafta bitti, çekirdek indirimde.')],
  },
  {
    when: (d) => d.getDay() === 0 || d.getDay() === 6,
    quips: [q('Balkondan', 'Hafta sonu kahvaltısı, simit bizden.'), q('Teyze', 'Pazar günü matkap çalıştıran kim?!')],
  },
  {
    when: (d) => d.getDate() === 1 || d.getDate() === 15,
    quips: [q('Plazadan', 'Maaş yattı! …ve gitti.')],
  },
];

const OVERTIME: Quip[] = [
  q('Plazadan', 'Işık yanıyor. Biri hâlâ çalışıyor.'),
  q('Patron', 'Çıkmadan bir şey daha soracağım…'),
  q('Muhasebe', 'Fazla mesai ücreti mi? O ne?'),
  q('Temizlikçi abla', 'Evladım, ben de çıkıyorum. Işığı kapat.'),
];

/** Şu ana uyan lafların hepsi; saate ve fazla mesaiye uyanlar listede iki kez durur, daha sık çıkar. */
export function quipsFor(d: Date, overtime: boolean): Quip[] {
  const fit = BY_TIME.filter((b) => b.when(d)).flatMap((b) => b.quips);
  return [...ALWAYS, ...fit, ...fit, ...(overtime ? [...OVERTIME, ...OVERTIME] : [])];
}
