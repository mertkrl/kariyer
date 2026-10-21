import { useEffect, useMemo, useRef, useState } from 'react';
import { SITE_NAME } from '../../arcade/games';
import { StudioMark } from '../../arcade/Studio';
import { hrefOf } from '../../arcade/route';
import { audioEngine } from '../../audio/audioEngine';
import { EXAM_QUESTIONS, EXAM_SECTIONS, type ExamQuestion } from './data/questions';
import { pickExam, QUESTIONS_PER_SECTION, secondsOf, totalSeconds, type ExamAnswer, type ExamSection } from './logic';
import { Result } from './Result';
import { SystemCheck } from './SystemCheck';
import { RobotCheck } from './RobotCheck';
import { FAST_MS, FAST_STREAK, MAX_ROBOT_CHECKS } from './data/robot';
import { QuestionWidget } from './widgets/QuestionWidgets';
import styles from './TestGame.module.css';
import ex from './Exam.module.css';

/*
 * Genel Yetenek ve Uyum Testi: uydurma "UyumMetre" platformunda çözülen kısa bir sınav. Giriş →
 * bölüm bölüm sorular (her birinin kendi süresi) → iki puanlı sonuç. Kendi durumu bu ekrandadır;
 * İşe Alım Haftası'nın deposuna, kaydına ya da verisine dokunmaz.
 */

const BRAND = 'UyumMetre';

/** Gözetmen kutusunun dönen uyarıları. Kamera gerçekte hiç açılmaz. */
const PROCTOR_LINES = [
  'Göz teması algılanamadı. Lütfen kameraya daha istekli bakın.',
  'Arka planda bir kedi tespit edildi. Kedi değerlendirmeye dahil edilmeyecektir.',
  'Nefes ritminiz "kararsız" olarak işaretlendi.',
  "Bu soruyu adayların %94'ü 3 saniyede çözdü. (Kaynak: biz.)",
  'Kaşınızı kaldırdınız. Not edildi.',
  'Sekme değiştirmeyin. Değiştirmeyi düşünmeyin de.',
  'Gülümsemeniz %12 eksik. Kültür uyumu puanınız güncelleniyor…',
  'Cevaplarınız rakip şirketlerle paylaşılmaz.* (*satılır)',
  'Ekran parlaklığınız motivasyon eksikliğine işaret ediyor olabilir.',
  'Lütfen düşünürken daha az düşünün.',
];

type Stage = { at: 'intro' } | { at: 'check' } | { at: 'exam'; exam: ExamSection[] } | { at: 'result'; exam: ExamSection[]; answers: ExamAnswer[]; robots: number };

export function TestGame() {
  const [stage, setStage] = useState<Stage>({ at: 'intro' });
  useEffect(() => {
    audioEngine.setMusicMood('off');
  }, []);
  const start = () => setStage({ at: 'exam', exam: pickExam() });
  const check = () => setStage({ at: 'check' });

  return (
    <div className={styles.app}>
      {/* solda site (ana sayfaya döner), ortada oyunun adı, sağda gözetim göstergesi */}
      <header className={styles.brand}>
        <a className={styles.site} href={hrefOf('arcade')}>
          <span aria-hidden="true">←</span> {SITE_NAME}
        </a>
        <span className={styles.center}>
          <span className={styles.logo}>
            <i aria-hidden="true">◎</i> {BRAND}
          </span>
          <span className={styles.brandSub}>Yetenek Ölçüm ve Kültür Uyum Platformu</span>
        </span>
        <span className={styles.right}>{(stage.at === 'exam' || stage.at === 'check') && <span className={styles.camera}>● Kamera gözetimi aktif</span>}</span>
      </header>
      {stage.at === 'intro' && <Intro onStart={check} />}
      {stage.at === 'intro' && <StudioMark />}
      {stage.at === 'check' && <SystemCheck onReady={start} />}
      {stage.at === 'exam' && <Exam exam={stage.exam} onDone={(answers, robots) => setStage({ at: 'result', exam: stage.exam, answers, robots })} />}
      {stage.at === 'result' && <Result exam={stage.exam} answers={stage.answers} robots={stage.robots} onAgain={start} />}
      <footer className={styles.footer}>Bu bir parodidir. {BRAND} ve sorular uydurmadır; kamera açılmaz, hiçbir cevap kaydedilmez ya da gönderilmez.</footer>
    </div>
  );
}

/** Giriş: solda karşılama ve kurallar, sağda testin künyesi ve bölümleri. */
function Intro({ onStart }: { onStart: () => void }) {
  const [consent, setConsent] = useState(false);
  const total = EXAM_SECTIONS.length * QUESTIONS_PER_SECTION;
  // tahmini süre: havuzdaki soruların ortalama süresinden
  const minutes = Math.round(((EXAM_QUESTIONS.reduce((n, q) => n + secondsOf(q), 0) / EXAM_QUESTIONS.length) * total) / 60);
  return (
    <main className={`${styles.page} ${styles.pageWide}`}>
      <section className={`${styles.card} ${styles.hero}`}>
        <div className={styles.heroMain}>
          <p className={styles.eyebrow}>Aday Değerlendirme Merkezi</p>
          <h1 className={styles.h1}>Genel Yetenek ve Uyum Testi</h1>
          <p className={styles.lead}>Değerli adayımız, bu bilimsel olarak geliştirilmiş* değerlendirme bilişsel yeteneklerinizi, iş hayatına hazırlığınızı ve kurum kültürümüzle uyumunuzu ölçer.</p>
          <ul className={styles.rules}>
            <li>
              <i aria-hidden="true">⏱</i> Tek bir toplam süre var. Süre bitince test kendiliğinden kapanır.
            </li>
            <li>
              <i aria-hidden="true">↔</i> Sorular arasında gidip gelebilirsiniz. Her gidip geliş tereddüt olarak puanlanır.
            </li>
            <li>
              <i aria-hidden="true">◉</i> Sekme değiştirmek "bağlılık eksikliği" olarak raporlanır.
            </li>
            <li>
              <i aria-hidden="true">✓</i> Doğru cevap yoktur.** <span className={styles.muted}>(**vardır)</span>
            </li>
          </ul>
          <label className={`${styles.consent} ${consent ? styles.consentOn : ''}`}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>Aydınlatma metnini okudum, anlamadım ve kabul etmiyorum.</span>
          </label>
          <div className={styles.startRow}>
            <button className={`${styles.primary} ${styles.big}`} disabled={!consent} onClick={onStart}>
              Teste başla →
            </button>
            <p className={styles.fine}>*Kendi içimizde.</p>
          </div>
        </div>

        <aside className={styles.heroSide} aria-label="Test bilgileri">
          <div className={styles.stats}>
            <div>
              <b>{total}</b>
              <span>soru</span>
            </div>
            <div>
              <b>{EXAM_SECTIONS.length}</b>
              <span>bölüm</span>
            </div>
            <div>
              <b>~{minutes}</b>
              <span>dakika</span>
            </div>
          </div>
          <ol className={styles.sectionList}>
            {EXAM_SECTIONS.map((s, i) => (
              <li key={s.id}>
                <span className={styles.sectionNo}>{i + 1}</span>
                <span>
                  {s.title}
                  <small>{SECTION_NOTES[s.id]}</small>
                </span>
              </li>
            ))}
          </ol>
          <p className={styles.trust}>
            <b>ISO 9001*</b> uyumlu değerlendirme <span className={styles.muted}>(*başvuru aşamasında)</span>
          </p>
        </aside>
      </section>
    </main>
  );
}

/** Girişteki bölüm listesinin alt satırları. */
const SECTION_NOTES: Record<string, string> = {
  cognitive: 'Sayısal, sözel, şekil ve dikkat',
  simulation: 'Gerçek iş hayatından sahneler',
  culture: 'Değerlerimizle ne kadar örtüşüyorsunuz?',
  general: 'Her çalışanın bilmesi gerekenler',
};

const clockText = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

/*
 * Sınav: solda süre, soru haritası ve gözetmen; sağda soru ve Önceki/Sonraki. Tek ortak süre akar;
 * sorular arasında gidip gelinir, cevap değiştirilebilir. Süre bitince test kendiliğinden kapanır.
 */
function Exam({ exam, onDone }: { exam: ExamSection[]; onDone: (answers: ExamAnswer[], robots: number) => void }) {
  const flat = useMemo(() => exam.flatMap((s, si) => s.questions.map((q) => ({ q, si }))), [exam]);
  const total = useMemo(() => totalSeconds(flat.map((f) => f.q)), [flat]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<ExamAnswer[]>(() => flat.map(() => null));
  const [left, setLeft] = useState(total);
  const [confirm, setConfirm] = useState(false);
  const finished = useRef(false);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    onDone(answers, robots);
  };
  // robot penceresi açıkken süre durur
  const [robot, setRobot] = useState(false);
  const [robots, setRobots] = useState(0);
  useEffect(() => {
    if (robot) return;
    const id = window.setInterval(() => setLeft((n) => n - 1), 1000);
    return () => window.clearInterval(id);
  }, [robot]);

  // her soru açıldığında saat tutulur; üst üste çok hızlı cevaplar robot testini açar
  const shownAt = useRef(0);
  const streak = useRef(0);
  useEffect(() => {
    shownAt.current = Date.now();
  }, [index]);
  useEffect(() => {
    if (left <= 0) finish();
  });

  const go = (i: number) => {
    setConfirm(false);
    setIndex(Math.max(0, Math.min(flat.length - 1, i)));
  };
  const answer = (a: number) => {
    setAnswers((xs) => xs.map((x, i) => (i === index ? a : x)));
    streak.current = Date.now() - shownAt.current < FAST_MS ? streak.current + 1 : 0;
    if (streak.current >= FAST_STREAK && robots < MAX_ROBOT_CHECKS) {
      streak.current = 0;
      setRobots((n) => n + 1);
      setRobot(true);
    }
  };
  const blank = answers.filter((a) => a === null).length;
  const { q, si } = flat[index];
  const last = index === flat.length - 1;
  const hurry = left <= 60;
  const proctor = PROCTOR_LINES[Math.floor((total - left) / 8) % PROCTOR_LINES.length];
  let n = 0;

  return (
    <main className={ex.exam}>
      {/* süre azaldıkça zemin sakin maviden sıcak kırmızıya kayar; son dakikalara kadar fark edilmez */}
      <div className={ex.ambient} style={{ ['--heat' as string]: Math.min(1, Math.max(0, 1 - left / total) ** 2) }} aria-hidden="true" />
      {robot && (
        <RobotCheck
          onDone={() => {
            setRobot(false);
            shownAt.current = Date.now();
          }}
        />
      )}
      {/* robot penceresi açıkken arkadaki sınava klavyeyle de geçilemez */}
      <aside className={ex.side} inert={robot}>
        <div className={`${ex.clock} ${hurry ? ex.clockHurry : ''}`} style={{ ['--p' as string]: (left / total) * 100 }}>
          <b className="mono" role="timer" aria-label={`Testin kalan süresi ${Math.max(0, left)} saniye`}>
            {clockText(Math.max(0, left))}
          </b>
          <small>kalan süre</small>
        </div>

        <nav aria-label="Soru haritası" className={ex.map}>
          {exam.map((s, sIndex) => (
            <div key={s.title} className={ex.mapSection}>
              <span className={`${ex.mapTitle} ${sIndex === si ? ex.mapTitleOn : ''}`}>
                {sIndex + 1}. {s.title}
                <em>
                  {answers.slice(n, n + s.questions.length).filter((a) => a !== null).length}/{s.questions.length}
                </em>
              </span>
              <ol className={ex.grid}>
                {s.questions.map((sq) => {
                  const i = n++;
                  const done = answers[i] !== null;
                  return (
                    <li key={sq.id}>
                      <button
                        className={`${ex.cell} ${done ? ex.cellDone : ''} ${i === index ? ex.cellNow : ''}`}
                        aria-current={i === index ? 'step' : undefined}
                        aria-label={`Soru ${i + 1}, ${done ? 'cevaplandı' : 'boş'}`}
                        onClick={() => go(i)}
                      >
                        {i + 1}
                        {done && <i aria-hidden="true">✓</i>}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </nav>

        <div className={ex.legend} aria-hidden="true">
          <span>
            <i className={ex.lgDone} /> Cevaplandı ({flat.length - blank})
          </span>
          <span>
            <i className={ex.lgBlank} /> Boş ({blank})
          </span>
        </div>

        <p className={ex.proctor}>
          <span className={ex.live}>● CANLI</span> {proctor}
        </p>

        <button className={ex.finish} onClick={() => (blank ? setConfirm(true) : finish())}>
          Testi bitir
        </button>
      </aside>

      <div className={ex.main} inert={robot}>
        <div className={ex.progress} aria-hidden="true">
          <i style={{ width: `${((flat.length - blank) / flat.length) * 100}%` }} />
        </div>
        <Question key={q.id} q={q} section={exam[si].title} number={index + 1} total={flat.length} selected={answers[index]} onAnswer={answer} />

        {confirm && (
          <div className={ex.confirm} role="alertdialog" aria-labelledby="confirm-text">
            <p id="confirm-text">
              <b>{blank} soru boş.</b> Boş sorular "kararsızlık" olarak raporlanır. Yine de bitirilsin mi?
            </p>
            <div className={ex.navRow}>
              <button className={ex.ghost} onClick={() => go(answers.findIndex((a) => a === null))}>
                İlk boş soruya git
              </button>
              <button className={styles.primary} onClick={finish}>
                Evet, bitir
              </button>
            </div>
          </div>
        )}

        <div className={ex.navRow}>
          <button className={ex.ghost} disabled={index === 0} onClick={() => go(index - 1)}>
            ← Önceki
          </button>
          <span className={ex.navCount}>
            {index + 1} / {flat.length}
          </span>
          {last ? (
            <button className={styles.primary} onClick={() => (blank ? setConfirm(true) : finish())}>
              Testi bitir
            </button>
          ) : (
            <button className={styles.primary} onClick={() => go(index + 1)}>
              Sonraki →
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function Question({ q, section, number, total, selected, onAnswer }: { q: ExamQuestion; section: string; number: number; total: number; selected: ExamAnswer; onAnswer: (a: number) => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  // etkileşimli türlerde widget her açılışta baştan başlar; işaretlenen cevap kartta yazılı durur
  // bu türler seçimi kendi üstünde gösterir; altına ayrıca "işaretlenen" yazılmaz
  const plain = !q.widget || ['history', 'background', 'invite', 'reaction', 'lunch', 'raise', 'stamp', 'thermostat', 'turnstile'].includes(q.widget.type);

  return (
    <section className={ex.question}>
      <div className={ex.qHead}>
        <span className={ex.qMeta}>
          {section} · Soru {number}/{total}
        </span>
        <span className={ex.qKind}>{q.kind}</span>
      </div>
      {/* soru ve cevap birlikte kartın ortasında; başlık satırı üstte */}
      <div className={`${ex.qBody} ${q.widget ? '' : ex.qPlain}`}>
        <div className={ex.qTop}>
          <h2 ref={heading} tabIndex={-1} className={ex.prompt}>
            {q.prompt}
          </h2>
          {q.figure && <p className={`${ex.figure} mono`}>{q.figure}</p>}
          {q.hint && <p className={ex.hint}>{q.hint}</p>}
        </div>
        <div className={ex.widget}>
          <QuestionWidget q={q} selected={selected} onAnswer={onAnswer} />
        </div>
        {!plain && selected !== null && (
          <p className={ex.marked} role="status">
            ✓ İşaretlenen: <b>{q.options[selected]}</b> <span>(değiştirmek için yeniden cevaplayın)</span>
          </p>
        )}
      </div>
    </section>
  );
}
