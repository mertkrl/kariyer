import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NEIGHBOUR_ID, NEPHEW_ID, candidates } from '../src/game/data/candidates';
import { candidateDetails } from '../src/game/data/candidateDetails';
import { EXTRA_CANDIDATES, EXTRA_FEMALE } from '../src/game/data/extraCandidates';
import { days } from '../src/game/data/days';
import { REQUESTS } from '../src/game/data/phoneScript';
import { KEY_CAST, defaultLineups, makeLineups, questionsFor } from '../src/game/lineups';
import { rngFor } from '../src/game/rng';
import { jobDrafts, salaryText } from '../src/game/data/jobs';

/** Her kararın sistem satırını açtığı etiket. Puanlama `verdict`i okur; oyuncular satırı okur. */
const LABELS = {
  priority: ['Öncelikli'],
  review: ['Ek inceleme', 'Süreç devam'],
  low: ['Düşük öncelik'],
  out: ['Değerlendirme dışı'],
};

test('her adayın sistem satırı kendi önerisiyle açılır', () => {
  for (const c of Object.values(candidates)) {
    const label = /^Öneri: ([^·]+?) ·/.exec(c.systemLine)?.[1];
    assert.ok(label && LABELS[c.verdict].includes(label), `${c.id}: verdict "${c.verdict}", satır "${c.systemLine}"`);
  }
});

test('hikâye rolleri verideki adaylara bağlı', () => {
  assert.equal(candidates[NEPHEW_ID].storyRole, 'nephew');
  assert.equal(candidates[NEIGHBOUR_ID].storyRole, 'neighbour');
});

// Aynı tohum, aynı hafta: oyun mantığı yalnızca rng.ts'den çeker. Görsel ve işitsel gürültü src/game dışında yaşar.
test('oyun mantığı Math.random kullanmaz (rng.ts dışında)', () => {
  const root = new URL('../src/game', import.meta.url).pathname;
  const offenders = readdirSync(root, { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.tsx?$/.test(f) && f !== 'rng.ts')
    .filter((f) => /Math\.random\s*\(/.test(readFileSync(join(root, f), 'utf8')));
  assert.deepEqual(offenders, []);
});

const known = (where: string, ids: string[]) => {
  const missing = ids.filter((id) => !(id in candidates));
  assert.deepEqual(missing, [], `${where}: bilinmeyen aday`);
};

test('her aday kimliği kendi anahtarıyla aynı ve dosyası eksiksiz', () => {
  for (const [key, c] of Object.entries(candidates)) {
    assert.equal(c.id, key);
    assert.ok(candidateDetails[key], `${key}: candidateDetails eksik`);
    assert.ok(c.outcomeNote.approve.trim() && c.outcomeNote.reject.trim(), `${key}: outcomeNote boş`);
    assert.ok(c.name.trim() && c.systemLine.trim(), key);
  }
  assert.deepEqual(Object.keys(candidateDetails).filter((id) => !(id in candidates)), [], 'adayı olmayan ayrıntı');
});

test('günler, ricalar ve hikâye kadrosu yalnızca var olan adayları anar', () => {
  days.forEach((d, i) => known(`gün ${i}`, d.candidateIds));
  REQUESTS.forEach((r, i) => known(`rica ${i}`, r.ids));
  known('KEY_CAST', KEY_CAST);
  known('EXTRA_FEMALE', EXTRA_FEMALE);
  const all = days.flatMap((d) => d.candidateIds);
  assert.equal(new Set(all).size, all.length, 'bir aday iki güne yazılmış');
  assert.deepEqual(all.filter((id) => id in EXTRA_CANDIDATES), [], 'ek dosya bir günün kadrosunda');
  for (const id of all) assert.ok(questionsFor(id).length > 0, `${id}: şirket sorusu yok`);
});

test('karışık kadro aynı adayları dağıtır, hikâye karakterleri kendi gününde kalır', () => {
  const authored = defaultLineups();
  const day = (lineups: string[][], id: string) => lineups.findIndex((l) => l.includes(id));
  for (let seed = 1; seed <= 200; seed++) {
    const lineups = makeLineups(rngFor(seed, 'lineups'));
    assert.deepEqual(lineups.map((l) => l.length), authored.map((l) => l.length), `tohum ${seed}`);
    assert.deepEqual(lineups.flat().sort(), authored.flat().sort(), `tohum ${seed}`);
    for (const id of KEY_CAST) assert.equal(day(lineups, id), day(authored, id), `tohum ${seed}: ${id}`);
  }
});

test('yapay zekâ puanı 0–100 arasında, sabit ve sistemin önerisiyle aynı sırada', async () => {
  const { aiScore } = await import('../src/game/ats');
  const order = ['out', 'low', 'review', 'priority'];
  const byVerdict = new Map<string, number[]>();
  for (const c of Object.values(candidates)) {
    const s = aiScore(c);
    assert.ok(Number.isInteger(s) && s >= 0 && s <= 100, `${c.id}: ${s}`);
    assert.equal(aiScore(c), s);
    byVerdict.set(c.verdict, [...(byVerdict.get(c.verdict) ?? []), s]);
  }
  for (let i = 1; i < order.length; i++) {
    const below = Math.max(...(byVerdict.get(order[i - 1]) ?? [0]));
    const above = Math.min(...(byVerdict.get(order[i]) ?? [100]));
    assert.ok(below < above, `${order[i - 1]} en yüksek ${below} ≥ ${order[i]} en düşük ${above}`);
  }
});

test('her ilan maaş aralığını açıkça yazar', () => {
  for (const j of jobDrafts) {
    assert.ok(Number.isInteger(j.salary.min) && j.salary.min > 0, `${j.id}: alt sınır yok`);
    assert.ok(j.salary.max >= j.salary.min, `${j.id}: üst sınır alttan küçük`);
    assert.match(salaryText(j), /^\d{1,3}(\.\d{3})* – \d{1,3}(\.\d{3})* TL/, j.id);
  }
});

test('mülakat günü aynı soruyu iki aday sormaz', async () => {
  const { backQuestionFor } = await import('../src/game/data/interviewExtras');
  const ids = Object.keys(candidates);
  for (let start = 0; start + 6 <= ids.length; start += 3) {
    const day = ids.slice(start, start + 6);
    const asked = day.map((id) => backQuestionFor(id, day).question);
    assert.equal(new Set(asked).size, asked.length, day.join(','));
  }
});
