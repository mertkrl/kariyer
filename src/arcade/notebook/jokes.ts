/*
 * Patron tablosunun şakaları: hücreye bazı sözcükler yazılınca tablo kurumsal hayata özgü bir
 * tepki verir. Hücre ya bir hata koduna döner (üstüne gelince açıklaması çıkar) ya da olduğu gibi
 * kalır; her durumda köşede kısa bir bildirim kayar. "=MAAŞ()" ise her saniye biraz erir.
 * Eşleşme küçük harfe çevrilmiş metnin içinde aranır; formül olarak yazılanlar (=ZAM()) da sayılır.
 * Saf mantıktır, test edilebilir.
 */

export type Joke = {
  /** Sırlar listesindeki adı (secrets.ts). */
  id: string;
  /** Hücrede görünecek değer; yoksa hücre yazıldığı gibi kalır. */
  show?: string;
  /** Hücrenin üstüne gelince çıkan açıklama. */
  tip?: string;
  /** Köşede kayan bildirim. */
  toast: string;
};

const JOKES: { match: RegExp; joke: Joke }[] = [
  { match: /zam/, joke: { id: 'zam', show: '#YOK!', tip: 'Bütçe bulunamadı.', toast: 'Finans: "Zam talebiniz bütçe dönemine ertelendi (hangi dönem olduğu belirtilmedi)."' } },
  { match: /istifa/, joke: { id: 'istifa', toast: 'İK bilgilendirildi. Müdürünüz yazıyor: "Bir kahve içelim mi? 🙂"' } },
  { match: /tatil|izin/, joke: { id: 'izin', show: '#İZİN_YOK!', tip: 'Yıllık izniniz 2031 yılına devredildi.', toast: 'İzin talebiniz "yoğun dönem" nedeniyle beklemeye alındı.' } },
  { match: /terfi/, joke: { id: 'terfi', show: 'Değerlendirmede', tip: 'Bir sonraki dönem değerlendirilecek (5. kez).', toast: 'Terfi süreciniz "yakında" aşamasında.' } },
  { match: /toplantı|toplanti/, joke: { id: 'toplanti', toast: 'Takviminize 3 yeni toplantı eklendi: "Toplantıların azaltılması üzerine toplantı".' } },
  { match: /kahve|çay/, joke: { id: 'kahve', toast: 'Kahve makinesi arızalı (yine). Arıza kaydı #4512 açıldı.' } },
  { match: /patron|müdür|mudur/, joke: { id: 'patron', toast: 'Teams: Ahmet Bey "müsait misin?" yazdı. Ayrıntı yok.' } },
  { match: /evden|uzaktan|remote/, joke: { id: 'evden', show: '#BAĞLANTI!', tip: 'VPN bağlantısı koptu.', toast: 'Ofise dönüş politikası güncellendi: haftada 6 gün.' } },
  { match: /mesai|fazla/, joke: { id: 'mesai', toast: 'Mesai bitimine 17 saniye kala size yeni bir görev atandı.' } },
  { match: /prim|ikramiye|bonus/, joke: { id: 'prim', show: '#SAYI/0!', tip: 'Prim havuzu sıfıra bölündü.', toast: 'Prim yerine "Ayın Çalışanı" sertifikası gönderildi.' } },
];

/** =MAAŞ() ya da "maaş": her saniye erir. */
const SALARY = /^=?\s*maa[şs](\s*\(\s*\))?\s*$/i;
export const isSalary = (raw: string) => SALARY.test(raw.trim());

/** Açılıştan `seconds` saniye sonra maaşın değeri: her saniye %1 erir. */
export const salaryAt = (seconds: number) => Math.round(50000 * 0.99 ** seconds);

export const SALARY_JOKE: Joke = { id: 'maas', tip: 'Enflasyona endekslenmemiştir.', toast: 'Maaşınız yatırıldı. Gerçek değeri hesaplanıyor…' };

export function jokeOf(raw: string): Joke | null {
  const t = raw.toLocaleLowerCase('tr-TR');
  if (!t.trim()) return null;
  if (isSalary(raw)) return SALARY_JOKE;
  return JOKES.find((j) => j.match.test(t))?.joke ?? null;
}
