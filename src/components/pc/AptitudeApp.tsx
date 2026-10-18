import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../game/store/store';
import { APTITUDE_MINUTES_PER_QUESTION, APTITUDE_QUESTIONS, APTITUDE_SECONDS, APTITUDE_SECTIONS, sectionOf } from '../../game/data/aptitudeTest';
import { APTITUDE_CUTOFF, aptitudeNote, paceOf, candidateAptitude, type AptitudeAnswer, type AptitudeResult } from '../../game/events/aptitude';
import { candidateOf } from '../../game/data/candidates';
import { PLAYER } from '../../game/lib/player';
import { days } from '../../game/data/days';
import { audioEngine } from '../../audio/audioEngine';
import { QuestionWidget } from './AptitudeWidgets';
import styles from './AptitudeApp.module.css';
import empty from './AptitudeEmpty.module.css';

/*
 * Assessa: şirketin dışarıdan aldığı "yetenek ölçüm platformu". Kurumsal bir panel: teste geçen
 * adayların puanları, yetkinlik çubukları ve cevap kâğıtları (hangi soruya ne işaretlendi, anahtar
 * ne bekliyordu). İstersen testi kendin de çözebilirsin; gözetimli sınav ekranında soru başına
 * süre işler ve her soru mesaiden düşer. Bir kez çözülür.
 */

const DAY_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum'];
const SELF = '__self';
const SELECTION_DAY = days.findIndex((d) => d.selection);
// testin tek, ortak süresi: soruların kılavuz sürelerinin toplamı; bitince test de biter
const TOTAL_SECONDS = APTITUDE_QUESTIONS.reduce((n, q) => n + (q.seconds ?? APTITUDE_SECONDS), 0);
// sınav bölüm bölüm ilerler; sonradan eklenen sorular da kendi bölümünde çıkar
const ORDER = APTITUDE_QUESTIONS.map((_, i) => i).sort((a, b) => sectionOf(APTITUDE_QUESTIONS[a].kind) - sectionOf(APTITUDE_QUESTIONS[b].kind) || a - b);
const clockText = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

/** Gözetmen kutusunun dönen uyarıları: platformun "yapay zekâ destekli" gözetimi. */
const PROCTOR_LINES = [
  'Göz teması algılanamadı. Lütfen kameraya daha istekli bakın.',
  'Arka planda bir kedi tespit edildi. Kedi değerlendirmeye dahil edilmeyecektir.',
  'Nefes ritminiz "kararsız" olarak işaretlendi.',
  'Bu soruyu adayların %94\'ü 3 saniyede çözdü. (Kaynak: biz.)',
  'Kaşınızı kaldırdınız. Not edildi.',
  'Sekme değiştirmeyin. Değiştirmeyi düşünmeyin de.',
  'Gülümsemeniz %12 eksik. Kültür uyumu puanınız güncelleniyor…',
  'Cevaplarınız rakip şirketlerle paylaşılmaz.* (*satılır)',
  'Ekran parlaklığınız motivasyon eksikliğine işaret ediyor olabilir.',
  'Lütfen düşünürken daha az düşünün.',
];

interface Row {
  id: string;
  name: string;
  note: string;
  result: AptitudeResult;
}

/** Bölüm başına doğru oranı (0–1): platformun "yetkinlik profili". */
function sectionScores(result: AptitudeResult) {
  return APTITUDE_SECTIONS.map((s, si) => {
    const qs = APTITUDE_QUESTIONS.map((q, i) => ({ q, i })).filter(({ q }) => sectionOf(q.kind) === si);
    return { title: s.title, ratio: qs.filter(({ q, i }) => result.answers[i] === q.answer).length / qs.length };
  });
}

/** Platformun her puana yapıştırdığı, hiçbir şey söylemeyen yorum. */
function verdictLine(score: number) {
  if (score >= 90) return 'Kurum kültürüyle olağanüstü uyum. Aday beklentileri sezgisel olarak kavrıyor.';
  if (score >= APTITUDE_CUTOFF) return 'Kurum kültürüyle uyumlu. Yönlendirmeye açık bir profil.';
  if (score >= 40) return 'Gelişime açık. Aday zaman zaman soruları "fazla düşünerek" yanıtlıyor.';
  return 'Uyum riski. Aday soruların bir kısmını sorgulama eğiliminde.';
}

export function AptitudeApp() {
  const seed = useGameStore((s) => s.seed);
  const dayIndex = useGameStore((s) => s.currentDayIndex);
  const weekLog = useGameStore((s) => s.weekLog);
  const mine = useGameStore((s) => s.story.aptitude);
  const [taking, setTaking] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  // teste geçen adayın sonucu ertesi sabah gelir; Perşembe'nin onayı test değil, davettir
  const rows: Row[] = weekLog
    .filter((e) => e.decision === 'approve' && e.day < Math.min(dayIndex, SELECTION_DAY))
    .map((e) => ({ id: e.id, name: candidateOf(e.id).name, note: `${DAY_SHORT[e.day]} · teste geçti`, result: candidateAptitude(e.id, seed) }));
  if (mine) rows.unshift({ id: SELF, name: `${PLAYER.name} (siz)`, note: 'İç deneme', result: mine });
  const current = rows.find((r) => r.id === selected) ?? rows[0] ?? null;
  const scored = rows.filter((r) => r.id !== SELF);
  const avg = scored.length ? Math.round(scored.reduce((n, r) => n + r.result.score, 0) / scored.length) : null;
  const passed = scored.filter((r) => r.result.score >= APTITUDE_CUTOFF).length;

  if (taking) {
    return (
      <Shell>
        <SelfTest
          onDone={() => {
            setTaking(false);
            setSelected(SELF);
          }}
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <div className={styles.dashboard}>
        <div className={styles.dashHead}>
          <div>
            <h2 className={styles.heading}>Aday Sonuçları</h2>
            <p className={styles.sub}>Genel Yetenek ve Uyum Değerlendirmesi v3.1 · Yazılım Geliştirici · eşik {APTITUDE_CUTOFF}</p>
          </div>
          <div className={styles.kpis}>
            <Kpi label="Tamamlanan" value={String(scored.length)} />
            <Kpi label="Ortalama" value={avg === null ? '—' : String(avg)} />
            <Kpi label="Eşiği geçen" value={`${passed}/${scored.length}`} />
          </div>
        </div>

        <div className={styles.split}>
          <aside className={styles.list}>
            <div className={styles.listHead}>
              <span>Aday</span>
              <span>Puan</span>
            </div>
            {rows.length === 0 && <p className={styles.empty}>Liste boş. İlk sonuçlar ertesi sabah düşer.</p>}
            <ul>
              {rows.map((r) => (
                <li key={r.id}>
                  <button className={`${styles.row} ${current?.id === r.id ? styles.rowOn : ''}`} onClick={() => setSelected(r.id)}>
                    <span className={styles.rowName}>
                      {r.name}
                      <small>{r.note}</small>
                    </span>
                    <span className={`${styles.chip} ${r.result.score < APTITUDE_CUTOFF ? styles.chipBad : styles.chipOk}`}>{r.result.score}</span>
                  </button>
                </li>
              ))}
            </ul>
            {/* sol alttaki kutu yalnızca listede sonuç varken: boş ekranda aynı çağrı sağda zaten duruyor */}
            {!mine && rows.length > 0 && (
              <div className={styles.selfBox}>
                <b>Kendi deneyiminizi ölçün</b>
                <p>
                  Adayların çözdüğü testi siz de çözebilirsiniz. {APTITUDE_QUESTIONS.length} soru, 3 bölüm, iş hayatı simülasyonları dahil. Her soru mesaiden {APTITUDE_MINUTES_PER_QUESTION}{' '}
                  dakika götürür.
                </p>
                <button
                  className={styles.primary}
                  onClick={() => {
                    audioEngine.playUi('click');
                    setTaking(true);
                  }}
                >
                  Teste başla
                </button>
              </div>
            )}
          </aside>
          <section className={styles.sheet}>
            {current ? (
              <Report row={current} />
            ) : (
              <EmptyState
                canTake={!mine}
                onTake={() => {
                  audioEngine.playUi('click');
                  setTaking(true);
                }}
              />
            )}
          </section>
        </div>
      </div>
    </Shell>
  );
}

/** Hiç sonuç yokken: platformun kendini pazarladığı boş sayfa. */
function EmptyState({ canTake, onTake }: { canTake: boolean; onTake: () => void }) {
  return (
    <div className={empty.emptyState}>
      <svg className={empty.emptyArt} viewBox="0 0 160 120" aria-hidden="true">
        <rect x="22" y="14" width="96" height="92" rx="8" fill="#fff" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
        <rect x="36" y="32" width="50" height="6" rx="3" fill="currentColor" opacity="0.22" />
        <rect x="36" y="48" width="66" height="6" rx="3" fill="currentColor" opacity="0.14" />
        <rect x="36" y="64" width="40" height="6" rx="3" fill="currentColor" opacity="0.14" />
        <rect x="36" y="80" width="56" height="6" rx="3" fill="currentColor" opacity="0.14" />
        <circle cx="118" cy="84" r="22" fill="currentColor" opacity="0.12" />
        <circle cx="118" cy="84" r="13" fill="none" stroke="currentColor" strokeWidth="4" />
        <path d="m128 94 12 12" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      </svg>
      <h2 className={styles.heading}>Henüz ölçülecek kimse yok</h2>
      <p className={empty.emptyLead}>
        Portalda "Teste geçir" dediğin adaylar bu testi gece çözer; sonuçları ertesi sabah burada, yüzdelik dilimleri ve "kültür uyumu" yorumlarıyla belirir.
      </p>
      <ol className={empty.emptySteps}>
        <li>
          <b>1</b>
          <span>Portalda adayı onayla</span>
        </li>
        <li>
          <b>2</b>
          <span>Aday {APTITUDE_QUESTIONS.length} soruyu gözetim altında çözer</span>
        </li>
        <li>
          <b>3</b>
          <span>Platform puanı verir, sen kararı</span>
        </li>
      </ol>
      {canTake && (
        <div className={empty.emptyCta}>
          <p>Beklerken adayların neyle karşılaştığını görmek ister misin?</p>
          <button className={styles.primary} onClick={onTake}>
            Testi kendim çözeyim
          </button>
        </div>
      )}
      <p className={empty.emptyFoot}>Assessa · 2.400+ kurumun tercihi* · <span>*kurumların çoğu deneme sürümünde</span></p>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.kpi}>
      <b className="mono">{value}</b>
      <small>{label}</small>
    </div>
  );
}

function Report({ row }: { row: Row }) {
  const { result } = row;
  const below = result.score < APTITUDE_CUTOFF;
  const note = aptitudeNote(row.id);
  return (
    <>
      <header className={styles.reportHead}>
        <div>
          <small className={styles.kicker}>Aday raporu · ASX-{(row.id.length * 7919).toString(16).toUpperCase()}</small>
          <h2 className={styles.heading}>{row.name}</h2>
          <p className={styles.sub}>
            {result.correct} doğru · {APTITUDE_QUESTIONS.length - result.correct - result.timedOut} yanlış · {result.timedOut} boş
            {paceOf(result) && ` · ${paceOf(result)!.text}`}
          </p>
        </div>
        <div className={`${styles.ring} ${below ? styles.ringBad : ''}`} style={{ ['--p' as string]: result.score }}>
          <b className="mono">{result.score}</b>
          <small>{below ? 'Eşiğin altında' : 'Eşiği geçti'}</small>
        </div>
      </header>

      <div className={styles.profile}>
        <div className={styles.bars}>
          {sectionScores(result).map((s) => (
            <div key={s.title} className={styles.bar}>
              <span>{s.title}</span>
              <span className={styles.barTrack}>
                <i style={{ width: `${Math.round(s.ratio * 100)}%` }} />
              </span>
              <span className="mono">%{Math.round(s.ratio * 100)}</span>
            </div>
          ))}
        </div>
        <p className={styles.verdict}>
          <b>Platform yorumu:</b> {verdictLine(result.score)} <span className={styles.muted}>Normlara göre üst %{Math.max(1, 100 - result.score)}.</span>
        </p>
      </div>

      {note && <p className={styles.platformNote}>⚑ {note}</p>}
      {paceOf(result)?.flag && <p className={styles.platformNote}>⏱ {paceOf(result)!.flag}</p>}

      {APTITUDE_SECTIONS.map((s, si) => (
        <section key={s.id} className={styles.answerSection}>
          <h3>{s.title}</h3>
          <ol className={styles.answers}>
            {APTITUDE_QUESTIONS.map((q, i) => ({ q, i }))
              .filter(({ q }) => sectionOf(q.kind) === si)
              .map(({ q, i }) => {
                const a = result.answers[i];
                const ok = a === q.answer;
                return (
                  <li key={q.id} className={styles.answer}>
                    <span className={`${styles.mark} ${ok ? styles.markOk : styles.markBad}`} aria-label={ok ? 'doğru' : a === null ? 'boş' : 'yanlış'}>
                      {ok ? '✓' : a === null ? '⏱' : '✗'}
                    </span>
                    <div>
                      <p className={styles.q}>
                        <span className="mono">{q.kind}</span> {q.prompt}
                      </p>
                      {q.figure && <p className={styles.miniFigure}>{q.figure}</p>}
                      <p className={styles.given}>İşaretlenen: {a === null ? <i>süre doldu</i> : <b>{q.options[a]}</b>}</p>
                      {!ok && <p className={styles.key}>Anahtar: {q.options[q.answer]}</p>}
                    </div>
                  </li>
                );
              })}
          </ol>
        </section>
      ))}
      <p className={styles.fineprint}>
        Bu rapor Assessa'nın yapay zekâ destekli psikometrik modeli tarafından üretilmiştir. Sonuçlar tek başına işe alım kararı için kullanılmamalıdır.* · *Lisans sözleşmesinin
        14.c maddesi bu uyarıyı bağlayıcı kılmaz.
      </p>
    </>
  );
}

function SelfTest({ onDone }: { onDone: () => void }) {
  const paused = useGameStore((s) => s.paused);
  const finish = useGameStore((s) => s.finishAptitude);
  const step = useGameStore((s) => s.aptitudeStep);
  const N = APTITUDE_QUESTIONS.length;
  // undefined: dokunulmadı · sayı: işaretlenen şık; süre bitince dokunulmayanlar boş sayılır
  const [answers, setAnswers] = useState<(AptitudeAnswer | undefined)[]>(() => Array(N).fill(undefined));
  const [left, setLeft] = useState(TOTAL_SECONDS);
  const [pos, setPos] = useState(0);
  const index = ORDER[pos];
  const pending = useRef(answers);
  useEffect(() => {
    pending.current = answers;
  }, [answers]);
  const finishedRef = useRef(false);

  const complete = (list: (AptitudeAnswer | undefined)[]) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    finish(list.map((a) => (a === undefined ? null : a)));
    onDone();
  };

  const answer = (a: AptitudeAnswer) => {
    // mesai yalnızca soruya ilk kez cevap verilince düşer; fikir değiştirmek bedava
    if (answers[index] === undefined) step();
    const next = answers.slice();
    next[index] = a;
    setAnswers(next);
    if (pos < N - 1) setPos(pos + 1);
  };

  // pencereyi yarıda kapatmak testi bitirir: cevaplanmayanlar boş sayılır (hiç cevap yoksa test başlamamıştır)
  useEffect(
    () => () => {
      const list = pending.current;
      if (!finishedRef.current && list.some((a) => a !== undefined)) finish(list.map((a) => (a === undefined ? null : a)));
    },
    [finish],
  );

  // tek sayaç saniyede bir iner, oyun duraklatılınca durur; sıfırda test kendiliğinden teslim edilir
  const completeRef = useRef(complete);
  useEffect(() => {
    completeRef.current = complete;
  });
  useEffect(() => {
    if (paused) return;
    if (left <= 0) {
      completeRef.current(pending.current);
      return;
    }
    const id = window.setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => window.clearTimeout(id);
  }, [paused, left]);

  const q = APTITUDE_QUESTIONS[index];
  if (!q) return null;
  const section = sectionOf(q.kind);
  const answeredCount = answers.filter((a) => a !== undefined).length;
  const proctorLine = PROCTOR_LINES[Math.floor((TOTAL_SECONDS - left) / 9) % PROCTOR_LINES.length];
  const go = (i: number) => {
    audioEngine.playUi('click');
    setPos(Math.max(0, Math.min(N - 1, i)));
  };
  const ratio = Math.max(0, left) / TOTAL_SECONDS;
  return (
    <div className={styles.exam}>
      <aside className={styles.examSide}>
        <div className={`${styles.clockRing} ${left <= 30 ? styles.clockHurry : ''}`} style={{ ['--p' as string]: ratio * 100 }} role="timer" aria-label={`Testin kalan süresi ${Math.max(0, left)} saniye`}>
          <b className="mono">{clockText(Math.max(0, left))}</b>
          <small>kalan süre</small>
        </div>
        {APTITUDE_SECTIONS.map((sec, si) => (
          <div key={sec.id}>
            <div className={`${styles.mapSection} ${si === section ? styles.mapSectionOn : ''}`}>
              Bölüm {si + 1} · {sec.title}
            </div>
            <ol className={styles.qMap}>
              {APTITUDE_QUESTIONS.map((x, i) => ({ x, i }))
                .filter(({ x }) => sectionOf(x.kind) === si)
                .map(({ x, i }) => {
                  const done = answers[i] !== undefined;
                  return (
                    <li key={x.id}>
                      <button
                        className={`${i === index ? styles.qNow : ''} ${done ? styles.qDone : ''}`}
                        onClick={() => go(ORDER.indexOf(i))}
                        aria-label={`Soru ${ORDER.indexOf(i) + 1}${done ? ' · cevaplandı' : ''}`}
                        aria-current={i === index ? 'step' : undefined}
                      >
                        {ORDER.indexOf(i) + 1}
                      </button>
                    </li>
                  );
                })}
            </ol>
          </div>
        ))}
        <p className={styles.proctorNote} aria-live="polite">
          <b>Gözetmen</b>
          {proctorLine}
        </p>
        <div className={styles.mapLegend}>
          <span><i className={styles.lgDone} />Cevaplandı</span>
          <span><i className={styles.lgNow} />Şu an</span>
        </div>
      </aside>

      <div className={styles.examMain}>
        <div className={styles.crumbs}>
          <span>
            Soru {pos + 1} / {N} · {answeredCount} cevaplandı
          </span>
          <span className={styles.proctor}>● Kamera gözetimi aktif</span>
        </div>
        <div className={styles.question} key={q.id}>
          <span className={styles.qMeta}>{q.kind}</span>
          <p className={styles.prompt}>{q.prompt}</p>
          {q.figure && <div className={styles.figure}>{q.figure}</div>}
          <div className={styles.widgetArea}>
            <QuestionWidget key={q.id} q={q} onAnswer={answer} />
          </div>
          {q.hint && <p className={styles.hint}>{q.hint}</p>}
        </div>
        <div className={styles.examNav}>
          <button className={styles.navBtn} onClick={() => go(pos - 1)} disabled={pos === 0}>
            ← Önceki
          </button>
          {pos < N - 1 ? (
            <button className={`${styles.navBtn} ${styles.navNext}`} onClick={() => go(pos + 1)}>
              Sonraki →
            </button>
          ) : (
            <button
              className={`${styles.navBtn} ${styles.navNext}`}
              onClick={() => {
                audioEngine.playUi('click');
                complete(answers);
              }}
            >
              Testi bitir
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.app}>
      <header className={styles.brand}>
        <span className={styles.logo}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M12 2 21 7v10l-9 5-9-5V7z" fill="currentColor" opacity="0.18" />
            <path d="M12 6 17 9v6l-5 3-5-3V9z" fill="currentColor" />
          </svg>
          Assessa <small>Talent Insights</small>
        </span>
        <span className={styles.user}>Tavrinsa Labs · {PLAYER.name}</span>
      </header>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
