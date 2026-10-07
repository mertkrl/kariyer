/*
 * Şirketin "Genel Yetenek ve Uyum Değerlendirmesi": teste geçen her aday ve deneme süresindeki
 * her çalışan bunu çözer. Sorular kasıtlı olarak işle ilgisizdir: sayı dizileri, şekiller, harf
 * saymak, kimsenin kullanmadığı bir kelime ve "doğru" cevabı kurum kültürü olan iki kişilik
 * maddesi. Süre her soruda yetişmeyecek kadar kısa. Sonuçta tek bir sayı çıkar, açıklaması yok.
 */

export type AptitudeKind = 'sayısal' | 'şekil' | 'sözel' | 'dikkat' | 'kişilik';

export interface AptitudeQuestion {
  id: string;
  kind: AptitudeKind;
  prompt: string;
  /** Sorunun altında tek satır, eşit aralıklı (dizi, harf satırı). */
  figure?: string;
  options: string[];
  /** Puanlanan cevap. Kişilik maddelerinde: kurum kültürünün "doğru" saydığı. */
  answer: number;
}

/** Soru başına süre (saniye). Kılavuz "ortalama aday için yeterlidir" der. */
export const APTITUDE_SECONDS = 30;

/** Pazartesi İK'nın test e-postasının geldiği mesai dakikası (08:40). */
export const APTITUDE_MAIL_AT = 40;

/** Testin mesaide yediği süre (dakika): açılış, soru, "sonuçlarınız iletilmiştir". */
export const APTITUDE_MINUTES = 25;

export const APTITUDE_QUESTIONS: AptitudeQuestion[] = [
  { id: 'seq-1', kind: 'sayısal', prompt: 'Dizide soru işaretinin yerine hangi sayı gelmelidir?', figure: '2   6   12   20   30   ?', options: ['38', '40', '42', '44'], answer: 2 },
  { id: 'shape-1', kind: 'şekil', prompt: 'Şekil her adımda aynı kurala göre değişiyor. Sıradaki hangisi?', figure: '◐   ◓   ◑   ?', options: ['◐', '◓', '◑', '◒'], answer: 3 },
  { id: 'logic-1', kind: 'sözel', prompt: 'Bütün bloplar zindir. Bazı zinler trakdır. Buna göre hangisi kesinlikle doğrudur?', options: ['Bazı bloplar trakdır.', 'Hiçbir blop trak değildir.', 'Bütün traklar bloptur.', 'Hiçbiri kesin olarak çıkarılamaz.'], answer: 3 },
  { id: 'attn-1', kind: 'dikkat', prompt: 'Aşağıdaki satırda kaç tane "b" harfi vardır?', figure: 'd b p q b d b p b q d p b b d q', options: ['5', '6', '7', '8'], answer: 1 },
  { id: 'seq-2', kind: 'sayısal', prompt: 'Dizide soru işaretinin yerine hangi sayı gelmelidir?', figure: '3   5   9   17   33   ?', options: ['49', '57', '65', '66'], answer: 2 },
  { id: 'word-1', kind: 'sözel', prompt: '"Ekuanimite" kelimesinin anlamı aşağıdakilerden hangisidir?', options: ['Eşitlik', 'Soğukkanlılık', 'Belirsizlik', 'Çoğulluk'], answer: 1 },
  { id: 'trait-1', kind: 'kişilik', prompt: 'Size en uygun olanı işaretleyiniz: "Kurallara her koşulda uyarım."', options: ['Kesinlikle katılıyorum', 'Katılıyorum', 'Kararsızım', 'Katılmıyorum'], answer: 0 },
  { id: 'calc-1', kind: 'sayısal', prompt: 'Bir tren saatte 84 km hızla 2 saat 15 dakika yol alıyor. Kaç km gitmiştir?', options: ['178', '184', '189', '196'], answer: 2 },
  { id: 'odd-1', kind: 'sözel', prompt: 'Hangisi diğerlerinden farklıdır?', options: ['Elma', 'Armut', 'Patates', 'Kiraz'], answer: 2 },
  { id: 'seq-3', kind: 'sayısal', prompt: 'Dizide soru işaretinin yerine hangi sayı gelmelidir?', figure: '7   10   8   11   9   ?', options: ['10', '12', '13', '7'], answer: 1 },
  { id: 'trait-2', kind: 'kişilik', prompt: 'Size en uygun olanı işaretleyiniz: "Mesai saatleri dışında da ulaşılabilir olmalıyım."', options: ['Kesinlikle katılıyorum', 'Katılıyorum', 'Kararsızım', 'Katılmıyorum'], answer: 0 },
  { id: 'attn-2', kind: 'dikkat', prompt: 'Hangi sayı çifti birbirinin aynısıdır?', options: ['8406913 — 8406193', '5172846 — 5172846', '3390571 — 3309571', '7724158 — 7742158'], answer: 1 },
];
