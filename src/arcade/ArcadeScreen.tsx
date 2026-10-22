import { useEffect, useState } from 'react';
import { audioEngine } from '../audio/audioEngine';
import { hasSave } from '../game/store/save';
import { CraneArt, DeskArt, ExamArt, ScreenArt, ShopArt } from './CardArt';
import { FILTER_FROM, GAMES, isWorkHours, SITE_NAME, type ArcadeGame, type GameKind } from './games';
import { hrefOf } from './route';
import { StudioMark } from './Studio';
import styles from './ArcadeScreen.module.css';

const CARD_ART = { iseAlim: DeskArt, test: ExamArt, insaat: CraneArt, bakkal: ShopArt, ekran: ScreenArt } as const;

const fileNo = (n: number) => `DOSYA ${String(n).padStart(3, '0')}`;

/** Kart basma saati: dakikada bir güncellenir. */
function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

function PunchClock() {
  const now = useClock();
  const time = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const work = isWorkHours(now);
  return (
    <p className={styles.clock}>
      <span className={`${styles.dot} ${work ? styles.dotWork : ''}`} aria-hidden="true" />
      <span className="mono">{time}</span>
      <span>{work ? 'Mesai devam ediyor. Sekmeyi küçük tut.' : 'Mesai bitti. Kimse bakmıyor.'}</span>
    </p>
  );
}

function GameCard({ game, isNew, preload, resume }: { game: ArcadeGame; isNew?: boolean; preload: (route: string) => void; resume: boolean }) {
  const Art = CARD_ART[game.route];
  return (
    <a
      className={styles.card}
      style={{ ['--card' as string]: game.color }}
      href={hrefOf(game.route)}
      onPointerEnter={() => preload(game.route)}
      onFocus={() => preload(game.route)}
    >
      <span className={`${styles.tab} mono`} aria-hidden="true">
        {fileNo(game.file)}
      </span>
      <span className={styles.body}>
        <span className={styles.artWrap}>
          <Art />
        </span>
        <span className={styles.text}>
          <span className={`${styles.meta} mono`}>
            {isNew && <span className={styles.badge}>Yeni</span>}
            {game.kind} · ~{game.minutes} dk
          </span>
          <span className={styles.cardTitle}>{game.title}</span>
          <span className={styles.blurb}>{game.blurb}</span>
          <span className={styles.play}>{resume ? 'Kaldığın yerden devam →' : 'Oyna →'}</span>
        </span>
      </span>
    </a>
  );
}

/** Oyun salonu: üstte ince bir çubuk, altında eşit dosyalardan bir ızgara; en yenisi başta ve rozetli. */
export function ArcadeScreen({ preload }: { preload: (route: string) => void }) {
  // bir oyundan geri dönülünce onun müziği susar
  useEffect(() => {
    audioEngine.setMusicMood('off');
  }, []);

  const [kind, setKind] = useState<GameKind | null>(null);
  const [saved] = useState(hasSave);
  const kinds = [...new Set(GAMES.map((g) => g.kind))];
  const showFilter = GAMES.length >= FILTER_FROM && kinds.length > 1;
  const shelf = kind ? GAMES.filter((g) => g.kind === kind) : GAMES;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <h1 className={styles.title}>{SITE_NAME}</h1>
          <p className={styles.lead}>Kısa, tuhaf oyunlar.</p>
        </div>
        <PunchClock />
      </header>

      <main className={styles.main} aria-labelledby="dolap">
        <div className={styles.shelfHead}>
          <h2 id="dolap" className={`${styles.shelfTitle} mono`}>
            Dosya dolabı
          </h2>
          {showFilter && (
            <div className={styles.filters} role="group" aria-label="Türe göre süz">
              {[null, ...kinds].map((k) => (
                <button key={k ?? 'hepsi'} type="button" className={styles.chip} aria-pressed={kind === k} onClick={() => setKind(k)}>
                  {k ?? 'Hepsi'}
                </button>
              ))}
            </div>
          )}
        </div>
        <ul className={styles.grid}>
          {shelf.map((g, i) => {
            const isNew = !kind && i === 0;
            return (
              <li key={g.route}>
                <GameCard game={g} isNew={isNew} preload={preload} resume={g.route === 'iseAlim' && saved} />
              </li>
            );
          })}
          {!kind && (
            <li>
              <div className={styles.soon}>
                <span className={`${styles.tab} mono`} aria-hidden="true">
                  {fileNo(GAMES.length + 1)}
                </span>
                <span className={styles.soonBody}>
                  <span className={`${styles.stamp} mono`}>İŞLEMDE</span>
                  <span className={styles.soonTitle}>Sıradaki dosya hazırlanıyor</span>
                  <span className={styles.blurb}>Başvurunuz alınmıştır. Uygun görülmesi hâlinde sizinle iletişime geçilecektir.</span>
                </span>
              </div>
            </li>
          )}
        </ul>
      </main>
      <StudioMark />
    </div>
  );
}
