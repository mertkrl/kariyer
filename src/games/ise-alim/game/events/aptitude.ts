/*
 * Genel yetenek testinin puanı ve adayların cevap kâğıtları, ekrandan ayrı ve test edilebilir.
 * Süresi dolan soru yanlış sayılır. Adayların kâğıtları tohumdan üretilir: işini bilen aday
 * (yüksek `hireFit`) aklı başında cevabı seçmeye meyillidir ve anahtar bunu yanlış sayar;
 * uyumlu aday anahtarı tutturur. Puan 0–100 arası tek bir sayıdır.
 */
import { APTITUDE_QUESTIONS } from '../data/aptitudeTest';
import { candidateDetails } from '../data/candidateDetails';
import { rngFor } from '../lib/rng';

/** Perşembe kuralı: bunun altındaki puanlar mülakata çağrılmaz. */
export const APTITUDE_CUTOFF = 70;

/** Bir cevap: seçilen şıkkın sırası ya da süre dolduysa null. */
export type AptitudeAnswer = number | null;

export interface AptitudeResult {
  score: number;
  correct: number;
  /** Süresi dolan sorular. */
  timedOut: number;
  answers: AptitudeAnswer[];
  /** Testi ne kadar sürede bitirdi (saniye); bilinmiyorsa yok. */
  seconds?: number;
}

export function scoreAptitude(answers: AptitudeAnswer[]): AptitudeResult {
  let correct = 0;
  let timedOut = 0;
  const filled = APTITUDE_QUESTIONS.map((q, i) => {
    const a = answers[i] ?? null;
    if (a === null) timedOut++;
    else if (a === q.answer) correct++;
    return a;
  });
  return { score: Math.round((correct / APTITUDE_QUESTIONS.length) * 100), correct, timedOut, answers: filled };
}

/*
 * Elle yazılmış kâğıtlar: haftanın hikâyesi bunlara yaslanır. Sistemin gözdesi de müdürün yeğeni
 * de testi tutturur; disleksisi olan güçlü aday süreye yetişemez; bir güçlü aday da gerçekten
 * yüksek alır, çünkü test her zaman yanılmaz. Diğer herkes tohumdan üretilir.
 */
const key = (i: number) => APTITUDE_QUESTIONS[i].answer;
const sensible = (i: number) => APTITUDE_QUESTIONS[i].sensible;
interface Profile {
  answers: AptitudeAnswer[];
  /** Cevap kâğıdının altında platformun ya da başvurunun notu. */
  note?: string;
  /** Mülakatta test sorulduğunda adayın cevabı. */
  talk?: string;
}
const PROFILES: Record<string, Profile> = {
  // Hakan Bey'in yeğeni: tam puan, rekor sürede
  okan: {
    answers: APTITUDE_QUESTIONS.map((_, i) => key(i)),
    note: 'Tamamlama süresi: 3 dk 48 sn (ortalama: 6 dk 10 sn). Platform bu süreyi "olağanüstü" olarak işaretledi.',
    talk: 'Açıkçası benzer testleri daha önce çözmüştüm. Yani… ne istendiği belliydi. Dayım da bu tür testlerin önemli olduğunu söylemişti.',
  },
  // sistemin gözdesi: testin de gözdesi
  serkan: {
    answers: APTITUDE_QUESTIONS.map((_, i) => (i === 7 ? sensible(i) : key(i))),
    talk: 'Bu testlerin mantığını çözdüm: şirket ne duymak istiyorsa onu işaretliyorsunuz. Mülakatlarda da aynı şey geçerli, değil mi?',
  },
  // disleksi: ek süre istedi, platform vermedi; yetiştiği soruların çoğunu tutturur
  irem: {
    answers: APTITUDE_QUESTIONS.map((_, i) => ([0, 2, 3, 7, 9, 11].includes(i) ? null : [5, 6].includes(i) ? sensible(i) : key(i))),
    note: 'Başvuru formu: "Disleksi tanım var; okuma ağırlıklı testlerde ek süre talep ediyorum." Platform yanıtı: ek süre özelliği bu pakette yoktur.',
    talk: 'Disleksim var; formda ek süre istemiştim, verilmedi. Kronometre işlerken uzun bir mantık sorusunu okuyup yetiştiremiyorum; yarısı boş kaldı. Kod okurken de yazarken de böyle bir sorunum yok; çünkü orada kimse kronometre tutmuyor.',
  },
  // test bazen tutar: güçlü ve yüksek
  murat: {
    answers: APTITUDE_QUESTIONS.map((_, i) => ([1, 9].includes(i) ? sensible(i) : key(i))),
    talk: 'Ne istendiğini görünce onu işaretledim, açık konuşayım. İki soruda içim el vermedi. Bu tür testleri ciddiye almıyorum ama kaybetmek için de girmiyorum.',
  },
};

/** Adayın cevap kâğıdının altındaki not (varsa). */
export const aptitudeNote = (id: string) => PROFILES[id]?.note;

/** Tamamlama süresi ve platformun ona yapıştırdığı etiket. */
export function paceOf(result: AptitudeResult): { text: string; flag: string | null } | null {
  if (result.seconds === undefined) return null;
  const total = APTITUDE_QUESTIONS.reduce((n, q) => n + (q.seconds ?? 30), 0);
  const text = `${Math.floor(result.seconds / 60)} dk ${result.seconds % 60} sn`;
  if (result.seconds < total * 0.46) return { text, flag: 'Olağanüstü hızlı: platform "yüksek bilişsel çeviklik" olarak işaretledi.' };
  if (result.seconds >= total - 6) return { text, flag: 'Son saniyelerde teslim: platform "zaman yönetimi riski" notu düştü.' };
  return { text, flag: null };
}

/** Bir adayın bu haftaki cevap kâğıdı: aynı tohum, aynı kâğıt. */
export function candidateAptitude(id: string, seed: number): AptitudeResult {
  if (PROFILES[id]) return scoreAptitude(PROFILES[id].answers);
  const rand = rngFor(seed, `aptitude:${id}`);
  const fit = candidateDetails[id]?.hireFit ?? 3;
  // çoğu aday ne istendiğini bilir ve rahat geçer; işini gerçekten bilen ise bazı sorularda
  // anahtarın değil aklının cevabını verir ve eşiğe yaklaşır
  const sensibleRate = 0.02 + Math.max(0, fit - 3) * 0.12;
  // kimi testi dakikalar içinde bitirir, kimi son saniyeye kadar düşünür
  const pace = rand();
  const timeoutRate = pace > 0.85 ? 0.08 : 0.02;
  const result = scoreAptitude(
    APTITUDE_QUESTIONS.map((q) => {
      const r = rand();
      if (r < timeoutRate) return null;
      if (r < timeoutRate + sensibleRate) return q.sensible;
      if (r < timeoutRate + sensibleRate + 0.05) return Math.floor(rand() * q.options.length);
      return q.answer;
    }),
  );
  const total = APTITUDE_QUESTIONS.reduce((n, q) => n + (q.seconds ?? 30), 0);
  const seconds = pace < 0.2 ? Math.round(total * (0.35 + rand() * 0.1)) : pace > 0.85 ? total - Math.round(rand() * 6) : Math.round(total * (0.55 + rand() * 0.3));
  return { ...result, seconds };
}

/** Mülakatta test puanı sorulduğunda: soru ve adayın cevabı, kendi cevap kâğıdından. */
/** Cevap kâğıdı tohumdan gelen ama mülakattaki tavrı hikâyece belli adaylar. */
const TALKS: Record<string, (score: number) => string> = {
  // CV'si kusursuz, GitHub'ı boş: testi de sunum gibi çözer, içerik yok
  // iki yıl ara vermiş güçlü aday: testin neyi ölçtüğünü görmüş
  nehir: (score) => `${score} mi? Hiç şaşırmadım. "Hangisi diğerlerinden farklı" sorusunda Cumartesi dedim, çünkü Cumartesi iş günü değil. Anahtar başka bir şey bekliyormuş. Ben düşündüğümü yazdım.`,
  // Emre'nin ATS gözdesi: kendinden emin, testi ciddiye almamış
  cagan: () => 'Testin bir kısmını telefonda çözdüm, açıkçası çok önemsemedim. Gerçek iş performansını ölçtüğünü düşünmüyorum; ATS skorum zaten ortada.',
  sarp: () => 'Açıkçası pek hatırlamıyorum, hızlı geçtim. Bu tür testlerde ilk içgüdüme güvenirim; genelde de doğru çıkar. Puanım düşükse sistemde bir sorun olabilir.',
};

export function testTalk(id: string, seed: number): { question: string; answer: string } {
  const result = candidateAptitude(id, seed);
  const question = `Testte ${result.score} aldınız. Cevap kâğıdınıza baktım; bazı cevaplarınızı merak ettim. Nasıl düşündünüz?`;
  if (PROFILES[id]?.talk) return { question, answer: PROFILES[id].talk };
  if (TALKS[id]) return { question, answer: TALKS[id](result.score) };
  // aklı başında cevap verdiği sorulardan biri; aday başına farklısı, herkes aynı soruyu anmasın
  const sensibleOnes = APTITUDE_QUESTIONS.map((q, n) => (result.answers[n] === q.sensible ? n : -1)).filter((n) => n >= 0);
  const i = sensibleOnes.length ? sensibleOnes[[...id].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) % 9973, 7) % sensibleOnes.length] : -1;
  if (i >= 0) {
    const q = APTITUDE_QUESTIONS[i];
    return { question, answer: `"${q.options[q.sensible]}" dediğim soruyu hatırlıyorum. ${q.why}` };
  }
  if (result.timedOut > 0) return { question, answer: `Bazı sorulara süre yetmedi, açıkçası. Kronometre akarken bir trenin yolcularını düşünmek zor.` };
  return { question, answer: 'Bu testler hep aynı; doğru cevabı değil, beklenen cevabı seçiyorsunuz. Ben de ne beklendiğini tahmin ettim.' };
}
