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
    talk: 'Disleksim var; formda ek süre istemiştim, verilmedi. Otuz saniyede uzun bir mantık sorusunu okuyamıyorum. Kod okurken de yazarken de böyle bir sorunum yok; çünkü orada kimse kronometre tutmuyor.',
  },
  // test bazen tutar: güçlü ve yüksek
  murat: {
    answers: APTITUDE_QUESTIONS.map((_, i) => ([1, 9].includes(i) ? sensible(i) : key(i))),
    talk: 'Ne istendiğini görünce onu işaretledim, açık konuşayım. İki soruda içim el vermedi. Bu tür testleri ciddiye almıyorum ama kaybetmek için de girmiyorum.',
  },
};

/** Adayın cevap kâğıdının altındaki not (varsa). */
export const aptitudeNote = (id: string) => PROFILES[id]?.note;

/** Bir adayın bu haftaki cevap kâğıdı: aynı tohum, aynı kâğıt. */
export function candidateAptitude(id: string, seed: number): AptitudeResult {
  if (PROFILES[id]) return scoreAptitude(PROFILES[id].answers);
  const rand = rngFor(seed, `aptitude:${id}`);
  const fit = candidateDetails[id]?.hireFit ?? 3;
  // işini bilen, soruyu ciddiye alır; uyumlu olan, ne istendiğini bilir
  const sensibleRate = 0.1 + fit * 0.09;
  return scoreAptitude(
    APTITUDE_QUESTIONS.map((q) => {
      const r = rand();
      if (r < 0.06) return null;
      if (r < 0.06 + sensibleRate) return q.sensible;
      if (r < 0.06 + sensibleRate + 0.1) return Math.floor(rand() * q.options.length);
      return q.answer;
    }),
  );
}

/** Mülakatta test puanı sorulduğunda: soru ve adayın cevabı, kendi cevap kâğıdından. */
export function testTalk(id: string, seed: number): { question: string; answer: string } {
  const result = candidateAptitude(id, seed);
  const question = `Testte ${result.score} aldınız. Cevap kâğıdınıza baktım; bazı cevaplarınızı merak ettim. Nasıl düşündünüz?`;
  if (PROFILES[id]?.talk) return { question, answer: PROFILES[id].talk };
  const i = APTITUDE_QUESTIONS.findIndex((q, n) => result.answers[n] === q.sensible);
  if (i >= 0) {
    const q = APTITUDE_QUESTIONS[i];
    return { question, answer: `"${q.options[q.sensible]}" dediğim soruyu hatırlıyorum. ${q.why}` };
  }
  if (result.timedOut > 0) return { question, answer: `Bazı sorulara süre yetmedi, açıkçası. Otuz saniyede bir trenin yolcularını düşünmek zor.` };
  return { question, answer: 'Bu testler hep aynı; doğru cevabı değil, beklenen cevabı seçiyorsunuz. Ben de ne beklendiğini tahmin ettim.' };
}
