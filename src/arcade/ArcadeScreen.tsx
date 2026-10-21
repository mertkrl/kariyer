import { useEffect } from 'react';
import { audioEngine } from '../audio/audioEngine';
import { DeskArt, ExamArt } from './CardArt';
import { GAMES, SITE_NAME } from './games';
import { hrefOf } from './route';
import { StudioMark } from './Studio';
import styles from './ArcadeScreen.module.css';

const CARD_ART = { iseAlim: DeskArt, test: ExamArt } as const;

/** Oyun salonu: her kart kendi oyununu açar. */
export function ArcadeScreen({ preload }: { preload: (route: string) => void }) {
  // bir oyundan geri dönülünce onun müziği susar
  useEffect(() => {
    audioEngine.setMusicMood('off');
  }, []);

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>{SITE_NAME}</h1>
        <p className={styles.lead}>İşe alım sürecine dair kısa, tuhaf ve biraz da can sıkıcı oyunlar.</p>
      </header>
      <ul className={styles.grid}>
        {GAMES.map((g) => {
          const Art = CARD_ART[g.route];
          return (
            <li key={g.route}>
              <a className={styles.card} style={{ background: g.color }} href={hrefOf(g.route)} onPointerEnter={() => preload(g.route)} onFocus={() => preload(g.route)}>
                <Art />
                <span className={`${styles.tag} mono`}>{g.tag}</span>
                <span className={styles.cardTitle}>{g.title}</span>
                <span className={styles.blurb}>{g.blurb}</span>
                <span className={styles.play}>Oyna →</span>
              </a>
            </li>
          );
        })}
      </ul>
      <StudioMark />
    </div>
  );
}
