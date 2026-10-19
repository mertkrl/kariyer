import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NEIGHBOUR_ID, NEPHEW_ID, candidates } from '../src/game/data/candidates';
import { candidateDetails } from '../src/game/data/candidateDetails';
import { EXTRA_CANDIDATES, EXTRA_FEMALE } from '../src/game/data/extraCandidates';
import { days } from '../src/game/data/days';
import { REQUESTS } from '../src/game/data/phoneScript';
import { KEY_CAST, defaultLineups, makeLineups, questionsFor } from '../src/game/day/lineups';
import { hasSite } from '../src/game/data/portfolios';
import { rngFor } from '../src/game/lib/rng';
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
    .filter((f) => /\.tsx?$/.test(f) && f !== 'lib/rng.ts')
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

test('yapay zekâ eşleşme puanı masadaki herkese yüksek, sabit ve kimseyi ayırmıyor', async () => {
  const { aiScore } = await import('../src/game/day/ats');
  const byVerdict = new Map<string, number[]>();
  for (const c of Object.values(candidates)) {
    const s = aiScore(c);
    assert.ok(Number.isInteger(s) && s >= 84 && s <= 98, `${c.id}: ${s}`);
    assert.equal(aiScore(c), s);
    byVerdict.set(c.verdict, [...(byVerdict.get(c.verdict) ?? []), s]);
  }
  // kuralın elediği en iyi dosya, önceliklilerin en kötüsünü geçebilir: puan ayırıcı değil
  assert.ok(Math.max(...(byVerdict.get('out') ?? [0])) > Math.min(...(byVerdict.get('priority') ?? [100])));
  // cilalı CV'ler en tepede
  assert.equal(Math.max(...Object.values(candidates).map(aiScore)), aiScore(candidates.serkan));
});

test('her ilan maaş aralığını açıkça yazar', () => {
  for (const j of jobDrafts) {
    assert.ok(Number.isInteger(j.salary.min) && j.salary.min > 0, `${j.id}: alt sınır yok`);
    assert.ok(j.salary.max >= j.salary.min, `${j.id}: üst sınır alttan küçük`);
    assert.match(salaryText(j), /^\d{1,3}(\.\d{3})* – \d{1,3}(\.\d{3})* TL/, j.id);
  }
});

test('adayların karşı soruları deneyime bağlı: yeniler az ve amatörce, deneyimliler çok ve keskin', async () => {
  const { backQuestionsFor, backQuestionCount, experienceYears, seniorityOf } = await import('../src/game/data/interviewExtras');
  assert.equal(experienceYears('9 yıl (2 yıllık boşluk var)'), 9);
  assert.equal(experienceYears('15 yıl öğretmenlik, 1 yıl yazılım'), 1);
  assert.equal(experienceYears('0 yıl (bootcamp mezunu)'), 0);
  const ids = Object.keys(candidates);
  const avg = (level: string) => {
    const xs = ids.filter((id) => seniorityOf(experienceYears(candidates[id].experience)) === level).map((id) => backQuestionCount(id, experienceYears(candidates[id].experience)));
    return xs.reduce((a, b) => a + b, 0) / xs.length;
  };
  assert.ok(avg('junior') < avg('mid') && avg('mid') < avg('senior'), `junior ${avg('junior')} · mid ${avg('mid')} · senior ${avg('senior')}`);
  // herkes sormaz: her seviyede soru sormayan biri var
  assert.ok(ids.some((id) => backQuestionCount(id, experienceYears(candidates[id].experience)) === 0));
  // bir aday aynı soruyu iki kez sormaz
  for (const id of ids) {
    const qs = backQuestionsFor(id, experienceYears(candidates[id].experience), ids.slice(0, 6)).map((q) => q.question);
    assert.equal(new Set(qs).size, qs.length, id);
  }
});

test('her CV gününde en az bir adayın sitesi var', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const lineups = makeLineups(rngFor(seed, 'lineups'));
    lineups.forEach((l, d) => {
      if (l.length) assert.ok(l.some(hasSite), `tohum ${seed}, gün ${d + 1}: sitesi olan aday yok`);
    });
  }
});
