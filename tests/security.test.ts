/*
 * The game's promises about the player's data, held as tests: nothing leaves the page, all of
 * it sits under one prefix (so "verilerimi sil" reaches it), a save can't smuggle anything into
 * the game's state, and the published page's security policy is the same everywhere.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { CSP_DIRECTIVES, HEADER_ONLY_DIRECTIVES, TT_POLICY } from '../csp';
import { checkSave } from '../src/game/save';
import { STORAGE_PREFIX } from '../src/game/privacy';

const root = new URL('..', import.meta.url).pathname;
const srcFiles = readdirSync(join(root, 'src'), { recursive: true, encoding: 'utf8' })
  .filter((f) => /\.tsx?$/.test(f))
  .map((f) => ({ f, text: readFileSync(join(root, 'src', f), 'utf8') }));

test('oyun ağ üzerinden hiçbir şey göndermez', () => {
  // the only requests are the game's own music files (same origin, GET)
  const allowed = new Set(['audio/engineCore.ts', 'audio/audioEngine.ts']);
  const network = /\b(XMLHttpRequest|WebSocket|EventSource|sendBeacon|RTCPeerConnection)\b|\bfetch\s*\(/;
  const offenders = srcFiles.filter(({ f, text }) => network.test(text) && !allowed.has(f)).map(({ f }) => f);
  assert.deepEqual(offenders, []);
  for (const f of allowed) {
    const text = srcFiles.find((s) => s.f === f)!.text;
    assert.doesNotMatch(text, /fetch\s*\(\s*['"`]https?:/, `${f}: başka bir siteye istek`);
    assert.doesNotMatch(text, /method\s*:\s*['"](POST|PUT|PATCH)/i, `${f}: veri gönderen istek`);
  }
});

test('HTML metni koda dönüşmez', () => {
  const unsafe = /dangerouslySetInnerHTML|\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML|document\.write|\beval\s*\(|new Function\s*\(/;
  assert.deepEqual(srcFiles.filter(({ text }) => unsafe.test(text)).map(({ f }) => f), []);
});

test('tarayıcıda tutulan her şey oyunun önekiyle durur', () => {
  // every storage key is a constant: find them and check the prefix "verilerimi sil" clears
  const keys = srcFiles.flatMap(({ text }) => [...text.matchAll(/_KEY\s*=\s*'([^']+)'|\bKEY\s*=\s*'([^']+)'/g)].map((m) => m[1] ?? m[2]));
  assert.ok(keys.length >= 5, 'anahtarlar bulunamadı');
  assert.deepEqual(keys.filter((k) => !k.startsWith(STORAGE_PREFIX)), []);
  // and storage is never written with a literal key that would escape that check
  const literal = srcFiles.filter(({ text }) => /(local|session)Storage\.setItem\(\s*['"`]/.test(text)).map(({ f }) => f);
  assert.deepEqual(literal, []);
});

test('kayıttaki __proto__ ya da constructor oyunun durumuna geçmez', () => {
  const fresh = { phase: 'welcome', currentDayIndex: 0 };
  const evil = JSON.parse('{"phase":"briefing","currentDayIndex":1,"__proto__":{"performans":100},"constructor":{"x":1}}');
  const kept = checkSave(evil, fresh)!;
  assert.deepEqual(Object.keys(kept), ['phase', 'currentDayIndex']);
  assert.equal(Object.getPrototypeOf(kept), Object.prototype);
  assert.equal(({} as Record<string, unknown>).performans, undefined);
});

test('sayfadaki ve başlıktaki güvenlik politikası aynı', () => {
  const headers = readFileSync(join(root, 'public/_headers'), 'utf8');
  const line = /^\s*Content-Security-Policy:\s*(.+)$/m.exec(headers)?.[1];
  assert.ok(line, '_headers içinde Content-Security-Policy yok');
  assert.deepEqual(line.split(';').map((d) => d.trim()), [...CSP_DIRECTIVES, ...HEADER_ONLY_DIRECTIVES]);
  // the built page carries the same policy (vite.config.ts reads it from csp.ts)
  assert.match(readFileSync(join(root, 'vite.config.ts'), 'utf8'), /from '\.\/csp(\.ts)?'/);
});

test('politika dışarıya kapı açmaz', () => {
  const all = CSP_DIRECTIVES.join(' ');
  // no other site, no wildcard, no strings run as code
  assert.doesNotMatch(all, /https?:|\*|'unsafe-eval'/);
  assert.ok(CSP_DIRECTIVES.includes("script-src 'self'"));
  assert.ok(CSP_DIRECTIVES.includes("connect-src 'self'"));
  assert.ok(CSP_DIRECTIVES.includes("object-src 'none'"));
});

test('Trusted Types politikası yalnızca service worker adresine izin verir', () => {
  const sw = srcFiles.find(({ f }) => f === 'swUpdate.ts')!.text;
  assert.ok(sw.includes(`createPolicy('${TT_POLICY}'`), 'swUpdate.ts politikayı csp.ts adıyla kurmuyor');
  assert.match(sw, /if \(url !== SW_URL\) throw/);
  // no other file may create a policy
  assert.deepEqual(srcFiles.filter(({ f, text }) => f !== 'swUpdate.ts' && /createPolicy\s*\(/.test(text)).map(({ f }) => f), []);
});
