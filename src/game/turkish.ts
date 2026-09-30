/*
 * Tiny Turkish case-suffix helpers for proper names (apostrophe + vowel harmony + buffer letter).
 */

const VOWELS = 'aıoueiöü';

function lastVowel(word: string) {
  const lower = word.toLocaleLowerCase('tr-TR');
  return [...lower].reverse().find((ch) => VOWELS.includes(ch)) ?? 'e';
}

function endsWithVowel(word: string) {
  return VOWELS.includes(word.toLocaleLowerCase('tr-TR').slice(-1));
}

const NARROW: Record<string, string> = { a: 'ı', ı: 'ı', o: 'u', u: 'u', e: 'i', i: 'i', ö: 'ü', ü: 'ü' };

/** Accusative (-(y)ı/i/u/ü): Nihan'ı, Ece'yi, Duygu'yu, Cem'i. */
export function accusative(name: string) {
  return `${name}'${endsWithVowel(name) ? 'y' : ''}${NARROW[lastVowel(name)]}`;
}

/** Genitive (-(n)ın/in/un/ün): Nihan'ın, Ece'nin, Duygu'nun, Cem'in. */
export function genitive(name: string) {
  return `${name}'${endsWithVowel(name) ? 'n' : ''}${NARROW[lastVowel(name)]}n`;
}

/** First name of a full name. */
export function firstName(fullName: string) {
  return fullName.split(' ')[0];
}
