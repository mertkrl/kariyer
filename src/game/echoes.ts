/*
 * Decisions come back during the week, not only in the ending: the team lead reads yesterday's
 * invitations (and notices a strong file you turned away), and people you rejected turn up on
 * Kariyergram having found work somewhere else.
 */
import { candidateOf } from './data/candidates';
import { candidateDetails } from './data/candidateDetails';
import type { Decision } from './types';
import type { Mail } from './mail';

export interface WeekEntry {
  id: string;
  /** Day index the decision was made on. */
  day: number;
  decision: Decision;
}

/** How the Wednesday meeting went for you, if it has happened. */
export type MeetingChoice = 'sample' | 'praise' | 'observe' | null;

const fitOf = (id: string) => candidateDetails[id]?.hireFit ?? 3;
const first = (id: string) => candidateOf(id).name.split(' ')[0];

const LEVENT_SPECIAL: Record<string, string> = {
  okan: 'bu dosyayı sen mi seçtin? Neyse, Cuma görürüz.',
  emre: 'teknik olarak çok iyi. Ekibe nasıl uyar, ondan emin değilim.',
  volkan: 'CV\'si parlak ama somut hiçbir şey yok. Referansını aradın mı?',
};

function leventOn(id: string) {
  if (LEVENT_SPECIAL[id]) return LEVENT_SPECIAL[id];
  const fit = fitOf(id);
  if (fit >= 5) return 'GitHub\'ına baktım, gerçekten güçlü. İyi yakalamışsın.';
  if (fit === 4) return 'sağlam görünüyor, ekibe uyar.';
  if (fit === 3) return 'potansiyeli var ama biraz zayıf. Cuma dinleriz.';
  return 'açıkçası neden çağrıldığını anlamadım.';
}

/** The team lead's mid-morning mail about yesterday's files. */
export function leventMail(dayIndex: number, log: WeekEntry[], meeting: MeetingChoice): Mail | null {
  if (dayIndex < 1 || dayIndex > 3) return null;
  const yesterday = log.filter((e) => e.day === dayIndex - 1);
  const invited = yesterday.filter((e) => e.decision === 'approve').map((e) => e.id);
  // the one that got away: a strong file turned down, which he happened to see
  const missed = yesterday.find((e) => e.decision === 'reject' && fitOf(e.id) >= 5 && !LEVENT_SPECIAL[e.id]);
  const lines = invited.length
    ? ['Dün mülakata çağırdığın adayların CV\'lerine ekip olarak baktık:', '', ...invited.map((id) => `• ${first(id)}: ${leventOn(id)}`)]
    : ['Dün kimseyi mülakata çağırmamışsın. Ekip Cuma\'yı bekliyor; boş gelmeyelim.'];
  if (missed) {
    lines.push('', `Bir de: ${candidateOf(missed.id).name} dün elenmiş. Profilini tesadüfen gördüm; aradığımız tam oydu. Ne oldu?`);
  }
  if (dayIndex === 3 && meeting === 'sample') {
    lines.push('', 'Toplantıdaki rastgele kontrol fikrin iyiydi. Hakan Bey bir şey demedi ama ben not aldım.');
  }
  return {
    id: `levent-${dayIndex}`,
    day: dayIndex,
    at: 150,
    from: 'Levent Arslan',
    address: 'levent.arslan@tavrinsalabs.test',
    subject: invited.length ? 'Dün çağırdıkların hk.' : 'Mülakat listesi hk.',
    body: `Merhaba,\n\n${lines.join('\n')}\n\nİyi çalışmalar,\nLevent Arslan\nYazılım Ekip Lideri`,
  };
}

const NEW_JOBS = ['Nexa Yazılım', 'Kuzey Teknoloji', 'Bulut Finans', 'Deniz Lojistik'];
const FOUND_WORK = [
  (co: string) => `Yeni işime başladım 🎉 ${co} backend ekibindeyim. Birkaç gün önce bir yerden "değerlendirme dışı" demişlerdi; burada ilk gün kodumu okudular.`,
  (co: string) => `Bugün ${co}'da ilk günüm. Mülakatta CV'mi baştan sona okuyan biri vardı; bunu bile özlemişim.`,
  (co: string) => `Uzun bir hafta bitti: ${co} ile anlaştık 🙏 Reddedildiğim her yere bir teşekkür borçluyum sanırım. Belki de değil.`,
];

/** Strong people you turned away on earlier days, posting that they found work. */
export function rejectedEchoes(log: WeekEntry[], dayIndex: number) {
  return log
    .filter((e) => e.decision === 'reject' && e.day < dayIndex && fitOf(e.id) >= 5)
    .slice(0, 2)
    .map((e, i) => {
      const seed = [...e.id].reduce((n, ch) => n + ch.charCodeAt(0), 0) + i;
      return {
        id: e.id,
        name: candidateOf(e.id).name,
        initials: candidateOf(e.id).initials,
        color: candidateOf(e.id).color,
        text: FOUND_WORK[(seed + i) % FOUND_WORK.length](NEW_JOBS[(seed + 2 * i) % NEW_JOBS.length]),
      };
    });
}
