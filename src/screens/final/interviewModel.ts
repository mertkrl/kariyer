/*
 * Cuma mülakatının sabit parçaları: odada senden başka kimlerin olduğu, ekip liderinin insanlar
 * hakkında ne düşündüğü, soru hakkı ve her soru türünün kaydedildiği kodlar, maaş konuşmasının
 * cümleleri ve mülakat kaydının biçimi. Ekran (FinalRoundScreen) ve bu klasördeki parçaları
 * bunları paylaşır.
 */
import type { Finalist } from '../../game/store/store';
import { NEPHEW_ID } from '../../game/data/candidates';
import type { SalaryMove } from '../../game/events/interview';

/** Bütün hafta kimse ilerletilmediyse yönetim finali kendi iç referansıyla doldurur. */
export const FALLBACK: Finalist[] = [{ id: NEPHEW_ID, day: 0 }];
/** Senin çağırdıklarından kaçı panele girer; daha uzun bir liste sabah kısaltılır. */
export const INTERVIEW_LIMIT = 3;
/** Cuma'nın toplam görüşme sayısı: senin adayların, kalan yerler ekibin kısa listelerinden. */
export const PANEL_SIZE = 8;

/** Ekibin geri kalanı da eleme yaptı: kısa listeleri Cuma aynı odada oturur. */
export const COLLEAGUES: Finalist[] = [
  { id: 'nehir', day: 0, by: 'ayse' },
  { id: 'berk', day: 0, by: 'ayse' },
  { id: 'cagan', day: 0, by: 'emre' },
  { id: 'sarp', day: 0, by: 'emre' },
];

/*
 * İşe alımı yapacak yönetici de odada: yazılım ekip lideri Ümit. İşaretlere değil cevaplara
 * kulak verir ve her mülakattan sonra ne düşündüğünü söyler. İşe alım bir kurul kararıdır: sen
 * önerirsin, o ve Hakan Bey imzalar (ya da kayda geçecek şekilde itiraz eder).
 */
export const LEAD = 'Ümit Arslan';
export const LEAD_SPECIAL: Record<string, string> = {
  ozan: 'Teknik olarak açık ara en iyisi. Ama ekibi "gereksiz" bulduğunu bana da söyledi; ekibim onunla çalışmak istemez.',
  okan: 'Temel sorulara cevap veremedi. Kimin yakını olduğu umurumda değil; ekipte yeri yok.',
  volkan: 'Çok iyi konuşuyor ama tek bir rakam, tek bir somut örnek vermedi. Referanslarını aramadan ben ikna olmadım.',
};
export function leadView(id: string, fit: number) {
  if (LEAD_SPECIAL[id]) return LEAD_SPECIAL[id];
  if (fit >= 5) return 'Cevapları somut ve ölçülebilir. Teknik olarak ekibin en güçlüsü olabilir.';
  if (fit === 4) return 'Sağlam. İlk aylarda biraz destek ister ama işini bildiği belli.';
  if (fit === 3) return 'Potansiyeli var ama henüz hazır değil; yanına bir mentor vermemiz gerekir.';
  return 'Somut hiçbir şey anlatmadı. Bu cevaplarla ben ikna olmadım.';
}
/** Ekip lideri bu işe alımı destekler mi? Güçlü ve toksik değilse: evet. */
export const leadBacks = (id: string, fit: number) => fit >= 4 && !LEAD_SPECIAL[id];

/** Senin klasik sorularından yalnızca bu kadarı sığar; teknik soruyu Ümit, uyum sorusunu Hakan Bey sorar. */
export const QUESTION_BUDGET = 2;
/** Hakan Bey'in listesinden gelen soru için kullanılan sıra (üç standart sorudan sonra). */
export const FORBIDDEN = 3;
export const TYPING_MS_PER_CHAR = 16;
export const THINKING_MS = 900;

/** Takip soruları FOLLOW + yoklama türü olarak saklanır (interview.ts: HookKind). */
export const FOLLOW = 10;
/** Ümit'in teknik sorusu: kısa bir kod vakası. */
export const CASE = 20;
/** Senin ek sorun: test puanı ve cevap kâğıdı (hakkından düşmez, odada bir kez). */
export const TEST = 30;
/** Adayı panele getirenin (Ayşe, Emre ya da Hakan Bey) sorusu: OWNER + senin sormadığın klasik sorunun sırası. */
export const OWNER = 40;

/*
 * Heyecanlı adaylar: biri onları rahatlatmazsa cevapları kekeme kalır ve Ümit'in vakasında
 * takılırlar. Görüşmeyi sohbetle açarsan aynı insan sakin konuşur (CALM_ANSWERS).
 */
export const CALM_ANSWERS: Record<string, Partial<Record<0 | 1 | 2, string>>> = {
  ahmet: {
    0: 'Stajımda yavaş çalışan bir raporlama sorgusunu yeniden yazdım; 40 saniyeden 3 saniyeye indi ve ekip bunu her gün kullanıyor.',
    1: "Canlıya test etmeden küçük bir değişiklik gönderdim, yarım saat ödeme sayfası hata verdi. O günden beri her PR'a test yazmadan dokunmuyorum.",
  },
  ceren: { 0: 'Fatura eşleştirme işini bir Python servisiyle otomatikleştirdim; ayda 60 saatlik elle çalışma 4 saate indi.' },
  onur: { 0: 'Stajda haftalık satış raporunu elle hazırlanmaktan çıkarıp SQL sorgusuna bağladım; rapor süresi yarım günden bir saate indi.' },
  murat: { 2: 'Raporlama tarafındaki elle yapılan kontrolleri otomatik testlere çevirirdim.' },
  nehir: { 1: 'Bir iade akışını canlıya testsiz aldım, 300 iade iki kez yapıldı. O günden beri iade akışlarında çift onay var, ben kurdum.' },
};
export const isNervous = (id: string) => id in CALM_ANSWERS;

/** Görüşmenin açılışı: her görüşmeyi sen açarsın; samimi bir merhaba ya da kurumsal bir giriş. */
export const WARM_LINE = 'Merhaba, hoş geldiniz! Ben Defne. Yol nasıldı, kolay buldunuz mu? Su ister misiniz? Acele yok, rahat olun.';
export const FORMAL_LINE = 'İyi günler, ben Defne Aral, İşe Alım Uzmanı. Panelde Ümit Arslan ve Hakan Kaya da var. Görüşmemiz yaklaşık yarım saat sürecek; başlayalım.';
/** Ekipten biri yürütürken maaşı da o konuşur, kendi tarzıyla. */
export function ownerSalaryMove(owner: 'ayse' | 'emre' | 'hakan', moves: SalaryMove[]): SalaryMove {
  if (owner === 'emre') return moves.includes('squeeze') ? 'squeeze' : moves.includes('cap') ? 'cap' : moves[0];
  if (owner === 'ayse') return moves.includes('match') ? 'match' : moves.includes('pass') ? 'pass' : moves[0];
  return moves.includes('match') ? 'match' : moves.includes('cap') ? 'cap' : moves[0];
}
/** Gözlemcinin söz hakkı: ekipten birinin görüşmesinde sorabileceğin soru sayısı. */
export const OBSERVER_BUDGET = 2;

export function warmReply(id: string, warm = true) {
  if (warm) return isNervous(id) ? 'Teşekkür ederim… açıkçası biraz heyecanlıydım. İyi geldi, sağ olun.' : 'Teşekkür ederim, çok naziksiniz. Hazırım.';
  return isNervous(id) ? 'M-merhaba… memnun oldum. Hazırım… sanırım.' : 'Memnun oldum. Hazırım.';
}

/**
 * Açılıştan sonra görüşmeyi kim sürdürür: panelde iş bölümü günün akışına göre yapılır. Hakan
 * Bey'in getirdiğini o yürütür; diğerlerinde sen, Ayşe ya da Emre (adaya göre sabit, tohuma bağlı).
 * Senin payın yaklaşık yarısı.
 */
export function runnerFor(id: string, seed: number, bringer: 'you' | 'ayse' | 'emre' | 'hakan'): 'you' | 'ayse' | 'emre' | 'hakan' {
  if (bringer === 'hakan') return 'hakan';
  const h = [...`${seed}:${id}`].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) % 9973, 7);
  return (['you', 'you', 'ayse', 'emre'] as const)[h % 4];
}

/** Görüşmeyi yürütenin açılış sorusu, kendi tarzıyla: Ayşe somuta, Emre skora, Hakan Bey "tanıdıklığa" bakar. */
export function ownerQuestion(owner: 'ayse' | 'emre' | 'hakan', question: string, testScore: number, cutoff: number, brought = false, opener = true) {
  if (owner === 'ayse') return opener ? `Ben Ayşe, buradan devam edeyim. ${question}` : `Ben de bir şey sormak istiyorum: ${question}`;
  if (owner === 'emre')
    return testScore >= cutoff
      ? `Ben Emre. Test puanınız ${testScore}, tebrik ederim; sistem skorunuz da çok iyi. ${question}`
      : brought
        ? `Ben Emre. Test puanınız ${testScore}; eşiğin altında, biliyorum. Ama sistem skorunuz çok yüksek, Hakan Bey'den sizin için istisna aldım. ${question}`
        : `Ben Emre. Test puanınız ${testScore}; açık konuşayım, eşiğin altında. ${question}`;
  return brought ? `Babanıza selamımı iletin bu arada. Neyse, usulen soralım: ${question}` : `Hakan Kaya, İK Müdürü. Kısa tutalım: ${question}`;
}
export const SALARY_LINES: Record<SalaryMove, (offer: number) => string> = {
  match: () => 'Beklentiniz bütçemize uygun; bu rakamla ilerleyebiliriz.',
  pass: () => 'Beklentinizi not aldım; kurulda olduğu gibi değerlendireceğiz.',
  cap: (o) => `Bu pozisyon için bütçemiz ${o.toLocaleString('tr-TR')} TL. Bu rakama inebilir misiniz?`,
  low: (o) => `Size ${o.toLocaleString('tr-TR')} TL teklif edebiliriz.`,
  squeeze: (o) => `Biraz aşağı çekebilir miyiz? ${o.toLocaleString('tr-TR')} TL ile başlasak?`,
};
export const SALARY_LABEL: Record<SalaryMove, string> = {
  match: 'Beklentiyi kabul et',
  pass: 'Beklentiyi olduğu gibi kurula taşı',
  cap: 'Bütçe tavanını teklif et',
  low: 'Daha düşük teklif et',
  squeeze: 'Biraz aşağı çekmeyi dene',
};

/** Bir mülakatın tek bir anı, olduğu sırayla. */
/**
 * Mülakatın sırası: önce sen klasik sorularını sorarsın; söz Ümit'e geçince (handoff) teknik soruyu
 * o, ardından "uyum" sorusunu Hakan Bey sorar; sonra maaşı konuşursun. Aday deneyimine göre
 * sana soru sorabilir (back: n'inci sorusu ve senin cevabın); sonra puanlar ve kapatırsın (end).
 * Araya giremezsin; ama görüşmeyi nasıl açacağın (sohbetle ya da doğrudan) senin elinde.
 */
export type Entry =
  | { kind: 'warm'; warm: boolean }
  | { kind: 'q'; q: number; by?: 'hakan' | 'levent' | 'ayse' | 'emre'; about?: string }
  | { kind: 'handoff' }
  | { kind: 'salary'; move: SalaryMove | null }
  | { kind: 'note'; text: string }
  | { kind: 'back'; n: number; choice: 'honest' | 'polished' | null }
  | { kind: 'end' };

export interface Typing {
  candidateId: string;
  /** Cevabı yazılmakta olan kaydın sırası. */
  entry: number;
  /** Şimdiye kadar gösterilen karakter sayısı; aday hâlâ "düşünürken" -1. */
  shown: number;
}
