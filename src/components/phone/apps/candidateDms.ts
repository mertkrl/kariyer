import { keyCharacter } from '../../../game/day/story';

/*
 * Reddedilen adaylar seni Kariyergram'da bulur, bazıları. Kimin yazdığı, yazmadan önce ne kadar
 * beklediği ve hangi ruh hâlinde yazdığı oyun başına belirlenir (kimliğinin ve oyunun tohumunun bir
 * özeti); böylece hiçbir iki haftanın gelen kutusu aynı olmaz. Haftanın tekrar eden karakterleri
 * her zaman kendi sözleriyle yazar. Dürüst cevap, o gün onları gerçekte reddeden kurala bağlıdır;
 * şirket politikası bunu asla açıklamaman gerektiğini söyler.
 */

export interface DmCandidate {
  id: string;
  name: string;
  initials: string;
  color: string;
  role: string;
  /** Reddin yapıldığı mesai dakikası. */
  at: number;
  dayIndex: number;
  /** Yazmadan önce bekledikleri oyun dakikası. */
  delay: number;
  temper: Temper;
}

export type Temper = 'kırgın' | 'öfkeli' | 'kibar' | 'pratik' | 'esprili' | 'ısrarcı';

interface Voice {
  openers: ((c: DmCandidate) => string)[];
  /** Dürüst cevabına ve şablona karşılık yazdıkları. */
  honest: string[];
  template: string[];
}

const VOICES: Record<Temper, Voice> = {
  kırgın: {
    openers: [
      () => 'Merhaba… 7 aydır iş arıyorum. Bu ret beni gerçekten yıktı. Kısa da olsa bir geri bildirim verebilir misiniz?',
      (c) => `Ben ${c.name.split(' ')[0]}. Ailem bu işe çok güveniyordu. Bir yerde hata mı yaptım?`,
    ],
    honest: ['Bunu duymak acı ama iyi geldi. Teşekkürler, gerçekten.', 'İlk kez biri açıkladı. Ağlamak mı gülmek mi bilemedim. Sağ olun.'],
    template: ['Anladım…', 'Tamam. Yine de teşekkürler.'],
  },
  öfkeli: {
    openers: [
      () => 'CV\'mi bir insan okudu mu, yoksa bir makine mi? Açık cevap istiyorum.',
      () => 'Şartların hepsini karşılıyordum. Mülakata bile çağrılmadım. Bu nasıl bir süreç?',
    ],
    honest: ['…Tamam. En azından dürüst davrandınız. Öfkem size değil.', 'Demek öyle. Bunu bilmek bile bir şey. Teşekkürler.'],
    template: ['Bu cevabı da otomatik mi yazdınız? Neyse.', '"Detay paylaşamıyoruz." Tabii. Hep böyle.'],
  },
  kibar: {
    openers: [
      (c) => `Merhaba, ${c.role.split(' ·')[0]} ilanınıza başvurmuştum. Sonucu aldım, ilginiz için teşekkür ederim. Kısa bir geri bildirim rica edebilir miyim?`,
      () => 'İyi günler, rahatsız ediyorsam kusura bakmayın. Başvurumu nasıl daha iyi hâle getirebilirim?',
    ],
    honest: ['Çok teşekkür ederim, bu çok yardımcı oldu. İyi çalışmalar dilerim.', 'Zaman ayırdığınız için minnettarım. Bir dahakine buna göre hazırlanacağım.'],
    template: ['Anlıyorum, teşekkür ederim. İyi çalışmalar.', 'Peki, yine de ilginiz için teşekkürler.'],
  },
  pratik: {
    openers: [
      () => 'Merhaba. Tek soru: hangi kriterden elendim? Bir sonraki başvurum için bilmem lazım.',
      () => 'Ret aldım. Deneyim mi, maaş mı, format mı? Hangisiyse düzelteyim.',
    ],
    honest: ['Net, teşekkürler. CV\'yi bu akşam düzenliyorum.', 'Tamam, anlaşıldı. Bir sonrakinde bunu değiştiririm.'],
    template: ['Anlaşıldı. Başka yerde sorarım.', 'Peki. Bu cevapla bir şey düzeltemem ama sağ olun.'],
  },
  esprili: {
    openers: [
      () => 'Merhaba 😅 Ret mailiniz o kadar hızlı geldi ki CV\'mi göndermeden reddedildim sandım. Bir şey söyleyebilir misiniz?',
      () => 'Selam! Sizi Kariyergram\'da buldum, stalker değilim söz 😄 Başvurum hakkında bir ipucu?',
    ],
    honest: ['Vay, gerçek bir insan! 😄 Şaka bir yana, çok sağ olun.', 'Tamam, CV\'me "hızlı öğrenirim" yazmayı bırakıyorum 😅 Teşekkürler!'],
    template: ['"Detay paylaşamıyoruz" — bunu bir yerden hatırlıyorum 😄 Başarılar.', 'Beklediğim cevap buydu zaten 😅 İyi günler.'],
  },
  ısrarcı: {
    openers: [
      () => 'Merhaba, başvurum hakkında yazıyorum. Bu pozisyon için gerçekten uygun olduğuma inanıyorum. Tekrar değerlendirilmesi mümkün mü?',
      () => 'Tekrar başvurabilir miyim? Bir şans daha isterim. Ne gerekiyorsa yaparım.',
    ],
    honest: ['Anladım. O zaman bir sonraki ilanda yine buradayım, bilesiniz 🙂', 'Teşekkürler. Pes etmiyorum ama.'],
    template: ['Peki… Yine de bir sonraki ilana başvuracağım.', 'Anladım. Ama tekrar başvuracağım.'],
  },
};

const TEMPERS = Object.keys(VOICES) as Temper[];

/** Gerçek gerekçe, reddin olduğu günün kuralına göre. */
const REASONS = [
  'İlanda junior pozisyon için bile 5 yıl deneyim şartı vardı. Bu senin eksiğin değil, ilanın saçmalığı.',
  'Ön elemeyi yapay zekâ ATS skoruna göre yaptı. CV\'ni sade, tek sütunlu yap; anahtar kelimeleri ilandan al.',
  'Maaş beklentin bütçenin üstünde görüldü. Bir dahaki sefere bir aralık yazmayı dene.',
  'Açık konuşayım: bu hafta bazı kararlar içime sinmeyen kriterlerle verildi. Üzgünüm, senin suçun değil.',
];

const hash = (s: string) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

/** Reddedilen adayların yaklaşık beşte ikisi yazar; hikâyenin tekrar eden karakterleri her zaman yazar. */
export function writesBack(id: string, seed: number) {
  return !!keyCharacter(id) || hash(`${id}:${seed}`) % 100 < 40;
}

/** Ne zaman ve hangi ruh hâliyle yazdıkları, bu oyun için sabit. */
export function dmProfile(id: string, seed: number): { delay: number; temper: Temper } {
  const h = hash(`${seed}:${id}`);
  return { delay: 15 + (h % 50), temper: TEMPERS[(h >>> 4) % TEMPERS.length] };
}

export function openerFor(c: DmCandidate) {
  // haftanın tekrar eden karakterleri kendi sözleriyle yazar
  const own = keyCharacter(c.id)?.dm;
  if (own) return own;
  const list = VOICES[c.temper].openers;
  return list[hash(c.id) % list.length](c);
}

export function repliesFor(c: DmCandidate) {
  const first = c.name.split(' ')[0];
  return {
    honest: `Merhaba ${first}. Kararı ben verdim ve açık konuşmak istiyorum: ${REASONS[Math.min(c.dayIndex, REASONS.length - 1)]} CV'n güçlü, lütfen başvurmaya devam et.`,
    template: 'Merhaba, değerlendirme sürecine dair detay paylaşamıyoruz. İlginiz için teşekkür eder, kariyerinizde başarılar dileriz.',
  };
}

export function answerBack(c: DmCandidate, kind: 'honest' | 'template') {
  const list = VOICES[c.temper][kind];
  return list[hash(c.id + kind) % list.length];
}
