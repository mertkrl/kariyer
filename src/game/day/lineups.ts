import { days } from '../data/days';
import { shuffle } from '../lib/rng';
import { hasSite } from '../data/portfolios';

/*
 * Rastgele aday havuzu.
 *
 * Her adayın days.ts'de bir "ev" günü vardır (yazıldığı önyargı teması) ve o günün şirket
 * sorularını yanında getirir. Her yeni oyun haftayı yeniden karıştırır: her gün boyutunu korur,
 * ama birkaç aday başka günlerle yer değiştirir ve her kuyruk karışır; böylece hiçbir oyun aynı
 * insanlarla aynı sırada karşılaşmaz.
 */

const HOME_DAY: Record<string, number> = {};
days.forEach((day, index) => day.candidateIds.forEach((id) => (HOME_DAY[id] = index)));

/** CV cevapları, şimdi göründükleri günden başka bir günün soruları için yazılmış adaylar. */
const QUESTION_DAY: Record<string, number> = { gokce: 3, kerem: 3, seda: 3, kaan: 1, tolga: 0, ece: 2, tuncay: 3, asli: 3 };
const CUSTOM_QUESTIONS: Record<string, string[]> = {
  okan: ['Neden bu şirkette çalışmak istiyorsunuz?', 'Sizi neden seçmeliyiz?'],
  baris: ['Neden bu şirkette çalışmak istiyorsunuz?', 'Sizi neden seçmeliyiz?'],
  pinar: ['Neden yazılıma geçtiniz?', 'Sizi neden seçmeliyiz?'],
  ugur: ['Bu pozisyonda sizi motive eden nedir?', 'Sizi neden seçmeliyiz?'],
  onur: ['Uzun vadede bu şirkette kalmayı düşünüyor musunuz?', 'Kişisel hayatınız iş temponuzu etkiler mi?'],
};

/** Haftanın hikâyesinin tekrar eden karakterleri: her zaman kendi günlerinde görünürler. */
export const KEY_CAST = ['okan', 'kerem', 'derya', 'seda', 'tolga'];
/** Bunlar da hiç yer değiştirmez: günün diğer hikâye anları onlara bağlı (Hakan Bey'in Perşembe seçimi Barış, Ümit'in Çarşamba yanılgısı Ozan). */
export const STORY_FIXED = ['baris', 'ozan'];
const FIXED = [...KEY_CAST, ...STORY_FIXED];

/** Bir adayın CV'sinde cevapladığı şirket soruları. */
export function questionsFor(candidateId: string): string[] {
  return CUSTOM_QUESTIONS[candidateId] ?? days[QUESTION_DAY[candidateId] ?? HOME_DAY[candidateId] ?? 0].companyQuestions;
}

/** Yazılmış kadrolar; oyun başlamadan önce (ve yedek olarak) kullanılır. */
export function defaultLineups(): string[][] {
  return days.map((day) => [...day.candidateIds]);
}

/** Yeni bir hafta: aynı gün boyutları, her günün ~⅓'ü başka günlerle değişir, her kuyruk karışır. */
export function makeLineups(rand: () => number): string[][] {
  const lineups = defaultLineups();
  const workdays = lineups.map((_, i) => i).filter((i) => lineups[i].length > 0);
  const swaps = Math.round(workdays.reduce((n, i) => n + lineups[i].length, 0) / 3 / 2);
  for (let s = 0; s < swaps; s++) {
    const a = workdays[Math.floor(rand() * workdays.length)];
    let b = workdays[Math.floor(rand() * workdays.length)];
    if (a === b) b = workdays[(workdays.indexOf(a) + 1) % workdays.length];
    const ia = Math.floor(rand() * lineups[a].length);
    const ib = Math.floor(rand() * lineups[b].length);
    // hikâyenin tekrar eden karakterleri günlerinden hiç ayrılmaz
    if (FIXED.includes(lineups[a][ia]) || FIXED.includes(lineups[b][ib])) continue;
    [lineups[a][ia], lineups[b][ib]] = [lineups[b][ib], lineups[a][ia]];
  }
  spreadSites(lineups, workdays);
  return lineups.map((l) => frontLoad(shuffle(l, rand), rand));
}

/**
 * Her CV gününe en az bir site düşer: oyuncu siteye bakmayı bir gün öğrenip ertesi gün unutmasın.
 * Sitesiz kalan güne, iki ya da daha fazla sitesi olan bir günden (hikâyeye bağlı olmayan) biri gelir.
 */
function spreadSites(lineups: string[][], workdays: number[]) {
  for (const day of workdays) {
    if (lineups[day].some(hasSite)) continue;
    const from = workdays.find((d) => lineups[d].filter((id) => hasSite(id) && !FIXED.includes(id)).length >= 2);
    if (from === undefined) continue;
    const give = lineups[from].findIndex((id) => hasSite(id) && !FIXED.includes(id));
    const take = lineups[day].findIndex((id) => !hasSite(id) && !FIXED.includes(id));
    if (take < 0) continue;
    [lineups[from][give], lineups[day][take]] = [lineups[day][take], lineups[from][give]];
  }
}

/**
 * Hikâyenin insanları kuyruğun ilk yarısına düşer: günlük üç mülakat hakkı, oyuncu onlara varmadan
 * dolmasın. Yine de sıraları karışık kalır; listenin başı her zaman onlar değildir.
 */
function frontLoad(queue: string[], rand: () => number): string[] {
  const story = queue.filter((id) => FIXED.includes(id));
  const rest = queue.filter((id) => !FIXED.includes(id));
  for (const id of story) rest.splice(Math.floor(rand() * (Math.ceil(rest.length / 2) + 1)), 0, id);
  return rest;
}
