/* İlk günün tanıtımının adımları: Şükrü Amca'nın anlattıkları ve beklediği işler (Tour.tsx çizer). */

export type TourWait = 'book' | 'sign' | 'sale';

export interface TourStep {
  /** data-tour değeri (virgülle birden çok: spot hepsini kapsar); yoksa kart ekranın ortasında durur. */
  target?: string;
  title: string;
  body: string;
  /** Oyuncunun yapması beklenen: o adımda "İleri" yerine bu iş adımı geçirir. */
  wait?: TourWait;
  /** Bekleme adımında kartın altındaki küçük ipucu. */
  hint?: string;
}

export const TOUR: TourStep[] = [
  {
    title: 'Hoş geldin evladım',
    body: 'Ben bir aylığına memlekete gidiyorum, dükkân sana emanet. Burada etiket yok: fiyatı sen söylersin. Gitmeden sana birkaç şey göstereyim.',
  },
  {
    target: 'shelves',
    title: 'Raflar',
    body: 'Her malın rafta sabit bir yeri var. Etiketin yanındaki sayı raftaki adettir; azalan turuncuya döner, biten "TÜKENDİ" olur. Akşam siparişi rafa bakarak verirsin.',
  },
  {
    target: 'ledger',
    title: 'Defterim',
    body: 'Veresiyeler, eski hesaplar ve en önemlisi geçen yılki etiket fiyatlarım bu defterde. Hadi aç bakalım.',
    wait: 'book',
    hint: 'Tezgâhtaki yeşil ciltli deftere tıkla.',
  },
  {
    target: 'book',
    title: 'Geçen yılın fiyatları',
    body: 'Fiyat söylerken pusulan bu sayfa; fiyatlar o günden beri biraz arttı, aklında olsun. Ekmeğin, yağın fiyatını köylü bilir, temel gıdada fazlasına razı olmaz. Cipste, kolonyada biraz kâr koyabilirsin.',
  },
  {
    target: 'register',
    title: 'Yazar kasa',
    body: 'Müşteri bir şey isteyince fiyatı buraya yazıp ONAY\'a basarsın; klavyenin rakamları da çalışır. Çekmeceye tıklarsan her akşamın Z raporu çıkar: iade getiren olursa oradan bakarsın.',
  },
  {
    target: 'calc',
    title: 'Hesap makinesi',
    body: 'Üç kalem birden isteyen olur, kafadan toplama. Tıkla, açılsın.',
  },
  {
    target: 'stats',
    title: 'Dükkânın durumu',
    body: 'Kasa, itibar ve veresiye burada. Pahalı satarsan itibar düşer; 60\'ın altına inerse köylü başka yere gider. Elektrik her akşam, kira her hafta kasadan çıkar: bütün parayı mala yatırma, kira günü kasa eksiye düşerse dükkân batar.',
  },
  {
    target: 'sign',
    title: 'Dükkânı aç',
    body: 'Kapıdaki levhada içeriden AÇIK yazıyor: demek ki dışarıdan dükkân kapalı görünüyor. Levhayı çevir ki dışarıda AÇIK yazsın.',
    wait: 'sign',
    hint: 'Kapıdaki levhaya tıkla.',
  },
  {
    target: 'bubble,register',
    title: 'İlk müşterin',
    body: 'Ne istediğini söyledi. Defterdeki fiyata bak, kasaya bir fiyat yaz, ONAY\'a bas. Yüzüne bak: sevinir mi, söylenir mi, çekip gider mi?',
    wait: 'sale',
    hint: 'Fiyatı kasaya yaz, ONAY\'a bas.',
  },
];
