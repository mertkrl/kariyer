/*
 * Genişletilmiş CV verisi + final turu mülakat cevapları.
 *
 * `hireFit` (1–5) oyuncudan gizlidir: kişinin işe alındıktan sonra gerçekte nasıl çalıştığıdır.
 * Mülakat cevapları bunu ortaya çıkaracak şekilde yazılmıştır: somut, sahiplenilmiş, ölçülebilir
 * cevaplar güçlü adaylardan; moda sözcükler ve konuyu saptırma zayıflardan gelir; algoritmanın
 * CV'lerine ne puan verdiğinden bağımsız olarak.
 *
 * Kayıtlar candidateDetails.json'da, günün başlığı altında durur; oyun yüklenirken denetlenir.
 */

import { EXTRA_DETAILS } from './extraCandidates';
import data from './candidateDetails.json' with { type: 'json' };
import { fieldsOf, flattenSections } from './validate';

export interface WorkEntry {
  period: string;
  title: string;
  company: string;
  note: string;
}

export interface CandidateDetails {
  location: string;
  languages: string;
  workHistory: WorkEntry[];
  highlights: string[];
  /** FINAL_INTERVIEW_QUESTIONS'a sırasıyla verilen cevaplar. */
  interview: [string, string, string];
  hireFit: 1 | 2 | 3 | 4 | 5;
}

export const FINAL_INTERVIEW_QUESTIONS: [string, string, string] = [
  'Sizi bu işe en uygun kılan, somut ve ölçülebilir bir başarınızı anlatır mısınız?',
  'Yaptığınız bir hatayı ve ondan ne öğrendiğinizi anlatır mısınız?',
  'Bu pozisyonda ilk 90 gününüzde neyi değiştirirdiniz?',
];

/** candidateDetails.json'daki bir kaydı CandidateDetails biçimine göre denetler. */
export function checkDetails(id: string, entry: unknown): CandidateDetails {
  const f = fieldsOf('candidateDetails.json', id, entry);
  f.unknownKeys(['location', 'languages', 'workHistory', 'highlights', 'interview', 'hireFit']);
  f.string('location');
  f.string('languages');
  f.list('workHistory', (w, i) => {
    const e = fieldsOf('candidateDetails.json', `${id}.workHistory[${i}]`, w);
    e.unknownKeys(['period', 'title', 'company', 'note']);
    (['period', 'title', 'company', 'note'] as const).forEach((k) => e.string(k));
  });
  f.strings('highlights');
  f.strings('interview', { length: FINAL_INTERVIEW_QUESTIONS.length });
  f.number('hireFit', 1, 5);
  return entry as CandidateDetails;
}

export const candidateDetails: Record<string, CandidateDetails> = Object.fromEntries(
  Object.entries(flattenSections('candidateDetails.json', data)).map(([id, entry]) => [id, checkDetails(id, entry)]),
);

// ek yığının CV'leri ve mülakat cevapları
Object.assign(candidateDetails, EXTRA_DETAILS);
