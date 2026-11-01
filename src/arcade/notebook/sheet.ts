/*
 * Patron tablosunun hesabı: küçük bir hesap tablosu motoru. Hücrelerde düz yazı, sayı ya da "=" ile
 * başlayan formül durur. Formüllerde sayılar, metin ("..."), hücre başvuruları (B2), aralıklar
 * (B2:B15), + − * /, karşılaştırmalar (> < >= <= = <>) ve birkaç işlev vardır: TOPLA, ORTALAMA,
 * YUVARLA, EĞER, MAK, MİN (İngilizce adlarıyla da). Bağımsız değişkenler Türkçe tablolardaki gibi
 * ";" ile ayrılır. Döngüye giren formül #DÖNGÜ!, sıfıra bölme #SAYI/0!, bozuk formül #HATA! verir.
 * Saf mantıktır, test edilebilir.
 */

export type Cells = Record<string, string>;
export type Value = number | string;

export const COLS = 26;
export const ROWS = 60;

export const colName = (c: number) => String.fromCharCode(65 + c);
export const refOf = (c: number, r: number) => `${colName(c)}${r + 1}`;

/** "B12" → [1, 11]; geçersizse null. */
export function parseRef(ref: string): [number, number] | null {
  const m = /^([A-Z])(\d+)$/.exec(ref.toUpperCase());
  if (!m) return null;
  return [m[1].charCodeAt(0) - 65, Number(m[2]) - 1];
}

/** Kullanıcının yazdığı sayı: "1234", "1.234", "1234,5", "1.234,5", "-12". Sayı değilse null. */
export function parseNumber(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, '');
  if (!t) return null;
  const tr = /^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t) ? t.replace(/\./g, '').replace(',', '.') : t.replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(tr)) return null;
  return Number(tr);
}

class SheetError extends Error {}

const FUNCS: Record<string, (args: Value[][]) => Value> = {
  TOPLA: (a) => nums(a.flat()).reduce((s, x) => s + x, 0),
  ORTALAMA: (a) => {
    const n = nums(a.flat());
    if (!n.length) throw new SheetError('#SAYI/0!');
    return n.reduce((s, x) => s + x, 0) / n.length;
  },
  YUVARLA: (a) => {
    const x = num(a[0]?.[0]);
    const d = a[1] ? num(a[1][0]) : 0;
    const k = 10 ** d;
    return Math.round(x * k) / k;
  },
  EĞER: (a) => (truthy(a[0]?.[0]) ? (a[1]?.[0] ?? '') : (a[2]?.[0] ?? '')),
  MAK: (a) => Math.max(...nums(a.flat())),
  MİN: (a) => Math.min(...nums(a.flat())),
};
const ALIAS: Record<string, string> = { SUM: 'TOPLA', AVERAGE: 'ORTALAMA', ROUND: 'YUVARLA', IF: 'EĞER', EGER: 'EĞER', MAX: 'MAK', MIN: 'MİN' };

const num = (v: Value | undefined): number => {
  if (typeof v === 'number') return v;
  if (v === undefined || v === '') return 0;
  const n = parseNumber(v);
  if (n === null) throw new SheetError('#DEĞER!');
  return n;
};
const nums = (vs: Value[]) => vs.filter((v) => typeof v === 'number' || parseNumber(String(v)) !== null).map(num);
const truthy = (v: Value | undefined) => (typeof v === 'number' ? v !== 0 : !!v && v !== '0');

/** Formülü (başındaki "=" olmadan) okuyup değerini bulur; `get` başvurulan hücrenin değerini verir. */
function evaluate(src: string, get: (c: number, r: number) => Value): Value {
  let i = 0;
  const peek = () => src[i];
  const skip = () => {
    while (src[i] === ' ') i++;
  };
  const expect = (ch: string) => {
    skip();
    if (src[i] !== ch) throw new SheetError('#HATA!');
    i++;
  };

  const range = (a: string, b: string): Value[] => {
    const p = parseRef(a);
    const q = parseRef(b);
    if (!p || !q) throw new SheetError('#BAŞV!');
    const out: Value[] = [];
    for (let r = Math.min(p[1], q[1]); r <= Math.max(p[1], q[1]); r++) for (let c = Math.min(p[0], q[0]); c <= Math.max(p[0], q[0]); c++) out.push(get(c, r));
    return out;
  };

  const primary = (): Value => {
    skip();
    const ch = peek();
    if (ch === '(') {
      i++;
      const v = comparison();
      expect(')');
      return v;
    }
    if (ch === '"') {
      const end = src.indexOf('"', i + 1);
      if (end < 0) throw new SheetError('#HATA!');
      const s = src.slice(i + 1, end);
      i = end + 1;
      return s;
    }
    const n = /^\d+([.,]\d+)?/.exec(src.slice(i));
    if (n) {
      i += n[0].length;
      return Number(n[0].replace(',', '.'));
    }
    const w = /^[A-Za-zÇĞİÖŞÜçğıöşü]+\d*/.exec(src.slice(i));
    if (!w) throw new SheetError('#HATA!');
    i += w[0].length;
    const word = w[0].toLocaleUpperCase('tr-TR');
    skip();
    if (peek() === '(') {
      i++;
      const name = ALIAS[word] ?? word;
      const fn = FUNCS[name];
      if (!fn) throw new SheetError('#AD?');
      const args: Value[][] = [];
      skip();
      if (peek() !== ')') {
        for (;;) {
          skip();
          const m = /^([A-Z]\d+):([A-Z]\d+)/i.exec(src.slice(i));
          if (m) {
            i += m[0].length;
            args.push(range(m[1], m[2]));
          } else args.push([comparison()]);
          skip();
          if (peek() === ';' || peek() === ',') {
            i++;
            continue;
          }
          break;
        }
      }
      expect(')');
      return fn(args);
    }
    const ref = parseRef(word);
    if (!ref) throw new SheetError('#AD?');
    return get(ref[0], ref[1]);
  };

  const unary = (): Value => {
    skip();
    if (peek() === '-') {
      i++;
      return -num(unary());
    }
    if (peek() === '+') {
      i++;
      return num(unary());
    }
    return primary();
  };

  const term = (): Value => {
    let v = unary();
    for (;;) {
      skip();
      const op = peek();
      if (op !== '*' && op !== '/') return v;
      i++;
      const b = num(unary());
      if (op === '/' && b === 0) throw new SheetError('#SAYI/0!');
      v = op === '*' ? num(v) * b : num(v) / b;
    }
  };

  const additive = (): Value => {
    let v = term();
    for (;;) {
      skip();
      const op = peek();
      if (op !== '+' && op !== '-') return v;
      i++;
      const b = num(term());
      v = op === '+' ? num(v) + b : num(v) - b;
    }
  };

  const comparison = (): Value => {
    const a = additive();
    skip();
    const m = /^(>=|<=|<>|=|>|<)/.exec(src.slice(i));
    if (!m) return a;
    i += m[0].length;
    const b = additive();
    const [x, y] = typeof a === 'number' || typeof b === 'number' ? [num(a), num(b)] : [a, b];
    const ok = { '>=': x >= y, '<=': x <= y, '<>': x !== y, '=': x === y, '>': x > y, '<': x < y }[m[0]]!;
    return ok ? 1 : 0;
  };

  const v = comparison();
  skip();
  if (i < src.length) throw new SheetError('#HATA!');
  return v;
}

/** Bütün hücrelerin değerleri: formüller hesaplanır, sayılar sayıya çevrilir, döngü yakalanır. */
export function compute(cells: Cells): Record<string, Value> {
  const out: Record<string, Value> = {};
  const busy = new Set<string>();
  const value = (ref: string): Value => {
    if (ref in out) return out[ref];
    const raw = cells[ref] ?? '';
    if (!raw.startsWith('=')) {
      const n = parseNumber(raw);
      return (out[ref] = n ?? raw);
    }
    if (busy.has(ref)) throw new SheetError('#DÖNGÜ!');
    busy.add(ref);
    try {
      out[ref] = evaluate(raw.slice(1), (c, r) => value(refOf(c, r)));
    } catch (e) {
      if (!(e instanceof SheetError)) throw e;
      out[ref] = e.message;
    }
    busy.delete(ref);
    return out[ref];
  };
  for (const ref of Object.keys(cells)) value(ref);
  return out;
}

/** Hücrede görünen: sayı Türkçe biçimde (en çok iki ondalık), metin olduğu gibi. */
export const show = (v: Value | undefined) => (typeof v === 'number' ? (Number.isFinite(v) ? v.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) : '#SAYI!') : (v ?? ''));
