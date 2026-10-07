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

/** Bir adayın bu haftaki cevap kâğıdı: aynı tohum, aynı kâğıt. */
export function candidateAptitude(id: string, seed: number): AptitudeResult {
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
