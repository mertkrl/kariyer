/*
 * Checks for the data that lives in JSON (candidates.json, candidateDetails.json). TypeScript
 * can't see inside a JSON file, so the shape is checked here when the game loads: a typo in a
 * field or a value the game doesn't know fails at once, naming the candidate and the field,
 * instead of turning up as "undefined" halfway through a week.
 */

type Json = Record<string, unknown>;

export class DataError extends Error {}

const isRecord = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

/** One entry's checker: reads fields by name and says which one is wrong. */
export function fieldsOf(file: string, id: string, entry: unknown) {
  if (!isRecord(entry)) throw new DataError(`${file} → "${id}": kayıt bir nesne olmalı`);
  const fail = (key: string, want: string): never => {
    throw new DataError(`${file} → "${id}".${key}: ${want} bekleniyordu, ${JSON.stringify(entry[key])} bulundu`);
  };
  return {
    string(key: string, optional = false) {
      const v = entry[key];
      if (v === undefined && optional) return;
      if (typeof v !== 'string' || v === '') fail(key, 'dolu bir metin');
    },
    number(key: string, min: number, max: number) {
      const v = entry[key];
      if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) fail(key, `${min}–${max} arası bir tam sayı`);
    },
    boolean(key: string) {
      const v = entry[key];
      if (v !== undefined && typeof v !== 'boolean') fail(key, 'true ya da false');
    },
    oneOf(key: string, allowed: readonly string[], optional = false) {
      const v = entry[key];
      if (v === undefined && optional) return;
      if (typeof v !== 'string' || !allowed.includes(v)) fail(key, allowed.map((a) => `"${a}"`).join(' / '));
    },
    strings(key: string, opts: { optional?: boolean; length?: number } = {}) {
      const v = entry[key];
      if (v === undefined && opts.optional) return;
      if (!Array.isArray(v) || v.some((s) => typeof s !== 'string' || s === '') || (opts.length !== undefined && v.length !== opts.length)) {
        fail(key, opts.length ? `${opts.length} metinlik bir liste` : 'metin listesi');
      }
    },
    record(key: string, keys: readonly string[]) {
      const v = entry[key];
      if (!isRecord(v) || keys.some((k) => typeof v[k] !== 'string' || v[k] === '')) fail(key, `${keys.join(', ')} alanları olan bir nesne`);
    },
    list(key: string, each: (item: unknown, i: number) => void) {
      const v = entry[key];
      if (!Array.isArray(v)) fail(key, 'liste');
      (v as unknown[]).forEach(each);
    },
    unknownKeys(known: readonly string[]) {
      const extra = Object.keys(entry).filter((k) => !known.includes(k));
      if (extra.length) throw new DataError(`${file} → "${id}": tanınmayan alan(lar): ${extra.join(', ')}`);
    },
  };
}

/**
 * The JSON files group entries under headings ("Gün 1 · …") so they read like the script they
 * are; the game wants one flat map, in the same order.
 */
export function flattenSections(file: string, sections: unknown): Record<string, unknown> {
  if (!isRecord(sections)) throw new DataError(`${file}: başlıklara ayrılmış bir nesne olmalı`);
  const out: Record<string, unknown> = {};
  for (const [heading, entries] of Object.entries(sections)) {
    if (!isRecord(entries)) throw new DataError(`${file} → "${heading}": adaylar bir nesne içinde olmalı`);
    for (const [id, entry] of Object.entries(entries)) {
      if (id in out) throw new DataError(`${file}: "${id}" iki kez tanımlı`);
      out[id] = entry;
    }
  }
  return out;
}
