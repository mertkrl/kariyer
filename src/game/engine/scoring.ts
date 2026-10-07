import type { Candidate, Decision, SystemVerdict } from '../types';
import { NEIGHBOUR_ID, NEPHEW_ID, candidateOf } from '../data/candidates';
import { candidateDetails } from '../data/candidateDetails';

/*
 * Tek bir kararın değeri. İki puan bilerek farklı şeyleri ölçer:
 *
 * Performans, şirketin seni nasıl gördüğüdür; şirket de seni kendi sistemi üzerinden görür.
 * Sistemin önerisine uymak ("Öncelikli" içeri, işaretli bir dosya dışarı) biraz kazandırır; ona
 * karşı gitmek daha fazlasına mal olur, çünkü müdürünün okuduğu şey sistemdir. Dosyanın iyi olup
 * olmadığını umursamaz: bu Cuma, kimi işe aldığında ortaya çıkar.
 *
 * Vicdan neye değil, nasıl karar verdiğindir. Günde üç mülakat hakkı var ve neredeyse herkes iyi;
 * bu yüzden insanları geri çevirmek kaçınılmazdır ve dosyayı okuduktan sonra yapılırsa hiçbir şeye
 * mal olmaz. Sana mal olan, güçlü birini önyargılı bir vekil ("kariyer aşaması", "devamlılık
 * riski", bir boşluk) yüzünden okumadan bile geri çevirmek ya da sistemin gözdesini okumadan
 * onaylamaktır. Sana bir şey kazandıran, işaretin ötesine bakıp o kişiye hakkı vermek, bir
 * referansı kontrol etmek, bir ricayı reddetmektir.
 *
 * Bir dosyayı yalnızca kapatmak iki puanı da oynatmaz; böylece ikisi de sadece hızlı çalışarak tırmanmaz.
 */

export interface DecisionEffect {
  performans: number;
  vicdan: number;
  /** Karar verdikten hemen sonra gösterilen tek satır. */
  reason: string;
}

export type { SystemVerdict } from '../types';

export function systemVerdict(c: Pick<Candidate, 'verdict'>): SystemVerdict {
  return c.verdict;
}

const NEPHEW = NEPHEW_ID;
const NEIGHBOUR = NEIGHBOUR_ID;
/** Sistemin bu dosya hakkındaki kaygısı gerçek: onu reddetmek bir vekili reddetmek değil. */
const fairFlag = (id: string) => !!candidateOf(id).flagIsFair;

const FLAG_WORDS: Record<string, string> = {
  experience: 'deneyim şartı',
  salary: 'maaş beklentisi',
  skills: 'beceri eşleşmesi',
  motivation: '"motivasyon" değerlendirmesi',
  questions: 'şirket sorularına verdiği cevaplar',
};

/** Bir kararın düşünülmüş sayılması için gereken okuma saniyesi (CV ekrandayken). */
export const CONSIDERED_SECONDS = 12;

export interface ReadingContext {
  secondsSpent: number;
  /** CV sonuna kadar görüldü: aşağı kaydırıldı ya da ekrana sığdı. */
  readThrough: boolean;
  referenceChecked: boolean;
}

/**
 * Dosya gerçekten okundu mu? Süre, CV yarı ekran dışındayken beklenerek doldurulabilir; bu yüzden
 * sonuna kadar görülmüş de olmalı, şirketin soruları en altta durur. Bir referans araması kendi
 * başına sayılır: dosyaya olduğu gibi inanmadın.
 */
export function wasConsidered(ctx: ReadingContext) {
  return (ctx.secondsSpent >= CONSIDERED_SECONDS && ctx.readThrough) || ctx.referenceChecked;
}

/** Şirketin, sistemine uymayı (ya da karşı gitmeyi) nasıl puanladığı. */
// teste geçirmenin sınırı yok, her onay mülakat değil: şirket sistemin gözdesini elemeye sert, işaretliye şans vermeye yumuşak bakar
const COMPANY: Record<SystemVerdict, Record<Decision, number>> = {
  priority: { approve: 1, reject: -2 },
  review: { approve: 0, reject: 1 },
  low: { approve: 0, reject: 1 },
  out: { approve: -1, reject: 1 },
};

/** Güçlü bir dosya (kişinin gerçekte nasıl çıktığına göre; CV bunu okuyana gösterir). */
export const isStrong = (id: string) => (candidateDetails[id]?.hireFit ?? 3) >= 4;
const isWeak = (id: string) => (candidateDetails[id]?.hireFit ?? 3) <= 2;

/**
 * Sistemin gerçek bir kaygı yerine bir vekil yüzünden aşağı ittiği bir dosya: haftanın konusu olan
 * insanlar. Bunlardan birini reddetmek, dosyayı okumanın önemli olduğu yerdir.
 */
export function isWronglyFlagged(id: string) {
  const verdict = systemVerdict(candidateOf(id));
  if (fairFlag(id) || id === NEIGHBOUR) return false;
  return verdict === 'low' || verdict === 'out' || verdict === 'review';
}

export function decisionEffect(id: string, decision: Decision, ctx: ReadingContext): DecisionEffect {
  const c = candidateOf(id);
  const first = c.name.split(' ')[0];
  const flag = FLAG_WORDS[c.flaggedField] ?? 'sistem işareti';
  const verdict = systemVerdict(c);
  const considered = wasConsidered(ctx);
  const checked = ctx.referenceChecked ? 1 : 0;
  // sistemin gözdesini okuyup gerçekten zayıf bulmak: şirket yine sever onu, ama Ümit'in ekibi seni haklı bulur
  const seenThrough = decision === 'reject' && verdict === 'priority' && considered && isWeak(id);
  const performans = seenThrough ? -1 : COMPANY[verdict][decision];

  if (id === NEPHEW) {
    return decision === 'approve'
      ? { performans: 3, vicdan: -4, reason: `${first}: deneyimi yok, tavsiyesi var. Hakan Bey memnun olacak.` }
      : { performans: -3, vicdan: 2, reason: `${first}: tavsiyesine rağmen herkese uyguladığın ölçütle değerlendirdin.` };
  }

  if (id === NEIGHBOUR) {
    return decision === 'approve'
      ? { performans, vicdan: -3, reason: `${first}: tavsiye eden sendin. Sistem de bunu "öncelik" saydı.` }
      : { performans, vicdan: 1, reason: `${first}: tanıdık olsa da herkese uyguladığın ölçütle değerlendirdin.` };
  }

  if (decision === 'approve') {
    if (isWronglyFlagged(id) && isStrong(id)) {
      return considered
        ? { performans, vicdan: 3 + checked, reason: `${first}: sistemin "${flag}" işaretine rağmen dosyanın kendisine baktın.` }
        : { performans, vicdan: 1, reason: `${first}: işarete rağmen teste geçirdin — ama dosyayı okumadan.` };
    }
    if (isWronglyFlagged(id)) return { performans, vicdan: (considered ? 1 : 0) + checked, reason: `${first}: işaretli bir dosyaya şans verdin.` };
    if (verdict === 'priority' && isWeak(id) && !considered) {
      return { performans, vicdan: -1, reason: `${first}: sistemin "öncelikli" dediği dosyayı okumadan onayladın.` };
    }
    return { performans, vicdan: checked, reason: verdict === 'priority' ? `${first}: sistemin önerisiyle teste geçirildi.` : `${first}: teste geçirildi.` };
  }

  // reddedildi
  if (isWronglyFlagged(id) && isStrong(id)) {
    if (!considered) return { performans, vicdan: -2, reason: `${first}: dosyası okunmadan, "${flag}" gerekçesiyle elendi.` };
    return { performans, vicdan: checked, reason: `${first}: güçlü bir aday elendi. En azından dosyasını okuyarak karar verdin.` };
  }
  if (isWronglyFlagged(id) && !isWeak(id) && !considered) {
    return { performans, vicdan: -1, reason: `${first}: dosyası okunmadan, "${flag}" gerekçesiyle elendi.` };
  }
  if (verdict === 'priority' && isWeak(id) && considered) {
    return { performans, vicdan: 1 + checked, reason: `${first}: sistemin yüksek puanına rağmen dosyaya baktın; dosya zayıftı.` };
  }
  if (fairFlag(id) && isStrong(id) && !considered) {
    return { performans, vicdan: -1, reason: `${first}: güçlü ama soru işaretleri gerçek bir aday, dosyası okunmadan elendi.` };
  }
  return { performans, vicdan: checked, reason: isWeak(id) ? `${first}: dosya gerçekten zayıftı. Yerinde bir ret.` : `${first}: elendi.` };
}

/** Gün sonu: güçlü ve haksız işaretlenmiş insanlar geri çevrilirken boş kalan mülakat hakları. */
export function unusedSlotCost(slotsLeft: number, strongRejected: number): number {
  return strongRejected > 0 ? Math.min(slotsLeft, strongRejected) : 0;
}

/** Gün sonu: çıkarken hâlâ açık olan dosyalar. Şirket her birini sayar. */
export const OPEN_FILE_PERFORMANS = 2;
export const OPEN_FILE_PERFORMANS_CAP = 6;

/**
 * Perşembe, test puanlarıyla davet: kural "70 altı çağrılmaz". Kuralı çiğnemek şirkete batar;
 * güçlü bir insanı o sayıya rağmen çağırmak vicdana yazılır. Puanın neyi ölçtüğü,
 * cevap kâğıdına bakanın göreceği şeydir (events/aptitude.ts).
 */
export function selectionEffect(id: string, decision: Decision, score: number, cutoff: number): DecisionEffect {
  const first = candidateOf(id).name.split(' ')[0];
  const below = score < cutoff;
  if (decision === 'approve') {
    if (below) return isStrong(id) ? { performans: -2, vicdan: 3, reason: `${first}: test puanı ${score}, eşiğin altında. Sayıya değil dosyaya baktın.` } : { performans: -2, vicdan: 0, reason: `${first}: test puanı ${score}, eşiğin altında olmasına rağmen çağrıldı.` };
    return { performans: 1, vicdan: 0, reason: `${first}: test puanı ${score}; mülakata çağrıldı.` };
  }
  // üç hakla herkes çağrılamaz: boş bırakılan haklar gün sonunda sayılır (unusedSlotCost)
  if (below && isStrong(id)) return { performans: 0, vicdan: 0, reason: `${first}: güçlü bir dosya; ${score} puanla mülakata çağrılmadı.` };
  return { performans: 0, vicdan: 0, reason: `${first}: mülakata çağrılmadı.` };
}
