import { useEffect, useMemo, useRef, useState } from 'react';
import { StudioMark } from '../../arcade/Studio';
import { ClockOut } from '../../arcade/ClockOut';
import { audioEngine } from '../../audio/audioEngine';
import { storeMuted } from '../../game/lib/prefs';
import * as sfx from './sfx';
import { EXAM_SECTIONS, type ExamQuestion } from './data/questions';
import { MailScene } from './MailScene';
import { loadProgress as loadDefter } from '../../arcade/progress';
import { clearProgress, loadProgress, loadSeen, saveProgress, saveSeen, type ExamProgress } from './progress';
import { clockText, PASS_MARK, PROCTOR_REACTIONS, nextSeen, pickExam, type ExamLog, type ProctorEvent, scoreExam, SECTION_SECONDS, verdictOf, type ExamAnswer, type ExamSection } from './logic';
import { Result } from './Result';
import { SystemCheck } from './SystemCheck';
import { RobotCheck } from './RobotCheck';
import { SectionIntro } from './SectionIntro';
import { Intro } from './Intro';
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

type Stage = { at: 'intro' } | { at: 'check' } | { at: 'exam'; exam: ExamSection[]; resume?: ExamProgress } | { at: 'result'; exam: ExamSection[]; answers: ExamAnswer[]; log: ExamLog };

export function TestGame() {
  const [stage, setStage] = useState<Stage>({ at: 'intro' });
  useEffect(() => {
    audioEngine.setMusicMood('off');
    return sfx.stopHold;
  }, []);
  const start = () => {
    clearProgress();
    // daha önce çıkan sorular sona kalır; test başlar başlamaz bu sorular "görüldü" sayılır
    const seen = loadSeen();
    const exam = pickExam(Math.random, seen);
    saveSeen(nextSeen(seen, exam));
    setStage({ at: 'exam', exam });
  };
  const check = () => {
    clearProgress();
    setStage({ at: 'check' });
  };
  // yarıda kalmış bir sınav varsa girişte devam önerilir
  const [saved, setSaved] = useState(() => loadProgress());
  // testi daha önce bitiren aday sistem kontrolünü ve örnek soruları yeniden beklemez
  const [veteran] = useState(() => !!loadDefter().played.test);

  return (
    <div className={styles.app}>
      {/* solda site (ana sayfaya döner), ortada oyunun adı, sağda gözetim göstergesi */}
      <header className={styles.brand}>
        <span className={styles.site}>
          <ClockOut risk={stage.at === 'exam' ? 'İlerlemeniz kaydedilir; döndüğünüzde kaldığınız yerden devam edersiniz.' : undefined} />
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
      {stage.at === 'intro' && (
        <Intro
          onStart={veteran ? start : check}
          saved={saved}
          onResume={() => saved && setStage({ at: 'exam', exam: saved.exam, resume: saved })}
          onDiscard={() => {
            clearProgress();
            setSaved(null);
          }}
        />
      )}
      {stage.at === 'intro' && <StudioMark minimal />}
      {stage.at === 'check' && <SystemCheck onReady={start} />}
      {stage.at === 'exam' && <Exam exam={stage.exam} resume={stage.resume} skipPractice={veteran} onDone={(answers, log) => setStage({ at: 'result', exam: stage.exam, answers, log })} />}
      {stage.at === 'result' && <Ending key={stage.answers.join()} exam={stage.exam} answers={stage.answers} log={stage.log} onAgain={start} />}
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
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path className={styles.speaker} d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" />
        {muted ? (
          <path className={styles.cross} d="M16 9.5l5 5M21 9.5l-5 5" />
        ) : (
          <>
            <path className={styles.wave} d="M15.5 9.2a4 4 0 0 1 0 5.6" />
            <path className={`${styles.wave} ${styles.wave2}`} d="M18.2 6.6a7.8 7.8 0 0 1 0 10.8" />
          </>
        )}
      </svg>
      <span>{muted ? 'Sessiz' : 'Ses açık'}</span>
    </button>
  );
}


/*
 * Sınav bölüm bölüm ilerler: her bölümün önce tanıtımı ve puanlanmayan ciddi bir örnek sorusu
 * gelir (SectionIntro), sonra bölümün kendi süresi akar. Bölüm içinde sorular arasında gidip
 * gelinir; bölüm bitince (elle ya da süre dolunca) sonrakine geçilir, geri dönülmez.
 * Ekran: solda süre ve bölümün soru haritası, ortada soru, sağda gözetmen.
 */
/** Önce e-posta sahnesi (teklif ya da ret), sonra rapor. */
function Ending({ exam, answers, log, onAgain }: { exam: ExamSection[]; answers: ExamAnswer[]; log: ExamLog; onAgain: () => void }) {
  const [report, setReport] = useState(false);
  if (report) return <Result exam={exam} answers={answers} log={log} onAgain={onAgain} />;
  const questions = exam.flatMap((s) => s.questions);
  const r = scoreExam(questions, answers);
  const v = verdictOf(r.company, r.blank / Math.max(1, questions.length));
  return <MailScene passed={r.company >= PASS_MARK} title={v.title} company={r.company} onReport={() => setReport(true)} />;
}

function Exam({ exam, resume, skipPractice, onDone }: { exam: ExamSection[]; resume?: ExamProgress; skipPractice: boolean; onDone: (answers: ExamAnswer[], log: ExamLog) => void }) {
  const flat = useMemo(() => exam.flatMap((s, si) => s.questions.map((q) => ({ q, si }))), [exam]);
  // her bölümün ilk sorusunun sırası ve süresi
  const starts = useMemo(() => exam.map((_, i) => exam.slice(0, i).reduce((n, s) => n + s.questions.length, 0)), [exam]);
  // her bölümün süresi aynı; giriş ekranındaki toplam süre her oyunda tutar
  const durations = useMemo(() => exam.map(() => SECTION_SECONDS), [exam]);
  const [sec, setSec] = useState(resume?.sec ?? 0);
  const [phase, setPhase] = useState<'intro' | 'run'>(resume?.phase ?? 'intro');
  const [index, setIndex] = useState(resume?.index ?? 0);
  // bölümde ulaşılan en ileri soru: ilerisine atlanmaz, gerisindeki her soruya dönülür
  const [reach, setReach] = useState(resume?.reach ?? 0);
  const [answers, setAnswers] = useState<ExamAnswer[]>(() => resume?.answers ?? flat.map(() => null));
  const [left, setLeft] = useState(resume?.left ?? durations[0]);
  const [confirm, setConfirm] = useState(false);
  const finished = useRef(false);
  const total = durations[sec];
  const from = starts[sec];
  const to = from + exam[sec].questions.length;
  const lastSection = sec === exam.length - 1;

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    clearProgress();
    sfx.stopHold();
    onDone(answers, { ...spent.current, ...counts(), robots });
  };
  const endSection = () => {
    // süre dolmadan kapatılan bölüm gözetmen raporuna girer
    if (leftRef.current > 1) spent.current.early += 1;
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
  const [robots, setRobots] = useState(resume?.robots ?? 0);
  // gözetmen kaydı: süre ve erken kapanışlar burada, davranış sayaçları aşağıdaki turns'te
  const spent = useRef({ seconds: resume?.log?.seconds ?? 0, early: resume?.log?.early ?? 0 });
  // her değişiklikte kayıt; sınav bitince silinir
  useEffect(() => {
    if (!finished.current) saveProgress({ exam, answers, sec, phase, index, reach, left, robots, log: { ...spent.current, ...counts(), robots } });
  }, [exam, answers, sec, phase, index, reach, left, robots]);
  // süre dolunca bölüm kapanır; aralık her saniye en güncel süreye ve kapanışa refs üzerinden bakar
  const leftRef = useRef(left);
  const endRef = useRef(endSection);
  useEffect(() => {
    leftRef.current = left;
    endRef.current = endSection;
  });
  useEffect(() => {
    if (robot || phase !== 'run') return;
    const id = window.setInterval(() => {
      spent.current.seconds += 1;
      if (leftRef.current <= 1) endRef.current();
      else setLeft((n) => n - 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [robot, phase]);

  // her soru açıldığında saat tutulur; üst üste çok hızlı cevaplar robot testini açar
  const shownAt = useRef(0);
  const streak = useRef(0);
  const slowNoted = useRef(false);
  useEffect(() => {
    shownAt.current = Date.now();
    slowNoted.current = false;
  }, [index, phase]);

  // gözetmen kaydı: 8 saniyede bir genel uyarı, araya adayın davranışına göre notlar; son üçü görünür
  const [notes, setNotes] = useState<{ id: number; text: string }[]>([]);
  const noteId = useRef(0);
  const turns = useRef<Partial<Record<ProctorEvent, number>>>(resume?.log ? { changed: resume.log.changed, slow: resume.log.slow, fast: resume.log.fast } : {});
  const counts = () => ({ changed: turns.current.changed ?? 0, slow: turns.current.slow ?? 0, fast: turns.current.fast ?? 0 });
  const note = (text: string) => setNotes((ns) => [{ id: ++noteId.current, text }, ...ns].slice(0, 3));
  const react = (e: ProctorEvent) => {
    const k = turns.current[e] ?? 0;
    turns.current[e] = k + 1;
    note(PROCTOR_REACTIONS[e][k % PROCTOR_REACTIONS[e].length]);
  };
  const beat = phase === 'run' ? Math.floor((total - left) / 8) : -1;
  useEffect(() => {
    if (beat < 0) return;
    note(PROCTOR_LINES[(beat + sec * 3) % PROCTOR_LINES.length]);
    // oyalanma: soru 20 saniyedir cevapsız açıksa
    if (!slowNoted.current && Date.now() - shownAt.current > 20_000) {
      slowNoted.current = true;
      react('slow');
    }
    // yalnızca yeni bir vuruşta
    // oxlint-disable-next-line react/exhaustive-deps
  }, [beat]);

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
      if (answers[index] === null) react('skipped');
      setConfirm(false);
      setReach(reach + 1);
      setIndex(reach + 1);
      return;
    }
    for (let i = index + 1; i <= reach; i++) if (open(i)) return go(i);
  };
  const prev = index > from ? index - 1 : null;
  const answer = (a: number) => {
    const before = answers[index];
    const fast = Date.now() - shownAt.current < FAST_MS;
    setAnswers((xs) => xs.map((x, i) => (i === index ? a : x)));
    slowNoted.current = true;
    const cq = flat[index].q;
    const event: ProctorEvent | null =
      before !== null && before !== a ? 'changed' : cq.fair && a === cq.fair.trap ? 'cynic' : cq.fair && a === cq.answer ? 'fair' : a === cq.answer ? 'key' : a === cq.sensible ? 'sense' : fast ? 'fast' : null;
    if (event) react(event);
    streak.current = fast ? streak.current + 1 : 0;
    if (streak.current >= FAST_STREAK && robots < MAX_ROBOT_CHECKS) {
      streak.current = 0;
      setRobots((n) => n + 1);
      setRobot(true);
      sfx.error();
    }
  };

  if (phase === 'intro') {
    const brief = BRIEFINGS.find((b) => b.id === EXAM_SECTIONS[sec].id) ?? BRIEFINGS[sec];
    return <SectionIntro key={sec} no={sec + 1} of={exam.length} title={exam[sec].title} questions={to - from} seconds={total} brief={brief} skipPractice={skipPractice} onStart={() => setPhase('run')} />;
  }

  const sectionAnswers = answers.slice(from, to);
  const blank = sectionAnswers.filter((a) => a === null).length;
  const { q } = flat[index];
  const last = index === to - 1;
  const hurry = left <= 60;
  const endLabel = lastSection ? 'Testi bitir' : 'Bölümü bitir';
  /** Bu kadar saniyeden fazla süre kalmışken bitirmek uyarı ister. */
  const EARLY = 15;

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

        <button className={pn.finish} onClick={() => (blank || left > EARLY ? setConfirm(true) : endSection())}>
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
              <b>{lastSection ? 'Test bitirilsin mi?' : 'Bölüm bitirilsin mi?'}</b>
              <br />
              {left > EARLY && (
                <>
                  Daha <span className={ex.confirmClock}>{clockText(left)}</span> süreniz var; erken bitirmek "acelecilik" diye not edilir.{' '}
                </>
              )}
              {blank > 0 && `${blank} soru boş; sistem bunu "kararsızlık" sayar.`}
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
            <button className={styles.primary} onClick={() => (blank || left > EARLY ? setConfirm(true) : endSection())}>
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
          {notes.map((l, k) => (
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
      </div>
    </section>
  );
}
