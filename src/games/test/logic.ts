import { EXAM_QUESTIONS, EXAM_SECONDS, EXAM_SECTIONS, sectionOf, type ExamQuestion } from './data/questions';

/*
 * Testin kuralları, ekrandan ayrı ve test edilebilir. Her oyunda her bölümden en fazla
 * QUESTIONS_PER_SECTION soru rastgele seçilir ve şıkları karıştırılır; bölümler sırayla gelir. Sonda iki puan vardır:
 * şirket puanı cevap anahtarına, sağduyu puanı aklı başında cevaba göre. Boş bırakılan soru ikisinde de
 * puan getirmez.
 */

export const QUESTIONS_PER_SECTION = 10;

/** Her bölümün sabit süresi: etkileşimli soruların uzun süreleri sığsın diye 6 dakika. */
export const SECTION_SECONDS = 360;

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
const SHUFFLES = new Set<string>(['order', 'inbox', 'chat']);
export const canShuffle = (q: ExamQuestion) => !q.widget || SHUFFLES.has(q.widget.type);

/** Şıkları yeniden dizer; anahtar ve sağduyu cevabı şıklarıyla birlikte taşınır. */
export function shuffleOptions(q: ExamQuestion, random: () => number = Math.random): ExamQuestion {
  if (!canShuffle(q)) return q;
  // order[yeni sıra] = eski sıra
  const order = shuffled(q.options.map((_, i) => i), random);
  return { ...q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer), sensible: order.indexOf(q.sensible), ...(q.fair ? { fair: { trap: order.indexOf(q.fair.trap) } } : {}) };
}

/** Etkileşim türünün anahtarı; yüz ifadeli kaydırıcı ayrı bir tür sayılır. */
const typeOf = (q: ExamQuestion) => (q.widget ? q.widget.type + ('faces' in q.widget && q.widget.faces ? '-faces' : '') : 'plain');

/** Aynı etkileşim türünden ikincisi, her türden biri seçildikten sonra gelir; düz sorular serbesttir. */
function spread(pool: ExamQuestion[]): ExamQuestion[] {
  const seen = new Set<string>();
  const first: ExamQuestion[] = [];
  const rest: ExamQuestion[] = [];
  for (const q of pool) {
    const t = typeOf(q);
    if (t !== 'plain' && seen.has(t)) rest.push(q);
    else {
      seen.add(t);
      first.push(q);
    }
  }
  return [...first, ...rest];
}

/** Bölüm bölüm bir test: her bölümün soruları havuzdan, şıkları da kendi içinde karışık gelir. `random` testler için verilir. */
/** Kültür Uyumu bölümüne düşen "kurum haklı" sorusu sayısı: bölümün ortasına yerleşir. */
export const FAIR_PER_EXAM = 2;

/**
 * `seen`: önceki testlerde çıkmış sorular. Her bölüm önce hiç görülmemiş sorulardan doldurulur; yetmezse
 * görülenlerle tamamlanır. Böylece havuz bitene kadar aynı soru iki kez gelmez.
 */
export function pickExam(random: () => number = Math.random, seen: ReadonlySet<string> = new Set()): ExamSection[] {
  return EXAM_SECTIONS.map((s, si) => {
    const pool = EXAM_QUESTIONS.filter((q) => sectionOf(q.kind) === si);
    const fresh = shuffled(pool.filter((q) => !seen.has(q.id)), random);
    const old = shuffled(pool.filter((q) => seen.has(q.id)), random);
    // "kurum haklı" soruları az: yenisi kalmadıysa o test onlarsız geçer, tur dönünce yine gelir
    const fair = fresh.filter((q) => q.fair).slice(0, FAIR_PER_EXAM);
    // tür dağılımı yeni ve eski sorular içinde ayrı ayrı yapılır: eski bir soru yenisinin önüne geçmez
    const rest = [...spread(fresh.filter((q) => !q.fair)), ...spread(old)].slice(0, QUESTIONS_PER_SECTION - fair.length);
    // ton değişimi bölümün ortasında: oyuncu alaycı refleksi bu noktaya kadar edinmiştir
    const mid = Math.floor(rest.length / 2);
    const picked = fair.length ? [...rest.slice(0, mid - 1), fair[0], ...rest.slice(mid - 1, mid + 1), ...fair.slice(1), ...rest.slice(mid + 1)] : rest;
    return { title: s.title, questions: picked.map((q) => shuffleOptions(q, random)) };
  });
}

/**
 * Bu testten sonra "görülmüş" sayılanlar. Bir bölümün bütün havuzu görülmüşse o bölüm yeni bir tura
 * başlar: yalnızca bu testte çıkanlar görülmüş kalır, gerisi yeniden "yeni" olur.
 */
export function nextSeen(seen: ReadonlySet<string>, exam: ExamSection[]): Set<string> {
  const out = new Set(seen);
  exam.forEach((s) => s.questions.forEach((q) => out.add(q.id)));
  EXAM_SECTIONS.forEach((_, si) => {
    const pool = EXAM_QUESTIONS.filter((q) => sectionOf(q.kind) === si);
    if (pool.every((q) => out.has(q.id))) {
      const now = new Set(exam[si]?.questions.map((q) => q.id));
      pool.forEach((q) => !now.has(q.id) && out.delete(q.id));
    }
  });
  return out;
}

/** Saniyeyi "dd:ss" olarak yazar. */
export const clockText = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

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
export function verdictOf(company: number, blankShare = 0): { title: string; line: string } {
  if (blankShare > 0.5) return { title: 'Değerlendirilemedi', line: 'Adayın cevapları anlamlı bir profil çıkarmaya yetmedi. Sistem bunu yine de "isteksizlik" olarak kaydetti.' };
  if (company >= 85) return { title: 'Örnek Çalışan Adayı', line: 'Kurum kültürüyle olağanüstü uyum. Aday beklentileri sezgisel olarak kavrıyor.' };
  if (company >= PASS_MARK) return { title: 'Uyumlu Profil', line: 'Yönlendirmeye açık bir profil. Ufak sorgulama eğilimleri eğitimle giderilebilir.' };
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


/** Gözetmenin cevaba göre yazdığı notlar; her olayın birkaç satırı sırayla döner. */
export type ProctorEvent = 'key' | 'sense' | 'fast' | 'changed' | 'skipped' | 'slow' | 'fair' | 'cynic';
export const PROCTOR_REACTIONS: Record<ProctorEvent, string[]> = {
  key: ['✓ Uyum +1. Aday beklentiyi sezdi.', '✓ Örnek tutum kaydedildi.', '✓ Cevap kurum kültürüyle örtüşüyor. Gözetmen gülümsedi.'],
  sense: ['⚠ Sorgulama eğilimi tespit edildi.', '⚠ Aday "mantıklı" davranıyor. Not edildi.', '⚠ Bu cevap ekip ahengini bozabilir.'],
  fast: ['Aday düşünmeden cevap verdi. Olumlu.', 'Hız: mükemmel. Derinlik: gereksiz.'],
  changed: ['Aday fikir değiştirdi. Tutarlılık riski.', 'İlk cevap daha uyumluydu. (Muhtemelen.)'],
  skipped: ['Aday soruyu atladı: kararsızlık.', 'Boş geçilen soru "isteksizlik" klasörüne taşındı.'],
  fair: ['✓ Bu cevapta platformla aynı fikirdesiniz. İlginç.', '✓ Kurum ve sağduyu aynı yerde buluştu. Not edildi.'],
  cynic: ['Aday buna da itiraz etti. Bu sefer kurum haklıydı.', 'Refleks tespit edildi: her şeye karşı çıkmak da bir kalıp.'],
  slow: ['Aday uzun süredir düşünüyor. Düşünmek kayda geçti.', 'Bu soruda fazla oyalanıldı. Verimlilik puanı güncelleniyor…'],
};

/** Raporun kişisel gözlemleri: adayın kendi cevaplarından en çok iki anahtar, bir sağduyu cevabı. */
export interface Highlight {
  /** `trap`: kurumun haklı olduğu soruda alaycı şıkkı seçti. */
  tone: 'key' | 'sense' | 'trap';
  prompt: string;
  option: string;
}

const shortPrompt = (p: string) => {
  const first = p.split(/(?<=[.?!])\s/)[0].replace(/[.?!]$/, '');
  return first.length > 70 ? `${first.slice(0, 67).trimEnd()}…` : first;
};

export function highlightsOf(questions: ExamQuestion[], answers: ExamAnswer[], n = 3): Highlight[] {
  const at = (i: number) => answers[i] ?? null;
  // kurumun haklı olduğu sorularda alaycı şıkkı seçmek, raporun ilk gözlemidir
  const trap = questions
    .map((q, i) => ({ q, a: at(i) }))
    .filter(({ q, a }) => q.fair && a === q.fair.trap)
    .slice(0, 1)
    .map(({ q, a }) => ({ tone: 'trap' as const, prompt: shortPrompt(q.prompt), option: q.options[a as number] }));
  const pick = (tone: 'key' | 'sense', max: number) =>
    questions
      .map((q, i) => ({ q, a: at(i) }))
      .filter(({ q, a }) => !q.fair && a !== null && a === (tone === 'key' ? q.answer : q.sensible))
      // etkileşimli sahneler daha akılda kalır; önce onlar
      .sort((x, y) => Number(!!y.q.widget) - Number(!!x.q.widget))
      .slice(0, max)
      .map(({ q, a }) => ({ tone, prompt: shortPrompt(q.prompt), option: q.options[a as number] }));
  const sense = pick('sense', 1);
  return [...trap, ...pick('key', n - sense.length - trap.length), ...sense].slice(0, n);
}

/** Sınav boyunca tutulan kayıt (yapay zekâ raporunun kaynağı): harcanan süre ve davranış sayaçları. */
export interface ExamLog {
  /** Bölümlerde harcanan toplam saniye. */
  seconds: number;
  changed: number;
  slow: number;
  fast: number;
  robots: number;
  /** Süresi bitmeden kapatılan bölüm sayısı. */
  early: number;
}

export const emptyLog = (): ExamLog => ({ seconds: 0, changed: 0, slow: 0, fast: 0, robots: 0, early: 0 });

/**
 * Yapay zekâ raporu: kayda ve cevaplara bakıp modelin rapora yazdığı not. Her durum
 * bir cümle ekler; en fazla iki cümle, en belirgin olanlar önce.
 */
export function proctorNote(log: ExamLog, questions: ExamQuestion[], answers: ExamAnswer[], limit: number): string[] {
  const n = questions.length;
  const blank = answers.filter((a) => a === null).length;
  const key = questions.filter((q, i) => answers[i] === q.answer).length;
  const sense = questions.filter((q, i) => answers[i] === q.sensible && !q.fair).length;
  const out: string[] = [];
  const share = log.seconds / Math.max(1, limit);
  if (log.robots > 0) out.push(`Aday ${log.robots} kez robot testine alındı. İnsan olduğu doğrulandı, ama fazla hızlı bir insan.`);
  if (blank > n / 4) out.push(`${blank} soru boş bırakıldı. Aday bazı konularda fikir sahibi olmamayı seçiyor; bu, bir yönetici adayında aranan bir özellik.`);
  else if (blank === 0) out.push('Tek bir soru bile boş bırakılmadı. Her konuda bir fikri var; bu bazen sorun çıkarır.');
  if (share < 0.45) out.push(`Testi ayrılan sürenin ancak %${Math.round(share * 100)}'inde bitirdi. Hızlı karar veriyor; okuduğundan emin değiliz.`);
  else if (share > 0.92) out.push('Sürenin son saniyesine kadar kaldı. Mesai bitmeden kalkmayan biri; kültürümüze uygun.');
  if (log.changed >= 3) out.push(`${log.changed} cevabını sonradan değiştirdi. İlk içgüdüleri genelde daha uyumluydu.`);
  if (log.slow >= 2) out.push(`${log.slow} soruda uzun uzun düşündü. Düşünmek kayda geçti.`);
  if (log.early >= 2) out.push('Bölümleri süre dolmadan kendisi kapattı. Fazla mesaiye yatkınlığı düşük görünüyor.');
  if (sense > key) out.push('Cevaplarının çoğu "mantıklı" çıktı. Ekip uyumu açısından yakından izlenmesi önerilir.');
  else if (key > n * 0.6) out.push('Ne beklendiğini hemen sezdi. Toplantılarda baş sallama potansiyeli yüksek.');
  if (out.length === 0) out.push('Aday sıradan bir performans sergiledi. Dikkat çekmedi; bu da bir yetenek.');
  return out.slice(0, 2);
}
