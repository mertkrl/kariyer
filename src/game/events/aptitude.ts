/*
 * Genel yetenek testinin puanı, ekrandan ayrı ve test edilebilir. Süresi dolan soru yanlış
 * sayılır; kişilik maddeleri "kültüre uyum" anahtarıyla puanlanır. Sonuç 0–100 arası tek bir
 * sayıdır ve Perşembe adayların puanlarıyla aynı tabloda, aynı eşiğin önünde durur.
 */
import { APTITUDE_QUESTIONS } from '../data/aptitudeTest';

/** Perşembe kuralı: bunun altındaki puanlar mülakata çağrılmaz. */
export const APTITUDE_CUTOFF = 70;

/** Bir cevap: seçilen şıkkın sırası ya da süre dolduysa null. */
export type AptitudeAnswer = number | null;

export interface AptitudeResult {
  score: number;
  correct: number;
  /** Süresi dolan sorular. */
  timedOut: number;
}

export function scoreAptitude(answers: AptitudeAnswer[]): AptitudeResult {
  let correct = 0;
  let timedOut = 0;
  APTITUDE_QUESTIONS.forEach((q, i) => {
    const a = answers[i] ?? null;
    if (a === null) timedOut++;
    else if (a === q.answer) correct++;
  });
  return { score: Math.round((correct / APTITUDE_QUESTIONS.length) * 100), correct, timedOut };
}
