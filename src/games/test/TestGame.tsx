import { useEffect, useMemo, useRef, useState } from 'react';
import { StudioMark } from '../../arcade/Studio';
import { ClockOut } from '../../arcade/ClockOut';
import { audioEngine } from '../../audio/audioEngine';
import { storeMuted } from '../../game/lib/prefs';
import * as sfx from './sfx';
import { EXAM_QUESTIONS, EXAM_SECTIONS, type ExamQuestion } from './data/questions';
import { pickExam, QUESTIONS_PER_SECTION, secondsOf, totalSeconds, type ExamAnswer, type ExamSection } from './logic';
import { Result } from './Result';
import { SystemCheck } from './SystemCheck';
import { RobotCheck } from './RobotCheck';
import { SectionIntro } from './SectionIntro';
import { BRIEFINGS } from './data/briefings';
import { FAST_MS, FAST_STREAK, MAX_ROBOT_CHECKS } from './data/robot';
import { QuestionWidget } from './widgets/QuestionWidgets';
import styles from './TestGame.module.css';
import ex from './Exam.module.css';
import pn from './Panel.module.css';
import wt from './Watch.module.css';

/*
 * Genel Yetenek ve Uyum Testi: uydurma "UyumMetre" platformunda çözülen kısa bir sınav. Giriş →
 * bölüm bölüm sorular (her birinin kendi süresi) → iki puanlı sonuç. Kendi durumu bu ekrandadır;
 * İşe Alım Haftası'nın deposuna, kaydına ya da verisine dokunmaz. Sesler sfx.ts'te: lobide bekleme
 * müziği, sınavda açık ofis, sonda mühür.
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
    return sfx.stopHold;
  }, []);
  const start = () => setStage({ at: 'exam', exam: pickExam() });
  const check = () => setStage({ at: 'check' });

  return (
    <div className={styles.app}>
      {/* solda site (ana sayfaya döner), ortada oyunun adı, sağda gözetim göstergesi */}
      <header className={styles.brand}>
        <span className={styles.site}>
          <ClockOut risk={stage.at === 'exam' ? 'Test yarıda kalır; cevaplarınız kaydedilmez ve süre sıfırlanır.' : undefined} />
        </span>
        <span className={styles.center}>
          <span className={styles.logo}>
            <i aria-hidden="true">◎</i> {BRAND}
          </span>
          <span className={styles.brandSub}>Yetenek Ölçüm ve Kültür Uyum Platformu</span>
        </span>
        <span className={styles.right}>
          {(stage.at === 'exam' || stage.at === 'check') && <span className={styles.camera}>● Kamera gözetimi aktif</span>}
          <SoundToggle />
        </span>
      </header>
      {stage.at === 'intro' && <Intro onStart={check} />}
      {stage.at === 'intro' && <StudioMark minimal />}
      {stage.at === 'check' && <SystemCheck onReady={start} />}
      {stage.at === 'exam' && <Exam exam={stage.exam} onDone={(answers, robots) => setStage({ at: 'result', exam: stage.exam, answers, robots })} />}
      {stage.at === 'result' && <Result exam={stage.exam} answers={stage.answers} robots={stage.robots} onAgain={start} />}
      <footer className={styles.footer}>Bu bir parodidir. {BRAND} ve sorular uydurmadır; kamera açılmaz, hiçbir cevap kaydedilmez ya da gönderilmez.</footer>
    </div>
  );
}

/** Üst çubuktaki ses düğmesi: sitenin ortak sessiz tercihini değiştirir. */
function SoundToggle() {
  const [muted, setMuted] = useState(() => audioEngine.isMuted());
  return (
    <button
      type="button"
      className={styles.sound}
      aria-pressed={!muted}
      aria-label={muted ? 'Sesi aç' : 'Sesi kapat'}
      onClick={() => {
        audioEngine.init();
        audioEngine.setMuted(!muted);
        storeMuted(!muted);
        setMuted(!muted);
      }}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}

/** Giriş: solda karşılama ve kurallar, sağda testin künyesi ve bölümleri. İlk dokunuşta bekleme müziği başlar. */
function Intro({ onStart }: { onStart: () => void }) {
  const [consent, setConsent] = useState(false);
  const wake = () => {
    audioEngine.init();
    sfx.startHold();
  };
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
              <i aria-hidden="true">⏱</i> Test bölüm bölüm ilerler; her bölümün kendi süresi var. Süre bitince bölüm kendiliğinden kapanır.
            </li>
            <li>
              <i aria-hidden="true">↔</i> İlerideki sorulara atlanamaz; geçtiğiniz sorulara geri dönebilirsiniz.
            </li>
            <li>
              <i aria-hidden="true">◉</i> Sekme değiştirmek "bağlılık eksikliği" olarak raporlanır.
            </li>
            <li>
              <i aria-hidden="true">✓</i> Doğru cevap yoktur.** <span className={styles.muted}>(**vardır)</span>
            </li>
          </ul>
          <label className={`${styles.consent} ${consent ? styles.consentOn : ''}`}>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => {
                wake();
                sfx.click();
                setConsent(e.target.checked);
              }}
            />
            <span>Aydınlatma metnini okudum, anlamadım ve kabul etmiyorum.</span>
          </label>
          <div className={styles.startRow}>
            <button
              className={`${styles.primary} ${styles.big}`}
              disabled={!consent}
              onClick={() => {
                wake();
                audioEngine.playUi('start');
                onStart();
              }}
            >
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
 * Sınav bölüm bölüm ilerler: her bölümün önce tanıtımı ve puanlanmayan ciddi bir örnek sorusu
 * gelir (SectionIntro), sonra bölümün kendi süresi akar. Bölüm içinde sorular arasında gidip
 * gelinir; bölüm bitince (elle ya da süre dolunca) sonrakine geçilir, geri dönülmez.
 * Ekran: solda süre ve bölümün soru haritası, ortada soru, sağda gözetmen.
 */
function Exam({ exam, onDone }: { exam: ExamSection[]; onDone: (answers: ExamAnswer[], robots: number) => void }) {
  const flat = useMemo(() => exam.flatMap((s, si) => s.questions.map((q) => ({ q, si }))), [exam]);
  // her bölümün ilk sorusunun sırası ve süresi
  const starts = useMemo(() => exam.map((_, i) => exam.slice(0, i).reduce((n, s) => n + s.questions.length, 0)), [exam]);
  const durations = useMemo(() => exam.map((s) => totalSeconds(s.questions)), [exam]);
  const [sec, setSec] = useState(0);
  const [phase, setPhase] = useState<'intro' | 'run'>('intro');
  const [index, setIndex] = useState(0);
  // bölümde ulaşılan en ileri soru: ilerisine atlanmaz, gerisindeki her soruya dönülür
  const [reach, setReach] = useState(0);
  const [answers, setAnswers] = useState<ExamAnswer[]>(() => flat.map(() => null));
  const [left, setLeft] = useState(durations[0]);
  const [confirm, setConfirm] = useState(false);
  const finished = useRef(false);
  const total = durations[sec];
  const from = starts[sec];
  const to = from + exam[sec].questions.length;
  const lastSection = sec === exam.length - 1;

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    sfx.stopHold();
    onDone(answers, robots);
  };
  const endSection = () => {
    if (lastSection) return finish();
    setConfirm(false);
    setSec(sec + 1);
    setPhase('intro');
    setIndex(starts[sec + 1]);
    setReach(starts[sec + 1]);
    setLeft(durations[sec + 1]);
  };
  // bölüm tanıtımında bekleme müziği; bölüm başlayınca çan ve açık ofis, süre azaldıkça saat öne çıkar
  const office = useRef<ReturnType<typeof sfx.startOffice> | null>(null);
  useEffect(() => {
    if (phase !== 'run') {
      sfx.startHold();
      return;
    }
    sfx.stopHold();
    sfx.chime();
    office.current = sfx.startOffice();
    return () => {
      office.current?.stop();
      office.current = null;
    };
  }, [phase, sec]);
  useEffect(() => {
    if (phase !== 'run') return;
    office.current?.setUrgency(Math.min(1, Math.max(0, 1 - left / total)) ** 2);
    if (left <= 10 && left > 0) sfx.tick(left <= 5);
    // gözetmen her 8 saniyede yeni bir not yazar (aşağıdaki kayıt); yazarken bir bildirim sesi
    else if (left < total && (total - left) % 8 === 0) sfx.warn();
  }, [left, phase, total]);
  // robot penceresi açıkken ve bölüm tanıtımındayken süre durur
  const [robot, setRobot] = useState(false);
  const [robots, setRobots] = useState(0);
  // süre dolunca bölüm kapanır; aralık her saniye en güncel süreye ve kapanışa refs üzerinden bakar
  const leftRef = useRef(left);
  const endRef = useRef(endSection);
  useEffect(() => {
    leftRef.current = left;
    endRef.current = endSection;
  });
  useEffect(() => {
    if (robot || phase !== 'run') return;
    const id = window.setInterval(() => (leftRef.current <= 1 ? endRef.current() : setLeft((n) => n - 1)), 1000);
    return () => window.clearInterval(id);
  }, [robot, phase]);

  // her soru açıldığında saat tutulur; üst üste çok hızlı cevaplar robot testini açar
  const shownAt = useRef(0);
  const streak = useRef(0);
  useEffect(() => {
    shownAt.current = Date.now();
  }, [index, phase]);

  const open = (i: number) => i >= from && i < to && i <= reach;
  const go = (i: number) => {
    if (!open(i)) return;
    setConfirm(false);
    setIndex(i);
  };
  // Sonraki: en ileri sorudaysa yeni bir soru açılır; geride ise bir sonraki soruya
  const next = () => {
    sfx.page();
    if (index === reach) {
      if (reach + 1 >= to) return;
      setConfirm(false);
      setReach(reach + 1);
      setIndex(reach + 1);
      return;
    }
    for (let i = index + 1; i <= reach; i++) if (open(i)) return go(i);
  };
  const prev = index > from ? index - 1 : null;
  const answer = (a: number) => {
    setAnswers((xs) => xs.map((x, i) => (i === index ? a : x)));
    streak.current = Date.now() - shownAt.current < FAST_MS ? streak.current + 1 : 0;
    if (streak.current >= FAST_STREAK && robots < MAX_ROBOT_CHECKS) {
      streak.current = 0;
      setRobots((n) => n + 1);
      setRobot(true);
      sfx.error();
    }
  };

  if (phase === 'intro') {
    const brief = BRIEFINGS.find((b) => b.id === EXAM_SECTIONS[sec].id) ?? BRIEFINGS[sec];
    return <SectionIntro key={sec} no={sec + 1} of={exam.length} title={exam[sec].title} questions={to - from} seconds={total} brief={brief} onStart={() => setPhase('run')} />;
  }

  const sectionAnswers = answers.slice(from, to);
  const blank = sectionAnswers.filter((a) => a === null).length;
  const { q } = flat[index];
  const last = index === to - 1;
  const hurry = left <= 60;
  const endLabel = lastSection ? 'Testi bitir' : 'Bölümü bitir';
  // gözetmen her 8 saniyede yeni bir uyarı yazar; kayıtta son üçü görünür, en yenisi üstte
  const beat = Math.floor((total - left) / 8) + sec * 3;
  const proctorLog = [0, 1, 2].filter((k) => beat - k >= sec * 3).map((k) => ({ id: beat - k, text: PROCTOR_LINES[(beat - k) % PROCTOR_LINES.length] }));

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
      <aside className={pn.side} inert={robot}>
        <div className={`${pn.clock} ${hurry ? pn.clockHurry : ''}`} style={{ ['--p' as string]: (left / total) * 100 }}>
          <b className="mono" role="timer" aria-label={`Bölümün kalan süresi ${Math.max(0, left)} saniye`}>
            {clockText(Math.max(0, left))}
          </b>
          <small>kalan süre</small>
        </div>

        {/* yalnızca içinde bulunulan bölümün kutuları; diğer bölümler bitti ya da kilitli */}
        <nav aria-label="Soru haritası" className={pn.map}>
          {exam.map((s, sIndex) => {
            const now = sIndex === sec;
            const state = sIndex < sec ? 'bitti' : sIndex > sec ? 'sırada' : null;
            return (
              <div key={s.title} className={`${pn.mapSection} ${now ? pn.mapOpen : pn.mapLocked}`}>
                <span className={`${pn.mapTitle} ${now ? pn.mapTitleOn : ''}`}>
                  <span>
                    {sIndex + 1}. {s.title}
                  </span>
                  <em>{state ?? `${s.questions.length - blank}/${s.questions.length}`}</em>
                </span>
                {now && (
                  <ol className={pn.grid}>
                    {s.questions.map((sq, k) => {
                      const i = from + k;
                      const isDone = answers[i] !== null;
                      const ahead = i > reach;
                      return (
                        <li key={sq.id}>
                          <button
                            className={`${pn.cell} ${isDone ? pn.cellDone : ''} ${i === index ? pn.cellNow : ''} ${ahead ? pn.cellAhead : ''}`}
                            aria-current={i === index ? 'step' : undefined}
                            aria-label={`Soru ${k + 1}, ${isDone ? 'cevaplandı' : ahead ? 'henüz açılmadı' : 'boş'}`}
                            disabled={!open(i)}
                            onClick={() => go(i)}
                          >
                            {k + 1}
                            {isDone && <i aria-hidden="true">✓</i>}
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            );
          })}
        </nav>

        <div className={pn.legend} aria-hidden="true">
          <span>
            <i className={pn.lgDone} /> Cevaplandı ({sectionAnswers.length - blank})
          </span>
          <span>
            <i className={pn.lgBlank} /> Boş ({blank})
          </span>
        </div>

        <button className={pn.finish} onClick={() => (blank ? setConfirm(true) : endSection())}>
          {endLabel}
        </button>
      </aside>

      <div className={ex.main} inert={robot}>
        <div className={ex.progress} aria-hidden="true">
          <i style={{ width: `${((sectionAnswers.length - blank) / sectionAnswers.length) * 100}%` }} />
        </div>
        <Question key={q.id} q={q} section={exam[sec].title} number={index - from + 1} total={to - from} selected={answers[index]} onAnswer={answer} />

        {confirm && (
          <div className={ex.confirm} role="alertdialog" aria-labelledby="confirm-text">
            <p id="confirm-text">
              <b>Bu bölümde {blank} soru boş.</b> Boş sorular "kararsızlık" olarak raporlanır{lastSection ? '' : ' ve bölüme geri dönülemez'}. Yine de bitirilsin mi?
            </p>
            <div className={ex.navRow}>
              <button className={ex.ghost} onClick={() => setConfirm(false)}>
                Vazgeç
              </button>
              <button className={styles.primary} onClick={endSection}>
                Evet, bitir
              </button>
            </div>
          </div>
        )}

        <div className={ex.navRow}>
          <button className={ex.ghost} disabled={prev === null} onClick={() => prev !== null && go(prev)}>
            ← Önceki
          </button>
          <span className={ex.navCount}>
            {index - from + 1} / {to - from}
          </span>
          {last ? (
            <button className={styles.primary} onClick={() => (blank ? setConfirm(true) : endSection())}>
              {endLabel}
            </button>
          ) : (
            <button className={styles.primary} onClick={next}>
              {index === reach && answers[index] === null ? 'Boş geç →' : 'Sonraki →'}
            </button>
          )}
        </div>
      </div>

      {/* gözetmen: sahte kamera ve uyarı kaydı. Kamera gerçekte hiç açılmaz */}
      <aside className={wt.watch} inert={robot} aria-label="Gözetmen">
        <div className={wt.cam} aria-hidden="true">
          <svg viewBox="0 0 160 100" className={wt.camArt}>
            <circle cx="80" cy="44" r="18" />
            <path d="M44 100 Q44 68 80 68 Q116 68 116 100Z" />
            <rect x="52" y="22" width="56" height="48" rx="6" className={wt.camFace} />
          </svg>
          <span className={wt.rec}>● CANLI</span>
          <span className={`${wt.camTime} mono`}>{clockText(Math.max(0, total - left))}</span>
        </div>
        <h3 className={wt.watchTitle}>Gözetmen notları</h3>
        <ol className={wt.log} aria-live="polite">
          {proctorLog.map((l, k) => (
            <li key={l.id} className={k === 0 ? wt.logNew : undefined}>
              {l.text}
            </li>
          ))}
        </ol>
      </aside>
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
