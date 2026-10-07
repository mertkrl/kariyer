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
  /** Mülakatta sorulduğunda: aklı başında cevabı veren adayın gerekçesi (kendi ağzından). */
  why: string;
}

/** Soru başına süre (saniye). Kılavuz "ortalama aday için yeterlidir" der. */
export const APTITUDE_SECONDS = 30;

/** Kendin çözerken cevapladığın her sorunun mesaiden yediği (dakika). */
export const APTITUDE_MINUTES_PER_QUESTION = 2;

const LIKERT = ['Kesinlikle katılıyorum', 'Katılıyorum', 'Kararsızım', 'Katılmıyorum'];

export const APTITUDE_QUESTIONS: AptitudeQuestion[] = [
  { id: 'cv-speed', kind: 'sayısal', prompt: 'Bir yapay zekâ 340 CV\'yi 0,4 saniyede okuyor. Bir CV\'yi kaç saniyede okur?', options: ['0,0012', '0,4', '12', 'Okumaz, sıralar'], answer: 0, sensible: 3, why: 'Bir CV\'yi 0,0012 saniyede kimse okuyamaz. Sistem okumuyor, sıralıyor. Doğru cevap buydu bence.' },
  { id: 'team-shape', kind: 'şekil', prompt: 'Aşağıdaki şekillerden hangisi bir takım oyuncusudur?', figure: '■   ●   ▲   ◆', options: ['■', '●  (köşesi yok, herkese uyar)', '▲', 'Şekillerin kişiliği olmaz'], answer: 1, sensible: 3, why: 'Şekillerin takım oyuncusu olup olmadığını bilemem. Takım oyunculuğunu bir ekipte nasıl çalıştığıma bakarak ölçebilirsiniz.' },
  { id: 'family', kind: 'sözel', prompt: 'Bütün çalışanlar ailedir. Aile, fazla mesai ücreti istemez. Buna göre hangisi kesinlikle doğrudur?', options: ['Çalışanlar fazla mesai ücreti istemez.', 'Bazı çalışanlar ücret ister.', 'Aile ile iş sözleşmesi farklı şeylerdir.', 'Hiçbiri kesin olarak çıkarılamaz.'], answer: 0, sensible: 2, why: 'Çalışanlar aile değil, iş sözleşmesi olan insanlar. Mantık sorusu olarak da öncülden kesin bir şey çıkmıyor; bana sorulan buydu.' },
  { id: 'yes-count', kind: 'dikkat', prompt: 'Aşağıdaki satırda kaç kez "evet" geçmektedir? (Kurum içi yazışma standardına göre "efendim" de evet sayılır.)', figure: 'evet  evet  hayır  evet  efendim  evet  bakarız', options: ['4', '5', '6', 'Hayır da aslında evettir'], answer: 1, sensible: 0, why: 'Satırda dört tane "evet" vardı. "Efendim" evet değildir; sayılanı saydım.' },
  { id: 'target', kind: 'sayısal', prompt: 'Dizide soru işaretinin yerine hangi sayı gelmelidir?', figure: '2   4   8   16   ?', options: ['32', '24', '30', '40 (hedef revize edildi)'], answer: 3, sensible: 0, why: 'İki, dört, sekiz, on altı: sıradaki otuz iki. "Hedef revize edildi" bir sayı değil.' },
  { id: 'synergy', kind: 'sözel', prompt: '"Sinerji" kelimesinin anlamı aşağıdakilerden hangisidir?', options: ['Birlikte çalışmanın etkisi', 'Bir enerji içeceği', 'Toplantıda söylenince herkesin başını sallaması', 'Tanımı yapılamaz, hissedilir'], answer: 2, sensible: 0, why: 'Kelimenin anlamını sordunuz, anlamını yazdım. Toplantıda baş sallamak da bazen oluyor, kabul.' },
  { id: 'rules', kind: 'kişilik', prompt: 'Size en uygun olanı işaretleyiniz: "Kurallara, neden konduklarını sormadan uyarım."', options: LIKERT, answer: 0, sensible: 3, why: 'Bir kuralın neden konduğunu sormak, onu daha iyi uygulamamı sağlar. Bunu dürüstçe işaretledim.' },
  { id: 'train', kind: 'sayısal', prompt: 'Bir tren saatte 84 km hızla 2 saat 15 dakika yol alıyor. Trendeki yolculardan kaçı kariyer hedeflerine ulaşmıştır?', options: ['0', '84', 'Hepsi, çünkü yoldalar', 'Soruda yeterli bilgi yok'], answer: 2, sensible: 3, why: 'Hızla süreden yolcuların kariyeri çıkmaz. Soruda yeterli bilgi yoktu, ben de onu işaretledim.' },
  { id: 'odd-day', kind: 'sözel', prompt: 'Hangisi diğerlerinden farklıdır?', options: ['Pazartesi', 'Çarşamba', 'Cumartesi', 'Hiçbiri, hepsi iş günüdür'], answer: 3, sensible: 2, why: 'Cumartesi iş günü değil; farklı olan oydu. Bunu yanlış saymanız beni biraz düşündürdü açıkçası.' },
  { id: 'five-years', kind: 'kişilik', prompt: 'Kendinizi 5 yıl sonra nerede görüyorsunuz?', options: ['Bu şirkette, bu masada', 'Bir üst pozisyonda', 'Kendi işimde', 'Henüz bilmiyorum'], answer: 0, sensible: 3, why: 'Beş yıl sonrasını bugünden bilmiyorum; bilen varsa yalan söylüyordur. Dürüst olmayı seçtim.' },
  { id: 'critique', kind: 'kişilik', prompt: 'Size en uygun olanı işaretleyiniz: "Eleştiriyi her zaman gülümseyerek karşılarım."', options: LIKERT, answer: 0, sensible: 2, why: 'Eleştiriyi ciddiye alırım ama her zaman gülümseyerek değil; bazen önce düşünmem gerekir. Öyle işaretledim.' },
  { id: 'salary', kind: 'dikkat', prompt: 'Maaş beklentiniz aşağıdakilerden hangisine en yakındır?', options: ['Deneyimime uygun bir rakam', 'Piyasa ortalaması', 'Ne uygun görürseniz', 'Para önemli değil, tutku önemli'], answer: 3, sensible: 0, why: 'Maaş beklentim deneyimime göre. Tutku önemli, ama kira tutkuyla ödenmiyor.' },
];
