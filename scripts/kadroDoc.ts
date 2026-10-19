/*
 * docs/kadrolar.md'nin içeriği, doğrudan oyunun verisinden: hangi gün kimin kuyruğa yazıldığı,
 * günün kuralı ve her adayın sistem önerisi. Belge elle güncellenmez; `npm run docs:kadro` yazar,
 * tests/kadroDoc.test.ts eskiyip eskimediğini denetler.
 */
import { days } from '../src/game/data/days';
import { candidates } from '../src/game/data/candidates';
import { EXTRA_CANDIDATES } from '../src/game/data/extraCandidates';
import { KEY_CAST, STORY_FIXED } from '../src/game/day/lineups';

const VERDICT: Record<string, string> = { priority: 'Öncelikli', review: 'Ek inceleme', low: 'Düşük öncelik', out: 'Değerlendirme dışı' };

function row(id: string): string {
  const c = candidates[id];
  const tags = [KEY_CAST.includes(id) && 'kilit aday', STORY_FIXED.includes(id) && 'hikâyeye bağlı', c.flagIsFair && 'sistem haklı', c.storyRole === 'neighbour' && 'koşullu'].filter(Boolean).join(', ');
  return `| ${c.name} | \`${id}\` | ${c.age} | ${c.experience} | ${c.salary} | ${VERDICT[c.verdict]} | ${tags} |`;
}

export function renderKadroDoc(): string {
  const out = [
    '# Kadrolar',
    '',
    '> Bu dosya `scripts/kadroDoc.ts` ile oyunun verisinden üretilir; elle düzenlemeyin. Güncellemek için: `npm run docs:kadro`.',
    '> Her yeni oyunda günlerin yaklaşık üçte biri yer değiştirir ve kuyruklar karışır; "kilit" ve "hikâyeye bağlı" adaylar günlerinden ayrılmaz.',
    '',
  ];
  for (const day of days) {
    if (day.final) continue;
    out.push(`## ${day.dayName}`, '', `**Kural:** ${day.ruleText} · **Davet hakkı:** ${day.approvalLimit ?? '—'} · **Başvuru:** ${day.applicationTarget}`, '');
    out.push('| Aday | Kimlik | Yaş | Deneyim | Maaş | Sistem | Not |', '|---|---|---|---|---|---|---|');
    for (const id of day.candidateIds) out.push(row(id));
    out.push('');
  }
  const extras = Object.keys(EXTRA_CANDIDATES);
  out.push('## Ek yığın', '', `Günün kuyruğu erken biterse Hakan Bey bu ${extras.length} kişiden birkaçını "bulur": ${extras.map((id) => candidates[id].name).join(', ')}.`, '');
  return out.join('\n');
}
