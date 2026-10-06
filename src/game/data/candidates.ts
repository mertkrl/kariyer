import type { Candidate, Decision, EvaluatedField, StoryRole, SystemVerdict } from '../types';
import { EXTRA_CANDIDATES } from './extraCandidates';
import data from './candidates.json' with { type: 'json' };
import { fieldsOf, flattenSections } from './validate';

/*
 * The candidates' CVs live in candidates.json, grouped under the day's heading, so they can be
 * written and edited as text without touching code. They are checked here as the game loads.
 */

const VERDICTS: readonly SystemVerdict[] = ['priority', 'review', 'low', 'out'];
const FIELDS: readonly EvaluatedField[] = ['experience', 'salary', 'skills', 'motivation', 'questions'];
const ROLES: readonly StoryRole[] = ['nephew', 'neighbour'];
const DECISIONS: readonly Decision[] = ['approve', 'reject'];
const KEYS = [
  'id', 'name', 'initials', 'color', 'age', 'role', 'experience', 'salary', 'skills', 'motivation', 'education', 'references',
  'previousCompany', 'certifications', 'activities', 'companyAnswers', 'internalNote', 'verdict', 'systemLine', 'flagIsFair',
  'storyRole', 'outcomeNote', 'flaggedField',
];
const TEXT = ['name', 'initials', 'color', 'role', 'experience', 'salary', 'skills', 'motivation', 'education', 'references', 'previousCompany', 'certifications', 'internalNote', 'systemLine'];

/** Checks one entry of candidates.json against the Candidate shape. */
export function checkCandidate(id: string, entry: unknown): Candidate {
  const f = fieldsOf('candidates.json', id, entry);
  f.unknownKeys(KEYS);
  f.oneOf('id', [id]);
  TEXT.forEach((k) => f.string(k));
  f.number('age', 16, 80);
  f.strings('activities', { optional: true });
  f.strings('companyAnswers');
  f.oneOf('verdict', VERDICTS);
  f.boolean('flagIsFair');
  f.oneOf('storyRole', ROLES, true);
  f.record('outcomeNote', DECISIONS);
  f.oneOf('flaggedField', FIELDS);
  return entry as Candidate;
}

export const candidates: Record<string, Candidate> = Object.fromEntries(
  Object.entries(flattenSections('candidates.json', data)).map(([id, entry]) => [id, checkCandidate(id, entry)]),
);

// the files Hakan Bey finds when you finish early (see extraCandidates.ts)
Object.assign(candidates, EXTRA_CANDIDATES);

/**
 * The candidate behind an id. Ids come from lineups, decisions and saves, so a wrong one is a
 * bug or a stale save: it fails here, by name, instead of as "undefined" somewhere downstream.
 */
export function candidateOf(id: string): Candidate {
  const c = candidates[id];
  if (!c) throw new Error(`Bilinmeyen aday kimliği: "${id}"`);
  return c;
}

function holderOf(role: StoryRole): string {
  const holders = Object.values(candidates).filter((c) => c.storyRole === role);
  if (holders.length !== 1) throw new Error(`"${role}" rolünde tam bir aday olmalı, ${holders.length} bulundu`);
  return holders[0].id;
}

/** The manager's nephew. */
export const NEPHEW_ID = holderOf('nephew');
/** Your mother's neighbour's son — your own "reference". */
export const NEIGHBOUR_ID = holderOf('neighbour');
