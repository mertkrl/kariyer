import { days } from './data/days';

/*
 * Random candidate pool.
 *
 * Every candidate has a "home" day in days.ts (the bias theme they were written for) and brings
 * that day's company questions along. Each new game reshuffles the week: every day keeps its
 * size, but a handful of candidates trade places with other days and each queue is shuffled,
 * so no two playthroughs meet the same people in the same order.
 */

const HOME_DAY: Record<string, number> = {};
days.forEach((day, index) => day.candidateIds.forEach((id) => (HOME_DAY[id] = index)));

/** Candidates whose CV answers were written for another day's questions than the day they now appear on. */
const QUESTION_DAY: Record<string, number> = { gokce: 3, kerem: 3, seda: 3, kaan: 1, tolga: 0, ece: 2 };
const CUSTOM_QUESTIONS: Record<string, string[]> = {
  okan: ['Neden bu şirkette çalışmak istiyorsunuz?', 'Sizi neden seçmeliyiz?'],
  onur: ['Uzun vadede bu şirkette kalmayı düşünüyor musunuz?', 'Kişisel hayatınız iş temponuzu etkiler mi?'],
};

/** The recurring characters of the week's story: they always appear on their own day. */
export const KEY_CAST = ['okan', 'kerem', 'derya', 'seda', 'tolga'];
/** Also never moved: the day's other story beats depend on them being there (Hakan Bey's Thursday pick). */
const FIXED = [...KEY_CAST, 'baris'];

/** The company questions a candidate answered in their CV. */
export function questionsFor(candidateId: string): string[] {
  return CUSTOM_QUESTIONS[candidateId] ?? days[QUESTION_DAY[candidateId] ?? HOME_DAY[candidateId] ?? 0].companyQuestions;
}

/** The authored lineups, used before a game starts (and as a fallback). */
export function defaultLineups(): string[][] {
  return days.map((day) => [...day.candidateIds]);
}

function shuffle<T>(list: T[], rand: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** A fresh week: same day sizes, ~⅓ of each day swapped with other days, every queue shuffled. */
export function makeLineups(rand: () => number = Math.random): string[][] {
  const lineups = defaultLineups();
  const workdays = lineups.map((_, i) => i).filter((i) => lineups[i].length > 0);
  const swaps = Math.round(workdays.reduce((n, i) => n + lineups[i].length, 0) / 3 / 2);
  for (let s = 0; s < swaps; s++) {
    const a = workdays[Math.floor(rand() * workdays.length)];
    let b = workdays[Math.floor(rand() * workdays.length)];
    if (a === b) b = workdays[(workdays.indexOf(a) + 1) % workdays.length];
    const ia = Math.floor(rand() * lineups[a].length);
    const ib = Math.floor(rand() * lineups[b].length);
    // the story's recurring characters never leave their day
    if (FIXED.includes(lineups[a][ia]) || FIXED.includes(lineups[b][ib])) continue;
    [lineups[a][ia], lineups[b][ib]] = [lineups[b][ib], lineups[a][ia]];
  }
  return lineups.map((l) => shuffle(l, rand));
}
