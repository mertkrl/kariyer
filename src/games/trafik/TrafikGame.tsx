import { useEffect, useState } from 'react';
import { ClockOut } from '../../arcade/ClockOut';
import { hrefOf } from '../../arcade/route';
import { markPlayed } from '../../arcade/progress';
import { ShareButton } from '../../arcade/ShareButton';
import { audioEngine } from '../../audio/audioEngine';
import { LEVELS, PASS_SCORE, shiftTitle } from './levels';
import { Play } from './Play';
import styles from './TrafikGame.module.css';

/*
 * Kavşak Amiri: trafik kontrol merkezinde bir akşam vardiyası. Her iş İstanbul'dan bir kavşak:
 * kavşak tam ekran açılır, vardiya emri üstünde okunur; sonra kontrolördeki plan düzeltilir,
 * zirve akarken ışıklar elle yönetilir.
 */

type Phase = { at: 'order'; n: number; key: number } | { at: 'play'; n: number; key: number } | { at: 'done' };

export function TrafikGame() {
  // `#/trafik?kavsak=3`: doğrudan o kavşaktan başlar (paylaşılan bağlantı ve deneme için)
  const [phase, setPhase] = useState<Phase>(() => {
    const n = Number(new URLSearchParams(window.location.hash.split('?')[1]).get('kavsak'));
    return { at: 'order', n: n >= 1 && n <= LEVELS.length ? Math.floor(n) - 1 : 0, key: 0 };
  });
  const [scores, setScores] = useState<number[]>([]);

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

  const level = phase.at === 'done' ? null : LEVELS[phase.n];
  const next = (n: number, score: number) => {
    const all = [...scores.slice(0, n), score];
    setScores(all);
    if (n + 1 >= LEVELS.length) markPlayed('trafik', shiftTitle(all).title);
    setPhase(n + 1 < LEVELS.length ? { at: 'order', n: n + 1, key: Date.now() } : { at: 'done' });
  };

  return (
    <div className={styles.app}>
      {level && phase.at !== 'done' && (
        <Play key={phase.key} level={level} briefing={phase.at === 'order'} last={phase.n === LEVELS.length - 1} onRetry={() => setPhase({ at: 'play', n: phase.n, key: Date.now() })} onNext={(score) => next(phase.n, score)} />
      )}

      <header className={styles.top}>
        <ClockOut tone="dark" risk={phase.at === 'play' ? 'Yarım kalan vardiya kaybolur.' : undefined} />
        <div className={styles.title}>
          <h1>Kavşak Amiri</h1>
          <p>{phase.at === 'done' ? 'Vardiya bitti' : `Kavşak ${phase.n + 1}/${LEVELS.length} · ${LEVELS[phase.n].place}`}</p>
        </div>
      </header>

      {phase.at === 'order' && level && (
        <div className={styles.modal}>
          <article className={styles.order}>
            <header>
              <span>TRAFİK KONTROL MERKEZİ · VARDİYA EMRİ</span>
              <span>No. {String(3120 + phase.n).padStart(6, '0')}</span>
            </header>
            <h2>{level.title}</h2>
            <p className={styles.place}>{level.place}</p>
            <p>{level.order}</p>
            <dl>
              <dt>Zirve</dt>
              <dd>{Math.round((level.spec.duration / 60) * 10) / 10} dakika</dd>
              <dt>Kollar</dt>
              <dd>
                {Object.values(level.spec.legs)
                  .map((l) => l.name)
                  .join(' · ')}
              </dd>
              <dt>Geçer not</dt>
              <dd>{PASS_SCORE} / 100</dd>
            </dl>
            <p className={styles.tipLine}>{level.tip}</p>
            <button type="button" className={styles.primary} onClick={() => setPhase({ at: 'play', n: phase.n, key: phase.key })}>
              Kontrolörü aç
            </button>
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
                    question: 'Sen olsan Barbaros’ta tüm kırmızıyı kaç saniye yapardın?',
                    text: `Kavşak Amiri'nde vardiyayı "${t.title}" olarak bitirdim, ortalamam ${t.avg}/100. İstanbul kavşaklarını sen yönetebilir misin?`,
                  };
                }}
              />
              <button
                type="button"
                className={styles.ghost}
                onClick={() => {
                  setScores([]);
                  setPhase({ at: 'order', n: 0, key: Date.now() });
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
    </div>
  );
}
