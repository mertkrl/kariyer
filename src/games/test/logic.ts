import { EXAM_QUESTIONS, EXAM_SECONDS, EXAM_SECTIONS, sectionOf, type ExamQuestion } from './data/questions';

/*
 * Testin kuralları, ekrandan ayrı ve test edilebilir. Her oyunda her bölümden en fazla
 * QUESTIONS_PER_SECTION soru rastgele seçilir ve şıkları karıştırılır; bölümler sırayla gelir. Sonda iki puan vardır:
 * şirket puanı cevap anahtarına, sağduyu puanı aklı başında cevaba göre. Boş bırakılan soru ikisinde de
 * puan getirmez.
 */

export const QUESTIONS_PER_SECTION = 10;

/** Bir cevap: seçilen şıkkın sırası ya da boşsa null. */
export type ExamAnswer = number | null;

export interface ExamSection {
  title: string;
  questions: ExamQuestion[];
}

function shuffled<T>(xs: readonly T[], random: () => number): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Şıkları karıştırılabilen türler: düz çoktan seçmeli ve şıkları yalnızca bir liste olan bileşenler.
 * Kaydırıcı, takvim, kaçan düğme gibi türlerde şıkkın sırası bir eşiğe, hücreye ya da role bağlıdır;
 * onlar olduğu gibi kalır.
 */
const SHUFFLES = new Set<string>(['order', 'tap', 'chat']);
export const canShuffle = (q: ExamQuestion) => !q.widget || SHUFFLES.has(q.widget.type);

/** Şıkları yeniden dizer; anahtar ve sağduyu cevabı şıklarıyla birlikte taşınır. */
export function shuffleOptions(q: ExamQuestion, random: () => number = Math.random): ExamQuestion {
  if (!canShuffle(q)) return q;
  // order[yeni sıra] = eski sıra
  const order = shuffled(q.options.map((_, i) => i), random);
  return { ...q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer), sensible: order.indexOf(q.sensible) };
}

/** Bölüm bölüm bir test: her bölümün soruları havuzdan, şıkları da kendi içinde karışık gelir. `random` testler için verilir. */
export function pickExam(random: () => number = Math.random): ExamSection[] {
  return EXAM_SECTIONS.map((s, si) => {
    const pool = shuffled(
      EXAM_QUESTIONS.filter((q) => sectionOf(q.kind) === si),
      random,
    );
    return { title: s.title, questions: pool.slice(0, QUESTIONS_PER_SECTION).map((q) => shuffleOptions(q, random)) };
  });
}

export const secondsOf = (q: ExamQuestion) => q.seconds ?? EXAM_SECONDS;

/** Testin tek, ortak süresi: soruların kılavuz sürelerinin toplamı. Sorular arasında gidip gelinebilir. */
export const totalSeconds = (questions: ExamQuestion[]) => questions.reduce((n, q) => n + secondsOf(q), 0);

export interface ExamResult {
  company: number;
  sense: number;
  blank: number;
}

export function scoreExam(questions: ExamQuestion[], answers: ExamAnswer[]): ExamResult {
  const pct = (n: number) => (questions.length ? Math.round((n / questions.length) * 100) : 0);
  const at = (i: number) => answers[i] ?? null;
  return {
    company: pct(questions.filter((q, i) => at(i) === q.answer).length),
    sense: pct(questions.filter((q, i) => at(i) === q.sensible).length),
    blank: questions.filter((_, i) => at(i) === null).length,
  };
}

/** Platformun şirket puanına yapıştırdığı, hiçbir şey söylemeyen yorum. */
export function verdictOf(company: number): { title: string; line: string } {
  if (company >= 85) return { title: 'Örnek Çalışan Adayı', line: 'Kurum kültürüyle olağanüstü uyum. Aday beklentileri sezgisel olarak kavrıyor.' };
  if (company >= 60) return { title: 'Uyumlu Profil', line: 'Yönlendirmeye açık bir profil. Ufak sorgulama eğilimleri eğitimle giderilebilir.' };
  if (company >= 30) return { title: 'Gelişime Açık', line: 'Aday zaman zaman soruları "fazla düşünerek" yanıtlıyor.' };
  return { title: 'Uyum Riski', line: 'Aday soruların önemli bir kısmını sorgulama eğiliminde. Ekip ahengi için risk oluşturabilir.' };
}


/** Bölüm başına şirket ve sağduyu oranı (0–100): raporun "yetkinlik profili". */
export function sectionScores(exam: ExamSection[], answers: ExamAnswer[]) {
  let offset = 0;
  return exam.map((s) => {
    const r = scoreExam(s.questions, answers.slice(offset, offset + s.questions.length));
    offset += s.questions.length;
    return { title: s.title, company: r.company, sense: r.sense };
  });
}

/** Raporun mührü: eşiği geçen "uygun" damgası yer. */
export const PASS_MARK = 70;

/** Raporun belge numarası: aynı cevaplar aynı numarayı verir. */
export function reportNo(answers: ExamAnswer[]): string {
  const h = answers.reduce<number>((n, a, i) => (n * 31 + (a ?? 7) * (i + 3)) % 999_983, 17);
  return `UM-${String(h).padStart(6, '0')}`;
}

