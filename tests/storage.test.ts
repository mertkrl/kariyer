import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readChecked, readJson, readText, removeKey, writeJson, writeText } from '../src/shared/storage';

// Tarayıcıdaki depo: bellekte bir Map. Testler hem çalışan hem de kullanılamayan depoyu dener.
class MemoryStorage {
  map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  key = (i: number) => [...this.map.keys()][i] ?? null;
  getItem = (k: string) => this.map.get(k) ?? null;
  setItem = (k: string, v: string) => void this.map.set(k, String(v));
  removeItem = (k: string) => void this.map.delete(k);
  clear = () => this.map.clear();
}
const w = globalThis as unknown as { window: { localStorage: unknown } };
let mem: MemoryStorage;
beforeEach(() => {
  mem = new MemoryStorage();
  w.window = { ...(w.window ?? {}), localStorage: mem } as typeof w.window;
});

const isNum = (v: unknown): v is { n: number } => typeof v === 'object' && v !== null && typeof (v as { n?: unknown }).n === 'number';

test('metin ve JSON yazılır, okunur, silinir', () => {
  writeText('kariyerweb-a', 'x');
  writeJson('kariyerweb-b', { n: 1 });
  assert.equal(readText('kariyerweb-a'), 'x');
  assert.deepEqual(readJson('kariyerweb-b'), { n: 1 });
  removeKey('kariyerweb-a');
  assert.equal(readText('kariyerweb-a'), null);
});

test('bozuk JSON ve doğrulamadan geçmeyen kayıt null', () => {
  mem.setItem('kariyerweb-c', '{bozuk');
  assert.equal(readJson('kariyerweb-c'), null);
  writeJson('kariyerweb-d', { n: 'bir' });
  assert.equal(readChecked('kariyerweb-d', isNum), null);
});

test('eski anahtar çevrilip yeni anahtara taşınır, eskisi silinir', () => {
  writeJson('kariyerweb-x-v1', { count: 7 });
  const got = readChecked('kariyerweb-x-v2', isNum, [{ key: 'kariyerweb-x-v1', convert: (old) => ({ n: (old as { count: number }).count }) }]);
  assert.deepEqual(got, { n: 7 });
  assert.deepEqual(readJson('kariyerweb-x-v2'), { n: 7 });
  assert.equal(readText('kariyerweb-x-v1'), null);
});

test('çevrilemeyen eski kayıt yalnızca silinir; yeni kayıt varken eskisine dokunulmaz', () => {
  writeJson('kariyerweb-y-v1', { eski: true });
  assert.equal(readChecked('kariyerweb-y-v2', isNum, [{ key: 'kariyerweb-y-v1' }]), null);
  assert.equal(readText('kariyerweb-y-v1'), null);
  writeJson('kariyerweb-z-v2', { n: 2 });
  writeJson('kariyerweb-z-v1', { n: 1 });
  assert.deepEqual(readChecked('kariyerweb-z-v2', isNum, [{ key: 'kariyerweb-z-v1' }]), { n: 2 });
});

test('depo kullanılamazsa okuma boş, yazma sessiz', () => {
  Object.defineProperty(w.window, 'localStorage', {
    get() {
      throw new Error('SecurityError');
    },
    configurable: true,
  });
  assert.equal(readText('kariyerweb-a'), null);
  assert.doesNotThrow(() => writeJson('kariyerweb-a', { n: 1 }));
  assert.doesNotThrow(() => removeKey('kariyerweb-a'));
});
