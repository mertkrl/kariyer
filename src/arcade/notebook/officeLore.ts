/*
 * Patron tablosunun ofis hikâyesi: her açılışta uzayan dosya adı, hücre köşelerindeki pasif-agresif
 * yorumlar, diğer oyunlardan sızan "ham veri" ve yarım kalmış CV.
 * Hepsi düz veridir; BossSheet bunları çizer.
 */

const KEY = 'kariyerweb-patron-acilis';

/** Tablonun kaçıncı kez açıldığı (tarayıcıda saklanır; saklanamazsa 0). */
export function openCount(): number {
  try {
    return Number(localStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
}

export function bumpOpenCount(): number {
  const n = openCount() + 1;
  try {
    localStorage.setItem(KEY, String(n));
  } catch {
    // saklanamazsa dosya adı bu oturumda uzamaz; önemli değil
  }
  return n;
}

const SUFFIXES = [
  'SON_son', 'bu_kesin', 'REVİZE', 'patron_onaylı_DEĞİL', 'Ahmet_Bey_baktı', 'GÜNCEL', 'düzeltildi', 'düzeltildi_2',
  'KULLANMA', 'bunu_kullan', 'toplantı_sonrası', 'Ayşe_Hn_yorumlu', 'FİNAL', 'FİNAL_FİNAL', 'gerçekten_son',
  'yemin_ederim_son', 'kopya', 'kopyası_(3)', '(1)_(1)', 'SON',
];

/** n. açılıştaki dosya adı: v14_SON_son → v15_SON_son_bu_kesin → … */
export function fileName(n: number): string {
  const k = Math.max(1, Math.min(n, SUFFIXES.length));
  return `Q3_rapor_v${13 + Math.max(1, n)}_${SUFFIXES.slice(0, k).join('_')}.xlsx`;
}

/** Bu açılıştan sonra Excel "dosya adı çok uzun" der. */
export const TOO_LONG_AT = 20;

export type Comment = { who: string; text: string };

/** Ana sayfadaki hücre yorumları: çalışanların birbirine yazdıkları. */
export const COMMENTS: Record<string, Comment[]> = {
  C3: [
    { who: 'M. Demir', text: 'Bu rakamı kim değiştirdi?' },
    { who: 'S. Kaya', text: 'Ben değil.' },
    { who: 'E. Çelik', text: 'Ben de değil.' },
    { who: 'Excel', text: 'Ben de değil.' },
  ],
  D7: [
    { who: 'A. Yılmaz', text: '%107 nasıl oldu, hedefi mi düşürdük?' },
    { who: 'B. Şahin', text: 'Hedefi yükseltmiştik, sonra geri aldık, sonra… uzun hikâye.' },
  ],
  H5: [
    { who: 'E. Çelik', text: '"Q4 telafi" yazan arkadaş Q4\'te burada olacak mı?' },
    { who: 'A. Yılmaz', text: 'Pazartesi konuşalım.' },
  ],
  B16: [
    { who: 'Ahmet Bey', text: 'Toplam güzel. Bir de daha güzel yapalım.' },
    { who: 'M. Demir', text: 'Nasıl yani?' },
    { who: 'Ahmet Bey', text: 'Daha güzel.' },
  ],
  E9: [
    { who: 'S. Kaya', text: 'Sapmayı kırmızı yaptım, Ahmet Bey görünce üzüldü, siyaha çevirdim.' },
  ],
  A12: [
    { who: 'B. Şahin', text: 'Bayi kanalını geçen ay kapatmamış mıydık?' },
    { who: 'M. Demir', text: 'Kapattık ama tabloda kalsın, iyi duruyor.' },
  ],
  F11: [
    { who: 'B. Şahin', text: 'Lütfen benim adımı silmeyin, bu satır benim tek başarım.' },
  ],
};

/** Ham_veri sayfası: şirketin, sitedeki öteki oyunları da "takip ettiği" anlaşılır. */
export const RAW_DATA: string[][] = [
  ['Kaynak', 'Kalem', 'Değer', 'Not'],
  ['Köy Bakkalı', 'Veresiye: Muhtar', '₺1.240', '"Ay sonu" denildi (3. ay sonu)'],
  ['Köy Bakkalı', 'Veresiye: Hasan Amca', '₺86,50', 'Ekmek + gazete, her gün'],
  ['Cüzdan Zamanı', 'Simit (2002)', '₺0,25', 'Nostalji amaçlıdır'],
  ['Cüzdan Zamanı', 'Simit (bugün)', '₺20', 'Yorum yapılmadı'],
  ['Kavşak Amiri', 'Kırmızıda geçen araç', '47', 'Hepsi "sarıydı" diyor'],
  ['Kavşak Amiri', 'Çalınan korna', '1.902', 'Ölçüm cihazı bozuldu'],
  ['Yama Ekibi', 'Kapatılan çukur', '12', 'Ertesi gün açılan: 14'],
  ['UyumMetre', '"Takım oyuncusuyum" diyen aday', '%100', 'Takım bulunamadı'],
  ['', '', '', ''],
  ['Kaynak', 'Kalem', 'Değer', 'Not'],
  ['Mesai Dışı', 'Bu sayfaya bakan çalışan', '1', 'Siz'],
];

/** Özet sayfası: yönetime giden tek sayfa. */
export const SUMMARY: string[][] = [
  ['Yönetici Özeti', '', ''],
  ['', '', ''],
  ['Genel durum', 'Olumlu', 'Bkz. "Bölgeler" (bakmayın)'],
  ['Hedef gerçekleşme', '%97', 'Yuvarlanınca %100'],
  ['Riskler', 'Yok', 'Varsa da Q4\'te'],
  ['Aksiyonlar', 'Toplantı', 'Toplantı tarihi için toplantı'],
  ['Sonraki adım', 'Sinerji', ''],
];

/** CV_güncel sayfası: bir an görünür, sonra tablo panikle Bölgeler'e döner. */
export const CV: string[][] = [
  ['ÖZGEÇMİŞ (taslak, kimse görmesin)', '', ''],
  ['', '', ''],
  ['Ad Soyad', '…', ''],
  ['Pozisyon', 'Uzman (her şeyin)', ''],
  ['Yetenekler', 'Excel (ileri), saklanmak (uzman)', 'Esc tuşu (refleks)'],
  ['Başarılar', 'Q3 raporunun 14 sürümü', 'Hiçbiri son değil'],
  ['Neden ayrılıyorum', '', 'Bu tabloya bakın'],
];

/*
 * A. Yılmaz'ın hikâyesi: tablo her iki açılışta bir ilerler. Önce notu değişir, sonra İK'ya çağrılır,
 * en sonunda adı üstü çizili kalır. Oyuncu bunu okumaz, yan gözle fark eder.
 */
export const LEAVER = 'A. Yılmaz';
export const storyStage = (opens: number) => Math.min(3, Math.floor((opens - 1) / 2));
/** A. Yılmaz'ın satırlarındaki Not, aşamaya göre (0: tablonun kendi formülü). */
export const STORY_NOTES = ['', 'Görüşme planlandı', 'İK ile toplantıda', 'Devredildi (kime?)'];
/** A. Yılmaz'ın ilk hücresindeki yorum, aşamaya göre. */
export const STORY_COMMENTS: Comment[][] = [
  [{ who: 'A. Yılmaz', text: 'Marmara benden sorulur. Q4\'te telafi ederiz, söz.' }],
  [
    { who: 'A. Yılmaz', text: 'Marmara benden sorulur. Q4\'te telafi ederiz, söz.' },
    { who: 'Ahmet Bey', text: 'Ahmet, bir uğrar mısın? Acil değil. Ama şimdi.' },
  ],
  [
    { who: 'A. Yılmaz', text: 'İK\'dayım, rakamlara dokunmayın.' },
    { who: 'S. Kaya', text: 'Kimse dokunmadı. Ama herkes baktı.' },
  ],
  [
    { who: 'M. Demir', text: 'Marmara artık kimde?' },
    { who: 'S. Kaya', text: 'Sende. Toplantıda öyle dendi.' },
    { who: 'M. Demir', text: 'Ben o toplantıda yoktum.' },
    { who: 'S. Kaya', text: 'İşte o yüzden sende.' },
  ],
];

/** Tabloyu "birlikte düzenleyen" mesai arkadaşları: imleçleri gezinir, arada bir rakam değiştirirler. */
export const COWORKERS = [
  { who: 'M. Demir', color: '#c55a11' },
  { who: 'S. Kaya', color: '#7030a0' },
  { who: 'B. Şahin', color: '#2f75b5' },
];

/** Bir mesai arkadaşı rakamı değiştirince hücreye bıraktığı yorum. */
export const EDIT_NOTES = [
  'Rakamı güncelledim, sormayın.',
  'Ahmet Bey böyle istedi.',
  'Yanlışlıkla değişti, ama böyle daha iyi duruyor.',
  'Toplantıdan önce düzelttim (bozdum).',
  'Bu rakamı bir yerde gördüm, yazdım.',
];

/** Outlook bildirimi gibi kayan e-postalar. */
export const EMAILS: { from: string; subject: string }[] = [
  { from: 'Ahmet Bey', subject: 'RE: RE: FW: Q3 rapor (son hali) - "Bir de böyle deneyelim"' },
  { from: 'İK', subject: 'Zorunlu eğitim: "Verimli toplantı" (4 saat)' },
  { from: 'Tüm Şirket', subject: 'Mutfaktaki kek kimin? (Cevap: herkesin)' },
  { from: 'BT Destek', subject: 'Şifreniz 3 gün içinde sona erecek. Yine.' },
  { from: 'S. Kaya', subject: 'Yanlışlıkla "Tümünü yanıtla" dedim, kusura bakmayın' },
  { from: 'Ahmet Bey', subject: '(konu yok)' },
  { from: 'Finans', subject: 'Masraf formunuz reddedildi: "simit" kalemi' },
  { from: 'Ofis Yönetimi', subject: 'Klima 18 dereceye sabitlendi. Tartışma kapanmıştır.' },
];

/** Gözden Geçir → Yazım Denetimi: tablodaki sözcükler kurumsal dile çevrilir. */
export const CORPORATE: Record<string, string> = {
  Takipte: 'Gelişim alanı',
  Tamam: 'Beklentiyi karşılıyor',
  'Q4 telafi': 'Q4 fırsat penceresi',
  Toplam: 'Sinerji',
  Sapma: 'Esneklik',
  Hedef: 'Vizyon',
  Gerçekleşen: 'Yolculuk',
  'Oran (%)': 'Etki (%)',
  Not: 'İçgörü',
  Durum: 'Momentum',
  Sorumlu: 'Paydaş',
  Bölge: 'Ekosistem',
};
