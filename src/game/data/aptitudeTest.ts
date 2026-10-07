/*
 * Şirketin "Genel Yetenek ve Uyum Değerlendirmesi": teste geçen her aday bunu çözer. Sorular
 * ciddi bir test gibi görünür ama sistemle dalga geçer: cevap anahtarı mantığı değil kurum
 * kültürünü ödüllendirir. Her sorunun bir de "aklı başında" cevabı vardır; işini bilen aday
 * çoğu zaman onu seçer ve puan kaybeder. Puanın neyi ölçtüğü bu farkta saklıdır.
 */

export type AptitudeKind = 'sayısal' | 'şekil' | 'sözel' | 'dikkat' | 'kişilik';

export interface AptitudeQuestion {
  id: string;
  kind: AptitudeKind;
  prompt: string;
  /** Sorunun altında tek satır, eşit aralıklı (dizi, şekil, harf satırı). */
  figure?: string;
  options: string[];
  /** Cevap anahtarının "doğru" saydığı. */
  answer: number;
  /** Aklı başında birinin vereceği cevap; anahtar onu yanlış sayar. */
  sensible: number;
}

/** Soru başına süre (saniye). Kılavuz "ortalama aday için yeterlidir" der. */
export const APTITUDE_SECONDS = 30;

/** Kendin çözerken cevapladığın her sorunun mesaiden yediği (dakika). */
export const APTITUDE_MINUTES_PER_QUESTION = 2;

const LIKERT = ['Kesinlikle katılıyorum', 'Katılıyorum', 'Kararsızım', 'Katılmıyorum'];

export const APTITUDE_QUESTIONS: AptitudeQuestion[] = [
  { id: 'cv-speed', kind: 'sayısal', prompt: 'Bir yapay zekâ 340 CV\'yi 0,4 saniyede okuyor. Bir CV\'yi kaç saniyede okur?', options: ['0,0012', '0,4', '12', 'Okumaz, sıralar'], answer: 0, sensible: 3 },
  { id: 'team-shape', kind: 'şekil', prompt: 'Aşağıdaki şekillerden hangisi bir takım oyuncusudur?', figure: '■   ●   ▲   ◆', options: ['■', '●  (köşesi yok, herkese uyar)', '▲', 'Şekillerin kişiliği olmaz'], answer: 1, sensible: 3 },
  { id: 'family', kind: 'sözel', prompt: 'Bütün çalışanlar ailedir. Aile, fazla mesai ücreti istemez. Buna göre hangisi kesinlikle doğrudur?', options: ['Çalışanlar fazla mesai ücreti istemez.', 'Bazı çalışanlar ücret ister.', 'Aile ile iş sözleşmesi farklı şeylerdir.', 'Hiçbiri kesin olarak çıkarılamaz.'], answer: 0, sensible: 2 },
  { id: 'yes-count', kind: 'dikkat', prompt: 'Aşağıdaki satırda kaç kez "evet" geçmektedir? (Kurum içi yazışma standardına göre "efendim" de evet sayılır.)', figure: 'evet  evet  hayır  evet  efendim  evet  bakarız', options: ['4', '5', '6', 'Hayır da aslında evettir'], answer: 1, sensible: 0 },
  { id: 'target', kind: 'sayısal', prompt: 'Dizide soru işaretinin yerine hangi sayı gelmelidir?', figure: '2   4   8   16   ?', options: ['32', '24', '30', '40 (hedef revize edildi)'], answer: 3, sensible: 0 },
  { id: 'synergy', kind: 'sözel', prompt: '"Sinerji" kelimesinin anlamı aşağıdakilerden hangisidir?', options: ['Birlikte çalışmanın etkisi', 'Bir enerji içeceği', 'Toplantıda söylenince herkesin başını sallaması', 'Tanımı yapılamaz, hissedilir'], answer: 2, sensible: 0 },
  { id: 'rules', kind: 'kişilik', prompt: 'Size en uygun olanı işaretleyiniz: "Kurallara, neden konduklarını sormadan uyarım."', options: LIKERT, answer: 0, sensible: 3 },
  { id: 'train', kind: 'sayısal', prompt: 'Bir tren saatte 84 km hızla 2 saat 15 dakika yol alıyor. Trendeki yolculardan kaçı kariyer hedeflerine ulaşmıştır?', options: ['0', '84', 'Hepsi, çünkü yoldalar', 'Soruda yeterli bilgi yok'], answer: 2, sensible: 3 },
  { id: 'odd-day', kind: 'sözel', prompt: 'Hangisi diğerlerinden farklıdır?', options: ['Pazartesi', 'Çarşamba', 'Cumartesi', 'Hiçbiri, hepsi iş günüdür'], answer: 3, sensible: 2 },
  { id: 'five-years', kind: 'kişilik', prompt: 'Kendinizi 5 yıl sonra nerede görüyorsunuz?', options: ['Bu şirkette, bu masada', 'Bir üst pozisyonda', 'Kendi işimde', 'Henüz bilmiyorum'], answer: 0, sensible: 3 },
  { id: 'critique', kind: 'kişilik', prompt: 'Size en uygun olanı işaretleyiniz: "Eleştiriyi her zaman gülümseyerek karşılarım."', options: LIKERT, answer: 0, sensible: 2 },
  { id: 'salary', kind: 'dikkat', prompt: 'Maaş beklentiniz aşağıdakilerden hangisine en yakındır?', options: ['Deneyimime uygun bir rakam', 'Piyasa ortalaması', 'Ne uygun görürseniz', 'Para önemli değil, tutku önemli'], answer: 3, sensible: 0 },
];
