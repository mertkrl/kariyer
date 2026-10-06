/*
 * Extended CV data + final-round interview answers.
 *
 * `hireFit` (1–5) is hidden from the player: it is how the person actually performs once hired.
 * The interview answers are written to reveal it — concrete, owned, measurable answers come
 * from strong candidates; buzzwords and deflection from weak ones — regardless of how the
 * algorithm scored their CV.
 *
 * The entries live in candidateDetails.json, under the day's heading; they are checked as the
 * game loads.
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
  /** Answers to FINAL_INTERVIEW_QUESTIONS, in order. */
  interview: [string, string, string];
  hireFit: 1 | 2 | 3 | 4 | 5;
}

export const FINAL_INTERVIEW_QUESTIONS: [string, string, string] = [
  'Sizi bu işe en uygun kılan, somut ve ölçülebilir bir başarınızı anlatır mısınız?',
  'Yaptığınız bir hatayı ve ondan ne öğrendiğinizi anlatır mısınız?',
  'Bu pozisyonda ilk 90 gününüzde neyi değiştirirdiniz?',
];

/** Checks one entry of candidateDetails.json against the CandidateDetails shape. */
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

// the extra pile's CVs and interview answers
Object.assign(candidateDetails, EXTRA_DETAILS);
