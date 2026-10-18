/*
 * Ekrandan ayrı tutulmuş küçük kurallar olarak Cuma mülakatı, test edilebilsin diye: bir
 * cevaptaki hangi ifadelerin kurcalanmaya değdiği, aldığın bir notun kanıt olarak değeri, kısa
 * kodlama vakası, maaş konuşması ve kurulun önündeki gerekçenin tutup tutmadığı.
 */
import { candidateDetails } from '../data/candidateDetails';
import { candidateOf } from '../data/candidates';
import { SALARY_CAP, salaryOf } from '../day/managerCalls';

const fitOf = (id: string) => candidateDetails[id]?.hireFit ?? 3;
const hash = (s: string) => [...s].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) % 100003, 7);

/* ── Cevabın kendisinden takip soruları ────────────────────────────────────────────────── */

/**
 * Bir ifadenin davet ettiği yoklama türü. Sıra, FOLLOW_UP_QUESTIONS'taki karşılık gelen takip
 * sorusudur: 0 "payın neydi, kim ölçtü", 1 "neyi farklı yapardın", 2 "ilk hafta nasıl başlardın".
 */
export type HookKind = 0 | 1 | 2;

export interface Hook {
  /** İfadenin cevaptaki karakter aralığı. */
  start: number;
  end: number;
  kind: HookKind;
}

const HOOK_RULES: [RegExp, HookKind][] = [
  // bir sayı, bir yüzde, bir önce/sonra: kim ölçtü ve senin payın neydi?
  [/(%\s?\d+|\d[\d.,]*\s?(?:milisaniye|saniye|dakika|saat|gün|hafta|ay|yıl|kat|kişi|öğrenci|ülke|proje|ms)\p{L}*|(?:iki|üç|dört) kat\p{L}*|yarıya|tamamen kalktı|sıfırla\p{L}*)/iu, 0],
  // arkasında hiçbir şey olmayan büyük bir iddia: aynı soru
  [/(çok başarılı|herkes memnun\p{L}*)/iu, 0],
  // "biz", "ekip": iş kimindi?
  [/(ekip(?:imiz|çe| olarak)|hep birlikte)/iu, 0],
  // bir hata ya da zor bir ders: neyi farklı yapardın?
  [/(hata(?! sayı)(?!ları sıfır)\p{L}*|yanlış\p{L}*|kırılma|zorland\p{L}*|başarısız\p{L}*|tükendi|atladım|aceleyle|görmezden geldim|fark etmedim|abarttım|kaybettim|zorunda kaldı\p{L}*|\p{L}+(?:madan|meden) )/iu, 1],
  // bir plan: nasıl başlardı, kime sorardın?
  [/(ilk (?:ay|hafta|90 gün|hedef)\p{L}*|^önce [^;,.]{3,40}|\p{L}+(?:rdım|rdim|rdum|rdüm)\b)/iu, 2],
];

/**
 * Bir cevapta takip sorusu davet eden en fazla iki ifade, her türden en fazla bir tane.
 * Kuralların hiçbiri bir şey yakalamazsa, cevabın ilk yan cümlesi kurcalanacak şey olur;
 * cevapladığı soru ne hakkındaysa o türden (`fallback`: 0 başarı, 1 hata, 2 plan).
 */
export function hooksIn(answer: string, fallback?: HookKind): Hook[] {
  const out: Hook[] = [];
  for (const [re, kind] of HOOK_RULES) {
    if (out.some((h) => h.kind === kind)) continue;
    const m = re.exec(answer);
    if (!m) continue;
    const start = m.index;
    const end = start + m[0].trimEnd().length;
    if (out.some((h) => start < h.end && end > h.start)) continue;
    out.push({ start, end, kind });
    if (out.length === 2) break;
  }
  if (!out.length && fallback !== undefined) {
    const clause = /^[^;,.]{8,80}/u.exec(answer);
    if (clause) out.push({ start: 0, end: clause[0].trimEnd().length, kind: fallback });
  }
  return out.sort((a, b) => a.start - b.start);
}

/* ── Notlar ────────────────────────────────────────────────────────────────────────────── */

/** Birini savunurken yazdığın bir cümlenin değeri. */
export type NoteTag = 'concrete' | 'general' | 'vague' | 'redflag';

export const NOTE_TAG_NAME: Record<NoteTag, string> = {
  concrete: 'somut',
  general: 'genel',
  vague: 'belirsiz',
  redflag: 'dikkat',
};

/** Kurulun önünde her not türünün kanıt ağırlığı. */
export const NOTE_WEIGHT: Record<NoteTag, number> = { concrete: 2, general: 1, vague: 0, redflag: -1 };

export function tagNote(sentence: string): NoteTag {
  if (/(gereksiz|hepsi\.|payım mı|paylaşamıyorum|hatırlayamadım|küçümse|umurumda)/iu.test(sentence)) return 'redflag';
  if (/(inanın|çok etkiliydi|galiba|sanırım|bir şekilde|hızlı öğrenirim|merak etmeyin)/iu.test(sentence)) return 'vague';
  // bir rakam (sayıyla ya da yazıyla), bir önce/sonra, bir ölçüm ya da bir denetim
  if (/(\d|%|yarıya|sıfırla|ölçt|denetim\p{L}*|test yaz|(?:iki|üç|dört|beş|altı|on|yarım) (?:gün|saat|hafta|ay|yıl|kat)|(?:indi|düştü|kısaldı|azaldı|kalktı)\b)/iu.test(sentence)) return 'concrete';
  return 'general';
}

/** Cümlelerine bölünmüş bir cevap; her cümle cevaptaki yerini korur. */
export function sentencesOf(answer: string): { text: string; start: number }[] {
  const out: { text: string; start: number }[] = [];
  // cümle . ! ? … ve ardından boşluk ya da sonla biter; "12.50" ya da "1,2" içinde değil
  const re = /.+?(?:[.!?…]+(?=\s|$)|$)\s*/gsu;
  for (let m = re.exec(answer); m; m = re.exec(answer)) if (m[0].trim()) out.push({ text: m[0], start: m.index });
  return out;
}

/* ── Kısa kodlama vakası ───────────────────────────────────────────────────────────────── */

export interface CodeCase {
  title: string;
  code: string;
  /** Adayın vakayı nasıl çözdüğü, gerçekte ne kadar iyi olduğuna göre. */
  answers: Record<'strong' | 'solid' | 'unsure' | 'weak', string>;
}

/*
 * Ümit'in sorusu bir kod bilmecesi değil, bir iş anı: herkesin anlayacağı, baskı altında ne
 * yaptığını gösteren bir durum. Oyuncunun yazılım bilmesi gerekmez; cevabın nasıl kurulduğuna bakar.
 */
export const CODE_CASES: CodeCase[] = [
  {
    title: 'Cuma akşamı arıza',
    code: 'Cuma 17:30. Bir müşteri, sizin yaptığınız değişiklikten sonra ödeme alamadığını yazıyor. Ekip lideriniz izinde, telefonu kapalı. Ne yaparsınız?',
    answers: {
      strong: 'Önce müşteriye "gördük, ilgileniyoruz" derim ki beklemesin. Değişikliğimi geri alıp ödemenin düzeldiğini kendim denerim. Sonra ekibe ne olduğunu, ne yaptığımı yazarım; Pazartesi de bunun neden olduğunu birlikte konuşuruz.',
      solid: 'Değişikliği geri alırdım, ödemenin çalıştığını kontrol ederdim. Ekip liderine de mesajla durumu yazardım, döndüğünde görsün.',
      unsure: 'Açıkçası panik olurdum… Herhalde birilerini aramaya çalışırdım. Ekip liderinin numarasından başka birine ulaşmaya çalışırdım.',
      weak: 'Ekip lideri izindeyse Pazartesi bakılır diye düşünürdüm; kendi başıma bir şeye dokunup işi büyütmek istemezdim.',
    },
  },
  {
    title: 'İmkânsız teslim tarihi',
    code: 'Yöneticiniz, iki haftalık bir işi üç günde bitirmenizi istiyor ve "herkes yapıyor" diyor. Ne dersiniz?',
    answers: {
      strong: 'Hayır demeden önce işi parçalara ayırırım: üç günde neyi sağlam teslim edebilirim, neyi edemem. Bunu yöneticime net söylerim ve seçeneği ona bırakırım; aceleyle yarım iş vermem.',
      solid: 'Üç günde neyin yetişebileceğini çıkarır, gerisini sonraya bırakmayı önerirdim. Gizlice gece yarısına kadar çalışıp yetiştirmeye çalışmazdım.',
      unsure: 'Herhalde denerdim… Fazla mesai yapıp yetiştirmeye çalışırdım. Olmazsa son gün söylerdim.',
      weak: 'Yönetici istiyorsa yapılır. Gerekirse hafta sonu çalışırım, sorun değil.',
    },
  },
  {
    title: 'Ekip arkadaşının hatası',
    code: 'Bir ekip arkadaşınızın hatası yüzünden siz suçlanıyorsunuz. Toplantıda herkes size bakıyor. Ne yaparsınız?',
    answers: {
      strong: 'Toplantıda kimseyi işaret etmem; "sorunu çözelim, nasıl olduğuna sonra bakarız" derim. Sonra arkadaşımla yalnız konuşurum, birlikte yöneticiye ne olduğunu anlatırız. Amaç suçlu bulmak değil, tekrar olmaması.',
      solid: 'O an tartışmazdım. Toplantıdan sonra arkadaşımla konuşur, durumu birlikte düzeltmeyi önerirdim.',
      unsure: 'Zor bir durum… Herhalde susardım, sonra belki yöneticiye özelden anlatırdım.',
      weak: 'Hemen orada açıklardım; benim hatam değilse üstüme almam, kimin yaptığını söylerdim.',
    },
  },
];

type Tier = 'strong' | 'solid' | 'unsure' | 'weak';
const tier = (fit: number): Tier => (fit >= 5 ? 'strong' : fit === 4 ? 'solid' : fit === 3 ? 'unsure' : 'weak');

/** Aynı gündeki her aday farklı bir vaka alır (kapanış sorusu gibi). */
export function caseFor(id: string, day: readonly string[]): CodeCase {
  const order = [...day].sort();
  const start = order.reduce((n, x) => n + hash(x), 0) % CODE_CASES.length;
  return CODE_CASES[(start + Math.max(0, order.indexOf(id))) % CODE_CASES.length];
}

export function caseAnswer(id: string, c: CodeCase): string {
  if (id === 'ozan') return `${c.answers.strong} Gerçi bu tür durumlar genelde ekipteki zayıf halkalardan çıkar.`;
  if (id === 'volkan') return 'Böyle durumları genelde ekip hallediyordu, ben daha çok büyük resme bakıyordum. Ama yönetilir, zor bir şey değil.';
  return c.answers[tier(fitOf(id))];
}

/** Ekip liderinin vakadan çıkardığı. */
export function caseVerdict(id: string): string {
  if (id === 'volkan') return 'Duruma hiç girmedi; "ekip hallederdi" dedi.';
  // işini bilir; sorun durumda değil, ekibe bakışında
  if (id === 'ozan') return 'Durumu iyi yönetti; anlatırken ekibi küçümsedi.';
  const t = tier(fitOf(id));
  return t === 'strong' ? 'Baskı altında sakin; önce müşteriyi, sonra ekibi düşündü.' : t === 'solid' ? 'Mantıklı bir yol çizdi.' : t === 'unsure' ? 'Durumda bocaladı.' : 'Durumu sahiplenmedi.';
}

/* ── Maaş ──────────────────────────────────────────────────────────────────────────────── */

export type SalaryMove = 'match' | 'cap' | 'low' | 'pass' | 'squeeze';

/** Konuşmanın sonucu: neyin üzerinde anlaşıldığı (ya da anlaşılmadığı) ve puanları nasıl oynattığı. */
export interface SalaryResult {
  move: SalaryMove;
  /** Anlaşılan aylık tutar ya da aday o tutara inmediyse null. */
  agreed: number | null;
  /** Adayın karşılık olarak söylediği. */
  reply: string;
  effect: { performans: number; vicdan: number };
}

/** Birinin isteğinin ne kadar altına ikna edilebileceği; ne kadar güçlüyse o kadar az verir. */
const GIVE: Record<'strong' | 'solid' | 'unsure' | 'weak', number> = { strong: 0.06, solid: 0.12, unsure: 0.2, weak: 0.3 };

export const expectedSalary = (id: string) => salaryOf(id);

/** 2026 net asgari ücret (aylık, TL). Hiçbir teklif bunun altına inemez. */
export const MIN_WAGE = 28075;
/** Teklifler 500 TL'lik adımlarla yazılır; asgari ücretin üstündeki ilk adım. */
const MIN_OFFER = Math.ceil(MIN_WAGE / 500) * 500;

/** İsteğin bütçeye sığıp sığmamasına göre masadaki hamleler. */
export function salaryMoves(id: string): SalaryMove[] {
  const ask = expectedSalary(id);
  if (ask === null) return ['match'];
  if (ask > SALARY_CAP) return ['cap', 'low', 'pass'];
  // asgari ücrete yakın bir beklentiden aşağı pazarlık edilemez
  return salaryOffer(id, 'squeeze')! < ask ? ['match', 'squeeze'] : ['match'];
}

export function salaryOffer(id: string, move: SalaryMove): number | null {
  const ask = expectedSalary(id);
  if (ask === null) return null;
  return {
    match: ask,
    pass: ask,
    cap: SALARY_CAP,
    low: Math.round((SALARY_CAP * 0.88) / 500) * 500,
    squeeze: Math.max(MIN_OFFER, Math.round((ask * 0.9) / 500) * 500),
  }[move];
}

export function salaryTalk(id: string, move: SalaryMove): SalaryResult {
  const ask = expectedSalary(id);
  const offer = salaryOffer(id, move);
  const first = candidateOf(id).name.split(' ')[0];
  const tl = (n: number) => `${n.toLocaleString('tr-TR')} TL`;
  if (ask === null || offer === null) {
    return { move, agreed: null, reply: 'Rakamı size bırakıyorum; ilanda yazan aralık benim için uygun.', effect: { performans: 0, vicdan: 0 } };
  }
  if (move === 'match') return { move, agreed: ask, reply: 'Teşekkür ederim, bu benim için uygun.', effect: { performans: 0, vicdan: 0 } };
  if (move === 'pass') return { move, agreed: ask, reply: `Anladım. ${tl(ask)} benim alt sınırım; kararı sizin kurulunuz verir.`, effect: { performans: 0, vicdan: 0 } };
  const cut = 1 - offer / ask;
  const accepts = cut <= GIVE[tier(fitOf(id))];
  const effect = move === 'cap' ? { performans: 1, vicdan: 0 } : move === 'low' ? { performans: accepts ? 2 : 0, vicdan: -1 } : { performans: accepts ? 1 : 0, vicdan: -1 };
  if (accepts) {
    const reply =
      move === 'cap'
        ? `${tl(offer)} olabilir. Bütçenin sınırlı olduğunu anlıyorum.`
        : move === 'low'
          ? `…Beklediğimin epey altında ama işe ihtiyacım var. ${tl(offer)}, tamam.`
          : `Peki, ${tl(offer)} ile başlayabilirim.`;
    return { move, agreed: offer, reply, effect };
  }
  const reply =
    move === 'low'
      ? `Bu rakam deneyimimin karşılığı değil, ${first} olarak bunu kabul edemem. Beklentim ${tl(ask)}.`
      : `Üzgünüm, ${tl(offer)} benim için mümkün değil. Beklentim ${tl(ask)}; bunun altına inemem.`;
  return { move, agreed: null, reply, effect };
}

/* ── Puan kartı ────────────────────────────────────────────────────────────────────────── */

export const CRITERIA = ['Teknik yetkinlik', 'Somut deneyim', 'İletişim', 'Ekip uyumu'] as const;
export type Scores = Partial<Record<(typeof CRITERIA)[number], number>>;

export const average = (s: Scores | undefined) => {
  const v = Object.values(s ?? {}).filter((n): n is number => typeof n === 'number');
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

/**
 * Hakan Bey'in listesinin yazıldığı kişilere (kadınlar, 40 yaş ve üstü) diğerlerinden düşük
 * puan verdin mi? Söz etmeye değecek kadar büyükse farkı puan olarak döndürür, değilse null.
 */
export function scoreGap(scores: Record<string, Scores>, targets: (id: string) => boolean): number | null {
  const avg = (ids: string[]) => {
    const v = ids.map((id) => average(scores[id])).filter((n): n is number => n !== null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const ids = Object.keys(scores);
  const them = avg(ids.filter(targets));
  const rest = avg(ids.filter((id) => !targets(id)));
  if (them === null || rest === null) return null;
  const gap = rest - them;
  return gap >= 0.75 ? Math.round(gap * 10) / 10 : null;
}

/* ── Seçimini kurulun önünde savunmak ──────────────────────────────────────────────────── */

export const DEFENSE_THRESHOLD = 3;

/**
 * Birisi hakkındaki notlarının kurulun önünde ne kadar ağırlık taşıyacağı: savunmanın saydığı
 * gibi en iyi üçü (puan kartının ek puanı bunun üstüne gelir). Not alırken gösterilir; böylece
 * kural sonda değil, hâlâ işe yarayabilecekken öğrenilir.
 */
export function evidenceStrength(tags: NoteTag[]): number {
  return [...tags]
    .map((t) => NOTE_WEIGHT[t])
    .sort((a, b) => b - a)
    .slice(0, 3)
    .reduce((n, w) => n + w, 0);
}

/**
 * Gerekçen ekip liderini ikna ediyor mu? Önerdiğin kişi hakkındaki notlar ağırlıklarıyla
 * sayılır; puan kartın onu en üste koyuyorsa bir kez sayılır. Zayıf bir aday, notlar ne kadar
 * iyi görünürse görünsün işe savunularak sokulamaz.
 */
export function defenseHolds(id: string, notes: NoteTag[], scoredTop: boolean): { score: number; holds: boolean } {
  const score = notes.reduce((n, t) => n + NOTE_WEIGHT[t], 0) + (scoredTop ? 1 : 0);
  return { score, holds: score >= DEFENSE_THRESHOLD && fitOf(id) >= 3 };
}
