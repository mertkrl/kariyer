import { useEffect, useState } from 'react';
import { ClockOut } from '../../arcade/ClockOut';
import { hrefOf } from '../../arcade/route';
import { markPlayed } from '../../arcade/progress';
import { ShareButton } from '../../arcade/ShareButton';
import { StudioMark } from '../../arcade/Studio';
import { audioEngine } from '../../audio/audioEngine';
import { crewTitle, LEVELS, TOOL_LABEL } from './levels';
import { Work } from './Work';
import styles from './AsfaltGame.module.css';

/*
 * Yama Ekibi: belediyenin asfalt ekibinde bir mesai. Her iş bir çukur: toprak, mıcır, sıcak asfalt
 * ve silindirle yolu düzle, sonra trafiğe aç. Önce iş emri okunur, sonra çukurun başına geçilir.
 */

type Phase = { at: 'order'; n: number } | { at: 'work'; n: number; key: number } | { at: 'done' };

export function AsfaltGame() {
  const [phase, setPhase] = useState<Phase>({ at: 'order', n: 0 });
  const [scores, setScores] = useState<number[]>([]);

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
        <ClockOut risk={phase.at === 'work' ? 'Yarım kalan yama kaybolur.' : undefined} />
        <div className={styles.title}>
          <h1>Yama Ekibi</h1>
          <p>{phase.at === 'done' ? 'Mesai bitti' : `İş ${phase.n + 1}/${LEVELS.length} · ${LEVELS[phase.n].place}`}</p>
        </div>
        <div />
      </header>

      {phase.at === 'order' && level && (
        <main className={styles.center}>
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
              {level.spec.deadlineSec && (
                <>
                  <dt>Açılış</dt>
                  <dd>{Math.round(level.spec.deadlineSec / 60)} dakika sonra, kurdeleyle</dd>
                </>
              )}
            </dl>
            <button type="button" className={styles.primary} onClick={() => setPhase({ at: 'work', n: phase.n, key: Date.now() })}>
              Çukurun başına geç
            </button>
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
                    text: `Yama Ekibi'nde mesaiyi "${t.title}" olarak bitirdim, ortalamam ${t.avg}/100. Asfalt soğumadan silindiri geçirebilir misin?`,
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

      <StudioMark minimal />
    </div>
  );
}
