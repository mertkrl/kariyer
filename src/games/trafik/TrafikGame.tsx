import { useEffect, useState } from 'react';
import { ClockOut } from '../../arcade/ClockOut';
import { hrefOf } from '../../arcade/route';
import { markPlayed } from '../../arcade/progress';
import { Finale } from '../../arcade/Finale';
import { ShareButton } from '../../arcade/ShareButton';
import { audioEngine } from '../../audio/audioEngine';
import { clearSlot, isIndex, isRecord, readSlot, writeSlot } from '../../arcade/saveSlot';
import { LEVELS, shiftTitle, starsOf, type Level } from './levels';
import { dayLabel, daySeed, freeLevel } from './free';
import { DIFFICULTY, type Difficulty } from './model';
import { Play } from './Play';
import { Title } from './Title';
import styles from './TrafikGame.module.css';

/*
 * Kavşak Amiri: trafik kontrol merkezinde bir akşam vardiyası. Giriş ekranında "Oyna" zorluğu
 * sordurur, sonra İstanbul'dan dokuz bölüm gelir: tek kavşaktan dört kavşaklı caddeye. Her bölüm tam
 * ekran açılır, vardiya emri (birkaç cümle ve bir ipucu) üstünde okunur; emir kapanınca trafik akar.
 * İlk vardiyadan önce (bir kez, sonra giriş ekranından istenince) ilk kavşakta adım adım tanıtım yürür.
 * Vardiya dışında "Günün kavşağı" (her gün herkese aynı) ve "Rastgele kavşak" tek bölüm oynatır.
 */

/** Günün kavşağında en iyi puan, güne göre. */
const dayKey = (seed: number) => `kariyerweb-trafik-gun-${seed}`;
const readBest = (seed: number) => {
  try {
    return Number(localStorage.getItem(dayKey(seed))) || null;
  } catch {
    return null;
  }
};

type Phase = { at: 'title' } | { at: 'free'; level: Level; daily: boolean; brief: boolean; key: number } | { at: 'tour'; then: 'order' | 'title'; key: number } | { at: 'order'; n: number; key: number } | { at: 'play'; n: number; key: number } | { at: 'done' };

/** Vardiya kaydı: sıradaki kavşak ve bitenlerin puanları. Yarım kalan kavşak baştan açılır. */
const SAVE_KEY = 'kariyerweb-trafik-v4';
/** Tanıtım bir kez kendiliğinden açılır; sonra giriş ekranındaki "Nasıl oynanır?" ile. */
const TOUR_KEY = 'kariyerweb-trafik-tanitim';
const tourSeen = () => {
  try {
    return localStorage.getItem(TOUR_KEY) === '1';
  } catch {
    return true;
  }
};
interface Shift {
  n: number;
  scores: number[];
  diff?: Difficulty;
}
const isShift = (v: unknown): v is Shift =>
  isRecord(v) && isIndex(v.n, LEVELS.length) && Array.isArray(v.scores) && v.scores.length === v.n && v.scores.every((s) => typeof s === 'number');

export function TrafikGame() {
  // `#/trafik?kavsak=3`: doğrudan o kavşaktan başlar (paylaşılan bağlantı ve deneme için)
  const [saved, setSaved] = useState(() => readSlot(SAVE_KEY, isShift));
  const [phase, setPhase] = useState<Phase>(() => {
    const n = Number(new URLSearchParams(window.location.hash.split('?')[1]).get('kavsak'));
    if (n >= 1 && n <= LEVELS.length) return { at: 'order', n: Math.floor(n) - 1, key: 0 };
    return { at: 'title' };
  });
  const [scores, setScores] = useState<number[]>(() => saved?.scores ?? []);
  // zorluk: giriş ekranında seçilir, vardiya boyunca geçerli, kayıtta saklanır
  const [diff, setDiff] = useState<Difficulty>(() => (saved?.diff && saved.diff in DIFFICULTY ? saved.diff : 'normal'));

  useEffect(() => {
    audioEngine.setMusicMood('off');
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    // tam ekran oyun: sayfa kaymasın
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, []);

  const level = phase.at === 'order' || phase.at === 'play' ? LEVELS[phase.n] : null;
  const start = (d: Difficulty) => {
    setDiff(d);
    clearSlot(SAVE_KEY);
    setSaved(null);
    setScores([]);
    setPhase(tourSeen() ? { at: 'order', n: 0, key: Date.now() } : { at: 'tour', then: 'order', key: Date.now() });
  };
  const [best, setBest] = useState(() => readBest(daySeed()));
  const playFree = (daily: boolean) => setPhase({ at: 'free', level: freeLevel(daily ? daySeed() : Math.floor(Math.random() * 1e6), daily), daily, brief: true, key: Date.now() });
  const endFree = (score: number, daily: boolean) => {
    if (daily && score > (best ?? 0)) {
      try {
        localStorage.setItem(dayKey(daySeed()), String(score));
      } catch {
        // kayıt yoksa en iyi puan yalnızca bu açılışta
      }
      setBest(score);
    }
    setPhase({ at: 'title' });
  };
  const endTour = (then: 'order' | 'title') => {
    try {
      localStorage.setItem(TOUR_KEY, '1');
    } catch {
      // kayıt yoksa tanıtım bir dahaki sefer yine açılır
    }
    setPhase(then === 'order' ? { at: 'order', n: 0, key: Date.now() } : { at: 'title' });
  };
  const next = (n: number, score: number) => {
    const all = [...scores.slice(0, n), score];
    setScores(all);
    if (n + 1 < LEVELS.length) {
      writeSlot(SAVE_KEY, { n: n + 1, scores: all, diff });
      setSaved({ n: n + 1, scores: all, diff });
    } else {
      clearSlot(SAVE_KEY);
      setSaved(null);
    }
    if (n + 1 >= LEVELS.length) markPlayed('trafik', shiftTitle(all).title);
    setPhase(n + 1 < LEVELS.length ? { at: 'order', n: n + 1, key: Date.now() } : { at: 'done' });
  };

  return (
    <div className={styles.app}>
      {phase.at === 'title' && (
        <Title
          resume={saved && saved.n > 0 ? saved.n : null}
          diffName={DIFFICULTY[diff].name}
          onPlay={start}
          onResume={() => setPhase({ at: 'order', n: saved?.n ?? 0, key: Date.now() })}
          onTour={() => setPhase({ at: 'tour', then: 'title', key: Date.now() })}
          onFree={playFree}
          day={`${dayLabel()}${best ? ` · en iyin ${best}` : ''}`}
        />
      )}

      {phase.at === 'free' && (
        <Play
          key={`free-${phase.key}`}
          level={phase.level}
          diff={diff}
          briefing={phase.brief}
          last
          onRetry={() => setPhase({ ...phase, brief: false, key: Date.now() })}
          onNext={(score) => endFree(score, phase.daily)}
        />
      )}

      {phase.at === 'free' && phase.brief && (
        <div className={styles.modal}>
          <article className={styles.order}>
            <header>
              <span>TRAFİK KONTROL MERKEZİ · {phase.daily ? `GÜNÜN KAVŞAĞI · ${dayLabel().toLocaleUpperCase('tr-TR')}` : 'RASTGELE KAVŞAK'}</span>
              <span>{phase.daily && best ? `en iyin ${best} · ${'★'.repeat(starsOf(best, DIFFICULTY[diff].pass))}` : ''}</span>
            </header>
            <h2>{phase.level.title}</h2>
            <p className={styles.place}>
              {phase.level.place} · {Math.round((phase.level.spec.duration / 60) * 10) / 10} dakika · {DIFFICULTY[diff].name}
            </p>
            <p>{phase.level.order}</p>
            <p className={styles.tipLine}>{phase.level.tip}</p>
            <div className={styles.actions}>
              <button type="button" className={styles.primary} onClick={() => setPhase({ ...phase, brief: false })}>
                Başla
              </button>
              <button type="button" className={styles.ghost} onClick={() => setPhase({ at: 'title' })}>
                Giriş ekranı
              </button>
            </div>
          </article>
        </div>
      )}

      {phase.at === 'tour' && (
        <Play key={`tour-${phase.key}`} level={LEVELS[0]} diff={diff} briefing={false} last={false} onRetry={() => {}} onNext={() => {}} tour onTourDone={() => endTour(phase.then)} />
      )}

      {level && (phase.at === 'order' || phase.at === 'play') && (
        <Play
          key={`${phase.key}-${diff}`}
          level={level}
          diff={diff}
          briefing={phase.at === 'order'}
          last={phase.n === LEVELS.length - 1}
          onRetry={() => setPhase({ at: 'play', n: phase.n, key: Date.now() })}
          onNext={(score) => next(phase.n, score)}
        />
      )}

      <header className={styles.top}>
        <span className={styles.exit}>
          <ClockOut tone="dark" risk={phase.at === 'play' ? 'Yarım kalan kavşak kaybolur; biten kavşaklar kayıtlı.' : undefined} />
        </span>
      </header>

      {phase.at === 'order' && level && (
        <div className={styles.modal}>
          <article className={styles.order}>
            <header>
              <span>TRAFİK KONTROL MERKEZİ · VARDİYA EMRİ</span>
              <span>
                {phase.n + 1} / {LEVELS.length}
              </span>
            </header>
            <h2>{level.title}</h2>
            <p className={styles.place}>
              {level.place} · {Math.round((level.spec.duration / 60) * 10) / 10} dakika · {DIFFICULTY[diff].name}
            </p>
            <p>{level.order}</p>
            <p className={styles.tipLine}>{level.tip}</p>
            <div className={styles.actions}>
              <button type="button" className={styles.primary} onClick={() => setPhase({ at: 'play', n: phase.n, key: phase.key })}>
                Başla
              </button>
              <button type="button" className={styles.ghost} onClick={() => setPhase({ at: 'title' })}>
                Giriş ekranı
              </button>
            </div>
          </article>
        </div>
      )}

      {phase.at === 'done' && (
        <main className={styles.center}>
          <article className={styles.order}>
            <header>
              <span>TRAFİK KONTROL MERKEZİ · VARDİYA SONU</span>
            </header>
            <h2>{shiftTitle(scores).title}</h2>
            <ShiftRadio scores={scores} />
            <dl>
              {LEVELS.map((l, i) => (
                <div key={l.place} className={styles.row}>
                  <dt>{l.place}</dt>
                  <dd>{scores[i] ?? '—'} / 100</dd>
                </div>
              ))}
            </dl>
            <p>{shiftTitle(scores).note} Yarın aynı saatte aynı kavşaklar. Dolmuşlar da.</p>
            <div className={styles.actions}>
              <ShareButton
                className={styles.primary}
                make={() => {
                  const t = shiftTitle(scores);
                  return {
                    route: 'trafik',
                    kicker: 'Trafik Kontrol Merkezi · Vardiya sonu',
                    title: t.title,
                    note: t.note,
                    stats: [
                      ...LEVELS.map((l, i) => ({
                        label: l.place,
                        value: `${scores[i] ?? 0}`,
                      })),
                      { label: 'Ortalama', value: `${t.avg}`, tone: '#3a7d4c' },
                    ].slice(-3),
                    question: 'Sen olsan Büyükdere’de akşam zirvesine kaç saniye yeşil verirdin?',
                    text: radioShare(scores),
                  };
                }}
              />
              <button
                type="button"
                className={styles.ghost}
                onClick={() => setPhase({ at: 'title' })}
              >
                Giriş ekranı
              </button>
              <a className={styles.ghost} href={hrefOf('arcade')}>
                Salona dön
              </a>
            </div>
          </article>
        </main>
      )}
    </div>
  );
}

/** Her kavşağın trafik radyosundaki hâli: puana göre akıcı, yoğun ya da kilit. */
const flow = (score: number) => (score >= 75 ? 'akıcı' : score >= 60 ? 'yer yer yoğun' : 'kilit');

function radioShare(scores: number[]) {
  const t = shiftTitle(scores);
  const i = scores.reduce((m, s, k) => (s < scores[m] ? k : m), 0);
  const worst = LEVELS[i];
  return scores[i] < 60
    ? `Kavşak Amiri: vardiyamda trafik radyosu "${worst.place} kilit" diye anons etti (${scores[i]}/100). Unvanım "${t.title}". Sen bu ışıkları nasıl ayarlardın?`
    : `Kavşak Amiri: vardiya boyunca trafik radyosu ${LEVELS.length} bölümün hepsi için "akıcı" dedi. Unvanım "${t.title}", ortalamam ${t.avg}/100. Sen yetişebilir misin?`;
}

/** Vardiya sonu: trafik radyosunun akşam bülteni, kavşak kavşak. */
function ShiftRadio({ scores }: { scores: number[] }) {
  const t = shiftTitle(scores);
  const jams = LEVELS.filter((_, i) => (scores[i] ?? 0) < 60);
  return (
    <Finale kind="radio" kicker="Trafik Radyosu · 104.6 · Akşam bülteni" title={jams.length ? `Dikkat: ${jams.map((l) => l.place.split('·')[0].trim()).join(', ')} kilit` : 'İstanbul’un ışıkları bu akşam yeşil dalgada'}>
      {LEVELS.map((l, i) => (
        <p key={l.place}>
          {l.place}: <b>{flow(scores[i] ?? 0)}</b>.
        </p>
      ))}
      <p>Kontrol merkezinden vardiyayı devralan ekip arkadaşımız: "{t.note}"</p>
    </Finale>
  );
}
