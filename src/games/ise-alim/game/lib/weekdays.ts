/*
 * Haftanın günleri, adlarıyla. Hikâye anları bir haftanın gününe aittir ("Çarşamba yağmur yağar",
 * "Perşembe ekip geç kalır"); kod çıplak gün sıraları yerine bunlarla karşılaştırır, böylece bir
 * anı taşımak burada tek bir düzenlemedir ve adı aramak o gün olan her şeyi gösterir.
 */
export const MONDAY = 0;
export const TUESDAY = 1;
export const WEDNESDAY = 2;
export const THURSDAY = 3;
export const FRIDAY = 4;

/** Ofiste Emre'nin doğum günü pastası; tabağı sonraki günlerde hâlâ masanda durur. */
export const BIRTHDAY_DAY = TUESDAY;
/** Yağmur: sebilin yanında ıslak şemsiye, ofis penceresinde yağmur. */
export const RAINY_DAY = WEDNESDAY;
/** Komşunun oğlunun CV'si, ileteceğini söylediysen, kuyruğa düşer. */
export const NEIGHBOUR_DAY = THURSDAY;
/** Daha önce mülakata çağırdığın biri teşekkür etmek için arar. */
export const THANKS_DAY = THURSDAY;
