import type { Mood, Product } from './data';

/* Müşterilerin sözleri: pazarlıkta tepki, turistin karşılaştırması, veresiye isteği ve sepetin dökümü. */

/**
 * Tepki sözleri müşteri tipine göre: teyze "evladım" der, çocuk annesinin verdiği parayı sayar,
 * turist şehirle karşılaştırır. Muhtar tipinde köyün yaşlı büyükleri de var: sözler makama değil yaşa göredir.
 */
const LINES: Record<string, Record<Mood, string[]>> = {
  teyze: {
    happy: ['Ooo ucuzmuş, ver bakalım!', 'Allah bereket versin evladım.', 'Şükrü Amca bile bu kadar ucuz vermezdi.', 'Eline sağlık, al şu parayı.'],
    grumble: ['Pahalı ama neyse, ver…', 'Şükrü Amca daha ucuz verirdi bunu.', 'Hmm… peki, ver bakalım.', 'Emekli maaşıyla zor ama ver.'],
    counter: ['Olmaz o kadar evladım! {offer} lira olur mu?', 'Yok yok, {offer} veririm, o kadar.', 'Biraz in aşağı, {offer} lira olsun.'],
    leave: ['Kasabadan alırım ben, sağ ol!', 'Bu köyde vicdan kalmamış.', 'Şükrü Amca dönsün, ondan alırım.'],
  },
  muhtar: {
    happy: ['Hayırlı satışlar, bereketli olsun.', 'Güzel fiyat, kahvede söylerim.', 'Böyle esnaf az kaldı.', 'Hakkını helal et, al bakalım.'],
    grumble: ['Biraz tuzlu ama hayırlı olsun.', 'Pahalı… neyse, ver.', 'Şükrü Amca daha insaflıydı.', 'Bu fiyatı kahvede konuşurlar, haberin olsun.'],
    counter: ['Gel şunu {offer} yapalım, ikimiz de kazanalım.', '{offer} lira, son sözüm.', 'Olmaz öyle, {offer} veririm.'],
    leave: ['Bu fiyatla olmaz, kusura bakma.', 'Esnaflık böyle olmaz evladım.', 'Bir düşün bakalım. Hayırlı işler.'],
  },
  ciftci: {
    happy: ['Ooo ucuzmuş, ver bakalım!', 'Bereketli olsun, hemen alıyorum.', 'Kasabada bunun iki katı!', 'Hemen alıyorum, fikrini değiştirme.'],
    grumble: ['Pahalı ama neyse, ver…', 'Mazot zamlandı, bu da zamlandı…', 'Hmm… peki, ver bakalım.', 'Biz mahsulü yok pahasına veriyoruz, sen pahalı satıyorsun.'],
    counter: ['Olmaz o kadar! {offer} lira olur mu?', 'Yok yok, {offer} veririm, o kadar.', 'Aşağı in biraz, {offer} lira de alayım.'],
    leave: ['Traktörle kasabaya inerim, oradan alırım.', 'Bu fiyata almam, sağ ol.', 'Bir daha gelmem buraya!'],
  },
  cocuk: {
    happy: ['Yaşasın, param yetti!', 'Teşekkürler abi!', 'Üstü bende kalıyor, annem izin verdi!', 'Hemen alıyorum!'],
    grumble: ['Annemin verdiği para zor yetti…', 'Iıı… pahalıymış ama tamam.', 'Harçlığımın hepsi gitti.', 'Peki… ver.'],
    counter: ['Annem {offer} lira verdi, o kadar param var.', 'Cebimde {offer} lira var, olur mu?', '{offer} lira yapsan? Lütfen abi!'],
    leave: ['Bu kadar param yok, annem kızar.', 'Annem "pahalıysa alma" dedi. Hoşça kal!', 'Ben gidip anneme sorayım…'],
  },
  genc: {
    happy: ['Süper, şehirde bunun iki katı!', 'Eyvallah abi!', 'Bu fiyata iki tane alırdım ama param yok.', 'Tamamdır, hemen alıyorum.'],
    grumble: ['Biraz pahalı ama neyse.', 'Hmm… tamam, ver.', 'Harçlığın yarısı gitti.', 'İnternette daha ucuzdu ama olsun.'],
    counter: ['{offer} yapsan? Öğrenciyim abi.', 'Abi {offer} olmaz mı?', '{offer} lira vereyim, tamam mı?'],
    leave: ['Kasabaya motorla inerim, oradan alırım.', 'Bu fiyata olmaz abi, kusura bakma.', 'Pas geçiyorum, sağ ol.'],
  },
  ogretmen: {
    happy: ['Ne güzel, teşekkür ederim.', 'Uygun fiyat, velilere de söylerim.', "Şükrü Amca'dan bile ucuz!", 'Eline sağlık.'],
    grumble: ['Biraz yüksek ama alayım.', 'Hmm, peki.', 'Öğretmen maaşıyla zor ama olsun.', 'Geçen ay daha ucuzdu sanki.'],
    counter: ['{offer} lira olsa nasıl olur?', 'Hesapladım, {offer} lira makul.', 'Bunu {offer} liraya verebilir misiniz?'],
    leave: ['Kusura bakmayın, bu fiyata almayayım.', 'Kasabadan alırım, teşekkürler.', 'Biraz fazla oldu, başka zaman.'],
  },
  coban: {
    happy: ['Bereket versin.', 'İyi fiyat, al şunu.', 'Sürüye dönmeden iyi oldu.', 'Hah, buna eyvallah.'],
    grumble: ['Pahalı… ver gitsin.', 'Kuzu fiyatı düştü, seninki artmış.', 'Hmm… ver.', 'Yaylada bunu satan yok, mecburum.'],
    counter: ['{offer} lira, fazlası yok cebimde.', '{offer} der misin?', 'Gel {offer} olsun.'],
    leave: ['Bu fiyata almam, idare ederim.', 'Sağlıcakla kal.', 'Sürü bekler, başka sefere.'],
  },
  gelin: {
    happy: ['Kaynanam çok sevinecek!', 'Ay, ne uygun, teşekkürler.', 'Hemen alayım.', 'Sağ olun, bereketli olsun.'],
    grumble: ['Kaynanam "pahalı almışsın" diyecek…', 'Biraz pahalı ama neyse.', 'Hmm, peki.', 'Geçen sefer daha ucuzdu bu.'],
    counter: ['{offer} lira olsa? Kaynanam ancak o kadar verdi.', '{offer} olur mu?', 'Biraz insaf, {offer} diyelim.'],
    leave: ['Kaynanam kızar, almayayım.', 'Kasabaya inen olursa ona söylerim.', 'Kusura bakmayın, olmaz.'],
  },
  emekli: {
    happy: ['Aferin evlat, kahvede söyleyeceğim.', 'Eski fiyat bu, hayırlı olsun.', 'Ooo, emekliye uygun.', 'Allah bereket versin.'],
    grumble: ['Emekli maaşı bunu kaldırmaz ama ver.', 'Kahvede konuşacağız bu fiyatı.', 'Hmm… ver bakalım.', 'Bizim zamanımızda bunun parasıyla bir çuval alınırdı.'],
    counter: ['{offer} lira, emekliye bu kadar.', 'Gel {offer} yap, dua edeyim.', '{offer} veririm, o da çok.'],
    leave: ['Kahvede herkese anlatacağım bunu!', 'Bu fiyata almam, kusura bakma.', 'Şükrü Amca dönsün, ondan alırım.'],
  },
  turist: {
    happy: ['Harika, şehirde bunun iki katı!', 'Ne kadar uygun, teşekkürler!', 'Köy fiyatları bir başka.', 'Hemen alıyorum.'],
    grumble: ['Biraz pahalı ama tatildeyiz, olsun.', 'Hmm, peki.', 'Şehir fiyatı gibi ama neyse.', 'Olur, alalım.'],
    counter: ['Biraz indirim olmaz mı? {offer} lira diyelim.', '{offer} liraya olur mu?', 'Pazarlık yapılıyor sanırım: {offer}?'],
    leave: ['Yolda bir market vardı, oraya bakarız.', 'Bu fiyata olmaz, kusura bakmayın.', 'Turist fiyatı herhalde, sağ olun.'],
  },
};

/** Turistin memleketi: pahalı fiyatı oradakiyle karşılaştırır. */
const HOME: Record<string, string> = { selin: 'İstanbul', can: 'Ankara', turist: 'İzmir', jonas: 'Almanya', sinan: 'Bursa', ece: 'Eskişehir', anna: 'Hollanda', tom: 'İngiltere' };

/** Turistin alış fiyatının en çok iki katına kadar parası çıkar: tatildedir, kesesi geniştir. */
export const TOURIST_MARKUP = 2;

/**
 * Turistin fiyatı memleketiyle karşılaştırdığı sözler: market fiyatını epey aşan fiyatta söylenir
 * ama yine alır; tavanı aşınca pazarlık eder, akıl almaz fiyatta gider.
 */
const ABROAD: Record<'grumble' | 'counter' | 'leave', string[]> = {
  grumble: ["{home}'da bile bu kadar pahalı değil! Neyse, tatildeyiz, alıyorum.", "Bu fiyat {home} fiyatı, köy fiyatı değil… Peki.", "{home}'dan pahalı burası! Olsun, ver bakalım."],
  counter: ["{home}'da bunun yarısına alırım. {offer} lira olur mu?", "Bu {home}'dan da pahalı! {offer} diyelim.", "{offer} lira; {home}'da bile o kadar."],
  leave: ["Bu fiyata {home}'da üç tane alırım. Hayır, teşekkürler.", "{home}'dan pahalı! Yoldaki markete bakarım.", "Turist diye kazıklamak bu. İyi günler!"],
};

/** Turist pahalı fiyata memleketini anar; olağan fiyatta ve ucuzda tipinin sözünü söyler. */
export function touristLine(who: string, mood: Mood, i: number, offer?: number): string | null {
  const home = HOME[who];
  if (!home || mood === 'happy') return null;
  const list = ABROAD[mood];
  return list[i % list.length].replace(/\{home\}/g, home).replace('{offer}', String(offer ?? ''));
}

export function lineFor(mood: Mood, i: number, offer?: number, type = 'ciftci'): string {
  const list = (LINES[type] ?? LINES.ciftci)[mood];
  return list[i % list.length].replace('{offer}', String(offer ?? ''));
}

/** Veresiye isteği ve cevaba verilen karşılık: herkes kendi parasının geleceği yeri söyler. */
const CREDIT: Record<string, Record<'ask' | 'yes' | 'no', string>> = {
  teyze: { ask: 'Ama bir ricam var: deftere yazar mısın? Maaş yatınca getiririm.', yes: 'Allah razı olsun evladım, maaş yatınca getiririm!', no: 'Peki peki, al paranı… Şükrü Amca yazardı ama.' },
  muhtar: { ask: 'Yanımda nakit kalmadı, deftere yaz, akşama gönderirim.', yes: 'Sağ ol, akşama gönderirim.', no: 'Peki, al bakalım. Şükrü Amca bana güvenirdi ama.' },
  ciftci: { ask: 'Deftere yazar mısın? Mahsul parası gelince getiririm.', yes: 'Eksik olma, mahsulü satınca getiririm!', no: 'Peki, al… Şükrü Amca yazardı ama.' },
  cocuk: { ask: 'Annem "deftere yazdır" dedi, babam akşam getirecekmiş.', yes: 'Tamam, babama söylerim!', no: 'Ama annem öyle dedi… Peki, cebimdeki parayla ödeyeyim.' },
  genc: { ask: 'Harçlık hafta sonu yatıyor, deftere yazar mısın?', yes: 'Sağ ol abi, hafta sonu getiririm!', no: 'Tamam tamam, nakit vereyim o zaman.' },
  ogretmen: { ask: 'Maaş on beşinde yatıyor, deftere yazabilir misiniz?', yes: 'Çok teşekkür ederim, maaş yatınca ilk iş getiririm.', no: 'Haklısınız, peşin vereyim.' },
  coban: { ask: 'Kuzular satılınca öderim, deftere yaz.', yes: 'Eyvallah, kuzu parasıyla gelirim.', no: 'Peki… al bakalım.' },
  gelin: { ask: 'Eşim akşam getirir, deftere yazar mısınız?', yes: 'Sağ olun, akşam eşim uğrar.', no: 'Peki, kaynanamın verdiğinden vereyim.' },
  emekli: { ask: 'Maaş yatınca öderim, yaz deftere.', yes: 'Eksik olma evlat, maaş günü buradayım.', no: 'Şükrü Amca olsa yazardı… neyse, al.' },
};

export function creditLine(type: string, part: 'ask' | 'yes' | 'no'): string {
  return (CREDIT[type] ?? CREDIT.ciftci)[part];
}

/** Ürün listesini konuşma diliyle söyler: "bir ekmek, bir süt bir de çay". */
export function sayItems(items: Product[]): string {
  const names = items.map((p) => p.name.replace(/ \(.*\)$/, '').toLocaleLowerCase('tr-TR'));
  if (names.length === 1) return `bir ${names[0]}`;
  return `${names
    .slice(0, -1)
    .map((n) => `bir ${n}`)
    .join(', ')} bir de ${names[names.length - 1]}`;
}
