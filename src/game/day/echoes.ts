/*
 * Kararlar yalnızca sonda değil, hafta içinde de geri döner: ekip lideri dünün davetlerini okur
 * (ve geri çevirdiğin güçlü bir dosyayı fark eder), reddettiğin insanlar başka bir yerde iş bulup
 * Kariyergram'da görünür.
 */
import { candidateOf } from '../data/candidates';
import { candidateDetails } from '../data/candidateDetails';
import type { Decision } from '../types';
import type { Mail } from './mail';
import { THURSDAY, TUESDAY } from '../lib/weekdays';
import { MEETING_DAY } from '../events/meeting';

export interface WeekEntry {
  id: string;
  /** Kararın verildiği günün sırası. */
  day: number;
  decision: Decision;
  /** Dosya karardan önce okundu mu (`wasConsidered`); eski kayıtlarda yok. */
  considered?: boolean;
}

/** Çarşamba toplantısının senin için nasıl geçtiği, olduysa. */
export type MeetingChoice = 'sample' | 'praise' | 'observe' | null;

const fitOf = (id: string) => candidateDetails[id]?.hireFit ?? 3;
const first = (id: string) => candidateOf(id).name.split(' ')[0];

const LEVENT_SPECIAL: Record<string, string> = {
  okan: 'bu dosyayı sen mi seçtin? Neyse, Cuma görürüz.',
  ozan: 'aşağıda yazdım.',
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

/** Ekip liderinin dünkü dosyalar hakkındaki öğleden önceki e-postası. */
export function leventMail(dayIndex: number, log: WeekEntry[], meeting: MeetingChoice): Mail | null {
  if (dayIndex < TUESDAY || dayIndex > THURSDAY) return null;
  const yesterday = log.filter((e) => e.day === dayIndex - 1);
  const invited = yesterday.filter((e) => e.decision === 'approve').map((e) => e.id);
  // kaçan: geri çevrilen güçlü bir dosya, tesadüfen gördüğü
  const missed = yesterday.find((e) => e.decision === 'reject' && fitOf(e.id) >= 5 && !LEVENT_SPECIAL[e.id]);
  const lines = invited.length
    ? ['Dün mülakata çağırdığın adayların CV\'lerine ekip olarak baktık:', '', ...invited.map((id) => `• ${first(id)}: ${leventOn(id)}`)]
    : ['Dün kimseyi mülakata çağırmamışsın. Ekip Cuma\'yı bekliyor; boş gelmeyelim.'];
  if (missed) {
    lines.push('', `Bir de: ${candidateOf(missed.id).name} dün elenmiş. Profilini tesadüfen gördüm; aradığımız tam oydu. Ne oldu?`);
  }
  // Ozan: Ümit'in dün sana önerdiği aday; eski ekibinden iki kişiyle konuştu ve yanıldığını yazar
  const ozan = yesterday.find((e) => e.id === 'ozan');
  if (ozan) {
    lines.push(
      '',
      ozan.decision === 'approve'
        ? 'Ozan konusunda yanılmışım. Dün akşam eski ekibinden iki kişiyle konuştum; referans abartmıyormuş. Onu sana ben önerdim, Cuma bunu ben üstleneceğim.'
        : 'Ozan konusunda yanılmışım. Dün akşam eski ekibinden iki kişiyle konuştum; referans abartmıyormuş. Sen dosyaya bakmışsın, ben konferanstaki koda. Haklıymışsın.',
    );
  }
  if (dayIndex === MEETING_DAY + 1 && meeting === 'sample') {
    lines.push('', 'Toplantıdaki rastgele kontrol fikrin iyiydi. Hakan Bey bir şey demedi ama ben not aldım.');
  }
  return {
    id: `levent-${dayIndex}`,
    day: dayIndex,
    at: 150,
    from: 'Ümit Arslan',
    address: 'umit.arslan@tavrinsalabs.test',
    subject: invited.length ? 'Dün çağırdıkların hk.' : 'Mülakat listesi hk.',
    body: `Merhaba,\n\n${lines.join('\n')}\n\nİyi çalışmalar,\nÜmit Arslan\nYazılım Ekip Lideri`,
  };
}

const NEW_JOBS = ['Nexa Yazılım', 'Kuzey Teknoloji', 'Bulut Finans', 'Deniz Lojistik'];
const FOUND_WORK = [
  (co: string) => `Yeni işime başladım 🎉 ${co} backend ekibindeyim. Birkaç gün önce bir yerden "değerlendirme dışı" demişlerdi; burada ilk gün kodumu okudular.`,
  (co: string) => `Bugün ${co}'da ilk günüm. Mülakatta CV'mi baştan sona okuyan biri vardı; bunu bile özlemişim.`,
  (co: string) => `Uzun bir hafta bitti: ${co} ile anlaştık 🙏 Reddedildiğim her yere bir teşekkür borçluyum sanırım. Belki de değil.`,
];

/** Önceki günlerde geri çevirdiğin güçlü insanlar, iş bulduklarını paylaşıyor. */
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
