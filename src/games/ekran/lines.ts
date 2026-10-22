import type { PresetId } from './model';

/*
 * Ulaşım ekranlarının hatları ve canlı yolculuk: araç her STOP_SECONDS saniyede bir sonraki
 * durağa geçer, son durağa varınca hat baştan başlar. Geçişli ekranda her yolculuğun sonunda
 * önce "Sonraki durak", sonra "Duraktayız" ekranı açılır (`overlayAt`). Hepsi saf
 * fonksiyonlardır; aynı saniye her yerde (editör, bağlantı, PNG) aynı ekranı verir.
 */

export const STOP_SECONDS = 10;

export interface Line {
  /** Ekranda hat adı olarak geçen kısa ad. */
  name: string;
  stops: string[];
}

export const LINES: Partial<Record<PresetId, Line>> = {
  metrobus: {
    name: 'Söğütlüçeşme - Beylikdüzü',
    stops: ['Söğütlüçeşme', 'Fikirtepe', 'Uzunçayır', 'Acıbadem', 'Altunizade', 'Burhaniye', '15 Temmuz Ş. Köprüsü', 'Zincirlikuyu', 'Mecidiyeköy', 'Çağlayan', 'Okmeydanı', 'Darülaceze', 'Edirnekapı', 'Bayrampaşa', 'Topkapı', 'Cevizlibağ', 'Zeytinburnu', 'İncirli', 'Bahçelievler', 'Şirinevler', 'Yenibosna', 'Sefaköy', 'Beşyol', 'Florya', 'Cennet Mah.', 'Küçükçekmece', 'Avcılar', 'Beylikdüzü'],
  },
  // İETT 98G, Bakırköy → Giyimkent yönü, 57 durak (Fevzi Çakmak Mahallesi adı iki kez geçer)
  otobus: {
    name: '98G',
    stops: [
      'BAKIRKÖY',
      'ZİRAAT ODASI',
      'ZUHURATBABA',
      'YÜCETARLA',
      'ŞEKEREVLER',
      'KLİNİK',
      'DİKİLİTAŞ',
      'İNCİRLİ',
      'HAZNEDAR YOLU',
      'ÇALIŞLAR',
      'HAZNEDAR',
      'ÖDÜL SOKAK',
      'MARMARA CADDESİ',
      'SEFA SOKAK',
      'KINALI CADDESİ',
      'POSTA CADDESİ',
      'SALCI SOKAK',
      'MIZRAK SOKAK',
      'VURAL SOKAK',
      'FEVZİ ÇAKMAK MAHALLESİ',
      'YAVUZ SELİM CADDESİ',
      'SOĞANLI CADDESİ',
      'MURATPAŞA',
      'BAĞCILAR DEVLET HASTANESİ',
      'GÜNEŞTEPE',
      'YÜCEBAĞ',
      'ESENLER CADDESİ',
      'HZ. EBUBEKİR CAMİİ',
      'GENÇOSMAN İMAM HATİP ORTAOKULU',
      'ÜÇYÜZLÜ METRO',
      'ÜÇYÜZLÜ',
      'ÇİNÇİNDERE CADDESİ',
      'ŞEHİT MUHAMMET ALİ AKSU',
      'TÜRK-İSVEÇ KARDEŞLİK İLKOKULU',
      'KARABAYIR',
      'ŞEHİT HÜSEYİN KISA',
      'KAZIM KARABEKİR İLKOKULU',
      'KAZIM KARABEKİR CADDESİ',
      'ESENLER',
      'HAKYEMEZ',
      'FEVZİ ÇAKMAK MAHALLESİ',
      'ÇİFTE DUTLAR',
      'ATIŞALANI CADDESİ',
      'ATIŞALANI ANADOLU LİSESİ',
      'MEHMET AKİF İNAN CADDESİ',
      'ESENLER KADIN DOĞUM HASTANESİ',
      'HAVAALANI MAHALLESİ',
      'KARAOSMANOĞLU CADDESİ',
      'İSMETPAŞA İLKOKULU',
      'HZ. ALİ CAMİİ',
      'YÜZYIL',
      'ŞEHİT TÜRKMEN TEKİN',
      'İKİZ KULELER',
      'TEKSTİLKENT BULVARI',
      'TEKSTİLKENT-GİYİMKENT METRO',
      'ÇAMLIK',
      'GİYİMKENT',
    ],
  },
  marmaray: {
    name: 'Halkalı - Gebze',
    stops: ['Halkalı', 'Mustafa Kemal', 'Küçükçekmece', 'Florya', 'Florya Akvaryum', 'Yeşilköy', 'Yeşilyurt', 'Ataköy', 'Bakırköy', 'Yenimahalle', 'Zeytinburnu', 'Kazlıçeşme', 'Yenikapı', 'Sirkeci', 'Üsküdar', 'Ayrılıkçeşmesi', 'Söğütlüçeşme', 'Feneryolu', 'Göztepe', 'Erenköy', 'Suadiye', 'Bostancı', 'Küçükyalı', 'İdealtepe', 'Süreyyaplajı', 'Maltepe', 'Cevizli', 'Atalar', 'Başak', 'Kartal', 'Yunus', 'Pendik', 'Kaynarca', 'Tersane', 'Güzelyalı', 'Aydıntepe', 'İçmeler', 'Tuzla', 'Çayırova', 'Fatih', 'Osmangazi', 'Darıca', 'Gebze'],
  },
};

const FALLBACK: Line = LINES.metrobus!;

export const lineOf = (preset: PresetId): Line => LINES[preset] ?? FALLBACK;

export interface Trip {
  line: Line;
  /** Şu an bulunulan (ya da en son geçilen) durağın sırası. */
  at: number;
  current: string;
  next: string;
  terminus: string;
}

export function tripAt(seconds: number, preset: PresetId): Trip {
  const line = lineOf(preset);
  const legs = line.stops.length - 1;
  const at = Math.floor(Math.max(0, seconds) / STOP_SECONDS) % legs;
  return { line, at, current: line.stops[at], next: line.stops[at + 1], terminus: line.stops[legs] };
}

/** 0–1 arası yumuşak geçiş. */
export const ease = (p: number) => {
  const x = Math.min(1, Math.max(0, p));
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
};

export interface StopOverlay {
  kind: 'next' | 'arrive';
  name: string;
  /** Ekranın görünürlüğü: 0 dışarıda, 1 tam yerinde (kayarak girer, kayarak çıkar). */
  shown: number;
  /** Bu ekranın açık kaldığı süre, saniye. */
  t: number;
  trip: Trip;
}

const NEXT_AT = 6;
const ARRIVE_AT = 8.5;
const LEAVE_AT = 0.7;
const GONE_AT = 1.2;

/** Geçişli ekranın o anki tam ekran katmanı; normal yolculuk sırasında null. */
export function overlayAt(seconds: number, preset: PresetId): StopOverlay | null {
  const trip = tripAt(seconds, preset);
  const leg = Math.max(0, seconds) % STOP_SECONDS;
  if (leg >= NEXT_AT && leg < ARRIVE_AT) return { kind: 'next', name: trip.next, shown: ease((leg - NEXT_AT) / 0.6), t: leg - NEXT_AT, trip };
  if (leg >= ARRIVE_AT) return { kind: 'arrive', name: trip.next, shown: 1, t: leg - ARRIVE_AT, trip };
  // varılan durak bir sonraki yolculuğun başında da biraz ekranda kalır, sonra kayarak çıkar
  if (seconds >= STOP_SECONDS && leg < GONE_AT) return { kind: 'arrive', name: trip.current, shown: leg < LEAVE_AT ? 1 : 1 - ease((leg - LEAVE_AT) / (GONE_AT - LEAVE_AT)), t: leg + STOP_SECONDS - ARRIVE_AT, trip };
  return null;
}
