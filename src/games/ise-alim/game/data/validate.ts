/*
 * JSON'da duran veri için denetimler (candidates.json, candidateDetails.json). TypeScript bir JSON
 * dosyasının içini göremez; bu yüzden biçim oyun yüklenirken burada kontrol edilir: bir alandaki
 * yazım hatası ya da oyunun bilmediği bir değer, haftanın ortasında "undefined" olarak ortaya
 * çıkmak yerine adayı ve alanı söyleyerek hemen patlar.
 */

type Json = Record<string, unknown>;

export class DataError extends Error {}

const isRecord = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Tek bir kaydın denetleyicisi: alanları adıyla okur ve hangisinin yanlış olduğunu söyler. */
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
 * JSON dosyaları kayıtları başlıklar altında gruplar ("Gün 1 · …"), böylece oldukları gibi bir
 * senaryo gibi okunurlar; oyun ise aynı sırada tek düz bir harita ister.
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
