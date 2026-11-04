import type { ExamAnswer, ExamLog, ExamSection } from './logic';
import { readJson, removeKey, writeJson } from '../../shared/storage';

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
  /** Gözetmen kaydı; eski kayıtlarda yok. */
  log?: ExamLog;
}

export function loadProgress(): ExamProgress | null {
  const p = readJson(KEY) as ExamProgress | null;
  try {
    if (!p) return null;
    const count = p.exam.reduce((n, s) => n + s.questions.length, 0);
    // eski ya da bozuk bir kayıt baştan başlatılır
    if (!Array.isArray(p.answers) || p.answers.length !== count || p.sec < 0 || p.sec >= p.exam.length) return null;
    return p;
  } catch {
    return null;
  }
}

export const saveProgress = (p: ExamProgress) => writeJson(KEY, p);

export const clearProgress = () => removeKey(KEY);

/* Önceki testlerde çıkan soruların kimlikleri: yeni test önce görülmemiş sorulardan kurulur. */
const SEEN_KEY = 'kariyerweb-uyummetre-seen-v1';

export function loadSeen(): Set<string> {
  const ids = readJson(SEEN_KEY);
  return new Set(Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : []);
}

export const saveSeen = (seen: ReadonlySet<string>) => writeJson(SEEN_KEY, [...seen]);
