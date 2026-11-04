import { useEffect, useState } from 'react';
import { ClockOut } from '../../arcade/ClockOut';
import { hrefOf } from '../../arcade/route';
import { markPlayed } from '../../arcade/progress';
import { Finale } from '../../arcade/Finale';
import { ShareButton } from '../../arcade/ShareButton';
import { StudioMark } from '../../arcade/Studio';
import { audioEngine } from '../../shared/audio/audioEngine';
import { clearSlot, isIndex, isRecord, readSlot, writeSlot } from '../../arcade/saveSlot';
import { crewTitle, LEVELS, TOOL_LABEL } from './levels';
import { H, ROAD, W } from './model';
import { Backdrop } from './Site';
import { Work } from './Work';
import styles from './AsfaltGame.module.css';
import ui from './Work.module.css';

/*
 * Yama Ekibi: belediyenin asfalt ekibinde bir mesai. Her iş bir çukur: toprak, mıcır, sıcak asfalt
 * ve silindirle yolu düzle, sonra trafiğe aç. Önce iş emri okunur, sonra çukurun başına geçilir.
 */

type Phase = { at: 'order'; n: number } | { at: 'work'; n: number; key: number } | { at: 'done' };

/** Mesai kaydı: sıradaki iş ve biten işlerin puanları. Yarım kalan yama kaydedilmez; iş baştan açılır. */
const SAVE_KEY = 'kariyerweb-asfalt-v1';
interface Shift {
  n: number;
  scores: number[];
}
const isShift = (v: unknown): v is Shift =>
  isRecord(v) && isIndex(v.n, LEVELS.length + 1) && Array.isArray(v.scores) && v.scores.length === v.n && v.scores.every((s) => typeof s === 'number');

export function AsfaltGame() {
  const [saved] = useState(() => readSlot(SAVE_KEY, isShift));
  const [phase, setPhase] = useState<Phase>(() => (saved && saved.n < LEVELS.length ? { at: 'order', n: saved.n } : { at: 'order', n: 0 }));
  const [scores, setScores] = useState<number[]>(() => (saved && saved.n < LEVELS.length ? saved.scores : []));
  const resumed = saved !== null && saved.n > 0 && saved.n < LEVELS.length;

  useEffect(() => {
    audioEngine.setMusicMood('off');
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [phase.at]);

  const level = phase.at === 'done' ? null : LEVELS[phase.n];

  return (
    <div className={styles.app}>
      <header className={styles.top}>
        <span className={ui.exit}>
          <ClockOut risk={phase.at === 'work' ? 'Yarım kalan yama kaybolur; biten işler kayıtlı.' : undefined} />
        </span>
      </header>

      {phase.at === 'order' && level && (
        <main className={styles.center}>
          {/* arkada sokak ve çukur: iş emri sahnenin üstünde okunur */}
          <div className={styles.scenery} aria-hidden="true">
            <div className={styles.sceneryStage}>
              <Backdrop rain={false} />
              <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
                <rect x="0" y={ROAD} width={W} height="7" fill="#3a3a3e" />
                <rect x="0" y={ROAD + 7} width={W} height="6" fill="#8f8577" />
                <rect x="0" y={ROAD + 13} width={W} height={H - ROAD - 13} fill="#5a4330" />
                <line x1="0" x2={W} y1={ROAD + 3.4} y2={ROAD + 3.4} stroke="#e8e2d2" strokeWidth="0.5" strokeDasharray="6 5" />
                <path d={`M ${W / 2 - 22} ${ROAD} L ${W / 2 - 16} ${ROAD + 10} Q ${W / 2} ${ROAD + 16} ${W / 2 + 16} ${ROAD + 10} L ${W / 2 + 22} ${ROAD} Z`} fill="#2b201a" stroke="#2a231d" strokeWidth="0.4" />
              </svg>
            </div>
          </div>
          <article className={styles.order}>
            <header>
              <span>FEN İŞLERİ MÜDÜRLÜĞÜ · İŞ EMRİ</span>
              <span>No. {String(4471 + phase.n).padStart(6, '0')}</span>
            </header>
            <h2>{level.title}</h2>
            <p className={styles.place}>{level.place}</p>
            <p>{level.order}</p>
            <dl>
              <dt>Ödenek</dt>
              <dd>{level.budget.toLocaleString('tr-TR')} ₺</dd>
              <dt>Araçlar</dt>
              <dd>{level.tools.map((t) => TOOL_LABEL[t].name).join(' · ')}</dd>
              {level.unlock && (
                <>
                  <dt>Yeni</dt>
                  <dd>{level.unlock}</dd>
                </>
              )}
              {level.guided && (
                <>
                  <dt>Rehber</dt>
                  <dd>Ustabaşı yanında, adım adım gösterir</dd>
                </>
              )}
              {level.spec.deadlineSec && (
                <>
                  <dt>Açılış</dt>
                  <dd>{Math.round(level.spec.deadlineSec / 60)} dakika sonra, kurdeleyle</dd>
                </>
              )}
            </dl>
            {resumed && phase.n === saved.n && (
              <p className={styles.place}>
                Kaldığın yerden devam: {phase.n} iş bitti, ortalama {Math.round(scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length))}/100.{' '}
                <button
                  type="button"
                  className={styles.link}
                  onClick={() => {
                    clearSlot(SAVE_KEY);
                    setScores([]);
                    setPhase({ at: 'order', n: 0 });
                  }}
                >
                  Baştan başla
                </button>
              </p>
            )}
            <div className={styles.orderActions}>
              <button type="button" className={styles.primary} onClick={() => setPhase({ at: 'work', n: phase.n, key: Date.now() })}>
                Çukurun başına geç
              </button>
            </div>
          </article>
        </main>
      )}

      {phase.at === 'work' && level && (
        <Work
          key={phase.key}
          level={level}
          last={phase.n === LEVELS.length - 1}
          onRetry={() => setPhase({ ...phase, key: Date.now() })}
          onNext={(score) => {
            const next = [...scores.slice(0, phase.n), score];
            setScores(next);
            if (phase.n + 1 < LEVELS.length) writeSlot(SAVE_KEY, { n: phase.n + 1, scores: next });
            else clearSlot(SAVE_KEY);
            if (phase.n + 1 >= LEVELS.length) {
              // mesai bitti: salonun defterine tik ve unvan
              const t = crewTitle(next);
              markPlayed('asfalt', t.title);
            }
            setPhase(phase.n + 1 < LEVELS.length ? { at: 'order', n: phase.n + 1 } : { at: 'done' });
          }}
        />
      )}

      {phase.at === 'done' && (
        <main className={styles.center}>
          <article className={styles.order}>
            <header>
              <span>FEN İŞLERİ MÜDÜRLÜĞÜ · MESAİ SONU</span>
            </header>
            <h2>Mesai bitti</h2>
            <ShiftNews scores={scores} />
            <dl>
              {LEVELS.map((l, i) => (
                <div key={l.spec.id} className={styles.row}>
                  <dt>{l.title}</dt>
                  <dd>{scores[i] ?? '—'} / 100</dd>
                </div>
              ))}
            </dl>
            <p>Yarın sabah aynı çukurlar seni bekliyor. Kazan da İSKİ, kapatan da sen.</p>
            <div className={styles.actions}>
              <ShareButton
                className={styles.primary}
                make={() => {
                  const t = crewTitle(scores);
                  return {
                    route: 'asfalt',
                    kicker: 'Fen İşleri Müdürlüğü · Mesai sonu',
                    title: t.title,
                    note: t.note,
                    stats: [...LEVELS.map((l, i) => ({ label: l.title, value: `${scores[i] ?? 0}` })), { label: 'Ortalama', value: `${t.avg}`, tone: '#a8402f' }].slice(-3),
                    question: 'Senin yaman kaç gün dayanır?',
                    text: shareLine(scores),
                  };
                }}
              />
              <button
                type="button"
                className={styles.ghost}
                onClick={() => {
                  setScores([]);
                  setPhase({ at: 'order', n: 0 });
                }}
              >
                Baştan başla
              </button>
              <a className={styles.ghost} href={hrefOf('arcade')}>
                Salona dön
              </a>
            </div>
          </article>
        </main>
      )}

      {phase.at !== 'work' && <StudioMark minimal />}
    </div>
  );
}

/** En iyi ve en kötü iş: haber ve paylaşım cümlesi bunlardan kurulur. */
function extremes(scores: number[]) {
  const done = LEVELS.map((l, i) => ({ l, s: scores[i] ?? 0 }));
  const best = done.reduce((a, b) => (b.s > a.s ? b : a));
  const worst = done.reduce((a, b) => (b.s < a.s ? b : a));
  return { best, worst };
}

/** Paylaşımda puan değil, oyuncunun kendi yaması konuşur. */
function shareLine(scores: number[]) {
  const { best, worst } = extremes(scores);
  const t = crewTitle(scores);
  if (worst.s < 60) return `Yama Ekibi: ${worst.l.place} çukurunu ${worst.s}/100 ile kapattım; vatandaş farkı anlamadı. Mesai unvanım "${t.title}". Senin yaman kaç gün dayanır?`;
  return `Yama Ekibi: ${best.l.place} yamam ${best.s}/100 aldı, muhtar arabasıyla iki kez geçti. Mesai unvanım "${t.title}". Senin yaman kaç gün dayanır?`;
}

/** Mesai sonunun yerel haberi: en iyi yama manşette, en kötüsü köşede. */
function ShiftNews({ scores }: { scores: number[] }) {
  const { best, worst } = extremes(scores);
  const t = crewTitle(scores);
  const good = t.avg >= 70;
  return (
    <Finale kind="news" kicker="Mahalle Postası · Yerel" title={good ? `Belediye ekibi çukurları kapattı: "${best.l.title}" mahallenin dilinde` : `Çukurlar kapandı, sorular açık kaldı`}>
      <p>
        Fen İşleri ekibi bir mesaide {LEVELS.length} yamayı bitirdi. {best.l.place} için yapılan iş kontrol mühendisinden {best.s} puan aldı; muhtar "Haberlere çıkmayacak kadar iyi" dedi.
      </p>
      <p>
        {worst.s < 60
          ? `${worst.l.place} sakinleri ise memnun değil: yama ${worst.s} puanda kaldı, şikâyet hattı sabaha kadar çaldı.`
          : `En zayıf iş bile ${worst.s} puan aldı; şikâyet hattı bu gece sessiz.`}{' '}
        Ekibin unvanı: {t.title}.
      </p>
    </Finale>
  );
}
