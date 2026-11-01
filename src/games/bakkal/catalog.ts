/*
 * Dükkânın kataloğu: malların reyonları, temel gıda, soğuk dolaptakiler ve günlük mal. Saf veridir.
 */

/** Malın reyonu: Kemal'in listesi ve rafların sırası buna göre. */
export const CATEGORIES: { id: string; label: string; ids: string[] }[] = [
  { id: 'temel', label: '🍞 Temel gıda', ids: ['ekmek', 'sut', 'yumurta', 'un', 'seker', 'tuz', 'yag', 'makarna', 'pirinc', 'cay'] },
  { id: 'kuru', label: '🫘 Bakliyat, konserve', ids: ['mercimek', 'bulgur', 'nohut', 'fasulye', 'irmik', 'salca', 'ton', 'ketcap', 'mayonez', 'zeytinyagi', 'sirke', 'pulbiber', 'kahve'] },
  { id: 'kahvalti', label: '🧀 Kahvaltılık', ids: ['peynir', 'kasar', 'yogurt', 'tereyag', 'margarin', 'zeytin', 'recel', 'bal', 'pekmez', 'helva', 'tahin', 'sucuk', 'salam'] },
  { id: 'bufe', label: '🥪 Tost, sandviç', ids: ['kasarli', 'sucuklu', 'karisik', 'peynirli', 'salamli', 'tonlu', 'tavuklu'] },
  { id: 'icecek', label: '🥤 İçecek', ids: ['meyvesuyu', 'gazoz', 'kola', 'maden', 'ayran', 'su'] },
  { id: 'atistirmalik', label: '🍫 Atıştırmalık', ids: ['cikolata', 'biskuvi', 'cips', 'kraker', 'lokum'] },
  { id: 'temizlik', label: '🧼 Temizlik, bakım', ids: ['sabun', 'deterjan', 'camasir', 'yumusatici', 'tuvalet', 'sampuan', 'dismacunu', 'mendil'] },
  { id: 'diger', label: '🔋 Ufak tefek', ids: ['kibrit', 'cakmak', 'pil', 'ampul', 'kolonya'] },
];

export const categoryOf = (id: string) => CATEGORIES.find((c) => c.ids.includes(id))?.id ?? 'diger';

/**
 * Temel gıda: Şükrü Amca'nın dükkânında hep bulunan, köyün her gün aradığı mallar. Dükkân bunlarla
 * açılır; gerisini oyuncu isterse Kemal'e söyler. Müşteriler temel malı daha sık ister ve rafta
 * yoksa söylenir; özel malın yokluğunu dert etmez.
 */
export const BASIC = ['ekmek', 'sut', 'yumurta', 'un', 'seker', 'tuz', 'yag', 'makarna', 'pirinc', 'cay', 'salca', 'mercimek', 'bulgur', 'peynir', 'yogurt', 'sabun', 'deterjan', 'kibrit'];
export const isBasic = (id: string) => BASIC.includes(id);

/** Soğuk dolapta duranlar: içecekler ve şarküteri. */
export const FRIDGE = ['gazoz', 'maden', 'ayran', 'meyvesuyu', 'su', 'peynir', 'kasar', 'yogurt', 'tereyag', 'sucuk', 'kola', 'salam'];

/**
 * Tezgâhta istenince hazırlanan: klasik bakkal işi ekmek arası sandviç ve tost. Rafta, dolapta
 * durmaz, Kemal'den gelmez, bayatlamaz; satılınca malzemesinin parası kasadan düşer. Sandviç
 * dükkânın ekmeğinden yapılır: ekmek yoksa sandviç de yoktur.
 */
export const MADE = ['kasarli', 'sucuklu', 'karisik', 'peynirli', 'salamli', 'tonlu', 'tavuklu'];
export const SANDWICH = ['peynirli', 'salamli', 'tonlu', 'tavuklu'];

/** Günlük mal: her sabah fırından taze gelir, akşam bir kısmı bayatlar. */
export const DAILY = ['ekmek'];


/** Kapının yanındaki tel cips standının katları, yukarıdan aşağı. */
export const RACK = ['cips', 'kraker', 'biskuvi', 'cikolata', 'lokum'];

/** İtibar bunun altına inince köylü küsmeye başlar: gelenlerin bir kısmı yoldan geçen yabancıdır. */
export const TOURIST_REP = 45;
/** İtibar bunun altındaysa veresiyeciler borcunu ödemez. */
export const LOW_REP = 35;

/** Düşük itibarda gelenlerin yabancı payı: itibar düştükçe artar, en çok beşte dört. */
export const touristShare = (reputation: number) => (reputation >= TOURIST_REP ? 0 : Math.min(0.8, (TOURIST_REP - reputation) / 30));
