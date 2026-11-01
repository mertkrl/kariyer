import { useEffect, useState } from 'react';
import { fileNo, GAME_ART } from './gameArt';
import { GAMES, isWorkHours, type ArcadeGame } from './games';
import { hrefOf } from './route';
import styles from './SalonParts.module.css';

/*
 * Salonun parçaları: kart basma saati, oyun dosyası ve sıradaki dosya. Bugünkü salon ve onun
 * tasarım varyantları aynı parçaları kullanır; varyantlar yalnızca sahneyi ve yerleşimi değiştirir.
 */

/** Kart basma saati: dakikada bir güncellenir. */
function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

export function PunchClock({ className }: { className?: string }) {
  const now = useClock();
  const time = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const work = isWorkHours(now);
  return (
    <p className={`${styles.clock} ${className ?? ''}`}>
      <span className={`${styles.dot} ${work ? styles.dotWork : ''}`} aria-hidden="true" />
      <span className="mono">{time}</span>
      <span>{work ? 'Mesai devam ediyor. Sekmeyi küçük tut.' : 'Mesai bitti. Kimse bakmıyor.'}</span>
    </p>
  );
}

/** `sketch`: dosya kâğıda kalemle çizilmiş gibi görünür (kareli defter salonu). */
export function GameCard({ game, isNew, preload, resume, sketch, className }: { game: ArcadeGame; isNew?: boolean; preload: (route: string) => void; resume: boolean; sketch?: boolean; className?: string }) {
  const Art = GAME_ART[game.route];
  return (
    <a
      className={`${styles.card} ${sketch ? styles.sketch : ''} ${className ?? ''}`}
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
            ~{game.minutes} dk
          </span>
          <span className={styles.cardTitle}>
            <span className={styles.cardTitleInk}>{game.title}</span>
          </span>
          <span className={styles.blurb}>{game.blurb}</span>
          <span className={styles.play}>{resume ? 'Kaldığın yerden devam →' : 'Oyna →'}</span>
        </span>
      </span>
    </a>
  );
}

/** Sıradaki, henüz açılmamış dosya: dolabın son gözü. */
export function SoonCard({ sketch, className }: { sketch?: boolean; className?: string }) {
  return (
    <div className={`${styles.soon} ${sketch ? styles.sketch : ''} ${className ?? ''}`}>
      <span className={`${styles.tab} mono`} aria-hidden="true">
        {fileNo(GAMES.length + 1)}
      </span>
      <span className={styles.soonBody}>
        <span className={`${styles.stamp} mono`}>İŞLEMDE</span>
        <span className={styles.soonTitle}>Sıradaki dosya hazırlanıyor</span>
        <span className={styles.blurb}>Başvurunuz alınmıştır. Uygun görülmesi hâlinde sizinle iletişime geçilecektir.</span>
      </span>
    </div>
  );
}
