import type { ExamAnswer, ExamSection } from './logic';

/*
 * Yarıda kalan sınav: seçilen sorular (şıkları karışık hâliyle), cevaplar ve nerede kalındığı
 * tarayıcıda saklanır. Aday döndüğünde girişte "kaldığınız yerden devam" çıkar. Depo
 * kullanılamazsa (gizli pencere, engelli site verisi) oyun kayıtsız oynanır.
 */

const KEY = 'kariyerweb-uyummetre-progress-v1';

export interface ExamProgress {
  exam: ExamSection[];
  answers: ExamAnswer[];
  sec: number;
  phase: 'intro' | 'run';
  index: number;
  reach: number;
  left: number;
  robots: number;
}

export function loadProgress(): ExamProgress | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as ExamProgress;
    const count = p.exam.reduce((n, s) => n + s.questions.length, 0);
    // eski ya da bozuk bir kayıt baştan başlatılır
    if (!Array.isArray(p.answers) || p.answers.length !== count || p.sec < 0 || p.sec >= p.exam.length) return null;
    return p;
  } catch {
    return null;
  }
}

export function saveProgress(p: ExamProgress) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // kayıt tutulamazsa oyun yine oynanır
  }
}

export function clearProgress() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // yok sayılır
  }
}
