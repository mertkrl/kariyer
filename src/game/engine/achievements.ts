import type { Difficulty } from '../types';

/*
 * Başarımlar: hafta bitince bir kez hesaplanır ve oyunlar arasında hatırlanır; böylece final
 * ekranı bütün haftaların boyunca hangilerini topladığını gösterebilir.
 */

export interface AchievementInput {
  performans: number;
  vicdan: number;
  aiUses: number;
  refusals: number;
  complies: number;
  undecided: number;
  reviewed: number;
  /** Karar verilen aday başına ortalama okuma saniyesi. */
  avgSeconds: number;
  hireFit: number;
  momMessages: number;
  momAnswered: number;
  difficulty: Difficulty;
  weekendChoice: string | null;
  finalists: number;
  events: number;
  /** Kariyergram'da dürüstçe cevap verdiğin reddedilmiş adaylar. */
  dmHonest: number;
}

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  desc: string;
  test: (a: AchievementInput) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'human', icon: '🧠', title: 'İnsan Dokunuşu', desc: 'Bütün hafta yapay zekâya bir kez bile danışmadın.', test: (a) => a.aiUses === 0 && a.reviewed > 0 },
  { id: 'yes', icon: '🫡', title: 'Evet Efendim', desc: 'Müdüre hiç karşı çıkmadın.', test: (a) => a.refusals === 0 && a.complies >= 2 },
  { id: 'spine', icon: '🦴', title: 'Dik Duruş', desc: 'Müdüre en az 3 kez "hayır" dedin.', test: (a) => a.refusals >= 3 },
  { id: 'nobody', icon: '📂', title: 'Kimse Unutulmadı', desc: 'Hiçbir aday kararsız kalıp otomatik elenmedi.', test: (a) => a.undecided === 0 && a.reviewed > 0 },
  { id: 'fast', icon: '⚡', title: 'Hızlı Karar', desc: 'Aday başına ortalama 20 saniyeden kısa sürdü.', test: (a) => a.reviewed > 0 && a.avgSeconds < 20 },
  { id: 'careful', icon: '🔍', title: 'Titiz Okuyucu', desc: 'Aday başına ortalama bir dakikadan fazla ayırdın.', test: (a) => a.reviewed > 0 && a.avgSeconds >= 60 },
  { id: 'rightone', icon: '🎯', title: 'Doğru Kişi', desc: 'İşe aldığın kişi ekibin yıldızı oldu.', test: (a) => a.hireFit >= 5 },
  { id: 'mom', icon: '❤️', title: 'Annenin Gözbebeği', desc: 'Annenin bütün mesajlarına cevap verdin.', test: (a) => a.momMessages > 0 && a.momAnswered >= a.momMessages },
  { id: 'balance', icon: '⚖️', title: 'Denge Ustası', desc: "Performans ve Vicdan'ı 60'ın üstünde bitirdin.", test: (a) => a.performans >= 60 && a.vicdan >= 60 },
  { id: 'full', icon: '📋', title: 'Tam Kadro', desc: 'Hafta boyunca 10 ya da daha fazla kişiyi mülakata çağırdın.', test: (a) => a.finalists >= 10 },
  { id: 'hard', icon: '🔥', title: 'Zor Mod Gazisi', desc: 'Haftayı zor modda tamamladın.', test: (a) => a.difficulty === 'hard' },
  { id: 'storm', icon: '🌩️', title: 'Kriz Yöneticisi', desc: 'Zor modda bütün sürprizlere rağmen günleri bitirdin.', test: (a) => a.difficulty === 'hard' && a.events >= 6 },
  { id: 'humane', icon: '✉️', title: 'İnsan Gibi', desc: 'Reddettiğin en az 3 adaya ret sebebini dürüstçe yazdın.', test: (a) => a.dmHonest >= 3 },
  { id: 'freedom', icon: '🕊️', title: 'Yeni Bir Sayfa', desc: 'Annene iş değiştirmeyi düşündüğünü söyledin.', test: (a) => a.weekendChoice === 'quit' },
];

const STORAGE_KEY = 'kariyerweb-achievements';

/** Tarayıcının tuttuğu, yalnızca bu derlemenin bildiği kimliklerle: bozuk ya da elle değiştirilmiş kayıt yok sayılır. */
export function loadUnlocked(): Set<string> {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(stored)) return new Set();
    const known = new Set(ACHIEVEMENTS.map((a) => a.id));
    return new Set(stored.filter((id): id is string => typeof id === 'string' && known.has(id)));
  } catch {
    return new Set();
  }
}

/** Bu haftanın başarımlarını açar; bu sefer yeni olan kimlikleri döndürür. */
export function unlockAchievements(input: AchievementInput): { earned: string[]; fresh: string[]; all: Set<string> } {
  const earned = ACHIEVEMENTS.filter((a) => a.test(input)).map((a) => a.id);
  const all = loadUnlocked();
  const fresh = earned.filter((id) => !all.has(id));
  fresh.forEach((id) => all.add(id));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...all]));
  } catch {
    // storage unavailable — achievements just won't persist
  }
  return { earned, fresh, all };
}
